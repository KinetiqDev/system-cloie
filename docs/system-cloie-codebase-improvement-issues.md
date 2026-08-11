# System CLOIE Codebase Improvement Issue Plan

> **Repository:** `Tugeru/project-cloie`  
> **Analysis baseline:** `main` at commit `be0682490af5953a46fa8cefb6b7ac3a3f04c0f7`  
> **Purpose:** Planning and tracking only. This document does not create or modify GitHub issues, branches, pull requests, commits, or repository files.

---

## 1. Issue Plan Summary

The architectural assessment identified work spanning correctness, authorization, database integrity, reporting, maintainability, performance, privacy, testing, observability, and operational readiness. A single implementation issue would be too large to own, review, verify, and close safely.

The recommended structure is:

- **One parent tracking issue** for overall progress, dependencies, and prioritization.
- **Eleven focused child issues** representing independently implementable and verifiable workstreams.
- **Phase-based execution**, with correctness and security work completed before structural cleanup and optimization.

The split follows domain ownership and verification boundaries rather than file count. For example, response concurrency and response-pipeline consolidation are separate because the first is an immediate data-integrity correction, while the second is a broader architectural migration that should follow once the lifecycle guarantees are established.

### Recommended parent issue title

`[Architecture] System CLOIE Codebase Stabilization and Improvement Tracker`

### Recommended first issue

`[Responses] Make draft saving and final submission concurrency-safe`

This issue should be implemented first because it addresses the possibility of response items being modified after a response has been finalized, directly affecting evaluation-data integrity.

---

## 2. Recommended Issue Structure

| ID    | Proposed Issue                                                     | Primary Findings                    | Phase                       | Main Ownership                       |
| ----- | ------------------------------------------------------------------ | ----------------------------------- | --------------------------- | ------------------------------------ |
| SC-01 | Make response draft and submission operations concurrency-safe     | F-01, F-09                          | Phase 0                     | Responses, Database                  |
| SC-02 | Consolidate duplicate response persistence pipelines               | F-03                                | Phase 1                     | Responses                            |
| SC-03 | Require explicit Program Head program context                      | F-02                                | Phase 0                     | Authorization, Outcomes, Deployments |
| SC-04 | Enforce central deployment identity and uniqueness                 | F-04                                | Phase 0                     | Evaluations, Database                |
| SC-05 | Bring Major deletion lifecycle to parity with Program deletion     | F-05                                | Phase 1                     | Academic Structure                   |
| SC-06 | Implement authoritative report generation and exports              | F-06                                | Phase 0 / release readiness | Reports, Analytics                   |
| SC-07 | Establish feature public APIs and decompose architectural hotspots | F-07, F-08                          | Phase 1–2                   | Architecture                         |
| SC-08 | Optimize analytics computation and bulk assignment processing      | F-10, F-11                          | Phase 3                     | Analytics, Course Assignments        |
| SC-09 | Harden Server Action origins and qualitative-data privacy          | F-12, F-13                          | Phase 0–1                   | Security, Privacy                    |
| SC-10 | Add database-backed CI and structured operational error reporting  | F-14, F-15                          | Phase 4                     | Testing, Operations                  |
| SC-11 | Align technical documentation and complete operational runbooks    | F-16 and confirmed operational gaps | Phase 2–4                   | Documentation, Operations            |

---

# 3. Parent Tracking Issue

## Title

`[Architecture] System CLOIE Codebase Stabilization and Improvement Tracker`

## Recommended Labels

Label existence was not verified. Confirm the repository label set before publishing.

**Common labels to use when available:**

- `architecture`
- `technical-debt`
- `security`
- `testing`
- `performance`
- `documentation`
- `enhancement`

**Proposed custom labels:**

- `tracking`
- `priority:high`
- `phase:0`
- `phase:1`
- `phase:2`
- `phase:3`
- `phase:4`
- `area:architecture`

## Copy-Ready Issue Body

````markdown
## Summary

This issue tracks the prioritized stabilization and improvement work identified by the architectural and software-engineering assessment of System CLOIE at `main@be0682490af5953a46fa8cefb6b7ac3a3f04c0f7`.

System CLOIE has a sound server-first modular-monolith foundation, strong relational modeling, meaningful publication snapshots, server-side authorization, and several robust database constraints. The assessment also identified correctness, authorization, reporting, maintainability, privacy, performance, testing, and operational gaps that should be addressed in an ordered manner.

This is a tracking issue. Implementation should occur through focused child issues and independently reviewable pull requests.

## Purpose

- Preserve traceability from architectural findings to implementation work.
- Prioritize data integrity, authorization, privacy, and release blockers before refactoring.
- Prevent one oversized issue from mixing unrelated domains and verification requirements.
- Provide one editable progress tracker for the remaining codebase work.
- Keep the existing modular-monolith architecture while strengthening its internal boundaries and operational maturity.

## Current Architectural Context

System CLOIE is implemented as a server-first, feature-oriented modular monolith using Next.js App Router, React Server and Client Components, TypeScript, Supabase Auth, Prisma, and PostgreSQL hosted through Supabase.

The primary request path is:

```text
Route or UI
  → Server Action or API handler
  → Feature service and policy
  → Prisma / Supabase infrastructure
  → PostgreSQL
```
````

The strongest existing patterns to preserve include:

- Server-side authentication and object-level authorization
- Feature-oriented modules under `src/features/`
- Prisma as the canonical application schema
- Supabase migrations for PostgreSQL-specific constraints, RLS, triggers, and partial indexes
- Versioned instruments and publication-time snapshots
- Transactional course-bound evaluation publication
- Guarded destructive-operation preflights
- Automated lint, test, and build checks in CI

## Scope

This tracker covers:

- Response lifecycle integrity and immutability
- Program Head organizational scope correctness
- Deployment uniqueness and lifecycle constraints
- Reporting and export readiness
- Feature boundaries and oversized orchestration modules
- Analytics and bulk-processing performance
- Qualitative-data privacy and Server Action origin configuration
- Database-backed integration testing
- Structured error reporting and observability foundations
- Technical documentation, backup, recovery, deployment, and turnover readiness

## Out of Scope

The following are not justified by the assessment and should not be introduced through this tracker:

- Microservices
- Message brokers or event-driven infrastructure
- Full CQRS infrastructure
- Generic repository abstractions around Prisma
- A framework or ORM replacement
- Client-side authorization as a security boundary
- Indiscriminate caching of mutable operational data
- Splitting transaction-owning use cases solely to reduce line count

## Guiding Principles

1. Correctness and security precede structural cleanup.
2. Database constraints should enforce critical invariants whenever practical.
3. Authorization must remain server-side and object-scoped.
4. Feature modules should expose narrow public contracts.
5. Refactoring must preserve publication snapshots and historical records.
6. Transaction ownership and lock order must remain explicit.
7. Acceptance criteria must describe observable behavior.
8. Every change must include focused tests and full repository verification.
9. Large architectural patterns require evidence of a concrete need.
10. System CLOIE should remain a modular monolith.

## Prioritization Model

### Phase 0 — Immediate correctness, security, and release readiness

Data-integrity defects, authorization ambiguity, privacy risks, uniqueness constraints, and core report functionality.

### Phase 1 — Architectural stabilization

Response-pipeline consolidation, lifecycle consistency, module contracts, and domain-invariant enforcement.

### Phase 2 — Maintainability and developer experience

Module decomposition, dependency rules, environment validation, documentation alignment, and removal of deprecated paths.

### Phase 3 — Performance and user experience

Analytics scaling, batch-operation efficiency, caching strategy, loading boundaries, and accessibility.

### Phase 4 — Operational maturity

Database-backed CI, end-to-end testing, observability, backup and recovery, deployment verification, and turnover documentation.

## Master Progress Tracker

Use only the following status values:

`Not Started`, `Planned`, `In Progress`, `Blocked`, `In Review`, `Completed`, `Deferred`, `Not Applicable`

| ID    | Workstream                 | Issue / Deliverable                                               | Severity | Phase             | Status      | Dependencies                                                | Linked Issue |
| ----- | -------------------------- | ----------------------------------------------------------------- | -------- | ----------------- | ----------- | ----------------------------------------------------------- | ------------ |
| SC-01 | Response integrity         | Make response draft and submission operations concurrency-safe    | High     | Phase 0           | Not Started | None                                                        | #TBD         |
| SC-02 | Response architecture      | Consolidate duplicate response persistence pipelines              | Medium   | Phase 1           | Not Started | SC-01                                                       | #TBD         |
| SC-03 | Authorization              | Require explicit Program Head program context                     | High     | Phase 0           | Not Started | None                                                        | #TBD         |
| SC-04 | Deployment integrity       | Enforce central deployment identity and uniqueness                | Medium   | Phase 0           | Not Started | Explicit deployment identity decision                       | #TBD         |
| SC-05 | Academic structure         | Bring Major deletion lifecycle to parity with Program deletion    | Medium   | Phase 1           | Not Started | None                                                        | #TBD         |
| SC-06 | Reporting                  | Implement authoritative report generation and exports             | High     | Phase 0 / release | Not Started | Approved report contracts; stable response lifecycle        | #TBD         |
| SC-07 | Architecture               | Establish feature public APIs and decompose hotspots              | Medium   | Phase 1–2         | Not Started | SC-01, SC-02, SC-03 recommended first                       | #TBD         |
| SC-08 | Performance                | Optimize analytics and bulk assignment processing                 | Medium   | Phase 3           | Not Started | Stable report and analytics contracts                       | #TBD         |
| SC-09 | Security and privacy       | Harden Server Action origins and qualitative-data privacy         | Medium   | Phase 0–1         | Not Started | Privacy policy decisions for raw comments                   | #TBD         |
| SC-10 | Testing and operations     | Add database-backed CI and structured operational error reporting | Medium   | Phase 4           | Not Started | SC-01 database invariants provide initial integration cases | #TBD         |
| SC-11 | Documentation and turnover | Align documentation and complete operational runbooks             | Medium   | Phase 2–4         | Not Started | Update continuously; finalize after implementation issues   | #TBD         |

## Dependencies and Recommended Order

```text
SC-01 Response lifecycle integrity
  └─ SC-02 Response-pipeline consolidation
       ├─ SC-06 Reporting and exports
       └─ SC-08 Analytics optimization

SC-03 Explicit Program Head context
  ├─ SC-04 Central deployment uniqueness
  └─ SC-06 Reporting and exports

SC-01 + SC-03 + SC-04
  └─ SC-07 Feature boundaries and hotspot decomposition

SC-01
  └─ SC-10 Database-backed CI and operational errors

SC-01 through SC-10
  └─ SC-11 Final documentation and turnover readiness
```

Recommended execution order:

1. SC-01 — Response lifecycle integrity
2. SC-03 — Explicit Program Head context
3. SC-04 — Central deployment uniqueness
4. SC-09 — Server Action origins and privacy baseline
5. SC-05 — Major lifecycle parity
6. SC-02 — Response-pipeline consolidation
7. SC-06 — Reporting and exports
8. SC-07 — Feature boundaries and hotspot decomposition
9. SC-10 — Database-backed CI and structured errors
10. SC-08 — Performance optimization
11. SC-11 — Documentation and operational completion

SC-10 may begin earlier in parallel by creating the database-integration CI foundation.

## Completion Definition

This tracker may be closed when:

