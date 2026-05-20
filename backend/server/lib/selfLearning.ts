import fs from 'fs';
import path from 'path';
import type { Framework, Language, PromptResponse } from '@/types';

const LEARNING_FILE = path.resolve(process.cwd(), 'data', 'self-learning-events.ndjson');
const MAX_STORED_EVENTS = 4000;
const READ_WINDOW = 500;

export interface SelfLearningEvent {
  id: string;
  ts: string;
  intent: string;
  framework: Framework;
  domainId: string;
  provider: string;
  language: Language;
  outputFormat: 'auto' | 'markdown' | 'json' | 'numbered' | 'table' | 'code' | 'xml';
  useSearch: boolean;
  thinkingMode: boolean;
  agentBlueprintMode: boolean;
  masterPrompt: string;
  reasoning: string;
  heuristicScore: number;
}

export interface LearningQuery {
  intent: string;
  framework: Framework;
  domainId: string;
  provider: string;
  language: Language;
  outputFormat: 'auto' | 'markdown' | 'json' | 'numbered' | 'table' | 'code' | 'xml';
}

function ensureLearningFile(): void {
  const dir = path.dirname(LEARNING_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(LEARNING_FILE)) fs.writeFileSync(LEARNING_FILE, '', 'utf8');
}

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .map((x) => x.trim())
    .filter((x) => x.length > 2);
}

function keywordOverlap(a: string, b: string): number {
  const aSet = new Set(tokenize(a));
  const bSet = new Set(tokenize(b));
  if (aSet.size === 0 || bSet.size === 0) return 0;
  let shared = 0;
  for (const word of aSet) {
    if (bSet.has(word)) shared += 1;
  }
  return shared / Math.max(aSet.size, 1);
}

function computeHeuristicScore(result: PromptResponse): number {
  const prompt = result.masterPrompt || '';
  const reasoning = result.reasoning || '';
  const pLen = prompt.length;
  const rLen = reasoning.length;
  const hasSections = /[\n\r].{2,40}:/.test(prompt) || /^#+\s/m.test(prompt);
  const hasBullets = /^\s*[-*]\s/m.test(prompt);
  const boundedReasoning = rLen > 20 && rLen < 900;
  let score = 0.4;
  if (pLen > 300 && pLen < 12000) score += 0.2;
  if (hasSections) score += 0.15;
  if (hasBullets) score += 0.1;
  if (boundedReasoning) score += 0.15;
  return Math.min(1, score);
}

function parseTailEvents(limit: number): SelfLearningEvent[] {
  if (!fs.existsSync(LEARNING_FILE)) return [];
  const raw = fs.readFileSync(LEARNING_FILE, 'utf8');
  if (!raw.trim()) return [];
  const lines = raw.trim().split('\n');
  const tail = lines.slice(Math.max(0, lines.length - limit));
  const out: SelfLearningEvent[] = [];
  for (const line of tail) {
    try {
      const parsed = JSON.parse(line) as SelfLearningEvent;
      if (parsed?.id && parsed?.intent) out.push(parsed);
    } catch {
      // Ignore corrupted row.
    }
  }
  return out;
}

function compactIfNeeded(): void {
  const raw = fs.readFileSync(LEARNING_FILE, 'utf8');
  const lines = raw.trim() ? raw.trim().split('\n') : [];
  if (lines.length <= MAX_STORED_EVENTS) return;
  const keep = lines.slice(lines.length - MAX_STORED_EVENTS);
  fs.writeFileSync(LEARNING_FILE, `${keep.join('\n')}\n`, 'utf8');
}

export function recordSelfLearningEvent(
  payload: Omit<SelfLearningEvent, 'id' | 'ts' | 'heuristicScore' | 'masterPrompt' | 'reasoning'> & { result: PromptResponse }
): void {
  try {
    ensureLearningFile();
    const event: SelfLearningEvent = {
      id: `sl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      ts: new Date().toISOString(),
      intent: payload.intent,
      framework: payload.framework,
      domainId: payload.domainId,
      provider: payload.provider,
      language: payload.language,
      outputFormat: payload.outputFormat,
      useSearch: payload.useSearch,
      thinkingMode: payload.thinkingMode,
      agentBlueprintMode: payload.agentBlueprintMode,
      masterPrompt: payload.result.masterPrompt || '',
      reasoning: payload.result.reasoning || '',
      heuristicScore: computeHeuristicScore(payload.result),
    };
    fs.appendFileSync(LEARNING_FILE, `${JSON.stringify(event)}\n`, 'utf8');
    compactIfNeeded();
  } catch (error) {
    console.warn('[SelfLearning] Record failed:', error instanceof Error ? error.message : String(error));
  }
}

export function buildSelfLearningContext(query: LearningQuery): string {
  try {
    ensureLearningFile();
    const events = parseTailEvents(READ_WINDOW);
    if (events.length === 0) return '';

    const scored = events.map((event) => {
      const sameDomain = event.domainId === query.domainId ? 0.2 : 0;
      const sameFramework = event.framework === query.framework ? 0.2 : 0;
      const sameProvider = event.provider === query.provider ? 0.1 : 0;
      const sameLanguage = event.language === query.language ? 0.1 : 0;
      const sameFormat = event.outputFormat === query.outputFormat ? 0.1 : 0;
      const overlap = keywordOverlap(query.intent, event.intent) * 0.3;
      const quality = event.heuristicScore * 0.2;
      return { event, score: sameDomain + sameFramework + sameProvider + sameLanguage + sameFormat + overlap + quality };
    });

    scored.sort((a, b) => b.score - a.score);
    const top = scored.filter((x) => x.score >= 0.35).slice(0, 3);
    if (top.length === 0) return '';

    const lines = top.map((item, idx) => {
      const snippet = item.event.masterPrompt.replace(/\s+/g, ' ').slice(0, 260);
      return `${idx + 1}. score=${item.score.toFixed(2)} | domain=${item.event.domainId} | framework=${item.event.framework} | provider=${item.event.provider}\n   snippet: ${snippet}`;
    });

    return [
      '[SELF_LEARNING_MEMORY]',
      'Use the following high-signal project memories as soft guidance. Reuse useful structure and avoid repeating weak patterns.',
      ...lines,
    ].join('\n');
  } catch (error) {
    console.warn('[SelfLearning] Context build failed:', error instanceof Error ? error.message : String(error));
    return '';
  }
}

export function getSelfLearningStats(): { totalEvents: number; filePath: string } {
  try {
    ensureLearningFile();
    const events = parseTailEvents(MAX_STORED_EVENTS + 10);
    return { totalEvents: events.length, filePath: LEARNING_FILE };
  } catch {
    return { totalEvents: 0, filePath: LEARNING_FILE };
  }
}
