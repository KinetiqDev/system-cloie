import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProgramHeadTrendChart } from "@/features/analytics/components/program-head-trend-chart";
import { splitComparableRuns } from "@/features/analytics/services/program-head-analytics-aggregators";
import type {
  ProgramHeadTrendBreakDTO,
  ProgramHeadTrendPeriodDTO,
} from "@/features/analytics/program-head-analytics-types";

function period(
  overrides: Partial<ProgramHeadTrendPeriodDTO> & { periodLabel: string }
): ProgramHeadTrendPeriodDTO {
  return {
    termInstanceId: `term-${overrides.periodLabel}`,
    meanRating: 4,
    submittedResponseCount: 10,
    ratingCount: 40,
    instrumentContext: "CILO Evaluation v2",
    scaleContext: "1–5 (5-point)",
    outcomeCodes: [],
    comparableWithPrevious: false,
    ...overrides,
  };
}

const instrumentBreak: ProgramHeadTrendBreakDTO = {
  fromPeriodLabel: "2024-2025 · 1st Semester",
  toPeriodLabel: "2025-2026 · 1st Semester",
  reason: "The instrument version changed between these periods.",
};

describe("ProgramHeadTrendChart", () => {
  it("renders a separate line per comparable run and never joins unlike periods", () => {
    const { container } = render(
      <ProgramHeadTrendChart
        title="Mean Rating by Academic Period"
        periods={[
          period({ periodLabel: "2024-2025 · 1st Semester", meanRating: 4.4 }),
          period({ periodLabel: "2024-2025 · 2nd Semester", meanRating: 4.2, comparableWithPrevious: true }),
          period({ periodLabel: "2025-2026 · 1st Semester", meanRating: 3.9 }),
        ]}
        breaks={[instrumentBreak]}
      />
    );

    // Two drawable runs: [2024-2025 1st, 2024-2025 2nd] and the standalone 2025-2026 1st.
    expect(container.querySelectorAll(".recharts-line-curve")).toHaveLength(2);
    // A dashed reference line marks the comparability break boundary.
    expect(container.querySelectorAll(".recharts-reference-line")).toHaveLength(1);
  });

  it("renders standalone dots without a connecting line when no pair is comparable", () => {
    const { container } = render(
      <ProgramHeadTrendChart
        title="Mean Rating by Academic Period"
        periods={[
          period({ periodLabel: "2024-2025 · 1st Semester", meanRating: 4.4 }),
          period({ periodLabel: "2025-2026 · 1st Semester", meanRating: 3.9 }),
        ]}
        breaks={[]}
      />
    );

    expect(container.querySelectorAll(".recharts-line-curve")).toHaveLength(0);
  });

  it("names the chart region from its title and insight", () => {
    render(
      <ProgramHeadTrendChart
        title="Mean Rating by Academic Period"
        periods={[
          period({ periodLabel: "A", meanRating: 5 }),
          period({ periodLabel: "B", meanRating: 4, comparableWithPrevious: true }),
          period({ periodLabel: "C", meanRating: 3 }),
        ]}
        breaks={[instrumentBreak]}
      />
    );

    const region = screen.getByRole("region", { name: "Mean Rating by Academic Period" });
    expect(region.getAttribute("aria-describedby")).not.toBeNull();
    const insight = document.getElementById(region.getAttribute("aria-describedby")!);
    expect(insight!.textContent).toMatch(/3\.00 \(C\)/);
    expect(insight!.textContent).toMatch(/5\.00 \(A\)/);
    expect(insight!.textContent).toMatch(/1 comparability break/);
  });

  it("explains each comparability break with the periods and reason", () => {
    render(
      <ProgramHeadTrendChart
        title="Mean Rating by Academic Period"
        periods={[
          period({ periodLabel: "2024-2025 · 1st Semester", meanRating: 4.4 }),
          period({ periodLabel: "2024-2025 · 2nd Semester", meanRating: 4.2, comparableWithPrevious: true }),
          period({ periodLabel: "2025-2026 · 1st Semester", meanRating: 3.9 }),
        ]}
        breaks={[instrumentBreak]}
      />
    );

    expect(screen.getByText("Comparability breaks")).toBeInTheDocument();
    expect(
      screen.getByText(
        "2024-2025 · 1st Semester → 2025-2026 · 1st Semester: The instrument version changed between these periods."
      )
    ).toBeInTheDocument();
  });

  it("renders a legend that distinguishes comparable series from standalone periods", () => {
    render(
      <ProgramHeadTrendChart
        title="Mean Rating by Academic Period"
        periods={[
          period({ periodLabel: "A", meanRating: 4.4 }),
          period({ periodLabel: "B", meanRating: 4.2, comparableWithPrevious: true }),
          period({ periodLabel: "C", meanRating: 3.9 }),
        ]}
        breaks={[]}
      />
    );

    const legend = document.querySelector('[aria-label="Chart legend"]');
    expect(legend!.textContent).toContain("A → B");
    expect(legend!.textContent).toContain("C (standalone)");
  });
});

describe("splitComparableRuns", () => {
  it("groups consecutive comparable periods into one run", () => {
    const runs = splitComparableRuns([
      { periodLabel: "A", meanRating: 4, comparableWithPrevious: false },
      { periodLabel: "B", meanRating: 4.2, comparableWithPrevious: true },
      { periodLabel: "C", meanRating: 4.1, comparableWithPrevious: true },
    ]);

    expect(runs).toEqual([[{ periodLabel: "A", meanRating: 4 }, { periodLabel: "B", meanRating: 4.2 }, { periodLabel: "C", meanRating: 4.1 }]]);
  });

  it("never merges unlike periods into one run", () => {
    const runs = splitComparableRuns([
      { periodLabel: "A", meanRating: 4, comparableWithPrevious: false },
      { periodLabel: "B", meanRating: 4.2, comparableWithPrevious: true },
      { periodLabel: "C", meanRating: 3.9, comparableWithPrevious: false },
    ]);

    expect(runs).toEqual([
      [
        { periodLabel: "A", meanRating: 4 },
        { periodLabel: "B", meanRating: 4.2 },
      ],
      [{ periodLabel: "C", meanRating: 3.9 }],
    ]);
  });

  it("breaks a run when a period has no mean rating (no interpolation)", () => {
    const runs = splitComparableRuns([
      { periodLabel: "A", meanRating: 4, comparableWithPrevious: false },
      { periodLabel: "B", meanRating: null, comparableWithPrevious: true },
      { periodLabel: "C", meanRating: 4.1, comparableWithPrevious: true },
    ]);

    expect(runs).toEqual([
      [{ periodLabel: "A", meanRating: 4 }],
      [{ periodLabel: "C", meanRating: 4.1 }],
    ]);
  });

  it("returns no runs for empty input", () => {
    expect(splitComparableRuns([])).toEqual([]);
  });
});
