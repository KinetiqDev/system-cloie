# Tasks: Update Demo Seed Course Catalog

## 1. Source data

- [x] 1.1 Fix malformed `PRAC-BA` row in `docs/acd_programs_demo_seed_recommended_expanded.csv` (add trailing comma so `term` column exists)
- [x] 1.2 Verify normalized codes are globally unique and all `pc`/`mk` references resolve against program/major definitions (throwaway script)

## 2. Core fixture

- [x] 2.1 Rewrite `courseDefinitions` in `prisma/seed/fixtures/academic-structure.ts` with the 102 CSV courses: space-stripped codes, semester→term fill for blank terms, grouped by program, comment documenting source CSV and transformation rules
- [x] 2.2 Add `src/__tests__/seed/academic-structure-fixture.test.ts`: normalized codes unique; every `pc`/`mk` resolves; every course has year+semester, non-SUMMER has term
- [x] 2.3 Add nullable immutable `Course.seed_source` to Prisma and Supabase migration; leave legacy ownership unclaimed and fail closed on unprovenanced code collisions

## 3. Dependent fixtures

- [x] 3.1 Remap `prisma/seed/fixtures/course-assignments.ts` (12 assignments + 9 memberships) per mapping table in design D5
- [x] 3.2 Remap `prisma/seed/fixtures/outcomes.ts` CILO course references (IT-OD-401→ITRES1, MKT301→MM201, FIN101→FM200, EDUC301→ENG2, HM401→HTC401, BEED301→EDUC11E, SW301→SW312)
- [x] 3.3 Remap `prisma/seed/fixtures/evaluations.ts` `newCourseBoundDefs` and `prisma/seed/runners/seed-evaluations.ts` (cbEval1 IT-OD-401→ITRES1, cbEval2 MKT301→MM201, newCb courses, deployment names)
- [x] 3.4 Remap `prisma/seed/fixtures/responses.ts` deployment keys + header comment
- [x] 3.5 Update `src/__tests__/scripts/verify-production-auth-boundary.test.ts` marker `IT-OD-401` → `ITRES1`
- [x] 3.6 Replace inherited qualitative response text for FM200, ENG2, and HTC401 with current-course feedback and add fixture regression test
- [x] 3.7 Exclude inactive Courses from baseline generation and add regression test for obsolete seeded Courses

## 4. Verification

- [x] 4.1 Grep sweep for all removed codes across `prisma/` and `src/` (IT-OD-401, GEGS101, IT401, IT-CAP-401, EDUC101/201/301, ENG201-as-BSED, MATH201, SCI201, BEED101/102/201/201B/301, BA101, MKT301, HRDM201/302, FIN101/303, SW101/201/202/301/401, HM101/201/301/302/401)
- [x] 4.2 `pnpm lint` + `pnpm build`
- [x] 4.3 `pnpm test` (unit) including new fixture test
- [x] 4.4 Optional (disposable DB only): `RUN_DATABASE_INTEGRATION_TESTS=1 pnpm test:db`, `pnpm db:seed` twice (idempotency), baseline generation spot check
- [x] 4.5 Apply migration on disposable PostgreSQL, regenerate Supabase types, verify provenance initialization/trigger and run seed twice
