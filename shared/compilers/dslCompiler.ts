/**
 * Tam derleyici — .prompt dosyasi → parse → IR → final prompt.
 * Backend + frontend uyumlu (file yolu ile cagrildiginda Node fs kullanir).
 */

import fs from 'fs/promises';
import path from 'path';
import { parsePromptDSL } from '../dsl/parser';
import { dslToIR } from './dslToIR';
import { compileIRToPrompt } from './irToPrompt';
import { Framework } from '../types';
import type { MasterPrompt } from '../types/ir';

export type GenerateFn = (
  provider: string,
  opts: {
    intent: string;
    framework: Framework;
    domainId?: string;
    useSearch: boolean;
    thinkingMode: boolean;
    localizedRules: string;
  }
) => Promise<{ response: { masterPrompt: string; enrichment?: { agentMetrics?: { judgeScoreAfter?: number } } } }>;

export async function compileDSL(
  filePath: string,
  generateFn?: GenerateFn
): Promise<{
  dsl: Awaited<ReturnType<typeof parsePromptDSL>>;
  ir: ReturnType<typeof dslToIR>;
  finalPrompt: MasterPrompt;
  tokens: number;
}> {
  const absolutePath = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);

  const dsl = await parsePromptDSL(absolutePath);
  const ir = dslToIR(dsl);
  const finalPrompt = compileIRToPrompt(ir);

  let masterPrompt: MasterPrompt;

  if (generateFn) {
    const enriched = await generateFn('auto', {
      intent: finalPrompt.intent,
      framework: Framework.AUTO,
      domainId: ir.domain,
      useSearch: false,
      thinkingMode: false,
      localizedRules: '',
    });

    masterPrompt = {
      fullPrompt: enriched.response.masterPrompt,
      intent: finalPrompt.intent,
      judgeScore: enriched.response.enrichment?.agentMetrics?.judgeScoreAfter,
    };
  } else {
    masterPrompt = finalPrompt;
  }

  return {
    dsl,
    ir,
    finalPrompt: masterPrompt,
    tokens: 0,
  };
}

/** CLI / API for: derle ve prompts/compiled dizinine save */
export async function compileAndSave(
  filePath: string,
  outputDir = 'prompts/compiled'
): Promise<Awaited<ReturnType<typeof compileDSL>>> {
  const result = await compileDSL(filePath);

  const absolutePath = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
  const outPath = path.join(
    path.isAbsolute(outputDir) ? outputDir : path.resolve(process.cwd(), outputDir),
    path.basename(absolutePath).replace(/\.prompt$/i, '.md')
  );
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, result.finalPrompt.fullPrompt);

  console.log(`✅ Derlendi → ${outPath}`);
  console.log(`   Versiyon: ${result.dsl.meta.version}`);
  console.log(`   Token: ${result.tokens}`);
  console.log(`   Judge Skoru: ${result.finalPrompt.judgeScore ?? 'N/A'}`);

  return result;
}
