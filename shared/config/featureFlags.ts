/**
 * Feature flags for NeoMagic v4.0 rollout.
 *
 * Read from environment variables; default OFF for every breaking change.
 * Phase changes always land behind a flag — see docs/v4-roadmap.md.
 *
 * Usage:
 *   import { featureFlags } from '@shared/config/featureFlags';
 *   if (featureFlags.advancedCache) { ... }
 */

const envBool = (key: string, defaultValue = false): boolean => {
  const raw = (typeof process !== 'undefined' ? process.env?.[key] : undefined) ?? '';
  if (raw === '') return defaultValue;
  const v = raw.toLowerCase().trim();
  return v === '1' || v === 'true' || v === 'yes' || v === 'on';
};

export interface FeatureFlags {
  /** Phase 1.1 — L1→L2→L3 cache. When false, falls back to legacy semanticCache. */
  advancedCache: boolean;
  /** Phase 1.2 — HMAC request signing (zero-trust). */
  hmacRequestSigning: boolean;
  /** Phase 1.4 — Redis Streams event bus. */
  eventBus: boolean;
  /** Phase 1.5 — Six-role RBAC + scoped API keys. */
  rbacV1: boolean;
  /** Phase 2.1 — kNN framework auto-selector. */
  frameworkAutoSelect: boolean;
  /** Phase 2.2 — Vulnerability scanner middleware. */
  vulnScanner: boolean;
  /** Phase 2.3 — Meta-prompt self-optimizer. */
  metaPromptOptimizer: boolean;
  /** Phase 3.1 — DAG chain orchestrator. */
  chainOrchestrator: boolean;
  /** Phase 5.1 — Yjs CRDT collaboration. */
  crdtCollab: boolean;
  /** Phase 6.1 — Prompt marketplace (read-only catalog first). */
  promptMarketplace: boolean;
  /** Phase 7.4 — Federated learning opt-in. */
  federatedLearning: boolean;
}

export const featureFlags: Readonly<FeatureFlags> = Object.freeze({
  advancedCache: envBool('FF_ADVANCED_CACHE', false),
  hmacRequestSigning: envBool('FF_HMAC_SIGNING', false),
  eventBus: envBool('FF_EVENT_BUS', false),
  rbacV1: envBool('FF_RBAC_V1', false),
  frameworkAutoSelect: envBool('FF_FRAMEWORK_AUTO', false),
  vulnScanner: envBool('FF_VULN_SCANNER', false),
  metaPromptOptimizer: envBool('FF_META_OPTIMIZER', false),
  chainOrchestrator: envBool('FF_CHAIN_ORCHESTRATOR', false),
  crdtCollab: envBool('FF_CRDT_COLLAB', false),
  promptMarketplace: envBool('FF_PROMPT_MARKETPLACE', false),
  federatedLearning: envBool('FF_FEDERATED_LEARNING', false),
});

/**
 * Override flag at runtime (tests only).
 * Returns a restore function.
 */
export function __overrideFeatureFlag<K extends keyof FeatureFlags>(
  key: K,
  value: FeatureFlags[K],
): () => void {
  const prev = (featureFlags as FeatureFlags)[key];
  (featureFlags as FeatureFlags)[key] = value;
  return () => {
    (featureFlags as FeatureFlags)[key] = prev;
  };
}
