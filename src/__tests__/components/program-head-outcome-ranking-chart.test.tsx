import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProgramHeadOutcomeRankingChart } from "@/features/analytics/components/program-head-outcome-ranking-chart";
import type { ProgramHeadOutcomeDTO } from "@/features/analytics/program-head-analytics-types";

const ratedOutcomes: ProgramHeadOutcomeDTO[] = [
  {
    goId: "go-1",
    code: "GO-3",
    name: "Critical Thinking",
    meanRating: 4.1,
    ratingCount: 18,
    submittedResponseCount: 9,
    contributingCilos: [],
    contributingCourses: [],
    evidenceEvaluations: [],
    distributions: [],
    spansMultipleScales: false,
    excludedRatingCount: 0,
  },
  {
    goId: "go-2",
    code: "GO-1",
    name: "Communication",
    meanRating: 4.4,
    ratingCount: 12,
    submittedResponseCount: 6,
    contributingCilos: [],
    contributingCourses: [],
    evidenceEvaluations: [],
    distributions: [],
    spansMultipleScales: false,
    excludedRatingCount: 0,
  },
];

describe("ProgramHeadOutcomeRankingChart", () => {
  it("ranks outcomes by mean descending and reports highest and lowest", () => {
    render(<ProgramHeadOutcomeRankingChart title="Mean Rating by Graduate Outcome" outcomes={ratedOutcomes} />);

    // Recharts renders bars in data order; the series is pre-sorted.
    expect(screen.getByRole("region", { name: "Mean Rating by Graduate Outcome" })).toHaveAttribute(
      "aria-describedby"
    );
    expect(screen.getByText(/Highest mean: GO-1 \(4\.40\)/)).toBeInTheDocument();
    expect(screen.getByText(/Lowest mean: GO-3 \(4\.10\)/)).toBeInTheDocument();
  });

  it("exposes exact values in a named table alternative", () => {
    render(<ProgramHeadOutcomeRankingChart title="Mean Rating by Graduate Outcome" outcomes={ratedOutcomes} />);

    const table = screen.getByRole("table", { name: "Ranked mean ratings by graduate outcome" });
    expect(table).toBeInTheDocument();
    expect(table.textContent).toContain("4.40");
    expect(table.textContent).toContain("18");
    expect(table.textContent).toContain("9");
  });

  it("renders an explicit empty state when no outcome has a valid mean", () => {
    const unrated = ratedOutcomes.map((outcome) => ({
      ...outcome,
      meanRating: null as number | null,
      ratingCount: 0,
    }));
    const { container } = render(
      <ProgramHeadOutcomeRankingChart title="Mean Rating by Graduate Outcome" outcomes={unrated} />
    );

    expect(screen.getByText("No rated outcome evidence yet")).toBeInTheDocument();
    // No blank chart and no false ranking claim are rendered.
    expect(container.querySelector(".recharts-bar-rectangle")).toBeNull();
    expect(screen.queryByText(/Highest mean/)).not.toBeInTheDocument();
  });
});