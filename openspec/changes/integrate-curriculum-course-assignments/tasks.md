## 1. Database Schema

- [ ] 1.1 Add `curriculum_course_id` (nullable, UUID) to `prisma/models/course-assignments.prisma` CourseAssignment model
- [ ] 1.2 Add `course_assignments_curriculum_course_id_fkey` FK → `curriculum_courses(id)` with `ON DELETE SET NULL`
- [ ] 1.3 Add index `course_assignments_curriculum_course_id_idx` for query performance
- [ ] 1.4 Run `pnpm supabase:migration:diff -- add_curriculum_link_to_course_assignments`
- [ ] 1.5 Run `pnpm supabase:push:dry-run`, `pnpm supabase:push`, `pnpm supabase:types`, `pnpm exec prisma generate`

**Scope:** `prisma/models/course-assignments.prisma`, `supabase/migrations/`
**Verification:** `pnpm exec prisma validate`, migration dry-run
**Commit:** `feat(course-assignments): add optional curriculum_course_id to CourseAssignment`

## 2. Backfill Service

- [ ] 2.1 Create `scripts/backfill-course-assignment-curriculum.ts` — match assignments to CurriculumCourse on (course_id, program_id, year_level, semester)
- [ ] 2.2 Implement single-match rule: update only when exactly one CurriculumCourse matches; multi-match = skip and log
- [ ] 2.3 Implement idempotency: skip already-linked assignments
- [ ] 2.4 Write test: single match linked, no match left null, multi-match left null

**Scope:** `scripts/`, `src/__tests__/`
**Verification:** Run backfill, verify counts
**Commit:** `feat(course-assignments): backfill curriculum links for unambiguous assignments`

## 3. Assignment Creation Curriculum Integration

- [ ] 3.1 Update `manage-course-assignments.ts#createCourseAssignment` to accept optional `curriculum_course_id`
- [ ] 3.2 Add validation: `course_id === CurriculumCourse.course_id` when link exists
- [ ] 3.3 Add validation: `program_id === CurriculumVersion.program_id` when link exists
- [ ] 3.4 Add prefill logic: when `curriculum_course_id` is provided, resolve course_id and year_level defaults
- [ ] 3.5 Update Zod `createCourseAssignmentSchema` to accept optional `curriculum_course_id`
- [ ] 3.6 Write tests: valid link, course mismatch rejected, program mismatch rejected

**Scope:** `src/features/course-assignments/services/manage-course-assignments.ts`, `src/features/course-assignments/schemas/course-assignment.ts`
**Verification:** `pnpm test`, `pnpm lint`
**Commit:** `feat(course-assignments): curriculum course prefill and validation on assignment creation`

## 4. Assignment Form Curriculum Selection

- [ ] 4.1 Add curriculum selection step to `course-assignment-form-dialog.tsx` wizard (optional)
- [ ] 4.2 Load published CurriculumVersions for selected program with their CurriculumCourses
- [ ] 4.3 When CurriculumCourse selected, prefill course_id and year_level
- [ ] 4.4 Keep CurriculumCourse selector disabled after initial creation (field is immutable)
- [ ] 4.5 Pass `curriculum_course_id` through form submission to Server Action

**Scope:** `src/features/course-assignments/components/course-assignment-form-dialog.tsx`, `src/lib/actions/course-assignment-actions.ts`
**Verification:** `pnpm test`, `pnpm build`
**Commit:** `feat(course-assignments): curriculum selection in assignment creation form`

## 5. Historical Visibility

- [ ] 5.1 Audit `list-course-assignments.ts` — ensure no `is_active = true` filter hides inactive-course assignments
- [ ] 5.2 Audit `read-course-rosters.ts` — ensure roster reads work for assignments on inactive courses
- [ ] 5.3 Audit evaluation read services — ensure published evaluations visible regardless of course/curriculum status
- [ ] 5.4 Write tests: inactive course assignments visible, retired curriculum assignments visible

**Scope:** `src/features/course-assignments/services/`, `src/features/evaluations/services/`
**Verification:** `pnpm test`
**Commit:** `fix(course-assignments): preserve historical visibility for inactive courses and retired curricula`

## 6. Evaluation Snapshot Curriculum Context

- [ ] 6.1 Extend `publish-course-bound-evaluation.ts` `course_info_snapshot` to include `curriculumVersionId` and `curriculumCourseId` when assignment has `curriculum_course_id`
- [ ] 6.2 Resolve `curriculumVersionId` from `CurriculumCourse.curriculum_version_id`
- [ ] 6.3 Write test: snapshot includes curriculum data when available, omits when null

**Scope:** `src/features/evaluations/services/publish-course-bound-evaluation.ts`
**Verification:** `pnpm test`
**Commit:** `feat(evaluations): capture curriculum context in evaluation publication snapshots`

## 7. Server Action Updates

- [ ] 7.1 Update `createCourseAssignmentAction` to parse optional `curriculum_course_id` from FormData
- [ ] 7.2 Add `loadCurriculumCoursesForProgramAction` for the form's curriculum picker
- [ ] 7.3 Write tests for action-level validation

**Scope:** `src/lib/actions/course-assignment-actions.ts`
**Verification:** `pnpm test`, `pnpm lint`
**Commit:** `feat(course-assignments): server action support for curriculum course link`

## 8. Integration & Regression

- [ ] 8.1 Run all course-assignment tests — verify no regressions
- [ ] 8.2 Run roster import tests — verify curriculum link does not affect roster logic
- [ ] 8.3 Run evaluation publication tests — verify curriculum snapshot does not break publication
- [ ] 8.4 Run full `pnpm test` suite
- [ ] 8.5 Run `pnpm lint` and `pnpm build`

**Verification:** `pnpm test`, `pnpm lint`, `pnpm build`
**Commit:** `test: regression coverage for curriculum course assignment integration`
