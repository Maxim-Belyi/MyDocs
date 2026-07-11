---
sidebar_position: 16
---

# strings и strconv

Два самых часто используемых пакета для работы со строками. `strings` — операции над строками, `strconv` — конвертация между строками и числами/булевыми значениями.

---

## Пакет strings

### 1. Поиск и проверки

```go
import "strings"

s := "Hello, Go World!"

strings.Contains(s, "Go")          // true
strings.HasPrefix(s, "Hello")      // true
strings.HasSuffix(s, "World!")     // true
strings.Count(s, "o")              // 2
strings.Index(s, "Go")             // 7  (-1 если не найдено)
strings.LastIndex(s, "o")          // 9
strings.ContainsAny(s, "aeiou")    // true (хотя бы один символ из набора)
strings.ContainsRune(s, 'G')       // true
strings.EqualFold("Go", "go")      // true (без учёта регистра)
```

### 2. Преобразования

```go
strings.ToUpper("hello")           // "HELLO"
strings.ToLower("HELLO")           // "hello"

// Обрезка
strings.TrimSpace("  hello  ")     // "hello"
strings.Trim("--hello--", "-")     // "hello" (убрать символы из набора с краёв)
strings.TrimLeft("--hello", "-")   // "hello"
strings.TrimRight("hello--", "-")  // "hello"
strings.TrimPrefix("hello.go", "hello") // ".go"
strings.TrimSuffix("hello.go", ".go")   // "hello"

// Замена
strings.Replace("foo foo foo", "foo", "bar", 2)  // "bar bar foo" (первые 2)
strings.ReplaceAll("foo foo foo", "foo", "bar")   // "bar bar bar"
strings.ToTitle("hello world")     // "HELLO WORLD"
strings.Repeat("ab", 3)            // "ababab"
```

### 3. Разбивка и объединение

```go
// Разбивка
strings.Split("a,b,c", ",")        // ["a", "b", "c"]
strings.SplitN("a,b,c", ",", 2)    // ["a", "b,c"] (не более 2 частей)
strings.SplitAfter("a,b,c", ",")   // ["a,", "b,", "c"] (разделитель остаётся)
strings.Fields("  foo   bar  ")    // ["foo", "bar"] (по пробельным символам)

// Объединение
strings.Join([]string{"a", "b", "c"}, ", ")  // "a, b, c"
```

### 4. strings.Builder — эффективная сборка строк

Используйте вместо конкатенации `+` в цикле — избегает множественных аллокаций.

```go
var b strings.Builder
for i := 0; i < 5; i++ {
    fmt.Fprintf(&b, "item %d\n", i)
}
result := b.String()

// Основные методы Builder
b.WriteString("hello")
b.WriteByte('\n')
b.WriteRune('🐹')
b.Len() int        // Текущая длина
b.Reset()          // Очистить
```

> В задачах конкатенации до 3-4 строк — обычный `+` читаемее. `strings.Builder` нужен когда строка собирается в цикле из N частей.

### 5. strings.Reader

Позволяет читать строку как `io.Reader` — удобно для функций, принимающих потоки:

```go
r := strings.NewReader("hello world")
// r реализует io.Reader, io.Seeker, io.ReaderAt
buf := make([]byte, 5)
r.Read(buf)   // buf = "hello"
```

---

## Пакет strconv

### 1. int ↔ string

```go
import "strconv"

// int → string
s := strconv.Itoa(42)              // "42"

// string → int
n, err := strconv.Atoi("42")      // 42, nil
n, err := strconv.Atoi("abc")     // 0, *NumError

// Универсальная версия (с основанием и размером)
n64, err := strconv.ParseInt("FF", 16, 64)   // 255 (hex → int64)
n64, err := strconv.ParseInt("-42", 10, 64)  // -42
u64, err := strconv.ParseUint("42", 10, 64)  // 42 (только положительные)

// int64 → string
s := strconv.FormatInt(255, 16)    // "ff" (int → hex)
s := strconv.FormatInt(255, 2)     // "11111111" (int → binary)
```

### 2. float ↔ string

```go
// float → string
s := strconv.FormatFloat(3.14159, 'f', 2, 64)  // "3.14"
// форматы: 'f' — decimal, 'e' — scientific, 'g' — короче из 'e'/'f'
// prec=-1 → минимально необходимое кол-во цифр

// string → float
f, err := strconv.ParseFloat("3.14", 64)  // 3.14, nil
```

### 3. bool ↔ string

```go
b, err := strconv.ParseBool("true")   // true, nil
b, err := strconv.ParseBool("1")      // true, nil
b, err := strconv.ParseBool("yes")    // false, *NumError (не поддерживается!)
// Поддерживаются: "1","t","T","TRUE","true","True","0","f","F","FALSE","false","False"

s := strconv.FormatBool(true)         // "true"
```

### 4. Без аллокаций: Append-функции

Для hot-path кода — версии, добавляющие к существующему байтовому срезу:

```go
b := make([]byte, 0, 32)
b = strconv.AppendInt(b, 42, 10)      // b = "42"
b = strconv.AppendFloat(b, 3.14, 'f', 2, 64)
b = strconv.AppendBool(b, true)
```

### 5. Quote / Unquote

```go
strconv.Quote(`hello "world"`)        // `"hello \"world\""`
strconv.QuoteToASCII("привет")        // ASCII-escape для non-ASCII символов
s, err := strconv.Unquote(`"hello"`)  // "hello", nil
```

---

## Итог: Чек-лист

1. **Число → строка:** `strconv.Itoa(n)` для int, `strconv.FormatFloat` для float.
2. **Строка → число:** `strconv.Atoi(s)` для int — всегда проверяйте `err`.
3. **Собрать строку в цикле:** используйте `strings.Builder`, не `+`.
4. **Разбить по пробелам:** `strings.Fields`, не `strings.Split(s, " ")` — Fields корректно обрабатывает множественные пробелы.
5. **Сравнение без учёта регистра:** `strings.EqualFold` вместо `strings.ToLower(a) == strings.ToLower(b)`.
