---
sidebar_position: 4
---
# switch 

Конструкция switch проверяет значение некоторого выражения. С помощью операторов case определяются значения для сравнения. Если значение после оператора case совпадает со значением выражения из switch, то выполняется код данного блока case.

```go
package main
import "fmt"
 
func main() {
     
    a := 8
    switch(a) {
        case 9: 
            fmt.Println("a = 9")
        case 8: 
            fmt.Println("a = 8")
        case 7: 
            fmt.Println("a = 7")
    }
}
```

В качестве выражения конструкция switch использует переменную a. Ее значение последовательно сравнивается со значениями после операторов case. Поскольку переменная a равна 8, то будет выполняться блок case 8: fmt.Println("a = 8"). Остальные блоки case не выполняются.

При этом после оператора switch мы можем указывать любое выражение, которое возвращает значение. Например, операцию сложения:

```go
a := 7
switch(a + 2) {
    case 9: 
        fmt.Println("9")
    case 8: 
        fmt.Println("8")
    case 7: 
        fmt.Println("7")
}
```

Также конструкция switch может содержать необязательных блок default, который выполняется, если ни один из операторов case не содержит нужного значения:

```go
package main
import "fmt"
 
func main() {
     
    a := 87
    switch(a) {
        case 9: 
            fmt.Println("a = 9")
        case 8: 
            fmt.Println("a = 8")
        case 7: 
            fmt.Println("a = 7")
        default: 
            fmt.Println("значение переменной a не определено")
    }
}
```

Также можно указывать после оператора case сразу несколько значений:

```go
a := 5
switch(a) {
    case 9: fmt.Println("a = 9")
    case 8: fmt.Println("a = 8")
    case 7: fmt.Println("a = 7")
    case 6, 5, 4: 
        fmt.Println("a = 6 или 5 или 4, но это не точно")
    default: 
        fmt.Println("значение переменной a не определено")
}
```