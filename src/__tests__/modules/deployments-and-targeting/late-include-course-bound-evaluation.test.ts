import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";
import { ROLES } from "@/lib/constants/roles";
import { createPrismaUniqueConstraintError } from "@/__tests__/helpers/prisma-test-helpers";
import { lateIncludeCourseBoundEvaluationStudent } from "@/features/evaluations/services/late-include-course-bound-evaluation";

const {
  courseBoundEvaluationFindUniqueMock,
  courseBoundEvaluationExclusionFindFirstMock,
  courseAssignmentMembershipFindUniqueMock,
  evaluationAssignmentFindFirstMock,
  evaluationAssignmentCreateMock,
  exclusionUpdateMock,
  globalExclusionFindFirstMock,
  globalMembershipFindUniqueMock,
  globalAssignmentFindFirstMock,
  programHeadAssignmentFindManyMock,
  revalidateProgramHeadAssignmentMock,
  resolveAuthSessionMock,
  resolveProgramHeadContextMock,
  transactionMock,
} = vi.hoisted(() => ({
  courseBoundEvaluationFindUniqueMock: vi.fn(),
  courseBoundEvaluationExclusionFindFirstMock: vi.fn(),
  courseAssignmentMembershipFindUniqueMock: vi.fn(),
  evaluationAssignmentFindFirstMock: vi.fn(),
  evaluationAssignmentCreateMock: vi.fn(),
  exclusionUpdateMock: vi.fn(),
  globalExclusionFindFirstMock: vi.fn(),
  globalMembershipFindUniqueMock: vi.fn(),
  globalAssignmentFindFirstMock: vi.fn(),
  programHeadAssignmentFindManyMock: vi.fn(),
  revalidateProgramHeadAssignmentMock: vi.fn(),
  resolveAuthSessionMock: vi.fn(),
  resolveProgramHeadContextMock: vi.fn(),
  transactionMock: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    $transaction: transactionMock,
    courseBoundEvaluationExclusion: { findFirst: globalExclusionFindFirstMock },
    courseAssignmentMembership: { findUnique: globalMembershipFindUniqueMock },
    evaluationAssignment: { findFirst: globalAssignmentFindFirstMock },
  },
}));

vi.mock("@/features/auth/services/resolve-auth-session", () => ({
  resolveAuthSession: resolveAuthSessionMock,
}));

vi.mock("@/features/auth/services/resolve-program-head-context", () => ({
  revalidateProgramHeadAssignment: revalidateProgramHeadAssignmentMock,
  resolveProgramHeadContext: resolveProgramHeadContextMock,
}));

const session = {
  activeRole: ROLES.FACULTY,
  email: "faculty@example.com",
  roles: [ROLES.FACULTY],
  profileGate: { status: "COMPLETE" },
  userId: "faculty-1",
  studentProfileId: null,
  alumniProfileId: null,
  industryPartnerProfileId: null,
};

const evaluation = {
  id: "evaluation-1",
  status: "ACTIVE",
  deadline_at: null,
  course_assignment_id: "assignment-1",
  course_assignment: {
    course: { course_scope: "PROGRAM_SPECIFIC" },
    course_scope: "PROGRAM_SPECIFIC",
    faculty_id: "faculty-1",
    is_active: true,
    program_id: "program-1",
  },
};

const exclusion = {
  id: "exclusion-1",
  reversed_at: null,
};

function configureTransaction() {
  transactionMock.mockImplementation(async (callback) =>
    callback({
      $queryRaw: vi.fn(),
      courseBoundEvaluation: { findUnique: courseBoundEvaluationFindUniqueMock },
      courseBoundEvaluationExclusion: {
        findFirst: courseBoundEvaluationExclusionFindFirstMock,
        update: exclusionUpdateMock,
      },
      courseAssignmentMembership: { findUnique: courseAssignmentMembershipFindUniqueMock },
      evaluationAssignment: {
        findFirst: evaluationAssignmentFindFirstMock,
        create: evaluationAssignmentCreateMock,
      },
      programHeadAssignment: { findMany: programHeadAssignmentFindManyMock },
      program: { findUnique: vi.fn() },
    })
  );
}

