---
sidebar_position: 7
---

# Внешние ключи в миграциях Laravel

**Внешний ключ (Foreign Key)** — это ограничение на уровне БД, которое гарантирует целостность связанных данных. Если в таблице `posts` есть колонка `user_id`, внешний ключ не позволит создать пост со ссылкой на несуществующего пользователя и не позволит удалить пользователя, пока у него есть записи.

В Laravel существует два подхода к определению внешних ключей в миграциях. Переход к новому синтаксису произошёл в **Laravel 7**.

---

## 1. Классический подход (до Laravel 7)

Создание внешнего ключа делится на два явных шага: сначала создаётся колонка нужного типа, затем на неё навешивается ограничение.

```php
Schema::create('posts', function (Blueprint $table) {
    $table->id();

    // Шаг 1: Явно создаём колонку
    $table->unsignedBigInteger('user_id');

    // Шаг 2: Объявляем ограничение внешнего ключа
    $table->foreign('user_id')
          ->references('id')
          ->on('users')
          ->onUpdate('cascade')
          ->onDelete('cascade');

    $table->timestamps();
});
```

### Главная ловушка: несовпадение типов

Начиная с Laravel 5.8, метод `$table->id()` создаёт колонку типа `BIGINT UNSIGNED`. Если для внешнего ключа использовать просто `$table->integer('user_id')`, миграция упадёт с ошибкой — типы `INT` и `BIGINT UNSIGNED` не совпадают. Поэтому единственно правильный тип для колонки-ссылки в классическом подходе — `unsignedBigInteger()`.

> [!CAUTION]
> **Типичная ошибка новичка:**
> ```php
> //  Неверно — тип INT не совпадает с BIGINT UNSIGNED первичного ключа
> $table->integer('user_id');
> $table->foreign('user_id')->references('id')->on('users');
>
> //  Верно
> $table->unsignedBigInteger('user_id');
> $table->foreign('user_id')->references('id')->on('users');
> ```

Удаление внешнего ключа и самой колонки в классическом подходе:

```php
Schema::table('posts', function (Blueprint $table) {
    $table->dropForeign(['user_id']); // сначала снимаем ограничение
    $table->dropColumn('user_id');    // затем удаляем колонку
});
```

---

## 2. Новый подход: `foreignId()` + `constrained()` (Laravel 7+)

Чтобы избавиться от многословности и проблем с типами, в Laravel 7 добавили методы `foreignId()` и `constrained()`.

```php
Schema::create('posts', function (Blueprint $table) {
    $table->id();

    $table->foreignId('user_id')
          ->constrained()
          ->onUpdate('cascade')
          ->onDelete('cascade');

    $table->timestamps();
});
```

### Как это работает

- **`foreignId('user_id')`** — создаёт колонку типа `UNSIGNED BIGINT`. Тип всегда точно совпадает с `$table->id()`, никаких ошибок.
- **`constrained()`** — анализирует имя колонки: берёт слово `user` из `user_id`, добавляет `s` и получает таблицу `users`. Автоматически прописывает `references('id')->on('users')`.

Результат — один компактный вызов вместо пяти строк.

---

## 3. Нестандартные имена колонок

Автоматический вывод имени таблицы работает только если колонка называется по шаблону `{таблица_в_единственном_числе}_id`. Если имя нестандартное — таблицу нужно передать явно:

```php
// Колонка author_id ссылается на таблицу users — имена не совпадают,
// поэтому таблицу указываем вручную
$table->foreignId('author_id')
      ->constrained('users')
      ->onDelete('cascade');
```

---

## 4. `foreignIdFor()` — через модель (Laravel 8+)

Ещё более явный вариант: передать модель напрямую. Laravel сам извлечёт имя таблицы и создаст правильную колонку.

```php
use App\Models\User;

Schema::create('posts', function (Blueprint $table) {
    $table->id();

    $table->foreignIdFor(User::class) // создаст колонку `user_id`
          ->constrained()
          ->onDelete('cascade');

    $table->timestamps();
});
```

