import { beforeEach, describe, expect, it, vi } from "vitest";
import { SystemRole } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { revokeUserRole } from "@/features/users/services/manage-users";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { ROLES } from "@/lib/constants/roles";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    userRole: {
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
    programHeadAssignment: {
      count: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/features/auth/services/resolve-auth-session", () => ({
  resolveAuthSession: vi.fn(),
}));

const SECRETARY_ID = "123e4567-e89b-12d3-a456-426614174000";
const TARGET_ID = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";

describe("revokeUserRole Program Head gate", () => {
  let mockTx: {
    $queryRaw: ReturnType<typeof vi.fn>;
    programHeadAssignment: { count: ReturnType<typeof vi.fn> };
    userRole: { delete: ReturnType<typeof vi.fn> };
  };

  beforeEach(() => {
    vi.clearAllMocks();

    (resolveAuthSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: SECRETARY_ID,
      activeRole: ROLES.SECRETARY,
      roles: [ROLES.SECRETARY],
    });

    (prisma.userRole.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      user_id: TARGET_ID,
      role: SystemRole.PROGRAM_HEAD,
    });

    mockTx = {
      $queryRaw: vi.fn().mockResolvedValue(undefined),
      programHeadAssignment: { count: vi.fn() },
      userRole: { delete: vi.fn().mockResolvedValue({ id: "role-1" }) },
    };
    (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(async (cb) =>
      cb(mockTx)
    );
  });

  it("rejects revoking the Program Head role while any assignment is active", async () => {
    mockTx.programHeadAssignment.count.mockResolvedValue(2);

    const result = await revokeUserRole(TARGET_ID, SystemRole.PROGRAM_HEAD);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/deactivate all program-head assignments/i);
    }
    expect(mockTx.userRole.delete).not.toHaveBeenCalled();
  });

  it("allows revoking the Program Head role once every assignment is deactivated", async () => {
    mockTx.programHeadAssignment.count.mockResolvedValue(0);

    const result = await revokeUserRole(TARGET_ID, SystemRole.PROGRAM_HEAD);

    expect(result.success).toBe(true);
    expect(mockTx.userRole.delete).toHaveBeenCalledWith({ where: { user_id: TARGET_ID } });
  });

  it("serializes the active-assignment count with assignment-set administration", async () => {
    mockTx.programHeadAssignment.count.mockResolvedValue(0);

    const result = await revokeUserRole(TARGET_ID, SystemRole.PROGRAM_HEAD);

    expect(result.success).toBe(true);
    expect(mockTx.$queryRaw).toHaveBeenCalledTimes(1);
  });

  it("keys the advisory lock on a 64-bit hash of the user-scoped key", async () => {
    mockTx.programHeadAssignment.count.mockResolvedValue(0);

    const result = await revokeUserRole(TARGET_ID, SystemRole.PROGRAM_HEAD);

    expect(result.success).toBe(true);
    const lockSql = mockTx.$queryRaw.mock.calls[0]?.[0][0] ?? "";
    const lockKey = mockTx.$queryRaw.mock.calls[0]?.[1] ?? "";
    expect(lockSql).toContain("pg_advisory_xact_lock(hashtextextended");
    expect(lockKey).toContain(`cloie:program-head-assignment-set:${TARGET_ID}`);
  });

  it("does not delete the role when the count check fails inside the transaction", async () => {
    mockTx.userRole.delete.mockRejectedValue(new Error("DB write failed"));

    // Database failures propagate instead of becoming a user-facing denial.
    await expect(revokeUserRole(TARGET_ID, SystemRole.PROGRAM_HEAD)).rejects.toThrow(
      /db write failed/i
    );
  });
});
