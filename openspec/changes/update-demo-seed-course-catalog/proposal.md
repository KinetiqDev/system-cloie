## Why

The demo seed catalog contains 35 fabricated placeholder courses (GEGS101, IT-OD-401, EDUC101, BA101, …) while the official ACD curriculum — 102 courses across 6 programs — now exists in `docs/acd_programs_demo_seed_recommended_expanded.csv`. Demo traces, curriculum baseline DRAFTs, and course-bound evaluations currently run against invented courses, not the real catalog.

## What Changes

- Replace `courseDefinitions` in `prisma/seed/fixtures/academic-structure.ts` with the 102 CSV courses (5 GENERAL_EDUCATION + 97 PROGRAM_SPECIFIC). **BREAKING**: all fabricated codes (GEGS101, IT-OD-401, IT401, IT-CAP-401, EDUC101/201/301, ENG201 as BSED, MATH201, SCI201, BEED101/102/201/201B/301, BA101, MKT301, HRDM201/302, FIN101/303, SW101/201/202/301/401, HM101/201/301/302/401) are removed.
- Apply two transformation rules (recorded in the fixture): course codes normalized by stripping spaces (`IT 101` → `IT101`); blank `term` cells filled semester→term (`FIRST`→`FIRST_TERM`, `SECOND`→`SECOND_TERM`, `SUMMER`→`null`) so every course is baseline-eligible.
- Remap dependent seed fixtures and runners to CSV codes: course assignments + memberships, CILOs, course-bound evaluation definitions, response fixtures, and the `verify-production-auth-boundary` marker string.
- Add a unit test pinning fixture invariants (unique normalized codes, resolvable program/major references, complete placements).
- Fix the malformed `PRAC-BA` row in the CSV (missing trailing comma → dropped `term` column).

## Capabilities

### New Capabilities
- `demo-seed-course-catalog`: the demo seed course catalog mirrors the official ACD curriculum CSV, with deterministic normalization rules.

### Modified Capabilities
- `modular-prisma-seed`: the "Deterministic fixture identity and values" requirement currently pins preservation of every existing fixture record; it now permits (and documents) the course-catalog fixture replacement by intent, keeping the refactor-era guarantees for all other fixtures (users, periods, deployments, responses, roster memberships).

## Impact

- `prisma/seed/fixtures/academic-structure.ts` — full `courseDefinitions` rewrite.
- `prisma/seed/fixtures/course-assignments.ts`, `outcomes.ts`, `evaluations.ts`, `responses.ts` — course code references remapped.
- `prisma/seed/runners/seed-evaluations.ts` — string course codes and deployment names updated.
- `src/__tests__/scripts/verify-production-auth-boundary.test.ts` — marker course code updated (string only, no DB dependency).
- New: `src/__tests__/seed/academic-structure-fixture.test.ts`.
- `docs/acd_programs_demo_seed_recommended_expanded.csv` — malformed row fixed.
- No schema, migration, RLS, or API changes. Curriculum baseline generation (`generate-baseline.ts`) consumes the new course placement defaults unchanged.
