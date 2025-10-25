# 📱 Push-уведомления на iOS PWA - Ограничения и решения

## ⚠️ Проблемы, которые вы описали

### 1. **Уведомления не приходят когда телефон заблокирован**

- ❌ **Это нормальное поведение iOS PWA**
- iOS приостанавливает (suspend) PWA приложения при блокировке экрана
- Service Worker останавливается и не может обрабатывать push-события

### 2. **Ошибка подписки при повторном входе**

- iOS может инвалидировать push-подписку при:
  - Переходе PWA в фоновый режим
  - Блокировке телефона на долгое время
  - Очистке кеша браузера
  - Обновлении iOS

### 3. **Push работают только внутри приложения**

- Когда вы на других вкладках - приложение активно → WebSocket работает → toast показываются
- Когда выходите - приложение закрывается → Service Worker останавливается → push не доходят

---

## 🔍 Ограничения iOS PWA (важно знать!)

### Push-уведомления на iOS работают ТОЛЬКО при:

1. ✅ PWA установлено на главный экран (не в Safari!)
2. ✅ iOS версия 16.4 или выше
3. ✅ Приложение было открыто хотя бы раз после установки
4. ✅ **Приложение в фоне (но НЕ полностью закрыто)**
5. ✅ Телефон разблокирован или **включена настройка "Всегда" для уведомлений**

### ❌ Push НЕ работают когда:

- Приложение полностью закрыто (смахнуто из списка приложений)
- Телефон заблокирован **И настройка уведомлений НЕ "Всегда"**
- iOS принудительно остановила Service Worker (после длительного простоя)
- Подписка истекла и не была обновлена

---

## ✅ Решения для вашей проблемы

### 1. Настройки iOS (для пользователей)

#### Разрешите уведомления "Всегда":

1. Откройте **Настройки** iOS
2. Прокрутите вниз и найдите ваше PWA приложение
3. Нажмите на него
4. Выберите **Уведомления**
5. Установите:
   - ✅ **Разрешить уведомления**: ВКЛ
   - ✅ **Показывать на экране блокировки**: ВКЛ
   - ✅ **Звуки**: ВКЛ
   - ✅ **Баннеры**: ВКЛ
   - ✅ **Центр уведомлений**: ВКЛ

#### Настройка "Время экрана":

1. **Настройки** → **Время экрана**
2. Убедитесь что ваше PWA **НЕ в ограничениях**
3. Добавьте в исключения если нужно

#### Настройка "Не беспокоить":

1. Проверьте что режим **"Не беспокоить"** выключен
2. Или добавьте приложение в исключения

---

### 2. Автоматическая переподписка (для фронтенда)

Добавьте этот код на фронтенд:

```typescript
// utils/pushNotifications.ts

export async function ensureValidSubscription() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();

    // Если подписка истекла или её нет - создаём новую
    if (!subscription || isSubscriptionExpired(subscription)) {
      console.log("🔄 Push subscription expired or missing, resubscribing...");

      // Удаляем старую подписку если есть
      if (subscription) {
        await subscription.unsubscribe();
      }

      // Создаём новую подписку
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      // Отправляем на бэкенд
      await sendSubscriptionToBackend(subscription);

      console.log("✅ Successfully resubscribed to push notifications");
    }

    return subscription;
  } catch (error) {
    console.error("❌ Error ensuring valid subscription:", error);
    return null;
  }
}

function isSubscriptionExpired(subscription: PushSubscription): boolean {
  // Проверяем expirationTime
  if (subscription.expirationTime) {
    return subscription.expirationTime < Date.now();
  }
  return false;
}

async function sendSubscriptionToBackend(subscription: PushSubscription) {
  const token = localStorage.getItem("authToken");
  if (!token) return;

  try {
    await fetch(`${API_URL}/push/subscribe`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(subscription),
    });
  } catch (error) {
    console.error("Failed to send subscription to backend:", error);
  }
}

// Проверка подписки при каждом открытии приложения
export function initPushNotifications() {
  // Проверяем сразу
  ensureValidSubscription();

  // Проверяем каждые 5 минут когда приложение активно
  setInterval(() => {
    if (document.visibilityState === "visible") {
      ensureValidSubscription();
    }
  }, 5 * 60 * 1000); // 5 минут

  // Проверяем когда пользователь вернулся на вкладку
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      ensureValidSubscription();
    }
  });

  // Проверяем когда PWA становится активным (iOS)
  window.addEventListener("focus", () => {
    ensureValidSubscination();
  });
}
```