- [ ] All Phase 0 issues are completed or explicitly excluded with a documented reason.
- [ ] Response drafts and submissions are concurrency-safe and finalized records are immutable.
- [ ] Program Head operations use explicit, validated Program scope.
- [ ] Deployment identity and uniqueness are database-enforced.
- [ ] Required reports are generated through authorized server-side read models and exports.
- [ ] Cross-feature dependencies use defined public contracts or documented exceptions.
- [ ] Critical database constraints and concurrency behavior are tested against PostgreSQL.
- [ ] Structured operational errors provide safe correlation identifiers.
- [ ] Backup, recovery, deployment, and turnover procedures are documented and verified.
- [ ] `pnpm lint`, `pnpm test`, and `pnpm build` pass on the final integrated state.

## References

Architectural assessment findings covered by this tracker:

- F-01 through F-16
- `src/features/responses/`
- `src/features/outcomes/`
- `src/features/evaluations/`
- `src/features/course-assignments/`
- `src/features/academic-structure/`
- `src/features/analytics/`
- `src/features/dean/`
- `src/lib/actions/`
- `prisma/models/`
- `supabase/migrations/`
- `.github/workflows/ci.yml`
- `README.md`
- `docs/`

````

---

# 4. Copy-Ready Child Issues

## SC-01 — Response Lifecycle Integrity

### Title

`[Responses] Make draft saving and final submission concurrency-safe`

### Recommended Labels

**Common labels when available:** `bug`, `security`, `testing`
**Proposed custom labels:** `priority:high`, `phase:0`, `area:responses`, `area:database`

### Priority Metadata

- **Severity:** High
- **Recommended phase:** Phase 0
- **Estimated effort:** Medium
- **Scope:** Multi-module

### Copy-Ready Issue Body

```markdown
## Summary

Make all System CLOIE response-draft and final-submission writes atomic, concurrency-safe, and unable to modify a response after it has reached `SUBMITTED` status.

This issue addresses architectural findings **F-01** and **F-09**.

## Background and Current Behavior

**Observed:** `saveStudentEvaluationDraft()` checks the current response status and then performs section-item deletion and recreation through separate Prisma calls. These operations are not enclosed in one transaction.

Relevant implementation:

- `src/features/responses/services/save-student-evaluation-draft.ts`
  - `saveStudentEvaluationDraft()`
  - Status check and response creation: approximately lines 148–173 at the assessed commit
  - Item deletion and recreation: approximately lines 189–212
- `src/features/responses/services/save-central-deployment-draft.ts`
  - `saveCentralDeploymentDraft()`
  - Equivalent status check and item replacement: approximately lines 110–172

**Observed:** Final submission uses a transaction, but it reads the response and checks `SUBMITTED` without explicitly locking the row or applying a conditional status transition.

Relevant implementation:

- `src/features/responses/services/submit-student-evaluation-response.ts`
  - `submitStudentEvaluationResponse()`
- `src/features/responses/services/submit-central-deployment-response.ts`
  - `submitCentralDeploymentResponse()`
- `src/features/responses/services/submit-student-course-bound-response.ts`
  - `submitStudentCourseBoundResponse()`

**Observed:** `Response.assignment_id` is unique, but logical response-item uniqueness and parent-state immutability are not enforced in the Prisma model.

Relevant schema:

- `prisma/models/responses.prisma`
  - `Response`
  - `QuantitativeResponseItem`
  - `QualitativeResponseItem`

## Problem Statement

A draft request can read an `IN_PROGRESS` response, pause, allow another request to finalize the response, and then continue replacing response items after the parent response has become `SUBMITTED`.

The response schema also permits duplicate logical response items unless every caller deletes and recreates them correctly.

## Why This Matters

Submitted responses are institutional evaluation evidence. Their answers must not change after final submission. A race condition that modifies finalized items can affect analytics, reports, auditability, and user trust.

## Repository Evidence

### Observed

- `src/features/responses/services/save-student-evaluation-draft.ts` performs status checking separately from multiple item writes.
- `src/features/responses/services/save-central-deployment-draft.ts` repeats the same pattern.
- `src/features/responses/services/submit-student-evaluation-response.ts` performs final item replacement and status update inside a transaction but does not visibly lock the response row.
- `prisma/models/responses.prisma` does not declare logical uniqueness for response items.

### Inferred

A concurrent draft and submit request can interleave because the draft flow does not own one transaction covering the status guard and item mutation.

### Recommended

Use one transaction-owning mutation path with explicit row locking or a conditional `IN_PROGRESS` update and add database constraints that reject duplicate or post-submission item writes.

## Likely Root Cause

Draft persistence and final submission were implemented as separate use cases without one shared response-lifecycle transaction and database-level immutability contract.

## Scope

- Student course-bound evaluation drafts and submissions
- Student-targeted central deployment drafts and submissions
- Alumni and Industry Partner central deployment drafts and submissions where they use the same response tables
- Response and response-item database constraints
- Concurrency and rollback tests
- Safe error translation for lifecycle conflicts

## Out of Scope

- UI redesign of the evaluation wizard
- Analytics optimization
- Report generation
- Replacing Prisma
- Adding a message broker or asynchronous workflow system

## Proposed Implementation Direction

1. Establish one canonical transaction boundary for response mutation.
2. Lock the `Response` row, or the associated `EvaluationAssignment` when no response exists yet.
3. Recheck assignment ownership, deployment availability, eligibility, and response state inside the transaction where required for correctness.
4. Permit item writes only while the response is `IN_PROGRESS`.
5. Replace all items for the intended scope atomically.
6. Transition to `SUBMITTED` through a conditional state change.
7. Add logical item uniqueness:
   - Quantitative: `(response_id, section_key, item_key)`
   - Qualitative: `(response_id, section_key, prompt_key)`
8. Evaluate a PostgreSQL trigger that rejects insert, update, or delete operations on response items when the parent response is submitted.
9. Return a stable lifecycle-conflict result instead of exposing raw database errors.

The final design must preserve one transaction owner and make the lock order explicit.

## Implementation Tasks

- [ ] Document the allowed response state transitions: no response → `IN_PROGRESS` → `SUBMITTED`.
- [ ] Define the row used as the lock boundary when a Response does not yet exist.
- [ ] Implement one transaction helper or command for atomic draft mutation.
- [ ] Implement a conditional finalization operation that succeeds only from `IN_PROGRESS`.
- [ ] Update student unified draft and submit services to use the canonical transaction path.
- [ ] Update central deployment draft and submit services to use the canonical transaction path.
- [ ] Add unique constraints for logical quantitative and qualitative item keys.
- [ ] Add or formally reject a database trigger for submitted-response item immutability, documenting the decision.
- [ ] Translate unique, serialization, and lifecycle conflicts into safe service results.
- [ ] Add database-backed concurrent-request tests.
- [ ] Add rollback tests proving failed item creation does not erase the previous draft.
- [ ] Verify submitted-response review still returns the expected finalized data.

## Acceptance Criteria

- [ ] Concurrent draft and final-submission requests cannot mutate a finalized response.
- [ ] Two simultaneous final-submission requests produce one successful finalization and one safe already-submitted or lifecycle-conflict result.
- [ ] A submitted response rejects every later draft or final-submission write.
- [ ] A failed draft replacement rolls back without losing the previously saved section answers.
- [ ] One logical quantitative item exists per response, section, and item key.
- [ ] One logical qualitative item exists per response, section, and prompt key.
- [ ] Assignment ownership and deployment availability remain enforced server-side.
- [ ] Database-backed tests verify concurrency, rollback, uniqueness, and immutability.
- [ ] Existing submitted-response review behavior remains functional.

## Verification Plan

Focused verification:

```bash
pnpm exec prisma format --schema prisma
pnpm exec prisma validate --schema prisma
pnpm supabase:migration:diff -- response_lifecycle_integrity
pnpm supabase:push:dry-run
pnpm supabase:types

pnpm vitest run src/__tests__/modules/student-evaluation-workflow
pnpm vitest run src/__tests__/modules/stakeholder-evaluation-workflow
pnpm vitest run src/__tests__/features/responses
pnpm test:db
````

Full verification:

```bash
pnpm lint
pnpm test
pnpm build
```

Required database integration scenarios:

- Simultaneous draft saves for the same section
- Draft and submit executing concurrently
- Two simultaneous submissions
- Draft after submission
- Submission after submission
- Failure after deletion but before item recreation
- Constraint rejection for duplicate logical items
- Direct item mutation attempt against a submitted response

## Likely Affected Files

- `prisma/models/responses.prisma`
- `supabase/migrations/<new_response_lifecycle_integrity_migration>.sql`
- `src/features/responses/services/save-student-evaluation-draft.ts`
- `src/features/responses/services/save-central-deployment-draft.ts`
- `src/features/responses/services/submit-student-evaluation-response.ts`
- `src/features/responses/services/submit-central-deployment-response.ts`
- `src/features/responses/services/save-student-course-bound-draft.ts`
- `src/features/responses/services/submit-student-course-bound-response.ts`
- `src/features/responses/answer-keys.ts`
- Relevant response action modules
- Relevant response and migration tests under `src/__tests__/`

## Dependencies

None. This is the recommended first implementation issue.

## Risks and Migration Considerations

- Existing duplicate response-item rows must be detected and resolved before adding unique constraints.
- Lock order must be consistent to avoid deadlocks.
- A trigger must not block legitimate cleanup or controlled administrative migration operations.
- Current drafts must remain readable after the migration.
- Error messages must not expose response contents or database details.

## Related Findings

- **F-01:** Draft requests can mutate a concurrently finalized response.
- **F-09:** Response records and items lack complete consistency guarantees.
- Related follow-up: SC-02, response-pipeline consolidation.

## Definition of Done

- [ ] All acceptance criteria pass against a real PostgreSQL database.
- [ ] Migration dry run succeeds.
- [ ] Prisma schema and generated Supabase types are synchronized.
- [ ] Focused response tests pass.
- [ ] Full lint, test, and production build checks pass.
- [ ] The lifecycle and lock-boundary decision is documented near the implementation or in an ADR.

````

---

## SC-02 — Response Pipeline Consolidation

### Title

`[Responses] Consolidate duplicate response persistence pipelines`

### Recommended Labels

**Common labels when available:** `architecture`, `technical-debt`, `testing`
**Proposed custom labels:** `priority:medium`, `phase:1`, `area:responses`

### Priority Metadata

- **Severity:** Medium
- **Recommended phase:** Phase 1
- **Estimated effort:** Large
- **Scope:** Architectural

### Copy-Ready Issue Body

