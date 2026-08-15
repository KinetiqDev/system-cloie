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
  resolveProgramHeadContextMock,
} = vi.hoisted(() => ({
  findFirstPhAssignmentMock: vi.fn(),
  findUniqueProgramMock: vi.fn(),
  findManyExternalInviteMock: vi.fn(),
  findManyUserMock: vi.fn(),
  findManyIndustryPartnerMock: vi.fn(),
  listStudentsForClassMock: vi.fn(),
  resolveAuthSessionMock: vi.fn(),
  resolveProgramHeadContextMock: vi.fn(),
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
vi.mock("@/features/auth/services/resolve-program-head-context", () => ({
  resolveProgramHeadContext: resolveProgramHeadContextMock,
}));

vi.mock("@/features/enrollments/services/list-students-for-class", () => ({
  listStudentsForClass: listStudentsForClassMock,
}));

describe("previewCentralDeploymentRespondents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveProgramHeadContextMock.mockResolvedValue({
      success: true,
      data: {
        userId: "ph-1",
        authorizedPrograms: [{ id: "program-1", code: "BSCS", name: "Computer Science" }],
        selectedProgram: { id: "program-1", code: "BSCS", name: "Computer Science" },
      },
    });
  });

  it("rejects unauthorized access when session is missing or user is not a program head", async () => {
    resolveAuthSessionMock.mockResolvedValue(null);
    resolveProgramHeadContextMock.mockResolvedValue({
      success: false,
      error: "Program Head authentication is required.",
    });

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
    resolveProgramHeadContextMock.mockResolvedValue({
      success: false,
      error: "No active program assignment found for this Program Head.",
    });

    const result = await previewCentralDeploymentRespondents({
      programId: "program-1",
      targetStakeholder: TargetStakeholder.STUDENT,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("No active program assignment found for this Program Head.");
    }
  });

  it("does not query respondents for an unassigned selected Program", async () => {
    resolveProgramHeadContextMock.mockResolvedValue({
      success: false,
      error: "Selected Program is not assigned.",
    });

    const result = await previewCentralDeploymentRespondents({
      programId: "program-2",
      targetStakeholder: TargetStakeholder.STUDENT,
    });

    expect(result).toEqual({ success: false, error: "Selected Program is not assigned." });
    expect(listStudentsForClassMock).not.toHaveBeenCalled();
    expect(findManyExternalInviteMock).not.toHaveBeenCalled();
    expect(findManyIndustryPartnerMock).not.toHaveBeenCalled();
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
            name: "John Doe",
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
          majorName: null,
          name: "John Doe",
          programCode: "BSCS",
          stakeholderType: TargetStakeholder.STUDENT,
          userId: "student-1",
          yearLevel: YearLevel.FIRST_YEAR,
        });
        expect(result.data[0]).not.toHaveProperty("firstName");
        expect(result.data[0]).not.toHaveProperty("lastName");
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
          name: "Jane Smith",
        },
        {
          id: "user-alumni-2",
          email: "alumni2@school.edu",
          name: "Mary Anne O'Connor",
        },
        {
          id: "user-alumni-3",
          email: "alumni3@school.edu",
          name: "Prince",
        },
      ]);

      const result = await previewCentralDeploymentRespondents({
        programId: "program-1",
        targetStakeholder: TargetStakeholder.ALUMNI,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(3);
        expect(result.data.map((r) => r.name)).toEqual([
          "Jane Smith",
          "Mary Anne O'Connor",
          "Prince",
        ]);
        expect(result.data[0]).toEqual({
          email: "alumni1@school.edu",
          majorName: null,
          name: "Jane Smith",
          programCode: null,
          stakeholderType: TargetStakeholder.ALUMNI,
          userId: "user-alumni-1",
          yearLevel: null,
        });
        expect(result.data[0]).not.toHaveProperty("firstName");
        expect(result.data[0]).not.toHaveProperty("lastName");
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
        select: { id: true, email: true, name: true },
        orderBy: { name: "asc" },
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
            name: "Bob Builder",
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
          majorName: null,
          name: "Bob Builder",
          programCode: "BSCS",
          stakeholderType: TargetStakeholder.INDUSTRY_PARTNER,
          userId: "user-ip-1",
          yearLevel: null,
        });
        expect(result.data[0]).not.toHaveProperty("firstName");
        expect(result.data[0]).not.toHaveProperty("lastName");
      }

      expect(findManyIndustryPartnerMock).toHaveBeenCalledWith({
        where: { program_id: "program-1" },
        include: {
          user: {
            select: { id: true, email: true, name: true },
          },
          program: { select: { code: true } },
        },
        orderBy: { user: { name: "asc" } },
      });
    });
  });
});
