## Context

The outcomes domain has three layers: Institutional Learning Outcomes (college-wide), Graduate Outcomes (program-owned), and CILOs (course-owned). Program-specific Courses map CILOs to GOs through `cilo_mappings` rows with a unique CILO/GO pair constraint and a SQL trigger enforcing program scope. The alignment workspace (`manage-course-alignment.ts`) treats mapping as selected/unselected target id arrays, prepares a before/after review, and commits atomically under Serializable with a freshness token. Readiness (`classify-course-alignment.ts`) requires at least one valid active target per active CILO. The Secretary holds college-wide correction authority over both typed mapping relations and the ILO catalog.

This change replaces the binary model with exhaustive, typed classification: every active CILO gets a manifestation (LEARNING, PRACTICE, OPPORTUNITY) for every active PLO, renames GO to PLO, and removes the Secretary from the workflow. Full motivation and requirements live in the proposal and the five capability specs. The source specification is `docs/CILO to PLO manifestation implementation specification.md`.

## Goals / Non-Goals

**Goals:**

- Exhaustive manifestation mapping with draft saves, review, confirmation, and stale-write protection.
- PLO terminology across visible surfaces, glossary, and domain symbols.
- Readiness that matches the exhaustive rule, including the publication gate.
- Secretary removal at route, navigation, and service-authorization layers.

**Non-Goals:**

- Attainment calculation, analytics behavior, manifestation weighting, approval workflow, historical manifestation versioning, ILO manifestation support, destructive ILO schema deletion.

## Decisions

### D1. Manifestation column is transitional nullable; unanswered pairs are absent rows

`CILOMapping` gains `manifestation CILOMappingManifestation?` and `updated_at DateTime?`. Existing rows migrate with null manifestation and display as unanswered. New writes always supply a value. Unanswered pairs are the absence of a row, not a null manifestation. Once all preserved rows are classified, a follow-up migration enforces NOT NULL.

Alternatives: destructive reset with required column from day one (rejected: destroys real mapping data and skips the "legacy incomplete" visibility requirement); null manifestation as the standing draft marker (rejected: conflates legacy rows with draft gaps and blocks the NOT NULL endgame).

### D2. PLO rename in Prisma only, physical names preserved

`GO` model becomes `PLO` with `@@map("gos")`; `go_id` becomes `plo_id` with `@map("go_id")`. Domain symbols (`listProgramGOs`, `go-form-dialog.tsx`, `schemas/go.ts`) rename to PLO. The rename sweep follows compiler errors after the model rename and includes mechanical fixes in analytics per the spec's out-of-scope clause.

Alternative: physical table and column rename in the same change. Rejected: extra migration risk for zero behavioral gain.

### D3. One diff engine, two write modes

The commit engine already diffs submitted state against stored rows. Extend the diff with an update operation for manifestation changes and run it in two modes:

```
saveDraft(cells)    = diff + apply over active CILOs x active PLOs (create/update/delete), no completeness gate
commit(review)      = same diff + completeness gate + review signature + confirmation
```

Draft saves persist cleared cells as deletions, scoped strictly to the active Cartesian set. Rows on archived outcomes are never touched by either mode. Both modes share the freshness token and Serializable transaction.

Alternative: separate draft and commit write paths. Rejected: duplicates validation and the stale-write comparison.

### D4. Freshness token covers manifestations and catalog membership

The token becomes: sorted active CILO ids, sorted active PLO ids, and sorted (ciloId, ploId, manifestation) triples. Catalog membership in the token makes a mid-edit archive read as a stale review instead of a raw validation failure.

### D5. Readiness reuses the classifier with a new exhaustive rule

`classify-course-alignment.ts` gains: program-specific readiness requires a non-null manifestation for every active pair. Zero active PLOs with active CILOs is incomplete, not vacuously ready. General Education keeps the at-least-one ILO rule. The publication gate and Program Head badges consume the classifier unchanged. `AcademicPeriodReadinessSnapshot.schema_version` bumps to 2; version 1 snapshots keep the legacy interpretation and are never rewritten.

### D6. Secretary authorization removed at both layers, dead code deleted

Remove Secretary from `roleAllowsAlignmentAccess` in `manage-course-alignment.ts` and from `scopeAllows` for MAPPING and ILO_MAPPING in `manage-outcome-writes.ts`. After removal the generic MAPPING/ILO_MAPPING branches and the Secretary ILO CRUD (`manage-institutional-outcomes.ts`, institutional outcome actions, ILO catalog UI) have no remaining caller and are deleted. GE Faculty alignment survives because it flows through `manage-course-alignment.ts`, not the generic gateway.

### D7. Shared editor branches on course scope

`CourseAlignmentEditor` keeps the checkbox model for General Education and gains the manifestation matrix (desktop) and CILO cards (mobile) for Program-specific Courses. Save is always available; Review is gated on completeness. The review dialog renders manifestation changes as "Learning (L) to Practice (P)". No new `use client` boundaries: the editor is already a client component; pages stay Server Components.

### D8. Durable decisions recorded in an ADR

The GO to PLO terminology canon and the Secretary exit from outcome stewardship reverse cross-cutting constraints. Record both in a new ADR under `docs/adr/`. `src/features/outcomes/CONTEXT.md` is rewritten in the same change as the domain glossary.

