/**
 * Auth route'lari — Supabase Auth entegrasyonu.
 * POST /v1/auth/provision — Ilk input sonrasi user + org olusturma
 * GET  /v1/auth/me        — Mevcut user profili
 */

import { Router } from 'express';
import { getPool } from '../db/client';
import { writeAuditLog } from '../lib/auditLog';
import { verifySupabaseToken, requireSupabaseAuth } from '../middleware/supabaseAuth';

const router = Router();

/**
 * POST /v1/auth/provision
 * Supabase signup sonrasi cagrilir.
 * 1. users satiri (Supabase auth.users UUID'si ile)
 * 2. organizations satiri (kisisel workspace)
 * 3. org_members satiri (user = owner)
 * Idempotent: tekrar cagrilirsa mevcut veriyi doner.
 */
router.post('/auth/provision', async (req, res) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing token' });
  }

  const identity = await verifySupabaseToken(header.slice(7));
  if (!identity) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  const { userId, email, provider: authProvider, userMetadata } = identity;
  const name = req.body?.name
    || (userMetadata?.full_name as string)
    || (userMetadata?.name as string)
    || email.split('@')[0];

  const pool = getPool();
  if (!pool) return res.status(503).json({ error: 'Database not available' });

  // Zaten provision edilmis mi?
  const existing = await pool.query(
    `SELECT u.id, u.email, om.org_id, om.role, o.plan
     FROM users u
     LEFT JOIN org_members om ON om.user_id = u.id
     LEFT JOIN organizations o ON o.id = om.org_id
     WHERE u.id = $1::uuid LIMIT 1`,
    [userId]
  );
  if (existing.rows.length > 0) {
    const row = existing.rows[0];
    return res.json({
      userId: row.id,
      email: row.email,
      orgId: row.org_id,
      plan: row.plan || 'free',
      role: row.role || 'owner',
    });
  }

  // Transaction: user + org + membership
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. User
    await client.query(
      `INSERT INTO users (id, email, auth_provider)
       VALUES ($1::uuid, $2, $3)
       ON CONFLICT (id) DO UPDATE SET auth_provider = COALESCE(EXCLUDED.auth_provider, users.auth_provider)`,
      [userId, email, authProvider || 'email']
    );

    // 2. Organization (kisisel workspace)
    const localPart = (email.split('@')[0] ?? email).toLowerCase();
    const slug = localPart.replace(/[^a-z0-9-]/g, '-');
    const orgResult = await client.query(
      `INSERT INTO organizations (name, slug, plan)
       VALUES ($1, $2, 'free')
       ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [`${name}'s Workspace`, `${slug}-${userId.slice(0, 8)}`]
    );
    const orgId = orgResult.rows[0]?.id;
    if (!orgId) {
      throw new Error('Failed to create organization');
    }

    // 3. Membership (owner)
    await client.query(
      `INSERT INTO org_members (org_id, user_id, role)
       VALUES ($1::uuid, $2::uuid, 'owner')
       ON CONFLICT (org_id, user_id) DO NOTHING`,
      [orgId, userId]
    );

    await client.query('COMMIT');

    // Audit log (async, error olsa da devam)
    writeAuditLog(pool, {
      orgId,
      userId,
      action: 'auth_validate',
      resourceType: 'user',
      metadata: { event: 'provision', email },
      ip: req.ip ?? undefined,
    }).catch(() => {});

    res.status(201).json({
      userId,
      email,
      name,
      orgId,
      plan: 'free',
      role: 'owner',
    });
  } catch (e) {
    await client.query('ROLLBACK');
    const msg = e instanceof Error ? e.message : 'Provision failed';
    res.status(500).json({ error: msg });
  } finally {
    client.release();
  }
});

/**
 * GET /v1/auth/me — Authenticated user profili
 */
router.get('/auth/me', requireSupabaseAuth, async (req, res) => {
  const user = (req as any).authUser;
  res.json({
    userId: user.userId,
    email: user.email,
    orgId: user.orgId,
    plan: user.plan,
    role: user.role,
  });
});

export default router;
