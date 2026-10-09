import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DeanValueChart } from "@/features/analytics/components/dean-charts";
import { DeanEvidenceView } from "@/features/analytics/components/dean-evidence-view";
import { ProgramHeadBreakdownsView } from "@/features/analytics/components/program-head-breakdowns-view";
import type {
  ProgramHeadBreakdownsDTO,
  ProgramHeadProgramWideOutcomeDTO,
} from "@/features/analytics/program-head-analytics-types";

vi.mock("@/features/analytics/components/dean-visualizations", async () => {
  const charts = await import("@/features/analytics/components/dean-charts");
  return {
    LazyDeanValueChart: charts.DeanValueChart,
    LazyDeanShareChart: charts.DeanShareChart,
    LazyDeanTrendChart: charts.DeanTrendChart,
  };
});
vi.mock("@/features/analytics/components/program-head-analytics-visualizations", async () => {
  const charts = await import("@/features/analytics/components/program-head-comparison-chart");
  const outcome = await import("@/features/analytics/components/outcome-mean-bar-chart");
  return {
    LazyProgramHeadComparisonChart: charts.ProgramHeadComparisonChart,
    LazyOutcomeMeanBarChart: outcome.OutcomeMeanBarChart,
  };
});

const data: ProgramHeadBreakdownsDTO = {
  scope: { programCode: "P", programName: "Program", periodLabel: null },
  periodOptions: { schoolYears: [], semesters: [], termInstances: [] },
  emptyReason: null,
  courseRows: [
    {
      key: "mixed-course",
      label: "MIX — Mixed scales",
      courseCode: "MIX",
      isUnspecified: false,
      meanRating: null,
      ratingCount: 2,
      submittedResponseCount: 2,
      scaleGroups: [
        {
          scaleKey: "five",
          scaleLabel: "1–5 (5-point)",
          meanRating: 4,
          ratingCount: 1,
          submittedResponseCount: 1,
        },
        {
          scaleKey: "ten",
          scaleLabel: "1–10 (10-point)",
          meanRating: 8,
          ratingCount: 1,
          submittedResponseCount: 1,
        },
      ],
      instrumentContext: "Five-point v1, Ten-point v1",
      evidenceEvaluations: [],
    },
    {
      key: "five-course",
      label: "FIVE — Five-point course",
      courseCode: "FIVE",
      isUnspecified: false,
      meanRating: 3,
      ratingCount: 1,
      submittedResponseCount: 1,
      scaleGroups: [
        {
          scaleKey: "five",
          scaleLabel: "1–5 (5-point)",
          meanRating: 3,
          ratingCount: 1,
          submittedResponseCount: 1,
        },
      ],
      instrumentContext: "Five-point v1",
      evidenceEvaluations: [],
    },
    {
      key: "different-labels",
      label: "LABELS — Different descriptor meanings",
      courseCode: "LABELS",
      isUnspecified: false,
      meanRating: 5,
      ratingCount: 1,
      submittedResponseCount: 1,
      scaleGroups: [
        {
          scaleKey: "different-five",
          scaleLabel: "1–5 (5-point)",
          meanRating: 5,
          ratingCount: 1,
          submittedResponseCount: 1,
        },
      ],
      instrumentContext: "Agreement v1",
      evidenceEvaluations: [],
    },
  ],
  instrumentRows: [],
  majorBreakdown: null,
  yearLevelBreakdown: null,
};

function insight(region: HTMLElement): string {
  return document.getElementById(region.getAttribute("aria-describedby")!)!.textContent!;
}

