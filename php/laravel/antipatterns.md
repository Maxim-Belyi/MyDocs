---
sidebar_position: 6
---

# Антипаттерны запросов в Laravel

Антипаттерны — это распространённые решения, которые выглядят удобно, но создают проблемы производительности, безопасности или сопровождаемости в production.

---

## 1. Проблема N+1 (Lazy Loading)

**Суть:** Для коллекции из N объектов выполняется 1 запрос на список + N запросов на связанные данные.

```php
// АНТИПАТТЕРН
$posts = Post::all(); // 1 запрос
foreach ($posts as $post) {
    echo $post->author->name; // N запросов! SELECT * FROM users WHERE id = ?
    echo $post->category->title; // Ещё N запросов!
}
// При 500 постах: 1 + 500 + 500 = 1001 запрос

// ПРАВИЛЬНО — Eager Loading
$posts = Post::with(['author', 'category'])->get(); // 3 запроса, независимо от N
foreach ($posts as $post) {
    echo $post->author->name;   // Данные в памяти
    echo $post->category->title; // Данные в памяти
}
```

### Диагностика

```php
// В AppServiceProvider::boot() только для local окружения
if (app()->environment('local')) {
    // Автоматически выбрасывать исключение при lazy loading (Laravel 8.43+)
    Model::preventLazyLoading();

    // Или логировать запросы
    DB::listen(fn($q) => logger($q->sql));
}
```

---

## 2. Загрузка всей таблицы в память (`all()`)

```php
// АНТИПАТТЕРН — загружает 500 000 строк в память PHP
$users = User::all();
foreach ($users as $user) {
    $user->sendNewsletter();
}

// ПРАВИЛЬНО — chunk: батч-обработка по N записей
User::chunk(1000, function ($users) {
    foreach ($users as $user) {
        $user->sendNewsletter();
    }
});

// ПРАВИЛЬНО — cursor: генератор, одна запись в памяти
foreach (User::cursor() as $user) {
    $user->sendNewsletter();
}

// ПРАВИЛЬНО — отправить в очередь на фоновую обработку
User::chunk(500, function ($users) {
    foreach ($users as $user) {
        dispatch(new SendNewsletterJob($user));
    }
});
```

---

## 3. `SELECT *` — загрузка лишних полей

```php
// АНТИПАТТЕРН — загружает все поля, включая тяжёлые (BLOB, TEXT)
$users = User::all();

// ПРАВИЛЬНО — только нужные поля
$users = User::select('id', 'name', 'email')->get();

// В Resource — это особенно важно: не давать запросу тащить то, что не нужно
// toArray() Resource решает проблему отображения, но не загрузки из БД
```

---

## 4. Fat Controller (жирный контроллер)

**Суть:** Вся бизнес-логика сосредоточена в контроллере. Контроллер напрямую работает с Eloquent, проверяет бизнес-правила, шлёт письма.

```php
// АНТИПАТТЕРН — Fat Controller
class UserController extends Controller
{
    public function register(Request $request): JsonResponse
    {
        $request->validate(['email' => 'required|email', 'password' => 'required|min:8']);

        if (User::where('email', $request->email)->exists()) {
            return response()->json(['error' => 'Email taken'], 422);
        }

        $user = User::create([
            'email'    => $request->email,
            'password' => bcrypt($request->password),
            'role'     => 'user',
        ]);

        Mail::to($user->email)->send(new WelcomeEmail($user));
        $user->subscriptions()->create(['plan' => 'free']);
        Log::info("User registered: {$user->email}");

        return response()->json(['user' => $user], 201);
    }
}

// ПРАВИЛЬНО — тонкий контроллер, бизнес-логика в Service
class UserController extends Controller
{
    public function __construct(private UserService $service) {}

    public function register(RegisterUserRequest $request): JsonResponse
    {
        $user = $this->service->register(RegisterUserDto::fromRequest($request));
        return response()->json(new UserResource($user), 201);
    }
}
```

---

## 5. God Model (Богатая модель)

**Суть:** Eloquent-модель содержит 50+ методов: бизнес-логику, форматирование, валидацию, интеграции с внешними сервисами.

```php
// АНТИПАТТЕРН — User-модель знает обо всём
class User extends Model
{
    public function registerWithStripe() { /* ... */ }
    public function sendVerificationEmail() { /* ... */ }
    public function calculateMonthlyStats() { /* ... */ }
    public function generatePdfReport() { /* ... */ }
    public function syncWithCRM() { /* ... */ }
    // ... ещё 40 методов
}

// ПРАВИЛЬНО — разделение ответственности
// Модель хранит только атрибуты, связи, scopes, accessors
// Бизнес-логика → Service Layer
// Побочные эффекты → Observers / Event Listeners
// Форматирование → API Resources
// Сложные запросы → Repository
```

---

## 6. Прямые запросы к БД в Blade-шаблонах

