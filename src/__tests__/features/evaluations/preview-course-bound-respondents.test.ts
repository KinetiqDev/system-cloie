import { beforeEach, describe, expect, it, vi } from "vitest";
import { YearLevel, StudentSection } from "@prisma/client";
import { previewCourseBoundRespondents } from "@/features/evaluations/services/preview-course-bound-respondents";
import { ROLES } from "@/lib/constants/roles";

const {
  findUniqueAssignmentMock,
  membershipFindManyMock,
  enrollmentFindManyMock,
  resolveAuthSessionMock,
  programHeadAssignmentFindManyMock,
  resolveProgramHeadContextMock,
} = vi.hoisted(() => ({
  findUniqueAssignmentMock: vi.fn(),
  membershipFindManyMock: vi.fn(),
  enrollmentFindManyMock: vi.fn(),
  resolveAuthSessionMock: vi.fn(),
  programHeadAssignmentFindManyMock: vi.fn(),
  resolveProgramHeadContextMock: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    courseAssignment: {
      findUnique: findUniqueAssignmentMock,
      findFirst: findUniqueAssignmentMock,
    },
    courseAssignmentMembership: {
      findMany: membershipFindManyMock,
    },
    studentEnrollment: {
      findMany: enrollmentFindManyMock,
    },
    programHeadAssignment: {
      findMany: programHeadAssignmentFindManyMock,
    },
  },
}));

vi.mock("@/features/auth/services/resolve-auth-session", () => ({
  resolveAuthSession: resolveAuthSessionMock,
}));

vi.mock("@/features/auth/services/resolve-program-head-context", () => ({
  resolveProgramHeadContext: resolveProgramHeadContextMock,
}));

const MOCK_ASSIGNMENT = {
  id: "assignment-1",
  faculty_id: "faculty-1",
  is_active: true,
  term_instance_id: "term-1",
  program_id: "program-1",
  year_level: YearLevel.FIRST_YEAR,
  section: StudentSection.MORNING,
  program: {
    id: "program-1",
    code: "BSCS",
    name: "BS Computer Science",
  },
  course: {
    id: "course-1",
    code: "CS-101",
    title: "Intro to Computer Science",
    course_scope: "PROGRAM_SPECIFIC",
  },
};

