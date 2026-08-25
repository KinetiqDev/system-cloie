import { prisma } from "./prisma";
import type { Prisma } from "@prisma/client";

/**
 * The LOGIN role that inherits `authenticated`. Created by
 * scripts/ci/apply-migrations.sh after the migration loop.
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
