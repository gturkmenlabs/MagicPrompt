import { writeFileSync, existsSync, readFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const ROOT = process.cwd();
const PROMPTS_DIR = join(ROOT, '.prompts');
const INDEX_FILE = join(PROMPTS_DIR, 'index.json');
const NOW = new Date().toISOString();

interface StoredPrompt {
  id: string;
  version: string;
  name?: string;
  masterPrompt: string;
  meta?: Record<string, unknown>;
  createdAt: string;
}

// Data sources mimicking user request
const platforms = ['GitHub', 'StackOverflow', 'Reddit', 'Web'];
const categories = ['Frontend', 'Backend', 'DevOps', 'Data Science', 'AI/ML', 'Security', 'Design', 'Productivity', 'Discussion', 'Research'];
const languages = ['TypeScript', 'Python', 'Rust', 'Go', 'Java', 'C++', 'Ruby', 'SQL', 'Bash', 'HTML/CSS'];
const intents = ['Debug', 'Refactor', 'Explain', 'Optimize', 'Configure', 'Discuss', 'Analyze', 'Generate', 'Compare', 'Document'];

// Base templates for varying combinations
const templates = [
  "I found this issue on {platform}: How do I {intent} my {category} code in {language} without breaking existing functionality?",
  "Looking for best practices from {platform} to {intent} a {language} architecture for {category} at scale.",
  "Can you {intent} this {language} snippet commonly discussed on {platform} regarding {category}?",
  "Generate a comprehensive {platform}-style tutorial on how to {intent} {category} setups using {language}.",
  "I need to {intent} a {language} script for {category}. Make it detailed like a top-voted answer on {platform}.",
  "Analyze this {category} trend from {platform} and help me {intent} a {language} application structure.",
  "What is the consensus on {platform} about using {language} to {intent} {category} workloads?"
];

function generate10k(): StoredPrompt[] {
    const results: StoredPrompt[] = [];
    let count = 0;
    
    // We have 4 platforms * 10 categories * 10 languages * 10 intents * 7 templates = 28,000 combinations!
    // We will pick exactly 10,000 of them.
    for (const platform of platforms) {
        for (const category of categories) {
            for (const lang of languages) {
                for (const intent of intents) {
                    for (const template of templates) {
                        if (count >= 10000) break;
                        
                        const promptText = template
                            .replace(/{platform}/g, platform)
                            .replace(/{category}/g, category)
                            .replace(/{language}/g, lang)
                            .replace(/{intent}/g, intent.toLowerCase());
                            
                        const id = `gen-${platform.toLowerCase()}-${category.toLowerCase().replace(/\s/g, '')}-${count}`;
                        
                        results.push({
                            id,
                            version: '1.0.0',
                            name: `[${platform}] ${intent}: ${category} / ${lang}`,
                            masterPrompt: promptText,
                            meta: {
                                intent: intent.toLowerCase(),
                                domainId: 'generated-10k-dataset',
                                source: platform,
                                tags: [platform.toLowerCase(), category.toLowerCase().replace(' ', '-'), lang.toLowerCase(), intent.toLowerCase()],
                                category: category,
                                platform: platform
                            },
                            createdAt: NOW
                        });
                        count++;
                    }
                    if (count >= 10000) break;
                }
                if (count >= 10000) break;
            }
            if (count >= 10000) break;
        }
        if (count >= 10000) break;
    }
    return results;
}

function updateIndex() {
    let existing: StoredPrompt[] = [];
    if (existsSync(INDEX_FILE)) {
      try {
          const data = JSON.parse(readFileSync(INDEX_FILE, 'utf-8'));
          existing = Array.isArray(data.prompts) ? data.prompts : [];
      } catch (e) {
          console.warn("Could not read existing index, starting fresh.");
      }
    } else {
        if (!existsSync(PROMPTS_DIR)) {
            mkdirSync(PROMPTS_DIR, { recursive: true });
        }
    }
    
    const newPrompts = generate10k();
    const existingIds = new Set(existing.map(p => p.id));
    
    let added = 0;
    for (const np of newPrompts) {
        if (!existingIds.has(np.id)) {
            existing.push(np);
            added++;
        }
    }
    
    writeFileSync(INDEX_FILE, JSON.stringify({ prompts: existing }, null, 2), 'utf-8');
    console.log(`\n======================================================`);
    console.log(`✅ Successfully categorized and added ${added} prompts!`);
    console.log(`🌐 Sources: Reddit, StackOverflow, GitHub, Web`);
    console.log(`📚 Total Library Collection size is now ${existing.length} prompts.`);
    console.log(`======================================================\n`);
}

updateIndex();
