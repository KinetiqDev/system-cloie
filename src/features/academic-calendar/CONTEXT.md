# Academic Calendar

Academic Calendar defines the school-year and period structure used to decide when academic work is active, upcoming, or historical.

## Language

**School year**:
The academic year container for semesters and terms.
_Avoid_: Calendar year

**Semester**:
A major academic period within a school year; regular semesters contain terms, while Summer does not.
_Avoid_: Term when referring to the whole semester

**Academic term**:
The first-term or second-term subdivision of a regular semester.
_Avoid_: Semester, summer term

**Summer semester**:
A semester where academic terms are not applicable.
_Avoid_: Summer term

**Assignment period**:
The academic period used to scope course assignments: a regular-semester academic term, or the Summer semester itself.
_Avoid_: Summer term, calendar period

**Active academic period**:
Exactly the AcademicTermInstance whose status is ACTIVE — at most one exists at any time (partial unique index `one_active_academic_period`). Activation additionally requires the School Year to be active, with `active_semester` matching the period's semester. Legacy "active term" phrasing (`setActiveTermInstance`, `getActiveTermId`, the "Set Active Term" dialog) denotes the same concept.
_Avoid_: Upcoming period, historical period

**Canonical term (structural term)**:
One of the 5 fixed AcademicTermInstance definitions every School Year SHALL contain (First/First, First/Second, Second/First, Second/Second, Summer/null), created transactionally with the School Year. Canonical terms must never be deleted.
_Avoid_: Optional term, ad-hoc term

**Legacy non-canonical term**:
An AcademicTermInstance outside the canonical 5-term set, created by pre-canonical manual CRUD. Remains queryable and date-mutable but cannot be recreated once deleted.
_Avoid_: Structural term

**Canonical term backfill**:
Idempotent service creating only the missing canonical five terms (status PLANNED) on pre-canonical School Years, so every School Year has the canonical structure while legacy non-canonical rows remain untouched.

**Active School Year**:
The single School Year flagged `is_active = true`, carrying the `active_semester` used for live academic work. At most one exists at any time (partial unique index `one_active_school_year`).
_Avoid_: Current year, selected year

**School Year activation**:
The Secretary-controlled flip of a School Year to `is_active = true`, atomically persisting the starting `active_semester` (an inactive School Year cannot hold one) and deactivating any prior active School Year. Rejected while the current active School Year contains an ACTIVE period.
_Avoid_: Year switching, default year

**School Year deactivation**:
The Secretary-controlled flip of the active School Year to `is_active = false`, clearing `active_semester` and its audit fields. Rejected while any of its terms is ACTIVE.
_Avoid_: Disabling the year, archiving

**Active semester**:
The `active_semester` value of the active School Year; the semester within which academic periods may be activated. Changes mid-year require any ACTIVE period in another semester to be completed first.
_Avoid_: Current semester without the active-year qualifier

**Term lifecycle transition**:
The Secretary-controlled status change of an AcademicTermInstance (PLANNED→ACTIVE|CANCELLED, ACTIVE→COMPLETED|CANCELLED). Terminal states are immutable; `end_date` is informational and never gates a transition.
_Avoid_: Term editing, status editing

**Term rollover**:
Secretary-gated operation copying the source term's active student enrollments into a target term. Year level carries unchanged within a School Year and promotes (1st→2nd→3rd→4th→graduating) across School Years. Graduating students and missing data surface as GRADUATING / MISSING_DATA exceptions; duplicate targets are skipped idempotently via skipDuplicates (the `DUPLICATE` exception type is reserved and rendered by the exceptions table but never emitted). Created enrollments carry source ROLLOVER.

**Period readiness snapshot**:
Immutable per-period record of outcome readiness, persisted atomically inside the transaction promoting a period ACTIVE→COMPLETED. A DB trigger forbids UPDATE/DELETE; reads branch on its schema version — version 1 keeps the legacy at-least-one-target semantics, version 2 carries typed payloads under the exhaustive manifestation rule.

**Structural calendar view**:
The fixed Secretary UI rendering School Year → Semester → Term with per-state lifecycle buttons. There are no Add/Delete Term affordances; the 5 canonical terms are enforced by construction.
_Avoid_: Expandable term list, term CRUD screen

**Active state backfill**:
A one-shot script (`scripts/backfill-school-year-active-state.ts`) that derives `is_active` and `active_semester` on existing School Years from the single ACTIVE AcademicTermInstance.
_Avoid_: Manual state migration, production data editing
