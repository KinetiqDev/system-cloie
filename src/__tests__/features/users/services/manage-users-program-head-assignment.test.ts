import { beforeEach, describe, expect, it, vi } from "vitest";
import { SystemRole } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { createProgramHeadAssignment } from "@/features/users/services/manage-users";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { ROLES } from "@/lib/constants/roles";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    userRole: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/features/auth/services/resolve-auth-session", () => ({
  resolveAuthSession: vi.fn(),
}));

const SECRETARY_ID = "123e4567-e89b-12d3-a456-426614174000";
const TARGET_ID = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
const PROG_ID = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22";

describe("createProgramHeadAssignment role recheck", () => {
  let mockTx: {
    $queryRaw: ReturnType<typeof vi.fn>;
    userRole: { findUnique: ReturnType<typeof vi.fn> };
    programHeadAssignment: { upsert: ReturnType<typeof vi.fn> };
  };

  beforeEach(() => {
    vi.clearAllMocks();

    (resolveAuthSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: SECRETARY_ID,
      activeRole: ROLES.SECRETARY,
      roles: [ROLES.SECRETARY],
    });

    mockTx = {
      $queryRaw: vi.fn().mockResolvedValue(undefined),
      userRole: { findUnique: vi.fn().mockResolvedValue({ role: SystemRole.PROGRAM_HEAD }) },
      programHeadAssignment: { upsert: vi.fn().mockResolvedValue({ id: "assignment-1" }) },
    };
    (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(async (cb) =>
      cb(mockTx)
    );
  });

  it("rejects with a ServiceResult when the role disappears before the locked transaction", async () => {
    // Pre-transaction fast path sees the role; the transaction-time recheck
    // (after the advisory lock) finds it revoked by a concurrent flow.
    (prisma.userRole.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      role: SystemRole.PROGRAM_HEAD,
    });
    mockTx.userRole.findUnique.mockResolvedValue(null);

    const result = await createProgramHeadAssignment({
      program_head_id: TARGET_ID,
      program_id: PROG_ID,
    });

    expect(result).toEqual({
      success: false,
      error: "Assign the Program Head role before linking a program assignment.",
    });
    expect(mockTx.programHeadAssignment.upsert).not.toHaveBeenCalled();
  });

  it("upserts the assignment when the role is still present in the locked transaction", async () => {
    (prisma.userRole.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      role: SystemRole.PROGRAM_HEAD,
    });

    const result = await createProgramHeadAssignment({
      program_head_id: TARGET_ID,
      program_id: PROG_ID,
    });

    expect(result.success).toBe(true);
    expect(mockTx.$queryRaw).toHaveBeenCalledTimes(1);
    expect(mockTx.programHeadAssignment.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          program_head_id_program_id: { program_head_id: TARGET_ID, program_id: PROG_ID },
        },
        create: { program_head_id: TARGET_ID, program_id: PROG_ID, is_active: true },
      })
    );
  });

  it("rethrows database failures instead of turning them into a denial", async () => {
    (prisma.userRole.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      role: SystemRole.PROGRAM_HEAD,
    });
    mockTx.programHeadAssignment.upsert.mockRejectedValue(new Error("DB write failed"));

    await expect(
      createProgramHeadAssignment({ program_head_id: TARGET_ID, program_id: PROG_ID })
    ).rejects.toThrow(/db write failed/i);
  });
});
