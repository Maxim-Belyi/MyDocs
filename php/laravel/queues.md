---
sidebar_position: 4
---

# Очереди и планировщик задач

Laravel Queues позволяют откладывать трудоёмкие операции (отправка email, обработка файлов, вызовы внешних API) на выполнение в фоне, не блокируя ответ на HTTP-запрос. Task Scheduling позволяет запускать задачи по расписанию.

---

## 1. Архитектура очередей

```
Producer (Web/CLI)                    Consumer (Worker)
    ↓                                      ↑
dispatch(new SendEmailJob($user))     Queue::listen
    ↓                                      ↑
Queue Driver (Redis / SQS / DB)  ←───────┘
```

Laravel поддерживает несколько драйверов очередей (`config/queue.php`):
- `sync` — выполняет задачу немедленно (для тестов, без воркера)
- `database` — хранит задачи в таблице `jobs` в БД
- `redis` — Redis (наиболее распространён в production)
- `sqs` — Amazon SQS (облачный вариант)
- `beanstalkd`, `null` (сбрасывает всё)

---

## 2. Создание и диспетчеризация Job

```php
// Создание Job
php artisan make:job SendWelcomeEmail

// app/Jobs/SendWelcomeEmail.php
class SendWelcomeEmail implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    // Количество попыток выполнения
    public int $tries = 3;

    // Таймаут выполнения в секундах
    public int $timeout = 30;

    // Задержка между попытками (exponential backoff в секундах)
    public function backoff(): array
    {
        return [10, 30, 60]; // 1-я повторная попытка через 10с, 2-я через 30с, 3-я через 60с
    }

    public function __construct(
        private User $user, // Eloquent-модели сериализуются автоматически (SerializesModels)
        private string $templateId,
    ) {}

    public function handle(Mailer $mailer): void
    {
        $mailer->to($this->user->email)
            ->send(new WelcomeEmail($this->user, $this->templateId));
    }

    // Вызывается после исчерпания всех попыток
    public function failed(\Throwable $exception): void
    {
        Log::error("Failed to send welcome email to {$this->user->email}", [
            'exception' => $exception->getMessage(),
        ]);

        // Уведомить команду или откатить состояние
        Notification::route('slack', config('slack.webhook'))
            ->notify(new JobFailedNotification($this, $exception));
    }
}
```

### Диспетчеризация

```php
// Немедленная постановка в очередь
SendWelcomeEmail::dispatch($user, 'welcome_v2');

// С задержкой (через 5 минут)
SendWelcomeEmail::dispatch($user)->delay(now()->addMinutes(5));

// В конкретную очередь
SendWelcomeEmail::dispatch($user)->onQueue('emails');

// На конкретное соединение
SendWelcomeEmail::dispatch($user)->onConnection('sqs');

// Синхронно (без воркера, прямо сейчас — для тестирования)
SendWelcomeEmail::dispatchSync($user);

// Через фасад Bus
Bus::dispatch(new SendWelcomeEmail($user));

// В конце текущего запроса (после отправки ответа)
dispatch(function () use ($user) {
    $user->update(['last_login' => now()]);
})->afterResponse();
```

---

## 3. Запуск воркеров

```bash
# Запустить воркер для очереди по умолчанию
php artisan queue:work

# Конкретное соединение и очередь
php artisan queue:work redis --queue=emails,notifications,default

# Параметры
php artisan queue:work \
    --tries=3 \           # Максимум попыток
    --timeout=60 \        # Таймаут задачи в секундах
    --sleep=3 \           # Пауза (сек) если очередь пустая
    --max-jobs=1000 \     # Перезапуск воркера после N задач (против утечек памяти)
    --max-time=3600       # Перезапуск воркера через N секунд

# queue:listen — перезапускает процесс после каждой задачи (медленнее, удобно для dev)
php artisan queue:listen

# Обработать только одну задачу и выйти
php artisan queue:work --once
```

**В production** воркеры запускаются через Supervisor (процесс-менеджер), чтобы автоматически перезапускаться при падении:

