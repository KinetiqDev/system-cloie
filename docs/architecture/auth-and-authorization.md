---
title: System CLOIE Auth and Authorization
kind: living-project-document
status: living
last_verified: 2026-10-02
---

# Auth and Authorization

How people enter System CLOIE and how the server decides what they may do. Domain terminology and invariants are owned by `src/features/auth/CONTEXT.md`; the durable decisions are [ADR 0022](../adr/0022-multi-role-accounts-with-active-role-context.md), [ADR 0002](../adr/0002-separate-domain-users-from-auth-identities.md), [ADR 0008](../adr/0008-dedicated-demo-deployment-authentication.md), [ADR 0014](../adr/0014-google-authoritative-account-names.md), and [ADR 0015](../adr/0015-name-based-course-roster-resolution-and-student-id-removal.md).

## Identity model

- **Domain user vs Auth identity** ([ADR 0002](../adr/0002-separate-domain-users-from-auth-identities.md)): System CLOIE keeps its own stable domain `User` id and links the Google/Supabase Auth identity through a nullable unique `auth_user_id`, matched by exact normalized email at the OAuth callback. Admin-created users exist before first sign-in; Supabase Auth UUIDs are never used as `User.id`. An already-linked `User` whose email is presented with a different Auth identity fails closed.
- **Canonical account names** ([ADR 0014](../adr/0014-google-authoritative-account-names.md)): Google supplies the name at account creation or an unlinked Secretary account's first OAuth link. Password-created external accounts collect the name during registration. Later sign-ins preserve the established name. `User.name` is opaque and never split into first/last parts.

## Google OAuth flow with the signed-acknowledgement gate

Public entry uses audience-separated Student, staff, Faculty-registration, and email-first external entrances rather than a role-card portal. Each entrance obtains a signed legal-acknowledgement ticket before authentication. The browser posts acknowledged privacy notice and terms versions to `/api/auth/legal-acknowledgement`, which issues an **HMAC-SHA256-signed base64url ticket** (payload: entrance intent + pinned privacy/terms versions, 15-minute expiry plus 60 s clock skew) in the httpOnly `cloie_legal_ack` cookie scoped to `/` (legal domain; see `src/features/legal/CONTEXT.md`). Staff and external sign-in use role-less intents; a role claim names the chosen role. Entry and self-service role-request Server Actions enforce the same acknowledgement. Ordinary Secretary decisions authorize from the current session rather than requiring an entry ticket that the callback has already consumed.

The callback route (`src/app/api/auth/callback/route.ts`) then:

1. **Verifies the ticket before the Google code exchange proceeds.** A missing, expired, tampered, or intent/version-mismatched ticket redirects to the site root. The privacy/terms acknowledgement therefore precedes sign-in and any role claim. The cookie is cleared once the callback finishes with it.
2. Exchanges the code through Supabase Auth, proves the Google method from verified access-token claims, matches or creates the domain `User` by normalized email, and passes those same claims into session resolution. First link replaces a provisional Secretary-entered name; an established linked account's canonical name is preserved.

Internal roles require a proved Google session. Alumni and Industry Partner accounts may also use the external email-password flow; neither method changes the server-side role and profile gates ([ADR 0031](../adr/0031-prove-the-current-sign-in-method-before-internal-authorization.md)). The proof reads `amr: oauth` together with the identity's linked `app_metadata.providers` set containing `google` — never `app_metadata.provider`, which GoTrue leaves at the first-created identity's provider and therefore reports as `email` for a password-registered account that linked Google later. An Alumni or Partner who registered with email and password can therefore continue with Google on the same account, and the callback accepts it instead of failing closed.

Authorization reads the **active role**, and the session boundary is where that role is earned. It resolves the profile gate from the selected role and then withholds the role whenever the gate denies access — `INACTIVE`, `REJECTED_EXTERNAL_ACCOUNT`, `FACULTY_APPROVAL_PENDING`, `FACULTY_REQUEST_REJECTED`, `AUTH_METHOD_MISMATCH`, or `STUDENT_PLACEMENT_REQUIRED`. A withheld session carries no active role, so every direct Server Action and domain-service guard that resolves an internal role fails closed without its own method or account-state check. The assigned-role set survives on `roles`, so the workspace switcher can still deliberately move to a role the session may use, and gates that only redirect an entry route keep the role.

