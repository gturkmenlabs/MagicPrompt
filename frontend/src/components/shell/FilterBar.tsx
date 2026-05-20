import React from 'react';
import { cn } from '@/lib/utils';

interface FilterBarProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function FilterBar({ title, description, children, className }: FilterBarProps) {
  return (
    <div className={cn('ui-filter-bar', className)}>
      {(title || description) && (
        <div className="mb-4">
          {title && <p className="text-[14px] font-semibold text-white">{title}</p>}
          {description && <p className="ui-helper mt-2">{description}</p>}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  );
}

export default FilterBar;
