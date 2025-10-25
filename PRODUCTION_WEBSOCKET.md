# 📱 WebSocket на Production (iOS/Android)

## ⚠️ Проблема на мобильных устройствах

На iPhone и других мобильных устройствах WebSocket требует:

1. **HTTPS соединение** (не HTTP)
2. **WSS протокол** (не WS)
3. **Правильные настройки CORS**
4. **Специальные transports для Socket.io**

---

## 🔧 Настройка на Render

### Шаг 1: Убедитесь что у вас HTTPS

Render автоматически предоставляет HTTPS для вашего API:

- ✅ `https://your-app.onrender.com` - правильно
- ❌ `http://your-app.onrender.com` - НЕ будет работать на iOS

### Шаг 2: Обновите WebSocket Gateway

В файле `src/chat/chat.gateway.ts` уже настроен CORS, но добавим больше опций:

```typescript
@WebSocketGateway({
  cors: {
    origin: true, // Для production замените на конкретные домены
    credentials: true,
  },
  transports: ['websocket', 'polling'], // Важно для мобильных!
})
```

### Шаг 3: Обновите фронтенд для Production

**Неправильно (не работает на iOS):**

```typescript
const socket = io("http://localhost:3005");
```

**Правильно для Production:**

```typescript
const BACKEND_URL =
  process.env.REACT_APP_BACKEND_URL || "http://localhost:3005";

const socket = io(BACKEND_URL, {
  transports: ["websocket", "polling"], // Важно!
  secure: true, // Для HTTPS
  rejectUnauthorized: false, // Только для разработки
  auth: {
    token: localStorage.getItem("authToken"),
  },
});
```

### Шаг 4: Настройте переменные окружения

**На фронтенде (.env.production):**

```env
REACT_APP_BACKEND_URL=https://your-app.onrender.com
```

**На бэкенде (Render Environment Variables):**

```env
CORS_ORIGIN=https://your-frontend.vercel.app,https://your-frontend.netlify.app
```

---

## 📱 Полный пример для React (Production Ready)

```typescript
import { io, Socket } from "socket.io-client";

// Определяем URL в зависимости от окружения
const getSocketUrl = () => {
  if (process.env.NODE_ENV === "production") {
    return process.env.REACT_APP_BACKEND_URL || "https://your-app.onrender.com";
  }
  return "http://localhost:3005";
};

// Создаем подключение
const socket: Socket = io(getSocketUrl(), {
  transports: ["websocket", "polling"],
  auth: {
    token: localStorage.getItem("authToken"),
  },
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

// Обработка ошибок подключения
socket.on("connect_error", (error) => {
  console.error("WebSocket connection error:", error);
  // Попробуйте переподключиться через polling
  socket.io.opts.transports = ["polling", "websocket"];
});

socket.on("connect", () => {
  console.log("✅ Connected to WebSocket");
});

export default socket;
```

---

## 🔐 Улучшенная настройка CORS для Production

Обновите `src/main.ts`:

```typescript
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS для production
  const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(",")
    : ["http://localhost:3000", "http://localhost:5173"];

  app.enableCors({
    origin: allowedOrigins,
    methods: "GET,POST,PUT,DELETE,OPTIONS",
    allowedHeaders: "Content-Type,Authorization",
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );

  const port = process.env.PORT || 3005;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
}

bootstrap();
```

---

## 🚀 Обновленный Gateway для Production

Обновите `src/chat/chat.gateway.ts`:

```typescript
@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",") : true,
    credentials: true,
  },
  transports: ["websocket", "polling"], // Добавьте эту строку!
  path: "/socket.io/", // Явно указываем путь
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  // ... остальной код
}
```

---

## 📱 React Native (Expo/Native)

Для React Native немного другая настройка:

```typescript
import io from "socket.io-client";

const socket = io("https://your-app.onrender.com", {
  transports: ["websocket"], // Только websocket для native
  jsonp: false,
  auth: {
    token: await AsyncStorage.getItem("authToken"),
  },
});
```

