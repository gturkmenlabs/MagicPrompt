import React, { useMemo, useState } from 'react';
import { Framework, type Attachment } from '@/types';
import type { ClientProvider } from '@/services/unifiedProviderClient';
import { getProviderLabel } from '@/services/unifiedProviderClient';
import type { OutputFormat } from '../OutputFormatSelector';
import type { Persona } from '../PersonaLibrary';
import type { PromptHistoryEntry } from '@/hooks/usePromptHistory';
import { Badge, Button, Card, SectionHeader, Select, Tabs } from '@/components/ui';

type RailView = 'live' | 'history' | 'versions';

type PromptLabWorkspaceState = {
  language: string;
  t: any;
  theme: 'dark' | 'light';
  framework: Framework;
  domainId: string;
  selectedDomainName: string;
  outputLanguage: 'tr' | 'en';
  provider: ClientProvider;
  claudeModel: 'sonnet' | 'opus';
  attachments: Attachment[];
  outputFormat: OutputFormat;
  activePersonaId?: string;
  loading: boolean;
  error: string | null;
  result?: { masterPrompt: string; reasoning?: string };
  dragActive: boolean;
  intent: string;
  agentMode: boolean;
  agentAnalyzing: boolean;
  agentHint: string | null;
  promptGuidance: React.ReactNode;
  promptLabRailView: RailView;
  railTabs: Array<{ id: RailView; label: string; count?: number }>;
  quickHistory: PromptHistoryEntry[];
  previousResult: string | null;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
};

type PromptLabWorkspaceActions = {
  onTemplateSelect: (template: any) => void;
  onPersonaApply: (persona: Persona) => void;
  onPersonaClear: () => void;
  onOutputLanguageChange: (lang: 'tr' | 'en') => void;
  onProviderChange: (provider: ClientProvider) => void;
  onDomainChange: (domainId: string) => void;
  onFrameworkChange: (framework: Framework) => void;
  onOutputFormatChange: (format: OutputFormat) => void;
  onToggleAgentMode: () => void;
  onThemeToggle: () => void;
  onVoiceTranscript: (text: string) => void;
  onOpenFilePicker: () => void;
  onIntentChange: (value: string) => void;
  onProcessFiles: (files: FileList | null) => void;
  onDrag: (event: React.DragEvent<HTMLElement>) => void;
  onDrop: (event: React.DragEvent<HTMLElement>) => void;
  onRemoveAttachment: (index: number) => void;
  onRetry: () => void;
  onGenerate: () => void;
  onOpenShortcuts: () => void;
  onRailViewChange: (view: RailView) => void;
  onInsertExample: () => void;
  onSuggestTemplate: () => void;
  onCopyResult: () => void;
  onDiffResult: () => void;
  onShareResult: () => void;
  onApplyResult: () => void;
  onReuseHistory: (entry: PromptHistoryEntry) => void;
  onRestoreVersion: (content: string) => void;
  onOpenDiff: () => void;
};

interface PromptLabWorkspaceProps {
  state: PromptLabWorkspaceState;
  actions: PromptLabWorkspaceActions;
}

const OUTPUT_LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'tr', label: 'Turkish' },
] as const;

const OUTPUT_FORMAT_OPTIONS = [
  { value: 'auto', label: 'Auto' },
  { value: 'markdown', label: 'Markdown' },
  { value: 'json', label: 'JSON' },
  { value: 'numbered', label: 'List' },
  { value: 'table', label: 'Table' },
  { value: 'code', label: 'Code' },
  { value: 'xml', label: 'XML' },
] as const;

const ROUTE_OPTIONS: Array<{ value: ClientProvider; label: string }> = [
  { value: 'auto', label: 'Automatic' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'gemini', label: 'Gemini' },
  { value: 'claude', label: 'Claude' },
  { value: 'groq', label: 'Groq' },
  { value: 'mistral', label: 'Mistral' },
  { value: 'deepseek', label: 'DeepSeek' },
  { value: 'openrouter', label: 'OpenRouter' },
  { value: 'huggingface', label: 'HuggingFace' },
  { value: 'ollama', label: 'Ollama' },
];

const FRAMEWORK_OPTIONS = Object.values(Framework).map((value) => ({
  value,
  label: value === Framework.AUTO ? 'Auto' : value,
}));

