import { create } from 'zustand';
import type { Framework, PromptResponse, Attachment } from '@/types';

export interface GenerationState {
  intent: string;
  framework: Framework;
  domainId: string;
  loading: boolean;
  error: string | null;
  result: PromptResponse | null;
  attachments: Attachment[];
  dragActive: boolean;
}

interface GenerationActions {
  setIntent: (intent: string) => void;
  setFramework: (framework: Framework) => void;
  setDomain: (domainId: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setResult: (result: PromptResponse | null) => void;
  addAttachments: (files: Attachment[]) => void;
  removeAttachment: (index: number) => void;
  setDragActive: (active: boolean) => void;
  startGeneration: () => void;
  generationSuccess: (result: PromptResponse) => void;
  generationError: (error: string) => void;
  updateResult: (partial: Partial<PromptResponse>) => void;
  resetGeneration: () => void;
}

export const useGenerationStore = create<GenerationState & GenerationActions>((set) => ({
  intent: '',
  framework: 'AUTO' as Framework,
  domainId: 'auto',
  loading: false,
  error: null,
  result: null,
  attachments: [],
  dragActive: false,

  setIntent: (intent) => set({ intent }),
  setFramework: (framework) => set({ framework }),
  setDomain: (domainId) => set({ domainId }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setResult: (result) => set({ result }),
  addAttachments: (files) => set((s) => ({ attachments: [...s.attachments, ...files] })),
  removeAttachment: (index) => set((s) => ({ attachments: s.attachments.filter((_, i) => i !== index) })),
  setDragActive: (dragActive) => set({ dragActive }),
  startGeneration: () => set({ loading: true, error: null, result: null }),
  generationSuccess: (result) => set({ loading: false, result }),
  generationError: (error) => set({ loading: false, error }),
  updateResult: (partial) => set((s) => ({
    result: s.result ? { ...s.result, ...partial } : null,
  })),
  resetGeneration: () => set({
    intent: '',
    framework: 'AUTO' as Framework,
    domainId: 'auto',
    loading: false,
    error: null,
    result: null,
    attachments: [],
    dragActive: false,
  }),
}));
