---
title: System CLOIE Roles and Access
kind: living-project-document
status: living
last_verified: 2026-09-04
---

# System CLOIE Roles and Access

Inventory of the account roles defined in System CLOIE and each role's scope as currently specified in the domain contexts and ADRs. This is a navigation aid, not the rulebook: each role row links the owning `CONTEXT.md`, which holds the authoritative vocabulary and invariants. Per ADR 0001, an account holds exactly **one** active role — there is no role stacking, no role impersonation, and role changes are administrator-controlled ([src/features/auth/CONTEXT.md](../../src/features/auth/CONTEXT.md), [src/features/users/CONTEXT.md](../../src/features/users/CONTEXT.md)).

## Enforcement model

Authorization is **server-enforced**. Every request passes through the Supabase session middleware at `src/proxy.ts` (`updateSession` from `@/lib/supabase/middleware`), and role/program authority is resolved server-side on each request (e.g. `resolveAuthSession()`), not from client-provided scope filters — forged URL filters cannot widen a role's scope. Program Head authority derives from the server-validated set of active `ProgramHeadAssignment` records; a cookie, route value, or remembered preference never establishes authority ([docs/adr/0009-program-head-selected-program-context.md](../adr/0009-program-head-selected-program-context.md)). At the database boundary, every table carries exactly one declared access disposition (role-aware RLS, authenticated read-only, server-only, or an approved application-layer exception) per [src/features/auth/CONTEXT.md](../../src/features/auth/CONTEXT.md). See also [docs/adr/0020-self-hosted-supabase-target-neutral-backends.md](../adr/0020-self-hosted-supabase-target-neutral-backends.md).

## Roles

### Internal staff (pre-provisioned; ACD institutional email required)

- **Secretary** — primary institutional setup and record steward: complete account creation, academic calendar lifecycle, programs/majors/courses stewardship, institutional baseline instruments, term rollover. Holds **no** Course assignment mutation (read-only visibility) and **no** ILO access (`/secretary/learning-outcomes/**` redirects). Owning contexts: [users](../../src/features/users/CONTEXT.md), [academic-calendar](../../src/features/academic-calendar/CONTEXT.md), [academic-structure](../../src/features/academic-structure/CONTEXT.md), [course-assignments](../../src/features/course-assignments/CONTEXT.md), [instruments](../../src/features/instruments/CONTEXT.md).
- **College Dean** — college-wide oversight plus selected all-program operations: read-only readiness/mapping-gap oversight ([dean](../../src/features/dean/CONTEXT.md)), all-program Course assignment and roster stewardship, guarded program/course lifecycle, institutional baseline management. Does **not** edit outcomes or mappings ([docs/adr/0005-outcome-ownership-and-dean-oversight.md](../adr/0005-outcome-ownership-and-dean-oversight.md)); user management stays with the Secretary.
- **Program Head** — accountable owner of one or more programs via active `ProgramHeadAssignment` records (Authorized Program set; zero or more, none primary). Owns PLO authoring and program-owned templates; Program-specific Course assignment stewardship; read-only typed-mapping review; Course-bound and Central deployments within scope. Mapping rows are Faculty-maintained. See [outcomes](../../src/features/outcomes/CONTEXT.md), [evaluations](../../src/features/evaluations/CONTEXT.md), [docs/adr/0009-program-head-selected-program-context.md](../adr/0009-program-head-selected-program-context.md), [docs/adr/0017-program-learning-outcome-canonical-terminology.md](../adr/0017-program-learning-outcome-canonical-terminology.md).
- **General Education Coordinator** — college-wide steward of General Education (`course_scope == GENERAL_EDUCATION`) Course assignments (read + every mutation path, server-gated by the Course-scope predicate; no portfolio table) **and** college-wide owner of the Institutional Learning Outcome catalog (CRUD, reorder, archive, restore) per [docs/adr/0018-transfer-ilo-ownership-to-gen-ed-coordinator.md](../adr/0018-transfer-ilo-ownership-to-gen-ed-coordinator.md). No roster management, no on-behalf deployment, no Program-specific assignment authority. See [auth](../../src/features/auth/CONTEXT.md), [course-assignments](../../src/features/course-assignments/CONTEXT.md), [analytics](../../src/features/analytics/CONTEXT.md).
- **Faculty Member** — owns course-level work for assigned Course contexts: teaching capability via active Course assignments (affiliation alone grants nothing), Course roster management, CILO authoring, primary typed-mapping responsibility via the Course alignment workspace, derived Course-bound template copies, own-assignment deployment. See [outcomes](../../src/features/outcomes/CONTEXT.md), [course-assignments](../../src/features/course-assignments/CONTEXT.md), [instruments](../../src/features/instruments/CONTEXT.md).

