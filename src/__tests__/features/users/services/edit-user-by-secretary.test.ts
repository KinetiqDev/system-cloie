import { beforeEach, describe, expect, it, vi } from "vitest";
import { SystemRole } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { editUserBySecretary } from "@/features/users/services/edit-user-by-secretary";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { ROLES } from "@/lib/constants/roles";
import { getConfirmationSecret } from "@/lib/utils/confirmation-secret";
import CryptoJS from "crypto-js";

// Valid Zod-4 compliant UUIDs (version bits [1-8], variant bits [89ab])
const USER_ID = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
const SECRETARY_ID = "123e4567-e89b-12d3-a456-426614174000";
const PROG_OLD = "00000000-0000-0000-0000-000000000000"; // nil UUID (allowed by Zod 4)
const PROG_NEW = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22"; // valid v4-ish

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/features/auth/services/resolve-auth-session", () => ({
  resolveAuthSession: vi.fn(),
}));

/** Build a valid HMAC confirmation token matching generateConfirmationToken() logic */
function makeToken(payload: string, ttlMs = 60_000): string {
  const secret = getConfirmationSecret();
  const expiresAt = Date.now() + ttlMs;
  const raw = `${payload}|${expiresAt}`;
  const hmac = CryptoJS.HmacSHA256(raw, secret).toString();
  return btoa(`${raw}|${hmac}`);
}