describe("Course-scale comparisons", () => {
  it("keeps Dean rankings inside one frozen descriptor identity even when range labels match", () => {
    render(
      <DeanEvidenceView
        filters={{ view: "courses", programId: "program" }}
        evidence={{
          kind: "courses",
          program: { id: "program", code: "P", name: "Program", is_active: true },
          college: {
            programs: [],
            periods: [],
            evidence: [],
            programRows: [],
            invalidPeriod: false,
            summary: {
              opportunities: 0,
              submitted: 0,
              rate: null,
              deployments: 0,
              active: 0,
              closedIncomplete: 0,
            },
          },
          data,
        }}
      />
    );
    const regions = screen.getAllByRole("region", { name: /Average rating by course/ });
    expect(regions).toHaveLength(3);
    expect(insight(regions[0])).toBe("Highest: MIX 4.00. Lowest: FIVE 3.00.");
    expect(insight(regions[1])).toBe("MIX: 8.00.");
    expect(insight(regions[2])).toBe("LABELS: 5.00.");
    expect(regions[0]).toHaveAccessibleName(/1–5 \(5-point\).*scale group/);
    expect(regions[1]).toHaveAccessibleName(/1–10 \(10-point\)/);
    expect(screen.queryByText(/6\.00/)).not.toBeInTheDocument();
  });

  it("keeps General Education course comparisons scale-separated in the Dean institutional view", () => {
    render(
      <DeanEvidenceView
        filters={{ view: "institutional" }}
        evidence={{
          kind: "institutional",
          college: {
            programs: [],
            periods: [],
            evidence: [],
            programRows: [],
            invalidPeriod: false,
            summary: {
              opportunities: 0,
              submitted: 0,
              rate: null,
              deployments: 0,
              active: 0,
              closedIncomplete: 0,
            },
          },
          outcomes: null,
          trends: null,
          feedback: null,
          courses: {
            emptyReason: null,
            rows: data.courseRows.map((row) => ({
              courseId: row.key,
              courseCode: row.courseCode,
              courseTitle: row.label,
              sectionCount: 1,
              programCount: 1,
              evaluationOpportunityCount: row.submittedResponseCount,
              submittedResponseCount: row.submittedResponseCount,
              responseRate: 1,
              meanRating: row.meanRating,
              ratingCount: row.ratingCount,
              excludedRatingCount: 0,
              spansMultipleScales: row.scaleGroups.length > 1,
              instrumentContext: row.instrumentContext,
              scaleGroups: row.scaleGroups.map((scale) => ({
                ...scale,
                distribution: { scaleLabel: scale.scaleLabel, maxValue: 10, categories: [] },
              })),
              alignedIlos: [],
              previousComparable: null,
              evidenceEvaluations: [],
              sections: [],
            })),
          },
        }}
      />
    );
    const regions = screen.getAllByRole("region", { name: /Average rating by course/ });
    expect(regions).toHaveLength(3);
    expect(insight(regions[0])).toBe("Highest: MIX 4.00. Lowest: FIVE 3.00.");
    expect(insight(regions[1])).toBe("MIX: 8.00.");
    expect(screen.queryByText(/6\.00/)).not.toBeInTheDocument();
  });

  it("retains the actual Recharts plot and benchmark when presentation is composed through helpers", () => {
    const { container } = render(
      <DeanValueChart
        title="PO ratings"
        valueLabel="Average"
        format="mean"
        benchmark={3.5}
        rows={[{ key: "po", label: "PO1", value: 4 }]}
        emptyText="None"
      />
    );
    expect(container.querySelector(".recharts-bar-rectangle path")).not.toBeNull();
    expect(container.querySelector(".recharts-reference-line")).not.toBeNull();
    expect(screen.getByText("Target 3.50")).toBeInTheDocument();
    expect(insight(screen.getByRole("region", { name: "PO ratings" }))).toBe("PO1: 4.00.");
  });

  it("preserves per-scale evidence and authorized drill-through in the Program Head course view", () => {
    render(
      <ProgramHeadBreakdownsView
        programId="program"
        resetHref="/analytics"
        data={{
          ...data,
          courseRows: data.courseRows.map((row) => ({
            ...row,
            evidenceEvaluations: [{ evaluationId: "eval-1", deploymentName: "Course evaluation" }],
          })),
        }}
      />
    );
    const regions = screen.getAllByRole("region", { name: /Mean Rating by Course/ });
    expect(regions).toHaveLength(3);
    expect(insight(regions[0])).toContain("Highest Mean Rating: MIX — Mixed scales (4.00)");
    expect(insight(regions[0])).toContain("Lowest Mean Rating: FIVE — Five-point course (3.00)");
    expect(insight(regions[1])).toContain("8.00");
    expect(insight(regions[2])).toContain("5.00");
    expect(screen.queryByText(/6\.00/)).not.toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Course evaluation" })[0]).toHaveAttribute(
      "href",
      "/program-head/programs/program/responses/course/eval-1"
    );
  });
});

