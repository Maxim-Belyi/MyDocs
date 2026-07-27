---
sidebar_position: 8
---

# ClickHouse: OLAP база данных

**ClickHouse** — это колоночная (column-oriented) СУБД с открытым исходным кодом, созданная Яндексом и выпущенная в 2016 году. Оптимизирована для **аналитических запросов** над огромными объёмами данных в реальном времени.

---

## 1. Ключевые характеристики

*   **Скорость:** До нескольких миллиардов строк в секунду при агрегации.
*   **Сжатие:** Данные сжимаются в 5-10 раз (колоночное хранение + LZ4/ZSTD).
*   **Масштаб:** Горизонтальная масштабируемость через шардирование.
*   **SQL:** Поддерживает большинство стандартного SQL (диалект ClickHouse SQL).
*   **Слабость:** Плохо подходит для транзакций и обновления отдельных строк.

---

## 2. Движки таблиц (Table Engines)

Движки таблиц в ClickHouse — это фундамент, который определяет, **как** данные хранятся на диске или в памяти, **как** они читаются, поддерживают ли индексы и репликацию. 

В ClickHouse движки делятся на два главных лагеря: семейство **MergeTree** (для аналитики и петабайтов данных) и **Специальные движки** (для интеграций, кэшей и временных задач).

---

### 1. MergeTree
Базовый движок. Идеален для логов, метрик и любых временных рядов (Time-Series). Дубликаты разрешены.

*   **Как работает:** Просто сохраняет все вставленные строки. Быстро пишет, быстро читает по индексу (Primary Key).
*   **Пример использования:** Логи веб-сервера (кто, когда и какую страницу посетил).

```sql
CREATE TABLE web_logs (
    event_time DateTime,
    user_id UInt32,
    url String
) ENGINE = MergeTree()
ORDER BY (user_id, event_time); -- Ключ сортировки и первичный ключ по умолчанию
```

### 2. ReplacingMergeTree
Удаляет дубликаты по первичному ключу (или ключу сортировки `ORDER BY`). Оставляет только **последнюю версию** строки.

*   **Важный нюанс:** Удаление происходит *только в момент фонового слияния*. Если вы сделаете `SELECT`, вы можете увидеть дубликаты. Чтобы получить актуальные данные без дублей, нужно использовать модификатор `FINAL` в запросе (но он ресурсоемкий) или агрегацию `argMax`.
*   **Пример использования:** Таблица пользователей, где профиль может обновляться (сменилась почта).

```sql
CREATE TABLE users (
    user_id UInt32,
    email String,
    updated_at DateTime
) ENGINE = ReplacingMergeTree(updated_at) -- updated_at используется как версия
ORDER BY user_id;

INSERT INTO users VALUES (1, 'old@mail.com', '2023-01-01 10:00:00');
INSERT INTO users VALUES (1, 'new@mail.com', '2023-01-02 10:00:00');

-- Чтобы 100% получить только 'new@mail.com', используем FINAL:
SELECT * FROM users FINAL WHERE user_id = 1;
```

### 3. SummingMergeTree
При слиянии объединяет строки с одинаковым ключом сортировки, **суммируя** значения числовых колонок.

*   **Как работает:** Существенно экономит место на диске для предагрегированных данных.
*   **Пример использования:** Ежеминутная статистика показов и кликов рекламных баннеров.

```sql
CREATE TABLE banner_stats (
    date Date,
    banner_id UInt32,
    views UInt64,
    clicks UInt64
) ENGINE = SummingMergeTree()
ORDER BY (date, banner_id);

INSERT INTO banner_stats VALUES ('2023-10-01', 100, 5, 1);
INSERT INTO banner_stats VALUES ('2023-10-01', 100, 10, 2);

-- В фоне строки сольются в одну: ('2023-10-01', 100, 15, 3)
-- Но при чтении ВСЕГДА используйте GROUP BY, так как слияние могло еще не пройти:
SELECT banner_id, sum(views), sum(clicks) FROM banner_stats GROUP BY banner_id;
```

### 4. AggregatingMergeTree
Продвинутый брат `SummingMergeTree`. Может не только суммировать, но и хранить **промежуточные состояния** сложных функций (например, количество *уникальных* посетителей — `uniq`, или списки — `groupArray`).

*   **Как работает:** Обычно не используется сам по себе для вставки. В него пишут данные через `Materialized View`.
*   **Пример использования:** Быстрый дашборд с уникальными пользователями по дням.

