import React from 'react';
import { Card, SectionHeader } from '../ui';

interface PageIntroProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}

export function PageIntro({
  eyebrow,
  title,
  description,
  actions,
  children,
}: PageIntroProps) {
  return (
    <Card tone="hero" className="p-6">
      <SectionHeader eyebrow={eyebrow} title={title} description={description} actions={actions} />
      {children && <div className="mt-6">{children}</div>}
    </Card>
  );
}

export default PageIntro;
