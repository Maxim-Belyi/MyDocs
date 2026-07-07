---
sidebar_position: 8
---

#caarlos0/env

Пакет `caarlos0/env` предоставляет простой и элегантный способ парсинга переменных окружения (environment variables) в структуры Go. Это избавляет от необходимости вручную вызывать `os.Getenv` для каждой переменной и писать код для конвертации строк в числа, булевы значения или срезы.

---

## Зачем нужен?

Стандартный подход требует много рутинного кода:
```go
portStr := os.Getenv("PORT")
port, err := strconv.Atoi(portStr)
// обработка ошибки...
```

С `caarlos0/env` вы просто объявляете структуру с тегами:
```go
type Config struct {
    Port int `env:"PORT"`
}
```

---

## Основные функции пакета

В отличие от многих других библиотек, `caarlos0/env` имеет минимальный API. Практически вся логика управляется через теги структур, а вызываются только функции парсинга.

### Функция env.Parse
Самая главная функция библиотеки. Принимает указатель на структуру и заполняет её значениями из переменных окружения.

```go
func Parse(v interface{}) error
```

**Пример использования:**
```go
package main

import (
    "fmt"
    "log"
    "github.com/caarlos0/env/v10"
)

type Config struct {
    Home   string `env:"HOME"`
    Port   int    `env:"PORT" envDefault:"3000"`
    IsProd bool   `env:"PRODUCTION"`
}

func main() {
    cfg := Config{}
    if err := env.Parse(&cfg); err != nil {
        log.Fatalf("%+v\n", err)
    }

    fmt.Printf("%+v\n", cfg)
}
```

### Функция env.ParseWithOptions
Позволяет гибко настроить процесс парсинга, передав структуру `env.Options`. Используется, когда базового `Parse` недостаточно.

```go
func ParseWithOptions(v interface{}, opts Options) error
```

**Пример использования (добавление префикса ко всем переменным):**
```go
cfg := Config{}
// Библиотека будет искать переменные вида APP_HOME, APP_PORT
opts := env.Options{
    Prefix: "APP_", 
}
if err := env.ParseWithOptions(&cfg, opts); err != nil {
    log.Fatal(err)
}
```

**Что еще можно настроить в `Options`:**
* `Environment`: передать `map[string]string` вместо того, чтобы читать системное окружение.
* `FuncMap`: зарегистрировать собственные функции для парсинга пользовательских типов (custom types).
* `RequiredIfNoDef`: сделать все поля обязательными, если у них нет значения по умолчанию.

### Поддерживаемые теги структуры

В библиотеке используются специальные теги `env`, `envDefault` и параметры, разделенные запятыми.

1. **`env:"VAR_NAME"`**
   Привязывает поле структуры к переменной окружения `VAR_NAME`.

2. **`envDefault:"value"`**
   Задает значение по умолчанию, если переменная окружения не установлена.
   ```go
   Port int `env:"PORT" envDefault:"8080"`
   ```

3. **`env:"VAR_NAME,required"`**
   Делает переменную обязательной. Если её нет, `env.Parse` вернет ошибку.
   ```go
   SecretKey string `env:"SECRET_KEY,required"`
   ```

4. **`env:"VAR_NAME,notEmpty"`**
   Переменная должна быть установлена и не может быть пустой строкой.
   ```go
   Password string `env:"PASSWORD,notEmpty"`
   ```

5. **`env:"VAR_NAME,unset"`**
   Удаляет переменную окружения из системы (`os.Unsetenv`) сразу после того, как она была прочитана. Полезно для секретов (паролей, токенов), чтобы они не остались в памяти или логах.
   ```go
   Token string `env:"API_TOKEN,unset"`
   ```

6. **`env:"VAR_NAME,expand"`**
   Позволяет раскрывать значения других переменных внутри значения (аналогично `os.ExpandEnv`).
   ```go
   // Если PATH="/usr/bin", а VAR="$PATH/local"
   Path string `env:"VAR,expand"` // Получит "/usr/bin/local"
   ```

7. **`env:"VAR_NAME,file"`**
   Читает значение из файла, путь к которому указан в переменной окружения. Полезно для Docker Secrets.
   ```go
   // Если DB_PASSWORD_FILE="/run/secrets/db_pass"
   DBPassword string `env:"DB_PASSWORD_FILE,file"`
   ```

---

## Итог: Чек-лист по пакету caarlos0/env

1. **Структуры:** определяйте конфигурацию приложения как единую структуру.
2. **Типизация:** библиотека автоматически парсит строки в `int`, `bool`, `time.Duration`, `[]string` и другие базовые типы.
3. **Безопасность:** используйте флаг `unset` для паролей и токенов.
4. **Удобство:** всегда задавайте `envDefault` для некритичных параметров (например, порта базы данных при локальной разработке), чтобы упростить запуск проекта.
