# NeoMagic Architecture & Vibe Coding Guide

## Core Stack
- **Frontend**: React 19, TypeScript, Vite, TailwindCSS (v3)
- **State/Routing**: React Router DOM (v7), React Context
- **Backend**: Express API (Node.js) via TSX, PostgreSQL (Supabase/PG)
- **Testing**: Vitest for unit, Playwright for E2E
- **Build**: Vite with ES2022 target

## Directory Structure
The architecture is strictly separated to ensure clear boundaries. NEVER place source code at the repository root.

- **`/src`**: Frontend Application Root
  - `components/`: Pure visual and functional React components (e.g. `ui/`, `shell/`, `workspaces/`).
  - `services/`: API interaction loops and provider SDK wrappers (e.g. `unifiedProviderClient.ts`).
  - `contexts/` & `stores/`: Application global React contexts and stores.
  - `hooks/`: Custom React hooks (e.g., `useGeneratePrompt.ts`).
  - `utils/`: Pure functions, formatters, and logic cleanly detached from React.
  - `types/`: Universal TypeScript definitions.
- **`/server`**: Backend Express APIs and Database scripts.
  - `routes/`: API endpoint definitions.
  - `db/`: Migrations & database initialization scripts.
- **`/e2e`**: Playwright test suites.
- **`/notebooks`**: MLOps and experiment sandbox notebooks.
- **`/archive`**: Obsolete components, old migrations, and experimental scripts that have been deprecated.

## strict Design Patterns

### 1. Imports
- Always prefer absolute path aliasing for internal code: `import { Tool } from '@/utils/Tool'` rather than `../../utils/Tool`.
- `@/` maps directly to the `src/` directory.

### 2. Component Logic 
- Keep components as flat as functionally possible. Isolate large logical actions into custom `hooks/`.
- Heavy domain logic (like AI parsing or prompting) must be placed in `src/services/` not directly inside TSX onClick events. 

### 3. Consistency
- Follow the established Tailwind theme config. We use specific tone variants (e.g. `cyber-primary`, `cyber-dark`).
- Avoid adding redundant `.py` or loose shell scripts to the root. If a maintenance script is needed, put it in `scripts/` or `archive/`.

### 4. Vibe Coding Standard
- As an AI agent working within this repository, prioritize **reading existing services** before generating a duplicate one.
- DO NOT rewrite core `App.tsx` logic unless actively requested.
- Ensure all new files are created strictly within the `src/` modular organization (never at the root directory).
