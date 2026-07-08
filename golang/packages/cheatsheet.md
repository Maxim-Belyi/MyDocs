---
sidebar_position: 0
---

# Шпаргалка по пакетам Go

Быстрый справочник по методам пакетов

---

## fmt

```go
fmt.Print(a ...any)                        // Вывод без переноса
fmt.Println(a ...any)                      // Вывод с переносом
fmt.Printf(format string, a ...any)        // Форматированный вывод

fmt.Sprint(a ...any) string                // Собрать строку
fmt.Sprintf(format string, a ...any) string // Собрать форматированную строку
fmt.Sprintln(a ...any) string

fmt.Fprint(w io.Writer, a ...any)          // Записать в Writer
fmt.Fprintf(w io.Writer, format string, a ...any)

fmt.Errorf(format string, a ...any) error  // Создать ошибку (%w для wrap)

fmt.Scan(a ...any) (n int, err error)      // Читать из stdin
fmt.Scanf(format string, a ...any)
fmt.Sscanf(str, format string, a ...any)   // Читать из строки
```

**Глаголы форматирования:**

| Глагол | Смысл |
|--------|-------|
| `%v`   | Значение по умолчанию |
| `%+v`  | Структура с именами полей |
| `%#v`  | Go-синтаксис значения |
| `%T`   | Тип значения |
| `%d`   | Целое число |
| `%f`   | Float (`%.2f` — 2 знака) |
| `%s`   | Строка |
| `%q`   | Строка в кавычках |
| `%p`   | Указатель (адрес) |
| `%w`   | Обёртка ошибки (только в `Errorf`) |

---

## strings

```go
strings.Contains(s, substr string) bool            // Содержит ли s подстроку substr
strings.HasPrefix(s, prefix string) bool           // Начинается ли s с prefix
strings.HasSuffix(s, suffix string) bool           // Заканчивается ли s на suffix
strings.Count(s, substr string) int                // Кол-во вхождений substr в s

strings.Index(s, substr string) int                // Первое вхождение (-1 если нет)
strings.LastIndex(s, substr string) int            // Последнее вхождение (-1 если нет)

strings.ToUpper(s string) string                   // В верхний регистр
strings.ToLower(s string) string                   // В нижний регистр
strings.Title(s string) string                     // Capitalize words

strings.TrimSpace(s string) string                 // Убрать пробельные символы с краёв
strings.Trim(s, cutset string) string              // Убрать символы из cutset с обоих краёв
strings.TrimLeft / TrimRight / TrimPrefix / TrimSuffix // Варианты Trim для одной стороны

strings.Replace(s, old, new string, n int) string  // Заменить n вхождений (n=-1 → все)
strings.ReplaceAll(s, old, new string) string      // Заменить все вхождения

strings.Split(s, sep string) []string              // Разбить по разделителю
strings.SplitN(s, sep string, n int) []string      // Разбить, не более n частей
strings.Fields(s string) []string                  // Разбить по пробельным символам

strings.Join(elems []string, sep string) string    // Объединить срез в строку через sep

strings.Repeat(s string, count int) string         // Повторить строку count раз
strings.EqualFold(s, t string) bool                // Сравнить без учёта регистра

// Builder — эффективная сборка строк (избегает лишних аллокаций в цикле)
var b strings.Builder
b.WriteString("hello")   // Добавить строку
b.WriteByte(' ')         // Добавить байт
b.WriteRune('!')         // Добавить символ Unicode
result := b.String()    // Получить результат

// Reader — обернуть строку в io.Reader
r := strings.NewReader("text")  // реализует io.Reader, io.Seeker
```

---

## strconv

```go
// int ↔ string
strconv.Itoa(i int) string                                 // int → строка (удобный вариант)
strconv.Atoi(s string) (int, error)                        // строка → int

// Универсальный парсинг
strconv.ParseInt(s string, base, bitSize int) (int64, error)  // строка → int64 (с основанием)
strconv.ParseUint(s string, base, bitSize int) (uint64, error) // строка → uint64
strconv.ParseFloat(s string, bitSize int) (float64, error)    // строка → float64
strconv.ParseBool(s string) (bool, error)                     // "true","1","True" → true

// Форматирование числа в строку
strconv.FormatInt(i int64, base int) string                // int64 → строка (base=10 decimal, 16 hex)
strconv.FormatFloat(f float64, fmt byte, prec, bitSize int) string // float64 → строка
strconv.FormatBool(b bool) string                          // bool → "true" / "false"

// Прочее
strconv.Quote(s string) string                // Обернуть строку в кавычки + экранировать
strconv.Unquote(s string) (string, error)     // Убрать кавычки и раскрыть экранирование
strconv.AppendInt(dst []byte, i int64, base int) []byte  // Дописать число в срез без аллокаций
```

