export const FRAMEWORKS = [
  'rag-agent',
  'sql-agent',
  'code-agent',
  'search-agent',
  'workflow-agent',
  'summarizer-agent',
  'general-orchestrator',
] as const;

export type FrameworkName = (typeof FRAMEWORKS)[number];

export type CandidateFramework = {
  name: FrameworkName;
  score: number;
};
