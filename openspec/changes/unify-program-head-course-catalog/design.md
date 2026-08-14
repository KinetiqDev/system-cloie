# Design: Unify Program Head Course Catalog

## Affected Files

- `src/features/academic-structure/services/resolve-program-head-courses.ts` (Modify backend resolver)
- `src/features/academic-structure/components/program-head-courses-catalog.tsx` (Modify catalog component)
- `src/features/academic-structure/lib/course-visuals.ts` (Modify visuals utility)
- `src/__tests__/modules/academic-catalog-and-context/resolve-program-head-courses.test.ts` (Modify resolver tests)
- `src/__tests__/components/academic-structure/program-head-courses-catalog.test.tsx` (Modify catalog component tests)
- `src/__tests__/features/academic-structure/course-visuals.test.ts` (Modify course visuals tests)

## Data Models & Server/Client Boundary

- **Server/Client boundary**: Page route remains a Server Component loading data via `resolveProgramHeadCourses`. `ProgramHeadCoursesCatalog` remains `"use client"` filtering prepared server data.
- **Data contract changes**:
  - Delete `isReadOnly` from `ProgramHeadCourseItem`.
  - Remove `generalEducation` from `ProgramHeadCourseSummary` (`{ total: number; programWide: number; majorSpecific: number; archived: number; }`).
  - `resolveProgramHeadCourses` drops second Prisma query for GE courses.

## Component Architecture

- Replace capsule tabs (`activeTab` state) with `statusFilter` (`"__all__" | "active" | "archived"`).
- Filter bar uses `Select` dropdown for status and major, and `Input` for search matching `ManagementCoursesList`.
- Table container: `overflow-x-auto rounded-lg border`.
- Columns: `Course | Course Title | Major | Year Level | Semester | Term | Status | Last Updated | Actions`.
- Format schedule attributes using `getYearLevelDisplay`, `getSemesterLabel`, and `getTermLabel` with `"—"` fallbacks for null values.
