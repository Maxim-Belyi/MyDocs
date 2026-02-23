---
sidebar_position: 0
---

# `Captcha`

Фасад для управления системами защиты от спама. Позволяет прозрачно переключаться между **Google ReCaptcha v3** и **Yandex SmartCaptcha**, используя единый интерфейс в контроллерах.

#### Класс: `Xpage\Core\Facade\Captcha`
**Назначение**: Абстракция (фасад) над сервисами капчи. Позволяет менять провайдера защиты (Google/Yandex) через админку без правки бизнес-логики.

**Зависимости**:
*   Сервисы: `Xpage\Core\Service\Security\ReCaptcha`, `Xpage\Core\Service\Security\YaCaptcha`.
*   Хелпер настроек: `Xpage\Core\Facade\Helper`.
*   Фильтры (для констант заголовков): `Xpage\Core\Controller\ActionFilter\ReCaptcha` (и Yandex).

---

## `validateToken(string $token = '', array $extra = [])`
Основной метод проверки капчи.
*   **Гибкость**: Если `$token` не передан, метод автоматически пытается достать его из HTTP-заголовков запроса.
*   **Драйверы**: В зависимости от настроек вызывает `validateToken` у соответствующего сервиса (ReCaptcha или YaCaptcha).
*   **Параметры `$extra`**:
    *   Для ReCaptcha: ожидается `score` (порог надежности).
    *   Для YaCaptcha: ожидается `ip` пользователя.
*   **Отключение**: Если капча выключена в настройках или на локальной среде, метод всегда возвращает `true`.

## `isCaptchaDisabled()`
Определяет, должна ли работать проверка.
*   Учитывает глобальную опцию `captcha_active`.
*   Учитывает опцию `captcha_inactive_local`: если проект развернут локально (`isLocalDeployment`), проверка может быть автоматически пропущена.

##  `getClientConfig()`
Возвращает данные для фронтенда.
*   Используется для передачи на сторону JS типа используемой капчи и публичного ключа сайта (`site_key` / `client_key`).

## `extractTokenFromHeader()` (private)
Ищет токен в заголовках текущего запроса. 
*   Сначала ищет специфичные заголовки драйверов (задаются в константах фильтров).
*   Если не нашел — ищет стандартный заголовок `X-Captcha-Token`.

---

## Примеры использования

### Проверка в контроллере
```php
use Xpage\Core\Facade\Captcha;

$captcha = new Captcha();
$token = $request->getPost('g-recaptcha-response'); // или из заголовка автоматически

try {
    if ($captcha->validateToken($token)) {
        // Успешно: бот не обнаружен
    } else {
        // Ошибка: проверка не пройдена
    }
} catch (\Exception $e) {
    // Драйвер не настроен или произошел сбой сервиса
}
```

### Получение конфига для фронтенда
```php
use Xpage\Core\Facade\Captcha;

$captcha = new Captcha();
$config = $captcha->getClientConfig();

// Вернет: ['type' => 'recaptcha', 'key' => '6LeIxAcTAAAA...']
```

---
