import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  CourseMeanPieChartFallback,
  QualitativeWordCloudFallback,
} from "@/features/analytics/components/faculty-dashboard-visualization-fallbacks";

describe("Faculty Dashboard visualization fallbacks", () => {
  it("provides accessible chart loading semantics and reserves chart geometry", () => {
    render(<CourseMeanPieChartFallback />);

    expect(
      screen.getByRole("status", { name: "Loading overall mean by course visualization" })
    ).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText("Overall Mean by Course")).toBeInTheDocument();
    expect(screen.getByRole("status").querySelector('[data-slot="skeleton"]')).toHaveClass(
      "h-80"
    );
  });

  it("provides accessible word-cloud loading semantics without response content", () => {
    render(<QualitativeWordCloudFallback />);

    expect(
      screen.getByRole("status", {
        name: "Loading qualitative response insights visualization",
      })
    ).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText("Loading qualitative response insights visualization")).toBeInTheDocument();
    expect(screen.queryByText(/respondent|comment|private/i)).not.toBeInTheDocument();
  });
});
