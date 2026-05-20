/**
 * AILabWorkbench — AI Agent Lab with runtime-selectable agent backends.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { getAuthHeaders, API_BASE } from '@/services/apiClient';
import { Badge, Button, Card, Icon } from './ui';
import { AgentFlowBuilder } from './ailab/AgentFlowBuilder';

const AUTO_REFRESH_SECONDS = 15;

interface AgentMessage {
  role: 'user' | 'agent';
  content: string;
  timestamp: number;
  enrichedPrompt?: string;
}

interface AgentStatus {
  ready: boolean;
  runtime?: 'openai';
  sdk: string;
  model: string;
  provider?: string;
  repoPath?: string;
  error?: string;
  tools: string[];
  promptsLoaded: boolean;
  promptCount: number;
  targetPromptCount?: number;
  indexedPromptCount?: number;
  vectorIndexedCount?: number;
  coveragePercent?: number;
  categories: string[];
}

interface AnalyticsSnapshot {
  totalGenerations: number;
  overallSuccessRate: number;
  overallEditRate: number;
  avgLatencyMs: number;
  topDomains: Array<{ domain: string; successRate: number; count: number }>;
  topFrameworks: Array<{ framework: string; editRate: number; count: number }>;
  topProviders: Array<{ provider: string; successRate: number; count: number }>;
}

interface AILabWorkbenchProps {
  currentPrompt?: string;
  domainId?: string;
  framework?: string;
  analyticsSnapshot?: AnalyticsSnapshot;
  onApplyEnrichedPrompt?: (enriched: string) => void;
  prefillQuery?: string;
  prefillToken?: number;
  showQuickQueries?: boolean;
}

type AgentMode = 'prompt' | 'orchestrate' | 'builder';
type AgentRuntime = 'openai';

const AILabWorkbench: React.FC<AILabWorkbenchProps> = ({
  currentPrompt,
  domainId,
  framework,
  analyticsSnapshot,
  onApplyEnrichedPrompt,
  prefillQuery,
  prefillToken,
  showQuickQueries = true,
}) => {
  const [agentMode, setAgentMode] = useState<AgentMode>('orchestrate');
  const [agentRuntime, setAgentRuntime] = useState<AgentRuntime>('openai');
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<AgentStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [seedInfo, setSeedInfo] = useState<string | null>(null);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<number | null>(null);
  const [refreshCountdown, setRefreshCountdown] = useState(AUTO_REFRESH_SECONDS);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const buildHeaders = useCallback(async () => {
    const auth = await getAuthHeaders();
    return { 'Content-Type': 'application/json', ...auth };
  }, []);

  const refreshStatus = useCallback(async () => {
    setStatusLoading(true);
    try {
      const res = await fetch(`${API_BASE}/agent/status?runtime=${agentRuntime}`);
      const data = await res.json().catch(() => ({}));
      setStatus(data);
      setLastRefreshedAt(Date.now());
      setRefreshCountdown(AUTO_REFRESH_SECONDS);
    } catch {
      // ignore status fetch errors in UI
    } finally {
      setStatusLoading(false);
    }
  }, [agentRuntime]);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  useEffect(() => {
    if (!autoRefreshEnabled) return;
    const timer = window.setInterval(() => {
      setRefreshCountdown((prev) => {
        if (prev <= 1) {
          void refreshStatus();
          return AUTO_REFRESH_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [refreshStatus, autoRefreshEnabled]);

  useEffect(() => {
    if (!autoRefreshEnabled) {
      setRefreshCountdown(AUTO_REFRESH_SECONDS);
    }
  }, [autoRefreshEnabled]);

  const handleSeedVectors = useCallback(async () => {
    setSeeding(true);
    setSeedInfo(null);
    try {
      const hdrs = await buildHeaders();
      const res = await fetch(`${API_BASE}/prompts/seed-vectors`, {
        method: 'POST',
        headers: hdrs,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const errMsg = typeof data?.error === 'string' ? data.error : 'Seed failed';
        setSeedInfo(errMsg);
      } else {
        const upserted = typeof data?.vectorsUpserted === 'number' ? data.vectorsUpserted : 0;
        setSeedInfo(`${upserted} vectors seeded`);
        await refreshStatus();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Seeding error';
      setSeedInfo(msg);
    } finally {
      setSeeding(false);
    }
  }, [buildHeaders, refreshStatus]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const executeQuery = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg: AgentMessage = { role: 'user', content: trimmed, timestamp: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    setQuery('');
    setLoading(true);

    try {
      const hdrs = await buildHeaders();
      const isOrchestrate = agentMode === 'orchestrate';
      const url = isOrchestrate ? `${API_BASE}/agent/orchestrate` : `${API_BASE}/agent/run`;
      const body = isOrchestrate
        ? {
            query: userMsg.content,
            userId: undefined,
            runtime: agentRuntime,
            context: {
              currentPrompt,
              domainId,
              framework,
              analyticsSnapshot,
            },
          }
        : {
            query: userMsg.content,
            runtime: agentRuntime,
            context: {
              currentPrompt,
              domainId,
              framework,
              analyticsSnapshot,
            },
          };
      const res = await fetch(url, {
        method: 'POST',
        headers: hdrs,
        body: JSON.stringify(body),
      });

      let data: Record<string, unknown> = {};
      try {
        const textResp = await res.text();
        data = textResp ? (JSON.parse(textResp) as Record<string, unknown>) : {};
      } catch {
        data = { error: 'Invalid server response' };
      }

      if (!res.ok) {
        const code = typeof data.code === 'string' ? data.code : '';
        let errMsg = typeof data.error === 'string'
          ? data.error
          : typeof data.message === 'string'
            ? data.message
            : 'Agent failed';
        if (res.status === 503 && code === 'OPENAI_KEY_MISSING') {
          errMsg = 'OPENAI_API_KEY is missing for the OpenAI runtime. Set it in the server .env.';
        } else if (res.status === 401) {
          errMsg = 'Authentication required (optional). Sign in or use x-api-key.';
        }
        setMessages((prev) => [
          ...prev,
          { role: 'agent', content: `Error: ${errMsg}`, timestamp: Date.now() },
        ]);
      } else {
        const answer = typeof data.answer === 'string' && data.answer.trim()
          ? data.answer
          : 'No response received.';
        setMessages((prev) => [
          ...prev,
          {
            role: 'agent',
            content: answer,
            timestamp: Date.now(),
            enrichedPrompt: typeof data.enrichedPrompt === 'string' ? data.enrichedPrompt : undefined,
          },
        ]);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setMessages((prev) => [
        ...prev,
        { role: 'agent', content: `Connection error: ${msg}`, timestamp: Date.now() },
      ]);
    } finally {
      setLoading(false);
    }
  }, [loading, buildHeaders, agentMode, agentRuntime, currentPrompt, domainId, framework, analyticsSnapshot]);

  useEffect(() => {
    if (!prefillQuery?.trim() || (prefillToken ?? 0) === 0) return;
    setQuery(prefillQuery);
    void executeQuery(prefillQuery);
  }, [executeQuery, prefillQuery, prefillToken]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void executeQuery(query);
  };

  const quickQueries = [
    ...(currentPrompt ? ['Enrich my current prompt using prompt library and analytics'] : []),
    'Prompts for reducing hallucination',
    'Best prompts for academic writing',
    'Data analysis prompts',
    'What categories are available?',
    'Suggest prompts for code review',
    'Best practice prompts for API design',
    'Show Chain of Thought examples',
    'Prompt template for security testing',
    'RAG pipeline prompts',
    'Prompt injection prevention techniques',
  ];

  const coveragePercent = Math.max(0, Math.min(100, status?.coveragePercent ?? 0));
  const indexedCount = status?.indexedPromptCount ?? status?.promptCount ?? 0;
  const targetCount = status?.targetPromptCount ?? status?.promptCount ?? 0;
  const vectorCount = status?.vectorIndexedCount ?? 0;
  const runtimeLabel = status?.provider ?? status?.sdk ?? agentRuntime;
  const badgeTone = statusLoading ? 'warning' : status?.ready ? 'success' : 'danger';

  return (
    <div className="space-y-4">
      <Card className="workspace-panel workspace-panel--soft overflow-hidden border-white/8 bg-[radial-gradient(circle_at_top_left,rgba(102,170,255,0.12),transparent_42%),rgba(4,12,18,0.78)] p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-[18px] border border-white/8 bg-white/[0.03] text-accent-primary">
              <Icon name="layers" size={20} />
            </div>
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-[20px] font-semibold tracking-[-0.04em] text-white">AI Agent Lab</h2>
                <Badge tone={badgeTone}>{statusLoading ? 'Checking' : status?.ready ? 'Ready' : 'Offline'}</Badge>
                <Badge tone="neutral">
                  {agentMode === 'orchestrate'
                    ? 'Project orchestration'
                    : agentMode === 'prompt'
                      ? 'Prompt retrieval'
                      : 'Flow builder'}
                </Badge>
              </div>
              <p className="max-w-2xl text-[13px] leading-6 text-slate-300">
                Run OpenAI agents with prompt context, runtime health, and recent analytics in one cleaner desk.
              </p>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            {[
              { id: 'orchestrate' as const, label: 'Orchestrator', detail: 'Full project' },
              { id: 'prompt' as const, label: 'Prompt Agent', detail: 'Library context' },
              { id: 'builder' as const, label: 'Flow Builder', detail: 'Compose steps' },
            ].map((item) => {
              const active = agentMode === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setAgentMode(item.id)}
                  className={`rounded-[18px] border px-4 py-3 text-left transition-colors ${
                    active
                      ? 'border-accent-primary/28 bg-accent-primary/12 text-white'
                      : 'border-white/8 bg-white/[0.03] text-slate-300 hover:border-white/12 hover:bg-white/[0.05]'
                  }`}
                >
                  <p className="text-[13px] font-semibold">{item.label}</p>
                  <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-slate-400">{item.detail}</p>
                </button>
              );
            })}
          </div>
        </div>

        {agentMode === 'builder' ? (
          <div className="mt-5 rounded-[24px] border border-white/8 bg-black/20 p-4 md:p-5">
            <AgentFlowBuilder />
          </div>
        ) : (
          <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_360px]">
            <div className="space-y-4">
              <div className="rounded-[24px] border border-white/8 bg-black/20 p-4 md:p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/[0.03] px-3 py-1.5 text-[12px] text-slate-200">
                    <span className={`h-2 w-2 rounded-full ${status?.ready ? 'bg-emerald-400' : statusLoading ? 'bg-amber-300 animate-pulse' : 'bg-rose-400'}`} />
                    {statusLoading ? 'Checking runtime' : status?.ready ? 'Runtime healthy' : 'Runtime unavailable'}
                  </span>
                  <Badge tone="info">{status?.model || 'OpenAI runtime'}</Badge>
                  <Badge tone="neutral">{runtimeLabel}</Badge>
                  {autoRefreshEnabled && <Badge tone="neutral">{`refresh in ${refreshCountdown}s`}</Badge>}
                  <div className="ml-auto flex flex-wrap gap-2">
                    <Button variant="secondary" size="sm" onClick={refreshStatus} disabled={statusLoading}>
                      Refresh
                    </Button>
                    <Button
                      variant={autoRefreshEnabled ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => setAutoRefreshEnabled((value) => !value)}
                    >
                      {autoRefreshEnabled ? 'Auto refresh on' : 'Auto refresh off'}
                    </Button>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <div className="rounded-[18px] border border-white/8 bg-white/[0.02] p-4">
                    <p className="ui-label">Indexed prompts</p>
                    <p className="mt-3 text-[26px] font-semibold tracking-[-0.05em] text-white">{indexedCount}</p>
                    <p className="mt-2 text-[12px] leading-6 text-slate-400">{`Target ${targetCount}`}</p>
                  </div>
                  <div className="rounded-[18px] border border-white/8 bg-white/[0.02] p-4">
                    <p className="ui-label">Coverage</p>
                    <p className="mt-3 text-[26px] font-semibold tracking-[-0.05em] text-white">{coveragePercent}%</p>
                    <p className="mt-2 text-[12px] leading-6 text-slate-400">{`${vectorCount} vector records`}</p>
                  </div>
                  <div className="rounded-[18px] border border-white/8 bg-white/[0.02] p-4">
                    <p className="ui-label">Tools</p>
                    <p className="mt-3 text-[26px] font-semibold tracking-[-0.05em] text-white">{status?.tools?.length ?? 0}</p>
                    <p className="mt-2 text-[12px] leading-6 text-slate-400">Connected to the current agent runtime.</p>
                  </div>
                </div>

                <div className="mt-4 rounded-[18px] border border-white/8 bg-white/[0.02] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="ui-label">Index coverage</p>
                      <p className="mt-2 text-[14px] font-medium text-white">Keep retrieval quality visible before running longer tasks.</p>
                    </div>
                    <Badge tone={coveragePercent >= 100 ? 'success' : 'warning'}>
                      {coveragePercent >= 100 ? 'Target reached' : 'Below target'}
                    </Badge>
                  </div>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-900/80">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-accent-primary to-emerald-400 transition-all duration-500"
                      style={{ width: `${coveragePercent}%` }}
                    />
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-3 text-[12px] text-slate-400">
                    <span>{`Indexed ${indexedCount} of ${targetCount}`}</span>
                    <span>{`Vectors ${vectorCount}`}</span>
                    {lastRefreshedAt && <span>{`Last refresh ${new Date(lastRefreshedAt).toLocaleTimeString()}`}</span>}
                  </div>
                  {coveragePercent < 100 && (
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <Button variant="secondary" size="sm" onClick={handleSeedVectors} disabled={seeding}>
                        {seeding ? 'Seeding...' : 'Seed vectors'}
                      </Button>
                      {seedInfo && <span className="text-[12px] text-slate-300">{seedInfo}</span>}
                    </div>
                  )}
                </div>

                {status?.error && (
                  <div className="mt-4 rounded-[18px] border border-amber-300/18 bg-amber-400/10 p-4">
                    <p className="text-[13px] leading-6 text-amber-100">{status.error}</p>
                    {status.repoPath && (
                      <p className="mt-2 text-[12px] text-amber-100/70">{`repo: ${status.repoPath}`}</p>
                    )}
                  </div>
                )}
              </div>

              <div className="rounded-[24px] border border-white/8 bg-black/20 p-4 md:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="ui-label">Agent transcript</p>
                    <h3 className="mt-2 text-[22px] font-semibold tracking-[-0.04em] text-white">Run and review in one stream</h3>
                    <p className="mt-2 text-[13px] leading-6 text-slate-300">
                      Keep the task conversation here before applying any enriched prompt back into Prompt Lab.
                    </p>
                  </div>
                  {messages.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setMessages([])}
                      className="text-[12px] font-medium text-slate-400 transition-colors hover:text-white"
                    >
                      Clear transcript
                    </button>
                  )}
                </div>

                <div className="mt-5 min-h-[260px] max-h-[420px] space-y-3 overflow-y-auto pr-1">
                  {messages.length === 0 && !loading && (
                    <div className="rounded-[20px] border border-dashed border-white/10 bg-white/[0.02] p-5">
                      <p className="text-[14px] font-medium text-white">No agent output yet</p>
                      <p className="mt-2 text-[13px] leading-6 text-slate-300">
                        Start with a short task. The first response will appear here and stay available for comparison, follow-up, or prompt reuse.
                      </p>
                    </div>
                  )}

                  {messages.map((msg, index) => (
                    <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[88%] rounded-[20px] border px-4 py-3 ${
                          msg.role === 'user'
                            ? 'border-accent-primary/18 bg-accent-primary/12 text-sky-100'
                            : 'border-white/8 bg-white/[0.03] text-slate-100'
                        }`}
                      >
                        <div className="whitespace-pre-wrap break-words text-[13px] leading-6">{msg.content}</div>
                        {msg.role === 'agent' && msg.enrichedPrompt && onApplyEnrichedPrompt && (
                          <div className="mt-4 border-t border-white/8 pt-3">
                            <Button size="sm" onClick={() => onApplyEnrichedPrompt(msg.enrichedPrompt!)}>
                              Apply to Prompt Lab
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {loading && (
                    <div className="flex justify-start">
                      <div className="rounded-[18px] border border-white/8 bg-white/[0.03] px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-accent-primary animate-pulse" />
                          <div className="h-2 w-2 rounded-full bg-accent-primary animate-pulse [animation-delay:0.18s]" />
                          <div className="h-2 w-2 rounded-full bg-accent-primary animate-pulse [animation-delay:0.36s]" />
                          <span className="ml-1 text-[12px] text-slate-400">Agent is working on the task</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-3 sm:flex-row">
                  <input
                    type="text"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder={agentMode === 'orchestrate' ? 'Ask the project agent...' : 'Search the prompt library...'}
                    disabled={loading}
                    className="min-h-[48px] flex-1 rounded-[16px] border border-white/10 bg-white/[0.96] px-4 text-[13px] text-slate-950 placeholder:text-slate-500 focus:border-accent-primary/30 focus:outline-none focus:ring-2 focus:ring-accent-primary/20 disabled:opacity-50"
                  />
                  <Button type="submit" size="md" disabled={loading || !query.trim()}>
                    {loading ? 'Running...' : 'Ask'}
                  </Button>
                </form>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-[24px] border border-white/8 bg-black/20 p-4 md:p-5">
                <p className="ui-label">Context summary</p>
                <h3 className="mt-2 text-[22px] font-semibold tracking-[-0.04em] text-white">Keep nearby signal visible</h3>
                <p className="mt-2 text-[13px] leading-6 text-slate-300">
                  Prompt state, workspace context, and recent analytics stay available without crowding the main task area.
                </p>

                <div className="mt-5 space-y-3">
                  <div className="rounded-[18px] border border-white/8 bg-white/[0.02] p-4">
                    <p className="ui-label">Prompt context</p>
                    <p className="mt-2 text-[14px] font-medium text-white">
                      {currentPrompt ? 'Current prompt connected' : 'No current prompt'}
                    </p>
                    <p className="mt-2 text-[12px] leading-6 text-slate-400">
                      {currentPrompt
                        ? 'The active prompt can be enriched and sent back through the agent output.'
                        : 'You can still run AI Lab with a standalone task brief.'}
                    </p>
                  </div>

                  <div className="rounded-[18px] border border-white/8 bg-white/[0.02] p-4">
                    <p className="ui-label">Domain and framework</p>
                    <p className="mt-2 text-[14px] font-medium text-white">{`${domainId || 'auto'} · ${framework || 'AUTO'}`}</p>
                    <p className="mt-2 text-[12px] leading-6 text-slate-400">
                      The runtime inherits this workspace framing while routing and executing the task.
                    </p>
                  </div>

                  <div className="rounded-[18px] border border-white/8 bg-white/[0.02] p-4">
                    <p className="ui-label">Recent analytics</p>
                    <p className="mt-2 text-[14px] font-medium text-white">
                      {analyticsSnapshot
                        ? `${analyticsSnapshot.totalGenerations} runs · ${analyticsSnapshot.overallSuccessRate}% success`
                        : 'Analytics not connected'}
                    </p>
                    <p className="mt-2 text-[12px] leading-6 text-slate-400">
                      {analyticsSnapshot
                        ? `${analyticsSnapshot.avgLatencyMs}ms average latency across recent activity.`
                        : 'This area fills once the workspace has live telemetry to reference.'}
                    </p>
                  </div>
                </div>
              </div>

              {showQuickQueries && messages.length === 0 && (
                <div className="rounded-[24px] border border-white/8 bg-black/20 p-4 md:p-5">
                  <p className="ui-label">Starter queries</p>
                  <h3 className="mt-2 text-[18px] font-semibold tracking-[-0.04em] text-white">Use one as a quick handoff</h3>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {quickQueries.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setQuery(item)}
                        className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-[12px] text-slate-200 transition-colors hover:border-white/14 hover:bg-white/[0.05] hover:text-white"
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-[24px] border border-white/8 bg-black/20 p-4 md:p-5">
                <p className="ui-label">Review rule</p>
                <h3 className="mt-2 text-[18px] font-semibold tracking-[-0.04em] text-white">Do not apply blindly</h3>
                <p className="mt-2 text-[13px] leading-6 text-slate-300">
                  Use the transcript as a review surface first. Apply enriched prompts only after the agent output is specific enough to reuse.
                </p>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default AILabWorkbench;
