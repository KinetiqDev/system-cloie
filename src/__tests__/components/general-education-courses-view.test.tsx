import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GeneralEducationCoursesView } from "@/features/analytics/components/general-education-courses-view";
import type { GeneralEducationCourseBreakdownRow } from "@/features/analytics/general-education-analytics-types";
import type { GeneralEducationAnalyticsFilterState } from "@/features/analytics/services/general-education-analytics-state";

vi.mock("@/features/analytics/components/general-education-inline-ai-insight", () => ({
  GeneralEducationInlineAiInsight: ({
    view,
    evidenceBasis,
  }: {
    view: string;
    evidenceBasis: string;
  }) => <div>{`AI insight [${view}]: ${evidenceBasis}`}</div>,
}));

// Recharts is not the subject here; the stubs expose the exact series and
// groups each view hands across the client boundary, which is where scale
// separation, response-rate availability, and normalization are decided.
vi.mock("@/features/analytics/components/general-education-analytics-visualizations", () => ({
  LazyGeneralEducationScaleMeanChart: ({
    series,
  }: {
    series: Array<{
      key: string;
      scaleLabel: string;
      rows: Array<{ label: string; meanRating: number | null; ratingCount: number }>;
    }>;
  }) => (
    <ul aria-label="Scale-mean series">
      {series.map((entry) => (
        <li key={entry.key}>
          {entry.scaleLabel}:{" "}
          {entry.rows.map((row) => `${row.label}=${row.meanRating ?? "—"}`).join(", ")}
        </li>
      ))}
    </ul>
  ),
  LazyGeneralEducationResponseRateChart: ({
    rows,
  }: {
    rows: Array<{ label: string; responseRate: number | null }>;
  }) => (
    <ul aria-label="Response-rate rows">
      {rows.map((row) => (
        <li key={row.label}>{`${row.label}=${row.responseRate ?? "—"}`}</li>
      ))}
    </ul>
  ),
  LazyGeneralEducationDistributionChart: ({
    groups,
  }: {
    groups: Array<{ key: string; label: string; scaleLabel: string | null }>;
  }) => (
    <ul aria-label="Distribution groups">
      {groups.map((group) => (
        <li key={group.key}>{`${group.label} on ${group.scaleLabel ?? "no scale"}`}</li>
      ))}
    </ul>
  ),
}));

const FILTERS = {
  tab: "courses",
  termInstanceId: "11111111-1111-4111-8111-111111111111",
  yearLevel: "SECOND_YEAR",
} as GeneralEducationAnalyticsFilterState;

const RESET_HREF = "/gen-ed-coordinator/analytics?tab=courses";

const reviewHref = (courseId: string) =>
  "/gen-ed-coordinator/responses?termInstanceId=11111111-1111-4111-8111-111111111111" +
  `&courseId=${courseId}&yearLevel=SECOND_YEAR`;

function courseRow(
  overrides: Partial<GeneralEducationCourseBreakdownRow> = {}
): GeneralEducationCourseBreakdownRow {
  return {
    courseId: "course-ethics",
    courseCode: "GEETHICS",
    courseTitle: "Ethics",
    sectionCount: 3,
    programCount: 2,
    evaluationOpportunityCount: 20,
    submittedResponseCount: 10,
    responseRate: 0.5,
    meanRating: 4.25,
    ratingCount: 30,
    excludedRatingCount: 0,
    spansMultipleScales: false,
    instrumentContext: "Five-point instrument",
    scaleGroups: [
      {
        scaleKey: "scale-5",
        scaleLabel: "1–5 (5-point)",
        meanRating: 4.25,
        ratingCount: 30,
        submittedResponseCount: 10,
        distribution: {
          scaleLabel: "1–5 (5-point)",
          maxValue: 5,
          categories: [
            { value: 4, label: null, count: 20, percentage: 0.667 },
            { value: 5, label: null, count: 10, percentage: 0.333 },
          ],
        },
      },
    ],
    alignedIlos: [{ id: "ilo-1", code: "ILO-1" }],
    previousComparable: { periodLabel: "2025-2026 · 2nd Sem", meanRating: 4.0, change: 0.25 },
    evidenceEvaluations: [{ evaluationId: "eval-1", deploymentName: "GEETHICS Post-Term" }],
    sections: [
      {
        evaluationId: "eval-1",
        programCode: "BSED",
        yearLevel: "SECOND_YEAR",
        section: "MORNING",
        facultyName: "Dr. Santos",
        submittedResponseCount: 6,
        evaluationOpportunityCount: 8,
        meanRating: 4.5,
      },
      {
        evaluationId: "eval-2",
        programCode: "BSBA",
        yearLevel: "SECOND_YEAR",
        section: "EVENING",
        facultyName: "Dr. Lim",
        submittedResponseCount: 4,
        evaluationOpportunityCount: 12,
        meanRating: null,
      },
    ],
    ...overrides,
  };
}

