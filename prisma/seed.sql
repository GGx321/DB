-- Seed data: добавляем тестовые номера телефонов
INSERT INTO "User" (phone, "createdAt", "updatedAt") VALUES 
  ('+380664544255', NOW(), NOW()),
  ('+380734365811', NOW(), NOW())
ON CONFLICT (phone) DO NOTHING;

