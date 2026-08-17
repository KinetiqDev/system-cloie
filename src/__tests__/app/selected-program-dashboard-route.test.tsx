import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const { notFoundMock, dashboardMock, wordCloudPropsMock, comparisonPropsMock } = vi.hoisted(() => ({
  notFoundMock: vi.fn(() => {
    throw new Error("NOT_FOUND");
  }),
  dashboardMock: vi.fn(),
  wordCloudPropsMock: vi.fn(),
  comparisonPropsMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({ notFound: notFoundMock }));
vi.mock("@/features/analytics/services/get-program-head-dashboard", () => ({
  getProgramHeadDashboard: dashboardMock,
}));
vi.mock("@/features/analytics/components/stakeholder-mean-comparison", () => ({
  StakeholderMeanComparison: (props: { data: unknown[] }) => {
    comparisonPropsMock(props);
    return null;
  },
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
      kpi: {
        activeDeployments: 3,
        submittedResponseCount: 12,
        evaluationOpportunityCount: 20,
        ratingCount: 48,
        meanRating: 4.1875,
        pendingResponses: 5,
      },
      stakeholderMeans: [
        { stakeholder: "STUDENT", label: "Students", mean: 4.1875, responseCount: 8 },
      ],
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

  it("renders shared-semantics KPIs with Mean Rating rounded only at presentation", async () => {
    const Page = await loadPage();

    const page = await Page({ params: Promise.resolve({ programId: "program-2" }) });
    render(page);

    expect(screen.getByText("12")).toBeInTheDocument(); // submitted responses
    expect(screen.getByText("20")).toBeInTheDocument(); // evaluation opportunities
    expect(screen.getByText("48")).toBeInTheDocument(); // rating count
    expect(screen.getByText("4.19")).toBeInTheDocument(); // mean rating (rounded display)
    expect(screen.getByText("5")).toBeInTheDocument(); // pending responses
    expect(screen.getByText("3")).toBeInTheDocument(); // active deployments
  });

  it("shows an unavailable Mean Rating when the scope has no ratings", async () => {
    dashboardMock.mockResolvedValue({
      programCode: "BSED",
      programLabel: "Secondary Education",
      kpi: {
        activeDeployments: 0,
        submittedResponseCount: 0,
        evaluationOpportunityCount: 0,
        ratingCount: 0,
        meanRating: null,
        pendingResponses: 0,
      },
      stakeholderMeans: [],
      wordCloudTokens: [],
      qualitativeItemCount: 0,
    });
    const Page = await loadPage();

    const page = await Page({ params: Promise.resolve({ programId: "program-2" }) });
    render(page);

    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("passes full-precision stakeholder means to the compact comparison chart", async () => {
    dashboardMock.mockResolvedValue({
      programCode: "BSED",
      programLabel: "Secondary Education",
      kpi: {
        activeDeployments: 0,
        submittedResponseCount: 1,
        evaluationOpportunityCount: 5,
        ratingCount: 3,
        meanRating: 13 / 3,
        pendingResponses: 0,
      },
      stakeholderMeans: [
        { stakeholder: "STUDENT", label: "Students", mean: 13 / 3, responseCount: 1 },
        { stakeholder: "ALUMNI", label: "Alumni", mean: 4, responseCount: 2 },
      ],
      wordCloudTokens: [],
      qualitativeItemCount: 0,
    });
    const Page = await loadPage();

    const page = await Page({ params: Promise.resolve({ programId: "program-2" }) });
    render(page);

    expect(comparisonPropsMock).toHaveBeenCalledWith({
      data: [
        { stakeholder: "STUDENT", label: "Students", mean: 13 / 3, responseCount: 1 },
        { stakeholder: "ALUMNI", label: "Alumni", mean: 4, responseCount: 2 },
      ],
    });
  });

  it("links to the selected Program Analytics workspace without duplicating it", async () => {
    const Page = await loadPage();

    const page = await Page({ params: Promise.resolve({ programId: "program-2" }) });
    render(page);

    expect(screen.getByRole("link", { name: /View full Analytics/ })).toHaveAttribute(
      "href",
      "/program-head/programs/program-2/analytics"
    );
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
