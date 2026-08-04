import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db/prisma";
import { applyProgramHeadAssignmentSet } from "@/features/users/services/manage-users";

/**
 * Opt-in invariant suite (gate #149): runs only with a disposable
 * DATABASE_URL and RUN_DATABASE_INTEGRATION_TESTS=1. Never run against
 * hosted Supabase.
 */
describe.skipIf(
  !process.env.DATABASE_URL || process.env.RUN_DATABASE_INTEGRATION_TESTS !== "1"
)("Program Head assignment-set unique-key invariant", () => {
  const TEST_USER_ID = "00000000-0000-4000-8000-00000000a219";
  const TEST_PROGRAM_ID = "00000000-0000-4000-8000-00000000b219";

  beforeAll(async () => {
    await prisma.$transaction(async (tx) => {
      await tx.user.create({
        data: {
          id: TEST_USER_ID,
          first_name: "Invariant",
          last_name: "Program Head",
          email: `ph-invariant-${Date.now()}@cloie.test`,
          is_active: true,
          roles: { create: { role: "PROGRAM_HEAD" } },
        },
      });
      await tx.program.create({
        data: {
          id: TEST_PROGRAM_ID,
          code: `INV-PH-${Date.now()}`,
          name: "Invariant Program Head Program",
        },
      });
    });
  });

  afterAll(async () => {
    // The user delete cascades the assignment rows, which unblocks the
    // restrictive Program foreign key.
    await prisma.user.delete({ where: { id: TEST_USER_ID } }).catch(() => undefined);
    await prisma.program.delete({ where: { id: TEST_PROGRAM_ID } }).catch(() => undefined);
  });

  it("concurrent reactivation attempts leave exactly one active row", async () => {
    // Seed one historical (inactive) row, then race two reactivation writers
    // for the same compound key.
    await prisma.programHeadAssignment.create({
      data: {
        program_head_id: TEST_USER_ID,
        program_id: TEST_PROGRAM_ID,
        is_active: false,
      },
    });

    await Promise.all([
      applyProgramHeadAssignmentSet(prisma, {
        programHeadId: TEST_USER_ID,
        programIds: [TEST_PROGRAM_ID],
      }),
      applyProgramHeadAssignmentSet(prisma, {
        programHeadId: TEST_USER_ID,
        programIds: [TEST_PROGRAM_ID],
      }),
    ]);

    const rows = await prisma.programHeadAssignment.findMany({
      where: { program_head_id: TEST_USER_ID, program_id: TEST_PROGRAM_ID },
      select: { is_active: true },
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]?.is_active).toBe(true);
  });

  it("concurrent creation attempts for a brand-new Program converge to one row", async () => {
    const programId = "00000000-0000-4000-8000-00000000c219";
    await prisma.program.create({
      data: { id: programId, code: `INV-PH-NEW-${Date.now()}`, name: "Invariant New Program" },
    });

    try {
      await Promise.all([
        applyProgramHeadAssignmentSet(prisma, {
          programHeadId: TEST_USER_ID,
          programIds: [programId],
        }),
        applyProgramHeadAssignmentSet(prisma, {
          programHeadId: TEST_USER_ID,
          programIds: [programId],
        }),
      ]);

      const rows = await prisma.programHeadAssignment.findMany({
        where: { program_head_id: TEST_USER_ID, program_id: programId },
        select: { is_active: true },
      });

      expect(rows).toHaveLength(1);
      expect(rows[0]?.is_active).toBe(true);
    } finally {
      await prisma.programHeadAssignment
        .deleteMany({ where: { program_head_id: TEST_USER_ID, program_id: programId } })
        .catch(() => undefined);
      await prisma.program.delete({ where: { id: programId } }).catch(() => undefined);
    }
  });
});
