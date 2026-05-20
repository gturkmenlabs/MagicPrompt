import React from 'react';
import { cn } from '@/lib/utils';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  rounded?: 'sm' | 'md' | 'lg' | 'full';
}

export function Skeleton({ className, rounded = 'md', ...props }: SkeletonProps) {
  return <div className={cn('ui-skeleton', `ui-skeleton--${rounded}`, className)} aria-hidden="true" {...props} />;
}

export default Skeleton;
