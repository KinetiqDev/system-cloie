## Why

The academic calendar currently tracks active state only at the `AcademicTermInstance` level — there is no explicit Secretary-controlled School Year or Semester activation. The institutional calendar structure (5 canonical terms per School Year: First/First, First/Second, Second/First, Second/Second, Summer/null) is not enforced by data or application logic. Terms are created and deleted arbitrarily through manual CRUD. This makes it impossible to know which School Year or Semester is current, forces consumers to derive context from the active term alone, and allows structurally invalid calendar data.

## What Changes

- Add `is_active` boolean and `active_semester` enum to `SchoolYear` model
- Add audit columns for semester activation
- Create all 5 canonical `AcademicTermInstance` rows transactionally on School Year creation
- Remove support for arbitrary single-term creation and structural term deletion
- Remove `end_date` requirement for COMPLETED lifecycle transition — dates become informational
- Add `resolveActiveAcademicContext()` returning `{ schoolYear, semester, assignmentPeriod }` with backward-compatible `resolveActiveTerm`/`getActiveTermId` seams
- Fix rollover to preserve Year Level within same School Year; promote only cross School Year
- Add DB-level partial unique index: at most one active School Year
- Add DB-level check: inactive School Year cannot retain an active semester
- **BREAKING**: Change `course_assignments.course_id` FK from `ON DELETE CASCADE` to `ON DELETE RESTRICT`
- Replace Secretary Academic Calendar UI with fixed structural view showing School Year → Semester → Term hierarchy with activate/deactivate/archive actions

### Behavioral invariants preserved
- Lifecycle states (PLANNED/ACTIVE/COMPLETED/CANCELLED) and transition rules unchanged
- One active AcademicTermInstance at a time (existing partial unique index)
- Atomic completion of prior ACTIVE period when activating new period
- Readiness snapshot persistence on COMPLETED
- Academic-period cache tags and invalidation hooks
- Rollover idempotency and exception types
- All existing academic-period reads (Dean dashboard, onboarding, auth resolution)

## Capabilities

### New Capabilities
- `school-year-lifecycle`: Secretary activates/deactivates/archives School Years; at most one active School Year
- `active-semester-control`: Secretary sets active semester on a School Year; must be cleared before deactivating School Year
- `canonical-term-structure`: School Year creation atomically creates 5 canonical AcademicTermInstances; structural term deletion removed
- `active-academic-context`: Centralized `resolveActiveAcademicContext()` returning School Year, Semester, and assignment period
- `rollover-year-preservation`: Same School Year rollover preserves Year Level; cross School Year promotes
- `academic-period-completion`: COMPLETED transition no longer requires `end_date`
- `historical-deletion-guard`: `courses` FK to `course_assignments` changed from CASCADE to RESTRICT

### Modified Capabilities
None — no existing academic calendar specifications in `openspec/specs/`.

## Impact

- **Prisma schema**: `prisma/models/academic-calendar.prisma` (SchoolYear new fields, AcademicTermInstance unchanged)
- **Migrations**: Add SchoolYear columns + constraints + indexes; alter `course_assignments.course_id` FK; backfill active SchoolYear/Semester from current ACTIVE period
- **Supabase types**: regenerate after migration
- **Services**: `manage-school-years.ts` (canonical creation), `manage-term-instances.ts` (remove addTermInstance, remove deleteTermInstance structural case), `manage-academic-period-lifecycle.ts` (remove end_date gate), `resolve-active-term.ts` (add resolveActiveAcademicContext), `run-term-rollover.ts` (same-year preservation)
- **Policies**: `policies.ts` (add canActivateSchoolYear, canDeactivateSchoolYear, canSetActiveSemester, canActivatePeriod with school-year + semester checks)
- **Actions**: `secretary-school-year-actions.ts` (new activation/deactivation/semester actions, remove addTerm/deleteTerm actions)
- **UI**: Replace `SchoolYearList`, `TermInstanceForm`, `setActiveTermDialog` with structural calendar view; keep `ActiveTermBadge`, `RolloverRunner`, `TermInstancePicker`
- **Cache**: `lib/cache/academic-periods.ts` (add active-school-year tag)
- **Tests**: Update all existing academic-calendar tests; add new lifecycle/invariant tests
- **Seed**: `prisma/seed/runners/seed-academic-calendar.ts` (use canonical creation, backfill active state)
- **Authorization**: unchanged (Secretary-owned)
