/**
 * IR → Provider-specific prompt derleyicileri.
 */

import type { IR, ProviderType } from '@/types/ir';
import { compileForChat, compileForGemini } from './irToPrompt';

export type { IR, CompiledPrompt, ProviderType } from '@/types/ir';

export { compileDSL, compileDSLToIR } from './dslCompiler';

export function compileIRForProvider(ir: IR, provider: ProviderType): { system: string; user: string } {
  switch (provider) {
    case 'gemini':
      return compileForGemini(ir, provider);
    case 'groq':
    case 'huggingface':
    case 'claude':
    case 'claude-opus':
    case 'openrouter':
    case 'openai':
    case 'ollama':
    case 'mistral':
      return compileForChat(ir, provider);
    default:
      return compileForChat(ir, 'groq');
  }
}
