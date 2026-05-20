/**
 * Prompt Integrator — Bulunan candidate'lari master prompt'a entegre eder.
 * Fast mod: Kural-tabanli birlestirme (~200ms)
 * Deep mod: LLM destekli dogal entegrasyon (fallback: fast mod)
 */

import type { EnrichmentCandidate } from '@/types/enrichment';
import { Framework } from '@/types';
import { parseSections } from './ambiguityDetector';

// ---------- Token Budget ----------

function estimateTokens(text: string): number {
  return Math.ceil(text.split(/\s+/).filter(Boolean).length * 1.3);
}

// ---------- Fast Mode Integration ----------

function groupBySection(
  candidates: EnrichmentCandidate[],
): Map<string, EnrichmentCandidate[]> {
  const groups = new Map<string, EnrichmentCandidate[]>();
  for (const c of candidates) {
    const key = c.targetSection;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(c);
  }
  return groups;
}

const LEGACY_ENRICHMENT_BLOCK = /\n{0,2}🚀 GUCLENDIRME KURALI \(ZORUNLU\):[\s\S]*?(?=\n{2,}|$)/g;
const LEGACY_LIBRARY_TAG = /<!--\s*\[LIB:[^\]]+\][\s\S]*?-->\s*\n?/g;
const LEGACY_ENRICHMENT_HEADING = /\n{0,2}### Enrichment \(Library\)\s*\n?/g;

