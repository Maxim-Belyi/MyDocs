---
sidebar_position: 1
---
# Component

## Вспомогательные методы (для использования внутри логики компонента)

| Функция | Что делает | Пример использования |
| :--- | :--- | :--- |
| **getGlobalApplication** | Возвращает объект `$APPLICATION`. Заменяет `global $APPLICATION`. | `$this->getGlobalApplication()->SetTitle('Заголовок');` |
| **getGlobalUser** | Возвращает объект `$USER`. Заменяет `global $USER`. | `if ($this->getGlobalUser()->IsAuthorized()) { ... }` |
| **isAjax** | Проверяет, является ли текущий запрос AJAX-запросом. | `if ($this->isAjax()) { $this->getGlobalApplication()->RestartBuffer(); }` |
| **getRequest** | Возвращает объект текущего запроса (D7 `Main\HttpRequest`). | `$val = $this->getRequest()->getPost('form_id');` |
| **convertKeysToCamel** | Рекурсивно переводит ключи массива из `SNAKE_CASE` в `camelCase`. | `$this->convertKeysToCamel(['USER_NAME' => 'Ivan']); // ['userName' => 'Ivan']` |
| **getIblockIdByApiCode** | Получает числовой ID инфоблока по его строковому API_CODE. | `$id = $this->getIblockIdByApiCode('products');` |
| **getRouteByName** | Находит объект маршрута по его полному имени. | `$route = $this->getRouteByName('api.v1.order.create');` |

---

## Методы метаданных (для `.parameters.php` и админки)

Эти методы в основном `static`, так как они вызываются до инициализации объекта компонента.

| Функция | Что делает | Пример использования |
| :--- | :--- | :--- |
| **getIblockTypes** | Список всех типов инфоблоков в формате `['ID' => 'Название']`. | `"TYPE" => "LIST", "VALUES" => Base::getIblockTypes()` |
| **getIblocks** | Список активных инфоблоков (только с API_CODE) конкретного типа. | `Base::getIblocks('catalog') // ['products_api' => 'Каталог товаров']` |
| **getIblockFields** | Возвращает все доступные поля таблицы элементов инфоблока. | `Base::getIblockFields() // ['ID' => 'ID', 'NAME' => 'NAME' ...]` |
| **getIblockProperties**| Список символьных кодов свойств для конкретного инфоблока (по API_CODE). | `Base::getIblockProperties('cars_api')` |
| **getRouteNames** | Возвращает список всех зарегистрированных в системе имен роутов. | `"ROUTE" => ["TYPE" => "LIST", "VALUES" => Base::getRouteNames()]` |
| **getCatalogIblockApiCodes** | Массив API-кодов всех инфоблоков, являющихся торговыми каталогами. | `$catalogs = Base::getCatalogIblockApiCodes();` |
| **getPriceTypes** | Список типов цен из модуля Catalog в формате `['XML_ID' => 'Название']`. | `Base::getPriceTypes() // ['BASE' => 'Розничная цена']` |
| **getPriceFields** | Возвращает список всех полей таблицы цен (Catalog\PriceTable). | `Base::getPriceFields()` |
| **getProductFields** | Возвращает список всех полей таблицы товаров (Catalog\ProductTable). | `Base::getProductFields()` |

---

## Резюме для документации:
**`Xpage\Core\Component`** — базовый класс для всех компонентов проекта.
1. **Унификация:** Все наследники имеют стандартный доступ к ядру Битрикс без использования `global`.
2. **Фронтенд-friendly:** С помощью `convertKeysToCamel` данные подготавливаются под стандарты JS (JSON API).
3. **Автоматизация админки:** Статические методы позволяют быстро наполнять выпадающие списки в настройках компонентов (выбор инфоблоков, свойств, цен), опираясь на современные API-коды инфоблоков.