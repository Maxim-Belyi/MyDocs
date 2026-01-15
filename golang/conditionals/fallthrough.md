---
sidebar_position: 5
---
# fallthrough 

По умолчанию Go выходит из switch после первого совпадения. Но оператор fallthrough в конструкции switch заставляет выполнение переходить от одного случая к другому, даже если последующие случаи не совпадают:

```go
package main
import "fmt"
  
func main() {
    x := 2
 
    switch(x){
        case 1: 
            fmt.Println("x = 1")
        case 2: 
            fmt.Println("x = 2")
            fallthrough
        case 3: 
            fmt.Println("x = 3")
        case 4: 
            fmt.Println("x = 4")
    }
}
```
Консольный вывод:
```go
x = 2
x = 3
```