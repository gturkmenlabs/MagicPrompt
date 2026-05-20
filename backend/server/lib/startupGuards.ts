export function assertStartupSecurityGuards(env: NodeJS.ProcessEnv = process.env): void {
  const scopedRaw = env.API_KEYS_SCOPED_JSON?.trim();
  if (scopedRaw) {
    try {
      const parsed = JSON.parse(scopedRaw);
      if (!Array.isArray(parsed)) {
        throw new Error('API_KEYS_SCOPED_JSON must be a JSON array');
      }
      for (const item of parsed) {
        if (!item || typeof item !== 'object') {
          throw new Error('Each API_KEYS_SCOPED_JSON item must be an object');
        }
        if (typeof item.key !== 'string' || item.key.trim().length === 0) {
          throw new Error('Each API_KEYS_SCOPED_JSON item must include a non-empty key');
        }
        if (!Array.isArray(item.scopes) || item.scopes.some((scope: unknown) => typeof scope !== 'string')) {
          throw new Error('Each API_KEYS_SCOPED_JSON item must include a scopes string array');
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'invalid JSON';
      throw new Error(`Invalid API_KEYS_SCOPED_JSON: ${message}`);
    }
  }

  if (env.NODE_ENV === 'production' && env.DISABLE_API_KEY_AUTH === 'true') {
    throw new Error('DISABLE_API_KEY_AUTH=true cannot be used in production');
  }

  if (env.NODE_ENV === 'production' && !env.SUPABASE_JWT_SECRET) {
    throw new Error('SUPABASE_JWT_SECRET must be set in production');
  }

  if (env.NODE_ENV === 'production' && !env.CORS_ALLOWED_ORIGINS) {
    console.warn('[SECURITY] CORS_ALLOWED_ORIGINS is not set — no origins will be allowed in production');
  }

  if (env.NODE_ENV === 'production' && env.VITE_ALLOW_OPEN_ACCESS === 'true') {
    throw new Error('VITE_ALLOW_OPEN_ACCESS=true cannot be used in production');
  }
}
