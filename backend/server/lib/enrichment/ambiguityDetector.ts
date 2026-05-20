/**
 * Ambiguity Detector — Master prompt'taki belirsizlikleri tespit eder.
 * promptLint.ts ile ayni pattern: kural dizisi -> gap listesi -> skor hesaplama.
 */

import type {
  AmbiguityGap,
  AmbiguityReport,
  AmbiguitySeverity,
  SectionScore,
} from '@/types/enrichment';

// ---------- Section Parser ----------

interface ParsedSection {
  name: 'SYSTEM' | 'DEVELOPER' | 'USER' | 'GLOBAL';
  content: string;
  startIndex: number;
}

export function parseSections(prompt: string): ParsedSection[] {
  const sectionPattern = /^##\s*(SYSTEM|DEVELOPER|USER)\b/gim;
  const matches: Array<{ name: string; index: number }> = [];
  let m: RegExpExecArray | null;

  while ((m = sectionPattern.exec(prompt)) !== null) {
    const sectionName = m[1];
    if (!sectionName) continue;
    matches.push({ name: sectionName.toUpperCase(), index: m.index });
  }

  if (matches.length === 0) {
    return [{ name: 'GLOBAL', content: prompt, startIndex: 0 }];
  }

  const sections: ParsedSection[] = [];
  const firstMatch = matches[0];
  if (!firstMatch) {
    return [{ name: 'GLOBAL', content: prompt, startIndex: 0 }];
  }

  // Content before first section heading
  if (firstMatch.index > 0) {
    const pre = prompt.slice(0, firstMatch.index).trim();
    if (pre) sections.push({ name: 'GLOBAL', content: pre, startIndex: 0 });
  }

  for (let i = 0; i < matches.length; i++) {
    const current = matches[i];
    if (!current) continue;
    const next = i + 1 < matches.length ? matches[i + 1] : undefined;
    const end = next ? next.index : prompt.length;
    const content = prompt.slice(current.index, end).trim();
    sections.push({
      name: current.name as ParsedSection['name'],
      content,
      startIndex: current.index,
    });
  }

  return sections;
}

function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

// ---------- Rule Types ----------

type AmbiguityRule = (prompt: string, sections: ParsedSection[], domainId?: string) => AmbiguityGap[];

let gapCounter = 0;
function nextGapId(): string {
  return `gap-${++gapCounter}`;
}

export function resetGapCounter(): void {
  gapCounter = 0;
}

// ---------- R1: Vague Instructions ----------

const ruleVagueInstructions: AmbiguityRule = (prompt) => {
  const gaps: AmbiguityGap[] = [];
  const patterns = [
    { re: /\b(handle appropriately|as needed|gerektigi gibi|uygun sekilde|when necessary|gerektiginde)\b/gi, lang: 'both' },
    { re: /\b(do whatever|make it good|en iyisini yap|iyi bir sekilde)\b/gi, lang: 'both' },
    { re: /\b(etc\.?|vb\.?|ve benzeri|and so on|and more)\b/gi, lang: 'both' },
  ];

  for (const { re } of patterns) {
    let match: RegExpExecArray | null;
    while ((match = re.exec(prompt)) !== null) {
      gaps.push({
        id: nextGapId(),
        type: 'vague_instruction',
        section: 'GLOBAL',
        severity: 'medium',
        description: `Vague instruction detected: "${match[0]}". Replace with specific, measurable actions.`,
        descriptionTr: `Belirsiz talimat tespit edildi: "${match[0]}". Spesifik, olculebilir eylemlerle degistirin.`,
        excerpt: match[0],
        searchQuery: `specific instructions best practices ${match[0]}`,
      });
    }
  }

  return gaps;
};

// ---------- R2: Missing Domain Context ----------

const DOMAIN_KEYWORDS: Record<string, string[]> = {
  frontend: ['component', 'react', 'css', 'dom', 'bundle', 'cwv', 'lcp', 'cls', 'accessibility', 'wcag', 'responsive'],
  backend: ['api', 'endpoint', 'database', 'rest', 'graphql', 'middleware', 'authentication', 'rate limit', 'solid'],
  testing: ['test', 'coverage', 'unit', 'integration', 'e2e', 'mock', 'assertion', 'owasp'],
  'ui-design': ['design', 'token', 'color', 'typography', 'spacing', 'wireframe', 'figma', 'atomic'],
  architecture: ['microservice', 'monolith', 'event-driven', 'cqrs', 'ddd', 'cap', 'scalab', 'distributed'],
  analysis: ['requirement', 'user story', 'acceptance criteria', 'moscow', 'stakeholder', 'srs'],
  'image-video': ['prompt', 'style', 'lighting', 'composition', 'negative prompt', 'camera', 'render'],
};

