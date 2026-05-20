import Fastify from 'fastify';
import { env, type AppEnv } from './config/env.js';
import { createLogger } from './infrastructure/logger/logger.js';
import { GeminiEmbeddingProvider } from './infrastructure/embeddings/gemini-embedding.provider.js';
import { MockEmbeddingProvider } from './infrastructure/embeddings/mock-embedding.provider.js';
import { InMemoryVectorStore } from './infrastructure/vector-store/in-memory.vector-store.js';
import { PgVectorStore } from './infrastructure/vector-store/pgvector.vector-store.js';
import { FRAMEWORK_REGISTRY_SEED } from './infrastructure/persistence/seeds/framework-seed.js';
import { INTENT_EXAMPLES_SEED } from './infrastructure/persistence/seeds/intent-examples.seed.js';
import { InMemoryFrameworkRegistryRepository } from './infrastructure/persistence/in-memory-framework-registry.repository.js';
import { InMemoryIntentExampleRepository } from './infrastructure/persistence/in-memory-intent-example.repository.js';
import { KeywordRulesEngine } from './domain/routing/rules/keyword-rules.engine.js';
import { DefaultScoreAggregator } from './domain/routing/scoring/default-score-aggregator.js';
import { NoopRouterDecisionLayer } from './domain/routing/services/noop-router-decision.js';
import { DefaultRoutingService } from './domain/routing/services/default-routing.service.js';
import { PinoRoutingDecisionLogger } from './infrastructure/logger/pino-routing-decision.logger.js';
import { registerRoutingController } from './modules/routing/routing.controller.js';
import type { EmbeddingProvider } from './domain/routing/interfaces/embedding-provider.js';
import type { VectorStore } from './domain/routing/interfaces/vector-store.js';

export async function createApp(customEnv: AppEnv = env) {
  const logger = createLogger(customEnv.LOG_LEVEL);
  const app = Fastify({ loggerInstance: logger });

  const embeddingProvider: EmbeddingProvider =
    customEnv.EMBEDDING_PROVIDER === 'gemini'
      ? new GeminiEmbeddingProvider(
          customEnv.GEMINI_API_KEY ?? '',
          customEnv.GEMINI_EMBEDDING_MODEL
        )
      : new MockEmbeddingProvider();

  let vectorStore: VectorStore;
  if (customEnv.VECTOR_STORE === 'pgvector') {
    const pgStore = new PgVectorStore(
      customEnv.PGVECTOR_CONNECTION_STRING,
      customEnv.PGVECTOR_TABLE
    );
    vectorStore = pgStore;
  } else {
    vectorStore = new InMemoryVectorStore();
  }

  const frameworkRepository = new InMemoryFrameworkRegistryRepository(
    FRAMEWORK_REGISTRY_SEED
  );
  const intentRepository = new InMemoryIntentExampleRepository(INTENT_EXAMPLES_SEED);
  const routingService = new DefaultRoutingService({
    embeddingProvider,
    vectorStore,
    frameworkRepository,
    intentRepository,
    rulesEngine: new KeywordRulesEngine(),
    scoreAggregator: new DefaultScoreAggregator(),
    decisionLayer: new NoopRouterDecisionLayer(),
    decisionLogger: new PinoRoutingDecisionLogger(logger),
    semanticTopK: customEnv.SEMANTIC_TOP_K,
    intentTopK: customEnv.INTENT_TOP_K,
    confidenceThreshold: customEnv.ROUTER_CONFIDENCE_THRESHOLD,
  });

  // Optional pgvector schema setup when pgvector is enabled.
  if (customEnv.VECTOR_STORE === 'pgvector') {
    const firstVector = await embeddingProvider.embedText('warmup vector probe');
    const pgStore = vectorStore as PgVectorStore;
    await pgStore.ensureSchema(firstVector.length);
  }
  await routingService.warmupIndexes();
  await registerRoutingController(app, { routingService });

  app.get('/health', async () => ({ ok: true }));

  return app;
}
