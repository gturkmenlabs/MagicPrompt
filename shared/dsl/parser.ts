/**
 * Super Reasoning Prompt DSL v2 — .prompt file parser'i.
 * YAML + custom bloklar (# @meta, # @intent, # @style, # @examples, # @evaluation).
 */

import fs from 'fs/promises';
import yaml from 'js-yaml';
import crypto from 'crypto';
import type { ParsedPromptDSL, PromptDSL } from './prompt-dsl';
import { GUARDRAIL_BLOCKS, type GuardrailBlock } from '../services/irExtractor';

const GUARDRAIL_SET = new Set<string>(GUARDRAIL_BLOCKS);

/** YAML parse sonrasi ham obje tipi (optional alanlar) */
interface RawDSL {
  meta?: {
    name?: string;
    version?: string;
    domain?: string;
    framework?: string;
    author?: string;
    tags?: unknown[];
    license?: string;
    createdAt?: string;
  };
  name?: string;
  version?: string;
  domain?: string;
  framework?: string;
  tags?: unknown[];
  license?: string;
  intent?: string;
  style?: Record<string, unknown>;
  outputFormat?: string;
  examples?: unknown[];
  evaluation?: {
    judgeCriteria?: unknown[];
    successMetrics?: unknown[];
    minScore?: number;
  };
  guards?: unknown[];
}

export async function parsePromptDSL(filePath: string): Promise<ParsedPromptDSL> {
  const content = await fs.readFile(filePath, 'utf-8');
  const hash = crypto.createHash('sha256').update(content).digest('hex');

  // --- YAML + custom blocks ayristirma ---
  const blocks: Record<string, string> = {};
  let currentBlock = '';
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    if (line.startsWith('# @')) {
      currentBlock = line.slice(3).trim();
      blocks[currentBlock] = '';
    } else if (currentBlock) {
      blocks[currentBlock] += line + '\n';
    }
  }

  // Ana YAML parse (meta, intent, etc.) — bos/invalid YAML for varsayilan obje
  const rawLoaded = yaml.load(blocks['meta'] || content);
  let dsl: RawDSL = (rawLoaded && typeof rawLoaded === 'object' ? rawLoaded : {}) as RawDSL;

  // Bloklari doldur
  if (blocks['intent']) dsl.intent = blocks['intent'].trim();
  if (blocks['examples']) dsl.examples = yaml.load(blocks['examples']) as PromptDSL['examples'] || [];
  if (blocks['evaluation']) dsl.evaluation = yaml.load(blocks['evaluation']) as PromptDSL['evaluation'] || {};
  if (blocks['style']) {
    const styleBlock = yaml.load(blocks['style']) as Record<string, unknown> | undefined;
    if (styleBlock) {
      dsl.style = styleBlock;
      if (typeof styleBlock?.outputFormat === 'string') dsl.outputFormat = styleBlock.outputFormat as PromptDSL['outputFormat'];
    }
  }

  // Guardrail verification
  const guardsRaw = Array.isArray(dsl.guards) ? dsl.guards : [];
  const guards: GuardrailBlock[] = guardsRaw.filter((g): g is GuardrailBlock => typeof g === 'string' && GUARDRAIL_SET.has(g));

  // Varsayilan degerler
  const result: PromptDSL = {
    meta: {
      name: typeof dsl.meta?.name === 'string' ? dsl.meta.name : (dsl.name as string) ?? 'Unnamed',
      version: typeof dsl.meta?.version === 'string' ? dsl.meta.version : (dsl.version as string) ?? '1.0.0',
      domain: (dsl.meta?.domain ?? dsl.domain ?? 'e-commerce') as PromptDSL['meta']['domain'],
      framework: (dsl.meta?.framework ?? dsl.framework ?? 'claude-3-5-sonnet') as PromptDSL['meta']['framework'],
      author: typeof dsl.meta?.author === 'string' ? dsl.meta.author : undefined,
      tags: Array.isArray(dsl.meta?.tags) ? (dsl.meta.tags as string[]) : Array.isArray(dsl.tags) ? (dsl.tags as string[]) : [],
      license: (dsl.meta?.license ?? dsl.license) as PromptDSL['meta']['license'] | undefined,
      createdAt: typeof dsl.meta?.createdAt === 'string' ? dsl.meta.createdAt : undefined,
    },
    intent: typeof dsl.intent === 'string' ? dsl.intent : '',
    guards,
    style: dsl.style && typeof dsl.style === 'object' ? {
      tone: typeof (dsl.style as Record<string, unknown>).tone === 'string' ? (dsl.style as Record<string, unknown>).tone as string : undefined,
      length: typeof (dsl.style as Record<string, unknown>).length === 'string' ? (dsl.style as Record<string, unknown>).length as string : undefined,
      keywords: Array.isArray((dsl.style as Record<string, unknown>).keywords) ? (dsl.style as Record<string, unknown>).keywords as string[] : undefined,
    } : {},
    outputFormat: (dsl.outputFormat === 'yaml' || dsl.outputFormat === 'markdown' || dsl.outputFormat === 'json' || dsl.outputFormat === 'xml' || dsl.outputFormat === 'html') ? dsl.outputFormat as PromptDSL['outputFormat'] : 'markdown',
    examples: Array.isArray(dsl.examples) ? dsl.examples.map((ex: unknown) => ({
      input: typeof (ex as Record<string, unknown>)?.input === 'string' ? (ex as Record<string, unknown>).input as string : '',
      output: typeof (ex as Record<string, unknown>)?.output === 'string' ? (ex as Record<string, unknown>).output as string : '',
      explanation: typeof (ex as Record<string, unknown>)?.explanation === 'string' ? (ex as Record<string, unknown>).explanation as string : undefined,
    })) : [],
    evaluation: {
      judgeCriteria: Array.isArray(dsl.evaluation?.judgeCriteria) ? (dsl.evaluation.judgeCriteria as PromptDSL['evaluation']['judgeCriteria']) : [],
      successMetrics: Array.isArray(dsl.evaluation?.successMetrics) ? (dsl.evaluation.successMetrics as string[]) : [],
      minScore: typeof dsl.evaluation?.minScore === 'number' ? dsl.evaluation.minScore : 85,
    },
  };

  return {
    ...result,
    sourceFile: filePath,
    hash,
  };
}

