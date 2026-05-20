/**
 * IntermediateRepresentation → MasterPrompt (fullPrompt metni).
 * Backend + frontend uyumlu; sadece IR'dan metin uretir.
 */

import type { IntermediateRepresentation, MasterPrompt } from '../types/ir';

export function compileIRToPrompt(ir: IntermediateRepresentation): MasterPrompt {
  const sections: string[] = [];

  sections.push(`# ${ir.meta.name} (v${ir.meta.version})`);
  sections.push('');
  sections.push('## Intent');
  sections.push(ir.intent);
  sections.push('');
  sections.push('## Domain & Framework');
  sections.push(`- Domain: ${ir.domain}`);
  if (ir.domainFocus.length) sections.push(`- Domain focus: ${ir.domainFocus.join(', ')}`);
  sections.push(`- Framework: ${ir.framework}`);
  if (ir.frameworkFocus.length) sections.push(`- Framework focus: ${ir.frameworkFocus.join(', ')}`);
  sections.push('');

  if (ir.guardrails.length) {
    sections.push('## Guardrails');
    ir.guardrails.forEach((g) => {
      sections.push(`- [${g.severity ?? 'high'}] ${g.type}${g.message ? `: ${g.message}` : ''}`);
    });
    sections.push('');
  }

  if (ir.styleProfile?.tone || ir.styleProfile?.length || ir.styleProfile?.keywords?.length) {
    sections.push('## Style');
    if (ir.styleProfile.tone) sections.push(`- Tone: ${ir.styleProfile.tone}`);
    if (ir.styleProfile.length) sections.push(`- Length: ${ir.styleProfile.length}`);
    if (ir.styleProfile.keywords?.length) sections.push(`- Keywords: ${ir.styleProfile.keywords.join(', ')}`);
    sections.push('');
  }

  sections.push('## Output format');
  sections.push(ir.outputFormat);
  sections.push('');

  if (ir.fewShotExamples.length) {
    sections.push('## Few-shot examples');
    ir.fewShotExamples.forEach((ex, i) => {
      sections.push(`### Example ${i + 1}`);
      sections.push(`Input: ${ex.input}`);
      sections.push(`Output: ${ex.output}`);
      if (ex.explanation) sections.push(`Explanation: ${ex.explanation}`);
      sections.push('');
    });
  }

  if (ir.evaluationCriteria.length || ir.successMetrics.length) {
    sections.push('## Evaluation');
    if (ir.evaluationCriteria.length) {
      sections.push('Judge criteria:');
      ir.evaluationCriteria.forEach((c) => sections.push(`- ${c.name ?? c.expression ?? ''}`));
    }
    if (ir.successMetrics.length) {
      sections.push('Success metrics: ' + ir.successMetrics.join(', '));
    }
    sections.push(`Min score: ${ir.minScore}`);
  }

  const fullPrompt = sections.join('\n').trim();

  return {
    fullPrompt,
    intent: ir.intent,
  };
}
