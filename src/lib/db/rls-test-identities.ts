/**
 * Fixed Supabase Auth UUIDs for live RLS probes.
 *
 * The disposable database's `auth.uid()` stub reads the `app.test_auth_uid`
 * GUC (set per-transaction by src/lib/db/rls-test-helpers.ts). Each constant
 * here is linked to a deterministic seeded domain user through
 * `users.auth_user_id` (see prisma/seed/fixtures/users.ts), so a probe run
 * with `auth.uid()` = one of these values executes the exact RLS policies a
 * real authenticated System CLOIE request of that identity would hit.
 *
 * The auth UUID deliberately differs from the public `users.id` PK — the
 * `u.id = auth.uid()` vs `u.auth_user_id = auth.uid()` distinction is the
 * bug the corrected secretary policies fix (20260618153711).
 */
export const RLS_AUTH_UUIDS = {
  /** demo-secretary@cloie.test — SECRETARY role. */
  SECRETARY: "00000000-0000-4000-8000-000000000001",
  /** demo-ph@cloie.test — PROGRAM_HEAD assigned to BSIT. */
  PROGRAM_HEAD_BSIT: "00000000-0000-4000-8000-000000000002",
  /** demo-faculty@cloie.test — FACULTY role; no write authority on RLS tables. */
  FACULTY: "00000000-0000-4000-8000-000000000000",
} as const;
