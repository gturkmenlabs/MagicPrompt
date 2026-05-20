import React, { useMemo, useState } from 'react';
import { Activity, Database, FlaskConical, Library, Search, Settings, Sparkles, Target, Workflow, Zap } from 'lucide-react';
import { Badge, Card, Input, SectionHeader } from './ui';
import { useTranslation } from '../i18n';

const PRODUCT_SURFACES = [
  {
    title: 'Prompt Lab',
    description: 'Write the brief once, keep routing and output close, and iterate without leaving the main workspace.',
    icon: Zap,
    tone: 'text-sky-300',
  },
  {
    title: 'Library',
    description: 'Search saved prompts, curated collections, and recent history from one list-first archive.',
    icon: Library,
    tone: 'text-cyan-300',
  },
  {
    title: 'AI Lab',
    description: 'Run agent tasks, inspect context, and keep advanced orchestration behind a cleaner review layer.',
    icon: FlaskConical,
    tone: 'text-emerald-300',
  },
  {
    title: 'Optimizer',
    description: 'Improve weak prompts with analysis, structured rewrites, and safer follow-up actions.',
    icon: Activity,
    tone: 'text-amber-300',
  },
  {
    title: 'RAG Engine',
    description: 'Ground prompt generation with vector search, indexing coverage, and retrieval workflows.',
    icon: Database,
    tone: 'text-cyan-300',
  },
  {
    title: 'Settings & Analytics',
    description: 'Review providers, trust controls, usage windows, and quality signals across the workspace.',
    icon: Settings,
    tone: 'text-slate-300',
  },
];

const DESK_STEPS = [
  {
    title: '1. Start with the workspace',
    body: 'Choose the page by job to be done, not by feature count. Prompt Lab and AI Lab should cover most daily flow.',
  },
  {
    title: '2. Narrow before scanning',
    body: 'Use framework and domain references to trim the decision space before reading long documentation blocks.',
  },
  {
    title: '3. Reuse proven patterns',
    body: 'Move from docs to Library or Optimizer when you need an example you can apply immediately.',
  },
];

