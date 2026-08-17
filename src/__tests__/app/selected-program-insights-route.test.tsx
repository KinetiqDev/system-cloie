import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const { notFoundMock, redirectMock, analyticsMock, resolveProgramHeadContextMock } = vi.hoisted(
  () => ({
    notFoundMock: vi.fn(() => {
      throw new Error("NOT_FOUND");
    }),
    redirectMock: vi.fn((url: string) => {
      throw new Error(`REDIRECT:${url}`);
    }),
    analyticsMock: vi.fn(),
    resolveProgramHeadContextMock: vi.fn(),
  })
);

vi.mock("next/navigation", () => ({ notFound: notFoundMock, redirect: redirectMock }));
vi.mock("@/features/analytics/services/get-program-head-analytics", () => ({
  getProgramHeadAnalytics: analyticsMock,
}));
vi.mock("@/features/auth/services/resolve-program-head-context", () => ({
  resolveProgramHeadContext: resolveProgramHeadContextMock,
}));

const bsedOverview = {
  scope: {
    programCode: "BSED",
    programName: "Bachelor of Secondary Education",
    periodLabel: null,
  },
  kpi: {
    submittedResponseCount: 12,
    evaluationOpportunityCount: 20,
    responseRate: 0.6,
    ratingCount: 48,
    meanRating: 4.1875,
  },
  emptyReason: null,
  periodOptions: {
    schoolYears: [{ id: "school-year-1", label: "2025-2026" }],
    semesters: [{ value: "FIRST", label: "1st Semester" }],
    termInstances: [
      {
        id: "term-1",
        schoolYearId: "school-year-1",
        schoolYearLabel: "2025-2026",
        semester: "FIRST",
        semesterLabel: "1st Semester",
        termLabel: "1st Term",
        label: "2025-2026 · 1st Semester · 1st Term",
      },
    ],
  },
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
    analyticsMock.mockResolvedValue(bsedOverview);
    resolveProgramHeadContextMock.mockResolvedValue(bsedContext);
  });

  it("passes only the explicitly selected Program and parsed filters to the analytics read", async () => {
    const Page = await loadAnalyticsPage();

    await Page({
      params: Promise.resolve({ programId: "program-bsed" }),
      searchParams: Promise.resolve({}),
    });

    expect(analyticsMock).toHaveBeenCalledWith("program-bsed", { tab: "overview" });
  });

  it("renders only selected-Program scope summary and KPI data", async () => {
    const Page = await loadAnalyticsPage();
    const page = await Page({
      params: Promise.resolve({ programId: "program-bsed" }),
      searchParams: Promise.resolve({}),
    });

    render(page);

    expect(screen.getByText(/BSED — Bachelor of Secondary Education/)).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument(); // submitted responses
    expect(screen.getByText("20")).toBeInTheDocument(); // evaluation opportunities
    expect(screen.getByText("60.0%")).toBeInTheDocument(); // response rate
    expect(screen.getByText("48")).toBeInTheDocument(); // rating count
    expect(screen.getByText("4.19")).toBeInTheDocument(); // mean rating (rounded display)
    expect(screen.queryByText(/BEED/)).not.toBeInTheDocument();
  });

  it("renders no analytics data when the analytics read denies a selected Program", async () => {
    analyticsMock.mockResolvedValue(null);
    const Page = await loadAnalyticsPage();

    await expect(
      Page({
        params: Promise.resolve({ programId: "program-3" }),
        searchParams: Promise.resolve({}),
      })
    ).rejects.toThrow("NOT_FOUND");
    expect(analyticsMock).toHaveBeenCalledWith("program-3", { tab: "overview" });
  });

  it("renders context-aware period filter controls when options exist", async () => {
    const Page = await loadAnalyticsPage();
    const page = await Page({
      params: Promise.resolve({ programId: "program-bsed" }),
      searchParams: Promise.resolve({}),
    });

    render(page);

    expect(screen.getByLabelText("School Year")).toBeInTheDocument();
    expect(screen.getByLabelText("Semester")).toBeInTheDocument();
    expect(screen.getByLabelText("Academic Term")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Reset" })).toHaveAttribute(
      "href",
      "/program-head/programs/program-bsed/analytics"
    );
  });

  it("redirects to canonical URL when tab is invalid", async () => {
    const Page = await loadAnalyticsPage();

    await expect(
      Page({
        params: Promise.resolve({ programId: "program-bsed" }),
        searchParams: Promise.resolve({ tab: "invalid-tab" }),
      })
    ).rejects.toThrow(/REDIRECT/);

    // Should redirect to canonical URL without the invalid tab param
    expect(redirectMock).toHaveBeenCalledWith(
      expect.stringContaining("/program-head/programs/program-bsed/analytics")
    );
    // Should NOT call the analytics service since redirect happens first
    expect(analyticsMock).not.toHaveBeenCalled();
  });

  it("preserves valid tab and filter parameters", async () => {
    const Page = await loadAnalyticsPage();
    const termId = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

    await Page({
      params: Promise.resolve({ programId: "program-bsed" }),
      searchParams: Promise.resolve({ tab: "outcomes", termInstanceId: termId }),
    });

    expect(analyticsMock).toHaveBeenCalledWith("program-bsed", {
      tab: "outcomes",
      termInstanceId: termId,
    });
  });

  it("renders the no-assignments empty state", async () => {
    analyticsMock.mockResolvedValue({
      ...bsedOverview,
      kpi: {
        submittedResponseCount: 0,
        evaluationOpportunityCount: 0,
        responseRate: null,
        ratingCount: 0,
        meanRating: null,
      },
      emptyReason: "no-assignments",
    });
    const Page = await loadAnalyticsPage();
    const page = await Page({
      params: Promise.resolve({ programId: "program-bsed" }),
      searchParams: Promise.resolve({}),
    });

    render(page);

    expect(screen.getByText("No evaluation assignments")).toBeInTheDocument();
  });

  it("renders the no-submissions empty state", async () => {
    analyticsMock.mockResolvedValue({
      ...bsedOverview,
      kpi: {
        submittedResponseCount: 0,
        evaluationOpportunityCount: 5,
        responseRate: null,
        ratingCount: 0,
        meanRating: null,
      },
      emptyReason: "no-submissions",
    });
    const Page = await loadAnalyticsPage();
    const page = await Page({
      params: Promise.resolve({ programId: "program-bsed" }),
      searchParams: Promise.resolve({}),
    });

    render(page);

    expect(screen.getByText("No submitted responses")).toBeInTheDocument();
  });

  it("shows unavailable response rate and mean when zero denominator", async () => {
    analyticsMock.mockResolvedValue({
      ...bsedOverview,
      kpi: {
        submittedResponseCount: 0,
        evaluationOpportunityCount: 5,
        responseRate: null,
        ratingCount: 0,
        meanRating: null,
      },
      emptyReason: "no-submissions",
    });
    const Page = await loadAnalyticsPage();
    const page = await Page({
      params: Promise.resolve({ programId: "program-bsed" }),
      searchParams: Promise.resolve({}),
    });

    render(page);

    // KPI cards not rendered because emptyReason is set
    expect(screen.getByText("No submitted responses")).toBeInTheDocument();
  });

  it("renders all 7 tab navigation links", async () => {
    const Page = await loadAnalyticsPage();
    const page = await Page({
      params: Promise.resolve({ programId: "program-bsed" }),
      searchParams: Promise.resolve({}),
    });

    render(page);

    expect(screen.getByText("Overview")).toBeInTheDocument();
    expect(screen.getByText("Outcomes")).toBeInTheDocument();
    expect(screen.getByText("Stakeholders")).toBeInTheDocument();
    expect(screen.getByText("Breakdowns")).toBeInTheDocument();
    expect(screen.getByText("Trends")).toBeInTheDocument();
    expect(screen.getByText("Feedback")).toBeInTheDocument();
    expect(screen.getByText("AI Insights")).toBeInTheDocument();
  });

  it("renders upcoming notice for non-overview tabs", async () => {
    analyticsMock.mockResolvedValue(bsedOverview);
    const Page = await loadAnalyticsPage();
    const page = await Page({
      params: Promise.resolve({ programId: "program-bsed" }),
      searchParams: Promise.resolve({ tab: "outcomes" }),
    });

    render(page);

    expect(screen.getByText(/Outcomes view is not available yet/)).toBeInTheDocument();
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

  it("does not read analytics while opening reports", async () => {
    const Page = await loadReportsPage();

    await Page({ params: Promise.resolve({ programId: "program-bsed" }) });

    expect(analyticsMock).not.toHaveBeenCalled();
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
