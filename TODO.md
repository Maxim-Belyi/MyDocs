# План развития базы знаний (Аудит и доработки)

Этот файл содержит чек-лист недостающих и требующих дополнения статей по результатам аудита документации.

---

## 1. Раздел База (`docs/`)

- [x] **Брокер сообщений RabbitMQ (`docs/general/rabbitmq.md`)** — архитектура, Push-модель, `prefetch_count`, `ack/nack/reject`, идемпотентность в БД, почему нельзя использовать timestamp в качестве `message_id`.
- [ ] **Структуры данных и алгоритмы (`docs/data-structures/` или `docs/general/`)**
  - [ ] Очередь (Queue)
  - [ ] Связные списки (Linked List)
  - [ ] Хеш-таблицы (Hash Table / Map)
  - [ ] Деревья (Binary Search Tree)
  - [ ] Оценка сложности алгоритмов (Big O Notation: `O(1)`, `O(n)`, `O(log n)`, `O(n²)`)
- [ ] **Управление памятью (`docs/memory/stack-vs-heap.md`)**
  - [ ] Фундаментальное сравнение Stack vs Heap (принципы выделения памяти, скорость, фрагментация)
- [ ] **Архитектура и паттерны (`docs/general/` или `docs/http/`)**
  - [ ] Сравнение протоколов взаимодействия: REST API vs gRPC vs GraphQL vs WebSockets
  - [ ] Принципы проектирования: SOLID, DRY, KISS, YAGNI

---

## 2. Раздел GoLang (`golang/`)

- [ ] **Конкурентность (`golang/concurrency/`)**
  - [ ] Горутины (Goroutines): модель M:N, планировщик Go (`GOMAXPROCS`), устройство стека горутины
  - [ ] Каналы (Channels): буферизованные/небуферизованные, закрытие каналов, `select`, паттерны (Worker Pool, Fan-In/Fan-Out, Pipeline)
  - [ ] Пакет `sync` / `sync/atomic`: `Mutex`, `RWMutex`, `WaitGroup`, `Once`, `sync.Pool`, `sync.Map`, детектор гонок (`go test -race`)
  - [ ] Контекст (`context.Context`): управление таймаутами и отменой горутин (`WithCancel`, `WithTimeout`, `WithValue`)
- [ ] **Обработка ошибок и паники (`golang/errors/`)**
  - [ ] Интерфейс `error`, создание и оборачивание ошибок (`fmt.Errorf` с `%w`), `errors.Is`, `errors.As`
  - [ ] `defer`, `panic` и `recover`: порядок выполнения LIFO, вычисление аргументов `defer`, безопасный перехват паники
- [ ] **Модули и структура проекта**
  - [ ] Go Modules (`go.mod`, `go.sum`), управление зависимостями
  - [ ] Standard Project Layout (назначение директорий `cmd/`, `internal/`, `pkg/`)

---

## 3. Раздел SQL (`sql/`)

- [ ] **Новые подробные статьи с примерами запросов**
  - [ ] JOIN-соединения (`sql/joins.md`): `INNER JOIN`, `LEFT/RIGHT JOIN`, `FULL OUTER JOIN`, `CROSS JOIN`, разница между `UNION` и `UNION ALL`
  - [ ] Группировка и агрегаты (`sql/group-by.md`): `GROUP BY`, `HAVING`, `COUNT`, `SUM`, `AVG`, `MIN`, `MAX`. Порядок выполнения SQL-запроса (`FROM` -> `WHERE` -> `GROUP BY` -> `HAVING` -> `SELECT` -> `ORDER BY` -> `LIMIT`)
  - [ ] Оконные функции (`sql/window-functions.md`): `OVER()`, `PARTITION BY`, `ROW_NUMBER()`, `RANK()`, `LAG()`, `LEAD()`
  - [ ] Индексы и оптимизация (`sql/indexes.md`): `B-Tree` и `Hash`-индексы, составные индексы (порядок колонок), селективность, анализ через `EXPLAIN ANALYZE`
  - [ ] **Дедупликация в OLTP vs OLAP (`sql/deduplication-olap-oltp.md`)**: почему `UNIQUE` индексы подходят для PostgreSQL (строковые БД), но замедляют ClickHouse (колоночные БД); асинхронная дедупликация через `ReplacingMergeTree` в ClickHouse; паттерн двухуровневой дедупликации (быстрый кэш в `Redis` + гарантированное схлопывание в `ReplacingMergeTree`)
- [ ] **Дополнение существующих статей**
  - [ ] Первичный ключ (`sql/primary-key.md`): добавить синтаксис создания в SQL (`PRIMARY KEY`), автоинкремент (`SERIAL` / `AUTO_INCREMENT`), сравнение суррогатных (`ID`/`UUID`) и естественных ключей, составные ключи

---

## 4. Раздел Git (`git/`)

- [ ] **Отложенные изменения (`git/Git-commands/stash.md`)**
  - [ ] Команды `git stash push/pop/list/apply/drop` для сохранения незакоммиченных изменений
- [ ] **Rebase vs Merge (`git/Git/rebase-vs-merge.md`)**
  - [ ] Как работает `rebase`, интерактивный режим (`rebase -i`), отличие от `merge`, правила работы с публичными ветками
- [ ] **Точечный перенос коммитов (`git/Git-commands/cherry-pick.md`)**
  - [ ] Работа с командой `git cherry-pick <commit-hash>`
