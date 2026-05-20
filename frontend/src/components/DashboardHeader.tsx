import React, { useState, useEffect } from 'react';
import { useTranslation } from '../i18n';
import { useAuth } from '@/contexts/AuthContext';

interface DashboardHeaderProps {
  systemActive: boolean;
  loading: boolean;
  focusMode?: boolean;
  onToggleFocusMode?: () => void;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  systemActive,
  loading,
  focusMode = false,
  onToggleFocusMode,
}) => {
  const { language, toggleLanguage } = useTranslation();
  const { profile, signOut } = useAuth();
  const [neonMode, setNeonMode] = useState(true);

  useEffect(() => {
    document.body.classList.toggle('neon-off', !neonMode);
  }, [neonMode]);

  const status = loading
    ? { labelTr: 'Isleniyor', labelEn: 'Running', tone: 'running' }
    : systemActive
      ? { labelTr: 'ready', labelEn: 'Ready', tone: 'ready' }
      : { labelTr: 'Beklemede', labelEn: 'Standby', tone: 'standby' };

  return (
    <header className="w-full">
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(260px,1.05fr)_minmax(360px,1.6fr)_minmax(320px,1.15fr)] gap-3 w-full">
        <section className="ui-card min-h-[88px] px-4 py-4 flex items-start gap-3 min-w-0">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#334155] to-[#1e293b] border border-white/15 flex items-center justify-center flex-shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="text-slate-100">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="font-sans text-[18px] font-semibold text-white truncate tracking-tight">NeoMagic Workspace</h2>
                <p className="font-sans text-[13px] text-slate-200 mt-1">
                  {'Active workflow, generation, and quality status'}
                </p>
              </div>
              <span className={`ui-status-pill ${status.tone}`}>
                {status.labelEn}
              </span>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              <span className="ui-chip">
                {'Main console'}
              </span>
              <span className="ui-chip">
                {'Single entry point'}
              </span>
            </div>
          </div>
        </section>

        <section className="ui-card min-h-[88px] px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="ui-label mb-1">{'Global search'}</p>
              <p className="ui-helper">
                {'Search screens, commands, domains, tools, or settings. Example: optimizer, testing, frontend, quality.'}
              </p>
            </div>
            <span className="ui-chip text-[11px]">⌘K</span>
          </div>
          <div className="relative mt-3">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder={'Example: AI Lab, template market, regression, OpenRouter...'}
              className="ui-input pl-11 pr-24"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-slate-400">
              {'Quick jump'}
            </span>
          </div>
        </section>

        <section className="ui-card min-h-[88px] px-4 py-4">
          <div className="grid grid-cols-1 md:grid-cols-[auto_auto_minmax(120px,1fr)] gap-3 h-full">
            <div className="ui-mini-stat flex flex-col justify-between">
              <div>
                <p className="ui-toolbar-title">{'Language'}</p>
                <p className="ui-toolbar-meta mt-1">
                  {'Switch the interface language.'}
                </p>
              </div>
              <button
                type="button"
                onClick={toggleLanguage}
                aria-label={'Turkce\'ye gec'}
                className="ui-btn-secondary mt-3 py-2 px-3 text-[12px]"
              >
                {'Turkce'}
              </button>
            </div>

            <div className="ui-mini-stat flex flex-col justify-between">
              <div>
                <p className="ui-toolbar-title">{'View'}</p>
                <p className="ui-toolbar-meta mt-1">
                  {'Adjust glow and focus behavior.'}
                </p>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => setNeonMode(!neonMode)}
                  className="ui-btn-secondary py-2 px-3 text-[12px]"
                  aria-label={neonMode ? 'Neon glow acik' : 'Neon glow kapali'}
                >
                  {neonMode ? ('Glow on') : ('Glow off')}
                </button>
                {onToggleFocusMode && (
                  <button
                    type="button"
                    onClick={onToggleFocusMode}
                    aria-pressed={focusMode}
                    className={`ui-btn-secondary py-2 px-3 text-[12px] ${focusMode ? 'border-cyber-primary/40 text-cyan-100 bg-cyber-primary/10' : ''}`}
                  >
                    {focusMode ? ('Focus on') : ('Focus mode')}
                  </button>
                )}
              </div>
            </div>

            <div className="ui-mini-stat flex flex-col justify-between min-w-0">
              <div>
                <p className="ui-toolbar-title">{'Account'}</p>
                <p className="ui-toolbar-meta mt-1">
                  {profile?.email
                    ? (`Active user: ${profile.email.split('@')[0]}`)
                    : ('No session details available.')}
                </p>
              </div>
              {profile && (
                <button
                  type="button"
                  onClick={signOut}
                  className="ui-btn-secondary mt-3 py-2 px-3 text-[12px] flex items-center justify-between gap-3"
                  aria-label="User menu"
                >
                  <span className="truncate">{profile.email?.split('@')[0] ?? 'User'}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold border ${profile.plan === 'pro' || profile.plan === 'team' ? 'text-cyan-100 border-cyan-400/30 bg-cyan-500/14' : 'text-slate-200 border-slate-300/20 bg-slate-500/12'}`}>
                    {profile.plan === 'team' ? 'Team' : profile.plan === 'pro' ? 'Pro' : 'Free'}
                  </span>
                </button>
              )}
            </div>
          </div>
        </section>
      </div>
    </header>
  );
};

export default DashboardHeader;
