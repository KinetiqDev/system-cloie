import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";

const { notFoundMock, dashboardMock, wordCloudPropsMock } = vi.hoisted(() => ({
  notFoundMock: vi.fn(() => {
    throw new Error("NOT_FOUND");
  }),
  dashboardMock: vi.fn(),
  wordCloudPropsMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({ notFound: notFoundMock }));
vi.mock("@/features/analytics/services/get-program-head-dashboard", () => ({
  getProgramHeadDashboard: dashboardMock,
}));
vi.mock("@/features/analytics/components/stakeholder-mean-pie-chart", () => ({
  StakeholderMeanPieChart: () => null,
}));
vi.mock("@/features/analytics/components/qualitative-word-cloud", () => ({
  QualitativeWordCloud: (props: { tokens: unknown[]; responseCount: number }) => {
    wordCloudPropsMock(props);
    return null;
  },
}));

describe("selected Program dashboard route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dashboardMock.mockResolvedValue({
      programCode: "BSED",
      programLabel: "Secondary Education",
      kpi: { activeDeployments: 0, totalResponses: 0, overallMean: null, pendingResponses: 0 },
      stakeholderMeans: [],
      wordCloudTokens: [],
      qualitativeItemCount: 2,
    });
  });

  it("passes only the explicitly selected Program to the dashboard read", async () => {
    const Page = await loadPage();

    await Page({ params: Promise.resolve({ programId: "program-2" }) });

    expect(dashboardMock).toHaveBeenCalledWith("program-2");
  });

  it("passes the qualitative response count to the word cloud", async () => {
    const Page = await loadPage();

    const page = await Page({ params: Promise.resolve({ programId: "program-2" }) });
    render(page);

    expect(wordCloudPropsMock).toHaveBeenCalledWith({
      responseCount: 2,
      title: "Qualitative Response Insights",
      tokens: [],
    });
  });

  it("renders no dashboard data when the public dashboard service denies a selected Program", async () => {
    dashboardMock.mockResolvedValue(null);
    const Page = await loadPage();

    await expect(Page({ params: Promise.resolve({ programId: "program-3" }) })).rejects.toThrow("NOT_FOUND");
    expect(dashboardMock).toHaveBeenCalledWith("program-3");
  });
});

async function loadPage() {
  const { default: Page } = await import(
    "@/app/(app)/program-head/programs/[programId]/dashboard/page"
  );
  return Page;
}
