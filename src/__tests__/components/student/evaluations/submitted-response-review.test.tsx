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
    render(
      <SubmittedResponseReview
        evaluationTitle="IT201 Post-Term CILO Evaluation"
        courseTitle="Data Structures"
        programLabel="BSIT"
        submittedAt={new Date("2026-09-12T16:37:50.000Z")}
        sections={[]}
      />
    );

    expect(screen.getByText("Submitted on Sep 13, 2026, 12:37 AM")).toBeInTheDocument();
  });
});
