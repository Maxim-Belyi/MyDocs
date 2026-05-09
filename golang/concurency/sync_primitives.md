---
sidebar_position: 6
---

# Примитивы синхронизации: пакет `sync`

Горутины и каналы — это идиоматичный путь в Go. Но в реальных проектах часто нужен прямой доступ к классическим примитивам синхронизации. Пакет `sync` предоставляет именно их. Использовать эти инструменты правильно — обязательный навык Go-разработчика.

---

## 1. sync.Mutex

`Mutex` (Mutual Exclusion — взаимное исключение) — это замок на ресурс. Он гарантирует, что в каждый момент времени только **одна** горутина может выполнять защищенный код.

```go
type SafeCounter struct {
    mu    sync.Mutex
    count int
}

func (c *SafeCounter) Increment() {
    c.mu.Lock()         // Заблокировать. Другие горутины будут ждать здесь.
    defer c.mu.Unlock() // Обязательно разблокировать (defer гарантирует это даже при панике)
    c.count++
}

func main() {
    c := &SafeCounter{}
    var wg sync.WaitGroup
    
    for i := 0; i < 1000; i++ {
        wg.Add(1)
        go func() {
            defer wg.Done()
            c.Increment()
        }()
    }
    wg.Wait()
    fmt.Println(c.count) // Всегда 1000, без гонки данных
}
```

> **Золотое правило:** Всегда используйте `defer mu.Unlock()` сразу после `mu.Lock()`. Это защищает от утечки блокировки при панике или преждевременном возврате (`return`) из функции.

---

## 2. sync.RWMutex

`RWMutex` (Read-Write Mutex) — это умный мьютекс для случаев, когда операций чтения намного больше, чем записи.

*   **Чтение (`RLock` / `RUnlock`):** Несколько горутин могут читать **одновременно** — они не блокируют друг друга.
*   **Запись (`Lock` / `Unlock`):** Пока одна горутина пишет, **никто** другой не может ни читать, ни писать.

```go
type Cache struct {
    mu   sync.RWMutex
    data map[string]string
}

func (c *Cache) Get(key string) (string, bool) {
    c.mu.RLock()         // Разделяемая блокировка для чтения
    defer c.mu.RUnlock()
    val, ok := c.data[key]
    return val, ok
}

func (c *Cache) Set(key, value string) {
    c.mu.Lock()          // Эксклюзивная блокировка для записи
    defer c.mu.Unlock()
    c.data[key] = value
}
```

`RWMutex` дает заметный прирост производительности в read-heavy сценариях (например, кэши).

---

## 3. sync.WaitGroup

`WaitGroup` позволяет основной горутине **ждать** завершения группы дочерних горутин.

*   `wg.Add(n)` — сообщить WaitGroup, что нужно ждать ещё `n` горутин.
*   `wg.Done()` — горутина сигнализирует о своем завершении (уменьшает счётчик на 1).
*   `wg.Wait()` — заблокировать выполнение, пока счётчик не дойдет до 0.

```go
func downloadFiles(urls []string) {
    var wg sync.WaitGroup
    
    for _, url := range urls {
        wg.Add(1) // Важно: Add вызывать ДО запуска горутины
        go func(u string) {
            defer wg.Done()
            // download(u)
            fmt.Println("Downloaded:", u)
        }(url) // Передаем url как аргумент, чтобы избежать замыкания на переменную цикла
    }
    
    wg.Wait() // Ждем завершения всех загрузок
    fmt.Println("All files downloaded!")
}
```

---

## 4. sync.Once

Гарантирует, что переданная функция будет выполнена **строго один раз**, даже если её вызывают конкурентно из нескольких горутин. Идеален для ленивой инициализации (Lazy Initialization).

```go
var (
    instance *DatabaseConn
    once     sync.Once
)

func GetDB() *DatabaseConn {
    once.Do(func() {
        // Этот код выполнится только один раз за всё время жизни программы
        fmt.Println("Initializing DB connection...")
        instance = &DatabaseConn{}
    })
    return instance
}
```

В отличие от `init()`, `sync.Once` позволяет контролировать, когда именно произойдет инициализация.

---

## 5. sync/atomic: Атомарные операции

Пакет `atomic` предоставляет низкоуровневые атомарные операции над числами и указателями. Это **самый быстрый** способ безопасно изменить одну числовую переменную из нескольких горутин — без мьютекса.

```go
var hits atomic.Int64 // Начиная с Go 1.19: типизированные атомики

func handleRequest() {
    hits.Add(1) // Атомарный инкремент — потокобезопасен без Lock/Unlock
}

func main() {
    // ...
    fmt.Println("Total hits:", hits.Load())
}
```

**Атомарные операции vs Mutex:**
*   `atomic` работает на уровне процессорных инструкций (CAS — Compare And Swap). Быстрее.
*   `Mutex` подходит для защиты сложных операций с несколькими переменными. Более гибкий.

> **Правило выбора:** Если нужно атомарно изменить **одно число** — используйте `atomic`. Если нужно защитить **блок кода** с несколькими операциями — используйте `Mutex`.

---

## 6. sync.Cond

`Cond` — это условная переменная. Позволяет горутинам **ждать наступления определенного события**, не тратя процессорное время на активное ожидание (busy waiting / polling).

```go
type Queue struct {
    mu    sync.Mutex
    cond  *sync.Cond
    items []int
}

func NewQueue() *Queue {
    q := &Queue{}
    q.cond = sync.NewCond(&q.mu)
    return q
}

func (q *Queue) Push(item int) {
    q.mu.Lock()
    q.items = append(q.items, item)
    q.cond.Signal() // Разбудить одну ожидающую горутину
    q.mu.Unlock()
}

func (q *Queue) Pop() int {
    q.mu.Lock()
    defer q.mu.Unlock()
    
    for len(q.items) == 0 {
        q.cond.Wait() // Атомарно: освобождает мьютекс и засыпает, пока не придет Signal
    }
    
    item := q.items[0]
    q.items = q.items[1:]
    return item
}
```

`sync.Cond` чаще всего применяется при реализации паттерна Producer-Consumer (производитель-потребитель). В современном Go его нередко заменяют каналами, но знать его устройство полезно.

---

## Итог: Какой инструмент выбрать?

| Задача | Инструмент |
|---|---|
| Защитить блок кода от конкурентного доступа | `sync.Mutex` |
| Много читателей, редкие записи | `sync.RWMutex` |
| Подождать завершения группы горутин | `sync.WaitGroup` |
| Инициализировать что-то ровно один раз | `sync.Once` |
| Атомарно изменить одну числовую переменную | `sync/atomic` |
| Ждать наступления условия (Consumer) | `sync.Cond` или канал |
