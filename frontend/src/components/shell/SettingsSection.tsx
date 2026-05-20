import React from 'react';
import { Card, SectionHeader } from '../ui';

interface SettingsSectionProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export function SettingsSection({
  eyebrow,
  title,
  description,
  actions,
  children,
}: SettingsSectionProps) {
  return (
    <Card className="p-6">
      <SectionHeader eyebrow={eyebrow} title={title} description={description} actions={actions} />
      <div className="mt-5">{children}</div>
    </Card>
  );
}

export default SettingsSection;
