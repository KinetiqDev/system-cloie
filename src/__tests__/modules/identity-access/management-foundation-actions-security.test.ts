import { describe, expect, it, vi, beforeEach, type Mock } from "vitest";
import { ROLES } from "@/lib/constants/roles";
import { createAuthSessionSnapshot } from "@/__tests__/helpers/auth-session";
import * as authModule from "@/features/auth/services/resolve-auth-session";

vi.mock("@/features/auth/services/resolve-auth-session");
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

vi.mock("@/features/users/services/manage-users", () => ({
  toggleUserActive: vi.fn(() => Promise.resolve({ success: true })),
  addRoleToExistingUser: vi.fn(() => Promise.resolve({ success: true, data: { id: "role-1" } })),
  removeRoleFromUser: vi.fn(() => Promise.resolve({ success: true })),
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
  addRoleToExistingUserAction,
  removeRoleFromUserAction,
  createProgramHeadAssignmentAction,
  deactivateProgramHeadAssignmentAction,
  deleteStudentAcademicContextAction,
  deleteIndustryPartnerProfileAction,
} from "@/lib/actions/management-foundation-actions";

import {
  toggleUserActive,
  addRoleToExistingUser,
  removeRoleFromUser,
  createProgramHeadAssignment,
  deactivateProgramHeadAssignment,
  deleteStudentAcademicContext,
  deleteIndustryPartnerProfile,
} from "@/features/users/services/manage-users";

const SECRETARY_ID = "11111111-1111-4111-a111-111111111111";
const PROGRAM_HEAD_ID = "44444444-4444-4444-b444-444444444444";
const PROGRAM_ID = "55555555-5555-4555-a555-555555555555";

function roleGrantFormData(userId: string, role: string): FormData {
  const formData = new FormData();
  formData.set("user_id", userId);
  formData.set("role", role);
  return formData;
}

function programHeadAssignmentFormData(programHeadId: string): FormData {
  const formData = new FormData();
  formData.set("program_head_id", programHeadId);
  formData.set("program_id", PROGRAM_ID);
  return formData;
}

interface ActionGuards {
  label: string;
  /** The privileged service the action delegates to once its guards pass. */
  service: Mock;
  unauthenticated: () => Promise<unknown>;
  wrongRole: () => Promise<unknown>;
}

interface AccountActionGuards extends ActionGuards {
  /** The action addresses an account, so it refuses to target the caller. */
  selfTarget: () => Promise<unknown>;
}

// Every one of these actions runs the same two guards, in the same order, with
// the same error strings: a session with an active role is required, and only a
// Secretary or Dean is allowed. Either guard refuses before any service call.
const ACCOUNT_ACTION_GUARDS: AccountActionGuards[] = [
  {
    label: "toggleUserActiveAction",
    service: vi.mocked(toggleUserActive),
    unauthenticated: () => toggleUserActiveAction("other-user", true),
    wrongRole: () => toggleUserActiveAction("other-user", true),
    selfTarget: () => toggleUserActiveAction(SECRETARY_ID, true),
  },
  {
    label: "addRoleToExistingUserAction",
    service: vi.mocked(addRoleToExistingUser),
    unauthenticated: () =>
      addRoleToExistingUserAction(roleGrantFormData(PROGRAM_HEAD_ID, ROLES.FACULTY)),
    wrongRole: () => addRoleToExistingUserAction(roleGrantFormData(PROGRAM_HEAD_ID, ROLES.FACULTY)),
    selfTarget: () => addRoleToExistingUserAction(roleGrantFormData(SECRETARY_ID, ROLES.FACULTY)),
  },
  {
    label: "removeRoleFromUserAction",
    service: vi.mocked(removeRoleFromUser),
    unauthenticated: () => removeRoleFromUserAction("other-user", ROLES.FACULTY),
    wrongRole: () => removeRoleFromUserAction("other-user", ROLES.FACULTY),
    selfTarget: () => removeRoleFromUserAction(SECRETARY_ID, ROLES.FACULTY),
  },
  {
    label: "createProgramHeadAssignmentAction",
    service: vi.mocked(createProgramHeadAssignment),
    unauthenticated: () =>
      createProgramHeadAssignmentAction(programHeadAssignmentFormData(PROGRAM_HEAD_ID)),
    wrongRole: () =>
      createProgramHeadAssignmentAction(programHeadAssignmentFormData(PROGRAM_HEAD_ID)),
    selfTarget: () =>
      createProgramHeadAssignmentAction(programHeadAssignmentFormData(SECRETARY_ID)),
  },
  {
    label: "deleteStudentAcademicContextAction",
    service: vi.mocked(deleteStudentAcademicContext),
    unauthenticated: () => deleteStudentAcademicContextAction("other-user"),
    wrongRole: () => deleteStudentAcademicContextAction("other-user"),
    selfTarget: () => deleteStudentAcademicContextAction(SECRETARY_ID),
  },
  {
    label: "deleteIndustryPartnerProfileAction",
    service: vi.mocked(deleteIndustryPartnerProfile),
    unauthenticated: () => deleteIndustryPartnerProfileAction("other-user"),
    wrongRole: () => deleteIndustryPartnerProfileAction("other-user"),
    selfTarget: () => deleteIndustryPartnerProfileAction(SECRETARY_ID),
  },
];

const ACTION_GUARDS: ActionGuards[] = [
  ...ACCOUNT_ACTION_GUARDS,
  {
    // Deactivating an assignment addresses a record identified by its own ids,
    // so this action carries no self-target rule: only the id shape gates the
    // write, and an allowed caller may deactivate their own assignment.
    label: "deactivateProgramHeadAssignmentAction",
    service: vi.mocked(deactivateProgramHeadAssignment),
    unauthenticated: () => deactivateProgramHeadAssignmentAction(PROGRAM_ID, PROGRAM_HEAD_ID),
    wrongRole: () => deactivateProgramHeadAssignmentAction(PROGRAM_ID, PROGRAM_HEAD_ID),
  },
];

describe("management-foundation-actions security", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const secretarySession = createAuthSessionSnapshot({
    userId: SECRETARY_ID,
    roles: [ROLES.SECRETARY],
  });

  const studentSession = createAuthSessionSnapshot({
    userId: "33333333-3333-4333-a333-333333333333",
    roles: [ROLES.STUDENT],
  });

  const programHeadSession = createAuthSessionSnapshot({
    userId: PROGRAM_HEAD_ID,
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

  it.each(ACTION_GUARDS)(
    "$label refuses an unauthenticated caller",
    async ({ service, unauthenticated }) => {
      vi.mocked(authModule.resolveAuthSession).mockResolvedValue(null);

      await expect(unauthenticated()).resolves.toEqual({
        success: false,
        error: "Authentication required.",
      });
      expect(service).not.toHaveBeenCalled();
    }
  );

  it.each(ACTION_GUARDS)(
    "$label refuses a caller outside the Secretary and Dean roles",
    async ({ service, wrongRole }) => {
      vi.mocked(authModule.resolveAuthSession).mockResolvedValue(studentSession);

      await expect(wrongRole()).resolves.toEqual({
        success: false,
        error: "Insufficient permissions.",
      });
      expect(service).not.toHaveBeenCalled();
    }
  );

  it.each(ACCOUNT_ACTION_GUARDS)(
    "$label refuses an allowed caller targeting their own account",
    async ({ service, selfTarget }) => {
      vi.mocked(authModule.resolveAuthSession).mockResolvedValue(secretarySession);

      await expect(selfTarget()).resolves.toEqual({
        success: false,
        error: "Cannot modify own account.",
      });
      expect(service).not.toHaveBeenCalled();
    }
  );

  describe("deactivateProgramHeadAssignmentAction", () => {
    it("lets an allowed caller deactivate their own assignment", async () => {
      vi.mocked(authModule.resolveAuthSession).mockResolvedValue(secretarySession);

      await expect(
        deactivateProgramHeadAssignmentAction(PROGRAM_ID, SECRETARY_ID)
      ).resolves.toEqual({ success: true });
      expect(deactivateProgramHeadAssignment).toHaveBeenCalledWith(PROGRAM_ID, SECRETARY_ID);
    });

    it("rejects a malformed assignment id before calling the service", async () => {
      vi.mocked(authModule.resolveAuthSession).mockResolvedValue(secretarySession);

      const result = await deactivateProgramHeadAssignmentAction("not-a-uuid", PROGRAM_HEAD_ID);

      expect(result.success).toBe(false);
      expect(deactivateProgramHeadAssignment).not.toHaveBeenCalled();
    });

    it("rejects a malformed program head id before calling the service", async () => {
      vi.mocked(authModule.resolveAuthSession).mockResolvedValue(secretarySession);

      const result = await deactivateProgramHeadAssignmentAction(PROGRAM_ID, "not-a-uuid");

      expect(result.success).toBe(false);
      expect(deactivateProgramHeadAssignment).not.toHaveBeenCalled();
    });
  });

  // The FormData actions read submitted fields, so their contract includes
  // which form field becomes which service argument.
  describe("submitted form payloads", () => {
    it("addRoleToExistingUserAction reads the granted user and role from the form", async () => {
      vi.mocked(authModule.resolveAuthSession).mockResolvedValue(secretarySession);

      const result = await addRoleToExistingUserAction(
        roleGrantFormData(PROGRAM_HEAD_ID, ROLES.FACULTY)
      );

      expect(addRoleToExistingUser).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: PROGRAM_HEAD_ID, role: ROLES.FACULTY })
      );
      expect(result).toEqual({ success: true });
    });

    it("createProgramHeadAssignmentAction reads the program head and program from the form", async () => {
      vi.mocked(authModule.resolveAuthSession).mockResolvedValue(secretarySession);

      const result = await createProgramHeadAssignmentAction(
        programHeadAssignmentFormData(PROGRAM_HEAD_ID)
      );

      expect(createProgramHeadAssignment).toHaveBeenCalledWith({
        program_head_id: PROGRAM_HEAD_ID,
        program_id: PROGRAM_ID,
      });
      expect(result).toEqual({ success: true });
    });
  });
});
