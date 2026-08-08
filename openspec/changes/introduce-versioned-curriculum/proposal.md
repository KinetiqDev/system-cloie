## Why

System CLOIE currently has no concept of a versioned Curriculum. Course placement (year level, semester, term) is stored as advisory defaults on the `Course` model itself (`default_year_level`, `default_semester`, `default_term`). This cannot preserve historical Curriculum changes — when a Course moves from 2nd Year to 1st Year between Curricula, the old placement is lost. Course identity must remain stable while placement varies across Curriculum versions.

## What Changes

- Introduce new bounded context `src/features/curriculum/`
- Add `CurriculumVersion` model: program-owned, versioned, with DRAFT/PUBLISHED/RETIRED lifecycle
- Add `CurriculumCourse` model: placement of a stable `Course` within a `CurriculumVersion` with year_level, semester, term, and course metadata snapshots
- Add `prisma/models/curriculum.prisma`
- Secretary/Program Head create, edit, clone, publish, retire Curriculum Versions
- Published Curriculum Versions are immutable; revisions use clone→edit→publish
- Retired Curricula remain historically viewable but not selectable for new operations
- Same Course may appear in multiple Curriculum Versions with different placements, or be omitted from newer versions
- `course_code_snapshot` and `course_title_snapshot` on `CurriculumCourse` preserve approved metadata at publication time
- **BREAKING**: Course temporal defaults (`default_year_level`, `default_semester`, `default_term`) marked deprecated — not removed yet (contract migration later)
- New Supabase RLS policies: write gated to SECRETARY/PROGRAM_HEAD (own-program scope)

## Capabilities

### New Capabilities
- `curriculum-version-lifecycle`: DRAFT→PUBLISHED→RETIRED; published immutable; clone for revision
- `curriculum-course-placement`: Course placement within CurriculumVersion with year_level, semester, term
- `curriculum-course-snapshot`: course code/title frozen at publish time
- `curriculum-cross-version-course`: same Course reused across CurriculumVersions with different placements
- `curriculum-historical-preservation`: retired Curricula and removed courses remain queryable
- `curriculum-rls-security`: new tables have RLS enabled with role-scoped policies

### Modified Capabilities
None — no existing curriculum specifications.

## Impact

- **Prisma schema**: New `prisma/models/curriculum.prisma` with `CurriculumVersion` and `CurriculumCourse` models
- **Migrations**: Create `curriculum_versions` and `curriculum_courses` tables with constraints and indexes
- **Supabase types**: regenerate after migration
- **New feature**: `src/features/curriculum/` with types, policies, schemas, services, components
- **New routes**: `/secretary/curricula/`, `/program-head/programs/[id]/curricula/`
- **Courses schema**: Add deprecation comments on `default_year_level`/`default_semester`/`default_term` — not removed
- **CONTEXT-MAP.md**: Add Curriculum context entry
- **ADR**: `0013-versioned-curriculum-course-placement.md`
