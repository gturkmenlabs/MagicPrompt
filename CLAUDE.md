# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project: NeoMagic (`super-reasoning` v3.2)

Prompt-engineering platform that compiles raw user intent into provider-agnostic prompts using 57 reasoning frameworks and 59 domain packs, then QA-checks them through a judge ensemble. Ships a React 19 web app, an Express API, an MCP server, a CLI (`sr`), an SDK, a VS Code extension, a Slack bot, plus two micro-services (Fastify routing, FastAPI SK-RAG).

**Monorepo yapısı:** `frontend/` (Vite React), `backend/` (Express API + MCP + CLI + SDK), `shared/` (types, DSL, compilers, paylaşımlı servisler).

## Commands

Tüm komutlar root `package.json`'dan çalıştırılır (npm workspaces):

### Develop
| Command | Purpose |
|---|---|
| `npm run dev:all` | **Standard.** Frontend (Vite, port 3000) + API (Express, port 4000) concurrently. |
| `npm run dev` | Frontend only (`frontend/` workspace). |
| `npm run api` | Backend only (`backend/` workspace, `tsx server/index.ts`). |

Workspace'e özgü komutlar için: `npm run <cmd> --workspace=frontend` veya `--workspace=backend`.

### Build / typecheck
| Command | Purpose |
|---|---|
| `npm run build` | Vite production build (`frontend/dist/`). |
| `npm run build:all` | shared → frontend → backend sırayla build. |
| `npm run typecheck` | Tüm workspace'lerde `tsc --noEmit`. |
| `npm run typecheck:budget` | **Required CI gate.** `backend/.typecheck-budget.json` baseline kontrolü. |

### Test
| Command | Purpose |
|---|---|
| `npm run test:run` | Vitest single pass (frontend workspace). |
| `npm run test:api:smoke` | Supertest route smoke tests (backend workspace). |
| `npm run test:e2e:smoke` | Playwright: `frontend/e2e/comprehensive.spec.ts` |
| `npm run regression:ci` | Prompt regression suite (backend workspace). |
| Run a single Vitest file | `npx vitest run path/to/file.test.ts` (workspace içinde) |

### Database (Postgres / pgvector)
- `npm run db:setup` — initial schema setup
- `npm run db:seed` — seed default org
- `npm run migrate:up` / `migrate:down` — SQL files in `backend/server/db/migrations/`
- `npm run seed:vectors` — populate pgvector store

### Other entry points
- `npm run mcp:server` — MCP server (`backend/mcp/server.ts`)
- `npm run routing:up` — Fastify routing micro-service (`routing-service/`)
- `npm run finetune:start|status|activate` — OpenAI fine-tune lifecycle scripts
- `npm run canary` — canary run against current prompts

## Architecture

### Monorepo yapısı

```
(repo root)
├── frontend/                 ← React 19 + Vite (port 3000)
│   ├── src/
│   │   ├── App.tsx           ← Canlı uygulama giriş noktası
│   │   ├── index.tsx         ← Vite entry (index.html tarafından yüklenir)
│   │   ├── components/       ← UI bileşenleri (Radix, MUI, Tailwind, Framer)
│   │   ├── services/         ← Frontend-only API istemcileri (unifiedProviderClient vb.)
│   │   ├── hooks/, contexts/, stores/
│   │   ├── features/, locales/, data/, utils/, lib/
│   │   └── app/              ← WIP yeni app migrasyonu (henüz aktif değil)
│   ├── index.html, vite.config.ts, tailwind.config.js
│   └── package.json
│
├── backend/                  ← Express 5 API (port 4000) + MCP + CLI + SDK
│   ├── server/
│   │   ├── app.ts            ← Express app (helmet, CORS, /v1 + /api/v1)
│   │   ├── index.ts          ← Bootstrap; assertStartupSecurityGuards()
│   │   ├── routes/           ← 24+ endpoint dosyası
│   │   ├── lib/              ← Server servisleri: providers, embeddings, judges
│   │   ├── middleware/       ← auth, rbac, rateLimit, validation, piiRedaction
│   │   └── db/               ← pg client + SQL migrations
│   ├── mcp/server.ts         ← MCP server (24+ tool)
│   ├── cli/sr.ts             ← `npx sr ...` CLI
│   ├── sdk/client.ts         ← NeoMagicClient TS SDK
│   ├── integrations/slack-bot/
│   ├── deploy/, scripts/
│   └── package.json
│
├── shared/                   ← Her iki tarafın kullandığı kod
│   ├── services/             ← judgeEnsemble, promptLint, agentService, semanticCache vb.
│   ├── types/index.ts        ← Framework enum + tüm domain type'ları (canonical kaynak)
│   ├── types.ts              ← Barrel re-export (import from '../types' için)
│   ├── dsl/                  ← Prompt DSL parser + JSON schema
│   ├── compilers/            ← IR compiler pipeline
│   ├── utils/                ← compressIntent, analysis (shared utilities)
│   └── data/                 ← templates, shared data
│
├── routing-service/          ← Bağımsız Fastify micro-service
├── sk-service/               ← Bağımsız Python FastAPI SK-RAG
├── docs/                     ← Proje belgeleri (ARCHITECTURE.md vb.)
└── extensions/vscode-extension/
```

