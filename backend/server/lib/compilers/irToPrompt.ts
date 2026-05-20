/**
 * IR → Model-agnostic prompt bilesenleri.
 * Backend derleyiciler bu fonksiyonlari kullanarak provider'a ozel prompt uretir.
 */

import type { IR, CompiledPrompt, ProviderType } from '@/types/ir';

function isAgentBlueprintRequest(intentRaw: string): boolean {
  const q = intentRaw.toLowerCase();
  const keys = [
    'agent',
    'master prompt',
    'reason',
    'act',
    'observe',
    'akil',
    'yurut',
    'gozlem',
    'proje',
    'project',
  ];
  return keys.some((k) => q.includes(k));
}

function isAgentBlueprintForcedByContext(ir: IR): boolean {
  const rules = typeof ir.context_rules === 'string' ? ir.context_rules.toLowerCase() : '';
  return rules.includes('agent_blueprint_mode=on');
}

function readOutputLanguageFromContext(ir: IR): 'tr' | 'en' {
  const rules = typeof ir.context_rules === 'string' ? ir.context_rules : '';
  const match = rules.match(/output_language\s*=\s*(tr|en)/i);
  if (match?.[1]?.toLowerCase() === 'tr') return 'tr';
  return 'en';
}

function readOutputFormatFromContext(
  ir: IR
): 'auto' | 'markdown' | 'json' | 'numbered' | 'table' | 'code' | 'xml' {
  const rules = typeof ir.context_rules === 'string' ? ir.context_rules : '';
  const match = rules.match(/output_format\s*=\s*(auto|markdown|json|numbered|table|code|xml)/i);
  const value = (match?.[1] ?? 'auto').toLowerCase();
  switch (value) {
    case 'markdown':
    case 'json':
    case 'numbered':
    case 'table':
    case 'code':
    case 'xml':
      return value;
    default:
      return 'auto';
  }
}

function buildOutputFormatRule(format: 'auto' | 'markdown' | 'json' | 'numbered' | 'table' | 'code' | 'xml'): string {
  switch (format) {
    case 'markdown':
      return 'When composing the final master prompt, request Markdown output with clear headings and bullets.';
    case 'json':
      return 'When composing the final master prompt, request strict valid JSON output only.';
    case 'numbered':
      return 'When composing the final master prompt, request a numbered list output.';
    case 'table':
      return 'When composing the final master prompt, request Markdown table output.';
    case 'code':
      return 'When composing the final master prompt, request fenced code blocks with language tags.';
    case 'xml':
      return 'When composing the final master prompt, request well-formed XML output.';
    default:
      return 'No explicit output format override.';
  }
}

