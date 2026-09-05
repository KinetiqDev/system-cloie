# System CLOIE

**Comprehensive Learning Outcomes and Instructional Evaluation**

A college-level digital evaluation, monitoring, and reporting platform for Assumption College of Davao. CLOIE supports multiple academic programs, their courses, faculty members, and stakeholder-based outcome evaluation processes.

## Quick Start

### Prerequisites

- Node.js 22 (see `.nvmrc`)
- pnpm 10 (`npm install -g pnpm`)
- Docker (for the local Supabase CLI Docker stack)
- Supabase CLI (installed as a dev dependency; resolved locally via `scripts/resolve-local-bin.ts`)

### Setup

```bash
# 1. Clone and install
git clone <repository-url>
cd project-cloie
pnpm install

# 2. Start the local Supabase CLI Docker stack (canonical development backend)
pnpm supabase:start

# 3. Environment variables
cp .env.example .env.local
# Edit .env.local with your credentials.
# See .env.example for the full variable reference.
# The essentials: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
# (from `pnpm supabase:status`), `DATABASE_URL`, `DIRECT_URL`, and the local
# OAuth values `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.

# 4. Reset the local database from committed migrations and seed data
pnpm supabase:reset
pnpm db:seed             # Optional: seed demo data

# 5. Run development server
pnpm dev
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000) to view the application.

For deployed self-hosted targets, set the server-only `CLOIE_BACKEND_ID` and the other backend identity values described in `.env.example`. Local development and disposable CI leave `CLOIE_BACKEND_ID` unset.

See `supabase/README.md` for the full local and remote self-hosted Supabase workflow and `AGENTS.md` for the Prisma + Supabase migration cycle. Supabase Cloud is not supported; see ADR 0020 for the target-neutral self-hosted contract.

## Tech Stack

| Category        | Technology                                                 |
| --------------- | ---------------------------------------------------------- |
| Framework       | Next.js 16 (App Router, Turbopack)                         |
| Language        | TypeScript 5                                               |
| Styling         | Tailwind CSS v4, class-variance-authority                  |
| Components      | shadcn/ui (base-nova style, Base UI primitives)            |
| Icons           | lucide-react                                               |
| Forms           | react-hook-form, customZodResolver, Zod 4                  |
| Charts          | Recharts (through shadcn/ui chart primitives)              |
| Drag and Drop   | @dnd-kit (core, sortable)                                  |
| Qualitative NLP | winkNLP, stopword                                          |
| Word Cloud      | @isoterik/react-word-cloud                                 |
| AI Insights     | OpenAI-compatible API (server-only, bounded; see ADR 0016) |
| Database        | PostgreSQL 15+ (Supabase)                                  |
| ORM             | Prisma 6                                                   |
| Auth            | Supabase Auth (Google OAuth)                               |
| Testing         | Vitest, Testing Library, Playwright                        |
| Package Manager | pnpm 10                                                    |

## How We Build

Change management is conversation-driven with GitHub issues as the execution units:

- **Planning and execution skills** — use `wayfinder` to chart large explorations as investigation tickets, `grilling` / `grill-with-docs` to stress-test designs and record ADRs, `prototype` to build throwaway artifacts, `to-spec` to synthesize specifications, and `to-tickets` to break work into vertical-slice GitHub issues with blocking edges.

**In practice** for a big feature or refactor: chart the space with `wayfinder` → grill the design to sharpen it and record an ADR for cross-cutting decisions → `to-tickets` to split into dependency-ordered issues → implement each slice → verify with tests, `pnpm lint`, and `pnpm build`.

See `AGENTS.md` for the full skill inventory, `CONTEXT-MAP.md` and `src/features/<domain>/CONTEXT.md` for domain rules, and `docs/adr/` for architectural decisions.

## Authentication

CLOIE operates with three intentionally separated authentication modes, never co-deployed under one instance:

