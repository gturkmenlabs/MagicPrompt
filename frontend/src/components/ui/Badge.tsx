import React from 'react';
import { cn } from '@/lib/utils';

export type BadgeTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';
export type BadgeSize = 'sm' | 'md' | 'lg';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  size?: BadgeSize;
  dot?: boolean;
}

export function Badge({ className, tone = 'neutral', size = 'md', dot = false, onClick, onKeyDown, children, ...props }: BadgeProps) {
  const tones = {
    neutral: 'ui-badge--neutral',
    info: 'ui-badge--info',
    success: 'ui-badge--success',
    warning: 'ui-badge--warning',
    danger: 'ui-badge--danger',
  };
  const sizes = {
    sm: 'ui-badge--sm',
    md: 'ui-badge--md',
    lg: 'ui-badge--lg',
  };
  const interactive = Boolean(onClick);

  return (
    <span
      className={cn(
        'ui-badge',
        tones[tone],
        sizes[size],
        interactive && 'ui-badge--interactive',
        className
      )}
      onClick={onClick}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        if (!onClick || event.defaultPrevented) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick(event as unknown as React.MouseEvent<HTMLSpanElement>);
        }
      }}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      {...props}
    >
      {dot && <span className="ui-badge__dot" aria-hidden="true" />}
      {children}
    </span>
  );
}

export default Badge;
