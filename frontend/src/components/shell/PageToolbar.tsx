import React from 'react';
import { Bell, Menu, Search } from 'lucide-react';
import { Button } from '../ui';
import type { PrimaryActionConfig } from '@/types/ui';

interface PageToolbarProps {
  eyebrow: string;
  title: string;
  description: string;
  badges?: React.ReactNode;
  secondaryActions?: React.ReactNode;
  primaryAction?: PrimaryActionConfig;
  onOpenSidebar?: () => void;
  onOpenCommandPalette?: () => void;
}

export function PageToolbar({
  eyebrow,
  title,
  description,
  badges,
  secondaryActions,
  primaryAction,
  onOpenSidebar,
  onOpenCommandPalette,
}: PageToolbarProps) {
  return (
    <header className="sticky top-0 z-30 h-16 border-b border-[var(--border-default)] bg-[var(--surface-base)]/85 backdrop-blur-sm">
      <div className="flex h-full items-center justify-between gap-6 px-4 md:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[var(--border-default)] bg-[var(--surface-2)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-3)] lg:hidden"
            onClick={onOpenSidebar}
            aria-label="Open navigation"
          >
            <Menu className="h-4 w-4" />
          </button>
          <div className="flex min-w-0 items-center gap-2">
            <span className="text-sm text-[var(--text-tertiary)]">Workspace</span>
            <span className="text-[var(--text-tertiary)]">›</span>
            <div className="min-w-0">
              <p className="sr-only">{eyebrow}</p>
              <h1 className="truncate text-base font-semibold text-[var(--text-primary)]">{title}</h1>
              <p className="hidden max-w-[48ch] truncate text-xs text-[var(--text-tertiary)] xl:block">{description}</p>
            </div>
          </div>
        </div>

        <div className="hidden max-w-[480px] flex-1 lg:block">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]" />
            <button
              type="button"
              className="h-10 w-full rounded-lg border border-[var(--border-default)] bg-[var(--surface-2)] pl-10 pr-4 text-left text-sm text-[var(--text-tertiary)] transition-all hover:border-[var(--border-strong)] hover:bg-[var(--surface-3)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
              onClick={onOpenCommandPalette}
              aria-label="Open command palette"
            >
              Ask, search, or run a command
              <kbd className="float-right rounded border border-[var(--border-default)] px-1.5 py-0.5 text-[10px] text-[var(--text-muted)]">
                Ctrl K
              </kbd>
            </button>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {badges && (
            <div className="hidden items-center gap-2 md:flex">
              {badges}
            </div>
          )}
          <button
            type="button"
            className="relative flex h-10 w-10 items-center justify-center rounded-lg text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-2)]"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[var(--danger-500)]" />
          </button>
          {secondaryActions && <div className="flex items-center gap-2">{secondaryActions}</div>}
          {primaryAction && (
            <Button
              variant="primary"
              size="md"
              onClick={primaryAction.onClick}
              disabled={primaryAction.disabled}
            >
              {primaryAction.busy ? `${primaryAction.label}...` : primaryAction.label}
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

export default PageToolbar;
