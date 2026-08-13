## Context

System CLOIE currently has two outcome layers in the application model:

- `GO` (`prisma/models/outcomes.prisma`) is owned by an Academic Program.
- `CILO` is owned by a Course and remains stable across Course Assignments.
- `CILOMapping` currently joins every CILO to a `GO`, including the legacy General Education interpretation that a shared General Education CILO maps separately to Program-owned GOs.

The revised institutional rule introduces a third semantic concept: an institution-wide catalog of **Institutional Learning Outcomes (ILOs)**. General Education CILOs map once to ILOs common to every Academic Program. Program-specific CILOs continue to map to GOs owned by the Course's owning Academic Program. There is no ILO-to-GO crosswalk in this change.

The current mapping write gateway already has protected prepare/commit behavior, but its visible authoring surface is Program Head-only. Faculty CILO management is a Course list plus a dense edit Dialog, and Faculty has no mapping read model or mapping UI. Dean Learning Outcomes readiness currently treats General Education CILOs as covered by any active GO, which is invalid under the new target model.

The change crosses Outcomes, Course Catalog and Assignments, Identity and Access, Evaluations, Academic Calendar readiness, role navigation, Supabase migrations, generated database types, seed data, and Dean oversight. Existing evaluation publication snapshots preserve CILO text and question bindings, not mapping state; completed-period readiness snapshots are immutable JSON and must retain their historical interpretation.

## Goals / Non-Goals

**Goals:**

- Add a Secretary-managed, college-wide Institutional Outcome catalog with stable codes, statements, ordering, archive/restore lifecycle, and protected writes.
- Represent General Education CILO-to-ILO and Program-specific CILO-to-GO links as separate typed relations with database foreign keys, uniqueness, scope enforcement, and durable provenance for new writes.
- Make Faculty the primary operational mapper for Courses they actively teach for both target types; retain college-wide Secretary administration; make Program Head mapping review read-only; keep Dean oversight read-only.
- Make target type server-derived from `Course.course_scope`; never let a client choose a target catalog that conflicts with Course scope.
- Provide a URL-backed Faculty Course alignment detail route below Manage CILOs with a target-aware accessible searchable multi-select per CILO.
- Save one complete mapping diff per Course in one reviewed serializable transaction, with stale-state protection and an explicit shared-impact warning for General Education CILOs.
- Make active readiness and new Course-bound evaluation publication target-specific.
- Preserve completed-period readiness and published evaluation history without reinterpreting old snapshots as current ILO alignment.
- Extend Dean Learning Outcomes oversight to show ILO coverage and typed mapping gaps before Program-specific GO details.
- Reset legacy General Education CILO-to-GO rows through one explicit irreversible migration, after reporting the exact deletion predicate and count.

**Non-Goals:**

- ILO-to-GO crosswalks, dual CILO mappings, common-outcome attainment rollups, or any automatic propagation from ILOs to Program GOs.
- Versioning ILOs, GOs, CILOs, or mappings by Curriculum Version or Academic Period.
- Allowing Faculty to create, edit, reorder, archive, or restore ILOs or GOs.
- Allowing Program Heads to mutate mapping rows through the existing mapping route.
- Replacing the existing Course-level CILO ownership model with Faculty-, section-, or assignment-specific CILO records.
- Moving mapping into evaluation question binding or requiring a new mapping for every General Education Course Assignment.
- Offline caching, client-owned shared server state, real-time collaboration, or a new state-management dependency.
- Historical rewriting of completed-period snapshots or published evaluation snapshots.

## Decisions

### 1. Keep three explicit outcome concepts

Use these canonical terms:

- **Institutional Learning Outcome (ILO):** a college-wide outcome common to all Academic Programs.
- **Graduate Outcome (GO):** an outcome owned by one Academic Program.
- **Course Intended Learning Outcome (CILO):** a Course-level outcome owned operationally by Faculty in taught Course contexts but stored independently of Course Assignments.

Do not revive the historical `plos` table or call the new shared catalog PLO. The old PLO-era tables and nullable mapping columns were removed by the historical cleanup migration; current Prisma and generated Supabase types contain no PLO model.

### 2. Use separate typed mapping relations

