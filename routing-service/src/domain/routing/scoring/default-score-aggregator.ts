import type { ScoreAggregator } from '../interfaces/score-aggregator.js';
import type {
  AggregatedFrameworkScore,
  AggregationResult,
  RulesEvaluation,
  SimilarityCandidate,
} from '@/types/routing.js';
import type { FrameworkName } from '@/types/framework.js';

function normalizeSemantic(candidates: SimilarityCandidate[]): Map<FrameworkName, number> {
  const m = new Map<FrameworkName, number>();
  for (const c of candidates) {
    const prev = m.get(c.framework) ?? 0;
    m.set(c.framework, Math.max(prev, c.score));
  }
  return m;
}

function normalizeRuleScore(rules: RulesEvaluation, framework: FrameworkName): number {
  const raw = rules.scoreByFramework[framework] ?? 0;
  return Math.max(0, Math.min(1, raw));
}

export class DefaultScoreAggregator implements ScoreAggregator {
  aggregate(input: {
    frameworks: FrameworkName[];
    semanticCandidates: SimilarityCandidate[];
    historicalCandidates: SimilarityCandidate[];
    rules: RulesEvaluation;
  }): AggregationResult {
    const semanticMap = normalizeSemantic(input.semanticCandidates);
    const historyMap = normalizeSemantic(input.historicalCandidates);
    const maxSemanticFramework = input.semanticCandidates[0]?.framework;
    const maxRuleFramework = Object.entries(input.rules.scoreByFramework).sort((a, b) => b[1] - a[1])[0]?.[0] as FrameworkName | undefined;

    const breakdown: AggregatedFrameworkScore[] = input.frameworks.map((framework) => {
      const semanticScore = semanticMap.get(framework) ?? 0;
      const historicalIntentScore = historyMap.get(framework) ?? 0;
      const ruleScore = normalizeRuleScore(input.rules, framework);
      const aligned = framework === maxSemanticFramework && framework === maxRuleFramework;
      const consistencyBonus = aligned ? 0.08 : 0;

      // Hybrid score formula:
      // final = semantic*0.5 + rules*0.3 + history*0.2 + bonus - ambiguityPenalty
      const base = semanticScore * 0.5 + ruleScore * 0.3 + historicalIntentScore * 0.2 + consistencyBonus;
      return {
        framework,
        semanticScore,
        ruleScore,
        historicalIntentScore,
        consistencyBonus,
        ambiguityPenalty: 0,
        finalScore: base,
      };
    });

    const sorted = [...breakdown].sort((a, b) => b.finalScore - a.finalScore);
    const top = sorted[0];
    const second = sorted[1];
    const scoreGap = Math.max(0, (top?.finalScore ?? 0) - (second?.finalScore ?? 0));

    // Apply ambiguity penalty on close candidates.
    if (top && scoreGap < 0.08) {
      top.ambiguityPenalty = 0.06;
      top.finalScore = Math.max(0, top.finalScore - top.ambiguityPenalty);
    }

    const finalSorted = [...sorted].sort((a, b) => b.finalScore - a.finalScore);
    const selected = finalSorted[0];
    const evidenceAgreement = selected && selected.semanticScore > 0.5 && selected.ruleScore > 0.2 ? 1 : 0;
    const confidence = Math.max(
      0,
      Math.min(
        1,
        (selected?.finalScore ?? 0) * 0.8 +
          Math.min(0.15, scoreGap * 0.8) +
          evidenceAgreement * 0.05
      )
    );

    const candidates = finalSorted.slice(0, 5).map((s) => ({
      name: s.framework,
      score: Number(s.finalScore.toFixed(4)),
    }));

    const reasoning = [
      `Top semantic candidate: ${maxSemanticFramework ?? 'none'}.`,
      `Top rules candidate: ${maxRuleFramework ?? 'none'}.`,
      scoreGap < 0.08
        ? 'Top candidates are close; ambiguity penalty applied.'
        : `Score gap is clear (${scoreGap.toFixed(2)}).`,
    ];

    return {
      selectedFramework: selected?.framework ?? 'general-orchestrator',
      confidence: Number(confidence.toFixed(4)),
      candidates,
      scoreBreakdown: finalSorted,
      reasoning,
      confidenceDetails: {
        topScore: Number((finalSorted[0]?.finalScore ?? 0).toFixed(4)),
        secondScore: Number((finalSorted[1]?.finalScore ?? 0).toFixed(4)),
        scoreGap: Number(scoreGap.toFixed(4)),
        evidenceAgreement,
      },
    };
  }
}
