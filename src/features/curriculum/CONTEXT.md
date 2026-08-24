# Curriculum

Curriculum documents how Courses are placed (year level, semester, term) within an academic Program across revisions of the program's curriculum.

## Language

**Curriculum version**:
A revision of a Program's curriculum, carrying a human-readable code (e.g. "BSIT-2030") and an optional Major scope. Lifecycle: DRAFT → PUBLISHED → RETIRED. Placements authoritatively feed CourseAssignment creation: the assignment picker lists only PUBLISHED curriculum courses, creation validates status and program (CURRICULUM_COURSE_NOT_PUBLISHED, CURRICULUM_PROGRAM_MISMATCH) and defaults year level from the placement — but curricula never auto-generate assignments or schedules.
_Avoid_: Curriculum (when referring to a specific revision), revision plan

**Curriculum course**:
A single Course's placement within a Curriculum Version: year level, semester, and term. The same Course may appear multiple times in one version (e.g. in different semesters).
_Avoid_: Syllabus item, curriculum entry

**Published immutability**:
PUBLISHED and RETIRED Curriculum Versions and their Curriculum Courses reject all mutation. Revisions are created by cloning any immutable version (PUBLISHED or RETIRED) into a new DRAFT; only DRAFT sources are rejected. Clones start with no effectivity and no publish metadata. Enforced in the application layer.
_Avoid_: Edit published, unpublish

**Snapshot**:
The `course_code_snapshot` and `course_title_snapshot` values frozen onto a Curriculum Course when it is created. They preserve what was approved even if the Course's `code` or `title` later changes.
_Avoid_: Live course metadata, current code

**Draft version**:
A Curriculum Version with status DRAFT — the only status that accepts mutation.
_Avoid_: Pending version, editable version

**Published version**:
A Curriculum Version with status PUBLISHED — immutable and selectable for new CourseAssignments.
_Avoid_: Active version, live version

**Retired version**:
A Curriculum Version with status RETIRED — immutable, no longer selectable for new CourseAssignments, but fully queryable for history.
_Avoid_: Deleted version, archived version

**Clone**:
The operation that copies a PUBLISHED or RETIRED version into a new DRAFT with identical Curriculum Course rows and snapshots; the original remains unchanged.
_Avoid_: Duplicate, copy-and-paste

**Effective school year**:
An optional SchoolYear a Curriculum Version takes effect from (effective_from_school_year_id). Editable only on DRAFT; setting it to null explicitly clears it. Clones start without effectivity.

**Baseline curriculum**:
A DRAFT Curriculum Version auto-generated with code `<PROGRAM>-BASELINE`, seeded from each active program course's default placement (year level, semester, term). Created only when the program has no version; never auto-published.

**Curriculum write authority**:
Curriculum writing belongs only to SECRETARY (cross-program) and PROGRAM_HEAD (within their active ProgramHeadAssignment set, revalidated in-transaction because server actions bypass RLS per ADR 0009). DEAN is intentionally excluded from authoring.

**Semester–term pairing rule**:
SUMMER placements must have a null term; FIRST/SECOND placements must carry a non-null term. Enforced by a database CHECK constraint and mirrored in application validation.

**Course placement eligibility**:
A Course may be placed in a Curriculum Version only if it is a shared General Education course (or has no owning program) or belongs to the version's program. Inactive courses are rejected.

**Assignment linkage**:
A CourseAssignment optionally records the CurriculumCourse it originated from (curriculum_course_id, set null when the curriculum course is deleted). The linked curriculum course must be PUBLISHED and belong to the same program, and its placement year level becomes the assignment's default.

**Published metadata**:
Publishing stamps published_at and published_by onto a version. Clones and baselines start with neither.
