---
sidebar_position: 6
---

# net/http

Пакет `net/http` предоставляет масштабируемую реализацию HTTP-клиента и сервера. В отличие от многих других языков, HTTP-сервер стандартной библиотеки Go подходит для использования в production без дополнительных прокси.

---

## 1. Запуск HTTP-сервера

Основным компонентом для обработки запросов является интерфейс `http.Handler`.

```go
package main

import (
    "fmt"
    "net/http"
)

// Функция-обработчик с сигнатурой http.HandlerFunc
func helloHandler(w http.ResponseWriter, r *http.Request) {
    // w - интерфейс для отправки ответа клиенту
    // r - указатель на структуру с данными запроса
    fmt.Fprintf(w, "Привет! Вы запросили путь: %s", r.URL.Path)
}

func main() {
    // Регистрация обработчика для пути "/"
    http.HandleFunc("/", helloHandler)

    // Запуск сервера на порту 8080
    err := http.ListenAndServe(":8080", nil)
    if err != nil {
        panic(err)
    }
}
```

> **Совет:** Не используйте дефолтный `http.DefaultServeMux` (передавая `nil` в `ListenAndServe`) в production. Лучше создавайте свой экземпляр сервера и роутера, чтобы иметь возможность настраивать таймауты.

### Вспомогательные функции: http.Error и http.Redirect

Пакет содержит готовые функции для частых задач внутри обработчиков.

**`http.Error`**
Удобно отправляет клиенту текст ошибки и соответствующий HTTP-статус, закрывая запрос.
```go
func myHandler(w http.ResponseWriter, r *http.Request) {
    if r.Method != http.MethodPost {
        // Отправит статус 405 Method Not Allowed
        http.Error(w, "Разрешен только метод POST", http.StatusMethodNotAllowed)
        return
    }
}
```

**`http.Redirect`**
Выполняет перенаправление (редирект) клиента на другой URL.
```go
func oldPathHandler(w http.ResponseWriter, r *http.Request) {
    // Отправит статус 301 Moved Permanently
    http.Redirect(w, r, "/new-path", http.StatusMovedPermanently)
}
```

### Работа с HTTP-заголовками (Headers)
Интерфейс `http.ResponseWriter` имеет метод `Header()`, который возвращает карту заголовков ответа. Важно: заголовки нужно устанавливать **до** вызова `w.Write()` или `w.WriteHeader()`.

```go
func jsonHandler(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusOK) // Отправка статуса 200
    w.Write([]byte(`{"status": "ok"}`))
}
```

---

## 2. Настройка HTTP-сервера с таймаутами

Безопасный HTTP-сервер должен ограничивать время обработки запроса, чтобы избежать утечек ресурсов при медленных соединениях.

```go
mux := http.NewServeMux()
mux.HandleFunc("/api", apiHandler)

server := &http.Server{
    Addr:         ":8080",
    Handler:      mux,
    ReadTimeout:  10 * time.Second,
    WriteTimeout: 10 * time.Second,
    IdleTimeout:  120 * time.Second,
}

server.ListenAndServe()
```

---

## 3. Выполнение HTTP-запросов (Клиент)

Для простых запросов пакет предоставляет функции `http.Get`, `http.Post` и `http.PostForm`.

```go
resp, err := http.Get("https://api.example.com/data")
if err != nil {
    // Обработка сетевой ошибки
    return
}
defer resp.Body.Close() // Обязательно закрывайте тело ответа

// Чтение ответа
body, _ := io.ReadAll(resp.Body)
```

### Пользовательский HTTP-клиент
Как и в случае с сервером, не используйте `http.DefaultClient` для критичных задач, так как он не имеет таймаутов.

```go
client := &http.Client{
    Timeout: 5 * time.Second,
}

req, _ := http.NewRequest(http.MethodGet, "https://api.example.com/data", nil)
req.Header.Add("Authorization", "Bearer token")

resp, err := client.Do(req)
// обработка ответа...
```

---

## Итог: Чек-лист по пакету net/http

1.  **Таймауты сервера:** всегда настраивайте `ReadTimeout` и `WriteTimeout` при инициализации `http.Server`.
2.  **Таймауты клиента:** всегда создавайте собственный `http.Client` с явно заданным параметром `Timeout`.
3.  **Закрытие тела ответа:** всегда вызывайте `defer resp.Body.Close()` после успешного HTTP-запроса, иначе произойдет утечка памяти и файловых дескрипторов.
4.  **Маршрутизация:** для простых API используйте `http.NewServeMux` (в Go 1.22 он поддерживает переменные пути и методы запроса). Для сложной логики используйте сторонние роутеры.
