## 1. Outcome Model and Migration Foundation

- [ ] 1.1 Add InstitutionalOutcome and typed CILO-to-InstitutionalOutcome Prisma models, mapping provenance, indexes, relations, and readiness snapshot schema version
  - Scope: `prisma/models/outcomes.prisma`, `prisma/models/academic-calendar.prisma`, `prisma/models/identity-access.prisma`, `src/__tests__/config/prisma-schema-structure.test.ts`
  - Acceptance: Prisma expresses a college-wide archiveable Institutional Outcome catalog, a unique typed General Education mapping relation, actor/timestamp relations, and versioned readiness snapshot metadata without reviving PLO or adding an ILO-to-GO crosswalk.
  - Verification: `pnpm exec prisma validate`, focused Prisma schema structure tests.
  - Commit: `feat(outcomes): add institutional outcome and typed mapping models`

- [ ] 1.2 Create the reviewed Supabase migration for typed outcome relations and irreversible legacy General Education mapping deletion
  - Scope: `supabase/migrations/<timestamp>_introduce_institutional_outcomes_and_typed_mappings.sql`, `src/__tests__/scripts/supabase-migration-integrity.test.ts`
  - Acceptance: Migration reports and deletes only CILO-to-GO rows whose CILO belongs to a General Education Course; preserves Program-specific mapping rows, CILOs, GOs, evaluations, and readiness snapshots; creates typed tables, constraints, indexes, scope triggers, secure grants/RLS, and snapshot version support transactionally.
  - Verification: focused migration-ledger tests, reviewed SQL, `pnpm supabase:push:dry-run` against the configured disposable target only.
  - Commit: `feat(db): add typed outcome mapping migration`

- [ ] 1.3 Regenerate Prisma and Supabase database clients after the schema migration
  - Scope: generated `src/types/supabase-database.ts`, Prisma generated client output, migration workflow records.
  - Acceptance: Generated types expose the Institutional Outcome and typed mapping tables and no handwritten generated-file edits exist.
  - Verification: `pnpm supabase:types`, `pnpm exec prisma generate`, `pnpm exec prisma validate`.
  - Commit: `build(db): regenerate typed outcome clients`

## 2. Outcome Services and Authorization

- [ ] 2.1 Implement Secretary Institutional Outcome catalog services and protected server actions
  - Scope: `src/features/outcomes/services/manage-institutional-outcomes.ts`, `src/features/outcomes/schemas/`, `src/lib/actions/`, focused outcome service/action tests.
  - Acceptance: `SECRETARY` can create, edit, reorder, archive, and restore ILOs college-wide through exact before/after review, explicit confirmation, freshness recheck, and atomic save; `DEAN`, `PROGRAM_HEAD`, and `FACULTY` mutations fail closed.
  - Verification: focused Vitest service/action tests for authorization, duplicate codes, stale reviews, unconfirmed writes, archive/restore, and atomic failure.
  - Commit: `feat(outcomes): manage institutional outcome catalog`

- [ ] 2.2 Refactor the shared outcome write gateway for typed mapping authorization and provenance
  - Scope: `src/features/outcomes/services/manage-outcome-writes.ts`, `src/features/outcomes/services/manage-cilo-mappings.ts`, `src/features/outcomes/schemas/`, mapping authorization tests.
  - Acceptance: Faculty writes only active Courses taught through an active owned Course Assignment; Secretary writes college-wide; Program Head mapping mutation is rejected; target type derives from Course scope; wrong-layer, wrong-Program, inactive-target, duplicate, stale, and unauthorized writes fail safely; new writes record actors/timestamps.
  - Verification: focused outcome-write tests covering all SystemRole values, both typed relations, concurrency/freshness, database unique-race translation, and provenance.
  - Commit: `refactor(outcomes): enforce typed mapping ownership and scope`

- [ ] 2.3 Add server read/write services for atomic Course-level alignment diffs
  - Scope: `src/features/outcomes/services/read-course-alignment.ts`, `src/features/outcomes/services/write-course-alignment.ts`, `src/features/outcomes/types.ts`, focused service tests.
  - Acceptance: Authorized reads return Course scope, inferred target type, valid catalog, active CILOs, mapped targets, per-CILO status, Course readiness, shared GenEd impact, and provenance; writes compute a complete addition/removal diff, prepare an exact review, and commit all changes atomically with serializable freshness and authorization checks.
  - Verification: focused service tests for Program-specific and General Education Courses, multiple Faculty assignments, empty catalogs, partial mappings, invalid targets, stale reviews, and rollback.
  - Commit: `feat(outcomes): add atomic course alignment service`

## 3. Readiness and Evaluation Contract

