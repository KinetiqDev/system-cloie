## Why

System CLOIE already has an `InstitutionalOutcome` college-wide catalog (`prisma/models/outcomes.prisma:42-53`) and `CILOInstitutionalOutcomeMapping` typed relation, but ownership is **deferred**: `introduce-institutional-learning-outcomes` named Secretary as owner while `secretary-outcome-access-removal` and live `manage-outcome-writes.ts:243` deny Secretary writes (`openspec/config.yaml:132`, `src/features/outcomes/CONTEXT.md:91`). The General Education Coordinator (`GEN_ED_COORDINATOR`) currently has only Dashboard / Course Assignments / Analytics / Profile (`src/lib/constants/navigation.ts:217`). Program Heads manage PLOs college-partitioned via `/program-head/programs/[programId]/outcomes` (`manage-program-head-outcomes.ts:37-404`, `program-head-outcomes-page.tsx:1-462`). The institution now requires that **encoding of Institutional Learning Outcomes move from Secretary to the GE Coordinator**, with an Outcomes surface mirroring Program Head PLO management (college-wide) and a Courses surface showing **only `CourseScope.GENERAL_EDUCATION`** courses (e.g., GEMATH, GEGS) read-only.

## What Changes

- **BREAKING:** Transfer Institutional Learning Outcome catalog write authority from deferred/Secretary to `GEN_ED_COORDINATOR`. Secretary retains **no access**: `SECRETARY_NAV` stays without Learning Outcomes and `/secretary/learning-outcomes/**` continues to `redirect("/secretary/dashboard")`. Coordinator becomes sole ILO encoder.
- Add **GE Coordinator Outcomes** college-wide catalog: create/edit/reorder/archive/restore ILOs with stable `code @unique`, statement, `order`, `is_active` via hardened review (exact before/after diff, explicit confirmation, `HMAC-SHA256` signature + `freshnessToken`, `Serializable` tx, revalidation) reusing `manage-outcome-writes.ts:45-439` pattern (new `scopeAllowsILO`).
- Add **GE Coordinator Outcomes mapping review** read-only college-wide page (`/gen-ed-coordinator/outcomes/mapping`): for each active GE course with `cilos.some{is_active}`, show every active ILO as badge with `manifestation L/P/O` and `readiness` (`ready` = at-least-one active ILO with non-null manifestation per `classify-course-alignment.ts:43-47`), mirroring `program-head/.../outcomes/mapping/page.tsx:101-333` but without `programId` scoping.
- Add **GE Coordinator Courses** read-only catalog (`/gen-ed-coordinator/courses`): list/filter/search/paginate **only** `CourseScope.GENERAL_EDUCATION` (`programme_id null`, `major_id null` forbidden), mirroring `program-head-courses-catalog.tsx:1-775` table but without Major/Scope creation branch. No Course CRUD granted in this slice (future capability can add writes).
- Guarded role-owned routes `src/app/(app)/gen-ed-coordinator/outcomes/**` and `.../courses/**` behind `SessionGuard allowedRoles=[GEN_ED_COORDINATOR]` (`layout.tsx:5`), `GEN_ED_COORDINATOR_NAV` entries.
- Record decision in ADR reconciling ADR 0005 and update `src/features/outcomes/CONTEXT.md`, `openspec/config.yaml:123-132`, `CONTEXT-MAP.md`.

## Capabilities

### New Capabilities
- `gen-ed-ilo-catalog`: College-wide Institutional Learning Outcome catalog owned by `GEN_ED_COORDINATOR` — CRUD/reorder/archive/restore with protected review/commit, college-wide `order`, server-rendered list + drag-reorder, read-only mapping review, loading/empty/error states.
- `gen-ed-course-catalog`: College-wide General Education course catalog read-only for `GEN_ED_COORDINATOR` — filtered `GENERAL_EDUCATION` list, search, status filter, pagination, disclosure of provenance.

### Modified Capabilities
- `secretary-outcome-access-removal`: No requirement text change needed beyond confirming Secretary ILO encode remains denied; delta not created (change is additive). If wording must clarify new owner, will be noted in ADR, not spec delta.

## Impact

- Affected domains: **Outcomes**, **Academic Structure / Course Catalog**, **Identity and Access / Navigation**, **Analytics readiness** (read-only review reuses same `ciloIsAligned` at-least-one rule).
- Code: `prisma/models/outcomes.prisma` unchanged (no migration); `prisma/models/course-assignments.prisma` unchanged; new services `src/features/outcomes/services/manage-gen-ed-outcomes.ts`, `src/features/academic-structure/services/resolve-gen-ed-courses.ts`, components `gen-ed-outcomes-page.tsx`, `ilo-form-dialog.tsx`, `gen-ed-courses-catalog.tsx`, actions `gen-ed-outcome-actions.ts`, routes under `src/app/(app)/gen-ed-coordinator/outcomes/**` and `courses/**`, `src/lib/constants/navigation.ts`, `src/lib/constants/gen-ed-routes.ts`.
- No Supabase migration; no `supabase-database.ts` hand-edit; `InstitutionalOutcome.code @unique` preserved.
- Auth: server-only `resolveAuthSession()` checks; scope derived from `GEN_ED_COORDINATOR`, not client paramsForged filters cannot widen (`course_scope==GENERAL_EDUCATION` enforced server-side).
- Tests: unit/service + route + component; `pnpm lint`, `pnpm build` gate.
- Deployment: additive routes, no destructive data change; rollback = revert navigation + block routes.
