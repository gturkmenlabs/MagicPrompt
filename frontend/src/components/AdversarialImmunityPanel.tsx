/**
 * AdversarialImmunityPanel — Prompt'un saldiri kategorilerine karsi savunma
 * profilini gosterir. Statik analiz (LLM cagrisi yok).
 *
 * @see services/adversarialImmunity.ts
 */

import { useMemo, useState } from 'react';
import {
  analyzeAdversarialImmunity,
  type AdversarialImmunityResult,
  type CategoryImmunity,
} from '@/services/adversarialImmunity';

interface Props {
  masterPrompt: string;
  language?: 'tr' | 'en';
  /** "Fix" CTA'sinda cagirilir. improvePrompt'a focusCriteria ile yonlendirmek icin. */
  onRequestImprove?: (focusCriteria: string[]) => void;
}

const STATUS_STYLES: Record<CategoryImmunity['status'], { ring: string; bg: string; badge: string; badgeTextTr: string }> = {
  protected:  { ring: 'border-emerald-500/40', bg: 'bg-emerald-500/5',  badge: 'bg-emerald-500/20 text-emerald-200', badgeTextTr: 'Korumali' },
  partial:    { ring: 'border-amber-500/40',   bg: 'bg-amber-500/5',    badge: 'bg-amber-500/20 text-amber-200',     badgeTextTr: 'Kismi' },
  vulnerable: { ring: 'border-rose-500/40',    bg: 'bg-rose-500/5',     badge: 'bg-rose-500/20 text-rose-200',       badgeTextTr: 'Savunmasiz' },
};

const SEVERITY_LABEL_TR: Record<CategoryImmunity['severity'], string> = {
  critical: 'Kritik',
  high: 'Yuksek',
  medium: 'Orta',
};