Это удобно, когда имя таблицы у модели нестандартное — не нужно помнить или уточнять его вручную, Laravel возьмёт его из самой модели.

---

## 5. Поведение при удалении и обновлении

Оба подхода поддерживают одинаковые стратегии для `onDelete()` и `onUpdate()`:

| Стратегия | Поведение |
|---|---|
| `cascade` | При удалении/обновлении родительской записи — то же действие применяется к дочерним |
| `restrict` | Запрещает удаление/обновление родителя, если есть дочерние записи |
| `set null` | При удалении родителя — ставит `NULL` в колонку внешнего ключа (колонка должна быть `nullable`) |
| `no action` | Аналог `restrict` в большинстве СУБД |

```php
// Пример: при удалении пользователя его посты тоже удаляются,
// при обновлении id — обновляется и ссылка в posts
$table->foreignId('user_id')
      ->constrained()
      ->onUpdate('cascade')
      ->onDelete('cascade');

// Пример: при удалении категории у постов поле category_id обнулится
$table->foreignId('category_id')
      ->nullable()
      ->constrained()
      ->onDelete('set null');
```

### Методы-хелперы (Laravel 8+)

Начиная с Laravel 8, вместо строк в `onDelete()` / `onUpdate()` можно использовать выразительные методы. IDE их автодополняет, поэтому опечатки исключены.

```php
$table->foreignId('user_id')
      ->constrained()
      ->cascadeOnUpdate()  // вместо ->onUpdate('cascade')
      ->cascadeOnDelete(); // вместо ->onDelete('cascade')
```

| Действие | Старый вариант | Новый вариант (Laravel 8+) |
|---|---|---|
| Каскадное удаление | `->onDelete('cascade')` | `->cascadeOnDelete()` |
| Каскадное обновление | `->onUpdate('cascade')` | `->cascadeOnUpdate()` |
| Установка в NULL | `->onDelete('set null')` | `->nullOnDelete()` |
| Запрет удаления | `->onDelete('restrict')` | `->restrictOnDelete()` |

> [!NOTE]
> `->nullOnDelete()` требует, чтобы сама колонка была `nullable()`. Иначе БД вернёт ошибку при попытке записать `NULL` в `NOT NULL`-поле:
> ```php
> $table->foreignId('category_id')->nullable()->constrained()->nullOnDelete();
> ```

---

## 6. Когда использовать классический подход

Новый подход работает только с первичными ключами типа `BIGINT UNSIGNED` (то есть созданными через `$table->id()`). Классический подход остаётся необходимым в двух случаях:

- **Legacy-базы данных** — первичный ключ имеет нестандартный тип (`INT`, `VARCHAR` и т.д.)
- **UUID-ключи** — хотя для них уже есть отдельный метод `foreignUuid('user_id')->constrained()`

```php
// Ссылка на таблицу с обычным INT первичным ключом (legacy)
$table->integer('legacy_category_id')->unsigned();
$table->foreign('legacy_category_id')->references('id')->on('old_categories');

// Ссылка на UUID
$table->foreignUuid('user_id')->constrained();
```

---

## Итоговое сравнение

| Характеристика | Классический подход | Новый подход (`foreignId`) |
|---|---|---|
| Создание колонки | Явное: `unsignedBigInteger('user_id')` | Скрытое: `foreignId('user_id')` |
| Объявление связи | `->foreign()->references()->on()` | `->constrained()` |
| Риск ошибки типов | Высокий (легко перепутать `integer` и `unsignedBigInteger`) | Нулевой |
| Удаление ключа | `$table->dropForeign(['user_id'])` | `$table->dropConstrainedForeignId('user_id')` |
| Поддержка нестандартных типов PK |  Да |  Нет |
| Версия Laravel | Любая | 7+ |

> [!TIP]
> В современных проектах (Laravel 7+) всегда используйте `foreignId()->constrained()`. Он короче, безопаснее и читается как документация сам по себе. Классический подход оставьте для работы с унаследованными схемами.
