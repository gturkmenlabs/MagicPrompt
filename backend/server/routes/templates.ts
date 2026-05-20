import { Router } from 'express';
import crypto from 'node:crypto';
import { getPool } from '../db/client';
import { optionalApiKey, requireApiScope } from '../middleware/auth';
import { apiRateLimiter } from '../middleware/rateLimit';
import { requireAnyAuth } from '../middleware/supabaseAuth';
import { getRecommendations, suggestFramework, type UserContext } from '@/services/templateRecommendations';

const router = Router();
const writeAuth = [optionalApiKey, apiRateLimiter, requireAnyAuth, requireApiScope('templates:write')];
const DB_UNAVAILABLE_CODES = new Set([
  'ECONNREFUSED',
  'ECONNRESET',
  'ENOTFOUND',
  'EHOSTUNREACH',
  'ETIMEDOUT',
  '08001',
  '08006',
  '57P01',
  '57P03',
]);

function isDbUnavailableError(error: unknown): boolean {
  const queue: unknown[] = [error];

  while (queue.length > 0) {
    const current = queue.shift() as
      | { code?: string; message?: string; cause?: unknown; errors?: unknown[] }
      | undefined;

    if (!current || typeof current !== 'object') continue;
    if (typeof current.code === 'string' && DB_UNAVAILABLE_CODES.has(current.code)) {
      return true;
    }
    if (typeof current.message === 'string' && /connect ECONNREFUSED|database unavailable/i.test(current.message)) {
      return true;
    }
    if (current.cause) queue.push(current.cause);
    if (Array.isArray(current.errors)) queue.push(...current.errors);
  }

  return false;
}

