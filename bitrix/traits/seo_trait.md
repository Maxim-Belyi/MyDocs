---
sidebar_position: 5
---

# `SeoTrait`


#### Трейт: `Xpage\Core\Trait\Component\SeoTrait`
**Назначение**: Управление SEO-свойствами страницы (заголовок окна, H1, мета-теги) напрямую из кода компонента. Он упрощает взаимодействие с глобальным объектом `$APPLICATION`, добавляя проверку настроек компонента (`$this->arParams`).

**Зависимости**:
*   Глобальный объект: `$APPLICATION`.
*   Параметры компонента: `$this->arParams` (ожидаются ключи `SET_TITLE`, `SET_H1`, `SET_META_DESCRIPTION`, `SET_META_KEYWORDS`).

---

##  `setPageProperty(string $property, ?string $value, string $paramKey)` (protected)
Универсальный внутренний метод для установки свойств страницы.
*   **Логика**: Проверяет, не пуст ли `$value`. Если в параметрах компонента соответствующий флаг (`$paramKey`) не равен `'N'`, вызывает `$APPLICATION->SetPageProperty`.

##  Основные SEO-методы
*   **`setH1(string $h1)`**: Устанавливает основной заголовок страницы (Title). Проверяет параметр `SET_H1`.
*   **`setTitle(?string $title)`**: Устанавливает мета-тег `<title>`. Проверяет параметр `SET_TITLE`.
*   **`setMetaDescription(?string $description)`**: Устанавливает мета-тег `description`. Проверяет параметр `SET_META_DESCRIPTION`.
*   **`setMetaKeywords(?string $keywords)`**: Устанавливает мета-тег `keywords`. Проверяет параметр `SET_META_KEYWORDS`.

---

## Примеры использования

### Использование в детальном компоненте
После того как данные элемента получены, можно автоматически проставить SEO-данные:

```php
class NewsDetail extends \Xpage\Core\Component 
{
    use \Xpage\Core\Trait\Component\SeoTrait;

    public function executeComponent()
    {
        // Предположим, $item получен из базы
        $item = [
            'NAME' => 'Заголовок новости',
            'SEO_TITLE' => 'Купить новость недорого',
            'SEO_DESCRIPTION' => 'Описание новости для поисковиков'
        ];

        // Установка H1
        $this->setH1($item['NAME']);

        // Установка Meta Title
        $this->setTitle($item['SEO_TITLE']);

        // Установка Meta Description
        $this->setMetaDescription($item['SEO_DESCRIPTION']);
    }
}
```

---

## Технические особенности
*   **Приоритет параметров**: Все методы по умолчанию считают, что установка разрешена (`?? 'Y'`), если в параметрах компонента явно не передано `'SET_... => 'N'`.
*   **Безопасность**: Если в метод передана пустая строка или `null`, он просто вернет `false` и не будет затирать уже существующие свойства страницы (например, установленные выше по коду или в настройках инфоблока).
*   **Глобальная область**: Трейт напрямую обращается к `$GLOBALS['APPLICATION']`, что позволяет изменять свойства страницы даже из глубоко вложенных компонентов.

---
