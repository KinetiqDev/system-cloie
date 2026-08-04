import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { deactivateProgramHeadAssignment } from "@/features/users/services/manage-users";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { ROLES } from "@/lib/constants/roles";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    $transaction: vi.fn(),
  },
}));

vi.mock("@/features/auth/services/resolve-auth-session", () => ({
  resolveAuthSession: vi.fn(),
}));

const SECRETARY_ID = "123e4567-e89b-12d3-a456-426614174000";
const TARGET_ID = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
const ASSIGNMENT_ID = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33";

describe("deactivateProgramHeadAssignment lock-first ownership", () => {
  let mockTx: {
    $queryRaw: ReturnType<typeof vi.fn>;
    programHeadAssignment: {
      findUnique: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
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
      programHeadAssignment: {
        findUnique: vi.fn().mockResolvedValue({ program_head_id: TARGET_ID }),
        update: vi.fn().mockResolvedValue({ id: ASSIGNMENT_ID }),
      },
    };
    (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(async (cb) =>
      cb(mockTx)
    );
  });

  it("acquires the per-Program-Head advisory lock before reading the row", async () => {
    const result = await deactivateProgramHeadAssignment(ASSIGNMENT_ID, TARGET_ID);

    expect(result.success).toBe(true);
    expect(mockTx.$queryRaw).toHaveBeenCalledTimes(1);
    const lockSql = mockTx.$queryRaw.mock.calls[0]?.[0][0] ?? "";
    expect(lockSql).toContain("pg_advisory_xact_lock(hashtextextended");
    const lockOrder = mockTx.$queryRaw.mock.invocationCallOrder[0];
    const readOrder = mockTx.programHeadAssignment.findUnique.mock.invocationCallOrder[0];
    expect(lockOrder).toBeLessThan(readOrder);
    expect(mockTx.programHeadAssignment.findUnique).toHaveBeenCalledWith({
      where: { id: ASSIGNMENT_ID },
      select: { program_head_id: true },
    });
    expect(mockTx.programHeadAssignment.update).toHaveBeenCalledWith({
      where: { id: ASSIGNMENT_ID },
      data: { is_active: false },
    });
  });

  it("throws when the assignment does not exist", async () => {
    mockTx.programHeadAssignment.findUnique.mockResolvedValue(null);

    await expect(deactivateProgramHeadAssignment(ASSIGNMENT_ID, TARGET_ID)).rejects.toThrow(
      /program head assignment not found/i
    );
    expect(mockTx.programHeadAssignment.update).not.toHaveBeenCalled();
  });

  it("throws when the assignment belongs to a different user than the lock key", async () => {
    mockTx.programHeadAssignment.findUnique.mockResolvedValue({
      program_head_id: "00000000-0000-4000-8000-00000000ffff",
    });

    await expect(deactivateProgramHeadAssignment(ASSIGNMENT_ID, TARGET_ID)).rejects.toThrow(
      /does not belong to the target user/i
    );
    expect(mockTx.programHeadAssignment.update).not.toHaveBeenCalled();
  });

  it("rejects unauthenticated callers", async () => {
    (resolveAuthSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const result = await deactivateProgramHeadAssignment(ASSIGNMENT_ID, TARGET_ID);

    expect(result).toEqual({ success: false, error: "Authentication required." });
    expect(mockTx.$queryRaw).not.toHaveBeenCalled();
  });

  it("rejects non-Secretary/dean callers", async () => {
    (resolveAuthSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: SECRETARY_ID,
      activeRole: ROLES.STUDENT,
      roles: [ROLES.STUDENT],
    });

    const result = await deactivateProgramHeadAssignment(ASSIGNMENT_ID, TARGET_ID);

    expect(result).toEqual({ success: false, error: "Insufficient permissions." });
    expect(mockTx.$queryRaw).not.toHaveBeenCalled();
  });
});