Add an `InstitutionalOutcome` model and a dedicated `CILOInstitutionalOutcomeMapping` model. Retain `CILOMapping` for Program-specific CILO-to-GO links.

Conceptual Prisma shape:

```prisma
model InstitutionalOutcome {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  code        String
  description String
  order       Int      @default(0)
  is_active   Boolean  @default(true)
  created_at  DateTime @default(now())
  updated_at  DateTime @updatedAt

  mappings CILOInstitutionalOutcomeMapping[]

  @@unique([code])
  @@map("institutional_outcomes")
}

model CILOInstitutionalOutcomeMapping {
  id                     String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  cilo_id                String   @db.Uuid
  institutional_outcome_id String  @db.Uuid
  created_by              String?  @db.Uuid
  updated_by              String?  @db.Uuid
  created_at              DateTime @default(now())
  updated_at              DateTime @updatedAt

  cilo                 CILO                @relation(fields: [cilo_id], references: [id], onDelete: Cascade)
  institutionalOutcome InstitutionalOutcome @relation(fields: [institutional_outcome_id], references: [id], onDelete: Restrict)
  creator              User?                @relation("CILOInstitutionalMappingCreator", fields: [created_by], references: [id], onDelete: SetNull)
  updater              User?                @relation("CILOInstitutionalMappingUpdater", fields: [updated_by], references: [id], onDelete: SetNull)

  @@unique([cilo_id, institutional_outcome_id])
  @@index([cilo_id])
  @@index([institutional_outcome_id])
  @@map("cilo_institutional_outcome_mappings")
}
```

The existing `CILOMapping` receives `updated_at` and provenance fields. Existing rows without historical actor data remain explicitly legacy/unattributed; all new and changed rows require the authenticated actor. Do not fabricate an actor for legacy rows. If the final migration proves a safe existing actor backfill is available, it may tighten nullability in a follow-up migration, not by inventing attribution.

`InstitutionalOutcome` uses a stable unique code across active and archived records. Archive is soft state; hard deletion is not exposed.

### 3. Enforce target scope in both service and database

The server derives target type from the Course:

```text
CourseScope.GENERAL_EDUCATION  -> CILOInstitutionalOutcomeMapping only
CourseScope.PROGRAM_SPECIFIC    -> CILOMapping only
```

Service validation returns safe domain errors before writes. SQL migration functions/triggers reject direct writes that violate the same invariant:

- An institutional mapping requires a CILO whose Course is `GENERAL_EDUCATION`.
- A GO mapping requires a CILO whose Course is `PROGRAM_SPECIFIC` and a GO whose `program_id` equals `Course.program_id`.
- Institutional outcomes and GOs must be active for new mappings.
- Duplicate pairs fail through database uniqueness and are translated to safe errors.

The database trigger is an integrity backstop, not an authorization mechanism. Server-side role and scope checks remain mandatory because the application owns identity and Course Assignment authorization.

### 4. Separate governance from mapping responsibility

Authorization is explicit:

| Operation | SECRETARY | DEAN | PROGRAM_HEAD | FACULTY |
|---|---:|---:|---:|---:|
| Institutional Outcome CRUD/reorder/archive/restore | yes, college-wide | no | no | no |
| Graduate Outcome CRUD/reorder/archive/restore | yes, college-wide | no | yes, assigned Program | no |
| CILO CRUD | yes, college-wide | no | no | active taught Course |
| General Education CILO → ILO mapping | yes, college-wide | no | no | active taught Course |
| Program-specific CILO → GO mapping | yes, college-wide | no | read-only | active taught Course |
| Mapping/readiness review | yes | read-only | read-only | own taught Courses |

Faculty authorization requires an active Course Assignment owned by the current Faculty user for the Course and an active Academic Period. Because General Education mappings are shared at Course level, any actively assigned Faculty member may edit the shared mapping set; the editor explicitly warns that the change affects every General Education assignment using that Course.

Secretary writes use the existing protected prepare → exact before/after review → explicit confirmation → serializable commit pattern. Faculty Course-level bulk alignment uses the same freshness and atomicity guarantees, but presents a Course-specific diff instead of a record-by-record form.

### 5. Make alignment Course-level and atomic

Add a server-only read model such as `readFacultyCourseAlignment(courseId)` that returns:

