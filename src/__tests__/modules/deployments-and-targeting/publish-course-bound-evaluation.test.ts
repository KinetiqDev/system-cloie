import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";
import { publishCourseBoundEvaluation } from "@/features/evaluations/services/publish-course-bound-evaluation";
import { ROLES } from "@/lib/constants/roles";
import { createPrismaUniqueConstraintError } from "@/__tests__/helpers/prisma-test-helpers";

const {
  assignmentCreateManyMock,
  bindingCreateManyMock,
  courseBoundEvaluationCreateMock,
  courseAssignmentFindUniqueMock,
  courseAssignmentMembershipFindManyMock,
  exclusionCreateManyMock,
  getFacultyTemplatePublicationContextMock,
  instrumentVersionFindFirstMock,
  instrumentTemplateFindFirstMock,
  lockCourseAssignmentMock,
  programHeadAssignmentFindManyMock,
  revalidateProgramHeadAssignmentMock,
  ciloFindManyMock,
  resolveAuthSessionMock,
  resolveProgramHeadContextMock,
  targetCreateManyMock,
  transactionMock,
} = vi.hoisted(() => ({
  assignmentCreateManyMock: vi.fn(),
  bindingCreateManyMock: vi.fn(),
  courseBoundEvaluationCreateMock: vi.fn(),
  courseAssignmentFindUniqueMock: vi.fn(),
  courseAssignmentMembershipFindManyMock: vi.fn(),
  exclusionCreateManyMock: vi.fn(),
  getFacultyTemplatePublicationContextMock: vi.fn(),
  instrumentVersionFindFirstMock: vi.fn(),
  instrumentTemplateFindFirstMock: vi.fn(),
  lockCourseAssignmentMock: vi.fn(),
  programHeadAssignmentFindManyMock: vi.fn(),
  revalidateProgramHeadAssignmentMock: vi.fn(),
  ciloFindManyMock: vi.fn(),
  resolveAuthSessionMock: vi.fn(),
  resolveProgramHeadContextMock: vi.fn(),
  targetCreateManyMock: vi.fn(),
  transactionMock: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    $transaction: transactionMock,
    courseAssignment: {
      findUnique: courseAssignmentFindUniqueMock,
      findFirst: courseAssignmentFindUniqueMock,
    },
    courseAssignmentMembership: { findMany: courseAssignmentMembershipFindManyMock },
    instrumentVersion: {
      findFirst: instrumentVersionFindFirstMock,
    },
    instrumentTemplate: {
      findFirst: instrumentTemplateFindFirstMock,
    },
    programHeadAssignment: {
      findMany: programHeadAssignmentFindManyMock,
    },
    cILO: {
      findMany: ciloFindManyMock,
    },
  },
}));

vi.mock("@/features/auth/services/resolve-auth-session", () => ({
  resolveAuthSession: resolveAuthSessionMock,
}));

vi.mock("@/features/auth/services/resolve-program-head-context", () => ({
  revalidateProgramHeadAssignment: revalidateProgramHeadAssignmentMock,
  resolveProgramHeadContext: resolveProgramHeadContextMock,
}));

vi.mock("@/features/instruments/services/manage-faculty-templates", () => ({
  getFacultyTemplatePublicationContext: getFacultyTemplatePublicationContextMock,
}));

const MOCK_ASSIGNMENT = {
  id: "assignment-1",
  course_id: "course-1",
  faculty_id: "faculty-1",
  is_active: true,
  major_id: null,
  program_id: "program-1",
  section: null,
  term_instance_id: "term-instance-1",
  year_level: "FOURTH_YEAR",
  course: {
    code: "IT-401",
    id: "course-1",
    major_id: null,
    major: null,
    title: "Capstone 1",
    course_scope: "PROGRAM_SPECIFIC",
  },
  program: { code: "BSIT", id: "program-1", name: "BS Information Technology" },
  term_instance: {
    id: "term-instance-1",
    semester: "FIRST",
    term: null,
    status: "ACTIVE",
    school_year: { code: "2025-2026" },
  },
  course_bound_evaluations: [],
};

