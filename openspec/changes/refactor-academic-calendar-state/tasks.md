## 1. Database Schema Migration

- [ ] 1.1 Add `is_active`, `active_semester`, `active_semester_activated_by`, `active_semester_activated_at` to `prisma/models/academic-calendar.prisma` SchoolYear model
- [ ] 1.2 Run `pnpm supabase:migration:diff -- add_school_year_active_state` and review generated SQL
- [ ] 1.3 Add partial unique index `one_active_school_year` on `school_years(is_active) WHERE is_active = true` in migration
- [ ] 1.4 Add CHECK constraint `school_years_active_semester_check` that `active_semester IS NULL` when `is_active = false` in migration
- [ ] 1.5 Add foreign key `active_semester_activated_by` → `users(id)` with `ON DELETE SET NULL` in migration
- [ ] 1.6 Add migration to alter `course_assignments.course_id` FK from CASCADE to RESTRICT
- [ ] 1.7 Run `pnpm supabase:push:dry-run` and `pnpm supabase:push`
- [ ] 1.8 Run `pnpm supabase:types` to regenerate `src/types/supabase-database.ts`
- [ ] 1.9 Run `pnpm exec prisma generate`

**Scope:** `prisma/models/academic-calendar.prisma`, `supabase/migrations/`, `src/types/supabase-database.ts`
**Verification:** `pnpm exec prisma validate --schema prisma`, `pnpm lint`
**Commit:** `refactor(academic-calendar): add school year active state and canonical structure schema`

## 2. Canonical Term Structure & Backfill

- [ ] 2.1 Define `CANONICAL_TERMS` constant: 5 period definitions (semester + term pairs)
- [ ] 2.2 Add `isStructuralTerm(termInstance)` predicate to `policies.ts`
- [ ] 2.3 Refactor `createSchoolYear` in `manage-school-years.ts` to transactionally create SchoolYear + 5 canonical AcademicTermInstances
- [ ] 2.4 Add Zod schema for canoncial term IDs validation to `schemas/school-year.ts`
- [ ] 2.5 Backfill missing canonical term instances for existing School Years (idempotent, skip existing)
- [ ] 2.6 Remove `addTermInstance` from `manage-term-instances.ts` and `secretary-school-year-actions.ts`
- [ ] 2.7 Update `deleteTermInstance` to block deletion of canonical (structural) terms; allow only legacy non-canonical deletions
- [ ] 2.8 Update `server-actions/schemas/server-action-schemas.ts` to remove add-term and delete-term action schemas
- [ ] 2.9 Write unit tests for `isStructuralTerm`, canonical creation, and backfill
- [ ] 2.10 Verify seed data produces valid canonical structure

**Scope:** `src/features/academic-calendar/services/manage-school-years.ts`, `manage-term-instances.ts`, `policies.ts`, `src/lib/actions/secretary-school-year-actions.ts`, `prisma/seed/`
**Verification:** `pnpm test`, `pnpm lint`
**Commit:** `feat(academic-calendar): canonical 5-term structure per school year`

## 3. School Year Lifecycle Services

- [ ] 3.1 Add `activateSchoolYear(schoolYearId)` service — SECRETARY-gated, atomically deactivates prior active
- [ ] 3.2 Add `deactivateSchoolYear(schoolYearId)` service — rejects if contains ACTIVE period, clears `active_semester`
- [ ] 3.3 Add `setActiveSemester(schoolYearId, semester)` service — rejects if School Year not active
- [ ] 3.4 Add `canActivateSchoolYear`, `canDeactivateSchoolYear`, `canSetActiveSemester` to `policies.ts`
- [ ] 3.5 Add `activateSchoolYearAction`, `deactivateSchoolYearAction`, `setActiveSemesterAction` to Server Actions
- [ ] 3.6 Update `setActiveTermInstance` to validate School Year is active and semester matches before delegation to `transitionPeriodStatus`
- [ ] 3.7 Write unit tests for all new lifecycle services and policies
- [ ] 3.8 Write integration test for concurrent school-year activation (P2002)

