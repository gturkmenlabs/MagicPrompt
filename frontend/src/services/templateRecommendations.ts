import { getEnv } from './envHelper';
import { Framework } from '@/types';
import { TEMPLATES, TemplateItem } from '@/data/templates';

export interface TemplateRecommendation {
  template: TemplateItem;
  score: number;
  reasons: string[];
  matchType: 'exact' | 'domain' | 'framework' | 'semantic' | 'trending' | 'recent';
}

export interface UserContext {
  recentIntents?: string[];
  recentFrameworks?: Framework[];
  recentDomains?: string[];
  recentTemplates?: string[];
  favorites?: string[];
  currentDomain?: string;
  currentFramework?: Framework;
  timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night';
  dayOfWeek?: number;
}

export interface RecommendationConfig {
  maxResults?: number;
  minScore?: number;
  includeReasons?: boolean;
  diversityBoost?: boolean;
  prioritizeNew?: boolean;
  prioritizeUnused?: boolean;
}

const FAVORITE_WEIGHT = 0.20;
const DOMAIN_WEIGHT = 0.20;
const FRAMEWORK_WEIGHT = 0.15;
const TRENDING_WEIGHT = 0.10;
const SEMANTIC_WEIGHT = 0.10;

const TRENDING_TEMPLATES = [
  'auto-quick-brief',
  'rag-chatbot',
  'microservices-architecture',
  'cloud-native-deployment',
  'saas-onboarding',
  'fintech-payment-system',
];

