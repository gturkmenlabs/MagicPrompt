import type { FrameworkName } from '@/types/framework.js';

export type FrameworkRegistryItem = {
  id: string;
  name: FrameworkName;
  description: string;
  supportedUseCases: string[];
  unsupportedUseCases: string[];
  requiredTools: string[];
  inputModalities: Array<'text' | 'table' | 'file' | 'web' | 'code'>;
  latencyProfile: 'low' | 'medium' | 'high';
  costProfile: 'low' | 'medium' | 'high';
  riskProfile: 'low' | 'medium' | 'high';
  samplePrompts: string[];
  embeddingText: string;
};
