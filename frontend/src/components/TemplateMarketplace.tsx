import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from '../i18n';
import { getAuthHeaders, API_BASE } from '@/services/apiClient';
import { TEMPLATES, TemplateItem } from '@/data/templates';

const DOMAIN_ICONS: Record<string, string> = {
  auto: '⚡', general: '🧩', frontend: '🎨', backend: '⚙️',
  architecture: '🏛️', analysis: '📊', 'image-video': '🎬', testing: '🧪',
  'ui-design': '🖌️', 'ml-ai': '🤖', 'devops-sre': '🚀', 'mobile-dev': '📱',
  cybersecurity: '🔒', 'data-engineering': '🗄️', 'nlp-llm': '💬',
  'cloud-native': '☁️', fintech: '💳', 'saas-product': '🌐',
  'blockchain-web3': '⛓️', 'api-integration': '🔌', 'ecommerce-growth': '🛒',
  accessibility: '♿', 'game-dev': '🎮', healthcare: '🏥', 'content-marketing': '✍️',
  education: '📚', legal: '⚖️', hr: '👥', sales: '💼',
};

interface SharedTemplate extends TemplateItem {
  id: string;
  authorId?: string;
  authorName?: string;
  rating: number;
  ratingCount: number;
  useCount: number;
  forkCount: number;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  isOfficial: boolean;
  isFeatured: boolean;
}

interface Collection {
  id: string;
  name: string;
  description?: string;
  icon: string;
  templateIds: string[];
  isPublic: boolean;
  createdAt: string;
}

interface Props {
  onSelectTemplate: (template: TemplateItem | SharedTemplate) => void;
  onCreateCustom?: () => void;
}

const FAVS_KEY = 'sr_template_favs_v2';
const RECENT_KEY = 'sr_template_recent_v2';
const RATINGS_KEY = 'sr_template_ratings';

function loadFavs(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(FAVS_KEY) || '[]')); } catch { return new Set(); }
}
function saveFavs(s: Set<string>) { localStorage.setItem(FAVS_KEY, JSON.stringify([...s])); }
function loadRecent(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch { return []; }
}
function saveRecent(ids: string[]) { localStorage.setItem(RECENT_KEY, JSON.stringify(ids.slice(0, 10))); }
function loadRatings(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(RATINGS_KEY) || '{}'); } catch { return {}; }
}
function saveRatings(r: Record<string, number>) { localStorage.setItem(RATINGS_KEY, JSON.stringify(r)); }

