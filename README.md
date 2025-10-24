# Gift App Backend API

REST API на NestJS с JWT авторизацией по номеру телефона для Gift App.

## Стек технологий

- **NestJS** - Node.js фреймворк
- **Prisma ORM** - работа с базой данных
- **PostgreSQL** - база данных
- **JWT** - токены авторизации (срок жизни: 1 час)
- **Docker** - контейнеризация

## Особенности

- ✅ Авторизация только по номеру телефона (формат: `+380XXXXXXXXX`)
- ✅ JWT токены с временем жизни 1 час
- ✅ Список разрешенных номеров хранится в БД
- ✅ Регистрация новых пользователей не предусмотрена
- ✅ CORS настроен для работы с фронтендом
- ✅ Валидация всех входящих данных

## Структура проекта

```
DB/
├── src/
│   ├── auth/                    # Модуль авторизации
│   │   ├── dto/
│   │   │   └── login.dto.ts     # DTO для логина
│   │   ├── auth.controller.ts   # Контроллер с эндпоинтами
│   │   ├── auth.service.ts      # Логика авторизации
│   │   ├── auth.module.ts       # Модуль
│   │   ├── jwt.strategy.ts      # JWT стратегия
│   │   └── jwt-auth.guard.ts    # Guard для защиты эндпоинтов
│   ├── prisma.service.ts        # Prisma сервис
│   ├── app.module.ts            # Корневой модуль
│   └── main.ts                  # Точка входа
├── prisma/
│   ├── schema.prisma            # Схема БД (User модель)
│   ├── seed.sql                 # Тестовые данные
│   └── migrations/              # Миграции
├── Dockerfile                   # Docker образ
└── docker-compose.yml           # Docker Compose
```

## API Endpoints

### 1. POST /login

Проверка номера телефона и выдача JWT токена.

**Request:**

```bash
curl -X POST http://localhost:3000/login \
  -H "Content-Type: application/json" \
  -d '{"phone": "+380501234567"}'
```

**Request Body:**

```json
{
  "phone": "+380501234567"
}
```

**Response 200 (успех):**

```json
{
  "token": "eyJhbGc..."
}
```

**Response 400 (неверный формат):**

```json
{
  "message": "Неверный формат номера телефона",
  "statusCode": 400
}
```

**Response 401 (номер не найден):**

```json
{
  "message": "Номер телефона не найден",
  "statusCode": 401
}
```

---

### 2. GET /check

Проверка валидности JWT токена.

**Request:**

```bash
curl http://localhost:3000/check \
  -H "Authorization: Bearer eyJhbGc..."
```

**Response 200 (токен валиден):**

```json
{
  "phone": "+380501234567"
}
```

**Response 401 (ошибки токена):**

```json
{
  "message": "Токен истек | Токен недействителен",
  "statusCode": 401
}
```

## Быстрый старт

### Запуск через Docker (рекомендуется)

1. **Запустите все сервисы:**

   ```bash
   docker-compose up -d --build
   ```

2. **Проверьте логи:**

   ```bash
   docker-compose logs -f app
   ```

3. **Остановите сервисы:**
   ```bash
   docker-compose down
   ```

Приложение будет доступно по адресу: `http://localhost:3000`

### Локальная разработка

1. **Установите зависимости:**

   ```bash
   npm install
   ```

2. **Настройте .env файл:**

   ```env
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/mydb?schema=public"
   PORT=3000
   NODE_ENV=development
   JWT_SECRET=your-super-secret-key-change-in-production
   ```

3. **Запустите PostgreSQL:**

   ```bash
   docker run --name postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=mydb -p 5432:5432 -d postgres:16-alpine
   ```

4. **Примените миграции:**

   ```bash
   npx prisma migrate dev
   ```

5. **Добавьте тестовые номера (опционально):**

   ```bash
   npx prisma db execute --file ./prisma/seed.sql
   ```

6. **Запустите приложение:**
   ```bash
   npm run start:dev
   ```

## Тестирование API

### Успешный логин

```bash
curl -X POST http://localhost:3000/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"+380501234567"}'
```

### Проверка токена

```bash
# Сохраните токен из предыдущего ответа
TOKEN="eyJhbGc..."

curl http://localhost:3000/check \
  -H "Authorization: Bearer $TOKEN"
```