```markdown
## Summary

Consolidate the legacy course-bound and newer unified response save/submit paths into one canonical response application service after the concurrency guarantees from SC-01 are established.

This issue addresses architectural finding **F-03**.

## Background and Current Behavior

**Observed:** The student evaluation page currently calls the unified actions:

- `saveStudentEvaluationDraftAction()`
- `submitStudentEvaluationResponseAction()`

Relevant page:

- `src/app/(app)/student/evaluations/[id]/page.tsx`

**Observed:** Legacy course-bound-specific actions and services remain exported:

- `saveStudentCourseBoundDraftAction()`
- `submitStudentCourseBoundResponseAction()`
- `saveStudentCourseBoundDraft()`
- `submitStudentCourseBoundResponse()`

Relevant files:

- `src/lib/actions/student-evaluation-actions.ts`
- `src/features/responses/services/save-student-course-bound-draft.ts`
- `src/features/responses/services/submit-student-course-bound-response.ts`

**Observed:** The legacy course-bound submission populates `cilo_question_binding_id`, while the unified student submission primarily stores section and item keys. Analytics therefore includes a fallback that matches by string keys when the binding ID is absent.

Relevant files and symbols:

- `submitStudentCourseBoundResponse()`
- `submitStudentEvaluationResponse()`
- `getFacultyAnalyticsData()`

## Problem Statement

Equivalent response workflows use different persistence paths and produce slightly different response-item data. Fixes and invariants can be applied to one path while another remains unchanged.

## Why This Matters

Duplicated lifecycle logic increases defect risk, test burden, and maintenance cost. Divergent CILO binding behavior also weakens direct analytical lineage from a quantitative response item to the publication-time CILO-question binding.

## Repository Evidence

### Observed

- The active student page uses the unified response actions.
- Legacy course-bound actions are still publicly exported.
- Legacy and unified submission services build response items independently.
- Analytics compensates for absent binding IDs through a string-key fallback.

### Inferred

The unified path was introduced without completing the retirement or migration of the earlier vertical slice.

### Recommended

Use one response-mutation engine parameterized by deployment context and retain only thin stakeholder-specific adapters where behavior genuinely differs.

## Likely Root Cause

Incremental feature evolution created a new generalized workflow while preserving earlier course-bound services for compatibility.

## Scope

- Canonical response command API
- Course-bound and central deployment adapters
- CILO-question binding population
- Shared answer parsing and item construction
- Caller migration
- Test migration
- Removal or explicit deprecation of obsolete paths

## Out of Scope

- Evaluation-wizard visual redesign
- Report generation
- NLP or analytics performance changes
- Changing the Response database lifecycle established by SC-01

## Proposed Implementation Direction

Introduce a feature-owned response application API such as:

```text
src/features/responses/
├── actions/
├── application/
│   ├── save-draft.ts
│   ├── submit-response.ts
│   └── resolve-response-context.ts
├── domain/
│   ├── answer-validation.ts
│   └── response-policy.ts
├── infrastructure/
│   └── response-transaction.ts
└── index.ts
````

This is a direction, not a mandatory folder template. Preserve small modules where possible.

The canonical command should resolve a deployment context that identifies:

- Assignment and respondent
- Deployment type
- Availability policy
- Instrument structure snapshot
- Course-bound CILO bindings when applicable
- Allowed answer keys

## Implementation Tasks

- [ ] Inventory every caller of legacy and unified draft/submit services.
- [ ] Define one deployment-neutral response context type.
- [ ] Extract shared answer parsing and item construction.
- [ ] Ensure course-bound quantitative items consistently receive `cilo_question_binding_id`.
- [ ] Route student course-bound and student central workflows through the canonical application service.
- [ ] Route Alumni and Industry Partner central workflows through the same lifecycle service where behavior is equivalent.
- [ ] Preserve stakeholder-specific authorization and availability policy through explicit adapters.
- [ ] Migrate unit, service, and component tests to the canonical path.
- [ ] Remove obsolete exports after confirming there are no remaining callers.
- [ ] Remove the analytics string-key fallback only when historical and current data are safely covered; otherwise retain it as a documented legacy compatibility path.

## Acceptance Criteria

- [ ] One canonical service owns response draft and submission persistence.
- [ ] Course-bound and central workflows share lifecycle, item replacement, and error behavior.
- [ ] Course-bound quantitative items consistently store their publication-time CILO binding when available.
- [ ] No active route or action calls a deprecated response persistence path.
- [ ] Obsolete services and exports are removed or explicitly marked with a time-bounded deprecation plan.
- [ ] Existing student, Alumni, and Industry Partner evaluation flows retain their expected authorization and availability behavior.
- [ ] Focused tests cover each supported deployment and stakeholder context.

## Verification Plan

```bash
rg "saveStudentCourseBoundDraft|submitStudentCourseBoundResponse|saveStudentEvaluationDraft|submitStudentEvaluationResponse" src

pnpm vitest run src/__tests__/modules/student-evaluation-workflow
pnpm vitest run src/__tests__/modules/stakeholder-evaluation-workflow
pnpm vitest run src/__tests__/features/responses
pnpm vitest run src/__tests__/modules/analytics-reporting-and-review

pnpm lint
pnpm test
pnpm build
```

Manual checks:

- Save and reload a student course-bound draft.
- Save and reload a student central-deployment draft.
- Submit each workflow once and verify history review.
- Submit through Alumni and Industry Partner portals.
- Confirm CILO analytics resolve binding IDs for newly submitted course-bound responses.

## Likely Affected Files

- `src/features/responses/services/save-student-evaluation-draft.ts`
- `src/features/responses/services/submit-student-evaluation-response.ts`
- `src/features/responses/services/save-student-course-bound-draft.ts`
- `src/features/responses/services/submit-student-course-bound-response.ts`
- `src/features/responses/services/save-central-deployment-draft.ts`
- `src/features/responses/services/submit-central-deployment-response.ts`
- `src/features/responses/answer-keys.ts`
- `src/lib/actions/student-evaluation-actions.ts`
- Stakeholder action modules
- `src/features/analytics/services/get-faculty-analytics-data.ts`
- Related tests

## Dependencies

- SC-01 must establish the canonical atomic lifecycle and database invariants first.

## Risks and Migration Considerations

- Historical response items may not contain binding IDs and must remain analyzable.
- Removing old exports prematurely can break less-visible routes.
- Generalization must not erase stakeholder-specific authorization rules.
- Avoid creating a single god service; share lifecycle mechanics while keeping context resolution separate.

## Related Findings

- **F-03:** Current and legacy response-submission pipelines have diverged.
- Related issues: SC-01 and SC-08.

## Definition of Done

- [ ] All supported response workflows use the canonical persistence path.
- [ ] Deprecated paths are removed or documented.
- [ ] Focused and full test suites pass.
- [ ] Production build passes.
- [ ] Response architecture and extension points are documented.

````

---

## SC-03 — Program Head Scope Correctness

### Title

`[Authorization] Require explicit Program Head program context`

### Recommended Labels

**Common labels when available:** `bug`, `security`, `architecture`
**Proposed custom labels:** `priority:high`, `phase:0`, `area:authorization`, `area:program-head`

### Priority Metadata

- **Severity:** High
- **Recommended phase:** Phase 0
- **Estimated effort:** Medium
- **Scope:** Architectural

### Copy-Ready Issue Body

```markdown
## Summary

Require every Program Head-scoped query and command to operate on an explicit Program ID that is validated against the actor's complete active Program Head assignment set.

This issue addresses architectural finding **F-02**.

## Background and Current Behavior

**Observed:** The data model permits multiple active `ProgramHeadAssignment` records for one user.

Relevant schema:

- `prisma/models/identity-access.prisma`
  - `ProgramHeadAssignment`

**Observed:** Several Program Head services resolve all active Program IDs and then use `programIds[0]` without explicit ordering or user selection.

Relevant implementation:

- `src/features/outcomes/services/manage-program-head-outcomes.ts`
  - `resolveAndValidatePHScope()`
  - `listProgramGOs()`
  - `createGO()`
  - `reorderGOs()`
  - `listCILOMappingsForProgram()`

**Observed:** Central deployment publication uses `programHeadAssignment.findFirst()` to select a Program.

Relevant implementation:

- `src/features/evaluations/services/publish-central-deployment.ts`
  - `publishCentralDeployment()`
  - `closeCentralDeployment()`

## Problem Statement

A Program Head assigned to multiple Programs may read or mutate whichever assignment the database returns first. The operation can pass role checks while targeting the wrong Program.

## Why This Matters

Program ownership defines authorization scope for Outcomes, Course assignments, templates, deployments, analytics, and reports. Ambiguous scope is an authorization and functional-correctness defect.

## Repository Evidence

### Observed

- Multiple Program Head assignment rows are allowed by the schema.
- Outcome services use the first element of an unordered Program ID list.
- Central deployment services use `findFirst()` without requiring a selected Program.

### Inferred

The initial implementation assumed a single Program assignment, while later schema evolution allowed multiple assignments.

### Recommended

Require `programId` in every Program Head-scoped command and query. Validate it using a reusable Program Head actor context before loading or mutating domain records.

## Likely Root Cause

A one-Program-per-Program-Head assumption remained embedded in service code after the assignment model became one-to-many.

## Scope

- Program Head route and page context
- Outcome queries and commands
- CILO/GO mapping workflows
- Program-wide instrument and deployment workflows
- Program Head Course and Course-assignment workflows where scope is currently implicit
- Analytics and report queries requiring Program context
- Reusable authorization context and tests

## Out of Scope

- Changing the institutional rule on whether a Program Head may manage multiple Programs
- Redesigning all role routing
- Dean and Secretary global access rules
- Replacing the role model

## Proposed Implementation Direction

1. Confirm the intended institutional rule:
   - Multiple active Program assignments are valid; or
   - Only one active Program assignment is allowed.
2. When multiple assignments are valid, introduce an explicit selected Program context.
3. Build a reusable server-side resolver that returns all authorized Program IDs.
4. Require each Program Head operation to provide a Program ID.
5. Reject missing, inactive, or unauthorized Program IDs.
6. Preserve non-disclosure behavior for inaccessible resources where appropriate.
7. Ensure the selected Program survives navigation through route segments or validated search parameters.

Suggested context contract:

```ts
type ProgramHeadContext = {
  userId: string;
  activeProgramIds: string[];
};
````

## Implementation Tasks

- [ ] Document whether multiple active Program Head assignments are supported.
- [ ] Inventory every use of `programIds[0]`, `findFirst()` on Program Head assignments, and implicit Program Head scope.
- [ ] Introduce a reusable Program Head scope resolver.
- [ ] Add an explicit `programId` to affected service inputs.
- [ ] Add or update Program selection UI when the actor has more than one assignment.
- [ ] Preserve the current direct flow when the actor has exactly one assignment.
- [ ] Validate Program scope again inside sensitive write transactions where concurrent assignment changes matter.
- [ ] Update outcome creation, update, archive, reorder, and mapping flows.
- [ ] Update central deployment publication and closing.
- [ ] Review Program Head analytics, Course, template, and assignment services for equivalent assumptions.
- [ ] Add authorization tests for zero, one, and multiple active Program assignments.

## Acceptance Criteria

- [ ] No Program Head operation selects a Program through an unordered first record.
- [ ] Every Program Head-scoped write validates an explicit Program ID.
- [ ] A Program Head cannot access or mutate an unassigned Program by changing a route or request value.
- [ ] A Program Head with one assignment retains a low-friction workflow.
- [ ] A Program Head with multiple assignments can deliberately select the intended Program.
- [ ] Program selection is preserved consistently across relevant pages and actions.
- [ ] Tests cover no assignment, inactive assignment, one assignment, multiple assignments, and unauthorized Program IDs.

## Verification Plan

```bash
rg "programIds\[0\]|programHeadAssignment\.findFirst|program_head_id" src/features src/lib/actions src/app

pnpm vitest run src/__tests__/modules/outcomes
pnpm vitest run src/__tests__/modules/deployments-and-targeting
pnpm vitest run src/__tests__/modules/academic-catalog-and-context
pnpm vitest run src/__tests__/modules/identity-access

pnpm lint
pnpm test
pnpm build
```

Manual validation:

- Program Head with no active assignment
- Program Head with one active assignment
- Program Head with two active assignments
- Attempt to submit another Program's ID
- Change Program assignment while a write is in progress where transaction revalidation is required

## Likely Affected Files

- `prisma/models/identity-access.prisma` only if the institutional rule changes
- `src/features/outcomes/services/manage-program-head-outcomes.ts`
- `src/features/evaluations/services/publish-central-deployment.ts`
- Program Head Course, template, assignment, analytics, and report services identified by the inventory
- Program Head pages and navigation components
- Relevant Zod schemas and action inputs
- Authorization and module tests

