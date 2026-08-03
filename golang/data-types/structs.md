---
sidebar_position: 7
---

# Структуры (struct)

Структура (`struct`) — это составной тип данных, объединяющий поля разных типов под одним именем. Это основной инструмент моделирования предметной области в Go. В отличие от объектно-ориентированных языков, Go не имеет классов с иерархией наследования: вместо этого применяются структуры с методами и встраивание (embedding).

---

## 1. Объявление и инициализация

```go
// Объявление типа структуры
type User struct {
    ID       int64
    Name     string
    Email    string
    IsActive bool
}
```

### Способы создания экземпляра

```go
// 1. Литерал с именованными полями (рекомендуется — порядок не важен)
u1 := User{
    ID:       1,
    Name:     "Alice",
    Email:    "alice@example.com",
    IsActive: true,
}

// 2. Литерал без имен полей (хрупко — порядок строго совпадает с объявлением)
// Избегайте этого способа: при добавлении нового поля в структуру код сломается.
u2 := User{1, "Bob", "bob@example.com", false}

// 3. Через new — возвращает *User (указатель), поля нулевые
u3 := new(User)
u3.Name = "Charlie"

// 4. Переменная с нулевыми значениями
var u4 User // ID=0, Name="", Email="", IsActive=false
```

### Нулевые значения полей

Структура без явной инициализации содержит нулевые значения для каждого поля: `0` для чисел, `""` для строк, `false` для bool, `nil` для указателей, срезов и карт.

---

## 2. Методы на структурах

Метод — это функция, привязанная к типу через получателя (receiver). Это единственный механизм, через который структуры получают поведение.

### Получатель по значению (Value Receiver)

Метод получает **копию** структуры. Исходный объект не изменяется.

```go
func (u User) Greeting() string {
    return "Hello, " + u.Name
}
```

### Получатель по указателю (Pointer Receiver)

Метод получает **указатель** на структуру. Все изменения внутри метода влияют на оригинал.

```go
func (u *User) Deactivate() {
    u.IsActive = false // Изменяет оригинальный объект
}
```

### Когда какой receiver использовать

| Ситуация | Receiver |
| :--- | :--- |
| Метод изменяет состояние структуры | `*T` (указатель) |
| Структура большая (тяжело копировать) | `*T` (указатель) |
| Метод только читает данные, структура маленькая | `T` (значение) |
| Реализация интерфейса, где другие методы уже `*T` | `*T` (единообразие) |

**Правило:** если хотя бы один метод типа использует pointer receiver, делайте все методы pointer receiver. Смешение создаёт неочевидное поведение при присваивании в интерфейс.

### Полный пример

```go
type User struct {
    ID       int64
    Name     string
    IsActive bool
}

func (u User) String() string {
    return fmt.Sprintf("User{ID: %d, Name: %q}", u.ID, u.Name)
}

func (u *User) Deactivate() {
    u.IsActive = false
}

func main() {
    u := &User{ID: 1, Name: "Alice", IsActive: true}
    fmt.Println(u)       // User{ID: 1, Name: "Alice"}
    u.Deactivate()
    fmt.Println(u.IsActive) // false
}
```

---

## 3. Интерфейс `fmt.Stringer`

Если тип реализует метод `String() string`, пакет `fmt` автоматически вызывает его при печати (`%s`, `%v`, `fmt.Println`). Это стандартный способ задать человекочитаемое представление структуры.

```go
// Интерфейс fmt.Stringer определен как:
// type Stringer interface { String() string }

type Product struct {
    Name  string
    Price float64
}

func (p Product) String() string {
    return fmt.Sprintf("%s (%.2f руб.)", p.Name, p.Price)
}

func main() {
    p := Product{Name: "Кофе", Price: 249.90}
    fmt.Println(p) // Кофе (249.90 руб.)
}
```

---

## 4. Теги структуры (Struct Tags)

Тег — это строковая метаинформация, прикреплённая к полю структуры. Теги считываются библиотеками через пакет `reflect` во время выполнения. Сам компилятор Go теги игнорирует.

```go
type Article struct {
    ID        int64   `json:"id"             db:"id"`
    Title     string  `json:"title"          db:"title"`
    Content   string  `json:"content"        db:"content"`
    IsDeleted bool    `json:"is_deleted"     db:"is_deleted"`
    InternalNote string `json:"-"`           // "-" — поле полностью игнорируется при JSON-сериализации
    Price     float64 `json:"price,omitempty"` // "omitempty" — поле опускается если нулевое (0, "", false, nil)
}
```

### Распространённые теги

| Тег | Пакет | Назначение |
| :--- | :--- | :--- |
| `json:"name"` | `encoding/json` | Имя ключа при сериализации/десериализации JSON |
| `json:",omitempty"` | `encoding/json` | Пропустить поле, если значение нулевое |
| `json:"-"` | `encoding/json` | Полностью исключить поле из JSON |
| `db:"column_name"` | `sqlx`, `pgx` | Сопоставление с колонкой SQL-таблицы |
| `validate:"required,min=3"` | `go-playground/validator` | Правила валидации входных данных |
| `yaml:"name"` | `gopkg.in/yaml.v3` | Имя ключа при работе с YAML |

