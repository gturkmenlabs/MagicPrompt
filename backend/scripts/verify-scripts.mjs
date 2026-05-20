#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const packagePath = path.join(root, 'package.json');

const REQUIRED_FILES = [
  'scripts/dev-all-with-healthcheck.sh',
  'scripts/typecheck-budget.mjs',
  'server/scripts/quality-dashboard.ts',
  'server/scripts/run-canary.ts',
];

function loadScripts() {
  const raw = fs.readFileSync(packagePath, 'utf8');
  const pkg = JSON.parse(raw);
  return pkg?.scripts ?? {};
}

function fileExists(relPath) {
  return fs.existsSync(path.join(root, relPath));
}

function normalizeCandidate(candidate) {
  const cleaned = candidate.replace(/^["']|["']$/g, '').trim();
  if (!cleaned) return null;
  if (cleaned.startsWith('-')) return null;
  if (cleaned.includes('*')) return null;
  return cleaned;
}

function extractReferencedFiles(command) {
  const refs = [];
  const patterns = [
    /\bbash\s+([^\s|&;]+)/g,
    /\bsh\s+([^\s|&;]+)/g,
    /\bnode\s+([^\s|&;]+)/g,
    /\btsx\s+([^\s|&;]+)/g,
    /\bnpx\s+tsx\s+([^\s|&;]+)/g,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(command)) !== null) {
      const file = normalizeCandidate(match[1] ?? '');
      if (!file) continue;
      if (!/\.(mjs|cjs|js|ts|tsx|sh)$/.test(file)) continue;
      refs.push(file);
    }
  }

  return refs;
}

const scripts = loadScripts();
const referencedFiles = new Set(REQUIRED_FILES);

for (const value of Object.values(scripts)) {
  if (typeof value !== 'string') continue;
  for (const ref of extractReferencedFiles(value)) {
    referencedFiles.add(ref);
  }
}

const missing = [];
for (const relPath of referencedFiles) {
  if (!fileExists(relPath)) {
    missing.push(relPath);
  }
}

if (missing.length > 0) {
  console.error('[verify:scripts] Missing script targets detected:');
  for (const item of missing) {
    console.error(` - ${item}`);
  }
  process.exit(1);
}

console.log(`[verify:scripts] OK (${referencedFiles.size} script target(s) validated)`);
