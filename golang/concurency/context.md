---
sidebar_position: 5
---

# Context: Управление жизненным циклом операций

`context.Context` — один из самых важных инструментов в Go. Он решает три задачи: **отмену операций**, **установку таймаутов** и **передачу данных** по цепочке вызовов. Именно поэтому первым аргументом почти любой функции в Go-серверах является `ctx context.Context`.

---

## 1. Зачем нужен Context?

Представьте: пользователь отправил запрос, который запускает несколько горутин — делает запросы к БД, к внешнему API и т.д. Пользователь закрыл браузер. Зачем продолжать всю эту работу?

Без Context — никак не остановить. С Context — одна строка отменяет всё дерево вызовов.

```go
// Context передается первым аргументом — это жесткая конвенция Go
func FetchUser(ctx context.Context, userID int) (*User, error) {
    // Если ctx уже отменен — сразу возвращаем ошибку
    if err := ctx.Err(); err != nil {
        return nil, err
    }
    // ...
}
```

---

## 2. Иерархия контекстов (Дерево)

Контексты образуют дерево. Дочерний контекст наследует все свойства родительского, но может добавить свои (таймаут, отмену, значения). **Отмена родителя автоматически отменяет всех потомков.**

```
context.Background()
    └── WithCancel(...)           ← ctx1 (ручная отмена)
            └── WithTimeout(...)  ← ctx2 (отмена по таймауту)
                    └── WithValue(...) ← ctx3 (данные запроса)
```

### Корневые контексты:
*   `context.Background()` — пустой корневой контекст. Используется в `main()`, при инициализации и в тестах.
*   `context.TODO()` — заглушка, когда контекст ещё не определен. Сигнализирует, что "нужно добавить контекст позже".

---

## 3. WithCancel: Ручная отмена

```go
func main() {
    ctx, cancel := context.WithCancel(context.Background())
    
    // cancel ОБЯЗАТЕЛЬНО вызвать, иначе будет утечка горутин и ресурсов
    defer cancel()
    
    go func() {
        select {
        case <-ctx.Done(): // Канал закрывается при отмене
            fmt.Println("Горутина остановлена:", ctx.Err()) // context canceled
            return
        }
    }()
    
    time.Sleep(time.Second)
    cancel() // Отменяем контекст — горутина получит сигнал через ctx.Done()
}
```

> **Критически важно:** Всегда вызывайте функцию `cancel()`. Если этого не сделать, ресурсы, выделенные для контекста, не будут освобождены до тех пор, пока не будет отменён родительский контекст.

---

## 4. WithTimeout и WithDeadline

Самый распространённый паттерн — ограничить время выполнения операции.

```go
func fetchWithTimeout(url string) ([]byte, error) {
    // Контекст будет автоматически отменён через 3 секунды
    ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
    defer cancel() // Всё равно вызываем, чтобы освободить ресурсы раньше таймаута

    req, _ := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
    resp, err := http.DefaultClient.Do(req)
    if err != nil {
        // Если таймаут истёк, err будет содержать context.DeadlineExceeded
        return nil, err
    }
    defer resp.Body.Close()
    return io.ReadAll(resp.Body)
}
```

**Разница между WithTimeout и WithDeadline:**
*   `WithTimeout(ctx, 5*time.Second)` — отменить через 5 секунд **с этого момента**.
*   `WithDeadline(ctx, time.Now().Add(5*time.Second))` — отменить в **конкретный момент времени**. `WithTimeout` — это просто удобная обёртка над `WithDeadline`.

---

## 5. WithValue: Передача данных по запросу

`WithValue` позволяет прикреплять к контексту данные, специфичные для конкретного запроса (например, ID пользователя, токен аутентификации, request-ID для трейсинга).

```go
// Используйте кастомный тип для ключа, чтобы избежать конфликтов с другими пакетами
type contextKey string

const userIDKey contextKey = "userID"

// Middleware: кладем ID пользователя в контекст
func authMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        userID := parseToken(r.Header.Get("Authorization"))
        ctx := context.WithValue(r.Context(), userIDKey, userID)
        next.ServeHTTP(w, r.WithContext(ctx))
    })
}

// Обработчик: достаем ID пользователя из контекста
func getProfileHandler(w http.ResponseWriter, r *http.Request) {
    userID, ok := r.Context().Value(userIDKey).(string)
    if !ok {
        http.Error(w, "Unauthorized", http.StatusUnauthorized)
        return
    }
    fmt.Fprintf(w, "Profile for user: %s", userID)
}
```

> **Правило:** Храните в контексте только данные, специфичные для **конкретного запроса** (request-scoped): трейс ID, аутентификационные данные. **Не кладите в контекст** зависимости сервисов (логгеры, репозитории, соединения с БД) — передавайте их явно через конструктор или параметры функции.

---

## 6. Как проверить отмену в своём коде

Если у вас долгая операция (цикл, многоэтапный алгоритм), необходимо периодически проверять, не был ли отменён контекст.

```go
func processItems(ctx context.Context, items []Item) error {
    for _, item := range items {
        // Проверяем контекст на каждой итерации
        select {
        case <-ctx.Done():
            return ctx.Err() // Возвращаем причину: context.Canceled или context.DeadlineExceeded
        default:
            // Продолжаем работу
        }
        
        if err := process(item); err != nil {
            return err
        }
    }
    return nil
}
```

---

## Итог

| Функция | Когда использовать |
|---|---|
| `context.Background()` | Корневой контекст в `main()` или тестах |
| `context.TODO()` | Временная заглушка — "нужно добавить ctx" |
| `WithCancel()` | Ручная отмена (например, пользователь нажал "Стоп") |
| `WithTimeout()` | Ограничить время выполнения операции |
| `WithDeadline()` | Отмена в конкретный момент времени |
| `WithValue()` | Request-scoped данные (request ID, user ID) |

Главное правило работы с Context:
*   Принимайте `ctx` **первым аргументом** в каждой функции.
*   Всегда вызывайте `cancel()` — используйте `defer cancel()`.
*   Не храните контекст в структурах — передавайте его явно.