const ruleMissingContext: AmbiguityRule = (_prompt, _sections, domainId) => {
  if (!domainId || domainId === 'auto' || domainId === 'general') return [];

  const keywords = DOMAIN_KEYWORDS[domainId];
  if (!keywords) return [];

  const lowerPrompt = _prompt.toLowerCase();
  const found = keywords.filter((kw) => lowerPrompt.includes(kw));
  const coverage = found.length / keywords.length;

  if (coverage < 0.2) {
    return [{
      id: nextGapId(),
      type: 'missing_context',
      section: 'GLOBAL',
      severity: 'high',
      description: `Domain "${domainId}" selected but prompt lacks domain-specific context (${found.length}/${keywords.length} keywords found).`,
      descriptionTr: `"${domainId}" alani secili ama prompt alan-spesifik baglamdan yoksun (${found.length}/${keywords.length} anahtar kelime bulundu).`,
      searchQuery: `${domainId} best practices guidelines`,
    }];
  }

  return [];
};

// ---------- R3: Undefined Variables ----------

const ruleUndefinedVariables: AmbiguityRule = (prompt) => {
  const gaps: AmbiguityGap[] = [];
  const patterns = [
    /\{\{[^}]*\}\}/g,
    /\[TODO\]/gi,
    /\[TBD\]/gi,
    /<INSERT[^>]*>/gi,
    /\[PLACEHOLDER\]/gi,
  ];

  for (const re of patterns) {
    let match: RegExpExecArray | null;
    while ((match = re.exec(prompt)) !== null) {
      gaps.push({
        id: nextGapId(),
        type: 'undefined_variable',
        section: 'GLOBAL',
        severity: 'high',
        description: `Undefined variable/placeholder: "${match[0]}"`,
        descriptionTr: `Tanimsiz variable/yer tutucu: "${match[0]}"`,
        excerpt: match[0],
        searchQuery: `template variable definition ${match[0].replace(/[{}\[\]<>]/g, '')}`,
      });
    }
  }

  return gaps;
};

// ---------- R4: Thin Sections ----------

const SECTION_MIN_WORDS: Record<string, number> = {
  SYSTEM: 30,
  DEVELOPER: 50,
  USER: 20,
  GLOBAL: 50,
};

const ruleThinSections: AmbiguityRule = (_prompt, sections) => {
  const gaps: AmbiguityGap[] = [];

  for (const select of sections) {
    const wc = wordCount(select.content);
    const minWords = SECTION_MIN_WORDS[select.name] ?? 30;

    if (wc < minWords) {
      gaps.push({
        id: nextGapId(),
        type: 'thin_section',
        section: select.name,
        severity: 'medium',
        description: `Section "${select.name}" is thin (${wc} words, minimum recommended: ${minWords}).`,
        descriptionTr: `"${select.name}" bolumu ince (${wc} kelime, onerilen minimum: ${minWords}).`,
        searchQuery: `${select.name.toLowerCase()} section prompt engineering best practices`,
      });
    }
  }

  return gaps;
};

// ---------- R5: Missing Best Practices ----------

const DOMAIN_BEST_PRACTICES: Record<string, { keywords: string[]; label: string }> = {
  frontend: { keywords: ['cwv', 'core web vitals', 'lcp', 'accessibility', 'wcag', 'semantic html', 'lazy load'], label: 'Frontend' },
  backend: { keywords: ['solid', 'rate limit', 'authentication', 'authorization', 'error handling', 'logging', 'validation'], label: 'Backend' },
  testing: { keywords: ['coverage', 'test pyramid', 'unit test', 'integration', 'mock', 'edge case'], label: 'Testing' },
  architecture: { keywords: ['scalab', 'fault tolerance', 'observability', 'monitoring', 'ci/cd', 'twelve-factor', '12-factor'], label: 'Architecture' },
};

const ruleMissingBestPractice: AmbiguityRule = (prompt, _sections, domainId) => {
  if (!domainId || domainId === 'auto' || domainId === 'general') return [];

  const practices = DOMAIN_BEST_PRACTICES[domainId];
  if (!practices) return [];

  const lowerPrompt = prompt.toLowerCase();
  const missing = practices.keywords.filter((kw) => !lowerPrompt.includes(kw));

  if (missing.length >= practices.keywords.length * 0.6) {
    return [{
      id: nextGapId(),
      type: 'missing_best_practice',
      section: 'DEVELOPER',
      severity: 'medium',
      description: `Missing ${practices.label} best practices: ${missing.slice(0, 3).join(', ')}...`,
      descriptionTr: `Eksik ${practices.label} best practice'leri: ${missing.slice(0, 3).join(', ')}...`,
      searchQuery: `${practices.label} best practices ${missing.slice(0, 2).join(' ')}`,
    }];
  }

  return [];
};

// ---------- R6: Missing Guardrails ----------

