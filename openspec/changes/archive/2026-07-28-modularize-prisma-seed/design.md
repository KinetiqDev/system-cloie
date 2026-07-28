## Context

### Current hotspot and responsibility analysis

`prisma/seed.ts` is 3,438 lines. It currently combines five responsibilities behind one process entry point:

| Current section | Lines | Responsibility | Current state contract |
|---|---:|---|---|
| Seed-only types | 25-51 | Instrument JSON shape | Must remain seed-only; production instrument types are not a dependency. |
| UUID constants | 54-111 | Stable user, deployment, school-year, term-instance, and Course-bound fixture identity | Every string stays byte-for-byte unchanged. |
| Likert and template fixtures | 114-604 | Template structure, prompts, ordering, descriptors | JSON content and template version behavior stay unchanged. |
| User fixtures | 607-767 | All demo accounts and roles | IDs, emails, names, roles, profiles, statuses, invites, timestamps stay unchanged. |
| Shared helpers | 770-845 | Template upsert/versioning, assignment find-or-create, roster lookup | Query behavior and failure messages stay unchanged. |
| `seedFoundation` | 851-1273 | Programs, majors, Courses | Returns maps keyed by existing catalog codes. |
| `seedAcademicCalendar` | 1279-1466 | School years, lifecycle term fixtures, ordered dependent-data reset | Deletes managed-period children before recreating term fixtures; toggles immutable readiness trigger in `try/finally`. |
| `seedUsers` | 1472-1742 | Users, single roles, profiles, term placement, affiliations, assignments, invites | Requires catalog maps and active term. |
| `seedCourseAssignments` and memberships | 1748-1900 | Course assignments and explicit Course-assignment rosters | Uses class identity lookup and roster fixtures, never infers roster from term placement. |
| `seedOutcomes` | 1906-2209 | GOs, course-level CILOs, mappings | Returns CILO map used for deployment snapshots/bindings. |
| `seedTemplates` | 2215-2246 | Template/version records | Must precede deployments that find version 1. |
| `seedEvaluations` | 2252-2684 | Course-bound evaluations, targets, bindings, central deployments, assignments | Uses assignment-map guard and throws on absent Course assignment. |
| `seedResponses` | 2690-3385 | Responses and item values | Requires deployment assignments and retains find-or-create item behavior. |
| `main` | 3391-3438 | Env startup, order, readiness snapshot timing, Vitest guard, exit/disconnect | Public process behavior; must remain semantically identical. |

The useful seam is phase execution. Each runner hides Prisma writes and fixture traversal behind one phase interface. `seed.ts` remains one ordered caller. This gives locality without creating adapters: only one Prisma implementation exists and no alternate adapter is needed.

### Domain and database constraints

- Academic Structure owns Programs and Majors. Courses and Catalog defaults remain Course Catalog and Assignments data.
- Academic Calendar owns School years and academic periods. The active academic period is needed before Student term placement and Course assignments.
- Identity and Access has one `UserRole` per User. Seeded users use stable domain `User.id` values, not Supabase Auth identities, per ADR 0002 and ADR 0001.
- Course-assignment rosters are explicit `CourseAssignmentMembership` records, never derived from `StudentEnrollment`, per ADR 0007.
- GOs are program-level, CILOs are course-level, and mappings are explicit, per ADR 0005.
- SQL migrations own the readiness-snapshot immutable trigger and SQL-only constraints. Seed calendar reset temporarily disables only that existing trigger, re-enables it in `finally`, and must not change migrations or schema.

### Dependency graph and execution order

```text
foundation
  ├─ catalog maps ───────────────┬─ users ─────────────┐
  │                              ├─ Course assignments ├─ explicit rosters
  │                              └─ outcomes ──────────┤
academic calendar ─ active term ─┘                     │
  └─ completed term ─ outcomes ─ readiness snapshot    │
                                                        │
instrument templates ──────────────────────────────────┤
                                                        v
                   Course assignments + outcomes + templates + active term
                                      └─ deployments and evaluation assignments
                                                            └─ responses and items
```