```sql
-- Таблица для хранения агрегатов. Тип данных - AggregateFunction!
CREATE TABLE agg_stats (
    date Date,
    unique_users AggregateFunction(uniq, UInt32) 
) ENGINE = AggregatingMergeTree()
ORDER BY date;

-- Чтение из такой таблицы требует суффикса -Merge:
SELECT date, uniqMerge(unique_users) as users FROM agg_stats GROUP BY date;
```

### 5. CollapsingMergeTree
Создан для обновления и удаления данных без тяжелых блокировок. Использует дополнительную колонку `Sign` (1 или -1).

*   **Как работает:** Если при слиянии ClickHouse видит две строки с одинаковыми ключами, но у одной `Sign = 1` (появление), а у другой `Sign = -1` (отмена), он **взаимно уничтожает** (схлопывает) их.
*   **Пример использования:** Изменение баланса пользователя или расчет сессий.

```sql
CREATE TABLE balances (
    user_id UInt32,
    amount Float32,
    sign Int8
) ENGINE = CollapsingMergeTree(sign)
ORDER BY user_id;

-- Пользователь пополнил счет на 100
INSERT INTO balances VALUES (1, 100, 1);

-- Ошиблись! Нужно отменить и записать 150
INSERT INTO balances VALUES (1, 100, -1); -- Строка отмены
INSERT INTO balances VALUES (1, 150, 1);  -- Новое значение

-- При запросе умножаем на sign и суммируем:
SELECT user_id, sum(amount * sign) FROM balances GROUP BY user_id HAVING sum(sign) > 0;
```

### 6. ReplicatedMergeTree
Это не отдельная логика данных, а **надстройка (обертка)** над любым движком из семейства MergeTree (например, `ReplicatedSummingMergeTree`).

*   **Как работает:** Использует ZooKeeper (или ClickHouse Keeper) для синхронизации метаданных и кусков данных между серверами. Обеспечивает отказоустойчивость (High Availability).
*   **Пример:**
```sql
-- Макросы {shard} и {replica} автоматически подставляются из конфига сервера
CREATE TABLE events (
    id UInt32,
    event_name String
) ENGINE = ReplicatedMergeTree('/clickhouse/tables/{shard}/events', '{replica}')
ORDER BY id;
```

---

# 🛠 Другие движки (Специального назначения)

### 1. Log (а также TinyLog, StripeLog)
Максимально простой движок. Данные просто дописываются в конец файла (append-only). 

*   **Особенность:** Нет индексов, нет сортировки, не поддерживает параллельное чтение сложными запросами.
*   **Зачем нужен:** Хранение небольших объемов временных данных (до 1 млн строк). Например, таблица-справочник конфигураций или промежуточные логи для отладки.
```sql
CREATE TABLE config_temp (key String, val String) ENGINE = Log;
```

### 2. Memory
Все данные лежат только в оперативной памяти (RAM) сервера в несжатом виде. При перезапуске ClickHouse (или падении) **данные исчезают**.

*   **Особенность:** Самая высокая скорость чтения и записи. Нет индексов.
*   **Зачем нужен:** Тестирование, кэширование справочников, или для хранения промежуточных результатов для очень быстрых `JOIN`.
```sql
CREATE TABLE temp_users_cache (id UInt32, name String) ENGINE = Memory;
```

### 3. Distributed
Это **виртуальная таблица**. Она не хранит данные на своем диске. Она работает как прокси-маршрутизатор (роутер).

*   **Как работает:** Когда вы делаете `SELECT` к распределенной таблице, она отправляет запрос на все шарды кластера, собирает ответы, агрегирует их и отдает вам результат. При `INSERT` она распределяет данные по шардам (на основе ключа шардирования).
*   **Зачем нужен:** Запросы к кластеру, состоящему из нескольких серверов.

```sql
-- local_table - это таблица MergeTree, которая физически лежит на серверах
-- cluster_name - имя кластера из конфига
-- rand() - ключ шардирования (куда положить новые данные)
CREATE TABLE distributed_table AS local_table
ENGINE = Distributed(cluster_name, default, local_table, rand());
```

### 4. Kafka
Уникальный интеграционный движок. Позволяет ClickHouse притвориться консьюмером (потребителем) Apache Kafka.

