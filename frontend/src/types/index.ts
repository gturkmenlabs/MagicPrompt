// Framework enum — used across server and client
export enum Framework {
  AUTO = 'auto',
  AGILE = 'agile',
  ANALOGICAL = 'analogical',
  BAB = 'bab',
  BACKCASTING = 'backcasting',
  BAYESIAN = 'bayesian',
  CARE = 'care',
  CATWOE = 'catwoe',
  CHAIN = 'chain',
  COSTAR = 'costar',
  CRITIC = 'critic',
  DECISION_MATRIX = 'decision-matrix',
  DELPHI = 'delphi',
  DESIGN_THINKING = 'design-thinking',
  DIALECTIC = 'dialectic',
  DSP = 'dsp',
  FIRST_PRINCIPLES = 'first-principles',
  FIVEWHYS = 'fivewhys',
  FUTURES_WHEEL = 'futures-wheel',
  GAME_THEORY = 'game-theory',
  HYPOTHESIS = 'hypothesis',
  INVERSION = 'inversion',
  JTBD = 'jtbd',
  KANO = 'kano',
  KERNEL = 'kernel',
  LATERAL = 'lateral',
  LEAN = 'lean',
  MECE = 'mece',
  META_PROMPT = 'meta-prompt',
  MIND_MAP = 'mind-map',
  MORPHOLOGICAL = 'morphological',
  MOSCOW = 'moscow',
  OKR = 'okr',
  OODA = 'ooda',
  PDCA = 'pdca',
  PESTEL = 'pestel',
  PORTER = 'porter',
  PREMORTEM = 'premortem',
  RAPID = 'rapid',
  REACT = 'react',
  REDTEAM = 'redteam',
  REWOO = 'rewoo',
  RISEN = 'risen',
  RTF = 'rtf',
  SCAMPER = 'scamper',
  SCENARIO = 'scenario',
  SELFREFINE = 'selfrefine',
  SIX_HATS = 'six-hats',
  SMART = 'smart',
  SOCRATIC = 'socratic',
  STAR = 'star',
  STEPBACK = 'stepback',
  SWOT = 'swot',
  SYSTEMS_THINKING = 'systems-thinking',
  TAG = 'tag',
  TREE = 'tree',
  TRIZ = 'triz',
}

// Types barrel export
export * from './abTest';
export * from './agent';
export * from './collaboration';
export * from './enrichment';
export * from './ir';
export * from './promptPack';
export * from './promptParser';
export * from './promptTemplate';
export * from './provenance';
export * from './rbac';
export * from './regression';
export * from './scim';
export * from './signedRelease';
export * from './ui';

// Resolve ambiguous exports if any
export type { PromptPack } from './promptPack';
export type { Permission } from './rbac';

// ── Generation / provider response types ───────────────────────────────────
export type Language = 'tr' | 'en';

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface Attachment {
  name: string;
  mimeType: string;
  /** Base64-encoded file content (no data URL prefix). */
  data: string;
  /** Optional inline preview (text snippet or image data URL). */
  preview?: string;
}

export interface PromptResponse {
  masterPrompt: string;
  reasoning?: string;
  detectedFramework?: string;
  detectedDomain?: string;
  groundingSources?: GroundingSource[];
  groundingScore?: number;
  /** Provider that ultimately fulfilled the request (after routing/fallback). */
  resolvedProvider?: string;
  /** Concrete model id that produced the response. */
  resolvedModel?: string;
}

// ── Workflow types ─────────────────────────────────────────────────────────
export type WorkflowStepType = 'research' | 'summarize' | 'generate_prompt' | 'test';

export interface WorkflowStepResult {
  step: WorkflowStepType;
  label?: string;
  output: string;
  promptResponse?: PromptResponse;
  testPass?: boolean;
  testDetail?: string;
}

export interface WorkflowRunResult {
  stepResults: WorkflowStepResult[];
  finalPrompt: PromptResponse | null;
  error?: string;
}

// ── Style profile (Interactive Teaching Mode) ──────────────────────────────
export interface StyleExample {
  /** Optional original user intent that produced this example. */
  input?: string;
  /** Master prompt / output that demonstrates the desired style. */
  output: string;
}

export interface StyleProfile {
  id: string;
  name: string;
  description?: string;
  toneKeywords?: string[];
  examples: StyleExample[];
  createdAt: string;
}