describe("previewCourseBoundRespondents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    programHeadAssignmentFindManyMock.mockResolvedValue([]);
  });

  it("rejects unauthorized access when session is missing", async () => {
    resolveAuthSessionMock.mockResolvedValue(null);

    const result = await previewCourseBoundRespondents({ assignmentId: "assignment-1" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Authentication required.");
    }
  });

  it("returns error if course assignment is not found", async () => {
    resolveAuthSessionMock.mockResolvedValue({
      userId: "faculty-1",
      activeRole: ROLES.FACULTY,
      roles: [ROLES.FACULTY],
      profileGate: { status: "COMPLETE" },
      email: null,
      studentProfileId: null,
      alumniProfileId: null,
      industryPartnerProfileId: null,
    });
    findUniqueAssignmentMock.mockResolvedValue(null);

    const result = await previewCourseBoundRespondents({ assignmentId: "assignment-1" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Course assignment not found.");
    }
  });

  it("does not preview respondents for an inactive faculty owner", async () => {
    resolveAuthSessionMock.mockResolvedValue({
      userId: "faculty-1",
      activeRole: ROLES.FACULTY,
      roles: [ROLES.FACULTY],
      profileGate: { status: "INACTIVE" },
    });
    findUniqueAssignmentMock.mockResolvedValue(MOCK_ASSIGNMENT);
    membershipFindManyMock.mockResolvedValue([]);

    await expect(previewCourseBoundRespondents({ assignmentId: "assignment-1" })).resolves.toEqual({
      error: "Course assignment not found.",
      success: false,
    });
  });

  it("returns error if course assignment belongs to a different faculty", async () => {
    resolveAuthSessionMock.mockResolvedValue({
      userId: "faculty-2",
      activeRole: ROLES.FACULTY,
      roles: [ROLES.FACULTY],
      profileGate: { status: "COMPLETE" },
    });
    findUniqueAssignmentMock.mockResolvedValue(MOCK_ASSIGNMENT);

    const result = await previewCourseBoundRespondents({ assignmentId: "assignment-1" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Course assignment not found.");
    }
  });

  it("returns error if course assignment is inactive", async () => {
    resolveAuthSessionMock.mockResolvedValue({
      userId: "faculty-1",
      activeRole: ROLES.FACULTY,
      roles: [ROLES.FACULTY],
      profileGate: { status: "COMPLETE" },
    });
    findUniqueAssignmentMock.mockResolvedValue({
      ...MOCK_ASSIGNMENT,
      is_active: false,
    });

    const result = await previewCourseBoundRespondents({ assignmentId: "assignment-1" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("This course assignment is inactive.");
    }
  });

  it("does not reveal whether an unauthorized assignment exists", async () => {
    resolveAuthSessionMock.mockResolvedValue({
      userId: "faculty-2",
      activeRole: ROLES.FACULTY,
      roles: [ROLES.FACULTY],
      profileGate: { status: "COMPLETE" },
    });
    findUniqueAssignmentMock.mockResolvedValue(MOCK_ASSIGNMENT);
    const existingAssignment = await previewCourseBoundRespondents({
      assignmentId: "assignment-1",
    });

    findUniqueAssignmentMock.mockResolvedValue(null);
    const missingAssignment = await previewCourseBoundRespondents({ assignmentId: "assignment-2" });

    expect(existingAssignment).toEqual(missingAssignment);
  });

  it("returns active roster memberships and never uses the enrollment cohort", async () => {
    resolveAuthSessionMock.mockResolvedValue({
      userId: "faculty-1",
      activeRole: ROLES.FACULTY,
      roles: [ROLES.FACULTY],
      profileGate: { status: "COMPLETE" },
    });
    findUniqueAssignmentMock.mockResolvedValue(MOCK_ASSIGNMENT);
    membershipFindManyMock.mockResolvedValue([
      {
        id: "membership-1",
        student_user_id: "student-1",
        student: {
          email: "student1@school.edu",
          name: "John Doe",
          student_profile: { major_id: null, major: null },
        },
      },
      {
        id: "membership-2",
        student_user_id: "student-2",
        student: {
          email: "student2@school.edu",
          name: "Mary Anne O'Connor",
          student_profile: { major_id: null, major: null },
        },
      },
      {
        id: "membership-3",
        student_user_id: "student-3",
        student: {
          email: "student3@school.edu",
          name: "Prince",
          student_profile: { major_id: null, major: null },
        },
      },
    ]);

    const result = await previewCourseBoundRespondents({ assignmentId: "assignment-1" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(3);
      expect(result.data.map((r) => r.name)).toEqual([
        "John Doe",
        "Mary Anne O'Connor",
        "Prince",
      ]);
      expect(result.data[0]).toEqual({
        email: "student1@school.edu",
        majorId: null,
        majorName: null,
        membershipId: "membership-1",
        name: "John Doe",
        programCode: "BSCS",
        programId: "program-1",
        programName: "BS Computer Science",
        section: StudentSection.MORNING,
        userId: "student-1",
        yearLevel: YearLevel.FIRST_YEAR,
      });
      expect(result.data[0]).not.toHaveProperty("firstName");
      expect(result.data[0]).not.toHaveProperty("lastName");
      expect(result.data[0]).not.toHaveProperty("studentId");
      expect(result.data[0]).not.toHaveProperty("studentIdNumber");
      expect(result.data[0]).not.toHaveProperty("student_id_number");
      expect(result.data[0]).not.toHaveProperty("matchStatus");
    }

    expect(JSON.stringify(result)).not.toMatch(/studentIdNumber|student_id_number|Student ID/i);
    expect(enrollmentFindManyMock).not.toHaveBeenCalled();
    expect(membershipFindManyMock).toHaveBeenCalledWith({
      where: { course_assignment_id: "assignment-1", is_active: true },
      orderBy: { created_at: "asc" },
      select: {
        id: true,
        student_user_id: true,
        student: {
          select: {
            email: true,
            name: true,
            student_profile: {
              select: {
                major_id: true,
                major: { select: { name: true } },
              },
            },
          },
        },
      },
    });
  });

  it("rejects a selected Program that does not own the Course assignment", async () => {
    resolveAuthSessionMock.mockResolvedValue({
      userId: "program-head-1",
      activeRole: ROLES.PROGRAM_HEAD,
      roles: [ROLES.PROGRAM_HEAD],
      profileGate: { status: "COMPLETE" },
    });
    resolveProgramHeadContextMock.mockResolvedValue({
      success: true,
      data: {
        authorizedPrograms: [
          { code: "BSCS", id: "program-1", name: "BS Computer Science" },
          { code: "BSED", id: "program-2", name: "Bachelor of Secondary Education" },
        ],
        selectedProgram: {
          code: "BSED",
          id: "program-2",
          name: "Bachelor of Secondary Education",
        },
        userId: "program-head-1",
      },
    });
    findUniqueAssignmentMock.mockResolvedValue(MOCK_ASSIGNMENT);

    await expect(
      previewCourseBoundRespondents({ assignmentId: "assignment-1", programId: "program-2" })
    ).resolves.toEqual({
      error: "Course assignment not found.",
      success: false,
    });

    expect(membershipFindManyMock).not.toHaveBeenCalled();
  });

  it("does not rematch names or treat term placement as Course membership", async () => {
    resolveAuthSessionMock.mockResolvedValue({
      userId: "faculty-1",
      activeRole: ROLES.FACULTY,
      roles: [ROLES.FACULTY],
      profileGate: { status: "COMPLETE" },
    });
    findUniqueAssignmentMock.mockResolvedValue(MOCK_ASSIGNMENT);
    membershipFindManyMock.mockResolvedValue([
      {
        id: "membership-1",
        student_user_id: "student-1",
        student: {
          email: "student1@school.edu",
          name: "John Doe",
          student_profile: { major_id: null, major: null },
        },
      },
    ]);
    const result = await previewCourseBoundRespondents({ assignmentId: "assignment-1" });

    expect(result).toEqual({
      success: true,
      data: [
        {
          email: "student1@school.edu",
          majorId: null,
          majorName: null,
          membershipId: "membership-1",
          name: "John Doe",
          programCode: "BSCS",
          programId: "program-1",
          programName: "BS Computer Science",
          section: StudentSection.MORNING,
          userId: "student-1",
          yearLevel: YearLevel.FIRST_YEAR,
        },
      ],
    });
    expect(enrollmentFindManyMock).not.toHaveBeenCalled();
  });

  it("returns a support reference for unexpected preview failures", async () => {
    resolveAuthSessionMock.mockResolvedValue({
      userId: "faculty-1",
      activeRole: ROLES.FACULTY,
      roles: [ROLES.FACULTY],
      profileGate: { status: "COMPLETE" },
    });
    findUniqueAssignmentMock.mockRejectedValue(new Error("database secret"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const result = await previewCourseBoundRespondents({ assignmentId: "assignment-1" });

    expect(result).toMatchObject({
      error: "Failed to load respondent preview. Please try again.",
      referenceId: expect.any(String),
      success: false,
    });
    expect(consoleError).toHaveBeenCalledWith(
      "Failed to preview course-bound respondents",
      expect.objectContaining({
        error: { name: "Error" },
      })
    );
    expect(consoleError.mock.calls.flat().join(" ")).not.toContain("database secret");
    consoleError.mockRestore();
  });
});
