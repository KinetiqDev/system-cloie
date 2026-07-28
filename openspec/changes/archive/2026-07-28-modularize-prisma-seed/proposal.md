## Why

`prisma/seed.ts` is 3,438 lines and mixes seed fixtures, database helpers, lifecycle-reset logic, phase runners, and process startup. Its current phase order is correct but hard to audit safely, especially where deterministic IDs, explicit Course-assignment rosters, immutable readiness snapshots, and idempotent re-runs meet.

This refactor creates cohesive seed-only modules without changing seeded database state or the `pnpm db:seed` entry point.

## What Changes

- Classify and move existing seed constants, fixture data, helpers, types, and phase operations into cohesive modules under `prisma/seed/`.
- Reduce `prisma/seed.ts` to environment loading, sequential orchestration, Vitest guard, error handling, and Prisma disconnect handling.
- Keep deterministic fixture UUIDs in one seed-only constants module and preserve every existing value and reference.
- Keep execution order: academic structure, academic calendar reset and periods, users, Course assignments and explicit rosters, outcomes, readiness snapshot, templates, deployments, then responses.
- Give each phase an explicit returned context contract so downstream dependencies remain visible and testable.
- Add focused regression coverage for extraction contracts where current tests only duplicate seed logic.

## Capabilities

### New Capabilities
- `modular-prisma-seed`: Deterministic, idempotent CLOIE development fixture seeding through cohesive seed-only modules and a stable orchestration entry point.

### Modified Capabilities
- None. This refactor preserves existing observable seeded database behavior.

## Impact

- Affected paths: `prisma/seed.ts`, new `prisma/seed/**` modules, focused seed tests, and this OpenSpec change.
- Affected domain contexts: Academic Structure, Academic Calendar, Identity and Access, Course Catalog and Assignments, outcomes, instruments, deployments, and responses.
- Prisma model: no change.
- Supabase SQL migrations: no change.
- Generated `src/types/supabase-database.ts`: no change.
- Authorization, privacy, caching, deployment, package dependencies, and `pnpm db:seed` invocation: no change.
- Behavioral invariants: every fixture value and deterministic UUID; foreign-key-safe phase order; upsert/find-or-create/reset behavior; explicit Course-assignment roster sourcing; readiness snapshot timing; Vitest non-execution guard; error exit; and Prisma disconnect in `finally`.