---

## errors

```go
errors.New(text string) error               // Создать новую ошибку

errors.Is(err, target error) bool           // Проверить цепочку на совпадение
errors.As(err error, target any) bool       // Извлечь конкретный тип из цепочки
errors.Unwrap(err error) error              // Развернуть один слой
errors.Join(errs ...error) error            // Объединить несколько ошибок (Go 1.20+)
```

**Паттерны:**
```go
// Sentinel error
var ErrNotFound = errors.New("not found")

// Custom error type
type ValidationError struct { Field string }
func (e *ValidationError) Error() string { return "invalid: " + e.Field }

// Wrap / unwrap
err = fmt.Errorf("context: %w", originalErr)
errors.Is(err, originalErr) // true
```

---

## time

```go
time.Now() time.Time                       // Текущий момент времени
time.Since(t time.Time) time.Duration      // Сколько прошло с момента t (= Now() - t)
time.Until(t time.Time) time.Duration      // Сколько осталось до момента t (= t - Now())

time.Sleep(d time.Duration)                // Заблокировать горутину на d

// Парсинг и форматирование (эталон: Mon Jan 2 15:04:05 MST 2006)
t.Format("2006-01-02 15:04:05") string        // time.Time → строка по шаблону
time.Parse("2006-01-02", "2024-07-08") (time.Time, error) // строка → time.Time

// Длительности
time.Duration                              // Тип: int64 в наносекундах
time.Second * 5                            // 5 секунд
time.Millisecond * 100                     // 100 миллисекунд

// Создание момента
time.Date(2024, time.July, 8, 0, 0, 0, 0, time.UTC) time.Time // Из компонентов
time.Unix(sec, nsec int64) time.Time       // Из Unix-timestamp

// Методы Time
t.Year() / Month() / Day() / Hour() / Minute() / Second() int // Компоненты даты и времени
t.Weekday() time.Weekday                   // День недели (time.Monday, ...)
t.Add(d time.Duration) time.Time           // Прибавить длительность → новый момент
t.Sub(u time.Time) time.Duration           // Разница между двумя моментами → Duration
t.Before(u) / After(u) / Equal(u) bool    // Сравнение моментов
t.UTC() / Local() time.Time                // Перевести в UTC / локальный пояс
t.UnixMilli() / UnixMicro() / UnixNano() int64 // Unix timestamp в мс / мкс / нс

// Таймер — выполнить один раз через d
timer := time.NewTimer(time.Second)
<-timer.C                                  // Заблокироваться до срабатывания
timer.Stop()                               // Отменить (если больше не нужен)

// Тиккер — повторять каждые d
ticker := time.NewTicker(time.Second)
<-ticker.C                                 // Получить следующий тик
ticker.Stop()                              // Остановить (обязательно!)

time.AfterFunc(d, func() { ... })          // Вызвать функцию через d в отдельной горутине
```

---

## encoding/json

```go
// Сериализация (struct → JSON)
data, err := json.Marshal(v any) ([]byte, error)
data, err := json.MarshalIndent(v any, prefix, indent string) ([]byte, error)

// Десериализация (JSON → struct)
err := json.Unmarshal(data []byte, v any) error

// Работа через потоки (для больших данных / HTTP)
encoder := json.NewEncoder(w io.Writer)
err := encoder.Encode(v any) error

decoder := json.NewDecoder(r io.Reader)
err := decoder.Decode(v any) error

// Проверка наличия поля
decoder.DisallowUnknownFields()            // Ошибка на неизвестные поля

// Произвольный JSON
var m map[string]any
json.Unmarshal(data, &m)
```

**Теги:**
```go
type User struct {
    ID        int    `json:"id"`
    Name      string `json:"name,omitempty"` // пропустить если пусто
    Password  string `json:"-"`              // всегда пропускать
    CreatedAt string `json:"created_at"`
}
```

---

## io

