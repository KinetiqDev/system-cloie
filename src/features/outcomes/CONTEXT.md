# Outcomes

Outcomes defines the institutional, program, and course learning outcome layers, their typed alignment relations, role responsibilities, and the readiness semantics built on them.

## Language

**Institutional Learning Outcome (ILO)**:
A college-wide learning outcome in the shared Institutional Outcome catalog, owned by the General Education Coordinator (college-wide) and applicable to every Academic Program. It has a stable unique code, statement, display order, active/archive state, and timestamps.
_Avoid_: Program Learning Outcome, college-level PLO

**Program Learning Outcome (PLO)**:
A program-level learning outcome owned by exactly one Academic Program; Program Heads administer PLOs within their assigned Program scope. The legacy term "Graduate Outcome" is retired in code and contracts; ADR 0017 exempts legal copy, and a few known user-visible strings still say "graduate outcome(s)" pending a terminology sweep.
_Avoid_: Graduate Outcome, GO, Institutional outcome, program-level template

**Course Intended Learning Outcome (CILO)**:
A course-level learning outcome that belongs to a Course and is stable across assignment periods; it is never assignment-specific or faculty-owned. Faculty author CILOs for Courses they actively teach.
_Avoid_: Assignment-specific CILO, faculty-owned CILO

**Manifestation**:
The way a CILO contributes to a PLO or Institutional Outcome, carried by every typed mapping: `LEARNING` (displayed `L`), `PRACTICE` (displayed `P`), or `OPPORTUNITY` (displayed `O`). Manifestations carry no numeric value or weight, feed no attainment calculation, and never filter analytics contributions: ratings flow to every mapped PLO regardless of manifestation.
_Avoid_: Numeric or weighted manifestation, missing manifestation on a mapping, manifestation-filtered evidence

**General Education Course**:
A Course whose CILOs align to the shared Institutional Outcome catalog.
_Avoid_: Program-scoped course, course without an owning program

**Program-specific Course**:
A Course owned by one Academic Program; its CILOs align only to PLOs of that owning Program.
_Avoid_: General Education course, cross-program course

**CILO-to-PLO mapping**:
An alignment row between one CILO and one PLO in the Course's owning Academic Program; every such relationship carries exactly one manifestation. Wrong-layer writes are rejected.
_Avoid_: CILO-to-GO, unqualified mapping, dual-layer mapping

**CILO-to-ILO mapping**:
An alignment row between one General Education CILO and one Institutional Outcome; every such relationship carries exactly one manifestation. The mapping set is Course-level and shared across assignments.
_Avoid_: Per-program GE mapping, checkbox-only GE mapping, missing manifestation
**Program evaluation question–PLO binding**:
An unweighted relationship declaring that a Likert question in a Program-wide evaluation covers one or more active Program Learning Outcomes owned by the evaluation's Program. It is distinct from CILO-to-PLO mapping and carries no manifestation, priority, percentage, or attainment aggregation rule.
_Avoid_: CILO-to-PLO mapping, weighted PLO question, PLO manifestation

**Program-wide evaluation**:
An evaluation template and deployment scoped to an Academic Program rather than to a Course Assignment; its question–PLO bindings are program-owned configuration and are not CILO alignment rows.
_Avoid_: Course-bound evaluation, program-wide CILO mapping

**PLO binding snapshot**:
The immutable PLO identity and descriptive snapshot captured when a Program-wide evaluation is published, preserving the deployment's historical interpretation after later PLO catalog changes.
_Avoid_: Live PLO lookup, mutable deployment binding

**Unweighted PLO coverage**:
The intentionally unspecified future analytics relationship in which a question may cover multiple PLOs and a PLO may be covered by multiple questions, without implying question weights, priority, evidence multiplication, or aggregation behavior.
_Avoid_: Equal-weight attainment, weighted coverage, attainment formula


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
The per-(Course, Academic Program) state derived from active Course Assignments: `missing-cilos` (no active CILOs), `incomplete-mapping` (any active CILO fails the typed alignment rule), or `ready` (every active CILO satisfies it). General Education CILOs follow the at-least-one rule: at least one active Institutional Outcome mapping with a non-null manifestation. Program-specific CILOs follow the exhaustive rule: a non-null manifestation for every active PLO of the Course's owning Academic Program; a Program with zero active PLOs alongside active CILOs is incomplete, not ready.
_Avoid_: PLO-only readiness, per-assignment readiness, CILO count as readiness, vacuous readiness with zero active PLOs

