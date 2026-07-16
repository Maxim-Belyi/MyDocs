---
sidebar_position: 3
---

# Pipeline (Конвейер)

**Pipeline (Конвейер)** — это серия стадий (stages), соединенных между собой каналами. 

Каждая стадия:
1. Читает данные из входного канала (inbound channel).
2. Выполняет над ними какую-то операцию (фильтрацию, математическое преобразование, запрос к БД).
3. Отправляет результат в выходной канал (outbound channel).

## Зачем это нужно?
Паттерн Pipeline позволяет разделить сложную задачу на серию простых, независимых шагов. Это делает код более модульным, тестируемым и, самое главное, позволяет **распараллеливать обработку потока данных**. Пока Стадия 2 обрабатывает первый элемент, Стадия 1 уже может готовить для нее второй элемент.

## Пример реализации

Давайте создадим пайплайн, который берет поток чисел, умножает каждое на 2 (Стадия 1), а затем возводит результат в квадрат (Стадия 2).

Первой стадией конвейера всегда выступает **[Generator](./generator)**.

```go
package main

import (
	"fmt"
)

// 1. Стадия генерации данных
func generator(done <-chan struct{}, nums ...int) <-chan int {
	out := make(chan int)
	go func() {
		defer close(out)
		for _, n := range nums {
			select {
			case <-done:
				return
			case out <- n:
			}
		}
	}()
	return out
}

// 2. Стадия 1: Умножение на 2
func multiply(done <-chan struct{}, in <-chan int, multiplier int) <-chan int {
	out := make(chan int)
	go func() {
		defer close(out)
		for n := range in {
			select {
			case <-done:
				return
			case out <- n * multiplier:
			}
		}
	}()
	return out
}

// 3. Стадия 2: Возведение в квадрат
func square(done <-chan struct{}, in <-chan int) <-chan int {
	out := make(chan int)
	go func() {
		defer close(out)
		for n := range in {
			select {
			case <-done:
				return
			case out <- n * n:
			}
		}
	}()
	return out
}

func main() {
	// Канал для глобальной отмены всех стадий пайплайна
	done := make(chan struct{})
	defer close(done)

	// Сборка пайплайна (композиция функций)
	intStream := generator(done, 1, 2, 3, 4)
	pipeline := square(done, multiply(done, intStream, 2))

	// Чтение финального результата
	for v := range pipeline {
		fmt.Println(v) 
		// Вывод: 
		// 4  ( (1 * 2)^2 )
		// 16 ( (2 * 2)^2 )
		// 36 ( (3 * 2)^2 )
		// 64 ( (4 * 2)^2 )
	}
}
```

## Ключевые правила хорошего Pipeline
1. **Каждая стадия возвращает один канал.** Это позволяет легко сцеплять (chain) их друг с другом.
2. **Горутина, которая создает канал, обязана его закрыть.** Обратите внимание: каждая стадия сама закрывает свой исходящий `out` канал через `defer close(out)`. Это предотвращает дэдлоки у следующей стадии, которая читает из него через `for range`.
3. **Единый канал отмены.** Передавайте канал `done` (или `context.Context`) во все стадии конвейера, чтобы мгновенно остановить всю цепочку горутин, если произошла ошибка или результат больше не нужен. Без этого вы легко получите Goroutine Leak.
