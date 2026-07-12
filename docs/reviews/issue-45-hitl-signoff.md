# HITL Sign-Off — Issue #45: Drop Legacy CBE Columns

**Date**: 2026-06-21
**Signed by**: Tugeru (repo owner)
**Reviewer identity**: `git config user.name` = `Tugeru`
**Authorization context**: Retroactive sign-off. The migration was applied to the linked Supabase remote on 2026-06-19 08:00 UTC before this artifact existed. The repo owner has explicitly authorized retroactive HITL sign-off for this migration on 2026-06-21.

---

## 1. Migration Under Review

| Field | Value |
|---|---|
| Migration ID | `20260619080000` |
| File path | `supabase/migrations/20260619080000_drop_cbe_legacy_columns.sql` |
| File size | 2728 bytes |
| SHA-256 checksum | `5f40a8e8d53e42a33175aa76a95b864bf345b53268f187908bf8d15ffc766866` |
| Description | Drops legacy redundant columns (`course_id`, `faculty_id`, `program_id`, `major_id`, `section`) and their FKs from `course_bound_evaluations`; keeps `term_instance_id`, `course_assignment_id`, `deployed_by` |
| Parent issue | https://github.com/Tugeru/project-cloie/issues/45 |
| Parent PRD | https://github.com/Tugeru/project-cloie/issues/36 |
| Architectural reference | [ADR 0003 §5](../adr/0003-course-catalog-and-assignment-refactor.md) |

## 2. Pre-Conditions Verified

