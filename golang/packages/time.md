---
sidebar_position: 17
---

# time

Пакет `time` предоставляет функциональность для работы со временем: создание, форматирование, арифметику, таймеры и тиккеры. Один из самых часто используемых пакетов Go.

---

## 1. Базовые типы

**`time.Time`** — конкретный момент времени (точность до наносекунды).  
**`time.Duration`** — отрезок времени (тип `int64`, хранит наносекунды).

```go
import "time"

now := time.Now()           // Текущее время
d := 5 * time.Second        // Duration: 5 секунд
d := 100 * time.Millisecond // Duration: 100 мс

// Константы Duration
time.Nanosecond
time.Microsecond
time.Millisecond
time.Second
time.Minute
time.Hour
```

---

## 2. Создание момента времени

```go
// Из компонентов
t := time.Date(2024, time.July, 8, 15, 30, 0, 0, time.UTC)
t := time.Date(2024, 7, 8, 15, 30, 0, 0, time.Local)

// Из Unix timestamp
t := time.Unix(1720444200, 0)         // секунды
t := time.UnixMilli(1720444200000)    // миллисекунды

// Из строки
t, err := time.Parse("2006-01-02", "2024-07-08")
t, err := time.Parse(time.RFC3339, "2024-07-08T15:30:00Z")
```

> **Эталон форматирования в Go:** `Mon Jan 2 15:04:05 MST 2006`. Это конкретная дата — 2 января 2006 года, 15:04:05 UTC-7. В отличие от `%Y-%m-%d` в C/Python, в Go нужно буквально написать этот эталон.

---

## 3. Форматирование

```go
t := time.Now()

t.Format("2006-01-02")                 // "2024-07-08"
t.Format("2006-01-02 15:04:05")        // "2024-07-08 15:30:00"
t.Format("02.01.2006")                 // "08.07.2024"
t.Format("15:04")                      // "15:30"
t.Format(time.RFC3339)                 // "2024-07-08T15:30:00+05:00"
t.Format(time.RFC822)                  // "08 Jul 24 15:30 +0500"

// Готовые константы форматов
time.RFC3339      // "2006-01-02T15:04:05Z07:00"
time.RFC1123      // "Mon, 02 Jan 2006 15:04:05 MST"
time.DateTime     // "2006-01-02 15:04:05"  (Go 1.20+)
time.DateOnly     // "2006-01-02"           (Go 1.20+)
time.TimeOnly     // "15:04:05"             (Go 1.20+)
```

---

## 4. Арифметика и сравнения

```go
t := time.Now()
tomorrow := t.Add(24 * time.Hour)          // Прибавить Duration
yesterday := t.Add(-24 * time.Hour)

d := t.Sub(yesterday)                      // Duration между двумя моментами
// d == 24 * time.Hour

// Удобные хелперы
elapsed := time.Since(start)               // = time.Now().Sub(start)
remaining := time.Until(deadline)          // = deadline.Sub(time.Now())

// Сравнения
t.Before(other time.Time) bool
t.After(other time.Time) bool
t.Equal(other time.Time) bool
t.IsZero() bool                            // Не инициализированное время
```

---

## 5. Компоненты времени

```go
t := time.Now()

t.Year()       int            // 2024
t.Month()      time.Month     // time.July (=7)
t.Day()        int            // 8
t.Hour()       int            // 15
t.Minute()     int            // 30
t.Second()     int            // 0
t.Nanosecond() int

t.Weekday()    time.Weekday   // time.Monday, time.Tuesday...
t.YearDay()    int            // День года (1-366)

// Unix timestamps
t.Unix()       int64          // Секунды с 1970-01-01
t.UnixMilli()  int64          // Миллисекунды
t.UnixMicro()  int64          // Микросекунды
t.UnixNano()   int64          // Наносекунды

// Часовые пояса
t.UTC() time.Time             // Перевести в UTC
t.Local() time.Time           // Перевести в локальный
t.In(loc *time.Location) time.Time
t.Location() *time.Location
```

---

## 6. Измерение производительности

```go
start := time.Now()

// ... ваш код ...

elapsed := time.Since(start)
fmt.Printf("Выполнено за %v\n", elapsed)
// Выполнено за 1.234567ms

// Более точно — используйте профайлер, но для простых замеров time.Since подходит
```

---

## 7. Таймеры и тиккеры

### time.Timer — выполнить один раз через N

```go
timer := time.NewTimer(2 * time.Second)
<-timer.C                       // Заблокироваться на 2 секунды

// Всегда вызывайте Stop() если таймер больше не нужен!
if !timer.Stop() {
    <-timer.C                   // Слить уже отправленное значение
}

// Упрощённый вариант (если не нужно отменять)
time.AfterFunc(2*time.Second, func() {
    fmt.Println("Сработало через 2 секунды")
})
```

### time.Ticker — повторять каждые N

```go
ticker := time.NewTicker(500 * time.Millisecond)
defer ticker.Stop()             // ОБЯЗАТЕЛЬНО остановить, иначе утечка горутины

for {
    select {
    case t := <-ticker.C:
        fmt.Println("Тик в:", t)
    case <-ctx.Done():
        return
    }
}
```

> **`time.Sleep` vs Ticker:** `time.Sleep(d)` блокирует горутину на `d`. Тиккер срабатывает в фиксированные интервалы, не зависящие от времени обработки. Для periodic tasks в production используют тиккер + context.

---

## 8. Часовые пояса

```go
// Загрузка часового пояса
loc, err := time.LoadLocation("Europe/Moscow")
loc, err := time.LoadLocation("America/New_York")
loc := time.UTC
loc := time.Local

t := time.Now().In(loc)                     // Перевести время в нужный пояс

// Создание времени в конкретной зоне
t := time.Date(2024, 7, 8, 12, 0, 0, 0, loc)

// Фиксированный сдвиг (без учёта DST)
moscow := time.FixedZone("MSK", 3*60*60)   // UTC+3
```

---

## Итог: Чек-лист по пакету time

1.  **Эталон:** запомните `2006-01-02 15:04:05` — это «1 2 3 4 5 6 7» переставленные.
2.  **Измерение:** `start := time.Now()` → `elapsed := time.Since(start)`.
3.  **Таймер:** всегда вызывайте `timer.Stop()` после использования.
4.  **Тиккер:** всегда `defer ticker.Stop()` — иначе утечка ресурсов.
5.  **Временные зоны:** храните время в UTC, конвертируйте в локальное при отображении.
6.  **Сравнение:** никогда не сравнивайте `time.Time` через `==` в структурах — используйте `.Equal()`, так как оно учитывает часовой пояс.
