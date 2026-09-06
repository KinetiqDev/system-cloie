import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GeneralEducationAnalyticsWorkspace } from "@/features/analytics/components/general-education-analytics-workspace";
import type { GeneralEducationAnalyticsDTO } from "@/features/analytics/general-education-analytics-types";

const mockDTO: GeneralEducationAnalyticsDTO = {
  scope: { periodLabel: "2025-2026 · 1st Semester · 1st Term" },
  kpi: {
    submittedResponseCount: 12,
    evaluationOpportunityCount: 20,
    responseRate: 0.6,
    ratingCount: 48,
    meanRating: 4.25,
  },
  emptyReason: null,
  periodOptions: {
    schoolYears: [{ id: "sy-2025", label: "2025-2026" }],
    semesters: [{ value: "FIRST", label: "1st Semester" }],
    termInstances: [
      {
        id: "term-1",
        schoolYearId: "sy-2025",
        schoolYearLabel: "2025-2026",
        semester: "FIRST",
        semesterLabel: "1st Semester",
        termLabel: "1st Term",
        label: "2025-2026 · 1st Semester · 1st Term",
      },
    ],
  },
  courseBreakdowns: [
    {
      courseId: "c-1",
      courseCode: "GE 101",
      courseTitle: "Understanding the Self",
      meanRating: 4.5,
      ratingCount: 24,
      submittedResponseCount: 6,
      scaleLabel: "1–5 (5-point)",
      evaluationIds: ["eval-1"],
    },
  ],
  trends: {
    periods: [],
    breaks: [],
    emptyReason: null,
  },
  feedback: {
    tokens: [],
    qualitativeResponseCount: 0,
    qualitativeItemCount: 0,
    promptCounts: [],
    evidenceEvaluations: [],
  },
};

describe("GeneralEducationAnalyticsWorkspace Filter Controls", () => {
  it("renders single consolidated Academic Term filter and eliminates redundant School Year and Semester selects", () => {
    render(<GeneralEducationAnalyticsWorkspace data={mockDTO} filters={{}} />);

    expect(screen.getAllByLabelText("Academic Term").length).toBeGreaterThan(0);
    expect(screen.queryByLabelText("School Year")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Semester")).not.toBeInTheDocument();
  });

  it("shows active filter indicator and renders conditional Reset link when filter is applied", () => {
    const { rerender } = render(
      <GeneralEducationAnalyticsWorkspace data={mockDTO} filters={{}} />
    );

    expect(screen.getAllByText("All periods").length).toBeGreaterThan(0);
    expect(screen.queryByRole("link", { name: "Reset filters" })).not.toBeInTheDocument();

    rerender(
      <GeneralEducationAnalyticsWorkspace
        data={mockDTO}
        filters={{ termInstanceId: "term-1" }}
      />
    );

    expect(screen.getByText("1 filter active")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Reset filters" })).toHaveAttribute(
      "href",
      "/gen-ed-coordinator/analytics"
    );
  });

  it("opens mobile drawer with scope filters and Apply button", async () => {
    render(
      <GeneralEducationAnalyticsWorkspace
        data={mockDTO}
        filters={{ termInstanceId: "term-1" }}
      />
    );

    const drawerTrigger = screen.getByRole("button", { name: /Scope filters/ });
    expect(drawerTrigger).toBeInTheDocument();
    fireEvent.click(drawerTrigger);

    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Analytics scope filters")).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Academic Term")).toBeInTheDocument();
    expect(within(dialog).queryByLabelText("School Year")).not.toBeInTheDocument();
    expect(within(dialog).queryByLabelText("Semester")).not.toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Apply" })).toBeInTheDocument();
  });
});
