---
sidebar_position: 2
---
# `ModuleTrait`

#### Трейт: `Xpage\Core\Trait\Component\ModuleTrait`
**Назначение**: Вспомогательный трейт для проверки наличия установленных модулей в системе. Используется для предотвращения фатальных ошибок, если компонент зависит от функционала конкретного модуля (например, `catalog` или `highloadblock`).

**Зависимости**:
*   Ядро: `Bitrix\Main\Loader`.
*   Ланги: Ожидает наличие фразы `MODULE_NOT_INSTALLED` в языковых файлах.

---

##  `checkModules(array $modules = [])`
Метод проверяет доступность перечисленных модулей.
*   **Логика**: Проходит циклом по массиву строк. Если хотя бы один модуль не удается подключить через `Loader::includeModule`, выполнение прерывается.
*   **Исключения**: Выбрасывает `LoaderException`. В Битриксе это приведет к остановке компонента и выводу сообщения об ошибке (если оно не перехвачено выше).
*   **Локализация**: Использует `Loc::getMessage` для формирования текста ошибки на русском языке.

---

## Примеры использования

### Базовое использование в компоненте
Обычно этот метод вызывается в самом начале `executeComponent` или в методе для подготовки параметров.

```php
namespace Xpage\Core\Component;

class MyCustomComponent extends \Xpage\Core\Component
{
    use \Xpage\Core\Trait\Component\ModuleTrait;

    public function executeComponent()
    {
        try {
            // Если модули не установлены, код дальше не пойдет
            $this->checkModules(['iblock', 'catalog', 'sale']);
            
            // Основная логика компонента...
        } catch (\Bitrix\Main\LoaderException $e) {
            ShowError($e->getMessage());
        }
    }
}
```

