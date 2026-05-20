import React from 'react';
import { cn } from '@/lib/utils';

interface KpiStripProps {
  children: React.ReactNode;
  className?: string;
}

export function KpiStrip({ children, className }: KpiStripProps) {
  return <div className={cn('app-kpi-grid', className)}>{children}</div>;
}

export default KpiStrip;
