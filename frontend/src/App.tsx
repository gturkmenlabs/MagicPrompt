import React, { useState, useCallback, useRef, useEffect, useMemo, useReducer, lazy, Suspense } from 'react';
import { Zap, Command as CmdIcon, Plus, ChevronDown } from 'lucide-react';
import { Framework } from '@/types';
import {
  generateMasterPromptUnified,
  getProviderLabel,
  getModelLabel,
  type ClientProvider,
} from '@/services/unifiedProviderClient';
import { setOpenRouterModel } from '@/services/openRouterService';
import Sidebar, { type SidebarPage } from '@/components/Sidebar';
import KeyboardShortcutsModal from '@/components/KeyboardShortcutsModal';
import ExportButton from '@/components/ExportButton';
import OpenInAI from '@/components/OpenInAI';
import ScoreBadge from '@/components/ScoreBadge';
import OnboardingModal, { useOnboarding } from '@/components/OnboardingModal';
import SystemPromptEditor from '@/components/SystemPromptEditor';
import SystemControlCenter from '@/components/SystemControlCenter';
import BackendHealthPanel from '@/components/BackendHealthPanel';
import ProviderCostCalculator from '@/components/ProviderCostCalculator';
import OutputFormatSelector, { type OutputFormat } from '@/components/OutputFormatSelector';
import WebhookSettings from '@/components/WebhookSettings';
import FalAiStudio from '@/components/FalAiStudio';
import { useTheme } from '@/hooks/useTheme';
import CommandPalette, { type Command } from '@/components/CommandPalette';
import FloatingFAB from '@/components/FloatingFAB';
import ContextMenu, { useContextMenu, type ContextMenuItem } from '@/components/ContextMenu';
import ThemeCustomizer from '@/components/ThemeCustomizer';
const PromptDiffViewer = lazy(() => import('./components/PromptDiffViewer'));
const FewShotGenerator = lazy(() => import('./components/FewShotGenerator'));
const PromptTournament = lazy(() => import('./components/PromptTournament'));
const MultilingualExport = lazy(() => import('./components/MultilingualExport'));
import { usePromptHistory } from '@/hooks/usePromptHistory';
import LibraryWorkspace from '@/components/workspaces/LibraryWorkspace';
import AILabWorkspace from '@/components/workspaces/AILabWorkspace';
import { GITHUB_PROMPTS } from '@/data/githubPrompts';
import PromptLabWorkspace from '@/components/workspaces/PromptLabWorkspace';
import ResultDisplay, { TelemetryEventPayload } from '@/components/ResultDisplay';
import JudgePanel from '@/components/JudgePanel';
import PromptLintPanel from '@/components/PromptLintPanel';
import BudgetPanel from '@/components/BudgetPanel';
import ProvenanceView from '@/components/ProvenanceView';
import CacheStatus from '@/components/CacheStatus';
import StatusFooter from '@/components/StatusFooter';
import AuthPage from '@/components/AuthPage';
import PricingPage from '@/components/PricingPage';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ToastProvider, useToast } from '@/components/ToastSystem';
import { I18nProvider, useTranslation } from './i18n';
import SettingsPage from '@/components/SettingsPage';
import { Badge, Button, Card, SectionHeader, StatCard, Tabs } from '@/components/ui';
import { Drawer, PageShell, PageToolbar, WorkspaceBriefing } from '@/components/shell';
import { judgePrompt } from '@/services/judgeEnsemble';
import { lintPrompt } from '@/services/promptLint';
import { analyzeBudget } from '@/services/budgetOptimizer';
import { getCacheStats } from '@/services/semanticCache';
import { runWorkflow } from '@/services/orchestrator';
import { getActiveProfile, buildStyleContext } from '@/services/styleProfiles';
import { WORKFLOW_PRESETS } from '@/data/workflows';
import { compressIntent } from '@/utils/compressIntent';
import { analyzeIntentViaBrain } from '@/services/brainClient';
import {
  normalizeFrameworkCandidate,
  selectFrameworkFromIntent,
} from '@/services/frameworkAutoSelector';
import {
  recordEvent, getTelemetryConsent, setTelemetryConsent, getAdvancedAnalytics,
} from '@/services/telemetry';
import { useGeneratePrompt } from '@/hooks/useGeneratePrompt';
import {
  DEFAULT_SYSTEM_BRAIN_CONFIG,
  evaluateSystemBrain,
  type SystemBrainConfig,
} from '@/services/systemBrain';
import {
  generationReducer, initialGenerationState,
  qualityReducer, initialQualityState,
  uiReducer, initialUIState,
  settingsReducer, initialSettingsState,
} from '@/utils/appReducers';
import type { PageConfig } from '@/types/ui';
import { cn } from '@/lib/utils';
import { useWorkspaceMetadata } from '@/hooks/useWorkspaceMetadata';
import { useExperienceLayer } from '@/hooks/useExperienceLayer';
import { pushExperienceEvent } from '@/services/experienceLayer';

// Lazy-loaded heavy pages
const AnalyticsDashboard = lazy(() => import('./components/AnalyticsDashboard'));
const WorkflowPanel = lazy(() => import('./components/WorkflowPanel'));
const StyleProfileManager = lazy(() => import('./components/StyleProfileManager'));
const EnhancePanel = lazy(() => import('./components/EnhancePanel'));
const EnrichmentPanel = lazy(() => import('./components/EnrichmentPanel'));
const AutoCompletePanel = lazy(() => import('./components/AutoCompletePanel'));
const PromptAnalysisPanel = lazy(() => import('./components/PromptAnalysisPanel'));
const PromptTransformPanel = lazy(() => import('./components/PromptTransformPanel'));
const PromptImprovePanel = lazy(() => import('./components/PromptImprovePanel'));
const AdversarialImmunityPanel = lazy(() => import('./components/AdversarialImmunityPanel'));
const BenchmarkPanel = lazy(() => import('./components/BenchmarkPanel'));
const DocumentationPage = lazy(() => import('./components/DocumentationPage'));

const PageLoader = () => (
  <div className="flex items-center justify-center h-40">
    <div className="font-mono text-[10px] text-cyber-primary/50 animate-pulse uppercase tracking-widest">Loading...</div>
  </div>
);

const AGENT_BLUEPRINT_STORAGE_KEY = 'sr_agent_blueprint_mode';

// ─── Auth Gate ─────────────────────────────────────────────────────────────

function AuthGate() {
  const { loading, session } = useAuth();
  const [showPricing, setShowPricing] = useState(false);

  if (loading) return <div className="min-h-screen bg-cyber-black flex items-center justify-center"><div className="text-cyber-primary font-mono text-xs animate-pulse tracking-widest uppercase">Starting system...</div></div>;
  if (!session) return <AuthPage />;
  if (showPricing) return <PricingPage onBack={() => setShowPricing(false)} />;
  return <AppContent onShowPricing={() => setShowPricing(true)} />;
}