function AttachmentPill({
  attachment,
  index,
  onRemove,
}: {
  attachment: Attachment;
  index: number;
  onRemove: (index: number) => void;
}) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-[12px] text-slate-200">
      <span className="max-w-[220px] truncate">{attachment.name}</span>
      <button
        type="button"
        onClick={() => onRemove(index)}
        className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/[0.06] text-slate-300 transition-colors hover:bg-white/[0.1] hover:text-white"
        aria-label={`Remove ${attachment.name}`}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </span>
  );
}

export function PromptLabWorkspace({ state, actions }: PromptLabWorkspaceProps) {
  const {
    framework,
    selectedDomainName,
    outputLanguage,
    provider,
    claudeModel,
    attachments,
    outputFormat,
    loading,
    error,
    result,
    dragActive,
    intent,
    agentMode,
    agentAnalyzing,
    agentHint,
    promptGuidance,
    promptLabRailView,
    railTabs,
    quickHistory,
    previousResult,
    fileInputRef,
  } = state;

  const {
    onProviderChange,
    onOutputLanguageChange,
    onOutputFormatChange,
    onDomainChange,
    onFrameworkChange,
    onToggleAgentMode,
    onOpenFilePicker,
    onIntentChange,
    onProcessFiles,
    onDrag,
    onDrop,
    onRemoveAttachment,
    onGenerate,
    onOpenShortcuts,
    onRailViewChange,
    onInsertExample,
    onSuggestTemplate,
    onReuseHistory,
    onRestoreVersion,
    onOpenDiff,
  } = actions;

  const [advancedOpen, setAdvancedOpen] = useState(false);
  const canGenerate = intent.trim().length > 0 || attachments.length > 0;
  const providerLabel = useMemo(
    () => getProviderLabel(provider, claudeModel),
    [claudeModel, provider]
  );
  const domainOptions = useMemo(() => {
    const domains = state.t?.domains ?? {};
    return Object.entries(domains).map(([value, meta]) => ({
      value,
      label:
        value === 'auto'
          ? 'Auto detect'
          : (meta as { name?: string } | undefined)?.name ?? value,
    }));
  }, [state.t]);

  const liveSummary = [
    { label: 'Route', value: providerLabel },
    { label: 'Framework', value: framework === Framework.AUTO ? 'Auto' : framework },
    { label: 'Output', value: outputFormat === 'auto' ? 'Auto' : outputFormat },
    { label: 'Domain', value: selectedDomainName },
  ];

  return (
    <div className="workspace workspace--prompt space-y-6 animate-in fade-in duration-300">
      <Card
        tone="hero"
        className="workspace-panel workspace-panel--hero app-prompt-hero workspace-prompt__hero px-6 py-7 md:px-10 md:py-10"
      >
        <div className="workspace-prompt__hero-body relative z-[1] mx-auto flex w-full max-w-[920px] flex-col items-center text-center">
          <p className="ui-eyebrow">Prompt brief</p>
          <h2 className="mt-4 text-[clamp(2rem,4vw,3.35rem)] font-semibold leading-[0.95] tracking-[-0.06em] text-white">
            Write the brief once and keep the rest nearby.
          </h2>
          <p className="mt-4 max-w-[56ch] text-[15px] leading-7 text-slate-300">
            Define the task, audience, constraints, and output. Routing, history, and advanced controls stay close without crowding the page.
          </p>

          <div className="workspace-prompt__hero-badges mt-6 flex flex-wrap items-center justify-center gap-2">
            <Badge tone="info">{providerLabel}</Badge>
            <Badge tone="neutral">{selectedDomainName}</Badge>
            <Badge tone="neutral">
              {framework === Framework.AUTO ? 'Framework auto' : framework}
            </Badge>
            <Badge tone={result ? 'success' : 'neutral'}>
              {result ? 'Result ready' : 'Awaiting brief'}
            </Badge>
          </div>

          <div
            className={`workspace-prompt__composer mt-8 w-full rounded-[26px] border p-3 transition-all ${
              dragActive
                ? 'border-[#66aaff]/40 bg-[#66aaff]/[0.05]'
                : 'border-white/8 bg-black/10'
            }`}
            onDragEnter={onDrag}
            onDragLeave={onDrag}
            onDragOver={onDrag}
            onDrop={onDrop}
          >
            <textarea
              className="ui-textarea app-prompt-textarea w-full border-0 bg-transparent text-left text-slate-100 outline-none"
              placeholder="Describe the task. Include who it is for, the tone, the constraints, and the format you expect back."
              value={intent}
              onChange={(event) => onIntentChange(event.target.value)}
            />
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              onChange={(event) => onProcessFiles(event.target.files)}
              multiple
              accept="image/*,text/plain,application/pdf,.zip"
            />
          </div>

          {attachments.length > 0 && (
            <div className="workspace-prompt__attachments mt-4 flex w-full flex-wrap gap-2 text-left">
              {attachments.map((attachment, index) => (
                <AttachmentPill
                  key={`${attachment.name}-${index}`}
                  attachment={attachment}
                  index={index}
                  onRemove={onRemoveAttachment}
                />
              ))}
            </div>
          )}

          {error && (
            <div className="workspace-prompt__error mt-4 w-full rounded-[18px] border border-rose-300/18 bg-rose-400/10 px-4 py-3 text-left text-[13px] text-rose-100">
              {error}
            </div>
          )}

          <div className="workspace-prompt__actions mt-6 flex flex-wrap items-center justify-center gap-3">
            <Button
              variant="primary"
              size="lg"
              onClick={onGenerate}
              disabled={!canGenerate || loading}
            >
              {loading ? 'Generating prompt...' : 'Generate prompt'}
            </Button>
            <Button variant="secondary" size="md" onClick={onInsertExample}>
              Try an example
            </Button>
            <Button variant="ghost" size="md" onClick={onSuggestTemplate}>
              Open templates
            </Button>
            <Button variant="ghost" size="md" onClick={onOpenFilePicker}>
              Attach file
            </Button>
            <Button
              variant="ghost"
              size="md"
              onClick={() => setAdvancedOpen((value) => !value)}
            >
              {advancedOpen ? 'Hide advanced' : 'Show advanced'}
            </Button>
          </div>

          {!advancedOpen && quickHistory.length > 0 && (
            <div className="workspace-prompt__quick-history mt-8 flex w-full flex-wrap items-center justify-center gap-2">
              {quickHistory.slice(0, 3).map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => onReuseHistory(entry)}
                  className="workspace-prompt__quick-history-item rounded-full border border-white/8 bg-white/[0.035] px-4 py-2 text-[12px] text-slate-300 transition-colors hover:border-white/12 hover:bg-white/[0.05] hover:text-white"
                >
                  {entry.intent.slice(0, 58) || 'Reuse recent brief'}
                </button>
              ))}
            </div>
          )}
        </div>
      </Card>

      {advancedOpen && (
        <div className="workspace-prompt__advanced-grid grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <Card className="workspace-panel workspace-panel--soft workspace-prompt__advanced-card p-6">
            <SectionHeader
              eyebrow="Advanced"
              title="Route, format, and assistant controls"
              description="Adjust routing, framework, language, and output shape without pushing the main brief out of focus."
              actions={
                <button
                  type="button"
                  onClick={onToggleAgentMode}
                  className="workspace-prompt__agent-toggle inline-flex items-center gap-3 text-[13px] text-slate-200"
                >
                  <span className="app-switch" data-active={agentMode} aria-hidden="true" />
                  {agentMode ? 'Agent Assist Mode on' : 'Agent Assist Mode off'}
                </button>
              }
            />

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <Select
                label="Route"
                value={provider}
                onChange={(event) => onProviderChange(event.target.value as ClientProvider)}
                options={ROUTE_OPTIONS}
              />
              <Select
                label="Framework"
                value={framework}
                onChange={(event) => onFrameworkChange(event.target.value as Framework)}
                options={FRAMEWORK_OPTIONS}
              />
              <Select
                label="Domain"
                value={state.domainId}
                onChange={(event) => onDomainChange(event.target.value)}
                options={domainOptions}
              />
              <Select
                label="Output language"
                value={outputLanguage}
                onChange={(event) => onOutputLanguageChange(event.target.value as 'tr' | 'en')}
                options={OUTPUT_LANGUAGE_OPTIONS.map((item) => ({
                  value: item.value,
                  label: item.label,
                }))}
              />
              <Select
                label="Output format"
                value={outputFormat}
                onChange={(event) => onOutputFormatChange(event.target.value as OutputFormat)}
                options={OUTPUT_FORMAT_OPTIONS.map((item) => ({
                  value: item.value,
                  label: item.label,
                }))}
              />
            </div>

            <div className="workspace-prompt__summary-grid mt-4 grid gap-3 md:grid-cols-2">
              {liveSummary.map((item) => (
                <div key={item.label} className="ui-preview-surface workspace-prompt__summary-card">
                  <p className="ui-label mb-2">{item.label}</p>
                  <p className="text-[14px] font-medium text-white">{item.value}</p>
                </div>
              ))}
            </div>

            {(agentHint || agentAnalyzing) && (
              <div className="workspace-prompt__hint mt-4 rounded-[18px] border border-[#66aaff]/20 bg-[#66aaff]/[0.08] px-4 py-3">
                <p className="ui-label mb-2">Assistant cue</p>
                <p className="text-[13px] leading-6 text-slate-100">
                  {agentAnalyzing ? 'Analyzing the brief before generation...' : agentHint}
                </p>
              </div>
            )}

            <div className="workspace-prompt__guidance mt-5">
              {promptGuidance}
            </div>

            <div className="workspace-prompt__advanced-actions mt-5 flex flex-wrap gap-3">
              <Button variant="secondary" size="sm" onClick={onOpenShortcuts}>
                Keyboard shortcuts
              </Button>
              {previousResult && (
                <Button variant="ghost" size="sm" onClick={onOpenDiff}>
                  Compare with previous
                </Button>
              )}
            </div>
          </Card>

          <Card className="workspace-panel workspace-panel--soft workspace-prompt__rail-card p-6">
            <SectionHeader
              eyebrow="Context"
              title="History and versions"
              description="Recent briefs and previous prompt versions stay close for quick reuse and comparison."
            />
            <Tabs
              value={promptLabRailView}
              items={railTabs}
              onChange={onRailViewChange}
              className="workspace-prompt__rail-tabs mt-5"
            />

            <div className="workspace-prompt__rail-content mt-5 space-y-3">
              {promptLabRailView === 'live' && (
                <>
                  <div className="ui-preview-surface workspace-prompt__rail-surface">
                    <p className="ui-label mb-2">Current status</p>
                    <p className="text-[14px] font-medium text-white">
                      {result ? 'A result is ready below.' : 'Generate when the brief feels complete.'}
                    </p>
                    <p className="ui-helper mt-2">
                      {attachments.length > 0
                        ? `${attachments.length} attachment${attachments.length > 1 ? 's' : ''} included.`
                        : 'No attachments added yet.'}
                    </p>
                  </div>
                  <div className="ui-preview-surface workspace-prompt__rail-surface">
                    <p className="ui-label mb-2">Why this page is calm</p>
                    <p className="ui-helper">
                      The brief stays primary. Export, scoring, and deeper tools appear only after a result exists.
                    </p>
                  </div>
                </>
              )}

              {promptLabRailView === 'history' && (
                quickHistory.length > 0 ? (
                  quickHistory.map((entry) => (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => onReuseHistory(entry)}
                      className="ui-list-row ui-list-row--interactive workspace-prompt__history-row w-full text-left"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="ui-list-row__title">
                          {entry.intent.slice(0, 88) || 'Recent brief'}
                        </p>
                        <p className="ui-list-row__description">
                          {new Date(entry.createdAt).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="ui-empty-state workspace-empty-state">
                    <p className="ui-empty-state__title">No recent briefs yet</p>
                    <p className="ui-empty-state__description">
                      Your latest inputs will appear here so you can restart from them quickly.
                    </p>
                  </div>
                )
              )}

              {promptLabRailView === 'versions' && (
                previousResult ? (
                  <div className="space-y-3">
                    <div className="ui-preview-surface workspace-prompt__rail-surface">
                      <p className="ui-label mb-2">Previous version</p>
                      <pre className="workspace-prompt__version-text max-h-[220px] overflow-auto whitespace-pre-wrap text-[12px] leading-6 text-slate-200">
                        {previousResult}
                      </pre>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => onRestoreVersion(previousResult)}
                      >
                        Restore previous
                      </Button>
                      <Button variant="secondary" size="sm" onClick={onOpenDiff}>
                        Open diff
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="ui-empty-state workspace-empty-state">
                    <p className="ui-empty-state__title">No saved versions yet</p>
                    <p className="ui-empty-state__description">
                      Once you generate again, the earlier prompt version will stay here for a quick comparison.
                    </p>
                  </div>
                )
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

export default PromptLabWorkspace;