/** Icerikten parse (file acmadan, mevcut API uyumlulugu) */
export function parsePromptDSLFromContent(content: string): Omit<ParsedPromptDSL, 'sourceFile'> {
  const hash = crypto.createHash('sha256').update(content).digest('hex');
  const blocks: Record<string, string> = {};
  let currentBlock = '';
  for (const line of content.split(/\r?\n/)) {
    if (line.startsWith('# @')) {
      currentBlock = line.slice(3).trim();
      blocks[currentBlock] = '';
    } else if (currentBlock) {
      blocks[currentBlock] += line + '\n';
    }
  }
  const rawLoaded = yaml.load(blocks['meta'] || content);
  let dsl: RawDSL = (rawLoaded && typeof rawLoaded === 'object' ? rawLoaded : {}) as RawDSL;
  if (blocks['intent']) dsl.intent = blocks['intent'].trim();
  if (blocks['examples']) dsl.examples = yaml.load(blocks['examples']) as PromptDSL['examples'] || [];
  if (blocks['evaluation']) dsl.evaluation = yaml.load(blocks['evaluation']) as PromptDSL['evaluation'] || {};
  if (blocks['style']) {
    const styleBlock = yaml.load(blocks['style']) as Record<string, unknown> | undefined;
    if (styleBlock) {
      dsl.style = styleBlock;
      if (typeof styleBlock?.outputFormat === 'string') dsl.outputFormat = styleBlock.outputFormat as PromptDSL['outputFormat'];
    }
  }
  const guardsRaw = Array.isArray(dsl.guards) ? dsl.guards : [];
  const guards: GuardrailBlock[] = guardsRaw.filter((g): g is GuardrailBlock => typeof g === 'string' && GUARDRAIL_SET.has(g));
  const result: PromptDSL = {
    meta: {
      name: typeof dsl.meta?.name === 'string' ? dsl.meta.name : (dsl.name as string) ?? 'Unnamed',
      version: typeof dsl.meta?.version === 'string' ? dsl.meta.version : (dsl.version as string) ?? '1.0.0',
      domain: (dsl.meta?.domain ?? dsl.domain ?? 'e-commerce') as PromptDSL['meta']['domain'],
      framework: (dsl.meta?.framework ?? dsl.framework ?? 'claude-3-5-sonnet') as PromptDSL['meta']['framework'],
      author: typeof dsl.meta?.author === 'string' ? dsl.meta.author : undefined,
      tags: Array.isArray(dsl.meta?.tags) ? (dsl.meta.tags as string[]) : Array.isArray(dsl.tags) ? (dsl.tags as string[]) : [],
      license: (dsl.meta?.license ?? dsl.license) as PromptDSL['meta']['license'] | undefined,
      createdAt: typeof dsl.meta?.createdAt === 'string' ? dsl.meta.createdAt : undefined,
    },
    intent: typeof dsl.intent === 'string' ? dsl.intent : '',
    guards,
    style: dsl.style && typeof dsl.style === 'object' ? {
      tone: typeof (dsl.style as Record<string, unknown>).tone === 'string' ? (dsl.style as Record<string, unknown>).tone as string : undefined,
      length: typeof (dsl.style as Record<string, unknown>).length === 'string' ? (dsl.style as Record<string, unknown>).length as string : undefined,
      keywords: Array.isArray((dsl.style as Record<string, unknown>).keywords) ? (dsl.style as Record<string, unknown>).keywords as string[] : undefined,
    } : {},
    outputFormat: (dsl.outputFormat === 'yaml' || dsl.outputFormat === 'markdown' || dsl.outputFormat === 'json' || dsl.outputFormat === 'xml' || dsl.outputFormat === 'html') ? dsl.outputFormat as PromptDSL['outputFormat'] : 'markdown',
    examples: Array.isArray(dsl.examples) ? dsl.examples.map((ex: unknown) => ({
      input: typeof (ex as Record<string, unknown>)?.input === 'string' ? (ex as Record<string, unknown>).input as string : '',
      output: typeof (ex as Record<string, unknown>)?.output === 'string' ? (ex as Record<string, unknown>).output as string : '',
      explanation: typeof (ex as Record<string, unknown>)?.explanation === 'string' ? (ex as Record<string, unknown>).explanation as string : undefined,
    })) : [],
    evaluation: {
      judgeCriteria: Array.isArray(dsl.evaluation?.judgeCriteria) ? (dsl.evaluation.judgeCriteria as PromptDSL['evaluation']['judgeCriteria']) : [],
      successMetrics: Array.isArray(dsl.evaluation?.successMetrics) ? (dsl.evaluation.successMetrics as string[]) : [],
      minScore: typeof dsl.evaluation?.minScore === 'number' ? dsl.evaluation.minScore : 85,
    },
  };
  return { ...result, hash } as Omit<ParsedPromptDSL, 'sourceFile'>;
}

/** Test for hizli kullanim */
export async function testParse(filePath: string): Promise<void> {
  const result = await parsePromptDSL(filePath);
  console.log('✅ DSL Parse Successful!');
  console.dir(result, { depth: 3 });
}
