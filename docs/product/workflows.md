---
title: System CLOIE Primary Workflows
kind: living-project-document
status: living
last_verified: 2026-09-04
---

# System CLOIE Primary Workflows

The primary end-to-end workflows, each traced to the domain contexts that own its rules. This is a map, not the full narrative: the detailed, status-labelled journey descriptions live in [../system-cloie-user-journeys.md](../system-cloie-user-journeys.md) (which uses **Implemented / Partial / Deferred** status labels). Workflow steps below state only what the owning CONTEXT.md files specify; where a journey is only partially implemented, that is noted.

## 1. Role entry and onboarding gates

1. A person enters through the **role selection portal** and picks one intended role; the signed legal-acknowledgement ticket gates the OAuth callback before Google code exchange ([auth](../../src/features/auth/CONTEXT.md), [legal](../../src/features/legal/CONTEXT.md)).
2. Google authenticates the identity; the account is matched by exact normalized email and the single active role is resolved — self-service claiming is possible only for allowed roles (Secretary, Dean, Program Head, Gen Ed Coordinator are pre-provisioned and reject self-service claims) ([auth](../../src/features/auth/CONTEXT.md), [users](../../src/features/users/CONTEXT.md)).
3. The **profile gate** resolves a per-role verdict: role-specific onboarding required, inactive account, rejected external verification, deferred enrollment, or complete ([users](../../src/features/users/CONTEXT.md)).
4. Self-service external (Alumni, Industry Partner) accounts start as **pending external verification**; Secretary-created external accounts are institution-verified at creation ([auth](../../src/features/auth/CONTEXT.md), [users](../../src/features/users/CONTEXT.md)).
5. On complete, the person enters their role-owned dashboard; role mismatch or invalid domain lands on a status page, never a role switch ([auth](../../src/features/auth/CONTEXT.md)).

## 2. Course assignment stewardship and evaluation deployment

1. The Secretary (or Dean) sets up the foundation: programs, majors, courses, complete accounts, and exactly one **active academic period** ([academic-calendar](../../src/features/academic-calendar/CONTEXT.md), [academic-structure](../../src/features/academic-structure/CONTEXT.md), [users](../../src/features/users/CONTEXT.md)).
2. Authorized stewards create **Course assignments** from the stable Course catalog — Gen Ed Coordinator for General Education (college-wide), Program Head for Program-specific within their Authorized Program set, Dean all-program; advisory Course defaults prefill the assignment picker but never rewrite history ([course-assignments](../../src/features/course-assignments/CONTEXT.md)).
3. Roster managers maintain **Course-assignment rosters** (manual scoped-add or preview-first CSV name reconciliation); roster eligibility requires an active Student with completed profile and active-term placement ([course-assignments](../../src/features/course-assignments/CONTEXT.md), [enrollments](../../src/features/enrollments/CONTEXT.md)).
4. Faculty author CILOs for their courses and complete the typed alignment in the Course alignment workspace; publication of a Course-bound evaluation is **blocked until every active CILO satisfies the typed alignment rule** (publication alignment gate) ([outcomes](../../src/features/outcomes/CONTEXT.md), [evaluations](../../src/features/evaluations/CONTEXT.md)).
5. The authorized deployer publishes from an **immutable instrument version** — Faculty on their own assignments, Program Head within scope, Dean/Secretary on behalf — creating one respondent assignment per active roster member minus recorded exclusions, snapshotting CILO/PLO bindings and the complete assignment context, and locking ordinary roster writes ([instruments](../../src/features/instruments/CONTEXT.md), [evaluations](../../src/features/evaluations/CONTEXT.md), [course-assignments](../../src/features/course-assignments/CONTEXT.md)).
6. Deployment status follows `DRAFT → SCHEDULED → ACTIVE → CLOSED` derived from the activation/deadline window; exclusions are reversible with late inclusion while the window is open ([evaluations](../../src/features/evaluations/CONTEXT.md)).

## 3. Student response (one-response invariant)

