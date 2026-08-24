import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";

const {
  notFoundMock,
  redirectMock,
  analyticsMock,
  outcomesMock,
  trendsMock,
  stakeholdersMock,
  breakdownsMock,
  feedbackMock,
  resolveProgramHeadContextMock,
} = vi.hoisted(() => ({
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
  feedbackMock: vi.fn(),
  resolveProgramHeadContextMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({ notFound: notFoundMock, redirect: redirectMock }));
vi.mock("@/features/analytics/services/get-program-head-analytics", () => ({
  getProgramHeadAnalytics: analyticsMock,
  getProgramHeadOutcomes: outcomesMock,
  getProgramHeadTrends: trendsMock,
  getProgramHeadStakeholders: stakeholdersMock,
  getProgramHeadBreakdowns: breakdownsMock,
  getProgramHeadFeedback: feedbackMock,
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

const bsedOutcomes = {
  scope: {
    programCode: "BSED",
    programName: "Bachelor of Secondary Education",
    periodLabel: null,
  },
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
  emptyReason: null,
  programWideOutcomes: [],
      currentMappingDisclosure: "current mappings",
  manyToManyDisclosure: false,
  outcomes: [],
  selection: null,
  distributions: [],
  coverageMatrix: { rows: [] },
  courseEvidenceRows: [],
  programWideEvidenceRows: [],
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
    outcomesMock.mockResolvedValue(bsedOutcomes);
    trendsMock.mockResolvedValue(null);
    stakeholdersMock.mockResolvedValue(null);
    breakdownsMock.mockResolvedValue(null);
    feedbackMock.mockResolvedValue(null);
    resolveProgramHeadContextMock.mockResolvedValue(bsedContext);
  });

  it("passes only the explicitly selected Program and parsed filters to the analytics read", async () => {
    const Page = await loadAnalyticsPage();

    await Page({
      params: Promise.resolve({ programId: "program-bsed" }),
      searchParams: Promise.resolve({}),
    });

    expect(outcomesMock).toHaveBeenCalledWith("program-bsed", { tab: "outcomes" });
  });

  it("renders the analytics landing with selected-Program scope and no BEED leakage", async () => {
    const Page = await loadAnalyticsPage();
    const page = await Page({
      params: Promise.resolve({ programId: "program-bsed" }),
      searchParams: Promise.resolve({}),
    });

    render(page);

    expect(outcomesMock).toHaveBeenCalledWith("program-bsed", { tab: "outcomes" });
    expect(screen.getByText(/BSED — Bachelor of Secondary Education/)).toBeInTheDocument();
    expect(screen.queryByText(/BEED/)).not.toBeInTheDocument();
  });

  it("renders the AI Insights view for the ai tab without running other view reads", async () => {
    const Page = await loadAnalyticsPage();
    const page = await Page({
      params: Promise.resolve({ programId: "program-bsed" }),
      searchParams: Promise.resolve({ tab: "ai" }),
    });

    render(page);

    expect(analyticsMock).toHaveBeenCalledWith("program-bsed", { tab: "ai" });
    expect(outcomesMock).not.toHaveBeenCalled();
    expect(trendsMock).not.toHaveBeenCalled();
    expect(stakeholdersMock).not.toHaveBeenCalled();
    expect(breakdownsMock).not.toHaveBeenCalled();
    expect(feedbackMock).not.toHaveBeenCalled();
    // The AI view is strictly on-demand: no generation starts on render.
    expect(screen.getByRole("button", { name: "Generate interpretation" })).toBeInTheDocument();
    expect(screen.getByText("On-demand interpretation")).toBeInTheDocument();
  });

  it("renders no analytics data when the outcomes read denies a selected Program", async () => {
    outcomesMock.mockResolvedValue(null);
    const Page = await loadAnalyticsPage();

    await expect(
      Page({
        params: Promise.resolve({ programId: "program-3" }),
        searchParams: Promise.resolve({}),
      })
    ).rejects.toThrow("NOT_FOUND");
    expect(outcomesMock).toHaveBeenCalledWith("program-3", { tab: "outcomes" });
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
      "/program-head/programs/program-bsed/analytics?tab=outcomes"
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
      programWideOutcomes: [],
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

  it("renders the first duplicate tab parameter without a redirect", async () => {
    const Page = await loadAnalyticsPage();

    const page = await Page({
      params: Promise.resolve({ programId: "program-bsed" }),
      searchParams: Promise.resolve({ tab: ["outcomes", "overview"] }),
    });

    expect(outcomesMock).toHaveBeenCalledWith("program-bsed", { tab: "outcomes" });
    expect(redirectMock).not.toHaveBeenCalled();
    render(page);
    const tabNav = screen.getByRole("navigation", { name: "Analytics views" });
    expect(within(tabNav).getByText("Outcomes")).toBeInTheDocument();
  });

  it("renders whitespace-padded tab values as their trimmed tab", async () => {
    trendsMock.mockResolvedValue({
      scope: {
        programCode: "BSED",
        programName: "Bachelor of Secondary Education",
        periodLabel: null,
      },
      periods: [],
      breaks: [],
      emptyReason: "no-evidence",
      periodOptions: { schoolYears: [], semesters: [], termInstances: [] },
    });
    const Page = await loadAnalyticsPage();

    await Page({
      params: Promise.resolve({ programId: "program-bsed" }),
      searchParams: Promise.resolve({ tab: " trends " }),
    });

    expect(redirectMock).not.toHaveBeenCalled();
    expect(trendsMock).toHaveBeenCalledWith("program-bsed", { tab: "trends" });
  });

  it("renders the trimmed trends tab through the shell when data exists", async () => {
    trendsMock.mockResolvedValue({
      scope: {
        programCode: "BSED",
        programName: "Bachelor of Secondary Education",
        periodLabel: null,
      },
      periods: [],
      breaks: [],
      emptyReason: "no-evidence",
      periodOptions: { schoolYears: [], semesters: [], termInstances: [] },
    });
    const Page = await loadAnalyticsPage();
    const page = await Page({
      params: Promise.resolve({ programId: "program-bsed" }),
      searchParams: Promise.resolve({ tab: " trends " }),
    });
    render(page);
    expect(screen.getByText(/BSED — Bachelor of Secondary Education/)).toBeInTheDocument();
  });

  it("shows the active-filter count on the mobile filter trigger", async () => {
    const schoolYearId = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
    const Page = await loadAnalyticsPage();
    const page = await Page({
      params: Promise.resolve({ programId: "program-bsed" }),
      searchParams: Promise.resolve({ schoolYearId }),
    });

    render(page);

    expect(screen.getByText("1 active")).toBeInTheDocument();
  });

  it("preserves valid canonical filters across every tab link", async () => {
    const schoolYearId = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
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
      programWideOutcomes: [],
      currentMappingDisclosure: "current mappings",
      manyToManyDisclosure: false,
      outcomes: [],
    });
    const Page = await loadAnalyticsPage();
    const page = await Page({
      params: Promise.resolve({ programId: "program-bsed" }),
      searchParams: Promise.resolve({ tab: "outcomes", schoolYearId, semester: "FIRST" }),
    });

    render(page);

    const trendsLink = screen.getByRole("link", { name: "Trends" });
    expect(trendsLink).toHaveAttribute(
      "href",
      `/program-head/programs/program-bsed/analytics?tab=trends&schoolYearId=${schoolYearId}&semester=FIRST`
    );
    // Tab links serialize filters with the tab parameter last.
    const outcomesLink = screen.getByRole("link", { name: "Outcomes" });
    expect(outcomesLink).toHaveAttribute(
      "href",
      `/program-head/programs/program-bsed/analytics?schoolYearId=${schoolYearId}&semester=FIRST&tab=outcomes`
    );
    expect(outcomesLink).toHaveAttribute("aria-current", "page");
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
            key: "CENTRAL_STUDENT:major-1",
            label: "Mathematics — Central student-respondent evidence",
            isUnspecified: false,
            meanRating: 4.0,
            ratingCount: 8,
            submittedResponseCount: 4,
          },
        ],
        unspecified: [
          {
            key: "unspecified:COURSE_STUDENT",
            label: "Unspecified — Course-bound student evidence",
            isUnspecified: true,
            meanRating: 3.5,
            ratingCount: 2,
            submittedResponseCount: 1,
          },
        ],
        attributionNote: "Major attribution comes only from central deployment targeting.",
      },
      yearLevelBreakdown: null,
    });
    const Page = await loadAnalyticsPage();
    const page = await Page({
      params: Promise.resolve({ programId: "program-bsed" }),
      searchParams: Promise.resolve({ tab: "courses" }),
    });

    render(page);

    expect(breakdownsMock).toHaveBeenCalledWith("program-bsed", { tab: "courses" });
    expect(analyticsMock).not.toHaveBeenCalled();
    expect(screen.getByText("Mean Rating by Course")).toBeInTheDocument();
    expect(screen.getAllByText("CS101 — Intro to CS").length).toBeGreaterThan(0);
    expect(screen.getByText("Mean Rating by Major")).toBeInTheDocument();
    expect(screen.getAllByText("Mathematics — Central student-respondent evidence").length).toBeGreaterThan(0);
    expect(screen.getByText("Unspecified — Course-bound student evidence")).toBeInTheDocument();
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
        searchParams: Promise.resolve({ tab: "courses" }),
      })
    ).rejects.toThrow("NOT_FOUND");
    expect(breakdownsMock).toHaveBeenCalledWith("program-3", { tab: "courses" });
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
      searchParams: Promise.resolve({ tab: "courses" }),
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

  it("renders the outcomes no-evidence empty state on the landing", async () => {
    const Page = await loadAnalyticsPage();
    const page = await Page({
      params: Promise.resolve({ programId: "program-bsed" }),
      searchParams: Promise.resolve({}),
    });

    render(page);

    expect(outcomesMock).toHaveBeenCalledWith("program-bsed", { tab: "outcomes" });
    expect(screen.getByText(/BSED — Bachelor of Secondary Education/)).toBeInTheDocument();
  });

  it("renders all 6 canonical tab navigation links", async () => {
    const Page = await loadAnalyticsPage();
    const page = await Page({
      params: Promise.resolve({ programId: "program-bsed" }),
      searchParams: Promise.resolve({}),
    });

    render(page);

    const tabNav = screen.getByRole("navigation", { name: "Analytics views" });
    expect(within(tabNav).getByText("Outcomes")).toBeInTheDocument();
    expect(within(tabNav).getByText("Courses")).toBeInTheDocument();
    expect(within(tabNav).getByText("Stakeholders")).toBeInTheDocument();
    expect(within(tabNav).getByText("Trends")).toBeInTheDocument();
    expect(within(tabNav).getByText("Qualitative")).toBeInTheDocument();
    expect(within(tabNav).getByText("AI Insights")).toBeInTheDocument();
  });

  it("renders the Feedback view without falling back to Overview", async () => {
    feedbackMock.mockResolvedValue({
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
      emptyReason: "no-qualitative-evidence",
      tokens: [],
      qualitativeItemCount: 0,
      qualitativeResponseCount: 0,
      sourceCounts: [],
      promptCounts: [],
      evidenceEvaluations: [],
    });
    const Page = await loadAnalyticsPage();
    const page = await Page({
      params: Promise.resolve({ programId: "program-bsed" }),
      searchParams: Promise.resolve({ tab: "qualitative" }),
    });

    render(page);

    expect(feedbackMock).toHaveBeenCalledWith("program-bsed", { tab: "qualitative" });
    expect(analyticsMock).not.toHaveBeenCalled();
    expect(screen.getByText("No qualitative evidence")).toBeInTheDocument();
    expect(screen.queryByText(/Feedback view is not available yet/)).not.toBeInTheDocument();
  });

  it("renders no Feedback data when the feedback read denies the selected Program", async () => {
    feedbackMock.mockResolvedValue(null);
    const Page = await loadAnalyticsPage();

    await expect(
      Page({
        params: Promise.resolve({ programId: "program-3" }),
        searchParams: Promise.resolve({ tab: "qualitative" }),
      })
    ).rejects.toThrow("NOT_FOUND");
    expect(feedbackMock).toHaveBeenCalledWith("program-3", { tab: "qualitative" });
    expect(analyticsMock).not.toHaveBeenCalled();
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


  it("redirects the legacy overview tab to the Program Head Dashboard", async () => {
    const Page = await loadAnalyticsPage();

    await expect(
      Page({
        params: Promise.resolve({ programId: "program-bsed" }),
        searchParams: Promise.resolve({ tab: "overview" }),
      })
    ).rejects.toThrow(/REDIRECT:/);

    expect(redirectMock).toHaveBeenCalledWith(
      "/program-head/programs/program-bsed/dashboard"
    );
    expect(analyticsMock).not.toHaveBeenCalled();
    expect(outcomesMock).not.toHaveBeenCalled();
  });

  it("redirects the legacy breakdowns tab to Courses with filters preserved", async () => {
    const Page = await loadAnalyticsPage();

    await expect(
      Page({
        params: Promise.resolve({ programId: "program-bsed" }),
        searchParams: Promise.resolve({ tab: "breakdowns", schoolYearId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890" }),
      })
    ).rejects.toThrow(/REDIRECT:/);

    expect(redirectMock).toHaveBeenCalledWith(
      "/program-head/programs/program-bsed/analytics?tab=courses&schoolYearId=a1b2c3d4-e5f6-7890-abcd-ef1234567890"
    );
    expect(breakdownsMock).not.toHaveBeenCalled();
  });

  it("redirects the legacy feedback tab to Qualitative with filters preserved", async () => {
    const Page = await loadAnalyticsPage();

    await expect(
      Page({
        params: Promise.resolve({ programId: "program-bsed" }),
        searchParams: Promise.resolve({ tab: "feedback" }),
      })
    ).rejects.toThrow(/REDIRECT:/);

    expect(redirectMock).toHaveBeenCalledWith(
      "/program-head/programs/program-bsed/analytics?tab=qualitative"
    );
    expect(feedbackMock).not.toHaveBeenCalled();
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