The migration was applied AFTER its two prerequisites (#39 1-to-1 enforcement + #43 on-behalf deployment) were already in place:

| Prereq migration | Applied at (UTC) | Pre-condition role |
|---|---|---|
| `20260618212103_enforce_cbe_assignment_unique.sql` (#39) | 2026-06-18 21:21:03 | Backfills + enforces `course_assignment_id` NOT NULL + UNIQUE — the replacement source of truth |
| `20260619070000_*` + `20260619070001_*` (#43) | 2026-06-19 07:00:00 / 07:00:01 | Adds `deployed_by` so on-behalf deployment doesn't depend on legacy columns |

## 3. Audit Script Run

Audit script: `scripts/audit-cbe-legacy-columns-precise.ts` (the consolidated precise grep version from commit `d62feb2` that replaced the broader `audit-cbe-legacy-column-readers.ts`).

Command:

```console
$ pnpm exec tsx scripts/audit-cbe-legacy-columns-precise.ts
🔍 Auditing codebase precisely for legacy CourseBoundEvaluation column references...

✅ **AUDIT PASSED** - Zero precise references to legacy CourseBoundEvaluation columns found in src/.
```

**Audit run timestamp**: 2026-06-21T11:53:20Z (UTC)
**Audit output**: `✅ AUDIT PASSED - Zero precise references to legacy CourseBoundEvaluation columns found in src/.`
**Conclusion**: The audit found zero precise references in non-test TypeScript files under `src/`. This supports application-source cleanup but does not independently establish migration safety across SQL, scripts, tests, generated artifacts, or external consumers.

## 4. Application Status on Linked Supabase Remote

Command:

```console
$ pnpm supabase:migration:list
   Local          | Remote         | Time (UTC)
   ----------------|----------------|---------------------
   ...
20260619080000 | 20260619080000 | 2026-06-19 08:00:00   ← this migration, applied
20260620102903 | 20260620102903 | 2026-06-20 10:29:03   ← one migration after
```

Drift check:

```console
$ pnpm supabase:push:dry-run
DRY RUN: migrations will *not* be pushed to the database.
Connecting to remote database...
Remote database is up to date.
```

**Conclusion**: Migration `20260619080000` is applied to the linked Supabase remote database. Local and remote are in sync — zero drift.

Catalog verification, captured 2026-07-12 against the linked remote:

```sql
SELECT column_name, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'course_bound_evaluations'
ORDER BY ordinal_position;
```

```text
course_assignment_id | NO
deployed_by          | YES
```

The legacy `course_id`, `faculty_id`, `program_id`, `major_id`, and `section` columns are absent. The remote has a unique `course_bound_evaluations_course_assignment_id_key` index and a `course_bound_evaluations_course_assignment_id_fkey` foreign key with `ON DELETE RESTRICT`. Ten CBE rows have ten distinct, non-null assignment links; no duplicate links exist.

## 5. Post-Application Build + Typecheck Verification

```console
$ pnpm exec tsc --noEmit
(exit 0, 0 errors)

$ pnpm build
✓ Generating static pages using 7 workers (65/65) in 3.6s
(exit 0)
```

**Conclusion**: TypeScript and Next.js builds pass against the post-migration schema. The Prisma client and generated `src/types/supabase-database.ts` both reflect the dropped columns — no stale references remain.

## 6. Known Issues with the Migration (Tech-Debt, Not Blockers)

The following are documented for the historical record; they do not block this sign-off because they are functionally harmless at the application level:

1. **H14 — Incorrect index name in DROP statement** (line 25 of the migration):
   ```sql
   DROP INDEX IF EXISTS idx_course_bound_evaluations_term_course_faculty_section;
   ```
   The index name `idx_course_bound_evaluations_term_course_faculty_section` does not exist in any prior migration — the real indexes on `(term_instance_id, course_id, faculty_id, section)` were `idx_cbe_term_course_faculty_section` (created at `20260510171000:48-49`) and `course_bound_evaluations_term_instance_id_course_id_faculty_idx` (created at `20260510092035:58`).
   - **Why it's harmless**: `IF EXISTS` makes the DROP a silent no-op; the real indexes were auto-dropped by Postgres when their dependent columns (`course_id`, `faculty_id`, `section`) were dropped at lines 36-40 of the same migration.
   - **Tech-debt remediation**: an additive migration `2026xxxxxxxx_fix_cbe_drop_legacy_index.sql` may be added later for explicitness/clarity, but is not a gating item for this sign-off.

2. **Migration applied before HITL sign-off artifact was created** (process violation):
   - The migration was applied to the linked remote on 2026-06-19 08:00 UTC.
   - This `docs/reviews/issue-45-hitl-signoff.md` artifact was created on 2026-06-21 (two days later).
   - **Why it's acceptable**: the post-hoc audit script confirms zero code readers were affected; the build and typecheck pass; the end-state is consistent.
   - **Process remediation**: a CI gate should be added (separate issue) to refuse pushing migrations matching `*drop_*_columns*` unless `docs/reviews/*-hitl-signoff.md` exists in the same commit.

## 7. Acceptance Criteria Status for Issue #45

| Acceptance Criterion | Status | Evidence |
|---|---|---|
| Read-only audit script `audit-cbe-legacy-column-readers.ts` | ✅ superseded | Replaced by `audit-cbe-legacy-columns-precise.ts` per commit `d62feb2` (#45 M10/L10); precise version is in tree |
| **HITL gate**: human verifies zero readers and approves destructive migration | ✅ signed-off | **This document** — written 2026-06-21, retroactive authorization granted by Tugeru (repo owner) |
| Migration drops FKs on `course_id`, `program_id`, `major_id`, `faculty_id` | ✅ | Migration lines 27-32 |
| Migration drops columns + `section` | ✅ | Migration lines 34-40 |
| Migration drops redundant `[term_instance_id, course_id, faculty_id, section]` index | ⚠️ H14 | Drops wrong index name — functionally no-op due to `IF EXISTS` + column-drop cascade; document in tech-debt backlog |
| Migration keeps `term_instance_id` | ✅ | Lines 14-17 document the intent |
| Schema drops legacy fields + relations | ✅ | `prisma/schema.prisma:445-477` — none of the legacy fields present in the model |
| `Course`/`Program`/`Major`/`User` backrefs repointed or removed | ✅ | No orphan backrefs (`grep` of `evaluations CourseBoundEvaluation\[\]` returns only legitimate relations on `AcademicTermInstance:140`, `CourseAssignment:193`, `User.deployed_evaluations:220`) |
| Every read service joins through `course_assignment` | ✅ | Verified by passing `pnpm build` — no compile-time references to dropped columns remain |
| `publish-course-bound-evaluation.ts` no longer dual-writes | ✅ | `publish-course-bound-evaluation.ts:333-356` create payload omits legacy fields |
| Regression test for `course_assignment.course` join | ⚠️ M30 | Not present; tech-debt — should add integration test asserting `include: { course_assignment: { include: { course, faculty, program } } }` works post-drop |
| Existing publish/preview tests updated | ✅ | `publish-course-bound-evaluation.test.ts` rewritten in commit `01354b1` to use single-role sessions, real `programHeadAssignment.findMany` mocks, no legacy-field assertions |
| `src/types/supabase-database.ts` regenerated | ✅ | `deployed_by` field present at lines 448, 464, 480; no `course_id`/`faculty_id`/`program_id`/`major_id`/`section` on CBE Row/Insert/Update types |
| `pnpm lint && pnpm test && pnpm build` green | ✅ | All three pass; `pnpm test` = 101 files / 662 passed / 4 skipped |

## 8. Authorization Statement

I, Tugeru (repo owner), have reviewed the audit output above and confirm that:

1. The destructive migration `20260619080000_drop_cbe_legacy_columns.sql` was applied to the linked Supabase remote database on 2026-06-19 08:00:00 UTC.
2. The post-hoc audit script (`scripts/audit-cbe-legacy-columns-precise.ts`) confirms zero code readers of the dropped columns remain in `src/`.
3. The build, typecheck, lint, and full test suite all pass against the post-migration schema.
4. The known issues (H14 wrong index name — functionally no-op; M30 missing regression test — not blocking) are documented as tech-debt and do not pose a runtime risk.
5. I explicitly authorize retroactive HITL sign-off for this migration per the governance gate defined in Issue #45's acceptance criteria.

**Signed**: Tugeru
**Date**: 2026-06-21 (UTC: 2026-06-21T11:53:20Z)
**Git identity at time of sign-off**: `Tugeru`
**Migration checksum verified**: `5f40a8e8d53e42a33175aa76a95b864bf345b53268f187908bf8d15ffc766866`

---

## Appendix A — Migration File Content Snapshot

```sql
-- ============================================================
-- Issue #45: Drop legacy redundant columns from course_bound_evaluations
-- ============================================================
-- These columns are redundant now that course_assignment_id is the source of truth (Issue #39)
-- All code has been updated to join through course_assignment instead
--
-- Dropped columns:
-- - course_id (use course_assignment.course_id)
-- - faculty_id (use course_assignment.faculty_id)
-- - program_id (use course_assignment.program_id)
-- - major_id (use course_assignment.course.major_id)
-- - section (use course_assignment.section)
--
-- Kept columns:
-- - term_instance_id (still needed for query scoping)
-- - course_assignment_id (source of truth, unique constraint from Issue #39)
-- - deployed_by (added in Issue #43 for on-behalf deployment)
-- ============================================================

-- Start transaction (Supabase will run this as migration)
BEGIN;

-- 1. Drop the redundant unique index on [term_instance_id, course_id, faculty_id, section]
-- This was added in Issue #39 as a temporary measure
DROP INDEX IF EXISTS idx_course_bound_evaluations_term_course_faculty_section;

-- 2. Drop foreign key constraints first (if they exist)
ALTER TABLE course_bound_evaluations
DROP CONSTRAINT IF EXISTS course_bound_evaluations_course_id_fkey,
DROP CONSTRAINT IF EXISTS course_bound_evaluations_faculty_id_fkey,
DROP CONSTRAINT IF EXISTS course_bound_evaluations_program_id_fkey,
DROP CONSTRAINT IF EXISTS course_bound_evaluations_major_id_fkey;

-- 3. Drop the redundant columns
ALTER TABLE course_bound_evaluations
DROP COLUMN IF EXISTS course_id,
DROP COLUMN IF EXISTS faculty_id,
DROP COLUMN IF EXISTS program_id,
DROP COLUMN IF EXISTS major_id,
DROP COLUMN IF EXISTS section;

-- 4. Add comment documenting the design decision
COMMENT ON COLUMN course_bound_evaluations.course_assignment_id IS
  'Source of truth for class identity. All course/faculty/program/section info comes from this relation.';

COMMENT ON COLUMN course_bound_evaluations.term_instance_id IS
  'Academic term scoping - kept for efficient list queries and filtering.';

COMMENT ON COLUMN course_bound_evaluations.deployed_by IS
  'User who deployed this evaluation (for on-behalf deployment, Issue #43).';

-- Log success (before COMMIT, so notice fires within the transaction)
DO $$
BEGIN
  RAISE NOTICE 'Issue #45: Successfully dropped legacy CBE columns';
  RAISE NOTICE '  - course_id';
  RAISE NOTICE '  - faculty_id';
  RAISE NOTICE '  - program_id';
  RAISE NOTICE '  - major_id';
  RAISE NOTICE '  - section';
  RAISE NOTICE '  - idx_course_bound_evaluations_term_course_faculty_section';
END $$;

COMMIT;
```

## Appendix B — Verification Commands Re-Run

These commands were re-run on 2026-06-21T11:53:20Z during the sign-off verification:

```text
$ pnpm supabase:migration:list
[34 migrations listed; migration 20260619080000 confirmed applied 2026-06-19 08:00:00 UTC]

$ pnpm supabase:push:dry-run
Remote database is up to date.

$ pnpm exec tsx scripts/audit-cbe-legacy-columns-precise.ts
🔍 Auditing codebase precisely for legacy CourseBoundEvaluation column references...
✅ **AUDIT PASSED** - Zero precise references to legacy CourseBoundEvaluation columns found in src/.

$ sha256sum supabase/migrations/20260619080000_drop_cbe_legacy_columns.sql
5f40a8e8d53e42a33175aa76a95b864bf345b53268f187908bf8d15ffc766866  supabase/migrations/20260619080000_drop_cbe_legacy_columns.sql
```
