# Remove Curriculum Versioning

Status: Accepted
Date: 2026-09-05
Supersedes: ADR 0013

System CLOIE removes its Curriculum bounded context. Official curriculum and prospectus lifecycle management happens outside System CLOIE. Academic leaders decide revisions; System CLOIE records actual offering history on `CourseAssignment` and freezes that context in published evaluation snapshots.

Decided: delete `CurriculumVersion`, `CurriculumCourse`, `CurriculumVersionStatus`, `CourseAssignment.curriculum_course_id`, the curriculum services/actions/components/schemas/types, the curriculum baseline/backfill scripts, and the curriculum RLS policies.

`Course.default_year_level`, `default_semester`, and `default_term` return to advisory catalog defaults under ADR 0003 Clarification 6. They prefill future Course assignments and may be overridden. They are not historical truth.

`CourseAssignment` is the operational and historical class record: actual Course, Faculty, Program, academic period, year level, and section. Year level is explicitly required on creation. Existing assignment rows keep their concrete values.

New Course-bound evaluations publish a flat v2 assignment-context snapshot: Course, Program, major, academic period, year level, section, Faculty, capture time, and provenance. Existing snapshots keep their publication-time labels and gain reconstructed fields only where the associated assignment supplies them. Previously written curriculum snapshot IDs remain opaque legacy keys.

Faculty may be reassigned only before the assignment's evaluation is published. The assignment service and database triggers reject Faculty reassignment and published snapshot mutation after publication.

## Consequences

- ADR 0013 is superseded without rewriting its historical decision.
- Existing `curriculum_versions` and `curriculum_courses` rows are exported under institutional retention policy before the contract migration drops them.
- Live authorization and filtering continue to use stable relational IDs; historical presentation prefers snapshot labels.
- No replacement curriculum abstraction is introduced.
