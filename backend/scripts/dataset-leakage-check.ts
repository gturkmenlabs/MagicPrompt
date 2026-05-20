/**
 * Train/validation leakage checks for JSONL chat datasets.
 *
 * 1) Exact: sha256 of full raw line (byte-identical records).
 * 2) User-message: sha256 of normalized first user message (ignores JSON wrapper / key order).
 * 3) Temporal/group: documented as N/A if records lack timestamp/group_id.
 *
 * Usage:
 *   npx tsx scripts/dataset-leakage-check.ts [train.jsonl] [valid.jsonl]
 */

import { createHash } from 'node:crypto';
import { createReadStream, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { join, resolve } from 'node:path';

function hashLine(line: string): string {
  return createHash('sha256').update(line.trim(), 'utf8').digest('hex');
}

function normalizeUserText(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[''`]/g, "'");
}

function firstUserMessageFingerprint(obj: unknown): string | null {
  if (!obj || typeof obj !== 'object') return null;
  const messages = (obj as { messages?: unknown }).messages;
  if (!Array.isArray(messages)) return null;
  for (const m of messages) {
    if (!m || typeof m !== 'object') continue;
    const role = String((m as { role?: string }).role || '').toLowerCase();
    const content = (m as { content?: string }).content;
    if (role === 'user' && typeof content === 'string' && content.trim()) {
      return createHash('sha256').update(normalizeUserText(content), 'utf8').digest('hex');
    }
  }
  return null;
}

async function loadLineHashes(path: string): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (!existsSync(path)) return counts;
  const rl = createInterface({
    input: createReadStream(path, { encoding: 'utf8' }),
    crlfDelay: Infinity,
  });
  for await (const line of rl) {
    const t = line.trim();
    if (!t) continue;
    const h = hashLine(t);
    counts.set(h, (counts.get(h) ?? 0) + 1);
  }
  return counts;
}

async function loadUserFingerprints(path: string): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (!existsSync(path)) return counts;
  const rl = createInterface({
    input: createReadStream(path, { encoding: 'utf8' }),
    crlfDelay: Infinity,
  });
  for await (const line of rl) {
    const t = line.trim();
    if (!t) continue;
    try {
      const fp = firstUserMessageFingerprint(JSON.parse(t) as unknown);
      if (fp) counts.set(fp, (counts.get(fp) ?? 0) + 1);
    } catch {
      // skip malformed
    }
  }
  return counts;
}

function overlapCount(a: Map<string, number>, b: Map<string, number>): number {
  let n = 0;
  for (const k of b.keys()) {
    if (a.has(k)) n += 1;
  }
  return n;
}

async function main() {
  const root = resolve(process.cwd());
  const trainPath = resolve(root, process.argv[2] ?? 'data/fine-tuning/neomagic-prompt-teknikleri-tr.train.jsonl');
  const validPath = resolve(root, process.argv[3] ?? 'data/fine-tuning/neomagic-prompt-teknikleri-tr.valid.jsonl');

  const trainLines = await loadLineHashes(trainPath);
  const validLines = await loadLineHashes(validPath);
  const lineOverlap = overlapCount(trainLines, validLines);

  const trainUser = await loadUserFingerprints(trainPath);
  const validUser = await loadUserFingerprints(validPath);
  const userOverlap = overlapCount(trainUser, validUser);

  const report = {
    generatedAt: new Date().toISOString(),
    trainPath,
    validPath,
    exactLine: {
      trainUniqueLines: trainLines.size,
      validUniqueLines: validLines.size,
      overlappingHashes: lineOverlap,
      pass: lineOverlap === 0,
    },
    userMessageFingerprint: {
      trainUnique: trainUser.size,
      validUnique: validUser.size,
      overlappingFingerprints: userOverlap,
      pass: userOverlap === 0,
      note:
        'Same normalized first user utterance must not appear in both splits (prevents near-duplicate leakage).',
    },
    temporalAndGroupAudit: {
      status: 'not_applicable',
      reason:
        'JSONL rows have no timestamp or group_id; add fields to enable time-series or group-blocked splits.',
    },
    pass: lineOverlap === 0 && userOverlap === 0,
    note:
      lineOverlap > 0
        ? 'Fix splits: identical JSONL lines in train and valid.'
        : userOverlap > 0
          ? 'Fix splits: same user prompt appears in train and valid (normalized match).'
          : 'No exact-line or first-user-message overlap between train and valid.',
  };

  const outDir = join(root, 'reports');
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'leakage-report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  console.log(JSON.stringify(report, null, 2));
  process.exit(report.pass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
