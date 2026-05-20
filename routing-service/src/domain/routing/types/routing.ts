import type { FrameworkName, CandidateFramework } from './framework.js';

export type ConversationTurn = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

export type AttachmentHint = {
  name?: string;
  mimeType?: string;
  textHint?: string;
};

export type RoutingMetadata = {
  userId?: string;
  locale?: string;
  channel?: string;
  [key: string]: unknown;
};

export type RoutePromptInput = {
  prompt: string;
  conversationContext: ConversationTurn[];
  attachments: AttachmentHint[];
  metadata: RoutingMetadata;
};

export type RoutePromptOutput = {
  selectedFramework: FrameworkName;
  confidence: number;
  reasoning: string[];
  fallbackFramework: FrameworkName;
  candidateFrameworks: CandidateFramework[];
};

export type RuleMatch = {
  framework: FrameworkName;
  weight: number;
  pattern: string;
  reason: string;
};

export type RulesEvaluation = {
  scoreByFramework: Record<FrameworkName, number>;
  matches: RuleMatch[];
};

export type SimilarityCandidate = {
  id: string;
  framework: FrameworkName;
  score: number;
  source: 'framework-registry' | 'intent-examples';
  metadata?: Record<string, unknown>;
};

export type AggregatedFrameworkScore = {
  framework: FrameworkName;
  semanticScore: number;
  ruleScore: number;
  historicalIntentScore: number;
  consistencyBonus: number;
  ambiguityPenalty: number;
  finalScore: number;
};

export type AggregationResult = {
  candidates: CandidateFramework[];
  confidence: number;
  selectedFramework: FrameworkName;
  scoreBreakdown: AggregatedFrameworkScore[];
  reasoning: string[];
  confidenceDetails: {
    topScore: number;
    secondScore: number;
    scoreGap: number;
    evidenceAgreement: number;
  };
};
