/**
 * AIProviderFactory — Singleton registry for all AI provider adapters.
 *
 * Usage:
 *   AIProviderFactory.getInstance().register('openai', new OpenAIAdapter());
 *   const adapter = AIProviderFactory.getInstance().getAdapter('openai');
 *   const result  = await adapter.generateCompletion('Hello');
 */
import type { IAIProviderAdapter } from './IAIProviderAdapter';

export class AIProviderFactory {
  private static instance: AIProviderFactory;
  private adapters: Map<string, IAIProviderAdapter> = new Map();

  private constructor() {}

  public static getInstance(): AIProviderFactory {
    if (!AIProviderFactory.instance) {
      AIProviderFactory.instance = new AIProviderFactory();
    }
    return AIProviderFactory.instance;
  }

  /** Register or replace an adapter under a case-insensitive name. */
  public register(name: string, adapter: IAIProviderAdapter): void {
    this.adapters.set(name.toLowerCase(), adapter);
  }

  /** Retrieve a registered adapter. Throws if the name is unknown. */
  public getAdapter(name: string): IAIProviderAdapter {
    const adapter = this.adapters.get(name.toLowerCase());
    if (!adapter) {
      throw new Error(
        `AI provider [${name}] is not registered. ` +
          `Registered: [${[...this.adapters.keys()].join(', ')}]`,
      );
    }
    return adapter;
  }

  /** Returns true if an adapter is registered under the given name. */
  public has(name: string): boolean {
    return this.adapters.has(name.toLowerCase());
  }

  /** List all registered provider names. */
  public listProviders(): string[] {
    return [...this.adapters.keys()];
  }

  /** Remove a specific adapter (useful in tests). */
  public unregister(name: string): void {
    this.adapters.delete(name.toLowerCase());
  }

  /** Reset all adapters — for testing only. */
  public reset(): void {
    this.adapters.clear();
  }
}

// ── Stub adapters (replace with real SDK wrappers when migrating services) ──

/** Stub wiring existing unifiedProviderClient until full migration. */
export class StubAdapter implements IAIProviderAdapter {
  constructor(private readonly label: string) {}

  async generateCompletion(prompt: string): Promise<string> {
    throw new Error(
      `StubAdapter[${this.label}]: real implementation not yet wired. ` +
        `Prompt received: "${prompt.slice(0, 40)}..."`,
    );
  }
}