### Тестовые номера

По умолчанию в базе есть 3 тестовых номера:

- `+380501234567`
- `+380671234567`
- `+380931234567`

## Формат номера телефона

- **Формат:** `+380XXXXXXXXX` (13 символов)
- **Префикс:** `+380`
- **После префикса:** 9 цифр

**Примеры:**

- ✅ `+380501234567`
- ✅ `+380671234567`
- ✅ `+380931234567`
- ❌ `380501234567` (нет +)
- ❌ `+38050123456` (8 цифр)
- ❌ `+3805012345678` (10 цифр)

## Управление пользователями

### Добавление нового номера

Номера добавляются только вручную администратором через Prisma Studio или напрямую в БД.

**Через Prisma Studio:**

```bash
npx prisma studio
```

**Через SQL:**

```bash
docker exec -it db-postgres psql -U postgres -d mydb -c \
  "INSERT INTO \"User\" (phone, \"createdAt\", \"updatedAt\") VALUES ('+380991234567', NOW(), NOW());"
```

### Просмотр всех пользователей

```bash
docker exec -it db-postgres psql -U postgres -d mydb -c 'SELECT * FROM "User";'
```

## Полезные команды

### Разработка

- `npm run start:dev` - запуск в режиме разработки с hot-reload
- `npm run start:debug` - запуск в режиме отладки
- `npm run build` - сборка проекта

### Prisma

- `npx prisma studio` - открыть GUI для БД
- `npx prisma migrate dev` - создать и применить миграцию
- `npx prisma generate` - сгенерировать Prisma Client
- `npx prisma db execute --file ./prisma/seed.sql` - выполнить SQL скрипт

### Docker

- `docker-compose up -d` - запуск контейнеров
- `docker-compose down` - остановка контейнеров
- `docker-compose down -v` - остановка и удаление volumes
- `docker-compose logs -f app` - просмотр логов приложения
- `docker-compose restart app` - перезапуск приложения

## База данных

### Модель User

```prisma
model User {
  id        Int      @id @default(autoincrement())
  phone     String   @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

## Безопасность

### JWT

- Алгоритм: HS256
- Время жизни: 1 час
- Secret key хранится в переменных окружения

### CORS

Разрешено:

- Headers: `Content-Type`, `Authorization`
- Methods: `GET`, `POST`, `OPTIONS`
- Origin: все (для разработки)

### Рекомендации для продакшена

1. Измените `JWT_SECRET` на сложный случайный ключ
2. Настройте конкретные CORS origins
3. Включите HTTPS
4. Добавьте rate limiting для защиты от брутфорса
5. Настройте логирование попыток входа
6. Используйте helmet для дополнительной безопасности

## Переменные окружения

```env
# База данных
DATABASE_URL="postgresql://user:pass@host:port/db?schema=public"

# Приложение
PORT=3000
NODE_ENV=development

# JWT
JWT_SECRET=your-super-secret-key-change-in-production
```

## Troubleshooting

**Ошибка подключения к БД:**

- Проверьте что PostgreSQL запущен
- Проверьте DATABASE_URL в .env

**401 при логине:**

- Убедитесь что номер телефона есть в базе
- Проверьте формат номера: `+380XXXXXXXXX`

**Токен невалиден:**

- Проверьте что токен не истек (1 час)
- Убедитесь что JWT_SECRET одинаковый при создании и проверке токена

**Порт занят:**

- Измените PORT в .env
- Или остановите процесс на порту 3000

## Расширение функционала

Для добавления новых эндпоинтов:

1. Создайте новый контроллер или добавьте метод в существующий
2. Используйте `@UseGuards(JwtAuthGuard)` для защиты эндпоинтов
3. Доступ к номеру телефона через `@Request() req` → `req.user.phone`

Пример:

```typescript
@Get('profile')
@UseGuards(JwtAuthGuard)
async getProfile(@Request() req) {
  const phone = req.user.phone;
  // Ваша логика
  return { phone };
}
```

## Мониторинг

### Проверка здоровья сервиса

```bash
# Проверка что приложение отвечает
curl http://localhost:3000/check -I
```

### Логи

```bash
# Все логи
docker-compose logs -f

# Только приложение
docker-compose logs -f app

# Только БД
docker-compose logs -f postgres
```

## Лицензия

ISC