**Scope:** `src/features/academic-calendar/services/manage-school-years.ts`, `manage-term-instances.ts`, `manage-academic-period-lifecycle.ts`, `policies.ts`, `src/lib/actions/secretary-school-year-actions.ts`
**Verification:** `pnpm test`, `pnpm lint`, `pnpm build`
**Commit:** `feat(academic-calendar): school year and semester activation lifecycle`

## 4. Active Academic Context Read Model

- [ ] 4.1 Create `resolve-active-academic-context.ts` with `resolveActiveAcademicContext()` returning `ActiveAcademicContext`
- [ ] 4.2 Add `ActiveAcademicContext` type to `types.ts`
- [ ] 4.3 Refactor `resolveActiveTerm`, `getActiveTermId`, `hasActiveTerm` in `resolve-active-term.ts` to delegate from `resolveActiveAcademicContext`
- [ ] 4.4 Add `ACTIVE_SCHOOL_YEAR_TAG` to `src/lib/cache/academic-periods.ts`
- [ ] 4.5 Update `invalidateAcademicPeriodReadModelTags` to include school-year tag when school-year state changes
- [ ] 4.6 Audit all `getActiveTermId`/`hasActiveTerm` consumers — verify no behavioral change

**Scope:** `src/features/academic-calendar/services/resolve-active-term.ts`, `resolve-active-academic-context.ts` (new), `types.ts`, `src/lib/cache/academic-periods.ts`
**Verification:** `pnpm test`, `pnpm build`
**Commit:** `feat(academic-calendar): centralized active academic context read model`

## 5. Rollover Year-Level Preservation

- [ ] 5.1 Add school-year comparison logic to `runTermRollover` — if `sourceTerm.school_year_id === targetTerm.school_year_id`, skip promotion
- [ ] 5.2 Update `previewTermRollover` with same logic for dry-run
- [ ] 5.3 Write tests: same-year First→Second Term preserves year, same-year First Sem→Second Sem preserves year, same-year Second Sem→Summer preserves year
- [ ] 5.4 Write tests: cross-year Summer→next First Term promotes, cross-year any→any promotes

**Scope:** `src/features/academic-calendar/services/run-term-rollover.ts`, `src/__tests__/modules/academic-calendar/run-term-rollover.test.ts`
**Verification:** `pnpm test`, `pnpm lint`
**Commit:** `fix(academic-calendar): preserve year level on same-school-year rollover`

## 6. Remove end_date Gate from COMPLETED

- [ ] 6.1 Remove `end_date` null check for COMPLETED target in `manage-academic-period-lifecycle.ts#transitionPeriodStatus`
- [ ] 6.2 Write test: COMPLETED transition succeeds with null `end_date`
- [ ] 6.3 Write test: COMPLETED transition succeeds with set `end_date` (preserved)
- [ ] 6.4 Verify readiness snapshot persistence still works without `end_date`
- [ ] 6.5 Update `settings.ts` (if exists) to remove `end_date` requirement from term settings schema

**Scope:** `src/features/academic-calendar/services/manage-academic-period-lifecycle.ts`
**Verification:** `pnpm test`, `pnpm lint`
**Commit:** `feat(academic-calendar): remove end_date requirement for period completion`

## 7. Historical Deletion Guard — Course FK to RESTRICT

- [ ] 7.1 Verify migration 1.6 created the FK alteration from CASCADE to RESTRICT
- [ ] 7.2 Add pre-migration guard script to detect orphaned `course_assignments` rows (if any exist)
- [ ] 7.3 Write test: deleting Course with assignments is rejected by database FK constraint
- [ ] 7.4 Write test: `manage-courses.ts#deleteCourse` app-layer guard still works with new FK behavior
- [ ] 7.5 Update `manage-courses.ts#deleteCourse` error handling for P2003 (FK violation) to return safe message

**Scope:** `prisma/models/course-assignments.prisma`, `supabase/migrations/`, `src/features/academic-structure/services/manage-courses.ts`
**Verification:** `pnpm test`, `pnpm exec prisma validate`, verify migration SQL manually
**Commit:** `fix(courses): change course-assignment FK from CASCADE to RESTRICT for historical integrity`

## 8. Secretary UI — Structural Calendar View

