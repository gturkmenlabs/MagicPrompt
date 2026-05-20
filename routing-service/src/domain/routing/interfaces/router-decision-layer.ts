import type { CandidateFramework, FrameworkName } from '@/types/framework.js';
import type { RoutePromptInput } from '@/types/routing.js';

export interface RouterDecisionLayer {
  decide(input: {
    request: RoutePromptInput;
    candidates: CandidateFramework[];
  }): Promise<FrameworkName | null>;
}
