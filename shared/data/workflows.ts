import { WorkflowStepType } from '@/types';

export interface WorkflowPreset {
  id: string;
  nameTr: string;
  nameEn: string;
  descriptionTr: string;
  descriptionEn: string;
  steps: WorkflowStepType[];
}

export const WORKFLOW_PRESETS: WorkflowPreset[] = [
  {
    id: 'full',
    nameTr: 'Tam zincir',
    nameEn: 'Full pipeline',
    descriptionTr: 'Arastir → Ozetle → Prompt uret → Test et',
    descriptionEn: 'Research → Summarize → Generate prompt → Test',
    steps: ['research', 'summarize', 'generate_prompt', 'test'],
  },
  {
    id: 'quick',
    nameTr: 'Hizli',
    nameEn: 'Quick',
    descriptionTr: 'Prompt uret → Test et',
    descriptionEn: 'Generate prompt → Test',
    steps: ['generate_prompt', 'test'],
  },
  {
    id: 'research_prompt',
    nameTr: 'Arastirma + Prompt',
    nameEn: 'Research + Prompt',
    descriptionTr: 'Arastir (Gemini) → Prompt uret → Test',
    descriptionEn: 'Research (Gemini) → Generate → Test',
    steps: ['research', 'generate_prompt', 'test'],
  },
  {
    id: 'generate_only',
    nameTr: 'Sadece uret',
    nameEn: 'Generate only',
    descriptionTr: 'Tek adim: usta istem uret',
    descriptionEn: 'Single step: generate master prompt',
    steps: ['generate_prompt'],
  },
  {
    id: 'research_summarize',
    nameTr: 'Arastir + Ozetle',
    nameEn: 'Research + Summarize',
    descriptionTr: 'Arastir (Gemini) → Ozetle',
    descriptionEn: 'Research (Gemini) → Summarize',
    steps: ['research', 'summarize'],
  },
  {
    id: 'deep_research',
    nameTr: 'Derin arastirma',
    nameEn: 'Deep research',
    descriptionTr: 'Arastir → Ozetle → Arastir → Prompt uret → Test',
    descriptionEn: 'Research → Summarize → Research → Generate → Test',
    steps: ['research', 'summarize', 'research', 'generate_prompt', 'test'],
  },
  {
    id: 'test_only',
    nameTr: 'Sadece test',
    nameEn: 'Test only',
    descriptionTr: 'Mevcut promptu test et',
    descriptionEn: 'Test existing prompt',
    steps: ['test'],
  },
  {
    id: 'summarize_generate',
    nameTr: 'Ozetle + Uret',
    nameEn: 'Summarize + Generate',
    descriptionTr: 'Ozetle → Prompt uret → Test',
    descriptionEn: 'Summarize → Generate → Test',
    steps: ['summarize', 'generate_prompt', 'test'],
  },
];
