---
sidebar_position: 10
---

# sqlx

Пакет `sqlx` (`github.com/jmoiron/sqlx`) — это расширение стандартного пакета Go `database/sql`. Он не является полноценной ORM (как GORM), но значительно упрощает работу с базой данных, добавляя возможность маппинга результатов SQL-запросов напрямую в структуры Go.

---

## Зачем нужен этот пакет?

При использовании стандартного `database/sql` вам нужно вручную сканировать каждую колонку в отдельную переменную.
С `sqlx` вы описываете структуру с тегами `db`, и библиотека сама раскидывает данные по полям. Это избавляет от огромного количества шаблонного кода, сохраняя при этом полный контроль над SQL-запросами.

---

## Основные методы

### sqlx.Connect и sqlx.Open
Аналоги стандартных методов, но возвращают структуру `*sqlx.DB`, которая содержит расширенные функции.

* `sqlx.Open(driverName, dataSourceName)`: только инициализирует пул соединений.
* `sqlx.Connect(driverName, dataSourceName)`: инициализирует пул и сразу выполняет `Ping()`, проверяя доступность базы.

```go
db, err := sqlx.Connect("postgres", "user=foo dbname=bar sslmode=disable")
if err != nil {
    log.Fatalln(err)
}
```

### Get
Используется для получения **одной** записи. Метод выполняет запрос и сканирует результат в переданную структуру. Если запись не найдена, возвращает ошибку `sql.ErrNoRows`.

```go
func (db *DB) Get(dest interface{}, query string, args ...interface{}) error
```

**Пример:**
```go
type User struct {
    ID    int    `db:"id"`
    Name  string `db:"first_name"`
    Email string `db:"email"`
}

var user User
err := db.Get(&user, "SELECT * FROM users WHERE id=$1", 1)
```

### Select
Используется для получения **множества** записей. Результат сканируется в срез (slice) структур.

```go
func (db *DB) Select(dest interface{}, query string, args ...interface{}) error
```

**Пример:**
```go
var users []User
err := db.Select(&users, "SELECT * FROM users ORDER BY first_name ASC")
```

### NamedExec
Позволяет выполнять SQL-запросы с использованием **именованных параметров** вместо позиционных (`$1`, `$2` или `?`). Значения берутся из полей переданной структуры или `map`.

```go
func (db *DB) NamedExec(query string, arg interface{}) (sql.Result, error)
```

**Пример со структурой:**
```go
// Имена параметров :first_name и :email берутся из тегов `db` структуры user
query := `INSERT INTO users (first_name, email) VALUES (:first_name, :email)`
result, err := db.NamedExec(query, &user)
```

### NamedQuery
Аналог `NamedExec`, но используется для запросов `SELECT`, когда вам нужно передать структуру в качестве параметров фильтрации, и получить `*sqlx.Rows` для перебора результатов.

---

### sqlx.In
Расширяет стандартный синтаксис SQL, позволяя передавать срезы (slices) в оператор `IN`. Стандартный `database/sql` не умеет разворачивать массивы в запросы вида `WHERE id IN (?, ?, ?)`.

```go
query, args, err := sqlx.In("SELECT * FROM users WHERE id IN (?)", []int{1, 2, 3})
// sqlx.In возвращает запрос с нужным количеством знаков вопроса
query = db.Rebind(query) // Адаптирует '?' под нужный драйвер (например, '$1, $2, $3' для Postgres)
err = db.Select(&users, query, args...)
```

### StructScan (для строк sql.Rows)
Если вы выполняете сложный запрос через `Queryx` (который возвращает `*sqlx.Rows`), вы можете сканировать каждую строку в структуру вручную, используя `StructScan`.

```go
rows, err := db.Queryx("SELECT * FROM users")
for rows.Next() {
    var u User
    err = rows.StructScan(&u)
}
```

---

## Работа с транзакциями

Транзакции в `sqlx` работают через `*sqlx.Tx`, который имеет те же методы (`Get`, `Select`, `NamedExec`), что и `*sqlx.DB`.

```go
tx, err := db.Beginx()
if err != nil {
    log.Fatal(err)
}

_, err = tx.NamedExec(`UPDATE users SET status = :status WHERE id = :id`, user)
if err != nil {
    tx.Rollback() // Откат при ошибке
    log.Fatal(err)
}

tx.Commit() // Успешное завершение
```

---

## Итог: Чек-лист по пакету sqlx

1. **Теги структуры:** всегда используйте тег `db` в структурах, чтобы указать `sqlx`, к какой колонке в базе привязано поле.
2. **Получение данных:** используйте `Get` для возврата одной строки (заменяет `QueryRow`) и `Select` для списка строк (заменяет `Query`).
3. **Именованные параметры:** используйте `NamedExec` для запросов `INSERT` и `UPDATE`. Это делает код более читаемым и защищает от ошибок с порядком параметров.
4. **Безопасность:** `sqlx` (как и `database/sql`) защищает от SQL-инъекций при передаче параметров через методы `Get`, `Select` и именованные запросы, подготавливая выражения на уровне драйвера.
