/**
 * PromptImprovePanel — Kapali dongu prompt iyilestirme UI.
 *
 * POST /v1/prompt/improve cagirir ve iterasyon izini (trace) gosterir.
 * Her adimda: before→after skor, zayif kriter, per-criterion delta bar,
 * kabul/red nedeni. Kullanici final prompt'u Apply edebilir.
 *
 * @see services/promptImprover.ts — ImproveResult sekli
 * @see server/routes/promptImprove.ts — endpoint
 */

import { useCallback, useMemo, useState } from 'react';
import { API_BASE, getAuthHeaders } from '@/services/apiClient';

// ─── Tipler (server ile uyumlu, drop-in kopya) ──────────────────────────────

interface PairwiseCriterion {
  criterionId: string;
  scoreA: number;
  scoreB: number;
  delta: number;
  winner: 'a' | 'b' | 'tie';
}

interface PairwiseVerdict {
  winner: 'a' | 'b' | 'tie';
  margin: number;
  totalA: number;
  totalB: number;
  perCriterion: PairwiseCriterion[];
  aWinsOn: string[];
  bWinsOn: string[];
  weakestCriterionForA: string | null;
  summary: string;
  summaryTr: string;
}

interface ImproveStep {
  iteration: number;
  before: { score: number; tokens: number };
  after: { score: number; tokens: number };
  weakness: {
    criterionId: string;
    label: string;
    labelTr: string;
    score: number;
    summary: string;
    summaryTr: string;
  };
  mutatedPrompt: string;
  verdict: PairwiseVerdict;
  kept: boolean;
  reason: string;
  reasonTr: string;
  perCriterionDelta: Record<string, number>;
}

interface ImproveResult {
  initialPrompt: string;
  finalPrompt: string;
  initialScore: number;
  finalScore: number;
  initialTokens: number;
  finalTokens: number;
  iterations: ImproveStep[];
  stopReason: 'goal-reached' | 'plateau' | 'max-iterations' | 'token-budget' | 'mutator-error';
  stopReasonTr: string;
  netGain: number;
  llmSecondOpinion?: PairwiseVerdict | null;
}

// ─── Tasarim yardimcilari ───────────────────────────────────────────────────

const STOP_LABELS_TR: Record<ImproveResult['stopReason'], string> = {
  'goal-reached': 'Hedef karsilandi',
  'plateau': 'Plateau',
  'max-iterations': 'Iterasyon limiti',
  'token-budget': 'Token butcesi',
  'mutator-error': 'Mutator hatasi',
};

function tone(d: number): string {
  if (d > 2) return 'text-emerald-400';
  if (d < -2) return 'text-rose-400';
  return 'text-slate-400';
}

function bar(delta: number): { width: string; color: string } {
  const abs = Math.min(40, Math.abs(delta));
  const width = `${(abs / 40) * 100}%`;
  const color = delta > 2 ? 'bg-emerald-500' : delta < -2 ? 'bg-rose-500' : 'bg-slate-500';
  return { width, color };
}

// ─── API cagrisi ────────────────────────────────────────────────────────────

interface CallOpts {
  masterPrompt: string;
  minScore: number;
  maxTokens?: number;
  focusCriteria?: string[];
  domainId?: string;
  framework?: string;
  maxIterations: number;
  language: 'tr' | 'en';
  useLlmJudge: boolean;
}

async function callImprove(opts: CallOpts): Promise<ImproveResult> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/prompt/improve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({
      masterPrompt: opts.masterPrompt,
      goals: {
        minScore: opts.minScore,
        maxTokens: opts.maxTokens,
        focusCriteria: opts.focusCriteria,
        domainId: opts.domainId,
        framework: opts.framework,
      },
      options: {
        maxIterations: opts.maxIterations,
        language: opts.language,
      },
      useLlmJudge: opts.useLlmJudge,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`improve ${res.status}: ${body.slice(0, 200)}`);
  }
  return (await res.json()) as ImproveResult;
}

// ─── Component ──────────────────────────────────────────────────────────────

interface Props {
  masterPrompt: string;
  domainId?: string;
  framework?: string;
  language?: 'tr' | 'en';
  onApply?: (improved: string) => void;
}

