import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { SubmittedResponseReview } from "@/features/responses/components/submitted-response-review";

/**
 * The submitted-review header names the moment a response was submitted, so it
 * must render the recorded time in the institution's time zone — a date alone
 * loses when the submission happened.
 */
describe("SubmittedResponseReview", () => {
  test("renders the submission date and time", () => {
    const submittedAt = new Date("2026-09-12T16:37:50.000Z");

    render(
      <SubmittedResponseReview
        evaluationTitle="IT201 Post-Term CILO Evaluation"
        courseTitle="Data Structures"
        programLabel="BSIT"
        submittedAt={submittedAt}
        sections={[]}
      />
    );

    const timestamp = screen.getByText("Sep 13, 2026, 12:37 AM");

    expect(timestamp).toBeInTheDocument();
    expect(timestamp).toHaveAttribute("dateTime", submittedAt.toISOString());
  });

  /**
   * A replayed rating has to name the option the respondent chose. The bare
   * number is unverifiable on its own — the respondent answered words.
   */
  test("names the chosen Likert option beside its number", () => {
    const { container } = render(
      <SubmittedResponseReview
        evaluationTitle="IT201 Post-Term CILO Evaluation"
        courseTitle="Data Structures"
        programLabel="BSIT"
        submittedAt={new Date("2026-09-12T16:37:50.000Z")}
        sections={[
          {
            id: "cilo-items",
            name: "Course Intended Learning Outcomes Evaluation",
            description: "",
            items: [
              {
                kind: "quantitative",
                itemKey: "q1",
                prompt: "I achieved the first course intended learning outcome.",
                answer: 4,
                scale: [1, 2, 3, 4, 5],
                descriptorLabels: [
                  "Not Achieved",
                  "Slightly Achieved",
                  "Moderately Achieved",
                  "Mostly Achieved",
                  "Fully Achieved",
                ],
              },
            ],
          },
        ]}
      />
    );

    const replay = container.querySelector("ol");

    expect(replay).toHaveTextContent("4");
    expect(replay).toHaveTextContent("Mostly Achieved");
    expect(
      screen.getByText(/Your answer: 4 — Mostly Achieved\. Scale 1 \(Not Achieved\) to 5/)
    ).toBeInTheDocument();
  });
});
