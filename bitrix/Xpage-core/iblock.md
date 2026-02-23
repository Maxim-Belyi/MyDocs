---
sidebar_position: 4
---

# `Iblock`

#### Класс: `Xpage\Core\Iblock`
**Назначение**: Централизованная утилита для получения структуры инфоблоков. Позволяет избавиться от «магических чисел» (ID) в коде, заменяя их на читаемые API-коды, и минимизирует нагрузку на базу данных.

**Зависимости**:
*   Модуль: `iblock`.
*   Ядро: `Bitrix\Main`, `Bitrix\Iblock`.

---

## Идентификация Инфоблоков
*   **`getIblockIdByApiCode(string $apiCode)`**: Возвращает ID инфоблока по его `API_CODE`.
*   **`getIblockCodeById(int $iblockId)`**: Возвращает символьный код (`CODE`) инфоблока по его ID.
*   **`getIblockApiCodeById(int $iblockId)`**: Возвращает `API_CODE` инфоблока по его ID.


## Работа со свойствами
*   **`getProperties(string $iblockCode)`**: Получает список всех свойств инфоблока (ID, код, тип, множественность).
    *   Если свойство является списком (`TYPE_LIST`), метод автоматически подгружает все варианты значений через `getMapEnumPropertyValues`.
*   **`getMapEnumPropertyValues(int $propertyId)`**: Создает карту соответствий для свойств типа «Список».
    *   Возвращает два массива: `ID_TO_XMLID` (перевод числового ID значения в строковый код) и `XMLID_TO_ID` (наоборот).

---

## Примеры использования

### Получение ID инфоблока по API коду
```php
use Xpage\Core\Iblock;

$iblockId = Iblock::getIblockIdByApiCode('catalog_products');

if ($iblockId) {
    // Используем ID для запросов
}
```

### Получение метаданных свойств и работа со списками
```php
use Xpage\Core\Iblock;

// Получаем все свойства инфоблока новостей
$props = Iblock::getProperties('news_api_code');

// Если у нас есть свойство типа "Список" с кодом 'COLOR'
if (isset($props['COLOR']['MAP_VALUES'])) {
    // Получим ID значения, зная его XML_ID
    $colorId = $props['COLOR']['MAP_VALUES']['XMLID_TO_ID']['RED'];
    
    // Или наоборот: узнаем код значения, зная ID из базы
    $colorXmlId = $props['COLOR']['MAP_VALUES']['ID_TO_XMLID'][42];
}
```

---

## Технические детали
*   **`static $cache`**: Используется для предотвращения повторных запросов к БД и даже к системе кэширования в рамках одного выполнения скрипта.
*   **`self::$ttl`**: Установлен на огромный период (8 лет), что делает выборку практически мгновенной после первого обращения. При изменении настроек инфоблоков в админке может потребоваться сброс кэша.
*   **`IblockTable`, `PropertyTable`, `PropertyEnumerationTable`**: Используются стандартные ORM-сущности модуля `iblock`.

---
