export interface EmbeddingProvider {
  readonly providerName: string;
  embedText(input: string): Promise<number[]>;
}
