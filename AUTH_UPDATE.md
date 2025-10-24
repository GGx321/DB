# 🔐 Обновление API - Добавлен пароль

## Что изменилось

Теперь для авторизации требуется **номер телефона И пароль**.

Один пароль для всех пользователей, хранится в переменной окружения `APP_PASSWORD`.

## API Изменения

### POST /login

**Было:**

```json
{
  "phone": "+380501234567"
}
```

**Стало:**

```json
{
  "phone": "+380501234567",
  "password": "mySecretPassword123"
}
```

**Response 200 (успех):**

```json
{
  "token": "eyJhbGc..."
}
```

**Response 401 (неверный пароль):**

```json
{
  "message": "Неверный пароль",
  "statusCode": 401
}
```

**Response 400 (пароль не указан):**

```json
{
  "message": ["Пароль обязателен"],
  "statusCode": 400
}
```

## Примеры использования

### cURL

```bash
curl -X POST http://localhost:3005/login \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+380501234567",
    "password": "mySecretPassword123"
  }'
```

### JavaScript/TypeScript

```typescript
async function login(phone: string, password: string) {
  const response = await fetch("http://localhost:3005/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ phone, password }),
  });

  if (!response.ok) {
    throw new Error("Неверный номер или пароль");
  }

  const { token } = await response.json();
  return token;
}

// Использование
const token = await login("+380501234567", "mySecretPassword123");
localStorage.setItem("authToken", token);
```

### React пример

```tsx
import { useState } from "react";

function LoginForm() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const response = await fetch("http://localhost:3005/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        setError(error.message);
        return;
      }

      const { token } = await response.json();
      localStorage.setItem("authToken", token);
      localStorage.setItem("userPhone", phone);

      // Редирект на главную
      window.location.href = "/";
    } catch (err) {
      setError("Ошибка соединения");
    }
  };

  return (
    <form onSubmit={handleLogin}>
      <input
        type="tel"
        placeholder="+380501234567"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        required
      />
      <input
        type="password"
        placeholder="Пароль"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      <button type="submit">Войти</button>
      {error && <div className="error">{error}</div>}
    </form>
  );
}
```

## Настройка пароля

### Локальная разработка

Файл `.env`:

```env
APP_PASSWORD=mySecretPassword123
```

### Docker

Файл `docker-compose.yml`:

```yaml
environment:
  APP_PASSWORD: mySecretPassword123
```

### Production (Render)

Добавьте переменную окружения:

```
APP_PASSWORD=ваш-секретный-пароль
```

## Тестовые данные

**Номера телефонов:**

- `+380501234567`
- `+380671234567`
- `+380931234567`

**Пароль (для всех):**

- `mySecretPassword123`

## Миграция существующих клиентов

Если у вас уже есть фронтенд:

1. Обновите форму логина - добавьте поле пароля
2. Обновите запрос - добавьте `password` в body
3. Сообщите пользователям новый пароль

## Безопасность

⚠️ **Важно для production:**

1. Используйте сложный пароль (минимум 12 символов)
2. Не коммитьте `.env` в Git
3. Рассмотрите использование разных паролей для каждого пользователя в будущем
4. Включите HTTPS в production

## GET /check

Эндпоинт `/check` **НЕ изменился**, по-прежнему работает только с JWT токеном:

```bash
curl http://localhost:3005/check \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Обратная совместимость

❌ **Нет обратной совместимости**

Старые запросы без пароля будут возвращать ошибку 400:

```json
{
  "message": ["Пароль обязателен"],
  "statusCode": 400
}
```

Обновите все клиенты перед деплоем!
