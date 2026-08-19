# Outcomes

Outcomes defines the institutional, program, and course learning outcome layers, their typed alignment relations, role responsibilities, and the readiness semantics built on them.

## Language

**Institutional Learning Outcome (ILO)**:
A college-wide learning outcome in the shared Institutional Outcome catalog, owned by the Secretary and applicable to every Academic Program. It has a stable unique code, statement, display order, active/archive state, and timestamps.
_Avoid_: Program Learning Outcome, college-level PLO

**Program Learning Outcome (PLO)**:
A program-level learning outcome owned by exactly one Academic Program; Program Heads administer PLOs within their assigned Program scope. The legacy term "Graduate Outcome" is retired; all code, contracts, and user-visible copy use PLO.
_Avoid_: Graduate Outcome, GO, Institutional outcome, program-level template

**Course Intended Learning Outcome (CILO)**:
A course-level learning outcome that belongs to a Course and is stable across assignment periods; it is never assignment-specific or faculty-owned. Faculty author CILOs for Courses they actively teach.
_Avoid_: Assignment-specific CILO, faculty-owned CILO

**Manifestation**:
The way a CILO contributes to a PLO, carried by every CILO-to-PLO mapping: `LEARNING` (displayed `L`), `PRACTICE` (displayed `P`), or `OPPORTUNITY` (displayed `O`). Manifestations carry no numeric value or weight and feed no attainment calculation.
_Avoid_: Numeric or weighted manifestation, missing manifestation on a mapping

**General Education Course**:
A Course whose CILOs align to the shared Institutional Outcome catalog.
_Avoid_: Program-scoped course, course without an owning program

**Program-specific Course**:
A Course owned by one Academic Program; its CILOs align only to PLOs of that owning Program.
_Avoid_: General Education course, cross-program course

**CILO-to-PLO mapping**:
An alignment row between one CILO and one PLO in the Course's owning Academic Program; every such relationship carries exactly one manifestation. General Education CILOs instead map to the Institutional Outcome catalog; wrong-layer writes are rejected.
_Avoid_: CILO-to-GO, unqualified mapping, dual-layer mapping

**Shared General Education mapping**:
The Course-level CILO-to-ILO mapping set that applies automatically to every active Course Assignment context using that General Education Course; it is never duplicated per Program or per assignment.
_Avoid_: Per-program GE mapping, per-assignment GE mapping

**Course alignment workspace**:
The URL-backed Faculty surface for one Course where active CILOs are staged against the Course scope's valid active target catalog, reviewed as an exact Course-level before/after diff, and committed atomically.
_Avoid_: Mapping form, quick mapping picker

**Course alignment review**:
The staged, exact before/after diff of a Course's complete typed mapping set, confirmed before atomic commit; stale reviews are rejected after another writer changes the Course mappings.
_Avoid_: Immediate write, silent save

**Active mapping target**:
An Institutional Outcome or Program Learning Outcome that is active at the time of a new mapping write; archived targets remain queryable for history but never satisfy live readiness or new publication.
_Avoid_: Archived target, inactive target, wrong-layer target

**Mapping provenance**:
Actor and timestamp records for new or changed typed mapping rows; legacy rows without actor data remain explicitly unattributed and no actor is fabricated.
_Avoid_: Anonymous write, inferred actor

**Outcome readiness**:
The per-(Course, Academic Program) state derived from active Course Assignments: `missing-cilos` (no active CILOs), `incomplete-mapping` (any active CILO fails the typed alignment rule), or `ready` (every active CILO satisfies it). General Education CILOs follow the at-least-one rule: at least one valid active Institutional Outcome target. Program-specific CILOs follow the exhaustive rule: a non-null manifestation for every active PLO of the Course's owning Academic Program; a Program with zero active PLOs alongside active CILOs is incomplete, not ready.
_Avoid_: PLO-only readiness, per-assignment readiness, CILO count as readiness, vacuous readiness with zero active PLOs

**Completed-period readiness snapshot**:
An immutable, versioned record of readiness written when an Academic Period completes; it carries typed target details for new snapshots, while existing snapshots retain their legacy interpretation and are never rewritten by later mapping or catalog changes. Legacy snapshots may persist `GRADUATE_OUTCOME` as a stored target-layer value; it is data, not terminology, and is never surfaced verbatim to users.
_Avoid_: Live readiness read, mutable snapshot, relabeled legacy snapshot

**Publication alignment gate**:
The server-side rule that rejects new Course-bound evaluation publication while any active CILO of the locked Course fails the typed alignment rule (exhaustive manifestation coverage for Program-specific Courses, at-least-one active Institutional Outcome for General Education), with a direct repair path to Course alignment.
_Avoid_: Publish-with-gaps, alignment warning only

**Faculty mapping responsibility**:
Faculty is the primary operational mapper for both typed relations, authorized by an active Course Assignment owned by the current Faculty member in an active Academic Period; affiliation alone is insufficient.
_Avoid_: Program-wide faculty mapping, role-only mapping access

**Secretary outcome stewardship**:
The Secretary owns the Institutional Outcome catalog and holds college-wide correction authority for both typed mapping relations and for CILO and PLO administration, using exact before/after review, explicit confirmation, freshness recheck, and atomic save.
_Avoid_: Secretary as PLO owner, unconfirmed administrative write

**Program Head read-only mapping review**:
Program Heads retain PLO ownership but may only inspect valid typed mappings and readiness gaps for their assigned Program; they cannot create or remove mapping rows through the UI or crafted server requests.
_Avoid_: Program Head mapping mutation, mapping bookmarks with edit controls

**Dean outcome oversight**:
College-wide, read-only, period-scoped, privacy-safe visibility into the Institutional Outcome catalog, Program PLO coverage, and typed mapping gaps; General Education gaps are labeled as Institutional Outcome gaps, never as missing Program PLOs, and reads are never cached.
_Avoid_: Dean outcome editing, PLO-only gap labels, roster or response data in oversight

**ILO-to-PLO crosswalk**:
An explicitly deferred mapping or attainment propagation between Institutional Outcomes and Program Learning Outcomes; no reporting or attainment semantics exist for it yet.
_Avoid_: ILO-to-PLO mapping, automatic crosswalk, attainment rollup
