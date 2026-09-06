import { beforeEach, describe, expect, it, vi } from "vitest";

import { ROLES } from "@/lib/constants/roles";
import { getCourseBoundResponseReview } from "@/features/analytics/services/get-course-bound-response-review";
import { getProgramHeadResponseDetail } from "@/features/response-review/services/get-program-head-response-detail";
import { getProgramHeadFeedback } from "@/features/analytics/services/get-program-head-analytics";

const {
  responseFindFirstMock,
  responseCountMock,
  evaluationAssignmentCountMock,
  qualitativeResponseItemFindManyMock,
  ciloMappingFindManyMock,
  studentEnrollmentFindManyMock,
  resolveAuthSessionMock,
  resolveProgramHeadContextMock,
  resolveReviewerProgramScopeMock,
  courseBoundEvaluationFindManyMock,
  academicTermInstanceFindManyMock,
} = vi.hoisted(() => ({
  responseFindFirstMock: vi.fn(),
  responseCountMock: vi.fn(),
  evaluationAssignmentCountMock: vi.fn(),
  qualitativeResponseItemFindManyMock: vi.fn(),
  ciloMappingFindManyMock: vi.fn(),
  studentEnrollmentFindManyMock: vi.fn(),
  resolveAuthSessionMock: vi.fn(),
  resolveProgramHeadContextMock: vi.fn(),
  resolveReviewerProgramScopeMock: vi.fn(),
  courseBoundEvaluationFindManyMock: vi.fn(),
  academicTermInstanceFindManyMock: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    response: {
      findFirst: responseFindFirstMock,
      count: responseCountMock,
    },
    evaluationAssignment: {
      count: evaluationAssignmentCountMock,
    },
    qualitativeResponseItem: {
      findMany: qualitativeResponseItemFindManyMock,
    },
    ciloMapping: {
      findMany: ciloMappingFindManyMock,
    },
    studentEnrollment: {
      findMany: studentEnrollmentFindManyMock,
    },
    courseBoundEvaluation: {
      findMany: courseBoundEvaluationFindManyMock,
    },
    academicTermInstance: {
      findMany: academicTermInstanceFindManyMock,
    },
  },
}));

vi.mock("@/features/auth/services/resolve-auth-session", () => ({
  resolveAuthSession: resolveAuthSessionMock,
}));

vi.mock("@/features/auth/services/resolve-program-head-context", () => ({
  resolveProgramHeadContext: resolveProgramHeadContextMock,
}));

vi.mock("@/features/academic-structure/services/resolve-reviewer-program-scope", () => ({
  resolveReviewerProgramScope: resolveReviewerProgramScopeMock,
}));

const MOCK_STRUCTURE_SNAPSHOT = [
  {
    key: "teaching",
    title: "Teaching",
    items: [
      { key: "clarity", kind: "quantitative", prompt: "Clarity", scale: [1, 2, 3, 4, 5] },
      { key: "remarks", kind: "qualitative", prompt: "Remarks" },
    ],
  },
];

const MOCK_COURSE_BOUND_RESPONSE = {
  id: "response-548",
  submitted_at: new Date("2026-01-04T08:00:00.000Z"),
  respondent: { id: "student-user-1", name: "Demo Student" },
  assignment: {
    course_bound: {
      id: "eval-it201",
      deployment_name: "IT201 Post-Term CILO Evaluation",
      instrument: {
        structure_snapshot: MOCK_STRUCTURE_SNAPSHOT,
        template: { name: "IT201 Template" },
      },
      course_assignment: {
        faculty: { name: "Demo Faculty" },
        course: { code: "IT201", title: "Systems Analysis", major: null },
        program: {
          id: "prog-bsit",
          code: "BSIT",
          name: "Bachelor of Science in Information Technology",
        },
        term_instance: {
          id: "term-2025-2",
          semester: "SECOND",
          term: "FIRST_TERM",
          school_year: { code: "2025-2026" },
        },
      },
      cilo_question_bindings: [],
    },
    central_deployment: null,
  },
  quant_items: [{ section_key: "teaching", item_key: "clarity", rating_value: 5 }],
  qual_items: [
    {
      section_key: "teaching",
      prompt_key: "remarks",
      text_content: "The hands-on coding exercises were very effective in solidifying CILO 1.",
    },
  ],
};

