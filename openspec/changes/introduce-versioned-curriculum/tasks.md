## 1. Database Schema

- [ ] 1.1 Create `prisma/models/curriculum.prisma` with `CurriculumVersionStatus` enum, `CurriculumVersion` and `CurriculumCourse` models
- [ ] 1.2 Add `CurriculumVersionStatus` enum to existing enums file or inline
- [ ] 1.3 Run `pnpm supabase:migration:diff -- add_curriculum_versions_and_courses` and review SQL
- [ ] 1.4 Add indexes: `(program_id, status)`, `(curriculum_version_id, course_id)`, `(course_id)`
- [ ] 1.5 Add foreign keys: `CurriculumVersion.program_id → programs`, `CurriculumCourse.course_id → courses` (both RESTRICT)
- [ ] 1.6 Add CHECK: valid semester/term pairs on CurriculumCourse
- [ ] 1.7 Enable RLS on both tables; grant SELECT to authenticated; write to SECRETARY + PROGRAM_HEAD
- [ ] 1.8 Run `pnpm supabase:push:dry-run`, `pnpm supabase:push`, `pnpm supabase:types`, `pnpm exec prisma generate`

**Scope:** `prisma/models/curriculum.prisma`, `prisma/schema.prisma` (include), `supabase/migrations/`
**Verification:** `pnpm exec prisma validate`, migration dry-run
**Commit:** `feat(curriculum): add CurriculumVersion and CurriculumCourse models with RLS`

## 2. Curriculum Feature Structure

- [ ] 2.1 Create `src/features/curriculum/CONTEXT.md` with domain glossary
- [ ] 2.2 Create `src/features/curriculum/types.ts` with all interface types
- [ ] 2.3 Create `src/features/curriculum/policies.ts` with `canEditCurriculum`, `canPublishCurriculum`, `canRetireCurriculum`
- [ ] 2.4 Create `src/features/curriculum/schemas/curriculum.ts` with Zod schemas for create/edit/publish

**Scope:** `src/features/curriculum/`
**Verification:** `pnpm lint`
**Commit:** `feat(curriculum): add curriculum feature module structure`

## 3. Curriculum Version Lifecycle Services

- [ ] 3.1 Create `manage-curriculum-versions.ts`: `createCurriculumVersion`, `publishCurriculumVersion`, `retireCurriculumVersion`, `cloneCurriculumVersion`
- [ ] 3.2 Create `manage-curriculum-courses.ts`: `addCurriculumCourse`, `removeCurriculumCourse`, `updateCurriculumCourse`
- [ ] 3.3 Create `read-curriculum.ts`: `listProgramCurricula`, `getCurriculumVersionDetail`
- [ ] 3.4 Add immutability guard: all mutations on PUBLISHED or RETIRED versions rejected
- [ ] 3.5 Add empty-version guard: publish rejected when zero courses
- [ ] 3.6 Write unit tests for lifecycle services
- [ ] 3.7 Write unit tests for immutability enforcement

**Scope:** `src/features/curriculum/services/`
**Verification:** `pnpm test`, `pnpm lint`
**Commit:** `feat(curriculum): curriculum version lifecycle services`

## 4. Curriculum Server Actions

- [ ] 4.1 Create `src/lib/actions/curriculum-actions.ts` with `createCurriculumVersionAction`, `publishCurriculumVersionAction`, `retireCurriculumVersionAction`, `cloneCurriculumVersionAction`
- [ ] 4.2 Create actions for curriculum course mutations
- [ ] 4.3 Wire PH program-scope authorization: verify `program_id` matches `ProgramHeadAssignment`
- [ ] 4.4 Add `revalidatePath` for curriculum routes after mutations

**Scope:** `src/lib/actions/curriculum-actions.ts`
**Verification:** `pnpm lint`, `pnpm build`
**Commit:** `feat(curriculum): curriculum server actions with program-scope authorization`

## 5. Curriculum UI Components

- [ ] 5.1 Create `curriculum-version-list.tsx` — Client Component showing DRAFT/PUBLISHED/RETIRED in tabs
- [ ] 5.2 Create `curriculum-course-table.tsx` — sortable table of courses in a version with add/remove/edit
- [ ] 5.3 Create `curriculum-version-form.tsx` — create/edit dialog for version metadata
- [ ] 5.4 Publish/Retire/Clone buttons with confirmation dialogs
- [ ] 5.5 Create `src/app/(app)/secretary/curricula/page.tsx` — Secretary list of all program curricula
- [ ] 5.6 Create `src/app/(app)/program-head/programs/[programId]/curricula/page.tsx` — PH own-program curricula

**Scope:** `src/features/curriculum/components/`, `src/app/(app)/secretary/curricula/`, `src/app/(app)/program-head/programs/.../curricula/`
**Verification:** `pnpm test`, `pnpm build`
**Commit:** `feat(curriculum): curriculum management UI`

## 6. Baseline DRAFT Generation

- [ ] 6.1 Create `generateBaselineCurricula` service: group Courses by program_id, create one DRAFT CurriculumVersion per program, populate CurriculumCourse rows from `default_year_level`/`default_semester`/`default_term`
- [ ] 6.2 Create `scripts/generate-baseline-curricula.ts` run-once script
- [ ] 6.3 Add idempotency: skip programs that already have a CurriculumVersion
- [ ] 6.4 Log generated counts; never auto-publish
- [ ] 6.5 Write test: baseline generation creates correct CurriculumCourse placements

**Scope:** `src/features/curriculum/services/generate-baseline.ts`, `scripts/`
**Verification:** `pnpm test`
**Commit:** `feat(curriculum): baseline DRAFT generation from course defaults`

## 7. Course Deletion Guard Update

- [ ] 7.1 Update `manage-courses.ts#deleteCourse` to count curriculum references in dependency check
- [ ] 7.2 Reject deletion when `CurriculumCourse` rows reference the Course
- [ ] 7.3 Write test: Course with curriculum reference cannot be deleted

**Scope:** `src/features/academic-structure/services/manage-courses.ts`
**Verification:** `pnpm test`
**Commit:** `fix(courses): block deletion of courses referenced by curricula`

## 8. ADR & Documentation

- [ ] 8.1 Create `docs/adr/0013-versioned-curriculum-course-placement.md`
- [ ] 8.2 Update `CONTEXT-MAP.md` with Curriculum bounded context entry
- [ ] 8.3 Update `docs/adr/0003-course-catalog-and-assignment-refactor.md` with supersession note for course defaults

**Scope:** `docs/adr/`, `CONTEXT-MAP.md`
**Verification:** Documentation review
**Commit:** `docs(adr): add ADR for versioned curriculum course placement`

## 9. Integration & Regression

- [ ] 9.1 Run full `pnpm test` suite
- [ ] 9.2 Run `pnpm lint` and fix issues
- [ ] 9.3 Run `pnpm build` and verify no type errors
- [ ] 9.4 Verify `pnpm db:seed` with curriculum data

**Verification:** `pnpm test`, `pnpm lint`, `pnpm build`, `pnpm db:seed`
**Commit:** `test: add regression coverage for curriculum feature`
