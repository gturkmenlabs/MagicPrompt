/**
 * Prompt Provenance — Izlenebilirlik.
 * @see docs/PROMPT_LEADERSHIP_ROADMAP.md §9
 *
 * Her prompt for: hangi kurallar, sablonlar, netlestirmeler uygulandi.
 */

export interface ProvenanceRecord {
  /** Uygulanan framework */
  framework: string;
  /** Uygulanan domain kurallari */
  domainId: string;
  domainRules: string;
  /** IR pipeline kullanildi mi */
  irPipelineUsed: boolean;
  /** Guardrail bloklari eklendi mi */
  guardrailsApplied: string[];
  /** Style profili kullanildi mi */
  styleProfileId?: string;
  styleProfileName?: string;
  /** Uygulanan kisitlar */
  constraintsApplied: string[];
  /** security politikalari */
  securityPolicies: string[];
  /** Stop conditions */
  stopConditions: string[];
  /** Cache hit mi? */
  cacheHit: boolean;
  /** Provider ve model */
  provider: string;
  model?: string;
  /** operation zamani (ms) */
  durationMs: number;
  /** Olusturulma zamani */
  createdAt: string;
}

/**
 * PromptResponse'a provenance eklemek for genisletilmis tip.
 */
export interface ProvenanceEnrichedResponse {
  masterPrompt: string;
  reasoning: string;
  provenance: ProvenanceRecord;
  /** Judge Ensemble sonuclari */
  judgeResult?: {
    totalScore: number;
    scores: Array<{ criterionId: string; score: number }>;
    passThreshold: boolean;
    suggestions: string[];
  };
  /** Lint sonuclari */
  lintResult?: {
    passed: boolean;
    totalErrors: number;
    totalWarnings: number;
    issues: Array<{ ruleId: string; severity: string; message: string }>;
  };
  /** Budget analizi */
  budgetAnalysis?: {
    totalTokens: number;
    estimatedCostUsd: number;
    savedPercentage: number;
  };
}
