import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProgramHeadOutcomesView } from "@/features/analytics/components/program-head-outcomes-view";
import type { ProgramHeadOutcomesDTO } from "@/features/analytics/program-head-analytics-types";

const PROGRAM_ID = "program-bsed";

function outcomeDTO(overrides: Partial<ProgramHeadOutcomesDTO> = {}): ProgramHeadOutcomesDTO {
  return {
    scope: {
      programCode: "BSED",
      programName: "Bachelor of Secondary Education",
      periodLabel: null,
    },
    periodOptions: { schoolYears: [], semesters: [], termInstances: [] },
    emptyReason: null,
    currentMappingDisclosure:
      "Outcome rows group historical ratings using the Program's current CILO-to-PLO mappings. Publication-time mapping snapshots are not yet available, so later mapping edits may reinterpret historical outcome rows.",
    manyToManyDisclosure: false,
    outcomes: [
      {
        ploId: "go-a",
        code: "GO-1",
        name: "Effective communicator",
        meanRating: 13 / 3, // 4.3333... full precision
        ratingCount: 3,
        submittedResponseCount: 2,
        contributingCilos: [
          { id: "cilo-1", description: "Achieve the outcome" },
          { id: "cilo-2", description: "Analyze evidence" },
        ],
        contributingCourses: [
          { id: "course-1", code: "EDUC 101", title: "Education 101" },
          { id: "course-2", code: "EDUC 202", title: "Education 202" },
        ],
        evidenceEvaluations: [
          { evaluationId: "eval-1", deploymentName: "CILO Evaluation" },
          { evaluationId: "eval-2", deploymentName: "CILO Evaluation 2" },
        ],
        distributions: [
          {
            scaleLabel: "1–5 (5-point)",
            categories: [
              { value: 1, label: null, count: 0, percentage: 0 },
              { value: 2, label: null, count: 0, percentage: 0 },
              { value: 3, label: null, count: 1, percentage: 1 / 3 },
              { value: 4, label: null, count: 1, percentage: 1 / 3 },
              { value: 5, label: null, count: 1, percentage: 1 / 3 },
            ],
          },
          {
            scaleLabel: "1–4 (4-point)",
            categories: [
              { value: 1, label: "Strongly Disagree", count: 0, percentage: 0 },
              { value: 2, label: "Disagree", count: 0, percentage: 0 },
              { value: 3, label: "Agree", count: 1, percentage: 1 },
              { value: 4, label: "Strongly Agree", count: 0, percentage: 0 },
            ],
          },
        ],
        spansMultipleScales: true,
        excludedRatingCount: 0,
      },
      {
        ploId: "go-b",
        code: "GO-2",
        name: "Critical thinker",
        meanRating: 2,
        ratingCount: 1,
        submittedResponseCount: 1,
        contributingCilos: [{ id: "cilo-3", description: "Evaluate claims" }],
        contributingCourses: [{ id: "course-3", code: "MATH 101", title: "Math 101" }],
        evidenceEvaluations: [{ evaluationId: "eval-3", deploymentName: "CILO Evaluation 3" }],
        distributions: [],
        spansMultipleScales: false,
        excludedRatingCount: 1,
      },
    ],
    ...overrides,
  };
}

function renderView(dto: ProgramHeadOutcomesDTO) {
  return render(
    <ProgramHeadOutcomesView
      programId={PROGRAM_ID}
      data={dto}
      resetHref="/program-head/programs/program-bsed/analytics?tab=outcomes"
    />
  );
}

