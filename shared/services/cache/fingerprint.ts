/**
 * Fingerprint generation for cache keys.
 * Shared by L1, L2, L3. Stable across processes (FNV-1a 32-bit base36).
 */

import type { CacheLookupKey } from './types';

const FNV_OFFSET = 0x811c9dc5;
const FNV_PRIME = 0x01000193;

/** FNV-1a 32-bit hash → base36. Stable, non-crypto. */
export function stableHash(input: string): string {
  let hash = FNV_OFFSET;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, FNV_PRIME);
  }
  // Convert to unsigned 32-bit
  return (hash >>> 0).toString(36);
}

/** Normalize intent: lowercase, strip punctuation (preserve unicode word chars), sort words. */
export function normalizeIntent(intent: string): string {
  return intent
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .sort()
    .join(' ');
}

export function generateFingerprint(key: CacheLookupKey): string {
  const ni = normalizeIntent(key.intent);
  const composite = `${ni}|${key.domainId}|${key.framework}|${key.provider}|${key.styleProfileId ?? ''}`;
  return stableHash(composite);
}