export function sanitizeEnrichedPromptOutput(prompt: string): string {
  return prompt
    .replace(LEGACY_ENRICHMENT_BLOCK, '')
    .replace(LEGACY_LIBRARY_TAG, '')
    .replace(LEGACY_ENRICHMENT_HEADING, '\n\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function buildCandidateBlock(candidate: EnrichmentCandidate): string {
  return sanitizeEnrichedPromptOutput(candidate.promptContent);
}

function truncateToBudget(text: string, maxTokens: number): string {
  const maxWords = Math.max(1, Math.floor(maxTokens / 1.3));
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return text;
  return `${words.slice(0, maxWords).join(' ')}\n\n[...truncated for token budget...]`;
}

function fitCandidateToBudget(
  candidate: EnrichmentCandidate,
  remainingBudget: number,
): { candidate: EnrichmentCandidate; block: string; usedTokens: number } | null {
  const fullBlock = buildCandidateBlock(candidate);
  const fullTokens = estimateTokens(fullBlock);
  if (fullTokens <= remainingBudget) {
    return { candidate, block: fullBlock, usedTokens: fullTokens };
  }

  const availableForContent = remainingBudget - 6;
  if (availableForContent < 40) return null;

  const trimmedContent = truncateToBudget(candidate.promptContent, availableForContent);
  const trimmedCandidate: EnrichmentCandidate = {
    ...candidate,
    promptContent: sanitizeEnrichedPromptOutput(trimmedContent),
  };
  const trimmedBlock = buildCandidateBlock(trimmedCandidate);
  const usedTokens = estimateTokens(trimmedBlock);
  if (usedTokens > remainingBudget) return null;

  return { candidate: trimmedCandidate, block: trimmedBlock, usedTokens };
}

export function integrateFast(
  masterPrompt: string,
  candidates: EnrichmentCandidate[],
  maxTokenBudget: number = 500,
): { result: string; integrated: EnrichmentCandidate[] } {
  if (candidates.length === 0) {
    return { result: masterPrompt, integrated: [] };
  }

  const sections = parseSections(masterPrompt);
  const grouped = groupBySection(candidates);
  const integrated: EnrichmentCandidate[] = [];
  let remainingBudget = maxTokenBudget;

  // Build section map for modification
  const sectionMap = new Map<string, string>();
  for (const select of sections) {
    sectionMap.set(select.name, select.content);
  }

  for (const [sectionName, sectionCandidates] of grouped) {
    const currentContent = sectionMap.get(sectionName);
    if (!currentContent && sectionName !== 'GLOBAL') {
      // Section doesn't exist in prompt — append as new section
      const newBlocks: string[] = [];
      for (const c of sectionCandidates) {
        const fitted = fitCandidateToBudget(c, remainingBudget);
        if (fitted) {
          newBlocks.push(fitted.block);
          remainingBudget -= fitted.usedTokens;
          integrated.push(fitted.candidate);
        }
      }
      if (newBlocks.length > 0) {
        sectionMap.set(sectionName, `## ${sectionName}\n\n${newBlocks.join('\n\n')}`);
      }
      continue;
    }

    // Append to existing section
    const targetContent = currentContent ?? '';
    const newBlocks: string[] = [];

    for (const c of sectionCandidates) {
      const fitted = fitCandidateToBudget(c, remainingBudget);
      if (fitted) {
        newBlocks.push(fitted.block);
        remainingBudget -= fitted.usedTokens;
        integrated.push(fitted.candidate);
      }
    }

    if (newBlocks.length > 0) {
      const enrichmentSection = `\n\n${newBlocks.join('\n\n')}`;
      sectionMap.set(sectionName, sanitizeEnrichedPromptOutput(targetContent + enrichmentSection));
    }
  }

  // Reassemble prompt
  const result = sanitizeEnrichedPromptOutput(reassembleSections(masterPrompt, sections, sectionMap));
  return { result, integrated };
}

function reassembleSections(
  originalPrompt: string,
  originalSections: ReturnType<typeof parseSections>,
  sectionMap: Map<string, string>,
): string {
  // If only GLOBAL section (no ## headings), simple replace
  const firstSection = originalSections[0];
  if (originalSections.length === 1 && firstSection?.name === 'GLOBAL') {
    const globalContent = sectionMap.get('GLOBAL') ?? originalPrompt;
    // Append new sections if any were created
    const newSections: string[] = [];
    for (const [name, content] of sectionMap) {
      if (name !== 'GLOBAL') newSections.push(content);
    }
    return newSections.length > 0
      ? `${globalContent}\n\n${newSections.join('\n\n')}`
      : globalContent;
  }

  // Rebuild from section map preserving order
  const parts: string[] = [];
  for (const select of originalSections) {
    parts.push(sectionMap.get(select.name) ?? select.content);
  }

  // Add any new sections that didn't exist originally
  const existingNames = new Set(originalSections.map((s) => s.name));
  for (const [name, content] of sectionMap) {
    if (!existingNames.has(name as any)) {
      parts.push(content);
    }
  }

  return parts.join('\n\n');
}

// ---------- Deep Mode Integration ----------

export async function integrateDeep(
  masterPrompt: string,
  candidates: EnrichmentCandidate[],
  maxTokenBudget: number = 500,
): Promise<{ result: string; integrated: EnrichmentCandidate[] }> {
  // Deep mode attempts LLM-based integration
  // Fallback to fast mode if LLM unavailable or fails
  try {
    const metaPrompt = buildMetaPrompt(masterPrompt, candidates);

    // Try to use existing provider infrastructure via generateMasterPromptServer
    const { generateMasterPromptServer } = await import('../../lib/generateAdapter');
    if (typeof generateMasterPromptServer !== 'function') {
      throw new Error('generateMasterPromptServer not available');
    }

    const response = await generateMasterPromptServer({
      intent: metaPrompt.user,
      framework: Framework.KERNEL,
      domainId: 'general',
      provider: 'auto',
      systemPrompt: metaPrompt.system,
    });
    const llmResult = response?.masterPrompt;
    const resolvedProvider = response?.resolvedProvider ?? 'unknown';

    if (llmResult && typeof llmResult === 'string' && llmResult.length > 100) {
      const sanitized = sanitizeEnrichedPromptOutput(llmResult);
      if (sanitized.length > masterPrompt.length) {
        const lengthDelta = sanitized.length - masterPrompt.length;
        console.info(`[Integrator] Deep mode success via ${resolvedProvider}: +${lengthDelta} chars, ${candidates.length} candidates integrated`);
        return { result: sanitized, integrated: candidates };
      }
    }

    // LLM response malformed — fallback
    console.warn(`[Integrator] LLM response malformed (provider=${resolvedProvider}), falling back to fast mode`);
    return integrateFast(masterPrompt, candidates, maxTokenBudget);
  } catch (e: any) {
    console.warn(`[Integrator] Deep mode failed (${e.message}), falling back to fast mode`);
    return integrateFast(masterPrompt, candidates, maxTokenBudget);
  }
}

function buildMetaPrompt(
  masterPrompt: string,
  candidates: EnrichmentCandidate[],
): { system: string; user: string } {
  const candidateList = candidates
    .map((c, i) => `[${i + 1}] ID: ${c.promptId}\nName: ${c.promptName}\nTarget: ${c.targetSection}\nContent: ${c.promptContent}`)
    .join('\n\n');

  const system = `You are a prompt integration specialist. Naturally integrate enrichment fragments from the library into the master prompt.
Rules:
1. Maintain the existing structure and section headings.
2. Only add to relevant sections, avoid unnecessary repetition.
3. Do not remove original content, only fill gaps.
4. Do not add library labels, HTML comments, enrichment headings, or metadata.`;

  const user = `Master Prompt:\n\`\`\`\n${masterPrompt}\n\`\`\`\n\nEnrichment Candidates:\n${candidateList}\n\nOutput the enriched prompt directly (no explanation).`;

  return { system, user };
}
