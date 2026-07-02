# Course Catalog and Assignments

Course Catalog and Assignments define the subjects offered by the institution, when they are scheduled in the curriculum, and how they are assigned to faculty members.

## Language

**Course**:
A catalog subject representing a unit of instruction, defining its code, title, credits, scope, and default year/semester/term.
_Avoid_: Subject, course offering

**Program-specific Course**:
A Course owned by one academic program. Its course assignments are created for that same owning program.
_Avoid_: Department subject, program offering

**General Education Course**:
A shared institutional Course that is not owned by a single academic program. Secretary or Dean users steward General Education course assignments; Program Heads may view General Education assignments for their program but do not manage them.
_Avoid_: Shared program course, merged course

**Catalog default**:
The advisory `year_level`, `semester`, and `term` stored on a `Course`. A catalog default pre-fills a course assignment but may be overridden for a specific assignment.
_Avoid_: Course offering default, scheduled term

**Course assignment**:
A term-scoped mapping between a teacher, a course, a program, a year level, and a section that grants teaching capability.
_Avoid_: Teaching assignment, roster record

**Faculty affiliation**:
A faculty member's active relationship to one or more academic programs. Affiliation is displayed as assignment context, but it does not prevent a Program Head from assigning a faculty member from another program to one of the Program Head's program-specific Courses.
_Avoid_: Faculty scope, assignment permission

**Class section**:
A predefined shift (Morning, Afternoon, Evening) during which a course assignment is taught.
_Avoid_: Section code, free-text section

**Course-bound evaluation**:
A single term-scoped evaluation of course learning outcomes (CILOs) deployed exactly once per course assignment.
_Avoid_: CILO evaluation, survey, exam

**Merged class**:
A class composed of students from different academic programs taught together, represented in CLOIE as separate course assignments (one per program).
_Avoid_: Combined class, mixed assignment
