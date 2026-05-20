import React, { useEffect, useMemo, useState } from 'react';
import type { ClientProvider } from '@/services/unifiedProviderClient';
import { getProviderLabel } from '@/services/unifiedProviderClient';
import { OPENROUTER_MODELS } from '@/data/openRouterModels';
import { fetchOpenRouterCatalog, type OpenRouterModelEntry } from '@/services/openRouterCatalog';
import { Badge, Button, Card, Input, Select, StatCard, Tabs } from '@/components/ui';
import { FilterBar, ListRow, PageIntro, SettingsSection } from './shell';
import { useApiKeys, type ApiKeys } from '@/hooks/useApiKeys';
import type { SettingsTabId } from '@/types/ui';

interface SettingsPageProps {
  provider: ClientProvider;
  onProviderChange: (p: ClientProvider) => void;
  claudeModel: 'sonnet' | 'opus';
  onClaudeModelChange: (m: 'sonnet' | 'opus') => void;
  openRouterModel: string;
  onOpenRouterModelChange: (m: string) => void;
  thinkingMode: boolean;
  onThinkingModeChange: (v: boolean) => void;
  agentBlueprintMode: boolean;
  onAgentBlueprintModeChange: (v: boolean) => void;
  useSearch: boolean;
  onUseSearchChange: (v: boolean) => void;
  autoEnrich: boolean;
  onAutoEnrichChange: (v: boolean) => void;
  telemetryConsent: boolean;
  onTelemetryConsentChange: (v: boolean) => void;
  appearanceSlot?: React.ReactNode;
  systemPromptSlot?: React.ReactNode;
  integrationsSlot?: React.ReactNode;
  monitoringSlot?: React.ReactNode;
}

type ManagedProviderKey = keyof ApiKeys;
type ProviderStatus = 'verified' | 'connected' | 'missing' | 'error';

interface ProviderCardMeta {
  id: ClientProvider;
  keyId?: ManagedProviderKey;
  label: string;
  placeholder?: string;
  descriptionTr: string;
  descriptionEn: string;
}

const PROVIDER_OPTIONS: ProviderCardMeta[] = [
  {
    id: 'auto',
    label: 'Auto Route',
    descriptionTr: 'Selects the best route based on task type, freshness need, and cost signal.',
    descriptionEn: 'Selects the best route based on task type, freshness need, and cost signal.',
  },
  {
    id: 'openai',
    keyId: 'openai',
    label: 'OpenAI',
    placeholder: 'sk-...',
    descriptionTr: 'General generation, reasoning, and AI Lab agent flows.',
    descriptionEn: 'General generation, reasoning, and AI Lab agent flows.',
  },
  {
    id: 'gemini',
    keyId: 'gemini',
    label: 'Gemini',
    placeholder: 'AIza...',
    descriptionTr: 'Broad generation with thinking mode and web search.',
    descriptionEn: 'Broad generation with thinking mode and web search.',
  },
  {
    id: 'claude',
    keyId: 'anthropic',
    label: 'Claude',
    placeholder: 'sk-ant-...',
    descriptionTr: 'Long-form reasoning and structured content generation.',
    descriptionEn: 'Long-form reasoning and structured content generation.',
  },
  {
    id: 'groq',
    keyId: 'groq',
    label: 'Groq',
    placeholder: 'gsk_...',
    descriptionTr: 'Low-latency rapid iteration flows.',
    descriptionEn: 'Low-latency rapid iteration flows.',
  },
  {
    id: 'mistral',
    keyId: 'mistral',
    label: 'Mistral',
    placeholder: '...',
    descriptionTr: 'Mistral AI doğrudan API; çok dilli ve genel üretim.',
    descriptionEn: 'Direct Mistral AI API for multilingual and general generation.',
  },
  {
    id: 'deepseek',
    keyId: 'deepseek',
    label: 'DeepSeek',
    placeholder: 'sk-...',
    descriptionTr: 'Code and technical-analysis oriented generation.',
    descriptionEn: 'Code and technical-analysis oriented generation.',
  },
  {
    id: 'openrouter',
    keyId: 'openrouter',
    label: 'OpenRouter',
    placeholder: 'sk-or-...',
    descriptionTr: 'Aggregates multiple model families on one routing surface.',
    descriptionEn: 'Aggregates multiple model families on one routing surface.',
  },
  {
    id: 'huggingface',
    keyId: 'huggingface',
    label: 'HuggingFace',
    placeholder: 'hf_...',
    descriptionTr: 'Open-model experiments and an alternative inference path.',
    descriptionEn: 'Open-model experiments and an alternative inference path.',
  },
  {
    id: 'ollama',
    label: 'Ollama',
    descriptionTr: 'Local-first and edge-oriented scenarios.',
    descriptionEn: 'Local-first and edge-oriented scenarios.',
  },
];

