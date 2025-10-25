#!/usr/bin/env node

/**
 * Скрипт для генерации VAPID ключей для push-уведомлений
 * 
 * Запуск: node generate-vapid-keys.js
 */

const webPush = require('web-push');

console.log('🔑 Генерация VAPID ключей для push-уведомлений...\n');

const vapidKeys = webPush.generateVAPIDKeys();

console.log('✅ VAPID ключи успешно сгенерированы!\n');
console.log('═══════════════════════════════════════════════════════════');
console.log('📋 Добавьте эти переменные в ваши .env файлы:\n');

console.log('🔹 БЭКЕНД (добавьте в .env или Render Environment Variables):');
console.log('─────────────────────────────────────────────────────────');
console.log(`VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
console.log(`VAPID_EMAIL=mailto:your-email@example.com`);
console.log('');

console.log('🔹 ФРОНТЕНД (добавьте в .env файл):');
console.log('─────────────────────────────────────────────────────────');
console.log(`VITE_VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
console.log('');

console.log('═══════════════════════════════════════════════════════════');
console.log('');
console.log('⚠️  ВАЖНО:');
console.log('- VAPID_PRIVATE_KEY держите в секрете!');
console.log('- Никогда не коммитьте приватный ключ в git');
console.log('- Публичный ключ можно использовать на фронтенде');
console.log('- Не забудьте изменить VAPID_EMAIL на ваш реальный email');
console.log('');