**Course alignment target layer**:
The internal discriminator resolving a Course scope to its typed target catalog: `GENERAL_EDUCATION` resolves to `INSTITUTIONAL_OUTCOME` and `PROGRAM_SPECIFIC` to `GRADUATE_OUTCOME`; persisted in readiness snapshot contexts and Dean mapping-gap DTOs, translated before display, never surfaced verbatim to users.
_Avoid_: Surfaced layer value, untyped course target catalog

**Completed-period readiness snapshot**:
An immutable, versioned record of readiness written when an Academic Period completes; it carries typed target details for new snapshots, while existing snapshots retain their legacy interpretation and are never rewritten by later mapping or catalog changes. `GRADUATE_OUTCOME` persists as a stored target-layer value in legacy and schema_version-2 snapshots alike (every Program-specific context via `targetLayerForScope`, carried in Dean mapping-gap DTOs for both); it is stored data, always translated before display (e.g. "Incomplete Program Learning Outcome mapping:"), never surfaced verbatim to users.
_Avoid_: Live readiness read, mutable snapshot, relabeled legacy snapshot

**Readiness snapshot schema version**:
The version tag on period readiness snapshots: new snapshots write version 2 (typed payloads under the exhaustive manifestation rule); version 1 (column default) keeps legacy at-least-one-target semantics, and reads branch on it; snapshots are immutable via DB trigger.
_Avoid_: Unversioned snapshot, rewritable snapshot

**Publication alignment gate**:
The server-side rule that rejects new Course-bound evaluation publication while any active CILO of the locked Course fails the typed alignment rule (exhaustive manifestation coverage for Program-specific Courses, at-least-one active Institutional Outcome with a manifestation for General Education), with a direct repair path to Course alignment.
_Avoid_: Publish-with-gaps, alignment warning only

**Faculty mapping responsibility**:
Faculty is the primary operational mapper for both typed relations, authorized by an active Course Assignment owned by the current Faculty member in an active Academic Period; affiliation alone is insufficient.
_Avoid_: Program-wide faculty mapping, role-only mapping access

**General Education Coordinator outcome stewardship**:
The General Education Coordinator college-wide owns the Institutional Learning Outcome catalog (college-wide `code @unique`, `order`, `is_active`) and holds correction authority for institutional outcomes (create, edit, reorder, archive, restore) via exact before/after review, explicit confirmation, freshness recheck, and atomic save. The Secretary has no ILO access; `/secretary/learning-outcomes/**` redirects to `/secretary/dashboard`. `GEN_ED_COORDINATOR college-wide owns ILO`.
_Avoid_: Secretary as ILO owner, unconfirmed administrative write, Secretary ILO write

**Program Learning Outcome CSV import**:
Program Heads may create up to 20 active PLOs at once for the deliberately Selected Program from a two-column CSV (`PLO Code`, `Description`). Import is create-only: matching active or archived codes are reported and never updated, restored, archived, or reordered. The server revalidates Program authority and current catalog state before an atomic append in file order. Every imported active PLO immediately enters the exhaustive Program-specific readiness rule, so Faculty may need to classify new CILO-to-PLO mappings before publication.
_Avoid_: Spreadsheet overwrite, archived-PLO restoration, cross-Program import, partial unexpected batch

**Program Head read-only mapping review**:
Program Heads retain PLO ownership but may only inspect valid typed mappings and readiness gaps for their assigned Program; they cannot create or remove mapping rows through the UI or crafted server requests.
_Avoid_: Program Head mapping mutation, mapping bookmarks with edit controls

**Dean outcome oversight**:
College-wide, read-only, period-scoped, privacy-safe visibility into the Institutional Outcome catalog, Program PLO coverage, and typed mapping gaps; General Education gaps are labeled as Institutional Outcome gaps, never as missing Program PLOs, and reads are never cached.
_Avoid_: Dean outcome editing, PLO-only gap labels, roster or response data in oversight

**ILO-to-PLO crosswalk**:
An explicitly deferred mapping or attainment propagation between Institutional Outcomes and Program Learning Outcomes; no reporting or attainment semantics exist for it yet.
_Avoid_: ILO-to-PLO mapping, automatic crosswalk, attainment rollup

## Institutional Learning Outcome catalog ownership (resolved, ADR 0018, issue #490)

The Institutional Learning Outcome catalog ownership and write-authority conflict (ADR 0005 documenting Secretary ownership vs the live server denial) is **resolved** by ADR 0018: `GEN_ED_COORDINATOR college-wide owns ILO` (CRUD, reorder, archive, restore; college-wide `order`, `code @unique`). The Secretary has no ILO access and `SECRETARY_NAV` retains no Learning Outcomes entry. Earlier deferred notes are superseded.
_Avoid_: Secretary ILO ownership, Coordinator ILO catalog editor deferred assumption
