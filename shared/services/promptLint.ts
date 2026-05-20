/**
 * Prompt QA / Lint — Kalite kontrol kurallari.
 * @see docs/PROMPT_FEATURES_ROADMAP.md §3
 *
 * Belirsiz fiiller, olcutsuz basari tanimi, eksik format talebi vb. tespiti.
 */

export type LintSeverity = 'error' | 'warning' | 'info';

export interface LintIssue {
  ruleId: string;
  severity: LintSeverity;
  message: string;
  messageTr: string;
  /** Sorunlu metin parcasi (varsa) */
  excerpt?: string;
}

export interface LintResult {
  issues: LintIssue[];
  totalErrors: number;
  totalWarnings: number;
  totalInfo: number;
  passed: boolean;
}

// --- Lint Kurallari ---

type LintRule = (prompt: string, reasoning?: string) => LintIssue[];

/** R1: Belirsiz fiiller (docs §3 Linting) */
const ruleVagueVerbs: LintRule = (prompt) => {
  const issues: LintIssue[] = [];
  const vaguePatterns = [
    { pattern: /\b(yap|iyilestir|duzelt|guzellestir|optimize et)\b/gi, lang: 'tr' },
    { pattern: /\b(do it|improve|fix it|make better|optimize)\b/gi, lang: 'en' },
  ];
  for (const { pattern } of vaguePatterns) {
    const matches = prompt.match(pattern);
    if (matches) {
      issues.push({
        ruleId: 'vague-verbs',
        severity: 'warning',
        message: `Vague verb detected: "${matches[0]}". Use specific, measurable actions.`,
        messageTr: `Belirsiz fiil tespit edildi: "${matches[0]}". Olculebilir eylem kullanin.`,
        excerpt: matches[0],
      });
    }
  }
  return issues;
};

/** R2: Eksik basari kriterleri */
const ruleMissingSuccessCriteria: LintRule = (prompt) => {
  const hasSuccess = /success|criteria|pass|fail|basari|kriter|metric|metrik|measur|olcu/i.test(prompt);
  if (!hasSuccess) {
    return [{
      ruleId: 'missing-success-criteria',
      severity: 'warning',
      message: 'No success/fail criteria found. Add measurable success criteria.',
      messageTr: 'Basari/basarisizlik kriteri bulunamadi. Olculebilir kriterler ekleyin.',
    }];
  }
  return [];
};

/** R3: Eksik format talebi */
const ruleMissingFormat: LintRule = (prompt) => {
  const hasFormat = /format|output|output|structure|yapi|markdown|json|table|tablo/i.test(prompt);
  if (!hasFormat) {
    return [{
      ruleId: 'missing-format',
      severity: 'info',
      message: 'No output format specification found. Consider specifying expected output format.',
      messageTr: 'Output format belirtimi bulunamadi. Beklenen output formatini belirtmeyi dusunun.',
    }];
  }
  return [];
};

/** R4: Cok kisa prompt */
const ruleTooShort: LintRule = (prompt) => {
  const wordCount = prompt.split(/\s+/).filter(Boolean).length;
  if (wordCount < 20) {
    return [{
      ruleId: 'too-short',
      severity: 'warning',
      message: `Prompt is very short (${wordCount} words). Consider adding more context and constraints.`,
      messageTr: `Prompt cok kisa (${wordCount} kelime). Daha fazla baglam ve kisit ekleyin.`,
    }];
  }
  return [];
};

/** R5: Cok uzun prompt (token budget) */
const ruleTooLong: LintRule = (prompt) => {
  const wordCount = prompt.split(/\s+/).filter(Boolean).length;
  if (wordCount > 2000) {
    return [{
      ruleId: 'too-long',
      severity: 'warning',
      message: `Prompt is very long (${wordCount} words). Consider condensing to stay within token budgets.`,
      messageTr: `Prompt cok uzun (${wordCount} kelime). Token butcesinde kalmak for kisaltmayi dusunun.`,
    }];
  }
  return [];
};

