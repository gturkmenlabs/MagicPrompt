/**
 * AppContext — React Context provider wrapping useAppState.
 *
 * Wrap the root of the app with <AppProvider> so any descendant can call
 * useAppContext() instead of prop-drilling dispatch functions.
 *
 * Example:
 *   // In App.tsx root:
 *   <AppProvider><AppContent /></AppProvider>
 *
 *   // In any child:
 *   const { gen, genDispatch } = useAppContext();
 */
import React, { createContext, useContext, type ReactNode } from 'react';
import { useAppState, type AppStateHook } from './useAppState';

const AppContext = createContext<AppStateHook | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const appState = useAppState();
  return <AppContext.Provider value={appState}>{children}</AppContext.Provider>;
}

export function useAppContext(): AppStateHook {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useAppContext must be called inside <AppProvider>');
  }
  return ctx;
}
