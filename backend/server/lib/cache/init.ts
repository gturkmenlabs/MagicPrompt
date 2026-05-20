/**
 * Wire AdvancedCache for the backend.
 *
 * Behavior:
 *   - If FF_ADVANCED_CACHE is off → no-op (legacy semanticCache continues).
 *   - If on:
 *       L2 = Redis when REDIS_URL set AND ioredis installed; else no-op.
 *       L3 = Postgres when DATABASE_URL set; else no-op.
 *   - Calls cache.warm() in the background if L3 is active.
 *
 * Should be invoked from `server/index.ts` after DB connection is initialized
 * and BEFORE serving traffic (warming is non-blocking).
 */

import { featureFlags } from '../../../../shared/config/featureFlags';
import { AdvancedCache } from '../../../../shared/services/cache/advancedCache';
import { setAdvancedCache } from '../../../../shared/services/semanticCache';
import { getPool } from '../../db/client';
import { generateEmbedding } from '../embeddings';
import { PgL3Adapter } from './pgL3Adapter';
import { createRedisL2 } from './redisL2Adapter';

let initialized = false;
let instance: AdvancedCache | null = null;

export async function initAdvancedCache(): Promise<AdvancedCache | null> {
  if (initialized) return instance;
  initialized = true;

  if (!featureFlags.advancedCache) {
    return null;
  }

  const pool = getPool();
  const l3 = pool ? new PgL3Adapter(pool) : undefined;
  const l2 = (await createRedisL2()) ?? undefined;

  instance = new AdvancedCache({
    l2,
    l3,
    embedder: async (text: string) => {
      try {
        return await generateEmbedding(text);
      } catch {
        return [];
      }
    },
    logger: {
      warn: (msg, ctx) => {
        // eslint-disable-next-line no-console
        console.warn(`[advancedCache] ${msg}`, ctx ?? '');
      },
    },
  });

  setAdvancedCache(instance);

  // Non-blocking warm
  if (l3) {
    void instance.warm(100).then((n) => {
      // eslint-disable-next-line no-console
      console.log(`[advancedCache] warmed ${n} entries from L3`);
    });
  }

  return instance;
}

export function getAdvancedCache(): AdvancedCache | null { return instance; }
