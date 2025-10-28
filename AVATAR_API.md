# 📸 API для работы с аватарками

## Обзор

Аватарки хранятся в AWS S3. Backend автоматически генерирует временные ссылки (presigned URLs) на 15 минут для доступа к файлам.

## Настройка AWS S3

### 1. Создайте S3 bucket на AWS

```bash
# Пример имени: gift-app-avatars
# Region: eu-north-1 (или тот же что у вашего EC2)
```

### 2. Настройте IAM роль для EC2 (если деплоите на EC2)

Создайте IAM роль с политикой:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::your-bucket-name/*"
    }
  ]
}
```

Прикрепите роль к вашему EC2 instance.

### 3. Добавьте переменные окружения

В `.env` или PM2 config:

```bash
AWS_REGION=eu-north-1
AWS_S3_BUCKET=gift-app-avatars
```

## API Endpoints

### 1. Получение данных пользователя (с аватаркой)

```http
GET /user/me
Authorization: Bearer <token>
```

**Response 200:**

```json
{
  "id": 1,
  "phone": "+380501234567",
  "name": "Машка",
  "avatarKey": "avatars/1-1698765432000.jpg",
  "avatarUrl": "https://gift-app-avatars.s3.eu-north-1.amazonaws.com/avatars/1-1698765432000.jpg?X-Amz-Algorithm=...",
  "isOnline": true,
  "lastSeen": "2025-10-26T12:00:00.000Z",
  "createdAt": "2025-10-26T10:00:00.000Z",
  "updatedAt": "2025-10-26T12:00:00.000Z"
}
```

**Важно:** `avatarUrl` - временная ссылка, действует 15 минут!

---

### 2. Загрузка аватарки

```http
POST /user/avatar
Authorization: Bearer <token>
Content-Type: multipart/form-data

Body:
  avatar: [file]
```

**Ограничения:**

- Максимальный размер: 5MB
- Форматы: JPEG, PNG, GIF, WebP

**Response 200:**

```json
{
  "id": 1,
  "phone": "+380501234567",
  "name": "Машка",
  "avatarKey": "avatars/1-1698765432000.jpg",
  "avatarUrl": "https://gift-app-avatars.s3.eu-north-1.amazonaws.com/...",
  "isOnline": true,
  "lastSeen": "2025-10-26T12:00:00.000Z",
  "createdAt": "2025-10-26T10:00:00.000Z",
  "updatedAt": "2025-10-26T12:00:00.000Z"
}
```

**Response 400:**

```json
{
  "message": "Неверный формат файла. Разрешены: JPEG, PNG, GIF, WebP"
}
```

**Response 400:**

```json
{
  "message": "Размер файла не должен превышать 5MB"
}
```

---

### 3. Удаление аватарки

```http
DELETE /user/avatar
Authorization: Bearer <token>
```

**Response 200:**

```json
{
  "id": 1,
  "phone": "+380501234567",
  "name": "Машка",
  "avatarKey": null,
  "avatarUrl": null,
  "isOnline": true,
  "lastSeen": "2025-10-26T12:00:00.000Z",
  "createdAt": "2025-10-26T10:00:00.000Z",
  "updatedAt": "2025-10-26T12:00:00.000Z"
}
```

**Response 400:**

```json
{
  "message": "У пользователя нет аватарки"
}
```

---

## Примеры использования

### JavaScript (fetch)

```javascript
// Загрузка аватарки
async function uploadAvatar(token, file) {
  const formData = new FormData();
  formData.append("avatar", file);

  const response = await fetch("https://your-api.com/user/avatar", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  return await response.json();
}

// Использование
const fileInput = document.querySelector('input[type="file"]');
const file = fileInput.files[0];
const result = await uploadAvatar(token, file);
console.log("Avatar URL:", result.avatarUrl);
```

### cURL

```bash
# Загрузка аватарки
curl -X POST https://gift-backend.xyz/user/avatar \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "avatar=@/path/to/image.jpg"

# Удаление аватарки
curl -X DELETE https://gift-backend.xyz/user/avatar \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Аватарки в чате

Аватарки автоматически возвращаются в:

### REST API - GET /chat/messages

```json
{
  "messages": [
    {
      "id": 1,
      "text": "Привет!",
      "userId": 1,
      "user": {
        "id": 1,
        "phone": "+380501234567",
        "name": "Машка",
        "avatarUrl": "https://gift-app-avatars.s3.eu-north-1.amazonaws.com/..."
      },
      "createdAt": "2025-10-26T12:00:00.000Z"
    }
  ],
  "otherUser": {
    "phone": "+380671234567",
    "name": "Сашка",
    "avatarUrl": "https://gift-app-avatars.s3.eu-north-1.amazonaws.com/...",
    "isOnline": true,
    "lastSeen": "2025-10-26T11:00:00.000Z"
  }
}
```

### WebSocket - событие `newMessage`

```json
{
  "id": 1,
  "text": "Привет!",
  "phone": "+380501234567",
  "name": "Машка",
  "avatarUrl": "https://gift-app-avatars.s3.eu-north-1.amazonaws.com/...",
  "createdAt": "2025-10-26T12:00:00.000Z"
}
```

### WebSocket - событие `userStatusChanged`

```json
{
  "phone": "+380501234567",
  "name": "Машка",
  "avatarUrl": "https://gift-app-avatars.s3.eu-north-1.amazonaws.com/...",
  "isOnline": true,
  "lastSeen": null
}
```

---

## Важные моменты

1. **Presigned URLs действуют 15 минут**

   - Не храните URLs на фронтенде долго
   - Запрашивайте новые URLs при необходимости

2. **Старая аватарка автоматически удаляется**

   - При загрузке новой аватарки, старая удаляется из S3

3. **IAM роль EC2**

   - На EC2 с правильной IAM ролью не нужны AWS креды
   - SDK автоматически использует роль instance

4. **Локальная разработка**

   - Используйте AWS CLI credentials (`aws configure`)
   - Или экспортируйте `AWS_ACCESS_KEY_ID` и `AWS_SECRET_ACCESS_KEY`

5. **CORS для S3** (если нужен прямой доступ с фронта)
   - В консоли S3, настройте CORS policy для bucket:
   ```json
   [
     {
       "AllowedHeaders": ["*"],
       "AllowedMethods": ["GET"],
       "AllowedOrigins": ["https://your-frontend.com"],
       "ExposeHeaders": []
     }
   ]
   ```

---

## Troubleshooting

### Ошибка: "AWS_S3_BUCKET не настроен"

**Решение:** Добавьте `AWS_S3_BUCKET=your-bucket-name` в `.env` или PM2 config

### Ошибка: "Access Denied"

**Решение:** Проверьте IAM роль EC2 и политику доступа к S3

### Ошибка: "Размер файла не должен превышать 5MB"

**Решение:** Сожмите изображение перед загрузкой

### Presigned URL не работает

**Решение:** URL действителен только 15 минут, запросите новый

---

## Миграция базы данных

Не забудьте применить миграцию для добавления поля `avatarKey`:

```bash
# Локально
npx prisma migrate dev

# Production (AWS)
npx prisma migrate deploy
```
