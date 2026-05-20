import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

interface BentoCardProps {
  title?: string;
  eyebrow?: string;
  variant?: 'default' | 'spotlight' | 'stat' | 'action' | 'live' | 'empty';
  className?: string;
  children: ReactNode;
  action?: ReactNode;
  footer?: ReactNode;
  padding?: 'compact' | 'standard' | 'wide';
  onClick?: () => void;
}

export function BentoCard({
  title,
  eyebrow,
  variant = 'default',
  className = '',
  children,
  action,
  footer,
  padding = 'standard',
  onClick
}: BentoCardProps) {
  const paddingClass = {
    compact: 'p-4',
    standard: 'p-6',
    wide: 'p-8'
  }[padding];

  const cardClasses = `
    rounded-[var(--radius-lg)]
    border
    ${variant === 'default' ? 'bg-[var(--surface-2)] border-[var(--border-default)]' : ''}
    ${variant === 'spotlight' ? 'bg-[var(--surface-2)] border border-transparent bg-gradient-to-br from-[var(--iolite-500)]/20 via-transparent to-[var(--aurora-500)]/20' : ''}
    ${variant === 'stat' ? 'bg-[var(--surface-2)] border-[var(--border-default)]' : ''}
    ${variant === 'action' ? 'bg-[var(--surface-2)] border-[var(--border-default)] cursor-pointer hover:bg-[var(--surface-3)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.06)] transition-all' : ''}
    ${variant === 'live' ? 'bg-[var(--surface-2)] border-[var(--border-default)] relative' : ''}
    ${variant === 'empty' ? 'bg-[var(--surface-2)] border-dashed border-[var(--border-default)]' : ''}
    ${paddingClass}
    ${className}
  `;

  return (
    <div
      className={cardClasses}
      onClick={onClick}
      style={{
        transition: 'all var(--duration-fast) var(--ease-out)',
      }}
    >
      {/* Live indicator */}
      {variant === 'live' && (
        <div className="absolute top-4 left-4 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[var(--ai-pulse)] animate-pulse" />
          <span className="text-xs font-semibold text-[var(--aurora-500)] uppercase tracking-wider">LIVE</span>
        </div>
      )}

      {/* Header */}
      {(eyebrow || title || action) && (
        <div className="mb-4">
          {eyebrow && (
            <div
              className="text-[var(--iolite-500)] font-semibold uppercase tracking-wider mb-2"
              style={{ fontSize: 'var(--text-overline)', letterSpacing: '0.12em' }}
            >
              {eyebrow}
            </div>
          )}
          {(title || action) && (
            <div className="flex items-start justify-between gap-4">
              {title && <h3 className="text-[var(--text-primary)] font-semibold">{title}</h3>}
              {action && <div>{action}</div>}
            </div>
          )}
        </div>
      )}

      {/* Body */}
      <div className={variant === 'stat' ? 'text-center' : ''}>
        {children}
      </div>

      {/* Footer */}
      {footer && (
        <div className="mt-4 pt-4 border-t border-[var(--border-subtle)]">
          {footer}
        </div>
      )}
    </div>
  );
}
