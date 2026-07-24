## Why

`prisma/schema.prisma` is an 825-line hotspot containing 17 enums and 32 models across Identity and Access, Academic Calendar, Academic Structure, Course Catalog and Assignments, outcomes, instruments, evaluations, deployments, and responses. Its size makes domain navigation, relation tracing, review, and AI-assisted maintenance costly, while SQL-only PostgreSQL constraints are easy to overlook.

Prisma multi-file schemas became generally available in Prisma ORM 6.7.0. The repository currently uses Prisma 6.4.1, so this change must make the compatibility decision explicit before splitting files.

## What Changes

- Upgrade `prisma` and `@prisma/client` to a Prisma version that supports multi-file schemas without a preview flag, if compatibility verification passes.
- Keep `prisma/schema.prisma` as the single main file containing the generator and datasource blocks.
- Move enums and models into cohesive domain-oriented `.prisma` files under `prisma/models/`.
- Preserve every model, enum value, relation name, `@map`, `@@map`, named index, composite key, default, UUID native type, referential action, and SQL-only constraint mirror exactly.
- Update schema-consuming scripts/configuration only as required to point Prisma at the schema directory.
- Add focused schema-structure and migration-drift verification where existing checks do not cover the refactor.
- Produce no data migration and no SQL migration solely because files were reorganized.

Unchanged:

- Generated Prisma Client API and import path.
- Deployed PostgreSQL tables, columns, enum values, indexes, constraints, triggers, functions, RLS, revokes, and referential actions.
- SQL-only constraints maintained in `supabase/migrations/`.
- `src/types/supabase-database.ts`; it remains generated and must not be hand-edited.
- `prisma/seed.ts`, application behavior, authorization, privacy, caching, and deployment behavior.

## Capabilities

### New Capabilities

- `prisma-schema-modularity`: Maintains one Prisma schema as domain-oriented files while preserving one generated Prisma Client and exact database behavior.

### Modified Capabilities

- None. This change modifies schema organization and tooling only; it changes no observable product requirement.

## Impact

- Affected source: `prisma/schema.prisma`, new `prisma/models/*.prisma` files, and possibly Prisma configuration/package metadata.
- Affected tooling: Prisma CLI commands, `scripts/create-supabase-migration.ts`, install-time `prisma generate`, and migration-diff verification.
- Affected verification: schema formatting/validation, Prisma Client generation, schema-to-database diff inspection, database-focused tests, lint, unit tests, and build.
- Dependency risk: Prisma 6.4.1 predates GA multi-file support. Upgrade must be treated as an explicit dependency and checked against generated-client compatibility, Node/Next build behavior, migration tooling, and lockfile changes.
- Database risk: any accidental field, relation, index, mapping, enum, or referential-action change can produce SQL drift or weaken SQL-only invariants. The design therefore requires before/after canonical schema and migration-diff comparison.
