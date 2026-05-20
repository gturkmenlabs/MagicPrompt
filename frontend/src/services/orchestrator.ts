/**
 * Multi-step Agent Orchestration
 * Zincir: arastir → ozetle → prompt uret → test et
 * Her adimin ciktisi bir sonrakine aktarilir.
 */

import { Framework, PromptResponse, Attachment, WorkflowStepType, WorkflowStepResult, WorkflowRunResult, Language } from '@/types';
import { getOutputAnalysis } from '@/utils/analysis';

export type GenerateFn = (
  intent: string,
  framework: Framework,
  domainId: string,
  useSearch: boolean,
  thinkingMode: boolean,
  contextRules: string,
  attachments?: Attachment[],
  styleContext?: string
) => Promise<PromptResponse>;

export interface RunWorkflowOptions {
  steps: WorkflowStepType[];
  initialIntent: string;
  framework: Framework;
  domainId: string;
  provider: string;
  thinkingMode?: boolean;
  language?: Language;
  contextRules: string;
  attachments?: Attachment[];
  styleContext?: string;
  systemPrompt?: string;
  generateFn: GenerateFn;
  labels?: Partial<Record<WorkflowStepType, string>>;
}

const DEFAULT_LABELS: Record<WorkflowStepType, string> = {
  research: 'Research',
  summarize: 'Summarize',
  generate_prompt: 'Generate Prompt',
  test: 'Test',
};

export async function runWorkflow(options: RunWorkflowOptions): Promise<WorkflowRunResult> {
  const {
    steps,
    initialIntent,
    framework,
    domainId,
    provider,
    thinkingMode = false,
    contextRules,
    attachments = [],
    styleContext,
    generateFn,
    labels: customLabels,
  } = options;

  const labels = { ...DEFAULT_LABELS, ...customLabels };
  const stepResults: WorkflowStepResult[] = [];
  let context = initialIntent.trim();
  let lastPromptResponse: PromptResponse | null = null;

  for (const step of steps) {
    try {
      if (step === 'research') {
        const useSearch = provider === 'gemini' || provider === 'claude';
        if (!useSearch) {
          stepResults.push({
            step: 'research',
            label: labels.research,
            output: 'Research step only available with Gemini or Claude + Web Search. Skipped.',
          });
          continue;
        }
        const res = await generateFn(
          context,
          framework,
          domainId,
          true,
          provider === 'claude' ? thinkingMode : false,
          contextRules,
          attachments,
          styleContext
        );
        context = `${res.reasoning}\n\n${res.masterPrompt}`.slice(0, 8000);
        stepResults.push({
          step: 'research',
          label: labels.research,
          output: context.slice(0, 1500) + (context.length > 1500 ? '…' : ''),
          promptResponse: res,
        });
      } else if (step === 'summarize') {
        const summarizeIntent =
          `Summarize the following into a short brief for master prompt design. List only key requirements. No extra commentary.\n\n---\n${context}`;
        const res = await generateFn(
          summarizeIntent,
          framework,
          domainId,
          false,
          false,
          contextRules,
          [],
          styleContext
        );
        context = res.masterPrompt;
        stepResults.push({
          step: 'summarize',
          label: labels.summarize,
          output: context.slice(0, 2000) + (context.length > 2000 ? '…' : ''),
          promptResponse: res,
        });
      } else if (step === 'generate_prompt') {
        const res = await generateFn(
          context,
          framework,
          domainId,
          false,
          thinkingMode,
          contextRules,
          attachments,
          styleContext
        );
        lastPromptResponse = res;
        context = res.masterPrompt;
        stepResults.push({
          step: 'generate_prompt',
          label: labels.generate_prompt,
          output: res.masterPrompt,
          promptResponse: res,
        });
      } else if (step === 'test') {
        const promptToTest = lastPromptResponse ?? { masterPrompt: context, reasoning: '' };
        const analysis = getOutputAnalysis(promptToTest);
        const testPass = analysis.sectionCount >= 1 && analysis.masterPromptWords > 0;
        const detail =
          `Sections: ${analysis.sectionCount}, words: ${analysis.masterPromptWords}. ${testPass ? 'Passed.' : 'Structure check warning.'}`;
        stepResults.push({
          step: 'test',
          label: labels.test,
          output: detail,
          testPass,
          testDetail: detail,
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      stepResults.push({
        step,
        label: labels[step],
        output: message,
      });
      return {
        stepResults,
        finalPrompt: lastPromptResponse,
        error: message,
      };
    }
  }

  return {
    stepResults,
    finalPrompt: lastPromptResponse,
  };
}