*   **Как работает:** Вы делаете `SELECT` из этой таблицы, и ClickHouse читает сообщения из топика Kafka как строки. Однако напрямую данные в ней не хранятся, и читать дважды одни и те же сообщения нельзя (сдвигается offset).
*   **Паттерн использования:** Делают таблицу Kafka, а затем создают `Materialized View`, который автоматически вычитывает новые строки из таблицы Kafka и складывает их на жесткий диск в нормальную таблицу `MergeTree`.

```sql
CREATE TABLE kafka_queue (
    event_time DateTime,
    message String
) ENGINE = Kafka
SETTINGS kafka_broker_list = 'localhost:9092',
         kafka_topic_list = 'my_topic',
         kafka_group_name = 'clickhouse_group',
         kafka_format = 'JSONEachRow';
```

---


## 3. Партиционирование и первичный ключ

### Партиционирование (Partitioning)

`PARTITION BY` разделяет данные на физически независимые папки на диске.

```sql
PARTITION BY toYYYYMM(event_date)
```

Это означает, что все данные за январь 2024 → одна папка, февраль → другая папка.

**Зачем?**
*   Запрос `WHERE event_date >= '2024-01-01' AND event_date < '2024-02-01'` — ClickHouse читает **только папку января**, игнорируя остальные месяцы. Это называется **Partition Pruning**.
*   Удаление старых данных: `ALTER TABLE events DROP PARTITION '202312'` — мгновенная операция (просто удаляется папка).

### Первичный ключ и ключ сортировки

`ORDER BY` — это **ключ сортировки** данных внутри каждой партиции.
`PRIMARY KEY` — это подмножество `ORDER BY`, по которому строится разреженный индекс.

Если `PRIMARY KEY` не указан явно — он совпадает с `ORDER BY`.

```sql
-- Разреженный индекс: хранит позицию каждых 8192-й строки
-- Запрос WHERE user_id = 42 пропустит 99% данных, читая только нужные гранулы
ORDER BY (event_date, user_id)
```

---

## 4. Вставка данных: почему батчами?

**Никогда не вставляйте по одной строке в ClickHouse!**

```sql
-- Плохо: 1000 отдельных INSERT по одной строке
INSERT INTO events VALUES (...)  -- × 1000 раз

--  Хорошо: один INSERT с 1000 строк
INSERT INTO events VALUES (...), (...), (...) -- × 1000 в одном запросе
```

**Почему?** Каждый `INSERT` создаёт новый **part** на диске. При 1000 отдельных вставок — 1000 parts. ClickHouse не успевает их сливать, файловая система перегружается, запросы тормозят.

**Правило:** Минимальный батч — **1000 строк** или **одна вставка в 100-500 мс**.

**Архитектурное решение:** Данные буферизуются в приложении или через брокер:
```
Приложение → Kafka → ClickHouse Kafka Engine → MergeTree таблица
```

> **Подробный практический разбор:** Читайте в статье [Архитектура Ingestion Pipeline: RabbitMQ + ClickHouse](/MyDocs/sql/rabbit_vs_clickhouse), где детально разобрано, почему поштучная вставка вызывает ошибку `Too many parts`, как устроен `Append-Only Log` в RabbitMQ, и приведен готовый код Consumer на Go с Graceful Shutdown.

---

## 5. Репликация и шардирование

### Репликация (отказоустойчивость)
Используется движок `ReplicatedMergeTree` + **ClickHouse Keeper** (или ZooKeeper).

```sql
ENGINE = ReplicatedMergeTree('/clickhouse/tables/{shard}/events', '{replica}')
PARTITION BY toYYYYMM(event_date)
ORDER BY (event_date, user_id)
```

Каждая вставка реплицируется на все реплики. При падении одной ноды — данные читаются с другой.

### Шардирование (горизонтальное масштабирование)
Данные делятся между несколькими серверами. Для приложения — это единая `Distributed`-таблица:

```sql
-- Виртуальная таблица, объединяющая шарды
CREATE TABLE events_distributed AS events
ENGINE = Distributed(
    'my_cluster',  -- имя кластера из конфига
    'default',     -- база данных
    'events',      -- таблица на каждом шарде
    rand()         -- ключ шардирования (rand = случайное распределение)
);
```

---

## 6. Полезные функции ClickHouse

ClickHouse имеет богатую библиотеку аналитических функций:

