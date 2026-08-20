# System CLOIE

**Comprehensive Learning Outcomes and Instructional Evaluation**

A college-level digital evaluation, monitoring, and reporting platform for Assumption College of Davao. CLOIE supports multiple academic programs, their courses, faculty members, and stakeholder-based outcome evaluation processes.

## Quick Start

### Prerequisites

- Node.js 22 (see `.nvmrc`)
- pnpm 10 (`npm install -g pnpm`)
- A Supabase project (for database, auth, and migrations)

### Setup

```bash
# 1. Clone and install
git clone <repository-url>
cd project-cloie
pnpm install

# 2. Environment variables
cp .env.example .env.local
# Edit .env.local with your credentials.
# See .env.example for the full variable reference.
# The essentials: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
# `DATABASE_URL`, `DIRECT_URL`, `SUPABASE_PROJECT_REF`, `SUPABASE_ACCESS_TOKEN`,
# and `SUPABASE_DB_PASSWORD`.

# 3. Link and push database
pnpm supabase:link       # Link to your Supabase project
pnpm supabase:push       # Push migrations to Supabase
pnpm supabase:types        # Regenerate Supabase database types
pnpm db:seed             # Optional: seed demo data

# 4. Run development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

See `supabase/README.md` for the full Supabase cloud workflow and `AGENTS.md` for the Prisma + Supabase migration cycle.

## Tech Stack

| Category        | Technology                   |
| --------------- | ---------------------------- |
| Framework       | Next.js 16 (App Router, Turbopack) |
| Language        | TypeScript 5                 |
| Styling         | Tailwind CSS v4, class-variance-authority |
| Components       | shadcn/ui (base-nova style, Base UI primitives) |
| Icons             | lucide-react                 |
| Forms             | react-hook-form, customZodResolver, Zod 4 |
| Charts            | Recharts (through shadcn/ui chart primitives) |
| Drag and Drop     | @dnd-kit (core, sortable) |
| Qualitative NLP   | winkNLP, stopword |
| Word Cloud        | @isoterik/react-word-cloud |
| AI Insights       | OpenAI-compatible API (server-only, bounded; see ADR 0016) |
| Database          | PostgreSQL 15+ (Supabase) |
| ORM               | Prisma 6 |
| Auth              | Supabase Auth (Google OAuth) |
| Testing           | Vitest, Testing Library |
| Package Manager   | pnpm 10 |

## How We Build

The project combines two workflows depending on the change's size and stage:

- **OpenSpec workflow** (`openspec/`) — artifact-driven change management. Use `openspec-explore` + `openspec-propose` to draft proposals, designs, specs, and tasks. For fast-tracking, `openspec-ff-change` creates all artifacts in one pass. Implementation follows with `openspec-apply-change`, verification with `openspec-verify-change`, and archiving with `openspec-archive-change`.

- **Matt Pocock skills** — conversation-driven planning and execution. Use `wayfinder` to chart large explorations as investigation tickets, `grilling` / `grill-with-docs` to stress-test designs and record ADRs, `prototype` to build throwaway artifacts, `to-spec` to synthesize specifications, and `to-tickets` to break work into vertical-slice GitHub issues with blocking edges.

**In practice** for a big feature or refactor: explore and propose with OpenSpec → grill the design to sharpen it → `to-tickets` to split into dependency-ordered issues → implement each slice → verify and archive. For scouting without a clear destination, `wayfinder` charts the map first and its resolved tickets feed into the OpenSpec proposal.

See `AGENTS.md` for the full skill inventory and `openspec/config.yaml` for the canonical architecture rules.

## Authentication

CLOIE operates with three intentionally separated authentication modes, never co-deployed under one instance:

| Mode | Mechanism | Where |
| ---- | --------- | ----- |
| **Primary Production** | Supabase Auth with Google OAuth, domain-restricted to `@acd.edu.ph` and `@acdeducation.com` | Primary public deployment |
| **Local Development** | `cloie_dev_auth` cookie + `POST /api/auth/dev-login`, demo users with `@cloie.test` emails | `NODE_ENV=development` only |
| **Dedicated Demo** | Short-lived signed demo session against isolated resettable database; server-only `CLOIE_DEMO_*` configuration | Separate demo deployment |

The demo deployment is used for production-build route/rendering evidence, cross-role demonstrations, and performance traces. It never replaces OAuth evidence. See `docs/runbooks/dedicated-demo-deployment.md`, `docs/adr/0008-dedicated-demo-deployment-authentication.md`, and the archived `openspec/changes/archive/2026-07-29-add-dedicated-demo-auth/` artifacts for the full contract.

Key demo scripts:
- `pnpm demo:reset` — destructive reset of the isolated demo database (validates target identity first)
- `pnpm verify:production-auth-boundary` — confirms primary Production remains OAuth-only
- `pnpm verify:dedicated-demo-auth-boundary` — confirms demo deployment has signed-session auth active

## Available Scripts

| Command                                     | Purpose |
| ------------------------------------------- | ------- |
| `pnpm dev`                                  | Start Next.js dev server with Turbopack |
| `pnpm build`                                | Production build (includes Next.js typecheck) |
| `pnpm lint`                                 | ESLint check |
| `pnpm format`                               | Prettier formatting (includes Tailwind class sorting) |
| `pnpm test`                                 | Run Vitest unit suites (DB invariant suites are gated) |
| `pnpm test:watch`                           | Run Vitest in watch mode |
| `pnpm test:db`                              | Run opt-in DB invariant suites (requires `RUN_DATABASE_INTEGRATION_TESTS=1`) |
| `pnpm vitest run src/__tests__/...`         | Run a single test file |
| `pnpm db:push`                              | Push Prisma schema to dev database |
| `pnpm db:seed`                               | Seed database with demo data |
| `pnpm db:studio`                             | Open Prisma Studio GUI |
| `pnpm supabase:link`                         | Link to remote Supabase project |
| `pnpm supabase:migration:diff`               | Generate migration SQL from Prisma schema changes |
| `pnpm supabase:push:dry-run`                 | Preview migrations before applying |
| `pnpm supabase:push`                         | Push migrations to Supabase |
| `pnpm supabase:types`                        | Regenerate Supabase database types |
| `pnpm supabase:login`                        | Log in to the Supabase CLI |
| `pnpm supabase:migration:baseline`           | Create the baseline migration |
| `pnpm supabase:migration:list`               | List applied migrations |
| `pnpm supabase:migration:repair-latest`      | Mark the latest migration as applied |
| `pnpm demo:reset`                            | Destructive reset of isolated demo DB |
| `pnpm verify:production-auth-boundary`       | Validate primary Production auth is OAuth-only |
| `pnpm verify:dedicated-demo-auth-boundary`   | Validate demo deployment auth contracts |
| `pnpm verify:demo-target-isolation`          | Validate the demo reset target is the isolated demo DB |
| `pnpm fallow:audit`                          | Run the fallow static-analysis audit |
| `pnpm fallow:baseline`                       | Refresh fallow baselines |
| `pnpm curriculum:generate-baseline`          | Generate baseline curricula |
| `pnpm start`                                 | Run the production build |

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
├── features/             # Feature-based domain modules (16 domains)
│   ├── academic-calendar/    # School years, semesters, terms, active periods
│   ├── academic-structure/   # Programs and majors
│   ├── analytics/            # Faculty/program analytics dashboards
│   ├── auth/                 # Authentication, sessions, role identity
│   ├── course-assignments/   # Courses, sections, teaching assignments, enrollment
│   ├── curriculum/           # Curricula, versions, course placement
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

| ADR | Title |
| --- | ----- |
| 0001 | Complete secretary-created accounts |
| 0001 | Single-role accounts |
| 0002 | Separate domain users from auth identities |
| 0003 | Course catalog and assignment refactor |
| 0004 | Strict program deletion |
| 0005 | Outcome ownership and dean oversight |
| 0006 | Dean PWA offline cache contract |
| 0007 | Course assignment roster membership |
| 0008 | Dedicated demo deployment authentication |
| 0009 | Program head selected program context |
| 0010 | Unified appearance and protected showcase |
| 0011 | Fallow code intelligence policy |
| 0012 | Secretary-controlled academic calendar state |
| 0013 | Versioned curriculum course placement |
| 0014 | Google authoritative account names |
| 0015 | Name-based course roster resolution and student ID removal |
| 0016 | Server-side bounded AI interpretation boundary |
| 0017 | Program learning outcome canonical terminology |

### Key Architectural Patterns

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

Required in `.env.local` (see `.env.example` for complete set):

```bash
# Supabase (client)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_SITE_URL=https://your-app.example.com

