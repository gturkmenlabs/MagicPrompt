import { Search, Bell, Plus, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import type { AppPage } from '../../App';

const searchablePages: AppPage[] = ['Prompt Lab', 'Library', 'AI Lab', 'Insights', 'Şablonlar', 'Ayarlar'];

export function AppTopBar({
  activePage,
  onPageChange,
  onNewPrompt,
}: {
  activePage: AppPage;
  onPageChange: (page: AppPage) => void;
  onNewPrompt: () => void;
}) {
  const [query, setQuery] = useState('');
  const [autoRoute, setAutoRoute] = useState(true);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [newMenuOpen, setNewMenuOpen] = useState(false);

  const filteredPages = searchablePages.filter((page) => page.toLowerCase().includes(query.toLowerCase()));
  const submitSearch = () => {
    const match = filteredPages[0];
    if (match) {
      onPageChange(match);
      setQuery('');
    }
  };

  return (
    <header className="h-16 border-b border-[var(--border-default)] bg-[var(--surface-base)]/80 backdrop-blur-sm sticky top-0 z-30">
      <div className="h-full px-6 flex items-center justify-between gap-6">
        {/* Left - Breadcrumb */}
        <div className="flex items-center gap-2">
          <span className="text-[var(--text-tertiary)] text-sm">Workspace</span>
          <span className="text-[var(--text-tertiary)]">›</span>
          <h2 className="font-semibold text-[var(--text-primary)]">{activePage}</h2>
        </div>

        {/* Center - Search */}
        <div className="flex-1 max-w-[480px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') submitSearch();
                if (event.key === 'Escape') setQuery('');
              }}
              placeholder="Ara veya komut çalıştır... ⌘K"
              className="w-full h-10 pl-10 pr-4 bg-[var(--surface-2)] border border-[var(--border-default)] rounded-lg text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--iolite-500)] focus:ring-2 focus:ring-[var(--iolite-500)]/20 transition-all"
            />
            {query && (
              <div className="absolute top-12 left-0 right-0 rounded-lg border border-[var(--border-default)] bg-[var(--surface-1)] shadow-xl overflow-hidden z-50">
                {filteredPages.map((page) => (
                  <button
                    key={page}
                    onClick={() => {
                      onPageChange(page);
                      setQuery('');
                    }}
                    className="w-full px-4 py-3 text-left text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-3)] hover:text-[var(--text-primary)] transition-colors"
                  >
                    {page}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right - Actions */}
        <div className="flex items-center gap-3">
          {/* Status Pill */}
          <div className="px-3 py-1.5 rounded-full bg-[var(--success-tint)] border border-[var(--success-500)]/30 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[var(--success-500)]" />
            <span className="text-xs font-medium text-[var(--success-500)]">STANDBY</span>
          </div>

          {/* Auto Route Toggle */}
          <button
            onClick={() => setAutoRoute((value) => !value)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--surface-2)] border border-[var(--border-default)]"
          >
            <div className={`w-9 h-5 rounded-full relative cursor-pointer transition-colors ${autoRoute ? 'bg-[var(--iolite-500)]' : 'bg-[var(--surface-3)]'}`}>
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${autoRoute ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
            </div>
            <span className="text-xs font-medium text-[var(--text-secondary)]">{autoRoute ? 'AUTO ROUTE' : 'MANUAL'}</span>
          </button>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setNotificationsOpen((value) => !value)}
              className="w-10 h-10 rounded-lg hover:bg-[var(--surface-2)] flex items-center justify-center transition-colors relative"
            >
              <Bell className="w-4 h-4 text-[var(--text-secondary)]" />
              <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[var(--danger-500)]" />
            </button>
            {notificationsOpen && (
              <div className="absolute right-0 top-12 w-72 rounded-lg border border-[var(--border-default)] bg-[var(--surface-1)] p-3 shadow-xl z-50">
                <div className="text-sm font-semibold text-[var(--text-primary)]">Notifications</div>
                <div className="mt-3 space-y-2">
                  <button className="w-full text-left p-3 rounded-lg bg-[var(--surface-2)] hover:bg-[var(--surface-3)] transition-colors">
                    <div className="text-sm text-[var(--text-primary)]">Prompt Lab ready</div>
                    <div className="text-xs text-[var(--text-tertiary)] mt-1">Workspace actions are connected.</div>
                  </button>
                  <button className="w-full text-left p-3 rounded-lg bg-[var(--surface-2)] hover:bg-[var(--surface-3)] transition-colors">
                    <div className="text-sm text-[var(--text-primary)]">Auto route {autoRoute ? 'enabled' : 'disabled'}</div>
                    <div className="text-xs text-[var(--text-tertiary)] mt-1">Click the route switch to change mode.</div>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* New Button */}
          <div className="relative">
            <button
              onClick={() => {
                onNewPrompt();
                setNewMenuOpen((value) => !value);
              }}
              className="h-10 px-4 rounded-lg bg-gradient-to-r from-[var(--iolite-500)] to-[var(--aurora-500)] text-white font-medium flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-transform"
            >
              <Plus className="w-4 h-4" />
              <span>New</span>
              <ChevronDown className="w-3 h-3" />
            </button>
            {newMenuOpen && (
              <div className="absolute right-0 top-12 w-48 rounded-lg border border-[var(--border-default)] bg-[var(--surface-1)] p-2 shadow-xl z-50">
                <button onClick={onNewPrompt} className="w-full px-3 py-2 rounded-md text-left text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-3)] hover:text-[var(--text-primary)]">New prompt</button>
                <button onClick={() => onPageChange('Şablonlar')} className="w-full px-3 py-2 rounded-md text-left text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-3)] hover:text-[var(--text-primary)]">From template</button>
                <button onClick={() => onPageChange('Library')} className="w-full px-3 py-2 rounded-md text-left text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-3)] hover:text-[var(--text-primary)]">Open library</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
