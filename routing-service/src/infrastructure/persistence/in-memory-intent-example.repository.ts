import type { IntentExample } from '../../domain/routing/entities/intent-example.js';
import type { IntentExampleRepository } from '../../domain/routing/interfaces/intent-example.repository.js';

export class InMemoryIntentExampleRepository implements IntentExampleRepository {
  constructor(private readonly items: IntentExample[]) {}

  async listAll(): Promise<IntentExample[]> {
    return this.items;
  }
}