### `@/` alias kuralı
- **`frontend/`**: `@/` → `frontend/src/`, `@shared/` → `../shared/`
- **`backend/`**: `@/` → `backend/`, paylaşımlı servisler için tsconfig path alias'ları mevcuttur (`@/services/judgeEnsemble` → `../shared/services/judgeEnsemble` vb.)
- **`shared/`**: `@shared/` → kendi root'u; tipler için `../types` relative path kullanılır

### Framework enum'un canonical konumu
`Framework` enum → `shared/types/index.ts` (canonical). `frontend/src/types/index.ts` da aynı enum'u tanımlar (frontend standalone kullanımı için). İkisi aynı değerlere sahip olmalı.

### Backend request flow
`server/index.ts` → `assertStartupSecurityGuards()` → `app.ts` mounts `routes/index.ts` at both `/v1` and `/api/v1`. Stripe webhook is mounted **before** `express.json()` because it needs the raw body. CORS origins come from `CORS_ALLOWED_ORIGINS` (production has empty default — must be set). Errors flow through `apiErrorHandler`. Static `dist/` is served as SPA fallback for non-API GETs. OpenTelemetry tracing must be imported before Express (`./lib/tracing`).

### Frontend → backend contract
Vite dev server proxies `/api/v1` and `/v1` to `VITE_API_URL` (default `http://localhost:4000`). All provider API keys are **proxied through the backend** — frontend never holds raw provider secrets.

### IR pipeline
Prompts are compiled into a provider-agnostic JSON IR (Intermediate Representation), then re-rendered per provider. See `server/lib/compilers/`, `server/lib/generateAdapter.ts`, and `dsl/`. Quality is enforced by the **judge ensemble** (`server/lib/pairwiseJudgeLLM.ts` and friends) plus **prompt lint** + **regression suite**.

## Environment variables

Key vars checked by `assertStartupSecurityGuards` at startup:

| Variable | Dev default | Notes |
|---|---|---|
| `VITE_API_URL` | `http://localhost:4000` | Vite proxy target |
| `DISABLE_API_KEY_AUTH` | `true` (local/CI only) | Bypasses API key check — **forbidden in production** |
| `SUPABASE_JWT_SECRET` | — | Required in production |
| `CORS_ALLOWED_ORIGINS` | — | Required in production; empty = no origins allowed |
| `VITE_ALLOW_OPEN_ACCESS` | — | Cannot be `true` in production |
| `API_KEYS_SCOPED_JSON` | — | JSON array of `{ key, scopes[] }` objects for scoped API auth |

CI runs Playwright with `DISABLE_API_KEY_AUTH=true NODE_ENV=ci`.

## Conventions

- **Yeni frontend dosyası** → `frontend/src/` altına. Paylaşımlı iş mantığı → `shared/services/` veya `shared/utils/`. Backend endpoint → `backend/server/routes/`. Asla root'a `.ts/.tsx` ekleme.
- **Paylaşımlı servis eklerken**: Backend `backend/tsconfig.json`'a path alias ekle ve `shared/services/` altına yerleştir.
- TypeScript **staged-strict migration**: sadece `strictNullChecks` aktif. Yeni strict flag'ler milestone'lara göre açılacak — bağımsız ekleme.
- Heavy logic → `frontend/src/services/` veya `backend/server/lib/`, JSX `onClick` içine değil.
- ESLint: `no-console` (sadece `warn`/`error` izinli), `@typescript-eslint/no-explicit-any` uyarı. Kullanılmayan vars `_` prefix.
- Tailwind v3 + project tokens (`cyber-primary`, `cyber-dark`, glassmorphism) — `frontend/tailwind.config.js`. Paralel design system ekleme.
- `unifiedProviderClient` ve `frontend/src/services/` wrapper'larını kullan, raw `fetch` değil.

## CI gates (`.github/workflows/`)
1. `verify:scripts` — script targets exist
2. `typecheck` — tüm workspace'lerde `tsc --noEmit`
3. `typecheck:budget` — `backend/.typecheck-budget.json` baseline aşılamaz
4. `test:run` — Vitest (frontend workspace)
5. `regression:ci` — prompt regression suite (backend workspace)
6. `build` — Vite production build (frontend workspace)
7. `test:api:smoke` — supertest (`backend/server/routes/*.test.ts`)
8. Playwright smoke (`DISABLE_API_KEY_AUTH=true`, `NODE_ENV=ci`)
9. `prompt-ci.yml` — ayrı prompt regression workflow