#### Использование:

```typescript
// App.tsx или main entry point
import { initPushNotifications } from "./utils/pushNotifications";

useEffect(() => {
  // После авторизации
  if (isAuthenticated) {
    initPushNotifications();
  }
}, [isAuthenticated]);
```

---

### 3. Улучшенный Service Worker

Обновите ваш Service Worker для лучшей работы на iOS:

```javascript
// public/service-worker.js

// Обработка push-уведомлений
self.addEventListener("push", (event) => {
  console.log("📬 Push received:", event);

  if (!event.data) {
    console.log("Push event but no data");
    return;
  }

  try {
    const data = event.data.json();
    const { title, body, icon, data: payload } = data;

    const options = {
      body: body,
      icon: icon || "/kitty-logo-ios.jpg",
      badge: "/kitty-logo-ios.jpg",
      tag: "chat-message", // Группировка уведомлений
      renotify: true, // Повторно уведомлять при обновлении
      requireInteraction: false, // На iOS лучше false
      vibrate: [200, 100, 200],
      data: payload,
      actions: [
        {
          action: "open",
          title: "Открыть",
        },
        {
          action: "close",
          title: "Закрыть",
        },
      ],
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (error) {
    console.error("Error showing notification:", error);
  }
});

// Обработка клика на уведомление
self.addEventListener("notificationclick", (event) => {
  console.log("🖱️ Notification clicked:", event);

  event.notification.close();

  if (event.action === "close") {
    return;
  }

  // Открываем или фокусируем приложение
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // Ищем уже открытое окно
        for (const client of clientList) {
          if (client.url.includes("/chat") && "focus" in client) {
            return client.focus();
          }
        }

        // Если нет открытого окна - открываем новое
        if (clients.openWindow) {
          return clients.openWindow("/chat");
        }
      })
  );
});

// Периодическая синхронизация (для iOS)
self.addEventListener("periodicsync", (event) => {
  if (event.tag === "check-messages") {
    event.waitUntil(checkForNewMessages());
  }
});

async function checkForNewMessages() {
  // Можно проверить новые сообщения через API
  console.log("Checking for new messages...");
}
```

---

### 4. Обработка ошибок на бэкенде

Обновите `PushService` для обработки истёкших подписок:

```typescript
// src/push/push.service.ts

async sendPushNotification(
  recipientPhone: string,
  payload: {
    title: string;
    body: string;
    icon?: string;
    data?: any;
  }
) {
  try {
    const recipient = await this.prisma.user.findUnique({
      where: { phone: recipientPhone },
      select: { pushSubscription: true, isOnline: true },
    });

    // Не отправляем если онлайн или нет подписки
    if (!recipient || !recipient.pushSubscription || recipient.isOnline) {
      return;
    }

    const subscription = JSON.parse(recipient.pushSubscription);

    const notificationPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon || "/kitty-logo-ios.jpg",
      badge: "/kitty-logo-ios.jpg",
      data: {
        url: "/chat",
        ...payload.data,
      },
    });

    await webPush.sendNotification(subscription, notificationPayload);
    this.logger.log(`✅ Push sent to ${recipientPhone}`);
  } catch (error) {
    this.logger.error(`❌ Push error: ${error.message}`);

    // Если подписка невалидна (410 Gone) или истекла (404)
    if (error.statusCode === 410 || error.statusCode === 404) {
      this.logger.warn(`🗑️ Removing invalid subscription for ${recipientPhone}`);
      await this.removePushSubscription(recipientPhone);
    }

    // Другие коды ошибок - просто логируем
    if (error.statusCode === 429) {
      this.logger.warn('⚠️ Rate limited by push service');
    }
  }
}
```

---

## 🧪 Тестирование на iOS

### Шаг 1: Установите PWA правильно

1. Откройте Safari на iPhone
2. Перейдите на ваш сайт
3. Нажмите кнопку **"Поделиться"** (квадрат со стрелкой вверх)
4. Выберите **"На экран Домой"**
5. Нажмите **"Добавить"**

### Шаг 2: Первый запуск

