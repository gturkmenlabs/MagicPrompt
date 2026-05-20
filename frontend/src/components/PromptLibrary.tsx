/**
 * Prompt Library — Vault-style archive UI.
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from '../i18n';
import { getAuthHeaders, API_BASE, type StoredPromptItem } from '@/services/apiClient';

const PAGE_SIZE = 20;

interface Props {
  onUsePrompt?: (prompt: StoredPromptItem) => void;
}

interface LangExtractResponse {
  enabled: boolean;
  model: string;
  keywords: string[];
  summary: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const PROVIDER_COLORS: Record<string, string> = {
  openai: '#06e8f9', anthropic: '#d97706', google: '#22c55e',
  perplexity: '#a855f7', xai: '#f59e0b', cursor: '#3b82f6',
  windsurf: '#06b6d4', devin: '#ec4899', replit: '#f97316',
  lovable: '#e11d48', manus: '#8b5cf6', default: '#6b7280',
};

function providerColor(name: string): string {
  const key = (name || '').toLowerCase().split(' ')[0] || 'default';
  const resolved = PROVIDER_COLORS[key as keyof typeof PROVIDER_COLORS];
  return typeof resolved === 'string' ? resolved : '#6b7280';
}

function sourceLabel(prompt: StoredPromptItem): string {
  const pm = prompt.meta as Record<string,any>;
  if (pm?.platform) return String(pm.platform);
  if (prompt.id.startsWith('spl-')) return 'Leaks';
  if (prompt.id.startsWith('spat-')) return 'AI Tools';
  if (prompt.id.startsWith('awesome-')) return 'Awesome';
  if (prompt.id.startsWith('gen-')) return 'Generated';
  if (pm?.source) return String(pm.source).split('/').pop() || 'Custom';
  return 'Custom';
}

function sourceDot(prompt: StoredPromptItem): string {
  const l = sourceLabel(prompt).toLowerCase();
  if (l.includes('github')) return '#f0f6fc';
  if (l.includes('reddit')) return '#ff4500';
  if (l.includes('stack')) return '#f48024';
  if (l.includes('leaks')) return '#ff003c';
  if (prompt.id.startsWith('spat-')) return '#9d00ff';
  return '#06e8f9';
}

function trunc(t: string, n: number): string {
  return t.length > n ? t.slice(0, n) + '…' : t;
}

function detectPromptLanguage(prompt: StoredPromptItem): 'tr' | 'en' | 'mixed' {
  const metaLanguage = String((prompt.meta as Record<string, unknown> | undefined)?.language ?? '').toLowerCase();
  if (metaLanguage.startsWith('tr')) return 'tr';
  if (metaLanguage.startsWith('en')) return 'en';

  const text = `${prompt.name ?? ''} ${prompt.masterPrompt}`.toLowerCase();
  const hasTurkishChars = /[cgiosu]/.test(text);
  const turkishHits = (text.match(/\b(ve|for|for|bir|olan|ile|user|task|task|system)\b/g) || []).length + (hasTurkishChars ? 2 : 0);
  const englishHits = (text.match(/\b(the|with|for|user|system|task|prompt|workflow|generate)\b/g) || []).length;

  if (turkishHits > 0 && englishHits > 0) return 'mixed';
  if (turkishHits > 0) return 'tr';
  return 'en';
}

// ── Detail Panel ─────────────────────────────────────────────────────────────
function DetailPanel({ prompt, onClose, onUsePrompt, tr }: {
  prompt: StoredPromptItem;
  onClose: () => void;
  onUsePrompt?: (p: StoredPromptItem) => void;
  tr: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<LangExtractResponse | null>(null);
  const [analysisErr, setAnalysisErr] = useState('');
  const meta = prompt.meta as Record<string, string> | undefined;
  const color = providerColor(meta?.provider ?? '');
  const promptLanguage = detectPromptLanguage(prompt);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(prompt.masterPrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setAnalysisErr('');
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_BASE}/langextract/analyze`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: prompt.masterPrompt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setAnalysis({
        enabled: Boolean(data.enabled),
        model: String(data.model || ''),
        keywords: Array.isArray(data.keywords) ? data.keywords : [],
        summary: String(data.summary || ''),
      });
    } catch (e: unknown) {
      setAnalysisErr(e instanceof Error ? e.message : 'Error');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between px-5 pt-5 pb-4 border-b border-white/5 flex-shrink-0">
        <div className="flex-1 min-w-0 pr-3">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: sourceDot(prompt) }} />
            <span className="font-sans text-[11px] font-semibold" style={{ color: sourceDot(prompt) }}>
              {sourceLabel(prompt)}
            </span>
            {meta?.provider && (
              <span className="ui-chip text-[11px]" style={{ color, background: color + '18', border: `1px solid ${color}30` }}>
                {meta.provider}
              </span>
            )}
            <span className="ui-chip text-[11px]">
              {promptLanguage === 'tr' ? 'TR' : promptLanguage === 'mixed' ? 'TR + EN' : 'EN'}
            </span>
            {meta?.category && (
              <span className="ui-chip text-[11px] bg-white/10 text-white">
                {String(meta.category)}
              </span>
            )}
          </div>
          <h2 className="font-sans text-[18px] font-semibold text-white leading-snug">{prompt.name || 'Untitled'}</h2>
          <p className="ui-helper mt-2">
            Detailed prompt preview, source notes, and quick actions.
          </p>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg text-gray-600 hover:text-white hover:bg-white/5 transition-colors flex-shrink-0 mt-0.5">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="ui-preview-surface">
            <p className="text-[12px] font-semibold text-white">Source</p>
            <p className="ui-helper mt-1">{sourceLabel(prompt)}</p>
          </div>
          <div className="ui-preview-surface">
            <p className="text-[12px] font-semibold text-white">Language</p>
            <p className="ui-helper mt-1">{promptLanguage === 'tr' ? 'Turkce' : promptLanguage === 'mixed' ? 'Mixed' : 'English'}</p>
          </div>
          <div className="ui-preview-surface">
            <p className="text-[12px] font-semibold text-white">Created</p>
            <p className="ui-helper mt-1">{new Date(prompt.createdAt).toLocaleDateString('en-US')}</p>
          </div>
        </div>

        <pre className="font-mono text-[12px] text-slate-100 whitespace-pre-wrap leading-relaxed bg-black/25 rounded-2xl p-4 border border-white/8">
          {prompt.masterPrompt}
        </pre>

        {prompt.reasoning && (
          <div className="rounded-2xl p-4 border border-white/8 bg-white/[0.03]">
            <p className="text-[12px] font-semibold text-white mb-1.5">Source note</p>
            <p className="text-[13px] text-slate-300 leading-relaxed">{prompt.reasoning}</p>
          </div>
        )}

        {analysis && (
          <div className="rounded-xl p-3 border border-cyber-primary/20 bg-cyber-primary/5">
            <p className="font-mono text-[8px] uppercase tracking-widest text-cyber-primary mb-2">
              LangExtract{analysis.model ? ` · ${analysis.model}` : ''}
            </p>
            <div className="flex flex-wrap gap-1 mb-2">
              {analysis.keywords.slice(0, 12).map(kw => (
                <span key={kw} className="px-1.5 py-0.5 rounded bg-cyber-primary/10 text-cyber-primary font-mono text-[9px] border border-cyber-primary/20">{kw}</span>
              ))}
            </div>
            {analysis.summary && <p className="font-mono text-[10px] text-gray-400 leading-relaxed">{analysis.summary}</p>}
          </div>
        )}
        {analysisErr && <p className="font-mono text-[10px] text-cyber-secondary">{analysisErr}</p>}
      </div>

      {/* Actions */}
      <div className="px-5 py-3.5 border-t border-white/5 flex items-center gap-2 flex-wrap flex-shrink-0">
        <button onClick={handleCopy}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold border transition-all ${
            copied
              ? 'bg-cyber-success/10 text-cyber-success border-cyber-success/30'
              : 'bg-cyber-primary/10 text-cyber-primary border-cyber-primary/20 hover:bg-cyber-primary/20'
          }`}>
          {copied
            ? <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>Copied</>
            : <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>Copy</>}
        </button>
        {onUsePrompt && (
          <button onClick={() => onUsePrompt(prompt)}
            className="ui-btn-primary flex items-center gap-1.5 px-4 py-2 text-[12px]">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3" /></svg>
            Use
          </button>
        )}
        <button onClick={handleAnalyze} disabled={analyzing}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 text-slate-200 text-[12px] font-semibold border border-white/8 hover:bg-white/10 disabled:opacity-50 transition-all">
          {analyzing ? 'Analyzing…' : 'LangExtract'}
        </button>
        <div className="flex-1" />
        <span className="text-[12px] text-slate-400">
          {new Date(prompt.createdAt).toLocaleDateString('en-US')}
        </span>
      </div>
    </div>
  );
}

// ── Row item ──────────────────────────────────────────────────────────────────
function PromptRow({ prompt, active, onClick }: {
  prompt: StoredPromptItem;
  active: boolean;
  onClick: () => void;
}) {
  const meta = prompt.meta as Record<string, string> | undefined;
  const color = providerColor(meta?.provider ?? '');
  const dot = sourceDot(prompt);
  const promptLanguage = detectPromptLanguage(prompt);

  return (
    <button
      onClick={onClick}
      title={prompt.masterPrompt}
      className={`w-full text-left px-4 py-3 border-b border-white/4 transition-all group ${
        active
          ? 'bg-white/6 border-l-2 border-l-cyber-primary'
          : 'hover:bg-white/3 border-l-2 border-l-transparent'
      }`}
    >
      <div className="flex items-start gap-2.5">
        <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: dot }} />
        <div className="flex-1 min-w-0">
          <p className={`font-sans text-[14px] font-semibold truncate leading-snug ${active ? 'text-white' : 'text-slate-100 group-hover:text-white'}`}>
            {prompt.name || 'Untitled'}
          </p>
          <p className="text-[12px] text-slate-300 mt-1 truncate leading-snug">
            {trunc(prompt.masterPrompt, 64)}
          </p>
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            {[
              meta?.provider && (
                <span key="provider" className="ui-chip text-[11px]" style={{ color, background: color + '15', border: `1px solid ${color}25` }}>
                  {meta.provider}
                </span>
              ),
              <span key="source" className="ui-chip text-[11px]">{sourceLabel(prompt)}</span>,
              meta?.category && <span key="cat" className="ui-chip text-[11px]">{String(meta.category)}</span>,
              <span key="lang" className="ui-chip text-[11px]">{promptLanguage === 'tr' ? 'TR' : promptLanguage === 'mixed' ? 'TR + EN' : 'EN'}</span>,
            ].filter(Boolean).slice(0, 3)}
          </div>
        </div>
      </div>
    </button>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function PromptLibrary({ onUsePrompt }: Props) {
  const { language } = useTranslation();
  const tr = language === 'tr';

  const [prompts, setPrompts] = useState<StoredPromptItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('all');
  const [selectedSource, setSelectedSource] = useState('all');
  const [selectedLanguage, setSelectedLanguage] = useState<'all' | 'tr' | 'en' | 'mixed'>('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [page, setPage] = useState(0);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(handler);
  }, [search]);

  const loadPrompts = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_BASE}/prompts`, { headers });
      const raw = await res.text();
      let data: Record<string, unknown> = {};
      try {
        data = raw ? JSON.parse(raw) as Record<string, unknown> : {};
      } catch {
        throw new Error('The prompt archive is not responding right now. Check the API service and try again.');
      }
      if (!res.ok) {
        throw new Error(
          typeof data.error === 'string'
            ? data.error
            : tr
              ? 'Prompt arsivi yuklenemedi. API servisini baslatip tekrar deneyin.'
              : 'Failed to load the prompt archive. Start the API service and try again.'
        );
      }
      setPrompts(Array.isArray(data.prompts) ? data.prompts as StoredPromptItem[] : []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally { setLoading(false); }
  }, [tr]);

  useEffect(() => { loadPrompts(); }, [loadPrompts]);

  const providers = useMemo(() => {
    const s = new Set<string>();
    prompts.forEach(p => { const v = (p.meta as Record<string,string>)?.provider; if (v) s.add(v); });
    return Array.from(s).sort();
  }, [prompts]);

  const sources = useMemo(() => {
    const s = new Set<string>();
    prompts.forEach(p => s.add(sourceLabel(p)));
    return Array.from(s).sort();
  }, [prompts]);

  const categories = useMemo(() => {
    const c = new Set<string>();
    prompts.forEach(p => { const cat = (p.meta as Record<string,any>)?.category; if (cat) c.add(String(cat)); });
    return Array.from(c).sort();
  }, [prompts]);

  const filtered = useMemo(() => {
    let list = prompts;
    if (selectedProvider !== 'all') list = list.filter(p => (p.meta as Record<string,string>)?.provider === selectedProvider);
    if (selectedSource !== 'all') list = list.filter(p => sourceLabel(p) === selectedSource);
    if (selectedCategory !== 'all') list = list.filter(p => (p.meta as Record<string,any>)?.category === selectedCategory);
    if (selectedLanguage !== 'all') list = list.filter(p => detectPromptLanguage(p) === selectedLanguage);
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      list = list.filter(p =>
        (p.name || '').toLowerCase().includes(q) ||
        p.masterPrompt.toLowerCase().includes(q) ||
        ((p.meta as Record<string,string>)?.provider || '').toLowerCase().includes(q) ||
        ((p.meta as Record<string,string>)?.category || '').toLowerCase().includes(q) ||
        ((p.meta as Record<string,string>)?.intent || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [prompts, selectedProvider, selectedSource, selectedCategory, selectedLanguage, debouncedSearch]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = useMemo(() => filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE), [filtered, page]);
  useEffect(() => { setPage(0); setActiveId(null); }, [debouncedSearch, selectedProvider, selectedSource, selectedCategory, selectedLanguage]);

  const activePrompt = useMemo(() => prompts.find(p => p.id === activeId) ?? null, [prompts, activeId]);
  const activeFilters = useMemo(() => {
    const items: string[] = [];
    if (debouncedSearch.trim()) items.push(`Search: ${debouncedSearch.trim()}`);
    if (selectedSource !== 'all') items.push(`Source: ${selectedSource}`);
    if (selectedProvider !== 'all') items.push(`Provider: ${selectedProvider}`);
    if (selectedCategory !== 'all') items.push(`Category: ${selectedCategory}`);
    if (selectedLanguage !== 'all') {
      const labels: Record<'tr' | 'en' | 'mixed', string> = {
        tr: tr ? 'Turkce' : 'Turkish',
        en: 'English',
        mixed: tr ? 'Karisik' : 'Mixed',
      };
      items.push(`Language: ${labels[selectedLanguage]}`);
    }
    return items;
  }, [debouncedSearch, selectedLanguage, selectedProvider, selectedSource, selectedCategory, tr]);
  const handleOpenRandom = useCallback(() => {
    if (filtered.length === 0) return;
    const randomPrompt = filtered[Math.floor(Math.random() * filtered.length)];
    if (!randomPrompt) return;
    setActiveId(randomPrompt.id);
  }, [filtered]);
  const resetFilters = useCallback(() => {
    setSearch('');
    setSelectedProvider('all');
    setSelectedSource('all');
    setSelectedLanguage('all');
    setSelectedCategory('all');
    setPage(0);
  }, []);

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-10 h-10">
          <div className="absolute inset-0 rounded-full border border-white/5" />
          <div className="absolute inset-0 rounded-full border-t border-cyber-primary animate-spin" />
        </div>
        <span className="font-mono text-[9px] text-gray-700 uppercase tracking-widest">
          Loading archive
        </span>
      </div>
    </div>
  );

  if (error) return (
    <div className="ui-empty-state flex flex-col items-start justify-center gap-4">
      <div className="w-10 h-10 rounded-full bg-cyber-secondary/10 flex items-center justify-center border border-cyber-secondary/20">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ff003c" strokeWidth="2">
          <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <div>
        <p className="text-[16px] font-semibold text-white">
          The archive is not ready right now
        </p>
        <p className="ui-helper mt-2 max-w-xl">
          Saved prompts could not be loaded. If the backend is offline, start the API service first and try again.
        </p>
        <p className="mt-3 text-[12px] text-slate-500">{error}</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={loadPrompts} className="px-4 py-2 rounded-xl bg-cyber-primary/10 text-cyber-primary font-mono text-[11px] border border-cyber-primary/20 hover:bg-cyber-primary/20 transition-colors">
          Retry
        </button>
        <span className="text-[12px] text-slate-500">
          Tip: `npm run api` or `npm run dev:all`
        </span>
      </div>
    </div>
  );

  // ── Main layout ───────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-3">
      <div className="ui-filter-bar">
        <div className="section-heading flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="type-section-title">Filters</h2>
            <p className="type-helper mt-1">
              Narrow by search, source, provider, and language.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={loadPrompts} className="ui-btn-secondary py-2 px-3 text-[12px]">
              Refresh
            </button>
            <button onClick={handleOpenRandom} disabled={filtered.length === 0} className="ui-btn-secondary py-2 px-3 text-[12px] disabled:opacity-40">
              Open random
            </button>
            <span className="ui-chip text-[11px]">{filtered.length} records</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-3 items-end">
          <div>
            <label className="ui-label mb-1.5">Search</label>
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Example: customer support, openai, onboarding..."
                className="ui-input pl-10 pr-10"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  aria-label="Clear search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="ui-label mb-1.5">Source</label>
            <div className="flex flex-wrap gap-2">
              {['all', ...sources].map((src) => (
                <button key={src} onClick={() => setSelectedSource(src)} className={`ui-chip-button ${selectedSource === src ? 'active' : ''}`}>
                  {src === 'all' ? 'All' : src}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="ui-label mb-1.5">Category</label>
            <select
              value={selectedCategory}
              onChange={(event) => setSelectedCategory(event.target.value)}
              aria-label="Category filter"
              className="ui-select"
            >
              <option value="all">All categories</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="ui-label mb-1.5">Provider</label>
            <select
              value={selectedProvider}
              onChange={(event) => setSelectedProvider(event.target.value)}
              aria-label="Provider filter"
              className="ui-select"
            >
              <option value="all">All providers</option>
              {providers.map((providerName) => <option key={providerName} value={providerName}>{providerName}</option>)}
            </select>
          </div>

          <div>
            <label className="ui-label mb-1.5">Language</label>
            <select
              value={selectedLanguage}
              onChange={(event) => setSelectedLanguage(event.target.value as 'all' | 'tr' | 'en' | 'mixed')}
              aria-label="Language filter"
              className="ui-select"
            >
              <option value="all">All languages</option>
              <option value="tr">Turkish</option>
              <option value="en">English</option>
              <option value="mixed">Mixed</option>
            </select>
          </div>
        </div>

        {activeFilters.length > 0 && (
          <div className="mt-4 rounded-[16px] border border-white/8 bg-white/[0.03] p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-100/78">
                Active filters
              </span>
              {activeFilters.map((item) => (
                <span key={item} className="ui-chip text-[11px]">
                  {item}
                </span>
              ))}
              <button onClick={resetFilters} className="ui-chip-button active">
                Reset all
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-3" style={{ height: 'calc(100vh - 280px)', minHeight: '400px' }}>
        <div className={`flex flex-col rounded-2xl border border-white/8 bg-black/20 overflow-hidden transition-all ${activePrompt ? 'w-[42%]' : 'w-full'}`}>
          <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between flex-shrink-0">
            <div>
              <span className="type-section-title">
                Archive list
              </span>
              <p className="type-helper mt-0.5">
                Page {page + 1}/{Math.max(1, totalPages)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="ui-chip text-[11px]">{paged.length} / {filtered.length}</span>
              <button
                onClick={() => setPage((current) => Math.max(0, current - 1))}
                disabled={page === 0}
                aria-label="Previous page"
                className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-slate-400 hover:text-white disabled:opacity-20 transition-colors">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6" /></svg>
              </button>
              <button
                onClick={() => setPage((current) => Math.min(totalPages - 1, current + 1))}
                disabled={page >= totalPages - 1}
                aria-label="Next page"
                className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-slate-400 hover:text-white disabled:opacity-20 transition-colors">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>
              </button>
            </div>
          </div>

          <div className="px-4 py-3 border-b border-white/5 bg-white/[0.02]">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="ui-preview-surface">
                <p className="text-[12px] font-semibold text-white">Sources</p>
                <p className="ui-helper mt-1">{sources.length} archive surfaces</p>
              </div>
              <div className="ui-preview-surface">
                <p className="text-[12px] font-semibold text-white">Providers</p>
                <p className="ui-helper mt-1">{providers.length} provider tags found</p>
              </div>
              <div className="ui-preview-surface">
                <p className="text-[12px] font-semibold text-white">Open preview</p>
                <p className="ui-helper mt-1">{activePrompt ? (activePrompt.name || 'Untitled') : 'No selection yet'}</p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {paged.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-4 py-16 px-6">
                <svg className="w-10 h-10 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                </svg>
                <div className="text-center">
                  <p className="text-[14px] font-semibold text-white">No prompts found</p>
                  <p className="ui-helper mt-1">
                    Broaden the query, reset the language filter, or try the random action.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 justify-center">
                  {['support', 'system', 'marketing'].map((example) => (
                    <button key={example} type="button" onClick={() => setSearch(example)} className="ui-chip-button">
                      {example}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              paged.map((prompt) => (
                <PromptRow
                  key={prompt.id}
                  prompt={prompt}
                  active={activeId === prompt.id}
                  onClick={() => setActiveId(activeId === prompt.id ? null : prompt.id)}
                />
              ))
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-1 py-2.5 border-t border-white/5 flex-shrink-0">
              {Array.from({ length: Math.min(totalPages, 9) }, (_, index) => {
                const pageNumber = totalPages <= 9 ? index : page < 4 ? index : page > totalPages - 5 ? totalPages - 9 + index : page - 4 + index;
                return (
                  <button
                    key={pageNumber}
                    onClick={() => setPage(pageNumber)}
                    aria-label={tr ? `${pageNumber + 1}. sayfaya git` : `Go to page ${pageNumber + 1}`}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full transition-all"
                  >
                    <span className={`rounded-full transition-all ${pageNumber === page ? 'h-2.5 w-5 bg-cyber-primary' : 'h-2.5 w-2.5 bg-white/15 hover:bg-white/30'}`} />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {activePrompt && (
          <div className="flex-1 rounded-2xl border border-white/8 bg-black/20 overflow-hidden">
            <DetailPanel prompt={activePrompt} onClose={() => setActiveId(null)} onUsePrompt={onUsePrompt} tr={tr} />
          </div>
        )}

        {!activePrompt && filtered.length > 0 && (
          <div className="hidden xl:flex xl:w-[32%] flex-col rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-5">
            <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-cyan-100/78">
              Preview area
            </p>
            <h3 className="mt-3 text-[18px] font-semibold text-white">
              Cards are lighter now, details open on the right
            </h3>
            <p className="mt-3 text-[13px] leading-6 text-slate-300">
              When you select an item, the full prompt, source context, and quick actions appear here. The list stays focused on title, summary, and tags.
            </p>
            <div className="mt-5 space-y-3">
              <div className="ui-preview-surface">
                <p className="text-[12px] font-semibold text-white">To begin</p>
                <p className="ui-helper mt-2">
                  Open any item on the left or use the random action to explore.
                </p>
              </div>
              <div className="ui-preview-surface">
                <p className="text-[12px] font-semibold text-white">Quick reuse</p>
                <p className="ui-helper mt-2">
                  The Use action in the detail panel sends the prompt back to Prompt Lab.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