- [ ] 8.1 Create `src/features/academic-calendar/components/calendar-structure-view.tsx` — Client Component rendering SchoolYear→Semester→Term hierarchy
- [ ] 8.2 Create actions for each lifecycle button (Activate SY, Deactivate SY, Archive SY, Set Active Semester, Activate Period, Complete Period, Cancel Period)
- [ ] 8.3 Wire lifecycle actions to services from Slice 3
- [ ] 8.4 Replace `src/app/(app)/secretary/school-years/client-page.tsx` with structural view
- [ ] 8.5 At `/secretary/school-years/[id]` detail page, render the structural view for that School Year
- [ ] 8.6 Remove `TermInstanceForm` (no longer needed), remove add-term button from UI
- [ ] 8.7 Keep `TermInstancePicker`, `ActiveTermBadge`, `RolloverRunner`, `SetActiveTermDialog` (adapted to new activation flow)
- [ ] 8.8 Write component tests for structural view rendering all 5 terms with correct statuses
- [ ] 8.9 Write component tests for lifecycle action button visibility per state

**Scope:** `src/features/academic-calendar/components/`, `src/lib/actions/secretary-school-year-actions.ts`, `src/app/(app)/secretary/school-years/`
**Verification:** `pnpm test`, `pnpm lint`, `pnpm build`
**Commit:** `feat(academic-calendar): structural calendar view with school year lifecycle controls`

## 9. Cache & Revalidation Updates

- [ ] 9.1 Add `ACTIVE_SCHOOL_YEAR_TAG` to `src/lib/cache/academic-periods.ts`
- [ ] 9.2 Add tag invalidation in `invalidateAcademicPeriodReadModelTags` when School Year or Semester state changes
- [ ] 9.3 Revalidate Secretary school-year routes on lifecycle changes
- [ ] 9.4 Verify Dean oversight routes still get fresh data after school-year state changes

**Scope:** `src/lib/cache/academic-periods.ts`, `src/lib/actions/secretary-school-year-actions.ts`
**Verification:** `pnpm test`, `pnpm build`
**Commit:** `refactor(academic-calendar): extend cache invalidation for school year state`

## 10. Seed Data & Backfill

- [ ] 10.1 Update `prisma/seed/fixtures/academic-calendar.ts` to set `is_active` and `active_semester` on seeded School Years
- [ ] 10.2 Update `prisma/seed/runners/seed-academic-calendar.ts` to use canonical `createSchoolYear` instead of manual term creation
- [ ] 10.3 Add backfill script `scripts/backfill-school-year-active-state.ts`
- [ ] 10.4 Verify `pnpm db:seed` succeeds with new structure
- [ ] 10.5 Verify all seeded enrollments, assignments, evaluations still link correctly

**Scope:** `prisma/seed/`, `scripts/`
**Verification:** `pnpm db:seed`, `pnpm test`
**Commit:** `test(seed): update seed data for canonical academic calendar structure`

## 11. Integration & Regression Tests

- [ ] 11.1 Run all existing academic-calendar tests and fix any broken ones
- [ ] 11.2 Run onboarding tests (depends on `getActiveTermId`)
- [ ] 11.3 Run dean oversight tests (depends on academic period reads)
- [ ] 11.4 Run course-assignment tests (depends on term instance)
- [ ] 11.5 Run evaluation tests (depends on active period)
- [ ] 11.6 Run `pnpm test` full suite and fix any regressions
- [ ] 11.7 Run `pnpm lint` and fix any issues
- [ ] 11.8 Run `pnpm build` and verify no type errors

**Scope:** `src/__tests__/`
**Verification:** `pnpm test`, `pnpm lint`, `pnpm build`
**Commit:** `test: add regression coverage for academic calendar state refactor`

## 12. ADR & Documentation

- [ ] 12.1 Create `docs/adr/0012-secretary-controlled-academic-calendar-state.md`
- [ ] 12.2 Update `src/features/academic-calendar/CONTEXT.md` with new School Year and Semester lifecycle terms
- [ ] 12.3 Update `CONTEXT-MAP.md` if new cross-context dependencies emerged

**Scope:** `docs/adr/`, `src/features/academic-calendar/CONTEXT.md`, `CONTEXT-MAP.md`
**Verification:** Documentation review
**Commit:** `docs(adr): add ADR for secretary-controlled academic calendar state`
