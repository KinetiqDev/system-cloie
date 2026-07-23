import { beforeEach, describe, expect, it, vi } from "vitest";
import { getFacultyDashboard } from "@/features/analytics/services/get-faculty-dashboard";
import { getProgramHeadDashboard } from "@/features/analytics/services/get-program-head-dashboard";
import { ROLES } from "@/lib/constants/roles";

const { resolveAuthSessionMock, countEligibleMock, prismaMock } = vi.hoisted(() => ({
  resolveAuthSessionMock: vi.fn(),
  countEligibleMock: vi.fn(),
  prismaMock: {
    program: { findUniqueOrThrow: vi.fn() },
    programHeadAssignment: { findFirst: vi.fn() },
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
vi.mock("@/features/course-assignments/services/course-assignment-roster", () => ({
  countEligibleCourseBoundEvaluationAssignments: countEligibleMock,
}));
vi.mock("@/features/analytics/services/get-course-bound-review-detail", () => ({
  buildReviewWordCloudTokens: vi.fn(() => []),
}));
vi.mock("@/lib/db/prisma", () => ({ prisma: prismaMock }));

describe("analytics dashboard access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    prismaMock.programHeadAssignment.findFirst.mockResolvedValue(null);

    await expect(getProgramHeadDashboard("program-2")).resolves.toBeNull();
    expect(prismaMock.program.findUniqueOrThrow).not.toHaveBeenCalled();
  });

  it("limits Program Head pending central assignments to currently available deployments", async () => {
    resolveAuthSessionMock.mockResolvedValue({
      userId: "program-head-1",
      activeRole: ROLES.PROGRAM_HEAD,
      roles: [ROLES.PROGRAM_HEAD],
    });
    prismaMock.programHeadAssignment.findFirst.mockResolvedValue({ program_id: "program-1" });
    prismaMock.program.findUniqueOrThrow.mockResolvedValue({ code: "BSIT", name: "Information Technology" });
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
});