```go
// Базовые интерфейсы
io.Reader  { Read(p []byte) (n int, err error) }
io.Writer  { Write(p []byte) (n int, err error) }
io.Closer  { Close() error }
io.ReadWriter / io.ReadCloser / io.WriteCloser / io.ReadWriteCloser

// Утилиты
io.ReadAll(r Reader) ([]byte, error)              // Прочитать всё
io.Copy(dst Writer, src Reader) (written int64, error) // Копировать поток
io.CopyN(dst, src, n int64) (int64, error)        // Скопировать n байт
io.Pipe() (*PipeReader, *PipeWriter)              // Синхронный канал в памяти
io.LimitReader(r Reader, n int64) Reader          // Не более n байт
io.MultiReader(readers ...Reader) Reader          // Объединить несколько Reader
io.MultiWriter(writers ...Writer) Writer          // Broadcast в несколько Writer
io.TeeReader(r Reader, w Writer) Reader           // Читать и дублировать в Writer
io.Discard                                        // Writer который всё выбрасывает
io.EOF                                            // Ошибка конца файла/потока
```

---

## bufio

```go
// Буферизованный Reader — эффективное построчное чтение
r := bufio.NewReader(reader io.Reader)     // Создать буферизованный Reader
r.ReadString(delim byte) (string, error)  // Читать до символа-разделителя (включительно)
r.ReadLine() (line []byte, isPrefix bool, err error) // Читать строку без \n
r.ReadByte() (byte, error)                // Прочитать один байт
r.ReadRune() (rune, int, error)           // Прочитать один Unicode-символ
r.Peek(n int) ([]byte, error)             // Посмотреть n байт без продвижения указателя

// Scanner — самый удобный способ читать построчно
scanner := bufio.NewScanner(r io.Reader)
for scanner.Scan() {
    line := scanner.Text()  // или scanner.Bytes()
}
err := scanner.Err()

// Буферизованный Writer
w := bufio.NewWriter(writer io.Writer)    // Создать буферизованный Writer
w.WriteString("hello")                   // Записать строку в буфер
w.WriteByte('\n')                        // Записать байт в буфер
w.Flush()                                // Сбросить буфер в Writer (ОБЯЗАТЕЛЬНО!)

// bufio.ReadWriter — объединяет буферизованный Reader и Writer
rw := bufio.NewReadWriter(r, w)
```

---

## os

```go
// Переменные окружения
os.Getenv(key string) string
os.LookupEnv(key string) (string, bool)   // + проверка существования
os.Setenv(key, value string) error
os.Unsetenv(key string) error
os.Environ() []string                     // Все переменные ["KEY=VAL", ...]
os.ExpandEnv(s string) string             // Заменить $VAR в строке

// Файлы
os.ReadFile(name string) ([]byte, error)                          // Прочитать файл целиком в []byte
os.WriteFile(name string, data []byte, perm fs.FileMode) error    // Записать []byte в файл
os.Open(name string) (*File, error)                               // Открыть только для чтения
os.Create(name string) (*File, error)                             // Создать / очистить для чтения+записи
os.OpenFile(name string, flag int, perm fs.FileMode) (*File, error) // Открыть с флагами (дозапись, эксклюзив...)
os.Remove(name string) error                                      // Удалить файл или пустую директорию
os.Rename(oldpath, newpath string) error                          // Переименовать / переместить
os.Stat(name string) (fs.FileInfo, error)                         // Метаданные файла (размер, права, время)
os.IsNotExist(err error) bool                                     // Ошибка «файл не существует»?
os.IsExist(err error) bool                                        // Ошибка «файл уже существует»?

// Флаги OpenFile
os.O_RDONLY / O_WRONLY / O_RDWR           // Режим доступа: чтение / запись / оба
os.O_APPEND / O_CREATE / O_TRUNC / O_EXCL // Дозапись / создать / очистить / только новый

// Директории
os.Mkdir(name string, perm fs.FileMode) error             // Создать директорию
os.MkdirAll(path string, perm fs.FileMode) error          // Создать директорию со всеми родителями
os.ReadDir(name string) ([]fs.DirEntry, error)            // Список содержимого директории
os.Remove / os.RemoveAll(path string) error               // Удалить файл / директорию рекурсивно
os.TempDir() string                                       // Путь к системной папке для временных файлов
os.MkdirTemp(dir, pattern string) (string, error)        // Создать уникальную временную директорию

// Процесс
os.Args []string                          // Аргументы командной строки
os.Exit(code int)                         // Завершить программу
os.Getpid() int                           // PID текущего процесса
os.Getwd() (string, error)                // Рабочая директория

// Стандартные потоки
os.Stdin / os.Stdout / os.Stderr          // *os.File
```

