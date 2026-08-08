## Context

The academic calendar currently has no explicit School Year or Semester activation state. The `SchoolYear` model has `is_archived` but no `is_active`. `AcademicSemester` and `AcademicTerm` are enums attached to `AcademicTermInstance`. Active state is only at the term-instance level via `AcademicPeriodStatus`. The Secretary cannot independently declare which School Year or Semester is active.

The institutional calendar has a fixed structure: each School Year contains exactly 5 canonical periods (First/First, First/Second, Second/First, Second/Second, Summer/null). Currently terms are created/deleted arbitrarily through CRUD.

`course_assignments.course_id` has `ON DELETE CASCADE` — deleting a Course silently wipes all its assignments and roster membership history.

## Goals / Non-Goals

**Goals:**
- Introduce Secretary-controlled School Year and Semester activation
- Enforce canonical 5-term structure per School Year at creation time
- Provide `resolveActiveAcademicContext()` as centralized active-context resolution
- Fix rollover to preserve Year Level within same School Year
- Remove `end_date` gate from COMPLETED lifecycle transition
- Change `course_assignments.course_id` FK to RESTRICT for defense-in-depth against historical data loss
- Replace arbitrary term CRUD UI with fixed structural view

**Non-Goals:**
- Do not introduce a `SemesterInstance` table — Semester activation lives on `SchoolYear` as an enum field
- Do not change the 4-state lifecycle (PLANNED/ACTIVE/COMPLETED/CANCELLED)
- Do not change readiness snapshot mechanics
- Do not alter AcademicTermInstance schema beyond what SchoolYear changes require
- Do not modify the `AcademicTermInstance` → `CourseAssignment` or `AcademicTermInstance` → `StudentEnrollment` cascade rules (separate future audit)

## Decisions

### Decision 1: SchoolYear.is_active + active_semester on SchoolYear

Add `is_active` and `active_semester` to `SchoolYear` rather than introducing a separate `SemesterInstance` table.

**Rationale:** Semester has no independent persistent identity or metadata beyond activation state. A column on `SchoolYear` is sufficient and avoids an unnecessary table. The `active_semester` value is always one of `FIRST`, `SECOND`, or `SUMMER` — same enum already used by `AcademicTermInstance.semester`.

**Alternative rejected:** `SemesterInstance` table with its own lifecycle. Over-engineering — Semester is only a selection/activation concern, not an entity with its own lifecycle, dates, or metadata.

### Decision 2: Canonical term creation on SchoolYear creation

Creating a School Year transactionally creates all 5 canonical `AcademicTermInstance` rows with `status = PLANNED`.

**Rationale:** The institutional structure is fixed. Manual arbitrary term creation invites invalid data. Transactional creation guarantees structural correctness. Existing term IDs are preserved; only missing canonical rows are backfilled.

**Alternative rejected:** Keep manual term creation with validation. Validation can be bypassed, and the structure is fixed anyway — enforcement is clearer through creation than through rejection.

### Decision 3: Remove manual add-term and structural delete-term

`addTermInstance` is removed. `deleteTermInstance` is modified to block deletion of canonical terms (all 5 are structural). Deletion of non-canonical legacy terms is preserved as a guard until all data is canonical.

**Rationale:** If the structure is fixed, arbitrary creation must be impossible. Deletion of structural terms would violate the 5-term invariant.

### Decision 4: Remove end_date gate from COMPLETED

The `transitionPeriodStatus` service currently rejects COMPLETED when `existing.end_date` is null. Remove this gate. `end_date` becomes purely informational metadata on `AcademicTermInstance`.

**Rationale:** Stakeholder requirement: dates must not control lifecycle. The academic period completes when the Secretary declares it complete, regardless of whether a date was entered. The existing `end_date` column remains — it is just no longer a prerequisite for COMPLETED.

### Decision 5: rollover preserves Year Level within same School Year

`runTermRollover` currently always promotes Year Level via a static `YEAR_LEVEL_PROMOTION` map. Add a check: if `sourceTerm.school_year_id === targetTerm.school_year_id`, copy the year level unchanged. If different, apply the existing promotion.

