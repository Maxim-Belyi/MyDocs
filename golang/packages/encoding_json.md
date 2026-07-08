---
sidebar_position: 18
---

# encoding/json

Пакет `encoding/json` реализует сериализацию и десериализацию данных в формат JSON. Это стандартный пакет для любой работы с JSON в Go — REST API, конфиги, хранение данных.

---

## 1. Базовые теги struct

Теги управляют именованием полей и поведением при сериализации:

```go
type User struct {
    ID        int       `json:"id"`
    Name      string    `json:"name"`
    Email     string    `json:"email,omitempty"`  // Пропустить если пусто (0, "", nil)
    Password  string    `json:"-"`                // Всегда пропускать
    CreatedAt time.Time `json:"created_at"`
    Metadata  any       `json:"metadata,omitempty"`
}
```

---

## 2. Сериализация (Marshal)

```go
user := User{ID: 1, Name: "Alice", Email: "alice@example.com"}

// struct → []byte
data, err := json.Marshal(user)
if err != nil {
    return fmt.Errorf("marshal: %w", err)
}
fmt.Println(string(data))
// {"id":1,"name":"Alice","email":"alice@example.com","created_at":"0001-01-01T00:00:00Z"}

// Красивый вывод с отступами (для логирования / отладки)
data, err := json.MarshalIndent(user, "", "  ")
```

---

## 3. Десериализация (Unmarshal)

```go
data := []byte(`{"id":1,"name":"Alice","email":"alice@example.com"}`)

var user User
if err := json.Unmarshal(data, &user); err != nil {
    return fmt.Errorf("unmarshal: %w", err)
}
fmt.Println(user.Name) // "Alice"
```

> **Важно:** `json.Unmarshal` **игнорирует** поля JSON, которых нет в структуре. Если хотите ловить такие случаи — используйте `Decoder` с `DisallowUnknownFields()`.

---

## 4. Потоковая обработка: Encoder и Decoder

Используйте для HTTP-запросов/ответов и больших JSON-файлов — избегает промежуточного `[]byte`.

```go
// Encoder — запись JSON в io.Writer (например, http.ResponseWriter)
func writeJSON(w http.ResponseWriter, v any) error {
    w.Header().Set("Content-Type", "application/json")
    return json.NewEncoder(w).Encode(v)
}

// Decoder — чтение JSON из io.Reader (например, r.Body)
func readJSON(r *http.Request, v any) error {
    dec := json.NewDecoder(r.Body)
    dec.DisallowUnknownFields()   // Ошибка если в JSON есть лишние поля
    return dec.Decode(v)
}
```

### Чтение большого JSON-файла (NDJSON / JSON Lines)

```go
file, _ := os.Open("data.jsonl")
decoder := json.NewDecoder(file)

for decoder.More() {   // Есть ли ещё объекты?
    var record Record
    if err := decoder.Decode(&record); err != nil {
        log.Fatal(err)
    }
    process(record)
}
```

---

## 5. Произвольный JSON (без структуры)

Когда структура JSON заранее неизвестна:

```go
// Вариант 1: map[string]any
var m map[string]any
json.Unmarshal(data, &m)
name := m["name"].(string)           // Требует type assertion
age := int(m["age"].(float64))       // Числа → float64 по умолчанию!

// Вариант 2: json.RawMessage — отложенная обработка
type Response struct {
    Status string          `json:"status"`
    Data   json.RawMessage `json:"data"`   // Не парсим сразу
}

var resp Response
json.Unmarshal(data, &resp)
// Позже парсим Data в нужный тип в зависимости от Status
var user User
json.Unmarshal(resp.Data, &user)
```

---

## 6. Кастомная сериализация

Реализуйте интерфейсы для нестандартного поведения:

```go
// json.Marshaler
type Color int

const (
    Red Color = iota
    Green
    Blue
)

func (c Color) MarshalJSON() ([]byte, error) {
    names := map[Color]string{Red: "red", Green: "green", Blue: "blue"}
    return json.Marshal(names[c])
}

func (c *Color) UnmarshalJSON(data []byte) error {
    var name string
    if err := json.Unmarshal(data, &name); err != nil {
        return err
    }
    switch name {
    case "red":   *c = Red
    case "green": *c = Green
    case "blue":  *c = Blue
    default:      return fmt.Errorf("unknown color: %s", name)
    }
    return nil
}
```

---

## 7. Типичные ошибки

### Числа из `map[string]any` — всегда float64

```go
var m map[string]any
json.Unmarshal([]byte(`{"age": 30}`), &m)

age := m["age"].(float64)    //  Правильно
age := m["age"].(int)        //  panic: interface conversion

// Или используйте json.Decoder с UseNumber()
dec := json.NewDecoder(strings.NewReader(data))
dec.UseNumber()
// Тогда m["age"].(json.Number).Int64()
```

### Поля с нулевым значением

```go
type Config struct {
    Port int `json:"port"`
}

// json.Marshal({Port: 0}) → {"port":0}   — поле НЕ пропускается!
// Чтобы пропускать нули, нужно использовать указатель + omitempty:
type Config struct {
    Port *int `json:"port,omitempty"`
}
```

### Пустой срез vs nil

```go
// nil срез → "null"
var s []int
json.Marshal(s)     // null

// Пустой срез → "[]"
s = []int{}
json.Marshal(s)     // []

// Для API лучше всегда инициализировать: s = make([]int, 0)
```

---

## Итог: Чек-лист по encoding/json

1.  **HTTP-хендлеры:** используйте `json.NewEncoder(w).Encode(v)` — без промежуточного `[]byte`.
2.  **Неизвестные поля:** добавьте `dec.DisallowUnknownFields()` для строгой валидации входящих запросов.
3.  **omitempty:** работает с нулевыми значениями (0, "", false, nil). Для опциональных числовых полей используйте `*int`, не `int`.
4.  **Числа в map:** при работе с `map[string]any` помните, что все числа приходят как `float64`.
5.  **Пустые срезы:** инициализируйте `make([]T, 0)` вместо `nil`, чтобы получить `[]` вместо `null` в JSON.