const CLAUDE_MODELS = [
  { value: 'sonnet', label: 'Claude Sonnet' },
  { value: 'opus', label: 'Claude Opus 4.6' },
];

function ToggleRow({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-[20px] border border-white/8 bg-white/[0.03] p-4">
      <div className="pr-3">
        <p className="text-[14px] font-semibold text-white">{title}</p>
        <p className="mt-1 text-[13px] leading-6 text-slate-300">{description}</p>
      </div>
      <button
        type="button"
        aria-pressed={checked}
        aria-label={title}
        onClick={() => onChange(!checked)}
        className="app-switch mt-1 shrink-0"
        data-active={checked}
      />
    </div>
  );
}

function getValidationStatus(value: string | undefined, keyId?: ManagedProviderKey): 'valid' | 'invalid' | 'missing' {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) return 'missing';
  // Mistral console keys are opaque (no sk- prefix); accept reasonable opaque tokens.
  if (keyId === 'mistral' && trimmed.length >= 16 && !/\s/.test(trimmed)) {
    return 'valid';
  }
  if (
    trimmed.startsWith('sk-') ||
    trimmed.startsWith('sk-ant-') ||
    trimmed.startsWith('gsk_') ||
    trimmed.startsWith('hf_') ||
    trimmed.startsWith('AIza') ||
    trimmed.startsWith('sk-or-')
  ) {
    return 'valid';
  }
  return 'invalid';
}

function statusTone(status: ProviderStatus): 'success' | 'info' | 'warning' | 'danger' {
  switch (status) {
    case 'verified':
      return 'success';
    case 'connected':
      return 'info';
    case 'missing':
      return 'warning';
    case 'error':
    default:
      return 'danger';
  }
}