- [ ] 3.1 Update live readiness projection for target-specific Institutional Outcome and Graduate Outcome coverage
  - Scope: `src/features/academic-calendar/services/read-period-readiness.ts`, readiness types, focused readiness tests.
  - Acceptance: General Education contexts require active ILO mappings; Program-specific contexts require active owning-Program GO mappings; shared GenEd mappings apply automatically to every active Course Assignment context; archived/wrong-layer targets do not satisfy readiness; payloads identify typed target gaps without labeling ILO gaps as GO gaps.
  - Verification: focused readiness tests for missing CILOs, partial mappings, shared GenEd contexts, wrong targets, archived targets, assignment expansion, stable ordering, and totals parity.
  - Commit: `feat(readiness): classify outcome coverage by target type`

- [ ] 3.2 Version and preserve completed Academic Period readiness snapshots
  - Scope: `prisma/models/academic-calendar.prisma`, `src/features/academic-calendar/services/read-period-readiness.ts`, completion services, snapshot tests, migration ledger.
  - Acceptance: New snapshots contain schema version and typed target IDs/details; old snapshots remain immutable and retain legacy interpretation; later mapping/catalog changes do not rewrite completed history; snapshot failures prevent false completion claims.
  - Verification: focused snapshot persistence/read tests, immutable trigger tests, completed-period regression tests.
  - Commit: `feat(readiness): preserve versioned typed outcome snapshots`

- [ ] 3.3 Gate new Course-bound evaluation publication on target-specific alignment
  - Scope: `src/features/evaluations/services/publish-course-bound-evaluation.ts`, publication types/errors, publication service/action tests.
  - Acceptance: New publication rejects any active CILO without a valid active target for the locked Course scope and returns a safe repair path; fully aligned Program-specific and General Education Courses proceed; existing evaluation snapshots and responses remain unchanged.
  - Verification: focused publication tests for both target types, archived/wrong-layer mappings, unauthorized publishers, existing template/roster guards, and error recovery.
  - Commit: `feat(evaluations): require aligned outcomes before publication`

## 4. Faculty Alignment Experience

- [ ] 4.1 Add the URL-backed Faculty Course alignment route and server loading boundary
  - Scope: `src/app/(app)/faculty/cilos/[courseId]/alignment/page.tsx`, `loading.tsx`, Faculty navigation/link integration, route tests.
  - Acceptance: Active assigned Faculty can deep-link to an authorized Course alignment page; unauthorized/invalid Course URLs fail safely; page is a Server Component that passes prepared serializable data to a narrow Client Component; loading and not-found behavior are explicit.
  - Verification: focused route tests for authorization, deep links, invalid Course, no CILOs, and loading surface; `pnpm build` after slice integration.
  - Commit: `feat(faculty): add course outcome alignment route`

- [ ] 4.2 Build the target-aware accessible Course alignment editor with searchable multi-selects
  - Scope: `src/features/outcomes/components/faculty-course-alignment-editor.tsx` or the selected feature component path, `src/features/evaluations/components/faculty-cilos-course-list.tsx`, shadcn/Base UI components, component tests.
  - Acceptance: Program-specific rows expose only owning-Program GOs; General Education rows expose only ILOs and show shared-impact warning; each CILO supports keyboard-accessible searchable multi-select with full statements, selected counts, focus states, touch-sized controls, and no mixed target catalog.
  - Verification: focused Testing Library tests for selection, keyboard behavior, target filtering, shared warning, empty state, loading, and accessibility labels; run the applicable shadcn component tests.
  - Commit: `feat(faculty): add target-aware alignment editor`

- [ ] 4.3 Add Course-level diff review, atomic save, unsaved-change recovery, and failure feedback
  - Scope: Faculty alignment editor/actions, toast/Alert/Dialog components, alignment component tests and route tests.
  - Acceptance: Faculty can stage additions/removals without immediate writes, review exact before/after changes, confirm one Course-level atomic save, see success/provenance feedback, retry safe failures, and receive a discard confirmation for unsaved changes.
  - Verification: focused component tests for review/confirm/cancel, stale review, rollback error, disabled pending controls, retry, and unsaved dismissal; browser smoke test through a running app when fixtures are available.
  - Commit: `feat(faculty): review and save course alignment diffs`

## 5. Secretary, Program Head, and Dean Surfaces

- [ ] 5.1 Add Secretary Learning Outcomes navigation and Institutional Outcome catalog UI
  - Scope: `src/app/(app)/secretary/learning-outcomes/page.tsx`, loading/error surfaces, `src/features/outcomes/components/institutional-outcomes-page.tsx`, form/dialog components, `src/lib/constants/navigation.ts`, navigation tests.
  - Acceptance: Secretary reaches a role-owned catalog route and can perform all approved ILO catalog operations; empty/loading/error states are recoverable; no Dean, Program Head, or Faculty mutation controls appear on read-only views.
  - Verification: focused route/component/navigation tests, `pnpm lint` for changed files.
  - Commit: `feat(secretary): add institutional outcomes catalog surface`

