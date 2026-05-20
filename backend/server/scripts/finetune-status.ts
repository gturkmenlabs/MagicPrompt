import { getFineTuneJob } from '../lib/openaiFineTuning';

function readArg(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

async function main() {
  const jobId = readArg('--job-id');
  if (!jobId) {
    throw new Error('Usage: npm run finetune:status -- --job-id <ftjob-...>');
  }

  const job = await getFineTuneJob(jobId);
  console.log(JSON.stringify({
    ok: true,
    ready: job.status === 'completed' && Boolean(job.modelId),
    job,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

