import type { EmbeddingProvider } from '../interfaces/embedding-provider.js';
import type { FrameworkRegistryRepository } from '../interfaces/framework-registry.repository.js';
import type { IntentExampleRepository } from '../interfaces/intent-example.repository.js';
import type { RouterDecisionLayer } from '../interfaces/router-decision-layer.js';
import type { RoutingDecisionLogger } from '../interfaces/routing-decision-logger.js';
import type { RoutingService } from '../interfaces/routing-service.js';
import type { RulesEngine } from '../interfaces/rules-engine.js';
import type { ScoreAggregator } from '../interfaces/score-aggregator.js';
import type { VectorStore } from '../interfaces/vector-store.js';
import { FRAMEWORKS, type FrameworkName } from '@/types/framework.js';
import type { RoutePromptInput, RoutePromptOutput, SimilarityCandidate } from '@/types/routing.js';
import { buildRoutingText } from './routing-text-builder.js';
import { sha256 } from '../../../shared/utils/hash.js';

type RoutingServiceDeps = {
  embeddingProvider: EmbeddingProvider;
  vectorStore: VectorStore;
  frameworkRepository: FrameworkRegistryRepository;
  intentRepository: IntentExampleRepository;
  rulesEngine: RulesEngine;
  scoreAggregator: ScoreAggregator;
  decisionLogger: RoutingDecisionLogger;
  decisionLayer: RouterDecisionLayer;
  semanticTopK: number;
  intentTopK: number;
  confidenceThreshold: number;
};

export class DefaultRoutingService implements RoutingService {
  constructor(private readonly deps: RoutingServiceDeps) {}

  async routePrompt(input: RoutePromptInput): Promise<RoutePromptOutput> {
    const requestId = `r_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const routingText = buildRoutingText(input);
    const frameworkItems = await this.deps.frameworkRepository.listAll();
    const fallbackFramework: FrameworkName = 'general-orchestrator';

    let degradedMode = false;
    let semanticCandidates: SimilarityCandidate[] = [];
    let historicalCandidates: SimilarityCandidate[] = [];

    try {
      const vector = await this.deps.embeddingProvider.embedText(routingText);
      const frameworkHits = await this.deps.vectorStore.similaritySearch({
        namespace: 'framework-registry',
        vector,
        topK: this.deps.semanticTopK,
      });
      const intentHits = await this.deps.vectorStore.similaritySearch({
        namespace: 'intent-examples',
        vector,
        topK: this.deps.intentTopK,
      });

      semanticCandidates = frameworkHits.map((h) => ({
        id: h.id,
        framework: String(h.metadata?.framework ?? fallbackFramework) as FrameworkName,
        score: h.score,
        source: 'framework-registry',
        metadata: h.metadata,
      }));
      historicalCandidates = intentHits.map((h) => ({
        id: h.id,
        framework: String(h.metadata?.framework ?? fallbackFramework) as FrameworkName,
        score: h.score,
        source: 'intent-examples',
        metadata: h.metadata,
      }));
    } catch {
      degradedMode = true;
    }

    const rules = this.deps.rulesEngine.evaluate(routingText);
    const aggregation = this.deps.scoreAggregator.aggregate({
      frameworks: frameworkItems.map((f) => f.name),
      semanticCandidates,
      historicalCandidates,
      rules,
    });

    const optionalDecision = await this.deps.decisionLayer.decide({
      request: input,
      candidates: aggregation.candidates,
    });

    let selectedFramework = optionalDecision ?? aggregation.selectedFramework;
    if (aggregation.confidence < this.deps.confidenceThreshold) {
      selectedFramework = fallbackFramework;
    }

    const result: RoutePromptOutput = {
      selectedFramework,
      confidence: aggregation.confidence,
      reasoning: [
        ...aggregation.reasoning,
        ...rules.matches.slice(0, 2).map((m) => m.reason),
        degradedMode ? 'Embedding provider unavailable; routing degraded to rules-first mode.' : 'Hybrid routing used semantic + rules signals.',
      ],
      fallbackFramework,
      candidateFrameworks: aggregation.candidates,
    };

    this.deps.decisionLogger.logDecision({
      requestId,
      promptHash: sha256(input.prompt),
      promptPreview: input.prompt.slice(0, 180),
      degradedMode,
      semanticCandidates,
      historicalCandidates,
      matchedRules: rules.matches,
      scoreBreakdown: aggregation.scoreBreakdown,
      selectedFramework,
      confidence: aggregation.confidence,
      fallbackFramework,
      timestamp: new Date().toISOString(),
    });

    return result;
  }

  async warmupIndexes(): Promise<void> {
    const frameworks = await this.deps.frameworkRepository.listAll();
    const intents = await this.deps.intentRepository.listAll();

    const frameworkVectors = await Promise.all(
      frameworks.map(async (f) => ({
        namespace: 'framework-registry',
        id: f.id,
        vector: await this.deps.embeddingProvider.embedText(f.embeddingText),
        metadata: { framework: f.name, type: 'framework' },
      }))
    );

    const intentVectors = await Promise.all(
      intents.map(async (ex) => ({
        namespace: 'intent-examples',
        id: ex.id,
        vector: await this.deps.embeddingProvider.embedText(ex.normalizedIntent),
        metadata: {
          framework: ex.selectedFramework,
          successScore: ex.successScore,
          tags: ex.tags,
          type: 'intent-example',
        },
      }))
    );

    await this.deps.vectorStore.upsert([...frameworkVectors, ...intentVectors]);
  }

  static allFrameworks(): FrameworkName[] {
    return [...FRAMEWORKS];
  }
}
