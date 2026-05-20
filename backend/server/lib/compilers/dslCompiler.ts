/**
 * Super Reasoning v3.3 — DSL derleyici pipeline.
 * .prompt dosyasi → parse → dslToIR → compileIRForProvider → CompiledPrompt.
 */

import fs from 'fs/promises';
import path from 'path';
import { parsePromptDSLFromContent } from '../../../../shared/dsl/parser';
import { dslToIR } from './dslToIR';
import { compileIRForProvider } from './index';
import type { IR, CompiledPrompt, ProviderType } from '@/types/ir';

/** .prompt dosyasini okuyup parse eder, IR uretir, verilen provider for derler. */
export async function compileDSL(
  filePath: string,
  provider: ProviderType = 'groq'
): Promise<CompiledPrompt> {
  const absolutePath = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
  const content = await fs.readFile(absolutePath, 'utf-8');
  const dsl = parsePromptDSLFromContent(content);
  const ir = dslToIR(dsl);
  const compiled = compileIRForProvider(ir, provider);
  return { ...compiled, provider };
}

/** Sadece .prompt dosyasindan IR uretir (LLM cagrisi yapmadan). */
export async function compileDSLToIR(filePath: string): Promise<IR> {
  const absolutePath = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
  const content = await fs.readFile(absolutePath, 'utf-8');
  const dsl = parsePromptDSLFromContent(content);
  return dslToIR(dsl);
}
