# Push-уведомления в приложении

## ✅ Что уже настроено на фронте

### 1. Service Worker

- Создан `/public/service-worker.js`
- Регистрируется автоматически при загрузке приложения
- Обрабатывает входящие push-уведомления
- При клике на уведомление открывает чат

### 2. Утилиты для работы с уведомлениями

- `src/lib/notifications.ts` - все функции для работы с push
- Автоматический запрос разрешения через 3 секунды после авторизации
- Проверка поддержки уведомлений браузером

### 3. Интеграция с чатом

- При получении нового сообщения (когда не на странице чата):
  - Показывается toast-уведомление
  - Показывается push-уведомление (если разрешение получено)
- Уведомления содержат:
  - Имя отправителя
  - Текст сообщения (до 100 символов)
  - Иконка приложения

### 4. PWA манифест

- Обновлен `manifest.json` с правильными настройками
- Добавлены иконки для уведомлений
- Настроен shortcut для быстрого доступа к чату

## 📱 Как работает на телефоне

### iOS (Safari)

1. Откройте сайт в Safari
2. Нажмите "Поделиться" → "На экран Домой"
3. Приложение добавится как PWA
4. При открытии запросит разрешение на уведомления
5. Уведомления будут приходить даже когда приложение закрыто

**Ограничения iOS:**

- Push-уведомления работают ТОЛЬКО в PWA режиме (не в браузере)
- Требуется iOS 16.4+ для полноценной поддержки

### Android (Chrome/Firefox)

1. Откройте сайт
2. Браузер предложит "Установить приложение"
3. После установки запросит разрешение на уведомления
4. Уведомления работают даже в обычном браузере

## 🔧 Что нужно настроить на бэкенде

### Вариант 1: Локальные уведомления (текущий)

✅ **Уже работает!** Уведомления показываются прямо в браузере/PWA при получении сообщения через WebSocket.

**Ограничения:**

- Работают только когда приложение открыто (в фоне на iOS/Android)
- Не работают когда приложение полностью закрыто

### Вариант 2: Настоящие Push-уведомления (рекомендуется)

Для уведомлений когда приложение полностью закрыто нужно:

#### 1. Сгенерировать VAPID ключи

```bash
npm install web-push -g
web-push generate-vapid-keys
```

Это даст два ключа:

- **Public Key** - для фронтенда
- **Private Key** - для бэкенда (держать в секрете!)

#### 2. Добавить на бэкенд

```typescript
// backend/src/push-notifications/push.service.ts
import * as webPush from "web-push";

webPush.setVapidDetails(
  "mailto:your-email@example.com",
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY,
);

// Функция отправки push-уведомления
async function sendPushNotification(subscription: PushSubscription, data: any) {
  try {
    await webPush.sendNotification(
      subscription,
      JSON.stringify({
        title: "Новое сообщение от " + data.senderName,
        body: data.message,
        icon: "/kitty-logo-ios.jpg",
        data: {
          url: "/chat",
          messageId: data.messageId,
        },
      }),
    );
  } catch (error) {
    console.error("Ошибка отправки push:", error);
  }
}
```

#### 3. Сохранять push-подписки пользователей

```typescript
// Когда пользователь подписывается на уведомления
@Post('subscribe')
async subscribe(@Body() subscription: PushSubscription, @User() user) {
  // Сохранить subscription в БД для этого пользователя
  await this.userService.savePushSubscription(user.id, subscription);
}
```

#### 4. Отправлять push при новом сообщении

```typescript
// В chat.gateway.ts при отправке сообщения
@SubscribeMessage('sendMessage')
async handleSendMessage(@MessageBody() data: any) {
  // ... существующий код отправки через WebSocket ...

  // Получить push-подписку получателя
  const recipientSubscription = await this.userService.getPushSubscription(recipientId);

  // Отправить push-уведомление
  if (recipientSubscription) {
    await this.pushService.sendPushNotification(recipientSubscription, {
      senderName: sender.name,
      message: data.text,
      messageId: savedMessage.id,
    });
  }
}
```

#### 5. На фронтенде добавить VAPID ключ

```typescript
// src/lib/constants.ts
export const VAPID_PUBLIC_KEY = "ВАШ_PUBLIC_KEY_ОТ_WEB_PUSH";
```

```typescript
// src/lib/notifications.ts (раскомментировать)
subscription = await registration.pushManager.subscribe({
  userVisibleOnly: true,
  applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
});
```

#### 6. Отправлять подписку на бэкенд

```typescript
// src/contexts/ChatContext.tsx
import { subscribeToPushNotifications } from "@/lib/notifications";

// После успешной аутентификации
useEffect(() => {
  if (user) {
    subscribeToPushNotifications().then(async (subscription) => {
      if (subscription) {
        // Отправить на бэк
        await fetch(`${API_BASE_URL}/users/push-subscription`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(subscription),
        });
      }
    });
  }
}, [user]);
```

## 🧪 Как протестировать

### Тест локальных уведомлений (работает уже сейчас)

1. Откройте приложение на телефоне
2. Разрешите уведомления
3. Перейдите на другую вкладку (главная, галерея, профиль)
4. Попросите кого-то написать вам сообщение
5. ✅ Должно появиться уведомление!

### Тест настоящих push (после настройки бэка)

1. Откройте приложение на телефоне
2. Разрешите уведомления
3. **Полностью закройте приложение**
4. Попросите кого-то написать вам сообщение
5. ✅ Уведомление должно прийти даже при закрытом приложении!

## 📊 Текущий статус

- ✅ Service Worker зарегистрирован
- ✅ Запрос разрешений настроен
- ✅ Локальные уведомления работают
- ✅ Интеграция с чатом готова
- ✅ PWA манифест настроен
- ⏳ Ждем VAPID ключи от бэкенда для настоящих push

## 🐛 Отладка

### Проверить регистрацию Service Worker

```javascript
// В консоли браузера
navigator.serviceWorker.getRegistrations().then(console.log);
```

### Проверить разрешение на уведомления

```javascript
// В консоли браузера
console.log(Notification.permission);
```

### Проверить push-подписку

```javascript
// В консоли браузера
navigator.serviceWorker.ready.then((reg) =>
  reg.pushManager.getSubscription().then(console.log),
);
```

### Логи Service Worker

1. Откройте DevTools
2. Application → Service Workers
3. Смотрите статус и логи

## 📱 Требования к пользователям

- iOS: Safari 16.4+, установленное PWA
- Android: Chrome 42+, Firefox 44+
- Desktop: Chrome 42+, Firefox 44+, Edge 17+

**Важно:** На iOS уведомления работают ТОЛЬКО в PWA режиме!
