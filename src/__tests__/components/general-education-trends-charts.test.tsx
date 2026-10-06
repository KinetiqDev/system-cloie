import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GeneralEducationTrendChart } from "@/features/analytics/components/general-education-trends-charts";
import type { GeneralEducationTrendsDTO } from "@/features/analytics/general-education-analytics-types";

function periods(): GeneralEducationTrendsDTO["periods"] {
  return [3, 4].map((meanRating, index) => ({
    termInstanceId: `term-${index}`,
    periodLabel: `Period ${index + 1}`,
    meanRating,
    submittedResponseCount: 10,
    evaluationOpportunityCount: 20,
    responseRate: 0.5,
    ratingCount: 10,
    instrumentContext: "Four-point instrument",
    scaleContext: "1–4 (4-point)",
    scaleDomain: [1, 4],
    outcomeCodes: ["ILO-1"],
    comparableWithPrevious: index > 0,
  }));
}

describe("GeneralEducationTrendChart", () => {
  it("plots a four-point instrument against its frozen range, not a fifth category", () => {
    const { container } = render(
      <GeneralEducationTrendChart title="Four-point trend" periods={periods()} breaks={[]} />
    );
    const ticks = Array.from(
      container.querySelectorAll(".recharts-yAxis-tick-labels .recharts-cartesian-axis-tick-value")
    ).map((tick) => Number(tick.textContent));
    expect(Math.min(...ticks)).toBe(1);
    expect(Math.max(...ticks)).toBe(4);
  });
});