```sql
-- Воронка: сколько пользователей прошли все шаги
SELECT windowFunnel(86400)(timestamp,
    event = 'visit',
    event = 'add_to_cart',
    event = 'purchase'
) AS funnel_step
FROM events
GROUP BY user_id;

-- Удержание (Retention): пришли ли пользователи на следующий день?
SELECT retention(
    event_date = today(),
    event_date = today() + 1
) FROM events GROUP BY user_id;

-- Приблизительный COUNT DISTINCT (быстрее точного)
SELECT uniqHLL12(user_id) FROM events;

-- Медиана (точная и приближённая)
SELECT quantile(0.5)(amount) FROM events;
SELECT quantileTDigest(0.5)(amount) FROM events;  -- быстрее, менее точная
```

---

## 7. Материализованные представления (Materialized Views)

**Проблема:** Если аналитический запрос тяжёлый (например, `GROUP BY` на 100 млрд строк) — он занимает несколько секунд даже в ClickHouse.

**Решение:** Материализованное представление считает агрегаты **во время вставки** и хранит готовый результат.

```sql
-- Таблица для хранения агрегатов
CREATE TABLE daily_sales_agg (
    event_date Date,
    category   String,
    total_sum  AggregateFunction(sum, Float64)
) ENGINE = AggregatingMergeTree()
ORDER BY (event_date, category);

-- Триггер: при каждой вставке в events — обновляет daily_sales_agg
CREATE MATERIALIZED VIEW daily_sales_mv TO daily_sales_agg AS
SELECT
    event_date,
    category,
    sumState(amount) AS total_sum
FROM events
GROUP BY event_date, category;
```

Теперь аналитический запрос по дашборду читает **из агрегированной таблицы**, а не из сырых данных — ответ за миллисекунды.

---

## 8. Когда брать ClickHouse?

**Выбирайте ClickHouse, если:**
*   Аналитика: `SUM`, `AVG`, `COUNT`, `GROUP BY` по миллиардам строк.
*   Временные ряды: метрики, логи, события (time-series data).
*   BI-дашборды, требующие интерактивной скорости ответа.
*   Данных несколько ТБ или ПБ.

**НЕ используйте, если:**
*   Нужны ACID-транзакции и частые UPDATE/DELETE по отдельным строкам.
*   Маленький объём данных — обычный PostgreSQL справится.
*   Нужны JOIN-ы с произвольными условиями между большими таблицами.

---

## 9. Порты ClickHouse

| Порт | Протокол | Для чего |
| :--- | :--- | :--- |
| **8123** | HTTP | Основной HTTP-интерфейс. Запросы через `curl` или HTTP-клиент. Удобен для отладки. |
| **9000** | Native (TCP) | Нативный бинарный протокол ClickHouse. Быстрее HTTP, используют Go/Python драйверы. |
| **8443** | HTTPS | Зашифрованный HTTP-интерфейс. |
| **9440** | Native over TLS | Зашифрованный нативный протокол. |
| **9004** | MySQL compat | Совместимость с MySQL — можно подключиться MySQL-клиентом. |

**Почему 8123 и 9000?** Никакого стандарта — Яндекс просто выбрал свободные порты при разработке. Сейчас это «де-факто стандарт» ClickHouse.

**В `docker-compose.yml`** обычно открывают:
```yaml
ports:
  - "8123:8123" # HTTP: удобно дебажить через curl
  - "9000:9000" # Native: Go-драйвер использует этот порт
```

---

### Шпаргалка: Движки MergeTree

| Движок | Когда использовать |
| :--- | :--- |
| **MergeTree** | Стандартный случай. Исторические данные, логи. |
| **ReplacingMergeTree** | Нужно хранить «последнее состояние» объекта. |
| **SummingMergeTree** | Счётчики, которые нужно суммировать при merge. |
| **ReplicatedMergeTree** | Production кластер с репликацией. |
| **Distributed** | Объединение нескольких шардов в одну таблицу. |
| **Kafka engine** | Прямая интеграция с Kafka для стриминга данных. |

---

### 💡 Краткое резюме: что выбрать?
1. Нужна обычная надежная аналитика? $\rightarrow$ **MergeTree**
2. Нужны агрегации "на лету" (счетчики)? $\rightarrow$ **SummingMergeTree**
3. Нужно хранить актуальные профили (без истории)? $\rightarrow$ **ReplacingMergeTree**
4. Кластер из нескольких машин (отказоустойчивость)? $\rightarrow$ Добавляем приставку **Replicated...**
5. Читаем стрим данных? $\rightarrow$ **Kafka + Materialized View + MergeTree**
---