const CRITERIA = [
  { id: 'clarity', labelTr: 'Netlik' },
  { id: 'testability', labelTr: 'Test Edilebilirlik' },
  { id: 'constraint_compliance', labelTr: 'Kisit Uyumu' },
  { id: 'security', labelTr: 'Guvenlik' },
  { id: 'reproducibility', labelTr: 'Tekrar Uretilebilirlik' },
];

export default function PromptImprovePanel({
  masterPrompt,
  domainId,
  framework,
  language = 'tr',
  onApply,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImproveResult | null>(null);
  const [minScore, setMinScore] = useState(80);
  const [maxIterations, setMaxIterations] = useState(5);
  const [maxTokens, setMaxTokens] = useState<number | ''>('');
  const [focusCriteria, setFocusCriteria] = useState<string[]>([]);
  const [useLlmJudge, setUseLlmJudge] = useState(false);
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());

  const canRun = masterPrompt.trim().length >= 10 && !loading;

  const run = useCallback(async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await callImprove({
        masterPrompt,
        minScore,
        maxTokens: typeof maxTokens === 'number' ? maxTokens : undefined,
        focusCriteria: focusCriteria.length > 0 ? focusCriteria : undefined,
        domainId,
        framework,
        maxIterations,
        language,
        useLlmJudge,
      });
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [masterPrompt, minScore, maxTokens, focusCriteria, domainId, framework, maxIterations, language, useLlmJudge]);

  const toggleCriterion = (id: string) => {
    setFocusCriteria(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleStep = (i: number) => {
    setExpandedSteps(prev => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  };

  const totalDelta = useMemo(() => result ? result.finalScore - result.initialScore : 0, [result]);

  return (
    <div className="glass-card p-4 space-y-4" role="region" aria-label="Prompt iyilestirici">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[15px] font-semibold text-white">Prompt Iyilestirici</h3>
          <p className="text-[12px] text-slate-400 mt-1">
            Kapali dongu: zayiflik tespiti → LLM mutasyonu → pairwise judge → sampiyonu guncelle.
          </p>
        </div>
        <button
          type="button"
          onClick={run}
          disabled={!canRun}
          className="px-4 py-2 rounded-md bg-cyber-primary text-white text-sm font-medium disabled:opacity-40 hover:brightness-110 transition"
        >
          {loading ? 'Iyilestiriyor…' : 'Iyilestir'}
        </button>
      </div>

      {/* Ayarlar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[12px]">
        <label className="flex flex-col gap-1">
          <span className="text-slate-400">Hedef skor</span>
          <input
            type="number"
            min={50}
            max={100}
            value={minScore}
            onChange={e => setMinScore(Math.max(50, Math.min(100, parseInt(e.target.value || '80', 10))))}
            className="px-2 py-1 rounded bg-cyber-dark/50 border border-white/10 text-white"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-slate-400">Max iterasyon</span>
          <input
            type="number"
            min={1}
            max={10}
            value={maxIterations}
            onChange={e => setMaxIterations(Math.max(1, Math.min(10, parseInt(e.target.value || '5', 10))))}
            className="px-2 py-1 rounded bg-cyber-dark/50 border border-white/10 text-white"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-slate-400">Max token (opsiyonel)</span>
          <input
            type="number"
            min={0}
            placeholder="—"
            value={maxTokens}
            onChange={e => {
              const v = e.target.value;
              setMaxTokens(v === '' ? '' : Math.max(0, parseInt(v, 10) || 0));
            }}
            className="px-2 py-1 rounded bg-cyber-dark/50 border border-white/10 text-white"
          />
        </label>
        <label className="flex items-center gap-2 mt-4">
          <input
            type="checkbox"
            checked={useLlmJudge}
            onChange={e => setUseLlmJudge(e.target.checked)}
            className="accent-cyber-primary"
          />
          <span className="text-slate-300">LLM ikinci goruscu</span>
        </label>
      </div>

      {/* Odak kriterleri */}
      <div className="flex flex-wrap items-center gap-2 text-[12px]">
        <span className="text-slate-400">Odak:</span>
        {CRITERIA.map(c => (
          <button
            key={c.id}
            type="button"
            onClick={() => toggleCriterion(c.id)}
            className={`px-2 py-1 rounded-full border transition ${
              focusCriteria.includes(c.id)
                ? 'bg-cyber-primary/20 border-cyber-primary text-white'
                : 'bg-transparent border-white/10 text-slate-400 hover:border-white/30'
            }`}
          >
            {c.labelTr}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-md border border-rose-500/40 bg-rose-500/10 p-3 text-[13px] text-rose-200">
          {error}
        </div>
      )}

      {/* Sonuc ozeti */}
      {result && (
        <div className="space-y-3">
          <div className="rounded-md border border-white/10 bg-cyber-dark/40 p-3 text-[13px]">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-slate-400">Skor:</span>
              <span className="text-white font-mono">{result.initialScore}</span>
              <span className="text-slate-500">→</span>
              <span className="text-white font-mono font-semibold">{result.finalScore}</span>
              <span className={`font-mono ${tone(totalDelta)}`}>
                ({totalDelta >= 0 ? '+' : ''}{totalDelta})
              </span>
              <span className="ml-4 text-slate-400">Token:</span>
              <span className="font-mono text-slate-200">{result.initialTokens} → {result.finalTokens}</span>
              <span className="ml-auto px-2 py-0.5 rounded bg-white/10 text-[11px] text-slate-200">
                {STOP_LABELS_TR[result.stopReason]} · {result.iterations.length} it.
              </span>
            </div>
            {result.llmSecondOpinion && (
              <div className="mt-2 text-[12px] text-slate-400">
                LLM ikinci goruscu: <span className="text-slate-200">{result.llmSecondOpinion.summaryTr}</span>
              </div>
            )}
          </div>

          {/* Iterasyon izi */}
          <div className="space-y-2">
            {result.iterations.map((step, idx) => {
              const delta = step.after.score - step.before.score;
              const expanded = expandedSteps.has(idx);
              return (
                <div
                  key={idx}
                  className={`rounded-md border p-3 text-[12px] ${
                    step.kept ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-white/10 bg-cyber-dark/30'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleStep(idx)}
                    className="w-full flex items-center gap-3 text-left"
                  >
                    <span className="font-mono text-slate-400 w-8">#{step.iteration}</span>
                    <span className={`font-mono w-16 ${tone(delta)}`}>
                      {step.before.score}→{step.after.score} ({delta >= 0 ? '+' : ''}{delta})
                    </span>
                    <span className="text-slate-300">
                      Zayiflik: <span className="text-white">{step.weakness.labelTr}</span> ({step.weakness.score}/100)
                    </span>
                    <span className={`ml-auto px-2 py-0.5 rounded text-[11px] font-medium ${
                      step.kept ? 'bg-emerald-500/20 text-emerald-200' : 'bg-slate-500/20 text-slate-300'
                    }`}>
                      {step.kept ? 'Kabul' : 'Reddedildi'}
                    </span>
                    <span className="text-slate-500 text-[11px]">{expanded ? '▲' : '▼'}</span>
                  </button>

                  {expanded && (
                    <div className="mt-3 space-y-2">
                      {/* Per-criterion delta bars */}
                      <div className="space-y-1.5">
                        {Object.entries(step.perCriterionDelta).map(([cid, d]) => {
                          const { width, color } = bar(d);
                          const label = CRITERIA.find(c => c.id === cid)?.labelTr ?? cid;
                          return (
                            <div key={cid} className="flex items-center gap-2">
                              <span className="w-28 text-slate-400">{label}</span>
                              <div className="flex-1 h-1.5 rounded bg-white/5 relative overflow-hidden">
                                <div
                                  className={`absolute top-0 h-full ${color} ${
                                    d >= 0 ? 'left-1/2' : 'right-1/2'
                                  }`}
                                  style={{ width }}
                                />
                                <div className="absolute top-0 bottom-0 left-1/2 w-px bg-white/20" />
                              </div>
                              <span className={`font-mono w-10 text-right ${tone(d)}`}>
                                {d >= 0 ? '+' : ''}{d}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      {/* Reason */}
                      <p className="text-slate-400 italic">{step.reasonTr}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Apply */}
          {result.finalPrompt !== result.initialPrompt && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onApply?.(result.finalPrompt)}
                disabled={!onApply}
                className="px-3 py-1.5 rounded-md bg-cyber-primary text-white text-sm disabled:opacity-40"
              >
                Iyilestirilmis prompt'u uygula
              </button>
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(result.finalPrompt)}
                className="px-3 py-1.5 rounded-md bg-white/10 text-white text-sm hover:bg-white/20"
              >
                Kopyala
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
