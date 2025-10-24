# WebSocket Chat API - Документация для Frontend

## 📡 Подключение к WebSocket

### Установка на фронтенде

```bash
npm install socket.io-client
```

### Базовое подключение (React пример)

```typescript
import { io, Socket } from "socket.io-client";

// Получаем JWT токен после логина
const token = localStorage.getItem("authToken");

// Подключаемся к WebSocket
const socket: Socket = io("http://localhost:3005", {
  auth: {
    token: token,
  },
  transports: ["websocket"],
});

// Или для production
// const socket = io('https://your-app.onrender.com', { auth: { token } });
```

## 🔐 Авторизация

После подключения нужно аутентифицироваться:

```typescript
socket.emit("authenticate", { phone: "+380501234567" });

socket.on("authenticated", (data) => {
  console.log("✅ Authenticated:", data);
});
```

## 📨 Отправка сообщений

```typescript
function sendMessage(text: string, phone: string) {
  socket.emit("sendMessage", {
    text: text,
    phone: phone,
  });
}

// Пример использования
sendMessage("Привет!", "+380501234567");
```

## 📬 Получение сообщений

```typescript
socket.on("newMessage", (message) => {
  console.log("Новое сообщение:", message);
  /*
  message = {
    id: 1,
    text: "Привет!",
    phone: "+380501234567",
    createdAt: "2024-10-24T12:00:00.000Z"
  }
  */

  // Добавляем сообщение в список
  setMessages((prev) => [...prev, message]);
});
```

## ⌨️ Индикатор печатает...

```typescript
// Отправляем что начали печатать
function startTyping(phone: string) {
  socket.emit("typing", {
    phone: phone,
    isTyping: true,
  });
}

// Отправляем что закончили печатать
function stopTyping(phone: string) {
  socket.emit("typing", {
    phone: phone,
    isTyping: false,
  });
}

// Получаем когда другой пользователь печатает
socket.on("userTyping", (data) => {
  console.log(`${data.phone} печатает:`, data.isTyping);
  setIsOtherUserTyping(data.isTyping);
});
```

## 📚 REST API эндпоинты

### GET /chat/messages - Получить историю сообщений

```typescript
async function getMessages(limit = 50) {
  const response = await fetch(
    `http://localhost:3005/chat/messages?limit=${limit}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const messages = await response.json();
  return messages;
}
```

**Response:**

```json
[
  {
    "id": 1,
    "text": "Привет!",
    "userId": 1,
    "createdAt": "2024-10-24T12:00:00.000Z",
    "user": {
      "id": 1,
      "phone": "+380501234567"
    }
  }
]
```

### GET /chat/messages/after/:lastMessageId - Получить новые сообщения

```typescript
async function getNewMessages(lastMessageId: number) {
  const response = await fetch(
    `http://localhost:3005/chat/messages/after/${lastMessageId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return await response.json();
}
```

### DELETE /chat/messages/:id - Удалить сообщение

```typescript
async function deleteMessage(messageId: number) {
  const response = await fetch(
    `http://localhost:3005/chat/messages/${messageId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return await response.json();
}
```

## 🎯 Полный пример React компонента

```tsx
import React, { useState, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";

interface Message {
  id: number;
  text: string;
  phone: string;
  createdAt: string;
}

function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  const token = localStorage.getItem("authToken");
  const userPhone = localStorage.getItem("userPhone"); // +380501234567

  useEffect(() => {
    // Подключение к WebSocket
    socketRef.current = io("http://localhost:3005", {
      auth: { token },
    });

    const socket = socketRef.current;

    // Аутентификация
    socket.emit("authenticate", { phone: userPhone });

    socket.on("authenticated", () => {
      console.log("✅ Подключено к чату");
    });

    // Получение новых сообщений
    socket.on("newMessage", (message: Message) => {
      setMessages((prev) => [...prev, message]);
    });

    // Индикатор печати
    socket.on("userTyping", (data) => {
      if (data.phone !== userPhone) {
        setIsTyping(data.isTyping);
      }
    });

    // Загрузка истории
    loadHistory();

    return () => {
      socket.disconnect();
    };
  }, []);

  const loadHistory = async () => {
    const response = await fetch(
      "http://localhost:3005/chat/messages?limit=50",
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    const history = await response.json();
    setMessages(history);
  };

  const sendMessage = () => {
    if (!inputText.trim()) return;

    socketRef.current?.emit("sendMessage", {
      text: inputText,
      phone: userPhone,
    });

    setInputText("");
    handleStopTyping();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);

    // Отправляем что печатаем
    if (e.target.value && !isTyping) {
      socketRef.current?.emit("typing", {
        phone: userPhone,
        isTyping: true,
      });
    } else if (!e.target.value) {
      handleStopTyping();
    }
  };

  const handleStopTyping = () => {
    socketRef.current?.emit("typing", {
      phone: userPhone,
      isTyping: false,
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      sendMessage();
    }
  };

  return (
    <div className="chat-container">
      <div className="messages">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={
              msg.phone === userPhone ? "message-sent" : "message-received"
            }
          >
            <p>{msg.text}</p>
            <span>{new Date(msg.createdAt).toLocaleTimeString()}</span>
          </div>
        ))}
        {isTyping && <div className="typing-indicator">Печатает...</div>}
      </div>

      <div className="input-area">
        <input
          type="text"
          value={inputText}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          onBlur={handleStopTyping}
          placeholder="Напишите сообщение..."
        />
        <button onClick={sendMessage}>Отправить</button>
      </div>
    </div>
  );
}

