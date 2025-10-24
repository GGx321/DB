# Деплой Backend на Render

## 📋 Пошаговая инструкция

### 1. Подготовка репозитория

Убедитесь что все файлы загружены в GitHub:

- `package.json`
- `tsconfig.json`
- `nest-cli.json`
- `prisma/schema.prisma`
- `prisma/migrations/`
- `src/` (весь код)

### 2. Создание базы данных PostgreSQL

1. Зайдите на [Render Dashboard](https://dashboard.render.com)
2. Нажмите **New +** → **PostgreSQL**
3. Настройки:
   ```
   Name: gift-app-db
   Region: Frankfurt (или ближайший к вам)
   PostgreSQL Version: 16
   Plan: Free
   ```
4. Нажмите **Create Database**
5. **Сохраните Internal Database URL** (он понадобится)

### 3. Создание Web Service

1. Нажмите **New +** → **Web Service**
2. Подключите ваш GitHub репозиторий
3. Настройки:

   ```
   Name: gift-app-api
   Region: Frankfurt
   Branch: main (или master)
   Root Directory: . (оставьте пустым если бэк в корне)
   Runtime: Node
   ```

4. **Build Command:**

   ```bash
   npm install && npx prisma generate && npm run build
   ```

5. **Start Command:**

   ```bash
   npx prisma migrate deploy && node dist/main.js
   ```

6. **Instance Type:** Free

### 4. Переменные окружения

Добавьте Environment Variables:

```bash
NODE_VERSION=20.11.0
NODE_ENV=production
PORT=10000

# Database URL из шага 2 (Internal Database URL)
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# Сгенерируйте случайный секрет (можно на https://generate-secret.vercel.app)
JWT_SECRET=ваш-супер-секретный-ключ-минимум-32-символа
```

### 5. Deploy

1. Нажмите **Create Web Service**
2. Дождитесь завершения деплоя (3-5 минут)
3. Проверьте логи на наличие ошибок

### 6. Добавление тестовых пользователей

После успешного деплоя подключитесь к базе данных:

1. В Render перейдите в вашу базу данных **gift-app-db**
2. Вкладка **Shell** или используйте **psql** локально
3. Выполните:

```sql
INSERT INTO "User" (phone, "createdAt", "updatedAt") VALUES
  ('+380501234567', NOW(), NOW()),
  ('+380671234567', NOW(), NOW()),
  ('+380931234567', NOW(), NOW())
ON CONFLICT (phone) DO NOTHING;
```

Или используйте Render Shell:

```bash
psql $DATABASE_URL -c "INSERT INTO \"User\" (phone, \"createdAt\", \"updatedAt\") VALUES ('+380501234567', NOW(), NOW()) ON CONFLICT (phone) DO NOTHING;"
```

### 7. Тестирование

Ваш API будет доступен по адресу: `https://gift-app-api.onrender.com`

**Тест логина:**

```bash
curl -X POST https://gift-app-api.onrender.com/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"+380501234567"}'
```

**Тест проверки токена:**

```bash
curl https://gift-app-api.onrender.com/check \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## 🔧 Troubleshooting

### Ошибка "Cannot find module"

- Проверьте Build Command: должна быть сборка `npm run build`
- Проверьте что есть `tsconfig.json` и `nest-cli.json`

### Ошибка подключения к БД

- Убедитесь что используете **Internal Database URL** (не External)
- Проверьте что DATABASE_URL правильно скопирован
- Формат: `postgresql://user:pass@dpg-xxxxx-a/dbname`

### Миграции не применились

- Проверьте логи деплоя
- В Start Command должно быть: `npx prisma migrate deploy && node dist/main.js`
- Убедитесь что папка `prisma/migrations/` залита в Git

### Приложение падает после запуска

- Проверьте переменную `PORT=10000` (Render использует этот порт)
- Убедитесь что `JWT_SECRET` установлен

## 📝 Важные моменты

1. **Free tier Render засыпает через 15 минут** без активности

   - Первый запрос после сна займет ~30 секунд
   - Для production рассмотрите платный план

2. **База данных Free tier** имеет ограничения:

   - 90 дней (потом нужно пересоздать)
   - Ограничение на размер

3. **CORS уже настроен** в коде для всех origins

4. **Логи** доступны в реальном времени в Render Dashboard

## 🚀 Автоматический деплой

После настройки каждый `git push` в GitHub автоматически запускает деплой на Render!

## 🔐 Безопасность

В production обязательно:

1. Используйте сложный JWT_SECRET (минимум 32 символа)
2. Настройте конкретные CORS origins вместо `*`
3. Добавьте rate limiting
4. Включите логирование попыток входа

## 📞 Поддержка

Если что-то не работает:

1. Проверьте логи деплоя в Render
2. Проверьте переменные окружения
3. Убедитесь что все файлы в Git
