---
sidebar_position: 5
---

# REST API в Laravel: Resources, Валидация, Аутентификация

---

## 1. API Resources

API Resource — трансформационный слой между Eloquent-моделью и JSON-ответом. Позволяет контролировать, какие поля и в каком формате отдаются клиенту.

```php
// Создание
php artisan make:resource UserResource

// app/Http/Resources/UserResource.php
class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'         => $this->id,
            'name'       => $this->name,
            'email'      => $this->email,
            'role'       => $this->role,
            'created_at' => $this->created_at->toIso8601String(),

            // whenLoaded — поле включается только если связь уже загружена (eager load)
            // Защита от случайного N+1
            'posts' => PostResource::collection($this->whenLoaded('posts')),
            'meta'  => new UserMetaResource($this->whenLoaded('meta')),

            // when — поле включается только при условии
            'secret_key' => $this->when(
                $request->user()?->isAdmin(),
                fn() => $this->secret_key
            ),

            // merge — условное добавление нескольких полей
            $this->mergeWhen($this->is_premium, [
                'premium_expires_at' => $this->premium_expires_at,
                'premium_features'   => $this->premium_features,
            ]),
        ];
    }
}

// Использование в контроллере
public function show(User $user): UserResource
{
    $user->load('posts', 'meta');
    return new UserResource($user);
}

public function index(): AnonymousResourceCollection
{
    $users = User::with('posts')->paginate(20);
    return UserResource::collection($users);
}
```

### Обёртка ответа (wrapping)

По умолчанию Resource оборачивается в `{"data": ...}`. Чтобы отключить:

```php
// В AppServiceProvider::boot()
JsonResource::withoutWrapping();
```

---

## 2. Form Requests и Валидация

Form Request — отдельный класс, инкапсулирующий логику авторизации и валидации HTTP-запроса. Контроллер получает уже провалидированные данные.

```php
php artisan make:request StorePostRequest

// app/Http/Requests/StorePostRequest.php
class StorePostRequest extends FormRequest
{
    // Авторизация — может ли пользователь выполнить это действие
    public function authorize(): bool
    {
        // Возвращаем true для пропуска, false → HTTP 403
        return $this->user()->can('create', Post::class);
    }

    // Правила валидации
    public function rules(): array
    {
        return [
            'title'       => ['required', 'string', 'min:3', 'max:255'],
            'content'     => ['required', 'string', 'min:10'],
            'category_id' => ['required', 'integer', 'exists:categories,id'],
            'tags'        => ['nullable', 'array', 'max:5'],
            'tags.*'      => ['string', 'max:50'],
            'published_at' => ['nullable', 'date', 'after:now'],
        ];
    }

    // Кастомные сообщения об ошибках
    public function messages(): array
    {
        return [
            'title.required'       => 'Заголовок обязателен.',
            'category_id.exists'   => 'Выбранная категория не существует.',
            'published_at.after'   => 'Дата публикации должна быть в будущем.',
        ];
    }

    // Кастомные имена атрибутов в сообщениях
    public function attributes(): array
    {
        return [
            'published_at' => 'дата публикации',
            'category_id'  => 'категория',
        ];
    }

    // Дополнительная обработка данных после валидации
    protected function passedValidation(): void
    {
        $this->merge([
            'user_id' => $this->user()->id,
        ]);
    }
}

// В контроллере — Laravel автоматически применяет валидацию при инъекции
public function store(StorePostRequest $request): JsonResponse
{
    // Только провалидированные данные
    $validated = $request->validated();
    $post = Post::create($validated);
    return response()->json(new PostResource($post), 201);
}
```

### Встроенные правила валидации (наиболее частые)

| Правило | Описание |
| :--- | :--- |
| `required` | Поле обязательно |
| `nullable` | Поле может быть null |
| `string`, `integer`, `boolean`, `array` | Тип значения |
| `min:N`, `max:N` | Минимум/максимум (длина строки, значение числа, размер массива) |
| `email` | Формат email |
| `unique:table,column` | Уникальность в таблице |
| `exists:table,column` | Значение существует в таблице |
| `in:a,b,c` | Значение из списка |
| `confirmed` | Поле `field_confirmation` должно совпадать |
| `regex:/pattern/` | Соответствие регулярному выражению |
| `date`, `date_format:Y-m-d` | Дата |
| `after:date`, `before:date` | Дата после/до |
| `mimes:jpg,png`, `max:2048` | Тип и размер загружаемого файла |

