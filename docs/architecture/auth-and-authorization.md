---
title: System CLOIE Auth and Authorization
kind: living-project-document
status: living
last_verified: 2026-09-04
---

# Auth and Authorization

How people enter System CLOIE and how the server decides what they may do. Domain terminology and invariants are owned by `src/features/auth/CONTEXT.md`; the durable decisions are [ADR 0001](../adr/0001-single-role-accounts.md), [ADR 0002](../adr/0002-separate-domain-users-from-auth-identities.md), [ADR 0008](../adr/0008-dedicated-demo-deployment-authentication.md), [ADR 0014](../adr/0014-google-authoritative-account-names.md), and [ADR 0015](../adr/0015-name-based-course-roster-resolution-and-student-id-removal.md).

## Identity model

- **Domain user vs Auth identity** ([ADR 0002](../adr/0002-separate-domain-users-from-auth-identities.md)): System CLOIE keeps its own stable domain `User` id and links the Google/Supabase Auth identity through a nullable unique `auth_user_id`, matched by exact normalized email at the OAuth callback. Admin-created users exist before first sign-in; Supabase Auth UUIDs are never used as `User.id`. An already-linked `User` whose email is presented with a different Auth identity fails closed.
- **Canonical account names** ([ADR 0014](../adr/0014-google-authoritative-account-names.md)): Google profile metadata supplies the account name only at account creation or first OAuth link; later callbacks preserve the stored name. The name is one opaque `User.name`, never parsed into first/last parts.

## Google OAuth flow with the signed-acknowledgement gate

The public entry is the role selection portal, where the person chooses the role they want to enter with (`intent`). Before any Google contact, the browser posts the acknowledged privacy notice and terms versions to `/api/auth/legal-acknowledgement`, which issues an **HMAC-SHA256-signed base64url ticket** (payload: role intent + pinned privacy/terms versions, 15-minute expiry plus 60 s clock skew) carried in the httpOnly `cloie_legal_ack` cookie scoped to `/api/auth` (legal domain; see `src/features/legal/CONTEXT.md`).

The callback route (`src/app/api/auth/callback/route.ts`) then:

1. **Verifies the ticket before the Google code exchange proceeds.** A missing, expired, tampered, or intent/version-mismatched ticket redirects to the site root — the privacy/terms acknowledgement therefore always precedes role selection and sign-in. The cookie is cleared once the callback finishes with it.
2. Exchanges the code through Supabase Auth, matches or creates the domain `User` by normalized email (first link replaces a provisional Secretary-entered name with the Google-derived name), and resolves the session.

There are no CLOIE-managed passwords, magic links, or invitation workflows for real accounts; Google OAuth is the only primary Production authentication mechanism ([ADR 0001: Complete Secretary-Created Accounts](../adr/0001-complete-secretary-created-accounts.md)).

## Roles, role entry, and the single-active-role invariant

- **Single-role accounts** ([ADR 0001](../adr/0001-single-role-accounts.md)): each account holds exactly one System CLOIE account role. The `UserRole` table enforces this (`user_id @unique` in `prisma/models/identity-access.prisma`); multi-role accumulation was rejected. Operational capabilities (e.g. course-assignment ownership granting teaching capability) are domain assignments, not second roles.
- **Role entry**: roles enter either through the public self-service path (role claim with eligibility rules — institutional email domains for internal roles, self-service onboarding for external roles) or as Secretary-created accounts that are complete for their selected role at creation time ([ADR 0001: Complete Secretary-Created Accounts](../adr/0001-complete-secretary-created-accounts.md)). Account states (pending/rejected external verification, inactive) gate dashboard access.
- **Role changes are administrator-controlled** only (managed role transitions, graduate transition); there is no self-service role switching.

## Program scoping

