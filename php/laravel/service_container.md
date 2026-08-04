---
sidebar_position: 3
---

# Service Container и Facades

Service Container (IoC-контейнер) — ядро Laravel. Facades — удобный статический интерфейс к объектам, зарегистрированным в контейнере. Service Providers — место, где всё это конфигурируется.

---

## 1. Service Container (Контейнер внедрения зависимостей)

Service Container — это класс `Illuminate\Container\Container`. Он умеет:
1. **Хранить** биндинги (привязки интерфейс → реализация).
2. **Разрешать** зависимости автоматически через рефлексию (Automatic Resolution).

### Automatic Resolution (автоматическое разрешение)

Если класс не имеет зависимостей или все его зависимости — конкретные классы, Laravel создаёт его без явного биндинга:

```php
class OrderService
{
    // Laravel автоматически инъецирует UserRepository и Mailer
    public function __construct(
        private EloquentUserRepository $users,
        private Mailer $mailer,
    ) {}
}

// В контроллере — Laravel сам создаст OrderService и все его зависимости
public function __construct(private OrderService $service) {}
```

### Типы биндингов

```php
// В Service Provider
class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // bind — новый экземпляр при каждом разрешении
        $this->app->bind(UserRepositoryInterface::class, EloquentUserRepository::class);

        // singleton — один экземпляр на весь запрос
        $this->app->singleton(PaymentGateway::class, function ($app) {
            return new StripeGateway(config('services.stripe.key'));
        });

        // instance — зарегистрировать уже созданный объект
        $this->app->instance(Config::class, new Config(['debug' => true]));

        // scoped — singleton в рамках одного запроса (сбрасывается между запросами при Octane)
        $this->app->scoped(RequestContext::class, function ($app) {
            return new RequestContext($app->make(Request::class));
        });
    }
}
```

### Разрешение зависимостей вручную

```php
// Через фасад App
$service = app(UserService::class);
$service = app()->make(UserService::class);

// Разрешение с передачей параметров
$gateway = app()->makeWith(PaymentGateway::class, ['apiKey' => 'sk_test_...']);

// Через resolve-хелпер
$repo = resolve(UserRepositoryInterface::class);
```

### Контекстное связывание

Разные классы могут получать разные реализации одного интерфейса:

```php
$this->app->when(PhotoController::class)
    ->needs(FileSystemInterface::class)
    ->give(LocalFilesystem::class);

$this->app->when(VideoController::class)
    ->needs(FileSystemInterface::class)
    ->give(S3Filesystem::class);
```

---

## 2. Service Providers

Service Provider — это класс, который регистрирует биндинги и выполняет начальную конфигурацию компонентов. Все провайдеры указываются в `config/app.php → providers`.

```php
class PaymentServiceProvider extends ServiceProvider
{
    // register() — только биндинги в контейнер
    // Здесь нельзя рассчитывать на то, что другие провайдеры уже загружены
    public function register(): void
    {
        $this->app->singleton(PaymentGatewayInterface::class, function ($app) {
            $driver = config('payment.driver');

            return match ($driver) {
                'stripe'  => new StripeGateway(config('payment.stripe_key')),
                'yookassa' => new YooKassaGateway(config('payment.yookassa_id')),
                default   => throw new \InvalidArgumentException("Unknown driver: $driver"),
            };
        });
    }

    // boot() — выполняется после того, как все провайдеры выполнили register()
    // Здесь уже можно использовать любые зависимости из контейнера
    public function boot(): void
    {
        // Регистрация event listeners
        Event::listen(PaymentCompleted::class, SendPaymentReceipt::class);

        // Регистрация валидационных правил
        Validator::extend('luhn', function ($attribute, $value) {
            return $this->validateLuhn($value);
        });

        // Публикация конфигурации для пакетов
        $this->publishes([
            __DIR__.'/../config/payment.php' => config_path('payment.php'),
        ], 'payment-config');
    }
}
```

### Deferred Providers (отложенная загрузка)

Если провайдер нужен только при явном запросе его биндинга, его можно пометить как deferred:

```php
class PdfServiceProvider extends ServiceProvider
{
    protected $defer = true; // Загружать только когда контейнер просит PdfGenerator

    public function provides(): array
    {
        return [PdfGeneratorInterface::class];
    }

    public function register(): void
    {
        $this->app->singleton(PdfGeneratorInterface::class, WkHtmlToPdfGenerator::class);
    }
}
```

---

## 3. Facades

Facade — это класс, предоставляющий **статический интерфейс** к объекту в Service Container. Несмотря на статический синтаксис, Facades не являются настоящими статическими вызовами — под капотом происходит обращение к контейнеру.

```php
// Использование через Facade
use Illuminate\Support\Facades\Cache;

Cache::put('key', 'value', 3600);
$value = Cache::get('key');

// Эквивалент через внедрение зависимости
use Illuminate\Cache\Repository;

class SomeService
{
    public function __construct(private Repository $cache) {}

    public function example(): void
    {
        $this->cache->put('key', 'value', 3600);
        $value = $this->cache->get('key');
    }
}
```

### Как работает Facade под капотом

```php
// Упрощённая реализация
abstract class Facade
{
    protected static function getFacadeAccessor(): string
    {
        throw new RuntimeException('Facade must implement getFacadeAccessor');
    }

    public static function __callStatic(string $method, array $args): mixed
    {
        // 1. Получаем псевдоним из контейнера
        $instance = app(static::getFacadeAccessor());
        // 2. Вызываем метод на реальном объекте
        return $instance->$method(...$args);
    }
}

// Конкретный Facade
class Cache extends Facade
{
    protected static function getFacadeAccessor(): string
    {
        return 'cache'; // Псевдоним, зарегистрированный в контейнере
    }
}
```

### Основные Facades и их классы

| Facade | Класс в контейнере |
| :--- | :--- |
| `App` | `Illuminate\Foundation\Application` |
| `Cache` | `Illuminate\Cache\Repository` |
| `DB` | `Illuminate\Database\DatabaseManager` |
| `Event` | `Illuminate\Events\Dispatcher` |
| `Log` | `Illuminate\Log\LogManager` |
| `Queue` | `Illuminate\Queue\QueueManager` |
| `Route` | `Illuminate\Routing\Router` |
| `Storage` | `Illuminate\Filesystem\FilesystemManager` |
| `Validator` | `Illuminate\Validation\Factory` |

### Реальные объекты Facades в тестах

Facades поддерживают мокирование без необходимости внедрять зависимость явно:

```php
Cache::shouldReceive('get')
    ->once()
    ->with('user:1')
    ->andReturn(['id' => 1, 'name' => 'Alice']);

Event::fake(); // Заменяет реальный диспетчер, ловит события
Event::assertDispatched(UserRegistered::class);

Mail::fake();
Mail::assertSent(WelcomeEmail::class, fn($mail) => $mail->hasTo('alice@example.com'));
```

---

## 4. Dependency Injection — правильный подход

Facades удобны, но DI через конструктор более явен, лучше тестируется и рекомендован для классов, которые будут тестироваться изолированно.

```php
// Предпочтительно в сервисах и репозиториях
class ReportService
{
    public function __construct(
        private UserRepositoryInterface $users,
        private CacheInterface $cache,
        private LoggerInterface $logger,
    ) {}

    public function generateMonthlyReport(int $month): Report
    {
        $cacheKey = "report:monthly:$month";

        return $this->cache->remember($cacheKey, 3600, function () use ($month) {
            $this->logger->info("Generating monthly report for month $month");
            $data = $this->users->getStatsByMonth($month);
            return new Report($data);
        });
    }
}
```
