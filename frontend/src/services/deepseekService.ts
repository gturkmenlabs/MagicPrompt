/**
 * DeepSeek Service — Anthropic SDK uyumlu API uzerinden.
 * Base URL: https://api.deepseek.com/anthropic
 * Model: deepseek-chat (otomatik esleme)
 */
import { Framework, PromptResponse, Attachment } from '@/types';
import { parseMarkdownResponse } from '@/utils/parseMarkdownResponse';
import { getSystemInstruction } from './systemInstruction';

const DEEPSEEK_API_BASE = 'https://api.deepseek.com/anthropic/v1/messages';
const DEEPSEEK_MODEL = 'deepseek-chat';


function getDeepSeekApiKey(): string {
  return (
    (typeof import.meta !== 'undefined' ? import.meta.env?.VITE_DEEPSEEK_API_KEY : undefined) ??
    (typeof process !== 'undefined' ? process.env?.DEEPSEEK_API_KEY : undefined) ??
    ''
  );
}

export async function generateMasterPrompt(
  intent: string,
  framework: Framework,
  domainId: string,
  _useSearch: boolean,
  _thinkingMode: boolean,
  localizedRules: string,
  attachments: Attachment[] = [],
  styleContext?: string,
  customSystemPrompt?: string
): Promise<PromptResponse> {
  const apiKey = getDeepSeekApiKey();
  if (!apiKey) {
    throw new Error(
      'DeepSeek API key not set. Add DEEPSEEK_API_KEY to .env.'
    );
  }

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
ATTACHMENTS: ${attachments.length > 0 ? 'YES' : 'NO'}${globalDirectiveBlock}${styleBlock}

Reply in Markdown only. First: one short reasoning paragraph. Then a blank line. Then the master prompt with ## SYSTEM, ## DEVELOPER, ## USER. No JSON.
`.trim();

  const systemInstruction = globalDirectives
    ? `[USER GLOBAL DIRECTIVES — HIGHEST PRIORITY]
${globalDirectives}

Apply every directive above unless it conflicts with safety requirements.
Reflect these directives inside the generated master prompt content.

${getSystemInstruction('en')}`
    : getSystemInstruction('en');

  const body: Record<string, unknown> = {
    model: DEEPSEEK_MODEL,
    max_tokens: 4096,
    system: systemInstruction,
    messages: [{ role: 'user', content: userPrompt }],
  };

  const res = await fetch(DEEPSEEK_API_BASE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errBody = await res.text();
    let msg = `DeepSeek API ${res.status}`;
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
  const content = data?.content;
  let generatedText = '';
  if (Array.isArray(content)) {
    for (const block of content) {
      if (block?.type === 'text' && block.text) generatedText += block.text;
    }
  }
  if (!generatedText) {
    throw new Error(
      'Unexpected DeepSeek response format.'
    );
  }

  const parsed = parseMarkdownResponse(generatedText, 'en');
  if (!parsed.masterPrompt) parsed.masterPrompt = generatedText;
  if (!parsed.reasoning) parsed.reasoning = 'DeepSeek generation completed.';

  return parsed;
}