GoTrue does not distinguish signup from recovery in `amr`; both are OTP. The application accepts a strict signup code before issuing a signed proof bound to that Auth subject and session ID. Only that proved signup session may continue external onboarding. Raw OTP and recovery sessions are denied all workspaces, and password-update failure also signs out.

## Roles, role entry, and active-role authorization

- **Multi-role accounts** ([ADR 0022](../adr/0022-multi-role-accounts-with-active-role-context.md)): an account may hold distinct assigned roles; the database enforces one row per `(user_id, role)`. Exactly one assigned role is active at a time, and role-owned authorization and profile gates use that server-resolved active role rather than any membership in the assigned-role set.
- **Active-role selection**: an HTTP-only cookie records the requested role context but grants no role. Session resolution accepts it only when the role remains assigned. Multi-role accounts without a valid selection go to `/select-role`; single-role accounts receive their sole role as the active context.
- **Role entry**: Students are Secretary-provisioned only. Faculty applicants may request the role, but a PENDING request grants no program affiliation or Faculty workspace access until Secretary approval. Alumni and Industry Partner may self-claim; Secretary, Dean, Program Head, and General Education Coordinator remain pre-provisioned. Cancelling onboarding removes only the requested incomplete role and only when its required profile artifact is absent.
- **Assigned-role changes** remain administrator-controlled outside eligible self-service claims. Switching the active role does not create, revoke, or complete an assigned role.

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

Production authentication and isolated fixture regimes remain separate and fail closed:

| Regime                                                                      | Where it works                                                                                                                                                                                                                | Gate                                                                                                                                |
| --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Google OAuth                                                                | Primary Production and development                                                                                                                                                                                            | Required for every internal role; also available to external participants.                                                          |
| External email-password and six-digit confirmation                          | Primary Production and development                                                                                                                                                                                            | Alumni and Industry Partner only; Supabase Auth owns credentials. Recovery sessions cannot open any workspace.                      |
| Development dev-login (`POST /api/auth/dev-login`, `cloie_dev_auth` cookie) | Development only                                                                                                                                                                                                              | Route returns 404 unless `NODE_ENV === "development"`; production-mode builds refuse it (verified in CI's production-boundary job). |
| Signed demo session (dedicated demo deployment)                             | Only when `NODE_ENV=production`, `CLOIE_DEMO_ENABLED=true`, `CLOIE_DEPLOYMENT_KIND=dedicated-demo`, a dedicated demo backend identity, a ≥32-char session secret, and an allowlist of seeded demo accounts are all configured | `src/features/auth/services/demo-auth.ts` returns null — disabling the role switcher — if any gate fails.                           |

Primary Production permits Google plus external email-password authentication; demo authentication must never be enabled there, and the production database must never be the demo reset target ([ADR 0008](../adr/0008-dedicated-demo-deployment-authentication.md), [AGENTS.md → Environment and Database Safety](../../AGENTS.md)). Operations: [deployment.md](deployment.md) and the [dedicated demo runbook](../runbooks/dedicated-demo-deployment.md).

## CI test session isolation

Browser E2E runs in production mode but never touches OAuth or demo machinery: when `CLOIE_CI_TEST_ENABLED=true` **and** `CLOIE_DEPLOYMENT_KIND=ci-test` **and** no backend identity is declared **and** the independently verified `/tmp/cloie-ci-test-marker` filesystem marker exists (created by the CI workflow itself), `src/features/auth/services/ci-test-auth.ts` issues a signed short-lived session restricted to an email allowlist of seeded fixture accounts. It fails closed on primary production and dedicated-demo configurations even if CI test variables leak into their environments. The disposable Postgres it targets is seeded from the same deterministic fixture the database-integration job uses; journeys pin their fixture expectations in `e2e/support/contract.ts` ([cloie-techstack.md → testing](../cloie-techstack.md)).