export default function SettingsPage({
  provider,
  onProviderChange,
  claudeModel,
  onClaudeModelChange,
  openRouterModel,
  onOpenRouterModelChange,
  thinkingMode,
  onThinkingModeChange,
  agentBlueprintMode,
  onAgentBlueprintModeChange,
  useSearch,
  onUseSearchChange,
  autoEnrich,
  onAutoEnrichChange,
  telemetryConsent,
  onTelemetryConsentChange,
  appearanceSlot,
  systemPromptSlot,
  integrationsSlot,
  monitoringSlot,
}: SettingsPageProps) {
  const { keys, setKey } = useApiKeys();
  const [activeTab, setActiveTab] = useState<SettingsTabId>('general');
  const [selectedProviderId, setSelectedProviderId] = useState<ClientProvider>(provider);
  const [draftKeys, setDraftKeys] = useState<ApiKeys>(keys);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [providerStates, setProviderStates] = useState<Record<string, ProviderStatus>>({});

  useEffect(() => {
    setDraftKeys(keys);
  }, [keys]);

  useEffect(() => {
    setSelectedProviderId(provider);
  }, [provider]);

  const providerMetrics = useMemo(() => {
    const managed = PROVIDER_OPTIONS.filter((item) => item.keyId);
    const missing = managed.filter((item) => !draftKeys[item.keyId!]?.trim()).length;
    const verified = Object.values(providerStates).filter((state) => state === 'verified').length;
    return { managed: managed.length, missing, verified };
  }, [draftKeys, providerStates]);

  const selectedProvider = useMemo(
    () => PROVIDER_OPTIONS.find((item) => item.id === selectedProviderId) ?? PROVIDER_OPTIONS[0],
    [selectedProviderId]
  );

  const handleDraftChange = (keyId: ManagedProviderKey, value: string) => {
    setDraftKeys((prev) => ({ ...prev, [keyId]: value }));
    setProviderStates((prev) => ({
      ...prev,
      [keyId]: value.trim() ? 'connected' : 'missing',
    }));
  };

  const handleSave = (keyId: ManagedProviderKey) => {
    const nextValue = draftKeys[keyId];
    setKey(keyId, nextValue);
    const nextStatus = getValidationStatus(nextValue, keyId);
    setProviderStates((prev) => ({
      ...prev,
      [keyId]: nextStatus === 'valid' ? 'connected' : nextStatus === 'invalid' ? 'error' : 'missing',
    }));
  };

  const handleVerify = (keyId: ManagedProviderKey) => {
    const nextStatus = getValidationStatus(draftKeys[keyId], keyId);
    setProviderStates((prev) => ({
      ...prev,
      [keyId]: nextStatus === 'valid' ? 'verified' : nextStatus === 'invalid' ? 'error' : 'missing',
    }));
  };

  const getStatus = (item: ProviderCardMeta): ProviderStatus => {
    if (!item.keyId) return item.id === 'auto' ? 'verified' : 'connected';
    if (providerStates[item.keyId]) return providerStates[item.keyId]!;
    const validation = getValidationStatus(draftKeys[item.keyId], item.keyId);
    if (validation === 'valid') return 'connected';
    if (validation === 'invalid') return 'error';
    return 'missing';
  };

  const statusLabel = (status: ProviderStatus) => {
    if (status === 'verified') return 'Verified';
    if (status === 'connected') return 'Connected';
    if (status === 'missing') return 'Missing';
    return 'Error';
  };

  const tabs = [
    { id: 'general' as const, label: 'General' },
    { id: 'providers' as const, label: 'Providers' },
    { id: 'integrations' as const, label: 'Integrations' },
    { id: 'monitoring' as const, label: 'Monitoring' },
  ];

  // ── OpenRouter model catalog (dynamic) ──────────────────────────────────────
  // Statik fallback listesiyle baslar, OpenRouter provider secilince canli API
  // listesi ile genisler. Tek sefer cekilir; backend 10dk cache tutar.
  const [openRouterCatalog, setOpenRouterCatalog] = useState<OpenRouterModelEntry[]>(() =>
    OPENROUTER_MODELS.map((m) => ({ id: m.id, label: m.label, free: m.free ?? false }))
  );
  const [openRouterCatalogState, setOpenRouterCatalogState] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle');
  useEffect(() => {
    if (selectedProvider.id !== 'openrouter' || openRouterCatalogState !== 'idle') return;
    let cancelled = false;
    setOpenRouterCatalogState('loading');
    fetchOpenRouterCatalog()
      .then((cat) => {
        if (cancelled || cat.models.length === 0) return;
        setOpenRouterCatalog(cat.models);
        setOpenRouterCatalogState('loaded');
      })
      .catch(() => { if (!cancelled) setOpenRouterCatalogState('error'); });
    return () => { cancelled = true; };
  }, [selectedProvider.id, openRouterCatalogState]);

  const renderSelectedProviderDetail = () => {
    const status = getStatus(selectedProvider);
    const keyId = selectedProvider.keyId;

    return (
      <Card className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[18px] font-semibold text-white">{selectedProvider.label}</p>
            <p className="ui-helper mt-2">
              {selectedProvider.descriptionEn}
            </p>
          </div>
          <Badge tone={statusTone(status)}>{statusLabel(status)}</Badge>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          {(selectedProvider.id === 'claude' || selectedProvider.id === 'openrouter') && (
            <div>
              {selectedProvider.id === 'claude' ? (
                <Select
                  label={'Claude model'}
                  value={claudeModel}
                  onChange={(event) => onClaudeModelChange(event.target.value as 'sonnet' | 'opus')}
                  options={CLAUDE_MODELS}
                />
              ) : (
                <div>
                  <Select
                    label={
                      openRouterCatalogState === 'loading'
                        ? 'OpenRouter model (yukleniyor…)'
                        : openRouterCatalogState === 'loaded'
                          ? `OpenRouter model (${openRouterCatalog.length})`
                          : 'OpenRouter model'
                    }
                    value={openRouterModel}
                    onChange={(event) => onOpenRouterModelChange(event.target.value)}
                    options={openRouterCatalog.map((model) => ({ value: model.id, label: model.label }))}
                  />
                  {openRouterCatalogState === 'error' && (
                    <p className="mt-1 text-[11px] text-rose-300">
                      Canli liste alinamadi; statik fallback kullaniliyor.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {(selectedProvider.id === 'auto' || selectedProvider.id === 'gemini' || selectedProvider.id === 'claude') && (
            <ToggleRow
              title={'Thinking Mode (Advisory)'}
              description={
                'Hints the model to use extended reasoning. Provider-native thinking support coming soon.'
              }
              checked={thinkingMode}
              onChange={onThinkingModeChange}
            />
          )}

          {(selectedProvider.id === 'auto' || selectedProvider.id === 'gemini' || selectedProvider.id === 'claude') && (
            <ToggleRow
              title={'Web Search (Advisory)'}
              description={
                'Hints the model to include web references. Does not perform actual web retrieval yet.'
              }
              checked={useSearch}
              onChange={onUseSearchChange}
            />
          )}
        </div>

        {keyId && (
          <div className="mt-6">
            <Input
              label={'API key'}
              type={showKeys[keyId] ? 'text' : 'password'}
              value={draftKeys[keyId] ?? ''}
              placeholder={selectedProvider.placeholder}
              onChange={(event) => handleDraftChange(keyId, event.target.value)}
              helper={
                status === 'missing'
                  ? ('No key added yet.')
                  : status === 'error'
                    ? ('Format could not be verified. Check the prefix and full value.')
                    : status === 'verified'
                      ? ('Format verified. Stored in this browser.')
                      : ('Format looks valid. Use Test to verify.')
              }
              trailing={
                <button
                  type="button"
                  onClick={() => setShowKeys((prev) => ({ ...prev, [keyId]: !prev[keyId] }))}
                  className="text-[12px] font-semibold text-slate-300"
                >
                  {showKeys[keyId] ? ('Hide') : ('Show')}
                </button>
              }
            />

            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => handleSave(keyId)}>
                {'Save'}
              </Button>
              <Button variant="primary" onClick={() => handleVerify(keyId)}>
                {'Test'}
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setDraftKeys((prev) => ({ ...prev, [keyId]: keys[keyId] ?? '' }));
                  setProviderStates((prev) => ({
                    ...prev,
                    [keyId]: getValidationStatus(keys[keyId], keyId) === 'valid' ? 'connected' : 'missing',
                  }));
                }}
              >
                {'Reset'}
              </Button>
            </div>
          </div>
        )}

        {!keyId && (
          <div className="ui-empty-state mt-6">
            <p className="text-[16px] font-semibold text-white">
              {selectedProvider.id === 'auto'
                ? ('Auto Route does not need its own key')
                : ('Local provider')}
            </p>
            <p className="ui-helper">
              {selectedProvider.id === 'auto'
                ? ('Auto Route makes task-level decisions using configured provider keys.')
                : ('For Ollama, most setup lives at the system level.')}
            </p>
          </div>
        )}
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow={'System settings'}
        title={'Workspace settings with calmer structure'}
        description={
          'General preferences, providers, integrations, and monitoring all follow the same quieter layout and form rhythm.'
        }
        actions={
          <>
            <Badge tone={provider === 'auto' ? 'success' : 'info'}>
              {provider === 'auto'
                ? ('Auto route active')
                : `${'Active provider'}: ${getProviderLabel(provider, claudeModel)}`}
            </Badge>
            <Badge tone={providerMetrics.missing === 0 ? 'success' : 'warning'}>
              {`${providerMetrics.managed - providerMetrics.missing}/${providerMetrics.managed} keys ready`}
            </Badge>
          </>
        }
      >
        <div className="app-kpi-grid">
          <StatCard
            label={'Verified providers'}
            value={String(providerMetrics.verified)}
            meta={'Validated via Test'}
            tone="success"
          />
          <StatCard
            label={'Missing keys'}
            value={String(providerMetrics.missing)}
            meta={'Providers needing setup'}
            tone={providerMetrics.missing === 0 ? 'success' : 'warning'}
          />
          <StatCard
            label={'Auto model routing'}
            value={provider === 'auto' ? ('On') : ('Off')}
            meta={'Uses task type and search need to route.'}
            tone="info"
          />
        </div>
      </PageIntro>

      <Tabs value={activeTab} items={tabs} onChange={(value) => setActiveTab(value)} />

      {activeTab === 'general' && (
        <div className="space-y-6">
          <SettingsSection
            eyebrow={'Routing'}
            title={'Default working provider'}
            description={
              'Choose the provider for the main generation flow. Manage model variants in the provider detail tab.'
            }
          >
            <FilterBar
              title={'Primary route'}
              description={
                'Auto Route selects the best path per task; lock a single provider only when needed.'
              }
            >
              {PROVIDER_OPTIONS.map((item) => {
                const active = provider === item.id;
                return (
                  <Button
                    key={item.id}
                    variant={active ? 'primary' : 'secondary'}
                    size="sm"
                    onClick={() => onProviderChange(item.id)}
                  >
                    {item.label}
                  </Button>
                );
              })}
            </FilterBar>
          </SettingsSection>

          <SettingsSection
            eyebrow={'Behavior'}
            title={'Application preferences'}
            description={
              'Auto enrichment, telemetry, and appearance preferences stay in one section.'
            }
          >
            <div className="grid gap-4 xl:grid-cols-2">
              <ToggleRow
                title={'Auto enrichment'}
                description={
                  'Runs a second improvement pass after generation using library signals.'
                }
                checked={autoEnrich}
                onChange={onAutoEnrichChange}
              />
              <ToggleRow
                title={'Telemetry consent'}
                description={
                  'Enables anonymous event logging for KPI and usage trends.'
                }
                checked={telemetryConsent}
                onChange={onTelemetryConsentChange}
              />
              <ToggleRow
                title={'Agent blueprint mode'}
                description={
                  'Forces generated prompts to follow the structured Reason-Act-Observe style for project-aware agents.'
                }
                checked={agentBlueprintMode}
                onChange={onAgentBlueprintModeChange}
              />
            </div>

            {(appearanceSlot || systemPromptSlot) && (
              <div className="mt-6 grid gap-6 xl:grid-cols-2">
                {appearanceSlot}
                {systemPromptSlot}
              </div>
            )}
          </SettingsSection>
        </div>
      )}

      {activeTab === 'providers' && (
        <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
          <SettingsSection
            eyebrow={'Provider list'}
            title={'Master list'}
            description={
              'Choose a provider; detailed setup opens on the right.'
            }
          >
            <div className="space-y-3">
              {PROVIDER_OPTIONS.map((item) => (
                <ListRow
                  key={item.id}
                  title={item.label}
                  description={item.descriptionEn}
                  meta={[
                    { label: 'Status', value: statusLabel(getStatus(item)), tone: statusTone(getStatus(item)) },
                  ]}
                  onClick={() => setSelectedProviderId(item.id)}
                  actionLabel={selectedProviderId === item.id ? ('Selected') : ('Open')}
                  onAction={() => setSelectedProviderId(item.id)}
                  className={selectedProviderId === item.id ? 'border-cyan-300/22 bg-cyan-400/10' : undefined}
                />
              ))}
            </div>
          </SettingsSection>

          {renderSelectedProviderDetail()}
        </div>
      )}

      {activeTab === 'integrations' && (
        <div className="space-y-6">
          {integrationsSlot ?? (
            <Card className="ui-empty-state">
              <p className="text-[16px] font-semibold text-white">{'No integrations yet'}</p>
              <p className="ui-helper">{'The integration surface is ready; webhook and external system settings will live here.'}</p>
            </Card>
          )}
        </div>
      )}

      {activeTab === 'monitoring' && (
        <div className="space-y-6">
          {monitoringSlot ?? (
            <Card className="ui-empty-state">
              <p className="text-[16px] font-semibold text-white">{'Monitoring surface ready'}</p>
              <p className="ui-helper">{'Health, cost, and runtime status details will live here.'}</p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
