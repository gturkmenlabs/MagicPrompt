/**
 * Zustand stores — centralized state management.
 * Replaces the 4 useReducer instances in App.tsx.
 * 
 * Usage:
 *   import { useGenerationStore } from '@/src/stores';
 *   const { intent, setIntent, startGeneration } = useGenerationStore();
 */

export { useGenerationStore } from './generationStore';
export { useQualityStore } from './qualityStore';
export { useUIStore } from './uiStore';
export { useSettingsStore } from './settingsStore';
