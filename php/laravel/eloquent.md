---
sidebar_position: 2
---

# Eloquent ORM

Eloquent — это ActiveRecord ORM, встроенный в Laravel. Каждая модель соответствует таблице в базе данных и предоставляет методы для построения запросов, связей и событий.

---

## 1. Базовые операции

```php
// Получение всех записей
$users = User::all(); // SELECT * FROM users — осторожно на больших таблицах!

// Поиск по первичному ключу
$user = User::find(1);     // User|null
$user = User::findOrFail(1); // User или выбрасывает ModelNotFoundException (→ 404)

// Построитель запросов
$activeUsers = User::where('is_active', true)
    ->where('role', 'admin')
    ->orderBy('name')
    ->limit(10)
    ->get(); // Collection

// Первая запись
$user = User::where('email', 'alice@example.com')->first(); // User|null
$user = User::where('email', 'alice@example.com')->firstOrFail();

// Создание
$user = User::create([
    'name'  => 'Alice',
    'email' => 'alice@example.com',
]);

// Обновление
User::where('id', 1)->update(['name' => 'Bob']);
$user->update(['name' => 'Bob']);

// Удаление
User::destroy(1);
$user->delete();
```

---

## 2. Проблема N+1 и её решение

**N+1** — критическая проблема производительности, возникающая при ленивой загрузке (Lazy Loading) связей.

### Проблема

```php
$posts = Post::all(); // 1 запрос: SELECT * FROM posts

foreach ($posts as $post) {
    echo $post->author->name; // N запросов: SELECT * FROM users WHERE id = ?
}
// Итого: 1 + N запросов. При 1000 постах — 1001 запрос к БД!
```

### Решение: Eager Loading (`with`)

```php
// Загружаем связь сразу: 2 запроса независимо от количества постов
$posts = Post::with('author')->get();
// SELECT * FROM posts
// SELECT * FROM users WHERE id IN (1, 2, 3, ...)

foreach ($posts as $post) {
    echo $post->author->name; // Данные уже в памяти — запросов нет
}

// Загрузка нескольких связей
$posts = Post::with(['author', 'tags', 'comments.author'])->get();

// Условная загрузка связи
$posts = Post::with(['comments' => function ($query) {
    $query->where('approved', true)->orderBy('created_at', 'desc');
}])->get();
```

### `withCount` — считать связанные записи без загрузки

```php
$posts = Post::withCount('comments')->get();
// SELECT posts.*, COUNT(comments.id) AS comments_count FROM posts
// LEFT JOIN comments ON comments.post_id = posts.id GROUP BY posts.id

foreach ($posts as $post) {
    echo $post->comments_count; // Целое число, не коллекция Comment
}
```

### Диагностика N+1: `DB::listen`

```php
// В AppServiceProvider::boot() для локальной среды
if (app()->environment('local')) {
    DB::listen(function ($query) {
        Log::debug($query->sql, ['bindings' => $query->bindings, 'time' => $query->time]);
    });
}

// Пакет barryvdh/laravel-debugbar или clockwork — визуальный инструмент
```

---

## 3. Типы связей

```php
class User extends Model
{
    // Один ко многим
    public function posts(): HasMany
    {
        return $this->hasMany(Post::class);
    }

    // Через промежуточную таблицу
    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(Role::class)
            ->withPivot('assigned_at')
            ->withTimestamps();
    }
}

class Post extends Model
{
    // Многие к одному
    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    // Один к одному
    public function meta(): HasOne
    {
        return $this->hasOne(PostMeta::class);
    }
}
```

### `has` и `whereHas` — фильтрация по наличию/условию связи

```php
// Только пользователи, у которых есть хотя бы один пост
$usersWithPosts = User::has('posts')->get();

// Пользователи с более чем 5 постами
$activeAuthors = User::has('posts', '>=', 5)->get();

// Пользователи, у которых есть опубликованные посты
$usersWithPublishedPosts = User::whereHas('posts', function ($query) {
    $query->where('published', true);
})->get();
```

---

## 4. Scopes (области видимости запроса)

Scopes позволяют вынести повторяющиеся условия запроса в переиспользуемые методы.

### Local Scopes

Именуются с префиксом `scope`, вызываются без него:

```php
class User extends Model
{
    // Local scope
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    public function scopeRole(Builder $query, string $role): Builder
    {
        return $query->where('role', $role);
    }

    public function scopeRegisteredAfter(Builder $query, \Carbon\Carbon $date): Builder
    {
        return $query->where('created_at', '>=', $date);
    }
}

// Использование (scope без префикса 'scope')
$admins = User::active()->role('admin')->get();
$newUsers = User::active()->registeredAfter(now()->subMonth())->get();
```

