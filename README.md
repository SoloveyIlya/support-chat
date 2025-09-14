# Support Chat (Prototype)

Небольшой фронтенд‑прототип панели оператора поддержки (активные / архивные диалоги, список сообщений, шаблоны ответов, модалки подтверждений, toast‑уведомления).

> Бэкенд пока эмулируется mock‑данными и локальными сторами в JS.

## Быстрый старт
1. Откройте файл `index.html` в любом современном браузере (Chrome, Firefox, Edge).
2. Для имитации входа используйте произвольный логин (мин. 3 символа, латиница/цифры/._-) и пароль (мин. 6 символов).
3. После входа доступен список активных диалогов. Архив переключается через меню проекта (три точки → «Открыть архивные чаты»).

## Архитектура (кратко)
- `scripts.js` — монолитный файл модулей (IIFE) без сборщика.
- Модули: Auth, ActiveDialogsApp, LogoutConfirm, UnsubscribeModal, ServiceToasts.
- Данные диалогов / сообщений — mock (массива + in‑memory MessageStore). Архив сидируется лениво.
- Шаблоны ответов — локальный store (CRUD) в памяти.
- Сообщения поддерживают вложения (inline image / file) + апгрейд/фоллбек отображения.

## Публичный API
Все стабильные функции агрегированы в объект `window.AppAPI` (versioned). Существующие глобалы (`Auth`, `showServiceNotification`, `app.dialogs` и т.п.) оставлены для обратной совместимости, но рекомендуется использовать единый API.

```js
console.log(AppAPI.version)         // '1.0.0'
```

### Auth (`AppAPI.auth`)
| Метод | Описание |
|-------|----------|
| `isAuthed()` | Возвращает `true/false` — есть ли токен (mock). |
| `getPhase()` | Текущая фаза state machine: `unauthenticated | auth-loading | auth-failed | authenticated`. |
| `showLogin()` | Показать экран логина. |
| `showApp()` | Форсировать показ приложения (используется после успешного входа). |
| `logout()` | Выйти (очищает токен и возвращает к экрану входа). |

### Dialogs (`AppAPI.dialogs`)
| Метод | Описание |
|-------|----------|
| `select(id)` | Выбрать диалог и отобразить его сообщения. |
| `getById(id)` | Получить объект диалога (активный или архивный). |
| `toggleArchive()` | Переключить режим Active ↔ Archive (перерисовка списка). |
| `switchToOperator(id, {source})` | Перевести диалог с бота на оператора (обновляет бейдж, футер). |
| `timers.set(id, value, opts)` | Установить таймер-пилюлю (текст, `opts.datetime`, авто‑показ). |
| `timers.show(id)` | Показать таймер. |
| `timers.hide(id)` | Скрыть таймер. |

### Messages (`AppAPI.messages`)
| Метод | Описание |
|-------|----------|
| `add(dialogId, { author, text, attachments, createdAt })` | Локально добавить сообщение (демо) в указанный диалог. Возвращает объект сообщения. `author: client|bot|operator|system`. В реальной интеграции заменить на отправку на сервер и последующую синхронизацию. |

#### Формат вложения (attachments[])
```ts
{
  id: string | number,
  name: string,
  size?: '123 KB',
  contentType?: string,        // MIME
  url?: string,                // для inline preview
  downloadUrl?: string,        // ссылка скачивания
  displayHint?: 'inline-image' | 'file'
}
```
Если `displayHint` не указан, система пытается классифицировать сама (image/* и размер <= 800KB → inline image).

### Templates (`AppAPI.templates`)
| Метод | Описание |
|-------|----------|
| `open()` | Открыть модалку шаблонов (CRUD через UI). |

### Modals (`AppAPI.modals`)
| Метод | Описание |
|-------|----------|
| `logout()` | Открыть модалку подтверждения выхода. |
| `unsubscribe(dialogId)` | Открыть модалку «Отменить подписку» для пользователя диалога. |

### Notifications (`AppAPI.notify`)
```
AppAPI.notify('Сохранено', 'Изменения применены');
AppAPI.notify('Инфо без текста');
```
Опции таймаута (legacy): `{ timeout: 6000 }`.

### Health Check
```
AppAPI.ping(); // { ok:true, ts: 173..., phase: 'authenticated' }
```

## Примеры использования
```js
// Выбрать диалог и добавить сообщение оператора
AppAPI.dialogs.select(3);
AppAPI.messages.add(3, { author:'operator', text:'Добрый день! Чем могу помочь?' });

// Перевод с бота на оператора
AppAPI.dialogs.switchToOperator(3);

// Установить таймер SLA
AppAPI.dialogs.timers.set(3, '15м', { datetime: new Date().toISOString() });

// Показать шаблоны
AppAPI.templates.open();

// Уведомление
AppAPI.notify('Готово', 'Шаблон сохранён');
```

## События браузера
| Event | detail |
|-------|--------|
| `auth:change` | `{ phase, error }` — диспатчится при смене auth состояния. |

Пример: 
```js
window.addEventListener('auth:change', e => console.log('Auth phase:', e.detail.phase));
```

## Ограничения / Что mock
- Нет реального сетевого слоя (login / сообщения / шаблоны).
- Идентификаторы сообщений локально генерируются (`temp:*`).
- Перевод на оператора не вызывает сервер — просто мутация локального массива.
- Превью изображений использует публичный `picsum.photos` (можно заменить на CDN).

## Как адаптировать под реальный backend
1. Заменить `loginRequest` на fetch к API (+ обработка ошибок).
2. Перевести `MOCK_DIALOGS` и `ARCHIVE_DIALOGS` в загрузку списка (с пагинацией).
3. Обновить `MessageStore` на двустороннюю синхронизацию (WebSocket / SSE / polling).
4. Вынести TemplatesStore на REST (CRUD endpoints) + optimistic UI.
5. Добавить статусы доставки (sent/delivered/read) на основе событий сервера.

## Лицензирование / Передача
Если не оговорено отдельно — считать код поставляемым **as-is** в рамках фриланс‑задачи; дальнейшая модульность может быть доработана отдельно.