Exact serial order:

1. Foundation.
2. Academic Calendar reset, school years, and term instances.
3. Users, roles, profiles, affiliations, invites, and active-term Student placement.
4. Course assignments, then explicit Course-assignment memberships.
5. Outcomes and mappings.
6. `persistPeriodReadinessSnapshot(termInstances.ti2026First.id)`.
7. Instrument templates and version 1 records.
8. Course-bound evaluations, central deployments, targets, bindings, and evaluation assignments.
9. Responses and quantitative/qualitative items.

No phase runs in parallel. Calendar reset removes records later phases recreate. Readiness snapshot intentionally follows prerequisite outcomes and precedes templates/deployments. Responses require assignments created by deployments.

## Goals / Non-Goals

**Goals:**

- Make `prisma/seed.ts` a thin entry point while retaining its exact startup and shutdown behavior.
- Place fixture content, deterministic IDs, helpers, runner operations, and context types in cohesive `prisma/seed/` modules.
- Preserve every seeded record and exact dependency order.
- Make phase input/output dependencies explicit and importable under Vitest without running the seed process.
- Retain safe repeated execution against development data.

**Non-Goals:**

- No Prisma schema, migration, SQL trigger, RLS, generated Supabase type, package dependency, or production-feature change.
- No fixture-content redesign, model normalization, field rename, query optimization, or generic seed framework.
- No production-module placement for seed data/helpers.
- No parallel seeding or transaction redesign.
- No change to `pnpm db:seed`, `loadEnvConfig(process.cwd())`, `VITEST` guard, process exit behavior, or `$disconnect()` finalization.

## Decisions

### 1. Use seed-only domain runners and literal fixture modules

Create this tree, subject only to implementation-time validation against current source. No file gets created if its extracted contents do not form a cohesive module.

```text
prisma/
├── seed.ts
└── seed/
    ├── constants/
    │   └── ids.ts
    ├── fixtures/
    │   ├── academic-structure.ts
    │   ├── academic-calendar.ts
    │   ├── users.ts
    │   ├── course-assignments.ts
    │   ├── outcomes.ts
    │   ├── instruments.ts
    │   ├── evaluations.ts
    │   └── responses.ts
    ├── helpers/
    │   ├── assignments.ts
    │   ├── responses.ts
    │   └── templates.ts
    ├── runners/
    │   ├── seed-foundation.ts
    │   ├── seed-academic-calendar.ts
    │   ├── seed-users.ts
    │   ├── seed-course-assignments.ts
    │   ├── seed-outcomes.ts
    │   ├── seed-instruments.ts
    │   ├── seed-evaluations.ts
    │   └── seed-responses.ts
    └── types.ts
```

Fixture modules hold only existing literal definitions and existing TypeScript narrowing. Runner modules own Prisma calls and preserve their existing loops, query predicates, write order, log messages, errors, and control flow. Helpers own existing shared database operations; they do not introduce a repository or adapter layer.

**Alternative rejected:** split by arbitrary size or one file per model. This turns a deep phase module into shallow pass-through files and hides ordering across callers.

**Alternative rejected:** import or move fixtures into `src/features/**`. Fixtures are development-only and must not couple production modules to demo data.

### 2. Keep identifiers in one explicit seed namespace

Move `U` and `D` unchanged to `prisma/seed/constants/ids.ts`, exported under their existing names. All fixture and runner imports use those objects. No UUID generation, renaming, aliases, or ID lookup abstraction is introduced.

Stable IDs are required by school-year/term reset ownership, central deployment upserts, Course-bound evaluation fixtures, response lookup, and development/test workflows. Natural keys remain unchanged where current seed uses them.

### 3. Define small phase context types

`prisma/seed/types.ts` defines existing map shapes and named return contexts without changing values:

