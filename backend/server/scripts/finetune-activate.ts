import fs from 'node:fs/promises';
import path from 'node:path';
import { getFineTuneJob } from '../lib/openaiFineTuning';

function readArg(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

function upsertEnvValue(contents: string, key: string, value: string): string {
  const normalized = contents.replace(/\r\n/g, '\n');
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`^${escapedKey}=.*$`, 'm');
  if (pattern.test(normalized)) {
    return normalized.replace(pattern, `${key}=${value}`);
  }

  const suffix = normalized.endsWith('\n') || normalized.length === 0 ? '' : '\n';
  return `${normalized}${suffix}${key}=${value}\n`;
}

async function main() {
  const jobId = readArg('--job-id');
  if (!jobId) {
    throw new Error('Usage: npm run finetune:activate -- --job-id <ftjob-...> [--env-path .env]');
  }

  const envPath = path.resolve(readArg('--env-path') ?? '.env');
  const job = await getFineTuneJob(jobId);

  if (job.status !== 'completed' || !job.modelId) {
    throw new Error(`Fine-tune job is not ready yet. Current status: ${job.rawStatus ?? job.status}`);
  }

  const existingContents = await pathExists(envPath) ? await fs.readFile(envPath, 'utf-8') : '';
  let nextContents = existingContents;
  nextContents = upsertEnvValue(nextContents, 'OPENAI_MODEL', job.modelId);
  nextContents = upsertEnvValue(nextContents, 'VITE_OPENAI_MODEL', job.modelId);
  await fs.writeFile(envPath, nextContents, 'utf-8');

  console.log(JSON.stringify({
    ok: true,
    envPath,
    modelId: job.modelId,
    jobId: job.id,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

