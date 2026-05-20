export type VectorRecord = {
  namespace: string;
  id: string;
  vector: number[];
  metadata?: Record<string, unknown>;
};

export type VectorSearchQuery = {
  namespace: string;
  vector: number[];
  topK: number;
};

export type VectorSearchResult = {
  id: string;
  score: number;
  metadata?: Record<string, unknown>;
};

export interface VectorStore {
  upsert(records: VectorRecord[]): Promise<void>;
  similaritySearch(query: VectorSearchQuery): Promise<VectorSearchResult[]>;
}