const ruleMissingGuardrails: AmbiguityRule = (prompt) => {
  const gaps: AmbiguityGap[] = [];
  const lowerPrompt = prompt.toLowerCase();

  const checks = [
    { test: /injection|enjeksiyon|prompt injection/i, label: 'injection defense', labelTr: 'injection savunmasi', query: 'prompt injection defense guardrail' },
    { test: /pii|personal data|kisisel veri|gdpr|kvkk/i, label: 'PII protection', labelTr: 'PII korumasi', query: 'PII data protection prompt guardrail' },
    { test: /unauthorized|yetkisiz|reject|reddet|refuse/i, label: 'unauthorized rejection', labelTr: 'yetkisiz istek reddi', query: 'unauthorized request rejection prompt security' },
  ];

  const missing = checks.filter((c) => !c.test.test(lowerPrompt));

  if (missing.length >= 2) {
    gaps.push({
      id: nextGapId(),
      type: 'missing_guardrails',
      section: 'SYSTEM',
      severity: 'high',
      description: `Missing guardrails: ${missing.map((m) => m.label).join(', ')}.`,
      descriptionTr: `Eksik korumalar: ${missing.map((m) => m.labelTr).join(', ')}.`,
      searchQuery: missing[0]?.query ?? 'prompt security guardrail best practices',
    });
  }

  return gaps;
};

// ---------- R7: Generic Role ----------

const ruleGenericRole: AmbiguityRule = (prompt) => {
  const genericRoles = [
    /you are a helpful assistant/i,
    /sen yardimci bir asistansin/i,
    /you are an ai assistant/i,
    /sen bir yapay zeka asistanisin/i,
  ];

  for (const re of genericRoles) {
    const match = prompt.match(re);
    if (match) {
      // Check if there's additional role specificity
      const hasSpecificity = /expert|specialist|senior|lead|principal|architect|engineer|uzman|kidemli|mimar|muhendis/i.test(prompt);
      if (!hasSpecificity) {
        return [{
          id: nextGapId(),
          type: 'generic_role',
          section: 'SYSTEM',
          severity: 'medium',
          description: `Generic role detected: "${match[0]}". Define a specific expert role for better output.`,
          descriptionTr: `Jenerik rol tespit edildi: "${match[0]}". Daha iyi output for spesifik uzman rolu tanimlayin.`,
          excerpt: match[0],
          searchQuery: 'expert role definition system prompt specialist',
        }];
      }
    }
  }

  return [];
};

// ---------- Rule Registry ----------

const ALL_RULES: AmbiguityRule[] = [
  ruleVagueInstructions,
  ruleMissingContext,
  ruleUndefinedVariables,
  ruleThinSections,
  ruleMissingBestPractice,
  ruleMissingGuardrails,
  ruleGenericRole,
];

// ---------- Score Calculation ----------

const SEVERITY_WEIGHT: Record<AmbiguitySeverity, number> = {
  high: 15,
  medium: 8,
  low: 3,
};

function calculateAmbiguityScore(gaps: AmbiguityGap[]): number {
  if (gaps.length === 0) return 0;

  let weightedSum = 0;
  for (const gap of gaps) {
    weightedSum += SEVERITY_WEIGHT[gap.severity];
  }

  // 0-100 scale, capped
  return Math.min(100, weightedSum);
}

function calculateSectionScores(sections: ParsedSection[], gaps: AmbiguityGap[]): SectionScore[] {
  return sections.map((select) => {
    const sectionGaps = gaps.filter((g) => g.section === select.name || g.section === 'GLOBAL');
    const wc = wordCount(select.content);
    const gapCount = sectionGaps.length;

    // Score: 100 base - penalty per gap
    const score = Math.max(0, 100 - gapCount * 15);

    return {
      section: select.name,
      wordCount: wc,
      gapCount,
      score,
    };
  });
}

// ---------- Main API ----------

export function detectAmbiguities(
  masterPrompt: string,
  domainId?: string,
): AmbiguityReport {
  resetGapCounter();

  const sections = parseSections(masterPrompt);
  const gaps: AmbiguityGap[] = [];

  for (const rule of ALL_RULES) {
    gaps.push(...rule(masterPrompt, sections, domainId));
  }

  // Assign correct section to GLOBAL gaps based on location
  for (const gap of gaps) {
    if (gap.section === 'GLOBAL' && gap.excerpt) {
      for (const select of sections) {
        if (select.content.includes(gap.excerpt)) {
          gap.section = select.name;
          break;
        }
      }
    }
  }

  const ambiguityScore = calculateAmbiguityScore(gaps);
  const sectionScores = calculateSectionScores(sections, gaps);

  return {
    gaps,
    ambiguityScore,
    sectionScores,
    totalGaps: gaps.length,
  };
}
