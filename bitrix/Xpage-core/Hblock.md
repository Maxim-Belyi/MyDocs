# `Hlblock`

#### Класс: `Xpage\Core\Hlblock`
**Назначение**: Фасад для динамической компиляции сущностей Highload-блоков. Избавляет от необходимости каждый раз вручную писать `HighloadBlockTable::compileEntity` и проверять подключение модуля.

**Зависимости**:
*   Модуль: `highloadblock`.
*   Ядро: `Bitrix\Main`.

---

## 1. `getHlblock(string|int $hlblock)`
Метод компилирует и возвращает экземпляр класса для работы с данными конкретного HL-блока.

*   **Универсальность**: В качестве аргумента принимает либо **ID** (число), либо **Название** (строка) Highload-блока.
*   **Кэширование**: Использует внутренний статический массив `$cache`. Если в рамках одного хита (запроса) метод вызывается повторно для того же HL-блока, сущность не будет компилироваться заново, а вернется из памяти.
*   **Автоматизация**: Сам подключает модуль `highloadblock`.
*   **Результат**: Возвращает объект, наследующий `DataManager`, через который можно вызывать методы `getList`, `add`, `update`, `delete`.

---

## Примеры использования

### Получение списка записей из HL-блока
```php
use Xpage\Core\Hlblock;

// Получаем объект для HL-блока с названием "BrandList"
$entity = Hlblock::getHlblock('BrandList');

if ($entity) {
    $rsData = $entity::getList([
        'select' => ['ID', 'UF_NAME', 'UF_XML_ID'],
        'filter' => ['UF_ACTIVE' => 'Y'],
        'order'  => ['UF_SORT' => 'ASC']
    ]);

    while ($item = $rsData->fetch()) {
        print_r($item);
    }
}
```

### Добавление записи в HL-блок (по ID)
```php
use Xpage\Core\Hlblock;

$hlId = 5; // ID вашего HL-блока
$entity = Hlblock::getHlblock($hlId);

if ($entity) {
    $result = $entity::add([
        'UF_NAME'   => 'Новый элемент',
        'UF_XML_ID' => 'new_element_xml',
    ]);

    if ($result->isSuccess()) {
        echo "Запись добавлена с ID: " . $result->getId();
    }
}
```


