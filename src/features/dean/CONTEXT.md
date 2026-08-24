# Dean Oversight

Dean Oversight defines the Dean's college-wide read model over course-alignment readiness and mapping gaps for a selected academic period.

## Language

**Oversight read model**:
The period-scoped, college-wide, read-only projection of readiness and mapping gaps served to the DEAN role. It returns either ready data for a selected period or `no-eligible-period`; eligible periods are ACTIVE or COMPLETED AcademicTermInstances (uses the active-period and completed-period semantics defined by Academic Calendar).
_Avoid_: Live per-program analytics, editable oversight

**Readiness KPIs**:
The dashboard and per-program counts of active contexts, ready contexts, missing-cilo contexts, and incomplete-mapping contexts, aggregated for the selected period (uses the readiness semantics defined by Outcomes).
_Avoid_: Course counts, assignment counts

**Risk bucket**:
A coarse filter classifying a course's alignment risk as `missing-cilos`, `incomplete-mappings`, or `not-ready`; `not-ready` is any context whose state is not `ready`. Buckets derive from the Outcomes readiness states but are a dean-view classification, not a separate readiness computation.
_Avoid_: Readiness state (when referring to the Outcomes classifier's exact `ready`/`missing-cilos`/`incomplete-mapping` states)

**Mapping gap**:
A course-level gap row surfaced per program for the selected period, carrying a reason (`missing-cilos` or `incomplete-mapping`) and the missing Program Learning Outcome and Institutional Outcome references. General Education gaps are labeled as Institutional Outcome gaps, never as missing Program PLOs.
_Avoid_: Readiness issue, alignment warning

**Archived outcome display**:
The period-status-dependent visibility of archived outcomes in the Dean's learning-outcomes view: in COMPLETED periods archived targets remain visible and are labeled `(Archived)`, while in ACTIVE periods archived targets are hidden.
_Avoid_: Live catalog view, uniform archive filtering

**Roster page**:
A fixed 25-per-page view of student enrollments for one course assignment in the selected period, supporting name search and explicit page selection; it exposes student names only, never other response or enrollment data.
_Avoid_: Full roster dump, paginated class list with sensitive fields
