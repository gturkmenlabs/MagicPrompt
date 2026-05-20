/**
 * Meta-Prompt Library — Organize edilmis library UI.
 * Kategori sidebar + tag filtresi + arama/siralama + grid/liste gecisi
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from '../i18n';
import { getAuthHeaders, API_BASE, type StoredPromptItem } from '@/services/apiClient';
import { NOTEBOOKLM_PROMPTS, type NotebookLmPrompt } from '@/data/notebookLmPrompts';
import { GITHUB_PROMPTS } from '@/data/githubPrompts';

const PAGE_SIZE = 24;

type SortKey = 'name' | 'category' | 'recent';
type ViewMode = 'grid' | 'list';

interface Props {
  onUsePrompt?: (prompt: StoredPromptItem) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const PROVIDER_COLORS: Record<string, string> = {
  openai: '#06e8f9', anthropic: '#d97706', google: '#22c55e',
  perplexity: '#a855f7', xai: '#f59e0b', cursor: '#3b82f6',
  windsurf: '#06b6d4', devin: '#ec4899', replit: '#f97316',
  lovable: '#e11d48', manus: '#8b5cf6', default: '#6b7280',
};

function providerColor(name: string): string {
  const key = (name || '').toLowerCase().split(' ')[0];
  return PROVIDER_COLORS[key] ?? PROVIDER_COLORS.default;
}

function sourceLabel(id: string): string {
  if (id.startsWith('spl-')) return 'Leaks';
  if (id.startsWith('spat-')) return 'AI Tools';
  if (id.startsWith('gh-')) return 'GitHub';
  if (id.startsWith('nlm-') || id.startsWith('ds-')) return 'Built-in';
  return 'Custom';
}

function sourceDot(id: string): string {
  if (id.startsWith('spl-')) return '#ff003c';
  if (id.startsWith('spat-')) return '#9d00ff';
  if (id.startsWith('gh-')) return '#f97316';
  if (id.startsWith('nlm-') || id.startsWith('ds-')) return '#22c55e';
  return '#06e8f9';
}

function trunc(t: string, n: number): string {
  return t.length > n ? t.slice(0, n) + '…' : t;
}

// Yerel NotebookLM prompt → StoredPromptItem donusumu
function nlmToStored(p: NotebookLmPrompt): StoredPromptItem {
  return {
    id: p.id,
    version: '1',
    name: p.name,
    masterPrompt: p.prompt,
    reasoning: p.category,
    createdAt: new Date(0).toISOString(),
    meta: { category: p.category, categoryEn: p.categoryEn, tags: p.tags.join(',') },
  };
}

// Kategori renk paleti
const CAT_COLORS = [
  '#06e8f9','#9d00ff','#ff003c','#d97706','#22c55e',
  '#3b82f6','#f97316','#ec4899','#8b5cf6','#14b8a6',
  '#f43f5e','#84cc16','#0ea5e9','#a855f7','#fb923c',
];
function catColor(_cat: string, idx: number): string {
  return CAT_COLORS[idx % CAT_COLORS.length];
}

// ── Copy button ───────────────────────────────────────────────────────────────
function CopyBtn({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  const copy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 2000); } catch { /* ignore */ }
  };
  return (
    <button onClick={copy}
      className={`p-1.5 rounded-lg border transition-all ${done ? 'text-cyber-success border-cyber-success/30 bg-cyber-success/10' : 'text-gray-600 border-white/8 hover:text-white hover:border-white/20'}`}>
      {done
        ? <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
        : <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>}
    </button>
  );
}

