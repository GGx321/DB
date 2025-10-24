-- Seed data: добавляем тестовые номера телефонов
INSERT INTO "User" (phone, "createdAt", "updatedAt") VALUES 
  ('+380501234567', NOW(), NOW()),
  ('+380671234567', NOW(), NOW()),
  ('+380931234567', NOW(), NOW())
ON CONFLICT (phone) DO NOTHING;

