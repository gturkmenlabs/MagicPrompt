import React, { useMemo, useState } from 'react';
import AILabWorkbench from '@/components/AILabWorkbench';
import { Badge, Button, Card, SectionHeader } from '@/components/ui';

interface AnalyticsSnapshot {
  totalGenerations: number;
  overallSuccessRate: number;
  overallEditRate: number;
  avgLatencyMs: number;
  topDomains: Array<{ domain: string; successRate: number; count: number }>;
  topFrameworks: Array<{ framework: string; editRate: number; count: number }>;
  topProviders: Array<{ provider: string; successRate: number; count: number }>;
}

interface AILabWorkspaceProps {
  language: string;
  currentPrompt?: string;
  domainId?: string;
  framework?: string;
  analyticsSnapshot?: AnalyticsSnapshot;
  workflowPresetId?: string;
  onApplyEnrichedPrompt?: (enriched: string) => void;
}

export function AILabWorkspace({
  language,
  currentPrompt,
  domainId,
  framework,
  analyticsSnapshot,
  workflowPresetId,
  onApplyEnrichedPrompt,
}: AILabWorkspaceProps) {
  const [taskDraft, setTaskDraft] = useState('');
  const [prefillQuery, setPrefillQuery] = useState('');
  const [prefillToken, setPrefillToken] = useState(0);
  const [showAdvanced, setShowAdvanced] = useState(true);

  const quickInsertItems = useMemo(
    () => [
      'Turn this into a concise 3-step plan.',
      'Make this prompt safer and clearer.',
      'Rewrite this for a non-technical audience.',
      'Convert the output into a markdown table.',
    ],
    []
  );

  const handleSendToConsole = (value: string) => {
    const nextValue = value.trim();
    if (!nextValue) return;
    setPrefillQuery(nextValue);
    setPrefillToken((current) => current + 1);
    setShowAdvanced(true);
    
    // Auto-scroll to workbench after a short delay to allow it to render
    setTimeout(() => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }, 100);
  };

  return (
    <div className="workspace workspace--ailab space-y-6">
      <Card tone="hero" className="workspace-panel workspace-panel--hero workspace-ailab__hero p-6 md:p-7">
        <SectionHeader
          eyebrow="AI Lab"
          title="Three steps: task, run, review"
          description="Start with a short task, keep context visible, and open the full workbench only when needed."
          actions={
            <>
              <Badge tone={currentPrompt ? 'success' : 'neutral'}>
                {currentPrompt ? 'Prompt connected' : 'No prompt linked'}
              </Badge>
              <Badge tone="info">{workflowPresetId || 'quick flow'}</Badge>
            </>
          }
        />

        <div className="workspace-ailab__steps mt-6 grid gap-3 md:grid-cols-3">
          {[
            {
              title: '1. Define the task',
              body: 'A short instruction is enough. AI Lab expands it into a more structured flow.',
            },
            {
              title: '2. Start the run',
              body: 'Use one primary CTA. The system passes the task into the workbench below.',
            },
            {
              title: '3. Review the result',
              body: 'Stay in the quick view or open the full workbench for deeper controls.',
            },
          ].map((step, index) => (
            <div key={step.title} className={`ui-step-card workspace-ailab__step ${index === 1 ? 'active' : ''}`}>
              <p className="text-[14px] font-semibold text-white">{step.title}</p>
              <p className="ui-helper mt-2">{step.body}</p>
            </div>
          ))}
        </div>
      </Card>

      <div className="workspace-ailab__grid grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <Card className="workspace-panel workspace-panel--soft workspace-ailab__task-card p-6">
          <SectionHeader
            eyebrow="Step 1"
            title="Write the task"
            description="Keep it short. The deeper agent configuration stays behind the scenes until you need it."
          />

          <div className="workspace-ailab__chips mt-5 flex flex-wrap gap-2">
            {quickInsertItems.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setTaskDraft(item)}
                className="workspace-ailab__chip rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-[12px] text-slate-200 transition-colors hover:border-white/14 hover:bg-white/[0.05] hover:text-white"
              >
                {item}
              </button>
            ))}
          </div>

          <textarea
            value={taskDraft}
            onChange={(event) => setTaskDraft(event.target.value)}
            placeholder="Example: Improve the current prompt so it is safer, clearer, and easier to scan."
            className="ui-textarea workspace-ailab__textarea mt-5 min-h-[220px]"
          />

          <div className="workspace-ailab__task-actions mt-5 flex flex-wrap items-center gap-3">
            <Button
              variant="primary"
              size="lg"
              disabled={!taskDraft.trim()}
              onClick={() => handleSendToConsole(taskDraft)}
            >
              Start task
            </Button>
            <Button
              variant="secondary"
              size="md"
              onClick={() => {
                if (!currentPrompt) return;
                const nextValue = 'Use the current prompt as context and improve it for clarity and safety.';
                setTaskDraft(nextValue);
                handleSendToConsole(nextValue);
              }}
              disabled={!currentPrompt}
            >
              Start from current prompt
            </Button>
          </div>
        </Card>

        <Card className="workspace-panel workspace-panel--soft workspace-ailab__context-card p-6">
          <SectionHeader
            eyebrow="Step 2"
            title="Keep context visible"
            description="Prompt status, domain, and recent signal stay nearby so the task remains the main focus."
          />

          <div className="workspace-ailab__context-grid mt-5 space-y-3">
            <div className="ui-preview-surface workspace-ailab__surface">
              <p className="ui-label mb-2">Prompt status</p>
              <p className="text-[14px] font-medium text-white">
                {currentPrompt ? 'A prompt is linked and ready to enrich.' : 'No prompt linked yet.'}
              </p>
              <p className="ui-helper mt-2">
                {currentPrompt
                  ? 'You can start from the linked prompt or send a fresh AI Lab task.'
                  : 'You can still run AI Lab with a standalone task brief.'}
              </p>
            </div>

            <div className="ui-preview-surface workspace-ailab__surface">
              <p className="ui-label mb-2">Working context</p>
              <p className="text-[14px] font-medium text-white">
                {domainId || 'auto'} · {framework || 'AUTO'}
              </p>
              <p className="ui-helper mt-2">
                Routing, enrichment, and task execution inherit this workspace context.
              </p>
            </div>

            {analyticsSnapshot && (
              <div className="ui-preview-surface workspace-ailab__surface">
                <p className="ui-label mb-2">Recent signal</p>
                <p className="text-[22px] font-semibold tracking-[-0.04em] text-white">
                  {analyticsSnapshot.overallSuccessRate}%
                </p>
                <p className="ui-helper mt-2">
                  Success rate with {analyticsSnapshot.avgLatencyMs}ms average latency across recent runs.
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>

      <Card className="workspace-panel workspace-panel--soft workspace-ailab__review-card p-6">
        <SectionHeader
          eyebrow="Step 3"
          title="Review before expanding"
          description="Stay in quick mode first, then open the advanced workbench only when deeper control is useful."
          actions={(
            <Button variant="secondary" size="sm" onClick={() => setShowAdvanced((value) => !value)}>
              {showAdvanced ? 'Hide advanced workbench' : 'Open advanced workbench'}
            </Button>
          )}
        />

        {showAdvanced ? (
          <div className="workspace-ailab__advanced mt-5">
            <AILabWorkbench
              currentPrompt={currentPrompt}
              domainId={domainId}
              framework={framework}
              analyticsSnapshot={analyticsSnapshot}
              onApplyEnrichedPrompt={onApplyEnrichedPrompt}
              prefillQuery={prefillQuery}
              prefillToken={prefillToken}
              showQuickQueries={false}
            />
          </div>
        ) : (
          <div className="ui-empty-state workspace-empty-state workspace-ailab__empty mt-5 max-w-none">
            <p className="ui-empty-state__title">Quick mode is active</p>
            <p className="ui-empty-state__description">
              Start the task above and keep the page focused. Open the full workbench only for richer controls or longer iteration.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}

export default AILabWorkspace;