- [ ] 5.2 Convert Program Head mapping route to read-only alignment review
  - Scope: `src/app/(app)/program-head/programs/[programId]/outcomes/mapping/page.tsx`, `src/features/outcomes/components/program-head-mapping-controls.tsx`, `src/lib/actions/program-head-outcome-actions.ts`, Program Head route/component tests.
  - Acceptance: Program Heads can inspect valid typed mappings and readiness gaps within assigned Program scope but cannot create/remove mappings; existing GO ownership and editing remain unchanged; legacy route bookmarks remain safe.
  - Verification: focused Program Head route, authorization, read-only control, and loading tests.
  - Commit: `refactor(program-head): make outcome mapping review read-only`

- [ ] 5.3 Extend Dean Learning Outcomes read model and UI for typed ILO/GO coverage
  - Scope: `src/features/dean/services/read-dean-oversight.ts`, `src/app/(app)/dean/college-oversight/learning-outcomes/page.tsx`, Dean API/read tests, Dean UI tests.
  - Acceptance: Dean sees Institutional Outcome catalog/coverage before General Education gaps and distinct from Program-specific GO coverage; archived targets are labeled in history; reads remain period-scoped, privacy-safe, read-only, and `private, no-store`.
  - Verification: focused Dean service/API/page tests for mixed target types, no eligible period, completed snapshots, non-Dean denial, no mutation controls, exact payload, and cache headers.
  - Commit: `feat(dean): show typed institutional outcome oversight`

## 6. Fixtures, Documentation, and Cutover

- [ ] 6.1 Replace legacy General Education fixtures with Institutional Outcome catalog and mappings
  - Scope: `prisma/seed/fixtures/outcomes.ts`, `prisma/seed/runners/seed-outcomes.ts`, seed context/types, fixture tests.
  - Acceptance: Seed creates idempotent college-wide ILOs and General Education CILO-to-ILO rows, preserves Program-specific CILO-to-GO rows, creates no per-Program GenEd mapping duplicates, and supports clean demo reset after migration.
  - Verification: focused seed/fixture tests, `pnpm db:seed` against the isolated target, demo reset verification.
  - Commit: `feat(seed): add institutional outcome fixtures`

- [ ] 6.2 Amend domain context, outcome ownership ADR, and navigation/design documentation
  - Scope: `CONTEXT-MAP.md`, `src/features/outcomes/CONTEXT.md` or appropriate new context, `src/features/auth/CONTEXT.md`, `docs/adr/0005-outcome-ownership-and-dean-oversight.md`, design/navigation docs.
  - Acceptance: Canonical terms distinguish ILO, GO, CILO, typed mappings, Faculty mapping responsibility, Secretary stewardship, Program Head read-only review, Dean oversight, and deferred ILO-to-GO crosswalk; conflicts with the former ADR are explicitly superseded rather than silently ignored.
  - Verification: documentation review and OpenSpec validation.
  - Commit: `docs(outcomes): record institutional outcome ownership model`

- [ ] 6.3 Add migration, schema, authorization, readiness, publication, and UI regression coverage for cutover
  - Scope: focused tests across `src/__tests__/features/outcomes`, `academic-calendar`, `evaluations`, `components`, `app`, schema/migration tests, and any browser test directory.
  - Acceptance: Tests cover all approved role boundaries, typed relation integrity, irreversible GenEd deletion predicate, seed replay, target-specific readiness, immutable historical snapshots, publication blocking, Faculty interaction states, Program Head read-only review, and Dean privacy/read-only behavior.
  - Verification: focused Vitest suites, applicable Playwright/browser smoke flows, then `pnpm test`.
  - Commit: `test(outcomes): cover institutional outcome cutover`

## 7. Final Verification and Delivery

- [ ] 7.1 Run full repository verification after all slices are integrated
  - Scope: entire repository; no source changes unless verification exposes an in-scope defect.
  - Acceptance: Migration dry-run/push verification, generated types, seed replay, focused tests, full `pnpm test`, `pnpm lint`, and `pnpm build` all pass; Faculty browser flow confirms target-aware mapping and publication blocking; Secretary catalog, Program Head read-only review, and Dean oversight are exercised.
  - Verification: `pnpm supabase:push:dry-run`, `pnpm supabase:types`, `pnpm exec prisma generate`, `pnpm test`, `pnpm lint`, `pnpm build`, and applicable Playwright/browser smoke commands.
  - Commit: `test(outcomes): verify institutional outcome refactor`