- Course identity and scope.
- Inferred target type.
- Owning Program and active target catalog for Program-specific Courses.
- Active Institutional Outcome catalog for General Education Courses.
- Active CILOs and each CILO's current mapped targets.
- Course-level readiness status and per-CILO missing-target status.
- Shared-impact warning for General Education.
- Last known mapping provenance where available.

Add a Course-level write gateway such as `prepareCourseAlignmentWrite` / `commitCourseAlignmentWrite`. The client submits desired target IDs grouped by CILO; the server re-derives Course scope and valid target IDs, computes additions/removals, signs the full before/after review, rechecks freshness and authorization inside a serializable transaction, then inserts/deletes all changes atomically. A failed transaction leaves every mapping unchanged.

The existing per-row Program Head mapping controls are not reused as the primary Faculty editor because they would cause one request per checkbox and expose mixed authorization semantics. Their review-summary pattern can be reused conceptually.

### 6. Use a URL-backed Faculty detail route

Keep `/faculty/cilos` as the Course discovery and CILO management route. Add a nested Course alignment route, for example:

```text
/faculty/cilos/[courseId]/alignment
```

The page is a Server Component that authorizes and prepares the Course alignment read model. A narrow Client Component owns local multi-select state, unsaved changes, review confirmation, keyboard interaction, and pending/error states.

Use existing Base UI/shadcn primitives and add only missing project components through the project package runner:

- `Card`, `Badge`, `Alert`, `Button`, `Skeleton`, `Separator` for structure and state.
- `Popover` + `Command`-style searchable target list for multi-select.
- `Checkbox` semantics for selected target rows.
- `AlertDialog` or an equivalent titled confirmation surface for the exact diff.
- `Empty` for no active target catalog and no-CILO states.

Target rows show code and full statement, not code alone. Controls have visible labels, keyboard navigation, selected counts/chips, visible focus, minimum 44px interactive targets, `aria-selected`/checkbox state, and no color-only readiness meaning. Loading uses structural skeletons; errors include recovery guidance; unsaved dismissal is confirmed; reduced-motion preferences are respected.

The Secretary catalog route is role-owned, for example `/secretary/learning-outcomes`, with a dedicated Institutional Outcomes section. The Dean route remains `/dean/college-oversight/learning-outcomes` and adds read-only ILO coverage. The existing Program Head mapping route remains reachable for bookmark continuity but becomes a read-only review surface; its mutation controls and mapping server actions are removed or made unavailable to PROGRAM_HEAD.

### 7. Define target-specific readiness

For active periods, each unique `(Course, Academic Program)` context remains the readiness denominator. Classification changes to:

```text
No active CILOs                         -> missing-cilos
Any active CILO lacks valid target     -> incomplete-mapping
Every active CILO has valid target     -> ready
```

Valid target is determined by Course scope:

- General Education: at least one active Institutional Outcome mapping.
- Program-specific: at least one active GO mapping whose GO belongs to the Course's owning Program.

A General Education Course's shared ILO mappings apply automatically to every active Course Assignment context. Adding an assignment does not create a second mapping workload; it creates another readiness context using the same Course-level mapping set.

Archived ILOs/GOs remain visible in historical and administrative views but never satisfy active readiness or new publication. A CILO mapped only to archived targets is incomplete.

The readiness context payload adds an explicit `targetType`, typed mapped/missing target IDs, and target catalog details. Existing `missingGraduateOutcomeIds` is replaced or supplemented by a target-neutral representation so Dean views cannot imply that General Education gaps are GO gaps.

### 8. Version readiness snapshots for the semantic cutover

Extend `AcademicPeriodReadinessSnapshot` with a schema version. Existing completed snapshots remain immutable version 1 legacy payloads and are not reinterpreted as ILO alignment. New snapshots use version 2 and contain target type, typed target IDs, active/archived state at completion, affected CILOs, and program totals.

`readPeriodReadiness` must branch on snapshot schema version:

- Version 1: preserve existing historical payload interpretation and labels.
- Version 2: validate/return the typed target payload.

Live active-period reads always use the new target-specific projection. Completing an Academic Period writes one immutable version 2 snapshot. The existing database trigger/RLS protections remain in force.

