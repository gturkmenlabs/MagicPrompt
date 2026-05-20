import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ClientProvider } from '@/services/unifiedProviderClient';
import type { WorkflowRunResult } from '@/types';

export interface SettingsState {
  provider: ClientProvider;
  lastUsedProvider: ClientProvider | null;
  claudeModel: 'sonnet' | 'opus';
  openRouterModel: string;
  useSearch: boolean;
  thinkingMode: boolean;
  agentBlueprintMode: boolean;
  telemetryConsent: boolean;
  workflowPresetId: string;
  workflowResult: WorkflowRunResult | null;
  workflowLoading: boolean;
  autoEnrich: boolean;
}

interface SettingsActions {
  setProvider: (provider: ClientProvider) => void;
  setLastUsedProvider: (provider: ClientProvider | null) => void;
  setClaudeModel: (model: 'sonnet' | 'opus') => void;
  setOpenRouterModel: (model: string) => void;
  setUseSearch: (useSearch: boolean) => void;
  setThinkingMode: (thinkingMode: boolean) => void;
  setAgentBlueprintMode: (mode: boolean) => void;
  setTelemetryConsent: (consent: boolean) => void;
  setWorkflowPreset: (preset: string) => void;
  setWorkflowResult: (result: WorkflowRunResult | null) => void;
  setWorkflowLoading: (loading: boolean) => void;
  setAutoEnrich: (autoEnrich: boolean) => void;
}

export const useSettingsStore = create<SettingsState & SettingsActions>()(
  persist(
    (set) => ({
      provider: 'auto' as ClientProvider,
      lastUsedProvider: null,
      claudeModel: 'sonnet',
      openRouterModel: 'openai/gpt-4o-mini',
      useSearch: false,
      thinkingMode: false,
      agentBlueprintMode: true,
      telemetryConsent: false,
      workflowPresetId: 'quick',
      workflowResult: null,
      workflowLoading: false,
      autoEnrich: false,

      setProvider: (provider) => set({ provider }),
      setLastUsedProvider: (lastUsedProvider) => set({ lastUsedProvider }),
      setClaudeModel: (claudeModel) => set({ claudeModel }),
      setOpenRouterModel: (openRouterModel) => set({ openRouterModel }),
      setUseSearch: (useSearch) => set({ useSearch }),
      setThinkingMode: (thinkingMode) => set({ thinkingMode }),
      setAgentBlueprintMode: (agentBlueprintMode) => set({ agentBlueprintMode }),
      setTelemetryConsent: (telemetryConsent) => set({ telemetryConsent }),
      setWorkflowPreset: (workflowPresetId) => set({ workflowPresetId }),
      setWorkflowResult: (workflowResult) => set({ workflowResult }),
      setWorkflowLoading: (workflowLoading) => set({ workflowLoading }),
      setAutoEnrich: (autoEnrich) => set({ autoEnrich }),
    }),
    {
      name: 'sr-settings',
      partialize: (state) => ({
        provider: state.provider,
        claudeModel: state.claudeModel,
        openRouterModel: state.openRouterModel,
        useSearch: state.useSearch,
        thinkingMode: state.thinkingMode,
        agentBlueprintMode: state.agentBlueprintMode,
        telemetryConsent: state.telemetryConsent,
        autoEnrich: state.autoEnrich,
      }),
    }
  )
);
