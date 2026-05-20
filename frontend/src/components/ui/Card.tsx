import React from 'react';
import { cn } from '@/lib/utils';

export type CardTone = 'default' | 'muted' | 'interactive' | 'hero' | 'outline' | 'glass' | 'elevated';
export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  tone?: CardTone;
  variant?: CardTone;
  padding?: CardPadding;
}

export function Card({ className, tone = 'default', variant, padding = 'none', ...props }: CardProps) {
  const activeTone = variant ?? tone;
  const tones = {
    default: 'ui-card--default',
    muted: 'ui-card--muted',
    interactive: 'ui-card--interactive',
    hero: 'ui-card--hero',
    outline: 'ui-card--outline',
    glass: 'ui-card--glass',
    elevated: 'ui-card--elevated',
  };

  const paddings = {
    none: '',
    sm: 'ui-card--pad-sm',
    md: 'ui-card--pad-md',
    lg: 'ui-card--pad-lg',
  };

  return <div className={cn('ui-card bento-card', tones[activeTone], paddings[padding], className)} {...props} />;
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('ui-card-header', className)} {...props} />;
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('ui-card-content', className)} {...props} />;
}

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('ui-card-footer', className)} {...props} />;
}

export default Card;
