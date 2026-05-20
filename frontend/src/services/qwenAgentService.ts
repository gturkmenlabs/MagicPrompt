/**
 * Qwen Agent backend — bridge Super Reasoning agent flows to the local Qwen runner.
 */
import { enrichMasterPrompt } from '../server/lib/enrichment';
import {
  getPromptCorpusCount,
  getPromptCorpusTarget,
  loadPromptCorpus,
} from '../server/lib/promptCorpus';
import {
  getQwenBridgeStatus,
  invokeQwenAgent,
} from '../server/lib/qwenAgent/client';
import type { AgentRunContext, AgentRunResult } from './agentService';
import { getAgentMemory } from './multiAgentOrchestrator';
import type { AgentMemory, OrchestratorDecision } from '@/types/agent';

type PromptEntry = {
  id: string;
  name: string;
  nameEn: string;
  category: string;
  categoryEn: string;
  prompt: string;
  promptEn: string;
  tags: string[];
};

let promptsLoaded = false;
const PROMPT_TARGET = getPromptCorpusTarget();
const promptEntries: PromptEntry[] = [];
const promptMap = new Map<string, PromptEntry>();
const categoryCounts = new Map<string, number>();

async function ensurePrompts() {
  if (promptsLoaded) return;

  const corpus = await loadPromptCorpus(PROMPT_TARGET);
  for (const prompt of corpus) {
    const entry: PromptEntry = {
      id: prompt.id,
      name: prompt.name,
      nameEn: prompt.nameEn,
      category: prompt.category,
      categoryEn: prompt.categoryEn,
      prompt: prompt.prompt,
      promptEn: prompt.promptEn,
      tags: prompt.tags,
    };

    promptEntries.push(entry);
    promptMap.set(entry.id, entry);
    categoryCounts.set(entry.categoryEn, (categoryCounts.get(entry.categoryEn) ?? 0) + 1);
  }

  promptsLoaded = true;
}

function normalizeInline(text: string, limit = 240): string {
  const compact = text.replace(/\s+/g, ' ').trim();
  if (compact.length <= limit) return compact;
  return `${compact.slice(0, limit - 3)}...`;
}

function tokenize(text: string): string[] {
  return Array.from(
    new Set(
      text
        .toLowerCase()
        .split(/[^\p{L}\p{N}]+/u)
        .map((token) => token.trim())
        .filter((token) => token.length > 1),
    ),
  );
}

function buildContextBlock(
  context?: AgentRunContext | Record<string, unknown>,
  memory?: AgentMemory,
): string {
  if (!context && !memory) return '';

  const parts: string[] = [];
  const value = (context ?? {}) as Record<string, unknown>;

  if (typeof value.currentPrompt === 'string' && value.currentPrompt.trim()) {
    parts.push(`Current prompt:\n"""${value.currentPrompt.trim()}"""`);
  }

  const domainId = typeof value.domainId === 'string' ? value.domainId : undefined;
  const framework = typeof value.framework === 'string' ? value.framework : undefined;
  if (domainId || framework) {
    parts.push(`Context: domain=${domainId ?? 'n/a'}, framework=${framework ?? 'n/a'}`);
  }

  if (value.analyticsSnapshot && typeof value.analyticsSnapshot === 'object') {
    parts.push(
      `Analytics snapshot:\n${JSON.stringify(value.analyticsSnapshot, null, 2)}`,
    );
  }

  if (memory) {
    parts.push(
      `User memory:\n${JSON.stringify(
        {
          preferredFrameworks: memory.preferredFrameworks,
          commonDomains: memory.commonDomains,
          enrichmentMode: memory.enrichmentMode,
        },
        null,
        2,
      )}`,
    );
  }

  if (parts.length === 0) return '';
  return `\n\nAdditional context:\n${parts.join('\n\n')}`;
}

function scorePrompt(queryTokens: string[], prompt: PromptEntry): number {
  if (queryTokens.length === 0) return 0;

  const id = prompt.id.toLowerCase();
  const name = `${prompt.nameEn} ${prompt.name}`.toLowerCase();
  const category = `${prompt.categoryEn} ${prompt.category}`.toLowerCase();
  const tags = prompt.tags.map((tag) => tag.toLowerCase());
  const text = `${prompt.promptEn} ${prompt.prompt}`.toLowerCase();

  let score = 0;
  for (const token of queryTokens) {
    if (id.includes(token)) score += 6;
    if (name.includes(token)) score += 5;
    if (category.includes(token)) score += 4;
    if (tags.some((tag) => tag.includes(token))) score += 4;
    if (text.includes(token)) score += 1;
  }

  return score;
}