```php
// АНТИПАТТЕРН — запросы в представлении
{{-- resources/views/dashboard.blade.php --}}
@foreach (User::where('active', 1)->get() as $user)
    {{ $user->name }}
@endforeach

{{-- Ещё хуже — запрос в цикле (N+1 прямо в шаблоне) --}}
@foreach ($posts as $post)
    {{ Post::find($post->id)->author->name }}
@endforeach

// ПРАВИЛЬНО — данные подготавливаются в контроллере
class DashboardController extends Controller
{
    public function index(): View
    {
        return view('dashboard', [
            'users' => User::active()->get(),
        ]);
    }
}
```

---

## 7. Отсутствие транзакций при связанных операциях

```php
// АНТИПАТТЕРН — если второй запрос упадёт, данные будут в несогласованном состоянии
public function transfer(int $fromId, int $toId, int $amount): void
{
    $from = Account::find($fromId);
    $from->balance -= $amount;
    $from->save(); // Допустим, здесь успешно

    $to = Account::find($toId);
    $to->balance += $amount; // А здесь, например, блокировка таблицы или ошибка сети
    $to->save(); // Деньги уже списаны, но не зачислены!
}

// ПРАВИЛЬНО — транзакция атомарна: или всё, или ничего
public function transfer(int $fromId, int $toId, int $amount): void
{
    DB::transaction(function () use ($fromId, $toId, $amount) {
        $from = Account::lockForUpdate()->find($fromId); // Пессимистичная блокировка
        $to   = Account::lockForUpdate()->find($toId);

        if ($from->balance < $amount) {
            throw new InsufficientFundsException();
        }

        $from->decrement('balance', $amount);
        $to->increment('balance', $amount);

        Transaction::create([
            'from_account_id' => $fromId,
            'to_account_id'   => $toId,
            'amount'          => $amount,
        ]);
    }); // При исключении автоматически делается ROLLBACK
}
```

---

## 8. Не использовать индексы (или использовать запросы без использования индексов)

```php
// АНТИПАТТЕРН — фильтрация по неиндексированному полю или с LIKE '%...'
$users = User::where('LOWER(email)', 'alice@example.com')->get(); // Функция на столбце убивает индекс
$posts = Post::where('title', 'LIKE', '%laravel%')->get(); // Ведущий % = full table scan

// ПРАВИЛЬНО
$users = User::whereRaw('email = ?', [strtolower('Alice@Example.com')])->get();
// Лучше хранить email в lowercase при сохранении и использовать обычный WHERE

// Для полнотекстового поиска — использовать FULLTEXT INDEX или Elasticsearch
$posts = Post::whereFullText('title', 'laravel')->get();
```

---

## 9. Хранение бизнес-логики в миграциях

```php
// АНТИПАТТЕРН — заполнение данных бизнес-логикой в миграции
public function up(): void
{
    Schema::create('users', function (Blueprint $table) { /* ... */ });

    // Это плохо — при тестах, пересоздании схемы это выполнится заново непредсказуемо
    User::create(['email' => 'admin@app.com', 'role' => 'admin']);
}

// ПРАВИЛЬНО — начальные данные в Seeders
class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            AdminUserSeeder::class,
            RolesSeeder::class,
        ]);
    }
}

class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        User::firstOrCreate(
            ['email' => 'admin@app.com'],
            ['name' => 'Admin', 'role' => 'admin', 'password' => bcrypt('secret')]
        );
    }
}
```

---

## 10. Игнорирование кэша и повторные идентичные запросы

```php
// АНТИПАТТЕРН — один и тот же запрос выполняется многократно в рамках одного запроса
class PostController
{
    public function index(): View
    {
        $categories = Category::all(); // Запрос
        return view('posts.index', compact('categories'));
    }

    public function create(): View
    {
        $categories = Category::all(); // Тот же запрос
        return view('posts.create', compact('categories'));
    }
}

// ПРАВИЛЬНО — кэшировать стабильные справочники
$categories = Cache::remember('categories', 3600, fn() => Category::all());

// Для данных уровня запроса — кэшировать в singleton-сервисе или через once()
class CategoryService
{
    private ?Collection $cache = null;

    public function all(): Collection
    {
        return $this->cache ??= Category::orderBy('name')->get();
    }
}
```

---

## Сводная таблица антипаттернов

| Антипаттерн | Симптом | Решение |
| :--- | :--- | :--- |
| N+1 (Lazy Loading) | Тысячи запросов на страницу | `with()`, `load()` |
| `all()` на большой таблице | OOM при обработке | `chunk()`, `cursor()` |
| `SELECT *` | Лишние данные, замедление | `select('id', 'name', ...)` |
| Fat Controller | Контроллер > 50 строк | Вынести в Service |
| God Model | Модель > 30 методов | Observer, Service, Repository |
| Запросы в Blade | Логика в представлении | Подготовить данные в контроллере |
| Нет транзакций | Несогласованные данные | `DB::transaction()` |
| LIKE '%text%' | Full table scan | FULLTEXT INDEX, Elasticsearch |
| Логика в миграциях | Нестабильные данные при тестах | Seeders |
| Повторные запросы | Избыточная нагрузка на БД | `Cache::remember()` |
