---
title: System CLOIE Data and Storage
kind: living-project-document
status: living
last_verified: 2026-09-04
---

# Data and Storage

This page maps how System CLOIE's data layer is organized and where its rules live. Engineering rules for schema work are owned by [AGENTS.md → Supabase and Prisma](../../AGENTS.md); the backend-target model is [ADR 0020](../adr/0020-self-hosted-supabase-target-neutral-backends.md).

## Prisma multi-file schema

Prisma is the **canonical application schema representation**. The schema is organized as an entrypoint plus domain files:

- `prisma/schema.prisma` — entrypoint only: the `prisma-client-js` generator and the `postgresql` datasource (`DATABASE_URL` pooled runtime connection, `DIRECT_URL` for schema operations).
- `prisma/models/` — one file per domain boundary:
  - `identity-access.prisma` (users, roles, sessions, profiles)
  - `academic-structure.prisma`, `academic-calendar.prisma`
  - `course-assignments.prisma`, `instruments.prisma`, `evaluations-deployments.prisma`, `responses.prisma`, `outcomes.prisma`

Multi-file schemas stay organized by these existing domain boundaries; new models belong in the domain file that owns them. The domain model files are generated into the client at install time (`postinstall` runs `prisma generate --schema prisma`).

`src/types/supabase-database.ts` is generated Supabase output and is never hand-edited.

## Supabase migration workflow

The Supabase CLI Docker stack and the repository `supabase/` directory carry the one migration history shared by all targets (local, remote self-hosted, dedicated demo, disposable CI). Detailed procedures live in [`supabase/README.md`](../../supabase/README.md); the shape is:

1. Edit `prisma/schema.prisma` or the relevant `prisma/models/` file.
2. Generate the migration: `pnpm supabase:migration:diff -- <change_name>` (baseline: `pnpm supabase:migration:baseline`).
3. Review the SQL created in `supabase/migrations/`.
4. Dry-run: `pnpm supabase:push:dry-run`.
5. Apply: `pnpm supabase:push`.
6. Regenerate Supabase types: `pnpm supabase:types` (remote) or `pnpm supabase:types:local` (local stack).

Remote commands read `DIRECT_URL` and pass it explicitly with `--db-url`; there is no linked-project fallback. `supabase/migrations/` is append-only — existing migrations are not edited after they have been applied anywhere.

## Migration-compatibility rule

Database migrations **must remain compatible with existing production data** (rule owned by [AGENTS.md → Supabase and Prisma](../../AGENTS.md)). Placement is part of compatibility: migrations land before the code that depends on the migrated shape ([AGENTS.md → Implementation Slices](../../AGENTS.md)). Practical consequences observed in the codebase:

- Destructive changes (e.g. the Student ID column drop in [ADR 0015](../adr/0015-name-based-course-roster-resolution-and-student-id-removal.md)) use a code-first compatibility release before the contract migration; recovery after a drop is forward-only.
- Older SQL migrations recording pre-alignment states are historical; the newest cleanup migration plus the complete Prisma schema directory is current truth (per [`supabase/README.md`](../../supabase/README.md)).

## SQL-backed constraints precedence over Prisma declarations

Some Postgres constraints cannot be expressed exactly in the Prisma schema — notably `NULLS NOT DISTINCT` unique indexes (see migration `20260429170000_add_section_and_nulls_not_distinct.sql`, where two evaluations with the same course, deployment, and a `NULL` section would otherwise both pass `@@unique`). Where this happens:

- The **real constraint lives in `supabase/migrations/`** as SQL.
- Prisma carries a non-unique `@@index` mirror so `prisma validate`/`db push` diffs do not fight the database.

The rule: preserve existing SQL-backed constraints rather than replacing them with incorrect Prisma uniqueness declarations ([AGENTS.md → Supabase and Prisma](../../AGENTS.md)). Never use Docker-backed `supabase db pull` or `supabase db diff --linked` to reconcile.

## Table access dispositions

Every Prisma-backed application table has exactly one declared access boundary — role-aware RLS, authenticated read-only, server-only, or an approved application-layer authorization exception. The registry is `src/lib/db/table-access-dispositions.ts`, verified deterministically and against live database probes (`pnpm verify:table-dispositions`). Terminology and invariants: `src/features/auth/CONTEXT.md` ("Table access disposition").

## Caching policy summary

The full policy is owned by [AGENTS.md → Rendering and Caching](../../AGENTS.md); the data-relevant core:

- **Never shared-cache** sessions, authorization decisions, user profiles, student identifiers, rosters, raw responses, or qualitative comments. Authorization is evaluated server-side on every request; a cache sitting in front of those reads would bypass the authorization boundary.
- Cache only explicitly scoped catalog or aggregate data, and only with a cache matrix covering key dimensions, scope, lifetime, tags, invalidation triggers, authorization boundary, and stale-data behavior.
- Enabling Next.js Cache Components requires a separate reviewed change.

Database test and safety rules (disposable targets only, `RUN_DATABASE_INTEGRATION_TESTS=1` opt-in) are owned by [AGENTS.md → Environment and Database Safety](../../AGENTS.md).

## Storage

Supabase Storage runs inside the self-hosted stack (persistent volume `supabase_storage-data` on the Coolify deployment; see [deployment.md](deployment.md) and the [deployment inventory](../operations/deployment-inventory.md)). Backups cover PostgreSQL and Storage together; backup automation is an open operational item tracked in the deployment inventory.