```ini
; /etc/supervisor/conf.d/laravel-worker.conf
[program:laravel-worker]
command=php /var/www/html/artisan queue:work redis --sleep=3 --tries=3 --max-time=3600
numprocs=4        ; 4 параллельных воркера
autostart=true
autorestart=true
user=www-data
```

---

## 4. Приоритеты очередей

Воркер обрабатывает очереди в порядке перечисления: сначала полностью опустошает первую, потом берётся за вторую.

```php
// Jobs с разными приоритетами
class CriticalPaymentJob implements ShouldQueue
{
    public string $queue = 'critical'; // Высокий приоритет
}

class ReportGenerationJob implements ShouldQueue
{
    public string $queue = 'low'; // Низкий приоритет
}

// Воркер: сначала critical, потом low
php artisan queue:work --queue=critical,default,low
```

---

## 5. Job Batching

Группа задач, выполняемых параллельно с коллбэком по завершении:

```php
$batch = Bus::batch([
    new ProcessChunk($chunk1),
    new ProcessChunk($chunk2),
    new ProcessChunk($chunk3),
])
->then(function (Batch $batch) {
    // Все задачи успешно выполнены
    Report::create(['status' => 'completed']);
})
->catch(function (Batch $batch, \Throwable $e) {
    // Хотя бы одна задача завершилась с ошибкой
    Log::error("Batch failed: " . $e->getMessage());
})
->finally(function (Batch $batch) {
    // Вызывается всегда — и при успехе, и при ошибке
    Cache::forget('processing:' . $batch->id);
})
->dispatch();

// Отслеживание прогресса
$progress = $batch->processedJobs() / $batch->totalJobs * 100;
```

---

## 6. Failed Jobs

```bash
# Просмотр упавших задач
php artisan queue:failed

# Повторить все упавшие
php artisan queue:retry all

# Повторить конкретную задачу по ID
php artisan queue:retry 5

# Удалить упавшую задачу
php artisan queue:forget 5

# Очистить все упавшие задачи
php artisan queue:flush
```

Таблица `failed_jobs` создаётся через:
```bash
php artisan queue:failed-table
php artisan migrate
```

---

## 7. Task Scheduling (Планировщик задач)

Планировщик централизует все cron-задачи в Laravel. Вместо множества записей в crontab — одна:

```bash
# crontab -e
* * * * * cd /var/www/html && php artisan schedule:run >> /dev/null 2>&1
```

### Определение расписания

```php
// app/Console/Kernel.php
protected function schedule(Schedule $schedule): void
{
    // Artisan-команда каждый час
    $schedule->command('reports:generate')->hourly();

    // Job каждый день в 3:00
    $schedule->job(new CleanupOldLogsJob())->dailyAt('03:00');

    // Shell-команда
    $schedule->exec('pg_dump mydb > /backups/db.sql')->weekly();

    // Замыкание
    $schedule->call(function () {
        DB::table('temp_sessions')->where('created_at', '<', now()->subDay())->delete();
    })->daily();

    // Частота
    $schedule->command('sync:prices')
        ->everyFiveMinutes()
        ->between('8:00', '22:00') // Только между 8 и 22 часами
        ->weekdays();              // Только по будням

    // Защита от параллельного запуска
    $schedule->command('process:queue')
        ->everyMinute()
        ->withoutOverlapping()    // Не запускать, если предыдущий ещё выполняется
        ->runInBackground();      // Запустить в фоне (не блокировать планировщик)

    // Поведение при ошибке
    $schedule->command('import:feed')
        ->daily()
        ->onFailure(function () {
            Notification::route('slack', config('slack.webhook'))
                ->notify(new ScheduledTaskFailed('import:feed'));
        });
}
```

### Полезные методы частоты

| Метод | Расписание |
| :--- | :--- |
| `->everyMinute()` | Каждую минуту |
| `->everyFiveMinutes()` | Каждые 5 минут |
| `->hourly()` | Каждый час |
| `->daily()` | Каждый день в полночь |
| `->dailyAt('13:00')` | Каждый день в 13:00 |
| `->weekly()` | Каждое воскресенье в полночь |
| `->monthly()` | 1-го числа каждого месяца |
| `->cron('*/10 * * * *')` | Произвольное cron-выражение |
