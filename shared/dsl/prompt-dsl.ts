/**
 * Super Reasoning Prompt DSL v2 — Tip tanimlari.
 * .prompt dosyalari bu yapiya parse edilir; IR → derleyici pipeline ile kullanilir.
 */

import type { GuardrailBlock } from '../services/irExtractor';

/** DSL for desteklenen domain ID'leri (schema ile uyumlu) */
export const DOMAIN_IDS = [
  'e-commerce',
  'healthcare',
  'finance',
  'education',
  'legal',
  'creative',
  'technical',
  'marketing',
] as const;

/** DSL for desteklenen framework (LLM) anahtarlari */
export const FRAMEWORK_META = [
  'claude-3-5-sonnet',
  'gpt-4o',
  'gemini-1.5-pro',
  'deepseek-r1',
  'grok-3',
] as const;

export interface FewShotExample {
  input: string;
  output: string;
  explanation?: string;
}

/** Stil profili — tone, length, keywords (DSL bloklari for) */
export interface StyleProfile {
  tone?: string;
  length?: string;
  keywords?: string[];
}

export interface JudgeCriterion {
  name?: string;
  expression?: string;
}

export interface PromptDSL {
  meta: {
    name: string;
    version: string; // semantic versioning (orn. 3.2.1)
    domain: (typeof DOMAIN_IDS)[number];
    framework: (typeof FRAMEWORK_META)[number];
    author?: string;
    tags: string[];
    license?: 'MIT' | 'CC-BY-4.0' | 'commercial' | 'proprietary';
    createdAt?: string;
  };
  intent: string; // raw intent metni
  guards: GuardrailBlock[];
  style: StyleProfile;
  outputFormat: 'markdown' | 'json' | 'xml' | 'html' | 'yaml';
  examples: FewShotExample[];
  evaluation: {
    judgeCriteria: JudgeCriterion[];
    successMetrics: string[];
    minScore: number; // 0-100
  };
}

/** Yardimci tip (parse sonucu) */
export interface ParsedPromptDSL extends PromptDSL {
  sourceFile?: string;
  hash?: string; // content hash for versioning
}
