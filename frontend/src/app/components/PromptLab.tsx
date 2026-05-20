import { BentoCard } from './BentoCard';
import { Sparkles, Send, FileText, TrendingUp, Users, Zap, Clock, ArrowLeft, CheckCircle2, Paperclip } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { AppPage } from '../App';

export function PromptLab({
  resetSignal = 0,
  seedBrief = '',
  onOpenPage,
}: {
  resetSignal?: number;
  seedBrief?: string;
  onOpenPage?: (page: AppPage) => void;
}) {
  const [briefText, setBriefText] = useState('');
  const [hasGenerated, setHasGenerated] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [selectedStage, setSelectedStage] = useState<'brief' | 'routed' | 'generated' | 'refined'>('routed');
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const templatesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setBriefText(seedBrief);
    setHasGenerated(false);
    setSelectedStage('routed');
    setUploadedFile(null);
    setToast(seedBrief ? 'Brief loaded in Prompt Lab.' : 'New prompt workspace ready.');
  }, [resetSignal, seedBrief]);

  const showMessage = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2500);
  };

  const templates = [
    { icon: FileText, name: 'Content Brief', desc: 'Marketing & SEO content', prompt: 'Create a content brief for a product launch. Include audience, SEO keywords, narrative angle, outline, CTA, and quality checklist.' },
    { icon: TrendingUp, name: 'Analysis', desc: 'Data analysis & insights', prompt: 'Analyze the following business data. Identify patterns, anomalies, likely causes, and recommended actions with confidence levels.' },
    { icon: Users, name: 'Persona', desc: 'User persona creation', prompt: 'Create a detailed user persona. Include goals, pains, objections, decision triggers, channels, and messaging recommendations.' },
    { icon: Zap, name: 'Quick Task', desc: 'Fast single-shot prompt', prompt: 'Complete this task quickly and clearly. Ask no follow-up unless required. Return the final answer with concise reasoning.' },
  ];

  const recentPrompts = [
    { title: 'Product launch announcement', time: '2 hours ago', status: 'completed', brief: 'Write a product launch announcement for NeoMagic with positioning, feature highlights, social snippets, and email copy.' },
    { title: 'Customer feedback analysis', time: '5 hours ago', status: 'completed', brief: 'Summarize customer feedback, group recurring themes, score sentiment, and propose product changes.' },
    { title: 'Social media campaign', time: '1 day ago', status: 'completed', brief: 'Plan a one-week social media campaign for NeoMagic with posts for LinkedIn, X, and Instagram.' },
    { title: 'Email newsletter draft', time: '2 days ago', status: 'completed', brief: 'Draft a concise email newsletter announcing new AI prompt workflow capabilities.' },
    { title: 'Support macro cleanup', time: '4 days ago', status: 'completed', brief: 'Rewrite support macros to be clearer, friendlier, and faster to scan.' },
    { title: 'Landing page QA', time: '1 week ago', status: 'completed', brief: 'Review landing page copy for clarity, conversion, and missing proof points.' },
  ];

  const communityTemplates = [
    { title: 'SEO Meta Description Generator', author: 'Marketing Team', uses: 234, brief: 'Generate 10 SEO meta descriptions with keyword coverage, search intent fit, and character counts.' },
    { title: 'Technical Documentation Writer', author: 'Dev Team', uses: 189, brief: 'Write technical documentation from the following notes. Include overview, prerequisites, steps, examples, and troubleshooting.' },
    { title: 'Customer Support Response', author: 'Support Team', uses: 156, brief: 'Write a customer support response that acknowledges the issue, explains the fix, and offers next steps.' },
  ];

  const visiblePrompts = showAllHistory ? recentPrompts : recentPrompts.slice(0, 4);
  const generatedPrompt = `Role: Senior AI workflow strategist

Goal: ${briefText || 'Create a high quality prompt.'}

Instructions:
1. Clarify the desired outcome, audience, constraints, and acceptance criteria.
2. Produce a structured answer with assumptions, plan, execution steps, and quality checks.
3. Prefer concise, actionable language over generic explanation.
4. Return a final checklist for validation.${uploadedFile ? `\n\nAttached context: ${uploadedFile}` : ''}`;

  return (
    <div className="w-full min-h-screen p-8 bg-[var(--surface-base)]">
      {toast && (
        <div className="fixed right-6 top-20 z-50 rounded-lg border border-[var(--border-default)] bg-[var(--surface-1)] px-4 py-3 text-sm text-[var(--text-primary)] shadow-xl">
          {toast}
        </div>
      )}
      {!hasGenerated ? (
        <div className="grid grid-cols-12 gap-8 max-w-[1440px] mx-auto">
          {/* Main Brief Editor - Spotlight */}
          <div className="col-span-8 row-span-3">
            <BentoCard variant="spotlight" padding="wide">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--iolite-500)] to-[var(--aurora-500)] flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h1
                    className="text-[var(--text-primary)] mb-2 font-['Instrument_Serif'] italic"
                    style={{ fontSize: 'var(--text-display-lg)', lineHeight: 'var(--lh-display-lg)' }}
                  >
                    Write the brief once,
                    <br />
                    <span className="not-italic">keep the rest</span> nearby.
                  </h1>
                  <p className="text-[var(--text-secondary)]" style={{ fontSize: 'var(--text-body-lg)' }}>
                    Your central workspace for prompt engineering. Write, test, and refine AI prompts with intelligent routing and optimization.
                  </p>
                </div>
              </div>

              {/* Brief Textarea */}
              <div className="relative">
                <textarea
                  value={briefText}
                  onChange={(e) => setBriefText(e.target.value)}
                  placeholder="Start writing your prompt brief... Use / for templates, # for headings, ``` for code blocks"
                  className="w-full min-h-[240px] p-4 bg-[var(--surface-3)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] resize-none focus:outline-none focus:border-[var(--iolite-500)] focus:ring-2 focus:ring-[var(--iolite-500)]/20 transition-all"
                  style={{
                    fontSize: 'var(--text-body)',
                    lineHeight: 'var(--lh-body)',
                  }}
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                      setUploadedFile(file.name);
                      showMessage(`${file.name} attached.`);
                    }
                  }}
                />
                <div className="absolute bottom-3 right-3 flex items-center gap-2">
                  <div className="px-2 py-1 rounded bg-[var(--surface-2)] border border-[var(--border-subtle)]">
                    <span className="text-xs text-[var(--success-500)] font-semibold">
                      {briefText.length} chars
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Bar */}
              <div className="mt-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      setHasGenerated(true);
                      setSelectedStage('routed');
                      showMessage('Prompt generated.');
                    }}
                    disabled={!briefText}
                    className="h-12 px-6 rounded-lg bg-gradient-to-r from-[var(--iolite-500)] to-[var(--aurora-500)] text-white font-medium flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-transform disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    <Send className="w-4 h-4" />
                    Generate Prompt
                  </button>
                  <button
                    onClick={() => {
                      setBriefText('Create a launch plan for NeoMagic. Include target audience, core message, channel plan, launch timeline, risks, and success metrics.');
                      showMessage('Example loaded.');
                    }}
                    className="h-12 px-4 rounded-lg bg-[var(--surface-3)] text-[var(--text-primary)] font-medium hover:bg-[var(--surface-3)]/80 transition-colors"
                  >
                    Try an example
                  </button>
                </div>
                <div className="flex items-center gap-3 text-sm text-[var(--text-tertiary)]">
                  <button
                    onClick={() => {
                      templatesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      showMessage('Templates opened.');
                    }}
                    className="hover:text-[var(--iolite-500)] transition-colors"
                  >
                    Open templates
                  </button>
                  <span>•</span>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="hover:text-[var(--iolite-500)] transition-colors"
                  >
                    Attach file
                  </button>
                  <span>•</span>
                  <button
                    onClick={() => setShowAdvanced((value) => !value)}
                    className="hover:text-[var(--iolite-500)] transition-colors"
                  >
                    {showAdvanced ? 'Hide advanced' : 'Show advanced'}
                  </button>
                </div>
              </div>
              {showAdvanced && (
                <div className="mt-5 grid grid-cols-3 gap-3">
                  {['Quality priority', 'Fast routing', 'Structured output'].map((option) => (
                    <button
                      key={option}
                      onClick={() => showMessage(`${option} selected.`)}
                      className="p-3 rounded-lg bg-[var(--surface-3)] border border-[var(--border-subtle)] text-left text-sm text-[var(--text-secondary)] hover:border-[var(--iolite-500)] hover:text-[var(--text-primary)] transition-colors"
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}
            </BentoCard>
          </div>

          {/* Quick Start - Square */}
          <div className="col-span-4 row-span-3">
            <BentoCard
              title="Hızlı Başlat"
              eyebrow="TEMPLATES"
              padding="standard"
            >
              <div ref={templatesRef} className="grid grid-cols-2 gap-3 mt-4">
                {templates.map((template) => {
                  const Icon = template.icon;
                  return (
                    <button
                      key={template.name}
                      onClick={() => {
                        setBriefText(template.prompt);
                        showMessage(`${template.name} template loaded.`);
                      }}
                      className="p-4 rounded-lg bg-[var(--surface-3)] border border-[var(--border-subtle)] hover:border-[var(--iolite-500)] hover:bg-[var(--surface-3)]/80 transition-all group text-left"
                    >
                      <Icon className="w-5 h-5 text-[var(--iolite-500)] mb-2 group-hover:scale-110 transition-transform" />
                      <div className="text-sm font-medium text-[var(--text-primary)] mb-1">{template.name}</div>
                      <div className="text-xs text-[var(--text-tertiary)]">{template.desc}</div>
                    </button>
                  );
                })}
              </div>
            </BentoCard>
          </div>

          {/* Recent Prompts - Half */}
          <div className="col-span-6 row-span-2">
            <BentoCard
              title="Son Kullanılanlar"
              eyebrow="HISTORY"
              action={
                <button
                  onClick={() => setShowAllHistory((value) => !value)}
                  className="text-sm text-[var(--iolite-500)] hover:text-[var(--iolite-300)] transition-colors"
                >
                  {showAllHistory ? 'Daha az göster' : 'Tümünü gör →'}
                </button>
              }
            >
              <div className="space-y-2 mt-4">
                {visiblePrompts.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setBriefText(prompt.brief);
                      showMessage(`${prompt.title} opened.`);
                    }}
                    className="w-full p-3 rounded-lg bg-[var(--surface-3)] border border-[var(--border-subtle)] hover:border-[var(--iolite-500)] transition-all text-left group"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-[var(--text-primary)] truncate group-hover:text-[var(--iolite-300)] transition-colors">
                          {prompt.title}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Clock className="w-3 h-3 text-[var(--text-tertiary)]" />
                          <span className="text-xs text-[var(--text-tertiary)]">{prompt.time}</span>
                        </div>
                      </div>
                      <div className="w-2 h-2 rounded-full bg-[var(--success-500)]" />
                    </div>
                  </button>
                ))}
              </div>
            </BentoCard>
          </div>

          {/* Community Recommendations - Half */}
          <div className="col-span-6 row-span-2">
            <BentoCard
              title="Topluluk Önerileri"
              eyebrow="AI CURATED"
              action={
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3 h-3 text-[var(--aurora-500)]" />
                  <span className="text-xs text-[var(--aurora-500)] font-semibold">AI</span>
                </div>
              }
            >
              <div className="space-y-2 mt-4">
                {communityTemplates.map((template, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setBriefText(template.brief);
                      showMessage(`${template.title} loaded.`);
                    }}
                    className="w-full p-3 rounded-lg bg-[var(--surface-3)] border border-[var(--border-subtle)] hover:border-[var(--aurora-500)] transition-all text-left group"
                  >
                    <div className="text-sm font-medium text-[var(--text-primary)] mb-1 group-hover:text-[var(--aurora-500)] transition-colors">
                      {template.title}
                    </div>
                    <div className="flex items-center justify-between text-xs text-[var(--text-tertiary)]">
                      <span>{template.author}</span>
                      <span>{template.uses} uses</span>
                    </div>
                  </button>
                ))}
              </div>
            </BentoCard>
          </div>
        </div>
      ) : (
        <div className="max-w-[1440px] mx-auto">
          <div className="mb-6">
            <div className="flex items-center gap-4 text-sm">
              <button
                onClick={() => setHasGenerated(false)}
                className="text-[var(--iolite-500)] font-medium flex items-center gap-2"
              >
                <ArrowLeft className="w-3 h-3" />
                Brief
              </button>
              <span className="text-[var(--text-tertiary)]">→</span>
              <button
                onClick={() => setSelectedStage('routed')}
                className={`${selectedStage === 'routed' ? 'text-[var(--text-primary)] bg-[var(--surface-2)]' : 'text-[var(--text-tertiary)]'} font-medium px-3 py-1 rounded-full`}
              >
                Routed
              </button>
              <span className="text-[var(--text-tertiary)]">→</span>
              <button
                onClick={() => setSelectedStage('generated')}
                className={`${selectedStage === 'generated' ? 'text-[var(--text-primary)] bg-[var(--surface-2)]' : 'text-[var(--text-tertiary)]'} font-medium px-3 py-1 rounded-full`}
              >
                Generated
              </button>
              <span className="text-[var(--text-tertiary)]">→</span>
              <button
                onClick={() => setSelectedStage('refined')}
                className={`${selectedStage === 'refined' ? 'text-[var(--text-primary)] bg-[var(--surface-2)]' : 'text-[var(--text-tertiary)]'} font-medium px-3 py-1 rounded-full`}
              >
                Refined
              </button>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-8">
            {/* Left Panel - Brief Editor */}
            <div className="col-span-8 space-y-6">
              <BentoCard title="Your Brief">
                <div className="mt-4 p-4 rounded-lg bg-[var(--surface-3)] border border-[var(--border-default)]">
                  <p className="text-[var(--text-primary)]">{briefText}</p>
                  {uploadedFile && (
                    <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-[var(--surface-2)] px-3 py-1 text-xs text-[var(--text-secondary)]">
                      <Paperclip className="w-3 h-3" />
                      {uploadedFile}
                    </div>
                  )}
                </div>
              </BentoCard>

              <BentoCard title="Version Timeline" eyebrow="HISTORY">
                <div className="mt-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-[var(--iolite-500)]" />
                    <div className="flex-1">
                      <div className="text-sm text-[var(--text-primary)]">Initial brief created</div>
                      <div className="text-xs text-[var(--text-tertiary)]">Just now</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-4 h-4 text-[var(--success-500)]" />
                    <div className="flex-1">
                      <div className="text-sm text-[var(--text-primary)]">Route selected: Quality Priority</div>
                      <div className="text-xs text-[var(--text-tertiary)]">Current stage: {selectedStage}</div>
                    </div>
                  </div>
                </div>
              </BentoCard>
            </div>

            {/* Right Panel - Output */}
            <div className="col-span-4 sticky top-24">
              <BentoCard title="Generated Output" variant="live">
                <div className="mt-4 space-y-4">
                  <div className="p-4 rounded-lg bg-[var(--surface-3)] border border-[var(--border-default)] font-['JetBrains_Mono'] text-sm text-[var(--text-primary)]">
                    <div className="ai-pulse rounded-lg p-4">
                      {selectedStage === 'routed' && 'Route selected: Quality Priority / GPT-4 class model / Structured output.'}
                      {selectedStage === 'generated' && <pre className="whitespace-pre-wrap font-inherit">{generatedPrompt}</pre>}
                      {selectedStage === 'refined' && <pre className="whitespace-pre-wrap font-inherit">{`${generatedPrompt}\n\nRefinement: Add examples, edge cases, and measurable acceptance criteria before final delivery.`}</pre>}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-[var(--text-tertiary)]">
                    <span>Model: GPT-4</span>
                    <span>Quality Priority</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => navigator.clipboard?.writeText(generatedPrompt).then(() => showMessage('Copied to clipboard.'))}
                      className="flex-1 h-10 rounded-lg bg-[var(--surface-3)] text-[var(--text-primary)] hover:bg-[var(--surface-3)]/80 transition-colors"
                    >
                      Copy
                    </button>
                    <button
                      onClick={() => onOpenPage?.('Library')}
                      className="flex-1 h-10 rounded-lg bg-gradient-to-r from-[var(--iolite-500)] to-[var(--aurora-500)] text-white transition-transform hover:scale-[1.02]"
                    >
                      Save
                    </button>
                  </div>
                </div>
              </BentoCard>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