function renderView(
  rows: GeneralEducationCourseBreakdownRow[],
  emptyReason: "no-assignments" | "no-submissions" | null = null
) {
  return render(
    <GeneralEducationCoursesView
      rows={rows}
      emptyReason={emptyReason}
      resetHref={RESET_HREF}
      filters={FILTERS}
    />
  );
}

describe("GeneralEducationCoursesView", () => {
  afterEach(cleanup);

  it("keeps a course measured on two scales in two series rather than one blended mean", () => {
    renderView([
      courseRow({
        spansMultipleScales: true,
        scaleGroups: [
          courseRow().scaleGroups[0],
          {
            scaleKey: "scale-4",
            scaleLabel: "1–4 (4-point)",
            meanRating: 3.4,
            ratingCount: 12,
            submittedResponseCount: 6,
            distribution: {
              scaleLabel: "1–4 (4-point)",
              maxValue: 4,
              categories: [{ value: 3, label: null, count: 4, percentage: 0.333 }],
            },
          },
        ],
      }),
    ]);

    const series = within(screen.getByRole("list", { name: "Scale-mean series" }));
    expect(series.getAllByText(/GEETHICS — Ethics=/)).toHaveLength(2);
    expect(series.getByText("1–5 (5-point): GEETHICS — Ethics=4.25")).toBeInTheDocument();
    expect(series.getByText("1–4 (4-point): GEETHICS — Ethics=3.4")).toBeInTheDocument();

    // The cross-scale notice names exactly the courses that pool two scales.
    expect(screen.getByText(/Course means pool more than one rating scale/)).toBeInTheDocument();
  });

  it("reports a course with no evaluation opportunity as unavailable, never 0%", () => {
    renderView([
      courseRow({
        courseId: "course-nopp",
        courseCode: "GEMATH",
        courseTitle: "Mathematics",
        responseRate: null,
        evaluationOpportunityCount: 0,
        submittedResponseCount: 0,
        sections: [],
      }),
    ]);
    const table = screen.getByRole("table", { name: "Exact values by General Education course" });
    const row = within(table).getByText("GEMATH").closest("tr") as HTMLElement;
    // No evaluation opportunity means the rate is unavailable, never 0.0%.
    expect(within(row).getAllByText("—")).toHaveLength(1);
    expect(within(row).getByText("0/0")).toBeInTheDocument();

    const rates = within(screen.getByRole("list", { name: "Response-rate rows" }));
    expect(rates.getByText("GEMATH — Mathematics=—")).toBeInTheDocument();
  });

  it("normalizes each course's distribution against its own scale", () => {
    renderView([
      courseRow({
        scaleGroups: [
          courseRow().scaleGroups[0],
          {
            scaleKey: "scale-4",
            scaleLabel: "1–4 (4-point)",
            meanRating: 3.4,
            ratingCount: 12,
            submittedResponseCount: 6,
            distribution: {
              scaleLabel: "1–4 (4-point)",
              maxValue: 4,
              categories: [{ value: 3, label: null, count: 4, percentage: 0.333 }],
            },
          },
        ],
      }),
    ]);

    const groups = within(screen.getByRole("list", { name: "Distribution groups" }));
    expect(groups.getByText("GEETHICS · 1–5 (5-point) on 1–5 (5-point)")).toBeInTheDocument();
    expect(groups.getByText("GEETHICS · 1–4 (4-point) on 1–4 (4-point)")).toBeInTheDocument();
  });

  it("distinguishes a course with no resolved scale from one with no ILO mapping", () => {
    renderView([
      courseRow({
        courseId: "course-bare",
        courseCode: "GEHIST",
        courseTitle: "History",
        scaleGroups: [],
        alignedIlos: [],
        previousComparable: null,
        meanRating: null,
        sections: [],
      }),
    ]);

    const table = screen.getByRole("table", { name: "Exact values by General Education course" });
    const row = within(table).getByText("GEHIST").closest("tr") as HTMLElement;
    // Both absences are stated; neither is rendered as a fabricated value.
    expect(within(row).getByText("No active ILO mapping")).toBeInTheDocument();
    expect(within(row).getByText("No comparable period")).toBeInTheDocument();
    expect(within(row).getAllByText("—")).toHaveLength(2); // mean and unresolved scale
  });

  it("marks excluded ratings, thin samples, and the change against a comparable period", () => {
    renderView([
      courseRow({
        submittedResponseCount: 3,
        ratingCount: 9,
        excludedRatingCount: 4,
        previousComparable: { periodLabel: "2025-2026 · 2nd Sem", meanRating: 4.0, change: -0.4 },
      }),
    ]);

    const table = screen.getByRole("table", { name: "Exact values by General Education course" });
    expect(within(table).getByText("4 excluded")).toBeInTheDocument();
    expect(within(table).getByText("Thin sample: 3 submitted responses")).toBeInTheDocument();
    expect(within(table).getByText("-0.40")).toBeInTheDocument();
    expect(within(table).getByText("vs 2025-2026 · 2nd Sem")).toBeInTheDocument();
  });

  it("scopes identified review per course inside the current filter window", () => {
    renderView([
      courseRow(),
      courseRow({ courseId: "course-math", courseCode: "GEMATH", courseTitle: "Mathematics" }),
    ]);

    const table = screen.getByRole("table", { name: "Exact values by General Education course" });
    const ethicsLink = within(table).getByText("GEETHICS").closest("tr") as HTMLElement;
    const mathLink = within(table).getByText("GEMATH").closest("tr") as HTMLElement;
    // Each row opens the same academic window with its own course applied.
    expect(within(ethicsLink).getByRole("link", { name: "Review responses" })).toHaveAttribute(
      "href",
      reviewHref("course-ethics")
    );
    expect(within(mathLink).getByRole("link", { name: "Review responses" })).toHaveAttribute(
      "href",
      reviewHref("course-math")
    );
  });

  it("offers a section drill-down only for a course that has sections", () => {
    renderView([
      courseRow(),
      courseRow({
        courseId: "course-nosections",
        courseCode: "GEHIST",
        courseTitle: "History",
        sections: [],
      }),
    ]);

    // The trigger is a native <summary>, so it is addressed by its label.
    expect(screen.getByText("Sections for GEETHICS (2)")).toBeInTheDocument();
    expect(screen.queryByText(/Sections for GEHIST/)).toBeNull();
  });

  it("describes a section by its class context, with an unavailable mean kept distinct", () => {
    renderView([courseRow()]);

    const table = screen.getByRole("table", { name: "Sections for GEETHICS" });
    expect(within(table).getByText("MORNING")).toBeInTheDocument();
    expect(within(table).getByText("Dr. Santos")).toBeInTheDocument();
    expect(within(table).getByText("6 / 8")).toBeInTheDocument();
    expect(within(table).getByText("4.50")).toBeInTheDocument();
    // A section with no valid rating reports unavailable, not a zero.
    expect(within(table).getByText("—")).toBeInTheDocument();
    expect(within(table).getByText("4 / 12")).toBeInTheDocument();
  });

  it("mounts exactly one insight carrying the counted evidence basis", () => {
    renderView([
      courseRow(),
      courseRow({ courseId: "course-math", submittedResponseCount: 1, ratingCount: 2 }),
    ]);

    const insights = screen.getAllByText(/^AI insight /);
    expect(insights).toHaveLength(1);
    expect(insights[0]).toHaveTextContent(
      "AI insight [courses]: 11 submitted responses and 32 valid ratings across 2 courses"
    );
  });

  it("states the singular evidence basis when exactly one course responded", () => {
    renderView([courseRow()]);

    expect(
      screen.getByText(
        "AI insight [courses]: 10 submitted responses and 30 valid ratings across 1 course"
      )
    ).toBeInTheDocument();
  });

  it("reports responses no course can be attributed to without charts", () => {
    renderView([]);

    expect(screen.getByText("No course evidence in this scope")).toBeInTheDocument();
    expect(
      screen.getByText(/none belong to a course that can be broken down here/)
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("table", { name: "Exact values by General Education course" })
    ).toBeNull();
    expect(screen.queryByRole("list", { name: "Scale-mean series" })).toBeNull();
    expect(
      screen.getByText("AI insight [courses]: No General Education course evidence in this scope")
    ).toBeInTheDocument();
  });

  it("reports a scope with no assignments or submissions once, with a single reset action", () => {
    renderView([], "no-assignments");
    expect(screen.getByText("No evaluation assignments")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View all periods" })).toHaveAttribute(
      "href",
      RESET_HREF
    );
    expect(screen.queryByText("No course evidence in this scope")).toBeNull();
    cleanup();

    renderView([], "no-submissions");
    expect(screen.getByText("No submitted responses")).toBeInTheDocument();
    expect(screen.queryByText("No course evidence in this scope")).toBeNull();
  });
});