const FRAMEWORK_SIMILARITY: Record<Framework, Framework[]> = {
  [Framework.AUTO]: [Framework.RISEN, Framework.KERNEL, Framework.TAG],
  [Framework.KERNEL]: [Framework.RISEN, Framework.COSTAR, Framework.DSP],
  [Framework.COSTAR]: [Framework.RISEN, Framework.KERNEL, Framework.RTF],
  [Framework.RISEN]: [Framework.KERNEL, Framework.TAG, Framework.COSTAR],
  [Framework.RTF]: [Framework.COSTAR, Framework.TAG, Framework.BAB],
  [Framework.BAB]: [Framework.TAG, Framework.RTF, Framework.SCENARIO],
  [Framework.TAG]: [Framework.RTF, Framework.BAB, Framework.RISEN],
  [Framework.CARE]: [Framework.RISEN, Framework.KERNEL, Framework.PDCA],
  [Framework.REACT]: [Framework.CHAIN, Framework.TREE, Framework.DSP],
  [Framework.CHAIN]: [Framework.REACT, Framework.TREE, Framework.DSP],
  [Framework.TREE]: [Framework.CHAIN, Framework.REACT,Framework.MORPHOLOGICAL],
  [Framework.REWOO]: [Framework.REACT, Framework.CHAIN, Framework.DSP],
  [Framework.DSP]: [Framework.KERNEL, Framework.TAG, Framework.COSTAR],
  [Framework.SELFREFINE]: [Framework.CRITIC, Framework.DSP, Framework.KERNEL],
  [Framework.CRITIC]: [Framework.SELFREFINE, Framework.DSP, Framework.FIVEWHYS],
  [Framework.SCENARIO]: [Framework.TREE, Framework.FUTURES_WHEEL, Framework.BACKCASTING],
  [Framework.OODA]: [Framework.PDCA, Framework.DELPHI, Framework.DIALECTIC],
  [Framework.REDTEAM]: [Framework.SWOT, Framework.PESTEL, Framework.PREMORTEM],
  [Framework.SOCRATIC]: [Framework.DIALECTIC, Framework.FIVEWHYS, Framework.DELPHI],
  [Framework.SWOT]: [Framework.PESTEL, Framework.PORTER, Framework.REDTEAM],
  [Framework.FIVEWHYS]: [Framework.FIRST_PRINCIPLES, Framework.INVERSION, Framework.SOCRATIC],
  [Framework.MECE]: [Framework.DIALECTIC, Framework.SYSTEMS_THINKING, Framework.OKR],
  [Framework.SCAMPER]: [Framework.DESIGN_THINKING, Framework.LATERAL, Framework.TRIZ],
  [Framework.PDCA]: [Framework.OODA, Framework.AGILE, Framework.LEAN],
  [Framework.STAR]: [Framework.OKR, Framework.MOSCOW,Framework.RAPID],
  [Framework.SMART]: [Framework.OKR, Framework.STAR,Framework.MOSCOW],
  [Framework.DIALECTIC]: [Framework.SOCRATIC, Framework.DELPHI,Framework.MECE],
  [Framework.STEPBACK]: [Framework.FIRST_PRINCIPLES, Framework.INVERSION, Framework.ANALOGICAL],
  [Framework.ANALOGICAL]: [Framework.STEPBACK, Framework.MORPHOLOGICAL, Framework.TRIZ],
  [Framework.MORPHOLOGICAL]: [Framework.TRIZ, Framework.ANALOGICAL,Framework.SCAMPER],
  [Framework.DELPHI]: [Framework.DIALECTIC, Framework.SOCRATIC, Framework.OODA],
  [Framework.SIX_HATS]: [Framework.DELPHI, Framework.DIALECTIC,Framework.SWOT],
  [Framework.TRIZ]: [Framework.SCAMPER, Framework.MORPHOLOGICAL, Framework.LATERAL],
  [Framework.PESTEL]: [Framework.SWOT, Framework.PORTER, Framework.GAME_THEORY],
  [Framework.PORTER]: [Framework.SWOT, Framework.PESTEL, Framework.GAME_THEORY],
  [Framework.LEAN]: [Framework.AGILE, Framework.PDCA, Framework.KANO],
  [Framework.AGILE]: [Framework.LEAN, Framework.PDCA, Framework.DESIGN_THINKING],
  [Framework.FIRST_PRINCIPLES]: [Framework.INVERSION, Framework.STEPBACK, Framework.FIVEWHYS],
  [Framework.INVERSION]: [Framework.FIRST_PRINCIPLES, Framework.STEPBACK,Framework.PREMORTEM],
  [Framework.FUTURES_WHEEL]: [Framework.SCENARIO,Framework.BACKCASTING, Framework.DELPHI],
  [Framework.BACKCASTING]: [Framework.FUTURES_WHEEL, Framework.SCENARIO, Framework.OKR],
  [Framework.KANO]: [Framework.JTBD, Framework.DESIGN_THINKING, Framework.LEAN],
  [Framework.JTBD]: [Framework.KANO, Framework.DESIGN_THINKING, Framework.HYPOTHESIS],
  [Framework.DESIGN_THINKING]: [Framework.LATERAL, Framework.SCAMPER,Framework.JTBD],
  [Framework.SYSTEMS_THINKING]: [Framework.MECE, Framework.GAME_THEORY, Framework.CATWOE],
  [Framework.GAME_THEORY]: [Framework.DECISION_MATRIX, Framework.PORTER,Framework.PESTEL],
  [Framework.BAYESIAN]: [Framework.HYPOTHESIS, Framework.DECISION_MATRIX,Framework.DELPHI],
  [Framework.META_PROMPT]: [Framework.DSP, Framework.CHAIN, Framework.KERNEL],
  [Framework.LATERAL]: [Framework.TRIZ, Framework.SCAMPER, Framework.MORPHOLOGICAL],
  [Framework.CATWOE]: [Framework.SYSTEMS_THINKING, Framework.MECE, Framework.DIALECTIC],
  [Framework.DECISION_MATRIX]: [Framework.GAME_THEORY, Framework.BAYESIAN, Framework.OKR],
  [Framework.MIND_MAP]: [Framework.TREE, Framework.MORPHOLOGICAL, Framework.SIX_HATS],
  [Framework.RAPID]: [Framework.STAR,Framework.MOSCOW, Framework.OKR],
  [Framework.MOSCOW]: [Framework.RAPID, Framework.STAR, Framework.SMART],
  [Framework.OKR]: [Framework.SMART, Framework.STAR, Framework.BACKCASTING],
  [Framework.HYPOTHESIS]: [Framework.BAYESIAN, Framework.DECISION_MATRIX, Framework.TAG],
  [Framework.PREMORTEM]: [Framework.REDTEAM, Framework.INVERSION, Framework.FIVEWHYS],
};