---

## 🧪 Тестирование на iOS

### 1. Проверьте что используется HTTPS

```bash
# В консоли браузера на iPhone
console.log(window.location.protocol); // должно быть "https:"
```

### 2. Проверьте WebSocket соединение

```javascript
socket.on("connect", () => {
  console.log("✅ WebSocket connected");
  console.log("Transport:", socket.io.engine.transport.name);
});

socket.on("connect_error", (error) => {
  console.error("❌ Connection error:", error.message);
});
```

### 3. Откройте Safari DevTools

1. На Mac: Safari → Develop → [Your iPhone] → [Your Page]
2. Смотрите консоль на ошибки WebSocket

---

## ⚡ Fallback на Long Polling

Если WebSocket не работает, Socket.io автоматически переключится на polling:

```typescript
const socket = io(BACKEND_URL, {
  transports: ["websocket", "polling"], // Попробует websocket, потом polling
  upgrade: true, // Автоматически обновляется до websocket если возможно
  auth: { token },
});

// Проверка какой transport используется
socket.on("connect", () => {
  console.log("Connected via:", socket.io.engine.transport.name);
});
```

---

## 🔍 Отладка проблем на iOS

### Проблема 1: "Failed to connect"

**Решение:**

- Убедитесь что используется HTTPS URL
- Проверьте что `transports: ['websocket', 'polling']` указан
- Проверьте CORS настройки на бэкенде

### Проблема 2: "Connection timeout"

**Решение:**

```typescript
const socket = io(BACKEND_URL, {
  transports: ["websocket", "polling"],
  timeout: 10000, // Увеличьте таймаут
  reconnectionDelay: 2000,
});
```

### Проблема 3: "Mixed content" ошибка

**Решение:**

- Фронтенд должен быть на HTTPS
- Бэкенд должен быть на HTTPS
- Не смешивайте HTTP и HTTPS

---

## ✅ Checklist для Production

- [ ] Бэкенд деплоен на HTTPS (Render дает это автоматически)
- [ ] Фронтенд деплоен на HTTPS (Vercel/Netlify дают это автоматически)
- [ ] `transports: ['websocket', 'polling']` указан на фронте
- [ ] CORS_ORIGIN настроен с реальными доменами
- [ ] В коде используется переменная окружения для URL
- [ ] Протестировано на iOS Safari
- [ ] Протестировано на iOS Chrome/Firefox
- [ ] Протестировано на Android Chrome

---

## 🌐 Пример полной настройки

### Backend (.env на Render)

```env
PORT=10000
JWT_SECRET=your-production-secret
APP_PASSWORD=your-production-password
DATABASE_URL=postgresql://...
CORS_ORIGIN=https://your-frontend.vercel.app
NODE_ENV=production
```

### Frontend (.env.production)

```env
REACT_APP_BACKEND_URL=https://your-backend.onrender.com
REACT_APP_WS_URL=https://your-backend.onrender.com
```

### Frontend (Socket Connection)

```typescript
// config/socket.ts
import { io } from "socket.io-client";

const SOCKET_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:3005";

export const socket = io(SOCKET_URL, {
  transports: ["websocket", "polling"],
  autoConnect: false, // Подключаемся вручную после логина
  auth: (cb) => {
    cb({ token: localStorage.getItem("authToken") });
  },
});

// Подключаем после логина
export const connectSocket = () => {
  if (!socket.connected) {
    socket.connect();
  }
};

// Отключаем при логауте
export const disconnectSocket = () => {
  if (socket.connected) {
    socket.disconnect();
  }
};
```

---

## 🎯 Итого

**Главное для работы на iOS:**

1. ✅ Используйте HTTPS на production
2. ✅ Добавьте `transports: ['websocket', 'polling']`
3. ✅ Настройте CORS правильно
4. ✅ Используйте переменные окружения для URL

После этих настроек WebSocket будет работать на всех устройствах! 🎉
