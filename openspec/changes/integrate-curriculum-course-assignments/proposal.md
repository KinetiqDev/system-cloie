## Why

Course Assignment currently references `Course` directly with no Curriculum context. When a Program Head creates a class, there is no linkage back to the intended Curriculum placement. The `curriculum_course_id` field provides an optional audit trail connecting operational classes to their originating Curriculum placement without forcing every Student in the class to belong to that Curriculum.

## What Changes

- Add `curriculum_course_id` (nullable) to `CourseAssignment` model
- Add `CurriculumCourse` → `CourseAssignment` relation (optional, non-cascading)
- On assignment creation, Secretary/PH may select a Curriculum→CurriculumCourse to prefill Course, Year Level, and placement
- `CourseAssignment` retains its own `course_id`, `year_level`, `program_id` — it is the operational truth
- Validate `CourseAssignment.course_id === CurriculumCourse.course_id` when link exists
- Legacy (null `curriculum_course_id`) assignments remain fully readable and reportable
- Backfill `curriculum_course_id` only where unambiguous (exactly one matching CurriculumCourse)
- Roster, evaluation, and enrollment logic unchanged — they operate on CourseAssignment, not Curriculum
- Add optional `curriculum_version_id`/`curriculum_course_id` to evaluation snapshots for historical context
- **BREAKING**: `Course.is_active = false` or `CurriculumVersion.status = RETIRED` must not cause historical assignment data to become invisible

## Capabilities

### New Capabilities
- `assignment-curriculum-link`: nullable `curriculum_course_id` on CourseAssignment
- `assignment-curriculum-prefill`: selecting CurriculumCourse prefills Course/Year Level on creation form
- `assignment-curriculum-validation`: CourseAssignment.course_id must match CurriculumCourse.course_id when linked
- `curriculum-backfill-legacy`: backfill only unambiguous historical mappings; leave ambiguous ones null
- `curriculum-historical-visibility`: inactive courses and retired curricula remain visible in historical views
- `curriculum-snapshot-on-evaluation`: optional curriculum version/course IDs in evaluation publication snapshots

### Modified Capabilities
None — no existing course-assignment spec changes.

## Impact

- **Prisma schema**: `prisma/models/course-assignments.prisma` — add `curriculum_course_id` to `CourseAssignment`, add relation
- **Migrations**: Add nullable column + FK to `curriculum_courses`; add index
- **Services**: `manage-course-assignments.ts` (prefill from CurriculumCourse, validation), `load-all-program-course-assignments-page.ts` (include curriculum data), `read-course-rosters.ts` (historical visibility)
- **Schemas**: `course-assignment.ts` — add optional `curriculum_course_id` to create/update
- **Actions**: `course-assignment-actions.ts` — accept `curriculum_course_id` in create
- **Components**: `course-assignment-form-dialog.tsx` — add Curriculum→CurriculumCourse selection step
- **Evaluations**: `publish-course-bound-evaluation.ts` — snapshot `curriculum_version_id`/`curriculum_course_id` when available
- **Backfill**: Script to link existing assignments to CurriculumCourses where unambiguous
- **Tests**: New tests for prefill, validation, backfill, historical visibility
- **Depends on**: `introduce-versioned-curriculum` (CurriclumVersion + CurriculumCourse must exist first)