const MOCK_PUBLICATION_CONTEXT = {
  success: true as const,
  data: {
    bindings: [
      {
        ciloDescriptionSnapshot: "Apply capstone planning fundamentals.",
        ciloId: "cilo-1",
        itemKey: "q1",
        questionPromptSnapshot: "I achieved outcome one.",
        sectionKey: "outcomes",
      },
      {
        ciloDescriptionSnapshot: "Produce a proposal-aligned outline defense artifact.",
        ciloId: "cilo-2",
        itemKey: "q2",
        questionPromptSnapshot: "I achieved outcome two.",
        sectionKey: "outcomes",
      },
    ],
    cilos: [
      { description: "Apply capstone planning fundamentals.", id: "cilo-1" },
      { description: "Produce a proposal-aligned outline defense artifact.", id: "cilo-2" },
    ],
    course: {
      code: "IT-401",
      courseType: "PROGRAM_SPECIFIC",
      id: "course-1",
      majorId: null,
      majorName: null,
      programCode: "BSIT",
      programId: "program-1",
      programName: "Bachelor of Science in Information Technology",
      scopeLabel: "BSIT - Shared Program Course",
      title: "Capstone 1",
    },
    majorId: null,
    programId: "program-1",
    template: { id: "template-1", name: "Course-Bound CILO Evaluation", structure: [] },
  },
};

const MOCK_BOUND_TEMPLATE = {
  id: "bound-template-1",
  bound_course_id: "course-1",
  bound_course: {
    id: "course-1",
    code: "IT-401",
    title: "Capstone 1",
    course_scope: "PROGRAM_SPECIFIC",
    program_id: "program-1",
  },
  template_cilo_question_bindings: [
    {
      cilo_id: "cilo-1",
      section_key: "outcomes",
      item_key: "q1",
    },
    {
      cilo_id: "cilo-2",
      section_key: "outcomes",
      item_key: "q2",
    },
  ],
  structure: [
    {
      key: "outcomes",
      questions: [
        {
          key: "q1",
          question_type: "LIKERT",
          prompt: "I achieved outcome one.",
        },
        {
          key: "q2",
          question_type: "LIKERT",
          prompt: "I achieved outcome two.",
        },
      ],
    },
  ],
};

