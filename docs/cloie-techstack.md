---
title: CLOIE Tech Stack
kind: living-project-document
status: living
last_verified: 2026-09-04
---

# CLOIE Tech Stack

A lean, verifiable snapshot of the stack. **Most stack rules live in [AGENTS.md](../AGENTS.md)** (Tech and Repository Conventions, Architecture, Supabase and Prisma, CI) and in `docs/adr/` — this page records versions and pointers, not a duplicate specification. Versions below are read from `package.json` (specifiers) and `pnpm-lock.yaml` (resolved), verified 2026-09-04.

## Stack versions

| Category | Technology | Specifier (`package.json`) | Resolved (`pnpm-lock.yaml`) |
|----------|-----------|----------------------------|------------------------------|
| Framework | Next.js (App Router, Turbopack dev) | `16.3.3` (pinned) | 16.3.3 |
| Language | TypeScript | `^5` | 5.9.3 |
| Runtime | Node.js | — | 22 (CI workflows, Dockerfile `node:22-bookworm-slim`) |
| Package Manager | pnpm | `packageManager: pnpm@10.30.3` | 10.30.3 (CI-pinned, Dockerfile-pinned) |
| Styling | Tailwind CSS | `^4` | 4.2.2 (via `@tailwindcss/postcss`) |
| UI Components | shadcn/ui (`base-nova` style, see `components.json`) | CLI `shadcn` `^4.6.0` | 4.6.0 |
| Headless UI Primitives | `@base-ui/react` (not Radix) | `^1.4.0` | 1.4.0 |
| Forms | react-hook-form | `^7.72.1` | 7.72.1 |
| Validation | Zod | `^4.3.6` | 4.3.6 |
| Database | PostgreSQL on self-hosted Supabase | — | Postgres 17 (production, per deployment inventory); `postgres:16-alpine` in CI service containers |
| ORM | Prisma (+ `@prisma/client`) | `6.19.2` (pinned) | 6.19.2 |
| Auth | Supabase Auth (Google OAuth) via `@supabase/ssr` / `@supabase/supabase-js` | `^0.10.2` / `^2.103.3` | 0.10.2 / 2.103.3 |
| Charts | Recharts | `^3.8.1` | 3.8.1 |
| Text Processing | winkNLP + `wink-eng-lite-web-model` + stopword | `^2.4.0` / `^1.8.1` / `^3.1.5` | 2.4.0 / 1.8.1 / 3.1.5 |
| AI (server-side, bounded) | `openai` SDK against an OpenAI-compatible base URL ([ADR 0016](adr/0016-server-side-bounded-ai-interpretation-boundary.md)) | `^7.4.0` | 7.4.0 |
| Icons | lucide-react | `^1.8.0` | 1.8.0 |
| Word cloud | `@isoterik/react-word-cloud` | `^1.3.0` | 1.3.0 |
| Drag and drop | `@dnd-kit/core` / `sortable` / `utilities` | `^6.3.1` / `^10.0.0` / `^3.2.2` | 6.3.1 / 10.0.0 / 3.2.2 |
| Unit/Integration Testing | Vitest (+ Testing Library, jsdom) | `^4.1.4` | 4.1.4 |
| E2E Testing | Playwright (`@playwright/test`) + `@axe-core/playwright` sweep | `^1.62.1` / `^4.13.0` | 1.62.1 / 4.13.0 |
| Supabase CLI | `supabase` | `^2.92.1` | 2.92.1 |
| Code Intelligence | Fallow | `2.54.3` (pinned, [ADR 0011](adr/0011-fallow-code-intelligence-policy.md)) | 2.54.3 |
| Linting | ESLint (+ `eslint-config-next` `16.3.3`) | `^9` | 9.39.4 |
| Formatting | Prettier (+ `prettier-plugin-tailwindcss`) | `^3.8.3` / `^0.7.2` | 3.8.3 / 0.7.2 |

Not dependencies, deliberately: **TanStack Query** (add only when a design establishes a concrete need — see [AGENTS.md](../AGENTS.md)); no PDF-export or spreadsheet library is installed; there is no service worker (PWA installability comes from `src/app/manifest.ts`, offline caching remains deferred per [ADR 0006](adr/0006-dean-pwa-offline-cache-contract.md)).

