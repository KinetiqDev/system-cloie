# AGENTS.md

## Reference Chain (Start Here)

Before any implementation, design, or investigation, orient through these in order:

1. **`openspec/config.yaml`** — canonical architecture, stack, rules, and workflow contract. The single source of truth.
2. **`CONTEXT-MAP.md`** — index of domain contexts and their relationships.
3. **`src/features/<domain>/CONTEXT.md`** — per-domain glossary, rules, and invariants for the area you're working in.
4. **`docs/adr/`** — architectural decision records. Surface conflicts explicitly rather than silently overriding.
5. **Existing code, tests, and GitHub issues** in the affected domain.

The `openspec/config.yaml` rules section is binding — proposal, specs, design, and tasks must follow it. Run `pnpm lint` and `pnpm build` before considering any change complete.

## OpenSpec + Matt Pocock — Dual Workflow

The project uses two overlapping, complementary workflows. Which path you take depends on the change's size and stage.

### OpenSpec Workflow (`openspec/`)

Artifact-driven change management: `proposal → design → specs → tasks`. Driven by the `openspec-*` skills:

- **`openspec-explore`** — thinking partner for exploring ideas and clarifying requirements.
- **`openspec-propose`** — draft proposal, design, specs, and tasks in one step.
- **`openspec-ff-change`** — fast-forward through all artifacts when the direction is clear.
- **`openspec-continue-change`** — progress a change by creating the next artifact.
- **`openspec-apply-change`** — implement tasks from the change.
- **`openspec-verify-change`** — validate implementation matches artifacts.
- **`openspec-sync-specs`** — sync delta specs to main specs without archiving.
- **`openspec-archive-change`** — archive a completed change.

These skills live in `.opencode/skills/` and operate on `openspec/changes/<name>/` directories containing `proposal.md`, `design.md`, `specs/`, and `tasks.md`.

### Matt Pocock Skills (`.agents/skills/`)

Conversation-driven planning and execution:

- **`wayfinder`** — chart large explorations as a map of investigation tickets on the issue tracker. Resolve them one at a time until the route is clear. Never resolve more than one ticket per session.
- **`grill-me`** / **`grill-with-docs`** — relentless interview to stress-test a plan or design. `grill-with-docs` also creates ADRs and glossary entries as decisions are resolved.
- **`prototype`** — build a throwaway artifact (UI or logic) to sanity-check a design question.
- **`to-spec`** — synthesize the current conversation into a published spec.
- **`to-tickets`** — break a spec or plan into dependency-ordered vertical-slice tickets with blocking edges, published to GitHub Issues.
- **`triage`** — move issues through the triage state machine (categorize, verify, grill, write agent-ready briefs).
- **`ask-matt`** — route to the right skill for your situation.

### Composing Them

For a **big feature or refactor**:
1. `openspec-explore` + `openspec-propose` → draft proposal, design, specs, tasks
2. `grill-with-docs` → stress-test, resolve terminology, record ADRs and glossary
3. `to-tickets` → split approved tasks into GitHub issues with dependency edges
4. `openspec-apply-change` → implement each vertical slice
5. `openspec-verify-change` → validate implementation
6. `openspec-archive-change` → archive when done

For **scouting without a clear destination**:
1. `wayfinder` → chart a map of investigation tickets
2. Resolve map tickets one at a time
3. Resolved tickets feed into `openspec-propose` or `to-spec`

For a **quick design question**:
1. `prototype` → build a throwaway
2. React, then decide whether it needs `openspec-propose` or just a quick `to-tickets`

Active OpenSpec changes: `add-dedicated-demo-auth`, `improve-navigation-rendering-and-caching`. Check for others with `ls openspec/changes/`.

## Repo Basics

- Package manager is `pnpm` (see `package.json#packageManager`).
- App is Next.js App Router; dev server is Turbopack: `pnpm dev`.
- `.opencode/` directory contains openspec-* skills and opencode configuration.

## Setup (Non-Obvious)

- Create `.env.local` from `.env.example` (Supabase URL/key + Prisma `DATABASE_URL` + `DIRECT_URL` + `SUPABASE_*` CLI vars).
- `pnpm install` runs `prisma generate` via `postinstall`.
- `pnpm db:seed` runs `tsx prisma/seed.ts` and loads `.env.local` via `@next/env` (`loadEnvConfig(process.cwd())`).
- For a fresh clone: `pnpm supabase:link` then `pnpm supabase:push` then `pnpm supabase:types`.

## Verification Commands

