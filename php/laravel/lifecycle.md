---
sidebar_position: 1
---

# Жизненный цикл запроса в Laravel

Понимание того, что происходит с момента поступления HTTP-запроса до отправки ответа, — базовый вопрос на любом собеседовании по Laravel. Этот путь проходит через несколько слоёв фреймворка.

---

## 1. Точка входа: `public/index.php`

Все HTTP-запросы к Laravel-приложению направляются веб-сервером (Nginx/Apache) в единственный PHP-файл: `public/index.php`.

```php
// public/index.php (упрощённо)

// 1. Подключаем автозагрузчик Composer
require __DIR__.'/../vendor/autoload.php';

// 2. Загружаем приложение (Application / Service Container)
$app = require_once __DIR__.'/../bootstrap/app.php';

// 3. Создаём HTTP-ядро и обрабатываем запрос
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);

$response = $kernel->handle(
    $request = Illuminate\Http\Request::capture() // Создаёт Request из $_SERVER, $_GET, $_POST
);

// 4. Отправляем ответ клиенту
$response->send();

// 5. Финализация (логирование, завершение сессий)
$kernel->terminate($request, $response);
```

---

## 2. Создание Application (Service Container)

`bootstrap/app.php` создаёт экземпляр `Illuminate\Foundation\Application` — центральный IoC-контейнер. Здесь регистрируются биндинги для ключевых компонентов: HTTP-ядра, консольного ядра и обработчика исключений.

```php
// bootstrap/app.php (упрощённо)
$app = new Illuminate\Foundation\Application(
    $_ENV['APP_BASE_PATH'] ?? dirname(__DIR__)
);

$app->singleton(
    Illuminate\Contracts\Http\Kernel::class,
    App\Http\Kernel::class
);

$app->singleton(
    Illuminate\Contracts\Console\Kernel::class,
    App\Console\Kernel::class
);

$app->singleton(
    Illuminate\Contracts\Debug\ExceptionHandler::class,
    App\Exceptions\Handler::class
);

return $app;
```

---

## 3. Http\Kernel: регистрация и применение Middleware

`App\Http\Kernel` наследует `Illuminate\Foundation\Http\Kernel`. Он:
1. Загружает и загружает все Service Providers (через `$app->boot()`).
2. Применяет **глобальные middleware** к каждому запросу (например, `TrimStrings`, `ConvertEmptyStringsToNull`).
3. Применяет **группы middleware** (`web`, `api`).

```php
// app/Http/Kernel.php (структура)
class Kernel extends HttpKernel
{
    // Применяется к КАЖДОМУ запросу
    protected $middleware = [
        \App\Http\Middleware\TrustProxies::class,
        \Illuminate\Http\Middleware\HandleCors::class,
        \Illuminate\Foundation\Http\Middleware\PreventRequestsDuringMaintenance::class,
        \Illuminate\Http\Middleware\ValidatePostSize::class,
        \App\Http\Middleware\TrimStrings::class,
    ];

    // Именованные группы middleware
    protected $middlewareGroups = [
        'web' => [
            \App\Http\Middleware\EncryptCookies::class,
            \Illuminate\Session\Middleware\StartSession::class,
            \Illuminate\View\Middleware\ShareErrorsFromSession::class,
            \App\Http\Middleware\VerifyCsrfToken::class,
        ],

        'api' => [
            \Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful::class,
            'throttle:api',
            \Illuminate\Routing\Middleware\SubstituteBindings::class,
        ],
    ];

    // Именованные (route) middleware
    protected $routeMiddleware = [
        'auth'     => \App\Http\Middleware\Authenticate::class,
        'throttle' => \Illuminate\Routing\Middleware\ThrottleRequests::class,
        'verified' => \Illuminate\Auth\Middleware\EnsureEmailIsVerified::class,
    ];
}
```

---

## 4. Загрузка Service Providers

Service Providers — сердце Laravel. Именно они регистрируют все компоненты фреймворка в Service Container: маршруты, события, биндинги, Facades.

Список провайдеров задаётся в `config/app.php` (`providers`). Загрузка проходит в два этапа:

1. **`register()`** — вызывается у всех провайдеров поочерёдно. На этом этапе можно делать биндинги в контейнер.
2. **`boot()`** — вызывается у всех провайдеров после того, как все `register()` завершены. Здесь можно использовать уже зарегистрированные зависимости (подписка на события, регистрация маршрутов).

---

## 5. Маршрутизация

После загрузки провайдеров `Router` находит маршрут, соответствующий URI и HTTP-методу запроса. Маршруты загружаются в `RouteServiceProvider`.

```php
// RouteServiceProvider → routes/api.php, routes/web.php
Route::prefix('api/v1')
    ->middleware('api')
    ->group(base_path('routes/api.php'));
```

**Route Model Binding:** если параметр маршрута совпадает с именем переменной типа Eloquent-модели, Laravel автоматически находит и подставляет модель:

```php
// Маршрут
Route::get('/users/{user}', [UserController::class, 'show']);

// Контроллер — $user уже загружен из БД, 404 если не найден
public function show(User $user): JsonResponse
{
    return response()->json($user);
}
```

---

## 6. Middleware → Контроллер → Ответ

Запрос проходит через цепочку middleware, применённых к маршруту. Каждый middleware может либо пропустить запрос дальше (`$next($request)`), либо вернуть ответ досрочно.

```
Request
  → GlobalMiddleware (TrustProxies, ValidatePostSize...)
    → GroupMiddleware (api: throttle, SubstituteBindings)
      → RouteMiddleware (auth, verified...)
        → Controller@method
      ← RouteMiddleware (post-processing)
    ← GroupMiddleware
  ← GlobalMiddleware
Response
```

После контроллера ответ проходит middleware в обратном порядке (если middleware обрабатывает ответ после `$next`).

---

## 7. Полная схема

```
HTTP Request
    ↓
public/index.php
    ↓ require autoload.php
    ↓ create Application (IoC Container)
    ↓ resolve Http\Kernel
    ↓
Http\Kernel::handle()
    ↓ boot ServiceProviders (register → boot)
    ↓ apply Global Middleware
    ↓
Router::dispatch()
    ↓ match URI + Method → Route
    ↓ apply Group Middleware (web/api)
    ↓ apply Route Middleware (auth, throttle...)
    ↓
Controller::method()
    ↓ business logic / service calls
    ↓ return Response / Resource / JsonResponse
    ↑
Middleware (reverse order, post-processing)
    ↑
Http\Kernel::terminate()
    ↓
HTTP Response → Client
```

---

## 8. Жизненный цикл запроса CLI (Artisan)

В консольном контексте точка входа — `artisan`. Вместо `Http\Kernel` создаётся `Console\Kernel`, который регистрирует команды и планировщик задач. Service Providers загружаются так же, как при HTTP-запросе.

```bash
php artisan migrate
# Console\Kernel → ServiceProviders → Command::handle()
```