// ─── Main App ───────────────────────────────────────────────────────────────
function AppContent({ onShowPricing: _onShowPricing }: { onShowPricing?: () => void }) {
  const [gen, genDispatch] = useReducer(generationReducer, initialGenerationState);
  const [quality, qualityDispatch] = useReducer(qualityReducer, initialQualityState);
  const [ui, uiDispatch] = useReducer(uiReducer, initialUIState);
  const [settings, settingsDispatch] = useReducer(settingsReducer, initialSettingsState);

  const { intent, framework, domainId, loading, error, result, attachments, dragActive } = gen;
  const { showQualityPanel, judgeResult, lintResult, budgetAnalysis, provenance, lastCacheHit, enrichmentMetrics } = quality;
  const { activePage, lastLatency, lastTokensPerSec } = ui;
  const { provider, lastUsedProvider, claudeModel, openRouterModel, telemetryConsent,
    workflowPresetId, workflowResult, workflowLoading, useSearch, thinkingMode, agentBlueprintMode, autoEnrich } = settings;

  const setIntent = (v: string) => genDispatch({ type: 'SET_INTENT', payload: v });
  const setFramework = (v: Framework) => genDispatch({ type: 'SET_FRAMEWORK', payload: v });
  const setDomainId = (v: string) => genDispatch({ type: 'SET_DOMAIN', payload: v });
  const setProvider = (v: ClientProvider) => settingsDispatch({ type: 'SET_PROVIDER', payload: v });
  const setPage = (v: SidebarPage) => uiDispatch({ type: 'SET_PAGE', payload: v as any });

  // Prompt history
  const { history, addEntry, removeEntry, clearHistory } = usePromptHistory();

  const [agentMode, setAgentMode] = useState(false);
  const [agentAnalyzing, setAgentAnalyzing] = useState(false);
  const [agentHint, setAgentHint] = useState<string | null>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState(localStorage.getItem('sr_system_prompt') || '');
  const [diffPrompt, setDiffPrompt] = useState<{ left: string; right: string } | null>(null);
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('auto');
  const [systemBrainConfig, setSystemBrainConfig] = useState<SystemBrainConfig>(DEFAULT_SYSTEM_BRAIN_CONFIG);
  const [activePersonaId, setActivePersonaId] = useState<string | undefined>();
  const prevResultRef = useRef<string | null>(null);
  const { show: showOnboarding, done: onboardingDone } = useOnboarding();
  const { theme, toggle: toggleTheme } = useTheme();
  const [cmdPaletteOpen, setCmdPaletteOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toolsMenuOpen, setToolsMenuOpen] = useState(false);
  const [promptToolsOpen, setPromptToolsOpen] = useState(false);
  const [promptLabRailView, setPromptLabRailView] = useState<'live' | 'history' | 'versions'>('live');
  const [systemPromptVerifying, setSystemPromptVerifying] = useState(false);
  const { menu: ctxMenu, open: openCtxMenu, close: closeCtxMenu } = useContextMenu();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const toolsMenuRef = useRef<HTMLDivElement>(null);
  const lastGenParamsRef = useRef<any>(null);
  const executeGenerationRef = useRef<((overrides?: {
    framework?: Framework;
    domainId?: string;
    intent?: string;
    provider?: ClientProvider;
    useSearch?: boolean;
    thinkingMode?: boolean;
    agentBlueprintMode?: boolean;
    outputLanguage?: 'tr' | 'en';
    outputFormat?: OutputFormat;
  }) => void) | null>(null);
  const handlePreGenerateRef = useRef<(() => void) | null>(null);

  const { t } = useTranslation();
  const [outputLanguage, setOutputLanguage] = useState<'tr' | 'en'>('en');
  const { addToast } = useToast();
  const selectedDomainName = t.domains[domainId as keyof typeof t.domains]?.name || t.domains.auto.name;
  const withAgentBlueprintRules = useCallback(
    (rules: string) => (agentBlueprintMode ? `${rules}\nAGENT_BLUEPRINT_MODE=ON` : rules),
    [agentBlueprintMode]
  );
  const railTabs = [
    { id: 'live' as const, label: 'Live output' },
    { id: 'history' as const, label: 'History', count: history.length },
    { id: 'versions' as const, label: 'Versions' },
  ];
  const quickHistory = history.slice(0, 5);
  const promptChecklistItems = [
    'Define the role',
    'State the target output',
    'Add constraints',
    'Choose the output format',
  ];
  const promptPreflightWarnings = useMemo(() => {
    const trimmed = intent.trim();
    if (!trimmed && attachments.length === 0) return [] as string[];

    const warnings: string[] = [];
    const lower = trimmed.toLowerCase();
    const formatKeywords = ['markdown', 'json', 'yaml', 'xml', 'table', 'tablo', 'liste', 'list', 'bullet', 'csv'];

    if (trimmed.length > 0 && trimmed.length < 36) {
      warnings.push(
        'The input looks short. Adding the target user or success criteria will improve the result.'
      );
    }

    if (trimmed.length > 0 && outputFormat === 'auto' && !formatKeywords.some((keyword) => lower.includes(keyword))) {
      warnings.push(
        'The output format is unclear. Specify a format like a markdown table, JSON, or a bullet list.'
      );
    }

    if (trimmed.length > 0 && !/(rol|role|persona|hedef|goal|kisit|constraint|format)/i.test(trimmed)) {
      warnings.push(
        'This prompt can be stronger: add at least two of role, goal, constraints, or output format.'
      );
    }

    return warnings;
  }, [attachments.length, intent, outputFormat]);
  const promptGuidance = (
    <div className="space-y-3">
      <div className="rounded-[18px] border border-white/10 bg-slate-950/44 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-100/78">
          {'Good prompt checklist'}
        </p>
        <div className="mt-4 grid gap-2 md:grid-cols-2">
          {promptChecklistItems.map((item) => (
            <div key={item} className="rounded-[12px] border border-white/8 bg-white/[0.03] px-3 py-2 text-[12px] text-slate-200">
              {item}
            </div>
          ))}
        </div>
      </div>

      {promptPreflightWarnings.length > 0 && (
        <div className="rounded-[18px] border border-amber-300/18 bg-amber-400/10 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-100/90">
            {'Light preflight before generate'}
          </p>
          <div className="mt-3 space-y-2">
            {promptPreflightWarnings.map((warning) => (
              <div key={warning} className="rounded-[12px] border border-amber-300/14 bg-black/10 px-3 py-2 text-[12px] leading-6 text-amber-50">
                {warning}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  useEffect(() => { settingsDispatch({ type: 'SET_TELEMETRY_CONSENT', payload: getTelemetryConsent() }); }, []);
  useEffect(() => {
    const saved = localStorage.getItem(AGENT_BLUEPRINT_STORAGE_KEY);
    if (saved === null) return;
    settingsDispatch({
      type: 'SET_AGENT_BLUEPRINT_MODE',
      payload: saved === '1' || saved.toLowerCase() === 'true',
    });
  }, []);
  useEffect(() => { if (provider === 'openrouter') setOpenRouterModel(openRouterModel); }, [provider, openRouterModel]);
  useEffect(() => { setSidebarOpen(false); }, [activePage]);
  useEffect(() => {
    if (!toolsMenuOpen) return;
    const handlePointer = (event: MouseEvent) => {
      if (toolsMenuRef.current && !toolsMenuRef.current.contains(event.target as Node)) {
        setToolsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handlePointer);
    return () => document.removeEventListener('mousedown', handlePointer);
  }, [toolsMenuOpen]);

  // Global keyboard shortcuts
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !loading) { e.preventDefault(); handlePreGenerateRef.current?.(); return; }
      if (!typing && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (e.key === '?') { e.preventDefault(); setShowShortcuts(p => !p); return; }
        const pages: Record<string, SidebarPage> = { '1': 'dashboard', '2': 'prompts', '3': 'ailab', '4': 'analytics', '5': 'settings' };
        if (pages[e.key]) { e.preventDefault(); setPage(pages[e.key]); }
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [loading]);

  const processFiles = (files: FileList | null) => {
    if (!files) return;
    if (attachments.length + files.length > 3) { addToast('Maksimum 3 file.', 'error'); return; }
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      const isText = file.type.startsWith('text/');
      const isImage = file.type.startsWith('image/');
      reader.onload = (e) => {
        const r = e.target?.result as string;
        if (isText) {
          genDispatch({ type: 'ADD_ATTACHMENTS', payload: [{ name: file.name, mimeType: file.type, data: btoa(unescape(encodeURIComponent(r))), preview: r.slice(0, 500) }] });
        } else {
          genDispatch({ type: 'ADD_ATTACHMENTS', payload: [{ name: file.name, mimeType: file.type, data: r.split(',')[1], ...(isImage && { preview: r }) }] });
        }
      };
      isText ? reader.readAsText(file) : reader.readAsDataURL(file);
    });
  };

  const handleTemplateSelect = useCallback(
    (template: { intentTr: string; intentEn: string; domainId: string; framework: Framework }) => {
      setIntent(template.intentEn);
      setDomainId(template.domainId);
      setFramework(template.framework);
    addToast('Template loaded.', 'success');
    }, [addToast]
  );

  const handleInsertExamplePrompt = useCallback(() => {
    setIntent(
      'Role: senior prompt engineer. Goal: write a desktop-focused landing page prompt for my SaaS product. Constraints: clear hierarchy, trustworthy tone, 3 key features, 1 CTA. Output format: markdown table plus short wireframe notes.'
    );
    setDomainId('frontend');
    setFramework(Framework.COSTAR);
    addToast('Example prompt inserted.', 'success');
  }, [addToast]);

  const handleSuggestTemplatePrompt = useCallback(() => {
    const randomTemplate = GITHUB_PROMPTS[Math.floor(Math.random() * GITHUB_PROMPTS.length)];
    handleTemplateSelect({
      intentTr: randomTemplate.prompt,
      intentEn: randomTemplate.promptEn || randomTemplate.prompt,
      domainId: domainId === 'auto' ? 'general' : domainId,
      framework: Framework.AUTO,
    });
    addToast('Template suggested from Library.', 'success');
  }, [addToast, domainId, handleTemplateSelect]);

  const handleCopyResult = useCallback(async () => {
    if (!result?.masterPrompt) return;
    try {
      await navigator.clipboard.writeText(result.masterPrompt);
      addToast('Result copied.', 'success');
    } catch {
      addToast('Copy failed.', 'error');
    }
  }, [addToast, result?.masterPrompt]);

  const handleShareResult = useCallback(async () => {
    if (!result?.masterPrompt) return;
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'NeoMagic Prompt Result',
          text: result.masterPrompt.slice(0, 8000),
        });
      } else {
        await navigator.clipboard.writeText(result.masterPrompt);
      }
      addToast('Result ready to share.', 'success');
    } catch {
      addToast('Share was cancelled.', 'info');
    }
  }, [addToast, result?.masterPrompt]);

  const handleDiffResult = useCallback(() => {
    if (prevResultRef.current && result?.masterPrompt) {
      setDiffPrompt({ left: prevResultRef.current, right: result.masterPrompt });
      return;
    }
    addToast('Generate at least two versions before opening the diff.', 'info');
  }, [addToast, result?.masterPrompt]);

  const handleApplyResultToIntent = useCallback(() => {
    if (!result?.masterPrompt) return;
    setIntent(result.masterPrompt);
    addToast('Result applied back to Prompt Lab.', 'success');
  }, [addToast, result?.masterPrompt]);

  const handlePersonaApply = useCallback((persona: { id: string; systemPrompt: string }) => {
    setActivePersonaId(persona.id);
    setSystemPrompt(persona.systemPrompt);
  }, []);

  const handlePersonaClear = useCallback(() => {
    setActivePersonaId(undefined);
    setSystemPrompt('');
  }, []);

  const handleVoiceTranscript = useCallback((text: string) => {
    setIntent(intent + (intent ? ' ' : '') + text);
  }, [intent]);

  const handleOpenFilePicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleRemoveAttachment = useCallback((index: number) => {
    genDispatch({ type: 'REMOVE_ATTACHMENT', payload: index });
  }, []);

  const handleReuseHistory = useCallback((entry: { intent: string }) => {
    genDispatch({ type: 'SET_INTENT', payload: entry.intent });
    addToast('History entry loaded', 'success');
  }, [addToast]);

  const handleOpenProviderCredentials = useCallback(() => {
    setPage('settings');
    window.setTimeout(() => {
      document.getElementById('provider-credentials')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 120);
  }, [setPage]);

  const handleVerifySystemPrompt = useCallback(async () => {
    const activeSystemPrompt = systemPrompt.trim();
    if (!activeSystemPrompt) {
      addToast('System prompt is empty. Add a rule first.', 'warning');
      return;
    }

    const marker = `SP_CHECK_${Date.now().toString(36).toUpperCase()}`;
    const verificationIntent = [
      `SYSTEM_PROMPT_VERIFICATION_MARKER=${marker}`,
      'Follow every global system instruction strictly.',
      `Start the final prompt output with this exact marker: ${marker}`,
    ].join('\n');

    setSystemPromptVerifying(true);
    try {
      const localizedDomain = t.domains[domainId as keyof typeof t.domains] || t.domains.auto;
      const activeProfile = getActiveProfile();
      const styleContext = buildStyleContext(activeProfile ?? null);
      const { response } = await generateMasterPromptUnified(provider, {
        intent: verificationIntent,
        framework,
        domainId,
        useSearch,
        thinkingMode,
        language: outputLanguage,
        localizedRules: withAgentBlueprintRules(localizedDomain.contextRules),
        attachments: [],
        styleContext: styleContext || undefined,
        claudeModel,
        openRouterModel,
        systemPrompt: activeSystemPrompt,
      });

      const fullText = `${response.reasoning ?? ''}\n${response.masterPrompt ?? ''}`;
      if (fullText.includes(marker)) {
        addToast('System prompt effect verified.', 'success');
      } else {
        addToast('Verification inconclusive: model did not return marker.', 'warning');
      }
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : 'System prompt verification failed.', 'error');
    } finally {
      setSystemPromptVerifying(false);
    }
  }, [
    systemPrompt,
    addToast,
    t.domains,
    domainId,
    provider,
    framework,
    useSearch,
    thinkingMode,
    outputLanguage,
    claudeModel,
    openRouterModel,
    withAgentBlueprintRules,
  ]);

  const handleDrag = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); genDispatch({ type: 'SET_DRAG_ACTIVE', payload: e.type !== 'dragleave' }); };
  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); genDispatch({ type: 'SET_DRAG_ACTIVE', payload: false }); if (e.dataTransfer.files?.[0]) processFiles(e.dataTransfer.files); };

  const executeGeneration = useGeneratePrompt({
    intent,
    framework,
    domainId,
    provider,
    useSearch,
    thinkingMode,
    agentBlueprintMode,
    outputLanguage,
    outputFormat,
    attachments,
    telemetryConsent,
    autoEnrich,
    claudeModel,
    openRouterModel,
    systemPrompt,
    t,
    resultMasterPrompt: result?.masterPrompt,
    dispatchers: { genDispatch, qualityDispatch, uiDispatch, settingsDispatch },
    callbacks: {
      addToast,
      addEntry,
      setPreviousMasterPrompt: (value) => {
        prevResultRef.current = value;
      },
    },
  });

  const executeGenerationWithTracking = useCallback((overrides?: {
    framework?: Framework;
    domainId?: string;
    intent?: string;
    provider?: ClientProvider;
    useSearch?: boolean;
    thinkingMode?: boolean;
    agentBlueprintMode?: boolean;
    outputLanguage?: 'tr' | 'en';
    outputFormat?: OutputFormat;
  }) => {
    const inputIntent = overrides?.intent ?? intent;
    const inputFramework = overrides?.framework ?? framework;
    const inputDomainId = overrides?.domainId ?? domainId;
    const inputProvider = overrides?.provider ?? provider;
    const inputUseSearch = overrides?.useSearch ?? useSearch;
    const inputThinkingMode = overrides?.thinkingMode ?? thinkingMode;
    const inputAgentBlueprintMode = overrides?.agentBlueprintMode ?? agentBlueprintMode;
    const inputOutputLanguage = overrides?.outputLanguage ?? outputLanguage;
    const inputOutputFormat = overrides?.outputFormat ?? outputFormat;

    const decision = evaluateSystemBrain(systemBrainConfig, {
      intent: inputIntent,
      provider: inputProvider,
      framework: inputFramework,
      domainId: inputDomainId,
      outputLanguage: inputOutputLanguage,
      outputFormat: inputOutputFormat,
      useSearch: inputUseSearch,
      thinkingMode: inputThinkingMode,
      agentBlueprintMode: inputAgentBlueprintMode,
    });

    if (decision.blocked) {
      addToast(decision.reason || 'System brain blocked generation.', 'warning');
      return;
    }

    const effectiveIntent = inputIntent;
    const effectiveFramework = decision.framework;
    const effectiveDomainId = decision.domainId;
    const effectiveProvider = decision.provider;
    const effectiveUseSearch = decision.useSearch;
    const effectiveThinkingMode = decision.thinkingMode;
    const effectiveAgentBlueprintMode = decision.agentBlueprintMode;
    const effectiveOutputLanguage = decision.outputLanguage;
    const effectiveOutputFormat = decision.outputFormat;

    if (effectiveProvider !== provider) settingsDispatch({ type: 'SET_PROVIDER', payload: effectiveProvider });
    if (effectiveUseSearch !== useSearch) settingsDispatch({ type: 'SET_USE_SEARCH', payload: effectiveUseSearch });
    if (effectiveThinkingMode !== thinkingMode) settingsDispatch({ type: 'SET_THINKING_MODE', payload: effectiveThinkingMode });
    if (effectiveAgentBlueprintMode !== agentBlueprintMode) settingsDispatch({ type: 'SET_AGENT_BLUEPRINT_MODE', payload: effectiveAgentBlueprintMode });
    if (effectiveOutputLanguage !== outputLanguage) setOutputLanguage(effectiveOutputLanguage);
    if (effectiveOutputFormat !== outputFormat) setOutputFormat(effectiveOutputFormat);

    lastGenParamsRef.current = {
      intent: effectiveIntent,
      framework: effectiveFramework,
      domainId: effectiveDomainId,
      provider: effectiveProvider,
      useSearch: effectiveUseSearch,
      thinkingMode: effectiveThinkingMode,
      timestamp: Date.now(),
    };
    return executeGeneration({
      intent: effectiveIntent,
      framework: effectiveFramework,
      domainId: effectiveDomainId,
      provider: effectiveProvider,
      useSearch: effectiveUseSearch,
      thinkingMode: effectiveThinkingMode,
      agentBlueprintMode: effectiveAgentBlueprintMode,
      outputLanguage: effectiveOutputLanguage,
      outputFormat: effectiveOutputFormat,
    });
  }, [
    intent,
    framework,
    domainId,
    provider,
    useSearch,
    thinkingMode,
    agentBlueprintMode,
    outputLanguage,
    outputFormat,
    systemBrainConfig,
    addToast,
    executeGeneration,
  ]);

  executeGenerationRef.current = executeGenerationWithTracking;

  const handlePreGenerate = useCallback(async () => {
    if (!intent.trim() && attachments.length === 0) { addToast(t.ui.errorInputEmpty, 'error'); return; }
    setAgentAnalyzing(true); setAgentHint(null);

    let resolvedDomainId = domainId;
    let resolvedFramework = framework;
    let hintText: string | null = null;

    try {
      const data = await analyzeIntentViaBrain({ prompt: intent, domainId, framework });
      if (data.domain && data.domain !== 'auto') resolvedDomainId = data.domain;

      if (framework === Framework.AUTO) {
        const aiFramework = normalizeFrameworkCandidate(data.framework);
        if (aiFramework && aiFramework !== Framework.AUTO) {
          resolvedFramework = aiFramework;
          hintText = data.reasoning || `Auto analyzer selected ${aiFramework}.`;
        } else {
          const localPick = selectFrameworkFromIntent(intent, resolvedDomainId);
          resolvedFramework = localPick.framework;
          hintText = `${localPick.reason} (confidence ${(localPick.confidence * 100).toFixed(0)}%)`;
        }
      } else if (data.reasoning) {
        hintText = data.reasoning;
      }
    } catch {
      if (framework === Framework.AUTO) {
        const localPick = selectFrameworkFromIntent(intent, resolvedDomainId);
        resolvedFramework = localPick.framework;
        hintText = `${localPick.reason} (fallback ${(localPick.confidence * 100).toFixed(0)}%)`;
      }
    } finally {
      setAgentAnalyzing(false);
    }

    if (resolvedDomainId !== domainId) setDomainId(resolvedDomainId);
    if (resolvedFramework !== framework) {
      setFramework(resolvedFramework);
      addToast(`Auto framework: ${resolvedFramework}`, 'info');
    }
    if (hintText) setAgentHint(hintText);

    executeGenerationRef.current?.({ framework: resolvedFramework, domainId: resolvedDomainId });
  }, [intent, attachments, domainId, framework, outputLanguage, addToast, t]);

  handlePreGenerateRef.current = handlePreGenerate;

  const handleSmartRetry = useCallback(() => {
    const p = lastGenParamsRef.current;
    if (p) { genDispatch({ type: 'SET_INTENT', payload: p.intent }); genDispatch({ type: 'SET_FRAMEWORK', payload: p.framework }); genDispatch({ type: 'SET_DOMAIN', payload: p.domainId }); settingsDispatch({ type: 'SET_PROVIDER', payload: p.provider as ClientProvider }); }
    executeGenerationWithTracking();
  }, [executeGenerationWithTracking]);

  const handleRecordEvent = useCallback((payload: TelemetryEventPayload) => {
    recordEvent({ type: payload.type, domainId: payload.domainId ?? domainId, framework: payload.framework ?? framework, provider: payload.provider ?? getProviderLabel(provider === 'auto' ? (lastUsedProvider ?? 'auto') : provider, claudeModel), wasEdited: payload.type === 'edited' }, telemetryConsent);
  }, [domainId, framework, provider, lastUsedProvider, claudeModel, telemetryConsent]);

  const handleWorkflowRun = useCallback(async () => {
    if (!intent.trim() && attachments.length === 0) { addToast(t.ui.errorInputEmpty, 'error'); return; }
    const decision = evaluateSystemBrain(systemBrainConfig, {
      intent,
      provider,
      framework,
      domainId,
      outputLanguage,
      outputFormat,
      useSearch,
      thinkingMode,
      agentBlueprintMode,
    });
    if (decision.blocked) {
      addToast(decision.reason || 'System brain blocked workflow.', 'warning');
      return;
    }

    const workflowProvider = decision.provider;
    const workflowFramework = decision.framework;
    const workflowDomainId = decision.domainId;
    const workflowUseSearch = decision.useSearch;
    const workflowThinkingMode = decision.thinkingMode;
    const workflowOutputLanguage = decision.outputLanguage;
    const workflowOutputFormat = decision.outputFormat;
    const workflowBlueprint = decision.agentBlueprintMode;

    const preset = WORKFLOW_PRESETS.find((p) => p.id === workflowPresetId) ?? WORKFLOW_PRESETS[0];
    const localizedDomain = t.domains[workflowDomainId as keyof typeof t.domains] || t.domains.auto;
    settingsDispatch({ type: 'SET_WORKFLOW_LOADING', payload: true }); genDispatch({ type: 'START_GENERATION' });
    try {
      const activeProfile = getActiveProfile(); const styleContext = buildStyleContext(activeProfile ?? null);
      const runResult = await runWorkflow({
        steps: preset.steps, initialIntent: compressIntent(intent), framework: workflowFramework, domainId: workflowDomainId, provider: workflowProvider, thinkingMode: workflowThinkingMode, contextRules: workflowBlueprint ? `${localizedDomain.contextRules}\nAGENT_BLUEPRINT_MODE=ON` : localizedDomain.contextRules, attachments, styleContext: styleContext || undefined, systemPrompt,
        generateFn: async (intent, framework, domainId, useSearch, thinkingMode, contextRules, attachments, styleContext) => { const { response } = await generateMasterPromptUnified(workflowProvider, { intent, framework, domainId, useSearch: workflowUseSearch ?? useSearch, thinkingMode: workflowThinkingMode ?? thinkingMode, localizedRules: workflowBlueprint ? `${contextRules}\nAGENT_BLUEPRINT_MODE=ON` : contextRules, attachments, styleContext, claudeModel, openRouterModel, systemPrompt, language: workflowOutputLanguage, outputFormat: workflowOutputFormat }); return response; },
        labels: { research: t.ui.workflowStepResearch, summarize: t.ui.workflowStepSummarize, generate_prompt: t.ui.workflowStepGenerate, test: t.ui.workflowStepTest }
      });
      settingsDispatch({ type: 'SET_WORKFLOW_RESULT', payload: runResult });
      if (runResult.finalPrompt) { genDispatch({ type: 'GENERATION_SUCCESS', payload: runResult.finalPrompt }); addToast(t.ui.toastGenerated, 'success'); }
      if (runResult.error) addToast(t.ui.toastError, 'error');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      genDispatch({ type: 'GENERATION_ERROR', payload: msg }); addToast(t.ui.toastError, 'error');
      settingsDispatch({ type: 'SET_WORKFLOW_RESULT', payload: { stepResults: [], finalPrompt: null, error: msg } });
    } finally { settingsDispatch({ type: 'SET_WORKFLOW_LOADING', payload: false }); }
  }, [intent, attachments, workflowPresetId, framework, domainId, provider, claudeModel, openRouterModel, thinkingMode, t, addToast, systemPrompt, withAgentBlueprintRules, outputLanguage, outputFormat, systemBrainConfig, useSearch, agentBlueprintMode]);

  const effectiveProvider = provider === 'auto' ? (lastUsedProvider ?? 'auto') : provider;
  const currentModelLabel = getModelLabel(effectiveProvider, { openRouterModel, claudeModel });
  const aiLabAnalyticsSnapshot = useMemo(() => {
    const a = getAdvancedAnalytics(telemetryConsent);
    return {
      totalGenerations: a.totalGenerations, overallSuccessRate: a.overallSuccessRate, overallEditRate: a.overallEditRate, avgLatencyMs: a.avgLatencyMs,
      topDomains: a.domainStats.slice(0, 3).map(d => ({ domain: d.domain, successRate: d.successRate, count: d.count })),
      topFrameworks: a.frameworkStats.slice(0, 3).map(f => ({ framework: f.framework, editRate: f.editRate, count: f.count })),
      topProviders: a.providerStats.slice(0, 3).map(p => ({ provider: p.provider, successRate: p.successRate, count: p.count }))
    };
  }, [telemetryConsent]);

  const applyToResult = (newPrompt: string) => {
    if (!result) return;
    genDispatch({ type: 'UPDATE_RESULT', payload: { masterPrompt: newPrompt } });
    qualityDispatch({ type: 'SET_JUDGE_RESULT', payload: judgePrompt(newPrompt, { domainId, framework, reasoning: result.reasoning }) });
    qualityDispatch({ type: 'SET_LINT_RESULT', payload: lintPrompt(newPrompt, result.reasoning) });
  };

  // Persist system prompt
  useEffect(() => { localStorage.setItem('sr_system_prompt', systemPrompt); }, [systemPrompt]);
  useEffect(() => {
    localStorage.setItem(AGENT_BLUEPRINT_STORAGE_KEY, agentBlueprintMode ? '1' : '0');
  }, [agentBlueprintMode]);

  // Command Palette (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setCmdPaletteOpen(true); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const paletteCommands: Command[] = useMemo(() => [
    { id: 'generate', label: 'Generate Prompt', icon: '⚡', group: 'Action', keywords: ['generate', 'prompt'], action: () => executeGenerationRef.current?.() },
    { id: 'copy', label: 'Promptu Copy', icon: '📋', group: 'Aksiyon', keywords: ['copy', 'copy'], action: () => result?.masterPrompt && navigator.clipboard.writeText(result.masterPrompt) },
    { id: 'theme', label: theme === 'dark' ? 'Light Mode' : 'Dark Mode', icon: '🌙', group: 'View', keywords: ['theme', 'mode'], action: toggleTheme },
    { id: 'shortcuts', label: 'Keyboard Shortcuts', icon: '⌨️', group: 'Help', keywords: ['keyboard', 'shortcuts'], action: () => setShowShortcuts(true) },
    { id: 'p-dashboard', label: 'Prompt Lab', icon: '⚡', group: 'Sayfa', action: () => setPage('dashboard') },
    { id: 'p-library', label: 'Library', icon: '📚', group: 'Page', action: () => setPage('prompts') },
    { id: 'p-ailab', label: 'AI Lab', icon: '🔬', group: 'Page', action: () => setPage('ailab') },
    { id: 'p-settings', label: 'Settings', icon: '⚙️', group: 'Page', action: () => setPage('settings') },
  ], [result?.masterPrompt, theme, toggleTheme, setPage]);

  const resultContextItems: ContextMenuItem[] = [
    { id: 'copy', label: 'Copy', icon: '📋', action: () => result?.masterPrompt && navigator.clipboard.writeText(result.masterPrompt) },
    { id: 'chatgpt', label: 'Open in ChatGPT', icon: '🤖', action: () => { result?.masterPrompt && navigator.clipboard.writeText(result.masterPrompt); window.open('https://chat.openai.com/', '_blank'); }, divider: true },
    { id: 'claude', label: 'Open in Claude', icon: '🟠', action: () => { result?.masterPrompt && navigator.clipboard.writeText(result.masterPrompt); window.open('https://claude.ai/new', '_blank'); } },
    { id: 'diff', label: 'View Diff', icon: '🔀', action: () => prevResultRef.current && result?.masterPrompt && setDiffPrompt({ left: prevResultRef.current, right: result.masterPrompt }), divider: true },
  ];

  const pageConfigs: Record<SidebarPage, PageConfig<SidebarPage>> = useMemo(() => ({
    dashboard: {
      id: 'dashboard',
      eyebrow: '',
      title: 'Turn intent into a production prompt',
      description: 'Describe the outcome once; NeoMagic routes, structures, checks, and hands off the prompt in one surface.',
      pageKind: 'workbench',
      layoutPreset: 'workbench',
      maxWidth: 'full',
      aiSummary: 'A focused prompt cockpit for turning raw intent into a tested, reusable AI instruction.',
      intentCluster: ['prompt generator', 'AI prompt workflow', 'model routing', 'quality review'],
      onThisPage: ['Brief', 'Routing', 'Quality checks', 'Result handoff'],
      nextBestAction: result ? 'Review the output quality signals before exporting.' : 'Write the outcome, audience, constraints, and format.',
      seo: {
        title: 'NeoMagic Prompt Lab | AI Prompt Workspace',
        description: 'Create, route, evaluate, and export production prompts from a single AI workspace.',
        canonicalPath: '/',
      },
      faqs: [
        {
          question: 'What does Prompt Lab help with?',
          answer: 'Prompt Lab turns a short goal into a structured prompt with routing, quality checks, history, and export actions.',
        },
        {
          question: 'Can NeoMagic choose the model automatically?',
          answer: 'Yes. Auto Route can select a provider and model based on the current task and workspace settings.',
        },
      ],
    },
    prompts: {
      id: 'prompts',
      eyebrow: 'Library',
      title: 'Find the prompt worth reusing',
      description: 'Search, filter, and reuse stored prompts from one list-first workspace.',
      pageKind: 'archive',
      layoutPreset: 'archive',
      maxWidth: 'wide',
      aiSummary: 'A retrieval-first archive for finding proven prompts, comparing versions, and restarting from known good work.',
      intentCluster: ['prompt library', 'prompt history', 'collections', 'reuse prompt'],
      onThisPage: ['Search', 'Collections', 'History', 'Reuse'],
      nextBestAction: history.length ? 'Open a recent prompt and compare it with the current result.' : 'Create the first reusable prompt from Prompt Lab.',
      seo: {
        title: 'Prompt Library | NeoMagic',
        description: 'Search prompt history, collections, reusable templates, and saved AI outputs in NeoMagic.',
        canonicalPath: '/prompts',
      },
      primaryAction: {
        label: 'New brief',
        onClick: () => setPage('dashboard'),
      },
    },
    ailab: {
      id: 'ailab',
      eyebrow: 'AI Lab',
      title: 'Run agent work with visible control',
      description: 'Write the task, review context, and open the advanced workbench only when needed.',
      pageKind: 'workbench',
      layoutPreset: 'workbench',
      maxWidth: 'wide',
      aiSummary: 'A controlled agent workspace for task execution, context review, and observable AI output.',
      intentCluster: ['AI agent runner', 'task execution', 'agent output', 'AI workbench'],
      onThisPage: ['Task', 'Context', 'Run output', 'Advanced workbench'],
      nextBestAction: 'Start with a small task, then expand context only when the run needs it.',
      seo: {
        title: 'AI Lab | NeoMagic Agent Workspace',
        description: 'Run AI agent tasks with context, output review, and workspace-level controls.',
        canonicalPath: '/ailab',
      },
      primaryAction: {
        label: 'Back to Prompt Lab',
        onClick: () => setPage('dashboard'),
      },
    },
    analytics: {
      id: 'analytics',
      eyebrow: 'Analytics',
      title: 'See what improves the work',
      description: 'Review activity, provider performance, and quality signals across recent runs.',
      pageKind: 'management',
      layoutPreset: 'content',
      maxWidth: 'wide',
      aiSummary: 'A product analytics view for generation volume, edit rate, provider performance, and quality drift.',
      intentCluster: ['AI analytics', 'provider performance', 'quality metrics', 'usage dashboard'],
      onThisPage: ['KPIs', 'Providers', 'Quality', 'Recent events'],
      nextBestAction: 'Watch edit rate and latency together; they reveal whether speed is helping or hurting quality.',
      seo: {
        title: 'AI Workspace Analytics | NeoMagic',
        description: 'Track AI usage, provider latency, edit rate, quality signals, and workspace telemetry.',
        canonicalPath: '/analytics',
      },
    },
    settings: {
      id: 'settings',
      eyebrow: 'Settings',
      title: 'Control providers, trust, and integrations',
      description: 'Configure providers, trust controls, integrations, and monitoring in one settings flow.',
      pageKind: 'management',
      layoutPreset: 'content',
      maxWidth: 'wide',
      aiSummary: 'A trust center for provider credentials, privacy posture, integrations, telemetry, and operating limits.',
      intentCluster: ['AI provider settings', 'security controls', 'workspace integrations', 'telemetry consent'],
      onThisPage: ['Providers', 'Trust', 'Integrations', 'Monitoring'],
      nextBestAction: 'Check provider credentials and telemetry consent before running production tasks.',
      seo: {
        title: 'Settings and Trust Controls | NeoMagic',
        description: 'Configure AI providers, trust controls, integrations, telemetry consent, and workspace monitoring.',
        canonicalPath: '/settings',
        robots: 'noindex,nofollow',
      },
    },
    docs: {
      id: 'docs',
      eyebrow: 'Knowledge Base',
      title: 'Answer the next workflow question',
      description: 'Reference workflows, features, and parameters without leaving the product.',
      pageKind: 'management',
      layoutPreset: 'content',
      maxWidth: 'wide',
      aiSummary: 'A concise in-product knowledge base for workflows, parameters, and operating decisions.',
      intentCluster: ['NeoMagic docs', 'workflow guide', 'AI prompt documentation', 'product help'],
      onThisPage: ['Guides', 'Parameters', 'Workflows', 'FAQ'],
      nextBestAction: 'Search for the workflow you are running instead of browsing by section.',
      seo: {
        title: 'NeoMagic Documentation | AI Prompt Workspace Guides',
        description: 'Read concise guides for NeoMagic workflows, prompt parameters, AI routing, and workspace operations.',
        canonicalPath: '/docs',
        schemaType: 'Article',
      },
      faqs: [
        {
          question: 'Where should I start in NeoMagic?',
          answer: 'Start in Prompt Lab with one clear outcome, then use Library or AI Lab as the task becomes more specific.',
        },
        {
          question: 'Does NeoMagic include quality checks?',
          answer: 'Yes. The workspace includes linting, scoring, budget analysis, provenance, and diff review surfaces.',
        },
      ],
    },
  }), [history.length, result, setPage]);
  const currentPageConfig = pageConfigs[activePage as SidebarPage];
  useWorkspaceMetadata(currentPageConfig);
  useExperienceLayer({
    config: currentPageConfig,
    telemetryConsent,
    domainId,
    framework,
    provider: effectiveProvider,
  });
  const openCommandPalette = useCallback(() => {
    pushExperienceEvent({
      type: 'command_palette_open',
      pageId: String(currentPageConfig.id),
      pageKind: currentPageConfig.pageKind,
    });
    setCmdPaletteOpen(true);
  }, [currentPageConfig.id, currentPageConfig.pageKind]);
  const pageFrameClass = useMemo(() => cn(
    'app-page-frame',
    currentPageConfig.maxWidth === 'full'
      ? 'app-page-frame--wide'
      : currentPageConfig.maxWidth === 'default'
        ? 'app-page-frame--narrow'
        : undefined
  ), [currentPageConfig.maxWidth]);
  const promptLabState = useMemo(() => ({
    language: outputLanguage,
    t,
    theme,
    framework,
    domainId,
    selectedDomainName,
    outputLanguage,
    provider,
    claudeModel: claudeModel as 'sonnet' | 'opus',
    attachments,
    outputFormat,
    activePersonaId,
    loading,
    error,
    result: result || undefined,
    dragActive,
    intent,
    agentMode,
    agentAnalyzing,
    agentHint,
    promptGuidance,
    promptLabRailView,
    railTabs,
    quickHistory,
    previousResult: prevResultRef.current,
    fileInputRef,
  }), [
    outputLanguage,
    t,
    theme,
    framework,
    domainId,
    selectedDomainName,
    provider,
    claudeModel,
    attachments,
    outputFormat,
    activePersonaId,
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
  ]);
  const promptLabActions = useMemo(() => ({
    onProviderChange: setProvider,
    onOutputLanguageChange: setOutputLanguage,
    onTemplateSelect: handleTemplateSelect,
    onPersonaApply: handlePersonaApply,
    onPersonaClear: handlePersonaClear,
    onDomainChange: setDomainId,
    onFrameworkChange: setFramework,
    onOutputFormatChange: setOutputFormat,
    onToggleAgentMode: () => {
      setAgentMode((value) => !value);
      setAgentHint(null);
    },
    onThemeToggle: toggleTheme,
    onVoiceTranscript: handleVoiceTranscript,
    onOpenFilePicker: handleOpenFilePicker,
    onIntentChange: setIntent,
    onProcessFiles: processFiles,
    onDrag: handleDrag,
    onDrop: handleDrop,
    onRemoveAttachment: handleRemoveAttachment,
    onRetry: handleSmartRetry,
    onGenerate: handlePreGenerate,
    onOpenShortcuts: () => setShowShortcuts(true),
    onRailViewChange: setPromptLabRailView,
    onInsertExample: handleInsertExamplePrompt,
    onSuggestTemplate: handleSuggestTemplatePrompt,
    onCopyResult: handleCopyResult,
    onDiffResult: handleDiffResult,
    onShareResult: handleShareResult,
    onApplyResult: handleApplyResultToIntent,
    onReuseHistory: handleReuseHistory,
    onRestoreVersion: setIntent,
    onOpenDiff: handleDiffResult,
  }), [
    handleTemplateSelect,
    handlePersonaApply,
    handlePersonaClear,
    toggleTheme,
    handleVoiceTranscript,
    handleOpenFilePicker,
    handleDrag,
    handleDrop,
    handleRemoveAttachment,
    handleSmartRetry,
    handlePreGenerate,
    handleInsertExamplePrompt,
    handleSuggestTemplatePrompt,
    handleCopyResult,
    handleDiffResult,
    handleShareResult,
    handleApplyResultToIntent,
    handleReuseHistory,
  ]);

  return (
    <PageShell
      sidebar={
        <Sidebar
          activePage={activePage as SidebarPage}
          onPageChange={setPage}
          mobileOpen={sidebarOpen}
          onMobileClose={() => setSidebarOpen(false)}
          onNewPrompt={() => {
            setIntent('');
            genDispatch({ type: 'SET_RESULT', payload: null });
            setPage('dashboard');
          }}
        />
      }
      toolbar={
        <PageToolbar
          eyebrow={activePage === 'dashboard' ? 'PROMPT LAB' : currentPageConfig.eyebrow}
          title={activePage === 'dashboard' ? 'Write the brief and run the prompt' : currentPageConfig.title}
          description={activePage === 'dashboard' ? 'Input, routing, history, and result stay in one working surface.' : currentPageConfig.description}
          onOpenSidebar={() => setSidebarOpen(true)}
          onOpenCommandPalette={openCommandPalette}
          badges={
            <>
              <Badge 
                tone={loading ? 'warning' : result ? 'success' : 'info'} 
                className="cursor-pointer hover:bg-white/10"
                onClick={() => setPage('settings')}
              >
                {loading ? 'Processing' : result ? 'System Ready' : 'Standby'}
              </Badge>
              <Badge tone="info">
                {provider === 'auto'
                  ? (lastUsedProvider ? getProviderLabel(lastUsedProvider, claudeModel) : 'Auto Route')
                  : getProviderLabel(provider, claudeModel)}
              </Badge>
            </>
          }
          secondaryActions={
            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                   setIntent('');
                   genDispatch({ type: 'SET_RESULT', payload: null });
                   setPage('dashboard');
                   addToast('New prompt started', 'success');
                }}
                className="btn-premium px-4"
              >
                <Plus size={16} className="mr-1.5" />
                {'New'}
              </Button>

              <div className="relative" ref={toolsMenuRef}>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setToolsMenuOpen((v) => !v)}
                  aria-expanded={toolsMenuOpen}
                >
                  {'Tools'}
                  <ChevronDown size={14} className="ml-1 opacity-50" />
                </Button>
                {toolsMenuOpen && (
                  <div className="absolute right-0 top-[calc(100%+8px)] z-50 min-w-[180px] rounded-[16px] border border-white/10 bg-slate-950/98 p-1.5 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in duration-200">
                    {[
                      { label: 'Command Palette', icon: '⌘', onClick: () => { openCommandPalette(); setToolsMenuOpen(false); } },
                      { label: 'Shortcuts', icon: '?', onClick: () => { setShowShortcuts(true); setToolsMenuOpen(false); } },
                      { label: 'Toggle Theme', icon: theme === 'dark' ? '☀️' : '🌙', onClick: () => { toggleTheme(); setToolsMenuOpen(false); } },
                    ].map((item) => (
                      <button
                        key={item.label}
                        onClick={item.onClick}
                        className="flex w-full items-center justify-between rounded-[10px] px-3 py-2 text-[13px] font-medium text-slate-200 transition-colors hover:bg-white/[0.05] hover:text-white"
                      >
                        {item.label}
                        <span className="text-[10px] opacity-40">{item.icon}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          }
          primaryAction={currentPageConfig.primaryAction}
        />
      }
      footer={<StatusFooter latencyMs={lastLatency} tokensPerSec={lastTokensPerSec} model={currentModelLabel} />}
    >
      <div className="min-h-screen overflow-hidden text-gray-200">
      <KeyboardShortcutsModal isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} />
      <CommandPalette commands={paletteCommands} isOpen={cmdPaletteOpen} onClose={() => setCmdPaletteOpen(false)} />
      {showOnboarding && <OnboardingModal onDone={onboardingDone} />}
      {diffPrompt && (
        <Suspense fallback={null}>
          <PromptDiffViewer left={diffPrompt.left} right={diffPrompt.right} leftLabel="Previous" rightLabel="Current" onClose={() => setDiffPrompt(null)} />
        </Suspense>
      )}
      {ctxMenu && result?.masterPrompt && (
        <ContextMenu items={resultContextItems} x={ctxMenu.x} y={ctxMenu.y} onClose={closeCtxMenu} />
      )}

      <FloatingFAB onClick={() => executeGenerationRef.current?.()} loading={loading} />

      <main className="flex-1 overflow-y-auto px-4 pb-10 pt-6 md:px-6 lg:px-8" role="main">
        <div className={pageFrameClass}>
          <WorkspaceBriefing config={currentPageConfig} />
          {activePage === 'dashboard' && (
            <div className="mt-6 space-y-6 animate-in fade-in duration-300">
              <PromptLabWorkspace
                  state={promptLabState}
                  actions={promptLabActions}
                />

              {result && (
                <div className="space-y-6">
                  <Card className="p-5">
                    <SectionHeader
                      eyebrow={'Output'}
                      title={'Result, export, and handoff'}
                      description={
                        'Copy, compare, export, or send the current result without leaving the page.'
                      }
                      actions={
                        <>
                          {judgeResult && <ScoreBadge score={judgeResult.totalScore} size="sm" />}
                          <Badge tone="success">{'Prompt ready'}</Badge>
                        </>
                      }
                    />

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      {prevResultRef.current && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setDiffPrompt({ left: prevResultRef.current!, right: result.masterPrompt })}
                        >
                          Diff
                        </Button>
                      )}
                      <ExportButton masterPrompt={result.masterPrompt} reasoning={result.reasoning} framework={framework} domainId={domainId} />
                    </div>

                    <div className="mt-5">
                      <OpenInAI prompt={result.masterPrompt} />
                    </div>

                    <div className="mt-5">
                      <ResultDisplay
                        result={result}
                        domainId={domainId}
                        framework={framework}
                        provider={getProviderLabel(effectiveProvider, claudeModel)}
                        telemetryConsent={telemetryConsent}
                        onRecordEvent={handleRecordEvent}
                      />
                    </div>

                    {enrichmentMetrics && enrichmentMetrics.promptsIntegrated > 0 && (
                      <div className="mt-5 rounded-[16px] border border-violet-300/18 bg-violet-400/10 px-4 py-3 text-[12px] text-violet-100">
                        {`Enrichment complete. Ambiguity ${enrichmentMetrics.ambiguityBefore} → ${enrichmentMetrics.ambiguityAfter}, +${enrichmentMetrics.promptsIntegrated} prompt signals added.`}
                      </div>
                    )}
                  </Card>

                  <Card className="p-5">
                    <SectionHeader
                      eyebrow={'Quality'}
                      title={'Checks and traceability'}
                      description={
                        'Open scoring, lint, budget, and provenance only when you need to inspect them.'
                      }
                      actions={
                        <Button variant="secondary" size="sm" onClick={() => qualityDispatch({ type: 'TOGGLE_QUALITY_PANEL' })}>
                          {showQualityPanel ? ('Collapse') : ('Expand')}
                        </Button>
                      }
                    />

                    <div className="mt-5">
                      <CacheStatus stats={getCacheStats()} lastHit={lastCacheHit} />
                    </div>

                    {showQualityPanel ? (
                      <Suspense fallback={<PageLoader />}>
                        <div className="mt-5 space-y-4">
                          {judgeResult && <JudgePanel result={judgeResult} />}
                          {lintResult && <PromptLintPanel result={lintResult} />}
                          {budgetAnalysis && <BudgetPanel analysis={budgetAnalysis} />}
                          {provenance && <ProvenanceView provenance={provenance} />}
                        </div>
                      </Suspense>
                    ) : (
                      <p className="ui-helper mt-5">
                        {'The detail view stays folded by default so the main workflow remains easier to scan.'}
                      </p>
                    )}
                  </Card>

                  <Card className="p-5">
                    <SectionHeader
                      eyebrow={'Tools'}
                      title={'Advanced prompt tools'}
                      description={'Open refinement, testing, and comparison tools on demand.'}
                    />

                    <div className="mt-5 flex flex-wrap items-center gap-3">
                      <Button variant="primary" onClick={() => setPromptToolsOpen(true)}>
                        {'Open prompt tools'}
                      </Button>
                      <span className="text-[12px] text-slate-400">
                        {'The main result view stays calm while advanced tools open on demand.'}
                      </span>
                    </div>
                  </Card>

                  <Drawer
                    open={promptToolsOpen}
                    onClose={() => setPromptToolsOpen(false)}
                    title={'Toolkit'}
                    description={'Post-generation power tools.'}
                    width="lg"
                  >
                    <Suspense fallback={<PageLoader />}>
                      <div className="space-y-6">
                        <Card className="p-5">
                          <SectionHeader
                            eyebrow={'Explore'}
                            title={'Examples and alternatives'}
                            description={
                              'Generate examples and compare versions from the same section.'
                            }
                          />
                          <div className="mt-5 space-y-4">
                            <FewShotGenerator masterPrompt={result.masterPrompt} domainId={domainId} framework={framework} provider={provider} language={outputLanguage} />
                            <PromptTournament intent={intent} domainId={domainId} provider={provider} language={outputLanguage} />
                          </div>
                        </Card>

                        <Card className="p-5">
                          <SectionHeader
                            eyebrow={'Improve'}
                            title={'Refine the current prompt'}
                            description={
                              'Apply synthesis, enhancement, enrichment, and transformation without leaving the drawer.'
                            }
                          />
                          <div className="mt-5 space-y-4">
                            <PromptImprovePanel masterPrompt={result.masterPrompt} domainId={domainId} framework={framework} language={outputLanguage} onApply={(p) => { applyToResult(p); addToast('Improved prompt applied.', 'success'); }} />
                            <AutoCompletePanel masterPrompt={result.masterPrompt} domainId={domainId} framework={framework} agentMode={agentMode} language={outputLanguage} onApply={(p) => { applyToResult(p); addToast('Synthesis applied.', 'success'); }} />
                            <EnhancePanel masterPrompt={result.masterPrompt} reasoning={result.reasoning} framework={framework} domainId={domainId} agentMode={agentMode} language={outputLanguage} onApply={(p) => { applyToResult(p); addToast('Enhancement applied.', 'success'); }} />
                            <EnrichmentPanel masterPrompt={result.masterPrompt} framework={framework} domainId={domainId} agentMode={agentMode} language={outputLanguage} onApply={(p) => { applyToResult(p); addToast('Enrichment applied.', 'success'); }} />
                            <PromptTransformPanel masterPrompt={result.masterPrompt} agentMode={agentMode} language={outputLanguage} onApply={(p) => { applyToResult(p); addToast('Transformation applied.', 'success'); }} />
                          </div>
                        </Card>

                        <Card className="p-5">
                          <SectionHeader
                            eyebrow={'Review'}
                            title={'Inspect and benchmark'}
                            description={
                              'Run analysis and automated comparisons before you export or reuse the prompt.'
                            }
                          />
                          <div className="mt-5 space-y-4">
                            <AdversarialImmunityPanel masterPrompt={result.masterPrompt} language={outputLanguage} />
                            <PromptAnalysisPanel masterPrompt={result.masterPrompt} agentMode={agentMode} language={outputLanguage} />
                            <BenchmarkPanel masterPrompt={result.masterPrompt} reasoning={result.reasoning} framework={framework} domainId={domainId} provider={provider} agentMode={agentMode} />
                          </div>
                        </Card>
                      </div>
                    </Suspense>
                  </Drawer>
                </div>
              )}
            </div>
          )}

          {activePage === 'prompts' && (
            <div className="animate-in fade-in duration-300">
              <Suspense fallback={<PageLoader />}>
                <LibraryWorkspace
                  history={history}
                  language={outputLanguage}
                  onUsePrompt={(prompt) => {
                    genDispatch({ type: 'SET_INTENT', payload: prompt });
                    setPage('dashboard');
                    addToast('Prompt loaded', 'success');
                  }}
                  onReuseHistory={(entry) => {
                    genDispatch({ type: 'SET_INTENT', payload: entry.intent });
                    setPage('dashboard');
                    addToast('Prompt loaded', 'success');
                  }}
                  onRemoveHistory={removeEntry}
                  onClearHistory={clearHistory}
                />
              </Suspense>
            </div>
          )}

          {activePage === 'ailab' && (
            <Suspense fallback={<PageLoader />}>
              <div className="space-y-6 animate-in fade-in duration-300">
                <AILabWorkspace
                  language={outputLanguage}
                  currentPrompt={result?.masterPrompt}
                  domainId={domainId}
                  framework={framework}
                  analyticsSnapshot={aiLabAnalyticsSnapshot}
                  workflowPresetId={workflowPresetId}
                  onApplyEnrichedPrompt={(enrichedPrompt) => {
                    if (result) {
                      applyToResult(enrichedPrompt);
                      addToast('AI Lab applied!', 'success');
                    }
                  }}
                />

                <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
                  <Card className="p-5">
                    <WorkflowPanel
                      presetId={workflowPresetId}
                      onPresetChange={(value) => settingsDispatch({ type: 'SET_WORKFLOW_PRESET', payload: value })}
                      onRun={handleWorkflowRun}
                      running={workflowLoading}
                      result={workflowResult}
                      disabled={(!intent.trim() && attachments.length === 0) || loading}
                    />
                  </Card>
                  <Card className="p-5">
                    <StyleProfileManager />
                  </Card>
                </div>
              </div>
            </Suspense>
          )}

          {activePage === 'analytics' && (
            <Suspense fallback={<PageLoader />}>
              <div className="space-y-6 animate-in fade-in duration-300">
                <Card tone="hero" className="p-6">
                  <SectionHeader
                    eyebrow={t.ui.analyticsTitle}
                    title={'Usage and quality overview'}
                    description={
                      'Track KPI trends, provider performance, and usage windows from one view.'
                    }
                    actions={
                      <label className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-[12px] text-slate-200">
                        <input
                          type="checkbox"
                          checked={telemetryConsent}
                          onChange={(e) => {
                            setTelemetryConsent(e.target.checked);
                            settingsDispatch({ type: 'SET_TELEMETRY_CONSENT', payload: e.target.checked });
                          }}
                          className="rounded border-white/12 bg-slate-950/60 text-cyan-300"
                        />
                        {t.ui.analyticsConsent}
                      </label>
                    }
                  />

                  <div className="mt-6 grid gap-4 lg:grid-cols-2">
                    <Card tone="muted" className="p-4">
                      <p className="text-[14px] font-semibold text-white">{'Time window'}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge tone="info">{'Last 7 days'}</Badge>
                        <Badge tone="neutral">{'Last 30 days'}</Badge>
                        <Badge tone="neutral">{'All time'}</Badge>
                      </div>
                    </Card>
                    <Card tone="muted" className="p-4">
                      <p className="text-[14px] font-semibold text-white">{'Provider comparison'}</p>
                      <p className="ui-helper mt-2">
                        {'Latency and efficiency deltas appear here when analytics data is available.'}
                      </p>
                    </Card>
                  </div>
                </Card>

                <AnalyticsDashboard consent={telemetryConsent} onRunFirstPrompt={() => setPage('dashboard')} />
              </div>
            </Suspense>
          )}

          {activePage === 'settings' && (
            <div className="animate-in fade-in duration-300 space-y-6">
              <SettingsPage
                provider={provider}
                onProviderChange={setProvider}
                claudeModel={claudeModel as 'sonnet' | 'opus'}
                onClaudeModelChange={(value) => settingsDispatch({ type: 'SET_CLAUDE_MODEL', payload: value })}
                openRouterModel={openRouterModel}
                onOpenRouterModelChange={(value) => settingsDispatch({ type: 'SET_OPENROUTER_MODEL', payload: value })}
                thinkingMode={thinkingMode}
                onThinkingModeChange={(value) => settingsDispatch({ type: 'SET_THINKING_MODE', payload: value })}
                agentBlueprintMode={agentBlueprintMode}
                onAgentBlueprintModeChange={(value) => settingsDispatch({ type: 'SET_AGENT_BLUEPRINT_MODE', payload: value })}
                useSearch={useSearch}
                onUseSearchChange={(value) => settingsDispatch({ type: 'SET_USE_SEARCH', payload: value })}
                autoEnrich={autoEnrich}
                onAutoEnrichChange={(value) => settingsDispatch({ type: 'SET_AUTO_ENRICH', payload: value })}
                telemetryConsent={telemetryConsent}
                onTelemetryConsentChange={(value) => {
                  setTelemetryConsent(value);
                  settingsDispatch({ type: 'SET_TELEMETRY_CONSENT', payload: value });
                }}
                
                appearanceSlot={
                  <Card className="p-5">
                    <SectionHeader
                      title={'Theme and appearance'}
                      description={'Manage visual density and accent color.'}
                    />
                    <div className="mt-5">
                      <ThemeCustomizer />
                    </div>
                  </Card>
                }
                systemPromptSlot={
                  <Card className="p-5">
                    <SectionHeader
                      title={'System prompt'}
                      description={'Update the global behavior layer here.'}
                    />
                    <div className="mt-5">
                      <SystemPromptEditor
                        value={systemPrompt}
                        onChange={setSystemPrompt}
                        onVerify={handleVerifySystemPrompt}
                        verifying={systemPromptVerifying}
                      />
                    </div>
                  </Card>
                }
                integrationsSlot={
                  <div className="space-y-5">
                    <Card className="p-5">
                      <SectionHeader
                        title={'Webhook integration'}
                        description={'Send post-generation events to external systems.'}
                      />
                      <div className="mt-5">
                        <WebhookSettings language={outputLanguage} />
                      </div>
                    </Card>
                    <FalAiStudio />
                  </div>
                }
                monitoringSlot={
                  <div className="space-y-5">
                    <Card className="p-5">
                      <SectionHeader
                        title={'System health'}
                        description={'Backend availability, cost, and runtime visibility.'}
                      />
                      <div className="mt-5 space-y-5">
                        <BackendHealthPanel onOpenAuthSettings={handleOpenProviderCredentials} />
                        <ProviderCostCalculator />
                      </div>
                    </Card>
                    <SystemControlCenter
                      config={systemBrainConfig}
                      onConfigChange={setSystemBrainConfig}
                      availableDomains={Object.entries(t.domains).map(([value, meta]) => ({
                        value,
                        label: meta.name,
                      }))}
                    />
                  </div>
                }
              />
            </div>
          )}

          {activePage === 'docs' && (
            <Suspense fallback={<PageLoader />}>
              <DocumentationPage />
            </Suspense>
          )}
        </div>
      </main>

      {/* Ambient FX */}
      {activePage !== 'dashboard' && (
        <>
          <div className="fixed inset-0 pointer-events-none z-0 opacity-[0.018] bg-[linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] bg-[length:72px_72px]" />
          <div className="fixed left-[240px] top-12 h-72 w-72 rounded-full bg-[#66aaff]/[0.045] blur-[150px] pointer-events-none" />
        </>
      )}
      </div>
    </PageShell>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <ToastProvider>
        <AuthProvider>
          <AuthGate />
        </AuthProvider>
      </ToastProvider>
    </I18nProvider>
  );
}