- **Lint**: `pnpm lint` (ESLint config also ignores `.agent/**`).
- **Format**: `pnpm format` (Prettier + Tailwind class sorting).
- **Tests**: `pnpm test` (Vitest). Default run is unit-only; DB invariant suites are skipped even if `.env.local` sets `DATABASE_URL`.
- **Test watch**: `pnpm test:watch`.
- **DB invariant suites** (opt-in only): `RUN_DATABASE_INTEGRATION_TESTS=1 pnpm test:db` with `DATABASE_URL` pointing at a disposable test database. Do not run against shared hosted Supabase.
- **Build** (includes Next typecheck): `pnpm build`.
- **Single test file**: `pnpm vitest run src/__tests__/path/to/file.test.ts`.

### Database Invariant Test Gate

`pnpm test` must never write to a hosted database. The invariant suites below are gated on `RUN_DATABASE_INTEGRATION_TESTS=1` in addition to `DATABASE_URL`:

- `src/__tests__/features/course-assignments/course-assignment-membership-constraints.test.ts`
- `src/__tests__/features/course-assignments/class-identity-uniqueness.test.ts`
- `src/__tests__/features/course-assignments/seeded-course-assignment-memberships.test.ts`
- `src/__tests__/modules/course-assignments/course-assignments-section-constraint.test.ts`
- `src/__tests__/features/users/services/program-head-assignment-set-db-invariants.test.ts`
- `src/__tests__/features/academic-calendar/school-year-active-constraint.test.ts`

The gate is enforced by `describe.skipIf(!process.env.DATABASE_URL || process.env.RUN_DATABASE_INTEGRATION_TESTS !== "1")` and a meta-test in `src/__tests__/features/course-assignments/db-invariants-gate.test.ts`. See #149 for the audit finding.

### Demo Deployment Verification

- `pnpm demo:reset` — destructive reset of the isolated demo database. Validates `CLOIE_DEMO_SUPABASE_PROJECT_REF` identity before invoking Prisma. Fails if any project identifier matches `CLOIE_PRIMARY_SUPABASE_PROJECT_REF`.
- `pnpm verify:production-auth-boundary` — confirms primary Production remains OAuth-only.
- `pnpm verify:dedicated-demo-auth-boundary` — confirms demo deployment has signed-session auth active.
- `pnpm verify:demo-target-isolation` — validates the demo target is properly isolated.

## UI Components

- Project uses **shadcn/ui** with the **"base-nova"** style (not "new-york" or "neutral").
- Underlying primitives are from **@base-ui/react** (not Radix UI).
- All existing components in `src/components/ui/` import from `@base-ui/react/*`.
- When adding new shadcn components: `npx shadcn@latest add <component>` — they will automatically use Base UI.
- Do not install Radix UI packages — stick to Base UI exclusively.
- Styling is handled via **Tailwind CSS** + **class-variance-authority** (cva) for variants.
- Design system reference: `docs/design.md` (visual language, tokens, page types, allowed/forbidden patterns). Canonical token values live in `src/styles/tokens.css` + `src/app/globals.css`.

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
- Demo users use `@cloie.test` emails (see `src/lib/constants/demo-users.ts`).

## Dedicated Demo Deployment

The dedicated demo deployment is a separate, isolated production-mode instance with signed demo sessions. Never enable on primary Production. See `docs/runbooks/dedicated-demo-deployment.md` and `docs/adr/0008-dedicated-demo-deployment-authentication.md`.

- Server-only `CLOIE_DEMO_*` configuration; fail closed when absent or malformed.
- `CLOIE_DEMO_ALLOWED_USERS` contains only intended seeded demo catalog identifiers.
- Before browser work in a trace, verify the boundary: `pnpm verify:production-auth-boundary` on primary Production, `pnpm verify:dedicated-demo-auth-boundary` on the demo deployment.
- Reset before repeatable traces: `pnpm demo:reset`.

## Supabase + Prisma Workflow (Cloud, No Docker)

- Canonical schema source is `prisma/schema.prisma` (split across `prisma/models/` by domain).
- `src/types/supabase-database.ts` is generated; do not hand-edit (regenerate with `pnpm supabase:types`).
- Migration workflow (see `supabase/README.md`):
  - Edit `prisma/schema.prisma` or `prisma/models/*.prisma`.
  - Generate SQL: `pnpm supabase:migration:diff -- your_change_name`.
  - Review the SQL.
  - Apply safely: `pnpm supabase:push:dry-run` then `pnpm supabase:push`.
  - Regenerate types: `pnpm supabase:types`.
- Avoid Docker-backed commands: `supabase db pull` and `supabase db diff --linked`.
- `pnpm supabase:migration:repair-latest` is baseline/recovery only — refuses if remote migrations already applied.
- Multi-file Prisma schemas must stay organized by existing domain boundaries.

