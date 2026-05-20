/**
 * iyzico ödeme entegrasyonu — lazy-load pattern (Stripe ile tutarlı).
 * IYZICO_API_KEY yoksa null döner, route'lar 503 verir.
 */

import { createRequire } from 'module';

const require = createRequire(import.meta.url);

let iyzicoInstance: any = null;

export function getIyzico(): any {
  if (iyzicoInstance) return iyzicoInstance;

  const apiKey = process.env.IYZICO_API_KEY;
  const secretKey = process.env.IYZICO_SECRET_KEY;
  const uri = process.env.IYZICO_BASE_URL || 'https://sandbox-api.iyzipay.com';

  if (!apiKey || !secretKey) return null;

  try {
    const Iyzipay = require('iyzipay');
    iyzicoInstance = new Iyzipay({ apiKey, secretKey, uri });
    return iyzicoInstance;
  } catch {
    return null;
  }
}

/** Plan → TRY fiyat eşlemesi */
export const PLAN_PRICES: Record<string, { price: string; name: string }> = {
  monthly: { price: '149.90', name: 'NeoMagic Pro Aylık' },
  yearly: { price: '1499.90', name: 'NeoMagic Pro Yıllık' },
  team: { price: '449.90', name: 'NeoMagic Team Aylık' },
};
