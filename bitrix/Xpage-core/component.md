---
sidebar_position: 2
---

# `Component`

#### Класс: `Xpage\Core\Component`
**Назначение**: Абстрактный слой над `CBitrixComponent`. Упрощает написание кода компонентов, предоставляя готовые инструменты для работы с современным ядром D7 и автоматизируя рутинные задачи (смена регистров ключей, получение списков для настроек).

**Зависимости**:
*   Модули: `iblock`, `catalog`.
*   Ядро: `Bitrix\Main`.
*   Внутренние классы: `Xpage\Core\Iblock`.

---

## 1. Работа с окружением и запросами
*   **`getGlobalApplication()` / `getGlobalUser()`**: Обертки для доступа к глобальным объектам `$APPLICATION` и `$USER` в объектном стиле.
*   **`isAjax()`**: Проверяет, является ли текущий запрос AJAX-запросом.
*   **`getRequest()`**: Возвращает объект текущего HTTP-запроса.
*   **`getRouter()` / `getRouteByName($name)`**: Методы для работы с новой системой роутинга Битрикс (получение объекта роутера или конкретного маршрута по его имени).

## 2. Трансформация данных
*   **`convertKeysToCamel(array $data)`**: Рекурсивно преобразует ключи массива из `snake_case` (или `UPPER_CASE`) в `camelCase`. 
    *   *Пример*: `PROPERTY_VALUE` -> `propertyValue`. 
    *   Полезно для подготовки JSON-ответов для фронтенда.

## 3. Методы для параметров компонента (Инфоблоки)
Данные методы обычно используются в файле `.parameters.php` для создания выпадающих списков в настройках компонента:
*   **`getIblockTypes()`**: Список типов инфоблоков.
*   **`getIblocks($iblockType)`**: Список активных инфоблоков конкретного типа, у которых задан `API_CODE`.
*   **`getIblockFields()`**: Список всех системных полей элементов (из `ElementTable`).
*   **`getIblockProperties($ibApiCode)`**: Список кодов свойств конкретного инфоблока.

## 4. Методы для параметров компонента (Каталог)
*   **`getCatalogIblockApiCodes()`**: Возвращает `API_CODE` всех инфоблоков, которые являются торговыми каталогами.
*   **`getPriceTypes()`**: Список типов цен (из `Catalog\GroupTable`).
*   **`getPriceFields()` / `getProductFields()`**: Списки доступных полей цен и товаров для выбора в настройках.

---

## Примеры использования

### Использование в логике компонента (`class.php`)
```php
class MyComponent extends \Xpage\Core\Component 
{
    public function executeComponent()
    {
        // Проверка AJAX
        if ($this->isAjax()) {
            $this->getGlobalApplication()->RestartBuffer();
            // ... логика ...
        }

        // Работа с данными
        $rawElement = ['ID' => 1, 'NAME' => 'Test', 'DETAIL_TEXT' => '...'];
        $this->arResult['ITEM'] = $this->convertKeysToCamel($rawElement); 
        // Результат: ['id' => 1, 'name' => 'Test', 'detailText' => '...']

        $this->includeComponentTemplate();
    }
}
```

### Использование в `.parameters.php`
```php
if (!defined("B_PROLOG_INCLUDED") || B_PROLOG_INCLUDED !== true) die();

use Xpage\Core\Component;

$arComponentParameters = [
    "PARAMETERS" => [
        "IBLOCK_TYPE" => [
            "PARENT" => "BASE",
            "NAME" => "Тип инфоблока",
            "TYPE" => "LIST",
            "VALUES" => Component::getIblockTypes(),
            "REFRESH" => "Y",
        ],
        "IBLOCK_API_CODE" => [
            "PARENT" => "BASE",
            "NAME" => "API код инфоблока",
            "TYPE" => "LIST",
            "VALUES" => Component::getIblocks($arCurrentValues["IBLOCK_TYPE"]),
        ],
    ],
];
```

