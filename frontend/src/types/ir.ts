/**
 * IR (Intermediate Representation) — Portable, derlenebilir prompt spesifikasyonu.
 * Intent → IR → model'e ozel prompt derleme.
 */

export interface IRGoal {
  id: string;
  description: string;
  priority: number;
}

export type IRConstraintType = 'format' | 'scope' | 'budget' | 'security' | 'output';

export interface IRConstraint {
  type: IRConstraintType;
  rule: string;
}

export interface IRFormatSection {
  id: string;
  max_tokens?: number;
  required: boolean;
  structure?: string[];
}

export interface IRFormatSchema {
  sections: IRFormatSection[];
}

export interface IRExample {
  input: string;
  output_preview?: string;
}

export interface IRToolContract {
  name: string;
  description?: string;
  parameters?: Record<string, unknown>;
}

export interface IR {
  version: string;
  intent_raw: string;
  intent_compressed: string;
  framework: string;
  domain_id: string;
  context_rules: string;

  goals: IRGoal[];
  constraints: IRConstraint[];
  format_schema: IRFormatSchema;
  security_policies: string[];
  examples: IRExample[];
  tool_contracts: IRToolContract[];
  stop_conditions: string[];
  /** v3.2.1: Intent-based guard detection confidence (0–1). */
  confidence?: number;
}

export type ProviderType = 'groq' | 'gemini' | 'huggingface' | 'claude' | 'claude-opus' | 'openrouter' | 'deepseek' | 'openai' | 'ollama' | 'mistral';

export interface CompiledPrompt {
  system: string;
  user: string;
  provider: ProviderType;
}

/** DSL → IR pipeline for guardrail kaydi (nesne formu) */
export interface GuardrailBlock {
  type: string;
  severity?: string;
  message?: string;
}

/** DSL'den uretilen zengin IR (domainFocus, styleProfile, evaluation vb.) */
export interface IntermediateRepresentation {
  intent: string;
  domain: string;
  framework: string;
  domainFocus: string[];
  frameworkFocus: string[];
  guardrails: GuardrailBlock[];
  styleProfile: { tone?: string; length?: string; keywords?: string[] };
  outputFormat: string;
  fewShotExamples: { input: string; output: string; explanation?: string }[];
  evaluationCriteria: { name?: string; expression?: string }[];
  successMetrics: string[];
  minScore: number;
  meta: {
    name: string;
    version: string;
    author?: string;
    tags: string[];
    license?: string;
    hash?: string;
  };
}

/** compileIRToPrompt ciktisi — tam metin prompt + meta */
export interface MasterPrompt {
  fullPrompt: string;
  intent: string;
  judgeScore?: number;
}