## Dependencies

None. This work should precede Program Head report and deployment expansion.

## Risks and Migration Considerations

- Route changes can affect bookmarks and existing navigation tests.
- Program selection must not be trusted from the client without server-side validation.
- Active assignment changes may invalidate a selected Program during a session.
- Do not add a global client state store solely for Program selection unless route-based context is insufficient.

## Related Findings

- **F-02:** Program Head scope is nondeterministic when multiple assignments exist.
- Related issues: SC-04, SC-06, and SC-07.

## Definition of Done

- [ ] All implicit first-Program assumptions are removed or formally justified.
- [ ] Authorization tests pass for all assignment cardinalities.
- [ ] Full lint, test, and production build checks pass.
- [ ] The Program Head scope contract is documented.

````

---

## SC-04 — Central Deployment Integrity

### Title

`[Database] Enforce central deployment identity and uniqueness`

### Recommended Labels

**Common labels when available:** `bug`, `database`, `testing`
**Proposed custom labels:** `priority:high`, `phase:0`, `area:evaluations`, `area:database`

### Priority Metadata

- **Severity:** Medium
- **Recommended phase:** Phase 0
- **Estimated effort:** Small to Medium
- **Scope:** Multi-module

### Copy-Ready Issue Body

```markdown
## Summary

Define the canonical identity of a central deployment and enforce its uniqueness in PostgreSQL so concurrent publication requests cannot create logically duplicate deployments.

This issue addresses architectural finding **F-04**.

## Background and Current Behavior

**Observed:** `publishCentralDeployment()` checks for an existing deployment before entering the transaction that creates the deployment and assignments.

Relevant implementation:

- `src/features/evaluations/services/publish-central-deployment.ts`
  - Duplicate precheck: approximately lines 133–162 at the assessed commit
  - Deployment creation transaction: approximately lines 177–262

**Observed:** The service catches unique-constraint errors, but the inspected `CentralDeployment` Prisma model does not define a unique constraint matching the precheck identity.

Relevant schema:

- `prisma/models/evaluations-deployments.prisma`
  - `CentralDeployment`

## Problem Statement

Two concurrent publication requests can both pass the precheck and create duplicate central deployments before either observes the other's insert.

## Why This Matters

Duplicate deployments can assign the same stakeholder more than once, confuse completion tracking, and cause report or analytics double counting.

## Repository Evidence

### Observed

- Duplicate detection occurs before the creation transaction.
- The precheck uses instrument version, Program, target stakeholder, year level, and term instance.
- No matching unique key was observed in the Prisma model.

### Inferred

The existing error translation expects database uniqueness that is not currently guaranteed by the canonical schema.

### Recommended

Define the exact deployment identity and add a PostgreSQL unique index. Use `NULLS NOT DISTINCT` or an equivalent expression/partial-index strategy for nullable targeting fields.

## Likely Root Cause

Application-level duplicate checking was implemented before the final central-deployment identity and nullable-target semantics were encoded in the database.

## Scope

- Central deployment identity definition
- Prisma and Supabase migration alignment
- Duplicate-data migration preflight
- Publication-service error translation
- Concurrent publication tests

## Out of Scope

- Redesigning the central deployment UX
- Course-bound publication, which already has a different assignment-based identity
- Report generation
- Program Head scope correction, tracked separately in SC-03

## Proposed Implementation Direction

1. Formally define whether these fields identify one logical deployment:
   - `instrument_version_id`
   - `program_id`
   - `major_id`
   - `year_level`
   - `target_stakeholder`
   - `term_instance_id`
2. Decide whether deployment name, activation time, or term enum belong to identity. They likely should not.
3. Scan existing data for duplicates using the selected identity.
4. Resolve any duplicates before adding the constraint.
5. Add the database unique index with explicit null semantics.
6. Retain a friendly service result for uniqueness conflicts.
7. Keep a user-friendly precheck if useful, but treat the database constraint as authoritative.

## Implementation Tasks

- [ ] Approve the central deployment identity contract.
- [ ] Add a duplicate-data preflight query to the migration or migration test.
- [ ] Add the unique index in `supabase/migrations/`.
- [ ] Represent the constraint in Prisma when expressible; otherwise document it as a PostgreSQL-only invariant.
- [ ] Update `publishCentralDeployment()` to rely on the database for race-safe enforcement.
- [ ] Preserve safe error translation for uniqueness violations.
- [ ] Add a test for two concurrent publication attempts.
- [ ] Add a migration-contract test for the exact index definition and null semantics.

## Acceptance Criteria

- [ ] The canonical central deployment identity is documented.
- [ ] PostgreSQL rejects duplicate deployments for that identity.
- [ ] Nullable Major and year-level values follow the approved identity semantics.
- [ ] Two concurrent publication requests cannot create two logical copies.
- [ ] The losing request receives a stable user-facing duplicate-deployment result.
- [ ] Existing non-duplicate deployments remain valid after migration.
- [ ] Migration and database-integration tests pass.

## Verification Plan

```bash
pnpm exec prisma format --schema prisma
pnpm exec prisma validate --schema prisma
pnpm supabase:migration:diff -- central_deployment_identity
pnpm supabase:push:dry-run
pnpm supabase:types

pnpm vitest run src/__tests__/modules/deployments-and-targeting
pnpm vitest run src/__tests__/scripts
pnpm test:db

pnpm lint
pnpm test
pnpm build
````

## Likely Affected Files

- `prisma/models/evaluations-deployments.prisma`
- `supabase/migrations/<new_central_deployment_identity_migration>.sql`
- `src/features/evaluations/services/publish-central-deployment.ts`
- Central deployment schemas and tests
- Migration-contract tests

## Dependencies

- The deployment identity must use the explicit Program context established by SC-03 when Program Head scope is involved.

## Risks and Migration Considerations

- Existing duplicate rows can block migration.
- Incorrect null semantics can either permit duplicates or reject valid deployments.
- Adding too many identity fields can allow semantically duplicate deployments; adding too few can reject legitimate cycles.

## Related Findings

- **F-04:** Central deployment duplicate prevention is vulnerable to concurrent publication.
- Related issue: SC-03.

## Definition of Done

- [ ] Database uniqueness is authoritative.
- [ ] Concurrent publication test passes.
- [ ] Migration dry run succeeds.
- [ ] Full lint, test, and production build checks pass.

````

---

## SC-05 — Major Lifecycle Parity

### Title

`[Academic Structure] Harden Major deletion preflight and lifecycle guards`

### Recommended Labels

**Common labels when available:** `bug`, `technical-debt`, `testing`
**Proposed custom labels:** `priority:medium`, `phase:1`, `area:academic-structure`

### Priority Metadata

- **Severity:** Medium
- **Recommended phase:** Phase 1
- **Estimated effort:** Small to Medium
- **Scope:** Local to Multi-module

### Copy-Ready Issue Body

```markdown
## Summary

Bring Major deletion behavior to parity with the guarded Program deletion workflow by checking the complete dependency set, using a revision-aware preflight, revalidating within a transaction, and translating foreign-key races safely.

This issue addresses architectural finding **F-05**.

## Background and Current Behavior

**Observed:** `deleteProgram()` performs a comprehensive dependency preflight, requires the Program to be inactive, verifies a revision token, recounts dependencies inside a transaction, and translates foreign-key races.

Relevant implementation:

- `src/features/academic-structure/services/manage-programs.ts`
  - `countProgramDependencies()`
  - `preflightProgramDeletion()`
  - `deleteProgram()`

**Observed:** `deleteMajor()` counts only Courses and Student profiles before deletion.

Relevant implementation:

- `src/features/academic-structure/services/manage-programs.ts`
  - `deleteMajor()`

**Observed:** The Major model has additional relations, including Alumni profiles, central deployments, instrument templates, and enrollments.

Relevant schema:

- `prisma/models/academic-structure.prisma`
  - `Major`

## Problem Statement

A Major can pass the current preflight even though another dependent record prevents deletion. The resulting foreign-key error may not be translated into a clear, domain-specific result.

## Why This Matters

Deletion eligibility should be predictable and auditable. Incomplete dependency checks create inconsistent behavior between Programs and Majors and can expose generic failures to users.

## Repository Evidence

### Observed

- Program deletion uses a robust guarded lifecycle.
- Major deletion counts only two dependency categories.
- Major has more than two dependent relation types.

### Inferred

The Major lifecycle did not evolve when new Major-scoped domain relations were added.

### Recommended

Reuse the Program deletion pattern while keeping Major-specific dependencies and confirmation text.

## Likely Root Cause

Incremental domain expansion introduced additional Major relations without updating the original deletion implementation.

## Scope

- Major dependency inventory
- Preflight DTO and UI confirmation data
- Inactive-state requirement
- Revision guard
- Transactional dependency recount
- Foreign-key race translation
- Major deletion tests

## Out of Scope

- Program deletion changes unrelated to reusable helpers
- Redesigning Major editing
- Bulk archival
- Automatically deleting dependent academic history

## Proposed Implementation Direction

1. Enumerate every Major relation that should block hard deletion.
2. Distinguish historical blockers from relations that may legitimately be detached.
3. Require Major deactivation before hard deletion.
4. Return a structured preflight including dependency counts and revision.
5. Recheck all guards within one transaction.
6. Translate foreign-key races into a refreshed preflight result.
7. Prefer deactivation when historical records exist.

## Implementation Tasks

- [ ] Define `MajorDependencyCounts`.
- [ ] Add `countMajorDependencies()` supporting Prisma and transaction clients.
- [ ] Add `preflightMajorDeletion()`.
- [ ] Add a revision and confirmation requirement.
- [ ] Update `deleteMajor()` to recheck within a transaction.
- [ ] Translate `P2003` into a user-facing linked-record result.
- [ ] Update the Server Action and confirmation UI.
- [ ] Add tests for every dependency category and a stale preflight.
- [ ] Add a concurrent-dependent-record test where practical.

## Acceptance Criteria

- [ ] Every Major relation that should block deletion is represented in the preflight.
- [ ] An active Major cannot be hard deleted.
- [ ] A stale revision cannot be used to delete a changed Major.
- [ ] A Major that gains a dependent record after preflight is not deleted.
- [ ] Foreign-key races return a stable domain error rather than an unhandled exception.
- [ ] The UI recommends deactivation when linked history exists.
- [ ] Major deletion tests cover all dependency groups.

## Verification Plan

```bash
pnpm vitest run src/__tests__/features/academic-structure
pnpm vitest run src/__tests__/lib/actions/admin-program-actions.test.ts

pnpm lint
pnpm test
pnpm build
````

When database behavior changes:

```bash
pnpm test:db
```

## Likely Affected Files

- `src/features/academic-structure/services/manage-programs.ts`
- `src/lib/actions/admin-program-actions.ts`
- Major deletion schemas and types
- Major confirmation-dialog components
- Academic Structure and action tests

## Dependencies

None.

## Risks and Migration Considerations

- Dependency counts can become expensive if implemented through many serial queries; use safe parallel reads where appropriate.
- The blocker list must align with institutional data-retention policy.
- Hard deletion should remain exceptional when historical records exist.

## Related Findings

- **F-05:** Major deletion preflight is incomplete.

## Definition of Done

- [ ] Major deletion provides the same safety class as Program deletion.
- [ ] Focused and full test suites pass.
- [ ] Production build passes.

````

---

## SC-06 — Reporting and Export Readiness

### Title

`[Reports] Implement authoritative report generation and exports`

### Recommended Labels

**Common labels when available:** `enhancement`, `architecture`, `testing`
**Proposed custom labels:** `priority:high`, `phase:0`, `area:reports`, `release-blocker`

