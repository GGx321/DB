# 🟢 API статусов "Онлайн/Оффлайн"

## Обзор

Теперь вы можете видеть когда собеседник онлайн или когда был в последний раз.

## 🔄 WebSocket - Новое событие

### `userStatusChanged`

Отправляется всем подключенным клиентам когда статус пользователя меняется.

**Когда срабатывает:**

- При подключении пользователя к WebSocket
- При отключении пользователя от WebSocket

**Данные события:**

```typescript
{
  phone: "+380664544255",
  name: "Александр",
  isOnline: true,
  lastSeen: null  // или "2025-10-25T10:30:00Z" если оффлайн
}
```

**Пример использования:**

```typescript
socket.on("userStatusChanged", (status) => {
  console.log(
    `${status.name} сейчас ${status.isOnline ? "онлайн" : "оффлайн"}`
  );

  if (status.isOnline) {
    setUserStatus("Онлайн");
  } else {
    const minutesAgo = calculateMinutesAgo(status.lastSeen);
    setUserStatus(`Был(а) ${minutesAgo} минут назад`);
  }
});
```

## 📡 REST API изменения

### GET /chat/messages - Обновлен

Теперь возвращает не только сообщения, но и информацию о собеседнике.

**Request:**

```bash
curl http://localhost:3005/chat/messages \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**

```json
{
  "messages": [
    {
      "id": 1,
      "text": "Привет!",
      "userId": 1,
      "createdAt": "2025-10-25T10:00:00.000Z",
      "user": {
        "id": 1,
        "phone": "+380664544255",
        "name": "Александр"
      }
    }
  ],
  "otherUser": {
    "phone": "+380664544255",
    "name": "Александр",
    "isOnline": true,
    "lastSeen": "2025-10-25T10:30:00.000Z"
  }
}
```

**otherUser может быть:**

- `null` - если нет второго пользователя
- объект с информацией о собеседнике

## 💻 Полный пример React

```tsx
import React, { useState, useEffect } from "react";
import { io, Socket } from "socket.io-client";

interface UserStatus {
  phone: string;
  name: string;
  isOnline: boolean;
  lastSeen: string | null;
}

function ChatHeader() {
  const [status, setStatus] = useState<UserStatus | null>(null);
  const [socketRef, setSocketRef] = useState<Socket | null>(null);

  useEffect(() => {
    // Загружаем начальную историю
    loadInitialData();

    // Подключаемся к WebSocket
    const socket = io("http://localhost:3005", {
      auth: { token: localStorage.getItem("authToken") },
    });

    // Слушаем изменения статуса
    socket.on("userStatusChanged", (newStatus: UserStatus) => {
      setStatus(newStatus);
    });

    setSocketRef(socket);

    return () => {
      socket.disconnect();
    };
  }, []);

  const loadInitialData = async () => {
    const response = await fetch("http://localhost:3005/chat/messages", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("authToken")}`,
      },
    });

    const data = await response.json();
    if (data.otherUser) {
      setStatus(data.otherUser);
    }
  };

  const formatStatus = () => {
    if (!status) return "Загрузка...";

    if (status.isOnline) {
      return <span className="status-online">🟢 Онлайн</span>;
    }

    if (status.lastSeen) {
      const minutesAgo = Math.floor(
        (Date.now() - new Date(status.lastSeen).getTime()) / 60000
      );

      if (minutesAgo < 1) return "Был(а) только что";
      if (minutesAgo < 60)
        return `Был(а) ${minutesAgo} ${
          minutesAgo === 1 ? "минуту" : "минут"
        } назад`;

      const hoursAgo = Math.floor(minutesAgo / 60);
      if (hoursAgo < 24)
        return `Был(а) ${hoursAgo} ${hoursAgo === 1 ? "час" : "часов"} назад`;

      return "Был(а) давно";
    }

    return "Оффлайн";
  };

  return (
    <div className="chat-header">
      <h2>{status?.name || "Чат"}</h2>
      <div className="status">{formatStatus()}</div>
    </div>
  );
}

export default ChatHeader;
```

## 🎨 Стили для статуса

```css
.status-online {
  color: #4caf50;
  font-weight: 500;
}

.status {
  font-size: 14px;
  color: #666;
  margin-top: 4px;
}
```

## 📊 Логика работы на бэкенде

### При подключении к WebSocket:

1. Пользователь вызывает событие `authenticate`
2. Бэкенд устанавливает `isOnline = true`
3. Обновляет `lastSeen` на текущее время
4. Отправляет событие `userStatusChanged` всем клиентам

### При отключении от WebSocket:

1. Бэкенд обнаруживает disconnect
2. Устанавливает `isOnline = false`
3. Обновляет `lastSeen` на текущее время
4. Отправляет событие `userStatusChanged` всем клиентам

### При запросе истории:

1. Определяет кто собеседник (второй пользователь в чате)
2. Возвращает его текущий статус вместе с сообщениями

## ⚡ Автоматическое обновление

Статус обновляется автоматически в реальном времени:

- Когда собеседник открывает чат → вы увидите "Онлайн"
- Когда собеседник закрывает вкладку → вы увидите "Был(а) X минут назад"
- Не нужно делать polling или обновлять страницу!

## 🔍 Полный список WebSocket событий

| Событие                 | Направление         | Данные                                    |
| ----------------------- | ------------------- | ----------------------------------------- |
| `authenticate`          | Client → Server     | `{ phone }`                               |
| `authenticated`         | Server → Client     | `{ success }`                             |
| `sendMessage`           | Client → Server     | `{ text, phone }`                         |
| `newMessage`            | Server → Client     | `{ id, text, phone, name, createdAt }`    |
| `typing`                | Client → Server     | `{ phone, isTyping }`                     |
| `userTyping`            | Server → Client     | `{ phone, isTyping }`                     |
| **`userStatusChanged`** | **Server → Client** | **`{ phone, name, isOnline, lastSeen }`** |

## 🚀 Production рекомендации

1. **Heartbeat для точности:**

   - Можно добавить ping/pong для более точного определения оффлайна
   - WebSocket автоматически определяет disconnect, но не всегда мгновенно

2. **Кеширование:**

   - Статус можно кешировать на фронтенде
   - Обновлять только при получении события `userStatusChanged`

3. **Форматирование времени:**
   - Используйте библиотеки типа `date-fns` или `dayjs`
   - Покажите относительное время ("5 минут назад" вместо timestamp)

## 📝 Примеры форматирования времени

```typescript
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";

function formatLastSeen(lastSeen: string): string {
  return formatDistanceToNow(new Date(lastSeen), {
    addSuffix: true,
    locale: ru,
  });
}

// Пример: "5 минут назад"
```

Или вручную:

```typescript
function formatLastSeen(lastSeen: string): string {
  const minutes = Math.floor(
    (Date.now() - new Date(lastSeen).getTime()) / 60000
  );

  if (minutes < 1) return "только что";
  if (minutes < 60) return `${minutes} мин. назад`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ч. назад`;

  const days = Math.floor(hours / 24);
  return `${days} дн. назад`;
}
```

## ✅ Готово!

Теперь ваш чат показывает статус собеседника в реальном времени! 🎉
