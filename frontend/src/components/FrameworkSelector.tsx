import React, { useState, useMemo } from 'react';
import { Framework } from '@/types';
import { FRAMEWORK_META } from '@/data';
import { useTranslation } from '../i18n';

interface FrameworkSelectorProps {
  selected: Framework;
  onSelect: (fw: Framework) => void;
}

const FRAMEWORK_CATEGORIES: Record<string, { labelTr: string; labelEn: string; items: Framework[] }> = {
  popular: {
    labelTr: 'Populer',
    labelEn: 'Popular',
    items: [Framework.AUTO, Framework.KERNEL, Framework.RISEN, Framework.RTF, Framework.BAB, Framework.TAG, Framework.COSTAR, Framework.CARE],
  },
  reasoning: {
    labelTr: 'Muhakeme & Dusunme',
    labelEn: 'Reasoning & Thinking',
    items: [Framework.CHAIN, Framework.TREE, Framework.STEPBACK, Framework.FIRST_PRINCIPLES, Framework.BAYESIAN, Framework.DIALECTIC, Framework.ANALOGICAL, Framework.SOCRATIC, Framework.LATERAL],
  },
  agent: {
    labelTr: 'Ajan & Otomasyon',
    labelEn: 'Agent & Automation',
    items: [Framework.REACT, Framework.REWOO, Framework.DSP, Framework.SELFREFINE, Framework.CRITIC, Framework.META_PROMPT, Framework.OODA],
  },
  strategy: {
    labelTr: 'Strateji & Analysis',
    labelEn: 'Strategy & Analysis',
    items: [Framework.SWOT, Framework.PESTEL, Framework.PORTER, Framework.SCENARIO, Framework.GAME_THEORY, Framework.PREMORTEM, Framework.FUTURES_WHEEL, Framework.BACKCASTING, Framework.REDTEAM],
  },
  innovation: {
    labelTr: 'Inovasyon & Yaraticilik',
    labelEn: 'Innovation & Creativity',
    items: [Framework.SCAMPER, Framework.TRIZ, Framework.DESIGN_THINKING, Framework.MIND_MAP, Framework.MORPHOLOGICAL, Framework.INVERSION, Framework.SIX_HATS],
  },
  management: {
    labelTr: 'Yonetim & Onceliklendirme',
    labelEn: 'Management & Prioritization',
    items: [Framework.AGILE, Framework.LEAN, Framework.PDCA, Framework.MOSCOW, Framework.KANO, Framework.OKR, Framework.RAPID, Framework.SMART, Framework.STAR, Framework.JTBD, Framework.HYPOTHESIS],
  },
  analysis: {
    labelTr: 'Yapisal Analysis',
    labelEn: 'Structural Analysis',
    items: [Framework.MECE, Framework.FIVEWHYS, Framework.CATWOE, Framework.DECISION_MATRIX, Framework.DELPHI, Framework.SYSTEMS_THINKING],
  },
};

