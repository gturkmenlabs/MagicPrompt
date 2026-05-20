import { useEffect, useRef } from 'react';
import type { PageConfig } from '@/types/ui';
import type { ClientProvider } from '@/services/unifiedProviderClient';
import { pushExperienceEvent } from '@/services/experienceLayer';
import { recordEvent, type TelemetryConsent } from '@/services/telemetry';
import type { Framework } from '@/types';

interface UseExperienceLayerOptions {
  config: PageConfig;
  telemetryConsent: TelemetryConsent;
  domainId: string;
  framework: Framework;
  provider: ClientProvider;
}

interface ClickSample {
  x: number;
  y: number;
  ts: number;
  target: EventTarget | null;
}

const RAGE_CLICK_WINDOW_MS = 900;
const RAGE_CLICK_RADIUS_PX = 32;
const RAGE_CLICK_COUNT = 3;

function isNearbyClick(a: ClickSample, b: ClickSample): boolean {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy) <= RAGE_CLICK_RADIUS_PX && a.target === b.target;
}

export function useExperienceLayer({
  config,
  telemetryConsent,
  domainId,
  framework,
  provider,
}: UseExperienceLayerOptions): void {
  const recentClicksRef = useRef<ClickSample[]>([]);
  const lastRageClickAtRef = useRef(0);

  useEffect(() => {
    pushExperienceEvent({
      type: 'page_view',
      pageId: String(config.id),
      pageKind: config.pageKind,
      metadata: {
        layout: config.layoutPreset,
      },
    });
    recordEvent({
      type: 'page_view',
      domainId,
      framework,
      provider,
    }, telemetryConsent);
  }, [config.id, config.layoutPreset, config.pageKind, domainId, framework, provider, telemetryConsent]);

  useEffect(() => {
    const handlePointerUp = (event: PointerEvent) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;

      const now = Date.now();
      const nextSample: ClickSample = {
        x: event.clientX,
        y: event.clientY,
        ts: now,
        target: event.target,
      };

      const recent = [...recentClicksRef.current, nextSample]
        .filter((sample) => now - sample.ts <= RAGE_CLICK_WINDOW_MS);
      recentClicksRef.current = recent;

      const matches = recent.filter((sample) => isNearbyClick(sample, nextSample));
      if (matches.length < RAGE_CLICK_COUNT || now - lastRageClickAtRef.current < RAGE_CLICK_WINDOW_MS) {
        return;
      }

      lastRageClickAtRef.current = now;
      const target = event.target instanceof HTMLElement
        ? event.target.closest('button,a,input,textarea,select,[role="button"]')
        : null;
      const label = target instanceof HTMLElement
        ? (target.getAttribute('aria-label') || target.textContent || target.tagName).trim().slice(0, 80)
        : 'unknown';

      pushExperienceEvent({
        type: 'rage_click',
        pageId: String(config.id),
        pageKind: config.pageKind,
        label,
      });
      recordEvent({
        type: 'rage_click',
        domainId,
        framework,
        provider,
      }, telemetryConsent);
    };

    window.addEventListener('pointerup', handlePointerUp, { passive: true });
    return () => window.removeEventListener('pointerup', handlePointerUp);
  }, [config.id, config.pageKind, domainId, framework, provider, telemetryConsent]);
}
