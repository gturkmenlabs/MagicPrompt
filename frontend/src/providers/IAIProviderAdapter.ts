/**
 * Canonical AI provider contract — all adapters must satisfy this interface.
 * Enforces a uniform surface across OpenAI, Claude, Gemini, Groq, etc.
 */
export interface IAIProviderAdapter {
  /**
   * One-shot completion. Returns the full response text.
   */
  generateCompletion(
    prompt: string,
    config?: Record<string, unknown>,
  ): Promise<string>;

  /**
   * Streaming completion. Each yielded string is an incremental chunk.
   * Implement as `async function*` for SSE / real-time UIs.
   */
  streamCompletion?(
    prompt: string,
    config?: Record<string, unknown>,
  ): AsyncGenerator<string>;
}
