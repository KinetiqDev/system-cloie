# AGENTS.md

## Repo Basics

- Package manager is `pnpm` (see `package.json#packageManager`).
- App is Next.js App Router; dev server is Turbopack: `pnpm dev`.

## Setup (Non-Obvious)

- Create `.env.local` from `.env.example` (Supabase URL/key + Prisma `DATABASE_URL` + `DIRECT_URL`).
- `pnpm install` runs `prisma generate` via `postinstall`.
- `pnpm db:seed` runs `tsx prisma/seed.ts` and loads `.env.local` via `@next/env` (`loadEnvConfig(process.cwd())`).

## UI Components

- Project uses **shadcn/ui** with the **"base-nova"** style (not "new-york" or "neutral").
- Underlying primitives are from **@base-ui/react** (not Radix UI).
- All existing components in `src/components/ui/` import from `@base-ui/react/*`.
- When adding new shadcn components: `npx shadcn@latest add <component>` — they will automatically use Base UI.
- Do not install Radix UI packages — stick to Base UI exclusively.
- Styling is handled via **Tailwind CSS** + **class-variance-authority** (cva) for variants.

## Verification Commands

- Lint: `pnpm lint` (ESLint config also ignores `.agent/**`).
- Tests: `pnpm test` (Vitest).
- Build (includes Next typecheck): `pnpm build`.
- Single test file: `pnpm vitest run src/__tests__/path/to/file.test.ts`.

## Turbopack + Tailwind (Easy To Break)

- Keep `.npmrc` `public-hoist-pattern[]` entries for Tailwind packages.
- Keep `next.config.ts` Turbopack aliasing `tailwindcss` to an absolute on-disk path.
- If Tailwind CSS `@import` resolution breaks under pnpm/Turbopack, start by checking those two files.

## Forms: Zod + Turbopack Quirk

- Use `customZodResolver` from `src/lib/forms/zod-resolver.ts` (do not switch to `@hookform/resolvers/zod`; it breaks with Turbopack + Zod 4 here).

## Auth / Middleware Entry Point

- Request/session handling is wired through `src/proxy.ts` (not `middleware.ts`).
- `src/proxy.ts` rewrites Server Action POSTs to set `x-forwarded-host` from `Origin` before calling `updateSession`.
- Supabase session refresh lives in `src/lib/supabase/middleware.ts` (`updateSession`).

## Dev Auth Bypass

- Dev/demo auth uses the httpOnly cookie `cloie_dev_auth` (see `src/features/auth/services/dev-auth.ts`).
- API route `POST /api/auth/dev-login` sets that cookie only when `NODE_ENV=development`; `NEXT_PUBLIC_DEMO_MODE` never enables it outside development.

## Supabase + Prisma Workflow (Cloud, No Docker)

- Canonical schema source is `prisma/schema.prisma`.
- `src/types/supabase-database.ts` is generated; do not hand-edit (regenerate with `pnpm supabase:types`).
- Migration workflow (see `supabase/README.md`):
- Edit `prisma/schema.prisma`.
- Generate SQL: `pnpm supabase:migration:diff -- your_change_name`.
- Apply safely: `pnpm supabase:push:dry-run` then `pnpm supabase:push`.
- Regenerate types: `pnpm supabase:types`.
- Avoid Docker-backed commands: `supabase db pull` and `supabase db diff --linked`.

## Prisma Gotcha: Constraints Not Expressible In Schema

- Some uniqueness rules rely on Postgres features Prisma can't express (example: `NULLS NOT DISTINCT` unique index for `course_bound_evaluations`), so the real constraint is enforced in `supabase/migrations/*` and only mirrored as a non-unique `@@index` in Prisma.

## Commit Convention

- Follow Conventional Commits (see `docs/conventional-commits-cheatsheet.md`).
- Format: `<type>(<optional scope>): <description>`
- Types: `feat`, `fix`, `refactor`, `perf`, `style`, `test`, `docs`, `build`, `ops`, `chore`
- Description: lowercase, no trailing period, imperative present tense (e.g., "add feature" not "added feature")
- Breaking changes: use `!` before `:` (e.g., `feat(api)!:`) and add `BREAKING CHANGE:` in footer

## Agent skills

### Issue tracker

Issues and PRDs are tracked in GitHub Issues for `Tugeru/project-cloie`. See `docs/agents/issue-tracker.md`.

### Triage labels

Use the canonical triage labels: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, and `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

This repo uses a multi-context domain-doc layout. See `docs/agents/domain.md`.

### UI/UX Design Skills (Globally Installed)

Three design skills are installed globally for improving UI quality and avoiding slop:

- **design-taste-frontend** (`~/.agents/skills/design-taste-frontend`) — Curated design taste for frontend apps with color, typography, spacing, and layout guidance.
- **shadcn** (`~/.agents/skills/shadcn`) — shadcn's UI design standards and taste; compatible with Base UI.
- **emil-design-eng** (`~/.agents/skills/emil-design-eng`) — Design engineering patterns from Emil Kowalski (Vercel).
- **ui-ux-pro-max** (built-in, `src/agents/skills/ui-ux-pro-max/SKILL.md`) — Already loaded; 50+ styles, 161 palettes, 57 font pairings.

When asked to design or implement UI, load these skills as needed. Remember: this project uses **@base-ui/react** primitives (not Radix), shadcn/ui with **base-nova** style, and Tailwind CSS.
