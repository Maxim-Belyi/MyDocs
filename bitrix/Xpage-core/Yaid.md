---
sidebar_position: 10
---

# `YaId`

#### Класс: `Xpage\Core\Service\Authentication\YaId`
**Назначение**: Обеспечивает авторизацию через Yandex ID. Уникален своей логикой поиска пользователей по всем возможным доменам Яндекса, что предотвращает появление нескольких аккаунтов для одного и того же человека.

**Зависимости**:
*   Модуль: `socialservices`, `main`.
*   Интерфейс: `Xpage\Core\Interface\IAuthenticationId`.
*   Хелпер настроек: `Xpage\Core\Facade\Helper`.
*   Ядро: `Bitrix\Main\Web\HttpClient`.

---

##  `getAuthorizationLink($backUrl)`
Статический метод для генерации ссылки на авторизацию в Яндексе.
*   **PKCE**: Создает уникальный `nonce` (сохраняется в сессию) и передает его хеш в параметре `code_challenge`.
*   **Scope**: Запрашивает доступ к почте, телефону и основной информации. Дополнительно (optional) запрашивает дату рождения и аватар.
*   **Безопасность**: Передает `state` (ID сессии) для предотвращения CSRF.

##  `Authorize()`
Основной цикл авторизации после получения кода от Яндекса.
*   **Обмен токена**: Метод `getAccessToken` обменивает временный код на `access_token` (используя заголовок `Authorization: Basic ...` и `code_verifier`).
*   **Получение данных**: Обращается к API Яндекса (`/info`) для получения JSON с данными пользователя.
*   **Обработка ошибок**: Логирует проблемы в `CEventLog` и выполняет редирект с текстом ошибки.

## `prepareUser($arYaUser)` (private)
Метод преобразования данных Яндекса в поля профиля Битрикс.
*   **Аватар**: Формирует ссылку на фото (`islands-200`) и корректно определяет расширение файла (`.png`, `.jpg`, `.webp`, `.gif`) на основе MIME-типа.
*   **Склейка аккаунтов**: Ищет пользователя в БД по телефону или почте. 
*   **Магия алиасов (Yandex Domain Aliases)**: Яндекс позволяет заходить под одним логином через разные домены (`@yandex.ru`, `@ya.ru`, `@yandex.kz` и т.д.). Метод `getEmailAliasesByLogin` генерирует список всех возможных почт для поиска, чтобы избежать создания дубликатов аккаунтов.

##  `isYandexEmail($email)` и алиасы (static)
Утилитарные методы для работы со спецификой Яндекса.
*   **`isYandexEmail`**: Проверяет, принадлежит ли домен почты списку официальных доменов Яндекса.
*   **`getEmailAliasesByLogin`**: Генерирует массив из 5 вариантов написания почты для одного логина.

---

## Примеры использования

### Генерация ссылки для входа
```php
use Xpage\Core\Service\Authentication\YaId;

try {
    $url = YaId::getAuthorizationLink('/personal/');
    // <a href="<?= $url ?>">Войти через Яндекс</a>
} catch (\Exception $e) {
    // Ошибка, если в настройках модуля не заданы ID или Secret приложения
}
```

### Пример проверки алиасов (логика поиска)
```php
use Xpage\Core\Service\Authentication\YaId;

$aliases = YaId::getEmailAliasesByEmail('ivan.ivanov@ya.ru');
/*
Результат:
[
    'ivan.ivanov@ya.ru',
    'ivan.ivanov@yandex.by',
    'ivan.ivanov@yandex.com',
    'ivan.ivanov@yandex.kz',
    'ivan.ivanov@yandex.ru'
]
*/
```

