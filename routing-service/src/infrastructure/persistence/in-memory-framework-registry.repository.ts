import type { FrameworkRegistryItem } from '../../domain/routing/entities/framework-registry.js';
import type { FrameworkRegistryRepository } from '../../domain/routing/interfaces/framework-registry.repository.js';

export class InMemoryFrameworkRegistryRepository implements FrameworkRegistryRepository {
  constructor(private readonly items: FrameworkRegistryItem[]) {}

  async listAll(): Promise<FrameworkRegistryItem[]> {
    return this.items;
  }
}
