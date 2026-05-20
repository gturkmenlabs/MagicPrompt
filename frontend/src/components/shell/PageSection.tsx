import React from 'react';
import { Card, SectionHeader } from '../ui';

interface PageSectionProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  tone?: 'default' | 'muted' | 'interactive' | 'hero';
  className?: string;
  align?: 'left' | 'center';
  children: React.ReactNode;
}

export function PageSection({
  eyebrow,
  title,
  description,
  actions,
  tone = 'default',
  className,
  align = 'left',
  children,
}: PageSectionProps) {
  return (
    <Card tone={tone} className={className ? `p-5 ${className}` : 'p-5'}>
      <SectionHeader eyebrow={eyebrow} title={title} description={description} actions={actions} align={align} />
      <div className="mt-5">{children}</div>
    </Card>
  );
}

export default PageSection;