describe("publishCourseBoundEvaluation", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    transactionMock.mockImplementation(async (callback) =>
      callback({
        $queryRaw: lockCourseAssignmentMock,
        courseBoundEvaluation: { create: courseBoundEvaluationCreateMock },
        courseBoundCiloQuestionBinding: { createMany: bindingCreateManyMock },
        courseBoundEvaluationTarget: { createMany: targetCreateManyMock },
        courseBoundEvaluationExclusion: { createMany: exclusionCreateManyMock },
        courseAssignment: { findUnique: courseAssignmentFindUniqueMock },
        courseAssignmentMembership: { findMany: courseAssignmentMembershipFindManyMock },
        instrumentTemplate: { findFirst: instrumentTemplateFindFirstMock },
        instrumentVersion: { findFirst: instrumentVersionFindFirstMock },
        programHeadAssignment: { findMany: programHeadAssignmentFindManyMock },
        cILO: { findMany: ciloFindManyMock },
        evaluationAssignment: { createMany: assignmentCreateManyMock },
      })
    );

    // Default mocks for on-behalf template lookup
    instrumentTemplateFindFirstMock.mockResolvedValue({
      id: "bound-template-1",
      bound_course_id: "course-1",
      bound_course: {
        id: "course-1",
        code: "IT-401",
        title: "Capstone 1",
        course_scope: "PROGRAM_SPECIFIC",
        program_id: "program-1",
      },
      template_cilo_question_bindings: [
        {
          cilo_id: "cilo-1",
          section_key: "outcomes",
          item_key: "q1",
        },
        {
          cilo_id: "cilo-2",
          section_key: "outcomes",
          item_key: "q2",
        },
      ],
      structure: [
        {
          key: "outcomes",
          questions: [
            {
              key: "q1",
              question_type: "LIKERT",
              prompt: "I achieved outcome one.",
            },
            {
              key: "q2",
              question_type: "LIKERT",
              prompt: "I achieved outcome two.",
            },
          ],
        },
      ],
    });

    ciloFindManyMock.mockResolvedValue([
      { description: "Apply capstone planning fundamentals.", id: "cilo-1" },
      { description: "Produce a proposal-aligned outline defense artifact.", id: "cilo-2" },
    ]);

    programHeadAssignmentFindManyMock.mockResolvedValue([{ program_id: "program-1" }]);
    revalidateProgramHeadAssignmentMock.mockResolvedValue({
      code: "BSIT",
      id: "program-1",
      name: "BS Information Technology",
    });
    courseAssignmentMembershipFindManyMock.mockResolvedValue([
      { id: "membership-1", student_user_id: "student-1" },
      { id: "membership-2", student_user_id: "student-2" },
    ]);
  });

  it("rejects publication when no user is signed in", async () => {
    resolveAuthSessionMock.mockResolvedValue(null);

    await expect(
      publishCourseBoundEvaluation({
        assignmentId: "assignment-1",
        deploymentName: "Capstone CILO Evaluation",
        templateId: "template-1",
      })
    ).resolves.toEqual({
      error: "Authentication required.",
      success: false,
    });
  });

  it("does not publish for an inactive faculty owner during the locked recheck", async () => {
    resolveAuthSessionMock.mockResolvedValue({
      activeRole: ROLES.FACULTY,
      profileGate: { status: "INACTIVE" },
      roles: [ROLES.FACULTY],
      userId: "faculty-1",
    });
    courseAssignmentFindUniqueMock.mockResolvedValue(MOCK_ASSIGNMENT);
    transactionMock.mockImplementationOnce(async (callback) =>
      callback({
        $queryRaw: vi.fn(),
        courseAssignment: { findUnique: courseAssignmentFindUniqueMock },
        programHeadAssignment: { findMany: programHeadAssignmentFindManyMock },
      })
    );

    await expect(
      publishCourseBoundEvaluation({
        assignmentId: "assignment-1",
        deploymentName: "Inactive Faculty Evaluation",
        templateId: "template-1",
      })
    ).resolves.toEqual({
      error: "Course assignment not found.",
      success: false,
    });
    expect(courseBoundEvaluationCreateMock).not.toHaveBeenCalled();
  });

  it("publishes a course-bound evaluation from the saved faculty template context", async () => {
    resolveAuthSessionMock.mockResolvedValue({
      activeRole: ROLES.FACULTY,
      profileGate: { status: "COMPLETE" },
      roles: [ROLES.FACULTY],
      userId: "faculty-1",
    });
    courseAssignmentFindUniqueMock.mockResolvedValue({
      ...MOCK_ASSIGNMENT,
      curriculumCourse: null,
    });
    getFacultyTemplatePublicationContextMock.mockResolvedValue(MOCK_PUBLICATION_CONTEXT);
    instrumentVersionFindFirstMock.mockResolvedValue({ id: "version-1" });
    courseBoundEvaluationCreateMock.mockResolvedValue({ id: "evaluation-1" });

    await expect(
      publishCourseBoundEvaluation({
        assignmentId: "assignment-1",
        activationAt: null,
        deadlineAt: new Date("2026-05-30T00:00:00.000Z"),
        deploymentName: "Capstone CILO Evaluation",
        templateId: "template-1",
      })
    ).resolves.toEqual({
      success: true,
      data: {
        assignmentCount: 2,
        evaluationId: "evaluation-1",
        status: "ACTIVE",
        targetCount: 1,
      },
    });

    expect(courseAssignmentFindUniqueMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "assignment-1" } })
    );
    const [lockSql, lockedAssignmentId] = lockCourseAssignmentMock.mock.calls[0] ?? [];
    expect(lockSql?.[0]).toContain("WHERE id = ");
    expect(lockSql?.[1]).toMatch(/^::uuid/);
    expect(lockedAssignmentId).toBe("assignment-1");
    expect(getFacultyTemplatePublicationContextMock).toHaveBeenCalledWith(
      "template-1",
      expect.objectContaining({ facultyId: "faculty-1" })
    );
    expect(courseBoundEvaluationCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        course_assignment_id: "assignment-1",
        term_instance_id: "term-instance-1",
        deployed_by: "faculty-1",
        deployment_name: "Capstone CILO Evaluation",
        instrument_version_id: "version-1",
      }),
    });
    expect(courseBoundEvaluationCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        course_info_snapshot: {
          courseCode: "IT-401",
          courseScope: "PROGRAM_SPECIFIC",
          courseTitle: "Capstone 1",
          majorName: null,
          programCode: "BSIT",
          programName: "BS Information Technology",
        },
      }),
    });
    expect(bindingCreateManyMock).toHaveBeenCalledWith({
      data: [
        {
          cilo_description_snapshot: "Apply capstone planning fundamentals.",
          cilo_id: "cilo-1",
          course_bound_evaluation_id: "evaluation-1",
          item_key: "q1",
          question_prompt_snapshot: "I achieved outcome one.",
          section_key: "outcomes",
        },
        {
          cilo_description_snapshot: "Produce a proposal-aligned outline defense artifact.",
          cilo_id: "cilo-2",
          course_bound_evaluation_id: "evaluation-1",
          item_key: "q2",
          question_prompt_snapshot: "I achieved outcome two.",
          section_key: "outcomes",
        },
      ],
    });
    expect(courseAssignmentMembershipFindManyMock).toHaveBeenCalledWith({
      where: { course_assignment_id: "assignment-1", is_active: true },
      select: { id: true, student_user_id: true },
    });
    expect(transactionMock).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
    expect(assignmentCreateManyMock).toHaveBeenCalledWith({
      data: [
        { course_bound_id: "evaluation-1", respondent_id: "student-1" },
        { course_bound_id: "evaluation-1", respondent_id: "student-2" },
      ],
    });
  });

  it("captures curriculum version and course in the snapshot when the assignment is linked", async () => {
    resolveAuthSessionMock.mockResolvedValue({
      activeRole: ROLES.FACULTY,
      profileGate: { status: "COMPLETE" },
      roles: [ROLES.FACULTY],
      userId: "faculty-1",
    });
    courseAssignmentFindUniqueMock.mockResolvedValue({
      ...MOCK_ASSIGNMENT,
      curriculumCourse: {
        id: "curriculum-course-1",
        curriculum_version_id: "curriculum-version-1",
      },
    });
    getFacultyTemplatePublicationContextMock.mockResolvedValue(MOCK_PUBLICATION_CONTEXT);
    instrumentVersionFindFirstMock.mockResolvedValue({ id: "version-1" });
    courseBoundEvaluationCreateMock.mockResolvedValue({ id: "evaluation-1" });

    await publishCourseBoundEvaluation({
      assignmentId: "assignment-1",
      deploymentName: "Linked Curriculum Evaluation",
      templateId: "template-1",
    });

    expect(courseBoundEvaluationCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        course_info_snapshot: {
          courseCode: "IT-401",
          courseScope: "PROGRAM_SPECIFIC",
          courseTitle: "Capstone 1",
          curriculumCourseId: "curriculum-course-1",
          curriculumVersionId: "curriculum-version-1",
          majorName: null,
          programCode: "BSIT",
          programName: "BS Information Technology",
        },
      }),
    });
  });

  it("retries serializable publication after a transaction conflict", async () => {
    resolveAuthSessionMock.mockResolvedValue({
      activeRole: ROLES.FACULTY,
      profileGate: { status: "COMPLETE" },
      roles: [ROLES.FACULTY],
      userId: "faculty-1",
    });
    courseAssignmentFindUniqueMock.mockResolvedValue(MOCK_ASSIGNMENT);
    getFacultyTemplatePublicationContextMock.mockResolvedValue(MOCK_PUBLICATION_CONTEXT);
    instrumentVersionFindFirstMock.mockResolvedValue({ id: "version-1" });
    courseBoundEvaluationCreateMock.mockResolvedValue({ id: "evaluation-1" });
    transactionMock.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("serialization conflict", {
        code: "P2034",
        clientVersion: "test",
      })
    );

    await expect(
      publishCourseBoundEvaluation({
        assignmentId: "assignment-1",
        deploymentName: "Retry Evaluation",
        templateId: "template-1",
      })
    ).resolves.toMatchObject({ success: true });

    expect(transactionMock).toHaveBeenCalledTimes(2);
    expect(transactionMock).toHaveBeenLastCalledWith(expect.any(Function), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  });

  it("surfaces saved template validation failures", async () => {
    resolveAuthSessionMock.mockResolvedValue({
      activeRole: ROLES.FACULTY,
      profileGate: { status: "COMPLETE" },
      roles: [ROLES.FACULTY],
      userId: "faculty-1",
    });
    courseAssignmentFindUniqueMock.mockResolvedValue(MOCK_ASSIGNMENT);
    getFacultyTemplatePublicationContextMock.mockResolvedValue({
      error: "Every saved CILO must be assigned to one Likert question before publishing.",
      success: false,
    });

    await expect(
      publishCourseBoundEvaluation({
        assignmentId: "assignment-1",
        deploymentName: "Capstone CILO Evaluation",
        templateId: "template-1",
      })
    ).resolves.toEqual({
      error: "Every saved CILO must be assigned to one Likert question before publishing.",
      success: false,
    });
  });

  it("rejects an empty final audience without creating an evaluation", async () => {
    resolveAuthSessionMock.mockResolvedValue({
      activeRole: ROLES.FACULTY,
      profileGate: { status: "COMPLETE" },
      roles: [ROLES.FACULTY],
      userId: "faculty-1",
    });
    courseAssignmentFindUniqueMock.mockResolvedValue(MOCK_ASSIGNMENT);
    getFacultyTemplatePublicationContextMock.mockResolvedValue(MOCK_PUBLICATION_CONTEXT);
    instrumentVersionFindFirstMock.mockResolvedValue({ id: "version-1" });

    await expect(
      publishCourseBoundEvaluation({
        assignmentId: "assignment-1",
        deploymentName: "Empty Roster Evaluation",
        exclusions: [
          { category: "ADMINISTRATIVE_EXCEPTION", membershipId: "membership-1" },
          { category: "ADMINISTRATIVE_EXCEPTION", membershipId: "membership-2" },
        ],
        templateId: "template-1",
      })
    ).resolves.toEqual({
      error: "At least one roster member must receive this evaluation.",
      success: false,
    });
    expect(courseBoundEvaluationCreateMock).not.toHaveBeenCalled();
  });

  it("records exclusions and still assigns every other active membership", async () => {
    resolveAuthSessionMock.mockResolvedValue({
      activeRole: ROLES.FACULTY,
      profileGate: { status: "COMPLETE" },
      roles: [ROLES.FACULTY],
      userId: "faculty-1",
    });
    courseAssignmentFindUniqueMock.mockResolvedValue(MOCK_ASSIGNMENT);
    getFacultyTemplatePublicationContextMock.mockResolvedValue(MOCK_PUBLICATION_CONTEXT);
    instrumentVersionFindFirstMock.mockResolvedValue({ id: "version-1" });
    courseBoundEvaluationCreateMock.mockResolvedValue({ id: "evaluation-1" });

    await expect(
      publishCourseBoundEvaluation({
        assignmentId: "assignment-1",
        deploymentName: "Excluded Roster Evaluation",
        exclusions: [
          {
            category: "OTHER",
            membershipId: "membership-1",
            otherExplanation: "Not taking assessment",
          },
        ],
        templateId: "template-1",
      })
    ).resolves.toMatchObject({ success: true, data: { assignmentCount: 1 } });

    expect(exclusionCreateManyMock).toHaveBeenCalledWith({
      data: [
        {
          category: "OTHER",
          course_assignment_id: "assignment-1",
          course_assignment_membership_id: "membership-1",
          course_bound_evaluation_id: "evaluation-1",
          excluded_by: "faculty-1",
          other_explanation: "Not taking assessment",
        },
      ],
    });
    expect(assignmentCreateManyMock).toHaveBeenCalledWith({
      data: [{ course_bound_id: "evaluation-1", respondent_id: "student-2" }],
    });
  });

  it("maps duplicate course-context publishes to a user-facing error", async () => {
    resolveAuthSessionMock.mockResolvedValue({
      activeRole: ROLES.FACULTY,
      roles: [ROLES.FACULTY],
      userId: "faculty-1",
    });
    courseAssignmentFindUniqueMock.mockResolvedValue(MOCK_ASSIGNMENT);
    getFacultyTemplatePublicationContextMock.mockResolvedValue(MOCK_PUBLICATION_CONTEXT);
    instrumentVersionFindFirstMock.mockResolvedValue({ id: "version-1" });
    transactionMock.mockRejectedValue(createPrismaUniqueConstraintError());

    await expect(
      publishCourseBoundEvaluation({
        assignmentId: "assignment-1",
        deploymentName: "Capstone CILO Evaluation",
        templateId: "template-1",
      })
    ).resolves.toEqual({
      error: expect.stringContaining("already has a deployed evaluation"),
      success: false,
    });
  });

  describe("Issue #43: On-behalf deployment", () => {
    it("stores deployed_by as deployer (not faculty_id) for on-behalf deployment by Program Head", async () => {
      const phUserId = "ph-user-1";
      resolveAuthSessionMock.mockResolvedValue({
        activeRole: ROLES.PROGRAM_HEAD,
        profileGate: { status: "COMPLETE" },
        roles: [ROLES.PROGRAM_HEAD],
        userId: phUserId,
      });
      resolveProgramHeadContextMock.mockResolvedValue({
        success: true,
        data: {
          authorizedPrograms: [
            { code: "BSIT", id: "program-1", name: "BS Information Technology" },
          ],
          selectedProgram: { code: "BSIT", id: "program-1", name: "BS Information Technology" },
          userId: phUserId,
        },
      });
      programHeadAssignmentFindManyMock.mockResolvedValue([{ program_id: "program-1" }]);
      courseAssignmentFindUniqueMock.mockResolvedValue(MOCK_ASSIGNMENT);
      instrumentTemplateFindFirstMock.mockResolvedValue(MOCK_BOUND_TEMPLATE);
      getFacultyTemplatePublicationContextMock.mockResolvedValue(MOCK_PUBLICATION_CONTEXT);
      instrumentVersionFindFirstMock.mockResolvedValue({ id: "version-1" });
      courseBoundEvaluationCreateMock.mockResolvedValue({ id: "evaluation-1" });

      await publishCourseBoundEvaluation({
        assignmentId: "assignment-1",
        deploymentName: "PH On-Behalf Evaluation",
        programId: "program-1",
        templateId: "bound-template-1",
      });

      expect(courseBoundEvaluationCreateMock).toHaveBeenCalledWith({
        data: expect.objectContaining({
          course_assignment_id: "assignment-1",
          deployed_by: phUserId,
          deployment_name: "PH On-Behalf Evaluation",
        }),
      });
    });

    it("rejects on-behalf deployment when course has no bound template", async () => {
      const deanUserId = "dean-user-1";
      resolveAuthSessionMock.mockResolvedValue({
        activeRole: ROLES.DEAN,
        profileGate: { status: "COMPLETE" },
        roles: [ROLES.FACULTY, ROLES.DEAN],
        userId: deanUserId,
      });
      courseAssignmentFindUniqueMock.mockResolvedValue(MOCK_ASSIGNMENT);
      instrumentTemplateFindFirstMock.mockResolvedValue(null);

      await expect(
        publishCourseBoundEvaluation({
          assignmentId: "assignment-1",
          deploymentName: "Dean On-Behalf Evaluation",
          templateId: "template-1",
        })
      ).resolves.toEqual({
        error: "On-behalf deployment requires a course-bound template. Please create one first.",
        success: false,
      });
    });

    it("denies faculty member from deploying another faculty's assignment", async () => {
      const otherFacultyId = "faculty-2";
      resolveAuthSessionMock.mockResolvedValue({
        activeRole: ROLES.FACULTY,
        profileGate: { status: "COMPLETE" },
        roles: [ROLES.FACULTY],
        userId: otherFacultyId,
      });
      courseAssignmentFindUniqueMock.mockResolvedValue(MOCK_ASSIGNMENT);

      await expect(
        publishCourseBoundEvaluation({
          assignmentId: "assignment-1",
          deploymentName: "Unauthorized Evaluation",
          templateId: "template-1",
        })
      ).resolves.toEqual({
        error: "Course assignment not found.",
        success: false,
      });
    });

    it("does not reveal whether an unauthorized assignment exists", async () => {
      resolveAuthSessionMock.mockResolvedValue({
        activeRole: ROLES.FACULTY,
        profileGate: { status: "COMPLETE" },
        roles: [ROLES.FACULTY],
        userId: "faculty-2",
      });
      courseAssignmentFindUniqueMock.mockResolvedValue(MOCK_ASSIGNMENT);
      const existingAssignment = await publishCourseBoundEvaluation({
        assignmentId: "assignment-1",
        deploymentName: "Unauthorized Evaluation",
        templateId: "template-1",
      });

      courseAssignmentFindUniqueMock.mockResolvedValue(null);
      const missingAssignment = await publishCourseBoundEvaluation({
        assignmentId: "assignment-2",
        deploymentName: "Unauthorized Evaluation",
        templateId: "template-1",
      });

      expect(existingAssignment).toEqual(missingAssignment);
    });

    it("allows Dean to deploy on-behalf for any assignment with bound template", async () => {
      const deanUserId = "dean-user-1";
      resolveAuthSessionMock.mockResolvedValue({
        activeRole: ROLES.DEAN,
        profileGate: { status: "COMPLETE" },
        roles: [ROLES.FACULTY, ROLES.DEAN],
        userId: deanUserId,
      });
      courseAssignmentFindUniqueMock.mockResolvedValue(MOCK_ASSIGNMENT);
      instrumentTemplateFindFirstMock.mockResolvedValue(MOCK_BOUND_TEMPLATE);
      getFacultyTemplatePublicationContextMock.mockResolvedValue(MOCK_PUBLICATION_CONTEXT);
      instrumentVersionFindFirstMock.mockResolvedValue({ id: "version-1" });
      courseBoundEvaluationCreateMock.mockResolvedValue({ id: "evaluation-1" });

      const result = await publishCourseBoundEvaluation({
        assignmentId: "assignment-1",
        deploymentName: "Dean On-Behalf Evaluation",
        templateId: "bound-template-1",
      });

      expect(result.success).toBe(true);
      expect(courseBoundEvaluationCreateMock).toHaveBeenCalledWith({
        data: expect.objectContaining({
          deployed_by: deanUserId,
        }),
      });
    });

    it("allows Dean to publish a General Education assignment with its faculty template", async () => {
      const deanUserId = "dean-user-1";
      resolveAuthSessionMock.mockResolvedValue({
        activeRole: ROLES.DEAN,
        profileGate: { status: "COMPLETE" },
        roles: [ROLES.FACULTY, ROLES.DEAN],
        userId: deanUserId,
      });
      courseAssignmentFindUniqueMock.mockResolvedValue({
        ...MOCK_ASSIGNMENT,
        course: { ...MOCK_ASSIGNMENT.course, course_scope: "GENERAL_EDUCATION" },
      });
      instrumentTemplateFindFirstMock.mockResolvedValue({
        ...MOCK_BOUND_TEMPLATE,
        bound_course: {
          ...MOCK_BOUND_TEMPLATE.bound_course,
          course_scope: "GENERAL_EDUCATION",
          program_id: null,
        },
      });
      instrumentVersionFindFirstMock.mockResolvedValue({ id: "version-1" });
      courseBoundEvaluationCreateMock.mockResolvedValue({ id: "evaluation-1" });

      await expect(
        publishCourseBoundEvaluation({
          assignmentId: "assignment-1",
          deploymentName: "Dean General Education Evaluation",
          templateId: "bound-template-1",
        })
      ).resolves.toMatchObject({ success: true });
    });

    it("uses on-behalf template behavior for a faculty-qualified account in a non-faculty active role", async () => {
      resolveAuthSessionMock.mockResolvedValue({
        activeRole: ROLES.PROGRAM_HEAD,
        profileGate: { status: "COMPLETE" },
        roles: [ROLES.FACULTY, ROLES.PROGRAM_HEAD],
        userId: "faculty-1",
      });
      programHeadAssignmentFindManyMock.mockResolvedValue([{ program_id: "program-1" }]);
      courseAssignmentFindUniqueMock.mockResolvedValue(MOCK_ASSIGNMENT);
      instrumentTemplateFindFirstMock.mockResolvedValue(MOCK_BOUND_TEMPLATE);
      instrumentVersionFindFirstMock.mockResolvedValue({ id: "version-1" });
      courseBoundEvaluationCreateMock.mockResolvedValue({ id: "evaluation-1" });

      await publishCourseBoundEvaluation({
        assignmentId: "assignment-1",
        deploymentName: "Program Head Active Role Evaluation",
        templateId: "bound-template-1",
      });

      expect(getFacultyTemplatePublicationContextMock).not.toHaveBeenCalled();
    });

    it("allows Secretary to deploy on-behalf for any assignment with bound template", async () => {
      const secretaryUserId = "secretary-user-1";
      resolveAuthSessionMock.mockResolvedValue({
        activeRole: ROLES.SECRETARY,
        profileGate: { status: "COMPLETE" },
        roles: [ROLES.FACULTY, ROLES.SECRETARY],
        userId: secretaryUserId,
      });
      courseAssignmentFindUniqueMock.mockResolvedValue(MOCK_ASSIGNMENT);
      instrumentTemplateFindFirstMock.mockResolvedValue(MOCK_BOUND_TEMPLATE);
      getFacultyTemplatePublicationContextMock.mockResolvedValue(MOCK_PUBLICATION_CONTEXT);
      instrumentVersionFindFirstMock.mockResolvedValue({ id: "version-1" });
      courseBoundEvaluationCreateMock.mockResolvedValue({ id: "evaluation-1" });

      const result = await publishCourseBoundEvaluation({
        assignmentId: "assignment-1",
        deploymentName: "Secretary On-Behalf Evaluation",
        templateId: "bound-template-1",
      });

      expect(result.success).toBe(true);
    });

    it("allows Program Head to deploy on-behalf for assignment in their program scope", async () => {
      const phUserId = "ph-user-1";
      resolveAuthSessionMock.mockResolvedValue({
        activeRole: ROLES.PROGRAM_HEAD,
        profileGate: { status: "COMPLETE" },
        roles: [ROLES.PROGRAM_HEAD],
        userId: phUserId,
      });
      resolveProgramHeadContextMock.mockResolvedValue({
        success: true,
        data: {
          authorizedPrograms: [
            { code: "BSIT", id: "program-1", name: "BS Information Technology" },
          ],
          selectedProgram: { code: "BSIT", id: "program-1", name: "BS Information Technology" },
          userId: phUserId,
        },
      });
      programHeadAssignmentFindManyMock.mockResolvedValue([{ program_id: "program-1" }]);
      courseAssignmentFindUniqueMock.mockResolvedValue(MOCK_ASSIGNMENT);
      const result = await publishCourseBoundEvaluation({
        assignmentId: "assignment-1",
        deploymentName: "PH In-Scope Evaluation",
        programId: "program-1",
        templateId: "bound-template-1",
      });

      expect(result.success).toBe(true);
    });

    it("denies on-behalf publication when the submitted template is not the assignment's bound template", async () => {
      const phUserId = "ph-user-1";
      resolveAuthSessionMock.mockResolvedValue({
        activeRole: ROLES.PROGRAM_HEAD,
        profileGate: { status: "COMPLETE" },
        roles: [ROLES.PROGRAM_HEAD],
        userId: phUserId,
      });
      resolveProgramHeadContextMock.mockResolvedValue({
        success: true,
        data: {
          authorizedPrograms: [
            { code: "BSIT", id: "program-1", name: "BS Information Technology" },
            { code: "BSED", id: "program-2", name: "Bachelor of Secondary Education" },
          ],
          selectedProgram: {
            code: "BSIT",
            id: "program-1",
            name: "BS Information Technology",
          },
          userId: phUserId,
        },
      });
      revalidateProgramHeadAssignmentMock.mockResolvedValue({
        code: "BSIT",
        id: "program-1",
        name: "BS Information Technology",
      });
      courseAssignmentFindUniqueMock.mockResolvedValue(MOCK_ASSIGNMENT);
      instrumentTemplateFindFirstMock.mockResolvedValue(MOCK_BOUND_TEMPLATE);

      await expect(
        publishCourseBoundEvaluation({
          assignmentId: "assignment-1",
          deploymentName: "Cross-Program Template Evaluation",
          programId: "program-1",
          templateId: "template-1",
        })
      ).resolves.toEqual({
        error: "Course assignment not found.",
        success: false,
      });

      expect(courseBoundEvaluationCreateMock).not.toHaveBeenCalled();
    });

    it("rejects an assignment from another selected Program", async () => {
      const phUserId = "ph-user-1";
      resolveAuthSessionMock.mockResolvedValue({
        activeRole: ROLES.PROGRAM_HEAD,
        profileGate: { status: "COMPLETE" },
        roles: [ROLES.PROGRAM_HEAD],
        userId: phUserId,
      });
      resolveProgramHeadContextMock.mockResolvedValue({
        success: true,
        data: {
          authorizedPrograms: [
            { code: "BSIT", id: "program-1", name: "BS Information Technology" },
            { code: "BSED", id: "program-2", name: "Bachelor of Secondary Education" },
          ],
          selectedProgram: {
            code: "BSED",
            id: "program-2",
            name: "Bachelor of Secondary Education",
          },
          userId: phUserId,
        },
      });
      revalidateProgramHeadAssignmentMock.mockResolvedValue({
        code: "BSED",
        id: "program-2",
        name: "Bachelor of Secondary Education",
      });
      courseAssignmentFindUniqueMock.mockResolvedValue(MOCK_ASSIGNMENT);

      await expect(
        publishCourseBoundEvaluation({
          assignmentId: "assignment-1",
          deploymentName: "Cross-Program Evaluation",
          programId: "program-2",
          templateId: "template-1",
        })
      ).resolves.toEqual({
        error: "Course assignment not found.",
        success: false,
      });

      expect(courseBoundEvaluationCreateMock).not.toHaveBeenCalled();
    });

    it("revalidates the selected Program inside the publish transaction", async () => {
      const phUserId = "ph-user-1";
      resolveAuthSessionMock.mockResolvedValue({
        activeRole: ROLES.PROGRAM_HEAD,
        profileGate: { status: "COMPLETE" },
        roles: [ROLES.PROGRAM_HEAD],
        userId: phUserId,
      });
      resolveProgramHeadContextMock.mockResolvedValue({
        success: true,
        data: {
          authorizedPrograms: [
            { code: "BSIT", id: "program-1", name: "BS Information Technology" },
          ],
          selectedProgram: { code: "BSIT", id: "program-1", name: "BS Information Technology" },
          userId: phUserId,
        },
      });
      revalidateProgramHeadAssignmentMock.mockResolvedValue(null);
      courseAssignmentFindUniqueMock.mockResolvedValue(MOCK_ASSIGNMENT);

      await expect(
        publishCourseBoundEvaluation({
          assignmentId: "assignment-1",
          deploymentName: "Revoked Assignment Evaluation",
          programId: "program-1",
          templateId: "template-1",
        })
      ).resolves.toEqual({
        error: "Course assignment not found.",
        success: false,
      });

      expect(revalidateProgramHeadAssignmentMock).toHaveBeenCalledWith(expect.any(Object), {
        programId: "program-1",
        userId: phUserId,
      });
      expect(courseBoundEvaluationCreateMock).not.toHaveBeenCalled();
    });
  });
});
