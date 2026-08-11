# ADR 0013: Versioned Curriculum Course Placement

- **Status:** Accepted
- **Date:** 2026-08-10
- **Contexts:** Curriculum, Course Catalog and Assignments, Academic Structure

## Decision

System CLOIE introduces a Curriculum bounded context that versioned how Courses are placed (year level, semester, term) within an academic Program. A Program owns one or more `CurriculumVersion` records with a DRAFT → PUBLISHED → RETIRED lifecycle; each version holds `CurriculumCourse` rows that pin a stable Course to a placement and freeze `course_code_snapshot`/`course_title_snapshot` at creation. PUBLISHED and RETIRED versions are immutable — revisions are made by cloning into a new DRAFT. RETIRED means historical, not hidden. Course temporal defaults (`default_year_level`/`default_semester`/`default_term`) become migration hints only, superseding ADR 0003 Clarification 6 once baseline DRAFT curricula are validated and published.

CourseAssignment does not yet reference CurriculumCourse: assignment creation still takes a direct Course and year level, and placement authority transfers to CurriculumCourse only as a future integration (see the `integrate-curriculum-course-assignments` OpenSpec change).

## Context

Previously, Course placement lived on the `Course` model as advisory defaults. This cannot preserve historical curriculum evolution — when a Course moves between year levels across curriculum revisions, the old placement is overwritten. Stakeholders require stable Course identity, versioned placement within curricula, published immutability, and historical preservation. The PRD and SRS explicitly scope CLOIE as NOT automating curriculum revision decisions — this is a catalog/documentation feature, not a rules engine (see `docs/cloie-prd.md`).

## Decision Details

### 1. `CurriculumVersion` is program-owned and versioned

Each `CurriculumVersion` belongs to exactly one `Program` (`program_id` required, RESTRICT delete). `major_id` is optional for major-specific curricula and is constrained to one of that program's majors (migration `20260809080000`). `code` is a human-readable identifier such as "BSIT-2030" and is unique per program. `effective_from_school_year_id` is effectivity metadata only — it does not imply every Student in that School Year belongs to this Curriculum.

Lifecycle is DRAFT → PUBLISHED → RETIRED. DRAFT accepts mutation; PUBLISHED and RETIRED reject all mutation.

### 2. `CurriculumCourse` captures placement with metadata snapshots

A `CurriculumCourse` links a stable `Course` to a placement within a `CurriculumVersion`: `year_level`, `semester`, and `term`. `term` is nullable for SUMMER placements (a regular semester requires a term, enforced in Zod validation). `course_code_snapshot` and `course_title_snapshot` are frozen from the Course's `code` and `title` at creation and survive later Course metadata changes.

The same Course may appear multiple times in one version (e.g., in different semesters) or across different versions with different placements. There is no uniqueness constraint across `(curriculum_version_id, course_id)`.

### 3. PUBLISHED immutability enforced in the application layer

PUBLISHED and RETIRED `CurriculumVersion` records and their `CurriculumCourse` rows reject all mutation at the service layer (e.g., "Published curricula are immutable", "Only published or retired curricula can be cloned"). Revisions use clone → edit → publish: `cloneCurriculumVersion` copies the source's placements and snapshots into a new DRAFT (code suffixed `-COPY`, `-COPY-2`, ...), keeping major scope and name but resetting status, effectivity, and publish metadata. Database-level triggers were considered and rejected — they would complicate legitimate clone-then-edit workflows. The RLS write policies additionally restrict direct authenticated writes to DRAFT rows (migration `20260811063000_restrict_curriculum_writes_to_draft.sql`), closing the direct PostgREST bypass while lifecycle transitions remain on the Prisma service role.

### 4. RETIRED means historical, not hidden

Inactive Courses (`is_active = false`) and RETIRED Curriculum Versions remain fully queryable. Historical queries filter on `status` explicitly rather than generic `is_active` filters. Inactivation never removes a Course from an existing version, and a Course referenced by any `CurriculumCourse` cannot be deleted (the application-layer deletion guard in `manage-courses.ts` blocks it, advising deactivation instead).

### 5. Stable Course identity is preserved across versions

Placement varies per version; Course identity does not. `CurriculumCourse` references the stable `Course` by `course_id` and snapshots its code/title so approved curricula remain readable even after the Course is renamed or deactivated. Course deletion is blocked while any `CurriculumCourse` references it.

### 6. CILO/GO are not versioned by Curriculum (deferred)

CILOs remain owned by Course; GOs remain owned by Program. Curriculum does not version learning outcomes; the CILO→GO mapping is stable regardless of which Curriculum Version a Course appears in. If versioned outcomes are ever needed, they land as `curriculum-cilo`/`curriculum-go` join tables in a future change. ADR 0005 (outcome ownership) remains authoritative.

### 7. Baseline DRAFT generation from Course defaults is a migration hint, not an authority

`generateBaselineCurricula` creates one DRAFT `CurriculumVersion` per Program (code `<PROGRAM-CODE>-BASELINE`) when none exists, populating `CurriculumCourse` rows from `default_year_level`/`default_semester`/`default_term`. Courses without a complete valid default placement are skipped. Baselines are never auto-published. Validating a baseline against official curriculum documents before publishing is an **operator process requirement, not a system-enforced gate** — `publishCurriculumVersion` enforces only that the DRAFT has at least one course and is not already immutable. This is a one-time data migration aid, not a rules engine.

## Options Considered

- **School Year as parent of CurriculumVersion.** Rejected. Curricula span multiple years; forcing annual cloning creates unnecessary duplication.
- **Storing placement on Course directly.** Rejected (the previous approach). Loses historical versions.
- **Database-level immutability (triggers).** Rejected. Application-layer guard with clear error messages is sufficient, simpler to evolve, and does not complicate clone-then-edit workflows.
- **Hide inactive/retired data.** Rejected. `is_active = false` means "do not use for new operations", not "hide from history".
- **Versioning CILO/GO by curriculum now.** Rejected. Stakeholder requirement not confirmed; deferred to a future change.
- **Manual CurriculumCourse entry only, no baseline generation.** Rejected. Baseline DRAFTs seed each program with its existing Course placement defaults so Secretary/Program Head edit rather than start from empty; the generator is idempotent per program and never auto-publishes.

## Consequences

- `CurriculumCourse` becomes the canonical placement source once baseline DRAFT curricula are validated and published, partially superseding ADR 0003 Clarification 6.
- `Course.default_year_level`/`default_semester`/`default_term` remain as migration hints until a contract migration removes them.
- New tables (`curriculum_versions`, `curriculum_courses`) are RLS-protected from creation: all authenticated users can SELECT; writes are gated to SECRETARY (cross-program) and PROGRAM_HEAD (active assignment scoped to the version's program), per ADR 0009.
- Historical reports and Dean oversight keep returning data regardless of Course inactivation or Curriculum retirement.
- Operators cannot invent placement truth for past curricula — published versions cannot be silently edited, and only DRAFTs with at least one course can be published. Publication does not verify a DRAFT against official curriculum documents; that remains an operator process.
- Baseline generation is idempotent only while a program has no CurriculumVersion; stale Course defaults can yield skipped Courses or thin DRAFTs, which is acceptable because they are never auto-published.
