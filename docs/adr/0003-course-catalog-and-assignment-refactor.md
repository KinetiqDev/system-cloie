# Course Catalog and Assignment Refactor

> **Clarification 6 (advisory catalog defaults) is partially superseded by [ADR 0013](./0013-versioned-curriculum-course-placement.md)** — `CurriculumCourse` becomes the canonical placement source once baseline DRAFT curricula are validated and published. `Course.default_year_level`/`default_semester`/`default_term` remain as migration hints until contract migration removes them.

To eliminate the manual "Course Offerings" encoding step and improve data integrity, we are refactoring the `Course`, `CourseAssignment`, and `CourseBoundEvaluation` models.

## Decision

1. **Course catalog defaults:** The base `Course` catalog table stores the default/recommended `year_level`, `semester`, and `term` during which it is active in a school year.
2. **Year level override:** The `CourseAssignment` table keeps its own `year_level` field, letting the Secretary or Program Head override the default year level if a specific program schedules a shared course for a different cohort.
3. **No mixed assignments:** Every `CourseAssignment` record is strictly bound to a single program (`program_id` is required and non-nullable). Merged classes containing students from multiple programs are split into separate assignment records. A class is unique by academic period, Course, Academic Program, year level, and section; exactly one Faculty Member may be assigned to that class.
4. **Strictly required sections:** Every course assignment must have a section (Morning, Afternoon, or Evening) selected.
5. **One evaluation per class:** A course assignment can have at most one evaluation. The `CourseBoundEvaluation` model has a strict 1-to-1 link to `CourseAssignment` via a required and unique `course_assignment_id` field. Redundant scheduling fields are dropped from the evaluation table.

## Rationale

- Hardcoding temporal defaults on the catalog simplifies active-term filtering for assignments.
- Allowing year-level overrides on assignments solves scheduling discrepancies for general education courses without duplicating catalog entries.
- Requiring both `program_id` and `section` on `CourseAssignment` keeps the database clean and lets us enforce a simple uniqueness constraint directly in Prisma: `@@unique([term_instance_id, course_id, program_id, year_level, section])`.
- Enforcing a 1-to-1 relationship for evaluations prevents accidental duplicate deployments and ensures neat, normalized reports.

## Clarifications (added during PRD 2 review — Issue #36)

6. **Advisory catalog defaults:** the `Course.year_level` / `semester` / `term` fields are advisory pre-fill values, not constraints. A course can still be assigned to a different term than its catalog default; the assignment form simply pre-fills the default and lets the Secretary/PH override it. This resolves the tension between catalog defaults and real-world scheduling exceptions for GE courses.
7. **1-to-1 enforcement migration:** the strict 1-to-1 link is enforced only after every legacy evaluation maps to exactly one assignment using its complete available class identity. The backfill must reject unmatched or ambiguous rows before `ALTER COLUMN ... SET NOT NULL` and a `UNIQUE INDEX` on `course_assignment_id`. Once enforced, the redundant legacy columns (`course_id`, `program_id`, `major_id`, `faculty_id`, `section`) on `CourseBoundEvaluation` are dropped in a separate cleanup migration. The historical Issue #39 backfill matched only `[term_instance_id, course_id, faculty_id, section]`; its already-applied result cannot be re-derived after those legacy columns were dropped.
8. **On-behalf deployment:** Program Heads (own-program scope), Deans, and Secretaries may deploy a course-bound evaluation on behalf of a faculty member. The deployer is recorded in a new `deployed_by` column on `CourseBoundEvaluation`, distinct from `faculty_id` which always references the teacher being evaluated. On-behalf deployments use the course's bound `InstrumentTemplate` directly (question customization disabled). Self-deploy by the faculty member remains the default path.
9. **`CourseOffering` model explicitly rejected:** an alternative design proposing a separate `CourseOffering` table per term (Issue #26 PRD 2) was considered and rejected. The catalog-defaults approach above is canonical — see `docs/plans/prd2-implementation-plan.md`.
10. **CSV roster upload out of scope:** PRD 2 user story 10 (faculty CSV class list upload) is deferred to Issue #26 PRD 6. Course-bound evaluation recipients are sourced exclusively from `StudentEnrollment` via `listStudentsForClass`.
11. **Course scope controls assignment stewardship:** General Education course assignments are stewarded by Secretary or Dean users. Program Heads may view General Education assignments for their program, but Program Head management actions are limited to Program-specific Courses owned by their assigned program scope. A Program-specific Course assignment targets the Course's owning program.
12. **Merged classes remain ungrouped:** Merged classes are still represented as separate `CourseAssignment` records, one per program. PRD 3 rejects a dedicated merged-class helper or grouping model; users create each required program row explicitly.
13. **One Faculty Member per class:** Two Faculty Members cannot be assigned to the same Course, Academic Program, year level, section, and academic period. A Faculty Member may teach the same Course across different sections or, for General Education Courses, across different Academic Programs. Development data is disposable: this constraint migration resets conflicting mock Course assignments and dependent mock evaluation data, then seed data recreates valid fixtures.

## Implementation

See the retired `docs/plans/prd2-implementation-plan.md` (deleted; preserved in git history) for the phased implementation roadmap of PRD 2.