---

## 3. Аутентификация: Sanctum

**Laravel Sanctum** — лёгкая система аутентификации. Поддерживает два режима:

### Режим 1: Token-based (для мобильных приложений и SPA с раздельным доменом)

```php
// Установка
composer require laravel/sanctum
php artisan vendor:publish --provider="Laravel\Sanctum\SanctumServiceProvider"
php artisan migrate

// Модель User должна использовать трейт
use Laravel\Sanctum\HasApiTokens;
class User extends Authenticatable
{
    use HasApiTokens, Notifiable;
}

// Выдача токена (после успешного логина)
class AuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email'    => ['required', 'email'],
            'password' => ['required'],
        ]);

        if (!Auth::attempt($credentials)) {
            return response()->json(['message' => 'Invalid credentials'], 401);
        }

        $user = Auth::user();

        // Можно задать abilities (разрешения токена) и срок действия
        $token = $user->createToken(
            name: 'mobile-app',
            abilities: ['read', 'write'],
            expiresAt: now()->addDays(30),
        )->plainTextToken;

        return response()->json(['token' => $token]);
    }

    public function logout(Request $request): JsonResponse
    {
        // Удаляем только текущий токен
        $request->user()->currentAccessToken()->delete();
        return response()->json(['message' => 'Logged out']);
    }
}

// Защита маршрутов
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/profile', [ProfileController::class, 'show']);
    Route::post('/posts', [PostController::class, 'store'])->middleware('abilities:write');
});

// Клиент отправляет: Authorization: Bearer <token>
```

### Режим 2: SPA-аутентификация (cookies, одинаковый домен)

Для SPA на одном домене с бэкендом Sanctum использует cookie-сессии вместо токенов. Клиент сначала делает запрос на `/sanctum/csrf-cookie`, затем POST на `/login`.

```php
// В конфиге sanctum
'stateful' => explode(',', env('SANCTUM_STATEFUL_DOMAINS', 'localhost,app.example.com')),
```

---

## 4. Аутентификация: Passport (OAuth2)

**Laravel Passport** — полноценный OAuth2-сервер. Нужен, когда:
- Приложение выдаёт токены сторонним разработчикам (как Google, GitHub).
- Требуется разграничение прав доступа через scopes.
- Нужны долгоживущие refresh tokens.

```bash
composer require laravel/passport
php artisan passport:install
```

```php
use Laravel\Passport\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens;
}

// config/auth.php
'guards' => [
    'api' => [
        'driver'   => 'passport',
        'provider' => 'users',
    ],
],
```

### Типы Grant (способы получения токена)

| Grant Type | Применение |
| :--- | :--- |
| Password Grant | Первая сторона (ваше мобильное приложение) |
| Authorization Code | Третья сторона (OAuth-провайдер, как "Войти через GitHub") |
| Client Credentials | Machine-to-machine (без пользователя) |
| Personal Access Tokens | Разработчики в консоли (API-ключи) |

---

## 5. Версионирование API

```php
// routes/api.php
Route::prefix('v1')->group(base_path('routes/api_v1.php'));
Route::prefix('v2')->group(base_path('routes/api_v2.php'));

// Через заголовок (альтернатива)
// Accept: application/vnd.myapp.v2+json
```

---

## 6. Структура типичного API-контроллера

```php
class PostController extends Controller
{
    public function __construct(private PostService $service) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $posts = $this->service->list(
            filters: $request->only(['category', 'published']),
            perPage: $request->integer('per_page', 15),
        );
        return PostResource::collection($posts);
    }

    public function store(StorePostRequest $request): JsonResponse
    {
        $post = $this->service->create(
            CreatePostDto::fromRequest($request)
        );
        return response()->json(new PostResource($post), 201);
    }

    public function show(Post $post): PostResource
    {
        $post->load('author', 'tags', 'comments');
        return new PostResource($post);
    }

    public function update(UpdatePostRequest $request, Post $post): PostResource
    {
        $post = $this->service->update($post, UpdatePostDto::fromRequest($request));
        return new PostResource($post);
    }

    public function destroy(Post $post): Response
    {
        $this->authorize('delete', $post); // Policy-авторизация
        $this->service->delete($post);
        return response()->noContent(); // HTTP 204
    }
}
```
