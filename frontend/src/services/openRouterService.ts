import { getEnv } from './envHelper';
import { Framework, PromptResponse, Attachment } from '@/types';
import { parseMarkdownResponse } from '@/utils/parseMarkdownResponse';
import { getSystemInstruction } from './systemInstruction';

const OPENROUTER_API = 'https://openrouter.ai/api/v1/chat/completions';

/** Secili model (App'ten set edilir) */
let selectedModelId = 'anthropic/claude-3.5-sonnet';

export function setOpenRouterModel(modelId: string): void {
  selectedModelId = modelId || 'anthropic/claude-3.5-sonnet';
}

export function getOpenRouterModel(): string {
  return selectedModelId;
}


function getApiKey(): string {
  return (getEnv('VITE_OPENROUTER_API_KEY') ?? getEnv('OPENROUTER_API_KEY') ?? '') as string;
}

export const generateMasterPrompt = async (
  intent: string,
  framework: Framework,
  domainId: string,
  _useSearch: boolean,
  _thinkingMode: boolean,
  localizedRules: string,
  attachments: Attachment[] = [],
  styleContext?: string,
  customSystemPrompt?: string
): Promise<PromptResponse> => {
  const apiKey = getApiKey();
  if (!apiKey || !apiKey.trim()) {
    throw new Error(
      'OpenRouter API key not set. Add VITE_OPENROUTER_API_KEY to .env and restart the dev server (npm run dev).'
    );
  }
  const model = getOpenRouterModel();
  const globalDirectives = customSystemPrompt?.trim();
  const globalDirectiveBlock = globalDirectives
    ? `\nGLOBAL_BEHAVIOR_DIRECTIVES (HIGHEST PRIORITY):\n${globalDirectives}\n`
    : '';
  const styleBlock = styleContext?.trim() ? `\nSTYLE/TONE (user-taught):\n${styleContext}\n` : '';
  const userPrompt = `
[RUNTIME INPUTS]
USER_INPUT: "${intent}"
CONTEXT: Domain ID: ${domainId}, Rules: ${localizedRules}
I18N: EN
FRAMEWORK_OVERRIDE: ${framework}
ATTACHMENTS: ${attachments.length > 0 ? 'YES (note: attachment context not sent)' : 'NO'}${globalDirectiveBlock}${styleBlock}

Reply in Markdown only. First: one short reasoning paragraph. Then a blank line. Then the master prompt with ## SYSTEM, ## DEVELOPER, ## USER. No JSON.
`.trim();

  const systemInstruction = globalDirectives
    ? `[USER GLOBAL DIRECTIVES — HIGHEST PRIORITY]
${globalDirectives}

Apply every directive above unless it conflicts with safety requirements.
Reflect these directives inside the generated master prompt content.

${getSystemInstruction('en')}`
    : getSystemInstruction('en');

  const res = await fetch(OPENROUTER_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : '',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 4096,
      temperature: 0.2,
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    let msg = `OpenRouter API ${res.status}`;
    try {
      const j = JSON.parse(errBody);
      if (j.error?.message) msg = j.error.message;
      else if (j.error) msg = typeof j.error === 'string' ? j.error : JSON.stringify(j.error);
    } catch {
      if (errBody) msg = errBody.slice(0, 200);
    }
    throw new Error(msg);
  }

  const data = await res.json().catch(() => ({}));
  const generatedText =
    data?.choices?.[0]?.message?.content ??
    (typeof data === 'string' ? data : '');
  if (!generatedText) {
    throw new Error(
      'Unexpected OpenRouter response format.'
    );
  }

  const parsed = parseMarkdownResponse(generatedText, 'en');
  if (!parsed.masterPrompt) parsed.masterPrompt = generatedText;
  if (!parsed.reasoning) parsed.reasoning = '—';
  return parsed;
};