describe("Cross-role response privacy service layer (§36, §37, §38, #548)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Faculty aggregate-only review boundary", () => {
    it("denies individual response reads before querying response content", async () => {
      resolveAuthSessionMock.mockResolvedValue({
        activeRole: ROLES.FACULTY,
        roles: [ROLES.FACULTY],
        userId: "fac-bsit",
      });

      await expect(getCourseBoundResponseReview("response-548")).resolves.toBeNull();
      expect(resolveReviewerProgramScopeMock).not.toHaveBeenCalled();
      expect(responseFindFirstMock).not.toHaveBeenCalled();
    });
  });

  describe("Program Head identified review scoping", () => {
    it("returns identified response detail inside authorized Program context", async () => {
      resolveAuthSessionMock.mockResolvedValue({
        activeRole: ROLES.PROGRAM_HEAD,
        roles: [ROLES.PROGRAM_HEAD],
        userId: "ph-bsit-id",
      });
      resolveProgramHeadContextMock.mockResolvedValue({
        success: true,
        data: {
          userId: "ph-bsit-id",
          selectedProgram: { id: "prog-bsit", code: "BSIT", name: "Information Technology" },
          authorizedPrograms: [],
        },
      });
      responseFindFirstMock.mockResolvedValue(MOCK_COURSE_BOUND_RESPONSE);
      studentEnrollmentFindManyMock.mockResolvedValue([
        {
          student_user_id: "student-user-1",
          program_id: "prog-bsit",
          program: { name: "BSIT" },
          major_id: null,
          major: null,
          year_level: "SECOND_YEAR",
          section: "MORNING",
        },
      ]);

      const detail = await getProgramHeadResponseDetail("prog-bsit", "response-548");

      expect(detail).not.toBeNull();
      expect(detail!.respondent.name).toBe("Demo Student");
      expect(detail!.respondent.id).toBe("student-user-1");
      expect(detail!.respondent.studentContext).toBeDefined();
      expect(detail!.respondent.studentContext?.yearLevel).toBe("SECOND_YEAR");
      expect(detail!.evaluation.title).toBe("IT201 Post-Term CILO Evaluation");

      expect(responseFindFirstMock).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: "response-548",
            status: "SUBMITTED",
            assignment: {
              OR: [
                { course_bound: { course_assignment: { program_id: "prog-bsit" } } },
                { central_deployment: { program_id: "prog-bsit" } },
              ],
            },
          }),
        })
      );
    });

    it("denies cross-Program access: Program Head from BEED cannot read BSIT response", async () => {
      resolveAuthSessionMock.mockResolvedValue({
        activeRole: ROLES.PROGRAM_HEAD,
        roles: [ROLES.PROGRAM_HEAD],
        userId: "ph-beed-id",
      });
      // BEED Program Head attempting to access BSIT programId fails context resolution
      resolveProgramHeadContextMock.mockResolvedValue({
        success: false,
        error: "Forbidden",
      });

      const detail = await getProgramHeadResponseDetail("prog-bsit", "response-548");

      expect(detail).toBeNull();
      expect(responseFindFirstMock).not.toHaveBeenCalled();
    });

    it("denies access to guessed deep link or response belonging to another program with safe null", async () => {
      resolveAuthSessionMock.mockResolvedValue({
        activeRole: ROLES.PROGRAM_HEAD,
        roles: [ROLES.PROGRAM_HEAD],
        userId: "ph-beed-id",
      });
      resolveProgramHeadContextMock.mockResolvedValue({
        success: true,
        data: {
          userId: "ph-beed-id",
          selectedProgram: { id: "prog-beed", code: "BEED", name: "Elementary Education" },
          authorizedPrograms: [],
        },
      });
      // Passing BSIT response-548 to BEED scope: query matches nothing
      responseFindFirstMock.mockResolvedValue(null);

      const detail = await getProgramHeadResponseDetail("prog-beed", "response-548");

      expect(detail).toBeNull();
      expect(responseFindFirstMock).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: "response-548",
            status: "SUBMITTED",
            assignment: {
              OR: [
                { course_bound: { course_assignment: { program_id: "prog-beed" } } },
                { central_deployment: { program_id: "prog-beed" } },
              ],
            },
          }),
        })
      );
    });

    it("denies non-Program Head roles calling identified response detail", async () => {
      resolveAuthSessionMock.mockResolvedValue({
        activeRole: ROLES.FACULTY,
        roles: [ROLES.FACULTY],
        userId: "fac-bsit",
      });

      const detail = await getProgramHeadResponseDetail("prog-bsit", "response-548");

      expect(detail).toBeNull();
      expect(responseFindFirstMock).not.toHaveBeenCalled();
    });
  });

  describe("Analytics aggregate-only de-identification", () => {
    it("redacts email and names from qualitative tokens and provides aggregate counts", async () => {
      resolveAuthSessionMock.mockResolvedValue({
        activeRole: ROLES.PROGRAM_HEAD,
        roles: [ROLES.PROGRAM_HEAD],
        userId: "ph-bsit-id",
      });
      resolveProgramHeadContextMock.mockResolvedValue({
        success: true,
        data: {
          userId: "ph-bsit-id",
          selectedProgram: { id: "prog-bsit", code: "BSIT", name: "Information Technology" },
          authorizedPrograms: [],
        },
      });
      academicTermInstanceFindManyMock.mockResolvedValue([]);
      evaluationAssignmentCountMock.mockResolvedValue(10);
      responseCountMock.mockResolvedValue(5);
      qualitativeResponseItemFindManyMock.mockResolvedValue([
        {
          text_content:
            "Student student-548@cloie.test said Professor Maria Santos had great teaching.",
          section_key: "teaching",
          prompt_key: "remarks",
          response: {
            id: "resp-1",
            assignment: {
              course_bound: {
                id: "eval-1",
                deployment_name: "IT201 Eval",
                instrument: { id: "inst-1", structure_snapshot: MOCK_STRUCTURE_SNAPSHOT },
              },
              central_deployment: null,
            },
          },
        },
      ]);
      const feedback = await getProgramHeadFeedback("prog-bsit", {
        tab: "qualitative",
        termInstanceId: undefined,
        schoolYearId: undefined,
        semester: undefined,
        evidenceSource: undefined,
        stakeholder: undefined,
      });
      expect(feedback).not.toBeNull();
      expect(feedback!.qualitativeItemCount).toBe(1);
      expect(feedback!.qualitativeResponseCount).toBe(1);

      const serialized = JSON.stringify(feedback);
      // Email redacted
      expect(serialized).not.toContain("student-548@cloie.test");
      // Explicit person names removed
      expect(serialized).not.toContain("Maria Santos");
      // Raw string not leaked verbatim
      expect(serialized).not.toContain(
        "Student student-548@cloie.test said Professor Maria Santos had great teaching."
      );
    });
  });
});
