/**
 * Supabase JWT verification middleware.
 * Bearer token → jose ile lokal HS256 verify → user/org context.
 * API key ile geriye uyumluluk: requireAnyAuth her iki yontemi kabul eder.
 */

import { jwtVerify } from 'jose';
import type { Request, Response, NextFunction } from 'express';
import { getPool } from '../db/client';
import { isAuthBypassEnabled } from './auth';

export interface AuthUser {
  userId: string;
  email: string;
  orgId: string | null;
  plan: 'free' | 'pro' | 'team';
  role: 'owner' | 'admin' | 'editor' | 'viewer' | 'member' | null;
  authMethod: 'jwt' | 'apikey';
}

let jwtSecret: Uint8Array | null = null;
function getJwtSecret(): Uint8Array | null {
  if (jwtSecret) return jwtSecret;
  const raw = process.env.SUPABASE_JWT_SECRET;
  if (!raw) return null;
  jwtSecret = new TextEncoder().encode(raw);
  return jwtSecret;
}

/**
 * Supabase JWT'den user bilgisini coz (sub claim).
 * Basariliysa { userId, email } doner, degilse null.
 */
export async function verifySupabaseToken(token: string): Promise<{ userId: string; email: string; provider?: string; userMetadata?: Record<string, unknown> } | null> {
  const secret = getJwtSecret();
  if (!secret) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    const userId = payload.sub as string;
    const email = (payload.email as string) || '';
    if (!userId) return null;
    const provider = (payload as any).app_metadata?.provider as string | undefined;
    const userMetadata = (payload as any).user_metadata as Record<string, unknown> | undefined;
    return { userId, email, provider: provider || 'email', userMetadata };
  } catch {
    return null;
  }
}

/**
 * JWT dogrula ve user/org context'i req.authUser'a yaz.
 * User DB'de yoksa 403 NOT_PROVISIONED doner.
 */
export async function requireSupabaseAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing Authorization header', code: 'NO_TOKEN' });
    return;
  }

  const token = header.slice(7);
  const identity = await verifySupabaseToken(token);
  if (!identity) {
    res.status(401).json({ error: 'Invalid or expired token', code: 'INVALID_TOKEN' });
    return;
  }

  const pool = getPool();
  if (!pool) {
    res.status(503).json({ error: 'Database not available' });
    return;
  }

  const result = await pool.query(
    `SELECT u.id as user_id, u.email, om.org_id, om.role, o.plan
     FROM users u
     LEFT JOIN org_members om ON om.user_id = u.id
     LEFT JOIN organizations o ON o.id = om.org_id
     WHERE u.id = $1::uuid
     LIMIT 1`,
    [identity.userId]
  );

  if (result.rows.length === 0) {
    res.status(403).json({ error: 'Account not provisioned', code: 'NOT_PROVISIONED' });
    return;
  }

  const row = result.rows[0];
  (req as any).authUser = {
    userId: row.user_id,
    email: row.email,
    orgId: row.org_id,
    plan: row.plan || 'free',
    role: row.role,
    authMethod: 'jwt',
  } satisfies AuthUser;
  (req as any).tenantId = row.org_id ?? null;

  next();
}

/**
 * JWT VEYA API key kabul eder. JWT oncelikli.
 * Her iki method de yoksa 401 doner.
 */
export async function requireAnyAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const hasBearer = req.headers.authorization?.startsWith('Bearer ');
  const hasApiKey = !!req.headers['x-api-key'];

  if (hasBearer) {
    return requireSupabaseAuth(req, res, next);
  }
  if (hasApiKey) {
    const { requireApiKey } = await import('./auth');
    return requireApiKey(req, res, next);
  }

  // Auth bypass (dev mode)
  if (isAuthBypassEnabled()) {
    (req as any).apiKey = 'dev-bypass';
    (req as any).apiScopes = ['*'];
    (req as any).tenantId = process.env.SR_DEFAULT_ORG_ID ?? null;
    return next();
  }

  res.status(401).json({ error: 'Authentication required', code: 'NO_AUTH' });
}

/**
 * Opsiyonel auth — JWT veya API key varsa req'e yazar, yoksa next() ile devam eder.
 * Agent gibi endpoint'lerde input yapmadan da kullanim for kullanilir.
 */
export async function optionalAnyAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const hasBearer = req.headers.authorization?.startsWith('Bearer ');
  const hasApiKey = !!req.headers['x-api-key'];

  if (hasBearer) {
    return requireSupabaseAuth(req, res, next);
  }
  if (hasApiKey) {
    const { requireApiKey } = await import('./auth');
    return requireApiKey(req, res, next);
  }

  if (isAuthBypassEnabled()) {
    (req as any).apiKey = 'dev-bypass';
    (req as any).apiScopes = ['*'];
    (req as any).tenantId = process.env.SR_DEFAULT_ORG_ID ?? null;
  }
  next();
}