export default Chat;
```

## 🔄 События WebSocket

### События от клиента (emit):

| Событие        | Данные                                 | Описание                         |
| -------------- | -------------------------------------- | -------------------------------- |
| `authenticate` | `{ phone: string }`                    | Аутентификация после подключения |
| `sendMessage`  | `{ text: string, phone: string }`      | Отправка сообщения               |
| `typing`       | `{ phone: string, isTyping: boolean }` | Индикатор печати                 |

### События от сервера (on):

| Событие         | Данные                           | Описание                     |
| --------------- | -------------------------------- | ---------------------------- |
| `authenticated` | `{ success: boolean }`           | Подтверждение аутентификации |
| `newMessage`    | `{ id, text, phone, createdAt }` | Новое сообщение в чате       |
| `userTyping`    | `{ phone, isTyping }`            | Другой пользователь печатает |

## 🚀 Production настройки

Для production замените URL:

```typescript
const SOCKET_URL =
  process.env.NODE_ENV === "production"
    ? "https://your-app.onrender.com"
    : "http://localhost:3005";

const socket = io(SOCKET_URL, {
  auth: { token },
});
```

## 🔧 Troubleshooting

### WebSocket не подключается

- Проверьте что сервер запущен
- Проверьте что токен валиден
- Откройте консоль браузера для ошибок

### Сообщения не приходят

- Убедитесь что вызвали `authenticate`
- Проверьте что слушаете событие `newMessage`

### CORS ошибки

- CORS уже настроен на бэкенде для всех origins
- Для production настройте конкретные origins

## 📱 Пример для React Native

```typescript
import io from "socket.io-client";

const socket = io("https://your-app.onrender.com", {
  auth: {
    token: await AsyncStorage.getItem("authToken"),
  },
  transports: ["websocket"],
});

socket.on("connect", () => {
  socket.emit("authenticate", {
    phone: await AsyncStorage.getItem("userPhone"),
  });
});
```

## ⚡ Оптимизация

1. **Переподключение при разрыве:**

```typescript
socket.on("disconnect", () => {
  console.log("Отключено, переподключаемся...");
});

socket.on("connect", () => {
  console.log("Переподключено!");
  socket.emit("authenticate", { phone: userPhone });
});
```

2. **Debounce для индикатора печати:**

```typescript
import { debounce } from "lodash";

const debouncedStopTyping = debounce(() => {
  socket.emit("typing", { phone: userPhone, isTyping: false });
}, 1000);

const handleTyping = (text: string) => {
  if (text) {
    socket.emit("typing", { phone: userPhone, isTyping: true });
    debouncedStopTyping();
  }
};
```

3. **Пагинация для истории:**

```typescript
async function loadMoreMessages(oldestMessageId: number) {
  const response = await fetch(`http://localhost:3005/chat/messages?limit=20`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const messages = await response.json();
  // Фильтруем сообщения старше oldestMessageId
  return messages.filter((m) => m.id < oldestMessageId);
}
```

## 🎨 Готово к использованию!

Теперь у вас есть полноценный WebSocket чат для двух пользователей! 🎉
