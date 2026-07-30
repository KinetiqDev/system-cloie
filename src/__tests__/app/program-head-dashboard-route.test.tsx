import { beforeEach, describe, expect, it, vi } from "vitest";
import { ROLES } from "@/lib/constants/roles";

const {
  redirectMock,
  resolveAuthSessionMock,
  assignmentFindFirstMock,
  getProgramHeadDashboardForScopeMock,
} = vi.hoisted(() => ({
  redirectMock: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
  resolveAuthSessionMock: vi.fn(),
  assignmentFindFirstMock: vi.fn(),
  getProgramHeadDashboardForScopeMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect: redirectMock }));
vi.mock("@/features/auth/services/resolve-auth-session", () => ({
  resolveAuthSession: resolveAuthSessionMock,
}));
vi.mock("@/lib/db/prisma", () => ({
  prisma: { programHeadAssignment: { findFirst: assignmentFindFirstMock } },
}));
vi.mock("@/features/analytics/services/get-program-head-dashboard", () => ({
  getProgramHeadDashboardForScope: getProgramHeadDashboardForScopeMock,
}));
vi.mock("@/features/analytics/components/stakeholder-mean-pie-chart", () => ({
  StakeholderMeanPieChart: () => null,
}));
vi.mock("@/features/analytics/components/qualitative-word-cloud", () => ({
  QualitativeWordCloud: () => null,
}));

describe("Program Head dashboard route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveAuthSessionMock.mockResolvedValue({
      userId: "program-head-1",
      activeRole: ROLES.PROGRAM_HEAD,
    });
    assignmentFindFirstMock.mockResolvedValue({
      program: { id: "program-1", code: "BSIT", name: "Information Technology" },
    });
    getProgramHeadDashboardForScopeMock.mockResolvedValue({
      programCode: "BSIT",
      programLabel: "Information Technology",
      kpi: {
        activeDeployments: 0,
        totalResponses: 0,
        overallMean: null,
        pendingResponses: 0,
      },
      stakeholderMeans: [],
      wordCloudTokens: [],
    });
  });

  it("passes the page-validated Program Head scope to the dashboard read", async () => {
    const ProgramHeadDashboardPage = await loadPage();

    await ProgramHeadDashboardPage();

    expect(getProgramHeadDashboardForScopeMock).toHaveBeenCalledWith({
      programId: "program-1",
      programCode: "BSIT",
      programLabel: "Information Technology",
    });
  });

  it.each([
    ["an unauthenticated caller", null, "/portal/respondents"],
    [
      "a caller with the wrong active role",
      { userId: "dean-1", activeRole: ROLES.DEAN },
      "/unauthorized",
    ],
  ])("preserves page authorization for %s", async (_description, session, path) => {
    resolveAuthSessionMock.mockResolvedValue(session);
    const ProgramHeadDashboardPage = await loadPage();

    await expect(ProgramHeadDashboardPage()).rejects.toThrow(`REDIRECT:${path}`);
    expect(assignmentFindFirstMock).not.toHaveBeenCalled();
    expect(getProgramHeadDashboardForScopeMock).not.toHaveBeenCalled();
  });

  it("preserves the no-active-assignment empty state without reading dashboard data", async () => {
    assignmentFindFirstMock.mockResolvedValue(null);
    const ProgramHeadDashboardPage = await loadPage();

    await expect(ProgramHeadDashboardPage()).resolves.toBeDefined();
    expect(getProgramHeadDashboardForScopeMock).not.toHaveBeenCalled();
  });
});

async function loadPage() {
  const { default: ProgramHeadDashboardPage } = await import(
    "@/app/(app)/program-head/dashboard/page"
  );
  return ProgramHeadDashboardPage;
}
