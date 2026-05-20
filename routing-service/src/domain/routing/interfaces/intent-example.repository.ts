import type { IntentExample } from '../entities/intent-example.js';

export interface IntentExampleRepository {
  listAll(): Promise<IntentExample[]>;
}
