import type { EmbeddingProvider } from '../../domain/routing/interfaces/embedding-provider.js';

type GeminiResponse = {
  embedding?: {
    values?: number[];
  };
};

export class GeminiEmbeddingProvider implements EmbeddingProvider {
  readonly providerName = 'gemini-embedding-2';

  constructor(
    private readonly apiKey: string,
    private readonly model: string
  ) {}

  async embedText(input: string): Promise<number[]> {
    if (!this.apiKey) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:embedContent?key=${this.apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: {
          parts: [{ text: input }],
        },
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Gemini embedding request failed (${response.status}): ${body.slice(0, 200)}`);
    }

    const data = (await response.json()) as GeminiResponse;
    const vector = data.embedding?.values;
    if (!vector || !Array.isArray(vector) || vector.length === 0) {
      throw new Error('Gemini embedding response is missing vector values');
    }
    return vector;
  }
}
