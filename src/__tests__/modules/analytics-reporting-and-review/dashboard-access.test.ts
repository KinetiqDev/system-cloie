import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getFacultyDashboard,
  getFacultyDashboardMetrics,
  getFacultyDashboardVisualizations,
} from "@/features/analytics/services/get-faculty-dashboard";
import { getProgramHeadDashboard } from "@/features/analytics/services/get-program-head-dashboard";
import { ROLES } from "@/lib/constants/roles";

const {
  resolveAuthSessionMock,
  resolveProgramHeadContextMock,
  countEligibleMock,
  buildWordCloudTokensMock,
  getActiveTermIdMock,
  prismaMock,
} = vi.hoisted(() => ({
  resolveAuthSessionMock: vi.fn(),
  resolveProgramHeadContextMock: vi.fn(),
  countEligibleMock: vi.fn(),
  buildWordCloudTokensMock: vi.fn<(texts: string[]) => Array<{ text: string; value: number }>>(
    () => []
  ),
  getActiveTermIdMock: vi.fn<() => Promise<string | null>>(async () => "term-active-1"),
  prismaMock: {
    program: { findUniqueOrThrow: vi.fn() },
    centralDeployment: { count: vi.fn(), findMany: vi.fn() },
    courseBoundEvaluation: { count: vi.fn(), findMany: vi.fn() },
    courseAssignment: { findMany: vi.fn() },
    response: { count: vi.fn(), groupBy: vi.fn() },
    evaluationAssignment: { count: vi.fn(), findMany: vi.fn() },
    quantitativeResponseItem: { aggregate: vi.fn(), findMany: vi.fn() },
    qualitativeResponseItem: { findMany: vi.fn() },
    pLO: { findMany: vi.fn() },
    instrumentVersion: { findMany: vi.fn() },
    courseBoundCiloQuestionBinding: { findMany: vi.fn() },
    centralDeploymentPloSnapshot: { findMany: vi.fn() },
    academicTermInstance: { findFirst: vi.fn(), findMany: vi.fn() },
    facultyProgramAffiliation: { findFirst: vi.fn() },
  },
}));

vi.mock("@/features/auth/services/resolve-auth-session", () => ({
  resolveAuthSession: resolveAuthSessionMock,
}));
vi.mock("@/features/auth/services/resolve-program-head-context", () => ({
  resolveProgramHeadContext: resolveProgramHeadContextMock,
}));
vi.mock("@/features/course-assignments/services/course-assignment-roster", () => ({
  countEligibleCourseBoundEvaluationAssignments: countEligibleMock,
}));
vi.mock("@/features/analytics/services/qualitative-analytics", async (importOriginal) => {
  const original = await importOriginal();
  return { ...(original as object), buildRedactedWordCloudTokens: buildWordCloudTokensMock };
});
vi.mock("@/features/academic-calendar/services/resolve-active-term", () => ({
  getActiveTermId: getActiveTermIdMock,
}));
vi.mock("@/lib/db/prisma", () => ({ prisma: prismaMock }));

// ---------------------------------------------------------------------------
// Program Head read fixtures
// ---------------------------------------------------------------------------

function mockAuthorizedProgramHead(selectedProgramId: string, code: string, name: string) {
  resolveAuthSessionMock.mockResolvedValue({
    userId: "program-head-1",
    activeRole: ROLES.PROGRAM_HEAD,
    roles: [ROLES.PROGRAM_HEAD],
  });
  resolveProgramHeadContextMock.mockResolvedValue({
    success: true,
    data: {
      userId: "program-head-1",
      authorizedPrograms: [{ id: selectedProgramId, code, name }],
      selectedProgram: { id: selectedProgramId, code, name },
    },
  });
}

