# 🔔 Настройка Push-уведомлений на бэкенде

## ✅ Что уже реализовано

### 1. **База данных**

- ✅ Добавлено поле `pushSubscription` в модель `User`
- ✅ Миграция создана и готова к применению

### 2. **PushService**

- ✅ Отправка push-уведомлений через Web Push API
- ✅ Сохранение и удаление push-подписок
- ✅ Автоматическое удаление невалидных подписок
- ✅ Push отправляется только если получатель оффлайн

### 3. **API Endpoints**

| Метод  | Путь                | Описание                             |
| ------ | ------------------- | ------------------------------------ |
| POST   | `/push/subscribe`   | Сохранить push-подписку пользователя |
| DELETE | `/push/unsubscribe` | Удалить push-подписку                |

### 4. **Интеграция с чатом**

- ✅ Автоматическая отправка push при новом сообщении
- ✅ Push отправляется только оффлайн пользователям
- ✅ Уведомление содержит имя отправителя и текст сообщения

---

## 🚀 Пошаговая настройка

### Шаг 1: Сгенерируйте VAPID ключи

```bash
npm run generate-vapid
```

Это создаст пару ключей:

- **VAPID_PUBLIC_KEY** - для фронтенда
- **VAPID_PRIVATE_KEY** - для бэкенда (держите в секрете!)

### Шаг 2: Добавьте переменные окружения

#### Локальная разработка

Создайте файл `.env` (если еще не создан):

```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/mydb?schema=public"

# Server
PORT=3005
NODE_ENV=development

# Authentication
JWT_SECRET=your-super-secret-key-change-in-production
APP_PASSWORD=mySecretPassword123

# CORS
CORS_ORIGIN=http://localhost:3000,http://localhost:5173

# Push Notifications
VAPID_PUBLIC_KEY=ваш_публичный_ключ_здесь
VAPID_PRIVATE_KEY=ваш_приватный_ключ_здесь
VAPID_EMAIL=mailto:your-email@example.com
```

#### Docker

Отредактируйте `docker-compose.yml` и добавьте VAPID ключи в секцию `environment`:

```yaml
environment:
  VAPID_PUBLIC_KEY: ваш_публичный_ключ_здесь
  VAPID_PRIVATE_KEY: ваш_приватный_ключ_здесь
  VAPID_EMAIL: mailto:your-email@example.com
```

Или создайте `.env` файл рядом с `docker-compose.yml`:

```env
VAPID_PUBLIC_KEY=ваш_публичный_ключ_здесь
VAPID_PRIVATE_KEY=ваш_приватный_ключ_здесь
VAPID_EMAIL=mailto:your-email@example.com
```

### Шаг 3: Примените миграции

```bash
# Локально
npm run prisma:migrate

# В Docker
docker-compose down
docker-compose up -d --build
```

### Шаг 4: Настройте фронтенд

На фронтенде добавьте публичный ключ в `.env`:

```env
VITE_VAPID_PUBLIC_KEY=ваш_публичный_ключ_здесь
```

И обновите код подписки на уведомления:

```typescript
// src/lib/notifications.ts
import { VAPID_PUBLIC_KEY } from "./constants";

// Раскомментируйте строку с applicationServerKey:
subscription = await registration.pushManager.subscribe({
  userVisibleOnly: true,
  applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
});
```

```typescript
// src/lib/constants.ts
export const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || "";
```

### Шаг 5: Отправляйте подписку на бэкенд

```typescript
// После успешной авторизации
import { subscribeToPushNotifications } from "@/lib/notifications";

const subscription = await subscribeToPushNotifications();

if (subscription) {
  await fetch(`${API_URL}/push/subscribe`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(subscription),
  });
}
```

---

## 📋 API документация

### POST /push/subscribe

Сохраняет push-подписку пользователя.

**Headers:**

```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "endpoint": "https://fcm.googleapis.com/fcm/send/...",
  "expirationTime": null,
  "keys": {
    "p256dh": "...",
    "auth": "..."
  }
}
```

**Response 200:**

```json
{
  "success": true,
  "message": "Push subscription saved"
}
```

### DELETE /push/unsubscribe

Удаляет push-подписку пользователя.

**Headers:**

```
Authorization: Bearer <jwt_token>
```

**Response 200:**

```json
{
  "success": true,
  "message": "Push subscription removed"
}
```

---

## 🔧 Как это работает