---

## 5. Анонимные поля и Встраивание (Embedding)

Встраивание позволяет включить один тип в другой без явного имени поля. Это механизм повторного использования кода, аналогичный наследованию в других языках (но работающий по-другому: это **композиция**, а не наследование).

```go
type Base struct {
    ID        int64
    CreatedAt time.Time
    UpdatedAt time.Time
}

type Post struct {
    Base           // Встраивание — поля и методы Base становятся доступны напрямую
    Title   string
    Content string
}

func main() {
    p := Post{
        Base:    Base{ID: 42, CreatedAt: time.Now()},
        Title:   "Hello, World",
        Content: "First post",
    }

    // Доступ к полям Base напрямую (без Base.ID)
    fmt.Println(p.ID)        // 42
    fmt.Println(p.Base.ID)   // То же самое — оба варианта корректны
    fmt.Println(p.CreatedAt) // time.Time
}
```

### Продвижение методов (Method Promotion)

Методы встроенного типа становятся методами внешнего типа:

```go
type Logger struct{}

func (l Logger) Log(msg string) {
    fmt.Println("[LOG]", msg)
}

type Service struct {
    Logger // Встраиваем Logger
    name string
}

func main() {
    s := Service{name: "auth"}
    s.Log("started") // Метод Log доступен напрямую через Service
}
```

### Разрешение конфликтов имён

Если внешняя структура объявляет поле или метод с тем же именем, что и встроенный тип, **внешнее определение приоритетнее**. Встроенный вариант по-прежнему доступен через явное обращение `s.Logger.Log(...)`.

---

## 6. Структуры как value type

Структуры в Go — **значимый тип (value type)**. При присваивании или передаче в функцию создаётся полная копия структуры.

```go
func deactivate(u User) { // u — копия
    u.IsActive = false
}

func deactivatePtr(u *User) { // u — указатель на оригинал
    u.IsActive = false
}

func main() {
    u := User{Name: "Alice", IsActive: true}
    
    deactivate(u)
    fmt.Println(u.IsActive) // true — оригинал не изменился
    
    deactivatePtr(&u)
    fmt.Println(u.IsActive) // false — оригинал изменён
}
```

### Когда передавать по значению, когда по указателю

| | По значению `T` | По указателю `*T` |
| :--- | :--- | :--- |
| Изменение оригинала | Нет | Да |
| Накладные расходы | Копирование всей структуры | Копирование только адреса (8 байт) |
| Безопасность (nil-pointer) | Нет nil | Возможен nil — нужна проверка |
| Применение | Маленькие read-only структуры | Большие структуры, изменяемое состояние |

---

## 7. Сравнение структур

Структуры в Go **сравниваемы** через `==` и `!=`, если все их поля сравниваемы. Поля типов `slice`, `map`, `func` делают структуру несравниваемой.

```go
type Point struct {
    X, Y int
}

p1 := Point{1, 2}
p2 := Point{1, 2}
p3 := Point{3, 4}

fmt.Println(p1 == p2) // true
fmt.Println(p1 == p3) // false

// Структуру со слайсом сравнить через == нельзя:
type Data struct {
    Items []int
}
// d1 == d2 — ошибка компиляции: invalid operation (slice can only be compared to nil)
```

Для сравнения структур со слайсами, картами или функциями используют `reflect.DeepEqual` (медленно) или ручное сравнение полей.

---

## 8. Анонимные структуры

Структуру можно объявить и использовать без присвоения ей имени. Это удобно для одноразовых локальных данных.

```go
// Для локальной конфигурации внутри функции
config := struct {
    Host string
    Port int
}{
    Host: "localhost",
    Port: 5432,
}
fmt.Println(config.Host, config.Port) // localhost 5432

// В тестах — удобно для table-driven tests
tests := []struct {
    input    string
    expected int
}{
    {"hello", 5},
    {"go", 2},
    {"", 0},
}

for _, tt := range tests {
    result := len(tt.input)
    if result != tt.expected {
        fmt.Printf("FAIL: len(%q) = %d, want %d\n", tt.input, result, tt.expected)
    }
}
```

---

## 9. Ключевые правила

1. Используйте **именованные поля** при инициализации (`User{Name: "Alice"}`), а не позиционные — это защищает код от поломки при добавлении новых полей в структуру.
2. Если хотя бы один метод требует `*T`, делайте **все методы** pointer receiver.
3. Используйте **встраивание** (embedding) вместо наследования — это Go-way для переиспользования поведения.
4. Для крупных структур всегда **передавайте указатель** (`*T`), чтобы избежать дорогостоящего копирования.
5. **Не встраивайте** тип только ради доступа к одному методу, если цель — просто скрыть зависимость. Явное поле (`logger Logger`) читается понятнее, чем неявное продвижение метода.
