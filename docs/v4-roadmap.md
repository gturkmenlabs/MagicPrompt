# NeoMagic v4.0 Roadmap

## Status: PHASE 0 (decisions + ADRs)

## Default Decisions (assumed unless user overrides)

| # | Decision | Default | Rationale |
|---|----------|---------|-----------|
| D1 | Hosting target | Existing single-VPS Docker Compose + future k8s migration in Phase 7 | `backend/docker-compose.vps.yml` already exists |
| D2 | Cache L2 store | Redis (single node dev, Cluster in prod) | Already implied by `REDIS_URL` env |
| D3 | Cache L3 store | Postgres + pgvector | `seed:vectors` script already exists |
| D4 | Event bus | Redis Streams (no RabbitMQ in Phase 1) | Avoids new infra; later upgrade path exists |
| D5 | SSO provider | Supabase Auth (existing `SUPABASE_JWT_SECRET`) + Okta as Phase 4 add-on | Reuses existing auth |
| D6 | Marketplace go-live | Read-only catalog in Phase 6; **paid transactions gated on legal review** | Risk R4 in plan |
| D7 | Federated learning | **DEFERRED to Phase 7, opt-in, behind feature flag** | Risk R5 |
| D8 | Backward-compat stance | Feature-flag everything new; **no `/v2` namespace** | Lower client churn |
| D9 | Strict-mode migration | New code only — no retroactive strict on existing files in v4 scope | Risk R3 blast radius |
| D10 | Duplicate components | Mark in `docs/v4-duplicate-cleanup.md`; consolidate during Phase 4.3 | Don't churn UI during foundation work |

## Phase Map

See `docs/v4-roadmap.md` in repo root (this file). Each phase ships with:
- updated `CLAUDE.md` section
- new ADR in `docs/adr/`
- passing CI gates 1–9
- feature flag entry in `shared/config/featureFlags.ts`

## Open Decisions (need user input before Phase 4+)

1. Confirm Okta vs Auth0 vs Azure AD for primary enterprise SSO (Phase 4.1)
2. Marketplace payment processor: extend existing Stripe or use Stripe Connect? (Phase 6.1)
3. Compliance scope: which of GDPR/SOC2/HIPAA/FedRAMP/ISO27001 is actually required for v4 launch?
4. Federated learning: do we have the statistician + privacy budget for ε<1 guarantees?

## Cross-Cutting Rules (enforced every phase)

- New endpoints: Zod input schema + RBAC middleware + OTel span
- New shared services: `shared/services/<domain>/`, exported via `@shared/`
- No new files at repo root
- Stripe webhook ordering preserved (must remain before `express.json()`)
- No `any` in new code
- Feature flags via `shared/config/featureFlags.ts` for any breaking change
- All new env vars added to `docs/ENV.md` and validated in `assertStartupSecurityGuards`
