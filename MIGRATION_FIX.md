# 🔧 Исправление ошибки миграции на Render

## ❌ Проблема

```
The column `User.pushSubscription` does not exist in the current database.
```

Эта ошибка означает, что миграция для добавления поля `pushSubscription` не была применена на production базе данных.

## ✅ Решение

### Шаг 1: Запуште миграцию на GitHub

Миграция уже создана и закоммичена локально. Теперь нужно запушить:

```bash
git push
```

### Шаг 2: Render автоматически задеплоит

После push на GitHub:

1. Render автоматически обнаружит изменения
2. Запустит новый деплой
3. Выполнит команду `prisma migrate deploy`
4. Применит миграцию `20251025060154_add_push_subscription`

### Шаг 3: Проверьте логи на Render

В логах должно быть:

```
Applying migration `20251025060154_add_push_subscription`
The following migration(s) have been applied:
migrations/
  └─ 20251025060154_add_push_subscription/
    └─ migration.sql
```

---

## 🔍 Альтернативное решение (если автоматический деплой не сработал)

### Вариант 1: Применить миграцию вручную через Render Shell

1. Откройте Render Dashboard
2. Выберите ваш Web Service
3. Откройте **Shell** (в правом верхнем углу)
4. Выполните команду:

```bash
npx prisma migrate deploy
```

### Вариант 2: Применить миграцию напрямую в БД

1. Откройте Render Dashboard → PostgreSQL Database
2. Откройте **Connect** → скопируйте **External Database URL**
3. Подключитесь к БД через `psql`:

```bash
psql <ваш_database_url>
```

4. Выполните SQL:

```sql
ALTER TABLE "User" ADD COLUMN "pushSubscription" TEXT;
```

5. Проверьте:

```sql
\d "User"
```

Должна быть колонка `pushSubscription | text | nullable`

---

## 🚀 После исправления

1. **Перезапустите сервис на Render:**

   - Dashboard → Web Service → Manual Deploy → Deploy latest commit

2. **Проверьте логи:**

   ```
   Application is running on: http://localhost:10000
   ```

3. **Протестируйте WebSocket:**
   - Подключитесь к чату
   - Должно работать без ошибок

---

## 📋 Проверка что всё работает

### 1. Проверьте структуру таблицы

В Render Shell или через psql:

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'User';
```

Должны быть все колонки:

- `id`
- `phone`
- `name`
- `isOnline`
- `lastSeen`
- `pushSubscription` ← эта должна появиться!
- `createdAt`
- `updatedAt`

### 2. Проверьте WebSocket соединение

```javascript
// В консоли браузера
const socket = io("https://gift-app-api.onrender.com", {
  auth: { token: "ваш_jwt_token" },
});

socket.on("connect", () => console.log("✅ Connected"));
socket.on("connect_error", (err) => console.error("❌ Error:", err));
```

### 3. Проверьте push-подписку

```bash
curl -X POST https://gift-app-api.onrender.com/push/subscribe \
  -H "Authorization: Bearer ваш_токен" \
  -H "Content-Type: application/json" \
  -d '{
    "endpoint": "test",
    "keys": {
      "p256dh": "test",
      "auth": "test"
    }
  }'
```

Должен вернуть:

```json
{
  "success": true,
  "message": "Push subscription saved"
}
```

---

## 🐛 Если проблема осталась

1. **Проверьте что миграция есть в репозитории:**

   ```bash
   ls prisma/migrations/
   # Должна быть директория: 20251025060154_add_push_subscription
   ```

2. **Проверьте содержимое миграции:**

   ```bash
   cat prisma/migrations/20251025060154_add_push_subscription/migration.sql
   ```

3. **Проверьте логи деплоя на Render:**

   - Dashboard → Logs → Deploy logs
   - Ищите строки с "prisma migrate deploy"

4. **Проверьте переменные окружения на Render:**
   - `DATABASE_URL` должен быть корректным
   - Остальные переменные из `.env.example`

---

## ✅ Итог

После выполнения этих шагов:

- ✅ Миграция применена на production
- ✅ Колонка `pushSubscription` существует
- ✅ WebSocket работает без ошибок
- ✅ Push-уведомления можно сохранять
- ✅ Приложение полностью работает 🎉
