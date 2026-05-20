import type React from 'react';

export type PageKind = 'workbench' | 'management' | 'archive';

export interface PrimaryActionConfig {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  busy?: boolean;
}

export interface PageSeoConfig {
  title?: string;
  description?: string;
  canonicalPath?: string;
  robots?: string;
  schemaType?: 'SoftwareApplication' | 'WebApplication' | 'Article' | 'FAQPage';
}

export interface PageFaqItem {
  question: string;
  answer: string;
}

export interface PageConfig<TPage extends string = string> {
  id: TPage;
  eyebrow: string;
  title: string;
  description: string;
  pageKind: PageKind;
  layoutPreset: 'workbench' | 'content' | 'archive';
  maxWidth: 'default' | 'wide' | 'full';
  primaryAction?: PrimaryActionConfig;
  aiSummary?: string;
  intentCluster?: string[];
  onThisPage?: string[];
  nextBestAction?: string;
  seo?: PageSeoConfig;
  faqs?: PageFaqItem[];
}

export type SettingsTabId = 'general' | 'providers' | 'integrations' | 'monitoring';

export interface ListRowMeta {
  label: string;
  value: string;
  tone?: 'neutral' | 'info' | 'success' | 'warning' | 'danger';
}

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: 'sm' | 'md' | 'lg';
}
