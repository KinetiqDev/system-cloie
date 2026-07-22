import { beforeEach, describe, expect, it, vi } from "vitest";
import { TargetStakeholder, YearLevel } from "@prisma/client";
import { previewCentralDeploymentRespondents } from "@/features/evaluations/services/preview-central-deployment-respondents";
import { ROLES } from "@/lib/constants/roles";

const {
  findFirstPhAssignmentMock,
  findUniqueProgramMock,
  findManyExternalInviteMock,
  findManyUserMock,
  findManyIndustryPartnerMock,
  listStudentsForClassMock,
  resolveAuthSessionMock,
} = vi.hoisted(() => ({
  findFirstPhAssignmentMock: vi.fn(),
  findUniqueProgramMock: vi.fn(),
  findManyExternalInviteMock: vi.fn(),
  findManyUserMock: vi.fn(),
  findManyIndustryPartnerMock: vi.fn(),
  listStudentsForClassMock: vi.fn(),
  resolveAuthSessionMock: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    programHeadAssignment: {
      findFirst: findFirstPhAssignmentMock,
    },
    program: {
      findUnique: findUniqueProgramMock,
    },
    externalStakeholderInvite: {
      findMany: findManyExternalInviteMock,
    },
    user: {
      findMany: findManyUserMock,
    },
    industryPartnerProfile: {
      findMany: findManyIndustryPartnerMock,
    },
  },
}));

vi.mock("@/features/auth/services/resolve-auth-session", () => ({
  resolveAuthSession: resolveAuthSessionMock,
}));

vi.mock("@/features/enrollments/services/list-students-for-class", () => ({
  listStudentsForClass: listStudentsForClassMock,
}));