export default function DocumentationPage() {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');

  const frameworks = useMemo(
    () =>
      Object.entries(t.frameworks).map(([id, item]) => {
        const framework = item as { name: string; description: string; focus?: string };
        return {
          id,
          name: framework.name,
          description: framework.description,
          focus: framework.focus || 'General',
        };
      }),
    [t.frameworks]
  );

  const domains = useMemo(
    () =>
      Object.entries(t.domains).map(([id, item]) => {
        const domain = item as { name: string; description: string };
        return {
          id,
          name: domain.name,
          description: domain.description,
        };
      }),
    [t.domains]
  );

  const normalizedQuery = query.trim().toLowerCase();

  const filteredFrameworks = useMemo(
    () =>
      frameworks.filter((item) => {
        if (!normalizedQuery) return true;
        return [item.name, item.description, item.focus].join(' ').toLowerCase().includes(normalizedQuery);
      }),
    [frameworks, normalizedQuery]
  );

  const filteredDomains = useMemo(
    () =>
      domains.filter((item) => {
        if (!normalizedQuery) return true;
        return [item.name, item.description].join(' ').toLowerCase().includes(normalizedQuery);
      }),
    [domains, normalizedQuery]
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <Card tone="hero" className="workspace-panel workspace-panel--hero overflow-hidden p-6 md:p-7">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_360px]">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="info">Knowledge Base</Badge>
              <Badge tone="neutral">{`${frameworks.length} frameworks`}</Badge>
              <Badge tone="neutral">{`${domains.length} domains`}</Badge>
            </div>
            <div className="space-y-3">
              <h2 className="text-[32px] font-semibold tracking-[-0.05em] text-white md:text-[40px]">
                Product guide without the wall of text
              </h2>
              <p className="max-w-3xl text-[15px] leading-7 text-slate-300">
                This page now works like a desk reference: surface map first, searchable frameworks and domains second,
                and only the practical guidance that helps you move back into the product faster.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <div className="rounded-[22px] border border-white/8 bg-black/20 p-4">
              <p className="ui-label">Use this page for</p>
              <p className="mt-3 text-[18px] font-semibold tracking-[-0.04em] text-white">Orientation</p>
              <p className="mt-2 text-[13px] leading-6 text-slate-300">Pick the right workspace before reading detailed references.</p>
            </div>
            <div className="rounded-[22px] border border-white/8 bg-black/20 p-4">
              <p className="ui-label">Best for</p>
              <p className="mt-3 text-[18px] font-semibold tracking-[-0.04em] text-white">Framework selection</p>
              <p className="mt-2 text-[13px] leading-6 text-slate-300">Search strategy patterns and find the right reasoning shape quickly.</p>
            </div>
            <div className="rounded-[22px] border border-white/8 bg-black/20 p-4">
              <p className="ui-label">When to leave</p>
              <p className="mt-3 text-[18px] font-semibold tracking-[-0.04em] text-white">Immediate execution</p>
              <p className="mt-2 text-[13px] leading-6 text-slate-300">Go back to Prompt Lab, Library, or AI Lab once the decision is clear.</p>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <Card className="workspace-panel workspace-panel--soft p-6">
          <SectionHeader
            eyebrow="Surface map"
            title="Where each page fits"
            description="Every major workspace is reduced to a single job so the platform is easier to scan."
          />

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {PRODUCT_SURFACES.map((surface) => {
              const Icon = surface.icon;
              return (
                <div key={surface.title} className="rounded-[22px] border border-white/8 bg-black/20 p-4">
                  <div className="flex items-start gap-3">
                    <div className={`flex h-11 w-11 items-center justify-center rounded-[16px] border border-white/8 bg-white/[0.03] ${surface.tone}`}>
                      <Icon size={18} />
                    </div>
                    <div>
                      <p className="text-[16px] font-semibold tracking-[-0.03em] text-white">{surface.title}</p>
                      <p className="mt-2 text-[13px] leading-6 text-slate-300">{surface.description}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="workspace-panel workspace-panel--soft p-6">
          <SectionHeader
            eyebrow="Usage flow"
            title="How to use the desk"
            description="A lightweight order of operations for people who do not want to read everything."
          />

          <div className="mt-5 space-y-3">
            {DESK_STEPS.map((step) => (
              <div key={step.title} className="rounded-[22px] border border-white/8 bg-black/20 p-4">
                <p className="text-[14px] font-semibold text-white">{step.title}</p>
                <p className="mt-2 text-[13px] leading-6 text-slate-300">{step.body}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="workspace-panel workspace-panel--soft p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <SectionHeader
              eyebrow="Reference search"
              title="Search frameworks and domains"
              description="Filter both reference lists from one field so you can find the right model for the task quickly."
            />
          </div>
          <div className="w-full max-w-[420px]">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by framework, domain, focus, or description"
              label="Find inside docs"
              leadingIcon={<Search size={14} />}
            />
          </div>
        </div>

        <div className="mt-6 grid gap-5 xl:grid-cols-2">
          <div className="rounded-[24px] border border-white/8 bg-black/20 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="ui-label">Framework reference</p>
                <h3 className="mt-2 text-[22px] font-semibold tracking-[-0.04em] text-white">Reasoning structures</h3>
                <p className="mt-2 text-[13px] leading-6 text-slate-300">
                  Focus on the way the answer should be structured before you worry about wording details.
                </p>
              </div>
              <Badge tone="neutral">{`${filteredFrameworks.length} shown`}</Badge>
            </div>

            <div className="mt-5 max-h-[540px] space-y-3 overflow-y-auto pr-1 custom-scrollbar">
              {filteredFrameworks.map((item) => (
                <div key={item.id} className="rounded-[20px] border border-white/8 bg-white/[0.02] p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[15px] font-semibold tracking-[-0.03em] text-white">{item.name}</p>
                    <Badge tone="info">{item.focus}</Badge>
                  </div>
                  <p className="mt-3 text-[13px] leading-6 text-slate-300">{item.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[24px] border border-white/8 bg-black/20 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="ui-label">Domain reference</p>
                <h3 className="mt-2 text-[22px] font-semibold tracking-[-0.04em] text-white">Expertise boundaries</h3>
                <p className="mt-2 text-[13px] leading-6 text-slate-300">
                  Use domain selection to set terminology, constraints, and the kind of judgment the prompt should apply.
                </p>
              </div>
              <Badge tone="neutral">{`${filteredDomains.length} shown`}</Badge>
            </div>

            <div className="mt-5 max-h-[540px] space-y-3 overflow-y-auto pr-1 custom-scrollbar">
              {filteredDomains.map((item) => (
                <div key={item.id} className="rounded-[20px] border border-white/8 bg-white/[0.02] p-4">
                  <p className="text-[15px] font-semibold tracking-[0.02em] text-white">{item.name}</p>
                  <p className="mt-3 text-[13px] leading-6 text-slate-300">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="workspace-panel workspace-panel--soft p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[14px] border border-white/8 bg-white/[0.03] text-sky-300">
              <Workflow size={16} />
            </div>
            <div>
              <p className="ui-label">Best practice</p>
              <h3 className="mt-1 text-[17px] font-semibold tracking-[-0.03em] text-white">Stay sequence-first</h3>
            </div>
          </div>
          <p className="mt-4 text-[13px] leading-6 text-slate-300">
            Start in Prompt Lab when you need creation, jump to Library when you need reuse, and open AI Lab only when orchestration or review becomes necessary.
          </p>
        </Card>

        <Card className="workspace-panel workspace-panel--soft p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[14px] border border-white/8 bg-white/[0.03] text-amber-300">
              <Target size={16} />
            </div>
            <div>
              <p className="ui-label">Best practice</p>
              <h3 className="mt-1 text-[17px] font-semibold tracking-[-0.03em] text-white">Choose less, earlier</h3>
            </div>
          </div>
          <p className="mt-4 text-[13px] leading-6 text-slate-300">
            Select the framework and domain as soon as the task is clear. Early narrowing improves both prompt quality and page-level focus.
          </p>
        </Card>

        <Card className="workspace-panel workspace-panel--soft p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[14px] border border-white/8 bg-white/[0.03] text-emerald-300">
              <Sparkles size={16} />
            </div>
            <div>
              <p className="ui-label">Best practice</p>
              <h3 className="mt-1 text-[17px] font-semibold tracking-[-0.03em] text-white">Move back into action fast</h3>
            </div>
          </div>
          <p className="mt-4 text-[13px] leading-6 text-slate-300">
            Documentation should shorten the path back to execution. If you are still reading after the choice is clear, the next step is probably inside the product, not this page.
          </p>
        </Card>
      </div>
    </div>
  );
}
