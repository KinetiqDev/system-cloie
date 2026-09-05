---
title: System CLOIE Architecture Overview
kind: living-project-document
status: living
last_verified: 2026-09-04
---

# Architecture Overview

System CLOIE is a college-wide Outcome-Based Education evaluation, monitoring, analytics, and reporting platform built as a **modular monolith** on Next.js App Router. This page orients you to the shape of the system; the rules live in [AGENTS.md](../../AGENTS.md) and the domain contexts in [CONTEXT-MAP.md](../../CONTEXT-MAP.md), and this page links to them instead of restating them.

## Modular monolith layout

Feature modules live under `src/features/<domain>/`, split by domain responsibility and cohesion. Domains currently present (each with a `CONTEXT.md` where the domain's terminology and invariants are defined — see [CONTEXT-MAP.md](../../CONTEXT-MAP.md) for the index):

`users`, `auth`, `legal`, `course-assignments`, `outcomes`, `academic-calendar`, `academic-structure`, `enrollments`, `instruments`, `evaluations`, `responses`, `response-review`, `analytics`, `secretary`, `dean`, `portals`, `design-system`.

Shared code lives in `src/lib/` (including `src/lib/db/` for Prisma access and the table-access-disposition registry, `src/lib/forms/` for the Zod resolver, `src/lib/actions/` for Server Actions, `src/lib/supabase/` for Auth clients). UI primitives live in `src/components/ui/`.

The rules for how to work inside this layout — smallest complete change, preserve domain boundaries, server-first rendering, narrow `"use client"` boundaries, Server Actions under `src/lib/actions/` following existing patterns — are owned by [AGENTS.md → Architecture](../../AGENTS.md).

## Server-first rendering

- Server Components are the default; `"use client"` boundaries are narrow and limited to state, hooks, browser APIs, event handlers, charts, drag-and-drop, and react-hook-form (rule owned by [AGENTS.md → Architecture](../../AGENTS.md)).
- Data is fetched and authorized in Server Components or server-only feature services; serializable prepared data is passed into Client Components.
- Caching policy (loading states, Suspense, what may and may never be cached) is owned by [AGENTS.md → Rendering and Caching](../../AGENTS.md).

## Request boundary

Every request enters through [`src/proxy.ts`](../../src/proxy.ts) — **not** `middleware.ts` (no `middleware.ts` exists):

1. For Server Action POSTs (identified by the `next-action` header or a `multipart/form-data` content type) with an `origin` header, the proxy rewrites `x-forwarded-host` to the origin host before handing off, so Server Action origin checks survive the reverse-proxy path.
2. It then calls `updateSession()` from [`src/lib/supabase/middleware.ts`](../../src/lib/supabase/middleware.ts), which creates a Supabase SSR server client bound to the request/response cookies and refreshes the auth token (`supabase.auth.getUser()`).
3. For `/program-head/programs/<id>` navigations it persists the selected program in a cookie for the Program Head selected-program context (see [ADR 0009](../adr/0009-program-head-selected-program-context.md)).

The matcher excludes static assets, images, and `api/health`. Authorization decisions themselves are never made here — they remain server-enforced in services and data access (see [auth-and-authorization.md](auth-and-authorization.md)).

## Data and identity stack

- **PostgreSQL on self-hosted Supabase** — Supabase Cloud is not a supported backend; only the local Supabase CLI Docker stack (development) and independently operated self-hosted Supabase Docker instances (every non-local target). One runtime path, one environment contract; switching targets is an operator-controlled restart boundary. See [ADR 0020](../adr/0020-self-hosted-supabase-target-neutral-backends.md) and [data-and-storage.md](data-and-storage.md).
- **Prisma** is the canonical application schema representation (`prisma/schema.prisma` + `prisma/models/`).
- **Supabase Auth (Google OAuth) with `@supabase/ssr`** handles authentication; domain users are separate from Auth identities ([ADR 0002](../adr/0002-separate-domain-users-from-auth-identities.md)). The full flow and authorization model: [auth-and-authorization.md](auth-and-authorization.md).

## Charts

Charts are prepared and authorized on the server and rendered through shadcn/ui chart primitives ([`src/components/ui/chart.tsx`](../../src/components/ui/chart.tsx)) plus Recharts. The rule "do not install another charting library" is owned by [AGENTS.md → Tech and Repository Conventions](../../AGENTS.md).

## Qualitative processing boundary (ADR 0016)

Qualitative text processing is bounded and server-side:

- **winkNLP** (with the `wink-eng-lite-web-model`) and **stopword** tokenize/filter de-identified, redacted response text inside analytics services (e.g. `get-course-bound-review-detail.ts`, `get-faculty-analytics-data.ts`, program-head analytics) — always server-side, never in the browser.
- **AI interpretation** runs through the OpenAI-compatible SDK (`openai`) in server-only services (`generate-program-head-analytics-insight.ts`), enabled via `CLOIE_AI_*` environment settings. The delivered Program Head insight sends a strictly aggregate evidence packet — no raw comment text crosses the boundary; the browser receives validated aggregate-derived output only.

AI never authorizes access, makes CQI decisions, mutates domain records, or persists response text or AI history. The boundary is specified in [ADR 0016](../adr/0016-server-side-bounded-ai-interpretation-boundary.md).

## CI gate inventory

Workflows live in `.github/workflows/`:

| Workflow                                                                 | Jobs                        | What it does                                                                                                                                                                                                                                                                                                                                                    |
| ------------------------------------------------------------------------ | --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`ci.yml`](../../.github/workflows/ci.yml)                               | `select`                    | Classifies changed files into risk domains (`scripts/ci/lib/risk-domains.mjs` via `scripts/ci/select-checks.mjs`) to select the gated jobs below. Prettier, ESLint, and Vitest always run.                                                                                                                                                                      |
|                                                                          | `quality-checks`            | Prettier check (changed files), full lint, changed-file lint (no new warnings), Vitest (`--pool=forks --maxWorkers=4`).                                                                                                                                                                                                                                         |
|                                                                          | `production-build`          | `next build` production gate; selected when application code, schema, or production configuration changed.                                                                                                                                                                                                                                                      |
|                                                                          | `database-integration`      | Disposable `postgres:16-alpine` service; replays canonical migrations (`scripts/ci/apply-migrations.sh`), seeds the fixture, verifies target and suite completeness, runs the gated DB suites (`RUN_DATABASE_INTEGRATION_TESTS=1`, including live RLS).                                                                                                         |
|                                                                          | `browser-e2e`               | Playwright journeys in production mode (`next build` + `next start`) against the disposable seeded database, signed in with the isolated CI test session (`CLOIE_CI_TEST_ENABLED=true`, `CLOIE_DEPLOYMENT_KIND=ci-test`); desktop + mobile chromium and the `@visual` baseline per risk selection. Retries disabled.                                            |
| [`scheduled.yml`](../../.github/workflows/scheduled.yml)                 | nightly deep verification   | Full unit suites; database integration with live RLS; chromium matrix with visual baseline; firefox/webkit cross-browser; **production-boundary** job (verifies dev-login refusal and protected routes against a real production-mode server); **demo-reset-gate** job (verifies the isolation validator refuses shared/hosted and primary-production targets). |
| [`code-intelligence.yml`](../../.github/workflows/code-intelligence.yml) | fallow audit gate / reports | PR gate on new fallow findings in changed files ([ADR 0011](../adr/0011-fallow-code-intelligence-policy.md)); full reports on push, weekly schedule, and dispatch.                                                                                                                                                                                              |

