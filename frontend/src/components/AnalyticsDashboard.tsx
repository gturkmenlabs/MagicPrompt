import React, { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useTranslation } from '../i18n';
import {
  clearTelemetryData,
  exportEventsAsCSV,
  getAdvancedAnalytics,
  type AdvancedAnalytics,
  type TelemetryEvent,
} from '@/services/telemetry';
import { Badge, Button, Card, EmptyState, StatCard, Tabs } from './ui';
import { FilterBar, KpiStrip, ListRow, PageSection } from '@/components/shell';

interface AnalyticsDashboardProps {
  consent: boolean;
  onRunFirstPrompt?: () => void;
}

type TabId = 'overview' | 'tokens' | 'providers' | 'activity';

const CHART_COLORS = ['#4dddf7', '#22c55e', '#f59e0b', '#60a5fa', '#f97316', '#c084fc'];

function formatNumber(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString();
}

function formatMs(value: number) {
  if (!value) return '-';
  if (value >= 1000) return `${(value / 1000).toFixed(1)}s`;
  return `${value}ms`;
}

function timeAgo(ts: number) {
  const deltaMinutes = Math.floor((Date.now() - ts) / 60000);
  if (deltaMinutes < 1) return 'Just now';
  if (deltaMinutes < 60) return `${deltaMinutes} ${'min ago'}`;
  const deltaHours = Math.floor(deltaMinutes / 60);
  if (deltaHours < 24) return `${deltaHours} ${'hr ago'}`;
  const deltaDays = Math.floor(deltaHours / 24);
  return `${deltaDays} ${'days ago'}`;
}

function activityLabel(type: TelemetryEvent['type']) {
  switch (type) {
    case 'generation':
      return 'Generation';
    case 'edited':
      return 'Edited';
    case 'copy':
      return 'Copy';
    case 'feedback_add_to_pool':
      return 'Feedback';
    default:
      return type;
  }
}

function toneFromSuccess(value: number): 'success' | 'info' | 'warning' {
  if (value >= 85) return 'success';
  if (value >= 70) return 'info';
  return 'warning';
}

function buildDemoAnalytics(): AdvancedAnalytics {
  const now = Date.now();
  return {
    totalGenerations: 42,
    totalEdits: 8,
    totalCopies: 17,
    totalFeedbacks: 5,
    totalInputTokens: 24800,
    totalOutputTokens: 41100,
    totalTokens: 65900,
    overallEditRate: 19,
    overallSuccessRate: 81,
    avgLatencyMs: 1480,
    cacheHitRate: 24,
    timeSeries: [
      { label: '09:00', timestamp: now - 5 * 3600000, generations: 4, edits: 1, copies: 1, feedbacks: 0, inputTokens: 2200, outputTokens: 4100, avgLatencyMs: 1320, cacheHits: 1 },
      { label: '10:00', timestamp: now - 4 * 3600000, generations: 7, edits: 1, copies: 2, feedbacks: 1, inputTokens: 3900, outputTokens: 6200, avgLatencyMs: 1410, cacheHits: 2 },
      { label: '11:00', timestamp: now - 3 * 3600000, generations: 9, edits: 2, copies: 3, feedbacks: 1, inputTokens: 5200, outputTokens: 9100, avgLatencyMs: 1520, cacheHits: 2 },
      { label: '12:00', timestamp: now - 2 * 3600000, generations: 10, edits: 2, copies: 5, feedbacks: 2, inputTokens: 6100, outputTokens: 10400, avgLatencyMs: 1600, cacheHits: 3 },
      { label: '13:00', timestamp: now - 1 * 3600000, generations: 12, edits: 2, copies: 6, feedbacks: 1, inputTokens: 7400, outputTokens: 11300, avgLatencyMs: 1550, cacheHits: 2 },
    ],
    providerStats: [
      { provider: 'OpenAI', count: 18, totalTokens: 28200, avgLatencyMs: 1540, successRate: 84 },
      { provider: 'Claude', count: 11, totalTokens: 17100, avgLatencyMs: 1820, successRate: 86 },
      { provider: 'Gemini', count: 7, totalTokens: 11200, avgLatencyMs: 1320, successRate: 75 },
      { provider: 'Groq', count: 6, totalTokens: 9400, avgLatencyMs: 680, successRate: 73 },
    ],
    frameworkStats: [
      { framework: 'CO_STAR', count: 14, editRate: 18 },
      { framework: 'REACT', count: 10, editRate: 16 },
      { framework: 'CHAIN_OF_THOUGHT', count: 9, editRate: 22 },
      { framework: 'AUTO', count: 9, editRate: 21 },
    ],
    domainStats: [
      { domain: 'frontend', count: 15, percentage: 36, successRate: 86 },
      { domain: 'backend', count: 11, percentage: 26, successRate: 79 },
      { domain: 'security', count: 7, percentage: 17, successRate: 74 },
      { domain: 'system-architecture', count: 5, percentage: 12, successRate: 83 },
      { domain: 'devops', count: 4, percentage: 9, successRate: 76 },
    ],
    recentEvents: [
      { type: 'generation', ts: now - 5 * 60000, domainId: 'frontend', framework: 'CO_STAR', provider: 'OpenAI', inputTokenEst: 740, outputTokenEst: 1240, latencyMs: 1330, cacheHit: false },
      { type: 'copy', ts: now - 18 * 60000, domainId: 'frontend', framework: 'CO_STAR', provider: 'OpenAI' },
      { type: 'edited', ts: now - 34 * 60000, domainId: 'backend', framework: 'REACT', provider: 'Claude', inputTokenEst: 610, outputTokenEst: 980, latencyMs: 1710, cacheHit: false, wasEdited: true },
      { type: 'feedback_add_to_pool', ts: now - 55 * 60000, domainId: 'security', framework: 'CHAIN_OF_THOUGHT', provider: 'Gemini' },
    ],
  };
}

function AnalyticsTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-[16px] border border-white/10 bg-slate-950/96 px-3 py-2 shadow-[0_18px_40px_rgba(2,6,23,0.4)]">
      <p className="text-[12px] font-semibold text-white">{label}</p>
      <div className="mt-2 space-y-1">
        {payload.map((item) => (
          <p key={`${item.name}-${item.color}`} className="text-[12px] text-slate-300">
            <span style={{ color: item.color }}>{item.name}</span>: {formatNumber(Number(item.value))}
          </p>
        ))}
      </div>
    </div>
  );
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ consent, onRunFirstPrompt }) => {
  const { t, language } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [showDemo, setShowDemo] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const analytics = useMemo(
    () => (showDemo ? buildDemoAnalytics() : getAdvancedAnalytics(consent)),
    [consent, refreshKey, showDemo]
  );

  const hasData = analytics.totalGenerations > 0 || analytics.totalEdits > 0 || analytics.totalCopies > 0;

  const timelineData = analytics.timeSeries.map((bucket) => ({
    label: bucket.label.length > 5 ? bucket.label.slice(-5) : bucket.label,
    generations: bucket.generations,
    edits: bucket.edits,
    inputTokens: bucket.inputTokens,
    outputTokens: bucket.outputTokens,
  }));

  const handleExport = () => {
    const csv = exportEventsAsCSV(consent);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `neomagic-analytics-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleClear = () => {
    if (showDemo) {
      setShowDemo(false);
      setConfirmClear(false);
      return;
    }
    clearTelemetryData(consent);
    setConfirmClear(false);
    setRefreshKey((value) => value + 1);
  };

  if (!hasData && !showDemo) {
    return (
      <EmptyState
        language={language}
        title={'No analytics yet'}
        description={
          'Once the first prompt runs, this page will fill with a small KPI strip, provider comparisons, and a clean activity timeline.'
        }
        reason={
          'Run a prompt from Prompt Lab or open demo data to preview the layout.'
        }
        primaryCta={'Run the first prompt'}
        secondaryCta={'Open demo data'}
        onPrimaryAction={onRunFirstPrompt}
        onSecondaryAction={() => setShowDemo(true)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <FilterBar
          title={'Analytics view'}
          description={
            'Keep the top row light: choose the data source and current view, then let the charts and lists do the rest.'
          }
        >
          <Badge tone={showDemo ? 'warning' : 'success'}>
            {showDemo ? ('Demo data') : ('Live session')}
          </Badge>
          <Badge tone="info">{`${formatNumber(analytics.totalGenerations)} ${'runs'}`}</Badge>
          <Badge tone="neutral">{`${formatMs(analytics.avgLatencyMs)} ${'avg latency'}`}</Badge>
          <Badge tone="neutral">{`${analytics.cacheHitRate}% ${'cache hit'}`}</Badge>
          <Button variant="secondary" size="sm" onClick={() => setShowDemo((value) => !value)}>
            {showDemo ? ('Return to live data') : ('Open demo')}
          </Button>
          <Button variant="ghost" size="sm" onClick={handleExport}>
            CSV
          </Button>
          {confirmClear ? (
            <>
              <Button variant="secondary" size="sm" onClick={handleClear}>
                {'Confirm clear'}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirmClear(false)}>
                {'Cancel'}
              </Button>
            </>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setConfirmClear(true)}>
              {'Clear data'}
            </Button>
          )}
        </FilterBar>

        <Tabs
          value={activeTab}
          onChange={(value) => setActiveTab(value as TabId)}
          className="mt-5"
          items={[
            { id: 'overview', label: t.ui.analyticsOverview },
            { id: 'tokens', label: t.ui.analyticsTokenUsage },
            { id: 'providers', label: t.ui.analyticsProviders },
            { id: 'activity', label: t.ui.analyticsActivity, count: analytics.recentEvents.length },
          ]}
        />
      </Card>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          <KpiStrip>
            <StatCard label={t.ui.analyticsTotalGenerations} value={formatNumber(analytics.totalGenerations)} meta={'Total prompt runs'} tone="info" />
            <StatCard label={t.ui.analyticsSuccessRate} value={`${analytics.overallSuccessRate}%`} meta={`${analytics.totalEdits} ${'edit events'}`} tone="success" />
            <StatCard label={t.ui.analyticsTotalTokens} value={formatNumber(analytics.totalTokens)} meta={`${formatNumber(analytics.totalInputTokens)} in / ${formatNumber(analytics.totalOutputTokens)} out`} tone="warning" />
            <StatCard label={t.ui.analyticsAvgLatency} value={formatMs(analytics.avgLatencyMs)} meta={`${analytics.cacheHitRate}% ${'cache hit'}`} tone="neutral" />
          </KpiStrip>

          <div className="grid gap-6 xl:grid-cols-2">
            <PageSection
              title={'Generation trend'}
              description={'Track generation and edit behavior on the same time axis.'}
            >
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={timelineData} margin={{ top: 12, right: 16, left: -12, bottom: 0 }}>
                    <defs>
                      <linearGradient id="analytics-generations" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4dddf7" stopOpacity={0.32} />
                        <stop offset="95%" stopColor="#4dddf7" stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="analytics-edits" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.26} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgba(148,163,184,0.12)" vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<AnalyticsTooltip />} />
                    <Area type="monotone" dataKey="generations" name={'Generation'} stroke="#4dddf7" fill="url(#analytics-generations)" strokeWidth={2.4} />
                    <Area type="monotone" dataKey="edits" name={'Edits'} stroke="#f59e0b" fill="url(#analytics-edits)" strokeWidth={2.2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </PageSection>

            <PageSection
              title={'Domain distribution'}
              description={'Your most-used work areas and their success rate stay side by side.'}
            >
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.domainStats.slice(0, 6)} margin={{ top: 12, right: 12, left: -12, bottom: 0 }}>
                    <CartesianGrid stroke="rgba(148,163,184,0.12)" vertical={false} />
                    <XAxis dataKey="domain" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<AnalyticsTooltip />} />
                    <Bar dataKey="count" radius={[10, 10, 0, 0]}>
                      {analytics.domainStats.slice(0, 6).map((item, index) => (
                        <Cell key={item.domain} fill={CHART_COLORS[index % CHART_COLORS.length]} fillOpacity={0.82} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </PageSection>
          </div>

          <PageSection
            title={'Provider comparison'}
            description={'Providers are compared in one list rhythm; usage, tokens, and latency are visible on the same row.'}
          >
            <div className="space-y-3">
              {analytics.providerStats.slice(0, 5).map((provider) => (
                <ListRow
                  key={provider.provider}
                  title={provider.provider}
                  description={`${provider.count} runs, average ${formatMs(provider.avgLatencyMs)} latency`}
                  meta={[
                    { label: 'Success', value: `${provider.successRate}%`, tone: toneFromSuccess(provider.successRate) },
                    { label: 'Tokens', value: formatNumber(provider.totalTokens), tone: 'neutral' },
                  ]}
                />
              ))}
            </div>
          </PageSection>
        </div>
      )}

      {activeTab === 'tokens' && (
        <div className="space-y-6">
          <KpiStrip>
            <StatCard label={t.ui.analyticsInputTokens} value={formatNumber(analytics.totalInputTokens)} meta={'Input volume'} tone="info" />
            <StatCard label={t.ui.analyticsOutputTokens} value={formatNumber(analytics.totalOutputTokens)} meta={'Output volume'} tone="success" />
            <StatCard label={'Copy events'} value={formatNumber(analytics.totalCopies)} meta={'Signal for reuse behavior'} tone="warning" />
          </KpiStrip>

          <PageSection
            title={'Token flow'}
            description={'Track input and output tokens on the same chart.'}
          >
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timelineData} margin={{ top: 12, right: 16, left: -12, bottom: 0 }}>
                  <defs>
                    <linearGradient id="tokens-input" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4dddf7" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#4dddf7" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="tokens-output" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.28} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(148,163,184,0.12)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<AnalyticsTooltip />} />
                  <Area type="monotone" dataKey="inputTokens" name={t.ui.analyticsInputTokens} stroke="#4dddf7" fill="url(#tokens-input)" strokeWidth={2.2} />
                  <Area type="monotone" dataKey="outputTokens" name={t.ui.analyticsOutputTokens} stroke="#22c55e" fill="url(#tokens-output)" strokeWidth={2.2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </PageSection>

          <PageSection
            title={'Framework impact'}
            description={'See which prompt structures are used most and how much editing they require.'}
          >
            <div className="space-y-3">
              {analytics.frameworkStats.slice(0, 6).map((framework) => (
                <ListRow
                  key={framework.framework}
                  title={framework.framework}
                  description={
                    `Used across ${framework.count} runs`
                  }
                  meta={[
                    { label: 'Edit rate', value: `${framework.editRate}%`, tone: framework.editRate < 20 ? 'success' : framework.editRate < 35 ? 'info' : 'warning' },
                  ]}
                />
              ))}
            </div>
          </PageSection>
        </div>
      )}

      {activeTab === 'providers' && (
        <div className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
            <PageSection
              title={'Provider detail list'}
              description={'The master-detail rhythm is handled here with a cleaner row layout.'}
            >
              <div className="space-y-3">
                {analytics.providerStats.map((provider) => (
                  <ListRow
                    key={provider.provider}
                    title={provider.provider}
                    description={
                      `${provider.count} generations, ${formatMs(provider.avgLatencyMs)} average latency`
                    }
                    meta={[
                      { label: 'Success', value: `${provider.successRate}%`, tone: toneFromSuccess(provider.successRate) },
                      { label: 'Total tokens', value: formatNumber(provider.totalTokens), tone: 'neutral' },
                    ]}
                  />
                ))}
              </div>
            </PageSection>

            <PageSection
              title={'Operational summary'}
              description={'Provider choice is now read from one decision panel instead of scattered chart blocks.'}
            >
              <div className="space-y-3">
                <div className="ui-preview-surface">
                  <p className="text-[12px] font-semibold text-white">{'Most used'}</p>
                  <p className="ui-helper mt-2">{analytics.providerStats[0]?.provider ?? '-'}</p>
                </div>
                <div className="ui-preview-surface">
                  <p className="text-[12px] font-semibold text-white">{'Fastest route'}</p>
                  <p className="ui-helper mt-2">
                    {analytics.providerStats.length > 0
                      ? [...analytics.providerStats].sort((a, b) => a.avgLatencyMs - b.avgLatencyMs)[0]?.provider
                      : '-'}
                  </p>
                </div>
                <div className="ui-preview-surface">
                  <p className="text-[12px] font-semibold text-white">{'Highest success'}</p>
                  <p className="ui-helper mt-2">
                    {analytics.providerStats.length > 0
                      ? [...analytics.providerStats].sort((a, b) => b.successRate - a.successRate)[0]?.provider
                      : '-'}
                  </p>
                </div>
              </div>
            </PageSection>
          </div>

          <PageSection
            title={'Domain x provider signal'}
            description={'Top domains can be scanned quickly through compact cards.'}
          >
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {analytics.domainStats.slice(0, 4).map((domain, index) => (
                <Card key={domain.domain} tone="muted" className="p-4">
                  <div className="flex items-center gap-3">
                    <span className="h-10 w-2 rounded-full" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} />
                    <div>
                      <p className="text-[14px] font-semibold text-white">{domain.domain}</p>
                      <p className="ui-helper mt-1">{`${domain.percentage}% ${'share'} / ${domain.successRate}% ${'success'}`}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </PageSection>
        </div>
      )}

      {activeTab === 'activity' && (
        <PageSection
          title={'Recent activity'}
          description={'The activity stream keeps only recent meaningful events without placeholder noise.'}
          actions={
            <Badge tone={analytics.recentEvents.length > 0 ? 'info' : 'neutral'}>
              {analytics.recentEvents.length} {'events'}
            </Badge>
          }
        >
          <div className="space-y-3">
            {analytics.recentEvents.length > 0 ? (
              analytics.recentEvents.map((event, index) => (
                <ListRow
                  key={`${event.ts}-${event.type}-${index}`}
                  title={activityLabel(event.type)}
                  description={
                    `${event.domainId} / ${event.framework} / ${event.provider || 'Auto'}`
                  }
                  meta={[
                    { label: 'Time', value: timeAgo(event.ts), tone: 'neutral' },
                    ...(typeof event.latencyMs === 'number'
                      ? [{ label: 'Latency', value: formatMs(event.latencyMs), tone: 'info' as const }]
                      : []),
                    ...(typeof event.outputTokenEst === 'number'
                      ? [{ label: 'Output', value: formatNumber(event.outputTokenEst), tone: 'warning' as const }]
                      : []),
                  ]}
                />
              ))
            ) : (
              <Card className="ui-empty-state">
                <p className="ui-empty-state__title">{'No activity found'}</p>
                <p className="ui-empty-state__description">
                  {'Recent events will appear here after generation or editing activity.'}
                </p>
              </Card>
            )}
          </div>
        </PageSection>
      )}
    </div>
  );
};

export default AnalyticsDashboard;
