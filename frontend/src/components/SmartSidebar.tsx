/**
 * SmartSidebar — Akilli collapse, quick jump, contextual submenu.
 * Sidebar.tsx refactor; ayni API (activePage, onPageChange, mobileOpen, onMobileClose, pinned, onPinChange).
 */

import { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from '../i18n';
import { useAuth } from '@/contexts/AuthContext';
import { type SidebarPage, NAV_ITEMS as SIDEBAR_ITEMS } from './Sidebar';
import { cn } from '@/lib/utils';

declare const __APP_VERSION__: string;

const SIDEBAR_WIDTH = 328;
const SIDEBAR_COLLAPSED = 88;
const NAV_TAG_STYLES = {
  neutral: 'text-slate-200 bg-slate-500/12 border-slate-300/20',
  live: 'text-emerald-200 bg-emerald-500/14 border-emerald-400/26',
  beta: 'text-amber-200 bg-amber-500/14 border-amber-400/26',
  labs: 'text-violet-200 bg-violet-500/14 border-violet-400/26',
  ops: 'text-cyan-100 bg-cyan-500/14 border-cyan-400/26',
} as const;

const NAV_GROUPS = [
  { id: 'workspace', labelEn: 'Workspace', items: ['dashboard', 'prompts', 'ailab'] as SidebarPage[] },
  { id: 'quality', labelEn: 'Quality', items: ['analytics'] as SidebarPage[] },
  { id: 'system', labelEn: 'System', items: ['settings', 'docs'] as SidebarPage[] },
] as const;

const NAV_ITEMS = SIDEBAR_ITEMS.map((item) => ({
  ...item,
  labelEn: item.label,
  subEn: item.description,
  tagEn: item.badge,
  tagTone: item.badge === 'Live' ? 'live' : item.badge === 'Beta' ? 'beta' : item.badge ? 'ops' : 'neutral',
}));

interface SmartSidebarProps {
  activePage: SidebarPage;
  onPageChange: (page: SidebarPage) => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  pinned?: boolean;
  onPinChange?: (pinned: boolean) => void;
  onCollapsedChange?: (collapsed: boolean) => void;
}

export function SmartSidebar({
  activePage,
  onPageChange,
  mobileOpen = false,
  onMobileClose,
  pinned = false,
  onPinChange,
  onCollapsedChange,
}: SmartSidebarProps) {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const [mobileCollapsed, setMobileCollapsed] = useState(true);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const [width, setWidth] = useState(() => (typeof window !== 'undefined' ? window.innerWidth : 1024));

  const isNarrow = width < 1024;
  const isCollapsed = isNarrow ? mobileCollapsed : desktopCollapsed;

  useEffect(() => {
    const handleResize = () => {
      setWidth(window.innerWidth);
      if (window.innerWidth < 1024 && !pinned) setMobileCollapsed(true);
      else if (window.innerWidth < 1024) setMobileCollapsed(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [pinned]);

  useEffect(() => {
    onCollapsedChange?.(isCollapsed);
  }, [isCollapsed, onCollapsedChange]);

  const handleNavClick = useCallback((page: SidebarPage) => {
    onPageChange(page);
    if (!pinned) onMobileClose?.();
  }, [onPageChange, onMobileClose, pinned]);

  const handlePinClick = useCallback(() => {
    onPinChange?.(!pinned);
    if (!pinned) setMobileCollapsed(false);
  }, [pinned, onPinChange]);

  const toggleDesktopCollapse = useCallback(() => {
    setDesktopCollapsed((current) => !current);
  }, []);

  return (
    <>
      {onMobileClose && (
        <div
          className={cn(
            'modal-overlay fixed inset-0 z-40 transition-opacity duration-300 lg:hidden',
            mobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          )}
          onClick={onMobileClose}
          aria-hidden
        />
      )}
      <motion.aside
        initial={false}
        animate={{ width: isCollapsed ? SIDEBAR_COLLAPSED : SIDEBAR_WIDTH }}
        transition={{ type: 'tween', duration: 0.3, ease: 'easeInOut' }}
        className={cn(
          'fixed left-0 top-0 bottom-0 z-50 flex flex-col bg-[#101826]/88 border-r border-white/10 backdrop-blur-xl shadow-[8px_0_24px_rgba(2,6,23,0.38)]',
          'transform transition-transform duration-300 ease-out lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        style={{ width: isCollapsed ? SIDEBAR_COLLAPSED : SIDEBAR_WIDTH }}
        aria-label="Main navigation"
      >
        <div className={cn('border-b border-white/10 flex-shrink-0', isCollapsed ? 'px-2 pt-5 pb-3' : 'px-5 pt-6 pb-4')}>
          <div className={cn('flex items-start justify-between gap-3', isCollapsed && 'flex-col items-center')}>
            <div className={cn('flex items-center gap-3 min-w-0', isCollapsed && 'flex-col')}>
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#334155] to-[#1e293b] border border-white/[0.12] flex items-center justify-center relative flex-shrink-0">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-white">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
                <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400" />
              </div>
              {!isCollapsed && (
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h1 className="font-sans text-[18px] font-semibold text-white truncate tracking-tight">NeoMagic</h1>
                    <span className="ui-status-pill ready px-2.5 py-1 text-[11px]">Active</span>
                  </div>
                  <p className="font-sans text-[13px] text-slate-200 mt-1">
                    {'Run prompt operations from one focused workspace.'}
                  </p>
                </div>
              )}
            </div>
            <div className={cn('flex items-center gap-1', isCollapsed && 'flex-col')}>
              {onPinChange && (
                <button
                  type="button"
                  onClick={handlePinClick}
                  aria-pressed={pinned}
                  aria-label={pinned ? ('Unpin sidebar') : ('Pin sidebar')}
                  className={cn(
                    'p-2 rounded-xl transition-colors border',
                    pinned ? 'text-cyan-100 bg-cyber-primary/12 border-cyber-primary/30' : 'text-slate-300 hover:text-white hover:bg-white/8 border-white/10'
                  )}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 17v5M9 10.76a2 2 0 0 1-1.11 1.79l-1.78 1.78a2 2 0 0 1-2.83 0l-2.83-2.83a2 2 0 0 1 0-2.83l1.78-1.78A2 2 0 0 1 5 8.24V6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v.24M21 12h-1M12 3v1M22 12l-2 2M3 12l2 2" />
                  </svg>
                </button>
              )}
              <button
                type="button"
                onClick={toggleDesktopCollapse}
                className="hidden lg:block p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/8 border border-white/10 transition-colors"
                aria-label={isCollapsed ? ('Expand sidebar') : ('Collapse sidebar')}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={cn(isCollapsed && 'rotate-180')}>
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
              {onMobileClose && (
                <button
                  type="button"
                  onClick={onMobileClose}
                  className="lg:hidden p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/8 border border-white/10 transition-colors"
                  aria-label={t.ui.sidebarMenuClose}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {!isCollapsed && (
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="ui-mini-stat">
                <p className="font-sans text-[12px] font-semibold text-white">
                  {'Quick access'}
                </p>
                <p className="font-sans text-[12px] text-slate-300 mt-1">
                  {'Use the command palette to jump to screens, commands, and settings.'}
                </p>
                <p className="font-mono text-[11px] text-cyan-100 mt-2">⌘K</p>
              </div>
              <div className="ui-mini-stat">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-sans text-[12px] font-semibold text-white">
                    {'Workspace state'}
                  </p>
                  {profile && (
                    <span
                      className={cn(
                        'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold',
                        profile.plan === 'team'
                          ? 'text-violet-100 bg-violet-500/14 border-violet-400/30'
                          : profile.plan === 'pro'
                            ? 'text-cyan-100 bg-cyan-500/14 border-cyan-400/30'
                            : 'text-slate-200 bg-slate-500/14 border-slate-300/20'
                      )}
                    >
                      {profile.plan === 'team' ? 'Team' : profile.plan === 'pro' ? 'Pro' : 'Free'}
                    </span>
                  )}
                </div>
                <p className="font-sans text-[12px] text-slate-300 mt-1">
                  {'Build, quality, and docs flows are grouped into one cleaner menu.'}
                </p>
              </div>
            </div>
          )}
        </div>

        <nav className="flex-1 px-3 py-4 overflow-y-auto" role="navigation" aria-label="Main navigation">
          {NAV_GROUPS.map((group) => (
            <div key={group.id} className={cn('mb-4', isCollapsed && 'mb-2')}>
              {!isCollapsed && (
                <div className="px-3 mb-2">
                  <p className="font-sans text-[12px] font-semibold text-slate-200">
                    {group.labelEn}
                  </p>
                  <p className="font-sans text-[12px] text-slate-400 mt-0.5">
                    {group.id === 'workspace' && ('Daily working surfaces')}
                    {group.id === 'quality' && ('Measurement, testing, and tools')}
                    {group.id === 'system' && ('Docs and configuration')}
                  </p>
                </div>
              )}
              <ul className={cn('space-y-1', isCollapsed && 'flex flex-col items-center gap-1.5')}>
                {group.items.map((pageId) => {
                  const item = NAV_ITEMS.find((navItem) => navItem.id === pageId);
                  if (!item) return null;

                  const isActive = activePage === item.id;
                  const Icon = item.icon;

                  return (
                    <li key={item.id} className="relative">
                      <button
                        type="button"
                        onClick={() => handleNavClick(item.id)}
                        aria-current={isActive ? 'page' : undefined}
                        className={cn(
                          'w-full flex items-center gap-3 rounded-2xl font-sans text-[14px] transition-all duration-200 text-left group relative outline-none focus-visible:ring-2 focus-visible:ring-cyber-primary',
                          isCollapsed ? 'justify-center p-3' : 'px-4 py-3',
                          isActive
                            ? 'bg-[linear-gradient(180deg,rgba(34,211,238,0.18),rgba(34,211,238,0.1))] text-white border border-cyber-primary/40 shadow-[0_10px_18px_rgba(34,211,238,0.08)]'
                            : 'text-slate-200 hover:text-white hover:bg-white/[0.045] border border-transparent'
                        )}
                      >
                        {isActive && !isCollapsed && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-7 rounded-r bg-cyan-300" />
                        )}
                        <span className={cn('flex-shrink-0 transition-colors', isActive ? 'text-cyan-100' : 'text-slate-400 group-hover:text-slate-200')}>
                          <Icon size={18} />
                        </span>
                        {!isCollapsed && (
                          <span className="flex flex-col items-start min-w-0 flex-1">
                            <span className="flex items-center gap-2 w-full">
                              <span className="truncate font-semibold">{item.labelEn}</span>
                              {item.tagEn && (
                                <span
                                  className={cn(
                                    'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold',
                                    NAV_TAG_STYLES[item.tagTone ?? 'neutral']
                                  )}
                                >
                                  {item.tagEn}
                                </span>
                              )}
                            </span>
                            {item.subEn && (
                              <span className={cn('text-[12px] mt-1 transition-colors', isActive ? 'text-slate-100' : 'text-slate-300 group-hover:text-slate-200')}>
                                {item.subEn}
                              </span>
                            )}
                          </span>
                        )}
                        {isActive && !isCollapsed && <div className="w-2 h-2 rounded-full bg-cyan-200 flex-shrink-0" />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="px-5 pb-4 border-t border-white/10 pt-3 flex-shrink-0">
          {!isCollapsed && (
            <div className="flex items-center justify-between">
              <span className="font-sans text-[12px] text-slate-300">
                v{typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '3.2.0'}
              </span>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="font-sans text-[12px] text-slate-300">{'9 providers ready'}</span>
              </div>
            </div>
          )}
        </div>
      </motion.aside>
    </>
  );
}

export default SmartSidebar;