The retired Depot CI workflows remain locally under `.depot/workflows/` (gitignored) and must not be re-added.

## ADR index

All decisions live in `docs/adr/`. Where a design introduces or reverses a cross-cutting constraint, record a new ADR (rule owned by [AGENTS.md](../../AGENTS.md)).

| ADR                                                                                     | Title                                                           | Decision (one line)                                                                                                                                                                                                      |
| --------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [0001](../adr/0001-single-role-accounts.md)                                             | Single-Role Accounts                                            | Accounts carry exactly one role; constrain `user_roles` to a single assignment rather than allowing multi-role accumulation.                                                                                             |
| [0001](../adr/0001-complete-secretary-created-accounts.md)                              | Complete Secretary-Created Accounts                             | Secretary-created accounts are complete for their selected role at creation time; Google OAuth is the only primary Production authentication.                                                                            |
| [0002](../adr/0002-separate-domain-users-from-auth-identities.md)                       | Separate Domain Users from Auth Identities                      | Keep a stable domain `User` id and link Google identities through a nullable unique `auth_user_id` matched by normalized email — Supabase Auth UUIDs are not used as `User.id`.                                          |
| [0003](../adr/0003-course-catalog-and-assignment-refactor.md)                           | Course Catalog and Assignment Refactor                          | Course catalog stores default year level/semester/term; assignments override per program; every assignment binds to exactly one program with a required section and one faculty member.                                  |
| [0004](../adr/0004-strict-program-deletion.md)                                          | Strict Program Deletion                                         | Permanent deletion only by Secretary/Dean after a program is inactive with no linked records; relationships are `RESTRICT`-protected and deactivation is the reversible path.                                            |
| [0005](../adr/0005-outcome-ownership-and-dean-oversight.md)                             | Outcome Ownership and Dean Oversight                            | Typed outcome layers (Institutional, PLO, CILO) with Secretary stewardship, Faculty mapping responsibility, Dean oversight, and versioned immutable readiness snapshots.                                                 |
| [0006](../adr/0006-dean-pwa-offline-cache-contract.md)                                  | Dean PWA Offline Cache Contract                                 | Deferred — would cache last viewed read-only Dean data with timestamp; all mutations require network.                                                                                                                    |
| [0007](../adr/0007-course-assignment-roster-membership.md)                              | Course-Assignment Roster Membership                             | Course rosters are explicit `CourseAssignmentMembership` records, independently auditable and never inferred from the term-placement ledger.                                                                             |
| [0008](../adr/0008-dedicated-demo-deployment-authentication.md)                         | Dedicated Demo Deployment Authentication                        | A dedicated demo deployment may use short-lived signed demo sessions; primary Production stays OAuth-only with a separate database.                                                                                      |
| [0009](../adr/0009-program-head-selected-program-context.md)                            | Program Head Selected Program Context                           | Program Head authority is the full active assignment set; management selects exactly one program, validated server-side on every request — no primary/default program.                                                   |
| [0010](../adr/0010-unified-appearance-and-protected-showcase.md)                        | Unified Appearance and Protected Showcase                       | Light/Dark/System appearance behind a server-owned gate; protected static showcase in dev/demo, fail-closed in primary Production; appearance storage carries no authorization value.                                    |
| [0011](../adr/0011-fallow-code-intelligence-policy.md)                                  | Fallow Code Intelligence Policy                                 | Fallow (pinned 2.54.3) with a baseline-backed changed-file CI gate, narrow seams, report-only full scans, and human-gated mutation.                                                                                      |
| [0012](../adr/0012-secretary-controlled-academic-calendar-state.md)                     | Secretary-Controlled Academic Calendar State                    | Live calendar state is Secretary-controlled through lifecycle services and a fixed structural UI; dates are informational and never gate lifecycle transitions.                                                          |
| [0013](../adr/0013-versioned-curriculum-course-placement.md) _(Superseded by ADR 0021)_ | Versioned Curriculum Course Placement: removed                  | Versioned curricula were explored and removed; Course defaults remain advisory and actual offering context lives on CourseAssignment.                                                                                    |
| [0014](../adr/0014-google-authoritative-account-names.md)                               | Google-Authoritative Account Names                              | Google metadata supplies the canonical account name only at creation/first OAuth link; later callbacks preserve the stored name.                                                                                         |
| [0015](../adr/0015-name-based-course-roster-resolution-and-student-id-removal.md)       | Name-Based Course Roster Resolution and Student ID Removal      | Rosters resolve names within the authorized course-assignment scope with preview-first human reconciliation; Student ID collection is removed.                                                                           |
| [0016](../adr/0016-server-side-bounded-ai-interpretation-boundary.md)                   | Server-Side Bounded AI Interpretation Boundary                  | AI-assisted interpretation of de-identified qualitative evidence runs server-side through an OpenAI-compatible provider; the browser receives aggregate-derived output only.                                             |
| [0017](../adr/0017-program-learning-outcome-canonical-terminology.md)                   | Program Learning Outcome Canonical Terminology                  | "Graduate Outcome" is renamed to Program Learning Outcome (PLO) across code, contracts, and UI; the Prisma model is renamed behind mapped physical table names.                                                          |
| [0018](../adr/0018-transfer-ilo-ownership-to-gen-ed-coordinator.md)                     | Transfer ILO Catalog Ownership to General Education Coordinator | Institutional Learning Outcome catalog ownership moves to the General Education Coordinator.                                                                                                                             |
| [0019](../adr/0019-remove-secretary-course-assignment-mutation.md)                      | Removing Secretary Course Assignment Mutation                   | The Secretary holds no course-assignment mutation; the General Education Coordinator stewards the `GENERAL_EDUCATION` scope, Program Heads steward program-specific assignments, the Dean retains all-program authority. |
| [0020](../adr/0020-self-hosted-supabase-target-neutral-backends.md)                     | Self-Hosted Supabase Only — Target-Neutral Backends             | Only self-hosted Supabase backends are supported; one runtime path and environment contract; target switching is an operator-controlled restart boundary.                                                                |
| [0021](../adr/0021-remove-curriculum-versioning.md)                                     | Remove Curriculum Versioning                                    | Curriculum versioning is removed; advisory Course defaults and immutable CourseAssignment/evaluation snapshots carry academic context.                                                                                   |

## Where the rules live

- Engineering, rendering, caching, forms, Supabase/Prisma workflow, CI, verification: [AGENTS.md](../../AGENTS.md)
- Domain terminology and invariants: [CONTEXT-MAP.md](../../CONTEXT-MAP.md) → `src/features/<domain>/CONTEXT.md`
- Cross-cutting decisions: `docs/adr/` (index above)
- Deeper slices of this documentation: [data-and-storage.md](data-and-storage.md), [auth-and-authorization.md](auth-and-authorization.md), [deployment.md](deployment.md)
- Tech stack versions: [cloie-techstack.md](../cloie-techstack.md)