| Runner | Input | Return |
|---|---|---|
| `seedFoundation` | none | `FoundationContext` with `programs`, `majors`, `courses` maps keyed exactly as current `pMap`, `mMap`, `cMap`. |
| `seedAcademicCalendar` | none | `AcademicCalendarContext` with active `termInstance` and four named lifecycle `termInstances`. |
| `seedUsers` | foundation + active term ID | existing student fixture result, retained only if an actual downstream caller needs it. |
| `seedCourseAssignments` | foundation + active term ID | `CourseAssignmentContext` with assignment map keyed by current composite key format. |
| `seedOutcomes` | foundation | `OutcomeContext` with GO and CILO maps. |
| `seedInstruments` | none | `void`; evaluations keep existing version lookup behavior. |
| `seedEvaluations` | foundation + outcomes + active term ID + course assignments | `EvaluationContext` with first two Course-bound evaluations and current new-course map. |
| `seedResponses` | evaluation context | `void`. |

`courseAssignmentKey` moves with Course-assignment helpers and remains the sole key constructor. The startup assertion test changes from a mirrored copy to direct import of this helper/guard only after extraction proves import has no side effects.

**Alternative rejected:** mutable global seed context. Explicit inputs make foreign-key ordering and tests visible; a global object would hide required phase prerequisites.

**Alternative rejected:** pass Prisma client into every runner. Current source uses the singleton client and has one implementation. A second adapter is hypothetical, so adding this seam reduces depth without leverage.

### 4. Preserve current idempotency mechanisms exactly

The refactor moves existing behavior without replacing it:

| Data | Existing mechanism retained |
|---|---|
| Programs, Majors, Courses, Users, roles, profiles, affiliations, Program Head assignments, invites, templates, versions, central deployments, memberships, targets | Existing `upsert` selectors and update/create data. |
| Course assignments | Existing class-identity `findFirst` then conditional create. |
| Course-bound evaluations | Existing course-assignment and active-term lookup then update/create. |
| Evaluation assignments, responses, and response items | Existing find-or-create predicates and insertion order. |
| CILO mappings | Existing existence check then create. |
| CILO question bindings | Existing `createMany({ skipDuplicates: true })`. |
| Managed academic periods and all dependent fixtures | Existing child-first deletes, trigger disable/enable `try/finally`, and deterministic period recreation. |

Do not make calendar reset transactional, concurrent, generic, or broader. Its hard-coded managed IDs define its owned development fixture scope. Do not change `findFirst` behavior to a new natural-key upsert or alter response-item update behavior.

### 5. Keep entry-point behavior local to `prisma/seed.ts`

`prisma/seed.ts` keeps:

- `loadEnvConfig(process.cwd())` before Prisma imports.
- Sequential `main` orchestration and existing log phase labels.
- Production readiness service import and call after `seedOutcomes` with completed `ti2026First` ID.
- `if (!process.env.VITEST)` process guard.
- `catch` log, `process.exit(1)`, and `$disconnect()` in `finally`.

No Server Component, Client Component, server action, cache, auth adapter, or new `"use client"` boundary exists in this design.

### 6. Complete old-section-to-new-module map

