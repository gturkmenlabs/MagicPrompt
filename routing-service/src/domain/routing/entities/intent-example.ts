import type { FrameworkName } from '@/types/framework.js';

export type IntentExample = {
  id: string;
  prompt: string;
  normalizedIntent: string;
  selectedFramework: FrameworkName;
  successScore: number;
  tags: string[];
  embedding?: number[];
  createdAt: string;
};