// ── Prompt Card (grid) ────────────────────────────────────────────────────────
function PromptCard({ prompt, accentColor, onUsePrompt }: {
  prompt: StoredPromptItem;
  accentColor: string;
  onUsePrompt?: (p: StoredPromptItem) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const meta = prompt.meta as Record<string, unknown> | undefined;
  const provider = typeof meta?.provider === 'string' ? meta.provider : '';
  const dot = sourceDot(prompt.id);
  const src = sourceLabel(prompt.id);
  const rawTags = meta?.tags;
  const tags: string[] = Array.isArray(rawTags)
    ? rawTags.map(String).slice(0, 3)
    : typeof rawTags === 'string' ? rawTags.split(',').slice(0, 3) : [];

  return (
    <div className={`group relative rounded-xl border bg-black/20 transition-all duration-200 flex flex-col overflow-hidden ${
      expanded ? 'border-white/15' : 'border-white/6 hover:border-white/14'
    }`} title={prompt.masterPrompt}>
      <div className="h-px w-full" style={{ background: `linear-gradient(90deg, ${accentColor}70 0%, transparent 55%)` }} />

      <div className="px-4 pt-3 pb-2.5 cursor-pointer" onClick={() => setExpanded(v => !v)}>
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-0">
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: dot }} />
            <span className="font-mono text-[8px] uppercase tracking-widest" style={{ color: dot }}>{src}</span>
            {provider && (
              <span className="font-mono text-[8px] px-1.5 py-0.5 rounded-full"
                style={{ color: providerColor(provider), background: providerColor(provider) + '18', border: `1px solid ${providerColor(provider)}30` }}>
                {provider}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <CopyBtn text={prompt.masterPrompt} />
            <svg className={`w-3.5 h-3.5 text-gray-700 transition-transform ${expanded ? 'rotate-180' : ''}`}
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        </div>

        <h3 className="font-mono text-[11px] font-semibold text-white leading-snug mb-1.5 group-hover:text-cyber-primary transition-colors">
          {trunc(prompt.name || 'Untitled', 65)}
        </h3>
        <p className="font-mono text-[9px] text-gray-600 leading-relaxed line-clamp-2">
          {trunc(prompt.masterPrompt, 88)}
        </p>

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {tags.map(tag => (
              <span key={tag} className="font-mono text-[7px] px-1.5 py-0.5 rounded bg-white/5 text-gray-600 border border-white/6">
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {expanded && (
        <div className="px-4 pb-3.5 border-t border-white/5 pt-3 space-y-2.5">
          <pre className="font-mono text-[10px] text-gray-300 whitespace-pre-wrap leading-relaxed bg-black/30 rounded-lg p-3 border border-white/5 max-h-52 overflow-y-auto custom-scrollbar">
            {prompt.masterPrompt}
          </pre>
          {onUsePrompt && (
            <button onClick={(e) => { e.stopPropagation(); onUsePrompt(prompt); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyber-accent/10 text-cyber-accent font-mono text-[10px] border border-cyber-accent/20 hover:bg-cyber-accent/20 transition-all">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3" /></svg>
              Kullan
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Prompt Row (list) ─────────────────────────────────────────────────────────
function PromptRow({ prompt, accentColor, onUsePrompt }: {
  prompt: StoredPromptItem;
  accentColor: string;
  onUsePrompt?: (p: StoredPromptItem) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const meta = prompt.meta as Record<string, unknown> | undefined;
  const rawTags2 = meta?.tags;
  const tags: string[] = Array.isArray(rawTags2)
    ? rawTags2.map(String).slice(0, 4)
    : typeof rawTags2 === 'string' ? rawTags2.split(',').slice(0, 4) : [];
  const category = typeof meta?.category === 'string' ? meta.category : '';

  return (
    <div className={`border-b border-white/4 transition-all ${expanded ? 'bg-white/3' : 'hover:bg-white/2'}`} title={prompt.masterPrompt}>
      <div className="flex items-center gap-3 px-4 py-2.5 cursor-pointer" onClick={() => setExpanded(v => !v)}>
        <div className="w-1 h-8 rounded-full flex-shrink-0" style={{ background: accentColor + '80' }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
          <p className="font-mono text-[11px] font-medium text-gray-200 truncate">{prompt.name || 'Untitled'}</p>
            {category && (
              <span className="font-mono text-[8px] px-1.5 py-0.5 rounded hidden sm:inline-block"
                style={{ color: accentColor, background: accentColor + '15', border: `1px solid ${accentColor}25` }}>
                {category}
              </span>
            )}
          </div>
          <p className="font-mono text-[9px] text-gray-600 truncate mt-0.5">{trunc(prompt.masterPrompt, 76)}</p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {tags.slice(0, 2).map(t => (
            <span key={t} className="hidden md:inline font-mono text-[7px] px-1.5 py-0.5 rounded bg-white/5 text-gray-700 border border-white/6">#{t}</span>
          ))}
          <CopyBtn text={prompt.masterPrompt} />
          {onUsePrompt && (
            <button onClick={(e) => { e.stopPropagation(); onUsePrompt(prompt); }}
              className="p-1.5 rounded-lg border border-cyber-accent/20 text-cyber-accent hover:bg-cyber-accent/10 transition-all">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3" /></svg>
            </button>
          )}
          <svg className={`w-3 h-3 text-gray-700 transition-transform ${expanded ? 'rotate-180' : ''}`}
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </div>
      {expanded && (
        <div className="px-4 pb-3 pt-1">
          <pre className="font-mono text-[10px] text-gray-300 whitespace-pre-wrap leading-relaxed bg-black/30 rounded-lg p-3 border border-white/5 max-h-48 overflow-y-auto custom-scrollbar">
            {prompt.masterPrompt}
          </pre>
        </div>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function MetaPromptLibrary({ onUsePrompt }: Props) {
  const { t } = useTranslation();
  const tr = language === 'tr';

  // API prompts
  const [apiPrompts, setApiPrompts] = useState<StoredPromptItem[]>([]);
  const [apiLoading, setApiLoading] = useState(true);

  // UI state
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [page, setPage] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const loadApiPrompts = useCallback(async () => {
    setApiLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_BASE}/prompts`, { headers });
      const data = await res.json().catch(() => ({}));
      if (res.ok) setApiPrompts(data.prompts || []);
    } catch { /* offline — yerel veri yeterli */ }
    finally { setApiLoading(false); }
  }, []);

  useEffect(() => { loadApiPrompts(); }, [loadApiPrompts]);

  // Tum promptlari birlestir (yerel + API)
  const localPrompts = useMemo(
    () => [...NOTEBOOKLM_PROMPTS, ...GITHUB_PROMPTS].map(nlmToStored),
    []
  );

  const allPrompts = useMemo(() => {
    const apiIds = new Set(apiPrompts.map(p => p.id));
    const deduped = localPrompts.filter(p => !apiIds.has(p.id));
    return [...apiPrompts, ...deduped];
  }, [apiPrompts, localPrompts]);

  // Kategoriler
  const categories = useMemo(() => {
    const map = new Map<string, number>();
    allPrompts.forEach(p => {
      const cat = (p.meta as Record<string,string>)?.category ?? 'Diger';
      map.set(cat, (map.get(cat) ?? 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [allPrompts]);

  const categoryIndex = useMemo(() => {
    const m = new Map<string, number>();
    categories.forEach(([cat], i) => m.set(cat, i));
    return m;
  }, [categories]);

  // Populer tag'ler
  const topTags = useMemo(() => {
    const map = new Map<string, number>();
    allPrompts.forEach(p => {
      const rawTags = (p.meta as Record<string, unknown>)?.tags;
      const tags: string[] = Array.isArray(rawTags)
        ? rawTags.map(String)
        : typeof rawTags === 'string' ? rawTags.split(',') : [];
      tags.forEach(t => { const s = t.trim(); if (s) map.set(s, (map.get(s) ?? 0) + 1); });
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 20).map(([t]) => t);
  }, [allPrompts]);

  // Filtre + siralama
  const filtered = useMemo(() => {
    let list = allPrompts;

    if (selectedCategory !== 'all') {
      list = list.filter(p => (p.meta as Record<string,string>)?.category === selectedCategory);
    }
    if (selectedTags.length > 0) {
      list = list.filter(p => {
        const rawTags = (p.meta as Record<string, unknown>)?.tags;
        const tagsStr = Array.isArray(rawTags) ? rawTags.join(',') : (typeof rawTags === 'string' ? rawTags : '');
        return selectedTags.every(tag => tagsStr.includes(tag));
      });
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p => {
        const rawTags = (p.meta as Record<string, unknown>)?.tags;
        const tagsStr = Array.isArray(rawTags) ? rawTags.join(',') : (typeof rawTags === 'string' ? rawTags : '');
        return (
          (p.name || '').toLowerCase().includes(q) ||
          p.masterPrompt.toLowerCase().includes(q) ||
          ((p.meta as Record<string,string>)?.category ?? '').toLowerCase().includes(q) ||
          tagsStr.toLowerCase().includes(q)
        );
      });
    }

    if (sortKey === 'name') list = [...list].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    else if (sortKey === 'category') list = [...list].sort((a, b) => {
      const ca = (a.meta as Record<string,string>)?.category ?? '';
      const cb = (b.meta as Record<string,string>)?.category ?? '';
      return ca.localeCompare(cb);
    });
    // 'recent': API prompts once (dogal sira)

    return list;
  }, [allPrompts, selectedCategory, selectedTags, search, sortKey]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = useMemo(() => filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE), [filtered, page]);
  useEffect(() => { setPage(0); }, [search, selectedCategory, selectedTags, sortKey]);
  const activeFilters = useMemo(() => {
    const items: string[] = [];
    if (search.trim()) items.push(`$'Search': ${search.trim()}`);
    if (selectedCategory !== 'all') items.push(`$'Category': ${selectedCategory}`);
    if (selectedTags.length > 0) items.push(`$'Tag': ${selectedTags.join(', ')}`);
    if (sortKey !== 'name') items.push(`$'Sort': ${sortKey}`);
    return items;
  }, [search, selectedCategory, selectedTags, sortKey, tr]);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };
  const resetFilters = () => {
    setSearch('');
    setSelectedCategory('all');
    setSelectedTags([]);
    setSortKey('name');
    setPage(0);
  };

  return (
    <div className="flex flex-col h-full min-h-0">

      {/* ── Header ── */}
      <div className="flex-shrink-0 px-1 pt-1 pb-3">
        <div className="relative rounded-xl overflow-hidden border border-white/6 bg-black/20 px-5 py-4">
          <div className="absolute -top-6 -left-6 w-36 h-36 rounded-full bg-cyber-primary/6 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-6 -right-6 w-36 h-36 rounded-full bg-cyber-accent/6 blur-3xl pointer-events-none" />
          <div className="relative flex items-center justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyber-primary animate-pulse" />
                <span className="font-mono text-[9px] text-cyber-primary uppercase tracking-widest">
                  {filtered.length.toLocaleString()} / {allPrompts.length.toLocaleString()} 'prompts'
                </span>
                <span className="w-px h-3 bg-white/10" />
                <span className="font-mono text-[9px] text-gray-600">
                  {categories.length} 'categories'
                </span>
                {apiLoading && <span className="font-mono text-[8px] text-gray-700 animate-pulse">· API loading…</span>}
              </div>
              <h1 className="font-mono text-base font-bold text-white">{t.ui.metaPromptLibTitle}</h1>
              <p className="font-mono text-[10px] text-gray-500 mt-0.5">{t.ui.metaPromptLibSubtitle}</p>
            </div>
            <div className="flex items-center gap-2">
              {/* View toggle */}
              <div className="flex items-center rounded-lg border border-white/8 overflow-hidden" role="group" aria-label="View mode">
                <button onClick={() => setViewMode('grid')}
                  aria-pressed={viewMode === 'grid'}
                  aria-label="Grid view"
                  className={`p-2 transition-colors ${viewMode === 'grid' ? 'bg-cyber-primary/15 text-cyber-primary' : 'text-gray-600 hover:text-gray-300'}`}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
                  </svg>
                </button>
                <button onClick={() => setViewMode('list')}
                  aria-pressed={viewMode === 'list'}
                  aria-label="List view"
                  className={`p-2 transition-colors ${viewMode === 'list' ? 'bg-cyber-primary/15 text-cyber-primary' : 'text-gray-600 hover:text-gray-300'}`}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
                    <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
                  </svg>
                </button>
              </div>
              {/* Sidebar toggle */}
              <button onClick={() => setSidebarOpen(v => !v)}
                aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
                aria-expanded={sidebarOpen}
                className={`p-2 rounded-lg border transition-colors ${sidebarOpen ? 'bg-cyber-primary/15 text-cyber-primary border-cyber-primary/30' : 'text-gray-600 border-white/8 hover:text-gray-300'}`}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/>
                </svg>
              </button>
              <button onClick={loadApiPrompts}
                aria-label="Refresh prompts"
                className="p-2 rounded-lg border border-white/8 text-gray-600 hover:text-cyber-primary hover:border-cyber-primary/30 transition-colors">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex flex-1 min-h-0 gap-3">

        {/* ── Kategori Sidebar ── */}
        {sidebarOpen && (
          <div className="flex-shrink-0 w-52 flex flex-col rounded-xl border border-white/6 bg-black/15 overflow-hidden">
            <div className="px-3 py-2.5 border-b border-white/5 flex-shrink-0">
              <span className="font-mono text-[8px] uppercase tracking-widest text-gray-600">
                'Categories'
              </span>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar py-1">
              {/* Tumu */}
              <button onClick={() => setSelectedCategory('all')}
                className={`w-full text-left px-3 py-2 flex items-center justify-between transition-colors ${
                  selectedCategory === 'all' ? 'bg-cyber-primary/10 text-cyber-primary' : 'text-gray-500 hover:text-gray-300 hover:bg-white/3'
                }`}>
                <span className="font-mono text-[10px] truncate">'All Categories'</span>
                <span className="font-mono text-[8px] text-gray-700 ml-1 flex-shrink-0">{allPrompts.length}</span>
              </button>

              {categories.map(([cat, count], i) => {
                const color = catColor(cat, i);
                const active = selectedCategory === cat;
                return (
                  <button key={cat} onClick={() => setSelectedCategory(active ? 'all' : cat)}
                    className={`w-full text-left px-3 py-2 flex items-center gap-2 transition-all ${
                      active ? 'bg-white/6' : 'hover:bg-white/3'
                    }`}>
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
                    <span className={`font-mono text-[9px] truncate flex-1 ${active ? 'text-white' : 'text-gray-500'}`}
                      style={active ? { color } : {}}>
                      {cat}
                    </span>
                    <span className="font-mono text-[8px] text-gray-700 flex-shrink-0">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Main Content ── */}
        <div className="flex-1 min-w-0 flex flex-col gap-2.5 overflow-hidden">

          {/* ── Controls ── */}
          <div className="flex-shrink-0 flex flex-col gap-2">
            {/* Search + Sort */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                  placeholder='Search name, content or tag…'
                  className="w-full pl-9 pr-8 py-2 rounded-xl bg-white/4 border border-white/8 font-mono text-[11px] text-white placeholder-gray-700 focus:outline-none focus:border-cyber-primary/40 transition-colors" />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-600 hover:text-white transition-colors">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                )}
              </div>

              {/* Sort */}
              <div className="flex items-center rounded-xl border border-white/8 overflow-hidden flex-shrink-0">
                {([['name', tr ? 'A-Z' : 'A-Z'], ['category', tr ? 'Kat.' : 'Cat.'], ['recent', tr ? 'Yeni' : 'New']] as [SortKey, string][]).map(([key, label]) => (
                  <button key={key} onClick={() => setSortKey(key)}
                    className={`px-2.5 py-2 font-mono text-[9px] uppercase tracking-wider transition-colors ${
                      sortKey === key ? 'bg-cyber-primary/15 text-cyber-primary' : 'text-gray-600 hover:text-gray-300'
                    }`}>
                    {label}
                  </button>
                ))}
              </div>

              {/* Page info */}
              {totalPages > 1 && (
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                    className="p-1.5 rounded-lg text-gray-700 hover:text-white disabled:opacity-20 transition-colors">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
                  </button>
                  <span className="font-mono text-[9px] text-gray-700 tabular-nums">{page+1}/{totalPages}</span>
                  <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                    className="p-1.5 rounded-lg text-gray-700 hover:text-white disabled:opacity-20 transition-colors">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                  </button>
                </div>
              )}
            </div>

            {/* Tag chips */}
            {topTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {topTags.map(tag => (
                  <button key={tag} onClick={() => toggleTag(tag)}
                    className={`px-2 py-1 rounded-lg font-mono text-[8px] border transition-all ${
                      selectedTags.includes(tag)
                        ? 'bg-cyber-primary/20 text-cyber-primary border-cyber-primary/40'
                        : 'text-gray-600 border-white/6 hover:text-gray-300 hover:border-white/15'
                    }`}>
                    #{tag}
                  </button>
                ))}
                {selectedTags.length > 0 && (
                  <button onClick={() => setSelectedTags([])}
                    className="px-2 py-1 rounded-lg font-mono text-[8px] border border-cyber-secondary/30 text-cyber-secondary hover:bg-cyber-secondary/10 transition-all">
                    ✕ 'Clear'
                  </button>
                )}
              </div>
            )}

            {activeFilters.length > 0 && (
              <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[8px] uppercase tracking-widest text-cyber-primary">
                    'Active filters'
                  </span>
                  {activeFilters.map(filter => (
                    <span key={filter} className="ui-chip text-[11px]">
                      {filter}
                    </span>
                  ))}
                  <button onClick={resetFilters}
                    className="px-2 py-1 rounded-lg font-mono text-[8px] border border-cyber-secondary/30 text-cyber-secondary hover:bg-cyber-secondary/10 transition-all">
                    'Reset all'
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── Results ── */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {paged.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white/3 border border-white/6 flex items-center justify-center">
                  <svg className="w-6 h-6 text-gray-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                  </svg>
                </div>
                <p className="font-mono text-[11px] text-gray-600">'No results found'</p>
                <button onClick={() => { setSearch(''); setSelectedCategory('all'); setSelectedTags([]); }}
                  className="px-3 py-1.5 rounded-lg bg-white/5 text-gray-400 font-mono text-[10px] border border-white/8 hover:bg-white/10 transition-colors">
                  'Clear Filters'
                </button>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5 pb-4">
                {paged.map(p => {
                  const cat = (p.meta as Record<string,string>)?.category ?? '';
                  const color = catColor(cat, categoryIndex.get(cat) ?? 0);
                  return <PromptCard key={p.id} prompt={p} accentColor={color} onUsePrompt={onUsePrompt} />;
                })}
              </div>
            ) : (
              <div className="rounded-xl border border-white/6 bg-black/15 overflow-hidden mb-4">
                {paged.map(p => {
                  const cat = (p.meta as Record<string,string>)?.category ?? '';
                  const color = catColor(cat, categoryIndex.get(cat) ?? 0);
                  return <PromptRow key={p.id} prompt={p} accentColor={color} onUsePrompt={onUsePrompt} />;
                })}
              </div>
            )}

            {/* Pagination dots */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-1.5 py-3">
                {Array.from({ length: Math.min(totalPages, 9) }, (_, i) => {
                  const n = totalPages <= 9 ? i : page < 4 ? i : page > totalPages - 5 ? totalPages - 9 + i : page - 4 + i;
                  return (
                    <button
                      key={n}
                      onClick={() => setPage(n)}
                      aria-label={tr ? `${n + 1}. sayfaya git` : `Go to page ${n + 1}`}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-full transition-all"
                    >
                      <span className={`rounded-full transition-all ${n === page ? 'h-2.5 w-5 bg-cyber-primary' : 'h-2.5 w-2.5 bg-white/12 hover:bg-white/30'}`} />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
