# Advanced Russian Tampermonkey Scripts

Небольшая коллекция независимых userscript-скриптов для более удобного поиска в русскоязычном интернете. Скрипты работают в браузере через менеджер userscript [Tampermonkey](https://www.tampermonkey.net/) и устанавливаются по отдельности.

## Скрипты

### Marketplace Cross Search

![Marketplace Cross Search на Wildberries](docs/images/marketplace-cross-search.png)

**Поддерживаемые сайты:** Ozon, Wildberries, Яндекс Маркет, Авито и AliExpress.

Скрипт добавляет в строку поиска меню выбора площадок. Можно отметить несколько маркетплейсов, открыть один из них стрелкой справа или запустить поиск по выбранным площадкам либо сразу везде. Результаты на других площадках открываются в новых вкладках.

[Установить Marketplace Cross Search](https://raw.githubusercontent.com/wyrtensi/advanced-russian-tampermonkey-scripts/main/scripts/marketplace-cross-search/marketplace-cross-search.user.js)

После установки откройте поддерживаемый маркетплейс, введите запрос, раскройте значок площадки в строке поиска и выберите, где искать.

### Google → Yandex Search Button

![Кнопки Yandex и Markets в Google](docs/images/google-to-yandex.png)

**Поддерживаемые сайты:** страницы поиска Google на доменах `google.com`, `google.ru`, `google.co.uk`, `google.de`, `google.fr`, `google.es`, `google.it`, `google.ca`, `google.com.au`, `google.com.tw`, `google.co.jp`, `google.com.br` и `google.com.mx`.

Скрипт добавляет рядом со строкой поиска кнопки **Yandex** и **Markets**. Первая открывает тот же запрос в Яндексе, вторая — в Ozon, Wildberries и Яндекс Маркете.

[Установить Google → Yandex Search Button](https://raw.githubusercontent.com/wyrtensi/advanced-russian-tampermonkey-scripts/main/scripts/google-to-yandex/google-to-yandex.user.js)

Выполните поиск в Google и нажмите нужную кнопку. Для быстрого перехода в Яндекс можно использовать `Alt+Y`.

### Yandex → Google Search Button

![Кнопки Google и Markets в Яндексе](docs/images/yandex-to-google.png)

**Поддерживаемые сайты:** поиск Яндекса на доменах `yandex.ru`, `yandex.com`, `yandex.by`, `yandex.kz`, `yandex.uz`, `yandex.tm`, `yandex.tj`, `yandex.az`, `yandex.fr`, `yandex.ee`, `yandex.lt`, `yandex.lv`, `yandex.md` и `dzen.ru`.

Скрипт добавляет рядом со строкой поиска кнопки **Google** и **Markets**. Первая открывает тот же запрос в Google, вторая — в Ozon, Wildberries и Яндекс Маркете.

[Установить Yandex → Google Search Button](https://raw.githubusercontent.com/wyrtensi/advanced-russian-tampermonkey-scripts/main/scripts/yandex-to-google/yandex-to-google.user.js)

Выполните поиск в Яндексе и нажмите нужную кнопку. Для быстрого перехода в Google можно использовать `Alt+G`.

## Установка для новичка

### Chrome

1. Откройте официальную страницу [Tampermonkey в Chrome Web Store](https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo).
2. Нажмите **Установить** или **Добавить в Chrome**.
3. Прочитайте список разрешений расширения и подтвердите установку, только если согласны с ним.

### Edge

1. Откройте официальную страницу [Tampermonkey в Microsoft Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepeloendndfphd).
2. Нажмите **Получить**.
3. Прочитайте список разрешений расширения и подтвердите добавление.

### Разрешение на запуск userscript

В актуальных браузерах на Chromium Tampermonkey может потребовать дополнительное разрешение на выполнение userscript. Откройте страницу управления расширениями (`chrome://extensions` в Chrome или `edge://extensions` в Edge), найдите Tampermonkey и откройте его сведения.

- Если доступен переключатель **Разрешить пользовательские скрипты** / **Allow User Scripts**, включите его.
- Если такого переключателя нет, включите **Режим разработчика** / **Developer mode** на странице расширений.

Достаточно одного из этих вариантов. Актуальные пояснения и изображения есть в [официальной инструкции Tampermonkey](https://www.tampermonkey.net/faq.php?locale=ru&q=Q209).

### Установка скрипта

1. Выберите нужный скрипт выше и нажмите **Установить**. Ссылка GitHub Raw с окончанием `.user.js` должна открыть страницу установки Tampermonkey.
2. Проверьте название скрипта и список сайтов в строках `@match`. Они показывают, на каких страницах скрипт сможет работать.
3. Нажмите **Установить** в Tampermonkey.
4. Откройте меню Tampermonkey и убедитесь, что скрипт появился в списке и включён.
5. Откройте поддерживаемый сайт или обновите уже открытую страницу. Рядом со строкой поиска должен появиться новый элемент.

Подробнее о распознавании ссылок `.user.js` и GitHub Raw можно прочитать в [официальной инструкции Tampermonkey](https://www.tampermonkey.net/faq.php?locale=ru&q=Q102).

## Обновление и удаление

В меню Tampermonkey откройте **Панель управления**. Для обновления выберите **Проверить обновления скриптов** или откройте настройки нужного скрипта и запустите проверку вручную. Поля `@updateURL` и `@downloadURL` указывают на те же GitHub Raw-ссылки, поэтому автоматическая проверка получает новую версию из этого репозитория.

Чтобы временно остановить скрипт, выключите переключатель рядом с ним. Чтобы удалить его, откройте скрипт в панели управления и выберите удаление. Остальные скрипты коллекции продолжат работать независимо.

## Если скрипт не работает

1. Проверьте, что Tampermonkey и нужный скрипт включены.
2. Обновите страницу после установки или обновления скрипта.
3. Убедитесь, что открыт поддерживаемый домен из описания выше.
4. Проверьте разрешение **Разрешить пользовательские скрипты** либо **Режим разработчика**, как описано в разделе установки.
5. Проверьте, разрешён ли Tampermonkey доступ к текущему сайту в настройках расширения.
6. Если сайт изменил внешний вид и кнопки больше не появляются, создайте issue в репозитории и укажите браузер, адрес страницы и название скрипта. Не прикладывайте персональные данные или снимки приватных страниц.

## Добавление новых скриптов

Каждый новый userscript размещается в отдельной папке `scripts/<имя>/<имя>.user.js`. Добавьте корректные `@match`, `@homepageURL`, `@supportURL`, `@downloadURL` и `@updateURL`, отдельный раздел в README, прямую ссылку установки и скриншот реальной страницы в `docs/images/`. Не объединяйте независимые возможности в общий скрипт без необходимости.

## Безопасность

Userscript выполняется на страницах, указанных в его метаданных, и может изменять их интерфейс. Перед подтверждением установки прочитайте исходный код, список `@match`, запрошенные возможности `@grant` и внешние ресурсы `@resource`. Устанавливайте только нужные скрипты и только из понятного источника. `Marketplace Cross Search` открывает выбранные площадки в новых вкладках и загружает логотипы маркетплейсов как ресурсы Tampermonkey; два других скрипта открывают поисковые страницы Google, Яндекса и маркетплейсов.

## Лицензия

Проект распространяется по лицензии [MIT](LICENSE).
