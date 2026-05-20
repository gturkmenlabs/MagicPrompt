/**
 * Super Reasoning platform API key olusturur.
 * Uretilen key'i .env dosyasindaki API_KEYS listesine ekleyerek kullanabilirsiniz.
 * OWASP: 32 byte (256 bit) kriptografik rastgelelik.
 */

import crypto from 'node:crypto';

const PREFIX = 'sr_';
const BYTES = 32;

function generateApiKey(): string {
  const raw = crypto.randomBytes(BYTES).toString('base64url');
  return `${PREFIX}${raw}`;
}

const key = generateApiKey();

console.log('\n✅ Yeni API key olusturuldu:\n');
console.log(`   ${key}\n`);
console.log('Kullanim:');
console.log('  1. .env dosyasinda API_KEYS degiskenine ekleyin (virgulle ayirarak birden fazla key tanimlanabilir):');
console.log(`     API_KEYS=${key}\n`);
console.log('  2. Isteklerde header olarak gonderin:');
console.log(`     x-api-key: ${key}\n`);
console.log('⚠️  Bu key yalnizca bir kez gosterilir; guvenli bir yerde saklayin.\n');
