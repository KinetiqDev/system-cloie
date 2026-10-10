# Dean Oversight

Dean Oversight defines the Dean's college-wide read model over course-alignment readiness and mapping gaps for a selected academic period.

## Language

**Oversight read model**:
The period-scoped, college-wide, read-only projection of readiness and mapping gaps served to the DEAN role. It returns either ready data for a selected period or `no-eligible-period`; eligible periods are ACTIVE or COMPLETED AcademicTermInstances (uses the active-period and completed-period semantics defined by Academic Calendar).
_Avoid_: Live per-program analytics, editable oversight, enrollment or roster oversight (removed end to end; out of scope, not deferred)

**Readiness KPIs**:
The dashboard and per-program counts of active contexts, ready contexts, missing-cilo contexts, and incomplete-mapping contexts, aggregated for the selected period (uses the readiness semantics defined by Outcomes).
_Avoid_: Course counts, assignment counts

**Risk bucket**:
A coarse filter classifying a course's alignment risk as `missing-cilos`, `incomplete-mappings`, or `not-ready`; `not-ready` is any context whose state is not `ready`. Buckets derive from the Outcomes readiness states but are a dean-view classification, not a separate readiness computation.
_Avoid_: Readiness state (when referring to the Outcomes classifier's exact `ready`/`missing-cilos`/`incomplete-mapping` states)

**Mapping gap**:
A course-level gap row surfaced per program for the selected period, carrying a reason (`missing-cilos` or `incomplete-mapping`) and the missing Program Outcome and Institutional Outcome references. General Education gaps are labeled as Institutional Outcome gaps, never as missing Program POs.
_Avoid_: Readiness issue, alignment warning

**Archived outcome display**:
The period-status-dependent visibility of archived outcomes in the Dean's learning-outcomes view: in COMPLETED periods archived targets remain visible and are labeled `(Archived)`, while in ACTIVE periods archived targets are hidden.
_Avoid_: Live catalog view, uniform archive filtering

The Learning Outcomes academic-period control uses the shared Base UI Select with wrapped, scrollable options. It preserves the ACTIVE/COMPLETED eligible-period list, submits the `period` query parameter through View period, and retains the risk filter.


**Central outcome stewardship**:
The Dean and Secretary jointly manage the central Common PO catalog and program-local Common and Institution-specific POs. This separate write capability does not make the period-scoped oversight projection editable or grant ILO/Core/Professional authoring. Common-mode GE gaps carry Common target labels, while completed historical ILO snapshots keep their captured labels.
_Avoid_: Blanket outcome write access, editable historical snapshot, Dean ILO author
