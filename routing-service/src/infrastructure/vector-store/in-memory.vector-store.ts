import type {
  VectorRecord,
  VectorSearchQuery,
  VectorSearchResult,
  VectorStore,
} from '../../domain/routing/interfaces/vector-store.js';

type StoredRecord = VectorRecord;

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let an = 0;
  let bn = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    an += a[i] * a[i];
    bn += b[i] * b[i];
  }
  if (an === 0 || bn === 0) return 0;
  return dot / (Math.sqrt(an) * Math.sqrt(bn));
}

export class InMemoryVectorStore implements VectorStore {
  private readonly store = new Map<string, StoredRecord>();

  async upsert(records: VectorRecord[]): Promise<void> {
    for (const record of records) {
      this.store.set(`${record.namespace}:${record.id}`, record);
    }
  }

  async similaritySearch(query: VectorSearchQuery): Promise<VectorSearchResult[]> {
    const candidates = [...this.store.values()].filter((r) => r.namespace === query.namespace);
    return candidates
      .map((r) => ({
        id: r.id,
        score: cosineSimilarity(query.vector, r.vector),
        metadata: r.metadata,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, query.topK);
  }
}
