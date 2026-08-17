import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  ProgramHeadComparisonChart,
  type ProgramHeadComparisonDatum,
} from "@/features/analytics/components/program-head-comparison-chart";
import { ProgramHeadResponseCompositionDonut } from "@/features/analytics/components/program-head-response-composition-donut";
import { ProgramHeadInstrumentBreakdownChart } from "@/features/analytics/components/program-head-instrument-breakdown-chart";
import type { ProgramHeadInstrumentBreakdownRowDTO } from "@/features/analytics/program-head-analytics-types";

function barFills(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll(".recharts-bar-rectangle path")).map(
    (path) => path.getAttribute("fill") ?? ""
  );
}

function sectorFills(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll(".recharts-pie-sector path")).map(
    (path) => path.getAttribute("fill") ?? ""
  );
}

function regionInsight(name: string): string {
  const region = screen.getByRole("region", { name });
  return document.getElementById(region.getAttribute("aria-describedby")!)!.textContent!;
}

describe("ProgramHeadComparisonChart", () => {
  const rows: ProgramHeadComparisonDatum[] = [
    { key: "b", label: "Beta", meanRating: 4.5, ratingCount: 20, submittedResponseCount: 10 },
    { key: "a", label: "Alpha", meanRating: 3.25, ratingCount: 8, submittedResponseCount: 5 },
    { key: "c", label: "Gamma", meanRating: 3.75, ratingCount: 12, submittedResponseCount: 7 },
  ];

  it("renders independent means as ranked bars, never as pie slices", () => {
    const { container } = render(
      <ProgramHeadComparisonChart title="Mean Rating by Evidence Source" rows={rows} />
    );

    expect(container.querySelector(".recharts-bar-rectangle")).not.toBeNull();
    expect(container.querySelectorAll(".recharts-pie-sector")).toHaveLength(0);
  });

  it("ranks bars by mean descending and reports highest and lowest in the insight", () => {
    render(<ProgramHeadComparisonChart title="Mean Rating by Evidence Source" rows={rows} />);

    expect(regionInsight("Mean Rating by Evidence Source")).toMatch(
      /Highest Mean Rating: Beta \(4\.50\)/
    );
    expect(regionInsight("Mean Rating by Evidence Source")).toMatch(
      /Lowest Mean Rating: Alpha \(3\.25\)/
    );
  });

  it("renders a single-row insight without a comparison claim", () => {
    render(
      <ProgramHeadComparisonChart
        title="Mean Rating by Course"
        rows={[
          { key: "c1", label: "CS101", meanRating: 4.2, ratingCount: 9, submittedResponseCount: 3 },
        ]}
      />
    );

    expect(regionInsight("Mean Rating by Course")).toBe(
      "Mean Rating for CS101: 4.20 (3 responses)."
    );
  });

  it("resolves fills from semantic tokens and hatches beyond five categories", () => {
    const manyRows = Array.from({ length: 7 }, (_, index) => ({
      key: `row-${index}`,
      label: `Group ${index}`,
      meanRating: 4 - index / 10,
      ratingCount: 3,
      submittedResponseCount: 1,
    }));
    const { container } = render(
      <ProgramHeadComparisonChart title="Mean Rating by Evidence Source" rows={manyRows} />
    );

    const fills = barFills(container);
    expect(fills.slice(0, 5)).toEqual([
      "var(--chart-1)",
      "var(--chart-2)",
      "var(--chart-3)",
      "var(--chart-4)",
      "var(--chart-5)",
    ]);
    expect(fills[5]).toMatch(/^url\(#comparison-[A-Za-z0-9_]+-hatch-0-c1\)$/);
  });

  it("exposes exact values with rating count distinct from response count", () => {
    render(<ProgramHeadComparisonChart title="Mean Rating by Evidence Source" rows={rows} />);

    // Values appear on bar labels and in the exact-value table.
    expect(screen.getAllByText("4.50").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("3.25").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("20").length).toBeGreaterThanOrEqual(1); // rating count for Beta
    expect(screen.getAllByText("10").length).toBeGreaterThanOrEqual(1); // response count for Beta
    expect(screen.getByText("Rating Count")).toBeInTheDocument();
    expect(screen.getByText("Submitted Responses")).toBeInTheDocument();
  });

  it("shows a legend with response counts and a non-color distinction marker per row", () => {
    const { container } = render(
      <ProgramHeadComparisonChart title="Mean Rating by Evidence Source" rows={rows} />
    );

    expect(screen.getByRole("list", { name: "Chart legend" })).toBeInTheDocument();
    expect(screen.getByText(/Beta \(10 responses\)/)).toBeInTheDocument();
    expect(screen.getByText(/Alpha \(5 responses\)/)).toBeInTheDocument();
    const swatches = container.querySelectorAll(
      '[aria-label="Chart legend"] [style*="background-color"]'
    );
    expect(swatches.length).toBeGreaterThanOrEqual(3);
  });

  it("renders an accessible empty state when no row is rated", () => {
    render(
      <ProgramHeadComparisonChart
        title="Mean Rating by Evidence Source"
        rows={[
          { key: "u", label: "Unrated", meanRating: null, ratingCount: 0, submittedResponseCount: 2 },
        ]}
      />
    );

    expect(screen.getByText("No comparable means yet")).toBeInTheDocument();
    expect(
      screen.getByText("No rated evidence is available for this comparison.")
    ).toBeInTheDocument();
  });

  it("keeps counts and instrument context visible when no row is rated", () => {
    render(
      <ProgramHeadComparisonChart
        title="Mean Rating by Evidence Source"
        rows={[
          {
            key: "a",
            label: "Alumni evidence",
            meanRating: null,
            ratingCount: 0,
            submittedResponseCount: 6,
            context: "Alumni Survey v1",
          },
        ]}
      />
    );

    // The disclosure table survives the no-rated-means empty state.
    expect(screen.getByText("No comparable means yet")).toBeInTheDocument();
    expect(screen.getByText("6")).toBeInTheDocument(); // submitted responses
    expect(screen.getByText("Alumni Survey v1")).toBeInTheDocument(); // instruments
    expect(screen.getByText("—")).toBeInTheDocument(); // no mean
  });

  it("never draws unrated rows but discloses them in the table", () => {
    const { container } = render(
      <ProgramHeadComparisonChart
        title="Mean Rating by Evidence Source"
        rows={[
          {
            key: "rated",
            label: "Rated",
            meanRating: 4.1,
            ratingCount: 6,
            submittedResponseCount: 3,
          },
          {
            key: "unrated",
            label: "Unrated",
            meanRating: null,
            ratingCount: 0,
            submittedResponseCount: 2,
          },
        ]}
      />
    );

    // Rows without a mean carry no defensible central tendency: only the
    // rated row is drawn.
    expect(barFills(container)).toHaveLength(1);
    // Unrated row is excluded from the ranked insight...
    expect(regionInsight("Mean Rating by Evidence Source")).not.toContain("Unrated");
    // ...but remains visible in the exact table, including the no-mean disclosure.
    expect(screen.getByText("Unrated")).toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("keeps table-only rows out of the chart but present in exact values", () => {
    const { container } = render(
      <ProgramHeadComparisonChart
        title="Mean Rating by Major"
        rows={[
          {
            key: "major-1",
            label: "Mathematics",
            meanRating: 4.0,
            ratingCount: 12,
            submittedResponseCount: 6,
          },
        ]}
        tableOnlyRows={[
          {
            key: "unspecified",
            label: "Unspecified",
            meanRating: 2.5,
            ratingCount: 4,
            submittedResponseCount: 3,
          },
        ]}
      />
    );

    expect(barFills(container)).toHaveLength(1); // only the defensible row is drawn
    expect(regionInsight("Mean Rating by Major")).not.toContain("Unspecified");
    expect(screen.getByRole("list", { name: "Chart legend" }).textContent).not.toContain(
      "Unspecified"
    );
    expect(screen.getByText("Unspecified")).toBeInTheDocument(); // table row
    expect(screen.getByText("2.50")).toBeInTheDocument();
  });

  it("adds an instruments column only when context is disclosed", () => {
    render(
      <ProgramHeadComparisonChart
        title="Mean Rating by Evidence Source"
        rows={[
          {
            key: "b",
            label: "Course-bound student evidence",
            meanRating: 4.2,
            ratingCount: 10,
            submittedResponseCount: 5,
            context: "CILO Evaluation v1, Exit Survey v2",
          },
          {
            key: "a",
            label: "Alumni evidence",
            meanRating: 3.8,
            ratingCount: 6,
            submittedResponseCount: 3,
          },
        ]}
      />
    );

    expect(screen.getByText("Instruments")).toBeInTheDocument();
    expect(screen.getByText("CILO Evaluation v1, Exit Survey v2")).toBeInTheDocument();
  });

  it("renders authorized drill-through links in the exact table", () => {
    render(
      <ProgramHeadComparisonChart
        title="Mean Rating by Course"
        rows={[
          {
            key: "c1",
            label: "CS101 — Intro to CS",
            meanRating: 4.0,
            ratingCount: 10,
            submittedResponseCount: 5,
            links: [
              { href: "/program-head/programs/program-bsed/cilo-reviews/eval-1", label: "CILO Deployment" },
            ],
          },
        ]}
      />
    );

    expect(screen.getByText("Review Evidence")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "CILO Deployment" })).toHaveAttribute(
      "href",
      "/program-head/programs/program-bsed/cilo-reviews/eval-1"
    );
  });

  it("namespaces ids per instance so two charts stay distinct", () => {
    const { container } = render(
      <div>
        <ProgramHeadComparisonChart title="Mean Rating by Evidence Source" rows={rows.slice(0, 2)} />
        <ProgramHeadComparisonChart title="Mean Rating by Course" rows={rows.slice(2)} />
      </div>
    );

    const regions = Array.from(container.querySelectorAll('[data-slot="chart"]'));
    expect(regions).toHaveLength(2);
    expect(new Set(regions.map((region) => region.getAttribute("data-chart"))).size).toBe(2);
  });
});

describe("ProgramHeadResponseCompositionDonut", () => {
  const completion = [
    { key: "COURSE_STUDENT", label: "Course-bound student evidence", count: 60 },
    { key: "ALUMNI", label: "Alumni evidence", count: 30 },
    { key: "INDUSTRY_PARTNER", label: "Industry Partner evidence", count: 10 },
  ];

  it("renders a donut only for genuine response composition, with shares", () => {
    const { container } = render(
      <ProgramHeadResponseCompositionDonut data={completion} />
    );

    expect(screen.getByText("Submitted Responses by Evidence Source")).toBeInTheDocument();
    expect(container.querySelectorAll(".recharts-pie-sector")).toHaveLength(3);
    expect(container.querySelector(".recharts-bar-rectangle")).toBeNull();
    const fills = sectorFills(container);
    expect(fills.slice(0, 3)).toEqual([
      "var(--chart-1)",
      "var(--chart-2)",
      "var(--chart-3)",
    ]);
  });

  it("reports the total and largest source share in the insight", () => {
    render(<ProgramHeadResponseCompositionDonut data={completion} />);

    expect(regionInsight("Submitted Responses by Evidence Source")).toMatch(
      /100 submitted responses in total/
    );
    expect(regionInsight("Submitted Responses by Evidence Source")).toMatch(
      /Largest source: Course-bound student evidence \(60\.0%\)/
    );
  });

  it("shows exact counts and shares in the table", () => {
    render(<ProgramHeadResponseCompositionDonut data={completion} />);

    expect(screen.getByText("60")).toBeInTheDocument();
    expect(screen.getByText("30")).toBeInTheDocument();
    expect(screen.getByText("60.0%")).toBeInTheDocument();
    expect(screen.getByText("10.0%")).toBeInTheDocument();
  });

  it("renders nothing when there is no composition to show", () => {
    const { container } = render(<ProgramHeadResponseCompositionDonut data={[]} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("explains a single-source composition without a comparison claim", () => {
    render(
      <ProgramHeadResponseCompositionDonut
        data={[{ key: "COURSE_STUDENT", label: "Course-bound student evidence", count: 8 }]}
      />
    );

    expect(regionInsight("Submitted Responses by Evidence Source")).toBe(
      "All 8 submitted responses are from Course-bound student evidence."
    );
  });
});

describe("ProgramHeadInstrumentBreakdownChart", () => {
  const instrumentRows: ProgramHeadInstrumentBreakdownRowDTO[] = [
    {
      instrumentVersionId: "iv-1",
      instrumentLabel: "Shared Survey v1",
      sources: [
        {
          key: "iv-1:COURSE_STUDENT",
          label: "Course-bound student evidence",
          isUnspecified: false,
          meanRating: 4,
          ratingCount: 6,
          submittedResponseCount: 3,
          sourceKey: "COURSE_STUDENT",
          sourceLabel: "Course-bound student evidence",
        },
        {
          key: "iv-1:ALUMNI",
          label: "Alumni evidence",
          isUnspecified: false,
          meanRating: 2,
          ratingCount: 4,
          submittedResponseCount: 2,
          sourceKey: "ALUMNI",
          sourceLabel: "Alumni evidence",
        },
      ],
    },
    {
      instrumentVersionId: "iv-2",
      instrumentLabel: "Exit Survey v1",
      sources: [
        {
          key: "iv-2:CENTRAL_STUDENT",
          label: "Central student-respondent evidence",
          isUnspecified: false,
          meanRating: 3.5,
          ratingCount: 8,
          submittedResponseCount: 4,
          sourceKey: "CENTRAL_STUDENT",
          sourceLabel: "Central student-respondent evidence",
        },
      ],
    },
  ];

  it("groups bars by instrument with one bar per evidence source", () => {
    const { container } = render(<ProgramHeadInstrumentBreakdownChart rows={instrumentRows} />);

    expect(container.querySelector(".recharts-bar-rectangle")).not.toBeNull();
    expect(container.querySelectorAll(".recharts-pie-sector")).toHaveLength(0);
  });

  it("never pools sources: each source keeps its own mean and fills consistently", () => {
    const { container } = render(<ProgramHeadInstrumentBreakdownChart rows={instrumentRows} />);

    // Three source series use exactly three semantic fills.
    const fills = barFills(container);
    expect(fills).toHaveLength(3);
    expect(new Set(fills)).toEqual(new Set(["var(--chart-1)", "var(--chart-2)", "var(--chart-3)"]));
  });

  it("reports highest and lowest rated instrument-source pairs in the insight", () => {
    render(<ProgramHeadInstrumentBreakdownChart rows={instrumentRows} />);

    const insight = regionInsight("Mean Rating by Instrument and Evidence Source");
    expect(insight).toMatch(
      /Highest Mean Rating: Shared Survey v1 — Course-bound student evidence \(4\.00\)/
    );
    expect(insight).toMatch(/Lowest Mean Rating: Shared Survey v1 — Alumni evidence \(2\.00\)/);
  });

  it("shows a legend per source and exact per-source values in the table", () => {
    render(<ProgramHeadInstrumentBreakdownChart rows={instrumentRows} />);

    expect(screen.getByRole("list", { name: "Chart legend" }).textContent).toContain(
      "Course-bound student evidence"
    );
    expect(screen.getByRole("list", { name: "Chart legend" }).textContent).toContain(
      "Alumni evidence"
    );
    expect(screen.getAllByText("4.00").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("2.00").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("3.50").length).toBeGreaterThanOrEqual(1);
    // Table rows are per (instrument, source), never a pooled row.
    expect(screen.getAllByText("Shared Survey v1").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Evidence Source")).toHaveLength(1);
  });

  it("renders an explicit unrated state while keeping response counts", () => {
    const { container } = render(
      <ProgramHeadInstrumentBreakdownChart
        rows={[
          {
            instrumentVersionId: "iv-1",
            instrumentLabel: "Alumni Survey v1",
            sources: [
              {
                key: "iv-1:ALUMNI",
                label: "Alumni evidence",
                isUnspecified: false,
                meanRating: null,
                ratingCount: 0,
                submittedResponseCount: 4,
                sourceKey: "ALUMNI",
                sourceLabel: "Alumni evidence",
              },
            ],
          },
        ]}
      />
    );

    expect(screen.getByText("No rated instrument evidence yet")).toBeInTheDocument();
    // No blank zero-axis chart is rendered.
    expect(container.querySelector(".recharts-bar-rectangle")).toBeNull();
    expect(container.querySelector(".recharts-surface")).toBeNull();
    expect(screen.getByText("4")).toBeInTheDocument(); // submitted responses
    expect(screen.getByText("Alumni Survey v1")).toBeInTheDocument(); // instrument label
    expect(screen.getByText("—")).toBeInTheDocument(); // no mean
  });
});