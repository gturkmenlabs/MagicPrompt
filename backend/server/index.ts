import 'dotenv/config';
// OTel tracing MUST be imported before Express for auto-instrumentation
import './lib/tracing';
import app from './app';
import { initVectorStore, loadFromEmbeddingCache } from './lib/vectorStore';
import { assertStartupSecurityGuards } from './lib/startupGuards';
import { embeddingClassifier } from './lib/intentAnalyzer';

const PORT = Number(process.env.SR_API_PORT) || 4000;

try {
  assertStartupSecurityGuards();
} catch (error) {
  console.error(`[SECURITY] ${(error as Error).message}`);
  process.exit(1);
}

// Embedding kataloğunu ısıt — ilk istek gecikmesin
embeddingClassifier.warmup().catch((err: unknown) =>
  console.warn('[EmbeddingClassifier] Warmup failed (non-critical):', err instanceof Error ? err.message : err)
);

// Beklenmedik hatalarda cikisi engelle, logla
process.on('uncaughtException', (err) => {
  console.error('[uncaughtException]', err);
});
process.on('unhandledRejection', (reason, _promise) => {
  console.error('[unhandledRejection]', reason);
});

const server = app.listen(PORT, () => {
  console.log(`Super Reasoning API: http://localhost:${PORT}`);
  console.log(`  GET  /v1/health`);
  console.log(`  POST /v1/generate`);
  console.log(`  GET  /v1/prompts`);
  console.log(`  GET  /v1/prompts/:id`);
  console.log(`  POST /v1/prompts`);
  console.log(`  DELETE /v1/prompts/:id`);
  console.log(`  POST /v1/agent/run`);
  console.log(`  POST /v1/prompts/semantic-search`);
  console.log(`  GET  /v1/prompts/vector-stats`);
  console.log(`  POST /v1/prompts/seed-vectors`);
  console.log('');
  console.log('Sunucu calisiyor. Durdurmak for Ctrl+C.');

  // Vektor store'u arka planda start
  initVectorStore()
    .then(async (store) => {
      // Eger cache varsa, otomatik upload
      try {
        const { NOTEBOOKLM_PROMPTS } = await import('@/data/notebookLmPrompts');
        const promptMap = new Map<string, { id: string; text: string; metadata: { name: string; category: string; tags: string[]; lang: 'tr' | 'en' } }>();
        for (const p of NOTEBOOKLM_PROMPTS) {
          const text = `${p.promptEn} | ${p.nameEn} | ${p.tags.join(', ')}`;
          promptMap.set(text, {
            id: p.id,
            text,
            metadata: { name: p.nameEn, category: p.categoryEn, tags: p.tags, lang: 'en' },
          });
        }
        const loaded = await loadFromEmbeddingCache(promptMap);
        if (loaded > 0) {
          console.log(`[VectorStore] ${loaded} vektor cache'den yuklendi (${store.name})`);
        }
      } catch {
        // Cache yoksa veya error — seed endpoint ile tetiklenecek
      }
    })
    .catch(() => {
      // Non-critical — semantik arama opsiyonel
    });
});

server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error('');
    console.error(`[Error] Port ${PORT} zaten kullanimda (EADDRINUSE).`);
    console.error('  Cozum 1: Portu kullanan islemi kapat (PowerShell):');
    console.error('    Get-NetTCPConnection -LocalPort ' + PORT + ' | % { Stop-Process -Id $_.OwningProcess -Force }');
    console.error('  Cozum 2: Baska port: SR_API_PORT=4001 npm run api');
    console.error('          (Frontend for .env veya ortamda VITE_API_URL=http://localhost:4001 ekleyin)');
    console.error('');
  } else {
    console.error('[Server error]', err);
  }
  process.exit(1);
});
