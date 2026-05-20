import { generateEmbedding } from './embeddings';

export interface ClassifyResult {
  domain: string;
  framework: string;
  confidence: number;
  reasoning: string;
}

const DOMAIN_CATALOG: Array<{ id: string; description: string }> = [
  { id: 'frontend', description: 'React Vue Angular UI components CSS web design JavaScript HTML' },
  { id: 'backend', description: 'Node Express API REST server database SQL queries TypeScript' },
  { id: 'devops', description: 'Docker Kubernetes CI/CD deployment pipeline infrastructure cloud' },
  { id: 'mobile', description: 'iOS Android React Native Flutter mobile app Swift Kotlin' },
  { id: 'data-science', description: 'Python pandas numpy machine learning data analysis statistics visualization' },
  { id: 'qa', description: 'testing unit test integration e2e test coverage automation quality' },
  { id: 'pm', description: 'product management roadmap sprint user story agile scrum backlog' },
  { id: 'academic', description: 'research paper thesis citation literature review academic writing university' },
  { id: 'creative', description: 'creative writing story fiction blog content poetry copywriting' },
  { id: 'sales', description: 'sales pitch proposal customer outreach revenue conversion CRM' },
  { id: 'seo', description: 'SEO search engine optimization keywords meta tags ranking Google' },
  { id: 'customer-support', description: 'customer service helpdesk support ticket FAQ response satisfaction' },
  { id: 'legal', description: 'contract law legal compliance regulation policy terms privacy GDPR' },
  { id: 'hr', description: 'hiring recruitment employee performance HR policy onboarding training' },
  { id: 'general', description: 'general purpose miscellaneous any topic versatile universal' },
];

const FRAMEWORK_CATALOG: Array<{ id: string; description: string }> = [
  { id: 'COSTAR', description: 'context objective style tone audience result creative marketing output format' },
  { id: 'CREATE', description: 'character request examples adjustments type extras structured role-play' },
  { id: 'RACE', description: 'role action context expectation task definition assignment' },
  { id: 'TRACE', description: 'task request action context expectation process workflow' },
  { id: 'PAS', description: 'problem agitate solution pain point persuasion marketing copywriting' },
  { id: 'AIDA', description: 'attention interest desire action marketing sales funnel conversion' },
  { id: 'CHAIN_OF_THOUGHT', description: 'step by step reasoning logic math problem solving deliberate' },
  { id: 'FIRST_PRINCIPLES', description: 'first principles foundational reasoning decompose assumptions rebuild' },
  { id: 'AUTO', description: 'automatic framework selection general purpose flexible versatile' },
];

interface CatalogEntry {
  id: string;
  description: string;
  embedding: number[] | null;
}

export class EmbeddingClassifier {
  private domains: CatalogEntry[] = DOMAIN_CATALOG.map(d => ({ ...d, embedding: null }));
  private frameworks: CatalogEntry[] = FRAMEWORK_CATALOG.map(f => ({ ...f, embedding: null }));
  private warmedUp = false;

  async warmup(): Promise<void> {
    if (this.warmedUp) return;
    const texts = [
      ...this.domains.map(d => d.description),
      ...this.frameworks.map(f => f.description),
    ];
    const embeddings = await Promise.all(texts.map(t => generateEmbedding(t).catch(() => null)));
    this.domains.forEach((d, i) => { d.embedding = embeddings[i] ?? null; });
    this.frameworks.forEach((f, i) => {
      f.embedding = embeddings[this.domains.length + i] ?? null;
    });
    this.warmedUp = true;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += (a[i] ?? 0) * (b[i] ?? 0);
      normA += (a[i] ?? 0) * (a[i] ?? 0);
      normB += (b[i] ?? 0) * (b[i] ?? 0);
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom === 0 ? 0 : dot / denom;
  }

  private findBest(
    intentEmbedding: number[],
    catalog: CatalogEntry[],
    fallback: string,
  ): { id: string; confidence: number } {
    let bestId = fallback;
    let bestScore = 0;

    for (const entry of catalog) {
      if (!entry.embedding) continue;
      const score = this.cosineSimilarity(intentEmbedding, entry.embedding);
      if (score > bestScore) {
        bestScore = score;
        bestId = entry.id;
      }
    }

    if (bestScore < 0.50) return { id: fallback, confidence: bestScore };
    return { id: bestId, confidence: bestScore };
  }

  async classify(intent: string): Promise<ClassifyResult> {
    if (!this.warmedUp) await this.warmup();

    const intentEmbedding = await generateEmbedding(intent).catch(() => null);
    if (!intentEmbedding) {
      return { domain: 'general', framework: 'AUTO', confidence: 0, reasoning: 'Embedding failed — fallback' };
    }

    const domain = this.findBest(intentEmbedding, this.domains, 'general');
    const framework = this.findBest(intentEmbedding, this.frameworks, 'AUTO');

    return {
      domain: domain.id,
      framework: framework.id,
      confidence: (domain.confidence + framework.confidence) / 2,
      reasoning: `Embedding similarity — domain: ${domain.id} (${domain.confidence.toFixed(2)}), framework: ${framework.id} (${framework.confidence.toFixed(2)})`,
    };
  }
}

export const embeddingClassifier = new EmbeddingClassifier();

export async function classifyIntent(intent: string): Promise<ClassifyResult> {
  return embeddingClassifier.classify(intent);
}

export interface BrainAnalyzeIntentResult {
  domain: string;
  framework: string;
  reasoning: string;
  enrichedPrompt?: string;
}

export async function analyzeIntentServer(
  intent: string,
  _domainId?: string,
  _framework?: string,
): Promise<BrainAnalyzeIntentResult> {
  const result = await classifyIntent(intent);
  return {
    domain: result.domain,
    framework: result.framework,
    reasoning: result.reasoning,
  };
}