function extractKeywords(text: string): string[] {
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2);
  const stopWords = new Set(['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'her', 'was', 'one', 'our', 'out', 'get', 'may', 'use']);
  return [...new Set(words.filter(w => !stopWords.has(w)))];
}

function keywordMatchScore(keywords: string[], template: TemplateItem): number {
  const templateText = `${template.name} ${template.nameEn} ${template.description} ${template.descriptionEn} ${template.intentTr} ${template.intentEn}`.toLowerCase();
  let matches = 0;
  for (const kw of keywords) {
    if (templateText.includes(kw.toLowerCase())) matches++;
  }
  return keywords.length > 0 ? matches / keywords.length : 0;
}

function timeContextScore(template: TemplateItem, timeOfDay: string, dayOfWeek: number): number {
  let score = 0;
  const templateId = template.id;
  if (timeOfDay === 'morning' && ['planning', 'quick', 'daily'].some(k => templateId.includes(k))) score += 0.1;
  if (timeOfDay === 'afternoon' && ['architecture', 'design', 'development'].some(k => templateId.includes(k))) score += 0.1;
  if (timeOfDay === 'evening' && ['review', 'analysis', 'report'].some(k => templateId.includes(k))) score += 0.1;
  if (dayOfWeek === 1 && ['planning', 'sprint', 'weekly'].some(k => templateId.includes(k))) score += 0.1;
  if (dayOfWeek === 5 && ['review', 'retrospective', 'weekly'].some(k => templateId.includes(k))) score += 0.1;
  return score;
}

export function getRecommendations(
  context: UserContext,
  config: RecommendationConfig = {}
): TemplateRecommendation[] {
  const {
    maxResults = 8,
    minScore = 0.1,
    includeReasons = true,
    diversityBoost = true,
    prioritizeNew = false,
    prioritizeUnused = true,
  } = config;

  const now = new Date();
  const hour = now.getHours();
  const timeOfDay: UserContext['timeOfDay'] = 
    hour >= 6 && hour < 12 ? 'morning' :
    hour >= 12 && hour < 18 ? 'afternoon' :
    hour >= 18 && hour < 22 ? 'evening' : 'night';
  const dayOfWeek = context.dayOfWeek ?? now.getDay();

  const recommendations: TemplateRecommendation[] = [];
  const usedTemplateIds = new Set(context.recentTemplates || []);
  const usedFrameworks = context.recentFrameworks || [];
  const usedDomains = context.recentDomains || [];
  const favoriteIds = new Set(context.favorites || []);

  for (const template of TEMPLATES) {
    let score = 0;
    const reasons: string[] = [];
    let matchType: TemplateRecommendation['matchType'] = 'semantic';

    if (prioritizeUnused && usedTemplateIds.has(template.id)) {
      score -= 0.3;
    }

    if (TRENDING_TEMPLATES.includes(template.id)) {
      score += TRENDING_WEIGHT;
      if (includeReasons) reasons.push('Trending template');
      if (matchType === 'semantic') matchType = 'trending';
    }

    if (context.currentDomain && template.domainId === context.currentDomain) {
      score += DOMAIN_WEIGHT;
      if (includeReasons) reasons.push(`Matches current domain: ${context.currentDomain}`);
      matchType = 'domain';
    } else if (usedDomains.includes(template.domainId)) {
      score += DOMAIN_WEIGHT * 0.5;
      if (includeReasons) reasons.push(`Similar to your recent domains`);
    }

    if (context.currentFramework && template.framework === context.currentFramework) {
      score += FRAMEWORK_WEIGHT;
      if (includeReasons) reasons.push(`Matches current framework: ${context.currentFramework}`);
      matchType = 'exact';
    } else if (usedFrameworks.length > 0) {
      const similarFrameworks = FRAMEWORK_SIMILARITY[template.framework] || [];
      const hasSimilar = usedFrameworks.some(fw => similarFrameworks.includes(fw));
      if (hasSimilar) {
        score += FRAMEWORK_WEIGHT * 0.7;
        if (includeReasons) reasons.push('Similar to your preferred frameworks');
        if (matchType === 'semantic') matchType = 'framework';
      }
    }

    if (favoriteIds.has(template.id)) {
      score += FAVORITE_WEIGHT;
      if (includeReasons) reasons.push('In your favorites');
    }

    if (context.recentIntents && context.recentIntents.length > 0) {
      const allKeywords = context.recentIntents.flatMap(extractKeywords);
      const keywordScore = keywordMatchScore(allKeywords, template);
      if (keywordScore > 0.1) {
        score += SEMANTIC_WEIGHT * keywordScore;
        if (includeReasons && keywordScore > 0.3) reasons.push('Matches your recent work');
        if (matchType === 'semantic' && keywordScore > 0.5) matchType = 'semantic';
      }
    }

    if (timeOfDay && dayOfWeek !== undefined) {
      score += timeContextScore(template, timeOfDay, dayOfWeek);
    }

    if (prioritizeNew) {
      const isNew = TRENDING_TEMPLATES.slice(-5).includes(template.id);
      if (isNew) score += 0.1;
    }

    if (score >= minScore) {
      recommendations.push({
        template,
        score: Math.min(score, 1),
        reasons: includeReasons ? reasons : [],
        matchType,
      });
    }
  }

  recommendations.sort((a, b) => b.score - a.score);

  if (diversityBoost) {
    const diverse: TemplateRecommendation[] = [];
    const seenDomains = new Set<string>();
    const seenFrameworks = new Set<Framework>();

    for (const rec of recommendations) {
      const domain = rec.template.domainId;
      const framework = rec.template.framework;
      const isDiverse = !seenDomains.has(domain) || !seenFrameworks.has(framework);
      
      if (isDiverse || diverse.length < maxResults / 2) {
        diverse.push(rec);
        seenDomains.add(domain);
        seenFrameworks.add(framework);
      }
      
      if (diverse.length >= maxResults) break;
    }
    
    return diverse.slice(0, maxResults);
  }

  return recommendations.slice(0, maxResults);
}

export function getPersonalizedPicks(context: UserContext): TemplateItem[] {
  const recommendations = getRecommendations(context, { maxResults: 4, minScore: 0.15 });
  return recommendations.map(r => r.template);
}

export function getSimilarTemplates(templateId: string, maxResults: number = 4): TemplateItem[] {
  const source = TEMPLATES.find(t => t.id === templateId);
  if (!source) return [];

  const similar = TEMPLATES.filter(t => t.id !== templateId)
    .map(t => {
      let score = 0;
      if (t.domainId === source.domainId) score += 0.4;
      if (t.framework === source.framework) score += 0.3;
      const similarFrameworks = FRAMEWORK_SIMILARITY[source.framework] || [];
      if (similarFrameworks.includes(t.framework)) score += 0.2;
      const sourceKeywords = extractKeywords(`${source.intentEn} ${source.descriptionEn}`);
      const tKeywords = extractKeywords(`${t.intentEn} ${t.descriptionEn}`);
      const overlap = sourceKeywords.filter(k => tKeywords.includes(k)).length;
      score += Math.min(overlap * 0.05, 0.2);
      return { template: t, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)
    .map(r => r.template);

  return similar;
}

export function suggestFramework(intent: string, domain?: string): Framework {
  const intentLower = intent.toLowerCase();
  
  if (intentLower.includes('step by step') || intentLower.includes('sequential') || intentLower.includes('chain')) {
    return Framework.CHAIN;
  }
  if (intentLower.includes('analyze') || intentLower.includes('investigate') || intentLower.includes('root cause')) {
    return Framework.FIVEWHYS;
  }
  if (intentLower.includes('compare') || intentLower.includes('evaluate') || intentLower.includes('decide')) {
    return Framework.DECISION_MATRIX;
  }
  if (intentLower.includes('brainstorm') || intentLower.includes('creative') || intentLower.includes('innovate')) {
    return Framework.SCAMPER;
  }
  if (intentLower.includes('plan') || intentLower.includes('organize') || intentLower.includes('structure')) {
    return Framework.RISEN;
  }
  if (intentLower.includes('design') || intentLower.includes('build') || intentLower.includes('create')) {
    return Framework.KERNEL;
  }
  if (intentLower.includes('test') || intentLower.includes('verify') || intentLower.includes('validate')) {
    return Framework.TAG;
  }
  if (intentLower.includes('security') || intentLower.includes('attack') || intentLower.includes('vulnerability')) {
    return Framework.REDTEAM;
  }
  if (intentLower.includes('improve') || intentLower.includes('optimize') || intentLower.includes('enhance')) {
    return Framework.SELFREFINE;
  }
  if (intentLower.includes('scenario') || intentLower.includes('future') || intentLower.includes('what if')) {
    return Framework.SCENARIO;
  }

  if (domain) {
    const domainFrameworkMap: Record<string, Framework> = {
      'frontend': Framework.RTF,
      'backend': Framework.KERNEL,
      'architecture': Framework.SYSTEMS_THINKING,
      'ml-ai': Framework.DSP,
      'nlp-llm': Framework.CHAIN,
      'devops-sre': Framework.PDCA,
      'cybersecurity': Framework.REDTEAM,
      'data-engineering': Framework.DSP,
      'testing': Framework.TAG,
    };
    if (domainFrameworkMap[domain]) return domainFrameworkMap[domain];
  }

  return Framework.AUTO;
}

export function getQuickPicks(): { label: string; labelEn: string; templates: TemplateItem[] }[] {
  return [
    {
      label: 'Hizli Baslangic',
      labelEn: 'Quick Start',
      templates: TEMPLATES.filter(t => ['auto-quick-brief', 'general-problem-solving', 'frontend-component-blueprint'].includes(t.id)),
    },
    {
      label: 'Yapisal Dusunme',
      labelEn: 'Structural Thinking',
      templates: TEMPLATES.filter(t => ['architecture-system-design', 'microservices-architecture', 'api-gateway-design'].includes(t.id)),
    },
    {
      label: 'AI & ML',
      labelEn: 'AI & ML',
      templates: TEMPLATES.filter(t => ['ml-model-pipeline', 'rag-chatbot', 'nlp-llm'].some(id => t.id.includes(id))),
    },
    {
      label: 'security',
      labelEn: 'Security',
      templates: TEMPLATES.filter(t => ['cybersecurity-threat-model', 'ecommerce-secure-api', 'blockchain-smart-contract'].includes(t.id)),
    },
  ];
}

export async function getAIRecommendations(
  intent: string,
  context: UserContext,
  config: RecommendationConfig = {}
): Promise<TemplateRecommendation[]> {
  if (!getEnv('VITE_ENABLE_AI_RECOMMENDATIONS')) {
    return getRecommendations(context, config);
  }

  try {
    const { getAuthHeaders, API_BASE } = await import('./apiClient');
    const headers = await getAuthHeaders();
    
    const res = await fetch(`${API_BASE}/templates/recommend`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ intent, context, config }),
    });

    if (!res.ok) {
      return getRecommendations(context, config);
    }

    const data = await res.json();
    return data.recommendations || getRecommendations(context, config);
  } catch {
    return getRecommendations(context, config);
  }
}