- **Program Heads** ([ADR 0009](../adr/0009-program-head-selected-program-context.md)): authority is the complete set of active `ProgramHeadAssignment` records — zero, one, or many; none is primary or default. Management selects exactly one Program via the selected-program context, and **the server validates the requested program against the current active assignment set on every request**; sensitive writes revalidate inside their transaction. A remembered preference, route value, client state, or JWT metadata cannot establish authority. The selected program is carried in a cookie set by [`src/proxy.ts`](../../src/proxy.ts) — it is an operation context, never an authorization source.
- **General Education Coordinator** (post-[ADR 0018](../adr/0018-transfer-ilo-ownership-to-gen-ed-coordinator.md)/[ADR 0019](../adr/0019-remove-secretary-course-assignment-mutation.md)): college-wide scope derived from the `course_scope == GENERAL_EDUCATION` predicate inside server services — no assignment rows, no fake program.
- Course-bound authorization narrows further to the explicit `CourseAssignmentMembership` roster ([ADR 0007](../adr/0007-course-assignment-roster-membership.md)).

## Server-enforced authorization

Authorization is **always server-enforced; client state is never trusted** for role, program, course, or academic-context decisions (rule owned by [AGENTS.md → Auth and Request Boundary](../../AGENTS.md)). Concretely:

- Session refresh happens in the request boundary ([`src/proxy.ts`](../../src/proxy.ts) → `src/lib/supabase/middleware.ts`); the actual role/scope checks run in Server Components and server-only feature services.
- Roster and recipient resolution use internal `User.id` values confirmed server-side ([ADR 0015](../adr/0015-name-based-course-roster-resolution-and-student-id-removal.md)); final writes reauthorize current account, profile, placement, assignment scope, membership, and conflict state.
- At the database boundary, every table has exactly one access disposition (role-aware RLS, authenticated read-only, server-only, or an approved exception) — registry in `src/lib/db/table-access-dispositions.ts`. See [data-and-storage.md](data-and-storage.md).

## Demo vs production deployment boundaries (ADR 0008)

Three authentication regimes, gated in code and fail-closed:

| Regime | Where it works | Gate |
|---|---|---|
| Google OAuth | Primary Production and development | Always available; the only primary Production mechanism. |
| Development dev-login (`POST /api/auth/dev-login`, `cloie_dev_auth` cookie) | Development only | Route returns 404 unless `NODE_ENV === "development"`; production-mode builds refuse it (verified in CI's production-boundary job). |
| Signed demo session (dedicated demo deployment) | Only when `NODE_ENV=production`, `CLOIE_DEMO_ENABLED=true`, `CLOIE_DEPLOYMENT_KIND=dedicated-demo`, a dedicated demo backend identity, a ≥32-char session secret, and an allowlist of seeded demo accounts are all configured | `src/features/auth/services/demo-auth.ts` returns null — disabling the role switcher — if any gate fails. |

Primary Production remains OAuth-only; demo authentication must never be enabled there, and the production database must never be the demo reset target ([ADR 0008](../adr/0008-dedicated-demo-deployment-authentication.md), [AGENTS.md → Environment and Database Safety](../../AGENTS.md)). Operations: [deployment.md](deployment.md) and the [dedicated demo runbook](../runbooks/dedicated-demo-deployment.md).

## CI test session isolation

Browser E2E runs in production mode but never touches OAuth or demo machinery: when `CLOIE_CI_TEST_ENABLED=true` **and** `CLOIE_DEPLOYMENT_KIND=ci-test` **and** no backend identity is declared **and** the independently verified `/tmp/cloie-ci-test-marker` filesystem marker exists (created by the CI workflow itself), `src/features/auth/services/ci-test-auth.ts` issues a signed short-lived session restricted to an email allowlist of seeded fixture accounts. It fails closed on primary production and dedicated-demo configurations even if CI test variables leak into their environments. The disposable Postgres it targets is seeded from the same deterministic fixture the database-integration job uses; journeys pin their fixture expectations in `e2e/support/contract.ts` ([cloie-techstack.md → testing](../cloie-techstack.md)).