### 1. Пользователь подписывается на уведомления

```mermaid
User -> Frontend: Разрешить уведомления
Frontend -> Service Worker: Создать подписку
Service Worker -> Frontend: Вернуть subscription
Frontend -> Backend: POST /push/subscribe
Backend -> DB: Сохранить subscription
```

### 2. Отправка сообщения

```mermaid
User A -> Backend: Отправить сообщение
Backend -> WebSocket: Отправить всем онлайн
Backend -> DB: Проверить статус User B
DB -> Backend: User B оффлайн
Backend -> Push Service: Отправить push User B
Push Service -> User B: Показать уведомление
```

### 3. Умная логика отправки

**Push отправляется ТОЛЬКО если:**

- ✅ Получатель оффлайн (`isOnline = false`)
- ✅ У получателя есть сохраненная подписка
- ✅ Подписка валидна

**Push НЕ отправляется если:**

- ❌ Получатель онлайн (получит через WebSocket)
- ❌ У получателя нет подписки
- ❌ Подписка истекла (автоматически удаляется)

---

## 🧪 Тестирование

### 1. Локальное тестирование

```bash
# Запустите бэкенд
npm run start:dev

# Или в Docker
docker-compose up -d
```

### 2. Проверьте подписку

Откройте DevTools → Console:

```javascript
// Проверить Service Worker
navigator.serviceWorker.getRegistrations().then(console.log);

// Проверить подписку
navigator.serviceWorker.ready
  .then((reg) => reg.pushManager.getSubscription())
  .then(console.log);
```

### 3. Проверьте отправку

1. Откройте чат на двух устройствах/браузерах
2. На одном устройстве закройте приложение полностью
3. С другого отправьте сообщение
4. ✅ На закрытом устройстве должно прийти push-уведомление

---

## 🌐 Production (Render)

### На Render добавьте Environment Variables:

```
VAPID_PUBLIC_KEY=ваш_публичный_ключ
VAPID_PRIVATE_KEY=ваш_приватный_ключ
VAPID_EMAIL=mailto:your-real-email@example.com
```

**Важно:**

- Используйте реальный email адрес для `VAPID_EMAIL`
- Никогда не коммитьте приватный ключ в git
- Храните приватный ключ только в переменных окружения

---

## 🐛 Troubleshooting

### Push не приходят

**1. Проверьте VAPID ключи:**

```bash
# В логах бэкенда должно быть:
# ✅ "VAPID keys configured"
# ❌ "VAPID keys not configured" - добавьте ключи!
```

**2. Проверьте подписку в БД:**

```sql
SELECT phone, pushSubscription FROM "User";
```

**3. Проверьте статус пользователя:**

```sql
SELECT phone, isOnline FROM "User";
-- Push отправляется только если isOnline = false
```

### Ошибка "410 Gone"

Подписка истекла и автоматически удалится из БД. Пользователь должен заново разрешить уведомления.

### Push не работают на iOS

- ✅ Убедитесь что приложение установлено как PWA
- ✅ Проверьте что используется iOS 16.4+
- ✅ Push на iOS работают только в PWA режиме!

---

## 📊 Структура кода

```
src/
├── push/
│   ├── push.service.ts      # Логика отправки push
│   ├── push.controller.ts   # API endpoints
│   └── push.module.ts       # Модуль
├── chat/
│   ├── chat.gateway.ts      # + интеграция push
│   └── chat.service.ts      # + getAllUsers()
└── app.module.ts            # + импорт PushModule

prisma/
└── schema.prisma            # + pushSubscription field

generate-vapid-keys.js       # Скрипт генерации ключей
```

---

## ✅ Checklist

- [ ] Сгенерированы VAPID ключи (`npm run generate-vapid`)
- [ ] VAPID ключи добавлены в `.env` или Environment Variables
- [ ] Миграция применена (`prisma migrate deploy`)
- [ ] Публичный ключ добавлен на фронтенд
- [ ] Фронтенд отправляет подписку на `/push/subscribe`
- [ ] Протестирована отправка push при закрытом приложении
- [ ] На production используется реальный email в `VAPID_EMAIL`

---

## 🎉 Готово!

После выполнения всех шагов push-уведомления будут работать:

- ✅ Локально в браузере
- ✅ На мобильных в PWA режиме
- ✅ На production (Render)

Уведомления будут приходить даже когда приложение полностью закрыто! 🚀
