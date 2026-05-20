/**
 * Dokumantasyon API — docs/ ve deploy/ icerigini listeler ve file icerigi sunar.
 * Fihrist §11 (Genel Dokumantasyon, Arsiv, Deploy) ile uyumlu.
 */
import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';

const router = Router();
const DOCS_ROOT = path.resolve(process.cwd(), 'docs');
const DEPLOY_ROOT = path.resolve(process.cwd(), 'deploy');

const GENERAL_DOCS: { file: string; descTr: string; descEn: string }[] = [
  { file: 'ICINDEKILER.md', descTr: 'Proje icindekiler fihristi', descEn: 'Project contents index' },
  { file: 'ARCHITECTURE.md', descTr: 'Teknik architecture, diyagramlar, security ve odeme akislari', descEn: 'Technical architecture, diagrams, security and payment flows' },
  { file: 'PROJECT_SUMMARY.md', descTr: 'Proje ozeti, standartlara uyum', descEn: 'Project summary, standards compliance' },
  { file: 'ANALYSIS_REPORT.md', descTr: 'Analysis raporu', descEn: 'Analysis report' },
  { file: 'CONSOLE-NOTES.md', descTr: 'Konsol notlari', descEn: 'Console notes' },
  { file: 'KURULUM.md', descTr: 'Kurulum rehberi', descEn: 'Installation guide' },
  { file: 'KURULUM_SAAS.md', descTr: 'SaaS kurulumu', descEn: 'SaaS installation' },
  { file: 'BUTONLAR.md', descTr: 'Buton kullanimi', descEn: 'Button usage' },
  { file: 'IR_PIPELINE.md', descTr: 'IR pipeline aciklamasi', descEn: 'IR pipeline description' },
  { file: 'JUDGE_ENSEMBLE.md', descTr: 'Judge ensemble', descEn: 'Judge ensemble' },
  { file: 'OPTIMIZATION_ARCHITECTURE.md', descTr: 'Optimizasyon mimarisi', descEn: 'Optimization architecture' },
  { file: 'COMMAND_OPTIMIZATION_ARCHITECTURE.md', descTr: 'Komut optimizasyonu', descEn: 'Command optimization' },
  { file: 'MULTI_TENANCY_AND_KEYS.md', descTr: 'Cok kiracililik ve API anahtarlari', descEn: 'Multi-tenancy and API keys' },
  { file: 'PAYMENT_INTEGRATION.md', descTr: 'Odeme entegrasyonu', descEn: 'Payment integration' },
  { file: 'PROMPT_FEATURES_ROADMAP.md', descTr: 'Prompt ozellik yol haritasi', descEn: 'Prompt features roadmap' },
  { file: 'PROMPT_LEADERSHIP_ROADMAP.md', descTr: 'Prompt liderlik yol haritasi', descEn: 'Prompt leadership roadmap' },
  { file: 'ROADMAP_V32.md', descTr: 'v3.2 yol haritasi', descEn: 'v3.2 roadmap' },
  { file: 'SAAS_BUILD_PLAN.md', descTr: 'SaaS yapi plani', descEn: 'SaaS build plan' },
  { file: 'SAAS_TRANSFORMATION.md', descTr: 'SaaS donusumu', descEn: 'SaaS transformation' },
  { file: 'SECURITY_TEST_PLAN.md', descTr: 'security test plani', descEn: 'Security test plan' },
  { file: 'SOLUTION_PACKAGE.md', descTr: 'Cozum paketi', descEn: 'Solution package' },
  { file: 'STANDARDS_COMPLIANCE_FEATURE.md', descTr: 'Standartlara uyum ozelligi', descEn: 'Standards compliance feature' },
  { file: 'TEST_PLAN_STANDARDS_COMPLIANCE.md', descTr: 'Standartlara uyum test plani', descEn: 'Standards compliance test plan' },
  { file: 'WCAG_CHECKLIST.md', descTr: 'WCAG kontrol listesi', descEn: 'WCAG checklist' },
  { file: 'LIB_nlm-community-qa-decision-framework.md', descTr: 'QA / test karar cercevesi', descEn: 'QA / test decision framework' },
  { file: 'LIB_nlm-community-frontend-decision-framework.md', descTr: 'Frontend karar cercevesi', descEn: 'Frontend decision framework' },
  { file: 'SRS_DOCUMENT.json', descTr: 'Yazilim gereksinimleri (JSON)', descEn: 'Software requirements (JSON)' },
  { file: 'design-system.json', descTr: 'Tasarim sistemi tanimi', descEn: 'Design system definition' },
];

