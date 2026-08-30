import { beforeEach, describe, expect, it, vi } from "vitest";

import { ROLES } from "@/lib/constants/roles";
import { getProgramHeadCentralEvaluationDetail } from "@/features/response-review/services/get-program-head-central-evaluation-detail";

const {
  centralDeploymentFindFirstMock,
  evaluationAssignmentFindManyMock,
  responseFindManyMock,
  studentEnrollmentFindManyMock,
  alumniProfileFindManyMock,
  industryPartnerProfileFindManyMock,
  resolveAuthSessionMock,
  resolveProgramHeadContextMock,
} = vi.hoisted(() => ({
  centralDeploymentFindFirstMock: vi.fn(),
  evaluationAssignmentFindManyMock: vi.fn(),
  responseFindManyMock: vi.fn(),
  studentEnrollmentFindManyMock: vi.fn(),
  alumniProfileFindManyMock: vi.fn(),
  industryPartnerProfileFindManyMock: vi.fn(),
  resolveAuthSessionMock: vi.fn(),
  resolveProgramHeadContextMock: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    centralDeployment: { findFirst: centralDeploymentFindFirstMock },
    evaluationAssignment: { findMany: evaluationAssignmentFindManyMock },
    response: { findMany: responseFindManyMock },
    studentEnrollment: { findMany: studentEnrollmentFindManyMock },
    alumniProfile: { findMany: alumniProfileFindManyMock },
    industryPartnerProfile: { findMany: industryPartnerProfileFindManyMock },
  },
}));

vi.mock("@/features/auth/services/resolve-auth-session", () => ({
  resolveAuthSession: resolveAuthSessionMock,
}));

vi.mock("@/features/auth/services/resolve-program-head-context", () => ({
  resolveProgramHeadContext: resolveProgramHeadContextMock,
}));

const MOCK_DEPLOYMENT = {
  id: "central-1",
  deployment_name: "Program-wide Exit Survey",
  target_stakeholder: "STUDENT",
  year_level: "FOURTH_YEAR",
  activation_at: new Date("2026-01-01T00:00:00.000Z"),
  deadline_at: new Date("2026-01-20T00:00:00.000Z"),
  status: "ACTIVE",
  instrument: {
    version_number: 2,
    structure_snapshot: [
      {
        key: "plo-items",
        title: "PLO Attainment",
        items: [
          {
            key: "q-plo-a",
            kind: "quantitative",
            prompt: "PLO A was achieved.",
            likertDescriptors: [
              { value: 1, label: "Strongly Disagree" },
              { value: 2, label: "Disagree" },
              { value: 3, label: "Neutral" },
              { value: 4, label: "Agree" },
              { value: 5, label: "Strongly Agree" },
            ],
          },
          {
            key: "q-plo-b",
            kind: "quantitative",
            prompt: "PLO B was achieved.",
            likertDescriptors: [
              { value: 1, label: "Strongly Disagree" },
              { value: 2, label: "Disagree" },
              { value: 3, label: "Neutral" },
              { value: 4, label: "Agree" },
              { value: 5, label: "Strongly Agree" },
            ],
          },
          { key: "feedback", kind: "qualitative", prompt: "Comments" },
        ],
      },
    ],
  },
  program: { name: "BEED" },
  major: { name: "Mathematics" },
  term_instance: {
    id: "term-ti2",
    school_year: { code: "2025-2026" },
    semester: "FIRST",
    term: null,
  },
  plo_snapshots: [
    // q-plo-a → PLO-1 (snapshotted with id)
    {
      plo_id: "plo-1",
      plo_code_snapshot: "PLO-1",
      plo_description_snapshot: "Communicate effectively",
      section_key: "plo-items",
      item_key: "q-plo-a",
    },
    // q-plo-b → snapshot with null plo_id, keyed by code
    {
      plo_id: null,
      plo_code_snapshot: "PLO-2",
      plo_description_snapshot: "Demonstrate leadership",
      section_key: "plo-items",
      item_key: "q-plo-b",
    },
  ],
};

describe("getProgramHeadCentralEvaluationDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveAuthSessionMock.mockResolvedValue({
      activeRole: ROLES.PROGRAM_HEAD,
      roles: [ROLES.PROGRAM_HEAD],
      userId: "head-1",
    });
    resolveProgramHeadContextMock.mockResolvedValue({
      success: true,
      data: {
        userId: "head-1",
        selectedProgram: { id: "prog-beed", code: "BEED", name: "BEED" },
        authorizedPrograms: [],
      },
    });
  });

  it("returns null when the active role is not PROGRAM_HEAD", async () => {
    resolveAuthSessionMock.mockResolvedValue({
      activeRole: ROLES.DEAN,
      roles: [ROLES.DEAN],
      userId: "dean-1",
    });

    await expect(
      getProgramHeadCentralEvaluationDetail("prog-beed", "central-1")
    ).resolves.toBeNull();
    expect(centralDeploymentFindFirstMock).not.toHaveBeenCalled();
  });

  it("scopes the deployment query to the selected Program", async () => {
    centralDeploymentFindFirstMock.mockResolvedValue(MOCK_DEPLOYMENT);
    evaluationAssignmentFindManyMock.mockResolvedValue([]);
    responseFindManyMock.mockResolvedValue([]);

    await getProgramHeadCentralEvaluationDetail("prog-beed", "central-1");

    expect(centralDeploymentFindFirstMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "central-1", program_id: "prog-beed" },
      })
    );
  });

  it("groups direct PLO results by plo_id ?? plo_code_snapshot", async () => {
    centralDeploymentFindFirstMock.mockResolvedValue(MOCK_DEPLOYMENT);
    evaluationAssignmentFindManyMock.mockResolvedValue([
      {
        id: "assignment-1",
        assigned_at: new Date("2026-01-02T08:00:00.000Z"),
        respondent_id: "user-s1",
        respondent: { name: "Juan dela Cruz" },
        response: {
          id: "response-1",
          status: "SUBMITTED",
          submitted_at: new Date("2026-01-05T08:00:00.000Z"),
        },
      },
    ]);
    responseFindManyMock.mockResolvedValue([
      {
        id: "response-1",
        submitted_at: new Date("2026-01-05T08:00:00.000Z"),
        respondent_id: "user-s1",
        respondent: { name: "Juan dela Cruz" },
        quant_items: [
          {
            cilo_question_binding_id: null,
            section_key: "plo-items",
            item_key: "q-plo-a",
            rating_value: 4,
          },
          {
            cilo_question_binding_id: null,
            section_key: "plo-items",
            item_key: "q-plo-b",
            rating_value: 5,
          },
        ],
        qual_items: [],
      },
    ]);
    studentEnrollmentFindManyMock.mockResolvedValue([
      {
        student_user_id: "user-s1",
        program_id: "prog-beed",
        program: { name: "BEED" },
        major_id: null,
        major: null,
        year_level: "FOURTH_YEAR",
        section: "MORNING",
      },
    ]);

    const result = await getProgramHeadCentralEvaluationDetail("prog-beed", "central-1");

    expect(result).not.toBeNull();
    // PLO-1 from snapshotted plo_id, PLO-2 from plo_code_snapshot fallback
    expect(result!.ploResults).toHaveLength(2);
    const plo1 = result!.ploResults.find((plo) => plo.ploCode === "PLO-1");
    const plo2 = result!.ploResults.find((plo) => plo.ploCode === "PLO-2");
    expect(plo1).toBeDefined();
    expect(plo1!.mean).toBe(4);
    expect(plo2).toBeDefined();
    expect(plo2!.mean).toBe(5);
    // Question results carry the binding badges
    const questionA = result!.questionResults.find((q) => q.itemKey === "q-plo-a");
    expect(questionA!.ploBindings).toHaveLength(1);
    expect(questionA!.ploBindings[0].code).toBe("PLO-1");
    expect(questionA!.ploBindings[0].key).toBe("plo-1");
    const questionB = result!.questionResults.find((q) => q.itemKey === "q-plo-b");
    expect(questionB!.ploBindings[0].key).toBe("PLO-2");
    // Identified respondent
    expect(result!.respondents[0].name).toBe("Juan dela Cruz");
  });

  it("returns every assigned respondent while linking only submitted responses", async () => {
    centralDeploymentFindFirstMock.mockResolvedValue(MOCK_DEPLOYMENT);
    evaluationAssignmentFindManyMock.mockResolvedValue([
      {
        id: "assignment-submitted",
        assigned_at: new Date("2026-01-02T08:00:00.000Z"),
        respondent_id: "user-s1",
        respondent: { name: "Juan dela Cruz" },
        response: {
          id: "response-1",
          status: "SUBMITTED",
          submitted_at: new Date("2026-01-05T08:00:00.000Z"),
        },
      },
      {
        id: "assignment-progress",
        assigned_at: new Date("2026-01-02T08:00:00.000Z"),
        respondent_id: "user-s2",
        respondent: { name: "Ana Reyes" },
        response: { id: "response-2", status: "IN_PROGRESS", submitted_at: null },
      },
      {
        id: "assignment-new",
        assigned_at: new Date("2026-01-02T08:00:00.000Z"),
        respondent_id: "user-s3",
        respondent: { name: "Leo Santos" },
        response: null,
      },
    ]);
    responseFindManyMock.mockResolvedValue([
      {
        id: "response-1",
        submitted_at: new Date("2026-01-05T08:00:00.000Z"),
        respondent_id: "user-s1",
        respondent: { name: "Juan dela Cruz" },
        quant_items: [],
        qual_items: [],
      },
    ]);
    studentEnrollmentFindManyMock.mockResolvedValue([]);

    const result = await getProgramHeadCentralEvaluationDetail("prog-beed", "central-1");

    expect(result?.respondents).toEqual([
      expect.objectContaining({
        assignmentId: "assignment-progress",
        name: "Ana Reyes",
        status: "IN_PROGRESS",
        responseId: null,
      }),
      expect.objectContaining({
        assignmentId: "assignment-submitted",
        name: "Juan dela Cruz",
        status: "SUBMITTED",
        responseId: "response-1",
      }),
      expect.objectContaining({
        assignmentId: "assignment-new",
        name: "Leo Santos",
        status: "NOT_STARTED",
        responseId: null,
      }),
    ]);
  });

  it("labels unbound central questions as General evaluation items", async () => {
    const deploymentWithoutBindings = {
      ...MOCK_DEPLOYMENT,
      plo_snapshots: [],
    };
    centralDeploymentFindFirstMock.mockResolvedValue(deploymentWithoutBindings);
    evaluationAssignmentFindManyMock.mockResolvedValue([
      {
        id: "assignment-1",
        assigned_at: new Date("2026-01-02T08:00:00.000Z"),
        respondent_id: "user-s1",
        respondent: { name: "Juan dela Cruz" },
        response: {
          id: "response-1",
          status: "SUBMITTED",
          submitted_at: new Date("2026-01-05T08:00:00.000Z"),
        },
      },
    ]);
    responseFindManyMock.mockResolvedValue([
      {
        id: "response-1",
        submitted_at: new Date("2026-01-05T08:00:00.000Z"),
        respondent_id: "user-s1",
        respondent: { name: "Juan dela Cruz" },
        quant_items: [
          {
            cilo_question_binding_id: null,
            section_key: "plo-items",
            item_key: "q-plo-a",
            rating_value: 4,
          },
        ],
        qual_items: [],
      },
    ]);

    const result = await getProgramHeadCentralEvaluationDetail("prog-beed", "central-1");

    expect(result).not.toBeNull();
    expect(result!.ploResults).toEqual([]);
    const questionA = result!.questionResults.find((q) => q.itemKey === "q-plo-a");
    expect(questionA!.ploBindings).toEqual([]);
    // buildQuestionMetrics gives GENERAL binding for unbound items
    expect(questionA!.binding.type).toBe("GENERAL");
  });

  it("returns alumni identity for alumni stakeholder deployments", async () => {
    centralDeploymentFindFirstMock.mockResolvedValue({
      ...MOCK_DEPLOYMENT,
      target_stakeholder: "ALUMNI",
      plo_snapshots: [],
    });
    evaluationAssignmentFindManyMock.mockResolvedValue([
      {
        id: "assignment-alum",
        assigned_at: new Date("2026-01-02T08:00:00.000Z"),
        respondent_id: "user-alum1",
        respondent: { name: "Maria Gomez" },
        response: {
          id: "response-alum",
          status: "SUBMITTED",
          submitted_at: new Date("2026-01-05T08:00:00.000Z"),
        },
      },
    ]);
    responseFindManyMock.mockResolvedValue([
      {
        id: "response-alum",
        submitted_at: new Date("2026-01-05T08:00:00.000Z"),
        respondent_id: "user-alum1",
        respondent: { name: "Maria Gomez" },
        quant_items: [],
        qual_items: [],
      },
    ]);
    alumniProfileFindManyMock.mockResolvedValue([
      {
        user_id: "user-alum1",
        graduation_year: 2024,
        program: { name: "BEED" },
        major: { name: "Mathematics" },
      },
    ]);

    const result = await getProgramHeadCentralEvaluationDetail("prog-beed", "central-1");

    expect(result).not.toBeNull();
    expect(result!.evaluation.stakeholder).toBe("ALUMNI");
    expect(result!.respondents[0].name).toBe("Maria Gomez");
  });

  it("never fetches IN_PROGRESS response bodies", async () => {
    centralDeploymentFindFirstMock.mockResolvedValue(MOCK_DEPLOYMENT);
    evaluationAssignmentFindManyMock.mockResolvedValue([]);
    responseFindManyMock.mockResolvedValue([]);

    await getProgramHeadCentralEvaluationDetail("prog-beed", "central-1");

    expect(responseFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: "SUBMITTED",
          assignment: { central_deployment_id: "central-1" },
        }),
      })
    );
  });
});