### Internal respondent (self-service or Secretary-created; ACD institutional email)

- **Student** — participates in Course-bound evaluations through active Course-assignment roster membership and central Student-targeted deployments; gated by profile, active-term placement, and the availability/eligibility windows. Does not manage academic structure, rosters, outcomes, templates, analytics, or reports. Graduating Students are a targeting condition, not a separate role. See [responses](../../src/features/responses/CONTEXT.md), [enrollments](../../src/features/enrollments/CONTEXT.md), [course-assignments](../../src/features/course-assignments/CONTEXT.md).

### External respondents (self-service or Secretary-created/invited; any email domain)

- **Alumni** — completes Alumni-targeted central deployments; self-service accounts pass institutional verification (pending/rejected states gate entry per [users](../../src/features/users/CONTEXT.md)).
- **Industry Partner** — completes Industry Partner-targeted central deployments (e.g. internship evaluation) keyed to program affiliation; same verification model. Multi-program affiliation policy remains open (see [auth](../../src/features/auth/CONTEXT.md)).

## Cross-cutting access rules (highlights only)

- **Single active role** — one `UserRole` per account; role changes are revoke-then-assign under gate conditions ([users](../../src/features/users/CONTEXT.md)).
- **Role entry gates** — profile gate verdicts (onboarding required, inactive, rejected external, deferred enrollment, complete) resolved at sign-in ([users](../../src/features/users/CONTEXT.md)); the legal acknowledgement ticket gates the OAuth callback before role selection ([legal](../../src/features/legal/CONTEXT.md)).
- **Course assignment authority matrix** (server-enforced, approved transfer): Secretary read-only; Gen Ed Coordinator mutates General Education only; Program Head mutates Program-specific within scope (read-only GE); Dean all-program; Faculty read-only for own assignments ([course-assignments](../../src/features/course-assignments/CONTEXT.md), [auth](../../src/features/auth/CONTEXT.md)).
- **Outcome ownership** — ILO catalog: Gen Ed Coordinator; PLOs: owning Program's Program Head; CILOs: Faculty author, Course-owned; mappings: Faculty maintains, Secretary/Dean correction per ADR 0005, Program Head read-only, Dean read-only oversight ([outcomes](../../src/features/outcomes/CONTEXT.md), [docs/adr/0005-outcome-ownership-and-dean-oversight.md](../adr/0005-outcome-ownership-and-dean-oversight.md), [docs/adr/0018-transfer-ilo-ownership-to-gen-ed-coordinator.md](../adr/0018-transfer-ilo-ownership-to-gen-ed-coordinator.md)).
- **Deployment authorization** — Faculty deploy own assignments; Program Head within assigned programs (never General Education); Dean and Secretary may deploy on behalf of any faculty ([evaluations](../../src/features/evaluations/CONTEXT.md)).
- **Review privacy tiers** — identified respondent detail is Program-Head-only; Faculty and Dean receive anonymized review only ([response-review](../../src/features/response-review/CONTEXT.md)).
- **Role-owned routes** — shared capabilities still live on separate per-role route trees (no impersonation routes) ([course-assignments](../../src/features/course-assignments/CONTEXT.md), [docs/adr/0005-outcome-ownership-and-dean-oversight.md](../adr/0005-outcome-ownership-and-dean-oversight.md)).

Full invariant detail lives in each linked CONTEXT.md — this page deliberately does not restate them.
