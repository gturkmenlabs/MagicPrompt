export type ExperienceEventType =
  | 'page_view'
  | 'rage_click'
  | 'command_palette_open'
  | 'feature_flag_exposure';

export interface ExperienceEvent {
  type: ExperienceEventType;
  ts: number;
  pageId: string;
  pageKind?: string;
  label?: string;
  metadata?: Record<string, string | number | boolean | null>;
}

declare global {
  interface Window {
    neoMagicDataLayer?: ExperienceEvent[];
  }
}

export function pushExperienceEvent(event: Omit<ExperienceEvent, 'ts'>): ExperienceEvent | null {
  if (typeof window === 'undefined') return null;

  const enriched: ExperienceEvent = {
    ...event,
    ts: Date.now(),
  };

  window.neoMagicDataLayer = window.neoMagicDataLayer ?? [];
  window.neoMagicDataLayer.push(enriched);
  window.dispatchEvent(new CustomEvent('neomagic:experience', { detail: enriched }));
  return enriched;
}

export function getFeatureFlag(flag: string, fallback = false): boolean {
  const normalized = flag.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');
  if (!normalized) return fallback;

  try {
    const override = localStorage.getItem(`sr_flag_${normalized.toLowerCase()}`);
    if (override === 'true') return true;
    if (override === 'false') return false;
  } catch {
    // Local overrides are optional.
  }

  const envValue = import.meta.env[`VITE_FLAG_${normalized}`];
  if (envValue === 'true') return true;
  if (envValue === 'false') return false;
  return fallback;
}