1. The respondent (Student, Alumni, or Industry Partner for central deployments) sees their assigned evaluations; Course-bound access is dynamically rechecked against account state, profile, active-term placement, roster membership, window, and exclusion state ([responses](../../src/features/responses/CONTEXT.md), [course-assignments](../../src/features/course-assignments/CONTEXT.md)).
2. The evaluation loads the **frozen instrument structure snapshot**, not the live template ([instruments](../../src/features/instruments/CONTEXT.md), [responses](../../src/features/responses/CONTEXT.md)).
3. The respondent completes the guided wizard; **draft saves are section-scoped** while `IN_PROGRESS` ([responses](../../src/features/responses/CONTEXT.md)).
4. At the confirmation step, CLOIE revalidates required answers and availability/eligibility, then atomically writes the final item set and flips the response to `SUBMITTED` (**submission completeness**) ([responses](../../src/features/responses/CONTEXT.md)).
5. The **one-response invariant**: exactly one response row per evaluation assignment (unique `assignment_id` at the database level); a `SUBMITTED` response rejects further draft saves and submissions, and a later eligibility change never uncounts a submitted response ([responses](../../src/features/responses/CONTEXT.md), [course-assignments](../../src/features/course-assignments/CONTEXT.md)).
6. Draft/final response concurrency hardening remains tracked work (journeys doc §6.3, issue #168).

## 4. From submitted responses to Program Head evidence

1. Review bodies serve only after the **SUBMITTED gate**; `IN_PROGRESS` bodies are never fetched ([response-review](../../src/features/response-review/CONTEXT.md)).
2. Each submitted quantitative answer carries an **outcome binding** — CILO (with the Program's current CILO-to-PLO manifestation mappings), publication-time PLO binding (program-wide deployments), or GENERAL ([response-review](../../src/features/response-review/CONTEXT.md)).
3. The **Program Head** receives the identified review flow (respondent identity lives only in Program Head DTOs); Faculty and Dean receive the anonymized flow only ([response-review](../../src/features/response-review/CONTEXT.md)).
4. Analytics turn submitted responses into **source-aware evidence** (four canonical source buckets, never pooled): Program PLO evidence flows through CILO question bindings and typed mappings, with explicit disclosures for current-mapping interpretation and many-to-many mappings ([analytics](../../src/features/analytics/CONTEXT.md)).
5. The Program Head consumes program-scoped analytics tabs (outcomes, courses, stakeholders, trends, qualitative, ai); the Gen Ed Coordinator has a separate cross-Program General Education evidence path (first release: Course-bound GE evidence only) ([analytics](../../src/features/analytics/CONTEXT.md)).
6. AI-assisted interpretation is a bounded, non-persisted supplement over aggregate packets — no raw comments or respondent identifiers cross the boundary, and it never replaces human CQI judgment ([analytics](../../src/features/analytics/CONTEXT.md)). Formal report exports remain stubbed/deferred (journeys doc §10.2).

## 5. Dean oversight

1. The Dean enters a period-scoped, college-wide **read model**: readiness KPIs (active, ready, missing-CILO, incomplete-mapping contexts) defaulting to the active academic period ([dean](../../src/features/dean/CONTEXT.md)).
2. Risk buckets and per-program **mapping-gap rows** classify course alignment risk; General Education gaps are labeled as Institutional Outcome gaps, never as missing Program PLOs ([dean](../../src/features/dean/CONTEXT.md), [outcomes](../../src/features/outcomes/CONTEXT.md)).
3. Learning Outcomes oversight is read-only and period-selectable (ACTIVE or COMPLETED terms); archived outcomes show in COMPLETED periods, labelled `(Archived)` ([dean](../../src/features/dean/CONTEXT.md)).
4. Completing an academic period atomically persists an immutable **readiness snapshot** that historical Dean views consume ([academic-calendar](../../src/features/academic-calendar/CONTEXT.md), [outcomes](../../src/features/outcomes/CONTEXT.md)).
5. Enrollments oversight drills down to class rosters in fixed 25-per-page pages exposing **student names only** — no IDs, emails, exports, or response data ([dean](../../src/features/dean/CONTEXT.md)).

## Flagged divergences (surfaced, not reconciled)

Cross-checking the steps above against [../system-cloie-user-journeys.md](../system-cloie-user-journeys.md) found these discrepancies with the current CONTEXT.md files and ADRs. Per repo convention they are recorded here rather than silently resolved:

- **Role table omits the General Education Coordinator** (documentation drift). Journeys §1.2 lists seven roles; [auth](../../src/features/auth/CONTEXT.md) and [users](../../src/features/users/CONTEXT.md) (with [docs/adr/0018-transfer-ilo-ownership-to-gen-ed-coordinator.md](../adr/0018-transfer-ilo-ownership-to-gen-ed-coordinator.md)) define an eighth, pre-provisioned `GEN_ED_COORDINATOR` role. Journeys also has no Coordinator ILO-catalog journey (`/gen-ed-coordinator/outcomes`, `/gen-ed-coordinator/courses`).
- **Secretary ILO write authority stated as current** (outdated historical material). Journeys §3.4 says the Secretary "has college-wide administrative write authority over the catalog and both mapping relations"; ADR 0018 supersedes this — the Secretary has **no** ILO access and the Coordinator owns the ILO catalog. (ADR 0005 §1's Secretary ownership is likewise superseded by ADR 0018 for the ILO encoder; its readiness/mapping semantics stand.)
- **Retired "Graduate Outcome" terminology** (documentation drift). Journeys §4.3 still says "Graduate Outcomes"; [docs/adr/0017-program-learning-outcome-canonical-terminology.md](../adr/0017-program-learning-outcome-canonical-terminology.md) makes PLO the canonical term (stored `GRADUATE_OUTCOME` values are data, not terminology).
- **Gen Ed Coordinator analytics missing** (documentation drift). Journeys §10.1 has no Coordinator analytics journey; [analytics](../../src/features/analytics/CONTEXT.md) defines an approved first-release Coordinator evidence path (issue #477).
- Journeys §4.5's step-by-step central-deployment narrative matches [evaluations](../../src/features/evaluations/CONTEXT.md) semantics (status derivation, explicit close, no writer for `ARCHIVED`); no conflict found there.
