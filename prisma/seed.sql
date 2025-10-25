-- Seed data: добавляем тестовые номера телефонов с именами
INSERT INTO "User" (phone, name, "createdAt", "updatedAt") VALUES 
  ('+380501234567', 'Машка', NOW(), NOW()),
  ('+380671234567', 'Сашка', NOW(), NOW()),
ON CONFLICT (phone) DO NOTHING;

