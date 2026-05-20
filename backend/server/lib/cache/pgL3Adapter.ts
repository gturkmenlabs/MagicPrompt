/**
 * L3 cache adapter — Postgres + pgvector.
 * Implements L3CacheAdapter from @shared/services/cache/types.
 *
 * Migration: backend/server/db/migrations/018_prompt_cache_v4.sql
 */

import type { Pool } from 'pg';
import type {
  CacheEntry,
  L3CacheAdapter,
} from '../../../../shared/services/cache/types';

const DEFAULT_TTL_HOURS = 24;

function rowToEntry(row: Record<string, unknown>): CacheEntry {
  return {
    fingerprint: String(row.fingerprint),
    response: row.response as CacheEntry['response'],
    createdAt: new Date(row.created_at as string).getTime(),
    hitCount: Number(row.hit_count ?? 0),
    intent: String(row.intent),
    domainId: String(row.domain_id),
    framework: String(row.framework),
    provider: String(row.provider),
    styleProfileId: row.style_profile_id ? String(row.style_profile_id) : undefined,
    providerVersion: row.provider_version ? String(row.provider_version) : undefined,
    embedding: row.embedding ? parsePgVector(row.embedding) : undefined,
  };
}

function parsePgVector(raw: unknown): readonly number[] | undefined {
  if (Array.isArray(raw)) return raw as number[];
  if (typeof raw === 'string') {
    // pgvector text format: "[0.1,0.2,...]"
    const trimmed = raw.trim().replace(/^\[|\]$/g, '');
    if (!trimmed) return undefined;
    return trimmed.split(',').map(Number);
  }
  return undefined;
}

function toPgVectorLiteral(v: readonly number[]): string {
  return `[${v.join(',')}]`;
}

export interface PgL3Options {
  ttlHours?: number;
}

export class PgL3Adapter implements L3CacheAdapter {
  constructor(private readonly pool: Pool, private readonly opts: PgL3Options = {}) {}

  private ttlInterval(): string {
    return `${this.opts.ttlHours ?? DEFAULT_TTL_HOURS} hours`;
  }

  async getByFingerprint(fingerprint: string): Promise<CacheEntry | null> {
    const res = await this.pool.query(
      `UPDATE prompt_cache_v4
         SET hit_count = hit_count + 1, last_hit_at = now()
       WHERE fingerprint = $1
         AND tombstoned_at IS NULL
         AND created_at > now() - $2::interval
       RETURNING *`,
      [fingerprint, this.ttlInterval()],
    );
    return res.rows.length > 0 ? rowToEntry(res.rows[0]) : null;
  }

  async getBySimilarity(
    embedding: readonly number[],
    filter: { domainId: string; framework: string; provider: string; styleProfileId?: string },
    threshold: number,
  ): Promise<{ entry: CacheEntry; similarity: number } | null> {
    // Cosine distance: 1 - cosine_similarity. We want similarity >= threshold → distance <= 1 - threshold.
    const maxDistance = 1 - threshold;
    const res = await this.pool.query(
      `SELECT *, 1 - (embedding <=> $1::vector) AS similarity
         FROM prompt_cache_v4
        WHERE tombstoned_at IS NULL
          AND domain_id = $2
          AND framework = $3
          AND provider  = $4
          AND COALESCE(style_profile_id, '') = COALESCE($5, '')
          AND created_at > now() - $7::interval
          AND embedding IS NOT NULL
          AND (embedding <=> $1::vector) <= $6
        ORDER BY embedding <=> $1::vector
        LIMIT 1`,
      [
        toPgVectorLiteral(embedding),
        filter.domainId,
        filter.framework,
        filter.provider,
        filter.styleProfileId ?? null,
        maxDistance,
        this.ttlInterval(),
      ],
    );
    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return { entry: rowToEntry(row), similarity: Number(row.similarity) };
  }

  async set(entry: CacheEntry): Promise<void> {
    await this.pool.query(
      `INSERT INTO prompt_cache_v4
         (fingerprint, intent, domain_id, framework, provider, provider_version,
          style_profile_id, response, embedding, hit_count, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::vector,$10, now())
       ON CONFLICT (fingerprint) DO UPDATE
         SET intent           = EXCLUDED.intent,
             domain_id        = EXCLUDED.domain_id,
             framework        = EXCLUDED.framework,
             provider         = EXCLUDED.provider,
             provider_version = EXCLUDED.provider_version,
             style_profile_id = EXCLUDED.style_profile_id,
             response         = EXCLUDED.response,
             embedding        = EXCLUDED.embedding,
             tombstoned_at    = NULL`,
      [
        entry.fingerprint,
        entry.intent,
        entry.domainId,
        entry.framework,
        entry.provider,
        entry.providerVersion ?? null,
        entry.styleProfileId ?? null,
        JSON.stringify(entry.response),
        entry.embedding ? toPgVectorLiteral(entry.embedding) : null,
        entry.hitCount,
      ],
    );
  }

  async delete(fingerprint: string): Promise<void> {
    await this.pool.query(
      `UPDATE prompt_cache_v4 SET tombstoned_at = now() WHERE fingerprint = $1`,
      [fingerprint],
    );
  }

  async invalidateProvider(provider: string, providerVersion?: string): Promise<number> {
    const res = providerVersion
      ? await this.pool.query(
          `UPDATE prompt_cache_v4 SET tombstoned_at = now()
             WHERE provider = $1 AND provider_version IS DISTINCT FROM $2
               AND tombstoned_at IS NULL`,
          [provider, providerVersion],
        )
      : await this.pool.query(
          `UPDATE prompt_cache_v4 SET tombstoned_at = now()
             WHERE provider = $1 AND tombstoned_at IS NULL`,
          [provider],
        );
    return res.rowCount ?? 0;
  }

  async topN(limit: number): Promise<readonly CacheEntry[]> {
    const res = await this.pool.query(
      `SELECT * FROM prompt_cache_v4
        WHERE tombstoned_at IS NULL
        ORDER BY hit_count DESC, last_hit_at DESC NULLS LAST
        LIMIT $1`,
      [limit],
    );
    return res.rows.map(rowToEntry);
  }
}