describe("lateIncludeCourseBoundEvaluationStudent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveAuthSessionMock.mockResolvedValue(session);
    programHeadAssignmentFindManyMock.mockResolvedValue([]);
    revalidateProgramHeadAssignmentMock.mockResolvedValue({
      code: "BSIT",
      id: "program-1",
      name: "BS Information Technology",
    });
    courseBoundEvaluationFindUniqueMock.mockResolvedValue(evaluation);
    courseBoundEvaluationExclusionFindFirstMock.mockResolvedValue(exclusion);
    courseAssignmentMembershipFindUniqueMock.mockResolvedValue({
      course_assignment_id: "assignment-1",
      is_active: true,
      student_user_id: "student-1",
    });
    evaluationAssignmentFindFirstMock.mockResolvedValue(null);
    exclusionUpdateMock.mockResolvedValue({});
    evaluationAssignmentCreateMock.mockResolvedValue({ id: "evaluation-assignment-1" });
    globalExclusionFindFirstMock.mockResolvedValue(exclusion);
    globalMembershipFindUniqueMock.mockResolvedValue({ student_user_id: "student-1" });
    globalAssignmentFindFirstMock.mockResolvedValue({ id: "evaluation-assignment-1" });
    configureTransaction();
  });

  it("records distinct reversal audit and creates one assignment", async () => {
    const result = await lateIncludeCourseBoundEvaluationStudent({
      evaluationId: "evaluation-1",
      membershipId: "membership-1",
      reversalCategory: "APPROVED_LATE_PARTICIPATION",
    });

    expect(result).toEqual({
      success: true,
      data: { message: "Student was included in this evaluation." },
    });
    expect(exclusionUpdateMock).toHaveBeenCalledWith({
      where: { id: "exclusion-1" },
      data: expect.objectContaining({
        reversal_category: "APPROVED_LATE_PARTICIPATION",
        reversed_by: "faculty-1",
        reversal_other_explanation: null,
      }),
    });
    expect(evaluationAssignmentCreateMock).toHaveBeenCalledWith({
      data: { course_bound_id: "evaluation-1", respondent_id: "student-1" },
    });
  });

  it("rejects Other without a constrained neutral explanation", async () => {
    const result = await lateIncludeCourseBoundEvaluationStudent({
      evaluationId: "evaluation-1",
      membershipId: "membership-1",
      reversalCategory: "OTHER",
    });

    expect(result).toEqual({
      success: false,
      error:
        "Other reversal explanations must be 5-200 neutral characters without sensitive details.",
    });
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("rejects closed evaluations, inactive memberships, and existing assignments", async () => {
    courseBoundEvaluationFindUniqueMock.mockResolvedValue({ ...evaluation, status: "CLOSED" });
    await expect(
      lateIncludeCourseBoundEvaluationStudent({
        evaluationId: "evaluation-1",
        membershipId: "membership-1",
        reversalCategory: "EXCLUDED_IN_ERROR",
      })
    ).resolves.toEqual({ success: false, error: "This evaluation is closed." });

    courseBoundEvaluationFindUniqueMock.mockResolvedValue(evaluation);
    courseAssignmentMembershipFindUniqueMock.mockResolvedValue({
      course_assignment_id: "assignment-1",
      is_active: false,
      student_user_id: "student-1",
    });
    await expect(
      lateIncludeCourseBoundEvaluationStudent({
        evaluationId: "evaluation-1",
        membershipId: "membership-1",
        reversalCategory: "EXCLUDED_IN_ERROR",
      })
    ).resolves.toEqual({ success: false, error: "Student is not an active roster member." });

    courseAssignmentMembershipFindUniqueMock.mockResolvedValue({
      course_assignment_id: "assignment-1",
      is_active: true,
      student_user_id: "student-1",
    });
    evaluationAssignmentFindFirstMock.mockResolvedValue({ id: "existing-assignment" });
    await expect(
      lateIncludeCourseBoundEvaluationStudent({
        evaluationId: "evaluation-1",
        membershipId: "membership-1",
        reversalCategory: "EXCLUDED_IN_ERROR",
      })
    ).resolves.toEqual({
      success: false,
      error: "Student already has an assignment for this evaluation.",
    });
  });

  it("maps unauthorized, reversed, and missing exclusions safely", async () => {
    resolveAuthSessionMock.mockResolvedValue({ ...session, userId: "other-faculty" });
    await expect(
      lateIncludeCourseBoundEvaluationStudent({
        evaluationId: "evaluation-1",
        membershipId: "membership-1",
        reversalCategory: "EXCLUDED_IN_ERROR",
      })
    ).resolves.toEqual({ success: false, error: "Course assignment not found." });

    resolveAuthSessionMock.mockResolvedValue(session);
    courseBoundEvaluationExclusionFindFirstMock.mockResolvedValue(null);
    await expect(
      lateIncludeCourseBoundEvaluationStudent({
        evaluationId: "evaluation-1",
        membershipId: "membership-1",
        reversalCategory: "EXCLUDED_IN_ERROR",
      })
    ).resolves.toEqual({ success: false, error: "Student was not excluded from this evaluation." });

    courseBoundEvaluationExclusionFindFirstMock.mockResolvedValue({
      ...exclusion,
      reversed_at: new Date(),
    });
    await expect(
      lateIncludeCourseBoundEvaluationStudent({
        evaluationId: "evaluation-1",
        membershipId: "membership-1",
        reversalCategory: "EXCLUDED_IN_ERROR",
      })
    ).resolves.toEqual({ success: false, error: "This exclusion has already been reversed." });
  });

  it("treats a concurrent unique assignment race as an idempotent success", async () => {
    evaluationAssignmentCreateMock.mockRejectedValue(createPrismaUniqueConstraintError());
    evaluationAssignmentFindFirstMock.mockResolvedValue(null);
    globalAssignmentFindFirstMock.mockResolvedValue({ id: "evaluation-assignment-1" });

    await expect(
      lateIncludeCourseBoundEvaluationStudent({
        evaluationId: "evaluation-1",
        membershipId: "membership-1",
        reversalCategory: "EXCLUDED_IN_ERROR",
      })
    ).resolves.toEqual({
      success: true,
      data: { message: "Student was included in this evaluation." },
    });
  });

  it("retries serializable transaction conflicts", async () => {
    const conflict = new Prisma.PrismaClientKnownRequestError("write conflict", {
      code: "P2034",
      clientVersion: "test",
    });
    transactionMock.mockRejectedValueOnce(conflict).mockImplementationOnce(async (callback) =>
      callback({
        $queryRaw: vi.fn(),
        courseBoundEvaluation: { findUnique: courseBoundEvaluationFindUniqueMock },
        courseBoundEvaluationExclusion: {
          findFirst: courseBoundEvaluationExclusionFindFirstMock,
          update: exclusionUpdateMock,
        },
        courseAssignmentMembership: { findUnique: courseAssignmentMembershipFindUniqueMock },
        evaluationAssignment: {
          findFirst: evaluationAssignmentFindFirstMock,
          create: evaluationAssignmentCreateMock,
        },
        programHeadAssignment: { findMany: programHeadAssignmentFindManyMock },
      })
    );

    await expect(
      lateIncludeCourseBoundEvaluationStudent({
        evaluationId: "evaluation-1",
        membershipId: "membership-1",
        reversalCategory: "EXCLUDED_IN_ERROR",
      })
    ).resolves.toMatchObject({ success: true });
    expect(transactionMock).toHaveBeenCalledTimes(2);
  });

  it("revalidates the selected Program for Program Head late inclusion", async () => {
    const programHeadSession = {
      ...session,
      activeRole: ROLES.PROGRAM_HEAD,
      roles: [ROLES.PROGRAM_HEAD],
      userId: "head-1",
    };
    resolveAuthSessionMock.mockResolvedValue(programHeadSession);
    resolveProgramHeadContextMock.mockResolvedValue({
      success: true,
      data: {
        authorizedPrograms: [
          { code: "BSIT", id: "program-1", name: "BS Information Technology" },
          { code: "BSED", id: "program-2", name: "Bachelor of Secondary Education" },
        ],
        selectedProgram: { code: "BSED", id: "program-2", name: "Bachelor of Secondary Education" },
        userId: "head-1",
      },
    });
    revalidateProgramHeadAssignmentMock.mockResolvedValue(null);

    await expect(
      lateIncludeCourseBoundEvaluationStudent({
        evaluationId: "evaluation-1",
        membershipId: "membership-1",
        programId: "program-2",
        reversalCategory: "EXCLUDED_IN_ERROR",
      })
    ).resolves.toEqual({ error: "Course assignment not found.", success: false });

    expect(revalidateProgramHeadAssignmentMock).toHaveBeenCalledWith(expect.any(Object), {
      programId: "program-2",
      userId: "head-1",
    });
    expect(evaluationAssignmentCreateMock).not.toHaveBeenCalled();
  });
});
