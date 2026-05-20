/**
 * GitHub Prompt Kutuphanelerinden toplu import scripti.
 *
 * Kaynaklar:
 *   1. f/awesome-chatgpt-prompts (CSV - 227+ prompt)
 *   2. danielmiessler/fabric patterns (system.md dosyalari)
 *   3. mustvlad/ChatGPT-System-Prompts (markdown dosyalari)
 *   4. travistangvh/ChatGPT-Data-Science-Prompts (README parse)
 *   5. yokoffing/ChatGPT-Prompts (README parse)
 *   6. spdustin/ChatGPT-AutoExpert (system prompts)
 *   7. ahmetbersoz/chatgpt-prompts-for-academic-writing (README parse)
 *
 * Kullanim:
 *   npx tsx server/scripts/import-github-prompts.ts
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

// ── Tipler ──────────────────────────────────────────────────
interface StoredPrompt {
  id: string;
  version: string;
  name?: string;
  masterPrompt: string;
  reasoning?: string;
  meta?: Record<string, unknown>;
  createdAt: string;
}

interface RawPrompt {
  name: string;
  prompt: string;
  source: string;
  domainId: string;
  tags?: string[];
}

// ── Sabitler ────────────────────────────────────────────────
const PROMPTS_DIR = join(process.cwd(), '.prompts');
const INDEX_FILE = join(PROMPTS_DIR, 'index.json');
const CACHE_DIR = join(process.cwd(), '.cache', 'github-prompts');
const NOW = new Date().toISOString();

// ── Yardimcilar ─────────────────────────────────────────────
function slugify(text: string, maxLen = 60): string {
  return (
    text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s-]/gu, '')
      .replace(/\s+/g, '-')
      .replace(/^-+|-+$/g, '') || 'prompt'
  ).slice(0, maxLen);
}

function readIndex(): StoredPrompt[] {
  if (!existsSync(INDEX_FILE)) return [];
  try {
    const raw = readFileSync(INDEX_FILE, 'utf-8');
    const data = JSON.parse(raw);
    return Array.isArray(data.prompts) ? data.prompts : [];
  } catch {
    return [];
  }
}

function writeIndex(prompts: StoredPrompt[]) {
  if (!existsSync(PROMPTS_DIR)) mkdirSync(PROMPTS_DIR, { recursive: true });
  writeFileSync(INDEX_FILE, JSON.stringify({ prompts }, null, 2), 'utf-8');
}

async function fetchText(url: string): Promise<string> {
  const cacheKey = url.replace(/[^a-z0-9]/gi, '_').slice(0, 200);
  const cachePath = join(CACHE_DIR, cacheKey + '.txt');

  if (existsSync(cachePath)) {
    console.log(`  [cache] ${url.slice(0, 80)}...`);
    return readFileSync(cachePath, 'utf-8');
  }

  console.log(`  [fetch] ${url.slice(0, 80)}...`);
  const res = await fetch(url, {
    headers: { 'User-Agent': 'SuperReasoning-PromptImporter/1.0' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  const text = await res.text();

  if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(cachePath, text, 'utf-8');
  return text;
}

async function fetchJSON(url: string): Promise<unknown> {
  const text = await fetchText(url);
  return JSON.parse(text);
}

function parseCSVLine(line: string): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < line.length) {
    if (line[i] === '"') {
      i++;
      let field = '';
      while (i < line.length) {
        if (line[i] === '"') {
          if (line[i + 1] === '"') {
            field += '"';
            i += 2;
          } else {
            i++;
            break;
          }
        } else {
          field += line[i];
          i++;
        }
      }
      out.push(field);
      while (i < line.length && (line[i] === ',' || line[i] === ' ')) i++;
    } else {
      const start = i;
      while (i < line.length && line[i] !== ',') i++;
      out.push(line.slice(start, i).replace(/""/g, '"').trim());
      if (line[i] === ',') i++;
    }
  }
  return out;
}

// ── 1. awesome-chatgpt-prompts (CSV) ───────────────────────
async function fetchAwesomeChatGPTPrompts(): Promise<RawPrompt[]> {
  console.log('\n📦 [1/7] f/awesome-chatgpt-prompts...');
  const csv = await fetchText(
    'https://raw.githubusercontent.com/f/awesome-chatgpt-prompts/main/prompts.csv'
  );
  const lines = csv.split(/\r?\n/).filter((l) => l.trim());
  const header = parseCSVLine(lines[0] ?? '');
  const actIdx = header.findIndex((h) => h.toLowerCase() === 'act');
  const promptIdx = header.findIndex((h) => h.toLowerCase() === 'prompt');

  const results: RawPrompt[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (line === undefined) continue;
    const row = parseCSVLine(line);
    const act = row[actIdx]?.trim();
    const prompt = row[promptIdx]?.trim();
    if (!prompt || !act) continue;
    results.push({
      name: act,
      prompt,
      source: 'github:f/awesome-chatgpt-prompts',
      domainId: 'role-play',
      tags: ['act-as', 'chatgpt', 'role-play'],
    });
  }
  console.log(`  → ${results.length} prompt bulundu`);
  return results;
}

// ── 2. fabric patterns ──────────────────────────────────────
async function fetchFabricPatterns(): Promise<RawPrompt[]> {
  console.log('\n📦 [2/7] danielmiessler/fabric patterns...');
  const results: RawPrompt[] = [];

  try {
    // GitHub API ile pattern listesini al
    const apiUrl =
      'https://api.github.com/repos/danielmiessler/fabric/contents/patterns';
    const items = (await fetchJSON(apiUrl)) as Array<{
      name: string;
      type: string;
    }>;
    const folders = items.filter((item) => item.type === 'dir').map((item) => item.name);

    console.log(`  → ${folders.length} pattern klasoru bulundu`);

    // Her pattern'in system.md dosyasini cek (paralel ama throttled)
    const batchSize = 10;
    for (let b = 0; b < folders.length; b += batchSize) {
      const batch = folders.slice(b, b + batchSize);
      const fetches = batch.map(async (folder) => {
        try {
          const url = `https://raw.githubusercontent.com/danielmiessler/fabric/main/patterns/${folder}/system.md`;
          const content = await fetchText(url);
          if (content && content.length > 20) {
            const name = folder
              .replace(/_/g, ' ')
              .replace(/\b\w/g, (c) => c.toUpperCase());
            results.push({
              name: `Fabric: ${name}`,
              prompt: content.trim(),
              source: 'github:danielmiessler/fabric',
              domainId: 'fabric-pattern',
              tags: ['fabric', 'pattern', 'system-prompt', folder],
            });
          }
        } catch {
          /* pattern'in system.md'si yoksa atla */
        }
      });
      await Promise.all(fetches);
      if (b + batchSize < folders.length) {
        await new Promise((r) => setTimeout(r, 500));
      }
    }
  } catch (err) {
    console.error('  ⚠ Fabric patterns cekilemedi:', (err as Error).message);
  }

  console.log(`  → ${results.length} pattern yuklendi`);
  return results;
}

