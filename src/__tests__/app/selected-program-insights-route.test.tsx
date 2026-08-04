import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const { notFoundMock, dashboardMock, resolveProgramHeadContextMock } = vi.hoisted(() => ({
  notFoundMock: vi.fn(() => {
    throw new Error("NOT_FOUND");
  }),
  dashboardMock: vi.fn(),
  resolveProgramHeadContextMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({ notFound: notFoundMock }));
vi.mock("@/features/analytics/services/get-program-head-dashboard", () => ({
  getProgramHeadDashboard: dashboardMock,
}));
vi.mock("@/features/auth/services/resolve-program-head-context", () => ({
  resolveProgramHeadContext: resolveProgramHeadContextMock,
}));
vi.mock("@/features/analytics/components/mean-bar-chart", () => ({
  MeanBarChart: ({
    title,
    data,
  }: {
    title: string;
    data: Array<{ label: string; value: number | null }>;
  }) => (
    <div>
      Mean chart: {title} ({data.map((item) => `${item.label}:${item.value}`).join(", ") || "no data"})
    </div>
  ),
}));
vi.mock("@/features/analytics/components/qualitative-word-cloud", () => ({
  QualitativeWordCloud: ({
    title,
    tokens,
  }: {
    title: string;
    tokens: Array<{ text: string; value: number }>;
  }) => (
    <div>
      Word cloud: {title} ({tokens.map((token) => token.text).join(", ") || "no tokens"})
    </div>
  ),
}));

const bsedDashboard = {
  programCode: "BSED",
  programLabel: "Bachelor of Secondary Education",
  kpi: { activeDeployments: 0, totalResponses: 0, overallMean: null, pendingResponses: 0 },
  stakeholderMeans: [
    { stakeholder: "STUDENT", label: "Students", mean: 4.2, responseCount: 3 },
  ],
  wordCloudTokens: [{ text: "clear", value: 2 }],
};

const bsedContext = {
  success: true,
  data: {
    userId: "head-1",
    authorizedPrograms: [
      { code: "BEED", id: "program-beed", name: "Bachelor of Elementary Education" },
      { code: "BSED", id: "program-bsed", name: "Bachelor of Secondary Education" },
    ],
    selectedProgram: { code: "BSED", id: "program-bsed", name: "Bachelor of Secondary Education" },
  },
};

describe("selected Program insights routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dashboardMock.mockResolvedValue(bsedDashboard);
    resolveProgramHeadContextMock.mockResolvedValue(bsedContext);
  });

  it("passes only the explicitly selected Program to the analytics read", async () => {
    const Page = await loadAnalyticsPage();

    await Page({ params: Promise.resolve({ programId: "program-bsed" }) });

    expect(dashboardMock).toHaveBeenCalledWith("program-bsed");
  });

  it("renders only selected-Program analytics data and labels", async () => {
    const Page = await loadAnalyticsPage();
    const page = await Page({ params: Promise.resolve({ programId: "program-bsed" }) });

    render(page);

    expect(screen.getByText(/BSED — Bachelor of Secondary Education/)).toBeInTheDocument();
    expect(
      screen.getByText("Mean chart: Mean Attainment by Stakeholder (Students:4.2)")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Word cloud: Qualitative Response Insights (clear)")
    ).toBeInTheDocument();
    expect(screen.queryByText(/BEED/)).not.toBeInTheDocument();
  });

  it("renders no analytics data when the analytics read denies a selected Program", async () => {
    dashboardMock.mockResolvedValue(null);
    const Page = await loadAnalyticsPage();

    await expect(Page({ params: Promise.resolve({ programId: "program-3" }) })).rejects.toThrow(
      "NOT_FOUND"
    );
    expect(dashboardMock).toHaveBeenCalledWith("program-3");
  });

  it("labels the reports placeholder with the selected Program only", async () => {
    const Page = await loadReportsPage();
    const page = await Page({ params: Promise.resolve({ programId: "program-bsed" }) });

    render(page);

    expect(resolveProgramHeadContextMock).toHaveBeenCalledWith("program-bsed");
    expect(screen.getByText(/BSED — Bachelor of Secondary Education/)).toBeInTheDocument();
    expect(screen.getByText("Course-bound CILO summary")).toBeInTheDocument();
    expect(screen.getByText("Stakeholder deployment completion")).toBeInTheDocument();
    expect(screen.getByText("Program outcome attainment digest")).toBeInTheDocument();
    expect(screen.queryByText(/BEED/)).not.toBeInTheDocument();
  });

  it("renders no reports when the selected Program is not assigned", async () => {
    resolveProgramHeadContextMock.mockResolvedValue({
      success: false,
      error: "Selected Program is not assigned.",
    });
    const Page = await loadReportsPage();

    await expect(Page({ params: Promise.resolve({ programId: "program-3" }) })).rejects.toThrow(
      "NOT_FOUND"
    );
  });

  it("does not read dashboard analytics while opening reports", async () => {
    const Page = await loadReportsPage();

    await Page({ params: Promise.resolve({ programId: "program-bsed" }) });

    expect(dashboardMock).not.toHaveBeenCalled();
  });
});

async function loadAnalyticsPage() {
  const { default: Page } = await import(
    "@/app/(app)/program-head/programs/[programId]/analytics/page"
  );
  return Page;
}

async function loadReportsPage() {
  const { default: Page } = await import(
    "@/app/(app)/program-head/programs/[programId]/reports/page"
  );
  return Page;
}