## Prisma Gotcha: Constraints Not Expressible In Schema

- Some uniqueness rules rely on Postgres features Prisma can't express (example: `NULLS NOT DISTINCT` index for `course_bound_evaluations`). The real constraint is enforced in `supabase/migrations/*` and only mirrored as a non-unique `@@index` in Prisma. Do not add a `@unique` where the migration has the real SQL constraint; they will conflict.

## Code Intelligence (Fallow)

Static analysis is evidence, not instruction. Agents consult the project-local `fallow-mcp` MCP server (declared in `opencode.json`); the runbook is `docs/agents/fallow.md`, and the policy is recorded in `docs/adr/0011-fallow-code-intelligence-policy.md`.

- **Trace before deleting** — Before deleting an export, file, dependency, or class member that Fallow reports unused, trace the finding and verify its consumers and domain context first.
- **Trace before refactoring** — Before refactoring for complexity or duplication, identify the module's interface, its seams, the tests that pin its behavior, and the domain invariants it carries (per `CONTEXT.md`).
- **Protected categories** — treat as intentionally reachable: Next.js entry points and route handlers, Server Actions, generated types (`src/types/supabase-database.ts`), the shadcn/ui public inventory (`src/components/ui/**`), dynamic consumers, and domain context (`CONTEXT.md` glossaries and invariants).
- **No unattended mutation** — never run `pnpm exec fallow fix --yes` or apply `fix_apply` results unattended; fixes start from dry-run evidence (`pnpm exec fallow fix --dry-run` / `fix_preview`). Baseline refresh (`pnpm fallow:baseline`) is human-gated.
- **Gate** — the CI audit gate fails only on new findings in changed files; address those with traced, focused changes.

## Commit Convention

- Follow Conventional Commits (see `docs/conventional-commits-cheatsheet.md`).
- Format: `<type>(<optional scope>): <description>`
- Types: `feat`, `fix`, `refactor`, `perf`, `style`, `test`, `docs`, `build`, `ops`, `chore`
- Description: lowercase, no trailing period, imperative present tense (e.g., "add feature" not "added feature")
- Breaking changes: use `!` before `:` (e.g., `feat(api)!:`) and add `BREAKING CHANGE:` in footer

## Agent Skills

### Issue Tracker

Issues tracked in GitHub Issues for `Tugeru/project-cloie`. Use `gh` CLI for operations. See `docs/agents/issue-tracker.md` for conventions.

### Triage labels

Canonical: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain Docs

Multi-context layout: root `CONTEXT-MAP.md` → feature `CONTEXT.md` files → `docs/adr/`. See `docs/agents/domain.md`.

Other reference: `docs/agents/discrepancies-prd-srs-vs-current.md` (known spec gaps).

### Project Skills (`.agents/skills/`)

| Category | Skills |
| --- | --- |
| **Planning & Tracking** | ask-matt, triage, to-spec, to-tickets, wayfinder |
| **Architecture & Design** | codebase-design, domain-modeling, improve-codebase-architecture, prototype |
| **UI/UX** | design-taste-frontend, shadcn, emil-design-eng, ui-ux-pro-max |
| **Implementation & Testing** | implement, tdd, code-review |
| **Debugging & Research** | a11y-debugging, chrome-devtools, debug-optimize-lcp, diagnosing-bugs, fallow, memory-leak-debugging, research, troubleshooting |
| **Process & Docs** | grill-me, grill-with-docs, grilling, handoff, teach, write-a-skill, writing-great-skills |
| **Framework** | next-best-practices, supabase, supabase-postgres-best-practices |
| **Other** | agent-browser, setup-matt-pocock-skills, zoom-out, model-relay |

### OpenSpec Skills (`.opencode/skills/`)

| Category | Skills |
| --- | --- |
| **Change Management** | openspec-explore, openspec-propose, openspec-ff-change |
| **Implementation** | openspec-apply-change, openspec-continue-change |
| **Verification & Finalize** | openspec-verify-change, openspec-sync-specs, openspec-archive-change |

### Globally Installed Skills

`~/.agents/skills/` — available across repos:
- **find-skills** — Discover and install skills via `npx skills`
- **git-commit** — Intelligent commit with convention message generation
- **humanizer** — Remove signs of AI-generated writing from text

### MCP Tools

- **context7** — Query current docs for any library, framework, SDK, or CLI
- **fallow** — Codebase intelligence via the project-local `fallow-mcp` server (see the Code Intelligence section)
- **supabase** — Schema, SQL, migrations, Edge Functions, project management
- **notion** — Read/write pages, databases, comments; search workspace
- **Chrome DevTools** — Browser automation (navigate, click, screenshot, trace, Lighthouse audit)