| Old `prisma/seed.ts` section | New module | Notes |
|---|---|---|
| Lines 25-51 types | `seed/types.ts` | Preserve seed-local instrument structure types and add phase contexts. |
| Lines 57-111 `U`, `D` | `seed/constants/ids.ts` | Values and exported names unchanged. |
| Lines 117-164 descriptor fixtures and `lq`/`oq` | `seed/fixtures/instruments.ts` | Keep exact structures and helper output. |
| Lines 170-604 template structures | `seed/fixtures/instruments.ts` | Preserve text, descriptors, ordering, requirement flags, and suggestions. |
| Lines 610-767 `allUsers` | `seed/fixtures/users.ts` | Preserve order and account values. |
| Lines 773-810 `upsertTemplate` | `seed/helpers/templates.ts` | Preserve template/version write behavior. |
| Lines 812-832 `ensureAssignment` | `seed/helpers/assignments.ts` | Preserve nullable deployment predicates. |
| Lines 834-845 roster lookup | `seed/helpers/assignments.ts` | Preserve active filter, created-time ordering, and error message. |
| Lines 851-1273 foundation fixture literals/runner | `seed/fixtures/academic-structure.ts`, `seed/runners/seed-foundation.ts` | Programs, majors, Courses, map construction. |
| Lines 1279-1466 calendar literals/reset/runner | `seed/fixtures/academic-calendar.ts`, `seed/runners/seed-academic-calendar.ts` | Keep exact deletion order and immutable-trigger `finally`. |
| Lines 1472-1742 user literals/runner | `seed/fixtures/users.ts`, `seed/runners/seed-users.ts` | Keep profiles, placements, affiliations, assignments, external profiles/invites. |
| Lines 1748-1900 assignment/roster fixtures/runner/key | `seed/fixtures/course-assignments.ts`, `seed/runners/seed-course-assignments.ts`, `seed/helpers/assignments.ts` | Preserve explicit memberships separate from placement. |
| Lines 1906-2209 outcome fixtures/runner | `seed/fixtures/outcomes.ts`, `seed/runners/seed-outcomes.ts` | Preserve GO/CILO/mapping data and order. |
| Lines 2215-2246 template runner | `seed/runners/seed-instruments.ts` | Uses instrument fixture structures and template helper. |
| Lines 2252-2684 evaluation fixtures/runner | `seed/fixtures/evaluations.ts`, `seed/runners/seed-evaluations.ts` | Preserve IDs, snapshots, timestamps, guards, bindings, recipients, and central assignments. |
| Lines 2690-2764 response helpers | `seed/helpers/responses.ts` | Preserve selectors and insert-only behavior. |
| Lines 2766-3385 response fixtures/runner | `seed/fixtures/responses.ts`, `seed/runners/seed-responses.ts` | Preserve every response status, timestamp, rating, key, and text. |
| Lines 3391-3438 main/process startup | `prisma/seed.ts` | Thin orchestration only. |

## Risks / Trade-offs

- **[Risk]** Extracting literals changes iteration or write order. **Mitigation:** mechanically move literal arrays in source order; runner loops preserve current serial `await` behavior; compare seeded data after two runs.
- **[Risk]** Calendar cleanup changes foreign-key or trigger sequencing. **Mitigation:** retain reset body as one runner block, same child-first statements and raw SQL strings, with the trigger `try/finally` untouched.
- **[Risk]** IDs drift after moving constants. **Mitigation:** one unchanged `U`/`D` module; targeted checks query representative fixed UUIDs and relationships.
- **[Risk]** New imports execute seed under Vitest. **Mitigation:** entry point alone starts `main`; runners/helpers/fixtures have no process-level execution; retain exact `VITEST` guard.
- **[Risk]** Test refactor masks current behavior. **Mitigation:** direct-import pure helper only, retain existing DB invariant suites, seed approved development database twice, and query fixture results.
- **[Risk]** Development database reset is destructive outside fixture-owned term IDs. **Mitigation:** scope remains identical to current managed term IDs; run only against approved development database; do not introduce broader cleanup.
- **[Risk]** Production readiness module changes create runtime coupling. **Mitigation:** preserve same import and call location in orchestration; no production-module edits.

## Migration Plan

1. Create constants, types, fixtures, helpers, and runners by mechanical extraction in dependency order.
2. Replace `prisma/seed.ts` body with imports and current sequential orchestration.
3. Add/adjust focused seed module tests without auto-running seed under Vitest.
4. On an approved disposable development database, run `pnpm db:seed` twice.
5. Query fixed fixture IDs and representative relationships, then run database invariant tests, lint, unit tests, and build.

No deployment migration occurs. Do not run `pnpm supabase:push`, create a migration, or regenerate Supabase types.

### Rollback

Revert only seed source and focused seed-test changes. Database rollback is unnecessary because a successful repeated seed already restores the existing logical fixture dataset; a failed extraction must stop before claiming equivalence. If first run modifies an approved development database before failure, restore it by running the last known-good seed revision, not by altering production migrations or schema.

## Open Questions

- Approved development database URL/schema is required before required live seed verification. Do not use shared hosted Supabase or production data.
- Implementation must re-check `git status` before edits and avoid unrelated untracked reports already present in worktree.
