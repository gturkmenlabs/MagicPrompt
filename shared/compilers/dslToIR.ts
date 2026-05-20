/**
 * DSL → Mevcut IR cevirici.
 * ParsedPromptDSL → IntermediateRepresentation (domainFocus, guardrails, styleProfile, evaluation).
 */

import type { ParsedPromptDSL } from '../dsl/prompt-dsl';
import type { IntermediateRepresentation, GuardrailBlock } from '../types/ir';
import { DOMAIN_META, FRAMEWORK_META } from '../data.ts';

function toGuardrailBlock(g: string | GuardrailBlock): GuardrailBlock {
  if (typeof g === 'string') {
    return { type: g, severity: 'high', message: '' };
  }
  return {
    type: g.type,
    severity: g.severity ?? 'high',
    message: g.message ?? '',
  };
}

export function dslToIR(dsl: ParsedPromptDSL): IntermediateRepresentation {
  const domainMeta = DOMAIN_META[dsl.meta.domain];
  const frameworkMeta =
    typeof dsl.meta.framework === 'string' && dsl.meta.framework in FRAMEWORK_META
      ? (FRAMEWORK_META as Record<string, { focus?: string[] }>)[dsl.meta.framework]
      : undefined;
  const domainFocus = (domainMeta as { focus?: string[] } | undefined)?.focus ?? [];
  const frameworkFocus = (frameworkMeta as { focus?: string[] } | undefined)?.focus ?? [];

  const ir: IntermediateRepresentation = {
    intent: dsl.intent,
    domain: dsl.meta.domain,
    framework: dsl.meta.framework,
    domainFocus,
    frameworkFocus,
    guardrails: dsl.guards.map(toGuardrailBlock),
    styleProfile: dsl.style,
    outputFormat: dsl.outputFormat,
    fewShotExamples: dsl.examples.map((ex) => ({
      input: ex.input,
      output: ex.output,
      explanation: ex.explanation,
    })),
    evaluationCriteria: dsl.evaluation.judgeCriteria,
    successMetrics: dsl.evaluation.successMetrics,
    minScore: dsl.evaluation.minScore,
    meta: {
      name: dsl.meta.name,
      version: dsl.meta.version,
      author: dsl.meta.author,
      tags: dsl.meta.tags,
      license: dsl.meta.license,
      hash: dsl.hash,
    },
  };

  return ir;
}
