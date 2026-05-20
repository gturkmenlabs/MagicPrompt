# Prompt Routing Service

Production-oriented hybrid router for selecting execution frameworks from prompt/context inputs.

## Features

- Fastify + TypeScript + zod
- Hybrid routing:
  - embedding-based semantic retrieval
  - rules/heuristics
  - score aggregation + optional decision layer
- Gemini Embedding support (swappable)
- Mock embedding provider for local/test
- pgvector-ready vector store (swappable)
- Full explainability logging

## Run

```bash
cd routing-service
npm install
cp .env.example .env
npm run dev
```

Service runs on `http://localhost:4300`.

## Required env vars

- `EMBEDDING_PROVIDER=mock|gemini`
- `GEMINI_API_KEY` (required if `gemini`)
- `VECTOR_STORE=in-memory|pgvector`
- `PGVECTOR_CONNECTION_STRING` (required if `pgvector`)
- `ROUTER_CONFIDENCE_THRESHOLD`

## Seed behavior

Framework registry and intent examples are seeded in memory at startup and embedded into vector store namespaces:

- `framework-registry`
- `intent-examples`

## Test

```bash
npm test
```

## API

`POST /route`

Request:

```json
{
  "prompt": "Bu repo’daki memory leak problemini bul",
  "conversationContext": [
    { "role": "user", "content": "Servis bazen cokuyor" }
  ],
  "attachments": [],
  "metadata": {
    "userId": "u123",
    "locale": "tr",
    "channel": "chat"
  }
}
```

Response:

```json
{
  "selectedFramework": "code-agent",
  "confidence": 0.87,
  "reasoning": [
    "Prompt contains strong code debugging signals",
    "Framework registry similarity ranked code-agent highest",
    "Rules engine detected repository and memory leak indicators"
  ],
  "fallbackFramework": "general-orchestrator",
  "candidateFrameworks": [
    { "name": "code-agent", "score": 0.87 },
    { "name": "workflow-agent", "score": 0.61 },
    { "name": "rag-agent", "score": 0.29 }
  ]
}
```

## Trade-offs

- MVP keeps repositories in-memory (simple and fast)
- pgvector implementation is ready but not required for local
- optional decision layer defaults to no-LLM to minimize lock-in

## Roadmap

- **MVP:** in-memory stores, mock/gemini embedding, hybrid scoring
- **Production:** pgvector + migrations, OpenTelemetry traces, decision replay dashboard
- **V2:** online learning from routing outcomes, tenant-aware registries, policy-driven routing
