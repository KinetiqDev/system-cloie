import { prisma } from "./prisma";
import type { Prisma } from "@prisma/client";

/**
 * The LOGIN role that inherits `authenticated`. Created by
 * scripts/ci/apply-migrations.sh before the migration loop (the default grants
 * block) so that migration REVOKE statements take effect.
 *
 * `SET LOCAL ROLE test_authenticated` makes RLS policies `TO authenticated`
 * fire (the role inherits authenticated), while `auth.uid()` returns the
 * `app.test_auth_uid` GUC (set per-transaction below).
 */
const RLS_TEST_ROLE = "test_authenticated";

/**
 * Run a callback inside a transaction with the given auth identity.
 *
 * Within the callback:
 *   - `auth.uid()` returns `authUid` (via the `app.test_auth_uid` GUC)
 *   - The session role is `test_authenticated` (inherits `authenticated`)
 *   - RLS policies `TO authenticated` fire normally
 *
 * Both `SET LOCAL` settings reset at transaction end — pooled connections
 * are never contaminated.
 */
export async function runRlsProbe<T>(
  authUid: string,
  fn: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    // Set GUC while still superuser, then switch to the authenticated role.
    await tx.$executeRaw`SELECT set_config('app.test_auth_uid', ${authUid}, true)`;
    await tx.$executeRawUnsafe(`SET LOCAL ROLE ${RLS_TEST_ROLE}`);
    return fn(tx);
  });
}

/**
 * Run a callback inside a transaction as the `anon` role.
 *
 * Mirrors how an unauthenticated Supabase request hits the Data API: RLS
 * policies `TO anon` would fire, and revoked privileges deny access. The
 * session role resets at transaction end.
 */
export async function runAnonProbe<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SET LOCAL ROLE anon`);
    return fn(tx);
  });
}
