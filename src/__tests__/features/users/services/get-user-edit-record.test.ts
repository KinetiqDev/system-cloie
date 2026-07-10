import { beforeEach, describe, expect, it, vi } from "vitest";
import { SystemRole, VerificationStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { getUserEditRecordBySecretary } from "@/features/users/services/get-user-edit-record";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { ROLES } from "@/lib/constants/roles";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/features/auth/services/resolve-auth-session", () => ({
  resolveAuthSession: vi.fn(),
}));

describe("getUserEditRecordBySecretary", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    (resolveAuthSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: "secretary-id",
      activeRole: ROLES.SECRETARY,
      roles: [ROLES.SECRETARY],
    });
  });

  it("returns the projected edit record for a valid user", async () => {
    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "target-user-id",
      first_name: "John",
      last_name: "Doe",
      email: "john.doe@acd.edu.ph",
      is_active: true,
      roles: [{ role: SystemRole.DEAN }],
      student_profile: null,
      alumni_profile: null,
      industry_partner_profile: null,
    });

    const result = await getUserEditRecordBySecretary("target-user-id");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        id: "target-user-id",
        firstName: "John",
        lastName: "Doe",
        email: "john.doe@acd.edu.ph",
        isActive: true,
        role: SystemRole.DEAN,
        student: null,
        activeEnrollment: null,
       faculty: null,
         programHead: { assignmentProgramId: null },
        verification: null,
        industryPartner: null,
        alumni: null,
      });
    }
  });

  it("projects student fields when present", async () => {
    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "student-id",
      first_name: "Sam",
      last_name: "Student",
      email: "sam@acd.edu.ph",
      is_active: true,
      roles: [{ role: SystemRole.STUDENT }],
      student_profile: {
        program_id: "prog-1",
        program: { code: "BSIT", name: "Info Tech" },
        major_id: "maj-1",
        major: { name: "Web Dev" },
        student_id_number: "2024-001",
      },
    });

    const result = await getUserEditRecordBySecretary("student-id");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.role).toBe(SystemRole.STUDENT);
      expect(result.data.student).toEqual({
        programId: "prog-1",
        programCode: "BSIT",
        programName: "Info Tech",
        majorId: "maj-1",
        majorName: "Web Dev",
        studentIdNumber: "2024-001",
      });
    }
  });

  it("projects active enrollment fields when present", async () => {
    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "student-id",
      first_name: "Sam",
      last_name: "Student",
      email: "sam@acd.edu.ph",
      is_active: true,
      roles: [{ role: SystemRole.STUDENT }],
      student_profile: {
        program_id: "prog-1",
        program: { code: "BSIT", name: "Info Tech" },
        major_id: "maj-1",
        major: { name: "Web Dev" },
        student_id_number: "2024-001",
      },
      enrollments: [
        {
          id: "enrollment-id",
          term_instance_id: "term-id",
          program_id: "prog-1",
          major_id: "maj-1",
          year_level: "FIRST_YEAR",
          section: "MORNING",
        }
      ]
    });

    const result = await getUserEditRecordBySecretary("student-id");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.role).toBe(SystemRole.STUDENT);
      expect(result.data.activeEnrollment).toEqual({
        id: "enrollment-id",
        termInstanceId: "term-id",
        programId: "prog-1",
        majorId: "maj-1",
        yearLevel: "FIRST_YEAR",
        section: "MORNING",
      });
    }
  });

  it("projects faculty primary program when present", async () => {
    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "faculty-id",
      first_name: "Frank",
      last_name: "Faculty",
      email: "frank@acd.edu.ph",
      is_active: true,
      roles: [{ role: SystemRole.FACULTY }],
      faculty_program_affiliations: [
        { program_id: "prog-fac" }
      ],
    });

    const result = await getUserEditRecordBySecretary("faculty-id");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.role).toBe(SystemRole.FACULTY);
      expect(result.data.faculty).toEqual({
        primaryProgramId: "prog-fac",
      });
    }
  });

  it("projects program head assignment when present", async () => {
    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "program-head-id",
      first_name: "Pat",
      last_name: "Head",
      email: "pat@acd.edu.ph",
      is_active: true,
      roles: [{ role: SystemRole.PROGRAM_HEAD }],
      program_head_assignments: [{ program_id: "prog-managed" }],
    });

    const result = await getUserEditRecordBySecretary("program-head-id");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.programHead).toEqual({ assignmentProgramId: "prog-managed" });
    }
  });

  it("projects alumni and verification fields when present", async () => {
    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "alumni-id",
      first_name: "Ally",
      last_name: "Alum",
      email: "ally@gmail.com",
      is_active: true,
      roles: [{ role: SystemRole.ALUMNI }],
      alumni_profile: {
        graduation_year: 2020,
        program_id: "prog-1",
        major_id: null,
        verification_status: VerificationStatus.PENDING,
      },
    });

    const result = await getUserEditRecordBySecretary("alumni-id");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.role).toBe(SystemRole.ALUMNI);
      expect(result.data.verification).toEqual({ status: VerificationStatus.PENDING });
      expect(result.data.alumni).toEqual({
        graduationYear: 2020,
        programId: "prog-1",
        majorId: null,
      });
    }
  });

  it("rejects when the user is not authenticated", async () => {
    (resolveAuthSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const result = await getUserEditRecordBySecretary("target-user-id");

    expect(result.success).toBe(false);
  });

  it("rejects when the user is not a Secretary", async () => {
    (resolveAuthSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: "dean-id",
      activeRole: ROLES.DEAN,
    });

    const result = await getUserEditRecordBySecretary("target-user-id");

    expect(result.success).toBe(false);
  });

  it("rejects when attempting to load own record", async () => {
    const result = await getUserEditRecordBySecretary("secretary-id");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/cannot edit your own account/i);
    }
  });

  it("rejects when target user is not found", async () => {
    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const result = await getUserEditRecordBySecretary("missing-id");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/user not found/i);
    }
  });
});
