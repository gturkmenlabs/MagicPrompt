/**
 * OWASP uyumlu API key verification middleware.
 * - x-api-key header zorunlu (protected routes for)
 * - Key'ler loglarda asla gorunmez
 * - Scoped API key desteği: API_KEYS_SCOPED_JSON
 * - Legacy key desteği: API_KEYS (+ opsiyonel API_KEY_DEFAULT_SCOPES)
 */

import type { Request, Response, NextFunction } from 'express';

const HEADER = 'x-api-key';

export type ApiScope = string;

interface ScopedApiKeyConfig {
  key: string;
  scopes: ApiScope[];
  tenantId?: string;
}

interface ResolvedApiKey {
  key: string;
  scopes: ApiScope[];
  tenantId: string | null;
  source: 'scoped' | 'legacy' | 'dev-bypass';
}

function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

export function isAuthBypassEnabled(): boolean {
  return process.env.DISABLE_API_KEY_AUTH === 'true' && !isProduction();
}

function getDefaultTenantId(): string | null {
  const orgId = process.env.SR_DEFAULT_ORG_ID?.trim();
  return orgId ? orgId : null;
}

/** Legacy API key seti */
function getLegacyKeys(): Set<string> {
  return new Set(
    (process.env.API_KEYS ?? '')
      .replace(/\r/g, '')
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean)
  );
}

function getLegacyDefaultScopes(): ApiScope[] {
  return (process.env.API_KEY_DEFAULT_SCOPES ?? '')
    .replace(/\r/g, '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

function loadScopedApiConfigs(): ScopedApiKeyConfig[] {
  const raw = process.env.API_KEYS_SCOPED_JSON?.trim();
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((entry) => entry && typeof entry === 'object')
      .map((entry) => {
        const key = typeof entry.key === 'string' ? entry.key.trim() : '';
        const scopes = Array.isArray(entry.scopes)
          ? entry.scopes.map((scope) => String(scope).trim()).filter(Boolean)
          : [];
        const tenantId = typeof entry.tenantId === 'string' && entry.tenantId.trim()
          ? entry.tenantId.trim()
          : undefined;
        return { key, scopes, tenantId };
      })
      .filter((entry) => entry.key.length > 0);
  } catch {
    return [];
  }
}

/**
 * Basit timing-safe karsilastirma (key sizintisini onler).
 */
function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

function resolveApiKey(rawKey: unknown): ResolvedApiKey | null {
  if (typeof rawKey !== 'string') return null;
  const trimmed = rawKey.trim();
  if (!trimmed) return null;

  for (const entry of loadScopedApiConfigs()) {
    if (secureCompare(trimmed, entry.key)) {
      return {
        key: trimmed,
        scopes: entry.scopes,
        tenantId: entry.tenantId ?? getDefaultTenantId(),
        source: 'scoped',
      };
    }
  }

  for (const key of getLegacyKeys()) {
    if (secureCompare(trimmed, key)) {
      return {
        key: trimmed,
        scopes: getLegacyDefaultScopes(),
        tenantId: getDefaultTenantId(),
        source: 'legacy',
      };
    }
  }

  return null;
}

function applyResolvedApiKey(req: Request, resolved: ResolvedApiKey): void {
  (req as any).apiKey = resolved.key;
  (req as any).apiScopes = resolved.scopes;
  (req as any).tenantId = resolved.tenantId;
}

function hasScope(scopes: ApiScope[], requiredScope: ApiScope): boolean {
  if (scopes.includes('*')) return true;
  if (scopes.includes(requiredScope)) return true;
  const [resource] = requiredScope.split(':');
  if (resource && scopes.includes(`${resource}:*`)) return true;
  return false;
}

function getRequiredScopes(input: ApiScope | ApiScope[]): ApiScope[] {
  return Array.isArray(input) ? input : [input];
}

/**
 * API key verification middleware.
 * Gecersiz/eksik key → 401 Unauthorized.
 */
export function requireApiKey(req: Request, res: Response, next: NextFunction): void {
  if (isAuthBypassEnabled()) {
    applyResolvedApiKey(req, {
      key: 'dev-bypass',
      scopes: ['*'],
      tenantId: getDefaultTenantId(),
      source: 'dev-bypass',
    });
    return next();
  }

  const key = req.header(HEADER) ?? req.query['x-api-key'];
  const resolved = resolveApiKey(key);
  if (!resolved) {
    if (typeof key !== 'string' || !key.trim()) {
      res.status(401).json({ error: 'Missing x-api-key header', code: 'MISSING_API_KEY' });
      return;
    }
    res.status(401).json({ error: 'Invalid API key', code: 'INVALID_API_KEY' });
    return;
  }
  applyResolvedApiKey(req, resolved);
  next();
}

/**
 * Opsiyonel API key — varsa req.apiKey'ye yazar, yoksa devam eder.
 */
export function optionalApiKey(req: Request, _res: Response, next: NextFunction): void {
  if (isAuthBypassEnabled()) {
    applyResolvedApiKey(req, {
      key: 'dev-bypass',
      scopes: ['*'],
      tenantId: getDefaultTenantId(),
      source: 'dev-bypass',
    });
    return next();
  }

  const key = req.header(HEADER) ?? req.query['x-api-key'];
  const resolved = resolveApiKey(key);
  if (resolved) {
    applyResolvedApiKey(req, resolved);
  }
  next();
}

/**
 * API key scope verification middleware.
 * - JWT auth ile gelen isteklerde scope aranmaz (RBAC controls role-based auth).
 * - API key ile gelen isteklerde scope zorunludur.
 */
export function requireApiScope(required: ApiScope | ApiScope[]) {
  const requiredScopes = getRequiredScopes(required);
  return (req: Request, res: Response, next: NextFunction): void => {
    if ((req as any).authUser) {
      next();
      return;
    }

    if (isAuthBypassEnabled()) {
      next();
      return;
    }

    const key = (req as any).apiKey;
    if (!key) {
      res.status(401).json({ error: 'Authentication required', code: 'NO_AUTH' });
      return;
    }

    const scopes = Array.isArray((req as any).apiScopes) ? (req as any).apiScopes as ApiScope[] : [];
    const missing = requiredScopes.filter((scope) => !hasScope(scopes, scope));
    if (missing.length > 0) {
      res.status(403).json({
        error: 'API key is missing required scope',
        code: 'INSUFFICIENT_API_SCOPE',
        required: requiredScopes,
      });
      return;
    }
    next();
  };
}
