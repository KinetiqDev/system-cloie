import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { OutcomeMeanBarChart } from "@/features/analytics/components/outcome-mean-bar-chart";
import { classifyOutcomeDistributions } from "@/features/analytics/aggregators/outcome-attainment";
import {
  GRADUATE_OUTCOME_LABELS,
  INSTITUTIONAL_OUTCOME_LABELS,
  type OutcomeEvidenceDTO,
} from "@/features/analytics/outcome-evidence-types";

function outcomeDTO(overrides: Partial<OutcomeEvidenceDTO> = {}): OutcomeEvidenceDTO {
  return {
    outcomeId: "outcome-a",
    code: "BSIT-GO1",
    name: "Apply computing and IT solutions",
    meanRating: 3.87,
    ratingCount: 54,
    submittedResponseCount: 18,
    contributingCilos: [],
    contributingCourses: [],
    contributors: [],
    evidenceEvaluations: [],
    distributions: [
      {
        scaleLabel: "1–5 (5-point)",
        maxValue: 5,
        categories: [
          { value: 1, label: null, count: 0, percentage: 0 },
          { value: 2, label: null, count: 0, percentage: 0 },
          { value: 3, label: null, count: 1, percentage: 1 / 3 },
          { value: 4, label: null, count: 2, percentage: 2 / 3 },
          { value: 5, label: null, count: 0, percentage: 0 },
        ],
      },
    ],
    spansMultipleScales: false,
    excludedRatingCount: 0,
    evidenceSummary: { ratingCount: 54, explanation: "Mean of 54 valid ratings." },
    ...overrides,
  };
}

/**
 * Bar extents read straight off the Recharts rectangle path. Arc segments are
 * stripped so the remaining coordinate pairs are the rectangle corners;
 * jsdom has no SVG layout engine, so `getBBox` is unavailable.
 */
function barGeometry(container: HTMLElement): Array<{ width: number; height: number }> {
  return Array.from(container.querySelectorAll<SVGPathElement>(".recharts-bar-rectangle path")).map(
    (path) => {
      const corners = (path.getAttribute("d") ?? "")
        .replace(/A[^A-Z]*/g, "")
        .match(/-?\d+(?:\.\d+)?/g)!
        .map(Number);
      const xs = corners.filter((_, index) => index % 2 === 0);
      const ys = corners.filter((_, index) => index % 2 === 1);
      return {
        width: Math.max(...xs) - Math.min(...xs),
        height: Math.max(...ys) - Math.min(...ys),
      };
    }
  );
}

function xAxisTicks(container: HTMLElement): string[] {
  return Array.from(
    container.querySelectorAll(".recharts-xAxis-tick-labels .recharts-cartesian-axis-tick-value")
  ).map((tick) => tick.textContent ?? "");
}

function regionInsight(name: string): string {
  const region = screen.getByRole("region", { name });
  return document.getElementById(region.getAttribute("aria-describedby")!)!.textContent!;
}

