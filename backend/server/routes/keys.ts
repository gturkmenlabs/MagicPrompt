import { Router } from 'express';
import { requireSupabaseAuth } from '../middleware/supabaseAuth';
import { requireRole } from '../middleware/rbac';
import {
  deleteOrgProviderApiKey,
  getProviderKeyStatus,
  normalizeProviderKeyName,
  upsertOrgProviderApiKey,
} from '../lib/providerApiKeys';

const router = Router();

function getOrgAndUser(req: any): { orgId: string | null; userId: string | null } {
  return {
    orgId: req?.authUser?.orgId ?? null,
    userId: req?.authUser?.userId ?? null,
  };
}

router.get('/keys/status', requireSupabaseAuth, requireRole('admin'), async (req, res) => {
  try {
    const { orgId } = getOrgAndUser(req);
    if (!orgId) {
      return res.status(400).json({ error: 'Organization context is required', code: 'NO_ORG' });
    }

    const providers = await getProviderKeyStatus(orgId);
    res.json({ orgId, providers });
  } catch (error: any) {
    res.status(500).json({ error: error?.message ?? 'Failed to load key status' });
  }
});

router.put('/keys/:provider', requireSupabaseAuth, requireRole('admin'), async (req, res) => {
  try {
    const provider = normalizeProviderKeyName(String(req.params.provider ?? '').trim());
    if (!provider) {
      return res.status(400).json({ error: 'Unsupported provider', code: 'INVALID_PROVIDER' });
    }

    const apiKey = typeof req.body?.apiKey === 'string' ? req.body.apiKey.trim() : '';
    if (!apiKey) {
      return res.status(400).json({ error: 'apiKey is required', code: 'MISSING_API_KEY' });
    }

    const { orgId, userId } = getOrgAndUser(req);
    if (!orgId) {
      return res.status(400).json({ error: 'Organization context is required', code: 'NO_ORG' });
    }

    await upsertOrgProviderApiKey({
      orgId,
      provider,
      apiKey,
      actorUserId: userId,
    });

    res.json({
      ok: true,
      provider,
      source: 'org',
      configured: true,
    });
  } catch (error: any) {
    res.status(500).json({ error: error?.message ?? 'Failed to save provider key' });
  }
});

router.delete('/keys/:provider', requireSupabaseAuth, requireRole('admin'), async (req, res) => {
  try {
    const provider = normalizeProviderKeyName(String(req.params.provider ?? '').trim());
    if (!provider) {
      return res.status(400).json({ error: 'Unsupported provider', code: 'INVALID_PROVIDER' });
    }

    const { orgId } = getOrgAndUser(req);
    if (!orgId) {
      return res.status(400).json({ error: 'Organization context is required', code: 'NO_ORG' });
    }

    const deleted = await deleteOrgProviderApiKey(orgId, provider);
    res.json({
      ok: true,
      provider,
      deleted,
    });
  } catch (error: any) {
    res.status(500).json({ error: error?.message ?? 'Failed to delete provider key' });
  }
});

export default router;
