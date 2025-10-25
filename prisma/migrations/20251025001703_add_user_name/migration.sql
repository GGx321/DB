/*
  Warnings:

  - Added the required column `name` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable: добавляем колонку с дефолтным значением
ALTER TABLE "User" ADD COLUMN "name" TEXT NOT NULL DEFAULT 'Пользователь';

-- Обновляем существующие записи с реальными именами
UPDATE "User" SET "name" = 'Сашка' WHERE phone = '+380501234567';
UPDATE "User" SET "name" = 'Машка' WHERE phone = '+380671234567';

-- Убираем дефолтное значение
ALTER TABLE "User" ALTER COLUMN "name" DROP DEFAULT;
