import React, { useEffect, useMemo, useState } from 'react';
import { GITHUB_PROMPTS } from '@/data/githubPrompts';
import { NOTEBOOKLM_PROMPTS, type NotebookLmPrompt } from '@/data/notebookLmPrompts';
import { API_BASE, getAuthHeaders, type StoredPromptItem } from '@/services/apiClient';
import { Badge, Button, Card, EmptyState, Input, SectionHeader, Tabs } from '@/components/ui';
import { Drawer, FilterBar, ListRow, PageIntro } from '../shell';
import type { PromptHistoryEntry } from '@/hooks/usePromptHistory';

type LibraryTab = 'archive' | 'featured' | 'mine';
type LibrarySource = 'api' | 'built-in' | 'history';

interface LibraryItem {
  id: string;
  title: string;
  prompt: string;
  detail?: string;
  createdAt: string;
  source: LibrarySource;
  provider?: string;
  category?: string;
  tags: string[];
  historyEntry?: PromptHistoryEntry;
}

interface LibraryWorkspaceProps {
  history: PromptHistoryEntry[];
  language: string;
  onUsePrompt: (prompt: string) => void;
  onReuseHistory: (entry: PromptHistoryEntry) => void;
  onRemoveHistory: (id: string) => void;
  onClearHistory: () => void;
}

function builtInToLibraryItem(prompt: NotebookLmPrompt): LibraryItem {
  return {
    id: prompt.id,
    title: prompt.name,
    prompt: prompt.prompt,
    detail: prompt.category,
    createdAt: new Date(0).toISOString(),
    source: 'built-in',
    category: prompt.category,
    tags: prompt.tags || [],
  };
}

function storedToLibraryItem(prompt: StoredPromptItem): LibraryItem {
  const meta = prompt.meta as Record<string, unknown> | undefined;
  const rawTags = meta?.tags;
  const tags = Array.isArray(rawTags)
    ? rawTags.map(String)
    : typeof rawTags === 'string'
      ? rawTags.split(',').map((item) => item.trim()).filter(Boolean)
      : [];

  return {
    id: prompt.id,
    title: prompt.name || 'Untitled',
    prompt: prompt.masterPrompt,
    detail: typeof prompt.reasoning === 'string' ? prompt.reasoning : undefined,
    createdAt: prompt.createdAt,
    source: 'api',
    provider: typeof meta?.provider === 'string' ? meta.provider : undefined,
    category: typeof meta?.category === 'string' ? meta.category : undefined,
    tags,
  };
}

function historyToLibraryItem(entry: PromptHistoryEntry): LibraryItem {
  return {
    id: entry.id,
    title: entry.intent.slice(0, 88) || 'Prompt history',
    prompt: entry.masterPrompt,
    detail: entry.reasoning,
    createdAt: entry.createdAt,
    source: 'history',
    provider: entry.provider,
    category: entry.domainId,
    tags: [entry.framework, entry.domainId].filter(Boolean),
    historyEntry: entry,
  };
}

