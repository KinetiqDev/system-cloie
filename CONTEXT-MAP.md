# Context Map

## Contexts

- [Identity and Access](./src/features/auth/CONTEXT.md) - manages Google-authenticated accounts, role entry, onboarding gates, and account access states.
- [Academic Calendar](./src/features/academic-calendar/CONTEXT.md) - defines school years, semesters, terms, and active academic periods.
- [Course Catalog and Assignments](./src/features/course-assignments/CONTEXT.md) - defines courses, class sections, teaching assignments, and evaluation scopes.
- [Academic Structure](./src/features/academic-structure/CONTEXT.md) - defines academic programs and majors offered by the college.
- [Curriculum](./src/features/curriculum/CONTEXT.md) - documents how Courses are placed (year level, semester, term) within an academic Program across revisions of the program's curriculum.
- [Outcomes](./src/features/outcomes/CONTEXT.md) - defines the college-wide Institutional Learning Outcome catalog, Program-owned Graduate Outcomes, Course-level CILOs, typed alignment relations, readiness semantics, and role responsibilities.
- [Analytics](./src/features/analytics/CONTEXT.md) - defines submitted-response evidence, source-aware analytics terminology, Program GO evidence boundaries, and bounded AI-assisted interpretation.
- [Design System](./src/features/design-system/CONTEXT.md) - defines root semantic tokens, unified appearance preferences (Light, Dark, System), protected visual showcase, and production-surface inventory.

## Relationships

- **Identity and Access -> Users**: Identity and Access owns account role and access-state language; Users owns profile/admin-user management screens and services that operate on those accounts.
- **Identity and Access -> Portals**: The role selection portal is the public entry UI for Identity and Access flows.
- **Identity and Access -> Enrollments**: Student onboarding may create or defer active-term enrollment after the Student account role and profile are established.
- **Identity and Access -> Academic Calendar**: Deferred enrollment depends on whether an active academic term exists.
- **Course Catalog and Assignments -> Academic Calendar**: Course assignments are scoped to the active academic period.
- **Academic Structure -> Course Catalog and Assignments**: Program-specific courses and course assignments reference the academic program that owns or scopes them.
- **Curriculum -> Course Catalog and Assignments**: CurriculumCourse placements inform CourseAssignment creation.
- **Academic Structure -> Outcomes**: Graduate Outcomes are owned by and scoped to Academic Programs.
- **Course Catalog and Assignments -> Outcomes**: Course scope (General Education vs Program-specific) determines the typed alignment relation and valid target catalog for a Course's CILOs; active Course Assignments scope Faculty mapping authority and readiness contexts.
- **Academic Calendar -> Outcomes**: Outcome readiness and completed-period readiness snapshots are scoped to academic periods.
- **Analytics -> Academic Calendar**: Analytics evidence is filterable by canonical School Year, Semester, and Academic Term context.
- **Analytics -> Course Catalog and Assignments**: Course-bound student evidence and evaluation opportunities originate from Course-bound evaluations and their assignments.
- **Analytics -> Outcomes**: Program GO evidence follows typed Program-specific CILO-to-GO mappings; Institutional Outcome evidence and ILO-to-GO crosswalks remain separate/deferred.
- **Design System -> All Contexts**: Design System provides shared semantic tokens, appearance resolution, and production component primitives consumed across all feature visual surfaces.