describe("OutcomeMeanBarChart", () => {
  const outcomes = [
    outcomeDTO({ outcomeId: "outcome-1", code: "BSIT-GO1", meanRating: 3.79 }),
    outcomeDTO({ outcomeId: "outcome-2", code: "BSIT-GO2", meanRating: 3.87 }),
  ];

  it("encodes bar length proportionally to the mean from a zero baseline", () => {
    const { container } = render(
      <OutcomeMeanBarChart
        title="Mean Rating by Program Outcome"
        outcomes={outcomes}
        labels={GRADUATE_OUTCOME_LABELS}
      />
    );

    // Descending rank: the higher mean draws the longer bar.
    const [higher, lower] = barGeometry(container);
    expect(higher.width).toBeGreaterThan(lower.width);
    // A zero baseline means 3.79/3.87 of the plot width, not the ~73% of the
    // same span a truncated 1-5 baseline would have produced.
    expect(lower.width / higher.width).toBeCloseTo(3.79 / 3.87, 3);
    // The axis is the honest 0-5 span, not the lollipop's truncated 1-5 span.
    expect(xAxisTicks(container)).toEqual(["0", "1", "2", "3", "4", "5"]);
  });

  it("uses a four-point instrument's full range without implying a fifth category", () => {
    const { container } = render(
      <OutcomeMeanBarChart
        title="Four-point outcome evidence"
        labels={GRADUATE_OUTCOME_LABELS}
        outcomes={[
          outcomeDTO({
            meanRating: 3,
            distributions: [
              {
                scaleLabel: "1–4 (4-point)",
                maxValue: 4,
                categories: [1, 2, 3, 4].map((value) => ({
                  value,
                  label: null,
                  count: value === 3 ? 1 : 0,
                  percentage: value === 3 ? 1 : 0,
                })),
              },
            ],
          }),
        ]}
      />
    );
    expect(xAxisTicks(container)).toEqual(["0", "1", "2", "3", "4"]);
  });

  it("labels each bar with its two-decimal mean so close means stay readable", () => {
    render(
      <OutcomeMeanBarChart
        title="Mean Rating by Program Outcome"
        outcomes={outcomes}
        labels={GRADUATE_OUTCOME_LABELS}
      />
    );

    expect(screen.getAllByText("3.87").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("3.79").length).toBeGreaterThanOrEqual(1);
  });

  it("never draws or ranks an unrated row", () => {
    render(
      <OutcomeMeanBarChart
        title="Mean Rating by Program Outcome"
        outcomes={[
          ...outcomes,
          outcomeDTO({ outcomeId: "outcome-3", code: "BSIT-GO3", meanRating: null }),
        ]}
        labels={GRADUATE_OUTCOME_LABELS}
      />
    );

    expect(barGeometry(document.body)).toHaveLength(2);
    expect(regionInsight("Mean Rating by Program Outcome")).not.toContain("BSIT-GO3");
  });

  it("renders descriptive outcomes with uniform canonical chart token instead of rotating colors", () => {
    const many = Array.from({ length: 7 }, (_, index) =>
      outcomeDTO({
        outcomeId: `outcome-${index}`,
        code: `BSIT-PO${index + 1}`,
        meanRating: 4 - index / 10,
      })
    );
    const { container } = render(
      <OutcomeMeanBarChart
        title="Mean Rating by Institutional Learning Outcome"
        outcomes={many}
        labels={INSTITUTIONAL_OUTCOME_LABELS}
      />
    );

    const fills = Array.from(
      container.querySelectorAll<SVGPathElement>(".recharts-bar-rectangle path")
    ).map((path) => path.getAttribute("fill") ?? "");
    expect(fills).toHaveLength(7);
    expect(fills.every((fill) => fill === "var(--chart-1)")).toBe(true);
  });

  it("renders classified outcomes using 3-tier CQI attainment colors", () => {
    const classifiedOutcomes = [
      outcomeDTO({
        outcomeId: "outcome-meets",
        code: "PO-1",
        meanRating: 4.2,
        attainment: {
          policyId: "CLOIE_OUTCOME_MEAN_V1",
          benchmark: 3.5,
          status: "classified",
          interpretation: "Attained",
          cqi: "Meets Benchmark",
          meetsBenchmark: true,
          scaleKind: "direct-attainment",
          isIndirect: false,
        },
      }),
      outcomeDTO({
        outcomeId: "outcome-attention",
        code: "PO-2",
        meanRating: 3.0,
        attainment: {
          policyId: "CLOIE_OUTCOME_MEAN_V1",
          benchmark: 3.5,
          status: "classified",
          interpretation: "Partially Attained",
          cqi: "Needs Attention",
          meetsBenchmark: false,
          scaleKind: "direct-attainment",
          isIndirect: false,
        },
      }),
      outcomeDTO({
        outcomeId: "outcome-below",
        code: "PO-3",
        meanRating: 1.8,
        attainment: {
          policyId: "CLOIE_OUTCOME_MEAN_V1",
          benchmark: 3.5,
          status: "classified",
          interpretation: "Slightly Attained",
          cqi: "Below Benchmark",
          meetsBenchmark: false,
          scaleKind: "direct-attainment",
          isIndirect: false,
        },
      }),
    ];

    const { container } = render(
      <OutcomeMeanBarChart
        title="Mean Rating by Program Outcome"
        outcomes={classifiedOutcomes}
        labels={GRADUATE_OUTCOME_LABELS}
      />
    );

    const fills = Array.from(
      container.querySelectorAll<SVGPathElement>(".recharts-bar-rectangle path")
    ).map((path) => path.getAttribute("fill") ?? "");
    expect(fills).toEqual(["var(--color-success)", "var(--color-warning)", "var(--color-danger)"]);
    expect(container.querySelector(".recharts-reference-line-line")).toHaveAttribute(
      "stroke",
      "var(--text-muted)"
    );
    expect(
      screen.getByRole("region", { name: "Attainment interpretation guide" })
    ).toBeInTheDocument();
  });

  it("shows a neutral legend and no benchmark when all outcome scales are unsupported", () => {
    const { container } = render(
      <OutcomeMeanBarChart
        title="Unsupported outcome evidence"
        outcomes={[outcomeDTO({ attainment: classifyOutcomeDistributions(3.87, [], false) })]}
        labels={GRADUATE_OUTCOME_LABELS}
      />
    );
    expect(container.querySelector(".recharts-bar-rectangle path")).toHaveAttribute(
      "fill",
      "var(--text-muted)"
    );
    expect(container.querySelector(".recharts-reference-line")).toBeNull();
    expect(
      screen.getByRole("region", { name: "Attainment interpretation guide" })
    ).toHaveTextContent("Not classified");
  });

  it("keeps the interpretation guide visible when a status filter has no matching rows", () => {
    render(
      <OutcomeMeanBarChart title="Empty PO filter" outcomes={[]} labels={GRADUATE_OUTCOME_LABELS} />
    );
    expect(
      screen.getByRole("region", { name: "Attainment interpretation guide" })
    ).toBeInTheDocument();
  });

  it("renders an accessible empty state when no row is rated", () => {
    const { container } = render(
      <OutcomeMeanBarChart
        title="Mean Rating by Program Outcome"
        outcomes={[
          outcomeDTO({
            meanRating: null,
            attainment: classifyOutcomeDistributions(null, [], false),
          }),
        ]}
        labels={GRADUATE_OUTCOME_LABELS}
      />
    );

    expect(container.querySelector(".recharts-bar-rectangle")).toBeNull();
    expect(screen.getByText("No rated outcome evidence yet")).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "Attainment interpretation guide" })
    ).toHaveTextContent("not non-attainment");
  });
});