describe("editUserBySecretary service", () => {
  const validInput = {
    id: USER_ID,
    role: SystemRole.FACULTY,
    first_name: "Jane",
    last_name: "Smith",
    faculty: { program_id: PROG_OLD },
  };

  // Default transaction mock (identity-only save, no faculty branch triggered when program unchanged)
  let mockTx: ReturnType<typeof buildMockTx>;

  function buildMockTx(overrides: Partial<{
    findFirst: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
  }> = {}) {
    return {
      user: { update: vi.fn() },
      facultyProgramAffiliation: {
        findFirst: overrides.findFirst ?? vi.fn().mockResolvedValue({ id: "aff-1", program_id: PROG_OLD }),
        findUnique: overrides.findUnique ?? vi.fn().mockResolvedValue(null),
        update: vi.fn(),
        create: vi.fn(),
      },
      programHeadAssignment: {
        findFirst: vi.fn().mockResolvedValue(null),
        findUnique: vi.fn().mockResolvedValue(null),
        update: vi.fn(),
        create: vi.fn(),
      },
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();

    (resolveAuthSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: SECRETARY_ID,
      activeRole: ROLES.SECRETARY,
      roles: [ROLES.SECRETARY],
    });

    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: USER_ID,
      is_active: true,
      roles: [{ role: SystemRole.FACULTY }],
      student_profile: null,
      enrollments: [],
      faculty_program_affiliations: [
        { id: "aff-1", program_id: PROG_OLD, is_primary: true, is_active: true },
      ],
      program_head_assignments: [],
    });

    mockTx = buildMockTx();
    (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(async (cb) => cb(mockTx));
  });

  it("updates base identity for a valid request (no protected change)", async () => {
    // program_id matches existing → no confirmation needed → goes straight to transaction
    const result = await editUserBySecretary(validInput);

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.id).toBe(USER_ID);
    expect(mockTx.user.update).toHaveBeenCalledWith({
      where: { id: USER_ID },
      data: { first_name: "Jane", last_name: "Smith" },
    });
  });

  it("allows updating an inactive account", async () => {
    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: USER_ID,
      is_active: false,
      roles: [{ role: SystemRole.FACULTY }],
      student_profile: null,
      enrollments: [],
      faculty_program_affiliations: [
        { id: "aff-1", program_id: PROG_OLD, is_primary: true, is_active: true },
      ],
    });

    const result = await editUserBySecretary(validInput);
    expect(result.success).toBe(true);
  });

  it("rejects when the user is not authenticated", async () => {
    (resolveAuthSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const result = await editUserBySecretary(validInput);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toMatch(/authentication required/i);
  });

  it("rejects when the user is not a Secretary", async () => {
    (resolveAuthSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: "dean-id",
      activeRole: ROLES.DEAN,
    });

    const result = await editUserBySecretary(validInput);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toMatch(/secretary access required/i);
  });

  it("rejects when a Secretary tries to edit their own account", async () => {
    (resolveAuthSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: USER_ID, // same as target
      activeRole: ROLES.SECRETARY,
    });

    const result = await editUserBySecretary(validInput);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toMatch(/cannot edit your own account/i);
  });

  it("rejects when the target user does not exist", async () => {
    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const result = await editUserBySecretary(validInput);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toMatch(/user not found/i);
  });

  it("rejects invalid input (missing first name)", async () => {
    const result = await editUserBySecretary({ ...validInput, first_name: "" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toMatch(/first name is required/i);
  });

  it("rejects invalid input (missing last name)", async () => {
    const result = await editUserBySecretary({ ...validInput, last_name: "" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toMatch(/last name is required/i);
  });

  it("requires a confirmation token when changing student protected fields", async () => {
    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: USER_ID,
      is_active: true,
      roles: [{ role: SystemRole.STUDENT }],
      student_profile: { program_id: "old-prog", major_id: null },
      enrollments: [],
      faculty_program_affiliations: [],
    });

    const result = await editUserBySecretary({
      id: USER_ID,
      role: SystemRole.STUDENT,
      first_name: "Jane",
      last_name: "Smith",
      student: {
        student_id_number: "S123",
        program_id: PROG_NEW,
      },
    });

    if (!result.success) console.log("[student protected fields]", result.error);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.protectedConfirmationRequired).toBe(true);
      expect(result.data.token).toBeDefined();
    }
  });

  // ─── Faculty-specific tests ───────────────────────────────────────────────

  it("requires a confirmation token when changing faculty primary program", async () => {
    // Mock: current primary = PROG_OLD, request = PROG_NEW → change detected → token required
    const result = await editUserBySecretary({
      id: USER_ID,
      role: SystemRole.FACULTY,
      first_name: "Jane",
      last_name: "Smith",
      faculty: { program_id: PROG_NEW },
    });

    if (!result.success) console.log("[fac confirmation]", result.error);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.protectedConfirmationRequired).toBe(true);
      expect(result.data.token).toBeDefined();
    }
  });

  it("saves faculty primary-program replacement when confirmed token is valid", async () => {
    // Per-test tx mock so we can assert calls
    mockTx = buildMockTx({
      findFirst: vi.fn().mockResolvedValue({ id: "aff-1", program_id: PROG_OLD }),
      findUnique: vi.fn().mockResolvedValue(null), // no existing record for PROG_NEW
    });
    (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(async (cb) => cb(mockTx));

    const payload = `FACULTY:program=${PROG_NEW}`;
    const token = makeToken(payload);

    const result = await editUserBySecretary({
      id: USER_ID,
      role: SystemRole.FACULTY,
      first_name: "Jane",
      last_name: "Smith",
      faculty: { program_id: PROG_NEW },
      confirmationToken: token,
    });

    if (!result.success) console.log("[fac replacement]", result.error);

    expect(result.success).toBe(true);
    // Old primary deactivated
    expect(mockTx.facultyProgramAffiliation.update).toHaveBeenCalledWith({
      where: { id: "aff-1" },
      data: { is_active: false, is_primary: false },
    });
    // New primary created
    expect(mockTx.facultyProgramAffiliation.create).toHaveBeenCalledWith({
      data: {
        faculty_id: USER_ID,
        program_id: PROG_NEW,
        is_active: true,
        is_primary: true,
      },
    });
  });

  it("promotes an existing inactive affiliation to primary when confirmed", async () => {
    // Per-test tx: findUnique returns an existing inactive record for PROG_NEW
    mockTx = buildMockTx({
      findFirst: vi.fn().mockResolvedValue({ id: "aff-1", program_id: PROG_OLD }),
      findUnique: vi.fn().mockResolvedValue({ id: "aff-existing", program_id: PROG_NEW, is_active: false }),
    });
    (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(async (cb) => cb(mockTx));

    const payload = `FACULTY:program=${PROG_NEW}`;
    const token = makeToken(payload);

    const result = await editUserBySecretary({
      id: USER_ID,
      role: SystemRole.FACULTY,
      first_name: "Jane",
      last_name: "Smith",
      faculty: { program_id: PROG_NEW },
      confirmationToken: token,
    });

    if (!result.success) console.log("[fac promote]", result.error);

    expect(result.success).toBe(true);
    // Existing inactive record promoted
    expect(mockTx.facultyProgramAffiliation.update).toHaveBeenCalledWith({
      where: { id: "aff-existing" },
      data: { is_active: true, is_primary: true },
    });
    // No new record created
    expect(mockTx.facultyProgramAffiliation.create).not.toHaveBeenCalled();
  });

  it("rejects an invalid or expired confirmation token", async () => {
    const result = await editUserBySecretary({
      id: USER_ID,
      role: SystemRole.FACULTY,
      first_name: "Jane",
      last_name: "Smith",
      faculty: { program_id: PROG_NEW },
      confirmationToken: "bad-token",
    });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toMatch(/invalid or expired confirmation token/i);
  });

  it("completes a legacy Faculty account by creating a primary affiliation when none exists", async () => {
    // Legacy: no existing primary affiliation
    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: USER_ID,
      is_active: true,
      roles: [{ role: SystemRole.FACULTY }],
      student_profile: null,
      enrollments: [],
      faculty_program_affiliations: [],
    });

    // tx: findFirst returns null (no primary), findUnique returns null (no existing record for target)
    mockTx = buildMockTx({
      findFirst: vi.fn().mockResolvedValue(null),
      findUnique: vi.fn().mockResolvedValue(null),
    });
    (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(async (cb) => cb(mockTx));

    // First request: no token → service issues a confirmation token (creating a primary for a
    // legacy account is a protected change since there's no existing primary)
    const firstResult = await editUserBySecretary({
      id: USER_ID,
      role: SystemRole.FACULTY,
      first_name: "Jane",
      last_name: "Smith",
      faculty: { program_id: PROG_NEW },
    });
    expect(firstResult.success).toBe(true);
    if (!firstResult.success || !firstResult.data?.token) return;

    // Second request: with token → transaction creates the primary affiliation
    const result = await editUserBySecretary({
      id: USER_ID,
      role: SystemRole.FACULTY,
      first_name: "Jane",
      last_name: "Smith",
      faculty: { program_id: PROG_NEW },
      confirmationToken: firstResult.data.token,
    });

    if (!result.success) console.log("[fac legacy]", result.error);

    expect(result.success).toBe(true);
    expect(mockTx.facultyProgramAffiliation.create).toHaveBeenCalledWith({
      data: {
        faculty_id: USER_ID,
        program_id: PROG_NEW,
        is_active: true,
        is_primary: true,
      },
    });
    // No old primary to deactivate
    expect(mockTx.facultyProgramAffiliation.update).not.toHaveBeenCalled();
  });

  it("promotes an existing active additional affiliation to primary when confirmed", async () => {
    // tx: findFirst returns current primary (PROG_OLD), findUnique returns an ACTIVE record for PROG_NEW
    mockTx = buildMockTx({
      findFirst: vi.fn().mockResolvedValue({ id: "aff-1", program_id: PROG_OLD }),
      findUnique: vi.fn().mockResolvedValue({ id: "aff-existing", program_id: PROG_NEW, is_active: true }),
    });
    (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(async (cb) => cb(mockTx));

    const payload = `FACULTY:program=${PROG_NEW}`;
    const token = makeToken(payload);

    const result = await editUserBySecretary({
      id: USER_ID,
      role: SystemRole.FACULTY,
      first_name: "Jane",
      last_name: "Smith",
      faculty: { program_id: PROG_NEW },
      confirmationToken: token,
    });

    if (!result.success) console.log("[fac promote active]", result.error);

    expect(result.success).toBe(true);
    // Old primary deactivated
    expect(mockTx.facultyProgramAffiliation.update).toHaveBeenCalledWith({
      where: { id: "aff-1" },
      data: { is_active: false, is_primary: false },
    });
    // Existing active additional record promoted (not duplicated)
    expect(mockTx.facultyProgramAffiliation.update).toHaveBeenCalledWith({
      where: { id: "aff-existing" },
      data: { is_active: true, is_primary: true },
    });
    // No new record created
    expect(mockTx.facultyProgramAffiliation.create).not.toHaveBeenCalled();
  });

  it("preserves additional active affiliations unchanged during a primary-program replacement", async () => {
    // The service only touches the old primary and the target program record.
    // Additional affiliations are never selected or modified.
    mockTx = buildMockTx({
      findFirst: vi.fn().mockResolvedValue({ id: "aff-1", program_id: PROG_OLD }),
      findUnique: vi.fn().mockResolvedValue(null),
    });
    (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(async (cb) => cb(mockTx));

    const payload = `FACULTY:program=${PROG_NEW}`;
    const token = makeToken(payload);

    const result = await editUserBySecretary({
      id: USER_ID,
      role: SystemRole.FACULTY,
      first_name: "Jane",
      last_name: "Smith",
      faculty: { program_id: PROG_NEW },
      confirmationToken: token,
    });

    if (!result.success) console.log("[fac preservation]", result.error);

    expect(result.success).toBe(true);
    // Exactly 1 update (deactivate old primary) + 1 create (new primary)
    expect(mockTx.facultyProgramAffiliation.update).toHaveBeenCalledTimes(1);
    expect(mockTx.facultyProgramAffiliation.create).toHaveBeenCalledTimes(1);
    // The 1 update is the old primary deactivation, not any additional affiliation
    expect(mockTx.facultyProgramAffiliation.update).toHaveBeenCalledWith({
      where: { id: "aff-1" },
      data: { is_active: false, is_primary: false },
    });
  });

  it("rolls back all changes when the transaction fails (atomicity)", async () => {
    // Simulate a DB error inside the transaction
    const failingTx = {
      user: { update: vi.fn().mockRejectedValue(new Error("DB write failed")) },
      facultyProgramAffiliation: {
        findFirst: vi.fn().mockResolvedValue({ id: "aff-1", program_id: PROG_OLD }),
        findUnique: vi.fn().mockResolvedValue(null),
        update: vi.fn(),
        create: vi.fn(),
      },
    };
    (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(async (cb) => cb(failingTx));

    const payload = `FACULTY:program=${PROG_NEW}`;
    const token = makeToken(payload);

    const result = await editUserBySecretary({
      id: USER_ID,
      role: SystemRole.FACULTY,
      first_name: "Jane",
      last_name: "Smith",
      faculty: { program_id: PROG_NEW },
      confirmationToken: token,
    });

    if (result.success) console.log("[fac atomicity] expected failure but got success");

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toMatch(/db write failed/i);
  });

  it("leaves all affiliations unchanged when no protected change occurs (same program)", async () => {
    // program_id matches existing primary → nothing to confirm, just save names
    const result = await editUserBySecretary(validInput);

    expect(result.success).toBe(true);
    // No update/create on affiliations
    expect(mockTx.facultyProgramAffiliation.update).not.toHaveBeenCalled();
    expect(mockTx.facultyProgramAffiliation.create).not.toHaveBeenCalled();
  });

  describe("Program Head assignment", () => {
    const programHeadInput = {
      id: USER_ID,
      role: SystemRole.PROGRAM_HEAD,
      first_name: "Jane",
      last_name: "Smith",
      program_head: { program_id: PROG_NEW },
    };

    function setProgramHeadRecord(assignments: Array<{ id: string; program_id: string; is_active: boolean }>) {
      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: USER_ID,
        is_active: true,
        roles: [{ role: SystemRole.PROGRAM_HEAD }],
        student_profile: null,
        enrollments: [],
        faculty_program_affiliations: [],
        program_head_assignments: assignments.filter((assignment) => assignment.is_active),
      });
    }

    it("requires confirmation when changing assignment", async () => {
      setProgramHeadRecord([{ id: "assignment-old", program_id: PROG_OLD, is_active: true }]);

      const result = await editUserBySecretary(programHeadInput);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.protectedConfirmationRequired).toBe(true);
        expect(result.data.protectedPayload).toBe(`PROGRAM_HEAD:program=${PROG_NEW}`);
      }
    });

    it("replaces active assignment with a new row", async () => {
      setProgramHeadRecord([{ id: "assignment-old", program_id: PROG_OLD, is_active: true }]);
      mockTx.programHeadAssignment.findFirst.mockResolvedValue({ id: "assignment-old", program_id: PROG_OLD });
      const token = makeToken(`PROGRAM_HEAD:program=${PROG_NEW}`);

      const result = await editUserBySecretary({ ...programHeadInput, confirmationToken: token });

      expect(result.success).toBe(true);
      expect(mockTx.programHeadAssignment.update).toHaveBeenCalledWith({
        where: { id: "assignment-old" },
        data: { is_active: false },
      });
      expect(mockTx.programHeadAssignment.create).toHaveBeenCalledWith({
        data: { program_head_id: USER_ID, program_id: PROG_NEW, is_active: true },
      });
    });

    it("reactivates an existing inactive assignment without duplicating it", async () => {
      setProgramHeadRecord([{ id: "assignment-old", program_id: PROG_OLD, is_active: true }]);
      mockTx.programHeadAssignment.findFirst.mockResolvedValue({ id: "assignment-old", program_id: PROG_OLD });
      mockTx.programHeadAssignment.findUnique.mockResolvedValue({ id: "assignment-old-target", program_id: PROG_NEW, is_active: false });
      const result = await editUserBySecretary({
        ...programHeadInput,
        confirmationToken: makeToken(`PROGRAM_HEAD:program=${PROG_NEW}`),
      });

      expect(result.success).toBe(true);
      expect(mockTx.programHeadAssignment.update).toHaveBeenCalledWith({
        where: { id: "assignment-old-target" },
        data: { is_active: true },
      });
      expect(mockTx.programHeadAssignment.create).not.toHaveBeenCalled();
    });

    it("completes legacy account by creating its first assignment", async () => {
      setProgramHeadRecord([]);
      mockTx.programHeadAssignment.findFirst.mockResolvedValue(null);
      const first = await editUserBySecretary(programHeadInput);
      expect(first.success).toBe(true);
      if (!first.success || !first.data.token) return;

      const result = await editUserBySecretary({ ...programHeadInput, confirmationToken: first.data.token });

      expect(result.success).toBe(true);
      expect(mockTx.programHeadAssignment.create).toHaveBeenCalledWith({
        data: { program_head_id: USER_ID, program_id: PROG_NEW, is_active: true },
      });
    });

    it("does not touch course data or other users during reassignment", async () => {
      setProgramHeadRecord([{ id: "assignment-old", program_id: PROG_OLD, is_active: true }]);
      mockTx.programHeadAssignment.findFirst.mockResolvedValue({ id: "assignment-old", program_id: PROG_OLD });
      const result = await editUserBySecretary({
        ...programHeadInput,
        confirmationToken: makeToken(`PROGRAM_HEAD:program=${PROG_NEW}`),
      });

      expect(result.success).toBe(true);
      expect(mockTx.programHeadAssignment.update).toHaveBeenCalledTimes(1);
      expect(mockTx.programHeadAssignment.create).toHaveBeenCalledTimes(1);
      expect(mockTx).not.toHaveProperty("courseAssignment");
      expect(mockTx).not.toHaveProperty("courseBoundEvaluation");
    });

    it("rolls back Program Head assignment changes when the transaction fails", async () => {
      setProgramHeadRecord([{ id: "assignment-old", program_id: PROG_OLD, is_active: true }]);
      const failingTx = {
        user: { update: vi.fn().mockRejectedValue(new Error("DB write failed")) },
        programHeadAssignment: {
          findFirst: vi.fn().mockResolvedValue({ id: "assignment-old", program_id: PROG_OLD }),
          findUnique: vi.fn().mockResolvedValue(null),
          update: vi.fn(),
          create: vi.fn(),
        },
      };
      (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(async (cb) => cb(failingTx));

      const result = await editUserBySecretary({
        ...programHeadInput,
        confirmationToken: makeToken(`PROGRAM_HEAD:program=${PROG_NEW}`),
      });

      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toMatch(/db write failed/i);
    });
  });
});
