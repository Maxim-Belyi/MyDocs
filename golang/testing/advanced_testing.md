---
sidebar_position: 1
---

# Продвинутое тестирование и профилирование в Go

Когда базовых Unit-тестов становится недостаточно, в Go вступают в дело мощные инструменты для поиска редких багов, проверки производительности и анализа использования ресурсов (CPU/RAM).

---

## 1. Fuzz-тестирование (Фаззинг)

Введено в Go 1.18. Вместо того чтобы самому придумывать входные данные, вы заставляете Go генерировать тысячи случайных вариантов. Это идеально подходит для поиска багов в парсерах или алгоритмах обработки строк/чисел.

```go
// Имя функции должно начинаться с Fuzz
func FuzzReverse(f *testing.F) {
    // Начальные данные (seed corpus)
    testcases := []string{"Hello", " ", "!123"}
    for _, tc := range testcases {
        f.Add(tc) // Добавляем варианты в базу фаззера
    }

    f.Fuzz(func(t *testing.T, orig string) {
        rev := Reverse(orig)
        doubleRev := Reverse(rev)
        
        // Главное правило фаззинга: проверяем свойства (properties)
        // Например: двойной разворот строки должен вернуть оригинал
        if orig != doubleRev {
            t.Errorf("Before: %q, After: %q", orig, doubleRev)
        }
        
        // Проверяем, что результат остается валидным UTF-8
        if utf8.ValidString(orig) && !utf8.ValidString(rev) {
            t.Errorf("Reverse produced invalid UTF-8 string %q", rev)
        }
    })
}
```

Запуск: `go test -fuzz=Fuzz`

---

## 2. Использование Моков (Mocking)

В Go лучший способ мокать зависимости — это **интерфейсы**. Если функция зависит от базы данных, она не должна принимать `*sql.DB`, она должна принимать интерфейс с нужными методами.

```go
// Тестируемый интерфейс
type Mailer interface {
    Send(to, msg string) error
}

// Функция, которую мы тестируем
func NotifyUser(m Mailer, userEmail string) error {
    return m.Send(userEmail, "Ваш заказ готов!")
}

// мок для теста
type MockMailer struct {
    SentTo  string
    SentMsg string
}

func (m *MockMailer) Send(to, msg string) error {
    m.SentTo = to
    m.SentMsg = msg
    return nil
}

func TestNotifyUser(t *testing.T) {
    mock := &MockMailer{}
    err := NotifyUser(mock, "test@example.com")
    
    if err != nil || mock.SentTo != "test@example.com" {
        t.Errorf("Уведомление не отправлено правильно")
    }
}
```

---

## 3. Профилирование с помощью pprof

Если ваш код тормозит или ест много памяти, вам нужен `pprof`. Это стандартный инструмент профилирования в Go.

### Как собрать профиль CPU в тесте:
Запустите тесты с флагами:
`go test -cpuprofile cpu.out -memprofile mem.out -bench .`

### Как анализировать результат:
Самый удобный способ — через веб-интерфейс (нужен установленный [Graphviz](https://graphviz.org/)):
`go tool pprof -http=:8080 cpu.out`

**Что искать в pprof:**
*   **Flat:** время, проведенное непосредственно в этой функции.
*   **Cum (Cumulative):** общее время в этой функции и всех, что она вызвала.
*   **Flame Graph:** визуализация "горячих точек" вашего приложения.

---

## 4. Продвинутые Бенчмарки

### Параллельные бенчмарки
Если вы хотите проверить, как код ведет себя при обращении из множества горутин:

```go
func BenchmarkSyncMap(b *testing.B) {
    var m sync.Map
    b.RunParallel(func(pb *testing.PB) {
        for pb.Next() {
            m.Store("key", "value")
            m.Load("key")
        }
    })
}
```

### b.ReportAllocs()
Всегда добавляйте это в начало бенчмарка, чтобы видеть количество аллокаций памяти за операцию. Чем меньше аллокаций, тем меньше нагрузка на Garbage Collector (GC).

```go
func BenchmarkMyFunc(b *testing.B) {
    b.ReportAllocs() // Покажет ns/op, B/op и allocs/op
    for i := 0; i < b.N; i++ {
        MyFunc()
    }
}
```

---

## 5. Анализ покрытия (Coverage)

Просто узнать процент покрытия — мало. Важно увидеть, какие ветки условий (`if/else`) не сработали.

1.  Генерируем отчет: `go test -coverprofile=coverage.out ./...`
2.  Открываем в браузере: `go tool cover -html=coverage.out`

Вы увидите свой код, раскрашенный в зеленый (протестировано) и красный (не задействовано в тестах) цвета.

---

## Итог: Стратегия "Качественного кода"

1.  **Пишите Unit-тесты** для основной логики.
2.  **Добавляйте Fuzz-тесты** для функций, принимающих данные извне (пользовательский ввод, файлы).
3.  **Используйте интерфейсы** для изоляции зависимостей (БД, API).
4.  **Смотрите coverage -html**, чтобы не оставлять слепых зон в критическом коде.
5.  **Запускайте pprof**, если производительность не соответствует требованиям, вместо того чтобы гадать, что именно тормозит.
