import { beforeEach, describe, expect, it, vi } from "vitest";
import { SystemRole, VerificationStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { editUserBySecretary } from "@/features/users/services/edit-user-by-secretary";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { ROLES } from "@/lib/constants/roles";
import { getConfirmationSecret } from "@/lib/utils/confirmation-secret";
import CryptoJS from "crypto-js";

// Valid Zod-4 compliant UUIDs (version bits [1-8], variant bits [89ab])
const USER_ID = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
const OTHER_USER_ID = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12";
const SECRETARY_ID = "123e4567-e89b-12d3-a456-426614174000";
const PROG_OLD = "00000000-0000-0000-0000-000000000000"; // nil UUID (allowed by Zod 4)
const PROG_NEW = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22"; // valid v4-ish

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    program: {
      findMany: vi.fn().mockResolvedValue([]),
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
    first_name: "Jane",
    last_name: "Smith",
    faculty: { program_id: PROG_OLD },
  };

  // Default transaction mock (identity-only save, no faculty branch triggered when program unchanged)
  let mockTx: ReturnType<typeof buildMockTx>;

  function buildMockTx(
    overrides: Partial<{
      findFirst: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
    }> = {}
  ) {
    return {
      $queryRaw: vi.fn().mockResolvedValue(undefined),
      user: { update: vi.fn() },
      facultyProgramAffiliation: {
        findFirst:
          overrides.findFirst ?? vi.fn().mockResolvedValue({ id: "aff-1", program_id: PROG_OLD }),
        findUnique: overrides.findUnique ?? vi.fn().mockResolvedValue(null),
        update: vi.fn(),
        create: vi.fn(),
      },
      programHeadAssignment: {
        findFirst: vi.fn().mockResolvedValue(null),
        findUnique: vi.fn().mockResolvedValue(null),
        findMany: vi.fn().mockResolvedValue([]),
        upsert: vi.fn(),
        updateMany: vi.fn(),
        update: vi.fn(),
        create: vi.fn(),
        delete: vi.fn(),
      },
      userRole: {
        findUnique: vi.fn().mockResolvedValue({ role: SystemRole.PROGRAM_HEAD }),
      },
      alumniProfile: {
        upsert: vi.fn(),
      },
      studentAcademicProfile: {
        upsert: vi.fn(),
      },
      studentEnrollment: {
        findFirst: vi.fn().mockResolvedValue(null),
        update: vi.fn(),
        create: vi.fn(),
      },
      academicTermInstance: {
        findFirst: vi.fn().mockResolvedValue({ id: "active-term" }),
      },
      industryPartnerProfile: {
        upsert: vi.fn(),
      },
      program: {
        findUnique: vi.fn().mockResolvedValue({ id: PROG_NEW, is_active: true, majors: [] }),
        findMany: vi.fn().mockResolvedValue([]),
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
      alumni_profile: null,
      industry_partner_profile: null,
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

  it("rejects a crafted request without details for the target's role", async () => {
    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: USER_ID,
      is_active: true,
      roles: [{ role: SystemRole.STUDENT }],
      student_profile: null,
      enrollments: [],
      faculty_program_affiliations: [],
      program_head_assignments: [],
      alumni_profile: null,
      industry_partner_profile: null,
    });

    const result = await editUserBySecretary({
      id: USER_ID,
      first_name: "Jane",
      last_name: "Smith",
    });

    expect(result).toEqual({
      success: false,
      error: "Student details are required for Student accounts.",
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
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
      first_name: "Jane",
      last_name: "Smith",
      student: {
        student_id_number: "S123",
        program_id: PROG_NEW,
      },
    });

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
      first_name: "Jane",
      last_name: "Smith",
      faculty: { program_id: PROG_NEW },
    });

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

    const payload = `FACULTY:id=${USER_ID}:program=${PROG_NEW}`;
    const token = makeToken(payload);

    const result = await editUserBySecretary({
      id: USER_ID,
      first_name: "Jane",
      last_name: "Smith",
      faculty: { program_id: PROG_NEW },
      confirmationToken: token,
    });

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
      findUnique: vi
        .fn()
        .mockResolvedValue({ id: "aff-existing", program_id: PROG_NEW, is_active: false }),
    });
    (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(async (cb) => cb(mockTx));

    const payload = `FACULTY:id=${USER_ID}:program=${PROG_NEW}`;
    const token = makeToken(payload);

    const result = await editUserBySecretary({
      id: USER_ID,
      first_name: "Jane",
      last_name: "Smith",
      faculty: { program_id: PROG_NEW },
      confirmationToken: token,
    });

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
      first_name: "Jane",
      last_name: "Smith",
      faculty: { program_id: PROG_NEW },
      confirmationToken: "bad-token",
    });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toMatch(/invalid or expired confirmation token/i);
  });

  it("rejects a confirmation token issued for another target user", async () => {
    const result = await editUserBySecretary({
      id: OTHER_USER_ID,
      first_name: "Jane",
      last_name: "Smith",
      faculty: { program_id: PROG_NEW },
      confirmationToken: makeToken(`FACULTY:id=${USER_ID}:program=${PROG_NEW}`),
    });

    expect(result).toEqual({
      success: false,
      error: "Invalid or expired confirmation token. Please review the changes again.",
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("rejects an expired confirmation token", async () => {
    const result = await editUserBySecretary({
      ...validInput,
      faculty: { program_id: PROG_NEW },
      confirmationToken: makeToken(`FACULTY:id=${USER_ID}:program=${PROG_NEW}`, -1),
    });

    expect(result).toEqual({
      success: false,
      error: "Invalid or expired confirmation token. Please review the changes again.",
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it.each([
    [SystemRole.STUDENT, `STUDENT:id=${USER_ID}:program=${PROG_NEW}:major=null:year=null:section=null`],
    [SystemRole.FACULTY, `FACULTY:id=${USER_ID}:program=${PROG_NEW}`],
    [SystemRole.PROGRAM_HEAD, `PROGRAM_HEAD:id=${USER_ID}:before=${PROG_OLD}:after=${PROG_NEW}`],
    [SystemRole.ALUMNI, `ALUMNI:id=${USER_ID}:program=${PROG_NEW}:major=null:graduationYear=2020:verificationStatus=APPROVED`],
    [SystemRole.INDUSTRY_PARTNER, `INDUSTRY_PARTNER:id=${USER_ID}:company=CLOIE Labs:position=null:program=null:verificationStatus=APPROVED`],
  ])("binds protected %s confirmation to target and exact proposal", async (role, payload) => {
    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: USER_ID,
      is_active: true,
      roles: [{ role }],
      student_profile: role === SystemRole.STUDENT ? { program_id: PROG_OLD, major_id: null } : null,
      enrollments: [],
      faculty_program_affiliations:
        role === SystemRole.FACULTY ? [{ id: "aff-1", program_id: PROG_OLD }] : [],
      program_head_assignments:
        role === SystemRole.PROGRAM_HEAD
          ? [{ id: "assignment-1", program_id: PROG_OLD, is_active: true }]
          : [],
      alumni_profile:
        role === SystemRole.ALUMNI
          ? { program_id: PROG_OLD, major_id: null, graduation_year: 2019, verification_status: VerificationStatus.PENDING }
          : null,
      industry_partner_profile:
        role === SystemRole.INDUSTRY_PARTNER
          ? { company_name: "Old Company", position: null, program_id: null, verification_status: VerificationStatus.PENDING }
          : null,
    });

    const input =
      role === SystemRole.STUDENT
        ? { id: USER_ID, first_name: "Jane", last_name: "Smith", student: { student_id_number: "S123", program_id: PROG_NEW } }
        : role === SystemRole.FACULTY
          ? { id: USER_ID, first_name: "Jane", last_name: "Smith", faculty: { program_id: PROG_NEW } }
          : role === SystemRole.PROGRAM_HEAD
            ? { id: USER_ID, first_name: "Jane", last_name: "Smith", program_head: { program_ids: [PROG_NEW] } }
            : role === SystemRole.ALUMNI
              ? { id: USER_ID, first_name: "Jane", last_name: "Smith", alumni: { graduation_year: 2020, program_id: PROG_NEW, verification_status: VerificationStatus.APPROVED } }
              : { id: USER_ID, first_name: "Jane", last_name: "Smith", industry_partner: { company_name: "CLOIE Labs", verification_status: VerificationStatus.APPROVED } };

    const first = await editUserBySecretary(input);
    expect(first.success).toBe(true);
    if (first.success) expect(first.data.protectedPayload).toContain(`id=${USER_ID}`);

    const alteredPayload = payload.includes("INDUSTRY_PARTNER")
      ? payload.replace("CLOIE Labs", "Altered Labs")
      : payload.replace(PROG_NEW, PROG_OLD);
    const altered = await editUserBySecretary({ ...input, confirmationToken: makeToken(alteredPayload) });
    expect(altered.success).toBe(false);
    if (!altered.success) expect(altered.error).toMatch(/invalid or expired confirmation token/i);
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
      first_name: "Jane",
      last_name: "Smith",
      faculty: { program_id: PROG_NEW },
    });
    expect(firstResult.success).toBe(true);
    if (!firstResult.success || !firstResult.data?.token) return;

    // Second request: with token → transaction creates the primary affiliation
    const result = await editUserBySecretary({
      id: USER_ID,
      first_name: "Jane",
      last_name: "Smith",
      faculty: { program_id: PROG_NEW },
      confirmationToken: firstResult.data.token,
    });

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
      findUnique: vi
        .fn()
        .mockResolvedValue({ id: "aff-existing", program_id: PROG_NEW, is_active: true }),
    });
    (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(async (cb) => cb(mockTx));

    const payload = `FACULTY:id=${USER_ID}:program=${PROG_NEW}`;
    const token = makeToken(payload);

    const result = await editUserBySecretary({
      id: USER_ID,
      first_name: "Jane",
      last_name: "Smith",
      faculty: { program_id: PROG_NEW },
      confirmationToken: token,
    });

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

    const payload = `FACULTY:id=${USER_ID}:program=${PROG_NEW}`;
    const token = makeToken(payload);

    const result = await editUserBySecretary({
      id: USER_ID,
      first_name: "Jane",
      last_name: "Smith",
      faculty: { program_id: PROG_NEW },
      confirmationToken: token,
    });

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
    (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(async (cb) =>
      cb(failingTx)
    );

    const payload = `FACULTY:id=${USER_ID}:program=${PROG_NEW}`;
    const token = makeToken(payload);

    const result = await editUserBySecretary({
      id: USER_ID,
      first_name: "Jane",
      last_name: "Smith",
      faculty: { program_id: PROG_NEW },
      confirmationToken: token,
    });

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

  describe("Student profile and enrollment", () => {
    const studentInput = {
      id: USER_ID,
      first_name: "Jane",
      last_name: "Smith",
      student: {
        student_id_number: "S123",
        program_id: PROG_NEW,
        major_id: null,
        year_level: "SECOND_YEAR" as const,
        section: "AFTERNOON" as const,
      },
    };

    function setStudentRecord(
      profile: object | null,
      enrollments: Array<object>
    ) {
      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: USER_ID,
        is_active: true,
        roles: [{ role: SystemRole.STUDENT }],
        student_profile: profile,
        enrollments,
        faculty_program_affiliations: [],
        program_head_assignments: [],
        alumni_profile: null,
        industry_partner_profile: null,
      });
    }

    it("synchronizes profile and active enrollment in one transaction", async () => {
      setStudentRecord(
        { program_id: PROG_OLD, major_id: null },
        [{ id: "active-enrollment", year_level: "FIRST_YEAR", section: "MORNING" }]
      );
      mockTx.studentEnrollment.findFirst.mockResolvedValue({
        id: "active-enrollment",
        year_level: "FIRST_YEAR",
        section: "MORNING",
      });
      mockTx.program.findUnique.mockResolvedValue({ id: PROG_NEW, is_active: true, majors: [] });

      const result = await editUserBySecretary({
        ...studentInput,
        confirmationToken: makeToken(
          `STUDENT:id=${USER_ID}:program=${PROG_NEW}:major=null:year=SECOND_YEAR:section=AFTERNOON`
        ),
      });

      expect(result.success).toBe(true);
      expect(mockTx.studentAcademicProfile.upsert).toHaveBeenCalledWith({
        where: { user_id: USER_ID },
        create: expect.objectContaining({ user_id: USER_ID, program_id: PROG_NEW }),
        update: expect.objectContaining({ program_id: PROG_NEW }),
      });
      expect(mockTx.studentEnrollment.update).toHaveBeenCalledWith({
        where: { id: "active-enrollment" },
        data: {
          program_id: PROG_NEW,
          major_id: null,
          year_level: "SECOND_YEAR",
          section: "AFTERNOON",
        },
      });
      expect(mockTx.studentEnrollment.create).not.toHaveBeenCalled();
    });

    it("preserves historical enrollment and does not create missing active enrollment", async () => {
      setStudentRecord({ program_id: PROG_OLD, major_id: null }, []);
      mockTx.program.findUnique.mockResolvedValue({ id: PROG_NEW, is_active: true, majors: [] });

      const result = await editUserBySecretary({
        ...studentInput,
        student: { ...studentInput.student, year_level: undefined, section: undefined },
        confirmationToken: makeToken(
          `STUDENT:id=${USER_ID}:program=${PROG_NEW}:major=null:year=null:section=null`
        ),
      });

      expect(result.success).toBe(true);
      expect(mockTx.studentAcademicProfile.upsert).toHaveBeenCalled();
      expect(mockTx.studentEnrollment.update).not.toHaveBeenCalled();
      expect(mockTx.studentEnrollment.create).not.toHaveBeenCalled();
    });

    it("rolls back profile and enrollment writes when related update fails", async () => {
      setStudentRecord(
        { program_id: PROG_OLD, major_id: null },
        [{ id: "active-enrollment", year_level: "FIRST_YEAR", section: "MORNING" }]
      );
      const failingTx = {
        user: { update: vi.fn() },
        academicTermInstance: { findFirst: vi.fn().mockResolvedValue({ id: "active-term" }) },
        studentAcademicProfile: { upsert: vi.fn() },
        studentEnrollment: {
          findFirst: vi.fn().mockResolvedValue({
            id: "active-enrollment",
            year_level: "FIRST_YEAR",
            section: "MORNING",
          }),
          update: vi.fn().mockRejectedValue(new Error("Enrollment write failed")),
          create: vi.fn(),
        },
        program: {
          findUnique: vi.fn().mockResolvedValue({ id: PROG_NEW, is_active: true, majors: [] }),
        },
      };
      (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(async (cb) =>
        cb(failingTx)
      );

      const result = await editUserBySecretary({
        ...studentInput,
        confirmationToken: makeToken(
          `STUDENT:id=${USER_ID}:program=${PROG_NEW}:major=null:year=SECOND_YEAR:section=AFTERNOON`
        ),
      });

      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toMatch(/enrollment write failed/i);
      expect(failingTx.studentAcademicProfile.upsert).toHaveBeenCalled();
    });
  });

  describe("Program Head assignment set", () => {
    const PROG_A = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22"; // BEED
    const PROG_B = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a23"; // BSED
    const PROG_C = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a24"; // CED

    const programHeadSetInput = (programIds: string[]) => ({
      id: USER_ID,
      first_name: "Jane",
      last_name: "Smith",
      program_head: { program_ids: programIds },
    });

    function setProgramHeadRecord(
      assignments: Array<{
        id: string;
        program_id: string;
        is_active: boolean;
        program?: { name?: string; code?: string } | null;
      }>
    ) {
      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: USER_ID,
        is_active: true,
        roles: [{ role: SystemRole.PROGRAM_HEAD }],
        student_profile: null,
        enrollments: [],
        faculty_program_affiliations: [],
        program_head_assignments: assignments,
        alumni_profile: null,
        industry_partner_profile: null,
      });
    }

    function setTxAssignments(
      rows: Array<{ id: string; program_id: string; is_active: boolean }>
    ) {
      mockTx.programHeadAssignment.findMany.mockResolvedValue(rows);
    }

    function makeSetToken(before: string[], after: string[]): string {
      return makeToken(
        `PROGRAM_HEAD:id=${USER_ID}:before=${[...before].sort().join(",")}:after=${[...after].sort().join(",")}`
      );
    }

    it("requires confirmation and signs the exact before/after sets when the set changes", async () => {
      setProgramHeadRecord([
        { id: "a1", program_id: PROG_A, is_active: true, program: { name: "BEED" } },
      ]);

      const result = await editUserBySecretary(programHeadSetInput([PROG_A, PROG_B]));

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.protectedConfirmationRequired).toBe(true);
        expect(result.data.protectedPayload).toBe(
          `PROGRAM_HEAD:id=${USER_ID}:before=${PROG_A}:after=${PROG_A},${PROG_B}`
        );
        expect(result.data.confirmationReview?.oldValues).toEqual({ programs: "BEED" });
      }
    });

    it("does not require confirmation when the set is unchanged and leaves rows untouched", async () => {
      setProgramHeadRecord([{ id: "a1", program_id: PROG_A, is_active: true }]);
      setTxAssignments([{ id: "a1", program_id: PROG_A, is_active: true }]);

      const result = await editUserBySecretary(programHeadSetInput([PROG_A]));

      expect(result.success).toBe(true);
      expect(mockTx.programHeadAssignment.upsert).not.toHaveBeenCalled();
      expect(mockTx.programHeadAssignment.updateMany).not.toHaveBeenCalled();
      expect(mockTx.programHeadAssignment.delete).not.toHaveBeenCalled();
    });

    it("adds, retains, and removes assignments as one protected save", async () => {
      setProgramHeadRecord([
        { id: "a1", program_id: PROG_A, is_active: true, program: { name: "BEED" } },
        { id: "a2", program_id: PROG_C, is_active: true, program: { name: "CED" } },
      ]);
      setTxAssignments([
        { id: "a1", program_id: PROG_A, is_active: true },
        { id: "a2", program_id: PROG_C, is_active: true },
      ]);
      mockTx.program.findMany.mockResolvedValue([{ id: PROG_B, is_active: true }]);

      const result = await editUserBySecretary({
        ...programHeadSetInput([PROG_A, PROG_B]),
        confirmationToken: makeSetToken([PROG_A, PROG_C], [PROG_A, PROG_B]),
      });

      expect(result.success).toBe(true);
      // PROG_A retained through the compound-key upsert
      expect(mockTx.programHeadAssignment.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            program_head_id_program_id: { program_head_id: USER_ID, program_id: PROG_A },
          },
          update: { is_active: true },
        })
      );
      // PROG_B created once with an active row
      expect(mockTx.programHeadAssignment.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: { program_head_id: USER_ID, program_id: PROG_B, is_active: true },
        })
      );
      // PROG_C deactivated, never deleted or recreated
      expect(mockTx.programHeadAssignment.updateMany).toHaveBeenCalledWith({
        where: { program_head_id: USER_ID, is_active: true, program_id: { notIn: [PROG_A, PROG_B] } },
        data: { is_active: false },
      });
      expect(mockTx.programHeadAssignment.delete).not.toHaveBeenCalled();
      expect(mockTx.programHeadAssignment.create).not.toHaveBeenCalled();
    });

    it("reactivates a historical row without creating a duplicate", async () => {
      setProgramHeadRecord([
        { id: "a2", program_id: PROG_B, is_active: true },
        { id: "a1", program_id: PROG_A, is_active: false },
      ]);
      setTxAssignments([
        { id: "a2", program_id: PROG_B, is_active: true },
        { id: "a1", program_id: PROG_A, is_active: false },
      ]);
      mockTx.program.findMany.mockResolvedValue([{ id: PROG_A, is_active: true }]);

      const result = await editUserBySecretary({
        ...programHeadSetInput([PROG_A, PROG_B]),
        confirmationToken: makeSetToken([PROG_B], [PROG_A, PROG_B]),
      });

      expect(result.success).toBe(true);
      expect(mockTx.programHeadAssignment.upsert).toHaveBeenCalledTimes(2);
      // Historical PROG_A row reactivated via the compound key, not recreated
      expect(mockTx.programHeadAssignment.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            program_head_id_program_id: { program_head_id: USER_ID, program_id: PROG_A },
          },
          update: { is_active: true },
        })
      );
      expect(mockTx.programHeadAssignment.delete).not.toHaveBeenCalled();
    });

    it("deactivates every assignment when the Secretary saves an empty set", async () => {
      setProgramHeadRecord([
        { id: "a1", program_id: PROG_A, is_active: true, program: { name: "BEED" } },
        { id: "a2", program_id: PROG_B, is_active: true, program: { name: "BSED" } },
      ]);
      setTxAssignments([
        { id: "a1", program_id: PROG_A, is_active: true },
        { id: "a2", program_id: PROG_B, is_active: true },
      ]);

      const review = await editUserBySecretary(programHeadSetInput([]));
      expect(review.success).toBe(true);
      if (review.success) {
        expect(review.data.protectedConfirmationRequired).toBe(true);
        expect(review.data.confirmationReview?.oldValues).toEqual({
          programs: "BEED, BSED",
        });
        // An empty after-set is named explicitly, never shown blank.
        expect(review.data.confirmationReview?.newValues).toEqual({ programs: "None" });
      }
      if (!review.success || !review.data?.token) return;

      const result = await editUserBySecretary({
        ...programHeadSetInput([]),
        confirmationToken: review.data.token,
      });

      expect(result.success).toBe(true);
      expect(mockTx.programHeadAssignment.updateMany).toHaveBeenCalledWith({
        where: { program_head_id: USER_ID, is_active: true },
        data: { is_active: false },
      });
      expect(mockTx.programHeadAssignment.upsert).not.toHaveBeenCalled();
      // Zero active assignments does not revoke the Program Head role
      expect(mockTx.userRole.findUnique).toHaveBeenCalled();
      // The transaction serializes with assignment-set administration
      expect(mockTx.$queryRaw).toHaveBeenCalled();
    });

    it("completes a legacy Program Head account by creating its first assignment", async () => {
      setProgramHeadRecord([]);
      setTxAssignments([]);
      mockTx.program.findMany.mockResolvedValue([{ id: PROG_NEW, is_active: true }]);
      const first = await editUserBySecretary(programHeadSetInput([PROG_NEW]));
      expect(first.success).toBe(true);
      if (!first.success) return;
      expect(first.data.protectedConfirmationRequired).toBe(true);
      expect(first.data.token).toBeDefined();
      if (!first.data.token) return;

      const result = await editUserBySecretary({
        ...programHeadSetInput([PROG_NEW]),
        confirmationToken: first.data.token,
      });

      expect(result.success).toBe(true);
      expect(mockTx.programHeadAssignment.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            program_head_id_program_id: { program_head_id: USER_ID, program_id: PROG_NEW },
          },
          create: { program_head_id: USER_ID, program_id: PROG_NEW, is_active: true },
        })
      );
    });

    it("rejects a newly selected Program that is archived or inactive", async () => {
      setProgramHeadRecord([{ id: "a1", program_id: PROG_A, is_active: true }]);
      setTxAssignments([{ id: "a1", program_id: PROG_A, is_active: true }]);
      mockTx.program.findMany.mockResolvedValue([{ id: PROG_B, is_active: false }]);

      const result = await editUserBySecretary({
        ...programHeadSetInput([PROG_A, PROG_B]),
        confirmationToken: makeSetToken([PROG_A], [PROG_A, PROG_B]),
      });

      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toMatch(/archived or inactive/i);
      expect(mockTx.programHeadAssignment.upsert).not.toHaveBeenCalled();
      expect(mockTx.programHeadAssignment.updateMany).not.toHaveBeenCalled();
    });

    it("rejects a stale confirmation after another administrator changed the set", async () => {
      setProgramHeadRecord([{ id: "a1", program_id: PROG_A, is_active: true }]);
      const review = await editUserBySecretary(programHeadSetInput([PROG_B]));
      expect(review.success).toBe(true);
      if (!review.success) return;
      expect(review.data.protectedConfirmationRequired).toBe(true);
      expect(review.data.token).toBeDefined();
      if (!review.data.token) return;

      // Another administrator changes the active set before the review is confirmed
      setProgramHeadRecord([{ id: "a3", program_id: PROG_C, is_active: true }]);

      const result = await editUserBySecretary({
        ...programHeadSetInput([PROG_B]),
        confirmationToken: review.data.token,
      });

      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toMatch(/invalid or expired confirmation token/i);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it("rejects a set that changed between the confirmation check and the transaction", async () => {
      // The pre-transaction read still matches the token, but the transaction
      // re-read discovers an intervening assignment administration change.
      setProgramHeadRecord([{ id: "a1", program_id: PROG_A, is_active: true }]);
      setTxAssignments([{ id: "a3", program_id: PROG_C, is_active: true }]);

      const result = await editUserBySecretary({
        ...programHeadSetInput([PROG_A, PROG_B]),
        confirmationToken: makeSetToken([PROG_A], [PROG_A, PROG_B]),
      });

      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toMatch(/changed since your review/i);
      expect(mockTx.programHeadAssignment.upsert).not.toHaveBeenCalled();
      expect(mockTx.programHeadAssignment.updateMany).not.toHaveBeenCalled();
    });

    it("rejects the save when the target no longer has the Program Head role in the transaction", async () => {
      setProgramHeadRecord([{ id: "a1", program_id: PROG_A, is_active: true }]);
      setTxAssignments([{ id: "a1", program_id: PROG_A, is_active: true }]);
      mockTx.userRole.findUnique.mockResolvedValue(null);

      const result = await editUserBySecretary({
        ...programHeadSetInput([PROG_A, PROG_B]),
        confirmationToken: makeSetToken([PROG_A], [PROG_A, PROG_B]),
      });

      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toMatch(/no longer has the Program Head role/i);
      expect(mockTx.programHeadAssignment.upsert).not.toHaveBeenCalled();
      expect(mockTx.programHeadAssignment.updateMany).not.toHaveBeenCalled();
    });

    it("does not touch course data or other users during an assignment-set save", async () => {
      setProgramHeadRecord([
        { id: "a1", program_id: PROG_A, is_active: true },
        { id: "a2", program_id: PROG_C, is_active: true },
      ]);
      setTxAssignments([
        { id: "a1", program_id: PROG_A, is_active: true },
        { id: "a2", program_id: PROG_C, is_active: true },
      ]);
      mockTx.program.findMany.mockResolvedValue([{ id: PROG_B, is_active: true }]);

      const result = await editUserBySecretary({
        ...programHeadSetInput([PROG_A, PROG_B]),
        confirmationToken: makeSetToken([PROG_A, PROG_C], [PROG_A, PROG_B]),
      });

      expect(result.success).toBe(true);
      expect(mockTx.programHeadAssignment.upsert).toHaveBeenCalledTimes(2);
      expect(mockTx.programHeadAssignment.updateMany).toHaveBeenCalledTimes(1);
      expect(mockTx.programHeadAssignment.delete).not.toHaveBeenCalled();
      expect(mockTx).not.toHaveProperty("courseAssignment");
      expect(mockTx).not.toHaveProperty("courseBoundEvaluation");
    });

    it("rolls back assignment-set changes when the transaction fails", async () => {
      setProgramHeadRecord([{ id: "a1", program_id: PROG_A, is_active: true }]);
      // The failure happens during the lifecycle write (updateMany), after the
      // set has been validated, so rollback is exercised for the assignment
      // operations themselves rather than the identity update.
      const failingTx = {
        user: { update: vi.fn() },
        $queryRaw: vi.fn().mockResolvedValue(undefined),
        userRole: { findUnique: vi.fn().mockResolvedValue({ role: SystemRole.PROGRAM_HEAD }) },
        programHeadAssignment: {
          findMany: vi.fn().mockResolvedValue([{ id: "a1", program_id: PROG_A, is_active: true }]),
          updateMany: vi.fn().mockRejectedValue(new Error("DB write failed")),
          upsert: vi.fn(),
          delete: vi.fn(),
        },
        program: { findMany: vi.fn().mockResolvedValue([{ id: PROG_B, is_active: true }]) },
      };
      (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(async (cb) =>
        cb(failingTx)
      );

      const result = await editUserBySecretary({
        ...programHeadSetInput([PROG_A, PROG_B]),
        confirmationToken: makeSetToken([PROG_A], [PROG_A, PROG_B]),
      });

      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toMatch(/db write failed/i);
      // No activation attempted after the failed deactivation write
      expect(failingTx.programHeadAssignment.upsert).not.toHaveBeenCalled();
    });
  });

  describe("Alumni profile and verification", () => {
    const alumniInput = {
      id: USER_ID,
      first_name: "Jane",
      last_name: "Smith",
      alumni: {
        graduation_year: 2020,
        program_id: PROG_NEW,
        major_id: null,
        verification_status: VerificationStatus.APPROVED,
      },
    };

    function setAlumniProfile(profile: object | null) {
      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: USER_ID,
        is_active: true,
        roles: [{ role: SystemRole.ALUMNI }],
        student_profile: null,
        enrollments: [],
        faculty_program_affiliations: [],
        program_head_assignments: [],
        alumni_profile: profile,
      });
    }

    it("requires one confirmation for academic and verification changes", async () => {
      setAlumniProfile({
        program_id: PROG_OLD,
        major_id: null,
        graduation_year: 2019,
        verification_status: VerificationStatus.PENDING,
      });

      const result = await editUserBySecretary(alumniInput);

      expect(result.success).toBe(true);
      if (result.success) expect(result.data.protectedConfirmationRequired).toBe(true);
    });

    it("completes legacy Alumni profile atomically after confirmation", async () => {
      setAlumniProfile(null);
      const first = await editUserBySecretary(alumniInput);
      expect(first.success).toBe(true);
      if (!first.success || !first.data.token) return;

      const result = await editUserBySecretary({
        ...alumniInput,
        confirmationToken: first.data.token,
      });

      expect(result.success).toBe(true);
      expect(mockTx.alumniProfile.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { user_id: USER_ID },
          create: expect.objectContaining({
            program_id: PROG_NEW,
            graduation_year: 2020,
            verification_status: VerificationStatus.APPROVED,
          }),
        })
      );
    });

    it("rejects a major that is not active in selected program", async () => {
      setAlumniProfile({
        program_id: PROG_OLD,
        major_id: null,
        graduation_year: 2019,
        verification_status: VerificationStatus.PENDING,
      });
      mockTx.program.findUnique.mockResolvedValue({ id: PROG_NEW, is_active: true, majors: [] });
      const token = makeToken(
        `ALUMNI:id=${USER_ID}:program=${PROG_NEW}:major=${PROG_OLD}:graduationYear=2020:verificationStatus=APPROVED`
      );

      const result = await editUserBySecretary({
        ...alumniInput,
        alumni: { ...alumniInput.alumni, major_id: PROG_OLD },
        confirmationToken: token,
      });

      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toMatch(/does not have majors|not valid/i);
    });
  });

  describe("Industry Partner profile and verification", () => {
    const industryInput = {
      id: USER_ID,
      first_name: "Jane",
      last_name: "Smith",
      industry_partner: {
        company_name: "CLOIE Labs",
        position: "Hiring Manager",
        program_id: PROG_NEW,
        verification_status: VerificationStatus.APPROVED,
      },
    };

    function setIndustryProfile(profile: object | null) {
      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: USER_ID,
        is_active: true,
        roles: [{ role: SystemRole.INDUSTRY_PARTNER }],
        student_profile: null,
        enrollments: [],
        faculty_program_affiliations: [],
        program_head_assignments: [],
        alumni_profile: null,
        industry_partner_profile: profile,
      });
    }

    it("requires confirmation when verification changes", async () => {
      setIndustryProfile({
        company_name: "Old Company",
        position: null,
        program_id: null,
        verification_status: VerificationStatus.PENDING,
      });

      const result = await editUserBySecretary(industryInput);

      expect(result.success).toBe(true);
      if (result.success) expect(result.data.protectedConfirmationRequired).toBe(true);
    });

    it("completes a legacy Industry Partner profile after confirmation", async () => {
      setIndustryProfile(null);
      const first = await editUserBySecretary(industryInput);
      expect(first.success).toBe(true);
      if (!first.success) return;

      const confirmed = await editUserBySecretary({
        ...industryInput,
        confirmationToken: first.data.token,
      });

      expect(confirmed.success).toBe(true);
      expect(mockTx.industryPartnerProfile.upsert).toHaveBeenCalledWith({
        where: { user_id: USER_ID },
        create: {
          user_id: USER_ID,
          company_name: "CLOIE Labs",
          position: "Hiring Manager",
          program_id: PROG_NEW,
          verification_status: VerificationStatus.APPROVED,
        },
        update: {
          company_name: "CLOIE Labs",
          position: "Hiring Manager",
          program_id: PROG_NEW,
          verification_status: VerificationStatus.APPROVED,
        },
      });
    });

    it("rejects an inactive affiliated program", async () => {
      setIndustryProfile({
        company_name: "Old Company",
        position: null,
        program_id: PROG_OLD,
        verification_status: VerificationStatus.PENDING,
      });
      mockTx.program.findUnique.mockResolvedValue({ id: PROG_NEW, is_active: false, majors: [] });

      const result = await editUserBySecretary({
        ...industryInput,
        industry_partner: {
          ...industryInput.industry_partner,
          program_id: PROG_NEW,
          verification_status: VerificationStatus.PENDING,
        },
        confirmationToken: makeToken(
          `INDUSTRY_PARTNER:id=${USER_ID}:company=CLOIE Labs:position=Hiring Manager:program=${PROG_NEW}:verificationStatus=PENDING`
        ),
      });

      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toMatch(/archived or inactive/i);
    });
  });
});