### 9. Gate Course-bound evaluation publication

During Course-bound publication, after resolving the locked Course Assignment and before creating the deployment, the transaction calls the target-specific alignment validator. It rejects publication if any active CILO lacks a valid active target for the Course scope. The safe error names the Course and directs the Faculty to the Course alignment route. Existing evaluation snapshots remain CILO/question snapshots; mapping state is not retroactively injected into already published evaluations.

### 10. Migration and seed sequence

Do not edit historical SQL migrations. Add a new migration after the current schema baseline:

1. Preflight and report the count of legacy General Education rows matching `CILOMapping` through `CILO.course_scope = GENERAL_EDUCATION`.
2. Delete exactly those rows in the same migration transaction. This is the selected irreversible cutover; no backup table is retained.
3. Add Institutional Outcome tables, typed mapping table, provenance columns, indexes, foreign keys, and scope triggers.
4. Add readiness snapshot schema version with existing rows defaulted to version 1.
5. Apply database access policy/RLS decisions consistent with the existing server-authorized outcome tables; do not create anonymous write access.
6. Regenerate Supabase types and Prisma client through the documented workflow.
7. Update fixtures and seed runners with common ILO catalog records and General Education CILO-to-ILO links. Preserve existing Program-specific GO mappings.
8. Run demo reset/seed verification and focused migration integrity tests before broader validation.

The deletion is semantically destructive but structurally safe for current foreign keys: no current table references `CILOMapping` rows, published evaluation bindings snapshot CILO text rather than mappings, and completed readiness snapshots are immutable JSON. The migration still requires a reviewed count and dry-run because live General Education readiness will become incomplete until ILO mappings are seeded or authored.

### 11. Exact affected paths

**Create or modify:**

- `prisma/models/outcomes.prisma`
- `prisma/models/academic-calendar.prisma`
- `prisma/models/identity-access.prisma` if actor relation names are required
- `supabase/migrations/<timestamp>_introduce_institutional_outcomes_and_typed_mappings.sql`
- `src/features/outcomes/services/manage-institutional-outcomes.ts`
- `src/features/outcomes/services/manage-cilo-mappings.ts`
- `src/features/outcomes/services/manage-outcome-writes.ts`
- `src/features/outcomes/services/read-course-alignment.ts`
- `src/features/outcomes/services/write-course-alignment.ts`
- `src/features/outcomes/types.ts`
- `src/features/outcomes/schemas/*`
- `src/features/academic-calendar/services/read-period-readiness.ts`
- `src/features/evaluations/services/publish-course-bound-evaluation.ts`
- `src/features/evaluations/services/list-faculty-courses-with-cilos.ts`
- `src/features/evaluations/components/faculty-cilos-course-list.tsx`
- `src/features/evaluations/components/faculty-course-alignment-editor.tsx`
- `src/app/(app)/faculty/cilos/[courseId]/alignment/page.tsx`
- `src/app/(app)/faculty/cilos/[courseId]/alignment/loading.tsx`
- `src/app/(app)/secretary/learning-outcomes/page.tsx`
- `src/features/outcomes/components/institutional-outcomes-page.tsx`
- `src/features/outcomes/components/institutional-outcome-form-dialog.tsx`
- `src/features/outcomes/components/faculty-course-alignment-editor.tsx` if kept under Outcomes instead of Evaluations
- `src/app/(app)/dean/college-oversight/learning-outcomes/page.tsx`
- `src/features/dean/services/read-dean-oversight.ts`
- `src/features/outcomes/components/program-head-mapping-controls.tsx` or its replacement read-only component
- `src/app/(app)/program-head/programs/[programId]/outcomes/mapping/page.tsx`
- `src/lib/actions/*outcome-actions.ts`
- `src/lib/constants/navigation.ts`
- `prisma/seed/runners/seed-outcomes.ts`
- `prisma/seed/fixtures/outcomes.ts`
- `src/types/supabase-database.ts` (generated only, via `pnpm supabase:types`)
- `CONTEXT-MAP.md`, relevant feature `CONTEXT.md`, and `docs/adr/0005-outcome-ownership-and-dean-oversight.md`
- Focused tests under `src/__tests__/features/outcomes`, `src/__tests__/features/academic-calendar`, `src/__tests__/features/evaluations`, `src/__tests__/components/outcomes`, `src/__tests__/components/evaluations`, `src/__tests__/app`, and migration/schema tests.