describe("previewCentralDeploymentRespondents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects unauthorized access when session is missing or user is not a program head", async () => {
    resolveAuthSessionMock.mockResolvedValue(null);

    const result = await previewCentralDeploymentRespondents({
      programId: "program-1",
      targetStakeholder: TargetStakeholder.STUDENT,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Program Head authentication is required.");
    }
  });

  it("returns error if no active program head assignment is found", async () => {
    resolveAuthSessionMock.mockResolvedValue({ activeRole: ROLES.PROGRAM_HEAD, userId: "ph-1", roles: [ROLES.PROGRAM_HEAD] });
    findFirstPhAssignmentMock.mockResolvedValue(null);

    const result = await previewCentralDeploymentRespondents({
      programId: "program-1",
      targetStakeholder: TargetStakeholder.STUDENT,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("No active program assignment found for this Program Head.");
    }
    expect(findFirstPhAssignmentMock).toHaveBeenCalledWith({
      where: {
        program_head_id: "ph-1",
        program_id: "program-1",
        is_active: true,
      },
      select: { program_id: true },
    });
  });

  describe("student targeting", () => {
    it("returns empty list if termInstanceId or yearLevel is missing", async () => {
      resolveAuthSessionMock.mockResolvedValue({ activeRole: ROLES.PROGRAM_HEAD, userId: "ph-1", roles: [ROLES.PROGRAM_HEAD] });
      findFirstPhAssignmentMock.mockResolvedValue({ program_id: "program-1" });

      const result = await previewCentralDeploymentRespondents({
        programId: "program-1",
        targetStakeholder: TargetStakeholder.STUDENT,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual([]);
      }
    });

    it("previews students using listStudentsForClass and maps them correctly", async () => {
      resolveAuthSessionMock.mockResolvedValue({ activeRole: ROLES.PROGRAM_HEAD, userId: "ph-1", roles: [ROLES.PROGRAM_HEAD] });
      findFirstPhAssignmentMock.mockResolvedValue({ program_id: "program-1" });
      findUniqueProgramMock.mockResolvedValue({ code: "BSCS" });
      listStudentsForClassMock.mockResolvedValue({
        success: true,
        data: [
          {
            userId: "student-1",
            email: "student1@school.edu",
            firstName: "John",
            lastName: "Doe",
            studentIdNumber: "S2025-001",
            majorId: null,
            majorName: null,
          },
        ],
      });

      const result = await previewCentralDeploymentRespondents({
        programId: "program-1",
        targetStakeholder: TargetStakeholder.STUDENT,
        termInstanceId: "term-1",
        yearLevel: YearLevel.FIRST_YEAR,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(1);
        expect(result.data[0]).toEqual({
          email: "student1@school.edu",
          firstName: "John",
          lastName: "Doe",
          majorName: null,
          programCode: "BSCS",
          stakeholderType: TargetStakeholder.STUDENT,
          studentId: "S2025-001",
          userId: "student-1",
          yearLevel: YearLevel.FIRST_YEAR,
        });
      }

      expect(listStudentsForClassMock).toHaveBeenCalledWith({
        termInstanceId: "term-1",
        programId: "program-1",
        yearLevel: YearLevel.FIRST_YEAR,
        majorId: undefined,
      });
    });
  });

  describe("alumni targeting", () => {
    it("previews alumni by invitation status and maps them correctly", async () => {
      resolveAuthSessionMock.mockResolvedValue({ activeRole: ROLES.PROGRAM_HEAD, userId: "ph-1", roles: [ROLES.PROGRAM_HEAD] });
      findFirstPhAssignmentMock.mockResolvedValue({ program_id: "program-1" });

      findManyExternalInviteMock.mockResolvedValue([
        { email: "alumni1@school.edu" },
      ]);
      findManyUserMock.mockResolvedValue([
        {
          id: "user-alumni-1",
          email: "alumni1@school.edu",
          first_name: "Jane",
          last_name: "Smith",
        },
      ]);

      const result = await previewCentralDeploymentRespondents({
        programId: "program-1",
        targetStakeholder: TargetStakeholder.ALUMNI,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(1);
        expect(result.data[0]).toEqual({
          email: "alumni1@school.edu",
          firstName: "Jane",
          lastName: "Smith",
          majorName: null,
          programCode: null,
          section: null,
          stakeholderType: TargetStakeholder.ALUMNI,
          studentId: null,
          userId: "user-alumni-1",
          yearLevel: null,
        });
      }

      expect(findManyExternalInviteMock).toHaveBeenCalledWith({
        where: {
          role: ROLES.ALUMNI,
          program_id: "program-1",
          status: "ACCEPTED",
        },
        select: { email: true },
      });
      expect(findManyUserMock).toHaveBeenCalledWith({
        where: { email: { in: ["alumni1@school.edu"] } },
        select: { id: true, email: true, first_name: true, last_name: true },
        orderBy: { last_name: "asc" },
      });
    });
  });

  describe("industry partner targeting", () => {
    it("previews industry partners by profile and maps them correctly", async () => {
      resolveAuthSessionMock.mockResolvedValue({ activeRole: ROLES.PROGRAM_HEAD, userId: "ph-1", roles: [ROLES.PROGRAM_HEAD] });
      findFirstPhAssignmentMock.mockResolvedValue({ program_id: "program-1" });

      findManyIndustryPartnerMock.mockResolvedValue([
        {
          user: {
            id: "user-ip-1",
            email: "partner1@company.com",
            first_name: "Bob",
            last_name: "Builder",
          },
          program: {
            code: "BSCS",
          },
        },
      ]);

      const result = await previewCentralDeploymentRespondents({
        programId: "program-1",
        targetStakeholder: TargetStakeholder.INDUSTRY_PARTNER,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(1);
        expect(result.data[0]).toEqual({
          email: "partner1@company.com",
          firstName: "Bob",
          lastName: "Builder",
          majorName: null,
          programCode: "BSCS",
          section: null,
          stakeholderType: TargetStakeholder.INDUSTRY_PARTNER,
          studentId: null,
          userId: "user-ip-1",
          yearLevel: null,
        });
      }

      expect(findManyIndustryPartnerMock).toHaveBeenCalledWith({
        where: { program_id: "program-1" },
        include: {
          user: {
            select: { id: true, email: true, first_name: true, last_name: true },
          },
          program: { select: { code: true } },
        },
        orderBy: { user: { last_name: "asc" } },
      });
    });
  });
});
