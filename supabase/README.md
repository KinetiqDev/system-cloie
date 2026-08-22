# Supabase Cloud Workflow

This repo uses a single hosted Supabase project on the free tier.

## One-time setup

1. Copy `.env.example` to `.env`.
2. Fill the app client variables: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Fill the Prisma connection variables too: `DATABASE_URL` for the pooled runtime connection and `DIRECT_URL` for direct migration diff access.
4. Fill the CLI workflow variables: `SUPABASE_PROJECT_REF`, `SUPABASE_ACCESS_TOKEN`, and `SUPABASE_DB_PASSWORD`.
5. `DATABASE_URL` and `DIRECT_URL` are still required even in this Docker-free workflow because the app runs through Prisma and `pnpm supabase:migration:diff` shells out to `prisma migrate diff --from-url`.
6. If you need to initialize a fresh clone of the repo metadata, run `pnpm supabase:init` once.
7. Run `pnpm supabase:login`.
8. Run `pnpm supabase:link`.

## Prisma-owned schema changes

Prisma is the canonical schema source for the app. `src/types/supabase-database.ts` is generated output from
the linked Supabase project and should never be hand-maintained. When schema changes land, update Prisma, add
the matching Supabase migration, push it, then regenerate the Supabase types so all three layers stay aligned.

Some older SQL migrations in this repo still show the pre-alignment section/course-type/PLO model because they
record historical states. Treat the newest cleanup migration plus the complete Prisma schema directory, entered
through `prisma/schema.prisma`, as the current truth.

1. Edit `prisma/schema.prisma` or the relevant file under `prisma/models/`.
2. Run `pnpm supabase:migration:diff -- your_change_name`.
3. Review the SQL created in `supabase/migrations/`.
4. Run `pnpm supabase:push:dry-run`.
5. Run `pnpm supabase:push`.
6. Run `pnpm supabase:types`.

## Baseline recovery command

- `pnpm supabase:migration:repair-latest` is a baseline/recovery-only command.
- It is intended for the one-time hosted-project baseline flow when the linked remote migration history is still empty, or for careful recovery of that same empty-history state.
- The helper now refuses to run if `supabase migration list --linked` shows any remote migrations already applied.
- Do not use it as a routine follow-up after normal `supabase:push` usage.

## Commands intentionally avoided in this workflow

- `supabase db pull`
- `supabase db diff --linked`

Those commands rely on Docker-backed tooling. This workflow uses `prisma migrate diff` instead, with `prisma/`
as the complete schema directory.
