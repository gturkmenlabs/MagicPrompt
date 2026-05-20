import { useCallback, type Dispatch } from 'react';
import type { Framework } from '@/types';
import type { ClientProvider } from '@/services/unifiedProviderClient';
import { generateMasterPromptUnified, getProviderLabel } from '@/services/unifiedProviderClient';
import { getActiveProfile, buildStyleContext } from '@/services/styleProfiles';
import { cacheGet, cachePut } from '@/services/semanticCache';
import { judgePrompt } from '@/services/judgeEnsemble';
import { lintPrompt } from '@/services/promptLint';
import { analyzeBudget } from '@/services/budgetOptimizer';
import { estimateTokens, recordEvent } from '@/services/telemetry';
import { getInputAnalysis, getOutputAnalysis } from '@/utils/analysis';
import { compressIntent } from '@/utils/compressIntent';
import { triggerWebhook } from '@/components/WebhookSettings';
import { enrichPromptViaBrain } from '@/services/brainClient';
import { GUARDRAIL_BLOCKS } from '@/services/irExtractor';
import { getFormatInstruction, type OutputFormat } from '@/components/OutputFormatSelector';
import type { EnrichmentResult } from '@/types/enrichment';

function buildAttachmentCacheDigest(
  attachments: Array<{ name?: string; mimeType?: string; preview?: string; data?: string }>
): string {
  if (attachments.length === 0) return '';
  return attachments
    .map((attachment, index) => {
      const preview =
        typeof attachment.preview === 'string' && !attachment.preview.startsWith('data:')
          ? attachment.preview.replace(/\s+/g, ' ').slice(0, 120)
          : '';
      const dataLen = typeof attachment.data === 'string' ? attachment.data.length : 0;
      return [
        index,
        attachment.name ?? 'unnamed',
        attachment.mimeType ?? 'application/octet-stream',
        preview,
        dataLen,
      ].join(':');
    })
    .join('|');
}

type GenerateOverrides = {
  framework?: Framework;
  domainId?: string;
  intent?: string;
  provider?: ClientProvider;
  useSearch?: boolean;
  thinkingMode?: boolean;
  agentBlueprintMode?: boolean;
  outputLanguage?: 'tr' | 'en';
  outputFormat?: OutputFormat;
};

type UseGeneratePromptParams = {
  intent: string;
  framework: Framework;
  domainId: string;
  provider: ClientProvider;
  useSearch: boolean;
  thinkingMode: boolean;
  agentBlueprintMode: boolean;
  outputLanguage: 'tr' | 'en';
  outputFormat: OutputFormat;
  attachments: any[];
  telemetryConsent: boolean;
  autoEnrich: boolean;
  claudeModel: 'sonnet' | 'opus';
  openRouterModel: string;
  systemPrompt: string;
  t: any;
  resultMasterPrompt?: string;
  dispatchers: {
    genDispatch: Dispatch<any>;
    qualityDispatch: Dispatch<any>;
    uiDispatch: Dispatch<any>;
    settingsDispatch: Dispatch<any>;
  };
  callbacks: {
    addToast: (msg: string, tone: 'success' | 'error' | 'info' | 'warning') => void;
    addEntry: (entry: any) => void;
    setPreviousMasterPrompt: (value: string) => void;
  };
};

