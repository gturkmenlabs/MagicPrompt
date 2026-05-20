import { FRAMEWORKS, type FrameworkName } from '@/types/framework.js';
import type { RuleMatch, RulesEvaluation } from '@/types/routing.js';
import type { RulesEngine } from '../interfaces/rules-engine.js';

type RuleDef = {
  framework: FrameworkName;
  weight: number;
  regexes: RegExp[];
  reason: string;
};

const RULES: RuleDef[] = [
  {
    framework: 'sql-agent',
    weight: 0.35,
    regexes: [/\b(sql|query|table|join|aggregation|metric|dashboard|report)\b/i],
    reason: 'SQL analytics intent signals',
  },
  {
    framework: 'code-agent',
    weight: 0.4,
    regexes: [/\b(code|repo|stack trace|exception|refactor|bug|memory leak|debug)\b/i],
    reason: 'Code debugging/development signals',
  },
  {
    framework: 'rag-agent',
    weight: 0.3,
    regexes: [/\b(document|pdf|contract|policy|handbook|knowledge base)\b/i],
    reason: 'Document retrieval/grounding signals',
  },
  {
    framework: 'search-agent',
    weight: 0.3,
    regexes: [/\b(latest|news|current|today|recent|price|release|announcement|web)\b/i],
    reason: 'Fresh web information signals',
  },
  {
    framework: 'summarizer-agent',
    weight: 0.35,
    regexes: [/\b(summarize|summary|bullet points|action items|extract tasks|meeting notes)\b/i],
    reason: 'Summarization/extraction signals',
  },
  {
    framework: 'workflow-agent',
    weight: 0.35,
    regexes: [/\b(multi-step|integrate|sync|send|update|orchestrate|pipeline|workflow)\b/i],
    reason: 'Workflow orchestration signals',
  },
];

function emptyScoreMap(): Record<FrameworkName, number> {
  return FRAMEWORKS.reduce(
    (acc, framework) => ({ ...acc, [framework]: 0 }),
    {} as Record<FrameworkName, number>
  );
}

export class KeywordRulesEngine implements RulesEngine {
  evaluate(inputText: string): RulesEvaluation {
    const scoreByFramework = emptyScoreMap();
    const matches: RuleMatch[] = [];

    for (const rule of RULES) {
      for (const regex of rule.regexes) {
        if (!regex.test(inputText)) continue;
        scoreByFramework[rule.framework] += rule.weight;
        matches.push({
          framework: rule.framework,
          weight: rule.weight,
          pattern: regex.source,
          reason: rule.reason,
        });
      }
    }

    // Ambiguous high-level requests should keep an orchestrator prior.
    if (matches.length === 0 || /\b(help|assist|plan|strategy)\b/i.test(inputText)) {
      scoreByFramework['general-orchestrator'] += 0.15;
    }

    return { scoreByFramework, matches };
  }
}