/** R6: Eksik yapisal organizasyon (security) */
const ruleMissingSeparation: LintRule = (prompt) => {
  const hasSystem = /## SYSTEM/i.test(prompt);
  const hasUser = /## USER/i.test(prompt);
  // Unified format is the production standard — no issue for well-structured unified prompts.
  const unifiedStructured =
    !hasSystem
    && !hasUser
    && /\b(role|persona|you are|sen bir|gorevin)\b/i.test(prompt)
    && /\b(must|shall|required|do not|never|kisit|kural|zorunlu)\b/i.test(prompt)
    && /\b(output|format|markdown|json|xml|response|yanit)\b/i.test(prompt);
  if (hasSystem || hasUser || unifiedStructured) {
    return [];
  }
  return [{
    ruleId: 'missing-system-user-separation',
    severity: 'info',
    message: 'No structural organization found. Consider adding role, constraint, and format blocks.',
    messageTr: 'Yapisal organizasyon bulunamadi. Rol, kisit ve format bloklari eklemeyi dusunun.',
  }];
};

/** R7: Eksik security talimatlari */
const ruleMissingSecurity: LintRule = (prompt) => {
  const hasSecurity = /guardrail|safety|security|security|unauthorized|yetkisiz|ignore|yok say/i.test(prompt);
  if (!hasSecurity) {
    return [{
      ruleId: 'missing-security',
      severity: 'info',
      message: 'No security guardrails detected. Consider adding prompt injection defenses.',
      messageTr: 'security talimatlari tespit edilmedi. Prompt injection savunmalari eklemeyi dusunun.',
    }];
  }
  return [];
};

/** R8: Celiski tespiti */
const ruleContradiction: LintRule = (prompt) => {
  const issues: LintIssue[] = [];
  // JSON yok derken JSON istemek
  if (/no json|json yok/i.test(prompt) && /json schema|json format|json output/i.test(prompt)) {
    issues.push({
      ruleId: 'contradiction',
      severity: 'error',
      message: 'Contradiction detected: "No JSON" but also requests JSON output.',
      messageTr: 'Celiski tespit edildi: "JSON yok" ama JSON output isteniyor.',
    });
  }
  return issues;
};

/** R9: PII/risk uyarisi */
const ruleRiskFlags: LintRule = (prompt) => {
  const issues: LintIssue[] = [];
  const piiPatterns = /\b(password|sifre|secret|api.key|credit.card|kredi.kart|ssn|tc.kimlik)\b/i;
  const match = prompt.match(piiPatterns);
  if (match) {
    issues.push({
      ruleId: 'pii-risk',
      severity: 'warning',
      message: `Potential PII/sensitive data reference detected: "${match[0]}". Ensure data masking.`,
      messageTr: `Olasi PII/hassas veri referansi: "${match[0]}". Veri maskeleme saglayin.`,
    });
  }
  return issues;
};

// --- Parser-Powered Rules (R10-R14) — PyParsing AST tabanli ---

import { buildAST, extractVariables } from './promptParser';

/** R10: Bolum tamligi (AST tabanli) */
const ruleSectionCompleteness: LintRule = (prompt) => {
  try {
    const ast = buildAST(prompt);
    const { hasRole, hasOutputFormat, hasExamples, hasGuardrails, constraintCount } = ast.statistics;
    const items = [hasRole, constraintCount > 0, hasOutputFormat, hasExamples, hasGuardrails];
    const present = items.filter(Boolean).length;
    if (present < 3 && prompt.split(/\s+/).filter(Boolean).length > 50) {
      const missing = [
        !hasRole && 'role definition',
        constraintCount === 0 && 'constraints',
        !hasOutputFormat && 'output format',
        !hasExamples && 'examples',
        !hasGuardrails && 'guardrails',
      ].filter(Boolean);
      const missingTr = [
        !hasRole && 'rol tanimi',
        constraintCount === 0 && 'kisitlar',
        !hasOutputFormat && 'output formati',
        !hasExamples && 'ornekler',
        !hasGuardrails && 'security talimatlari',
      ].filter(Boolean);
      return [{
        ruleId: 'section-completeness',
        severity: 'info',
        message: `Prompt covers ${present}/5 recommended sections. Missing: ${missing.join(', ')}.`,
        messageTr: `Prompt ${present}/5 onerilen bolumu kapsiyor. Eksik: ${missingTr.join(', ')}.`,
      }];
    }
  } catch { /* parser error verirse sessizce devam et */ }
  return [];
};