### Priority Metadata

- **Severity:** High for release readiness
- **Recommended phase:** Phase 0 for specification and release decision; implementation may span Phase 1–3
- **Estimated effort:** Large
- **Scope:** Architectural

### Copy-Ready Issue Body

```markdown
## Summary

Implement authorized, server-generated System CLOIE reports and PDF/spreadsheet exports for the report surfaces that are currently stubbed or unavailable.

This issue addresses architectural finding **F-06**.

## Background and Current Behavior

**Observed:** The Program Head report page states that export buttons are intentionally stubbed.

Relevant file:

- `src/app/(app)/program-head/reports/page.tsx`

**Observed:** The Dean report page returns `notFound()`.

Relevant file:

- `src/app/(app)/dean/reports/page.tsx`

**Observed:** Analytics services already calculate quantitative means, CILO metrics, completion data, qualitative tokens, and oversight read models, but these are not yet assembled into authoritative export artifacts.

Relevant areas:

- `src/features/analytics/`
- `src/features/dean/services/read-dean-oversight.ts`
- `src/features/evaluations/`
- `src/features/responses/`

## Problem Statement

Core reporting and evidence-export workflows are not complete. Client-rendered charts and placeholder buttons do not provide stable institutional report artifacts.

## Why This Matters

Reports are a primary output of System CLOIE for outcomes monitoring, continuous quality improvement, review, and accreditation evidence. Release readiness should explicitly include or exclude each required report rather than leaving report routes as placeholders.

## Repository Evidence

### Observed

- Program Head export controls are stubs.
- Dean reports are unavailable.
- The codebase contains relevant analytics and read-model foundations.

### Inferred

Report implementation was intentionally deferred while data and evaluation foundations were developed.

### Recommended

Define report contracts first, then generate report DTOs and export files on the server with role and Program scope enforced before data retrieval.

## Likely Root Cause

Report requirements, output contracts, and export adapters were not finalized at the same time as the evaluation and analytics workflows.

## Scope

At minimum, decide and implement the required versions of:

- Course-bound CILO summary
- Stakeholder deployment completion report
- Program outcome attainment digest
- Dean college-level oversight report
- Relevant PDF export
- Relevant spreadsheet export

The final report set must be confirmed against Project CLOIE requirements before implementation.

## Out of Scope

- A generic business-intelligence platform
- Arbitrary user-authored report builders
- Client-only generation of authoritative evidence
- Microservices or a separate reporting service without a demonstrated need

## Proposed Implementation Direction

1. Approve one report specification per report type:
   - Audience and role
   - Scope
   - Academic period
   - Required metrics
   - Minimum response threshold
   - Qualitative-data treatment
   - Snapshot/finalization semantics
   - File format
2. Build purpose-specific server-side report read models.
3. Authorize the actor before executing the report query.
4. Derive reports from immutable versions, snapshots, and submitted responses.
5. Generate PDF and spreadsheet files through explicit export adapters.
6. Include report metadata:
   - Generation time
   - Academic period
   - Program or College scope
   - Evaluation/deployment identity
   - Applied filters
   - Data caveats
7. Add tests for authorization, metric correctness, empty states, and exported-file structure.

## Implementation Tasks

- [ ] Confirm the release-required report inventory.
- [ ] Write an acceptance-level report contract for each required report.
- [ ] Define privacy and minimum-response-threshold rules.
- [ ] Create authorized report query/read-model services.
- [ ] Reuse existing analytics calculations only after verifying their semantics.
- [ ] Add PDF generation through a server-side adapter.
- [ ] Add spreadsheet generation through a server-side adapter.
- [ ] Replace Program Head report stubs with functional actions and status states.
- [ ] Implement or deliberately scope the Dean report route.
- [ ] Add tests for report authorization and Program/period scope.
- [ ] Add deterministic metric and export-content tests.
- [ ] Add manual validation against known seed data.

## Acceptance Criteria

- [ ] Every required report has an approved data and presentation contract.
- [ ] Reports are generated server-side after role and scope authorization.
- [ ] Program Head reports cannot include another Program's data.
- [ ] Dean reports expose only the approved College-level view.
- [ ] Only submitted responses contribute to final reports.
- [ ] Historical reports use the correct instrument, Course, CILO, and period snapshots.
- [ ] Qualitative data follows the approved anonymity and threshold policy.
- [ ] PDF exports open correctly and contain required metadata.
- [ ] Spreadsheet exports contain stable sheet names, column definitions, and typed values.
- [ ] Empty, partial, and finalized data states are handled explicitly.
- [ ] Stub controls and `notFound()` placeholders are removed for implemented report surfaces.

## Verification Plan

```bash
pnpm vitest run src/__tests__/modules/analytics-reporting-and-review
pnpm vitest run src/__tests__/app/dean-oversight-pages.test.tsx
pnpm vitest run src/__tests__/modules/deployments-and-targeting
pnpm test:db

pnpm lint
pnpm test
pnpm build
````

Manual checks:

- Generate each report from deterministic seed data.
- Compare displayed metrics with exported values.
- Verify Program Head, Dean, and unauthorized-role behavior.
- Open PDF output in at least two readers.
- Open spreadsheet output in Excel or LibreOffice and verify types and layout.

## Likely Affected Files

- `src/app/(app)/program-head/reports/page.tsx`
- `src/app/(app)/dean/reports/page.tsx`
- New or existing report modules under `src/features/analytics/` or `src/features/reports/`
- `src/features/dean/services/read-dean-oversight.ts` or extracted read models
- Report Server Actions or Route Handlers
- Export adapter dependencies and configuration
- Report tests and deterministic fixtures

## Dependencies

- SC-01 and SC-02 should stabilize response data.
- SC-03 should establish explicit Program Head scope.
- SC-09 should define qualitative-data privacy requirements.

## Risks and Migration Considerations

- Report definitions can become inconsistent with dashboard metrics if calculations are duplicated.
- Raw qualitative comments may create privacy risks.
- Long-running exports may exceed request timeouts as data grows.
- File-generation libraries require license and security review.
- Reports should not depend solely on mutable live records when snapshots are available.

## Related Findings

- **F-06:** Required reporting functionality remains stubbed or unavailable.
- Related issues: SC-01, SC-02, SC-03, SC-08, and SC-09.

## Definition of Done

- [ ] Approved required reports are functional.
- [ ] Export authorization and metric tests pass.
- [ ] Generated artifacts are manually verified.
- [ ] Full lint, test, and production build checks pass.
- [ ] Report contracts and operational considerations are documented.

````

---

## SC-07 — Feature Boundaries and Hotspot Decomposition

### Title

`[Architecture] Establish feature public APIs and decompose service hotspots`

### Recommended Labels

**Common labels when available:** `architecture`, `technical-debt`, `testing`
**Proposed custom labels:** `priority:medium`, `phase:1`, `phase:2`, `area:architecture`

### Priority Metadata

- **Severity:** Medium
- **Recommended phase:** Phase 1–2
- **Estimated effort:** Large
- **Scope:** Architectural

### Copy-Ready Issue Body

```markdown
## Summary

Strengthen System CLOIE's modular-monolith boundaries by defining narrow feature public APIs, enforcing cross-feature import rules, and decomposing the largest orchestration hotspots by responsibility without breaking transaction ownership.

This issue addresses architectural findings **F-07** and **F-08**.

## Background and Current Behavior

**Observed:** Major feature services import other features' internal service paths directly.

Representative examples:

- Evaluation publication imports Instrument internals.
- Response services import Course-assignment roster internals.
- Central deployment publication imports Enrollment internals.

Relevant files:

- `src/features/evaluations/services/publish-course-bound-evaluation.ts`
- `src/features/responses/services/submit-student-evaluation-response.ts`
- `src/features/evaluations/services/publish-central-deployment.ts`

**Observed:** Several files combine multiple independently changing responsibilities:

- `src/features/course-assignments/services/manage-course-assignments.ts`
- `src/features/evaluations/services/publish-course-bound-evaluation.ts`
- `src/features/dean/services/read-dean-oversight.ts`

**Observed:** Server Actions are centralized under `src/lib/actions/`, which weakens feature ownership even when the actions are thin.

## Problem Statement

Module boundaries are communicated through folder conventions but are not enforced. Large services accumulate context loading, authorization, formatting, transaction logic, error translation, bulk behavior, and read models in one file.

## Why This Matters

Unenforced boundaries increase coupling, make internal refactors expensive, and allow dependency cycles. Oversized hotspots also increase merge conflicts and context cost for human and AI-assisted development.

## Repository Evidence

### Observed

- Cross-feature imports target internal service files.
- High-value orchestrators exceed several hundred lines and own multiple responsibilities.
- Shared `src/lib/actions/` contains feature-specific delivery adapters.

### Inferred

The codebase has a useful feature structure but lacks explicit module contracts and automated boundary enforcement.

### Recommended

Introduce narrow public entry points or explicit cross-feature ports, then extract supporting modules around transaction-owning orchestrators.

## Likely Root Cause

Feature folders were adopted early, while public API rules and service decomposition were deferred during rapid vertical-slice implementation.

## Scope

- Feature dependency inventory
- Public feature contracts
- ESLint or architectural boundary rules
- Response, Course-assignment, Evaluation publication, Dean oversight, and Instrument hotspots
- Feature-owned Server Action migration strategy
- Documentation and architecture tests

## Out of Scope

- Microservices
- Generic repository abstractions
- Enforcing an identical folder structure for every feature
- Splitting atomic publication transactions across services
- Large renames without an ownership or dependency benefit

## Proposed Implementation Direction

### Module boundaries

- `src/app/` may import feature public APIs.
- Features may import another feature only through its public API or a documented narrow port.
- Shared `src/lib/` must not import feature internals.
- Client Components must not import server-only services or Prisma.
- Infrastructure helpers must remain server-only.

### Hotspot decomposition

Preserve a top-level transaction-owning function while extracting:

- Context loaders
- Pure validators and policies
- Read-model builders
- Error translators
- Persistence input builders
- Bulk-processing helpers

Do not extract a helper only because it reduces line count.

## Implementation Tasks

- [ ] Generate a feature dependency map.
- [ ] Identify approved cross-feature dependencies and accidental internal imports.
- [ ] Define public APIs for the most depended-on features first.
- [ ] Add ESLint import restrictions or equivalent architecture tests.
- [ ] Migrate one feature boundary at a time with compatibility re-exports where needed.
- [ ] Decompose `manage-course-assignments.ts` by lifecycle command, bulk processing, and context loading.
- [ ] Decompose `read-dean-oversight.ts` into purpose-specific read models.
- [ ] Extract support modules from Course-bound publication while keeping one transaction owner.
- [ ] Move new Server Actions to feature-owned modules or expose them through feature public APIs.
- [ ] Add tests ensuring Client Components and shared utilities do not import server internals.
- [ ] Document justified exceptions.

## Acceptance Criteria

- [ ] Each high-dependency feature exposes a documented public API.
- [ ] New cross-feature imports cannot target private internals without an explicit exception.
- [ ] Shared `src/lib/` does not depend on feature internals.
- [ ] Client Components cannot import Prisma or server-only feature modules.
- [ ] The identified hotspots are split by responsibility without changing behavior.
- [ ] Course-bound publication retains one explicit transaction and retry owner.
- [ ] Deprecated compatibility exports have removal criteria.
- [ ] Architecture-boundary tests run in CI.
- [ ] Full regression tests pass.

## Verification Plan

```bash
# Review dependency direction
rg "@/features/" src/features src/lib src/app
rg "@/lib/db/prisma|@prisma/client" src --glob "*.tsx"
rg '^"use client"' src/features src/components src/app