## Where things live

| Concern | Location |
|---------|----------|
| Feature modules | `src/features/<name>/` (domain contexts: [CONTEXT-MAP.md](../CONTEXT-MAP.md)) |
| App routes | `src/app/` (App Router) |
| Server Actions | `src/lib/actions/` |
| Request boundary | `src/proxy.ts` (session refresh in `src/lib/supabase/middleware.ts`) |
| UI components | `src/components/ui/` |
| Prisma schema | `prisma/schema.prisma` entrypoint + `prisma/models/` domain files |
| Supabase migrations | `supabase/migrations/` (workflow: [`supabase/README.md`](../supabase/README.md) and [architecture/data-and-storage.md](architecture/data-and-storage.md)) |
| Forms | `src/lib/forms/zod-resolver.ts` (`customZodResolver`) |
| Charts | `src/components/ui/chart.tsx` + `src/features/analytics/components/` |
| E2E journeys | `e2e/` (Playwright; fixture contract pinned in `e2e/support/contract.ts`) |
| CI workflows | `.github/workflows/` (inventory: [architecture/overview.md](architecture/overview.md)) |
| Architecture docs | `docs/architecture/` |

## Non-obvious gotchas

The durable engineering rules live in [AGENTS.md](../AGENTS.md); these are the environment-specific traps that are easy to rediscover the hard way:

- **shadcn + Base UI, not Radix**: components import from `@base-ui/react/*`; never install `@radix-ui/*`. Add components with `npx shadcn@latest add <component>` (rule owned by [AGENTS.md → UI](../AGENTS.md)).
- **Request entry point** is `src/proxy.ts`, not `middleware.ts` (none exists); it rewrites `x-forwarded-host` on Server Action POSTs, then calls `updateSession()` from `src/lib/supabase/middleware.ts`.
- **Forms**: use `customZodResolver` from `src/lib/forms/zod-resolver.ts`; do **not** use `@hookform/resolvers/zod` — it breaks with Turbopack + Zod 4 (rule owned by [AGENTS.md → Forms](../AGENTS.md)).
- **Turbopack + Tailwind under pnpm**: `.npmrc` public-hoists `*tailwindcss*` packages, and `next.config.ts` aliases `tailwindcss` to its absolute on-disk path. If `@import` resolution breaks under pnpm + Turbopack, check those two files first. Tailwind v4 uses `@import "tailwindcss"` in `src/app/globals.css` (plus `shadcn/tailwind.css`); there is no `tailwind.config.ts`.
- **Prisma constraint gotcha**: `NULLS NOT DISTINCT` unique indexes cannot be expressed in Prisma; the real constraint lives in `supabase/migrations/` with a non-unique `@@index` mirror in Prisma (rule and details: [architecture/data-and-storage.md](architecture/data-and-storage.md)).
- **Supabase is self-hosted only** ([ADR 0020](adr/0020-self-hosted-supabase-target-neutral-backends.md)); there is no Supabase Cloud workflow — no `supabase login`/`link`/`--linked` commands.
- **Development auth bypass** (`POST /api/auth/dev-login`, `cloie_dev_auth` cookie) exists only in `NODE_ENV=development`; production-mode builds refuse it. Dedicated-demo and CI test sessions have their own fail-closed gates (see [architecture/auth-and-authorization.md](architecture/auth-and-authorization.md)).

## Verification commands

| Command | Purpose |
|---------|---------|
| `pnpm dev` | Turbopack dev server |
| `pnpm lint` / `pnpm lint:changed` | ESLint (full / changed-file, no new warnings) |
| `pnpm test` / `pnpm vitest run <path>` | Vitest suite / single file |
| `pnpm test:db` | Gated DB integration suites (`RUN_DATABASE_INTEGRATION_TESTS=1`, disposable target only) |
| `pnpm test:e2e` | Playwright journeys |
| `pnpm build` | Production build |
| `pnpm supabase:types` | Regenerate Supabase TS types (remote; `:local` for the local stack) |

Commit convention: Conventional Commits `<type>(<scope>): <description>` — owned by [AGENTS.md → Git and Issues](../AGENTS.md).
