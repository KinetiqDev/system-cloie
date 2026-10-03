import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProgramHeadGODetail } from "@/features/analytics/components/program-head-go-detail";
import type { ProgramHeadOutcomeDTO } from "@/features/analytics/program-head-analytics-types";

function outcomeDTO(overrides: Partial<ProgramHeadOutcomeDTO> = {}): ProgramHeadOutcomeDTO {
  return {
    goId: "go-a",
    code: "BSIT-GO1",
    name: "Apply computing and IT solutions",
    meanRating: 3.8703703703703702,
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

function detailMean(): string {
  return screen.getByText("Mean Rating (higher precision)").nextElementSibling!.textContent!;
}

describe("ProgramHeadGODetail", () => {
  it("caps the detail mean at four decimals instead of printing the raw float", () => {
    render(<ProgramHeadGODetail outcome={outcomeDTO()} />);

    expect(detailMean()).toBe("3.8704");
    expect(detailMean()).not.toBe(String(3.8703703703703702));
  });

  it("never exceeds four decimals for any mean on a 1–5 scale", () => {
    const means = [1, 2, 2.5, 3.87, 3.8703703703703702, 4, 4.333333333333333, 5, 1 / 3];
    for (const meanRating of means) {
      const { unmount } = render(<ProgramHeadGODetail outcome={outcomeDTO({ meanRating })} />);
      const rendered = detailMean();
      expect(rendered, `mean ${meanRating}`).toMatch(/^\d+(\.\d{1,4})?$/);
      expect(Number(rendered), `mean ${meanRating}`).toBeCloseTo(meanRating, 4);
      unmount();
    }
  });

  it("trims trailing zeros so an exact mean does not read as false precision", () => {
    const { unmount } = render(<ProgramHeadGODetail outcome={outcomeDTO({ meanRating: 4.5 })} />);
    expect(detailMean()).toBe("4.5");
    unmount();

    render(<ProgramHeadGODetail outcome={outcomeDTO({ meanRating: 2 })} />);
    expect(detailMean()).toBe("2");
  });

  it("renders an em dash when the row has no valid ratings", () => {
    render(<ProgramHeadGODetail outcome={outcomeDTO({ meanRating: null })} />);
    expect(detailMean()).toBe("—");
  });

  it("leaves the DTO mean untouched so downstream evidence keeps full precision", () => {
    const outcome = outcomeDTO();
    render(<ProgramHeadGODetail outcome={outcome} />);

    expect(outcome.meanRating).toBe(3.8703703703703702);
  });

  it("still discloses scale-separated distributions and excluded-rating diagnostics", () => {
    render(
      <ProgramHeadGODetail
        outcome={outcomeDTO({
          meanRating: 2,
          excludedRatingCount: 1,
          spansMultipleScales: true,
          distributions: [
            {
              scaleLabel: "1–5 (5-point)",
              categories: [
                { value: 1, label: null, count: 0, percentage: 0 },
                { value: 2, label: null, count: 1, percentage: 1 },
                { value: 3, label: null, count: 0, percentage: 0 },
                { value: 4, label: null, count: 0, percentage: 0 },
                { value: 5, label: null, count: 0, percentage: 0 },
              ],
            },
          ],
        })}
      />
    );

    expect(screen.getByText("Likert distribution by scale")).toBeInTheDocument();
    expect(screen.getByText("Scale: 1–5 (5-point)")).toBeInTheDocument();
    expect(screen.getByText("1 valid rating on this scale.")).toBeInTheDocument();
    expect(screen.getByText(/pools ratings from 1 distinct rating scales/)).toBeInTheDocument();
    expect(screen.getByText(/1 rating was excluded from the valid aggregate/)).toBeInTheDocument();
    const ratedRow = within(screen.getByRole("table")).getAllByRole("row")[2];
    const [, value, ratings, share] = within(ratedRow).getAllByRole("cell");
    expect(value).toHaveTextContent("2");
    expect(ratings).toHaveTextContent("1");
    expect(share).toHaveTextContent("100.0%");
  });
});