const TemplateMarketplace: React.FC<Props> = ({ onSelectTemplate, onCreateCustom }) => {
  const { language } = useTranslation();
  const tr = language === 'tr';

  const [activeTab, setActiveTab] = useState<'browse' | 'community' | 'collections' | 'custom'>('browse');
  const [search, setSearch] = useState('');
  const [selectedDomain, setSelectedDomain] = useState('all');
  const [selectedCategory, _setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState<'popular' | 'newest' | 'rating'>('popular');
  const [favs, setFavs] = useState<Set<string>>(loadFavs);
  const [recent, setRecent] = useState<string[]>(loadRecent);
  const [userRatings, setUserRatings] = useState<Record<string, number>>(loadRatings);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateItem | SharedTemplate | null>(null);
  const [communityTemplates, setCommunityTemplates] = useState<SharedTemplate[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingTemplate, setRatingTemplate] = useState<string | null>(null);
  const [tempRating, setTempRating] = useState(0);

  const domains = useMemo(() => ['all', ...Array.from(new Set(TEMPLATES.map(t => t.domainId)))], []);

  const filteredBuiltIn = useMemo(() => {
    let list = TEMPLATES;
    if (selectedDomain !== 'all') list = list.filter(t => t.domainId === selectedDomain);
    if (selectedCategory === 'trending') list = list.filter(t => (t as any).isTrending);
    if (selectedCategory === 'new') list = list.slice(-20);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(t => {
        const name = tr ? t.name : t.nameEn;
        const desc = tr ? t.description : t.descriptionEn;
        return name.toLowerCase().includes(q) || desc.toLowerCase().includes(q) || t.domainId.includes(q) || String(t.framework).toLowerCase().includes(q);
      });
    }
    return list;
  }, [selectedDomain, selectedCategory, search, tr]);

  const filteredCommunity = useMemo(() => {
    let list = communityTemplates;
    if (selectedDomain !== 'all') list = list.filter(t => t.domainId === selectedDomain);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(t => {
        const name = tr ? t.name : t.nameEn;
        const desc = tr ? t.description : t.descriptionEn;
        return name.toLowerCase().includes(q) || desc.toLowerCase().includes(q) || t.tags?.some(tag => tag.toLowerCase().includes(q));
      });
    }
    if (sortBy === 'popular') list = [...list].sort((a, b) => b.useCount - a.useCount);
    else if (sortBy === 'rating') list = [...list].sort((a, b) => b.rating - a.rating);
    else if (sortBy === 'newest') list = [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return list;
  }, [communityTemplates, selectedDomain, search, sortBy, tr]);

  const recentTemplates = useMemo(() => {
    return recent.map(id => {
      const builtIn = TEMPLATES.find(t => t.id === id);
      if (builtIn) return builtIn;
      return communityTemplates.find(t => t.id === id);
    }).filter(Boolean) as (TemplateItem | SharedTemplate)[];
  }, [recent, communityTemplates]);

  const favoriteTemplates = useMemo(() => {
    const favsList: (TemplateItem | SharedTemplate)[] = [];
    favs.forEach(id => {
      const builtIn = TEMPLATES.find(t => t.id === id);
      if (builtIn) favsList.push(builtIn);
      else {
        const community = communityTemplates.find(t => t.id === id);
        if (community) favsList.push(community);
      }
    });
    return favsList;
  }, [favs, communityTemplates]);

  useEffect(() => {
    loadCommunityTemplates();
    loadCollections();
  }, []);

  const loadCommunityTemplates = async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_BASE}/templates/community`, { headers });
      if (res.ok) {
        const data = await res.json();
        setCommunityTemplates(data.templates || []);
      }
    } catch (e) {
      console.warn('Failed to load community templates:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadCollections = async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_BASE}/templates/collections`, { headers });
      if (res.ok) {
        const data = await res.json();
        setCollections(data.collections || []);
      }
    } catch (e) {
      console.warn('Failed to load collections:', e);
    }
  };

  const handleSelect = useCallback((template: TemplateItem | SharedTemplate) => {
    onSelectTemplate(template);
    const next = [template.id, ...recent.filter(id => id !== template.id)];
    setRecent(next);
    saveRecent(next);
  }, [onSelectTemplate, recent]);

  const toggleFav = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavs(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      saveFavs(next);
      return next;
    });
  }, []);

  const handleRate = useCallback(async (templateId: string, rating: number) => {
    setUserRatings(prev => {
      const next = { ...prev, [templateId]: rating };
      saveRatings(next);
      return next;
    });
    try {
      const headers = await getAuthHeaders();
      await fetch(`${API_BASE}/templates/${templateId}/rate`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating }),
      });
    } catch (e) {
      console.warn('Failed to save rating:', e);
    }
    setShowRatingModal(false);
    setRatingTemplate(null);
    setTempRating(0);
  }, []);

  const openRatingModal = useCallback((templateId: string) => {
    setRatingTemplate(templateId);
    setTempRating(userRatings[templateId] || 0);
    setShowRatingModal(true);
  }, [userRatings]);

  const exportTemplate = useCallback(async (template: TemplateItem | SharedTemplate, format: 'json' | 'markdown') => {
    const content = format === 'json'
      ? JSON.stringify(template, null, 2)
      : `# ${tr ? template.name : template.nameEn}\n\n${tr ? template.description : template.descriptionEn}\n\n## Framework\n${template.framework}\n\n## Intent\n${tr ? template.intentTr : template.intentEn}\n`;

    const blob = new Blob([content], { type: format === 'json' ? 'application/json' : 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${template.id}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  }, [tr]);

  const shareTemplate = useCallback(async (template: TemplateItem | SharedTemplate) => {
    const shareData = {
      title: tr ? template.name : template.nameEn,
      text: tr ? template.description : template.descriptionEn,
      url: `${window.location.origin}?template=${template.id}`,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (e) {
        navigator.clipboard.writeText(shareData.url);
      }
    } else {
      navigator.clipboard.writeText(shareData.url);
    }
  }, [tr]);

  const renderStars = (rating: number, interactive: boolean = false, templateId?: string) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            type="button"
            disabled={!interactive}
            onClick={interactive && templateId ? () => {
              setTempRating(star);
            } : undefined}
            className={`${interactive ? 'cursor-pointer hover:scale-110' : 'cursor-default'} transition-transform`}
          >
            <svg
              width={interactive ? 16 : 12}
              height={interactive ? 16 : 12}
              viewBox="0 0 24 24"
              fill={star <= (interactive ? tempRating : rating) ? '#fbbf24' : 'none'}
              stroke="#fbbf24"
              strokeWidth="2"
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </button>
        ))}
        {interactive && (
          <button
            type="button"
            onClick={() => templateId && handleRate(templateId, tempRating)}
            disabled={tempRating === 0}
            className="ml-2 px-2 py-1 text-[9px] font-mono bg-yellow-500/20 text-yellow-400 rounded hover:bg-yellow-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save
          </button>
        )}
      </div>
    );
  };

  const TemplateCard: React.FC<{ template: TemplateItem | SharedTemplate; isCommunity?: boolean }> = ({ template, isCommunity = false }) => {
    const shared = template as SharedTemplate;
    const isFav = favs.has(template.id);

    return (
      <div
        onClick={() => setSelectedTemplate(template)}
        className="group relative p-4 rounded-xl border border-white/8 bg-black/30 hover:border-cyber-primary/40 hover:bg-black/50 transition-all cursor-pointer"
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xl">{DOMAIN_ICONS[template.domainId] || '📌'}</span>
            <span className="font-mono text-xs font-bold text-white truncate">
              {tr ? template.name : template.nameEn}
            </span>
          </div>
          <button
            type="button"
            onClick={(e) => toggleFav(template.id, e)}
            className={`text-sm transition-opacity ${isFav ? 'opacity-100 text-yellow-400' : 'opacity-0 group-hover:opacity-60 text-gray-500 hover:text-yellow-400'}`}
          >
            {isFav ? '⭐' : '☆'}
          </button>
        </div>

        <p className="font-mono text-[10px] text-gray-500 line-clamp-2 mb-2">
          {tr ? template.description : template.descriptionEn}
        </p>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="px-1.5 py-0.5 rounded bg-cyber-primary/10 text-cyber-primary font-mono text-[8px] uppercase">
            {template.framework}
          </span>
          <span className="px-1.5 py-0.5 rounded bg-white/5 text-gray-500 font-mono text-[8px]">
            {template.domainId}
          </span>
          {isCommunity && shared.rating > 0 && (
            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-500 font-mono text-[8px]">
              {renderStars(shared.rating)} {shared.rating.toFixed(1)}
            </span>
          )}
          {isCommunity && shared.useCount > 0 && (
            <span className="px-1.5 py-0.5 rounded bg-white/5 text-gray-600 font-mono text-[8px]">
              {shared.useCount} uses
            </span>
          )}
          {isCommunity && shared.isOfficial && (
            <span className="px-1.5 py-0.5 rounded bg-green-500/10 text-green-400 font-mono text-[8px]">
              ✓ Official
            </span>
          )}
          {isCommunity && shared.isFeatured && (
            <span className="px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 font-mono text-[8px]">
              ★ Featured
            </span>
          )}
        </div>

        {isCommunity && shared.authorName && (
          <div className="mt-2 pt-2 border-t border-white/5 flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-cyber-primary/30 to-cyber-accent/30 flex items-center justify-center text-[8px] font-mono text-white">
              {shared.authorName.charAt(0).toUpperCase()}
            </div>
            <span className="font-mono text-[9px] text-gray-600">{shared.authorName}</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <h2 className="font-mono text-sm font-bold text-cyber-primary uppercase tracking-wider">
          📚 Template Marketplace
        </h2>
        {onCreateCustom && (
          <button
            type="button"
            onClick={onCreateCustom}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyber-accent/10 text-cyber-accent font-mono text-[10px] border border-cyber-accent/20 hover:bg-cyber-accent/20 transition-all"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Custom Template
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-white/5 bg-black/20">
        {(['browse', 'community', 'collections', 'custom'] as const).map(tab => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 rounded-lg font-mono text-[10px] uppercase tracking-wider transition-all ${
              activeTab === tab
                ? 'bg-cyber-primary/15 text-cyber-primary border border-cyber-primary/30'
                : 'text-gray-500 hover:text-gray-300 border border-transparent hover:border-white/10'
            }`}
          >
            {tab === 'browse' && 'Browse'}
            {tab === 'community' && 'Community'}
            {tab === 'collections' && 'Collections'}
            {tab === 'custom' && 'Custom'}
          </button>
        ))}
      </div>

      {/* Search & Filters */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search templates... (framework, domain, keyword)"
            className="w-full pl-9 pr-8 py-2 rounded-xl bg-white/4 border border-white/8 font-mono text-[11px] text-white placeholder-gray-700 focus:outline-none focus:border-cyber-primary/40 transition-colors"
          />
          {search && (
            <button type="button" onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-600 hover:text-white">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>

        <select
          value={selectedDomain}
          onChange={(e) => setSelectedDomain(e.target.value)}
          className="px-3 py-2 rounded-xl bg-white/4 border border-white/8 font-mono text-[10px] text-gray-300 focus:outline-none focus:border-cyber-primary/40"
        >
          <option value="all">All Domains</option>
          {domains.filter(d => d !== 'all').map(d => (
            <option key={d} value={d}>{DOMAIN_ICONS[d] || '📌'} {d}</option>
          ))}
        </select>

        {activeTab === 'community' && (
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 rounded-xl bg-white/4 border border-white/8 font-mono text-[10px] text-gray-300 focus:outline-none focus:border-cyber-primary/40"
          >
            <option value="popular">Popular</option>
            <option value="rating">Top Rated</option>
            <option value="newest">Newest</option>
          </select>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'browse' && (
          <div className="p-4 space-y-4">
            {/* Recent & Favorites */}
            {!search && selectedDomain === 'all' && (
              <>
                {recentTemplates.length > 0 && (
                  <div>
                    <h3 className="font-mono text-[9px] uppercase tracking-widest text-gray-600 mb-2 px-1">
                      📋 Recent
                    </h3>
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                      {recentTemplates.slice(0, 6).map(tpl => (
                        <TemplateCard key={tpl.id} template={tpl} />
                      ))}
                    </div>
                  </div>
                )}

                {favoriteTemplates.length > 0 && (
                  <div>
                    <h3 className="font-mono text-[9px] uppercase tracking-widest text-gray-600 mb-2 px-1">
                      ⭐ Favorites
                    </h3>
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                      {favoriteTemplates.slice(0, 6).map(tpl => (
                        <TemplateCard key={tpl.id} template={tpl} />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* All Templates */}
            <div>
              {(search || selectedDomain !== 'all') && (
                <h3 className="font-mono text-[9px] uppercase tracking-widest text-gray-600 mb-2 px-1">
                  {search ? `🔍 "${search}" — ${filteredBuiltIn.length} results` : `${DOMAIN_ICONS[selectedDomain] || '📌'} ${selectedDomain}`}
                </h3>
              )}
              {filteredBuiltIn.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="text-4xl mb-3">🔍</div>
                  <p className="font-mono text-[11px] text-gray-600">No templates found</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                  {filteredBuiltIn.map(tpl => (
                    <TemplateCard key={tpl.id} template={tpl} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'community' && (
          <div className="p-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="relative w-10 h-10">
                  <div className="absolute inset-0 rounded-full border border-white/5" />
                  <div className="absolute inset-0 rounded-full border-t border-cyber-primary animate-spin" />
                </div>
              </div>
            ) : filteredCommunity.length === 0 ? (
              <div className="py-12 text-center">
                <div className="text-4xl mb-3">👥</div>
                <p className="font-mono text-[11px] text-gray-600 mb-3">No community templates yet</p>
                <button
                  type="button"
                  onClick={onCreateCustom}
                  className="px-4 py-2 rounded-lg bg-cyber-primary/10 text-cyber-primary font-mono text-[11px] border border-cyber-primary/20 hover:bg-cyber-primary/20 transition-all"
                >
                  Share Your First Template
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                {filteredCommunity.map(tpl => (
                  <TemplateCard key={tpl.id} template={tpl} isCommunity />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'collections' && (
          <div className="p-4">
            {collections.length === 0 ? (
              <div className="py-12 text-center">
                <div className="text-4xl mb-3">📁</div>
                <p className="font-mono text-[11px] text-gray-600 mb-3">No collections yet</p>
                <p className="font-mono text-[10px] text-gray-700">Create collections to organize your templates</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                {collections.map(col => (
                  <div
                    key={col.id}
                    className="p-4 rounded-xl border border-white/8 bg-black/30 hover:border-cyber-primary/40 transition-all cursor-pointer group"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="text-2xl">{col.icon}</span>
                      {col.isPublic && (
                        <span className="px-1.5 py-0.5 rounded bg-cyber-accent/10 text-cyber-accent font-mono text-[8px]">
                          Public
                        </span>
                      )}
                    </div>
                    <h4 className="font-mono text-xs font-bold text-white mb-1">{col.name}</h4>
                    {col.description && (
                      <p className="font-mono text-[10px] text-gray-500 line-clamp-2">{col.description}</p>
                    )}
                    <div className="mt-2 flex items-center justify-between">
                      <span className="font-mono text-[9px] text-gray-700">{col.templateIds.length} templates</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'custom' && onCreateCustom && (
          <div className="p-4">
            <div className="max-w-2xl mx-auto">
              <div className="text-center mb-6">
                <div className="text-5xl mb-4">✨</div>
                <h3 className="font-mono text-lg font-bold text-white mb-2">Create Custom Template</h3>
                <p className="font-mono text-[11px] text-gray-500">Create your own template and share with the community</p>
              </div>
              <button
                type="button"
                onClick={onCreateCustom}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-cyber-primary/20 to-cyber-accent/20 border border-cyber-primary/30 text-cyber-primary font-mono text-sm font-bold uppercase tracking-wider hover:from-cyber-primary/30 hover:to-cyber-accent/30 transition-all"
              >
                Start Creating Template
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setSelectedTemplate(null)}>
          <div className="modal-overlay absolute inset-0" aria-hidden />
          <div className="modal-panel relative w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[#0a0a0f] shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-white/5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{DOMAIN_ICONS[selectedTemplate.domainId] || '📌'}</span>
                  <div>
                    <h3 className="font-mono text-base font-bold text-white">
                      {tr ? selectedTemplate.name : selectedTemplate.nameEn}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="px-2 py-0.5 rounded bg-cyber-primary/15 border border-cyber-primary/30 text-cyber-primary font-mono text-[9px]">
                        {selectedTemplate.framework}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-white/5 text-gray-500 font-mono text-[9px]">
                        {selectedTemplate.domainId}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedTemplate(null)}
                  className="p-2 rounded-lg text-gray-600 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-5 overflow-y-auto max-h-[60vh] space-y-4">
              <p className="font-sans text-sm text-gray-300 leading-relaxed">
                {tr ? selectedTemplate.description : selectedTemplate.descriptionEn}
              </p>

              <div className="rounded-xl p-4 bg-black/40 border border-white/5">
                <h4 className="font-mono text-[9px] uppercase tracking-widest text-cyber-primary mb-2">
                  Intent / Prompt
                </h4>
                <pre className="font-mono text-[11px] text-gray-400 whitespace-pre-wrap leading-relaxed">
                  {tr ? selectedTemplate.intentTr : selectedTemplate.intentEn}
                </pre>
              </div>

              {'rating' in selectedTemplate && selectedTemplate.rating > 0 && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-white/3 border border-white/5">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[10px] text-gray-500">Rating</span>
                    {renderStars(selectedTemplate.rating)}
                    <span className="font-mono text-[10px] text-yellow-400">{selectedTemplate.rating.toFixed(1)}</span>
                    <span className="font-mono text-[9px] text-gray-600">({selectedTemplate.ratingCount})</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => openRatingModal(selectedTemplate.id)}
                    className="px-2 py-1 rounded bg-yellow-500/10 text-yellow-400 font-mono text-[9px] hover:bg-yellow-500/20 transition-colors"
                  >
                    {userRatings[selectedTemplate.id] ? (tr ? 'Duzenle' : 'Edit') : (tr ? 'Degerlendir' : 'Rate')}
                  </button>
                </div>
              )}

              {'tags' in selectedTemplate && selectedTemplate.tags && selectedTemplate.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {selectedTemplate.tags.map(tag => (
                    <span key={tag} className="px-2 py-1 rounded-full bg-white/5 text-gray-400 font-mono text-[9px]">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {'authorName' in selectedTemplate && selectedTemplate.authorName && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-white/3 border border-white/5">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyber-primary/30 to-cyber-accent/30 flex items-center justify-center text-sm font-mono text-white">
                    {selectedTemplate.authorName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-mono text-xs text-white">{selectedTemplate.authorName}</p>
                    <p className="font-mono text-[9px] text-gray-600">{selectedTemplate.useCount} uses · {selectedTemplate.forkCount} forks</p>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-white/5 flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => { handleSelect(selectedTemplate); setSelectedTemplate(null); }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyber-primary text-black font-mono text-xs font-bold uppercase tracking-wide hover:bg-white transition-all"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                Use Template
              </button>
              <button
                type="button"
                onClick={() => toggleFav(selectedTemplate.id, {} as any)}
                className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl border font-mono text-[10px] transition-all ${
                  favs.has(selectedTemplate.id)
                    ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'
                    : 'bg-white/5 text-gray-400 border-white/10 hover:border-white/30'
                }`}
              >
                {favs.has(selectedTemplate.id) ? '⭐' : '☆'} Favorite
              </button>
              <button
                type="button"
                onClick={() => shareTemplate(selectedTemplate)}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-400 font-mono text-[10px] hover:border-white/30 transition-all"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                </svg>
                Share
              </button>
              <div className="flex-1" />
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => exportTemplate(selectedTemplate, 'json')}
                  className="px-2 py-1.5 rounded bg-white/5 text-gray-500 font-mono text-[9px] hover:text-white hover:bg-white/10 transition-colors"
                >
                  JSON
                </button>
                <button
                  type="button"
                  onClick={() => exportTemplate(selectedTemplate, 'markdown')}
                  className="px-2 py-1.5 rounded bg-white/5 text-gray-500 font-mono text-[9px] hover:text-white hover:bg-white/10 transition-colors"
                >
                  MD
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rating Modal */}
      {showRatingModal && ratingTemplate && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={() => setShowRatingModal(false)}>
          <div className="modal-overlay absolute inset-0" aria-hidden />
          <div className="w-full max-w-sm p-6 rounded-2xl border border-white/10 bg-[#0a0a0f]" onClick={e => e.stopPropagation()}>
            <h3 className="font-mono text-sm font-bold text-white mb-4 text-center">
              Rate this template
            </h3>
            <div className="flex justify-center mb-6">
              {renderStars(0, true, ratingTemplate)}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowRatingModal(false)}
                className="flex-1 py-2 rounded-lg bg-white/5 text-gray-400 font-mono text-xs hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer Stats */}
      <div className="px-4 py-2 border-t border-white/5 flex items-center justify-between">
        <span className="font-mono text-[9px] text-gray-700">
          {filteredBuiltIn.length + filteredCommunity.length} templates · {favs.size} favorites
        </span>
        <span className="font-mono text-[9px] text-gray-700">
          Last updated: {new Date().toLocaleDateString('en-US')}
        </span>
      </div>
    </div>
  );
};

export default TemplateMarketplace;