function buildSystemFromIR(ir: IR): string {
  if (ir.confidence !== undefined && ir.confidence < 0.7) {
    console.warn('⚠️ Dusuk guvenilir IR tespit edildi');
  }
  const safeGoals = Array.isArray(ir.goals) && ir.goals.length > 0
    ? ir.goals
    : [{ id: 'g1', description: ir.intent_raw || 'Generate a high-quality prompt.', priority: 1 }];
  const safeConstraints = Array.isArray(ir.constraints) ? ir.constraints : [];
  const safeSecurityPolicies = Array.isArray(ir.security_policies) ? ir.security_policies : [];
  const safeStopConditions = Array.isArray(ir.stop_conditions) ? ir.stop_conditions : [];
  const safeSections =
    Array.isArray(ir.format_schema?.sections) && ir.format_schema.sections.length > 0
      ? ir.format_schema.sections
      : [{ id: 'master_prompt', structure: undefined, max_tokens: undefined }] as Array<{ id: string; structure?: string[]; max_tokens?: number }>;

  const langCode = readOutputLanguageFromContext(ir);
  const lang = langCode === 'tr' ? 'Turkish' : 'English';
  const requestedOutputFormat = readOutputFormatFromContext(ir);
  const goalsText = safeGoals.map((g) => `- ${g.description}`).join('\n');
  const constraintsText = safeConstraints.length > 0
    ? safeConstraints.map((c) => `- [${c.type}] ${c.rule}`).join('\n')
    : '- [output] Keep responses clear, structured, and deterministic.';
  const securityText = safeSecurityPolicies.length > 0
    ? safeSecurityPolicies.map((s) => `- ${s}`).join('\n')
    : '- Do not reveal secrets or private data.';
  const stopText = safeStopConditions.length > 0
    ? safeStopConditions.map((s) => `- ${s}`).join('\n')
    : '- Stop if user intent is empty or unsafe.';
  const formatSections = safeSections
    .map((s) => `  - ${s.id}${s.structure ? ` (${s.structure.join(', ')})` : ''}${s.max_tokens ? ` max ${s.max_tokens} tokens` : ''}`)
    .join('\n');
  const agentBlueprint = isAgentBlueprintRequest(ir.intent_raw || '') || isAgentBlueprintForcedByContext(ir);
  const agentBlueprintRules = agentBlueprint
    ? `

AGENT BLUEPRINT MODE: ENABLED
The final master prompt MUST follow this exact high-level structure:
1) Identity and Mission
2) Reason-Act-Observe Loop
3) Project Context and Constraints
4) Feature Utilization Strategy
5) Adaptation Policy
6) Output Quality Contract
7) Safety and Verification Rules
8) Completion Criteria

Use imperative, operational sentences. Keep it concise but implementation-ready.`
    : '';

  return `[SYSTEM — SR-MPG v3.1 | IR-based Master Prompt Generator]

Your Role: Compile the user request into a deterministic, high-performance Master Prompt package.
Target Language: ${lang}

GOALS (priority order):
${goalsText}

CONSTRAINTS:
${constraintsText}

SECURITY POLICIES:
${securityText}

STOP CONDITIONS (do not proceed if violated):
${stopText}

OUTPUT FORMAT (strict):
${formatSections}

Available Frameworks: KERNEL, CO_STAR, RISEN, RTF, BAB, TAG, CARE.
Reply in Markdown only. No JSON.
1) One short reasoning paragraph (2-4 sentences).
2) Blank line.
3) A single unified master prompt. Do NOT use ## SYSTEM, ## DEVELOPER, or ## USER headings. Write one cohesive prompt template.
Output Format Preference: ${requestedOutputFormat.toUpperCase()}.
${buildOutputFormatRule(requestedOutputFormat)}
${agentBlueprintRules}`;
}

function buildUserFromIR(ir: IR): string {
  const lang = readOutputLanguageFromContext(ir);
  const domainId = typeof ir.domain_id === 'string' && ir.domain_id.trim() ? ir.domain_id : 'auto';
  const contextRules = typeof ir.context_rules === 'string' ? ir.context_rules : '';
  const framework = typeof ir.framework === 'string' && ir.framework.trim() ? ir.framework : 'AUTO';
  const intentRaw = typeof ir.intent_raw === 'string' ? ir.intent_raw : '';
  const requestedOutputFormat = readOutputFormatFromContext(ir);
  const agentBlueprint = isAgentBlueprintRequest(intentRaw) || isAgentBlueprintForcedByContext(ir);

  return `[RUNTIME INPUTS]
USER_INPUT: "${intentRaw}"
CONTEXT: Domain ID: ${domainId}
Rules: ${contextRules}
I18N: ${lang.toUpperCase()}
OUTPUT_FORMAT: ${requestedOutputFormat.toUpperCase()}
FRAMEWORK_OVERRIDE: ${framework}
ATTACHMENTS: NO
AGENT_BLUEPRINT_MODE: ${agentBlueprint ? 'ON' : 'OFF'}

Reply in Markdown only. First: short reasoning. Then blank line. Then a single unified master prompt (do NOT use ## SYSTEM, ## DEVELOPER, or ## USER headings). No JSON.`;
}

/** Groq / HuggingFace / OpenRouter — system + user messages formati */
export function compileForChat(ir: IR, provider: ProviderType): CompiledPrompt {
  return {
    system: buildSystemFromIR(ir),
    user: buildUserFromIR(ir),
    provider,
  };
}

/** Claude — system ayri, user ayri (Anthropic API formati) */
export function compileForClaude(ir: IR, provider: ProviderType): CompiledPrompt {
  return compileForChat(ir, provider);
}

/** Gemini — system + user tek mesaj (bazi modeller system desteklemez) */
export function compileForGemini(ir: IR, provider: ProviderType): CompiledPrompt {
  const system = buildSystemFromIR(ir);
  const user = buildUserFromIR(ir);
  return {
    system: system + '\n\n' + user,
    user: '',
    provider,
  };
}