pnpm lint
pnpm test
pnpm build
````

Add focused architecture tests for:

- Client/server import boundaries
- Shared-to-feature dependency direction
- Feature public API usage
- Prisma imports outside approved server modules

## Likely Affected Files

- `src/features/*/index.ts` or equivalent public API modules
- ESLint configuration
- `src/features/course-assignments/services/manage-course-assignments.ts`
- `src/features/evaluations/services/publish-course-bound-evaluation.ts`
- `src/features/dean/services/read-dean-oversight.ts`
- Selected Instrument and Response service modules
- `src/lib/actions/`
- Architecture tests and feature context documentation

## Dependencies

Complete or stabilize SC-01, SC-02, and SC-03 before moving their code aggressively. Boundary enforcement can begin incrementally.

## Risks and Migration Considerations

- Large import rewrites can create churn without improving cohesion.
- Broad barrel exports can hide dependencies rather than control them.
- Splitting a transaction owner can introduce correctness regressions.
- Compatibility re-exports can become permanent unless removal is tracked.

## Related Findings

- **F-07:** Several feature services are oversized orchestration modules.
- **F-08:** Feature boundaries are conventional rather than enforced.

## Definition of Done

- [ ] Boundary rules are documented and automated.
- [ ] Priority hotspots have coherent internal modules.
- [ ] No behavior regression is observed.
- [ ] Full lint, test, and build checks pass.

````

---

## SC-08 — Analytics and Bulk Processing Performance

### Title

`[Performance] Optimize analytics computation and bulk assignment processing`

### Recommended Labels

**Common labels when available:** `performance`, `testing`, `enhancement`
**Proposed custom labels:** `priority:medium`, `phase:3`, `area:analytics`, `area:course-assignments`

### Priority Metadata

- **Severity:** Medium
- **Recommended phase:** Phase 3
- **Estimated effort:** Medium to Large
- **Scope:** Multi-module

### Copy-Ready Issue Body

```markdown
## Summary

Reduce request-time database and CPU cost in analytics and bulk Course-assignment workflows while preserving existing authorization, metric semantics, and partial-success behavior.

This issue addresses architectural findings **F-10** and **F-11**.

## Background and Current Behavior

**Observed:** `getFacultyAnalyticsData()` loads nested evaluation assignments, submitted responses, quantitative items, qualitative items, bindings, templates, and academic-period data. It then repeatedly filters arrays to calculate CILO and question metrics.

Relevant implementation:

- `src/features/analytics/services/get-faculty-analytics-data.ts`
  - `getFacultyAnalyticsData()`
  - `buildWordCloudTokens()`

**Observed:** winkNLP tokenization runs synchronously during the analytics request.

**Observed:** `bulkCreateCourseAssignments()` processes inputs sequentially, queries each Course independently, and inserts one assignment at a time.

Relevant implementation:

- `src/features/course-assignments/services/manage-course-assignments.ts`
  - `bulkCreateCourseAssignments()`

## Problem Statement

Analytics cost grows with the response corpus and question count, while bulk creation performs approximately two database operations per input. These patterns can produce avoidable latency as institutional data grows.

## Why This Matters

Longitudinal analytics and large academic setup operations are central System CLOIE workflows. Slow request-time computation directly affects perceived responsiveness and may exceed hosting limits at larger volumes.

## Repository Evidence

### Observed

- Analytics eagerly loads complete response-item collections.
- Per-CILO and per-question metrics use repeated filtering.
- NLP executes synchronously in the request path.
- Bulk assignment creation performs serial lookup and insert operations.

### Inferred

The current implementation is appropriate for MVP data volumes but will not scale linearly for broader historical reporting.

### Recommended

Optimize in measured stages and avoid speculative infrastructure.

## Likely Root Cause

Correctness and straightforward application-level implementation were prioritized before query profiling and historical-data scaling.

## Scope

- Query-shape reduction
- One-pass analytics grouping
- SQL aggregation where beneficial
- Immutable/finalized analytics caching or snapshots
- NLP corpus limits and caching
- Bulk Course prefetch and batched insertion
- Performance tests and instrumentation
- Chart accessibility fallback data

## Out of Scope

- A separate analytics microservice
- A message broker without measured need
- Replacing Recharts
- Premature materialization of every dashboard query
- Caching mutable data without an invalidation contract

## Proposed Implementation Direction

### Analytics stages

1. Add timing and query-count measurement.
2. Narrow Prisma `select` clauses.
3. Build one-pass maps for response items by binding and answer key.
4. Move stable aggregate calculations to PostgreSQL when benchmarks justify it.
5. Cache only immutable deployment/version or completed-period results.
6. Consider persisted analytics snapshots for finalized periods.
7. Bound NLP input and cache token results by response-corpus revision.

### Bulk assignment stages

1. Fetch all referenced Courses in one query.
2. Resolve Program Head scope once.
3. Validate all rows in memory.
4. Insert valid rows in a transaction or bounded chunks.
5. Preserve per-row partial-success reporting.

## Implementation Tasks

- [ ] Establish representative small, medium, and large seed datasets.
- [ ] Record baseline analytics duration, memory, and query count.
- [ ] Replace repeated item filtering with one-pass indexed grouping.
- [ ] Narrow Prisma query projections.
- [ ] Define cacheability rules for active versus finalized deployments.
- [ ] Add minimum cohort and corpus limits for qualitative processing as approved by SC-09.
- [ ] Cache or precompute word-cloud tokens for immutable corpora when beneficial.
- [ ] Add a textual/table fallback for chart data.
- [ ] Prefetch all Courses for bulk assignment creation.
- [ ] Batch valid writes while retaining row-specific errors.
- [ ] Add performance regression tests or benchmark scripts with documented thresholds.

## Acceptance Criteria

- [ ] Analytics metric results remain identical for the same fixture data.
- [ ] Analytics uses one-pass grouping rather than repeated corpus scans for each metric.
- [ ] Query selection excludes unused fields.
- [ ] Active mutable data is not cached without explicit invalidation.
- [ ] Finalized analytics can be reused through an approved version or period key.
- [ ] Qualitative processing applies approved privacy and corpus limits.
- [ ] Charts expose equivalent textual or tabular data.
- [ ] Bulk assignment creation does not query each Course independently.
- [ ] Partial-success reporting remains deterministic and row-specific.
- [ ] Benchmarks demonstrate an improvement on representative datasets.

## Verification Plan

```bash
pnpm vitest run src/__tests__/modules/analytics-reporting-and-review
pnpm vitest run src/__tests__/modules/course-assignments
pnpm test:db

pnpm lint
pnpm test
pnpm build
````

Performance verification should record:

- Number of database queries
- Server duration
- Peak process memory where practical
- Number of selected evaluations
- Number of submitted responses
- Number of quantitative and qualitative items
- Bulk input size and completion time

## Likely Affected Files

- `src/features/analytics/services/get-faculty-analytics-data.ts`
- Other dashboard and review analytics services
- `src/features/analytics/components/*chart*.tsx`
- `src/features/course-assignments/services/manage-course-assignments.ts`
- Analytics types and pure aggregation helpers
- Performance fixtures, tests, or scripts

## Dependencies

- SC-02 should settle response-item semantics.
- SC-06 should define report metric contracts.
- SC-09 should define qualitative-data thresholds and privacy behavior.

## Risks and Migration Considerations

- Moving calculations to SQL can change null and rounding semantics.
- Caching active data can expose stale results.
- Persisted snapshots require a clear refresh/finalization trigger.
- Parallel bulk writes can violate partial-success ordering unless results are indexed carefully.

## Related Findings

- **F-10:** Analytics performs corpus-wide request-time computation.
- **F-11:** Bulk assignment creation is sequential and query-heavy.

## Definition of Done

- [ ] Correctness tests prove metric equivalence.
- [ ] Benchmarks show measurable improvement.
- [ ] Accessibility fallback is present for analytical charts.
- [ ] Full lint, test, and build checks pass.

````

---

## SC-09 — Security and Qualitative-Data Privacy

### Title

`[Security] Restrict Server Action origins and formalize qualitative-data privacy controls`

### Recommended Labels

**Common labels when available:** `security`, `privacy`, `testing`
**Proposed custom labels:** `priority:high`, `phase:0`, `phase:1`, `area:security`, `area:analytics`

### Priority Metadata

- **Severity:** Medium
- **Recommended phase:** Phase 0–1
- **Estimated effort:** Medium
- **Scope:** Multi-module

### Copy-Ready Issue Body

```markdown
## Summary

Remove unconditional development-tunnel origin trust from production configuration and establish explicit privacy controls for raw qualitative evaluation comments.

This issue addresses architectural findings **F-12** and **F-13**.

## Background and Current Behavior

**Observed:** `next.config.ts` permits `*.trycloudflare.com` through `serverActions.allowedOrigins` without an observed production-only restriction.

**Observed:** Faculty analytics omits direct respondent identity but returns raw qualitative comment text along with aggregate word-cloud tokens.

Relevant implementation:

- `next.config.ts`
- `src/features/analytics/services/get-faculty-analytics-data.ts`
  - `getFacultyAnalyticsData()`
  - Returned `qualitativeTexts`

**Observed:** The Course-bound exclusion workflow already demonstrates database-level sensitive-text controls for a narrower field.

Relevant migration:

- `supabase/migrations/20260721120156_course_bound_evaluation_publication_integrity.sql`

## Problem Statement

Development tunnel domains should not be trusted by production Server Action origin checks. Separately, removing account identifiers from qualitative comments does not prevent a respondent or subject from being identified through names, incidents, diagnoses, or distinctive circumstances included in free text.

## Why This Matters

System CLOIE handles confidential institutional evaluation data. Origin configuration and qualitative-data disclosure must follow secure-by-default and privacy-by-design principles.

## Repository Evidence

### Observed

- A wildcard TryCloudflare origin is configured.
- Raw comments are returned to the analytics layer.
- Sensitive-text validation exists for publication exclusions but not as a general comment-privacy policy.

### Inferred

Qualitative anonymity is currently interpreted primarily as removal of account identity rather than control of semantic re-identification risk.

### Recommended

Environment-gate allowed origins and adopt a documented qualitative-data policy enforced by server-side services and report/read-model boundaries.

## Likely Root Cause

Development tunnel support and MVP analytics were implemented before production origin policy and qualitative-data governance were formalized.

## Scope

### Server Action origins

- Production allowlist
- Development/demo tunnel configuration
- Environment validation
- Configuration tests

### Qualitative-data privacy

- Raw-comment access policy
- Role and scope restrictions
- Minimum response threshold
- PII and sensitive-content guidance
- Optional redaction strategy
- Logging and export restrictions
- Retention and report behavior

## Out of Scope

- Building a general content-moderation platform
- Claiming perfect anonymization of arbitrary free text
- Encrypting the entire database at the application level without a separate requirement
- Replacing Supabase Auth

## Proposed Implementation Direction

1. Build `serverActions.allowedOrigins` from validated environment-specific values.
2. Permit tunnel origins only in explicit development or approved demo environments.
3. Fail safely when production origin configuration is missing.
4. Approve who may access:
   - Aggregate word-cloud data
   - Individual raw comments
   - Exported raw comments
5. Define a minimum response threshold before qualitative comments become visible.
6. Display a respondent warning against entering names or sensitive personal data.
7. Consider server-side detection/redaction as a risk-reduction layer, not a guarantee of anonymity.
8. Exclude raw comments from exports unless explicitly approved.
9. Log access to sensitive qualitative views without logging the text itself.

## Implementation Tasks

- [ ] Define production, preview, demo, and development origin rules.
- [ ] Add environment validation for allowed origins.
- [ ] Remove unconditional wildcard tunnel trust from production builds.
- [ ] Add tests for accepted and rejected origin configurations.
- [ ] Approve a qualitative-data access matrix by role and report type.
- [ ] Define and implement minimum-response thresholds.
- [ ] Add free-text privacy guidance to evaluation forms.
- [ ] Prevent raw comments from being returned where only aggregate tokens are required.
- [ ] Add or update authorized raw-comment review services.
- [ ] Add safe access logging without comment contents.
- [ ] Add privacy tests for low-response cohorts and unauthorized roles.
- [ ] Document retention, export, and redaction decisions.

## Acceptance Criteria

- [ ] Production Server Action origins use an explicit allowlist.
- [ ] `*.trycloudflare.com` is not trusted in production unless explicitly approved through environment configuration.
- [ ] Invalid production origin configuration fails clearly and safely.
- [ ] Raw qualitative comments are accessible only through approved role- and scope-authorized services.
- [ ] Low-response cohorts follow the approved minimum-threshold behavior.
- [ ] Aggregate analytics do not return raw comments when they are unnecessary.
- [ ] Evaluation forms warn respondents not to enter personally identifying or sensitive details.
- [ ] Exports follow the approved qualitative-data policy.
- [ ] Logs never contain raw comment text.
- [ ] Security and privacy tests pass.

## Verification Plan

```bash
pnpm vitest run src/__tests__/config
pnpm vitest run src/__tests__/modules/analytics-reporting-and-review
pnpm vitest run src/__tests__/features/evaluations