### 12. Cache matrix

| Read | Key | Scope/lifetime | Invalidation | Authorization | Stale behavior |
|---|---|---|---|---|---|
| Secretary ILO catalog | none | request-scoped, no persistent cache | not applicable | active SECRETARY session | refetch on navigation/action |
| Faculty Course alignment | none | request-scoped, no persistent cache | `revalidatePath` after Course alignment or CILO/target writes | active FACULTY assignment or SECRETARY | stale client review rejected by freshness token |
| Dean Learning Outcomes | none | request-scoped `private, no-store` | not applicable | active DEAN session | refetch per request |
| Active readiness | none | request-scoped | Course/CILO/mapping/assignment write revalidation | server-authorized caller | live calculation; no shared cache |
| Completed readiness snapshot | period-scoped persistent database record | immutable after completion | none | server-authorized reader | snapshot is authoritative historical state |

## Risks / Trade-offs

- **[Breaking data]** Deleting legacy General Education mappings immediately makes affected active contexts incomplete. Mitigation: preflight count, reviewed migration SQL, seed new ILO mappings in the same deployment, and expose clear readiness gaps.
- **[Irreversible migration]** The selected migration retains no recovery table. Mitigation: require explicit migration review and disposable/demo reset verification; do not broaden the deletion predicate beyond General Education CILOs.
- **[Legacy history]** Existing completed snapshots use the old semantic model. Mitigation: schema-version snapshots and preserve version 1 interpretation instead of relabeling old GO links as ILO links.
- **[Concurrent editing]** Multiple Faculty members may edit one shared General Education Course. Mitigation: full Course-level freshness token, serializable transaction, and explicit shared-impact copy.
- **[Provenance gaps]** Existing mapping rows lack actor fields. Mitigation: preserve null legacy actors without fabricated attribution; require actor fields for every new or updated mapping write.
- **[Authorization drift]** Existing Program Head actions and UI assume mapping writes. Mitigation: remove mutation authority from the shared write gateway for PROGRAM_HEAD, replace controls with read-only review, and test all role boundaries.
- **[Database drift]** Historical SQL still contains old PLO-era tables. Mitigation: add new migrations only, update Prisma from current truth, regenerate Supabase types, and add migration-ledger/schema tests.
- **[Publication behavior]** Existing templates may be publishable while alignment is incomplete. Mitigation: gate only new Course-bound publication and provide a direct repair route; do not rewrite already published deployments.
- **[UX density]** A multi-CILO, multi-target editor can overwhelm Faculty. Mitigation: one Course route, target-specific catalog, per-CILO searchable multi-select, progressive disclosure, concise diff review, skeleton/error/empty states, and responsive layout.
- **[Future reporting]** Without ILO-to-GO crosswalks, ILO alignment cannot yet be rolled into Program GO attainment. Mitigation: state the boundary in UI and ADR; defer crosswalk design rather than introducing polymorphic placeholder schema.

## Migration Plan

1. Review and approve this change and the amended outcome ownership ADR.
2. Update Prisma models and generate a migration diff; inspect the exact legacy General Education deletion predicate.
3. Apply migration through `pnpm supabase:push:dry-run`, then push only after reviewing the destructive statement and constraints.
4. Regenerate `src/types/supabase-database.ts` and Prisma client.
5. Update server services, typed write gateway, readiness projection, publication gate, and role authorization.
6. Update seed fixtures with Institutional Outcomes and General Education ILO mappings; verify demo reset and idempotent seed.
7. Ship Secretary catalog, Faculty Course alignment, Program Head read-only review, and Dean oversight surfaces with focused tests.
8. Run focused Vitest tests, `pnpm lint`, `pnpm test`, and `pnpm build`; run browser verification for Faculty mapping, Secretary catalog, Dean read-only oversight, and publication blocking.

Rollback is application rollback plus database recovery from the pre-migration database backup. Because the selected legacy mapping deletion is irreversible within the migration itself, deployment must not proceed without an operator-confirmed backup and reviewed dry-run count, even though the change does not retain an application-level recovery table.
