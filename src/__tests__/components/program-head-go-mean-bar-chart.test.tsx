import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProgramHeadGoMeanBarChart } from "@/features/analytics/components/program-head-go-mean-bar-chart";
import type { ProgramHeadOutcomeDTO } from "@/features/analytics/program-head-analytics-types";

function outcomeDTO(overrides: Partial<ProgramHeadOutcomeDTO> = {}): ProgramHeadOutcomeDTO {
  return {
    goId: "go-a",
    code: "BSIT-GO1",
    name: "Apply computing and IT solutions",
    meanRating: 3.87,
    ratingCount: 54,
    submittedResponseCount: 18,
    contributingCilos: [],
    contributingCourses: [],
    contributors: [],
    evidenceEvaluations: [],
    distributions: [],
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

describe("ProgramHeadGoMeanBarChart", () => {
  const outcomes = [
    outcomeDTO({ goId: "go-1", code: "BSIT-GO1", meanRating: 3.79 }),
    outcomeDTO({ goId: "go-2", code: "BSIT-GO2", meanRating: 3.87 }),
  ];

  it("draws horizontal bars rather than the thin lollipop stem and dot", () => {
    const { container } = render(
      <ProgramHeadGoMeanBarChart title="Mean Rating by Graduate Outcome" outcomes={outcomes} />
    );

    expect(container.querySelectorAll(".recharts-bar-rectangle").length).toBeGreaterThan(0);
    // The lollipop composed chart also drew Scatter dots and 4px stems; both
    // are gone, and every drawn bar is a wide horizontal rectangle.
    expect(container.querySelectorAll(".recharts-scatter-symbol")).toHaveLength(0);
    for (const bar of barGeometry(container)) {
      expect(bar.width).toBeGreaterThan(bar.height * 4);
    }
  });

  it("encodes bar length proportionally to the mean from a zero baseline", () => {
    const { container } = render(
      <ProgramHeadGoMeanBarChart title="Mean Rating by Graduate Outcome" outcomes={outcomes} />
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

  it("labels each bar with its two-decimal mean so close means stay readable", () => {
    render(
      <ProgramHeadGoMeanBarChart title="Mean Rating by Graduate Outcome" outcomes={outcomes} />
    );

    expect(screen.getAllByText("3.87").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("3.79").length).toBeGreaterThanOrEqual(1);
    // The value labels ride the theme foreground, not Recharts' #808080 default.
    const labels = document.querySelectorAll(".recharts-label-list text");
    expect(labels.length).toBeGreaterThan(0);
    for (const label of labels) {
      expect(label.getAttribute("fill")).toBe("var(--foreground)");
    }
  });

  it("ranks bars by mean descending and reports highest and lowest in the insight", () => {
    render(
      <ProgramHeadGoMeanBarChart title="Mean Rating by Graduate Outcome" outcomes={outcomes} />
    );

    expect(regionInsight("Mean Rating by Graduate Outcome")).toBe(
      "Highest mean: BSIT-GO2 (3.87). Lowest mean: BSIT-GO1 (3.79)."
    );
  });

  it("renders a single-row insight without a comparison claim", () => {
    render(
      <ProgramHeadGoMeanBarChart
        title="Mean Rating by Graduate Outcome"
        outcomes={[outcomeDTO({ meanRating: 4.2 })]}
      />
    );

    expect(regionInsight("Mean Rating by Graduate Outcome")).toBe("BSIT-GO1: 4.20.");
  });

  it("never draws or ranks an unrated row", () => {
    render(
      <ProgramHeadGoMeanBarChart
        title="Mean Rating by Graduate Outcome"
        outcomes={[...outcomes, outcomeDTO({ goId: "go-3", code: "BSIT-GO3", meanRating: null })]}
      />
    );

    expect(barGeometry(document.body)).toHaveLength(2);
    expect(regionInsight("Mean Rating by Graduate Outcome")).not.toContain("BSIT-GO3");
  });

  it("resolves bar fills from semantic tokens and hatches beyond five categories", () => {
    const many = Array.from({ length: 7 }, (_, index) =>
      outcomeDTO({ goId: `go-${index}`, code: `BSIT-GO${index + 1}`, meanRating: 4 - index / 10 })
    );
    const { container } = render(
      <ProgramHeadGoMeanBarChart title="Mean Rating by Graduate Outcome" outcomes={many} />
    );

    const fills = Array.from(
      container.querySelectorAll<SVGPathElement>(".recharts-bar-rectangle path")
    ).map((path) => path.getAttribute("fill") ?? "");
    expect(fills.slice(0, 5)).toEqual([
      "var(--chart-1)",
      "var(--chart-2)",
      "var(--chart-3)",
      "var(--chart-4)",
      "var(--chart-5)",
    ]);
    expect(fills[5]).toMatch(/^url\(#go-mean-bar-[A-Za-z0-9_]+-hatch-0-c1\)$/);
  });

  it("renders an accessible empty state when no row is rated", () => {
    const { container } = render(
      <ProgramHeadGoMeanBarChart
        title="Mean Rating by Graduate Outcome"
        outcomes={[outcomeDTO({ meanRating: null })]}
      />
    );

    expect(container.querySelector(".recharts-bar-rectangle")).toBeNull();
    expect(screen.getByText("No rated outcome evidence yet")).toBeInTheDocument();
    expect(
      screen.getByText("No valid ratings are available for these outcomes.")
    ).toBeInTheDocument();
  });

  it("keeps exact values, counts, and the full outcome name reachable", () => {
    render(
      <ProgramHeadGoMeanBarChart title="Mean Rating by Graduate Outcome" outcomes={outcomes} />
    );

    expect(screen.getByText("View exact values")).toBeInTheDocument();
    expect(screen.getByText("Fixed 1–5 scale")).toBeInTheDocument();
    // The full code-and-name label appears in both the legend and the exact table.
    expect(screen.getAllByText("BSIT-GO1 — Apply computing and IT solutions")).toHaveLength(2);
    expect(screen.getByText("Rating Count")).toBeInTheDocument();
    expect(screen.getByText("Submitted Responses")).toBeInTheDocument();
  });
});