pnpm lint
pnpm test
pnpm build
````

Manual checks:

- Production build with approved origin
- Production build with missing/invalid origin
- Development tunnel configuration
- Faculty analytics below and above response threshold
- Unauthorized role request for raw comments
- Report export containing qualitative data

## Likely Affected Files

- `next.config.ts`
- `.env.example`
- New or existing environment-schema module
- `src/features/analytics/services/get-faculty-analytics-data.ts`
- Qualitative-review and report services
- Evaluation form components
- Structured logging utilities
- Security, privacy, configuration, and analytics tests

## Dependencies

- Report export policy should coordinate with SC-06.
- Analytics caching and NLP behavior should coordinate with SC-08.

## Risks and Migration Considerations

- Strict origin configuration can break preview deployments if domains are not modeled correctly.
- Automated redaction can create false positives and false negatives.
- Minimum thresholds must be institutionally approved rather than selected arbitrarily.
- Historical comments may already contain identifying details.

## Related Findings

- **F-12:** Wildcard TryCloudflare origins are trusted unconditionally.
- **F-13:** Qualitative anonymization does not prevent semantic re-identification.

## Definition of Done

- [ ] Production origin configuration is secure by default.
- [ ] Qualitative access and export policy is implemented and documented.
- [ ] Focused and full tests pass.
- [ ] Production build passes with valid configuration.

````

---

## SC-10 — Database-Backed CI and Operational Errors

### Title

`[Testing] Add PostgreSQL integration CI and structured operational error reporting`

### Recommended Labels

**Common labels when available:** `testing`, `ci`, `architecture`
**Proposed custom labels:** `priority:medium`, `phase:4`, `area:ci`, `area:observability`

### Priority Metadata

- **Severity:** Medium
- **Recommended phase:** Phase 4, with CI foundation started earlier
- **Estimated effort:** Medium to Large
- **Scope:** Operational

### Copy-Ready Issue Body

```markdown
## Summary

Add a database-backed CI job that applies System CLOIE's full migration history and verifies PostgreSQL constraints, transactions, triggers, and concurrency behavior. Standardize operational error reporting with safe correlation identifiers.

This issue addresses architectural findings **F-14** and **F-15**.

## Background and Current Behavior

**Observed:** `.github/workflows/ci.yml` runs dependency installation, lint, Vitest, and a production build using mock Supabase environment values.

**Observed:** The workflow does not provision PostgreSQL or Supabase services.

**Observed:** Several critical guarantees exist only in SQL migrations:

- Partial unique indexes
- Check constraints
- Roster immutability triggers
- RLS enablement and privilege revocation
- Composite integrity rules

**Observed:** Error reporting is inconsistent. Course-bound publication produces a support reference ID and structured safe log fields, while some response services use direct `console.error()` calls.

Relevant implementation:

- `.github/workflows/ci.yml`
- `supabase/migrations/`
- `src/features/evaluations/services/publish-course-bound-evaluation.ts`
- `src/features/responses/services/submit-student-evaluation-response.ts`

## Problem Statement

Mocked unit tests cannot prove migration order, PostgreSQL constraints, trigger behavior, isolation, or concurrency correctness. In production, inconsistent error logging makes incident correlation dependent on which service failed.

## Why This Matters

System CLOIE relies on PostgreSQL for some of its strongest data-integrity and privacy guarantees. Those guarantees must be executable in CI. Production support also requires traceable failures without leaking evaluation contents.

## Repository Evidence

### Observed

- Current CI has no real database service.
- Migration-contract tests can inspect SQL text but do not replace applying it.
- Error-handling maturity varies by service.

### Inferred

The current fast CI was designed for development speed and has not yet been expanded for production-readiness verification.

### Recommended

Keep the fast existing job and add a separate database-integration job. Introduce a small structured logging/error adapter before selecting a full monitoring vendor.

## Likely Root Cause

Database integration and operational observability were deferred while application functionality and unit coverage were developed.

## Scope

### Database CI

- Clean database provisioning
- Full migration application
- Prisma generation/validation
- Constraint and trigger tests
- Transaction and concurrency tests
- Generated Supabase type checks

### Operational errors

- Reference ID generation
- Stable operation names
- Safe actor and entity identifiers
- Error category and database code
- No confidential payload logging
- Consistent service-result shape

## Out of Scope

- Selecting a mandatory commercial monitoring platform
- Logging raw answers or qualitative comments
- Replacing Vitest
- Running every UI test in the database job

## Proposed Implementation Direction

### CI structure

```text
quality-checks
  → lint
  → unit/component/service tests
  → production build

database-integration
  → provision PostgreSQL or Supabase local services
  → apply migrations from zero
  → generate Prisma and Supabase types
  → run DB integration and concurrency tests
````

### Error structure

```ts
type OperationalFailure = {
  success: false;
  error: string;
  code?: string;
  referenceId?: string;
};
```

Log only safe metadata:

- `operation`
- `referenceId`
- `actorId` where appropriate
- Safe record IDs
- Error type and code
- No answer contents, comments, tokens, or credentials

## Implementation Tasks

- [ ] Select PostgreSQL-only or Supabase-local CI based on required RLS and Auth coverage.
- [ ] Add a database-integration workflow job.
- [ ] Apply every committed migration to an empty database.
- [ ] Run Prisma validation and generation against the migrated schema.
- [ ] Regenerate and diff Supabase database types where practical.
- [ ] Add direct tests for critical checks, indexes, and triggers.
- [ ] Add SC-01 and SC-04 concurrency scenarios to the database job.
- [ ] Add migration-order and clean-bootstrap verification.
- [ ] Create a structured operational-error utility.
- [ ] Migrate critical publication, assignment, response, and report services first.
- [ ] Add tests proving logs omit confidential payloads.
- [ ] Document local execution of the database test suite.

## Acceptance Criteria

- [ ] CI applies the complete migration history to an empty database.
- [ ] CI fails when a migration, trigger, check, or unique index is invalid.
- [ ] Concurrency tests run against a real PostgreSQL database.
- [ ] Generated Prisma and Supabase contracts remain synchronized.
- [ ] The fast quality-check job remains separate and reasonably quick.
- [ ] Critical services return safe reference IDs for unexpected operational failures.
- [ ] Logs use stable operation names and contain no response answers or qualitative text.
- [ ] Developers can run the database integration suite locally through a documented command.

## Verification Plan

```bash
pnpm exec prisma validate --schema prisma
pnpm exec prisma generate --schema prisma
pnpm supabase:push:dry-run
pnpm test:db

pnpm lint
pnpm test
pnpm build
```

CI validation:

- Open a test pull request with a deliberately invalid migration and confirm failure.
- Confirm a clean repository checkout can provision and test the database without manual state.
- Confirm cancellation and caching behavior do not leave shared database state.

## Likely Affected Files

- `.github/workflows/ci.yml`
- New database-integration workflow or job definition
- `package.json` scripts
- Database test setup and teardown utilities
- `src/lib/` operational error/logging utilities
- Critical services using direct `console.error()`
- Documentation for local database tests

## Dependencies

- SC-01 and SC-04 provide high-value initial concurrency and uniqueness integration cases.
- CI foundation may be implemented in parallel before those issues are complete.

## Risks and Migration Considerations

- Supabase-local CI may take longer than PostgreSQL-only CI.
- Tests must isolate state and avoid relying on the hosted project.
- Logging utilities can create noise if every expected validation error is logged as an incident.
- Reference IDs must not be treated as security tokens.

## Related Findings

- **F-14:** CI does not exercise a real PostgreSQL/Supabase environment.
- **F-15:** Runtime observability and error reporting are inconsistent.

## Definition of Done

- [ ] Database integration runs in CI and locally.
- [ ] Critical PostgreSQL invariants are executable tests.
- [ ] Operational failures use consistent safe correlation data.
- [ ] Full CI passes on `main`.

````

---

## SC-11 — Documentation and Operational Readiness

### Title

`[Documentation] Align implementation docs and complete deployment, backup, and turnover runbooks`

### Recommended Labels

**Common labels when available:** `documentation`, `maintenance`, `enhancement`
**Proposed custom labels:** `priority:medium`, `phase:2`, `phase:4`, `area:operations`, `area:documentation`

### Priority Metadata

- **Severity:** Medium
- **Recommended phase:** Phase 2–4
- **Estimated effort:** Medium
- **Scope:** Multi-module and Operational

### Copy-Ready Issue Body

```markdown
## Summary

Correct confirmed documentation-to-code drift and produce the operational runbooks required to deploy, recover, maintain, and turn over System CLOIE responsibly.

This issue addresses architectural finding **F-16** and the confirmed operational-readiness gaps identified by the assessment.

## Background and Current Behavior

**Observed:** README documentation describes `src/proxy.ts` as a re-export, while the assessed implementation contains the proxy logic directly.

Relevant files:

- `README.md`
- `src/proxy.ts`

**Observed:** README recommends Node 20, while CI uses Node 22.

Relevant files:

- `README.md`
- `.github/workflows/ci.yml`

**Observed:** The repository contains migration and Supabase workflow documentation, but the assessment did not verify complete runbooks for:

- Production deployment
- Environment promotion
- Backup verification
- Restore drills
- Rollback
- Health checks
- Incident response
- Credential turnover
- Institutional system turnover

## Problem Statement

Documentation drift can misdirect maintainers and coding agents. Missing operational runbooks make production support and institutional turnover dependent on undocumented knowledge.

## Why This Matters

System CLOIE is intended for institutional use. Maintainability includes not only source quality but also repeatable deployment, recovery, administration, and handover procedures.

## Repository Evidence

### Observed

- README and proxy implementation differ.
- Documented and CI Node versions differ.
- Supabase migration workflow is documented.
- Complete production and recovery procedures were not established by repository evidence.

### Inferred

Technical documents have evolved at a different rate from the implementation and operational workflow.

### Recommended

Treat executable configuration as the source of truth, update documents during implementation issues, and finish a verified operational set before final turnover.

## Likely Root Cause

Rapid implementation and refactoring changed paths, versions, and workflows without a release-level documentation synchronization checkpoint.

## Scope

- README architecture and setup accuracy
- Node and pnpm version alignment
- Environment-variable registry
- Supabase and Prisma migration workflow
- Production deployment runbook
- Health-check and rollback procedure
- Backup and restore procedure
- Credential rotation and secret ownership
- Dependency and license inventory
- Administrator and maintainer handover
- Architecture and data-flow diagrams

## Out of Scope

- Rewriting every historical Project CLOIE document
- Treating obsolete proposal material as current implementation truth
- Publishing secrets or production credentials
- Replacing executable tests with documentation

## Proposed Implementation Direction

Organize operational documentation under a stable structure such as:

```text
docs/
├── architecture/
├── operations/
│   ├── deployment.md
│   ├── backup-and-restore.md
│   ├── database-migrations.md
│   ├── incident-response.md
│   └── credential-turnover.md
├── administration/
└── decisions/
````