---

## path/filepath

```go
filepath.Join(elem ...string) string           // Собрать путь (авто / или \ по ОС)
filepath.Split(path string) (dir, file string) // Разделить на директорию и имя файла
filepath.Dir(path string) string               // Только директория без имени файла
filepath.Base(path string) string              // Только имя файла без директории
filepath.Ext(path string) string               // Расширение с точкой (.txt)

filepath.Abs(path string) (string, error)      // Абсолютный путь
filepath.Rel(basepath, targpath string) (string, error) // Относительный путь

filepath.Clean(path string) string             // Нормализовать: убрать ../ и //

filepath.Walk(root string, fn WalkFunc) error  // Обход дерева директорий рекурсивно
// WalkFunc = func(path string, info fs.FileInfo, err error) error

filepath.Glob(pattern string) ([]string, error) // Найти файлы по маске (*.go, data/*.json)
filepath.Match(pattern, name string) (matched bool, err error) // Проверить имя по маске

filepath.IsAbs(path string) bool               // Абсолютный ли путь?
filepath.FromSlash / ToSlash(path string) string // Конвертация / ↔ \
```

---

## sync

```go
// Mutex — исключительный доступ к данным
var mu sync.Mutex
mu.Lock()                                  // Захватить блокировку (ждёт, если занята)
defer mu.Unlock()                          // Освободить блокировку
mu.TryLock() bool                          // Попытка захвата без блокировки — false если занят (Go 1.18+)

// RWMutex — много читателей, один писатель
var rw sync.RWMutex
rw.RLock() / rw.RUnlock()                 // Чтение
rw.Lock()  / rw.Unlock()                  // Запись

// WaitGroup — ждать завершения горутин
var wg sync.WaitGroup
wg.Add(n int)                              // Увеличить счётчик до запуска горутины
wg.Done()                                  // Уменьшить счётчик на 1 (= Add(-1))
wg.Wait()                                  // Блокировать до нуля

// Once — выполнить ровно один раз
var once sync.Once
once.Do(func() { /* инициализация */ }) // Выполнит f только при первом вызове

// Map — потокобезопасная map
var sm sync.Map
sm.Store(key, value any)                   // Записать значение
sm.Load(key any) (value any, ok bool)      // Прочитать значение
sm.LoadOrStore(key, value any) (actual any, loaded bool) // Прочитать, или записать если нет
sm.Delete(key any)                         // Удалить ключ
sm.Range(func(key, value any) bool)        // Перебрать все ключи (false → остановить)

// Pool — пул переиспользуемых объектов
var pool = sync.Pool{New: func() any { return new(bytes.Buffer) }}
obj := pool.Get().(*bytes.Buffer)          // Взять объект (или создаёт новый через New)
obj.Reset()                                // Очистить перед использованием!
pool.Put(obj)                              // Вернуть объект в пул

// Cond — условная переменная
cond := sync.NewCond(&mu)
cond.Wait()       // Отпустить mu и заблокироваться до Signal/Broadcast
cond.Signal()     // Разбудить одну горутину
cond.Broadcast()  // Разбудить все ждущие горутины
```

---

## context

```go
// Корневые контексты
context.Background() context.Context       // Для main, init, тестов
context.TODO() context.Context             // Заглушка «ещё не решил»

// Создание дочерних контекстов
ctx, cancel := context.WithCancel(parent)  // Ручная отмена
ctx, cancel := context.WithTimeout(parent, 5*time.Second)  // По таймауту
ctx, cancel := context.WithDeadline(parent, time.Now().Add(5*time.Second))
ctx := context.WithValue(parent, key, val) // Передача данных (без cancel)

// Методы Context
ctx.Done() <-chan struct{}                  // Закрывается при отмене
ctx.Err() error                            // nil / Canceled / DeadlineExceeded
ctx.Deadline() (time.Time, bool)           // Дедлайн, если задан
ctx.Value(key any) any                     // Получить значение

// Ошибки
context.Canceled         // Причина: вызван cancel()
context.DeadlineExceeded // Причина: истёк таймаут/дедлайн

// Проверка в select
select {
case <-ctx.Done():
    return ctx.Err()
default:
    // продолжить работу
}
```