const ARCHIVE_DOCS: { file: string; descTr: string; descEn: string }[] = [
  { file: 'markdown_archive/README.md', descTr: 'Arsiv README', descEn: 'Archive README' },
  { file: 'markdown_archive/ARCHITECTURE.md', descTr: 'Arsiv architecture', descEn: 'Archive architecture' },
  { file: 'markdown_archive/CALISTIRMA.md', descTr: 'Calistirma', descEn: 'Running' },
  { file: 'markdown_archive/CONTRIBUTING.md', descTr: 'Katki rehberi', descEn: 'Contributing' },
  { file: 'markdown_archive/DEPLOY.md', descTr: 'Deploy', descEn: 'Deploy' },
  { file: 'markdown_archive/GELISTIRME_GEREKSINIMLERI.md', descTr: 'Gelistirme gereksinimleri', descEn: 'Development requirements' },
  { file: 'markdown_archive/PRODUCT.md', descTr: 'Urun', descEn: 'Product' },
  { file: 'markdown_archive/PROJECT_INSIGHT_REPORT.md', descTr: 'Proje insight raporu', descEn: 'Project insight report' },
];

const DEPLOY_DOCS: { file: string; descTr: string; descEn: string }[] = [
  { file: 'INDEX.md', descTr: 'Deploy dokuman indeksi', descEn: 'Deploy document index' },
  { file: 'OPS-RUNBOOK.md', descTr: 'Operasyon runbook (deploy, SSL, Nginx, rollback)', descEn: 'Operations runbook' },
  { file: 'HOSTINGER.md', descTr: 'Hostinger VPS kurulum ve guncelleme', descEn: 'Hostinger VPS setup' },
  { file: 'DEPLOY-VPS-MCP.md', descTr: 'MCP tabanli VPS deploy', descEn: 'MCP-based VPS deploy' },
  { file: 'DEPLOY-HOSTINGER-TR.md', descTr: 'Hostinger deploy (TR)', descEn: 'Hostinger deploy (TR)' },
  { file: 'HOSTINGER-SUNUCU-DEPLOY.md', descTr: 'Hostinger sunucu deploy', descEn: 'Hostinger server deploy' },
  { file: 'DEPLOY-VPS-ADIMLAR.md', descTr: 'VPS deploy adimlari', descEn: 'VPS deploy steps' },
  { file: 'VPS-DEPLOY-KOMUTLARI.md', descTr: 'VPS deploy komutlari', descEn: 'VPS deploy commands' },
];

function safeRelativePath(relative: string): boolean {
  const normalized = path.normalize(relative).replace(/\\/g, '/');
  return !normalized.startsWith('..') && (normalized.endsWith('.md') || normalized.endsWith('.json'));
}

/** GET /v1/docs/list — Bolumlere gore dokuman listesi */
router.get('/list', (_req: Request, res: Response) => {
  res.json({
    sections: [
      { id: 'general', labelTr: 'Genel Dokumantasyon', labelEn: 'General Documentation', root: 'docs', items: GENERAL_DOCS },
      { id: 'archive', labelTr: 'Markdown Arsivi', labelEn: 'Markdown Archive', root: 'docs', items: ARCHIVE_DOCS },
      { id: 'deploy', labelTr: 'Deploy Dokumantasyonu', labelEn: 'Deploy Documentation', root: 'deploy', items: DEPLOY_DOCS },
    ],
  });
});

/** GET /v1/docs/file?path=... — path query: docs/ARCHITECTURE.md veya deploy/INDEX.md (path traversal yok) */
router.get('/file', (req: Request, res: Response) => {
  const rawPath = req.query.path as string;
  if (!rawPath || typeof rawPath !== 'string') {
    return res.status(400).json({ error: 'path query required' });
  }
  const relative = rawPath.replace(/^\/+/, '').replace(/\\/g, '/');
  if (!safeRelativePath(relative)) {
    return res.status(400).json({ error: 'Invalid path' });
  }
  const isDeploy = relative.startsWith('deploy/');
  const baseDir = isDeploy ? DEPLOY_ROOT : DOCS_ROOT;
  const fileRelative = isDeploy ? relative.slice(7) : relative.startsWith('docs/') ? relative.slice(5) : relative;
  const filePath = path.join(baseDir, fileRelative);
  if (!filePath.startsWith(baseDir)) {
    return res.status(400).json({ error: 'Invalid path' });
  }
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const ext = path.extname(filePath).toLowerCase();
    res.setHeader('Content-Type', ext === '.json' ? 'application/json' : 'text/markdown; charset=utf-8');
    return res.send(content);
  } catch (err: any) {
    if (err?.code === 'ENOENT') return res.status(404).json({ error: 'File not found' });
    return res.status(500).json({ error: 'Failed to read file' });
  }
});

export default router;