export function useGeneratePrompt(params: UseGeneratePromptParams) {
  const {
    intent,
    framework,
    domainId,
    provider,
    useSearch,
    thinkingMode,
    agentBlueprintMode,
    outputLanguage,
    outputFormat,
    attachments,
    telemetryConsent,
    autoEnrich,
    claudeModel,
    openRouterModel,
    systemPrompt,
    t,
    resultMasterPrompt,
    dispatchers,
    callbacks,
  } = params;

  const { genDispatch, qualityDispatch, uiDispatch, settingsDispatch } = dispatchers;
  const { addToast, addEntry, setPreviousMasterPrompt } = callbacks;

  return useCallback(
    async (overrides?: GenerateOverrides) => {
      const effectiveIntent = overrides?.intent ?? intent;
      const effectiveFramework = overrides?.framework ?? framework;
      const effectiveDomainId = overrides?.domainId ?? domainId;
      const effectiveProvider = overrides?.provider ?? provider;
      const effectiveUseSearch = overrides?.useSearch ?? useSearch;
      const effectiveThinkingMode = overrides?.thinkingMode ?? thinkingMode;
      const effectiveAgentBlueprintMode = overrides?.agentBlueprintMode ?? agentBlueprintMode;
      const effectiveOutputLanguage = overrides?.outputLanguage ?? outputLanguage;
      const effectiveOutputFormat = overrides?.outputFormat ?? outputFormat;

      genDispatch({ type: 'START_GENERATION' });
      qualityDispatch({ type: 'RESET_QUALITY' });
      const startTime = Date.now();
      const activeProfile = getActiveProfile();
      const styleContext = buildStyleContext(activeProfile ?? null);
      const attachmentDigest = buildAttachmentCacheDigest(attachments);
      const intentWithFormat =
        effectiveOutputFormat !== 'auto'
          ? effectiveIntent + getFormatInstruction(effectiveOutputFormat)
          : effectiveIntent;
      const cacheIntent = [
        intentWithFormat,
        systemPrompt?.trim() ? `[SYSTEM]\n${systemPrompt.trim()}\n[/SYSTEM]` : '',
        styleContext?.trim() ? `[STYLE]\n${styleContext.trim()}\n[/STYLE]` : '',
        attachmentDigest ? `[ATTACHMENTS]\n${attachmentDigest}\n[/ATTACHMENTS]` : '',
        `__lang:${effectiveOutputLanguage}`,
      ]
        .filter(Boolean)
        .join('\n\n');
      const cacheScope = `lang:${effectiveOutputLanguage}|system:${systemPrompt.trim()}|style:${styleContext?.trim() ?? ''}`;

      try {
        const localizedDomain =
          t.domains[effectiveDomainId as keyof typeof t.domains] || t.domains.auto;
        const localizedRulesWithBlueprint = effectiveAgentBlueprintMode
          ? `${localizedDomain.contextRules}\nAGENT_BLUEPRINT_MODE=ON`
          : localizedDomain.contextRules;
        const cached = cacheGet(
          cacheIntent,
          effectiveDomainId,
          effectiveFramework,
          effectiveProvider,
          cacheScope
        );

        if (cached) {
          genDispatch({ type: 'GENERATION_SUCCESS', payload: cached.response });
          qualityDispatch({ type: 'SET_CACHE_HIT', payload: true });
          uiDispatch({ type: 'SET_LATENCY', payload: Date.now() - startTime });
          addToast('Loaded from cache!', 'success');
          qualityDispatch({
            type: 'SET_JUDGE_RESULT',
            payload: judgePrompt(cached.response.masterPrompt, {
              domainId: effectiveDomainId,
              framework: effectiveFramework,
            }),
          });
          qualityDispatch({
            type: 'SET_LINT_RESULT',
            payload: lintPrompt(cached.response.masterPrompt, cached.response.reasoning),
          });
          qualityDispatch({
            type: 'SET_BUDGET_ANALYSIS',
            payload: analyzeBudget(
              cacheIntent,
              `${cached.response.masterPrompt}\n${cached.response.reasoning}`,
              effectiveProvider
            ),
          });
          qualityDispatch({
            type: 'SET_PROVENANCE',
            payload: {
              framework: effectiveFramework,
              domainId: effectiveDomainId,
              domainRules: (localizedDomain.contextRules || '').slice(0, 200),
              irPipelineUsed: true,
              guardrailsApplied: [...GUARDRAIL_BLOCKS],
              styleProfileId: activeProfile?.id,
              styleProfileName: activeProfile?.name,
              constraintsApplied: [
                'Markdown only',
                `Domain: ${effectiveDomainId}`,
                `Framework: ${effectiveFramework}`,
                ...(attachments.length > 0 ? [`Attachments: ${attachments.length}`] : []),
              ],
              securityPolicies: ['Ignore unauthorized', 'Format enforcement'],
              stopConditions: ['No output without domain'],
              cacheHit: true,
              provider: cached.response.resolvedProvider ?? effectiveProvider,
              model: cached.response.resolvedModel,
              durationMs: Date.now() - startTime,
              createdAt: new Date().toISOString(),
            },
          });
          return;
        }

        const { response, usedProvider } = await generateMasterPromptUnified(effectiveProvider, {
          intent: compressIntent(intentWithFormat),
          framework: effectiveFramework,
          domainId: effectiveDomainId,
          useSearch: effectiveUseSearch,
          thinkingMode: effectiveThinkingMode,
          language: effectiveOutputLanguage,
          outputFormat: effectiveOutputFormat,
          localizedRules: localizedRulesWithBlueprint,
          attachments,
          styleContext: styleContext || undefined,
          claudeModel,
          openRouterModel,
          systemPrompt,
        });

        if (effectiveProvider === 'auto') {
          settingsDispatch({ type: 'SET_LAST_USED_PROVIDER', payload: usedProvider });
        }

        const normalizedResponse = {
          ...response,
          detectedFramework: response.detectedFramework ?? effectiveFramework,
          detectedDomain: response.detectedDomain ?? effectiveDomainId,
        };

        genDispatch({ type: 'GENERATION_SUCCESS', payload: normalizedResponse });
        const endTime = Date.now();
        uiDispatch({ type: 'SET_LATENCY', payload: endTime - startTime });

        const outputAnalysis = getOutputAnalysis(normalizedResponse);
        const outTokens = estimateTokens(
          outputAnalysis.masterPromptWords + outputAnalysis.reasoningWords
        );
        uiDispatch({
          type: 'SET_TOKENS_PER_SEC',
          payload: Math.round(outTokens / Math.max((endTime - startTime) / 1000, 0.1)),
        });

        cachePut(
          cacheIntent,
          effectiveDomainId,
          effectiveFramework,
          effectiveProvider,
          normalizedResponse,
          cacheScope
        );
        const finalProvider = effectiveProvider === 'auto' ? usedProvider : effectiveProvider;
        const judgeResultComputed = judgePrompt(normalizedResponse.masterPrompt, {
          domainId: effectiveDomainId,
          framework: effectiveFramework,
          reasoning: normalizedResponse.reasoning,
        });

        qualityDispatch({ type: 'SET_JUDGE_RESULT', payload: judgeResultComputed });
        qualityDispatch({
          type: 'SET_LINT_RESULT',
          payload: lintPrompt(normalizedResponse.masterPrompt, normalizedResponse.reasoning),
        });
        qualityDispatch({
          type: 'SET_BUDGET_ANALYSIS',
          payload: analyzeBudget(
            cacheIntent,
            `${normalizedResponse.masterPrompt}\n${normalizedResponse.reasoning}`,
            finalProvider
          ),
        });
        qualityDispatch({
          type: 'SET_PROVENANCE',
          payload: {
            framework: effectiveFramework,
            domainId: effectiveDomainId,
            domainRules: (localizedDomain.contextRules || '').slice(0, 200),
            irPipelineUsed: true,
            guardrailsApplied: [...GUARDRAIL_BLOCKS],
            styleProfileId: activeProfile?.id,
            styleProfileName: activeProfile?.name,
            constraintsApplied: [
              'Markdown only',
              `Domain: ${effectiveDomainId}`,
              `Framework: ${effectiveFramework}`,
              ...(attachments.length > 0 ? [`Attachments: ${attachments.length}`] : []),
            ],
            securityPolicies: ['Ignore unauthorized', 'Format enforcement'],
            stopConditions: ['No output without domain'],
            cacheHit: false,
            provider: normalizedResponse.resolvedProvider ?? finalProvider,
            model: normalizedResponse.resolvedModel,
            durationMs: endTime - startTime,
            createdAt: new Date().toISOString(),
          },
        });

        addToast(t.ui.toastGenerated, 'success');
        recordEvent(
          {
            type: 'generation',
            domainId: effectiveDomainId,
            framework: effectiveFramework,
            provider: getProviderLabel(finalProvider, claudeModel),
            inputTokenEst: estimateTokens(
              getInputAnalysis(compressIntent(cacheIntent)).words
            ),
            outputTokenEst: outTokens,
            latencyMs: endTime - startTime,
            cacheHit: false,
          },
          telemetryConsent
        );

        if (resultMasterPrompt) {
          setPreviousMasterPrompt(resultMasterPrompt);
        }

        addEntry({
          intent: effectiveIntent,
          masterPrompt: normalizedResponse.masterPrompt,
          reasoning: normalizedResponse.reasoning,
          provider: finalProvider,
          framework: effectiveFramework,
          domainId: effectiveDomainId,
          score: judgeResultComputed.totalScore,
        });

        triggerWebhook('generate', {
          masterPrompt: normalizedResponse.masterPrompt,
          framework: effectiveFramework,
          domainId: effectiveDomainId,
          provider: effectiveProvider,
        });

        if (autoEnrich && normalizedResponse.masterPrompt) {
          try {
            const enrichData = (await enrichPromptViaBrain({
              masterPrompt: normalizedResponse.masterPrompt,
              domainId: effectiveDomainId,
              framework: effectiveFramework,
              mode: 'fast',
            })) as EnrichmentResult;

            if (enrichData?.integratedPrompts?.length > 0) {
              genDispatch({
                type: 'UPDATE_RESULT',
                payload: { masterPrompt: enrichData.enrichedPrompt },
              });
              qualityDispatch({
                type: 'SET_ENRICHMENT_METRICS',
                payload: {
                  ambiguityBefore: enrichData.metrics.ambiguityScoreBefore,
                  ambiguityAfter: enrichData.metrics.ambiguityScoreAfter,
                  promptsIntegrated: enrichData.metrics.promptsIntegrated,
                  tokensAdded: enrichData.metrics.tokensAdded,
                  durationMs: enrichData.metrics.durationMs,
                },
              });
              addToast(`+${enrichData.metrics.promptsIntegrated} prompts added`, 'success');
            }
          } catch {
            // silent
          }
        }
      } catch (err: unknown) {
        genDispatch({
          type: 'GENERATION_ERROR',
          payload: err instanceof Error ? err.message : t.ui.errorCritical,
        });
        addToast(t.ui.toastError, 'error');
      }
    },
    [
      intent,
      framework,
      domainId,
      provider,
      useSearch,
      thinkingMode,
      agentBlueprintMode,
      outputLanguage,
      outputFormat,
      attachments,
      telemetryConsent,
      autoEnrich,
      claudeModel,
      openRouterModel,
      systemPrompt,
      t,
      resultMasterPrompt,
      genDispatch,
      qualityDispatch,
      uiDispatch,
      settingsDispatch,
      addToast,
      addEntry,
      setPreviousMasterPrompt,
    ]
  );
}