---

## net/http

```go
// Сервер
http.ListenAndServe(addr string, handler http.Handler) error         // Запустить HTTP-сервер
http.ListenAndServeTLS(addr, certFile, keyFile string, handler http.Handler) error // HTTPS

mux := http.NewServeMux()                  // Создать мультиплексор маршрутов
mux.HandleFunc("GET /users/{id}", func(w http.ResponseWriter, r *http.Request) {
    id := r.PathValue("id")                // Получить переменную пути (Go 1.22+)
})

// Ответ клиенту
w.WriteHeader(statusCode int)              // Установить HTTP-статус (до Write!)
w.Header().Set(key, value string)          // Установить заголовок ответа
w.Write(data []byte)                       // Записать тело ответа
fmt.Fprintf(w, "format %s", arg)           // Форматированная запись в тело
http.Error(w, message string, code int)    // Ответить ошибкой (text/plain)
http.Redirect(w, r, url string, code int)  // Перенаправить на url

// Запрос (Request)
r.Method                                   // HTTP-метод: GET, POST, ...
r.URL.Path / Query() / RawQuery            // Путь, параметры запроса
r.Header.Get(key string) string            // Получить заголовок запроса
r.Body io.ReadCloser                       // Тело запроса (обязательно Close!)
json.NewDecoder(r.Body).Decode(&v)         // Десериализовать JSON-тело
r.FormValue(key string) string             // Значение из form-data или query
r.PathValue(name string) string            // Переменная из пути (Go 1.22+)
r.Context() context.Context               // Контекст запроса

// Клиент
resp, err := http.Get(url string) (*http.Response, error)           // GET-запрос
resp, err := http.Post(url, contentType string, body io.Reader) (*http.Response, error) // POST

client := &http.Client{Timeout: 10 * time.Second}                   // Клиент с таймаутом
req, _ := http.NewRequestWithContext(ctx, "GET", url, nil)          // Запрос с контекстом
resp, err := client.Do(req)               // Выполнить запрос
defer resp.Body.Close()                   // Всегда закрывать тело!
body, _ := io.ReadAll(resp.Body)          // Прочитать тело ответа

// Статус-коды
http.StatusOK                              // 200 — успех
http.StatusCreated                         // 201 — создано
http.StatusBadRequest                      // 400 — ошибка клиента
http.StatusUnauthorized                    // 401 — не авторизован
http.StatusNotFound                        // 404 — не найдено
http.StatusInternalServerError             // 500 — ошибка сервера
```

---

## log / log/slog

```go
// log — стандартный логгер (выводит дату/время перед сообщением)
log.Print / Println / Printf(...)          // Записать в лог
log.Fatal / Fatalf / Fatalln(...)          // Записать + os.Exit(1)
log.Panic / Panicf / Panicln(...)          // Записать + panic()
log.SetPrefix("[app] ")                    // Установить префикс всех строк
log.SetFlags(log.LstdFlags | log.Lshortfile) // Настроить формат (дата, файл, номер строки...)

logger := log.New(os.Stderr, "[app] ", log.LstdFlags) // Создать свой логгер

// log/slog — структурированный логгер, рекомендуемый (Go 1.21+)
slog.Info("message", "key", value)         // Информационное сообщение
slog.Error("msg", "err", err)              // Ошибочное сообщение
slog.Debug("msg", slog.Int("code", 200))   // Отладочное сообщение

logger := slog.New(slog.NewJSONHandler(os.Stdout, nil)) // Создать JSON-логгер
logger.Info("user created", slog.String("name", "Alice")) // Сообщение с полями
logger.With("request_id", id).Info("processing")          // Добавить поля ко всем записям
```

---

## sort

