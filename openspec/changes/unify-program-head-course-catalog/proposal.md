## Why

The Program Head course catalog (`/program-head/programs/[programId]/courses`) currently deviates from canonical course table conventions (such as `ManagementCoursesList`) by using custom capsule scope tabs, a Type column, and listing General Education courses. Program Heads only manage program-specific courses of their selected program; unifying this table removes visual and operational inconsistency, adds needed schedule columns (Year Level, Semester, Term), and ensures consistent layout across administrative views.

## What Changes

- Catalog lists only Program-specific courses owned by the selected Program; GE catalog entries are removed from this management surface (**BREAKING** for this page only — GE courses remain visible read-only in Program Head course assignments per ADR 0003).
- Replace capsule scope tabs with canonical Select filter bar (Status, Major, search) matching `ManagementCoursesList`.
- Drop Type column; add Year Level, Semester, Term columns; rename Major Scope header to Major; adopt canonical container/header styling and mobile stacking.
- Drop Gen Ed summary card; retain Total Courses, Program-Wide, Major-Specific, and Archived summary cards.
- Remove now-unused `getCourseTypeBadgeClass` export.

## Capabilities

### New Capabilities
- `program-head-course-catalog`: Defines the listing, filtering, schedule attributes presentation, and management invariants for the Program Head course catalog.

### Modified Capabilities
<!-- None -->

## Impact

- **Prisma model & migrations**: None (no schema changes).
- **Generated Supabase types**: None.
- **Authorization & RLS**: Unchanged (Program Head course management remains scoped to program-specific courses of authorized programs).
- **Privacy & Caching**: None.
- **Deployment**: Standard application update.
- **Preserved Invariants**: Program Head course management actions remain restricted to program-specific courses; ADR 0003 assignment stewardship is preserved; Add Course and Edit dialogs, archive/restore toggle, pagination, and empty states remain intact.