function selectRelevantPrompts(query: string, limit = 8): PromptEntry[] {
  const queryTokens = tokenize(query);
  const ranked = promptEntries
    .map((prompt) => ({ prompt, score: scorePrompt(queryTokens, prompt) }))
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      return left.prompt.nameEn.localeCompare(right.prompt.nameEn, 'en');
    });

  const useful = ranked.filter((item) => item.score > 0).slice(0, limit).map((item) => item.prompt);
  if (useful.length > 0) return useful;

  return promptEntries.slice(0, limit);
}

async function buildKnowledge(query: string): Promise<string> {
  await ensurePrompts();

  const categorySummary = Array.from(categoryCounts.entries())
    .sort((left, right) => {
      if (right[1] !== left[1]) return right[1] - left[1];
      return left[0].localeCompare(right[0], 'en');
    })
    .slice(0, 10)
    .map(([category, count]) => `- ${category}: ${count}`)
    .join('\n');

  const relevantPrompts = selectRelevantPrompts(query)
    .map((prompt, index) => [
      `Prompt ${index + 1}`,
      `id: ${prompt.id}`,
      `name: ${prompt.nameEn}`,
      `category: ${prompt.categoryEn}`,
      `tags: ${prompt.tags.join(', ') || 'n/a'}`,
      `text: ${normalizeInline(prompt.promptEn || prompt.prompt, 320)}`,
    ].join('\n'))
    .join('\n\n');

  return [
    `Prompt corpus target: ${PROMPT_TARGET}`,
    `Prompt corpus size: ${promptEntries.length}`,
    'Top categories:',
    categorySummary || '- none',
    '',
    'Relevant prompt-library entries for this query:',
    relevantPrompts || 'No prompt entries available.',
  ].join('\n');
}

function buildPromptSystemPrompt(context?: AgentRunContext): string {
  return `You are Super Reasoning's Qwen prompt assistant.

Use the provided knowledge block as the source of truth for prompt-library recommendations.
When recommending prompts, cite prompt ids and explain why they fit.
If the exact prompt is not present in the knowledge, say so clearly instead of inventing it.
If the user asks to improve an existing prompt, provide an improved prompt and a brief explanation of the changes.
Be concise, practical, and grounded in the retrieved prompt context.${buildContextBlock(context)}`;
}

function buildDecision(query: string): OrchestratorDecision {
  const lower = query.toLowerCase();
  const promptKeywords = ['prompt', 'enrich', 'improve', 'refine', 'search', 'recommend', 'rewrite'];
  const analyticsKeywords = ['analytics', 'metric', 'trend', 'report', 'performance', 'cost'];
  const devopsKeywords = ['deploy', 'server', 'health', 'database', 'build', 'test', 'logs'];

  const routedTo: OrchestratorDecision['routedTo'] = [];
  const reasons: string[] = [];

  if (promptKeywords.some((keyword) => lower.includes(keyword))) {
    routedTo.push('prompt');
    reasons.push('Prompt workflow requested');
  }

  if (analyticsKeywords.some((keyword) => lower.includes(keyword))) {
    routedTo.push('analytics');
    reasons.push('Analytics cues detected');
  }

  if (devopsKeywords.some((keyword) => lower.includes(keyword))) {
    routedTo.push('devops');
    reasons.push('DevOps cues detected');
  }

  if (routedTo.length === 0) {
    routedTo.push('prompt');
    reasons.push('Default routing to prompt assistance');
  }

  return {
    query,
    intent: routedTo[0] === 'prompt' ? 'prompt' : routedTo[0] === 'analytics' ? 'analytics' : 'general',
    routedTo,
    reasoning: reasons.join('; '),
    confidence: routedTo.length === 1 ? 0.85 : 0.7,
  };
}

