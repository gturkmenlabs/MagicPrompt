import React from 'react';

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, subtitle, icon, action, className = '' }: PageHeaderProps) {
  return (
    <header className={`flex flex-wrap items-center justify-between gap-4 ${className}`.trim()}>
      <div className="flex items-center gap-3">
        {icon && <div className="ui-page-header__icon">{icon}</div>}
        <div>
          <h1 className="type-page-title">{title}</h1>
          {subtitle && <p className="ui-helper mt-2">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="flex items-center">{action}</div>}
    </header>
  );
}