# Database (Prisma)
DATABASE_URL=postgresql://postgres:password@your-project-pooler.supabase.co:6543/postgres?pgbouncer=true&connection_limit=1
DIRECT_URL=postgresql://postgres:password@your-project.supabase.co:5432/postgres

# Supabase CLI cloud workflow
SUPABASE_PROJECT_REF=your-project-ref
SUPABASE_ACCESS_TOKEN=your-access-token
SUPABASE_DB_PASSWORD=your-db-password

# Bootstrap
BOOTSTRAP_SECRETARY_EMAIL=secretary@acd.edu.ph

# Secretary edit confirmations (production)
CONFIRMATION_SECRET=your-confirmation-secret

# Local development only; does not enable dedicated demo authentication
NEXT_PUBLIC_DEMO_MODE=false

# Demo deployment (server-only, never set on primary Production)
CLOIE_DEMO_ENABLED=
CLOIE_DEPLOYMENT_KIND=
CLOIE_DEMO_SESSION_SECRET=
CLOIE_DEMO_ALLOWED_USERS=
CLOIE_DEMO_SUPABASE_PROJECT_REF=
CLOIE_PRIMARY_SUPABASE_PROJECT_REF=

# Legal acknowledgement ticket (server-only HMAC secret)
CLOIE_LEGAL_TICKET_SECRET=