The exact structure may follow current repository conventions.

Each runbook should include:

- Preconditions
- Responsible role
- Exact commands
- Expected output
- Failure handling
- Rollback or recovery
- Verification evidence
- Last verified date

## Implementation Tasks

- [ ] Reconcile README setup steps with `package.json`, CI, Prisma, Supabase, and proxy implementation.
- [ ] Select and document supported Node and pnpm versions.
- [ ] Document all required and optional environment variables without values.
- [ ] Document development, test, preview, and production configuration differences.
- [ ] Create a production deployment checklist.
- [ ] Create a migration deployment and rollback procedure.
- [ ] Define backup source, frequency, retention, ownership, and verification.
- [ ] Perform and document a restore drill in a non-production environment.
- [ ] Document health checks and post-deployment smoke tests.
- [ ] Document incident response and safe log/reference-ID usage.
- [ ] Create an administrator and maintainer turnover checklist.
- [ ] Generate a dependency and license inventory.
- [ ] Add architecture and runtime-flow diagrams aligned with the code.
- [ ] Add a documentation review item to future architecture/schema changes.

## Acceptance Criteria

- [ ] README setup instructions match executable configuration.
- [ ] Supported Node and pnpm versions are consistent across docs and CI.
- [ ] Environment variables are documented by purpose, sensitivity, and environment.
- [ ] A new maintainer can deploy a non-production instance using only documented steps.
- [ ] A migration can be applied and verified using the runbook.
- [ ] A backup restore has been rehearsed and documented.
- [ ] Rollback and post-deployment verification steps are explicit.
- [ ] Credential ownership and turnover steps are documented without exposing secrets.
- [ ] Architecture diagrams match current route, feature, authentication, and persistence flows.
- [ ] Documentation references System CLOIE for the software and Project CLOIE only for the capstone project.

## Verification Plan

Documentation verification should be procedural rather than editorial only:

1. Use a clean checkout.
2. Follow setup instructions without undocumented steps.
3. Provision a non-production database.
4. Apply migrations.
5. Run the application and smoke tests.
6. Perform a backup and restore drill.
7. Complete the turnover checklist with a second person where possible.

Repository checks:

```bash
pnpm lint
pnpm test
pnpm build
pnpm exec prisma validate --schema prisma
pnpm supabase:push:dry-run
```

## Likely Affected Files

- `README.md`
- `docs/cloie-techstack.md`
- `docs/system-cloie-technical-documentation.md`
- `supabase/README.md`
- `.env.example`
- `.github/workflows/ci.yml` if versions are aligned through configuration
- New operational and administration documents under `docs/`

## Dependencies

Documentation should be updated incrementally with every child issue. Final turnover verification should follow SC-01 through SC-10.

## Risks and Migration Considerations

- Documentation can become stale immediately if it duplicates executable configuration excessively.
- Backup claims must be verified rather than copied from provider marketing.
- Runbooks must not contain production secrets.
- Historical capstone documents should be clearly labeled as historical when retained.

## Related Findings

- **F-16:** Documentation contains implementation drift.
- Related confirmed gaps: backup, recovery, deployment verification, environment promotion, health checks, and turnover readiness.

## Definition of Done

- [ ] Documentation matches the final implementation.
- [ ] Deployment and restore procedures have been executed successfully.
- [ ] Operational ownership is explicit.
- [ ] Full repository verification commands pass.

````

---

# 5. Recommended Creation Order

Publish the issues in this sequence so dependencies can be linked immediately:

1. Parent tracker
2. SC-01 — Response lifecycle integrity
3. SC-03 — Program Head scope
4. SC-04 — Central deployment uniqueness
5. SC-09 — Security and qualitative privacy
6. SC-05 — Major deletion lifecycle
7. SC-02 — Response-pipeline consolidation
8. SC-06 — Reports and exports
9. SC-07 — Feature boundaries and hotspots
10. SC-10 — Database CI and operational errors
11. SC-08 — Analytics and bulk performance
12. SC-11 — Documentation and operational readiness

After publishing each child issue, replace `#TBD` in the parent tracker with the actual issue number.

---

# 6. Issue Dependency Map

```text
Parent Tracker
│
├─ SC-01 Response lifecycle integrity
│  ├─ SC-02 Response-pipeline consolidation
│  │  ├─ SC-06 Reports and exports
│  │  └─ SC-08 Analytics optimization
│  └─ SC-10 Database integration tests
│
├─ SC-03 Explicit Program Head context
│  ├─ SC-04 Central deployment uniqueness
│  ├─ SC-06 Reports and exports
│  └─ SC-07 Boundary stabilization
│
├─ SC-05 Major deletion lifecycle
│
├─ SC-09 Security and qualitative privacy
│  ├─ SC-06 Report privacy behavior
│  └─ SC-08 Qualitative processing limits
│
├─ SC-07 Feature boundaries and hotspots
├─ SC-10 CI and operational errors
└─ SC-11 Documentation and turnover
   └─ Finalizes outcomes from all prior issues
````

Potential parallel work:

- SC-01 and SC-03 may proceed in parallel because they affect different primary domains.
- SC-10's CI foundation may begin while SC-01 and SC-04 are being designed.
- SC-05 can proceed independently.
- SC-11 should be updated incrementally, even though final verification occurs last.

---

# 7. Coverage Matrix

| Finding ID | Finding Title                                                         | Addressed By Issue | Phase             | Coverage Status |
| ---------- | --------------------------------------------------------------------- | ------------------ | ----------------- | --------------- |
| F-01       | Draft requests can mutate a concurrently finalized response           | SC-01              | Phase 0           | Fully Covered   |
| F-02       | Program Head scope is nondeterministic with multiple assignments      | SC-03              | Phase 0           | Fully Covered   |
| F-03       | Current and legacy response pipelines have diverged                   | SC-02              | Phase 1           | Fully Covered   |
| F-04       | Central deployment duplicate prevention is concurrency-vulnerable     | SC-04              | Phase 0           | Fully Covered   |
| F-05       | Major deletion preflight is incomplete                                | SC-05              | Phase 1           | Fully Covered   |
| F-06       | Required report functionality remains stubbed                         | SC-06              | Phase 0 / release | Fully Covered   |
| F-07       | Feature services have become oversized orchestration modules          | SC-07              | Phase 1–2         | Fully Covered   |
| F-08       | Feature boundaries are conventional rather than enforced              | SC-07              | Phase 1–2         | Fully Covered   |
| F-09       | Response records/items lack complete consistency guarantees           | SC-01, SC-02       | Phase 0–1         | Fully Covered   |
| F-10       | Analytics performs corpus-wide request-time computation               | SC-08              | Phase 3           | Fully Covered   |
| F-11       | Bulk assignment creation is sequential and query-heavy                | SC-08              | Phase 3           | Fully Covered   |
| F-12       | Wildcard TryCloudflare origins are trusted unconditionally            | SC-09              | Phase 0           | Fully Covered   |
| F-13       | Qualitative anonymization does not prevent semantic re-identification | SC-09              | Phase 1           | Fully Covered   |
| F-14       | CI does not exercise real PostgreSQL/Supabase integration             | SC-10              | Phase 4           | Fully Covered   |
| F-15       | Runtime observability and error handling are inconsistent             | SC-10              | Phase 4           | Fully Covered   |
| F-16       | Documentation contains implementation drift                           | SC-11              | Phase 2–4         | Fully Covered   |

---

# 8. Findings Intentionally Deferred or Excluded

These items are not proposed as standalone issues because the assessment did not establish a present need or because they belong inside another issue.

| Item                                    | Decision                                | Reason                                                                                                             |
| --------------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Microservices                           | Excluded                                | Current scale and failure modes do not justify distributed deployment and consistency costs.                       |
| CQRS infrastructure                     | Excluded                                | Purpose-built command and read modules are sufficient without a framework-level CQRS layer.                        |
| Generic Prisma repositories             | Excluded                                | They would mostly duplicate Prisma and weaken query clarity.                                                       |
| Message broker / event bus              | Deferred until evidence exists          | No confirmed asynchronous throughput or integration requirement currently demands one.                             |
| Framework or ORM replacement            | Excluded                                | Next.js, Supabase, PostgreSQL, and Prisma are appropriate for the current architecture.                            |
| Full offline PWA                        | Deferred                                | A manifest exists, but offline capability should be specified separately based on approved requirements.           |
| Indiscriminate caching                  | Excluded                                | Mutable academic and deployment data require explicit invalidation contracts.                                      |
| Separate accessibility issue            | Included in SC-08 and report acceptance | Current evidence supports chart fallback and report accessibility work, but not a complete standalone audit scope. |
| Environment validation standalone issue | Included in SC-09 and SC-11             | It directly supports secure origin configuration and operational setup.                                            |
| Major role-model redesign               | Deferred                                | The current single-role constraint may be intentional; no confirmed requirement justifies redesign.                |

---

# 9. Remaining Uncertainty

The issue plan is based on the architectural assessment pinned to `main@be0682490af5953a46fa8cefb6b7ac3a3f04c0f7`. Before implementation, each child issue should verify that its evidence still applies to the current target commit.

The following remain unresolved and should be confirmed within the relevant issues:

1. Whether one Program Head may intentionally have multiple active Program assignments.
2. The exact central deployment identity, especially nullable Major and year-level semantics.
3. The institutionally approved minimum response threshold for qualitative disclosure.
4. The final required report inventory and export formats.
5. Whether submitted-response immutability should be enforced through a PostgreSQL trigger, conditional writes, or both.
6. The selected production hosting platform and deployment workflow.
7. The actual hosted Supabase migration, RLS, privilege, backup, and restore state.
8. The performance thresholds expected for projected institutional data volumes.
9. Whether existing response data contains duplicate logical items or missing binding IDs that require migration cleanup.
10. The approved operational owners for deployment, database recovery, credentials, and incident response.

---

# 10. Tracker Maintenance Guidance

When publishing and maintaining the parent issue:

- Update only the **Status** and **Linked Issue** fields during routine progress tracking.
- Add implementation detail to the child issue rather than expanding the parent.
- Mark an item `Blocked` only when the blocking dependency or decision is recorded.
- Mark an item `Deferred` only with a dated reason and revisit condition.
- Close a child issue only after its acceptance criteria and verification plan are complete.
- Record material scope changes in the child issue body or a linked comment.
- Keep finding IDs unchanged so traceability survives issue renaming.
- Update the baseline commit if the plan is revalidated against a newer architectural assessment.