```go
sort.Ints(a []int)                         // Сортировать []int по возрастанию
sort.Float64s(a []float64)                 // Сортировать []float64 по возрастанию
sort.Strings(a []string)                   // Сортировать []string по возрастанию

sort.IntsAreSorted(a []int) bool           // Проверить, рассортирован ли []int
sort.StringsAreSorted(a []string) bool     // Проверить, рассортирован ли []string

// Обобщённый (Go 1.21+)
slices.Sort(s []E)                         // Сортировать срез (пакет "slices")
slices.SortFunc(s []E, cmp func(a, b E) int) // Сортировать с пользовательским компаратором
slices.IsSorted(s []E) bool                // Проверить, рассортирован ли срез
slices.BinarySearch(s []E, target E) (int, bool) // Бинарный поиск в отсортированном

// Пользовательская сортировка
sort.Slice(s []any, less func(i, j int) bool)        // Сорт своим предикатом
sort.SliceStable(s []any, less func(i, j int) bool)  // Стабильный (сохраняет порядок равных элементов)

// Бинарный поиск (срез должен быть отсортирован)
sort.SearchInts(a []int, x int) int        // Индекс x в отсортированном []int
sort.Search(n int, f func(int) bool) int   // Общий бинарный поиск по предикату
```

---

## math

```go
math.Abs(x float64) float64                // Модуль (абсолютное значение)
math.Round(x float64) float64              // Округлить по правилам математики
math.Floor(x float64) float64              // Округлить вниз (floor)
math.Ceil(x float64) float64               // Округлить вверх (ceil)
math.Trunc(x float64) float64              // Отбросить дробную часть (к нулю)

math.Sqrt(x float64) float64               // Квадратный корень
math.Pow(x, y float64) float64             // x в степени y
math.Log(x float64) float64                // Натуральный логарифм
math.Log2 / Log10(x float64) float64       // Логарифм по основанию 2 / 10

math.Max(x, y float64) float64             // Максимум из двух
math.Min(x, y float64) float64             // Минимум из двух

math.Sin / Cos / Tan(x float64) float64    // Тригонометрические функции (x в радианах)
math.Inf(sign int) float64                 // +Inf (sign > 0) или -Inf
math.IsNaN(x float64) bool                 // Проверить, является ли NaN
math.IsInf(x float64, sign int) bool       // Проверить, является ли Inf

math.MaxInt / math.MinInt                  // Макс./мин. значение int
math.MaxFloat64                            // Макс. значение float64
math.Pi                                    // 3.14159...
math.E                                     // 2.71828...

// math/rand — псевдослучайные числа
rand.IntN(n int) int                       // Случайное целое [0, n) (Go 1.22+)
rand.Float64() float64                     // Случайный float [0.0, 1.0)
rand.Shuffle(n int, swap func(i, j int))   // Перемешать элементы
```

---

## regexp

```go
re, err := regexp.Compile(pattern string) (*Regexp, error)    // Скомпилировать регулярку
re := regexp.MustCompile(pattern string) *Regexp              // То же, но panic при ошибке

re.MatchString(s string) bool                                 // Соответствует ли строка шаблону?
re.FindString(s string) string                                // Первое совпадение (пустая строка если нет)
re.FindAllString(s string, n int) []string                    // Все совпадения (n=-1 → все)
re.FindStringSubmatch(s string) []string                      // Группы первого совпадения

re.ReplaceAllString(src, repl string) string                  // Заменить все совпадения
re.ReplaceAllStringFunc(src string, repl func(string) string) string // Заменить через функцию

re.Split(s string, n int) []string                            // Разбить по шаблону
re.FindStringIndex(s string) []int                            // Позиция [start, end] первого совпадения
```

---

## Быстрый выбор пакета

| Задача | Пакет/функция |
|--------|---------------|
| Собрать строку из частей | `strings.Builder` или `fmt.Sprintf` |
| Число → строка | `strconv.Itoa` / `strconv.FormatInt` |
| Строка → число | `strconv.Atoi` / `strconv.ParseInt` |
| Сериализация в JSON | `encoding/json` |
| Читать файл целиком | `os.ReadFile` |
| Читать файл построчно | `bufio.Scanner` |
| Эффективная запись | `bufio.NewWriter` + `Flush()` |
| Работа с путями | `path/filepath` |
| Измерить время | `time.Since(start)` |
| Пауза | `time.Sleep(duration)` |
| Разбить строку | `strings.Split` / `strings.Fields` |
| Регулярки | `regexp.MustCompile` |
| Отсортировать срез | `sort.Slice` / `slices.Sort` |
| Параллельный доступ к map | `sync.Map` или `map + sync.RWMutex` |
| Выполнить один раз | `sync.Once` |
| Ждать горутины | `sync.WaitGroup` |
| Таймаут операции | `context.WithTimeout` |
| HTTP-запрос | `http.NewRequestWithContext` + `client.Do` |
| Структурные логи | `log/slog` |

---