describe("Dean program-wide scale separation", () => {
  const programWideRow = (
    outcomeId: string,
    code: string,
    labels: Array<[number, string | null]>
  ) => {
    const maxValue = labels[labels.length - 1][0];
    const scaleLabel = `1–${maxValue} (${labels.length}-point)`;
    const mean = labels.reduce((sum, [value]) => sum + value, 0) / labels.length;
    return {
      stakeholder: "STUDENT" as const,
      poId: outcomeId,
      code,
      name: `${code} outcome`,
      meanRating: mean,
      ratingCount: labels.length,
      submittedResponseCount: labels.length,
      evaluationCount: 1,
      questionCount: 1,
      attainment: undefined,
      evidenceSummary: { scaleLabel, explanation: "" },
      scaleGroups: [
        {
          scaleKey: JSON.stringify(labels.map(([value, label]) => ({ value, label }))),
          scaleLabel,
          meanRating: mean,
          ratingCount: labels.length,
        },
      ],
    };
  };

  /** A classified mean only exists on an approved five-point descriptor set. */
  const fivePoint = (
    outcomeId: string,
    code: string,
    classified: boolean
  ): ProgramHeadProgramWideOutcomeDTO => ({
    ...programWideRow(outcomeId, code, [
      [1, "Not Achieved"],
      [2, "Slightly Achieved"],
      [3, "Moderately Achieved"],
      [4, "Mostly Achieved"],
      [5, "Fully Achieved"],
    ]),
    attainment: classified
      ? {
          policyId: "CLOIE_OUTCOME_MEAN_V1",
          benchmark: 3.5,
          status: "classified",
          interpretation: "Attained",
          cqi: "Meets Benchmark",
          meetsBenchmark: true,
          scaleKind: "direct-attainment",
          isIndirect: false,
        }
      : undefined,
  });

  function deanView(programWideOutcomes: ProgramHeadProgramWideOutcomeDTO[]) {
    return render(
      <DeanEvidenceView
        filters={{ view: "outcomes", programId: "program" }}
        evidence={{
          kind: "outcomes",
          program: { id: "program", code: "P", name: "Program", is_active: true },
          college: {
            programs: [],
            periods: [],
            evidence: [],
            programRows: [],
            invalidPeriod: false,
            summary: {
              opportunities: 0,
              submitted: 0,
              rate: null,
              deployments: 0,
              active: 0,
              closedIncomplete: 0,
            },
          },
          data: {
            scope: { programCode: "P", programName: "Program", periodLabel: null },
            periodOptions: { schoolYears: [], semesters: [], termInstances: [] },
            outcomes: [],
            programWideOutcomes,
            currentMappingDisclosure: "",
            manyToManyDisclosure: false,
            emptyReason: null,
          },
          catalog: [],
          alignment: null,
          alignmentUnavailable: false,
          alignmentBasis: "Live active-period readiness",
        }}
      />
    );
  }

  it("charts each program-wide stakeholder scale separately and never ranks across them", () => {
    deanView([
      programWideRow("po-a", "PO1", [
        [1, null],
        [2, null],
        [3, null],
        [4, null],
      ]),
      programWideRow("po-b", "PO2", [
        [1, null],
        [2, null],
        [3, null],
        [4, null],
        [5, null],
        [6, null],
        [7, null],
      ]),
    ]);
    const regions = screen.getAllByRole("region", { name: /Average rating by group and PO/ });
    expect(regions).toHaveLength(2);
    // The seven-point 7.00 is never ranked above the four-point 2.50.
    expect(screen.queryByText(/Highest:.*7\.00/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Lowest:.*2\.50/)).not.toBeInTheDocument();
    expect(regions[0]).toHaveAccessibleName(/4-point/);
    expect(regions[1]).toHaveAccessibleName(/7-point/);
  });

  it("discloses the scale of every ranked program-wide row", () => {
    deanView([
      programWideRow("po-a", "PO1", [
        [1, null],
        [2, null],
        [3, null],
        [4, null],
      ]),
    ]);
    const region = screen.getByRole("region", { name: /Average rating by group and PO/ });
    expect(region).toHaveAccessibleName(/4-point/);
    // The exact-value table discloses the scale the ranked rows sit on.
    expect(screen.getAllByText(/Students · PO1/).length).toBeGreaterThan(0);
    expect(
      screen.getByRole("table", { name: /Average rating by group and PO/ })
    ).toBeInTheDocument();
  });
  it("draws the 3.50 benchmark only on the scale identity the policy classified", () => {
    deanView([
      fivePoint("po-classified", "PO1", true),
      programWideRow("po-unsupported", "PO2", [
        [1, null],
        [2, null],
        [3, null],
        [4, null],
      ]),
    ]);
    const regions = screen.getAllByRole("region", { name: /Average rating by group and PO/ });
    expect(regions).toHaveLength(2);
    expect(screen.getByText("Target 3.50")).toBeInTheDocument();
    // The four-point group carries no benchmark: the policy classifies no
    // scale other than the three approved five-point descriptor sets, so the
    // target would present a threshold the policy does not define.
    expect(regions[0]).toHaveAccessibleName(/5-point/);
    expect(regions[1]).toHaveAccessibleName(/4-point/);
    expect(regions[0].querySelector(".recharts-reference-line")).not.toBeNull();
    expect(regions[1].querySelector(".recharts-reference-line")).toBeNull();
  });
});
