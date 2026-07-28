## 1. Seed foundation slice

Scope: Create seed-only contracts, deterministic IDs, instrument fixtures/helpers, academic-structure fixtures, and foundation runner. Preserve literal values and existing map keys.

Affected paths: `prisma/seed.ts`, `prisma/seed/types.ts`, `prisma/seed/constants/ids.ts`, `prisma/seed/fixtures/academic-structure.ts`, `prisma/seed/fixtures/instruments.ts`, `prisma/seed/helpers/templates.ts`, `prisma/seed/runners/seed-foundation.ts`, `prisma/seed/runners/seed-instruments.ts`.

Acceptance: `U` and `D` UUIDs are unchanged; all template structures remain literal-equivalent; foundation returns existing Program/Major/Course maps keyed identically; template/version upsert behavior is unchanged; no runner auto-executes on import.

Verification: focused type/module test if added; `pnpm lint`; `pnpm vitest run src/__tests__/scripts/seed-startup-assertion.test.ts`; `pnpm build`.

Proposed commit: `refactor(seed): extract foundation and instrument fixtures`

- [ ] 1.1 Extract seed-local types and unchanged `U`/`D` deterministic IDs into `prisma/seed/types.ts` and `prisma/seed/constants/ids.ts`.
- [ ] 1.2 Extract academic-structure and instrument fixture literals, including template JSON builders and descriptors, without content changes.
- [ ] 1.3 Extract template upsert/version helper plus foundation and instrument runners; retain existing queries, map keys, logs, and serial writes.
- [ ] 1.4 Replace corresponding `prisma/seed.ts` sections with imports while retaining entry-point startup behavior and run slice verification.

## 2. Calendar, identity, and roster slice

Scope: Extract academic-calendar, user, Course-assignment, and explicit Course-assignment-roster fixture/runners. Preserve child-first reset and immutable-trigger handling exactly.

Affected paths: `prisma/seed/fixtures/academic-calendar.ts`, `prisma/seed/fixtures/users.ts`, `prisma/seed/fixtures/course-assignments.ts`, `prisma/seed/helpers/assignments.ts`, `prisma/seed/runners/seed-academic-calendar.ts`, `prisma/seed/runners/seed-users.ts`, `prisma/seed/runners/seed-course-assignments.ts`, `prisma/seed.ts`, `src/__tests__/scripts/seed-startup-assertion.test.ts`.

Acceptance: managed academic-period cleanup preserves exact delete and trigger sequence; active-term placement still precedes Course assignments; Course-assignment class key and missing-assignment message stay unchanged; memberships remain explicit rather than inferred from Student enrollment; focused test imports actual helper without Prisma/process side effects.

Verification: `pnpm vitest run src/__tests__/scripts/seed-startup-assertion.test.ts`; `pnpm lint`; `pnpm build`.

Proposed commit: `refactor(seed): extract calendar users and roster runners`

- [ ] 2.1 Extract calendar fixtures and runner as one lifecycle module; preserve raw trigger SQL strings, `try/finally`, managed IDs, child-first deletes, and term creation order.
- [ ] 2.2 Extract user fixtures and runner; preserve all user/profile/role/status/invite values and active-term enrollment behavior.
- [ ] 2.3 Extract Course-assignment and membership fixtures/runner plus shared roster, assignment, composite-key, and assertion helpers.
- [ ] 2.4 Change `seed-startup-assertion.test.ts` to import the extracted pure key/guard helper; retain all current missing/present-key cases.
- [ ] 2.5 Reconnect extracted runners in `prisma/seed.ts` with current serial order and run slice verification.

## 3. Outcomes, deployments, and response slice

Scope: Extract outcome, deployment, and response fixtures/runners. Keep readiness snapshot call in orchestrator after outcomes and before instruments/deployments.

Affected paths: `prisma/seed/fixtures/outcomes.ts`, `prisma/seed/fixtures/evaluations.ts`, `prisma/seed/fixtures/responses.ts`, `prisma/seed/helpers/responses.ts`, `prisma/seed/runners/seed-outcomes.ts`, `prisma/seed/runners/seed-evaluations.ts`, `prisma/seed/runners/seed-responses.ts`, `prisma/seed.ts`.

