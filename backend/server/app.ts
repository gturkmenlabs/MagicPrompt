/**
 * Express app — test for export (supertest).
 * Calistirma: server/index.ts
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import routes from './routes/index';
import { createStripeWebhookHandler } from './routes/payment';
import { requestIdMiddleware } from './middleware/requestId';
import { apiErrorHandler } from './lib/apiError';

const app = express();
const isProduction = process.env.NODE_ENV === 'production';
const appRoutes = ['/', '/prompts', '/ailab', '/optimizer', '/ragflow', '/analytics', '/docs'];

app.disable('x-powered-by');

function resolveAllowedOrigins(): string[] {
  const raw = process.env.CORS_ALLOWED_ORIGINS?.trim();
  if (raw) {
    return raw
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);
  }
  if (process.env.NODE_ENV === 'production') {
    return [];
  }
  return ['http://localhost:3000', 'http://localhost:4173', 'http://localhost:4100'];
}

const allowedOrigins = new Set(resolveAllowedOrigins());
const corsOptions: cors.CorsOptions = {
  origin(origin, callback) {
    if (!origin) {
      callback(null, true);
      return;
    }
    callback(null, allowedOrigins.has(origin));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
};

app.use(cors(corsOptions));
app.use(requestIdMiddleware);
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  originAgentCluster: false,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  hsts: isProduction ? { maxAge: 15552000, includeSubDomains: true } : false,
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: isProduction
        ? ["'self'", "'unsafe-inline'"]
        : ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      scriptSrcAttr: ["'none'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      styleSrcElem: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      imgSrc: isProduction
        ? ["'self'", 'data:', 'blob:', 'https:']
        : ["'self'", 'data:', 'blob:', 'https:', 'http:'],
      fontSrc: ["'self'", 'data:', 'https://fonts.gstatic.com', 'https:'],
      connectSrc: isProduction
        ? ["'self'", 'https:', 'wss:']
        : ["'self'", 'https:', 'http:', 'ws:', 'wss:'],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      formAction: ["'self'"],
      baseUri: ["'self'"],
      upgradeInsecureRequests: null,
    },
  },
}));

app.post('/v1/webhooks/stripe', express.raw({ type: 'application/json' }), createStripeWebhookHandler());
app.use(express.json({ limit: '1mb' }));

// JSON parse errors handled by apiErrorHandler

app.use('/v1', routes);
app.use('/api/v1', routes);

// Supabase self-hosted bu sunucuda yoksa HTML 404 yerine JSON error don.
app.use('/supabase', (_req, res) => {
  res.status(503).json({
    error: 'Supabase self-hosted endpoint is not configured on this server.',
  });
});

function getPublicOrigin(req: express.Request): string {
  const configured = process.env.PUBLIC_SITE_URL?.trim();
  if (configured) return configured.replace(/\/$/, '');
  const protocol = req.get('x-forwarded-proto')?.split(',')[0]?.trim() || req.protocol;
  return `${protocol}://${req.get('host')}`;
}

app.get('/robots.txt', (req, res) => {
  const origin = getPublicOrigin(req);
  res.type('text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.send([
    'User-agent: *',
    'Allow: /',
    'Disallow: /settings',
    `Sitemap: ${origin}/sitemap.xml`,
    '',
  ].join('\n'));
});

app.get('/sitemap.xml', (req, res) => {
  const origin = getPublicOrigin(req);
  const updatedAt = new Date().toISOString();
  const urls = appRoutes.map((route) => {
    const loc = route === '/' ? origin : `${origin}${route}`;
    return [
      '  <url>',
      `    <loc>${loc}</loc>`,
      `    <lastmod>${updatedAt}</lastmod>`,
      '    <changefreq>weekly</changefreq>',
      route === '/' ? '    <priority>1.0</priority>' : '    <priority>0.7</priority>',
      '  </url>',
    ].join('\n');
  }).join('\n');

  res.type('application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`);
});

const distPath = path.resolve(process.cwd(), 'dist');
app.use(express.static(distPath, {
  maxAge: '1y',
  immutable: true,
  setHeaders: (res, path) => {
    if (path.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache');
    }
  }
}));

app.use((_req, res, next) => {
  if (_req.path.startsWith('/v1') || _req.path.startsWith('/api/v1')) return next();
  if (_req.method !== 'GET') return next();
  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) next();
  });
});

app.use(apiErrorHandler as any);

export default app;