/** R11: Kisit orani — cok talimat az kisit */
const ruleConstraintRatio: LintRule = (prompt) => {
  try {
    const ast = buildAST(prompt);
    const totalInstructions = ast.statistics.sectionCount + (ast.statistics.nodesByType['instruction'] || 0);
    if (totalInstructions > 3 && ast.statistics.constraintCount === 0) {
      return [{
        ruleId: 'constraint-ratio',
        severity: 'warning',
        message: `Found ${totalInstructions} sections but no constraints. Add guardrails like "Do not...", "Always..." to improve safety.`,
        messageTr: `${totalInstructions} bolum bulundu ama kisit yok. security for "Yapma...", "Her zaman..." gibi kisitlar ekleyin.`,
      }];
    }
  } catch { /* silent */ }
  return [];
};

/** R12: Variable stili tutarliligi */
const ruleVariableConsistency: LintRule = (prompt) => {
  try {
    const result = extractVariables(prompt);
    if (result.summary.mixedStyles && result.summary.unique > 1) {
      return [{
        ruleId: 'variable-consistency',
        severity: 'warning',
        message: `Mixed variable styles detected: ${result.summary.styles.join(', ')}. Use a single style for consistency.`,
        messageTr: `Karisik variable stilleri tespit edildi: ${result.summary.styles.join(', ')}. Tutarlilik for tek stil kullanin.`,
      }];
    }
  } catch { /* silent */ }
  return [];
};

/** R13: Uzun prompt'ta example eksikligi */
const ruleExampleQuality: LintRule = (prompt) => {
  try {
    const wordCount = prompt.split(/\s+/).filter(Boolean).length;
    if (wordCount > 200) {
      const ast = buildAST(prompt);
      if (!ast.statistics.hasExamples) {
        return [{
          ruleId: 'example-quality',
          severity: 'info',
          message: `Long prompt (${wordCount} words) without examples. Adding few-shot examples can improve output quality.`,
          messageTr: `Uzun prompt (${wordCount} kelime) orneksiz. Few-shot ornekler eklemek output kalitesini artirir.`,
        }];
      }
    }
  } catch { /* silent */ }
  return [];
};

/** R14: Asiri ic ice yapi */
const ruleNestingDepth: LintRule = (prompt) => {
  try {
    const ast = buildAST(prompt);
    if (ast.statistics.maxDepth > 4) {
      return [{
        ruleId: 'nesting-depth',
        severity: 'warning',
        message: `Deep nesting detected (depth: ${ast.statistics.maxDepth}). Simplify structure for clarity.`,
        messageTr: `Derin ic ice yapi tespit edildi (derinlik: ${ast.statistics.maxDepth}). Netlik for yapiyi sadelestirin.`,
      }];
    }
  } catch { /* silent */ }
  return [];
};

const ALL_RULES: LintRule[] = [
  ruleVagueVerbs,
  ruleMissingSuccessCriteria,
  ruleMissingFormat,
  ruleTooShort,
  ruleTooLong,
  ruleMissingSeparation,
  ruleMissingSecurity,
  ruleContradiction,
  ruleRiskFlags,
  // Parser-powered rules (R10-R14)
  ruleSectionCompleteness,
  ruleConstraintRatio,
  ruleVariableConsistency,
  ruleExampleQuality,
  ruleNestingDepth,
];

/**
 * Ana lint fonksiyonu.
 */
export function lintPrompt(masterPrompt: string, reasoning?: string): LintResult {
  const issues: LintIssue[] = [];

  for (const rule of ALL_RULES) {
    issues.push(...rule(masterPrompt, reasoning));
  }

  const totalErrors = issues.filter(i => i.severity === 'error').length;
  const totalWarnings = issues.filter(i => i.severity === 'warning').length;
  const totalInfo = issues.filter(i => i.severity === 'info').length;

  return {
    issues,
    totalErrors,
    totalWarnings,
    totalInfo,
    passed: totalErrors === 0,
  };
}
