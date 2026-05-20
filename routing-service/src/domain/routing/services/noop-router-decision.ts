import type { RouterDecisionLayer } from '../interfaces/router-decision-layer.js';
import type { FrameworkName } from '@/types/framework.js';

export class NoopRouterDecisionLayer implements RouterDecisionLayer {
  async decide(): Promise<FrameworkName | null> {
    return null;
  }
}
