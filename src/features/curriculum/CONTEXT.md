# Curriculum

Curriculum documents how Courses are placed (year level, semester, term) within an academic Program across revisions of the program's curriculum.

## Language

**Curriculum version**:
A revision of a Program's curriculum, carrying a human-readable code (e.g. "BSIT-2030") and an optional Major scope. Lifecycle: DRAFT → PUBLISHED → RETIRED. Versioning is a catalog/documentation feature, not a rules engine.
_Avoid_: Curriculum (when referring to a specific revision), revision plan

**Curriculum course**:
A single Course's placement within a Curriculum Version: year level, semester, and term. The same Course may appear multiple times in one version (e.g. in different semesters).
_Avoid_: Syllabus item, curriculum entry

**Published immutability**:
PUBLISHED and RETIRED Curriculum Versions and their Curriculum Courses reject all mutation. Revisions are created by cloning a published version into a new DRAFT. Enforced in the application layer.
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