| Mode                   | Mechanism                                                                                                      | Where                       |
| ---------------------- | -------------------------------------------------------------------------------------------------------------- | --------------------------- |
| **Primary Production** | Supabase Auth with Google OAuth, domain-restricted to `@acd.edu.ph` and `@acdeducation.com`                    | Primary public deployment   |
| **Local Development**  | `cloie_dev_auth` cookie + `POST /api/auth/dev-login`, demo users with `@cloie.test` emails                     | `NODE_ENV=development` only |
| **Dedicated Demo**     | Short-lived signed demo session against isolated resettable database; server-only `CLOIE_DEMO_*` configuration | Separate demo deployment    |

The demo deployment is used for production-build route/rendering evidence, cross-role demonstrations, and performance traces. It never replaces OAuth evidence. See `docs/runbooks/dedicated-demo-deployment.md` and `docs/adr/0008-dedicated-demo-deployment-authentication.md` for the full contract.

Key demo scripts:

- `pnpm demo:reset` — destructive reset of the isolated demo database (validates target identity first)
- `pnpm verify:production-auth-boundary` — confirms primary Production remains OAuth-only
- `pnpm verify:dedicated-demo-auth-boundary` — confirms demo deployment has signed-session auth active

## Available Scripts

| Command                                    | Purpose                                                                      |
| ------------------------------------------ | ---------------------------------------------------------------------------- |
| `pnpm dev`                                 | Start Next.js dev server with Turbopack                                      |
| `pnpm build`                               | Production build (includes Next.js typecheck)                                |
| `pnpm lint`                                | ESLint check                                                                 |
| `pnpm lint:changed`                        | ESLint on changed files only (CI gate)                                       |
| `pnpm format`                              | Prettier formatting (includes Tailwind class sorting)                        |
| `pnpm format:check`                        | Prettier check without writing                                               |
| `pnpm format:check:changed`                | Prettier check on changed files (CI gate)                                    |
| `pnpm test`                                | Run Vitest unit suites (DB invariant suites are gated)                       |
| `pnpm test:watch`                          | Run Vitest in watch mode                                                     |
| `pnpm test:e2e`                            | Run Playwright browser journeys (`e2e/`)                                     |
| `pnpm test:db`                             | Run opt-in DB invariant suites (requires `RUN_DATABASE_INTEGRATION_TESTS=1`) |
| `pnpm verify:database-target`              | Verify `DATABASE_URL` points at a disposable target                          |
| `pnpm verify:database-suites`              | Verify DB suite discovery completeness                                       |
| `pnpm vitest run src/__tests__/...`        | Run a single test file                                                       |
| `pnpm db:push`                             | Push Prisma schema to dev database                                           |
| `pnpm db:seed`                             | Seed database with demo data (run `pnpm install` or `prisma generate` first) |
| `pnpm db:studio`                           | Open Prisma Studio GUI                                                       |
| `pnpm supabase:start`                      | Start the local Supabase CLI Docker stack                                    |
| `pnpm supabase:stop`                       | Stop the local Supabase CLI Docker stack                                     |
| `pnpm supabase:status`                     | Inspect local endpoints and generated credentials                            |
| `pnpm supabase:reset`                      | Destructive reset of the local database (explicit --local)                   |
| `pnpm supabase:migration:list:local`       | List migrations against the local stack                                      |
| `pnpm supabase:migration:list`             | List migrations of a remote self-hosted target (--db-url DIRECT_URL)         |
| `pnpm supabase:migration:diff`             | Generate migration SQL from Prisma schema changes                            |
| `pnpm supabase:push:dry-run`               | Preview migrations before applying to remote target                          |
| `pnpm supabase:push`                       | Push migrations to a remote self-hosted target                               |
| `pnpm supabase:types:local`                | Regenerate Supabase types from the local stack                               |
| `pnpm supabase:types`                      | Regenerate Supabase types from a remote self-hosted target                   |
| `pnpm supabase:migration:baseline`         | Create the baseline migration                                                |
| `pnpm supabase:init`                       | Initialize the Supabase CLI project config                                   |
| `pnpm demo:reset`                          | Destructive reset of isolated demo DB                                        |
| `pnpm verify:production-auth-boundary`     | Validate primary Production auth is OAuth-only                               |
| `pnpm verify:dedicated-demo-auth-boundary` | Validate demo deployment auth contracts                                      |
| `pnpm verify:demo-target-isolation`        | Validate the demo reset target is the isolated demo DB                       |
| `pnpm fallow:audit`                        | Run the fallow static-analysis audit                                         |
| `pnpm fallow:baseline`                     | Refresh fallow baselines                                                     |
| `pnpm start`                               | Run the production build                                                     |

