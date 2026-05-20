import type { AggregatedFrameworkScore, SimilarityCandidate, RuleMatch } from '@/types/routing.js';
import type { FrameworkName } from '@/types/framework.js';

export interface RoutingDecisionRecord {
  requestId: string;
  promptHash: string;
  promptPreview: string;
  degradedMode: boolean;
  semanticCandidates: SimilarityCandidate[];
  historicalCandidates: SimilarityCandidate[];
  matchedRules: RuleMatch[];
  scoreBreakdown: AggregatedFrameworkScore[];
  selectedFramework: FrameworkName;
  confidence: number;
  fallbackFramework: FrameworkName;
  timestamp: string;
}

export interface RoutingDecisionLogger {
  logDecision(record: RoutingDecisionRecord): void;
}
