<p align="center"> 
<img src="https://img.shields.io/badge/NeoMagic-v3.2-8B5CF6?style=for-the-badge&labelColor=1a1a2e" alt="NeoMagic v3.2" /> 
<img src="https://img.shields.io/badge/AI%20Powered-Prompt%20Engineering-00D4FF?style=for-the-badge&labelColor=1a1a2e" alt="AI Powered" /> 
<img src="https://img.shields.io/badge/57-Reasoning%20Frameworks-F59E0B?style=for-the-badge&labelColor=1a1a2e" alt="57 Reasoning Framework" /> 
<img src="https://img.shields.io/badge/59-Domain%20Packs-EC4899?style=for-the-badge&labelColor=1a1a2e" alt="59 Domain Packs" />
<img src="https://img.shields.io/badge/10%2B-LLM%20Providers-10B981?style=for-the-badge&labelColor=1a1a2e" alt="10+ Providers" />
</p>

<h1 align="center">NeoMagic</h1>

<h3 align="center">The Prompt Engineering Platform That Thinks Before You Write</h3>

<p align="center">
<b>Transform your raw intent into production-ready prompts.</b><br/>

57 reasoning frameworks. 59 industry domain packs. More than 10 LLM providers. AI-powered quality assurance.<br/>
MCP server. CLI. VS Code plugin. Slack bot. A single platform to manage it all.

<p align="center">
<a href="#-features">Features</a> •
<a href="#-quick-start">Quick Start</a> •
<a href="#-architecture">Architecture</a> •
<a href="#-integrations-and-plugins">Integrations</a> •
<a href="#-deployment">Deployment</a> •
<a href="#-environment-variables">Environment</a> •
<a href="#-development">Development</a>
</p>

---

## What's the Problem?

You write a prompt. It partially works. You make 47 changes to it. It still hallucinates. You try another model and everything breaks. Sound familiar?

**NeoMagic eliminates the assumptions and trial and error in prompt creation.** It analyzes your true intent, selects the most appropriate reasoning framework, produces a structured master prompt, and then puts it through quality control by an AI jury — all before a single token reaches your LLM.

---

## Why NeoMagic?

| Without NeoMagic | With NeoMagic |
|:-:|:-:|
| Trial and error prompt writing | Intent-based, framework-optimized generation |
| Copy-paste from ChatGPT | Automatic selection of 57 reasoning strategies |
| "It works in my model" | Provider-agnostic IR compilation |
| No quality feedback | Judge Ensemble + Prompt Lint + Regression testing |
| Prompts that degrade over time | Versioning, diff viewer, rollback |
| One prompt at a time | Genetic evolution, batch optimization |
| No standard check | WCAG, OWASP, GDPR compliance dashboard |
| Just one tool | CLI + MCP + VS Code + Slack integrations |

---

## Features

### Prompt Generation Engine

- **57 Reasoning Frameworks** — AUTO, Chain of Thought (CoT), Tree of Thought (ToT), ReAct, RISEN, CoSTAR, OODA, Red-teaming, First Principles, Design Thinking, SCAMPER, Six Thinking Hats, Game Theory, Bayesian, MECE, PESTEL, TRIZ, Futures Wheel, Backcasting, and many more.
- **59 Domain Packages** — Frontend, Backend, ML/AI, NLP/LLM, DevOps, FinTech, Healthcare, Blockchain, Law, Education, Cybersecurity, Robotics, Game Development, Aerospace, Pharmaceuticals, Conversational AI, and more.
- **Intermediate Representation (IR) Pipeline** — Compiles prompts into a provider-independent JSON format, then optimizes them model-specifically for maximum performance.
- **Prompt DSL** — Custom domain-specific language for declarative prompt writing.
- **Semantic Cache** — Domain + framework + provider-aware intent fingerprinting. Never generate the same prompt twice.
- **Custom Generator** — Create your own domain packages and reasoning frameworks.

### Quality Assurance (QA)

- **Judge Ensemble** — Multi-criteria AI scoring: clarity, testability, compliance with constraints, security, repeatability — with automated dispute resolution.
- **Prompt Lint** — Catches ambiguous actions, missing success criteria, format gaps, and token budget overruns.
- **Regression Testing** — Compare your prompts against real-world test scenarios. CI ready: `npm run regression:ci`.
- **Version & Diff Viewer** — Git-like prompt history with branching, rollback, and origin tracking.
- **A/B Testing** — Statistical testing framework for prompt comparison.
- **Security Immunity** — Security testing against prompt injection and jailbreak attacks.
- **Standard Compliance** — WCAG 2.1 AA, OWASP Top 10, GDPR, Core Web Vitals dashboard.
- **Contract Validation** — Structured output contract enforcement with schema validation.

### Automation & DevOps

- **Genetic Evolution** — Evolve prompts across generations using fitness scoring and crossover.
- **Budget Optimizer** — Token cost analysis and optimization across providers.
- **Canary Runs** — Test prompt changes against production scenarios before rollout.
- **CI/CD Integration** — Full GitHub Actions workflow with typecheck, regression, and smoke test gates.

### Collaboration

- **Multi-Agent Orchestrator** — Decompose complex tasks across specialized AI agents.
- **Prompt Lifecycle Management** — Draft → review → approve → publish workflow.
- **Collaboration Spaces** — Team-based prompt sharing and review.

---

## Quick Start

### Prerequisites

- Node.js 20+
- npm 10+
- PostgreSQL 15+ with pgvector extension (for semantic cache)
- OpenAI API key (or any supported provider key)

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd neomagic

# Install dependencies
npm install

# Set up environment
cp backend/.env.example backend/.env
# Edit .env with your API keys

# Start development
npm run dev:all
```

Frontend starts at `http://localhost:3000`, API at `http://localhost:4000`.

