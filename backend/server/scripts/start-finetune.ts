import { createFineTuneJob } from '../lib/openaiFineTuning';

function readArg(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

async function main() {
  const name = readArg('--name') ?? 'NeoMagic Prompt Teknikleri';
  const baseModel = readArg('--base-model') ?? 'gpt-4o-mini';
  const datasetPath = readArg('--dataset-path');
  const datasetSizeRaw = readArg('--dataset-size');
  const datasetSize = datasetSizeRaw ? Number(datasetSizeRaw) : undefined;
  const includeValidation = !hasFlag('--no-validation');

  const result = await createFineTuneJob({
    name,
    baseModel,
    datasetPath,
    datasetSize: Number.isFinite(datasetSize) ? datasetSize : undefined,
    includeValidation,
  });

  console.log(JSON.stringify({
    ok: true,
    job: result.job,
    dataset: result.dataset,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
