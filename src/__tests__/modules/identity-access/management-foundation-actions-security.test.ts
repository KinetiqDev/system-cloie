import { describe, expect, it, vi, beforeEach } from "vitest";
import { ROLES } from "@/lib/constants/roles";
import { createAuthSessionSnapshot } from "@/__tests__/helpers/auth-session";
import * as authModule from "@/features/auth/services/resolve-auth-session";

vi.mock("@/features/auth/services/resolve-auth-session");
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

vi.mock("@/features/users/services/manage-users", () => ({
  toggleUserActive: vi.fn(() => Promise.resolve({ success: true })),
  assignUserRole: vi.fn(() => Promise.resolve({ success: true, data: { id: "role-1" } })),
  revokeUserRole: vi.fn(() => Promise.resolve({ success: true })),
  createProgramHeadAssignment: vi.fn(() => Promise.resolve({ success: true })),
  deactivateProgramHeadAssignment: vi.fn(() => Promise.resolve({ success: true })),
  deleteStudentAcademicContext: vi.fn(() => Promise.resolve({ success: true })),
  deleteIndustryPartnerProfile: vi.fn(() => Promise.resolve({ success: true })),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    studentAcademicProfile: { findUnique: vi.fn() },
    industryPartnerProfile: { findUnique: vi.fn() },
    programHeadAssignment: { findMany: vi.fn() },
  },
}));

import {
  bulkToggleCoursesActiveAction,
  toggleUserActiveAction,
  assignUserRoleAction,
  revokeUserRoleAction,
  createProgramHeadAssignmentAction,
  deactivateProgramHeadAssignmentAction,
  deleteStudentAcademicContextAction,
  deleteIndustryPartnerProfileAction,
} from "@/lib/actions/management-foundation-actions";

import {
  toggleUserActive,
  assignUserRole,
  revokeUserRole,
  createProgramHeadAssignment,
  deactivateProgramHeadAssignment,
  deleteStudentAcademicContext,
  deleteIndustryPartnerProfile,
} from "@/features/users/services/manage-users";