### Commands

| Command | Purpose |
|---|---|
| `npm run dev:all` | Start frontend + API concurrently |
| `npm run dev` | Frontend only (Vite, port 3000) |
| `npm run api` | Backend only (Express, port 4000) |
| `npm run build` | Vite production build |
| `npm run build:all` | Build shared → frontend → backend |
| `npm run typecheck` | TypeScript check across all workspaces |
| `npm run test:run` | Vitest single pass |
| `npm run test:api:smoke` | Supertest route smoke tests |
| `npm run test:e2e:smoke` | Playwright E2E smoke tests |
| `npm run regression:ci` | Prompt regression suite |
| `npm run mcp:server` | Start MCP server |
| `npm run db:setup` | Initialize database schema |
| `npm run db:seed` | Seed default organization |

---

## Architecture

### Monorepo Structure

```
(repo root)
├── frontend/                 React 19 + Vite (port 3000)
│   ├── src/
│   │   ├── App.tsx           Application entry point
│   │   ├── components/       UI components (Radix, MUI, Tailwind, Framer)
│   │   ├── services/         Frontend API clients
│   │   ├── hooks/, contexts/, stores/
│   │   └── features/, locales/, data/, utils/, lib/
│   ├── index.html, vite.config.ts, tailwind.config.js
│   └── package.json
│
├── backend/                  Express 5 API (port 4000) + MCP + CLI + SDK
│   ├── server/
│   │   ├── app.ts            Express app (helmet, CORS, /v1 + /api/v1)
│   │   ├── index.ts          Bootstrap + security guards
│   │   ├── routes/           24+ endpoint files
│   │   ├── lib/              Server services
│   │   ├── middleware/       auth, rbac, rateLimit, validation
│   │   └── db/               pg client + SQL migrations
│   ├── mcp/server.ts         MCP server (24+ tools)
│   ├── cli/sr.ts             CLI tool
│   ├── sdk/client.ts         TypeScript SDK
│   ├── integrations/slack-bot/
│   └── deploy/, scripts/
│
├── shared/                   Shared code between frontend and backend
│   ├── services/             judgeEnsemble, promptLint, agentService, semanticCache
│   ├── types/                Framework enum + all domain types (canonical source)
│   ├── dsl/                  Prompt DSL parser + JSON schema
│   ├── compilers/            IR compiler pipeline
│   ├── utils/                compressIntent, analysis, cache
│   └── data/                 templates, shared data
│
├── routing-service/          Standalone Fastify micro-service
├── sk-service/               Python FastAPI SK-RAG service
├── docs/                     Project documentation
└── extensions/vscode-extension/
```

### Key Architecture Decisions

- **Provider-Agnostic IR Pipeline**: Prompts are compiled into a JSON Intermediate Representation, then rendered per-provider for optimal performance.
- **Security-First Design**: API keys are proxied through the backend — frontend never holds raw provider secrets.
- **Monorepo with npm Workspaces**: `frontend`, `backend`, and `shared` packages share types and services.
- **Path Alias Convention**: `@/` maps to `frontend/src/` or `backend/` root; `@shared/` maps to the shared package.

---

## Integrations and Plugins

### MCP Server
24+ tools for AI-powered prompt engineering. Start with:
```bash
npm run mcp:server
```

### CLI (`sr`)
Command-line prompt engineering:
```bash
npx sr generate "Build a login form"
npx sr validate prompt.json
npx sr evolve --generations 10
```

### TypeScript SDK
```typescript
import { NeoMagicClient } from '@neomagic/sdk';
const client = new NeoMagicClient({ apiKey: '...' });
const result = await client.generate('Build a REST API');
```

### VS Code Extension
In-editor prompt creation, testing, and version management.

### Slack Bot
Team collaboration and prompt review directly from Slack.

---

## Deployment

### Docker
```bash
docker-compose up -d
```

### VPS (Hostinger / DigitalOcean)
See `backend/deploy/` for deployment scripts:
- `setup-vps.sh` — Initial server setup
- `vps-deploy.sh` — Full deployment
- `nginx-neomagic.conf` — Nginx configuration

### CI/CD Pipeline
GitHub Actions workflow with gates:
1. Script verification
2. TypeScript typecheck with budget
3. Vitest unit tests
4. Prompt regression suite
5. Vite production build
6. API smoke tests (supertest)
7. Playwright E2E smoke tests

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `VITE_API_URL` | `http://localhost:4000` | Vite proxy target |
| `DISABLE_API_KEY_AUTH` | `true` | Bypasses API key check (dev/CI only) |
| `SUPABASE_JWT_SECRET` | — | Required in production |
| `CORS_ALLOWED_ORIGINS` | — | Required in production |
| `VITE_ALLOW_OPEN_ACCESS` | — | Cannot be `true` in production |
| `API_KEYS_SCOPED_JSON` | — | JSON array of scoped API keys |

---

## Development

### Conventions

- **New frontend files**: `frontend/src/`
- **Shared business logic**: `shared/services/` or `shared/utils/`
- **Backend endpoints**: `backend/server/routes/`
- **TypeScript**: Strict mode with `strictNullChecks` active
- **ESLint**: `no-console` (warn/error only), `no-explicit-any` as warning
- **Styling**: Tailwind v3 with project tokens (cyber-primary, cyber-dark, glassmorphism)

### CI Gates

1. `verify:scripts` — Script targets exist
2. `typecheck` — Full workspace TypeScript check
3. `typecheck:budget` — Error budget baseline enforcement
4. `test:run` — Vitest unit tests
5. `regression:ci` — Prompt regression suite
6. `build` — Vite production build
7. `test:api:smoke` — API endpoint tests
8. Playwright smoke — E2E browser tests

---

## License

MIT