The full list of scripts lives in `package.json`.

## Project Architecture

### Directory Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (app)/             # Authenticated route group (role dashboards)
│   │   ├── alumni/
│   │   ├── course-rosters/
│   │   ├── dashboard/
│   │   ├── dean/
│   │   ├── design-system/
│   │   ├── faculty/
│   │   ├── industry-partner/
│   │   ├── program-head/
│   │   ├── secretary/
│   │   └── student/
│   ├── (public)/          # Unauthenticated route group
│   │   ├── login/
│   │   ├── onboarding/
│   │   ├── portal/
│   │   └── status/
│   ├── (legal)/           # Legal pages (terms, privacy)
│   ├── unauthorized/      # Domain/role rejection page
│   └── api/               # API routes (auth, dean)
├── components/            # Shared UI components
│   └── ui/               # shadcn/ui base components (Base UI primitives)
├── features/             # Feature-based domain modules (15 domains)
│   ├── academic-calendar/    # School years, semesters, terms, active periods
│   ├── academic-structure/   # Programs and majors
│   ├── analytics/            # Faculty/program analytics dashboards
│   ├── auth/                 # Authentication, sessions, role identity
│   ├── course-assignments/   # Stable Course catalog and actual class assignments
│   ├── dean/                 # Dean college-wide oversight views
│   ├── design-system/        # Shared design system and showcase
│   ├── enrollments/          # Student enrollment interfaces
│   ├── evaluations/          # Evaluation workflows and deployments
│   ├── instruments/          # Templates, instruments, versioning
│   ├── legal/                # Legal content, versions, acknowledgements
│   ├── outcomes/             # Graduate outcomes, CILOs, mappings
│   ├── portals/              # Role selection and entry portals
│   ├── responses/            # Quantitative and qualitative response handling
│   └── users/                # User profiles and admin management
├── hooks/                # Shared React hooks
├── lib/                  # Shared utilities and configurations
│   ├── actions/          # Server Actions (thin wrappers over feature services)
│   ├── constants/        # App constants and demo-user catalog
│   ├── db/              # Prisma client singleton
│   └── forms/           # customZodResolver and form utilities
├── styles/              # Global styles
│   └── tokens.css       # Design tokens (text-heading-lg, text-body-md, etc.)
├── types/               # Global TypeScript types (supabase-database.ts is generated)
└── __tests__/           # Test files mirroring src/ structure
```

Plus, at repo root: `scripts/` holds the Supabase CLI wrappers, demo verification, and fallow baseline scripts; `prisma/` and `supabase/` hold the schema and migrations (see below).

### Domain Contexts

The domain model is documented through a multi-context layout:

- **`CONTEXT-MAP.md`** — index of domain contexts and their relationships
- **`src/features/<domain>/CONTEXT.md`** — per-domain glossary, rules, and invariants
- **`docs/adr/`** — architectural decision records (17 ADRs, see list below)

Before working in a domain, read its `CONTEXT.md` and relevant ADRs.

### Architectural Decision Records

| ADR  | Title                                                            |
| ---- | ---------------------------------------------------------------- |
| 0001 | Complete secretary-created accounts                              |
| 0001 | Single-role accounts                                             |
| 0002 | Separate domain users from auth identities                       |
| 0003 | Course catalog and assignment refactor                           |
| 0004 | Strict program deletion                                          |
| 0005 | Outcome ownership and dean oversight                             |
| 0006 | Dean PWA offline cache contract                                  |
| 0007 | Course assignment roster membership                              |
| 0008 | Dedicated demo deployment authentication                         |
| 0009 | Program head selected program context                            |
| 0010 | Unified appearance and protected showcase                        |
| 0011 | Fallow code intelligence policy                                  |
| 0012 | Secretary-controlled academic calendar state                     |
| 0013 | Versioned curriculum course placement _(Superseded by ADR 0021)_ |
| 0014 | Google authoritative account names                               |
| 0015 | Name-based course roster resolution and student ID removal       |
| 0016 | Server-side bounded AI interpretation boundary                   |
| 0017 | Program learning outcome canonical terminology                   |
| 0018 | Transfer ILO catalog ownership to General Education Coordinator  |
| 0019 | Removing Secretary Course Assignment Mutation                    |
| 0020 | Self-Hosted Supabase Only — Target-Neutral Backends              |
| 0021 | Remove Curriculum Versioning                                     |

#### Request Flow

Authentication middleware is at `src/proxy.ts` (not the traditional `middleware.ts`):

```typescript
// src/proxy.ts
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  // Rewrites Server Action POSTs so updateSession sees the Origin host.
  return updateSession(request);
}

