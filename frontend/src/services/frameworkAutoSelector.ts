import { Framework } from '@/types';

export interface FrameworkSelection {
  framework: Framework;
  confidence: number;
  reason: string;
}

const FRAMEWORK_ALIASES: Record<string, Framework> = {
  AUTO: Framework.AUTO,
  KERNEL: Framework.KERNEL,
  CO_STAR: Framework.COSTAR,
  COSTAR: Framework.COSTAR,
  RISEN: Framework.RISEN,
  RTF: Framework.RTF,
  BAB: Framework.BAB,
  TAG: Framework.TAG,
  CARE: Framework.CARE,
  REACT: Framework.REACT,
  CHAIN_OF_THOUGHT: Framework.CHAIN,
  COT: Framework.CHAIN,
  FIVE_WHYS: Framework.FIVEWHYS,
  SWAT: Framework.SWOT,
};

type Rule = {
  framework: Framework;
  weight: number;
  regexes: RegExp[];
  reason: string;
};

const RULES: Rule[] = [
  {
    framework: Framework.KERNEL,
    weight: 4,
    regexes: [
      /\b(api|backend|database|sql|schema|refactor|debug|bug|error|optimi[sz]e|performans|architecture|architecture)\b/i,
      /\b(test|unit test|integration|ci\/cd|pipeline|deployment)\b/i,
    ],
    reason: 'Teknik ve system odakli task for KERNEL en guvenilir cerceve.',
  },
  {
    framework: Framework.COSTAR,
    weight: 4,
    regexes: [
      /\b(marketing|campaign|landing page|copywriting|brand|tone|audience|persona|social)\b/i,
      /\b(hedef kitle|marka|kampanya|reklam|donusum)\b/i,
    ],
    reason: 'Kitle, ton ve baglam isteyen uretimler for CO-STAR daha uygun.',
  },
  {
    framework: Framework.BAB,
    weight: 5,
    regexes: [
      /\b(sales|cta|conversion|funnel|lead|teklif|ikna|satis)\b/i,
    ],
    reason: 'Ikna ve donusum hedefli metinlerde BAB daha etkili.',
  },
  {
    framework: Framework.RTF,
    weight: 3,
    regexes: [
      /\b(format|template|template|json|markdown|tablo|liste|output formati)\b/i,
      /\b(role|task|format)\b/i,
    ],
    reason: 'Rol-task-output yapisi net istenen gorevlerde RTF iyi result verir.',
  },
  {
    framework: Framework.TAG,
    weight: 3,
    regexes: [
      /\b(checklist|todo|ozet|summary|kisa|short|madde madde|bullet)\b/i,
    ],
    reason: 'Kisa, aksiyon odakli ve net output isteyen gorevlerde TAG uygun.',
  },
  {
    framework: Framework.CARE,
    weight: 3,
    regexes: [
      /\b(explain|teach|tutorial|nasil|ogret|adim adim|step by step)\b/i,
    ],
    reason: 'Ogretici ve aciklayici icerikler for CARE daha dengeli.',
  },
  {
    framework: Framework.REACT,
    weight: 4,
    regexes: [
      /\b(agent|tool|workflow|observe|act|reasoning loop|ajan)\b/i,
    ],
    reason: 'Ajan davranisi ve arac kullanimi isteyen gorevlerde ReAct uygun.',
  },
];

function domainBoost(domainId: string | undefined): Partial<Record<Framework, number>> {
  const d = (domainId || '').toLowerCase();
  if (['frontend', 'backend', 'devops', 'qa', 'security', 'data-science'].includes(d)) {
    return { [Framework.KERNEL]: 3, [Framework.RTF]: 1 };
  }
  if (['sales', 'seo', 'creative', 'customer-support'].includes(d)) {
    return { [Framework.COSTAR]: 2, [Framework.BAB]: 2, [Framework.CARE]: 1 };
  }
  if (['academic', 'pm', 'hr', 'legal'].includes(d)) {
    return { [Framework.RTF]: 2, [Framework.CARE]: 1, [Framework.TAG]: 1 };
  }
  return { [Framework.KERNEL]: 1 };
}

export function normalizeFrameworkCandidate(input?: string): Framework | null {
  if (!input) return null;
  const normalized = String(input).trim().toUpperCase().replace(/\s+/g, '_');
  return FRAMEWORK_ALIASES[normalized] ?? null;
}

export function selectFrameworkFromIntent(intent: string, domainId?: string): FrameworkSelection {
  const score = new Map<Framework, number>();
  const reasons = new Map<Framework, string[]>();
  const push = (framework: Framework, value: number, reason: string) => {
    score.set(framework, (score.get(framework) ?? 0) + value);
    reasons.set(framework, [...(reasons.get(framework) ?? []), reason]);
  };

  for (const rule of RULES) {
    for (const regex of rule.regexes) {
      if (regex.test(intent)) {
        push(rule.framework, rule.weight, rule.reason);
        break;
      }
    }
  }

  const boosts = domainBoost(domainId);
  for (const [framework, boost] of Object.entries(boosts)) {
    if (typeof boost === 'number' && boost > 0) {
      push(framework as Framework, boost, `Domain (${domainId || 'auto'}) uyumu.`);
    }
  }

  if (score.size === 0) {
    return {
      framework: Framework.KERNEL,
      confidence: 0.58,
      reason: 'Guclu bir sinyal bulunamadi, varsayilan olarak KERNEL secildi.',
    };
  }

  const sorted = [...score.entries()].sort((a, b) => b[1] - a[1]);
  const [winner, winnerScore] = sorted[0];
  const secondScore = sorted[1]?.[1] ?? 0;
  const delta = Math.max(0, winnerScore - secondScore);
  const confidence = Math.min(0.95, 0.62 + delta * 0.06);

  return {
    framework: winner,
    confidence,
    reason: (reasons.get(winner) ?? []).slice(0, 2).join(' '),
  };
}
