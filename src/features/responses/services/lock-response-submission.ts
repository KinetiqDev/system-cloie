import type { Prisma } from "@prisma/client";

/**
 * Serializes final submissions for one Evaluation Assignment, including the
 * first submission before a Response row exists. The transaction-scoped lock
 * is released automatically on commit or rollback.
 */
export async function lockResponseSubmission(
  tx: Prisma.TransactionClient,
  assignmentId: string
): Promise<void> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${assignmentId}, 0))`;
}
