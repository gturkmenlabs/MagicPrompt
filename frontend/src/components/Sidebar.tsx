import React from 'react';
import {
  Zap,
  Library,
  FlaskConical,
  BarChart3,
  Settings,
  User,
  Plus,
  X,
  Sparkles,
  LogOut
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { BookOpen } from 'lucide-react';

declare const __APP_VERSION__: string;

export type SidebarPage =
  | 'dashboard'
  | 'prompts'
  | 'ailab'
  | 'analytics'
  | 'settings'
  | 'docs';

interface SidebarProps {
  activePage: SidebarPage;
  onPageChange: (page: SidebarPage) => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  onNewPrompt?: () => void;
}

export const NAV_ITEMS: Array<{
  id: SidebarPage;
  label: string;
  description: string;
  badge?: string;
  icon: React.ElementType;
}> = [
  {
    id: 'dashboard',
    label: 'Prompt Lab',
    description: 'Production flow',
    badge: 'Core',
    icon: Zap,
  },
  {
    id: 'prompts',
    label: 'Library',
    description: 'Search and collections',
    icon: Library,
  },
  {
    id: 'ailab',
    label: 'AI Lab',
    description: 'Agent flow',
    badge: 'Live',
    icon: FlaskConical,
  },
];

export const NAV_GROUPS: Array<{
  id: 'workspace' | 'platform';
  labelEn: string;
  items: Array<{
    id: SidebarPage;
    label: string;
    description: string;
    badge?: string;
    icon: React.ElementType;
  }>;
}> = [
  {
    id: 'workspace',
    labelEn: 'Workspace',
    items: NAV_ITEMS.slice(0, 3),
  },
  {
    id: 'platform',
    labelEn: 'Platform',
    items: [],
  },
];

const ADVANCED_ITEMS: Array<{
  id: SidebarPage;
  label: string;
  description: string;
  badge?: string;
  icon: React.ElementType;
}> = [
  {
    id: 'analytics',
    label: 'Analytics',
    description: 'KPI and trends',
    icon: BarChart3,
  },
  {
    id: 'settings',
    label: 'Settings',
    description: 'Providers and trust',
    icon: Settings,
  },
  {
    id: 'docs',
    label: 'Documentation',
    description: 'Guides and Features',
    icon: BookOpen,
  },
];

NAV_GROUPS[1].items = ADVANCED_ITEMS;

function UserCard({ onPageChange, onMobileClose }: { onPageChange: (page: SidebarPage) => void; onMobileClose?: () => void }) {
  const { profile, session, signOut } = useAuth();
  const displayName = profile?.name || profile?.email?.split('@')[0] || 'Guest User';
  const planLabel = profile?.plan ? `${profile.plan.charAt(0).toUpperCase()}${profile.plan.slice(1)} Plan` : 'Free Tier Access';
  const isGuest = !session || session.provider === 'open-access';

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => { onPageChange('settings'); onMobileClose?.(); }}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-[var(--surface-3)]"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[var(--iolite-500)] to-[var(--aurora-500)] text-sm font-semibold text-white">
          <User size={18} />
        </div>
        <div className="flex flex-1 flex-col min-w-0">
          <p className="truncate text-sm font-medium text-[var(--text-primary)]">{displayName}</p>
          <p className="truncate text-xs text-[var(--text-tertiary)]">{planLabel}</p>
        </div>
      </button>
      {!isGuest && (
        <button
          type="button"
          onClick={async () => { await signOut(); }}
          className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-[11px] font-medium text-[var(--text-tertiary)] transition-all hover:bg-red-500/10 hover:text-red-300"
        >
          <LogOut size={13} />
          Sign Out
        </button>
      )}
    </div>
  );
}

