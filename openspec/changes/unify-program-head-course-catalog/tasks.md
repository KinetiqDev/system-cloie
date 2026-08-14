# Tasks: Unify Program Head Course Catalog

- [ ] Slice 1: Scope catalog resolver to program-specific courses <!-- id: 0 -->
  - Modify `src/features/academic-structure/services/resolve-program-head-courses.ts` to drop GE query and fields (`isReadOnly`, `generalEducation`).
  - Update `src/__tests__/modules/academic-catalog-and-context/resolve-program-head-courses.test.ts` to expect only one `findMany` call and updated return shape.
  - Verify with `pnpm vitest run src/__tests__/modules/academic-catalog-and-context/resolve-program-head-courses.test.ts`.

- [ ] Slice 2: Remove unused `getCourseTypeBadgeClass` export <!-- id: 1 -->
  - Remove `getCourseTypeBadgeClass` from `src/features/academic-structure/lib/course-visuals.ts`.
  - Remove its tests from `src/__tests__/features/academic-structure/course-visuals.test.ts`.
  - Verify with `pnpm vitest run src/__tests__/features/academic-structure/course-visuals.test.ts`.

- [ ] Slice 3: Refactor catalog UI component and tests <!-- id: 2 -->
  - Update `src/features/academic-structure/components/program-head-courses-catalog.tsx`: status Select filter, table columns (Year Level, Semester, Term), drop Type column and Gen Ed summary card.
  - Update `src/__tests__/components/academic-structure/program-head-courses-catalog.test.tsx`.
  - Verify with `pnpm vitest run src/__tests__/components/academic-structure/program-head-courses-catalog.test.tsx`.

- [ ] Slice 4: Full verification and OpenSpec closure <!-- id: 3 -->
  - Run full test suite (`pnpm test`), linter (`pnpm lint`), and build (`pnpm build`).
  - Validate change with `openspec validate unify-program-head-course-catalog`.
  - Perform browser check on feedback URL.