function mockEmptyDashboardReads() {
  prismaMock.academicTermInstance.findMany.mockResolvedValue([]);
  prismaMock.evaluationAssignment.findMany.mockResolvedValue([]);
  prismaMock.quantitativeResponseItem.findMany.mockResolvedValue([]);
  prismaMock.qualitativeResponseItem.findMany.mockResolvedValue([]);
  prismaMock.pLO.findMany.mockResolvedValue([]);
  prismaMock.centralDeployment.findMany.mockResolvedValue([]);
  prismaMock.courseBoundEvaluation.findMany.mockResolvedValue([]);
  prismaMock.courseBoundCiloQuestionBinding.findMany.mockResolvedValue([]);
  prismaMock.centralDeploymentPloSnapshot.findMany.mockResolvedValue([]);
}

describe("analytics dashboard access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getActiveTermIdMock.mockResolvedValue("term-active-1");
    prismaMock.academicTermInstance.findFirst.mockResolvedValue({
      id: "term-active-1",
      semester: "FIRST",
      term: "FIRST_TERM",
      school_year: { code: "2026-2027" },
    });
    prismaMock.courseAssignment.findMany.mockResolvedValue([]);
    resolveProgramHeadContextMock.mockResolvedValue({ success: false, error: "unauthorized" });
  });

  it("rejects Faculty dashboard when Faculty is not active role", async () => {
    resolveAuthSessionMock.mockResolvedValue({
      userId: "faculty-1",
      activeRole: ROLES.DEAN,
      roles: [ROLES.DEAN, ROLES.FACULTY],
    });

    await expect(getFacultyDashboard("faculty-1")).resolves.toBeNull();
    expect(prismaMock.facultyProgramAffiliation.findFirst).not.toHaveBeenCalled();
  });

  it("rejects Program Head dashboard for a program outside active assignment scope", async () => {
    resolveAuthSessionMock.mockResolvedValue({
      userId: "program-head-1",
      activeRole: ROLES.PROGRAM_HEAD,
      roles: [ROLES.PROGRAM_HEAD],
    });
    await expect(getProgramHeadDashboard("program-2")).resolves.toBeNull();
    expect(prismaMock.program.findUniqueOrThrow).not.toHaveBeenCalled();
  });

  it.each([
    ["an unauthenticated caller", null],
    [
      "a caller with the wrong active role",
      {
        userId: "program-head-1",
        activeRole: ROLES.DEAN,
        roles: [ROLES.DEAN],
      },
    ],
  ])("rejects Program Head dashboard for %s", async (_description, session) => {
    resolveAuthSessionMock.mockResolvedValue(session);

    await expect(getProgramHeadDashboard("program-1")).resolves.toBeNull();
    expect(resolveProgramHeadContextMock).toHaveBeenCalledWith("program-1");
  });

  it("rejects Program Head dashboard when no active assignment exists", async () => {
    resolveAuthSessionMock.mockResolvedValue({
      userId: "program-head-1",
      activeRole: ROLES.PROGRAM_HEAD,
      roles: [ROLES.PROGRAM_HEAD],
    });
    await expect(getProgramHeadDashboard("program-1")).resolves.toBeNull();
    expect(prismaMock.program.findUniqueOrThrow).not.toHaveBeenCalled();
  });

  it("derives pending responses from the same raw assignment rows as completion", async () => {
    mockAuthorizedProgramHead("program-1", "BSIT", "Information Technology");
    mockEmptyDashboardReads();
    // Two submitted, one in progress, one not started over four opportunity rows.
    prismaMock.evaluationAssignment.findMany.mockResolvedValue([
      { respondent_id: "u1", central_deployment: null, response: { status: "SUBMITTED" } },
      { respondent_id: "u1", central_deployment: null, response: { status: "SUBMITTED" } },
      { respondent_id: "u2", central_deployment: null, response: { status: "IN_PROGRESS" } },
      { respondent_id: "u3", central_deployment: null, response: null },
    ]);

    const result = await getProgramHeadDashboard("program-1");

    expect(result).toMatchObject({ pendingResponses: 2 });
    expect(result?.participation.assigned).toBe(4);
    expect(result?.participation.submitted).toBe(2);

    // The participation read carries every in-scope row with no availability
    // or exclusion filtering (resolved §5.12).
    const call = JSON.stringify(prismaMock.evaluationAssignment.findMany.mock.calls);
    expect(call).toContain("program-1");
    expect(call).not.toContain("activation_at");
    expect(call).not.toContain("deadline_at");
    expect(call).not.toContain("exclusion");
  });

  it("counts ACTIVE-only evaluations in the KPI and preserves period in drill-down links", async () => {
    mockAuthorizedProgramHead("program-1", "BSIT", "Information Technology");
    mockEmptyDashboardReads();
    getActiveTermIdMock.mockResolvedValue(null);
    prismaMock.academicTermInstance.findMany.mockResolvedValue([
      {
        id: "term-1",
        semester: "FIRST",
        term: "FIRST_TERM",
        school_year: { id: "sy-1", code: "2026-2027" },
      },
    ]);

    const result = await getProgramHeadDashboard("program-1", {
      termInstanceId: "term-1",
    });

    // The Responses drill-down preserves the dashboard's period scope (§12)
    // and filters by the same ACTIVE status the KPI counts, so the drill-down
    // never lists evaluations absent from the displayed total.
    expect(result?.links.responsesActiveCourse).toContain("termInstanceId=term-1");
    expect(result?.links.responsesActiveProgramWide).toContain("termInstanceId=term-1");
    expect(result?.links.responsesActiveCourse).toContain("status=ACTIVE");

    // Status-based KPI: SCHEDULED deployments never inflate the count.
    for (const mock of [
      prismaMock.centralDeployment.findMany,
      prismaMock.courseBoundEvaluation.findMany,
    ]) {
      expect(mock.mock.calls[0][0].where.status).toBe("ACTIVE");
    }
  });

  it("constrains every dashboard analytics query to the selected Program for a multi-Program head", async () => {
    resolveAuthSessionMock.mockResolvedValue({
      userId: "program-head-1",
      activeRole: ROLES.PROGRAM_HEAD,
      roles: [ROLES.PROGRAM_HEAD],
    });
    resolveProgramHeadContextMock.mockResolvedValue({
      success: true,
      data: {
        userId: "program-head-1",
        authorizedPrograms: [
          { id: "program-beed", code: "BEED", name: "Elementary Education" },
          { id: "program-bsed", code: "BSED", name: "Secondary Education" },
        ],
        selectedProgram: { id: "program-bsed", code: "BSED", name: "Secondary Education" },
      },
    });
    mockEmptyDashboardReads();

    await expect(getProgramHeadDashboard("program-bsed")).resolves.toMatchObject({
      programCode: "BSED",
    });

    const alwaysCalledQueries = [
      prismaMock.evaluationAssignment.findMany,
      prismaMock.quantitativeResponseItem.findMany,
      prismaMock.qualitativeResponseItem.findMany,
      prismaMock.pLO.findMany,
      prismaMock.centralDeployment.findMany,
      prismaMock.courseBoundEvaluation.findMany,
      prismaMock.academicTermInstance.findMany,
    ];

    for (const queryMock of alwaysCalledQueries) {
      expect(queryMock.mock.calls.length).toBeGreaterThan(0);
      const serialized = JSON.stringify(queryMock.mock.calls);
      expect(serialized).toContain("program-bsed");
      expect(serialized).not.toContain("program-beed");
    }
  });

  it("keeps source quantitative means at full precision and separated per evidence source", async () => {
    mockAuthorizedProgramHead("program-1", "BSIT", "Information Technology");
    mockEmptyDashboardReads();
    const snapshot = [
      {
        key: "cilo-items",
        title: "S",
        items: [
          {
            key: "q-cilo-a",
            prompt: "Q",
            likertDescriptors: [
              { value: 1, label: "Low" },
              { value: 2, label: "Mid" },
              { value: 3, label: "High" },
            ],
          },
        ],
      },
    ];
    prismaMock.instrumentVersion.findMany.mockResolvedValue([
      { id: "iv-course", structure_snapshot: snapshot },
    ]);
    prismaMock.quantitativeResponseItem.findMany.mockResolvedValue([
      courseRating("r1", 3),
      courseRating("r2", 3),
      courseRating("r2", 4),
    ]);

    const result = await getProgramHeadDashboard("program-1");

    expect(result).not.toBeNull();
    if (!result) return;

    const courseMean = result.sourceMeans.find((mean) => mean.sourceKey === "COURSE_STUDENT")!;
    // Full precision pooled mean of [3, 3, 4]; presentation rounds later.
    expect(courseMean.mean).toBe(10 / 3);
    expect(courseMean.ratingCount).toBe(3);
    expect(courseMean.scaleMax).toBe(3);
    // Central sources stay separate even though this program has course evidence.
    for (const key of ["CENTRAL_STUDENT", "ALUMNI", "INDUSTRY_PARTNER"] as const) {
      expect(result.sourceMeans.find((mean) => mean.sourceKey === key)).toMatchObject({
        mean: null,
        ratingCount: 0,
      });
    }
  });

  function courseRating(responseId: string, rating_value: number) {
    return {
      rating_value,
      response_id: responseId,
      section_key: "cilo-items",
      item_key: "q-cilo-a",
      response: {
        assignment: {
          course_bound_id: "cb-1",
          course_bound: { id: "cb-1", instrument_version_id: "iv-course" },
          central_deployment: null,
        },
      },
    };
  }

  it("returns aggregate-only de-identified qualitative pulse data without raw comment text", async () => {
    mockAuthorizedProgramHead("program-1", "BSIT", "Information Technology");
    mockEmptyDashboardReads();
    prismaMock.qualitativeResponseItem.findMany.mockResolvedValue([
      {
        text_content: "Private respondent@example.com student123 comment",
        response: {
          id: "resp-1",
          assignment: {
            course_bound: { id: "cb-9" },
            central_deployment: null,
          },
        },
      },
      {
        text_content: "   ",
        response: {
          id: "resp-2",
          assignment: {
            course_bound: { id: "cb-9" },
            central_deployment: null,
          },
        },
      },
    ]);

    const result = await getProgramHeadDashboard("program-1");

    expect(result).not.toBeNull();
    if (!result) return;

    expect(result.qualitative.answerCount).toBe(1);
    expect(result.qualitative.respondentCount).toBe(1);
    expect(result.qualitative.evaluationCount).toBe(1);
    expect(result.qualitative.tokens.length).toBeLessThanOrEqual(60);
    for (const token of result.qualitative.tokens) {
      expect(Object.keys(token).sort()).toEqual(["text", "value"]);
    }

    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain("Private respondent@example.com student123 comment");
    expect(serialized).not.toContain("respondent@example.com");
    expect(serialized).not.toContain("student123");
    expect(serialized).not.toContain("program-head-1");
    expect(serialized).not.toContain("text_content");
  });

  it("returns period-scoped traceable Faculty metrics", async () => {
    resolveAuthSessionMock.mockResolvedValue({
      userId: "faculty-1",
      activeRole: ROLES.FACULTY,
      roles: [ROLES.FACULTY],
    });
    prismaMock.facultyProgramAffiliation.findFirst.mockResolvedValue({
      program: { code: "BSIT", name: "Information Technology" },
    });
    prismaMock.courseBoundEvaluation.findMany.mockResolvedValue([
      {
        id: "evaluation-1",
        status: "ACTIVE",
        deadline_at: null,
        course_assignment_id: "assignment-1",
        course_assignment: { course: { code: "IT101", title: "Foundations" } },
        assignments: [
          {
            response: {
              id: "response-1",
              status: "SUBMITTED",
              quant_items: [
                { rating_value: 4, section_key: "section-1", item_key: "item-1" },
                { rating_value: 5, section_key: "section-1", item_key: "item-1" },
              ],
            },
          },
          { response: null },
        ],
        instrument: {
          structure_snapshot: [
            {
              key: "section-1",
              title: "Course ratings",
              items: [{ key: "item-1", kind: "quantitative", scale: [1, 2, 3, 4, 5] }],
            },
          ],
        },
      },
    ]);
    countEligibleMock.mockResolvedValue(1);

    await expect(getFacultyDashboardMetrics("faculty-1")).resolves.toMatchObject({
      programCode: "BSIT",
      programLabel: "Information Technology",
      periodLabel: "2026-2027 — 1st Semester — 1st Term",
      kpi: {
        activeEvaluations: 1,
        scheduledEvaluations: 0,
        totalResponses: 1,
        evaluationOpportunities: 2,
        completionRate: 0.5,
        overallMean: null,
        overallScaleMax: null,
        overallRatingCount: 0,
        spansMultipleScales: false,
        pendingResponses: 1,
      },
    });
    expect(prismaMock.courseBoundEvaluation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ term_instance_id: "term-active-1" }),
      })
    );
  });

  it("returns no-period Faculty data without leaking historical evidence", async () => {
    resolveAuthSessionMock.mockResolvedValue({
      userId: "faculty-1",
      activeRole: ROLES.FACULTY,
      roles: [ROLES.FACULTY],
    });
    prismaMock.academicTermInstance.findFirst.mockResolvedValue(null);
    prismaMock.facultyProgramAffiliation.findFirst.mockResolvedValue(null);
    prismaMock.courseBoundEvaluation.findMany.mockResolvedValue([]);

    const result = await getFacultyDashboardMetrics("faculty-1");
    expect(result).toMatchObject({
      periodLabel: null,
      kpi: { activeEvaluations: 0, totalResponses: 0, pendingResponses: 0 },
      courseOverview: [],
    });
    expect(countEligibleMock).not.toHaveBeenCalled();
  });

  it("returns only aggregate, scale-separated, de-identified visualization data", async () => {
    resolveAuthSessionMock.mockResolvedValue({
      userId: "faculty-1",
      activeRole: ROLES.FACULTY,
      roles: [ROLES.FACULTY],
    });
    prismaMock.courseBoundEvaluation.findMany.mockResolvedValue([
      {
        id: "evaluation-1",
        instrument: {
          structure_snapshot: [
            {
              key: "section-1",
              title: "Course ratings",
              items: [{ key: "item-1", kind: "quantitative", scale: [1, 2, 3, 4, 5] }],
            },
          ],
        },
        course_assignment: {
          course: { id: "course-1", code: "IT101", title: "Foundations" },
        },
        assignments: [
          {
            response: {
              id: "response-1",
              quant_items: [
                { rating_value: 4, section_key: "section-1", item_key: "item-1" },
                { rating_value: 5, section_key: "section-1", item_key: "item-1" },
              ],
            },
          },
        ],
      },
    ]);
    prismaMock.qualitativeResponseItem.findMany.mockResolvedValue([
      {
        text_content: "Private respondent@example.com student123 comment",
        response_id: "response-1",
        response: { assignment: { course_bound_id: "evaluation-1" } },
      },
      {
        text_content: "   ",
        response_id: "response-1",
        response: { assignment: { course_bound_id: "evaluation-1" } },
      },
    ]);
    buildWordCloudTokensMock.mockReturnValue([
      { text: "private", value: 1 },
      { text: "respondent@example.com", value: 3 },
      { text: "student123", value: 2 },
    ]);

    const result = await getFacultyDashboardVisualizations("faculty-1");
    expect(result).toMatchObject({
      courseEvidence: [],
      qualitativeItemCount: 1,
      qualitativeResponseCount: 1,
      qualitativeEvaluationCount: 1,
      wordCloudTokens: [],
    });
    expect(JSON.stringify(result)).not.toContain("respondent@example.com");
    expect(JSON.stringify(result)).not.toContain("student123");
    expect(JSON.stringify(result)).not.toContain("faculty-1");
    expect(buildWordCloudTokensMock).not.toHaveBeenCalled();
  });
});