const FrameworkSelector: React.FC<FrameworkSelectorProps> = ({ selected, onSelect }) => {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [expandedCat, setExpandedCat] = useState<string | null>('popular');
  const [viewMode, setViewMode] = useState<'category' | 'grid'>('category');

  const allFrameworks = Object.keys(FRAMEWORK_META) as Framework[];
  const frameworkSearchIndex = useMemo(() => (
    allFrameworks.map((fw) => {
      const text = t.frameworks[fw];
      const meta = FRAMEWORK_META[fw];
      return {
        fw,
        haystack: [
          fw,
          text?.name,
          text?.description,
          text?.focus,
          meta?.icon,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase(),
      };
    })
  ), [allFrameworks, t]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return null;
    return frameworkSearchIndex
      .filter((item) => item.haystack.includes(q))
      .map((item) => item.fw);
  }, [search, frameworkSearchIndex]);

  const renderFrameworkItem = (fwId: Framework, compact = false) => {
    const isSelected = selected === fwId;
    const text = t.frameworks[fwId];
    const meta = FRAMEWORK_META[fwId];
    if (!text || !meta) return null;

    if (compact) {
      return (
        <button
          key={fwId}
          type="button"
          onClick={() => onSelect(fwId)}
          title={`${text.name}: ${text.description}`}
          className={`
            flex flex-col items-center gap-1 p-2 rounded-lg border transition-all duration-200 min-w-[80px]
            ${isSelected
              ? 'border-cyber-primary/50 bg-cyber-primary/10 shadow-[0_0_10px_rgba(6,232,249,0.08)]'
              : 'border-transparent hover:border-glass-border hover:bg-white/[0.02]'
            }
          `}
        >
          <span className="text-lg">{meta.icon}</span>
          <span className={`font-mono text-[8px] font-bold uppercase tracking-wider text-center leading-tight ${isSelected ? 'text-cyber-primary' : 'text-gray-500'}`}>
            {text.name.length > 12 ? text.name.slice(0, 10) + '..' : text.name}
          </span>
        </button>
      );
    }

    return (
      <button
        key={fwId}
        type="button"
        onClick={() => onSelect(fwId)}
        aria-pressed={isSelected}
        className={`
          w-full flex items-start gap-2.5 px-3 py-2 rounded-lg text-left transition-all duration-200
          ${isSelected
            ? 'bg-cyber-primary/5 border border-cyber-primary/30'
            : 'border border-transparent hover:bg-white/[0.02]'
          }
        `}
      >
        <span className="text-base mt-0.5 shrink-0">{meta?.icon || '⚡'}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`font-mono text-[10px] font-bold uppercase tracking-wider ${isSelected ? 'text-cyber-primary' : 'text-gray-400'}`}>
              {text.name}
            </span>
            {isSelected && (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#06e8f9" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </div>
          <p className={`text-[9px] font-mono mt-0.5 leading-relaxed truncate ${isSelected ? 'text-gray-400' : 'text-gray-600'}`}>
            {text.focus}
          </p>
        </div>
      </button>
    );
  };

  return (
    <div className="glass-card p-4 space-y-3 min-h-[440px]">
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-cyber-primary/85">
              {'Strategic framework'}
            </p>
            <p className="mt-2 text-[13px] leading-6 text-slate-300">
              {'Choose how the prompt should be structured and which reasoning pattern it should use.'}
            </p>
          </div>
          <div className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-slate-300">
            {allFrameworks.length} {'frameworks'}
          </div>
        </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={'Search frameworks...'}
            className="w-full min-h-[48px] pl-10 pr-3 py-2.5 bg-cyber-dark/60 border border-glass-border rounded-xl text-[11px] font-mono text-gray-300 placeholder-gray-600 focus:outline-none focus:border-cyber-primary/40"
          />
        </div>
        <div className="flex gap-0.5 bg-cyber-dark/40 rounded-xl p-0.5">
          <button
            onClick={() => setViewMode('category')}
            className={`min-h-[48px] px-3.5 py-1 rounded-lg text-[10px] font-mono transition-colors ${viewMode === 'category' ? 'bg-cyber-primary/20 text-cyber-primary' : 'text-gray-500 hover:text-gray-400'}`}
          >
            {'Category'}
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`min-h-[48px] px-3.5 py-1 rounded-lg text-[10px] font-mono transition-colors ${viewMode === 'grid' ? 'bg-cyber-primary/20 text-cyber-primary' : 'text-gray-500 hover:text-gray-400'}`}
          >
            Grid
          </button>
        </div>
      </div>
      </div>

      {selected !== Framework.AUTO && FRAMEWORK_META[selected] && t.frameworks[selected] && (
        <div className="flex items-center gap-3 rounded-[16px] border border-cyber-primary/20 bg-cyber-primary/5 px-3 py-3">
          <span className="text-lg">{FRAMEWORK_META[selected].icon}</span>
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[11px] font-bold text-cyber-primary">{t.frameworks[selected].name}</p>
            <p className="mt-1 font-mono text-[10px] text-gray-500">{t.frameworks[selected].focus}</p>
          </div>
        </div>
      )}

      <div className="max-h-[420px] overflow-y-auto space-y-1.5 scrollbar-thin pr-1">
        {filtered ? (
          filtered.length === 0 ? (
            <p className="text-center text-gray-600 font-mono text-[10px] py-4">
              {'No results found'}
            </p>
          ) : viewMode === 'grid' ? (
            <div className="flex flex-wrap gap-2">
              {filtered.map((fw) => renderFrameworkItem(fw, true))}
            </div>
          ) : (
            filtered.map((fw) => renderFrameworkItem(fw))
          )
        ) : viewMode === 'grid' ? (
          Object.entries(FRAMEWORK_CATEGORIES).map(([catId, cat]) => (
            <div key={catId} className="mb-3 space-y-2">
              <p className="font-display font-mono text-[10px] text-gray-500 uppercase tracking-widest px-1">
                {cat.labelEn}
              </p>
              <div className="flex flex-wrap gap-2">
                {cat.items.map((fw) => renderFrameworkItem(fw, true))}
              </div>
            </div>
          ))
        ) : (
          Object.entries(FRAMEWORK_CATEGORIES).map(([catId, cat]) => (
            <div key={catId}>
              <button
                onClick={() => setExpandedCat(expandedCat === catId ? null : catId)}
                className="w-full min-h-[48px] flex items-center gap-2 px-3 py-2 hover:bg-white/[0.02] rounded-xl transition-colors"
              >
                <svg
                  className={`w-3 h-3 text-gray-500 transition-transform ${expandedCat === catId ? 'rotate-90' : ''}`}
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
                <span className="font-display font-mono text-[11px] text-gray-400 uppercase tracking-wider">
                  {cat.labelEn}
                </span>
                <span className="font-mono text-[10px] text-gray-600">{cat.items.length}</span>
              </button>
              {expandedCat === catId && (
                <div className="ml-2 space-y-1">
                  {cat.items.map((fw) => renderFrameworkItem(fw))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default FrameworkSelector;