1. Откройте PWA с главного экрана
2. Войдите в систему
3. Разрешите уведомления когда появится запрос
4. Убедитесь что подписка сохранилась (проверьте консоль)

### Шаг 3: Тестирование

**Тест 1: Приложение в фоне, экран разблокирован**

1. Откройте PWA
2. Нажмите Home (приложение уйдёт в фон)
3. Попросите отправить вам сообщение
4. ✅ Уведомление должно прийти

**Тест 2: Приложение в фоне, экран заблокирован**

1. Откройте PWA
2. Нажмите Home
3. Заблокируйте экран (кнопка питания)
4. Попросите отправить вам сообщение
5. ❓ Может прийти или нет (зависит от настроек iOS)

**Тест 3: Приложение полностью закрыто**

1. Откройте PWA
2. Двойной клик по Home → смахните приложение вверх (закрыть)
3. Попросите отправить вам сообщение
4. ❌ Уведомление НЕ придёт (ограничение iOS)

---

## 📋 Чек-лист для максимальной работы push на iOS

- [ ] iOS версия 16.4 или выше
- [ ] PWA установлено на главный экран (не Safari!)
- [ ] Разрешение на уведомления дано
- [ ] В настройках iOS: "Показывать на экране блокировки" ВКЛ
- [ ] Режим "Не беспокоить" выключен или приложение в исключениях
- [ ] Приложение не в ограничениях "Время экрана"
- [ ] VAPID ключи настроены на бэкенде
- [ ] Фронтенд использует автоматическую переподписку
- [ ] Service Worker правильно зарегистрирован

---

## 💡 Альтернативные решения

### Вариант 1: Фоновая синхронизация (Background Sync)

iOS поддерживает ограниченную Background Sync для PWA:

```typescript
// Регистрация фоновой синхронизации
if ("sync" in navigator) {
  navigator.serviceWorker.ready.then((registration) => {
    return registration.sync.register("check-messages");
  });
}
```

**Ограничения:**

- Срабатывает только когда iOS решит (не в реальном времени)
- Может не работать на заблокированном экране

### Вариант 2: Native приложение

Для полноценных push-уведомлений на iOS лучше использовать:

- React Native + OneSignal/Firebase
- Native iOS app + APNs (Apple Push Notification service)
- Ionic/Capacitor (гибрид PWA + Native)

---

## 🎯 Реалистичные ожидания для iOS PWA

### ✅ Что МОЖНО ожидать:

- Push работают когда приложение в фоне (не закрыто)
- Push работают на разблокированном экране
- Уведомления приходят с задержкой 0-30 секунд
- Локальные уведомления (toast) работают всегда внутри приложения

### ❌ Что НЕ РАБОТАЕТ:

- Push при полностью закрытом приложении
- Гарантированная доставка на заблокированном экране
- Мгновенная доставка (как в native приложениях)
- Background App Refresh для PWA

---

## 📚 Документация Apple

- [Web Push на iOS](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/)
- [PWA Capabilities на iOS](https://developer.apple.com/documentation/webkit/web_push)
- [Service Workers на iOS](https://webkit.org/status/#specification-service-workers)

---

## 🤝 Рекомендации для пользователей

Добавьте в приложение информационное сообщение для iOS пользователей:

```typescript
// components/PushNotificationSetup.tsx

const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

if (isIOS) {
  return (
    <div className="ios-push-info">
      <h3>📱 Уведомления на iPhone</h3>
      <p>Для получения уведомлений когда приложение закрыто:</p>
      <ol>
        <li>Убедитесь что приложение установлено на главный экран</li>
        <li>Не закрывайте приложение полностью (не смахивайте)</li>
        <li>Просто нажмите Home - уведомления будут работать</li>
      </ol>
      <p className="note">
        ⚠️ iOS не поддерживает push для полностью закрытых PWA приложений
      </p>
    </div>
  );
}
```

---

## ✅ Итог

**Ваша проблема - это не баг, а ограничения iOS PWA.**

Решения:

1. ✅ Добавьте автоматическую переподписку (код выше)
2. ✅ Настройте iOS правильно (инструкции выше)
3. ✅ Объясните пользователям ограничения
4. ✅ Не закрывайте приложение полностью - просто Home

Если нужны полноценные push на iOS - рассмотрите Native приложение! 🚀