function renderNavItem(
  item: { id: SidebarPage; label: string; description: string; badge?: string; icon: React.ElementType },
  activePage: SidebarPage,
  onPageChange: (page: SidebarPage) => void,
  onMobileClose?: () => void
) {
  const isActive = activePage === item.id;
  const Icon = item.icon;

  return (
    <button
      key={item.id}
      type="button"
      onClick={() => {
        onPageChange(item.id);
        onMobileClose?.();
      }}
      className={cn(
        'group relative flex w-full items-center gap-3 rounded-lg px-4 py-3 transition-all duration-[240ms]',
        isActive 
          ? 'bg-[var(--surface-3)] text-[var(--iolite-300)]' 
          : 'text-[var(--text-secondary)] hover:bg-[var(--surface-3)] hover:text-[var(--text-primary)]'
      )}
      aria-current={isActive ? 'page' : undefined}
    >
      {isActive && (
        <div className="absolute bottom-0 left-0 top-0 w-1 rounded-r bg-gradient-to-b from-[var(--iolite-500)] to-[var(--aurora-500)]" />
      )}
      <div className={cn(
        'flex h-4 w-4 items-center justify-center transition-transform duration-[240ms]',
        !isActive && 'group-hover:translate-x-1'
      )}>
        <Icon size={18} strokeWidth={isActive ? 2 : 1.5} />
      </div>
      <div className="flex flex-1 flex-col items-start min-w-0">
        <span className={cn(
          'text-sm font-medium leading-none transition-colors',
          isActive ? 'text-[var(--iolite-300)]' : 'text-[var(--text-secondary)]'
        )}>
          {item.label}
        </span>
        <span className="mt-1 truncate text-xs text-[var(--text-tertiary)]">
          {item.description}
        </span>
      </div>
      {item.badge && (
        <span className={cn(
          "rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
          item.badge.toLowerCase() === 'core' && 'bg-[var(--iolite-500)]/20 text-[var(--iolite-300)]',
          item.badge.toLowerCase() === 'live' && 'bg-[var(--aurora-500)]/20 text-[var(--aurora-500)]',
          item.badge.toLowerCase() === 'beta' && 'bg-[var(--warning-tint)] text-[var(--warning-500)]'
        )}>
          {item.badge}
        </span>
      )}
    </button>
  );
}

export default function Sidebar({
  activePage,
  onPageChange,
  mobileOpen = false,
  onMobileClose,
  onNewPrompt,
}: SidebarProps) {
  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px] transition-opacity lg:hidden ${
          mobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onMobileClose}
        aria-hidden
      />

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col border-r border-[var(--border-default)] bg-[var(--surface-1)] transition-transform duration-300 ease-in-out',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="flex flex-col gap-4 border-b border-[var(--border-default)] px-4 pb-4 pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--iolite-500)] to-[var(--aurora-500)] text-white">
                <Sparkles size={18} strokeWidth={2} />
              </div>
              <div className="flex flex-col">
                <h1 className="text-base font-semibold tracking-tight text-[var(--text-primary)] leading-tight">NeoMagic</h1>
                <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-tertiary)]">PROMPT OS</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onMobileClose}
              className="lg:hidden flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border-default)] bg-[var(--surface-2)] text-[var(--text-secondary)]"
              aria-label="Close menu"
            >
              <X size={18} />
            </button>
          </div>

          <button
            type="button"
            className="group relative flex items-center justify-center gap-2 overflow-hidden rounded-lg bg-gradient-to-r from-[var(--iolite-500)] to-[var(--aurora-500)] py-3 text-sm font-semibold text-white transition-transform hover:scale-[1.02] active:scale-[0.98]"
            onClick={() => {
              if (onNewPrompt) {
                onNewPrompt();
              } else {
                onPageChange('dashboard');
              }
              onMobileClose?.();
            }}
          >
            <Plus size={16} strokeWidth={3} />
            New Prompt
          </button>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto px-4 py-4 custom-scrollbar">
          <div className="space-y-1">
            <p className="px-4 pb-2 text-[var(--text-overline,11px)] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
              WORKSPACE
            </p>
            <div className="space-y-1">
              {NAV_ITEMS.map((item) => renderNavItem(item, activePage, onPageChange, onMobileClose))}
            </div>
          </div>

          <div className="space-y-1">
            <p className="px-4 pb-2 text-[var(--text-overline,11px)] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
              PLATFORM
            </p>
            <div className="space-y-1">
              {ADVANCED_ITEMS.map((item) => renderNavItem(item, activePage, onPageChange, onMobileClose))}
            </div>
          </div>
        </nav>

        <div className="mt-auto border-t border-[var(--border-default)] bg-[var(--surface-1)] p-4">
          <UserCard onPageChange={onPageChange} onMobileClose={onMobileClose} />
        </div>
      </aside>
    </>
  );
}