function sourceLabel(source: LibrarySource) {
  if (source === 'api') return 'Archive';
  if (source === 'history') return 'History';
  return 'Collection';
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function LibraryWorkspace({
  history,
  onUsePrompt,
  onReuseHistory,
  onRemoveHistory,
  onClearHistory,
}: LibraryWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<LibraryTab>('archive');
  const [apiItems, setApiItems] = useState<LibraryItem[]>([]);
  const [archiveError, setArchiveError] = useState('');
  const [archiveLoading, setArchiveLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState<'all' | LibrarySource>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const featuredItems = useMemo(
    () => [...NOTEBOOKLM_PROMPTS, ...GITHUB_PROMPTS].map(builtInToLibraryItem),
    []
  );
  const historyItems = useMemo(() => history.map(historyToLibraryItem), [history]);

  useEffect(() => {
    let cancelled = false;

    const loadArchive = async () => {
      setArchiveLoading(true);
      setArchiveError('');

      try {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_BASE}/prompts`, { headers });
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            typeof data.error === 'string'
              ? data.error
              : 'Prompt archive could not be loaded.'
          );
        }

        if (!cancelled) {
          const prompts = Array.isArray(data.prompts) ? data.prompts as StoredPromptItem[] : [];
          setApiItems(prompts.map(storedToLibraryItem));
        }
      } catch (error) {
        if (!cancelled) {
          setArchiveError(error instanceof Error ? error.message : 'Failed to load archive');
          setApiItems([]);
        }
      } finally {
        if (!cancelled) {
          setArchiveLoading(false);
        }
      }
    };

    loadArchive();
    return () => {
      cancelled = true;
    };
  }, []);

  const activeCollection = useMemo(() => {
    if (activeTab === 'featured') return featuredItems;
    if (activeTab === 'mine') return historyItems;
    return apiItems;
  }, [activeTab, apiItems, featuredItems, historyItems]);

  const categories = useMemo(() => {
    const values = new Set<string>();
    activeCollection.forEach((item) => {
      if (item.category) values.add(item.category);
    });
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [activeCollection]);

  const filteredItems = useMemo(() => {
    return activeCollection.filter((item) => {
      if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
      if (sourceFilter !== 'all' && item.source !== sourceFilter) return false;
      if (!search.trim()) return true;
      const query = search.toLowerCase();
      return (
        item.title.toLowerCase().includes(query) ||
        item.prompt.toLowerCase().includes(query) ||
        (item.detail || '').toLowerCase().includes(query) ||
        (item.provider || '').toLowerCase().includes(query) ||
        item.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    });
  }, [activeCollection, categoryFilter, search, sourceFilter]);

  const selectedItem = useMemo(
    () => filteredItems.find((item) => item.id === selectedId)
      ?? activeCollection.find((item) => item.id === selectedId)
      ?? null,
    [activeCollection, filteredItems, selectedId]
  );

  useEffect(() => {
    if (!filteredItems.length) {
      setSelectedId(null);
      setDetailOpen(false);
      return;
    }

    if (!selectedId || !filteredItems.some((item) => item.id === selectedId)) {
      setSelectedId(filteredItems[0]?.id ?? null);
    }
  }, [filteredItems, selectedId]);

  const tabItems = [
    { id: 'archive' as const, label: 'Archive', count: apiItems.length },
    { id: 'featured' as const, label: 'Collections', count: featuredItems.length },
    { id: 'mine' as const, label: 'My history', count: historyItems.length },
  ];

  const activeCollectionLabel = activeTab === 'archive'
    ? 'Archive'
    : activeTab === 'featured'
      ? 'Collections'
      : 'History';

  return (
    <div className="workspace workspace--library space-y-6">
      <PageIntro
        eyebrow="Library"
        title="Search, filter, and reuse prompts"
        description="The archive stays list-first: one filter bar, one result stream, and a details drawer only when you need context."
        actions={
          <>
            <Badge tone="info">{`${filteredItems.length} visible`}</Badge>
            <Badge tone="neutral">{activeCollectionLabel}</Badge>
            {archiveLoading && activeTab === 'archive' && <Badge tone="warning">Syncing</Badge>}
          </>
        }
      />

      <FilterBar
        className="workspace-library__filter-bar"
        title="Browse the current collection"
        description="Search, tabs, and filters stay on one line so the list remains quick to scan."
      >
        <div className="min-w-[240px] flex-1">
          <Input
            className="workspace-library__search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search title, prompt, provider, or tags"
            label="Search"
          />
        </div>
        <div className="min-w-[320px] flex-[1.1]">
          <Tabs value={activeTab} items={tabItems} onChange={(value) => setActiveTab(value)} className="workspace-library__tabs" />
        </div>
        <label className="workspace-library__field block min-w-[180px]">
          <span className="ui-label">Category</span>
          <select
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
            className="ui-select"
          >
            <option value="all">All categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>
        <label className="workspace-library__field block min-w-[160px]">
          <span className="ui-label">Source</span>
          <select
            value={sourceFilter}
            onChange={(event) => setSourceFilter(event.target.value as 'all' | LibrarySource)}
            className="ui-select"
          >
            <option value="all">All sources</option>
            <option value="api">Archive</option>
            <option value="built-in">Collection</option>
            <option value="history">History</option>
          </select>
        </label>
        {activeTab === 'mine' && historyItems.length > 0 && (
          <Button variant="ghost" size="sm" onClick={onClearHistory} className="workspace-library__clear">
            Clear history
          </Button>
        )}
      </FilterBar>

      <div className="workspace-library__grid grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="workspace-panel workspace-panel--soft workspace-library__list-card p-6">
          <SectionHeader
            eyebrow="Row list"
            title="Prompts stay in one clean reading rhythm"
            description="Metadata is deliberately reduced so the title, preview text, and action are the only things competing for attention."
          />

          <div className="workspace-library__rows mt-5 space-y-3">
            {activeTab === 'archive' && archiveError && apiItems.length === 0 ? (
              <EmptyState
                title="Archive unavailable"
                description="The list stays graceful even when the backend is missing. You can retry or switch to curated collections and history."
                reason={archiveError}
                primaryCta="Reload page"
                onPrimaryAction={() => window.location.reload()}
              />
            ) : filteredItems.length === 0 ? (
              <EmptyState
                title="No prompts match the current filters"
                description="Try a broader search or reset the filters to return to the full list."
                primaryCta="Reset filters"
                onPrimaryAction={() => {
                  setSearch('');
                  setCategoryFilter('all');
                  setSourceFilter('all');
                }}
              />
            ) : (
              filteredItems.map((item) => (
                <ListRow
                  key={item.id}
                  title={item.title}
                  description={item.detail || item.prompt.slice(0, 170)}
                  meta={[
                    { label: 'Source', value: sourceLabel(item.source), tone: 'info' },
                    ...(item.category ? [{ label: 'Category', value: item.category, tone: 'neutral' as const }] : []),
                  ]}
                  onClick={() => {
                    setSelectedId(item.id);
                    setDetailOpen(true);
                  }}
                  actionLabel="Open"
                  onAction={() => {
                    setSelectedId(item.id);
                    setDetailOpen(true);
                  }}
                  className={`workspace-library__row ${selectedId === item.id ? 'border-[#66aaff]/18 bg-[#66aaff]/[0.045]' : ''}`}
                />
              ))
            )}
          </div>
        </Card>

        <Card className="workspace-panel workspace-panel--soft workspace-library__summary-card p-5">
          <SectionHeader
            eyebrow="Summary"
            title="Keep the side context light"
            description="Only the essential status lives here so the library remains list-driven."
          />

          <div className="workspace-library__summary-grid mt-5 space-y-3">
            <div className="ui-preview-surface workspace-library__summary-surface">
              <p className="ui-label mb-2">Collection</p>
              <p className="text-[14px] font-medium text-white">{activeCollectionLabel}</p>
              <p className="ui-helper mt-2">
                {activeTab === 'archive'
                  ? 'Saved prompts from the app backend.'
                  : activeTab === 'featured'
                    ? 'Curated prompts from bundled collections.'
                    : 'Your recent prompt generations.'}
              </p>
            </div>

            <div className="ui-preview-surface workspace-library__summary-surface">
              <p className="ui-label mb-2">Visible rows</p>
              <p className="text-[22px] font-semibold tracking-[-0.04em] text-white">{filteredItems.length}</p>
              <p className="ui-helper mt-2">
                {categories.length > 0
                  ? `${categories.length} categories available in this view.`
                  : 'This view has no category metadata yet.'}
              </p>
            </div>

            <div className="ui-preview-surface workspace-library__summary-surface">
              <p className="ui-label mb-2">Current selection</p>
              <p className="text-[14px] font-medium text-white">
                {selectedItem?.title || 'Nothing selected'}
              </p>
              <p className="ui-helper mt-2">
                Open any row to review the prompt, copy it, or send it back to Prompt Lab.
              </p>
            </div>
          </div>
        </Card>
      </div>

      <Drawer
        open={detailOpen && Boolean(selectedItem)}
        onClose={() => setDetailOpen(false)}
        title={selectedItem?.title || ''}
        description={
          selectedItem
            ? `${sourceLabel(selectedItem.source)} · ${formatDate(selectedItem.createdAt)}`
            : undefined
        }
        width="lg"
        footer={
          selectedItem ? (
            <div className="workspace-library__drawer-footer flex w-full flex-wrap items-center gap-3">
              <Button
                variant="primary"
                size="md"
                onClick={() => {
                  if (selectedItem.historyEntry) {
                    onReuseHistory(selectedItem.historyEntry);
                  } else {
                    onUsePrompt(selectedItem.prompt);
                  }
                  setDetailOpen(false);
                }}
              >
                {selectedItem.historyEntry ? 'Reuse brief' : 'Use in Prompt Lab'}
              </Button>
              {selectedItem.historyEntry && (
                <Button
                  variant="ghost"
                  size="md"
                  onClick={() => {
                    onRemoveHistory(selectedItem.historyEntry!.id);
                    setDetailOpen(false);
                  }}
                >
                  Delete record
                </Button>
              )}
              <Button
                variant="secondary"
                size="md"
                onClick={async () => {
                  await navigator.clipboard.writeText(selectedItem.prompt);
                }}
              >
                Copy prompt
              </Button>
            </div>
          ) : null
        }
      >
        {selectedItem && (
          <div className="workspace-library__drawer-content space-y-5">
            <div className="flex flex-wrap gap-2">
              <Badge tone="info">{sourceLabel(selectedItem.source)}</Badge>
              {selectedItem.provider && <Badge tone="neutral">{selectedItem.provider}</Badge>}
              {selectedItem.category && <Badge tone="neutral">{selectedItem.category}</Badge>}
            </div>

            {selectedItem.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedItem.tags.slice(0, 8).map((tag) => (
                  <Badge key={tag} tone="neutral">
                    #{tag}
                  </Badge>
                ))}
              </div>
            )}

            {selectedItem.historyEntry && (
              <Card tone="muted" className="workspace-panel workspace-panel--soft p-4">
                <p className="ui-label mb-2">Original brief</p>
                <p className="text-[14px] leading-7 text-slate-100">
                  {selectedItem.historyEntry.intent}
                </p>
              </Card>
            )}

            {selectedItem.detail && (
              <Card tone="muted" className="workspace-panel workspace-panel--soft p-4">
                <p className="ui-label mb-2">Note</p>
                <p className="text-[14px] leading-7 text-slate-200">
                  {selectedItem.detail}
                </p>
              </Card>
            )}

            <Card className="workspace-panel workspace-panel--soft p-4">
              <p className="ui-label mb-3">Prompt preview</p>
              <pre className="workspace-library__preview max-h-[420px] overflow-auto whitespace-pre-wrap rounded-[18px] border border-white/8 bg-black/20 p-4 text-[12px] leading-6 text-slate-100">
                {selectedItem.prompt}
              </pre>
            </Card>
          </div>
        )}
      </Drawer>
    </div>
  );
}

export default LibraryWorkspace;