function stableApiKeyActor(apiKey: string): { userId: string; email: string } {
  const bytes = crypto.createHash('sha256').update(apiKey).digest().subarray(0, 16);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  const userId = [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join('-');
  const email = `apikey-${hex.slice(0, 12)}@local.neomagic`;
  return { userId, email };
}

async function resolveTemplateActor(
  req: any,
  pool: { query: (queryText: string, params?: any[]) => Promise<any> }
): Promise<{ userId: string | null; email: string | null }> {
  if (req.authUser?.userId) {
    return {
      userId: req.authUser.userId,
      email: req.authUser.email ?? null,
    };
  }

  const apiKey = typeof req.apiKey === 'string' ? req.apiKey.trim() : '';
  if (!apiKey) {
    return { userId: null, email: null };
  }

  const actor = stableApiKeyActor(apiKey);
  await pool.query(
    `INSERT INTO users (id, email, auth_provider)
     VALUES ($1::uuid, $2, 'apikey')
     ON CONFLICT (id) DO NOTHING`,
    [actor.userId, actor.email]
  );
  return {
    userId: actor.userId,
    email: actor.email,
  };
}

router.get('/community', optionalApiKey, apiRateLimiter, async (req, res) => {
  const page = parseInt(req.query.page as string, 10) || 1;
  const limit = Math.min(parseInt(req.query.limit as string, 10) || 20, 50);

  try {
    const pool = getPool();
    if (!pool) {
      return res.json({ templates: [], page, limit, unavailable: true });
    }

    const offset = (page - 1) * limit;
    const sortBy = (req.query.sortBy as string) || 'popular';
    const domain = req.query.domain as string;

    let orderBy = 'rating DESC, use_count DESC';
    if (sortBy === 'newest') orderBy = 'created_at DESC';
    else if (sortBy === 'rating') orderBy = 'rating DESC, rating_count DESC';

    let domainFilter = '';
    const params: any[] = [limit, offset];
    if (domain && domain !== 'all') {
      domainFilter = 'AND domain_id = $3';
      params.push(domain);
    }

    const result = await pool.query(
      `SELECT 
        id, name, name_en, description, description_en, domain_id, framework,
        intent_tr, intent_en, tags, author_id, author_name, rating, rating_count,
        use_count, fork_count, is_official, is_featured, created_at, updated_at
      FROM shared_templates
      WHERE is_approved = true ${domainFilter}
      ORDER BY ${orderBy}
      LIMIT $1 OFFSET $2`,
      params
    );

    const templates = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      nameEn: row.name_en,
      description: row.description,
      descriptionEn: row.description_en,
      domainId: row.domain_id,
      framework: row.framework,
      intentTr: row.intent_tr,
      intentEn: row.intent_en,
      tags: row.tags || [],
      authorId: row.author_id,
      authorName: row.author_name,
      rating: parseFloat(row.rating) || 0,
      ratingCount: row.rating_count || 0,
      useCount: row.use_count || 0,
      forkCount: row.fork_count || 0,
      isOfficial: row.is_official,
      isFeatured: row.is_featured,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    res.json({ templates, page, limit });
  } catch (e: any) {
    if (isDbUnavailableError(e)) {
      console.warn('Community templates unavailable; returning empty list.', e);
      return res.json({ templates: [], page, limit, unavailable: true });
    }
    console.error('Failed to fetch community templates:', e);
    res.status(500).json({ error: e.message });
  }
});

router.post('/custom', ...writeAuth, async (req, res) => {
  try {
    const pool = getPool();
    if (!pool) {
      return res.status(503).json({ error: 'Database not available' });
    }

    const { name, nameEn, description, descriptionEn, domainId, framework, intentTr, intentEn, tags } = req.body || {};
    
    if (!name || !nameEn || !description || !descriptionEn || !intentTr || !intentEn) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const id = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const actor = await resolveTemplateActor(req as any, pool as any);
    const userId = actor.userId;
    const userEmail = actor.email;

    await pool.query(
      `INSERT INTO shared_templates 
        (id, name, name_en, description, description_en, domain_id, framework, intent_tr, intent_en, tags, author_id, author_name, is_approved, is_official)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, false, false)`,
      [id, name, nameEn, description, descriptionEn, domainId || 'general', framework || 'AUTO', intentTr, intentEn, tags || [], userId, userEmail]
    );

    res.status(201).json({ 
      id, 
      message: 'Template submitted for review' 
    });
  } catch (e: any) {
    console.error('Failed to create custom template:', e);
    res.status(500).json({ error: e.message });
  }
});

router.post('/:id/rate', ...writeAuth, async (req, res) => {
  try {
    const pool = getPool();
    if (!pool) {
      return res.status(503).json({ error: 'Database not available' });
    }

    const templateId = req.params.id;
    const { rating } = req.body || {};
    const actor = await resolveTemplateActor(req as any, pool as any);
    const userId = actor.userId;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const existingRating = await pool.query(
      'SELECT id FROM template_ratings WHERE template_id = $1 AND user_id = $2',
      [templateId, userId]
    );

    if (existingRating.rows.length > 0) {
      await pool.query(
        'UPDATE template_ratings SET rating = $1, updated_at = NOW() WHERE template_id = $2 AND user_id = $3',
        [rating, templateId, userId]
      );
    } else {
      await pool.query(
        'INSERT INTO template_ratings (template_id, user_id, rating) VALUES ($1, $2, $3)',
        [templateId, userId, rating]
      );
    }

    const avgResult = await pool.query(
      'SELECT AVG(rating) as avg, COUNT(*) as count FROM template_ratings WHERE template_id = $1',
      [templateId]
    );

    const newRating = parseFloat(avgResult.rows[0].avg) || 0;
    const newCount = parseInt(avgResult.rows[0].count, 10) || 0;

    await pool.query(
      'UPDATE shared_templates SET rating = $1, rating_count = $2 WHERE id = $3',
      [newRating, newCount, templateId]
    );

    res.json({ rating: newRating, ratingCount: newCount });
  } catch (e: any) {
    console.error('Failed to rate template:', e);
    res.status(500).json({ error: e.message });
  }
});

router.post('/:id/use', ...writeAuth, async (req, res) => {
  try {
    const pool = getPool();
    if (!pool) {
      return res.json({ success: true });
    }

    const templateId = req.params.id;
    await pool.query(
      'UPDATE shared_templates SET use_count = use_count + 1 WHERE id = $1',
      [templateId]
    );

    res.json({ success: true });
  } catch (e: any) {
    console.error('Failed to increment use count:', e);
    res.json({ success: true });
  }
});

router.post('/:id/fork', ...writeAuth, async (req, res) => {
  try {
    const pool = getPool();
    if (!pool) {
      return res.status(503).json({ error: 'Database not available' });
    }

    const templateId = req.params.id;
    const actor = await resolveTemplateActor(req as any, pool as any);
    const userId = actor.userId;
    const userEmail = actor.email;

    const original = await pool.query(
      'SELECT * FROM shared_templates WHERE id = $1',
      [templateId]
    );

    if (original.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const orig = original.rows[0];
    const newId = `fork-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    await pool.query(
      `INSERT INTO shared_templates 
        (id, name, name_en, description, description_en, domain_id, framework, intent_tr, intent_en, tags, author_id, author_name, forked_from, is_approved, is_official)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, false, false)`,
      [newId, orig.name, orig.name_en, orig.description, orig.description_en, orig.domain_id, orig.framework, orig.intent_tr, orig.intent_en, orig.tags, userId, userEmail, templateId]
    );

    await pool.query(
      'UPDATE shared_templates SET fork_count = fork_count + 1 WHERE id = $1',
      [templateId]
    );

    res.status(201).json({ id: newId, message: 'Template forked successfully' });
  } catch (e: any) {
    console.error('Failed to fork template:', e);
    res.status(500).json({ error: e.message });
  }
});

router.post('/recommend', optionalApiKey, apiRateLimiter, async (req, res) => {
  try {
    const { context, config } = req.body || {};
    
    const userContext: UserContext = {
      recentIntents: context?.recentIntents || [],
      recentFrameworks: context?.recentFrameworks || [],
      recentDomains: context?.recentDomains || [],
      recentTemplates: context?.recentTemplates || [],
      favorites: context?.favorites || [],
      currentDomain: context?.currentDomain,
      currentFramework: context?.currentFramework,
    };

    const recommendations = getRecommendations(userContext, config);
    
    res.json({ recommendations });
  } catch (e: any) {
    console.error('Failed to get recommendations:', e);
    res.status(500).json({ error: e.message });
  }
});

router.post('/suggest-framework', optionalApiKey, apiRateLimiter, async (req, res) => {
  try {
    const { intent, domain } = req.body || {};
    
    if (!intent) {
      return res.status(400).json({ error: 'intent is required' });
    }

    const framework = suggestFramework(intent, domain);
    res.json({ framework });
  } catch (e: any) {
    console.error('Failed to suggest framework:', e);
    res.status(500).json({ error: e.message });
  }
});

router.post('/suggest-intent', optionalApiKey, apiRateLimiter, async (req, res) => {
  try {
    const { name, description } = req.body || {};
    
    if (!name && !description) {
      return res.status(400).json({ error: 'name or description is required' });
    }

    const suggestions = [
      `Create a detailed guide for ${name || 'this task'}. Consider best practices, edge cases, and provide examples.`,
      `Analyze and provide recommendations for ${name || 'this challenge'}. Include key considerations, potential risks, and actionable steps.`,
      `Design a solution for ${name || 'this problem'}. Focus on scalability, maintainability, and performance optimization.`,
      `Develop a comprehensive strategy for ${name || 'this objective'}. Break down into phases, identify dependencies, and define success metrics.`,
    ];

    res.json({ suggestions });
  } catch (e: any) {
    console.error('Failed to suggest intent:', e);
    res.status(500).json({ error: e.message });
  }
});

router.get('/collections', optionalApiKey, apiRateLimiter, async (req, res) => {
  try {
    const pool = getPool();
    if (!pool) {
      return res.json({ collections: [], unavailable: true });
    }

    const userId = (req as any).authUser?.userId;
    if (!userId) {
      return res.json({ collections: [] });
    }

    const result = await pool.query(
      `SELECT id, name, description, icon, color, template_ids, is_public, is_pinned, created_at, updated_at, use_count, tags
       FROM template_collections
       WHERE author_id = $1
       ORDER BY is_pinned DESC, updated_at DESC`,
      [userId]
    );

    const collections = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      icon: row.icon,
      color: row.color,
      templateIds: row.template_ids || [],
      isPublic: row.is_public,
      isPinned: row.is_pinned,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      useCount: row.use_count,
      tags: row.tags || [],
    }));

    res.json({ collections });
  } catch (e: any) {
    if (isDbUnavailableError(e)) {
      console.warn('Template collections unavailable; returning empty list.', e);
      return res.json({ collections: [], unavailable: true });
    }
    console.error('Failed to fetch collections:', e);
    res.status(500).json({ error: e.message });
  }
});

router.post('/collections', optionalApiKey, apiRateLimiter, async (req, res) => {
  try {
    const pool = getPool();
    if (!pool) {
      return res.status(503).json({ error: 'Database not available' });
    }

    const userId = (req as any).authUser?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { name, description, icon, color, templateIds, isPublic, tags } = req.body || {};
    
    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }

    const id = `col-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    await pool.query(
      `INSERT INTO template_collections 
        (id, name, description, icon, color, template_ids, is_public, author_id, tags)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [id, name, description || null, icon || '📁', color || '#06e8f9', templateIds || [], isPublic || false, userId, tags || []]
    );

    res.status(201).json({ 
      id, 
      name, 
      description, 
      icon: icon || '📁', 
      color: color || '#06e8f9', 
      templateIds: templateIds || [], 
      isPublic: isPublic || false,
      tags: tags || [],
    });
  } catch (e: any) {
    console.error('Failed to create collection:', e);
    res.status(500).json({ error: e.message });
  }
});

router.put('/collections/:id', optionalApiKey, apiRateLimiter, async (req, res) => {
  try {
    const pool = getPool();
    if (!pool) {
      return res.status(503).json({ error: 'Database not available' });
    }

    const collectionId = req.params.id;
    const userId = (req as any).authUser?.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { name, description, icon, color, templateIds, isPublic, isPinned, tags } = req.body || {};

    const existing = await pool.query(
      'SELECT id FROM template_collections WHERE id = $1 AND author_id = $2',
      [collectionId, userId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Collection not found' });
    }

    await pool.query(
      `UPDATE template_collections 
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           icon = COALESCE($3, icon),
           color = COALESCE($4, color),
           template_ids = COALESCE($5, template_ids),
           is_public = COALESCE($6, is_public),
           is_pinned = COALESCE($7, is_pinned),
           tags = COALESCE($8, tags),
           updated_at = NOW()
       WHERE id = $9 AND author_id = $10`,
      [name, description, icon, color, templateIds, isPublic, isPinned, tags, collectionId, userId]
    );

    res.json({ success: true });
  } catch (e: any) {
    console.error('Failed to update collection:', e);
    res.status(500).json({ error: e.message });
  }
});

router.delete('/collections/:id', optionalApiKey, apiRateLimiter, async (req, res) => {
  try {
    const pool = getPool();
    if (!pool) {
      return res.status(503).json({ error: 'Database not available' });
    }

    const collectionId = req.params.id;
    const userId = (req as any).authUser?.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    await pool.query(
      'DELETE FROM template_collections WHERE id = $1 AND author_id = $2',
      [collectionId, userId]
    );

    res.status(204).send();
  } catch (e: any) {
    console.error('Failed to delete collection:', e);
    res.status(500).json({ error: e.message });
  }
});

router.post('/collections/sync', optionalApiKey, apiRateLimiter, async (req, res) => {
  try {
    const pool = getPool();
    if (!pool) {
      return res.json({ success: true });
    }

    const userId = (req as any).authUser?.userId;
    if (!userId) {
      return res.json({ success: true });
    }

    const { collections } = req.body || { collections: [] };
    
    for (const col of collections) {
      const existing = await pool.query(
        'SELECT id FROM template_collections WHERE id = $1',
        [col.id]
      );

      if (existing.rows.length > 0) {
        await pool.query(
          `UPDATE template_collections 
           SET name = $1, description = $2, icon = $3, color = $4, template_ids = $5, is_public = $6, is_pinned = $7, tags = $8, updated_at = NOW()
           WHERE id = $9`,
          [col.name, col.description, col.icon, col.color, col.templateIds, col.isPublic, col.isPinned, col.tags, col.id]
        );
      } else {
        await pool.query(
          `INSERT INTO template_collections 
            (id, name, description, icon, color, template_ids, is_public, is_pinned, author_id, tags)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [col.id, col.name, col.description, col.icon, col.color, col.templateIds, col.isPublic, col.isPinned, userId, col.tags]
        );
      }
    }

    res.json({ success: true });
  } catch (e: any) {
    console.error('Failed to sync collections:', e);
    res.status(500).json({ error: e.message });
  }
});

export default router;
