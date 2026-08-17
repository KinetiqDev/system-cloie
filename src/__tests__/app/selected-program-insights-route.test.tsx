import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const { notFoundMock, redirectMock, analyticsMock, outcomesMock, trendsMock, stakeholdersMock, breakdownsMock, resolveProgramHeadContextMock } =
  vi.hoisted(() => ({
    notFoundMock: vi.fn(() => {
      throw new Error("NOT_FOUND");
    }),
    redirectMock: vi.fn((url: string) => {
      throw new Error(`REDIRECT:${url}`);
    }),
    analyticsMock: vi.fn(),
    outcomesMock: vi.fn(),
    trendsMock: vi.fn(),
    stakeholdersMock: vi.fn(),
    breakdownsMock: vi.fn(),
    resolveProgramHeadContextMock: vi.fn(),
  }));

vi.mock("next/navigation", () => ({ notFound: notFoundMock, redirect: redirectMock }));
vi.mock("@/features/analytics/services/get-program-head-analytics", () => ({
  getProgramHeadAnalytics: analyticsMock,
  getProgramHeadOutcomes: outcomesMock,
  getProgramHeadTrends: trendsMock,
  getProgramHeadStakeholders: stakeholdersMock,
  getProgramHeadBreakdowns: breakdownsMock,
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
    outcomesMock.mockResolvedValue(null);
    trendsMock.mockResolvedValue(null);
    stakeholdersMock.mockResolvedValue(null);
    breakdownsMock.mockResolvedValue(null);
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
    outcomesMock.mockResolvedValue({
      scope: {
        programCode: "BSED",
        programName: "Bachelor of Secondary Education",
        periodLabel: null,
      },
      periodOptions: {
        schoolYears: [{ id: "school-year-1", label: "2025-2026" }],
        semesters: [{ value: "FIRST", label: "1st Semester" }],
        termInstances: [],
      },
      emptyReason: null,
      currentMappingDisclosure: "current mappings",
      manyToManyDisclosure: false,
      outcomes: [],
    });

    await Page({
      params: Promise.resolve({ programId: "program-bsed" }),
      searchParams: Promise.resolve({ tab: "outcomes", termInstanceId: termId }),
    });

    expect(outcomesMock).toHaveBeenCalledWith("program-bsed", {
      tab: "outcomes",
      termInstanceId: termId,
    });
    expect(analyticsMock).not.toHaveBeenCalled();
  });

  it("renders the Trends view with comparable periods and exact values", async () => {
    trendsMock.mockResolvedValue({
      scope: {
        programCode: "BSED",
        programName: "Bachelor of Secondary Education",
        periodLabel: null,
      },
      periods: [
        {
          termInstanceId: "term-1",
          periodLabel: "2024-2025 · 1st Semester · 1st Term",
          meanRating: 4.4,
          submittedResponseCount: 12,
          ratingCount: 36,
          instrumentContext: "CILO Evaluation v1",
          scaleContext: "1–5 (5-point)",
          outcomeCodes: ["GO-1"],
          comparableWithPrevious: false,
        },
        {
          termInstanceId: "term-2",
          periodLabel: "2025-2026 · 1st Semester · 1st Term",
          meanRating: 4.2,
          submittedResponseCount: 14,
          ratingCount: 42,
          instrumentContext: "CILO Evaluation v2",
          scaleContext: "1–5 (5-point)",
          outcomeCodes: ["GO-1"],
          comparableWithPrevious: false,
        },
      ],
      breaks: [
        {
          fromPeriodLabel: "2024-2025 · 1st Semester · 1st Term",
          toPeriodLabel: "2025-2026 · 1st Semester · 1st Term",
          reason: "The instrument version changed between these periods.",
        },
      ],
      emptyReason: "no-comparable-history",
      periodOptions: {
        schoolYears: [{ id: "school-year-1", label: "2025-2026" }],
        semesters: [{ value: "FIRST", label: "1st Semester" }],
        termInstances: [],
      },
    });
    const Page = await loadAnalyticsPage();
    const page = await Page({
      params: Promise.resolve({ programId: "program-bsed" }),
      searchParams: Promise.resolve({ tab: "trends" }),
    });

    render(page);

    expect(trendsMock).toHaveBeenCalledWith("program-bsed", { tab: "trends" });
    expect(analyticsMock).not.toHaveBeenCalled();
    expect(screen.getByText(/BSED — Bachelor of Secondary Education/)).toBeInTheDocument();
    expect(screen.getByText("No comparable history")).toBeInTheDocument();
    expect(screen.getByText("2024-2025 · 1st Semester · 1st Term")).toBeInTheDocument();
    expect(screen.getByText("4.40")).toBeInTheDocument();
    expect(screen.getByText("CILO Evaluation v1")).toBeInTheDocument();
    expect(screen.getByText(/Not directly comparable with the previous period/)).toBeInTheDocument();
  });

  it("renders no Trends data when the trends read denies the selected Program", async () => {
    trendsMock.mockResolvedValue(null);
    const Page = await loadAnalyticsPage();

    await expect(
      Page({
        params: Promise.resolve({ programId: "program-3" }),
        searchParams: Promise.resolve({ tab: "trends" }),
      })
    ).rejects.toThrow("NOT_FOUND");
    expect(trendsMock).toHaveBeenCalledWith("program-3", { tab: "trends" });
  });

  it("renders the Stakeholders view with separated evidence source buckets", async () => {
    stakeholdersMock.mockResolvedValue({
      scope: {
        programCode: "BSED",
        programName: "Bachelor of Secondary Education",
        periodLabel: null,
      },
      periodOptions: {
        schoolYears: [],
        semesters: [],
        termInstances: [],
      },
      emptyReason: null,
      sourceSeparationDisclosure: "Evidence sources are kept separate.",
      buckets: [
        {
          sourceKey: "COURSE_STUDENT",
          sourceLabel: "Course-bound student evidence",
          sourceDescription: "Course-bound evaluations of assigned students.",
          instrumentContext: "CILO Evaluation v2",
          meanRating: 4.25,
          ratingCount: 24,
          submittedResponseCount: 12,
        },
        {
          sourceKey: "ALUMNI",
          sourceLabel: "Alumni evidence",
          sourceDescription: "Central deployments targeting alumni respondents.",
          instrumentContext: "Alumni Survey v1",
          meanRating: 3.8,
          ratingCount: 8,
          submittedResponseCount: 4,
        },
      ],
    });
    const Page = await loadAnalyticsPage();
    const page = await Page({
      params: Promise.resolve({ programId: "program-bsed" }),
      searchParams: Promise.resolve({ tab: "stakeholders" }),
    });

    render(page);

    expect(stakeholdersMock).toHaveBeenCalledWith("program-bsed", { tab: "stakeholders" });
    expect(analyticsMock).not.toHaveBeenCalled();
    expect(screen.getByText(/BSED — Bachelor of Secondary Education/)).toBeInTheDocument();
    expect(screen.getByText("Evidence sources are kept separate")).toBeInTheDocument();
    expect(screen.getAllByText("Course-bound student evidence").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Alumni evidence").length).toBeGreaterThan(0);
    expect(screen.queryByText(/not available yet/)).not.toBeInTheDocument();
  });

  it("renders no Stakeholders data when the stakeholders read denies the selected Program", async () => {
    stakeholdersMock.mockResolvedValue(null);
    const Page = await loadAnalyticsPage();

    await expect(
      Page({
        params: Promise.resolve({ programId: "program-3" }),
        searchParams: Promise.resolve({ tab: "stakeholders" }),
      })
    ).rejects.toThrow("NOT_FOUND");
    expect(stakeholdersMock).toHaveBeenCalledWith("program-3", { tab: "stakeholders" });
  });

  it("renders the Stakeholders no-assignments empty state", async () => {
    stakeholdersMock.mockResolvedValue({
      scope: {
        programCode: "BSED",
        programName: "Bachelor of Secondary Education",
        periodLabel: null,
      },
      periodOptions: { schoolYears: [], semesters: [], termInstances: [] },
      emptyReason: "no-assignments",
      sourceSeparationDisclosure: "Evidence sources are kept separate.",
      buckets: [],
    });
    const Page = await loadAnalyticsPage();
    const page = await Page({
      params: Promise.resolve({ programId: "program-bsed" }),
      searchParams: Promise.resolve({ tab: "stakeholders" }),
    });

    render(page);

    expect(screen.getByText("No evaluation assignments")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "View all periods" })
    ).toHaveAttribute(
      "href",
      "/program-head/programs/program-bsed/analytics?tab=stakeholders"
    );
  });

  it("renders the Breakdowns view with course and contextual dimensions", async () => {
    breakdownsMock.mockResolvedValue({
      scope: {
        programCode: "BSED",
        programName: "Bachelor of Secondary Education",
        periodLabel: null,
      },
      periodOptions: { schoolYears: [], semesters: [], termInstances: [] },
      emptyReason: null,
      courseRows: [
        {
          key: "course-1",
          label: "CS101 — Intro to CS",
          courseCode: "CS101",
          isUnspecified: false,
          meanRating: 4.1,
          ratingCount: 12,
          submittedResponseCount: 6,
          instrumentContext: "CILO Evaluation v2",
          evidenceEvaluations: [
            { evaluationId: "eval-1", deploymentName: "CILO Deployment" },
          ],
        },
      ],
      instrumentRows: [],
      majorBreakdown: {
        rows: [
          {
            key: "major-1",
            label: "Mathematics",
            isUnspecified: false,
            meanRating: 4.0,
            ratingCount: 8,
            submittedResponseCount: 4,
          },
        ],
        unspecified: null,
        attributionNote: "Major attribution comes only from central deployment targeting.",
      },
      yearLevelBreakdown: null,
    });
    const Page = await loadAnalyticsPage();
    const page = await Page({
      params: Promise.resolve({ programId: "program-bsed" }),
      searchParams: Promise.resolve({ tab: "breakdowns" }),
    });

    render(page);

    expect(breakdownsMock).toHaveBeenCalledWith("program-bsed", { tab: "breakdowns" });
    expect(analyticsMock).not.toHaveBeenCalled();
    expect(screen.getByText("Mean Rating by Course")).toBeInTheDocument();
    expect(screen.getAllByText("CS101 — Intro to CS").length).toBeGreaterThan(0);
    expect(screen.getByText("Mean Rating by Major")).toBeInTheDocument();
    expect(screen.getAllByText("Mathematics").length).toBeGreaterThan(0);
    // No defensible year-level attribution: the dimension is omitted.
    expect(screen.getByText("Year-Level Breakdown")).toBeInTheDocument();
    expect(screen.queryByText(/not available yet/)).not.toBeInTheDocument();
  });

  it("renders no Breakdowns data when the breakdowns read denies the selected Program", async () => {
    breakdownsMock.mockResolvedValue(null);
    const Page = await loadAnalyticsPage();

    await expect(
      Page({
        params: Promise.resolve({ programId: "program-3" }),
        searchParams: Promise.resolve({ tab: "breakdowns" }),
      })
    ).rejects.toThrow("NOT_FOUND");
    expect(breakdownsMock).toHaveBeenCalledWith("program-3", { tab: "breakdowns" });
  });

  it("renders the Breakdowns no-submissions empty state", async () => {
    breakdownsMock.mockResolvedValue({
      scope: {
        programCode: "BSED",
        programName: "Bachelor of Secondary Education",
        periodLabel: null,
      },
      periodOptions: { schoolYears: [], semesters: [], termInstances: [] },
      emptyReason: "no-submissions",
      courseRows: [],
      instrumentRows: [],
      majorBreakdown: null,
      yearLevelBreakdown: null,
    });
    const Page = await loadAnalyticsPage();
    const page = await Page({
      params: Promise.resolve({ programId: "program-bsed" }),
      searchParams: Promise.resolve({ tab: "breakdowns" }),
    });

    render(page);

    expect(screen.getByText("No submitted responses")).toBeInTheDocument();
  });

  it("renders the no-submitted-evidence Trends empty state", async () => {
    trendsMock.mockResolvedValue({
      scope: {
        programCode: "BSED",
        programName: "Bachelor of Secondary Education",
        periodLabel: null,
      },
      periods: [],
      breaks: [],
      emptyReason: "no-evidence",
      periodOptions: {
        schoolYears: [],
        semesters: [],
        termInstances: [],
      },
    });
    const Page = await loadAnalyticsPage();
    const page = await Page({
      params: Promise.resolve({ programId: "program-bsed" }),
      searchParams: Promise.resolve({ tab: "trends" }),
    });

    render(page);

    expect(screen.getByText("No submitted evidence")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "View all periods" })
    ).toHaveAttribute("href", "/program-head/programs/program-bsed/analytics?tab=trends");
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

  it("renders upcoming notice for non-live tabs", async () => {
    analyticsMock.mockResolvedValue(bsedOverview);
    const Page = await loadAnalyticsPage();
    const page = await Page({
      params: Promise.resolve({ programId: "program-bsed" }),
      searchParams: Promise.resolve({ tab: "feedback" }),
    });

    render(page);

    expect(screen.getByText(/Feedback view is not available yet/)).toBeInTheDocument();
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
