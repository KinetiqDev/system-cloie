# ADR 0020: Self-Hosted Supabase Only — Target-Neutral Backends

- **Status:** Accepted
- **Date:** 2026-08-30
- **Contexts:** Deployment Operations, Identity and Access, Continuous Integration

## Decision

System CLOIE supports only Supabase-compatible **self-hosted** backends: the local Supabase CLI Docker stack for development and independently operated Supabase Docker instances for every non-local target (staging, dedicated demo, disposable CI, and production). Supabase Cloud is removed from the supported workflow — no Platform login, no project linking, no project references, no Platform access tokens, and no linked migration or baseline-repair commands.

The application keeps **one runtime path** and **one environment contract**. Browser and SSR Auth clients read the configured public Supabase URL and browser-safe public key; Prisma reads the configured runtime and direct PostgreSQL URLs. Selecting a different backend is an operator-controlled restart boundary: stop System CLOIE, activate another environment profile, clear stale Auth cookies, and restart. There is no live, browser-selectable, request-level, or failover backend switching.

Backend identity is explicit and server-only. Opaque operator-assigned identifiers replace hosted project references; identity is compared by strict string equality and is never derived from hostnames, URLs, or Docker service names. Local destructive commands always target the local CLI stack explicitly. Remote migration, dry-run, push, and type-generation commands always take the direct database URL explicitly.

## Context

System CLOIE's development and tooling previously assumed a linked Supabase Cloud project: migration listing and deployment, generated database types, dedicated demo isolation, and target verification depended on Platform access tokens, project references, linked-project state, `*.supabase.co` hostnames, and hosted Supavisor hostnames. Removing Cloud must not weaken safety: demo authentication and destructive reset derived project identity from hosted names, and arbitrarily accepting custom domains or Docker service names would let a configuration mistake point a destructive command at primary Production.

Self-hosted targets introduce arbitrary origins (custom HTTPS domains, private Docker hostnames, Coolify-generated names) that cannot be identified by hostname heuristics. Portability therefore requires explicit backend identity plus positive destructive-target verification.

## Decision Details

### One environment contract

- **Public client contract:** `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`. These are the only `NEXT_PUBLIC_*` values and are browser-safe.
- **Server database contract:** `DATABASE_URL` (pooled/runtime) and `DIRECT_URL` (direct; used for schema operations).
- **Backend identity (server-only):** `CLOIE_BACKEND_ID` (the running deployment), `CLOIE_DEPLOYMENT_KIND`, `CLOIE_PRIMARY_BACKEND_ID`, `CLOIE_DEMO_BACKEND_ID`, `CLOIE_DEMO_DATABASE_ID`.
- Identity values are opaque operator-assigned strings, charset `[A-Za-z0-9._-]`, non-empty where required, compared strictly, and never derived from hostnames. They are never logged and never exposed through `NEXT_PUBLIC_*` or browser bundles. `CLOIE_BACKEND_ID` is unset for local development and disposable CI. `CLOIE_DEMO_DATABASE_ID` must match the private marker on the dedicated demo database.

### Local development (canonical)

The Supabase CLI Docker stack is the canonical development backend. Repository commands:

- `pnpm supabase:start` — start the local stack.
- `pnpm supabase:stop` — stop the local stack.
- `pnpm supabase:status` — inspect local endpoints and generated credentials.
- `pnpm supabase:reset` — destructive local reset; always targets the local CLI stack explicitly and never consumes a remote database URL.
- `pnpm supabase:migration:list:local` — list migrations against the local stack.
- `pnpm supabase:types:local` — generate TypeScript types from the local stack.

