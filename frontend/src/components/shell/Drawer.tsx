import { useEffect } from 'react';
import { cn } from '@/lib/utils';
import type { DrawerProps } from '@/types/ui';

const WIDTH_CLASS: Record<NonNullable<DrawerProps['width']>, string> = {
  sm: 'max-w-md',
  md: 'max-w-2xl',
  lg: 'max-w-4xl',
};

export function Drawer({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  width = 'md',
}: DrawerProps) {
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div className="ui-drawer" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" className="ui-drawer__backdrop" onClick={onClose} aria-label="Close drawer" />
      <div className={cn('ui-drawer__panel', WIDTH_CLASS[width])}>
        <div className="ui-drawer__header">
          <div>
            <p className="ui-eyebrow">Details</p>
            <h2 className="type-section-title mt-2">{title}</h2>
            {description && <p className="ui-helper mt-2">{description}</p>}
          </div>
          <button type="button" className="ui-drawer__close" onClick={onClose} aria-label="Close drawer">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="ui-drawer__body">{children}</div>
        {footer && <div className="ui-drawer__footer">{footer}</div>}
      </div>
    </div>
  );
}

export default Drawer;
