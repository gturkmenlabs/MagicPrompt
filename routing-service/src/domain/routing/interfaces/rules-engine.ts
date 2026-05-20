import type { RulesEvaluation } from '@/types/routing.js';

export interface RulesEngine {
  evaluate(inputText: string): RulesEvaluation;
}
