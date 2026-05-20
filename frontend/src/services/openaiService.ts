import { getEnv } from './envHelper';
import { Framework, PromptResponse, Attachment } from '@/types';
import { parseMarkdownResponse } from '@/utils/parseMarkdownResponse';
import { getSystemInstruction } from './systemInstruction';

const OPENAI_API_BASE = 'https://api.openai.com/v1';
const CHAT_URL = `${OPENAI_API_BASE}/chat/completions`;

function getOpenAIModel(): string {
  return (getEnv('VITE_OPENAI_MODEL') ?? getEnv('OPENAI_MODEL') ?? 'gpt-4o-mini') as string;
}

function getOpenAIApiKey(): string {
  return (getEnv('VITE_OPENAI_API_KEY') ?? getEnv('OPENAI_API_KEY') ?? '') as string;
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
  const apiKey = getOpenAIApiKey();
  if (!apiKey) {
    throw new Error('OpenAI API key not set. Add OPENAI_API_KEY to .env');
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
ATTACHMENTS: ${attachments.length > 0 ? 'YES (note: OpenAI text-only, attachment context not sent)' : 'NO'}${globalDirectiveBlock}${styleBlock}

Reply in Markdown only. First: one short reasoning paragraph. Then a blank line. Then the master prompt with ## SYSTEM, ## DEVELOPER, ## USER. No JSON.
`.trim();

  const systemInstruction = globalDirectives
    ? `[USER GLOBAL DIRECTIVES — HIGHEST PRIORITY]
${globalDirectives}

Apply every directive above unless it conflicts with safety requirements.
Reflect these directives inside the generated master prompt content.

${getSystemInstruction('en')}`
    : getSystemInstruction('en');

  const messages = [
    { role: 'system' as const, content: systemInstruction },
    { role: 'user' as const, content: userPrompt },
  ];

  const res = await fetch(CHAT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: getOpenAIModel(),
      messages,
      stream: false,
      max_tokens: 2048,
      temperature: 0.2,
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    let msg = `OpenAI API ${res.status}`;
    try {
      const j = JSON.parse(errBody);
      if (j.error?.message) msg = j.error.message;
      else if (j.error) msg = j.error;
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
    throw new Error('Unexpected OpenAI response format.');
  }

  const parsed = parseMarkdownResponse(generatedText, 'en');
  if (!parsed.masterPrompt) parsed.masterPrompt = generatedText;
  if (!parsed.reasoning) parsed.reasoning = '—';
  return parsed;
};