**Rationale:** Institutional rule: a student in 2nd Year First Term who moves to 2nd Year Second Term is still 2nd Year. Promotion only happens between School Years.

### Decision 6: Course→CourseAssignment FK: CASCADE→RESTRICT

**Rationale:** The app layer (`manage-courses.ts#deleteCourse`) already blocks deletion when dependents exist (CILOs or CBEs). RESTRICT adds database-level enforcement across all entry points (raw SQL, migrations, bugs). Defense-in-depth for historical data integrity. `CourseAssignment` → `CourseAssignmentMembership` remains CASCADE because assignment deletion is already guarded at the app+DB layer (published evaluation blocks both assignment and membership deletion).

### Decision 7: resolveActiveAcademicContext read model

New service `resolveActiveAcademicContext()` returns:

```ts
type ActiveAcademicContext = {
  schoolYear: { id: string; code: string } | null;
  semester: AcademicSemester | null;
  assignmentPeriod: { id: string; semester: AcademicSemester; term: AcademicTerm | null } | null;
};
```

Existing `getActiveTermId()`, `hasActiveTerm()`, and `resolveActiveTerm()` remain as compatibility seams. `resolveActiveTerm` delegates to `resolveActiveAcademicContext` internally.

**Rationale:** Consumers that only need term ID should not break. New consumers get the full context. Existing consumers are migrated incrementally.

### Decision 8: Secretary UI — fixed structural view

Replace the current expandable `SchoolYearList` with a fixed structural calendar view:

```
A.Y. 2029-2030           [Active] [Deactivate] [Archive]

  First Semester         [Active] [Make Active]
    First Term           COMPLETED
    Second Term          ACTIVE         [Complete] [Cancel]

  Second Semester                
    First Term           PLANNED        [Make Active]
    Second Term          PLANNED

  Summer Semester        
    Summer               PLANNED        [Make Active]
```

Lifecycle actions: Activate/Deactivate/Archive School Year, Set Active Semester, Activate/Complete/Cancel Academic Period. No Add Term or Delete Term buttons.

Server Component for the page with `SchoolYearsClientPage` shell wrapping the structural view client component.

## Risks / Trade-offs

- **[Data]** Backfilling `is_active` and `active_semester` on existing `SchoolYear` rows is lossy if multiple ACTIVE periods span different School Years. Mitigation: backfill from the single ACTIVE period (partial unique index guarantees at most one); if no ACTIVE period exists, leave null.
- **[Migration]** Altering the `course_assignments.course_id` FK from CASCADE to RESTRICT requires dropping and recreating the constraint in a migration. Mitigation: validate no orphaned `course_assignments` rows before migration; dry-run first.
- **[Rollover]** Changing year-level promotion logic changes existing behavior. Mitigation: only the condition changes — promotion is suppressed when school years match. This is a correction, not new logic.
- **[UI]** Removing the add-term/delete-term UI may surprise operators accustomed to manual term management. Mitigation: the fixed structure matches institutional reality; training/announcement.

## Migration Plan

1. **Schema migration**: Add `is_active`, `active_semester`, `active_semester_activated_by`, `active_semester_activated_at` to `school_years`. Add partial unique index `one_active_school_year` on `is_active = true`. Add CHECK constraint: inactive school year must have NULL `active_semester`. Alter `course_assignments.course_id` FK to RESTRICT.
2. **Backfill**: Set `is_active = true` and `active_semester` from current ACTIVE `AcademicTermInstance`'s school year and semester.
3. **Code deploy**: Deploy new services, read model, policies, actions, and UI.
4. **Verification**: Run `pnpm test`, `pnpm lint`, `pnpm build`. Verify Secretary calendar UI, rollover, active-context consumers.
5. **Rollback**: Revert code deploy. Schema changes are additive (new columns) or backward-compatible (RESTRICT is stricter than CASCADE — no application code depends on the cascade behavior directly). The FK change cannot be reverted to CASCADE without another migration, but RESTRICT only blocks deletes that would have been destructive — safe to leave as RESTRICT even on rollback.