# Server-only appearance release control; enable only per docs/runbooks/appearance-production-activation.md
CLOIE_APPEARANCE_ENABLED=

# Test-only: opt in to DB invariant suites (pnpm test:db)
RUN_DATABASE_INTEGRATION_TESTS=

# AI Insights (server-only, optional): CLOIE_AI_ENABLED, CLOIE_AI_API_KEY,
# CLOIE_AI_BASE_URL, CLOIE_AI_MODEL, corpus gates, and bounds. See ADR 0016.
```

## Testing

### Running Tests

```bash
pnpm test                                    # Unit suites (DB invariants gated)
pnpm test:watch                               # Watch mode
pnpm vitest run src/__tests__/path/file.test.ts  # Single file
```

### Database Invariant Tests

Seven suites validate database-level constraints. They are gated behind `RUN_DATABASE_INTEGRATION_TESTS=1` so `pnpm test` never writes to a hosted database:

```bash
RUN_DATABASE_INTEGRATION_TESTS=1 pnpm test:db
```

Point `DATABASE_URL` at a disposable test database — never a shared Supabase project. The gated suites:

- `src/__tests__/features/course-assignments/course-assignment-membership-constraints.test.ts`
- `src/__tests__/features/course-assignments/class-identity-uniqueness.test.ts`
- `src/__tests__/features/course-assignments/seeded-course-assignment-memberships.test.ts`
- `src/__tests__/modules/course-assignments/course-assignments-section-constraint.test.ts`
- `src/__tests__/features/academic-calendar/read-period-readiness-totals-parity.test.ts`
- `src/__tests__/features/users/services/program-head-assignment-set-db-invariants.test.ts`
- `src/__tests__/features/academic-calendar/school-year-active-constraint.test.ts`

The destructive dedicated-demo migration replay has a separate gate. Run it only after confirming that the linked Supabase project is the isolated demo target:

```bash
RUN_DEMO_RESET_INTEGRATION_TESTS=1 pnpm vitest run src/__tests__/scripts/demo-reset-fresh-replay.test.ts
```

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

## Database & Migrations

Canonical schema source is `prisma/schema.prisma` (split across `prisma/models/` by domain). Some uniqueness rules rely on Postgres features Prisma cannot express (e.g. `NULLS NOT DISTINCT` indexes), enforced in `supabase/migrations/*` and mirrored as `@@index` in Prisma.

### Migration Workflow (No Docker)

```bash
# 1. Edit prisma/schema.prisma or prisma/models/*.prisma
# 2. Generate migration SQL
pnpm supabase:migration:diff -- your_change_name
# 3. Review the SQL in supabase/migrations/
# 4. Dry-run before applying
pnpm supabase:push:dry-run
# 5. Apply to Supabase
pnpm supabase:push
# 6. Regenerate types
pnpm supabase:types
```

Avoid Docker-backed commands: `supabase db pull` and `supabase db diff --linked`. `src/types/supabase-database.ts` is generated and should never be hand-edited.

See `supabase/README.md` for the complete cloud-only workflow and baseline recovery instructions.

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
