/**
 * Prompt Corpus Loader — agentService for prompt veri kaynagi.
 * NOTEBOOKLM_PROMPTS + LLM_SYSTEM_INSTRUCTION_PROMPTS + diger veri setlerini
 * tek bir corpus olarak sunar.
 */

import type { NotebookLmPrompt } from '@/data/notebookLmPrompts.ts';

export type CorpusPrompt = NotebookLmPrompt;

export type CorpusTarget = 'full' | 'notebooklm' | 'dataset';

/** Toplam prompt sayisi tahmini (display ve coverage hesaplari for) */
export function getPromptCorpusCount(): number {
  return parseInt(process.env.SR_CORPUS_COUNT || '0', 10) || 1000;
}

/** Ortam degiskenine gore hangi corpus'un yuklenecegini belirler */
export function getPromptCorpusTarget(): CorpusTarget {
  const env = process.env.SR_CORPUS_TARGET;
  if (env === 'notebooklm' || env === 'dataset') return env;
  return 'full';
}

/** Belirtilen hedef for prompt corpus'unu yukler */
export async function loadPromptCorpus(target: CorpusTarget): Promise<CorpusPrompt[]> {
  const { NOTEBOOKLM_PROMPTS } = await import('../../data/notebookLmPrompts.ts');
  const { LLM_SYSTEM_INSTRUCTION_PROMPTS } = await import('../../data/datasetPrompts.ts');
  const { GITHUB_PROMPTS } = await import('../../data/githubPrompts.ts');

  if (target === 'notebooklm') return NOTEBOOKLM_PROMPTS;
  if (target === 'dataset') return LLM_SYSTEM_INSTRUCTION_PROMPTS;

  // 'full' — tum kaynaklari birlestir (NotebookLM + Dataset + GitHub), tekrarlananlari id'ye gore filtrele
  const all = [...NOTEBOOKLM_PROMPTS, ...LLM_SYSTEM_INSTRUCTION_PROMPTS, ...GITHUB_PROMPTS];
  const seen = new Set<string>();
  return all.filter((p) => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });
}
