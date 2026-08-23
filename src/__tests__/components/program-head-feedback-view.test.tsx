import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProgramHeadFeedbackView } from "@/features/analytics/components/program-head-feedback-view";
import type { ProgramHeadFeedbackDTO } from "@/features/analytics/program-head-analytics-types";

vi.mock("@/features/analytics/components/qualitative-word-cloud", () => ({
  QualitativeWordCloud: ({
    title,
    tokens,
    responseCount,
  }: {
    title: string;
    tokens: Array<{ text: string; value: number }>;
    responseCount: number;
  }) => (
    <section>
      <h2>{title}</h2>
      <p>
        {responseCount} qualitative {responseCount === 1 ? "response" : "responses"}
      </p>
      <table>
        <tbody>
          {tokens.map((token) => (
            <tr key={token.text}>
              <td>{token.text}</td>
              <td>{token.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  ),
}));

const PROGRAM_ID = "program-bsed";

function feedbackDTO(overrides: Partial<ProgramHeadFeedbackDTO> = {}): ProgramHeadFeedbackDTO {
  return {
    scope: {
      programCode: "BSED",
      programName: "Bachelor of Secondary Education",
      periodLabel: null,
    },
    periodOptions: { schoolYears: [], semesters: [], termInstances: [] },
    emptyReason: null,
    tokens: [
      { text: "clarity", value: 3 },
      { text: "support", value: 2 },
    ],
    qualitativeItemCount: 4,
    qualitativeResponseCount: 3,
    sourceCounts: [
      {
        sourceKey: "COURSE_STUDENT",
        sourceLabel: "Course-bound student evidence",
        itemCount: 3,
        responseCount: 2,
      },
      {
        sourceKey: "ALUMNI",
        sourceLabel: "Alumni evidence",
        itemCount: 1,
        responseCount: 1,
      },
    ],
    promptCounts: [
      {
        sourceLabel: "Course-bound student evidence",
        promptLabel: "What worked well?",
        itemCount: 3,
        responseCount: 2,
      },
    ],
    evidenceEvaluations: [
      { evaluationId: "eval-1", deploymentName: "CILO Evaluation" },
      { evaluationId: "eval-2", deploymentName: "CILO Evaluation 2" },
    ],
    ...overrides,
  };
}

function renderView(dto: ProgramHeadFeedbackDTO) {
  return render(
    <ProgramHeadFeedbackView
      programId={PROGRAM_ID}
      data={dto}
      resetHref="/program-head/programs/program-bsed/analytics?tab=feedback"
    />
  );
}

describe("ProgramHeadFeedbackView", () => {
  it("renders the no-qualitative-evidence empty state with a reset link", () => {
    renderView(
      feedbackDTO({
        emptyReason: "no-qualitative-evidence",
        tokens: [],
        qualitativeItemCount: 0,
        qualitativeResponseCount: 0,
        sourceCounts: [],
        promptCounts: [],
        evidenceEvaluations: [],
      })
    );

    expect(screen.getByText("No qualitative evidence")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View all periods" })).toHaveAttribute(
      "href",
      "/program-head/programs/program-bsed/analytics?tab=feedback"
    );
    expect(screen.queryByText("Qualitative Feedback")).not.toBeInTheDocument();
  });

  it("renders the no-assignments and no-submissions empty states", () => {
    const { unmount } = renderView(
      feedbackDTO({ emptyReason: "no-assignments", tokens: [], evidenceEvaluations: [] })
    );
    expect(screen.getByText("No evaluation assignments")).toBeInTheDocument();
    unmount();

    renderView(feedbackDTO({ emptyReason: "no-submissions", tokens: [], evidenceEvaluations: [] }));
    expect(screen.getByText("No submitted responses")).toBeInTheDocument();
  });

  it("shows source and prompt counts plus exact token values", () => {
    renderView(feedbackDTO());

    expect(screen.getByText("Qualitative Feedback")).toBeInTheDocument();
    expect(screen.getByText("3 qualitative responses")).toBeInTheDocument();
    expect(screen.getByText("clarity")).toBeInTheDocument();
    expect(screen.getByText("Course-bound student evidence")).toBeInTheDocument();
    expect(screen.getByText("Alumni evidence")).toBeInTheDocument();
    expect(screen.getByText(/Course-bound student evidence — What worked well\?/)).toBeInTheDocument();
    expect(screen.getByText("4 qualitative items from 3 submitted responses")).toBeInTheDocument();
  });

  it("keeps counts visible when redaction leaves no tokenizable terms", () => {
    renderView(feedbackDTO({ tokens: [] }));

    expect(screen.getByText("No tokenizable terms")).toBeInTheDocument();
    expect(screen.getByText("Source counts")).toBeInTheDocument();
    expect(screen.queryByText("No qualitative evidence")).not.toBeInTheDocument();
  });

  it("links review evidence only to existing selected-Program review routes", () => {
    renderView(feedbackDTO());

    expect(screen.getByRole("link", { name: "CILO Evaluation" })).toHaveAttribute(
      "href",
      "/program-head/programs/program-bsed/responses/course/eval-1"
    );
    expect(screen.getByRole("link", { name: "CILO Evaluation 2" })).toHaveAttribute(
      "href",
      "/program-head/programs/program-bsed/responses/course/eval-2"
    );
    expect(screen.queryByRole("link", { name: /response-/ })).not.toBeInTheDocument();
  });
});