function buildOrchestratorSystemPrompt(
  context: Record<string, unknown> | undefined,
  memory: AgentMemory,
  decision: OrchestratorDecision,
): string {
  return `You are Super Reasoning's Qwen orchestrator.

Answer the user's request directly and keep the response actionable.
Use the provided knowledge block when the request relates to prompts or prompt-library content.
Routing hint: ${decision.reasoning}
When you recommend library prompts, cite prompt ids.
If the user is improving a prompt, provide the improved prompt first, then a short explanation.${buildContextBlock(context, memory)}`;
}

function shouldTryDirectEnrichment(query: string, context?: AgentRunContext): boolean {
  if (!context?.currentPrompt) return false;
  const lower = query.toLowerCase();
  return [
    'zenginlestir',
    'iyilestir',
    'enrich',
    'improve',
    'refine',
    'enhance',
    'rewrite',
  ].some((keyword) => lower.includes(keyword));
}

export const triggerQwenAgent = async (task: string) => {
  const result = await runQwenPromptAgent(task);
  return { status: result.answer ? 'success' : 'error' };
};

export async function runQwenPromptAgent(
  query: string,
  _language: 'tr' | 'en' = 'en',
  context?: AgentRunContext,
): Promise<AgentRunResult> {
  const knowledge = await buildKnowledge(query);
  const result = await invokeQwenAgent({
    query,
    // The bridge currently supports en/zh only; Turkish queries still run with English instructions.
    language: 'en',
    systemPrompt: buildPromptSystemPrompt(context),
    knowledge,
  });

  let enrichedPrompt: string | undefined;
  if (shouldTryDirectEnrichment(query, context)) {
    try {
      const mode = query.toLowerCase().includes('deep') || query.toLowerCase().includes('derin')
        ? 'deep'
        : 'fast';
      const enriched = await enrichMasterPrompt(context!.currentPrompt!, {
        domainId: context?.domainId,
        framework: context?.framework,
        config: { mode },
      });
      if (enriched.integratedPrompts.length > 0 && enriched.enrichedPrompt.trim()) {
        enrichedPrompt = enriched.enrichedPrompt;
      }
    } catch {
      // Keep the model answer if enrichment fails.
    }
  }

  return {
    answer: result.answer?.trim() ?? '',
    toolCalls: [],
    model: result.model,
    enrichedPrompt,
  };
}

export async function runQwenOrchestrator(
  query: string,
  userId: string,
  context?: Record<string, unknown>,
): Promise<{ answer: string; decision: OrchestratorDecision; memory: AgentMemory }> {
  const memory = getAgentMemory(userId);
  const decision = buildDecision(query);
  const knowledge = await buildKnowledge(query);
  const result = await invokeQwenAgent({
    query,
    language: 'en',
    systemPrompt: buildOrchestratorSystemPrompt(context, memory, decision),
    knowledge,
  });

  return {
    answer: result.answer?.trim() ?? '',
    decision,
    memory,
  };
}

export interface QwenAgentStatusResult {
  ready: boolean;
  runtime?: string;
  sdk: string;
  model: string;
  provider?: string;
  repoPath?: string;
  error?: string;
  tools: string[];
  promptsLoaded: boolean;
  promptCount: number;
  targetPromptCount: number;
  indexedPromptCount?: number;
  vectorIndexedCount?: number;
  coveragePercent: number;
  categories: string[];
}

export async function getQwenAgentStatus(): Promise<QwenAgentStatusResult> {
  await ensurePrompts();
  const bridgeStatus = await getQwenBridgeStatus();
  const targetPromptCount = getPromptCorpusCount();
  const indexedPromptCount = promptMap.size;
  const coverageBase = Math.max(1, targetPromptCount);
  const coveragePercent = Math.min(100, Math.round((indexedPromptCount / coverageBase) * 100));

  return {
    ready: bridgeStatus.ready,
    runtime: 'qwen',
    sdk: bridgeStatus.sdk,
    model: bridgeStatus.model,
    provider: bridgeStatus.provider,
    repoPath: bridgeStatus.repoPath,
    error: bridgeStatus.error,
    tools: ['prompt_library_context'],
    promptsLoaded,
    promptCount: promptMap.size,
    targetPromptCount,
    indexedPromptCount,
    vectorIndexedCount: 0,
    coveragePercent,
    categories: Array.from(categoryCounts.keys()).sort(),
  };
}
