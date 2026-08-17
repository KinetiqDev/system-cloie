import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProgramHeadLikertDistribution } from "@/features/analytics/components/program-head-likert-distribution";
import type { ProgramHeadOutcomeScaleDistributionDTO } from "@/features/analytics/program-head-analytics-types";

const rated: ProgramHeadOutcomeScaleDistributionDTO = {
  scaleLabel: "1–5 (5-point)",
  categories: [
    { value: 1, label: "Strongly disagree", count: 1, percentage: 0.0625 },
    { value: 2, label: "Disagree", count: 3, percentage: 0.1875 },
    { value: 3, label: "Neutral", count: 4, percentage: 0.25 },
    { value: 4, label: "Agree", count: 5, percentage: 0.3125 },
    { value: 5, label: "Strongly agree", count: 3, percentage: 0.1875 },
  ],
};

const unrated: ProgramHeadOutcomeScaleDistributionDTO = {
  scaleLabel: "1–5 (5-point)",
  categories: [
    { value: 1, label: "Strongly disagree", count: 0, percentage: 0 },
    { value: 2, label: "Disagree", count: 0, percentage: 0 },
    { value: 3, label: "Neutral", count: 0, percentage: 0 },
    { value: 4, label: "Agree", count: 0, percentage: 0 },
    { value: 5, label: "Strongly agree", count: 0, percentage: 0 },
  ],
};

describe("ProgramHeadLikertDistribution", () => {
  it("renders scale categories with counts, shares, and a named table", () => {
    render(<ProgramHeadLikertDistribution distribution={rated} />);

    expect(screen.getByText("Scale: 1–5 (5-point)")).toBeInTheDocument();
    const table = screen.getByRole("table", { name: "Likert distribution by category" });
    expect(table.textContent).toContain("Strongly agree");
    expect(table.textContent).toContain("18.8%");
    expect(screen.getByText("16 valid ratings on this scale.")).toBeInTheDocument();
  });

  it("renders an explicit empty state instead of a zero-filled table", () => {
    const { container } = render(<ProgramHeadLikertDistribution distribution={unrated} />);

    expect(screen.getByText("Scale: 1–5 (5-point)")).toBeInTheDocument();
    expect(screen.getByText("No ratings on this scale")).toBeInTheDocument();
    expect(container.querySelector("table")).toBeNull();
  });
});