export default function AdversarialImmunityPanel({ masterPrompt, language = 'tr', onRequestImprove }: Props) {
  const result: AdversarialImmunityResult | null = useMemo(() => {
    const p = (masterPrompt ?? '').trim();
    if (p.length < 20) return null;
    return analyzeAdversarialImmunity(p);
  }, [masterPrompt]);

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggle = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  if (!result) {
    return (
      <div className="glass-card p-4" role="region" aria-label="Saldiri testi">
        <h3 className="text-[15px] font-semibold text-white">Saldiri Testi</h3>
        <p className="text-[12px] text-slate-400 mt-1">
          En az 20 karakter uzunlugunda bir master prompt gerekli.
        </p>
      </div>
    );
  }

  const overallStyle = STATUS_STYLES[result.overallStatus];
  const tr = language === 'tr';

  return (
    <div className="glass-card p-4 space-y-4" role="region" aria-label="Saldiri testi">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[15px] font-semibold text-white">
            {tr ? 'Saldiri Dayaniklilik Taramasi' : 'Adversarial Immunity Scan'}
          </h3>
          <p className="text-[12px] text-slate-400 mt-1">
            {tr
              ? 'Bilinen prompt injection, jailbreak, sistem promptu sizintisi, tool enjeksiyonu ve encoding bypass senaryolarina karsi savunma pattern\'lerini statik analiz eder.'
              : 'Statically checks the prompt for defense patterns against known injection, jailbreak, system prompt leak, tool poisoning, and encoding bypass attacks.'}
          </p>
        </div>
        <div className={`shrink-0 rounded-md border px-3 py-2 text-right ${overallStyle.ring} ${overallStyle.bg}`}>
          <div className="text-[11px] text-slate-400 uppercase tracking-wide">
            {tr ? 'Genel Skor' : 'Overall'}
          </div>
          <div className="text-white font-mono text-xl leading-none mt-1">{result.overallScore}</div>
          <div className={`mt-1 inline-block px-2 py-0.5 rounded text-[11px] font-medium ${overallStyle.badge}`}>
            {tr ? overallStyle.badgeTextTr : result.overallStatus}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-[11px]">
        <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 px-3 py-2">
          <div className="text-slate-400">{tr ? 'Korumali' : 'Protected'}</div>
          <div className="text-emerald-200 font-mono text-lg leading-none mt-1">{result.summary.protected}</div>
        </div>
        <div className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2">
          <div className="text-slate-400">{tr ? 'Kismi' : 'Partial'}</div>
          <div className="text-amber-200 font-mono text-lg leading-none mt-1">{result.summary.partial}</div>
        </div>
        <div className="rounded-md border border-rose-500/30 bg-rose-500/5 px-3 py-2">
          <div className="text-slate-400">{tr ? 'Savunmasiz' : 'Vulnerable'}</div>
          <div className="text-rose-200 font-mono text-lg leading-none mt-1">{result.summary.vulnerable}</div>
        </div>
      </div>

      <div className="space-y-2">
        {result.categories.map(cat => {
          const st = STATUS_STYLES[cat.status];
          const open = expanded.has(cat.category);
          return (
            <div
              key={cat.category}
              className={`rounded-md border p-3 text-[12px] ${st.ring} ${st.bg}`}
            >
              <button
                type="button"
                onClick={() => toggle(cat.category)}
                className="w-full flex items-center gap-3 text-left"
              >
                <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${st.badge}`}>
                  {tr ? st.badgeTextTr : cat.status}
                </span>
                <span className="text-white font-medium">{tr ? cat.labelTr : cat.label}</span>
                <span className="text-slate-500 text-[11px]">·</span>
                <span className="text-slate-400">{tr ? SEVERITY_LABEL_TR[cat.severity] : cat.severity}</span>
                <span className="ml-auto font-mono text-slate-200">{cat.score}/100</span>
                <span className="text-slate-500 text-[11px]">{open ? '▲' : '▼'}</span>
              </button>

              {open && (
                <div className="mt-3 space-y-3">
                  {cat.detectedDefenses.length > 0 && (
                    <div>
                      <div className="text-[11px] uppercase tracking-wide text-emerald-300 mb-1">
                        {tr ? 'Tespit Edilen Savunmalar' : 'Detected Defenses'}
                      </div>
                      <ul className="space-y-1">
                        {cat.detectedDefenses.map(d => (
                          <li key={d.id} className="flex items-start gap-2">
                            <span className="text-emerald-400 mt-0.5">✓</span>
                            <div className="flex-1 min-w-0">
                              <div className="text-slate-200">{tr ? d.labelTr : d.label}</div>
                              {d.excerpt && (
                                <div className="mt-0.5 text-[11px] text-slate-500 font-mono truncate">
                                  "{d.excerpt}"
                                </div>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {cat.missingDefenses.length > 0 && (
                    <div>
                      <div className="text-[11px] uppercase tracking-wide text-rose-300 mb-1">
                        {tr ? 'Eksik Savunmalar' : 'Missing Defenses'}
                      </div>
                      <ul className="space-y-1">
                        {cat.missingDefenses.map(d => (
                          <li key={d.id} className="flex items-start gap-2">
                            <span className="text-rose-400 mt-0.5">✗</span>
                            <span className="text-slate-300">{tr ? d.labelTr : d.label}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {cat.missingDefenses.length > 0 && (
                    <p className="text-slate-400 italic">
                      {tr ? cat.recommendationTr : cat.recommendation}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {onRequestImprove && result.overallStatus !== 'protected' && (
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => onRequestImprove(result.suggestedFocusCriteria.length > 0 ? result.suggestedFocusCriteria : ['security'])}
            className="px-3 py-1.5 rounded-md bg-cyber-primary text-white text-sm hover:brightness-110 transition"
          >
            {tr ? 'Eksik savunmalari ekle (Iyilestirici)' : 'Add missing defenses (Improver)'}
          </button>
          <span className="text-[11px] text-slate-500">
            {tr
              ? 'Iyilestirici kapali dongu ile security kriterine odaklanacak.'
              : 'Improver will focus the closed-loop on the security criterion.'}
          </span>
        </div>
      )}
    </div>
  );
}
