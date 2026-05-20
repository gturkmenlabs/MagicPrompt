import type { EmbeddingProvider } from '../../domain/routing/interfaces/embedding-provider.js';

function tokenize(input: string): string[] {
  return input.toLowerCase().replace(/[^a-z0-9gusociIGUSOC\s-]/gi, ' ').split(/\s+/).filter(Boolean);
}

function hashToken(token: string, dim: number): number {
  let h = 2166136261;
  for (let i = 0; i < token.length; i++) {
    h ^= token.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) % dim;
}

export class MockEmbeddingProvider implements EmbeddingProvider {
  readonly providerName = 'mock';

  constructor(private readonly dimension = 128) {}

  async embedText(input: string): Promise<number[]> {
    const vector = new Array<number>(this.dimension).fill(0);
    const tokens = tokenize(input);
    if (tokens.length === 0) return vector;

    for (const t of tokens) {
      const idx = hashToken(t, this.dimension);
      vector[idx] += 1;
    }

    const norm = Math.sqrt(vector.reduce((acc, v) => acc + v * v, 0));
    if (norm === 0) return vector;
    return vector.map((v) => v / norm);
  }
}
