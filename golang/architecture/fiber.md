---
sidebar_position: 2
---

# Fiber: HTTP-фреймворк для Go

Fiber — это высокопроизводительный HTTP-фреймворк для Go, построенный поверх сетевого движка [fasthttp](https://github.com/valyala/fasthttp). Его API намеренно близок к синтаксису Express.js. В отличие от стандартного `net/http`, Fiber использует пул байтовых буферов и структур, минимизируя нагрузку на сборщик мусора при обработке тысяч запросов в секунду.

---

## 1. Установка и базовая конфигурация

```bash
go get github.com/gofiber/fiber/v2
```

### Минимальный рабочий сервер

```go
package main

import (
    "log"
    "github.com/gofiber/fiber/v2"
)

func main() {
    app := fiber.New()

    app.Get("/ping", func(c *fiber.Ctx) error {
        return c.SendString("pong")
    })

    log.Fatal(app.Listen(":8080"))
}
```

### Конфигурация через `fiber.Config`

```go
app := fiber.New(fiber.Config{
    // Кастомный обработчик ошибок (подробнее в разделе 7)
    ErrorHandler: customErrorHandler,

    // Лимит на размер тела запроса (по умолчанию 4 МБ)
    BodyLimit: 10 * 1024 * 1024, // 10 МБ

    // Таймауты на чтение и запись
    ReadTimeout:  5 * time.Second,
    WriteTimeout: 10 * time.Second,

    // Доверять заголовку X-Forwarded-For (за прокси/балансировщиком)
    EnableTrustedProxyCheck: true,
    TrustedProxies: []string{"192.168.1.1"},

    // Имя приложения (используется в заголовке ответа Server:)
    AppName: "My API v1.0",

    // Сжатие JSON-ответов (убирает лишние пробелы)
    JSONEncoder: json.Marshal,
})
```

---

## 2. Роутинг

### Основные HTTP-методы

```go
app.Get("/users", listUsersHandler)
app.Post("/users", createUserHandler)
app.Put("/users/:id", updateUserHandler)
app.Patch("/users/:id", patchUserHandler)
app.Delete("/users/:id", deleteUserHandler)

// Обработка любого HTTP-метода
app.All("/webhook", webhookHandler)
```

### Параметры маршрута

```go
// Именованный параметр — обязателен
app.Get("/users/:id", func(c *fiber.Ctx) error {
    id := c.Params("id")          // строка
    idInt, _ := c.ParamsInt("id") // удобное приведение к int
    return c.JSON(fiber.Map{"id": idInt})
})

// Необязательный параметр — заканчивается на ?
app.Get("/users/:id?", func(c *fiber.Ctx) error {
    id := c.Params("id") // "" если не передан
    return c.SendString(id)
})

// Wildcard — захватывает всё после /files/
app.Get("/files/*", func(c *fiber.Ctx) error {
    path := c.Params("*") // например: "images/avatar.png"
    return c.SendString(path)
})
```

### Группы роутов

Группы позволяют задать общий префикс URL и применить middleware к нескольким маршрутам сразу.

```go
api := app.Group("/api")
v1 := api.Group("/v1")

// Маршруты: /api/v1/users, /api/v1/products
users := v1.Group("/users")
users.Get("/", listUsersHandler)
users.Post("/", createUserHandler)
users.Get("/:id", getUserHandler)
users.Delete("/:id", deleteUserHandler)
```

### Query-параметры

```go
// GET /search?q=golang&page=2&limit=10
app.Get("/search", func(c *fiber.Ctx) error {
    query := c.Query("q")                   // "golang"
    page := c.QueryInt("page", 1)           // 2 (второй аргумент — значение по умолчанию)
    limit := c.QueryInt("limit", 20)        // 10
    return c.JSON(fiber.Map{"q": query, "page": page, "limit": limit})
})
```

---

## 3. Контекст запроса (`*fiber.Ctx`)

`*fiber.Ctx` — центральный объект Fiber. Он содержит всю информацию о входящем запросе и методы для формирования ответа.

### Чтение запроса

| Метод | Описание |
| :--- | :--- |
| `c.Params("key")` | Параметр маршрута (`:id`) |
| `c.ParamsInt("key")` | Параметр маршрута, приведённый к `int` |
| `c.Query("key")` | Query-параметр (`?key=value`) |
| `c.QueryInt("key", def)` | Query-параметр, приведённый к `int`, с дефолтом |
| `c.Get("Header-Name")` | Значение HTTP-заголовка |
| `c.IP()` | IP-адрес клиента |
| `c.Method()` | HTTP-метод запроса (`"GET"`, `"POST"` и т.д.) |
| `c.Path()` | Путь запроса (`/api/v1/users`) |
| `c.Body()` | Тело запроса как `[]byte` |
| `c.BodyParser(&dto)` | Десериализация тела запроса в структуру |
| `c.Locals("key")` | Данные, установленные предыдущим middleware |

### Формирование ответа

| Метод | Описание |
| :--- | :--- |
| `c.Status(code)` | Устанавливает HTTP-статус (возвращает `*Ctx` для цепочки вызовов) |
| `c.JSON(data)` | Отправляет JSON-ответ (`Content-Type: application/json`) |
| `c.SendString("text")` | Отправляет текстовый ответ |
| `c.SendStatus(code)` | Отправляет только статус без тела |
| `c.Set("Header", "Value")` | Устанавливает заголовок ответа |
| `c.Redirect("/path", 301)` | Перенаправление |
| `c.Download("file.pdf")` | Отправляет файл для скачивания |
| `c.Next()` | Передаёт управление следующему обработчику/middleware |

```go
// Пример ответа с кастомным статусом
return c.Status(fiber.StatusCreated).JSON(fiber.Map{
    "message": "user created",
    "id":      newUser.ID,
})

// fiber.Map — удобный алиас для map[string]any
return c.Status(404).JSON(fiber.Map{"error": "not found"})
```

### `c.Locals` — передача данных между middleware

```go
// В middleware: кладём данные аутентифицированного пользователя
func AuthMiddleware(c *fiber.Ctx) error {
    userID := parseJWT(c.Get("Authorization"))
    c.Locals("userID", userID) // Сохраняем в локальный контекст
    return c.Next()
}

// В хендлере: достаём
func getProfileHandler(c *fiber.Ctx) error {
    userID := c.Locals("userID").(int64)
    // ...
}
```

---

## 4. Middleware

Middleware — это функция с сигнатурой `func(*fiber.Ctx) error`, которая выполняется до или после хендлера. Вызов `c.Next()` передаёт управление следующему обработчику в цепочке.

### Встроенные middleware

```go
import (
    "github.com/gofiber/fiber/v2/middleware/logger"
    "github.com/gofiber/fiber/v2/middleware/recover"
    "github.com/gofiber/fiber/v2/middleware/cors"
    "github.com/gofiber/fiber/v2/middleware/limiter"
    "github.com/gofiber/fiber/v2/middleware/requestid"
)

// Logger — логирует каждый запрос
app.Use(logger.New(logger.Config{
    Format: "[${time}] ${status} - ${method} ${path} (${latency})\n",
}))

// Recover — перехватывает panic и возвращает HTTP 500 вместо падения сервера
app.Use(recover.New())

// CORS — настройка политики кросс-доменных запросов
app.Use(cors.New(cors.Config{
    AllowOrigins: "https://my-frontend.com",
    AllowMethods: "GET,POST,PUT,DELETE",
    AllowHeaders: "Origin, Content-Type, Authorization",
}))

// Request ID — добавляет уникальный ID к каждому запросу
app.Use(requestid.New())

// Rate Limiter — ограничение числа запросов
app.Use(limiter.New(limiter.Config{
    Max:        100,           // максимум запросов
    Expiration: time.Minute,   // за период
    LimitReached: func(c *fiber.Ctx) error {
        return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
            "error": "too many requests",
        })
    },
}))
```

### Кастомный middleware

```go
// Middleware аутентификации по Bearer-токену
func JWTMiddleware(secretKey string) fiber.Handler {
    return func(c *fiber.Ctx) error {
        authHeader := c.Get("Authorization")
        if authHeader == "" {
            return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
                "error": "missing authorization header",
            })
        }

        tokenStr := strings.TrimPrefix(authHeader, "Bearer ")
        claims, err := parseJWT(tokenStr, secretKey)
        if err != nil {
            return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
                "error": "invalid token",
            })
        }

        // Кладём данные пользователя в локальный контекст запроса
        c.Locals("userID", claims.UserID)
        return c.Next()
    }
}

// Использование только на защищённых роутах
protected := app.Group("/api", JWTMiddleware(cfg.JWTSecret))
protected.Get("/profile", getProfileHandler)
```

---

## 5. Чтение тела запроса и валидация

### `c.BodyParser`

`BodyParser` десериализует тело запроса в структуру. Поддерживает JSON, XML, form-data и query-параметры.

```go
type CreateUserRequest struct {
    Name  string `json:"name"  validate:"required,min=2,max=100"`
    Email string `json:"email" validate:"required,email"`
    Age   int    `json:"age"   validate:"min=18,max=120"`
}

func createUserHandler(c *fiber.Ctx) error {
    var req CreateUserRequest
    if err := c.BodyParser(&req); err != nil {
        return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
            "error": "invalid request body",
        })
    }
    // ...
}
```

### Интеграция с `go-playground/validator`

```go
import "github.com/go-playground/validator/v10"

var validate = validator.New()

func validateBody[T any](c *fiber.Ctx) (T, error) {
    var body T
    if err := c.BodyParser(&body); err != nil {
        return body, fiber.NewError(fiber.StatusBadRequest, "invalid json body")
    }
    if err := validate.Struct(body); err != nil {
        return body, fiber.NewError(fiber.StatusUnprocessableEntity, err.Error())
    }
    return body, nil
}

// Использование в хендлере:
func createUserHandler(c *fiber.Ctx) error {
    req, err := validateBody[CreateUserRequest](c)
    if err != nil {
        return err // Ошибка обработается в ErrorHandler
    }
    // req готов к использованию
    user, err := userService.Create(c.UserContext(), req)
    if err != nil {
        return err
    }
    return c.Status(fiber.StatusCreated).JSON(user)
}
```

---

## 6. Контекст Go из запроса (`c.UserContext`)

`fiber.Ctx` хранит стандартный `context.Context`, который можно получить через `c.UserContext()`. Это важно для передачи контекста в сервисный слой, базу данных и другие компоненты.

```go
func getUserHandler(c *fiber.Ctx) error {
    id, _ := c.ParamsInt("id")

    // Передаём контекст запроса в сервис — он несёт таймаут и данные трейсинга
    user, err := userService.GetByID(c.UserContext(), int64(id))
    if err != nil {
        return err
    }
    return c.JSON(user)
}
```

---

## 7. Централизованная обработка ошибок (`ErrorHandler`)

Вместо того чтобы формировать JSON-ошибку в каждом хендлере, в Fiber можно определить единый глобальный обработчик ошибок.

```go
func customErrorHandler(c *fiber.Ctx, err error) error {
    // Fiber поддерживает типизированные ошибки через fiber.NewError
    code := fiber.StatusInternalServerError
    message := "internal server error"

    var fiberErr *fiber.Error
    if errors.As(err, &fiberErr) {
        code = fiberErr.Code
        message = fiberErr.Message
    }

    c.Set(fiber.HeaderContentType, fiber.MIMEApplicationJSONCharsetUTF8)
    return c.Status(code).JSON(fiber.Map{
        "error": message,
    })
}

// Регистрация в конфиге:
app := fiber.New(fiber.Config{
    ErrorHandler: customErrorHandler,
})
```

### `fiber.NewError` — возврат ошибки с HTTP-кодом

```go
// В хендлере или сервисе — просто возвращаем ошибку
func getUserHandler(c *fiber.Ctx) error {
    user, err := userService.GetByID(c.UserContext(), id)
    if errors.Is(err, ErrNotFound) {
        return fiber.NewError(fiber.StatusNotFound, "user not found")
    }
    if err != nil {
        return err // Попадёт в ErrorHandler как 500
    }
    return c.JSON(user)
}
```

---

## 8. Graceful Shutdown

```go
func main() {
    app := fiber.New()
    // ... маршруты и middleware

    // Запуск сервера в отдельной горутине
    go func() {
        if err := app.Listen(":8080"); err != nil && !errors.Is(err, http.ErrServerClosed) {
            log.Fatalf("server error: %v", err)
        }
    }()

    // Ожидание сигнала завершения от ОС
    quit := make(chan os.Signal, 1)
    signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
    <-quit

    log.Println("Shutting down server...")

    // Даём 10 секунд на завершение текущих запросов
    ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
    defer cancel()

    if err := app.ShutdownWithContext(ctx); err != nil {
        log.Fatalf("server forced shutdown: %v", err)
    }

    log.Println("Server stopped gracefully")
}
```

---

## 9. Практический usecase: CRUD для сущности User

Полный пример с разделением на слои: хендлеры, сервисный слой, репозиторий.

### Структуры и интерфейсы

```go
// domain/user.go
type User struct {
    ID    int64  `json:"id"`
    Name  string `json:"name"`
    Email string `json:"email"`
}

type UserRepository interface {
    GetAll(ctx context.Context) ([]User, error)
    GetByID(ctx context.Context, id int64) (*User, error)
    Create(ctx context.Context, u *User) (*User, error)
    Update(ctx context.Context, u *User) (*User, error)
    Delete(ctx context.Context, id int64) error
}

type UserService interface {
    List(ctx context.Context) ([]User, error)
    GetByID(ctx context.Context, id int64) (*User, error)
    Create(ctx context.Context, req CreateUserRequest) (*User, error)
    Update(ctx context.Context, id int64, req UpdateUserRequest) (*User, error)
    Delete(ctx context.Context, id int64) error
}
```

### Хендлеры

```go
// handler/user.go
type UserHandler struct {
    service UserService
}

func NewUserHandler(s UserService) *UserHandler {
    return &UserHandler{service: s}
}

// Регистрация маршрутов
func (h *UserHandler) RegisterRoutes(router fiber.Router) {
    users := router.Group("/users")
    users.Get("/", h.List)
    users.Post("/", h.Create)
    users.Get("/:id", h.GetByID)
    users.Put("/:id", h.Update)
    users.Delete("/:id", h.Delete)
}

func (h *UserHandler) List(c *fiber.Ctx) error {
    users, err := h.service.List(c.UserContext())
    if err != nil {
        return err
    }
    return c.JSON(users)
}

func (h *UserHandler) GetByID(c *fiber.Ctx) error {
    id, err := c.ParamsInt("id")
    if err != nil {
        return fiber.NewError(fiber.StatusBadRequest, "invalid user id")
    }

    user, err := h.service.GetByID(c.UserContext(), int64(id))
    if err != nil {
        return err
    }
    return c.JSON(user)
}

type CreateUserRequest struct {
    Name  string `json:"name"  validate:"required,min=2"`
    Email string `json:"email" validate:"required,email"`
}

func (h *UserHandler) Create(c *fiber.Ctx) error {
    req, err := validateBody[CreateUserRequest](c)
    if err != nil {
        return err
    }

    user, err := h.service.Create(c.UserContext(), req)
    if err != nil {
        return err
    }
    return c.Status(fiber.StatusCreated).JSON(user)
}

type UpdateUserRequest struct {
    Name  string `json:"name"  validate:"omitempty,min=2"`
    Email string `json:"email" validate:"omitempty,email"`
}

func (h *UserHandler) Update(c *fiber.Ctx) error {
    id, err := c.ParamsInt("id")
    if err != nil {
        return fiber.NewError(fiber.StatusBadRequest, "invalid user id")
    }

    req, err := validateBody[UpdateUserRequest](c)
    if err != nil {
        return err
    }

    user, err := h.service.Update(c.UserContext(), int64(id), req)
    if err != nil {
        return err
    }
    return c.JSON(user)
}

func (h *UserHandler) Delete(c *fiber.Ctx) error {
    id, err := c.ParamsInt("id")
    if err != nil {
        return fiber.NewError(fiber.StatusBadRequest, "invalid user id")
    }

    if err := h.service.Delete(c.UserContext(), int64(id)); err != nil {
        return err
    }
    return c.SendStatus(fiber.StatusNoContent)
}
```

### Сборка в `main.go`

```go
func main() {
    app := fiber.New(fiber.Config{
        ErrorHandler: customErrorHandler,
        ReadTimeout:  5 * time.Second,
        WriteTimeout: 10 * time.Second,
    })

    // Глобальные middleware
    app.Use(recover.New())
    app.Use(requestid.New())
    app.Use(logger.New())

    // Dependency Injection
    db := mustConnectDB()
    userRepo := postgres.NewUserRepository(db)
    userService := service.NewUserService(userRepo)
    userHandler := handler.NewUserHandler(userService)

    // Регистрация роутов
    api := app.Group("/api/v1")
    userHandler.RegisterRoutes(api)

    // Защищённые маршруты
    protected := api.Group("/admin", JWTMiddleware(cfg.JWTSecret))
    // ...

    // Graceful Shutdown
    go func() {
        if err := app.Listen(":8080"); err != nil {
            log.Fatal(err)
        }
    }()

    quit := make(chan os.Signal, 1)
    signal.Notify(quit, syscall.SIGTERM, syscall.SIGINT)
    <-quit

    ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
    defer cancel()
    _ = app.ShutdownWithContext(ctx)
}
```

---

## 10. Распространённые ошибки

| Ошибка | Причина | Решение |
| :--- | :--- | :--- |
| `c.Locals` возвращает `nil` | Middleware не вызвал `c.Next()` или не зарегистрирован | Проверить порядок регистрации middleware и наличие `c.Next()` |
| Паника при `.(int64)` из `c.Locals` | Тип значения не совпадает | Использовать безопасное приведение `val, ok := c.Locals("key").(int64)` |
| `BodyParser` всегда возвращает `nil` | Поля структуры не экспортированы или теги json не совпадают | Проверить, что поля с заглавной буквы и теги `json:"..."` корректны |
| Хендлер отрабатывает, но ответ не отправляется | Забыли вернуть `return` после `c.JSON(...)` | Всегда добавлять `return` перед вызовами ответа |
| Middleware применяется ко всем роутам | `app.Use` вызван до регистрации группы | Регистрировать middleware внутри группы: `group.Use(...)` |
