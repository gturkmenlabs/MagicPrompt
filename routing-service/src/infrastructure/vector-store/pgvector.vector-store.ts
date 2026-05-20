import { Pool } from 'pg';
import type {
  VectorRecord,
  VectorSearchQuery,
  VectorSearchResult,
  VectorStore,
} from '../../domain/routing/interfaces/vector-store.js';

function toPgVector(values: number[]): string {
  return `[${values.join(',')}]`;
}

export class PgVectorStore implements VectorStore {
  private readonly pool: Pool;

  constructor(connectionString: string, private readonly tableName: string) {
    this.pool = new Pool({ connectionString });
  }

  async ensureSchema(vectorDimension: number): Promise<void> {
    await this.pool.query(`CREATE EXTENSION IF NOT EXISTS vector;`);
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS ${this.tableName} (
        namespace TEXT NOT NULL,
        id TEXT NOT NULL,
        embedding vector(${vectorDimension}) NOT NULL,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        PRIMARY KEY(namespace, id)
      );
    `);
    await this.pool.query(`
      CREATE INDEX IF NOT EXISTS ${this.tableName}_namespace_idx
      ON ${this.tableName} (namespace);
    `);
  }

  async upsert(records: VectorRecord[]): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      for (const r of records) {
        await client.query(
          `
            INSERT INTO ${this.tableName}(namespace, id, embedding, metadata)
            VALUES ($1, $2, $3::vector, $4::jsonb)
            ON CONFLICT(namespace, id)
            DO UPDATE SET embedding = EXCLUDED.embedding, metadata = EXCLUDED.metadata
          `,
          [r.namespace, r.id, toPgVector(r.vector), JSON.stringify(r.metadata ?? {})]
        );
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async similaritySearch(query: VectorSearchQuery): Promise<VectorSearchResult[]> {
    const result = await this.pool.query<{
      id: string;
      score: number;
      metadata: Record<string, unknown>;
    }>(
      `
      SELECT id, (1 - (embedding <=> $2::vector)) AS score, metadata
      FROM ${this.tableName}
      WHERE namespace = $1
      ORDER BY embedding <=> $2::vector ASC
      LIMIT $3
    `,
      [query.namespace, toPgVector(query.vector), query.topK]
    );

    return result.rows.map((r) => ({
      id: r.id,
      score: Number(r.score),
      metadata: r.metadata,
    }));
  }
}