## Files

Modify:

- `prisma/models/outcomes.prisma`
- `prisma/seed/fixtures/outcomes.ts`, `prisma/seed/runners/seed-outcomes.ts`
- `src/features/outcomes/CONTEXT.md`
- `src/features/outcomes/services/manage-course-alignment.ts`
- `src/features/outcomes/services/manage-outcome-writes.ts`
- `src/features/outcomes/services/manage-cilo-mappings.ts`
- `src/features/outcomes/services/classify-course-alignment.ts`
- `src/features/outcomes/services/manage-program-head-outcomes.ts`
- `src/features/outcomes/components/course-alignment-editor.tsx`
- `src/features/outcomes/components/program-head-outcomes-page.tsx`
- `src/features/outcomes/components/go-form-dialog.tsx` (rename to `plo-form-dialog.tsx`)
- `src/features/outcomes/schemas/go.ts` (rename to `plo.ts`)
- `src/lib/actions/course-alignment-actions.ts`
- `src/lib/actions/program-head-outcome-actions.ts`
- `src/lib/constants/navigation.ts`
- `src/app/(app)/faculty/cilos/[courseId]/alignment/page.tsx`
- `src/app/(app)/program-head/programs/[programId]/outcomes/page.tsx`
- `src/app/(app)/program-head/programs/[programId]/outcomes/mapping/page.tsx`
- analytics and oversight consumers of the `GO` model (mechanical rename fixes, located via compiler)
- tests: `src/__tests__/app/program-head-outcome-routes.test.tsx`, `src/__tests__/lib/navigation.test.ts`, `src/__tests__/lib/actions/course-alignment-actions.test.ts`

Delete (after verifying no remaining callers):

- `src/app/(app)/secretary/learning-outcomes/page.tsx`
- `src/app/(app)/secretary/learning-outcomes/alignment/[courseId]/page.tsx`
- `src/app/(app)/secretary/learning-outcomes/loading.tsx`
- `src/app/(app)/secretary/learning-outcomes/alignment/[courseId]/loading.tsx`
- `src/features/outcomes/components/course-alignment-administration-list.tsx`
- `src/features/outcomes/components/institutional-outcomes-page.tsx`
- `src/features/outcomes/components/institutional-outcome-form-dialog.tsx`
- `src/features/outcomes/services/manage-institutional-outcomes.ts`
- `src/features/outcomes/schemas/institutional-outcome.ts`
- `src/lib/actions/institutional-outcome-actions.ts` (verify exact path during implementation)
- `src/__tests__/app/secretary-learning-outcomes-route.test.tsx`
- `src/__tests__/app/secretary-course-alignment-route.test.tsx`

Add:

- new Prisma migration via `pnpm supabase:migration:diff -- add_cilo_mapping_manifestation`
- `src/features/outcomes/components/` manifestation matrix and picker client components
- new ADR under `docs/adr/`

## Write flow

```
Faculty edits cells (client draft)
        |
        |  Save progress            |  Review (only when complete)
        v                           v
 saveDraftAction            prepareCourseAlignmentWrite
        |                           |
        |  diff, no gate            |  completeness gate, before/after review
        v                           v
   apply diff (Serializable)    confirm -> commitCourseAlignmentWrite
        |                           |
        |  token check              |  token recheck, scope revalidation
        v                           v
     rows changed               rows changed atomically
```

No caching is added or changed. Existing caches are unaffected.

## Risks / Trade-offs

- **Rename sweep collides with in-flight changes** (`ship-program-head-analytics-ai`, `refactor-academic-calendar-state`, `introduce-institutional-learning-outcomes`). → Sequence this change after those land; confine the sweep to compile fixes, no behavior edits.
- **Transitional nullable requires a follow-up migration** to enforce NOT NULL. → Accepted; it preserves data and powers the legacy-incomplete display. Follow-up migration scheduled once all rows are classified.
- **Draft saves can flip readiness to complete without the review ceremony.** → Readiness reads rows, so a full grid saved as a draft counts as complete. Acceptable: the state is genuinely complete; the review remains the confirmation ceremony.
- **Delete path returns in draft saves** and could drop rows if diff scope is wrong. → Diff scope is computed server-side from active CILOs and active PLOs only; archived rows are excluded from the comparison. Tests pin this.
- **ILO catalog becomes unowned after Secretary removal.** → Default: catalog is static and seed-managed. Open question below if the product needs a new owner.

## Migration Plan

1. Edit `prisma/models/outcomes.prisma` (enum, fields, rename with mappings).
2. `pnpm supabase:migration:diff -- add_cilo_mapping_manifestation`.
3. Review generated SQL: enum type creation, nullable column, `updated_at`, and that the `cilo_mappings_scope_check` trigger and unique index survive.
4. `pnpm supabase:push:dry-run`, then `pnpm supabase:push`.
5. `pnpm supabase:types`.

Rollback: the schema change is additive and nullable; rollback is a code revert only. The enum type can be dropped in a later cleanup migration.

## Open Questions

- Sequencing against in-flight changes: default is land after `refactor-academic-calendar-state` and `ship-program-head-analytics-ai`.
- ILO ownership after Secretary removal: default is static, seed-managed catalog with no administrator until a future change assigns one.