### Global Scopes

Применяются автоматически ко всем запросам к модели:

```php
// Создание Global Scope
class ActiveScope implements Scope
{
    public function apply(Builder $builder, Model $model): void
    {
        $builder->where('is_active', true);
    }
}

// Подключение к модели
class User extends Model
{
    protected static function booted(): void
    {
        static::addGlobalScope(new ActiveScope());
    }
}

// Теперь User::all() автоматически добавляет WHERE is_active = 1
// Отключить для конкретного запроса:
User::withoutGlobalScope(ActiveScope::class)->get();
User::withoutGlobalScopes()->get(); // Отключить все
```

**SoftDeletes** работает именно так: добавляет глобальный scope `WHERE deleted_at IS NULL` ко всем запросам.

---

## 5. Accessors и Mutators (PHP 8+ синтаксис)

Accessors — геттеры для атрибутов, Mutators — сеттеры. Начиная с Laravel 9+ используется синтаксис через атрибут `Attribute`.

```php
use Illuminate\Database\Eloquent\Casts\Attribute;

class User extends Model
{
    // Accessor + Mutator для имени
    protected function name(): Attribute
    {
        return Attribute::make(
            // Accessor: вызывается при $user->name
            get: fn(string $value) => ucfirst($value),

            // Mutator: вызывается при $user->name = 'alice'
            set: fn(string $value) => strtolower(trim($value)),
        );
    }

    // Только Accessor — вычисляемый атрибут
    protected function fullName(): Attribute
    {
        return Attribute::make(
            get: fn() => $this->first_name . ' ' . $this->last_name,
        );
    }
}

$user = User::find(1);
$user->name = 'ALICE';     // Mutator: сохранится как 'alice'
echo $user->name;           // Accessor: выведет 'Alice'
echo $user->full_name;      // 'Alice Smith'
```

### `$casts` — автоматическое приведение типов

```php
class Order extends Model
{
    protected $casts = [
        'paid_at'    => 'datetime',          // Carbon instance
        'metadata'   => 'array',             // JSON → array автоматически
        'total'      => 'decimal:2',
        'is_shipped' => 'boolean',
        'status'     => OrderStatus::class,  // Enum (PHP 8.1+)
    ];
}

$order = Order::find(1);
echo $order->paid_at->format('d.m.Y'); // Carbon
$order->metadata['key'] = 'value';     // Работает как массив, сохраняется как JSON
```

---

## 6. Model Events и Observers

Eloquent генерирует события в ключевых точках жизненного цикла модели.

| Событие | Когда |
| :--- | :--- |
| `creating` / `created` | До / после INSERT |
| `updating` / `updated` | До / после UPDATE |
| `saving` / `saved` | До / после INSERT или UPDATE |
| `deleting` / `deleted` | До / после DELETE |
| `restoring` / `restored` | До / после восстановления (SoftDeletes) |

```php
// Подписка в booted()
class User extends Model
{
    protected static function booted(): void
    {
        // Хешируем пароль перед сохранением
        static::creating(function (User $user) {
            $user->password = bcrypt($user->password);
        });

        static::deleting(function (User $user) {
            // Удаляем связанные файлы
            Storage::delete($user->avatar_path);
        });
    }
}
```

Для более сложной логики — выносим в Observer (см. раздел Patterns).

---

## 7. Мягкое удаление (SoftDeletes)

```php
use Illuminate\Database\Eloquent\SoftDeletes;

class Post extends Model
{
    use SoftDeletes; // Добавляет поле deleted_at
}

$post->delete();             // Устанавливает deleted_at, не удаляет физически
Post::find(1);               // NULL — мягко удалённые скрыты по умолчанию
Post::withTrashed()->find(1); // Включить мягко удалённые в запрос
Post::onlyTrashed()->get();   // Только мягко удалённые
$post->restore();            // Восстановить
$post->forceDelete();        // Физическое удаление из БД
```

---

## 8. Chunk и Cursor для больших выборок

```php
// chunk — загружает по N записей, каждый батч в памяти одновременно
User::where('active', true)->chunk(1000, function ($users) {
    foreach ($users as $user) {
        $user->sendNewsletter();
    }
});

// cursor — генератор, одна запись в памяти (использует PHP-генераторы)
foreach (User::where('active', true)->cursor() as $user) {
    $user->sendNewsletter();
}
// cursor потребляет O(1) памяти vs chunk O(N) памяти на батч
```
