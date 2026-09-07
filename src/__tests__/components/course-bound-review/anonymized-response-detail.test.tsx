import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AnonymizedResponseDetail } from "@/features/analytics/components/anonymized-response-detail";
import type { CourseBoundResponseReview } from "@/features/analytics/types";

const response: CourseBoundResponseReview = {
  courseTitle: "Capstone 2",
  evaluationId: "eval-1",
  termInstanceLabel: "2025-2026 2nd Semester",
  evaluationTitle: "Post-Term CILO Evaluation Tool",
  overallMean: 4,
  programLabel: "BSIT",
  responseId: "response-1",
  respondentLabel: "Respondent R-827493",
  reviewerRole: "DEAN",
  sections: [
    {
      id: "teaching",
      mean: 4,
      name: "Teaching",
      qualitativeResponses: [
        { prompt: "Remarks", promptKey: "remarks", text: "Helpful examples." },
      ],
      quantitativeResponses: [{ itemKey: "clarity", prompt: "Clarity", rating: 4 }],
    },
  ],
  submittedAt: new Date("2026-01-05T08:00:00.000Z"),
};

describe("AnonymizedResponseDetail", () => {
  it("renders anonymized labels and read-only messaging", () => {
    render(<AnonymizedResponseDetail response={response} />);

    expect(screen.getByText("Respondent R-827493")).toBeInTheDocument();
    expect(screen.getByText("Section Responses (Read-only)")).toBeInTheDocument();
    expect(screen.queryByText(/student-|user-|email/i)).not.toBeInTheDocument();
  });

  it("does not render editable form controls", () => {
    render(<AnonymizedResponseDetail response={response} />);

    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /save|edit|submit/i })).not.toBeInTheDocument();
  });
});