// ── 3. mustvlad/ChatGPT-System-Prompts ─────────────────────
async function fetchMustvladPrompts(): Promise<RawPrompt[]> {
  console.log('\n📦 [3/7] mustvlad/ChatGPT-System-Prompts...');
  const results: RawPrompt[] = [];

  try {
    const apiUrl =
      'https://api.github.com/repos/mustvlad/ChatGPT-System-Prompts/contents/prompts';
    const items = (await fetchJSON(apiUrl)) as Array<{
      name: string;
      download_url: string;
    }>;
    const mdFiles = items.filter((item) => item.name.endsWith('.md'));

    console.log(`  → ${mdFiles.length} markdown dosyasi bulundu`);

    const batchSize = 10;
    for (let b = 0; b < mdFiles.length; b += batchSize) {
      const batch = mdFiles.slice(b, b + batchSize);
      const fetches = batch.map(async (file) => {
        try {
          const content = await fetchText(file.download_url);
          if (content && content.length > 30) {
            // Basligi file adindan cikar
            const name = file.name
              .replace(/\.md$/, '')
              .replace(/[-_]/g, ' ')
              .replace(/\b\w/g, (c) => c.toUpperCase());

            // Icerikten prompt kismini cikar
            let promptText = content;
            // Markdown basligini kaldir
            promptText = promptText.replace(/^#\s+.*\n+/m, '').trim();
            // "## System Prompt" gibi basliklari kaldir
            promptText = promptText
              .replace(/^##\s+System\s+Prompt\s*\n+/im, '')
              .trim();

            if (promptText.length > 20) {
              results.push({
                name,
                prompt: promptText,
                source: 'github:mustvlad/ChatGPT-System-Prompts',
                domainId: 'system-prompts-collection',
                tags: ['system-prompt', 'chatgpt'],
              });
            }
          }
        } catch {
          /* file okunamazsa atla */
        }
      });
      await Promise.all(fetches);
      if (b + batchSize < mdFiles.length) {
        await new Promise((r) => setTimeout(r, 500));
      }
    }
  } catch (err) {
    console.error('  ⚠ Mustvlad prompts cekilemedi:', (err as Error).message);
  }

  console.log(`  → ${results.length} prompt yuklendi`);
  return results;
}

// ── 4. ChatGPT-Data-Science-Prompts ─────────────────────────
async function fetchDataSciencePrompts(): Promise<RawPrompt[]> {
  console.log('\n📦 [4/7] travistangvh/ChatGPT-Data-Science-Prompts...');
  const results: RawPrompt[] = [];

  try {
    const readme = await fetchText(
      'https://raw.githubusercontent.com/travistangvh/ChatGPT-Data-Science-Prompts/main/README.md'
    );

    // Pattern: ## Category \n prompt text
    // or numbered list items
    const promptBlocks = readme.split(/\n(?=###?\s)/);
    let currentCategory = 'Data Science';

    for (const block of promptBlocks) {
      const headerMatch = block.match(/^###?\s+(.+)/);
      if (headerMatch) {
        currentCategory = (headerMatch[1] ?? '').trim();
      }

      // "Act as" veya uzun metin promptlarini cikar
      const lines = block.split('\n');
      for (const line of lines) {
        const cleaned = line.replace(/^\d+\.\s*/, '').replace(/^[-*]\s*/, '').trim();
        // En az 50 karakter ve bir cumle yapisi olan satirlari prompt olarak al
        if (
          cleaned.length > 80 &&
          !cleaned.startsWith('#') &&
          !cleaned.startsWith('![') &&
          !cleaned.startsWith('[') &&
          !cleaned.startsWith('http') &&
          !cleaned.match(/^(\*\*|__)/)
        ) {
          // Backtick icindeki prompt'lari cikar
          const backtickMatch = cleaned.match(/[`""](.{50,})[`""]/);
          const promptText = backtickMatch ? (backtickMatch[1] ?? cleaned) : cleaned;

          if (promptText.length > 50) {
            results.push({
              name: `DS: ${currentCategory.slice(0, 60)}`,
              prompt: promptText,
              source: 'github:travistangvh/ChatGPT-Data-Science-Prompts',
              domainId: 'data-science',
              tags: ['data-science', 'chatgpt', currentCategory.toLowerCase()],
            });
          }
        }
      }
    }
  } catch (err) {
    console.error('  ⚠ Data Science prompts cekilemedi:', (err as Error).message);
  }

  console.log(`  → ${results.length} prompt yuklendi`);
  return results;
}

// ── 5. Academic Writing Prompts ─────────────────────────────
async function fetchAcademicWritingPrompts(): Promise<RawPrompt[]> {
  console.log('\n📦 [5/7] ahmetbersoz/chatgpt-prompts-for-academic-writing...');
  const results: RawPrompt[] = [];

  try {
    const readme = await fetchText(
      'https://raw.githubusercontent.com/ahmetbersoz/chatgpt-prompts-for-academic-writing/main/README.md'
    );

    let currentCategory = 'Academic Writing';
    const lines = readme.split('\n');

    for (const line of lines) {
      const headerMatch = line.match(/^##\s+(.+)/);
      if (headerMatch) {
        currentCategory = (headerMatch[1] ?? '')
          .replace(/[🔍📝✍️🧩🎓💡📚🏆📖🔬]+/g, '')
          .trim();
        continue;
      }

      // Prompt satirlarini cikar (genellikle backtick veya tirnak icinde)
      const cleaned = line.replace(/^[-*]\s*/, '').trim();
      if (cleaned.length > 60 && !cleaned.startsWith('#') && !cleaned.startsWith('![')) {
        results.push({
          name: `Academic: ${currentCategory.slice(0, 50)}`,
          prompt: cleaned,
          source: 'github:ahmetbersoz/chatgpt-prompts-for-academic-writing',
          domainId: 'academic-writing',
          tags: ['academic', 'writing', 'research', currentCategory.toLowerCase()],
        });
      }
    }
  } catch (err) {
    console.error('  ⚠ Academic writing prompts cekilemedi:', (err as Error).message);
  }

  console.log(`  → ${results.length} prompt yuklendi`);
  return results;
}

// ── 6. spdustin/ChatGPT-AutoExpert ──────────────────────────
async function fetchAutoExpertPrompts(): Promise<RawPrompt[]> {
  console.log('\n📦 [6/7] spdustin/ChatGPT-AutoExpert...');
  const results: RawPrompt[] = [];

  const files = [
    {
      url: 'https://raw.githubusercontent.com/spdustin/ChatGPT-AutoExpert/main/_system-prompts/all_tools.md',
      name: 'AutoExpert: All Tools System Prompt',
    },
    {
      url: 'https://raw.githubusercontent.com/spdustin/ChatGPT-AutoExpert/main/standard-edition/chatgpt_GPT4_system_prompt.md',
      name: 'AutoExpert: GPT-4 Custom Instructions',
    },
    {
      url: 'https://raw.githubusercontent.com/spdustin/ChatGPT-AutoExpert/main/standard-edition/chatgpt_GPT4_about_me.md',
      name: 'AutoExpert: About Me Template',
    },
    {
      url: 'https://raw.githubusercontent.com/spdustin/ChatGPT-AutoExpert/main/developer-edition/chatgpt_GPT4_developer_system_prompt.md',
      name: 'AutoExpert: Developer Edition System Prompt',
    },
  ];

  for (const file of files) {
    try {
      const content = await fetchText(file.url);
      if (content && content.length > 50) {
        results.push({
          name: file.name,
          prompt: content.trim(),
          source: 'github:spdustin/ChatGPT-AutoExpert',
          domainId: 'auto-expert',
          tags: ['system-prompt', 'auto-expert', 'chatgpt', 'custom-instructions'],
        });
      }
    } catch {
      /* file yoksa atla */
    }
  }

  console.log(`  → ${results.length} prompt yuklendi`);
  return results;
}

// ── 7. ai-boost/awesome-prompts (GPT Store) ────────────────
async function fetchAiBoostPrompts(): Promise<RawPrompt[]> {
  console.log('\n📦 [7/7] ai-boost/awesome-prompts...');
  const results: RawPrompt[] = [];

  try {
    const apiUrl =
      'https://api.github.com/repos/ai-boost/awesome-prompts/contents/prompts';
    const items = (await fetchJSON(apiUrl)) as Array<{
      name: string;
      download_url: string;
    }>;
    const mdFiles = items.filter((item) => item.name.endsWith('.md'));

    console.log(`  → ${mdFiles.length} markdown dosyasi bulundu`);

    const batchSize = 10;
    for (let b = 0; b < mdFiles.length; b += batchSize) {
      const batch = mdFiles.slice(b, b + batchSize);
      const fetches = batch.map(async (file) => {
        try {
          const content = await fetchText(file.download_url);
          if (content && content.length > 50) {
            const name = file.name
              .replace(/\.md$/, '')
              .replace(/[-_]/g, ' ')
              .replace(/\b\w/g, (c) => c.toUpperCase());

            // Icerikten prompt kismini cikar
            let promptText = content;
            // Ilk markdown basligini kaldir
            promptText = promptText.replace(/^#\s+.*\n+/m, '').trim();

            if (promptText.length > 30) {
              results.push({
                name: `GPT Store: ${name}`,
                prompt: promptText,
                source: 'github:ai-boost/awesome-prompts',
                domainId: 'gpt-store',
                tags: ['gpt-store', 'gpt', 'system-prompt'],
              });
            }
          }
        } catch {
          /* file okunamazsa atla */
        }
      });
      await Promise.all(fetches);
      if (b + batchSize < mdFiles.length) {
        await new Promise((r) => setTimeout(r, 500));
      }
    }
  } catch (err) {
    console.error('  ⚠ ai-boost prompts cekilemedi:', (err as Error).message);
  }

  console.log(`  → ${results.length} prompt yuklendi`);
  return results;
}

// ── Ana Import Islemi ───────────────────────────────────────
async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  GitHub Prompt Kutuphaneleri Import Scripti');
  console.log('═══════════════════════════════════════════════════');

  // Mevcut promptlari oku
  const existing = readIndex();
  const existingIds = new Set(existing.map((p) => p.id));
  const existingPromptTexts = new Set(
    existing.map((p) => p.masterPrompt.slice(0, 100).toLowerCase())
  );
  console.log(`\nMevcut prompt sayisi: ${existing.length}`);

  // Tum kaynaklardan promptlari topla
  const allRaw: RawPrompt[] = [];

  const sources = [
    fetchAwesomeChatGPTPrompts,
    fetchFabricPatterns,
    fetchMustvladPrompts,
    fetchDataSciencePrompts,
    fetchAcademicWritingPrompts,
    fetchAutoExpertPrompts,
    fetchAiBoostPrompts,
  ];

  for (const sourceFn of sources) {
    try {
      const prompts = await sourceFn();
      allRaw.push(...prompts);
    } catch (err) {
      console.error(`  ⚠ Kaynak hatasi: ${(err as Error).message}`);
    }
  }

  console.log(`\n─────────────────────────────────────────────────`);
  console.log(`Toplam cekilen prompt: ${allRaw.length}`);

  // Duplicate kontrolu ve donusturme
  const usedIds = new Set(existingIds);
  let added = 0;
  let skipped = 0;
  const newPrompts: StoredPrompt[] = [];

  for (const raw of allRaw) {
    // Duplicate kontrolu: prompt metninin ilk 100 karakterine bak
    const textKey = raw.prompt.slice(0, 100).toLowerCase();
    if (existingPromptTexts.has(textKey)) {
      skipped++;
      continue;
    }
    existingPromptTexts.add(textKey);

    // Benzersiz ID olustur
    let baseId = `gh-${slugify(raw.name)}`;
    let id = baseId;
    let n = 1;
    while (usedIds.has(id)) {
      id = `${baseId}-${n}`;
      n++;
    }
    usedIds.add(id);

    const stored: StoredPrompt = {
      id,
      version: '1.0.0',
      name: raw.name,
      masterPrompt: raw.prompt,
      meta: {
        intent: raw.domainId,
        domainId: raw.domainId,
        source: raw.source,
        tags: raw.tags,
      },
      createdAt: NOW,
    };

    newPrompts.push(stored);
    added++;
  }

  console.log(`Eklenen yeni prompt: ${added}`);
  console.log(`Atlanan (duplicate): ${skipped}`);

  if (added > 0) {
    // Yeni promptlari mevcut olanlarla birlestir
    const merged = [...existing, ...newPrompts];
    writeIndex(merged);
    console.log(`\n✅ Toplam ${merged.length} prompt kaydedildi (.prompts/index.json)`);
  } else {
    console.log('\n⚠ Yeni prompt eklenmedi.');
  }

  // Kaynak bazli ozet
  console.log('\n─── Kaynak Ozeti ───');
  const sourceCount: Record<string, number> = {};
  for (const p of newPrompts) {
    const src = (p.meta as Record<string, unknown>)?.source as string || 'unknown';
    sourceCount[src] = (sourceCount[src] || 0) + 1;
  }
  for (const [src, count] of Object.entries(sourceCount).sort(
    (a, b) => b[1] - a[1]
  )) {
    console.log(`  ${src}: ${count}`);
  }

  console.log('\n═══════════════════════════════════════════════════');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
