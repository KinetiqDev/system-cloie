import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FacultyAnalyticsDashboard } from "@/features/analytics/components/faculty-analytics-dashboard";
import type { FacultyAnalyticsData, FacultyAnalyticsOptions } from "@/features/analytics/types";

const { pushMock, generateInsightMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  generateInsightMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("@/lib/actions/faculty-analytics-actions", () => ({
  generateFacultyAnalyticsInsightAction: generateInsightMock,
}));

const data: FacultyAnalyticsData = {
  filters: { view: "overview" },
  scopeLabel: "No evaluation evidence matches this scope.",
  evaluations: [],
  kpi: {
    submittedResponseCount: 0,
    opportunityCount: 0,
    responseRate: null,
    validRatingCount: 0,
    overallMean: null,
    overallScaleLabel: null,
    overallScaleMax: null,
    spansMultipleScales: false,
  },
  ratingDistributions: [],
  ciloMetrics: [],
  questionMetrics: [],
  trends: [],
  qualitative: {
    available: false,
    submittedResponseCount: 0,
    responseCount: 0,
    itemCount: 0,
    evaluationCount: 0,
    tokens: [],
    promptCounts: [],
  },
};

const options: FacultyAnalyticsOptions = {
  terms: [],
  courses: [],
  assignments: [],
  evaluations: [],
};

afterEach(() => {
  vi.restoreAllMocks();
  pushMock.mockReset();
});

describe("FacultyAnalyticsDashboard", () => {
  it("renders analytics view tabs as link tabs without Base UI button-semantic errors", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    render(<FacultyAnalyticsDashboard data={data} options={options} />);

    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(5);
    expect(tabs.every((tab) => tab.tagName === "A")).toBe(true);
    expect(screen.getByRole("tab", { name: "CILO results" })).toHaveAttribute(
      "href",
      "/faculty/analytics?view=cilos"
    );
    const consoleMessages = consoleError.mock.calls.flat().map(String);
    expect(consoleMessages).not.toEqual(
      expect.arrayContaining([expect.stringContaining("expected a native <button>")])
    );
  });

  it("groups repeated CILO labels under their course and evaluation context", () => {
    const scaleGroup = {
      scaleKey: "scale-1",
      scaleLabel: "1–5 (5-point)",
      scaleMin: 1,
      scaleMax: 5,
      mean: 4.5,
      ratingCount: 2,
      responseCount: 2,
      excludedRatingCount: 0,
      categories: [],
    };
    const ciloData: FacultyAnalyticsData = {
      ...data,
      filters: { view: "cilos" },
      evaluations: [
        {
          id: "evaluation-1",
          deploymentName: "Capstone exit evaluation",
          assignmentId: "assignment-1",
          courseId: "course-1",
          courseCode: "ITRES1",
          courseTitle: "Capstone Project 1",
          classLabel: "BSIT · 4th year · Morning",
          programName: "BSIT",
          termInstanceId: "term-1",
          termInstanceLabel: "2026–2027 · 2nd Semester",
          status: "CLOSED",
          responseCount: 2,
          opportunityCount: 2,
        },
      ],
      ciloMetrics: [
        {
          key: "binding-1",
          ciloId: "cilo-1",
          courseId: "course-1",
          courseCode: "ITRES1",
          courseTitle: "Capstone Project 1",
          evaluationId: "evaluation-1",
          evaluationName: "Capstone exit evaluation",
          label: "CILO 1",
          description: "Defend the proposed capstone scope and methodology.",
          questionPrompt: "I achieved the first course intended learning outcome.",
          scaleGroups: [scaleGroup],
        },
        {
          key: "binding-2",
          ciloId: "cilo-2",
          courseId: "course-2",
          courseCode: "IT201",
          courseTitle: "Data Structures",
          evaluationId: "evaluation-2",
          evaluationName: "End-of-term evaluation",
          label: "CILO 1",
          description:
            "Implement fundamental data structures (arrays, linked lists, trees, graphs) in a programming language.",
          questionPrompt: "I achieved the first course intended learning outcome.",
          scaleGroups: [{ ...scaleGroup, scaleKey: "scale-2" }],
        },
      ],
    };

    render(<FacultyAnalyticsDashboard data={ciloData} options={options} />);

    expect(screen.getByRole("heading", { name: "Capstone Project 1" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Data Structures" })).toBeInTheDocument();
    expect(screen.getAllByText("CILO 1")).toHaveLength(4);
    expect(screen.getAllByText("ITRES1").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("IT201").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("Capstone exit evaluation").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("End-of-term evaluation").length).toBeGreaterThanOrEqual(2);
    expect(
      screen.getByText(
        "The highest CILO mean is shared by 2 CILOs (4.50). The lowest is shared by 2 CILOs (4.50)."
      )
    ).toBeInTheDocument();
  });

  it("shows an accessible, reduced-motion-safe skeleton while AI interpretation is pending", async () => {
    const { promise } = Promise.withResolvers<never>();
    generateInsightMock.mockReturnValue(promise);
    const loadingData: FacultyAnalyticsData = {
      ...data,
      evaluations: [
        {
          id: "evaluation-1",
          deploymentName: "End-of-term evaluation",
          assignmentId: "assignment-1",
          courseId: "course-1",
          courseCode: "IT201",
          courseTitle: "Data Structures",
          classLabel: "BSIT · 2nd year · Morning",
          programName: "BSIT",
          termInstanceId: "term-1",
          termInstanceLabel: "2026–2027 · 1st Semester",
          status: "CLOSED",
          responseCount: 1,
          opportunityCount: 1,
        },
      ],
      kpi: { ...data.kpi, submittedResponseCount: 1, validRatingCount: 1 },
    };

    render(<FacultyAnalyticsDashboard data={loadingData} options={options} />);

    const statuses = await screen.findAllByRole("status", { name: "Generating AI insight" });
    expect(statuses).toHaveLength(2);
    for (const status of statuses) {
      expect(status).toHaveAttribute("aria-busy", "true");
      const skeletons = status.querySelectorAll('[data-slot="skeleton"]');
      expect(skeletons).toHaveLength(3);
      expect(skeletons[0]).toHaveClass("animate-pulse", "motion-reduce:animate-none");
    }
  });
});
