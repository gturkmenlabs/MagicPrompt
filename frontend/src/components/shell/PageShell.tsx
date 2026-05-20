import React from 'react';
import { cn } from '@/lib/utils';

interface PageShellProps {
  sidebar?: React.ReactNode;
  toolbar?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function PageShell({ sidebar, toolbar, footer, children, className }: PageShellProps) {
  return (
    <div className="page-shell">
      <div className="page-shell__ambient" aria-hidden="true">
        <div className="page-shell__ambient-grid" />
        <div className="page-shell__ambient-sheen" />
      </div>
      {sidebar}
      <div className={cn('page-shell__body', className)}>
        {toolbar}
        <div className="page-shell__content">{children}</div>
        {footer}
      </div>
    </div>
  );
}

export default PageShell;
