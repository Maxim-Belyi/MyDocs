---
sidebar_position: 11
---

# chi

Пакет `chi` (`github.com/go-chi/chi`) — это легковесный, идиоматичный и модульный HTTP-маршрутизатор (роутер) для построения Go HTTP-сервисов. 

---

## Зачем нужен этот пакет?

`chi` решает проблемы стандартного пакета `net/http` (хотя в Go 1.22 стандартный роутер был улучшен, `chi` всё ещё предлагает мощный функционал). Основные преимущества:
1. **100% совместимость со стандартной библиотекой**: `chi.Router` реализует интерфейс `http.Handler`. Любое стандартное middleware подходит для `chi`.
2. **Вложенность маршрутов (Subrouting)**: позволяет группировать маршруты, применяя к ним определенные middleware.
3. **Переменные пути (Path Parameters)**: легкое извлечение параметров из URL.

---

## Основные методы и концепции

### Создание роутера и методы HTTP
Метод `chi.NewRouter()` создает новый экземпляр маршрутизатора. Далее вы можете привязывать обработчики к конкретным HTTP-методам (`Get`, `Post`, `Put`, `Delete` и т.д.).

```go
package main

import (
    "net/http"
    "github.com/go-chi/chi/v5"
)

func main() {
    r := chi.NewRouter()

    r.Get("/", func(w http.ResponseWriter, r *http.Request) {
        w.Write([]byte("Главная страница"))
    })
    
    r.Post("/users", createUserHandler)

    http.ListenAndServe(":3000", r)
}
```

### chi.URLParam
Метод для извлечения переменных параметров из URL. Переменные в пути задаются в фигурных скобках `{name}`.

```go
func URLParam(r *http.Request, key string) string
```

**Пример:**
```go
r.Get("/users/{userID}", func(w http.ResponseWriter, r *http.Request) {
    // Извлечение параметра userID из URL
    userID := chi.URLParam(r, "userID")
    w.Write([]byte("Профиль пользователя: " + userID))
})
```

### Middleware: r.Use и r.With
Middleware — это функции, которые выполняются до или после вашего основного обработчика запроса (например, логирование, проверка авторизации).

* `r.Use(...)`: применяет middleware ко всем маршрутам роутера.
* `r.With(...)`: создает копию роутера с дополнительным middleware.

```go
import "github.com/go-chi/chi/v5/middleware"

r := chi.NewRouter()

// Стандартные middleware от команды chi
r.Use(middleware.RequestID) // Добавляет ID к каждому запросу
r.Use(middleware.Logger)    // Логирует запросы
r.Use(middleware.Recoverer) // Защищает от паник

r.Get("/public", publicHandler)

// Группировка приватных маршрутов с помощью With
privateGroup := r.With(AuthMiddleware)
privateGroup.Get("/dashboard", dashboardHandler)
```

### Группировка и вложенность: r.Route и r.Mount
Позволяют организовать сложные API.

* `r.Route`: создает подгруппу маршрутов.
* `r.Mount`: монтирует один роутер внутрь другого (отлично подходит для разделения версий API).

```go
r.Route("/articles", func(r chi.Router) {
    r.Get("/", listArticles)       // GET /articles
    r.Post("/", createArticle)     // POST /articles
    
    r.Route("/{articleID}", func(r chi.Router) {
        r.Use(ArticleCtx)          // Загрузка статьи в контекст
        r.Get("/", getArticle)     // GET /articles/123
        r.Put("/", updateArticle)  // PUT /articles/123
    })
})
```

### r.Group
Создает новую группу маршрутов (inline). В отличие от `r.Route`, не добавляет префикс к пути, но позволяет применить middleware только к определенной группе маршрутов внутри текущего уровня.

```go
r.Group(func(r chi.Router) {
    r.Use(AdminOnlyMiddleware)
    r.Get("/admin/stats", getStats)
})
```

### Обработка ошибок роутинга: NotFound и MethodNotAllowed
Позволяет задать собственные обработчики для ситуаций, когда маршрут не найден (404) или HTTP-метод не поддерживается (405).

```go
r.NotFound(func(w http.ResponseWriter, r *http.Request) {
    w.WriteHeader(404)
    w.Write([]byte("Страница не существует"))
})

r.MethodNotAllowed(func(w http.ResponseWriter, r *http.Request) {
    w.WriteHeader(405)
    w.Write([]byte("Метод запрещен"))
})
```

---

## Итог: Чек-лист по пакету chi

1. **Middleware:** используйте пакет `github.com/go-chi/chi/v5/middleware`, он уже содержит готовые решения для логирования, таймаутов, CORS и перехвата паник.
2. **Параметры пути:** не пытайтесь парсить URL вручную, используйте `{param}` в пути и `chi.URLParam`.
3. **Группировка:** активно используйте `r.Route` для создания иерархии REST API (например, группировка всех маршрутов `/api/v1`).
