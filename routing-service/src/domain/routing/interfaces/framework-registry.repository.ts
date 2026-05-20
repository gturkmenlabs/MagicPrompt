import type { FrameworkRegistryItem } from '../entities/framework-registry.js';

export interface FrameworkRegistryRepository {
  listAll(): Promise<FrameworkRegistryItem[]>;
}