export const config = {
  matcher: ["/((?!_next|favicon.ico|logos/|assets/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
```

`src/proxy.ts` rewrites Server Action POSTs to set `x-forwarded-host` from `Origin` before calling `updateSession`. Supabase session refresh lives in `src/lib/supabase/middleware.ts`.

#### Server Actions Pattern

Server Actions are thin wrappers delegating to feature services:

```typescript
// src/lib/actions/feature-actions.ts
"use server";

export async function someAction(data: InputType): Promise<ActionResult> {
  const result = await featureService(data);
  if (!result.success) {
    return { success: false, error: result.error };
  }
  revalidatePath("/some-path");
  return { success: true };
}
```

#### Form Validation Pattern

Use the custom Zod resolver (official `@hookform/resolvers/zod` breaks with Turbopack + Zod 4):

```typescript
import { customZodResolver } from "@/lib/forms/zod-resolver";

const form = useForm({
  resolver: customZodResolver(schema),
});
```

#### Database Naming Convention

Prisma models use `@@map` for snake_case table names. TypeScript uses camelCase, database uses snake_case:

```prisma
model User {
  id String @id
  @@map("users")
}
```

#### Domain Terms and Design Tokens

Uses the glossary in `src/features/<domain>/CONTEXT.md` and design tokens from `src/styles/tokens.css`, mapped via `@theme inline` in `src/app/globals.css`:

```html
<h1 class="text-heading-lg">Title</h1>
<p class="text-body-md">Content</p>
```

## Environment Variables

Required in `.env.local` (local development) or the deployment environment (see `.env.example` for the complete set):

```bash
# Supabase (client, browser-safe public contract)
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321  # local CLI Docker stack
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key      # from pnpm supabase:status
NEXT_PUBLIC_SITE_URL=http://localhost:3000        # unset for trycloudflare Quick Tunnels

# Database (Prisma)
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
DIRECT_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres

# Backend identity (server-only opaque identifiers; unset for local development)
CLOIE_BACKEND_ID=
CLOIE_DEPLOYMENT_KIND=
CLOIE_PRIMARY_BACKEND_ID=
CLOIE_DEMO_BACKEND_ID=
CLOIE_DEMO_DATABASE_ID=

# Local Google OAuth (consumed by supabase/config.toml via env substitution)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Bootstrap
BOOTSTRAP_SECRETARY_EMAIL=secretary@acd.edu.ph

# Secretary edit confirmations (production)
CONFIRMATION_SECRET=your-confirmation-secret

# Local development only; does not enable dedicated demo authentication
NEXT_PUBLIC_DEMO_MODE=false

# Demo deployment (server-only, never set on primary Production)
CLOIE_DEMO_ENABLED=
CLOIE_DEMO_SESSION_SECRET=
CLOIE_DEMO_ALLOWED_USERS=

# Legal acknowledgement ticket (server-only HMAC secret)
CLOIE_LEGAL_TICKET_SECRET=

# Server-only appearance release control; enable only per docs/runbooks/appearance-production-activation.md
CLOIE_APPEARANCE_ENABLED=

# Test-only: opt in to DB invariant suites (pnpm test:db)
RUN_DATABASE_INTEGRATION_TESTS=

# AI Insights (server-only, optional): CLOIE_AI_ENABLED, CLOIE_AI_API_KEY,
# CLOIE_AI_BASE_URL, CLOIE_AI_MODEL, corpus gates, and bounds. See ADR 0016.
```

## Production Docker Deployment

System CLOIE ships as one portable Next.js application image. Self-hosted Supabase, Supavisor, and PostgreSQL are separate resources and are not bundled in this image or an application Docker Compose stack.

### Build and run locally

The three `NEXT_PUBLIC_*` values are browser-safe build inputs. Next.js embeds them in client bundles, so changing any of them requires rebuilding the image. Server-only credentials remain runtime configuration.

```bash
docker build \
  --build-arg NEXT_PUBLIC_SITE_URL=http://localhost:3000 \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=https://supabase.example.test \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=your-public-anon-key \
  -t system-cloie:production .

docker run --rm -p 3000:3000 \
  -e NEXT_PUBLIC_SITE_URL=http://localhost:3000 \
  -e NEXT_PUBLIC_SUPABASE_URL=https://supabase.example.test \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY=your-public-anon-key \
  -e DATABASE_URL=postgresql://user:password@supavisor:6543/postgres \
  -e CLOIE_DEPLOYMENT_KIND=production \
  -e CLOIE_BACKEND_ID=cloie-primary \
  -e CLOIE_PRIMARY_BACKEND_ID=cloie-primary \
  -e CONFIRMATION_SECRET=your-long-confirmation-secret \
  -e CLOIE_LEGAL_TICKET_SECRET=your-long-legal-ticket-secret \
  system-cloie:production
```

The container listens on `0.0.0.0:3000`, runs as a non-root user, and exposes `GET /api/health`. The liveness endpoint does not contact PostgreSQL or Supabase. The image health check calls this endpoint with Node's built-in `fetch`.

### Coolify settings

Configure the application resource as follows:

| Setting                      | Value                                              |
| ---------------------------- | -------------------------------------------------- |
| Build pack                   | Dockerfile                                         |
| Base directory               | `/`                                                |
| Dockerfile                   | `/Dockerfile`                                      |
| Internal port                | `3000`                                             |
| Health check                 | Enabled, path `/api/health`, expected status `200` |
| Persistent storage           | None                                               |
| Initial replicas             | `1`                                                |
| Pre/post-deployment commands | None                                               |

Set `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, and `NEXT_PUBLIC_SUPABASE_ANON_KEY` for both build time and runtime. Primary Production also requires runtime `DATABASE_URL`, `CLOIE_DEPLOYMENT_KIND=production`, `CLOIE_BACKEND_ID`, `CLOIE_PRIMARY_BACKEND_ID`, `CONFIRMATION_SECRET`, and `CLOIE_LEGAL_TICKET_SECRET`. Configure `DIRECT_URL` only where repository migration and schema commands run. Optional runtime features keep using the variables documented in `.env.example`.

Attach the System CLOIE resource to the private Coolify network that can resolve the configured Supavisor or PostgreSQL hostname. Do not use `localhost` in `DATABASE_URL`; inside the container it refers to the System CLOIE container. `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` belong to the separate Supabase Auth deployment. Do not configure a privileged Supabase key in this application.

Apply database migrations before deploying the application image:

```bash
pnpm supabase:push:dry-run
pnpm supabase:push
```

Run these commands from a trusted operator or deployment environment with `DIRECT_URL`. Do not run migrations in the container startup command; rolling deployments may start multiple application containers concurrently.

## Testing

### Running Tests

```bash
pnpm test                                    # Unit suites (DB invariants gated)
pnpm test:watch                               # Watch mode
pnpm vitest run src/__tests__/path/file.test.ts  # Single file
```

Sixteen suites validate database-level constraints. They are gated behind `RUN_DATABASE_INTEGRATION_TESTS=1` so `pnpm test` never writes to a shared backend:

```bash
RUN_DATABASE_INTEGRATION_TESTS=1 pnpm test:db
```

Point `DATABASE_URL` at a disposable test database, never a shared backend. `pnpm test:db` discovers the suites by convention (files gated on `RUN_DATABASE_INTEGRATION_TESTS`); `pnpm verify:database-suites` fails if a gated suite falls outside the convention or a required suite is missing. The gated suites:

- `src/__tests__/features/academic-calendar/academic-period-one-active-invariant.test.ts`
- `src/__tests__/features/academic-calendar/read-period-readiness-totals-parity.test.ts`
- `src/__tests__/features/academic-calendar/school-year-active-constraint.test.ts`
- `src/__tests__/features/course-assignments/class-identity-uniqueness.test.ts`
- `src/__tests__/features/course-assignments/course-assignment-membership-constraints.test.ts`
- `src/__tests__/features/course-assignments/course-seed-provenance-schema.test.ts`
- `src/__tests__/features/course-assignments/seeded-course-assignment-memberships.test.ts`
- `src/__tests__/features/evaluations/publication-roster-lock-db-invariants.test.ts`
- `src/__tests__/features/responses/response-lifecycle-invariants.test.ts`
- `src/__tests__/features/users/services/program-head-assignment-set-db-invariants.test.ts`
- `src/__tests__/features/users/services/secretary-account-creation-atomicity.test.ts`
- `src/__tests__/modules/course-assignments/course-assignments-section-constraint.test.ts`
- `src/__tests__/modules/identity-access/secretary-rls-policy.test.ts`
- `src/__tests__/modules/identity-access/table-access-dispositions.test.ts`

The destructive dedicated-demo migration replay has a separate gate. Run it only after confirming that the configured backend identity, database identity, and private target marker identify the isolated demo target:

```bash
RUN_DEMO_RESET_INTEGRATION_TESTS=1 pnpm vitest run src/__tests__/scripts/demo-reset-fresh-replay.test.ts
```

### Browser E2E (Playwright)

`e2e/` holds Playwright journeys over the seeded fixture. Run them with:

```bash
pnpm test:e2e
```

Locally, Playwright boots the Next.js dev server on port 3100 and signs in through the dev-auth cookie (`cloie_dev_auth`). In CI, the same suite runs against a production build (`next build` + `next start`) with the isolated signed CI test session (`cloie_ci_test_auth`). See `playwright.config.ts`.

Two projects run: `desktop` (Desktop Chrome) and `mobile` (Pixel 7). `e2e/mobile.spec.ts` matches the mobile project; the rest run on desktop.

`e2e/support/global-setup.ts` verifies the seeded fixture against the pinned expectations in `e2e/support/contract.ts` before any journey starts. The contract is human-reviewed and pinned, not read from the database under test. If a seed row drifts, the contract check fails and names the affected record.

Retries are disabled. A red-then-green run counts as flaky evidence, not a clean pass.

For accepted production evidence (performance traces, no-session boundary), follow `docs/testing/production-browser-evidence.md`.

### Testing Patterns

For modules using React `cache()`, tests must reset modules:

```typescript
beforeEach(() => {
  vi.resetModules();
});

// Use dynamic import after reset
const { someFunction } = await import("@/lib/module");
```

See `src/__tests__/` for example test implementations.

## Continuous Integration

CI runs on GitHub Actions. Workflows live in `.github/workflows/`. The retired Depot CI workflows remain locally under `.depot/workflows/` and are gitignored.

`ci.yml` runs three jobs on every push to `main` and pull request:

- **static-checks** — changed-file Prettier and zero-warning ESLint checks. This runs in parallel with unit tests.
- **unit-tests** — the fast Vitest suite, split into Node and jsdom projects. `pnpm test` runs them sequentially to preserve test isolation; CI shards them across separate runners. Database and subprocess-heavy tooling suites run in their dedicated jobs.
- **production-build** — risk-selected production compilation and route generation.
- **database-integration** — applies the Supabase migrations and fixture seed to a disposable Postgres 16 container, then runs the gated DB suites (`pnpm test:db`). The container is the only database involved; no shared backend is touched.
- **browser-e2e** — production build plus `pnpm test:e2e` against the same disposable Postgres, signed in with the isolated CI test session (`CLOIE_CI_TEST_ENABLED=true`, `CLOIE_DEPLOYMENT_KIND=ci-test`). The Playwright report and traces upload as artifacts on failure.

`scheduled.yml` repeats the full unit gate and runs the real-subprocess CI tooling integration suite nightly. `code-intelligence.yml` runs the baseline-backed Fallow audit gate on pull requests and scheduled Fallow reports.

## Database & Migrations

Canonical schema source is `prisma/schema.prisma` (split across `prisma/models/` by domain). Some uniqueness rules rely on Postgres features Prisma cannot express (e.g. `NULLS NOT DISTINCT` indexes), enforced in `supabase/migrations/*` and mirrored as `@@index` in Prisma.

### Migration Workflow (Local Or Explicit Remote)

```bash
# 1. Edit prisma/schema.prisma or prisma/models/*.prisma
# 2. Generate migration SQL
pnpm supabase:migration:diff -- your_change_name
# 3. Review the SQL in supabase/migrations/
# 4. Local stack: reset/apply through the committed migration history
pnpm supabase:reset
# 5. Remote self-hosted target: dry-run, then push via DIRECT_URL
pnpm supabase:push:dry-run
pnpm supabase:push
# 6. Regenerate types (local stack or remote target)
pnpm supabase:types:local
pnpm supabase:types
```

Local commands always target the local CLI Docker stack explicitly; remote commands always use `DIRECT_URL` through `--db-url`. There is no linked-project state, and `src/types/supabase-database.ts` is generated and should never be hand-edited.

See `supabase/README.md` for the complete local and remote self-hosted workflow and ADR 0020 for the target-neutral contract.

## Code Style & Conventions

- **Commit messages**: Conventional Commits (`feat`, `fix`, `refactor`, `perf`, `style`, `test`, `docs`, `build`, `ops`, `chore`). See `AGENTS.md`.
- **Quotes**: Double quotes
- **Semicolons**: Required
- **Trailing commas**: ES5 style
- **Indent**: 2 spaces
- **Line width**: 100 characters
- **Line endings**: LF
- **Import paths**: `@/*` maps to `./src/*`
- **UI primitives**: shadcn/ui base-nova + Base UI (`@base-ui/react`). No Radix UI packages.
- **Prisma models**: Use `@@map` for snake_case table names. TypeScript uses camelCase.

Prettier config includes `prettier-plugin-tailwindcss` for automatic class sorting.

## Domain Restriction

Production auth restricts to `@acd.edu.ph` and `@acdeducation.com` domains. Enforced in `src/app/api/auth/callback/route.ts`.

## Important Gotchas

### Turbopack + Tailwind + pnpm

Special configuration in `.npmrc`:

```ini
public-hoist-pattern[]=*tailwindcss*
public-hoist-pattern[]=*@tailwindcss*
```

And `next.config.ts` includes custom `resolveTailwindcssPackagePath()` for Turbopack. If Tailwind CSS `@import` resolution breaks, check these two files first.

### Zod + Turbopack

Use `customZodResolver` from `src/lib/forms/zod-resolver.ts`. The official `@hookform/resolvers/zod` breaks with Turbopack + Zod 4.

### Testing with `cache()`

Modules using React `cache()` require `vi.resetModules()` in `beforeEach` and dynamic import to avoid stale cached results.

### Prisma Constraints

Some uniqueness rules can only be expressed as Postgres features (e.g. `NULLS NOT DISTINCT` indexes). The real constraint lives in `supabase/migrations/*`; Prisma gets a mirrored `@@index`. See `AGENTS.md` for details.
