import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FacultyAnalyticsDashboard } from "@/features/analytics/components/faculty-analytics-dashboard";
import type { FacultyAnalyticsData, FacultyAnalyticsOptions } from "@/features/analytics/types";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
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
});
