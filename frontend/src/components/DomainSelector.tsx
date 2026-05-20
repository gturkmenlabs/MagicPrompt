import React, { useMemo, useState } from 'react';
import { Input } from '@/components/ui';
import { useTranslation } from '../i18n';

interface DomainSelectorProps {
  selectedDomainId: string;
  onSelect: (domainId: string) => void;
}

const DOMAIN_ITEMS = [
  {
    id: 'auto',
    helperTr: 'Let the system decide',
    helperEn: 'Let the system route it',
    iconPath: 'M13 10V3L4 14h7v7l9-11h-7z',
  },
  {
    id: 'frontend',
    helperTr: 'UI, components, experience',
    helperEn: 'UI, components, experience',
    iconPath: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4',
  },
  {
    id: 'backend',
    helperTr: 'API, services, data flow',
    helperEn: 'API, services, data flow',
    iconPath: 'M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01',
  },
  {
    id: 'system-architecture',
    helperTr: 'Architecture and modular structure',
    helperEn: 'Architecture and modular structure',
    iconPath: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10',
  },
  {
    id: 'security',
    helperTr: 'Risk, security, controls',
    helperEn: 'Risk, security, controls',
    iconPath: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
  },
  {
    id: 'devops',
    helperTr: 'CI/CD, infrastructure, operations',
    helperEn: 'CI/CD, infra, operations',
    iconPath: 'M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1',
  },
  {
    id: 'software-engineering',
    helperTr: 'General engineering work',
    helperEn: 'General engineering work',
    iconPath: 'M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  },
  {
    id: 'data-science',
    helperTr: 'Analysis, data, modeling',
    helperEn: 'Analysis, data, modeling',
    iconPath: 'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z',
  },
];

export default function DomainSelector({ selectedDomainId, onSelect }: DomainSelectorProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [showAll, setShowAll] = useState(false);

  const visibleDomains = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const coreDomainIds = ['auto', 'frontend', 'backend', 'security'];

    let items = DOMAIN_ITEMS.filter((domain) => {
      if (!normalizedQuery) return true;
      const label = t.domains[domain.id as keyof typeof t.domains]?.name || domain.id;
      return [label, domain.helperTr, domain.helperEn].some((value) =>
        value.toLowerCase().includes(normalizedQuery)
      );
    });

    if (!normalizedQuery && !showAll) {
      items = items.filter((domain) => coreDomainIds.includes(domain.id) || domain.id === selectedDomainId);
    }

    return items;
  }, [query, selectedDomainId, showAll, t.domains]);

  return (
    <div className="space-y-4">
      <div className="rounded-[18px] border border-white/10 bg-slate-950/42 p-4">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
          <Input
            label={'Search domain'}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={'Frontend, security, data...'}
            aria-label={'Search domain'}
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAll((value) => !value)}
              className="h-11 rounded-[12px] border border-white/12 bg-white/[0.04] px-3 py-2 text-[12px] font-semibold text-slate-200 transition-colors hover:bg-white/[0.08]"
            >
              {showAll
                ? ('Core domains only')
                : ('Show all domains')}
            </button>
            {(query || showAll) && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setShowAll(false);
                }}
                className="h-11 rounded-[12px] border border-white/12 bg-transparent px-3 py-2 text-[12px] font-semibold text-slate-300 transition-colors hover:bg-white/[0.04] hover:text-white"
              >
                {'Reset'}
              </button>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {[
            'Filter or search first',
            'Then choose a domain',
            'Expand all only when needed',
          ].map((item, index) => (
            <span
              key={item}
              className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold ${
                index === 0
                  ? 'border-cyan-300/20 bg-cyan-400/10 text-cyan-100'
                  : 'border-white/10 bg-white/[0.03] text-slate-300'
              }`}
            >
              {item}
            </span>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
      {visibleDomains.map((domain) => {
        const selected = selectedDomainId === domain.id;
        const label = t.domains[domain.id as keyof typeof t.domains]?.name || domain.id;
        return (
          <button
            key={domain.id}
            type="button"
            onClick={() => onSelect(domain.id)}
            className={`rounded-[16px] border p-4 text-left transition-all ${
              selected
                ? 'border-cyan-300/26 bg-cyan-400/10 shadow-[0_14px_24px_rgba(34,211,238,0.08)]'
                : 'border-white/10 bg-slate-950/42 hover:border-white/16 hover:bg-white/[0.04]'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <span className={`inline-flex h-11 w-11 items-center justify-center rounded-[14px] border ${
                selected ? 'border-cyan-300/22 bg-cyan-400/10 text-cyan-100' : 'border-white/10 bg-white/[0.03] text-slate-300'
              }`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d={domain.iconPath} />
                </svg>
              </span>
              {selected && (
                <span className="inline-flex items-center gap-1 rounded-full border border-cyan-300/20 bg-cyan-400/10 px-2 py-1 text-[11px] font-semibold text-cyan-100">
                  {'Selected'}
                </span>
              )}
            </div>

            <p className="mt-4 text-[14px] font-semibold text-white">{label}</p>
            <p className="mt-1 text-[12px] leading-6 text-slate-300">
              {domain.helperEn}
            </p>
          </button>
        );
      })}
      </div>

      {visibleDomains.length === 0 && (
        <div className="rounded-[18px] border border-dashed border-white/12 bg-white/[0.03] p-5 text-[13px] text-slate-300">
          {'No matching domain was found. Broaden the query or reset the filter.'}
        </div>
      )}
    </div>
  );
}
