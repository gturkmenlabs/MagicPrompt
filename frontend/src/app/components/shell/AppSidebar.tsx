import { Sparkles, Library, FlaskConical, ChartLine, LayoutTemplate, Settings as SettingsIcon, ChevronLeft } from 'lucide-react';
import { useState } from 'react';
import type { ElementType } from 'react';
import type { AppPage } from '../../App';

interface NavItem {
  icon: ElementType;
  label: AppPage;
  badge?: string;
  subLabel?: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

export function AppSidebar({
  activePage,
  onPageChange,
}: {
  activePage: AppPage;
  onPageChange: (page: AppPage) => void;
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const navigation: NavGroup[] = [
    {
      title: 'WORKSPACE',
      items: [
        { icon: Sparkles, label: 'Prompt Lab', badge: 'CORE' },
        { icon: Library, label: 'Library' },
        { icon: FlaskConical, label: 'AI Lab', badge: 'LIVE' },
      ]
    },
    {
      title: 'PLATFORM',
      items: [
        { icon: ChartLine, label: 'Insights', badge: 'YENİ' },
      ]
    },
    {
      title: 'ARAÇLAR',
      items: [
        { icon: LayoutTemplate, label: 'Şablonlar' },
        { icon: SettingsIcon, label: 'Ayarlar' },
      ]
    }
  ];

  return (
    <aside
      className={`relative h-full bg-[var(--surface-1)] border-r border-[var(--border-default)] transition-all duration-[240ms] ${
        isCollapsed ? 'w-[72px]' : 'w-[280px]'
      }`}
      style={{ transitionTimingFunction: 'var(--ease-out)' }}
    >
      {/* Header - Brand */}
      <div className="h-[72px] px-4 flex items-center justify-between border-b border-[var(--border-default)]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--iolite-500)] to-[var(--aurora-500)] flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          {!isCollapsed && (
            <>
              <div>
                <div className="font-semibold text-[var(--text-primary)]">NeoMagic</div>
                <div className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider">PROMPT OS</div>
              </div>
            </>
          )}
        </div>
        {!isCollapsed && (
          <button
            onClick={() => setIsCollapsed(true)}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--surface-3)] transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-[var(--text-secondary)]" />
          </button>
        )}
      </div>

      {/* Workspace Selector */}
      {!isCollapsed && (
        <div className="p-4">
          <button
            onClick={() => onPageChange('Prompt Lab')}
            className="w-full px-4 py-3 rounded-lg bg-[var(--surface-2)] border border-[var(--border-default)] cursor-pointer hover:bg-[var(--surface-3)] transition-colors text-left"
          >
            <div className="text-sm font-medium text-[var(--text-primary)]">My Workspace</div>
            <div className="text-xs text-[var(--text-tertiary)] mt-0.5">Free Plan</div>
          </button>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-4 pb-4">
        {navigation.map((group, groupIdx) => (
          <div key={groupIdx} className={`${groupIdx > 0 ? 'mt-6' : ''}`}>
            {!isCollapsed && (
              <div
                className="px-4 mb-2 text-[var(--text-overline)] uppercase tracking-wider font-semibold"
                style={{ fontSize: 'var(--text-overline)', letterSpacing: '0.12em' }}
              >
                {group.title}
              </div>
            )}
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activePage === item.label;

                return (
                  <button
                    key={item.label}
                    onClick={() => onPageChange(item.label)}
                    className={`
                      w-full flex items-center gap-3 px-4 py-3 rounded-lg
                      transition-all duration-[240ms] relative group
                      ${isActive
                        ? 'bg-[var(--surface-3)] text-[var(--iolite-300)]'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--surface-3)] hover:text-[var(--text-primary)]'
                      }
                    `}
                    style={{ transitionTimingFunction: 'var(--ease-out)' }}
                  >
                    {isActive && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[var(--iolite-500)] to-[var(--aurora-500)] rounded-r" />
                    )}
                    <Icon
                      className={`w-4 h-4 transition-transform duration-[240ms] ${!isActive && 'group-hover:translate-x-1'}`}
                      style={{ transitionTimingFunction: 'var(--ease-out)' }}
                    />
                    {!isCollapsed && (
                      <>
                        <span className="flex-1 text-left font-medium">{item.label}</span>
                        {item.badge && (
                          <span
                            className={`
                              px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider
                              ${item.badge === 'CORE' ? 'bg-[var(--iolite-500)]/20 text-[var(--iolite-300)]' : ''}
                              ${item.badge === 'LIVE' ? 'bg-[var(--aurora-500)]/20 text-[var(--aurora-500)]' : ''}
                              ${item.badge === 'BETA' ? 'bg-[var(--warning-tint)] text-[var(--warning-500)]' : ''}
                              ${item.badge === 'YENİ' ? 'bg-[var(--success-tint)] text-[var(--success-500)]' : ''}
                            `}
                          >
                            {item.badge}
                          </span>
                        )}
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User Pod */}
      <div className="sticky bottom-0 p-4 border-t border-[var(--border-default)] bg-[var(--surface-1)]">
        <button
          onClick={() => onPageChange('Ayarlar')}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[var(--surface-3)] cursor-pointer transition-colors ${isCollapsed ? 'justify-center' : ''}`}
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--iolite-500)] to-[var(--aurora-500)] flex items-center justify-center text-white text-sm font-semibold">
            U
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-[var(--text-primary)] truncate">User Name</div>
              <div className="text-xs text-[var(--text-tertiary)]">Free Plan</div>
            </div>
          )}
        </button>
      </div>

      {/* Collapse Toggle (when collapsed) */}
      {isCollapsed && (
        <button
          onClick={() => setIsCollapsed(false)}
          className="absolute top-[72px] right-0 translate-x-1/2 w-6 h-6 rounded-full bg-[var(--surface-2)] border border-[var(--border-default)] flex items-center justify-center hover:bg-[var(--surface-3)] transition-colors z-10"
        >
          <ChevronLeft className="w-3 h-3 text-[var(--text-secondary)] rotate-180" />
        </button>
      )}
    </aside>
  );
}
