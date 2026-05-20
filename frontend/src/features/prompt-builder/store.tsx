import React, { createContext, useContext, useReducer } from 'react';
import {
  generationReducer,
  initialGenerationState,
  qualityReducer,
  initialQualityState,
  uiReducer,
  initialUIState,
  settingsReducer,
  initialSettingsState,
  type GenerationState,
  type QualityState,
  type UIState,
  type SettingsState,
  type GenerationAction,
  type QualityAction,
  type UIAction,
  type SettingsAction,
} from '@/utils/appReducers';

interface PromptBuilderState {
  gen: GenerationState;
  quality: QualityState;
  ui: UIState;
  settings: SettingsState;
}

interface PromptBuilderDispatch {
  genDispatch: React.Dispatch<GenerationAction>;
  qualityDispatch: React.Dispatch<QualityAction>;
  uiDispatch: React.Dispatch<UIAction>;
  settingsDispatch: React.Dispatch<SettingsAction>;
}

const PromptBuilderStateContext = createContext<PromptBuilderState | undefined>(undefined);
const PromptBuilderDispatchContext = createContext<PromptBuilderDispatch | undefined>(undefined);

export const PromptBuilderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [gen, genDispatch] = useReducer(generationReducer, initialGenerationState);
  const [quality, qualityDispatch] = useReducer(qualityReducer, initialQualityState);
  const [ui, uiDispatch] = useReducer(uiReducer, initialUIState);
  const [settings, settingsDispatch] = useReducer(settingsReducer, initialSettingsState);

  return (
    <PromptBuilderStateContext.Provider value={{ gen, quality, ui, settings }}>
      <PromptBuilderDispatchContext.Provider
        value={{ genDispatch, qualityDispatch, uiDispatch, settingsDispatch }}
      >
        {children}
      </PromptBuilderDispatchContext.Provider>
    </PromptBuilderStateContext.Provider>
  );
};

export function usePromptBuilderState() {
  const ctx = useContext(PromptBuilderStateContext);
  if (!ctx) {
    throw new Error('usePromptBuilderState must be used within PromptBuilderProvider');
  }
  return ctx;
}

export function usePromptBuilderDispatch() {
  const ctx = useContext(PromptBuilderDispatchContext);
  if (!ctx) {
    throw new Error('usePromptBuilderDispatch must be used within PromptBuilderProvider');
  }
  return ctx;
}

