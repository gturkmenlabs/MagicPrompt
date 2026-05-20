import { create } from 'zustand';
import type { SidebarPage } from '@/components/Sidebar';

export interface UIState {
  activePage: SidebarPage;
  computePower: number;
  lastLatency: number;
  lastTokensPerSec: number;
  showConfirmModal: boolean;
}

interface UIActions {
  setPage: (page: SidebarPage) => void;
  setComputePower: (power: number) => void;
  setLatency: (latency: number) => void;
  setTokensPerSec: (tps: number) => void;
  setConfirmModal: (show: boolean) => void;
}

export const useUIStore = create<UIState & UIActions>((set) => ({
  activePage: 'dashboard',
  computePower: 75,
  lastLatency: 42,
  lastTokensPerSec: 124,
  showConfirmModal: false,

  setPage: (activePage) => set({ activePage }),
  setComputePower: (computePower) => set({ computePower }),
  setLatency: (lastLatency) => set({ lastLatency }),
  setTokensPerSec: (lastTokensPerSec) => set({ lastTokensPerSec }),
  setConfirmModal: (showConfirmModal) => set({ showConfirmModal }),
}));