describe("management-foundation-actions security", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const secretarySession = createAuthSessionSnapshot({
    userId: "11111111-1111-4111-a111-111111111111",
    roles: [ROLES.SECRETARY],
  });

  const deanSession = createAuthSessionSnapshot({
    userId: "22222222-2222-4222-b222-222222222222",
    roles: [ROLES.DEAN],
  });

  const studentSession = createAuthSessionSnapshot({
    userId: "33333333-3333-4333-a333-333333333333",
    roles: [ROLES.STUDENT],
  });

  const programHeadSession = createAuthSessionSnapshot({
    userId: "44444444-4444-4444-b444-444444444444",
    roles: [ROLES.PROGRAM_HEAD],
  });

  describe("bulkToggleCoursesActiveAction", () => {
    it("rejects Program Heads because scoped Course writes use the selected-Program action", async () => {
      vi.mocked(authModule.resolveAuthSession).mockResolvedValue(programHeadSession);
      await expect(
        bulkToggleCoursesActiveAction(["course-general-education"], false)
      ).resolves.toEqual({
        succeeded: [],
        failed: [{ id: "course-general-education", error: "Insufficient permissions." }],
      });
    });
  });

  describe("toggleUserActiveAction", () => {
    it("rejects unauthenticated", async () => {
      vi.mocked(authModule.resolveAuthSession).mockResolvedValue(null);
      const result = await toggleUserActiveAction("other-user", true);
      expect(result).toEqual({ success: false, error: "Authentication required." });
    });

    it("rejects wrong role", async () => {
      vi.mocked(authModule.resolveAuthSession).mockResolvedValue(studentSession);
      const result = await toggleUserActiveAction("other-user", true);
      expect(result).toEqual({ success: false, error: "Insufficient permissions." });
    });

    it("rejects right role + self-target", async () => {
      vi.mocked(authModule.resolveAuthSession).mockResolvedValue(secretarySession);
      const result = await toggleUserActiveAction("11111111-1111-4111-a111-111111111111", true);
      expect(result).toEqual({ success: false, error: "Cannot modify own account." });
    });

    it("accepts right role + other-target", async () => {
      vi.mocked(authModule.resolveAuthSession).mockResolvedValue(secretarySession);
      const result = await toggleUserActiveAction("other-user", true);
      expect(toggleUserActive).toHaveBeenCalledWith("other-user", true);
      expect(result).toEqual({ success: true });
    });
  });

  describe("assignUserRoleAction", () => {
    function makeFormData(userId: string, role: string) {
      const fd = new FormData();
      fd.set("user_id", userId);
      fd.set("role", role);
      return fd;
    }

    it("rejects unauthenticated", async () => {
      vi.mocked(authModule.resolveAuthSession).mockResolvedValue(null);
      const result = await assignUserRoleAction(
        makeFormData("44444444-4444-4444-b444-444444444444", ROLES.FACULTY)
      );
      expect(result).toEqual({ success: false, error: "Authentication required." });
    });

    it("rejects wrong role", async () => {
      vi.mocked(authModule.resolveAuthSession).mockResolvedValue(studentSession);
      const result = await assignUserRoleAction(
        makeFormData("44444444-4444-4444-b444-444444444444", ROLES.FACULTY)
      );
      expect(result).toEqual({ success: false, error: "Insufficient permissions." });
    });

    it("rejects right role + self-target", async () => {
      vi.mocked(authModule.resolveAuthSession).mockResolvedValue(secretarySession);
      const result = await assignUserRoleAction(
        makeFormData("11111111-1111-4111-a111-111111111111", ROLES.FACULTY)
      );
      expect(result).toEqual({ success: false, error: "Cannot modify own account." });
    });

    it("accepts right role + other-target", async () => {
      vi.mocked(authModule.resolveAuthSession).mockResolvedValue(secretarySession);
      const result = await assignUserRoleAction(
        makeFormData("44444444-4444-4444-b444-444444444444", ROLES.FACULTY)
      );
      expect(assignUserRole).toHaveBeenCalledWith({
        user_id: "44444444-4444-4444-b444-444444444444",
        role: ROLES.FACULTY,
      });
      expect(result).toEqual({ success: true });
    });
  });

  describe("revokeUserRoleAction", () => {
    it("rejects unauthenticated", async () => {
      vi.mocked(authModule.resolveAuthSession).mockResolvedValue(null);
      const result = await revokeUserRoleAction("other-user", ROLES.FACULTY);
      expect(result).toEqual({ success: false, error: "Authentication required." });
    });

    it("rejects wrong role", async () => {
      vi.mocked(authModule.resolveAuthSession).mockResolvedValue(studentSession);
      const result = await revokeUserRoleAction("other-user", ROLES.FACULTY);
      expect(result).toEqual({ success: false, error: "Insufficient permissions." });
    });

    it("rejects right role + self-target", async () => {
      vi.mocked(authModule.resolveAuthSession).mockResolvedValue(secretarySession);
      const result = await revokeUserRoleAction(
        "11111111-1111-4111-a111-111111111111",
        ROLES.FACULTY
      );
      expect(result).toEqual({ success: false, error: "Cannot modify own account." });
    });

    it("accepts right role + other-target", async () => {
      vi.mocked(authModule.resolveAuthSession).mockResolvedValue(secretarySession);
      const result = await revokeUserRoleAction("other-user", ROLES.FACULTY);
      expect(revokeUserRole).toHaveBeenCalledWith("other-user", ROLES.FACULTY);
      expect(result).toEqual({ success: true });
    });
  });

  describe("createProgramHeadAssignmentAction", () => {
    function makeFormData(programHeadId: string, programId: string) {
      const fd = new FormData();
      fd.set("program_head_id", programHeadId);
      fd.set("program_id", programId);
      return fd;
    }

    it("rejects unauthenticated", async () => {
      vi.mocked(authModule.resolveAuthSession).mockResolvedValue(null);
      const result = await createProgramHeadAssignmentAction(
        makeFormData("44444444-4444-4444-b444-444444444444", "55555555-5555-4555-a555-555555555555")
      );
      expect(result).toEqual({ success: false, error: "Authentication required." });
    });

    it("rejects wrong role", async () => {
      vi.mocked(authModule.resolveAuthSession).mockResolvedValue(studentSession);
      const result = await createProgramHeadAssignmentAction(
        makeFormData("44444444-4444-4444-b444-444444444444", "55555555-5555-4555-a555-555555555555")
      );
      expect(result).toEqual({ success: false, error: "Insufficient permissions." });
    });

    it("rejects right role + self-target", async () => {
      vi.mocked(authModule.resolveAuthSession).mockResolvedValue(secretarySession);
      const result = await createProgramHeadAssignmentAction(
        makeFormData("11111111-1111-4111-a111-111111111111", "55555555-5555-4555-a555-555555555555")
      );
      expect(result).toEqual({ success: false, error: "Cannot modify own account." });
    });

    it("accepts right role + other-target", async () => {
      vi.mocked(authModule.resolveAuthSession).mockResolvedValue(secretarySession);
      const result = await createProgramHeadAssignmentAction(
        makeFormData("44444444-4444-4444-b444-444444444444", "55555555-5555-4555-a555-555555555555")
      );
      expect(createProgramHeadAssignment).toHaveBeenCalledWith({
        program_head_id: "44444444-4444-4444-b444-444444444444",
        program_id: "55555555-5555-4555-a555-555555555555",
      });
      expect(result).toEqual({ success: true });
    });
  });

  describe("deactivateProgramHeadAssignmentAction", () => {
    const ASSIGNMENT_ID = "55555555-5555-4555-a555-555555555555";

    it("rejects unauthenticated", async () => {
      vi.mocked(authModule.resolveAuthSession).mockResolvedValue(null);
      const result = await deactivateProgramHeadAssignmentAction(
        ASSIGNMENT_ID,
        "44444444-4444-4444-b444-444444444444"
      );
      expect(result).toEqual({ success: false, error: "Authentication required." });
      expect(deactivateProgramHeadAssignment).not.toHaveBeenCalled();
    });

    it("rejects wrong role", async () => {
      vi.mocked(authModule.resolveAuthSession).mockResolvedValue(studentSession);
      const result = await deactivateProgramHeadAssignmentAction(
        ASSIGNMENT_ID,
        "44444444-4444-4444-b444-444444444444"
      );
      expect(result).toEqual({ success: false, error: "Insufficient permissions." });
      expect(deactivateProgramHeadAssignment).not.toHaveBeenCalled();
    });

    it("rejects a malformed assignment id before calling the service", async () => {
      vi.mocked(authModule.resolveAuthSession).mockResolvedValue(secretarySession);
      const result = await deactivateProgramHeadAssignmentAction(
        "not-a-uuid",
        "44444444-4444-4444-b444-444444444444"
      );
      expect(result.success).toBe(false);
      expect(deactivateProgramHeadAssignment).not.toHaveBeenCalled();
    });

    it("rejects a malformed program head id before calling the service", async () => {
      vi.mocked(authModule.resolveAuthSession).mockResolvedValue(secretarySession);
      const result = await deactivateProgramHeadAssignmentAction(ASSIGNMENT_ID, "not-a-uuid");
      expect(result.success).toBe(false);
      expect(deactivateProgramHeadAssignment).not.toHaveBeenCalled();
    });

    it("accepts valid ids and forwards them to the service", async () => {
      vi.mocked(authModule.resolveAuthSession).mockResolvedValue(secretarySession);
      const result = await deactivateProgramHeadAssignmentAction(
        ASSIGNMENT_ID,
        "44444444-4444-4444-b444-444444444444"
      );
      expect(deactivateProgramHeadAssignment).toHaveBeenCalledWith(
        ASSIGNMENT_ID,
        "44444444-4444-4444-b444-444444444444"
      );
      expect(result).toEqual({ success: true });
    });
  });

  describe("deleteStudentAcademicContextAction", () => {
    it("rejects unauthenticated", async () => {
      vi.mocked(authModule.resolveAuthSession).mockResolvedValue(null);
      const result = await deleteStudentAcademicContextAction("other-user");
      expect(result).toEqual({ success: false, error: "Authentication required." });
    });

    it("rejects wrong role", async () => {
      vi.mocked(authModule.resolveAuthSession).mockResolvedValue(studentSession);
      const result = await deleteStudentAcademicContextAction("other-user");
      expect(result).toEqual({ success: false, error: "Insufficient permissions." });
    });

    it("rejects right role + self-target", async () => {
      vi.mocked(authModule.resolveAuthSession).mockResolvedValue(secretarySession);
      const result = await deleteStudentAcademicContextAction(
        "11111111-1111-4111-a111-111111111111"
      );
      expect(result).toEqual({ success: false, error: "Cannot modify own account." });
    });

    it("accepts right role + other-target", async () => {
      vi.mocked(authModule.resolveAuthSession).mockResolvedValue(secretarySession);
      const result = await deleteStudentAcademicContextAction("other-user");
      expect(deleteStudentAcademicContext).toHaveBeenCalledWith("other-user");
      expect(result).toEqual({ success: true });
    });
  });

  describe("deleteIndustryPartnerProfileAction", () => {
    it("rejects unauthenticated", async () => {
      vi.mocked(authModule.resolveAuthSession).mockResolvedValue(null);
      const result = await deleteIndustryPartnerProfileAction("other-user");
      expect(result).toEqual({ success: false, error: "Authentication required." });
    });

    it("rejects wrong role", async () => {
      vi.mocked(authModule.resolveAuthSession).mockResolvedValue(studentSession);
      const result = await deleteIndustryPartnerProfileAction("other-user");
      expect(result).toEqual({ success: false, error: "Insufficient permissions." });
    });

    it("rejects right role + self-target", async () => {
      vi.mocked(authModule.resolveAuthSession).mockResolvedValue(secretarySession);
      const result = await deleteIndustryPartnerProfileAction(
        "11111111-1111-4111-a111-111111111111"
      );
      expect(result).toEqual({ success: false, error: "Cannot modify own account." });
    });

    it("accepts right role + other-target", async () => {
      vi.mocked(authModule.resolveAuthSession).mockResolvedValue(secretarySession);
      const result = await deleteIndustryPartnerProfileAction("other-user");
      expect(deleteIndustryPartnerProfile).toHaveBeenCalledWith("other-user");
      expect(result).toEqual({ success: true });
    });
  });
});
