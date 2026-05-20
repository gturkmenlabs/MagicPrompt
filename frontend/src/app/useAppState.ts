/**
 * useAppState — unified hook over the four domain reducers.
 *
 * Replaces the direct `useReducer` calls scattered across AppContent.
 * Consumers import this hook (or AppContext) instead of touching reducers directly.
 */
import { useReducer, useMemo, type Dispatch } from 'react';
import {
  generationReducer, initialGenerationState, type GenerationState, type GenerationAction,
  qualityReducer,    initialQualityState,    type QualityState,    type QualityAction,
  uiReducer,         initialUIState,         type UIState,         type UIAction,
  settingsReducer,   initialSettingsState,   type SettingsState,   type SettingsAction,
} from '../utils/appReducers';

export interface AppState {
  gen: GenerationState;
  quality: QualityState;
  ui: UIState;
  settings: SettingsState;
}

export interface AppDispatches {
  genDispatch: Dispatch<GenerationAction>;
  qualityDispatch: Dispatch<QualityAction>;
  uiDispatch: Dispatch<UIAction>;
  settingsDispatch: Dispatch<SettingsAction>;
}

export interface AppStateHook extends AppState, AppDispatches {}

export function useAppState(): AppStateHook {
  const [gen,      genDispatch]      = useReducer(generationReducer, initialGenerationState);
  const [quality,  qualityDispatch]  = useReducer(qualityReducer,    initialQualityState);
  const [ui,       uiDispatch]       = useReducer(uiReducer,         initialUIState);
  const [settings, settingsDispatch] = useReducer(settingsReducer,   initialSettingsState);

  // Stable object reference — avoids spurious context re-renders
  return useMemo(
    () => ({ gen, quality, ui, settings, genDispatch, qualityDispatch, uiDispatch, settingsDispatch }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [gen, quality, ui, settings],
  );
}
