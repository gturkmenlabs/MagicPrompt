import React from 'react';
import { cn } from '@/lib/utils';
import { Card } from './Card';

type StatTone = 'info' | 'success' | 'warning' | 'danger' | 'neutral';

interface StatCardProps {
  label: string;
  value: string;
  meta?: string;
  icon?: React.ReactNode;
  tone?: StatTone;
  className?: string;
}

export function StatCard({
  label,
  value,
  meta,
  icon,
  tone = 'neutral',
  className,
}: StatCardProps) {
  return (
    <Card className={cn('ui-stat-card', `ui-stat-card--${tone}`, className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="ui-stat-card__label">{label}</p>
          <p className="ui-stat-card__value">{value}</p>
          {meta && <p className="ui-stat-card__meta">{meta}</p>}
        </div>
        {icon && <span className="ui-stat-card__icon">{icon}</span>}
      </div>
    </Card>
  );
}

export default StatCard;