Acceptance: GO/CILO/mapping fixtures and maps remain unchanged; deployment snapshots, fixed deployment IDs, course assignment guards, recipient selection, statuses, timestamps, response ratings, and response text remain unchanged; readiness snapshot stays after prerequisite data and before templates/deployments; response item insert-only behavior stays unchanged.

Verification: `pnpm vitest run src/__tests__/scripts/seed-startup-assertion.test.ts`; `pnpm lint`; `pnpm build`.

Proposed commit: `refactor(seed): extract outcome deployment and response runners`

- [ ] 3.1 Extract outcome fixture literals and runner, preserving GO/CILO creation, mapping predicates, and returned maps.
- [ ] 3.2 Extract deployment fixture literals and runner, preserving version lookups, snapshots, IDs, binding creation, roster recipients, and central assignments.
- [ ] 3.3 Extract response fixture literals, find-or-create response helper, item helpers, and response runner without changing values or selectors.
- [ ] 3.4 Reduce `prisma/seed.ts` to `loadEnvConfig`, runner imports, current serial orchestration, readiness snapshot call, `VITEST` guard, error exit, and disconnect finalization; run slice verification.

## 4. Determinism verification slice

Scope: Prove extracted seed behavior against an approved development database. Do not run against shared hosted Supabase or production database.

Affected paths: focused seed verification test/query only if required; no Prisma schema, migration, generated type, or Supabase migration path.

Acceptance: first and second `pnpm db:seed` executions both succeed; representative deterministic IDs and relationships match current fixtures; database-focused seeded roster and invariant tests pass with explicit opt-in; no duplicate or drift errors appear.

Verification: `pnpm db:seed` twice; approved database queries for representative User, School Year, academic period, deployment, Course-bound evaluation, roster membership, and response relationships; `RUN_DATABASE_INTEGRATION_TESTS=1 pnpm test:db`; `pnpm lint`; `pnpm test`; `pnpm build`.

Proposed commit: `test(seed): verify modular fixture idempotency`

- [ ] 4.1 Obtain or confirm approved disposable development database/schema before any destructive seed execution; stop if target is shared or production.
- [ ] 4.2 Run `pnpm db:seed` twice serially and record successful output from both runs.
- [ ] 4.3 Verify representative fixed fixture IDs, explicit Course-assignment roster relationships, readiness snapshot presence/timing contract, deployment assignments, and response item values with focused database queries or tests.
- [ ] 4.4 Run `RUN_DATABASE_INTEGRATION_TESTS=1 pnpm test:db`, `pnpm lint`, `pnpm test`, and `pnpm build`; investigate any failure as extraction regression before proceeding.

## 5. Refactor review slice

Scope: Confirm diff is extraction-only and OpenSpec artifacts match implementation before archive.

Affected paths: `prisma/seed.ts`, `prisma/seed/**`, focused seed tests, `openspec/changes/modularize-prisma-seed/**`.

Acceptance: no schema/migration/generated-type/dependency/production-feature changes; no unapproved fixture or order change; all task checks pass; proposal, spec, and design requirements are verified against resulting source.

Verification: `openspec validate --change modularize-prisma-seed`; `openspec-verify-change`; `code-review`; `git diff --check`; review `git diff -- prisma supabase/migrations src/types/supabase-database.ts package.json pnpm-lock.yaml`.

Proposed commit: `refactor(seed): modularize prisma seed`

- [ ] 5.1 Run OpenSpec verification against proposal, specs, design, tasks, and final source.
- [ ] 5.2 Run code review focused on fixture equivalence, sequencing, idempotency, Vitest guard, and shutdown behavior; resolve findings.
- [ ] 5.3 Review final diff for forbidden schema, migration, generated type, dependency, and production-module changes.
- [ ] 5.4 Commit approved changes with conventional commit, then archive through OpenSpec only after user approval.
