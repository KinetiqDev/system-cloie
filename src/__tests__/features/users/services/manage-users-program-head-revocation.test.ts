import { beforeEach, describe, expect, it, vi } from "vitest";
import { SystemRole } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { removeRoleFromUser } from "@/features/users/services/manage-users";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { ROLES } from "@/lib/constants/roles";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    userRole: {
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
    studentAcademicProfile: {
      findUnique: vi.fn(),
    },
    industryPartnerProfile: {
      findUnique: vi.fn(),
    },
    facultyProgramAffiliation: {
      updateMany: vi.fn(),
    },
    programHeadAssignment: {
      updateMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/features/auth/services/resolve-auth-session", () => ({
  resolveAuthSession: vi.fn(),
}));

const SECRETARY_ID = "123e4567-e89b-12d3-a456-426614174000";
const TARGET_ID = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";

describe("removeRoleFromUser role revocation gate", () => {
  let mockTx: {
    $queryRaw: ReturnType<typeof vi.fn>;
    programHeadAssignment: { updateMany: ReturnType<typeof vi.fn> };
    facultyProgramAffiliation: { updateMany: ReturnType<typeof vi.fn> };
    userRole: {
      findUnique: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
    };
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
    (prisma.studentAcademicProfile.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (prisma.industryPartnerProfile.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    mockTx = {
      $queryRaw: vi.fn().mockResolvedValue(undefined),
      programHeadAssignment: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
      facultyProgramAffiliation: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
      userRole: {
        findUnique: vi.fn().mockResolvedValue({ role: SystemRole.PROGRAM_HEAD }),
        delete: vi.fn().mockResolvedValue({ id: "role-1" }),
      },
    };
    (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(async (cb) => cb(mockTx));
  });

  it("deactivates the Program Head assignment set in the same transaction as the role deletion", async () => {
    const result = await removeRoleFromUser(TARGET_ID, SystemRole.PROGRAM_HEAD);

    expect(result).toEqual({ success: true, data: undefined });
    expect(mockTx.programHeadAssignment.updateMany).toHaveBeenCalledWith({
      where: { program_head_id: TARGET_ID, is_active: true },
      data: { is_active: false },
    });
    expect(mockTx.userRole.delete).toHaveBeenCalledWith({
      where: { user_id_role: { user_id: TARGET_ID, role: SystemRole.PROGRAM_HEAD } },
    });
  });

  it("serializes the assignment-set deactivation with assignment-set administration", async () => {
    const result = await removeRoleFromUser(TARGET_ID, SystemRole.PROGRAM_HEAD);

    expect(result).toEqual({ success: true, data: undefined });
    expect(mockTx.$queryRaw).toHaveBeenCalledTimes(1);
  });

  it("keys the advisory lock on a 64-bit hash of the user-scoped key", async () => {
    const result = await removeRoleFromUser(TARGET_ID, SystemRole.PROGRAM_HEAD);

    expect(result).toEqual({ success: true, data: undefined });
    const lockSql = mockTx.$queryRaw.mock.calls[0]?.[0][0] ?? "";
    const lockKey = mockTx.$queryRaw.mock.calls[0]?.[1] ?? "";
    expect(lockSql).toContain("pg_advisory_xact_lock(hashtextextended");
    expect(lockKey).toContain(`cloie:program-head-assignment-set:${TARGET_ID}`);
  });

  it("denies a concurrent removal that already deleted the role, without deactivating assignments", async () => {
    mockTx.userRole.findUnique.mockResolvedValue(null);

    const result = await removeRoleFromUser(TARGET_ID, SystemRole.PROGRAM_HEAD);

    expect(result).toEqual({ success: false, error: "Role assignment not found." });
    expect(mockTx.programHeadAssignment.updateMany).not.toHaveBeenCalled();
    expect(mockTx.userRole.delete).not.toHaveBeenCalled();
  });

  it("does not delete the role when the assignment-set deactivation fails inside the transaction", async () => {
    mockTx.programHeadAssignment.updateMany.mockRejectedValue(new Error("DB write failed"));

    // Database failures propagate instead of becoming a user-facing denial.
    await expect(removeRoleFromUser(TARGET_ID, SystemRole.PROGRAM_HEAD)).rejects.toThrow(
      /db write failed/i
    );
    expect(mockTx.userRole.delete).not.toHaveBeenCalled();
  });

  it("deactivates the Faculty affiliations in the same transaction as the role deletion", async () => {
    (prisma.userRole.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      user_id: TARGET_ID,
      role: SystemRole.FACULTY,
    });
    mockTx.userRole.findUnique.mockResolvedValue({ role: SystemRole.FACULTY });

    const result = await removeRoleFromUser(TARGET_ID, SystemRole.FACULTY);

    expect(result).toEqual({ success: true, data: undefined });
    expect(mockTx.facultyProgramAffiliation.updateMany).toHaveBeenCalledWith({
      where: { faculty_id: TARGET_ID, is_active: true },
      data: { is_active: false },
    });
    expect(mockTx.userRole.delete).toHaveBeenCalledWith({
      where: { user_id_role: { user_id: TARGET_ID, role: SystemRole.FACULTY } },
    });
  });

  it.each([
    {
      role: SystemRole.STUDENT,
      profile: "studentAcademicProfile" as const,
      message: /remove the student academic context/i,
    },
    {
      role: SystemRole.INDUSTRY_PARTNER,
      profile: "industryPartnerProfile" as const,
      message: /remove the industry partner profile/i,
    },
  ])("rejects revoking the $role role while $profile still exists", async (gate) => {
    (prisma[gate.profile].findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "profile-1",
    });

    const result = await removeRoleFromUser(TARGET_ID, gate.role);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(gate.message);
    }
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("refuses to revoke the acting user's own role", async () => {
    const result = await removeRoleFromUser(SECRETARY_ID, SystemRole.FACULTY);

    expect(result).toEqual({ success: false, error: "Cannot modify own account." });
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.userRole.delete).not.toHaveBeenCalled();
  });

  it("rejects a caller without Secretary or Dean authority", async () => {
    (resolveAuthSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: SECRETARY_ID,
      activeRole: ROLES.FACULTY,
      roles: [ROLES.FACULTY],
    });

    const result = await removeRoleFromUser(TARGET_ID, SystemRole.FACULTY);

    expect(result).toEqual({ success: false, error: "Insufficient permissions." });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("rejects an unauthenticated caller", async () => {
    (resolveAuthSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const result = await removeRoleFromUser(TARGET_ID, SystemRole.FACULTY);

    expect(result).toEqual({ success: false, error: "Authentication required." });
  });

  it("reports a missing role assignment instead of deleting one", async () => {
    (prisma.userRole.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const result = await removeRoleFromUser(TARGET_ID, SystemRole.ALUMNI);

    expect(result).toEqual({ success: false, error: "Role assignment not found." });
    expect(prisma.userRole.delete).not.toHaveBeenCalled();
  });
});
