import React from 'react';
import { cn } from '@/lib/utils';

interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
  align?: 'left' | 'center';
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
  align = 'left',
}: SectionHeaderProps) {
  const isCenter = align === 'center';

  return (
    <div className={cn(
      'flex flex-wrap gap-4',
      isCenter ? 'flex-col items-center justify-center text-center' : 'items-start justify-between',
      className
    )}>
      <div className={cn("min-w-0", isCenter && "flex flex-col items-center")}>
        {eyebrow && <p className="ui-eyebrow">{eyebrow}</p>}
        <h2 className="type-section-title">{title}</h2>
        {description && <p className={cn("ui-helper mt-2", isCenter && "max-w-md text-center")}>{description}</p>}
      </div>
      {actions && <div className={cn("flex flex-wrap items-center gap-2", isCenter && "justify-center mt-2")}>{actions}</div>}
    </div>
  );
}

export default SectionHeader;
