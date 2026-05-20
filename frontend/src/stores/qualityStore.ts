import { create } from 'zustand';
import type { JudgeResult } from '@/services/judgeEnsemble';
import type { LintResult } from '@/services/promptLint';
import type { BudgetAnalysis } from '@/services/budgetOptimizer';
import type { ProvenanceRecord } from '@/types/provenance';

export interface EnrichmentMetrics {
  ambiguityBefore: number;
  ambiguityAfter: number;
  promptsIntegrated: number;
  tokensAdded: number;
  durationMs: number;
}

export interface QualityState {
  showQualityPanel: boolean;
  judgeResult: JudgeResult | null;
  lintResult: LintResult | null;
  budgetAnalysis: BudgetAnalysis | null;
  provenance: ProvenanceRecord | null;
  lastCacheHit: boolean;
  enrichmentMetrics: EnrichmentMetrics | null;
}

interface QualityActions {
  toggleQualityPanel: () => void;
  setJudgeResult: (result: JudgeResult | null) => void;
  setLintResult: (result: LintResult | null) => void;
  setBudgetAnalysis: (analysis: BudgetAnalysis | null) => void;
  setProvenance: (record: ProvenanceRecord | null) => void;
  setCacheHit: (hit: boolean) => void;
  setEnrichmentMetrics: (metrics: EnrichmentMetrics | null) => void;
  resetQuality: () => void;
}

export const useQualityStore = create<QualityState & QualityActions>((set) => ({
  showQualityPanel: false,
  judgeResult: null,
  lintResult: null,
  budgetAnalysis: null,
  provenance: null,
  lastCacheHit: false,
  enrichmentMetrics: null,

  toggleQualityPanel: () => set((s) => ({ showQualityPanel: !s.showQualityPanel })),
  setJudgeResult: (judgeResult) => set({ judgeResult }),
  setLintResult: (lintResult) => set({ lintResult }),
  setBudgetAnalysis: (budgetAnalysis) => set({ budgetAnalysis }),
  setProvenance: (provenance) => set({ provenance }),
  setCacheHit: (lastCacheHit) => set({ lastCacheHit }),
  setEnrichmentMetrics: (enrichmentMetrics) => set({ enrichmentMetrics }),
  resetQuality: () => set({
    judgeResult: null,
    lintResult: null,
    budgetAnalysis: null,
    provenance: null,
    lastCacheHit: false,
    enrichmentMetrics: null,
  }),
}));
