import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AttainmentLegend } from "@/features/analytics/components/outcome-attainment-legend";
import { getAttainmentColor } from "@/features/analytics/components/outcome-attainment-badge";
import { classifyOutcomeDistributions } from "@/features/analytics/aggregators/outcome-attainment";

const distributions = [
  {
    categories: [
      "Not Achieved",
      "Slightly Achieved",
      "Moderately Achieved",
      "Mostly Achieved",
      "Fully Achieved",
    ].map((label, index) => ({ value: index + 1, label })),
  },
];

describe("outcome attainment presentation", () => {
  it("explains all five interpretations and their exact bounds without rounding gaps", () => {
    render(<AttainmentLegend />);
    const legend = screen.getByRole("region", { name: "Attainment interpretation guide" });
    for (const label of [
      "Fully Attained",
      "Attained",
      "Partially Attained",
      "Slightly Attained",
      "Not Attained",
    ]) {
      expect(within(legend).getByText(label, { exact: true })).toBeInTheDocument();
    }
    expect(within(legend).getByText("3.50 ≤ mean < 4.50")).toBeInTheDocument();
    expect(within(legend).getByText("2.50 ≤ mean < 3.50")).toBeInTheDocument();
    expect(legend).toHaveTextContent("Proposed institutional policy");
    expect(legend).toHaveTextContent("full-precision means");
    expect(legend).toHaveTextContent("not non-attainment");
  });

  it.each([
    [4.5, "var(--color-success)"],
    [3.5, "var(--color-success)"],
    [3.499, "var(--color-warning)"],
    [2.5, "var(--color-warning)"],
    [2.499, "var(--color-danger)"],
    [1, "var(--color-danger)"],
  ])("uses the canonical CQI color at mean %s", (mean, color) => {
    expect(getAttainmentColor(classifyOutcomeDistributions(mean, distributions, false))).toBe(
      color
    );
  });

  it("keeps absent, unsupported and mixed evidence neutral, never red or categorical blue", () => {
    for (const attainment of [
      undefined,
      classifyOutcomeDistributions(null, distributions, false),
      classifyOutcomeDistributions(4, [], false),
      classifyOutcomeDistributions(4, distributions, true),
    ]) {
      expect(getAttainmentColor(attainment)).toBe("var(--text-muted)");
    }
  });
});