Local Google OAuth is configured in `supabase/config.toml` through environment substitution (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`); no provider secret is committed. Local callbacks are `http://127.0.0.1:54321/auth/v1/callback` (Supabase Auth) and `http://127.0.0.1:3000/api/auth/callback` (System CLOIE).

### Explicit remote targets

Remote schema operations never rely on linked state:

- `pnpm supabase:migration:list` — remote migration list via `DIRECT_URL` (`--db-url`).
- `pnpm supabase:push:dry-run` — remote dry-run via `DIRECT_URL`.
- `pnpm supabase:push` — remote migration push via `DIRECT_URL`.
- `pnpm supabase:types` — remote type generation via `DIRECT_URL`.
- `pnpm supabase:migration:diff` and `pnpm supabase:migration:baseline` remain the Prisma-first migration generators.

Missing explicit target configuration fails with a useful error; there is no linked-project fallback.

### Demo safety

Dedicated demo authentication (ADR 0008) remains: primary Production stays OAuth-only, and demo behavior stays unavailable until every required condition passes. Identity is now opaque:

- Demo auth requires `CLOIE_DEPLOYMENT_KIND=dedicated-demo`, `CLOIE_DEMO_ENABLED`, session secret and allowlist present, `CLOIE_BACKEND_ID === CLOIE_DEMO_BACKEND_ID`, and `CLOIE_BACKEND_ID !== CLOIE_PRIMARY_BACKEND_ID`.
- Destructive demo reset additionally verifies deployment kind, backend identity, the operator-assigned database identity, `NEXT_PUBLIC_SUPABASE_URL`, `DATABASE_URL`, and `DIRECT_URL`, separation from primary Production, and an independent marker in the private `cloie_ops` schema. The marker records the demo backend identity, database identity, and configured public URL. The schema and table deny `PUBLIC`, `anon`, and `authenticated` access and enable RLS. Reset and baseline seed use `--db-url`; no generic command resets whichever database happens to be configured.

## Options Considered

### Keep Supabase Cloud linking plus self-hosted branches

Rejected. It would preserve Platform coupling, require provider branches in tooling, and contradict the requirement that one migration history and one command contract serve every target.

### Identify backends by hostname heuristics (custom domains, Docker names)

Rejected. Arbitrary self-hosted hostnames cannot prove identity, and permissive heuristics would weaken destructive-target safety. Explicit opaque identifiers, compared strictly, are the only reliable contract.

### Environment-detected backend switching at runtime

Rejected. The contract is a restart boundary: switching targets requires stopping the application, activating another profile, clearing stale Auth cookies, and restarting. Live or request-level switching is out of scope.

## Consequences

### Positive

- One migration history, one command contract, and one runtime path across local Docker, remote self-hosted Docker, dedicated demo, and disposable CI.
- Cloud Platform tokens, project references, and linked-project metadata are gone from the repository contract and committed templates.
- Destructive operations are positively verified (explicit local mode or explicit identity plus target marker), protecting primary Production from configuration mistakes.
- Local Google OAuth exercises the real two-stage flow during development without committing secrets.
- Coolify and other self-hosted platforms consume the same proven environment contract.

### Negative

- Operators must assign and record opaque backend identities per deployment; identity cannot be inferred from a URL.
- Backend switching is an operator procedure (stop, swap profile, clear cookies, restart) rather than automatic.
- A later one-time data migration from the former Supabase Cloud database is external cutover activity and must not reintroduce Cloud tooling.

## Interaction with ADR 0008

ADR 0008 remains in force. Its project-reference controls (`CLOIE_DEMO_SUPABASE_PROJECT_REF` / `CLOIE_PRIMARY_SUPABASE_PROJECT_REF` / `SUPABASE_PROJECT_REF`) are replaced by the opaque backend identity contract above; the demo authentication fail-closed rules, cookie contract, isolation, and reset safety are unchanged in substance. The dedicated demo deployment remains a separate isolated backend whose database is never primary Production.

## References

- [ADR 0008: Dedicated Demo Deployment Authentication](./0008-dedicated-demo-deployment-authentication.md)
- Operator runbook: `docs/runbooks/dedicated-demo-deployment.md`
- Local/remote command reference: `supabase/README.md`
- GitHub issue: [KinetiqDev/system-cloie#583](https://github.com/KinetiqDev/system-cloie/issues/583)
