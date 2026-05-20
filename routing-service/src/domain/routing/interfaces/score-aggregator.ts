import type { AggregationResult, RulesEvaluation, SimilarityCandidate } from '@/types/routing.js';
import type { FrameworkName } from '@/types/framework.js';

export interface ScoreAggregator {
  aggregate(input: {
    frameworks: FrameworkName[];
    semanticCandidates: SimilarityCandidate[];
    historicalCandidates: SimilarityCandidate[];
    rules: RulesEvaluation;
  }): AggregationResult;
}
