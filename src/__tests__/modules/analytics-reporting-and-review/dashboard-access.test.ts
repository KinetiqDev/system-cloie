import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getFacultyDashboard,
  getFacultyDashboardMetrics,
  getFacultyDashboardVisualizations,
} from "@/features/analytics/services/get-faculty-dashboard";
import {
  getProgramHeadDashboard,
} from "@/features/analytics/services/get-program-head-dashboard";
import { ROLES } from "@/lib/constants/roles";

const {
  resolveAuthSessionMock,
  resolveProgramHeadContextMock,
  countEligibleMock,
  buildWordCloudTokensMock,
  prismaMock,
} = vi.hoisted(() => ({
    resolveAuthSessionMock: vi.fn(),
    resolveProgramHeadContextMock: vi.fn(),
    countEligibleMock: vi.fn(),
    buildWordCloudTokensMock: vi.fn<
      (texts: string[]) => Array<{ text: string; value: number }>
    >(() => []),
    prismaMock: {
      program: { findUniqueOrThrow: vi.fn() },
      centralDeployment: { count: vi.fn(), findMany: vi.fn() },
      courseBoundEvaluation: { count: vi.fn(), findMany: vi.fn() },
      response: { count: vi.fn() },
      evaluationAssignment: { count: vi.fn() },
      quantitativeResponseItem: { aggregate: vi.fn() },
      qualitativeResponseItem: { findMany: vi.fn() },
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
vi.mock("@/features/analytics/services/get-course-bound-review-detail", () => ({
  buildReviewWordCloudTokens: buildWordCloudTokensMock,
}));
vi.mock("@/lib/db/prisma", () => ({ prisma: prismaMock }));

describe("analytics dashboard access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    ["a caller with the wrong active role", {
      userId: "program-head-1",
      activeRole: ROLES.DEAN,
      roles: [ROLES.DEAN],
    }],
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

  it("limits Program Head pending central assignments to currently available deployments", async () => {
    resolveAuthSessionMock.mockResolvedValue({
      userId: "program-head-1",
      activeRole: ROLES.PROGRAM_HEAD,
      roles: [ROLES.PROGRAM_HEAD],
    });
    resolveProgramHeadContextMock.mockResolvedValue({
      success: true,
      data: {
        userId: "program-head-1",
        authorizedPrograms: [{ id: "program-1", code: "BSIT", name: "Information Technology" }],
        selectedProgram: { id: "program-1", code: "BSIT", name: "Information Technology" },
      },
    });
    prismaMock.centralDeployment.count.mockResolvedValue(0);
    prismaMock.courseBoundEvaluation.count.mockResolvedValue(0);
    prismaMock.response.count.mockResolvedValue(0);
    prismaMock.evaluationAssignment.count.mockResolvedValue(0);
    prismaMock.quantitativeResponseItem.aggregate.mockResolvedValue({ _avg: { rating_value: null } });
    prismaMock.centralDeployment.findMany.mockResolvedValue([]);
    prismaMock.qualitativeResponseItem.findMany.mockResolvedValue([]);
    countEligibleMock.mockResolvedValue(0);

    await expect(getProgramHeadDashboard("program-1")).resolves.toMatchObject({
      kpi: { pendingResponses: 0 },
    });

    expect(prismaMock.evaluationAssignment.count).toHaveBeenCalledWith({
      where: {
        OR: [{ response: null }, { response: { status: "IN_PROGRESS" } }],
        central_deployment: expect.objectContaining({
          program_id: "program-1",
          status: { in: ["ACTIVE", "SCHEDULED"] },
          OR: [{ activation_at: null }, { activation_at: { lte: expect.any(Date) } }],
          AND: [{ OR: [{ deadline_at: null }, { deadline_at: { gte: expect.any(Date) } }] }],
        }),
      },
    });
  });

  it("reads the dashboard only after the public resolver validates the selected Program", async () => {
    resolveProgramHeadContextMock.mockResolvedValue({
      success: true,
      data: {
        userId: "program-head-1",
        authorizedPrograms: [{ id: "program-1", code: "BSIT", name: "Information Technology" }],
        selectedProgram: { id: "program-1", code: "BSIT", name: "Information Technology" },
      },
    });
    prismaMock.centralDeployment.count.mockResolvedValue(0);
    prismaMock.courseBoundEvaluation.count.mockResolvedValue(0);
    prismaMock.response.count.mockResolvedValue(0);
    prismaMock.evaluationAssignment.count.mockResolvedValue(0);
    prismaMock.quantitativeResponseItem.aggregate.mockResolvedValue({
      _avg: { rating_value: null },
    });
    prismaMock.centralDeployment.findMany.mockResolvedValue([]);
    prismaMock.qualitativeResponseItem.findMany.mockResolvedValue([]);
    countEligibleMock.mockResolvedValue(0);

    await expect(
      getProgramHeadDashboard("program-1")
    ).resolves.toMatchObject({
      programCode: "BSIT",
      programLabel: "Information Technology",
      kpi: { pendingResponses: 0 },
    });

    expect(resolveProgramHeadContextMock).toHaveBeenCalledWith("program-1");
    expect(prismaMock.program.findUniqueOrThrow).not.toHaveBeenCalled();
  });

  it("preserves Faculty KPI values in the primary metrics read model", async () => {
    resolveAuthSessionMock.mockResolvedValue({
      userId: "faculty-1",
      activeRole: ROLES.FACULTY,
      roles: [ROLES.FACULTY],
    });
    prismaMock.facultyProgramAffiliation.findFirst.mockResolvedValue({
      program: { code: "BSIT", name: "Information Technology" },
    });
    prismaMock.courseBoundEvaluation.count.mockResolvedValue(3);
    prismaMock.response.count.mockResolvedValue(12);
    prismaMock.quantitativeResponseItem.aggregate.mockResolvedValue({
      _avg: { rating_value: 4.125 },
    });
    countEligibleMock.mockResolvedValue(5);

    await expect(getFacultyDashboardMetrics("faculty-1")).resolves.toEqual({
      programCode: "BSIT",
      programLabel: "Information Technology",
      kpi: {
        activeEvaluations: 3,
        totalResponses: 12,
        overallMean: 4.13,
        pendingResponses: 5,
      },
    });
  });

  it("starts independent Faculty metric reads before any one read resolves", async () => {
    resolveAuthSessionMock.mockResolvedValue({
      userId: "faculty-1",
      activeRole: ROLES.FACULTY,
      roles: [ROLES.FACULTY],
    });

    const affiliation = deferred<{ program: { code: string; name: string } } | null>();
    const activeEvaluations = deferred<number>();
    const totalResponses = deferred<number>();
    const pendingResponses = deferred<number>();
    const overallMean = deferred<{ _avg: { rating_value: number | null } }>();
    prismaMock.facultyProgramAffiliation.findFirst.mockReturnValue(affiliation.promise);
    prismaMock.courseBoundEvaluation.count.mockReturnValue(activeEvaluations.promise);
    prismaMock.response.count.mockReturnValue(totalResponses.promise);
    countEligibleMock.mockReturnValue(pendingResponses.promise);
    prismaMock.quantitativeResponseItem.aggregate.mockReturnValue(overallMean.promise);

    const resultPromise = getFacultyDashboardMetrics("faculty-1");

    await Promise.resolve();
    await Promise.resolve();
    expect(prismaMock.facultyProgramAffiliation.findFirst).toHaveBeenCalled();
    expect(prismaMock.courseBoundEvaluation.count).toHaveBeenCalled();
    expect(prismaMock.response.count).toHaveBeenCalled();
    expect(countEligibleMock).toHaveBeenCalled();
    expect(prismaMock.quantitativeResponseItem.aggregate).toHaveBeenCalled();

    affiliation.resolve({ program: { code: "BSIT", name: "Information Technology" } });
    activeEvaluations.resolve(0);
    totalResponses.resolve(0);
    pendingResponses.resolve(0);
    overallMean.resolve({ _avg: { rating_value: null } });
    await expect(resultPromise).resolves.toMatchObject({
      programCode: "BSIT",
      kpi: { activeEvaluations: 0, totalResponses: 0, pendingResponses: 0 },
    });
  });

  it("returns only aggregate and de-identified visualization data", async () => {
    resolveAuthSessionMock.mockResolvedValue({
      userId: "faculty-1",
      activeRole: ROLES.FACULTY,
      roles: [ROLES.FACULTY],
    });
    prismaMock.courseBoundEvaluation.findMany.mockResolvedValue([
      {
        course_assignment: { course: { code: "IT101", title: "Foundations" } },
        assignments: [
          { response: { quant_items: [{ rating_value: 4 }, { rating_value: 5 }] } },
        ],
      },
    ]);
    prismaMock.qualitativeResponseItem.findMany.mockResolvedValue([
      { text_content: "Private respondent@example.com student123 comment" },
    ]);
    buildWordCloudTokensMock.mockReturnValue([
      { text: "private", value: 1 },
      { text: "respondent@example.com", value: 3 },
      { text: "student123", value: 2 },
    ]);
    const result = await getFacultyDashboardVisualizations("faculty-1");

    expect(result).toMatchObject({
      courseMeans: [
        { courseCode: "IT101", courseTitle: "Foundations", mean: 4.5, responseCount: 1 },
      ],
      wordCloudTokens: [{ text: "private", value: 1 }],
    });
    expect(JSON.stringify(result)).not.toContain("Private respondent comment");
    expect(JSON.stringify(result)).not.toContain("faculty-1");
    expect(Object.keys(result ?? {})).toEqual(["courseMeans", "wordCloudTokens"]);
    expect(Object.keys(result?.courseMeans[0] ?? {})).toEqual([
      "courseCode",
      "courseTitle",
      "mean",
      "responseCount",
    ]);
    expect(Object.keys(result?.wordCloudTokens[0] ?? {})).toEqual(["text", "value"]);
    expect(JSON.stringify(result)).not.toContain("respondent@example.com");
    expect(JSON.stringify(result)).not.toContain("student123");
    expect(buildWordCloudTokensMock).toHaveBeenCalledWith(["Private comment"]);
  });
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve;
  });
  return { promise, resolve };
}