describe("ProgramHeadOutcomesView", () => {
  it("renders the no-mapped-outcomes empty state with a reset link", () => {
    renderView(outcomeDTO({ emptyReason: "no-mapped-outcomes", outcomes: [] }));

    expect(screen.getByText("No mapped outcome evidence")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View all periods" })).toHaveAttribute(
      "href",
      "/program-head/programs/program-bsed/analytics?tab=outcomes"
    );
  });

  it("renders the no-assignments and no-submissions empty states", () => {
    const { unmount } = renderView(outcomeDTO({ emptyReason: "no-assignments", outcomes: [] }));
    expect(screen.getByText("No evaluation assignments")).toBeInTheDocument();
    unmount();

    renderView(outcomeDTO({ emptyReason: "no-submissions", outcomes: [] }));
    expect(screen.getByText("No submitted responses")).toBeInTheDocument();
  });

  it("discloses current-mapping interpretation whenever outcome rows exist", () => {
    renderView(outcomeDTO());

    expect(screen.getByText("Current CILO-to-PLO mappings")).toBeInTheDocument();
    expect(screen.getByText(/Publication-time mapping snapshots are not yet available/)).toBeInTheDocument();
  });

  it("discloses the many-to-many contribution rule only when it applies", () => {
    const { unmount } = renderView(outcomeDTO({ manyToManyDisclosure: true }));
    expect(screen.getByText("Multiple Program Learning Outcome mapping")).toBeInTheDocument();
    expect(screen.getByText(/contributes to each mapped outcome row/)).toBeInTheDocument();
    unmount();

    renderView(outcomeDTO({ manyToManyDisclosure: false }));
    expect(screen.queryByText("Multiple Program Learning Outcome mapping")).not.toBeInTheDocument();
  });

  it("exposes code, name, mean, rating count, response count, CILOs, and courses per row", () => {
    renderView(outcomeDTO());

    expect(screen.getAllByText("GO-1").length).toBeGreaterThan(0);
    expect(screen.getByText("Effective communicator")).toBeInTheDocument();
    expect(screen.getAllByText("4.33").length).toBeGreaterThan(0); // rounded display
    expect(screen.getAllByText("GO-2").length).toBeGreaterThan(0);
    expect(screen.getAllByText("2.00").length).toBeGreaterThan(0);
    expect(screen.getAllByText("2").length).toBeGreaterThan(0); // submitted responses
    expect(screen.getByText("Achieve the outcome")).toBeInTheDocument();
    expect(screen.getByText("Analyze evidence")).toBeInTheDocument();
    expect(screen.getByText("EDUC 101, EDUC 202")).toBeInTheDocument();
    expect(screen.getByText("MATH 101")).toBeInTheDocument();
  });

  it("links review evidence only to existing selected-Program review routes", () => {
    renderView(outcomeDTO());

    expect(screen.getByRole("link", { name: "CILO Evaluation" })).toHaveAttribute(
      "href",
      "/program-head/programs/program-bsed/responses/course/eval-1"
    );
    expect(screen.getByRole("link", { name: "CILO Evaluation 2" })).toHaveAttribute(
      "href",
      "/program-head/programs/program-bsed/responses/course/eval-2"
    );
  });

  it("shows the ranking chart insight and exact-value alternative", () => {
    renderView(outcomeDTO());

    expect(screen.getByText("Mean Rating by Program Learning Outcome")).toBeInTheDocument();
    expect(screen.getByText(/Highest mean: GO-1 \(4.33\)/)).toBeInTheDocument();
    expect(screen.getByText("View exact values")).toBeInTheDocument();
  });

  it("reveals the detail state with exact values, distributions, and excluded-rating diagnostics", () => {
    renderView(outcomeDTO());

    // Detail content is reachable through the summary disclosure.
    const go1Summary = screen.getByText("Details for GO-1");
    fireEvent.click(go1Summary);
    const go1Detail = go1Summary.closest("details")!;

    // Full-precision mean as an accessible exact-value alternative.
    expect(within(go1Detail).getByText("Mean Rating (full precision)")).toBeInTheDocument();
    expect(within(go1Detail).getByText(String(13 / 3))).toBeInTheDocument();

    // Scale-resolved distribution with snapshot-derived labels and shares.
    expect(within(go1Detail).getByText("Likert distribution by scale")).toBeInTheDocument();
    expect(within(go1Detail).getByText("Scale: 1–5 (5-point)")).toBeInTheDocument();
    expect(within(go1Detail).getAllByText("33.3%")).toHaveLength(3);
    expect(within(go1Detail).getByText("3 valid ratings on this scale.")).toBeInTheDocument();

    // Mixed-scale rows disclose that the pooled mean spans distinct scales.
    expect(
      within(go1Detail).getByText(/pools ratings from 2 distinct rating scales/)
    ).toBeInTheDocument();

    // Excluded-rating diagnostic appears only for rows with exclusions.
    fireEvent.click(screen.getByText("Details for GO-2"));
    expect(
      screen.getByText(/1 rating was excluded from the valid aggregate/)
    ).toBeInTheDocument();
  });
});
