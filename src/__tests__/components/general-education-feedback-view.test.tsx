import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GeneralEducationFeedbackView } from "@/features/analytics/components/general-education-feedback-view";
import type { GeneralEducationFeedbackDTO } from "@/features/analytics/general-education-analytics-types";
import type { GeneralEducationAnalyticsFilterState } from "@/features/analytics/services/general-education-analytics-state";

vi.mock("@/features/analytics/components/general-education-inline-ai-insight", () => ({
  GeneralEducationInlineAiInsight: ({
    view,
    evidenceBasis,
    qualitative,
  }: {
    view: string;
    evidenceBasis: string;
    qualitative?: boolean;
  }) => <div>{`AI insight [${view}${qualitative ? " qualitative" : ""}]: ${evidenceBasis}`}</div>,
}));

// The word cloud carries the deterministic redaction rules, not this view's
// branching; the branch that belongs here is released terms versus the
// redaction-floor alert, so the chart is stubbed to name its tokens.
vi.mock("@/features/analytics/components/general-education-analytics-visualizations", () => ({
  LazyQualitativeWordCloud: ({ tokens }: { tokens: Array<{ text: string }> }) => (
    <div>word cloud: {tokens.map((token) => token.text).join(", ")}</div>
  ),
}));

const FILTERS = {
  tab: "qualitative",
  schoolYearId: "11111111-1111-4111-8111-111111111111",
  courseId: "22222222-2222-4222-8222-222222222222",
  programId: "33333333-3333-4333-8333-333333333333",
  yearLevel: "THIRD_YEAR",
} as GeneralEducationAnalyticsFilterState;

const RESET_HREF = "/gen-ed-coordinator/analytics?tab=qualitative";

const SCOPED_REVIEW_HREF =
  "/gen-ed-coordinator/responses?schoolYearId=11111111-1111-4111-8111-111111111111" +
  "&courseId=22222222-2222-4222-8222-222222222222" +
  "&programId=33333333-3333-4333-8333-333333333333" +
  "&yearLevel=THIRD_YEAR";

function feedbackDTO(
  overrides: Partial<GeneralEducationFeedbackDTO> = {}
): GeneralEducationFeedbackDTO {
  return {
    emptyReason: null,
    tokens: [
      { text: "relevant", value: 6, responseCount: 5 },
      { text: "engaging", value: 4, responseCount: 3 },
    ],
    tone: { scoredItemCount: 12, positive: 8, neutral: 3, negative: 1 },
    qualitativeItemCount: 12,
    qualitativeResponseCount: 9,
    sourceLabel: "General Education course evidence",
    promptCounts: [
      {
        sourceLabel: "Student",
        promptLabel: "What went well?",
        promptKey: "went-well",
        instrumentId: "instrument-1",
        instrumentLabel: "GEETHICS v1",
        itemCount: 12,
        responseCount: 9,
        tone: { scoredItemCount: 12, positive: 8, neutral: 3, negative: 1 },
        terms: [{ text: "relevant", value: 6, responseCount: 5 }],
      },
      {
        sourceLabel: "Alumni",
        promptLabel: "What went well?",
        promptKey: "went-well",
        instrumentId: "instrument-2",
        instrumentLabel: "GEETHICS v2",
        itemCount: 3,
        responseCount: 2,
        tone: { scoredItemCount: 3, positive: 1, neutral: 2, negative: 0 },
        terms: [{ text: "relevant", value: 2, responseCount: 2 }],
      },
    ],
    evidenceEvaluations: [
      { evaluationId: "eval-1", deploymentName: "GEETHICS Post-Term" },
      { evaluationId: "eval-2", deploymentName: "GEETHICS Mid-Term" },
    ],
    ...overrides,
  };
}

function renderView(dto = feedbackDTO(), filters = FILTERS) {
  return render(
    <GeneralEducationFeedbackView data={dto} resetHref={RESET_HREF} filters={filters} />
  );
}

describe("GeneralEducationFeedbackView", () => {
  afterEach(cleanup);

  it("counts written evidence in singular and plural from one evidence count", () => {
    renderView(feedbackDTO({ qualitativeItemCount: 1, qualitativeResponseCount: 1 }));
    expect(screen.getByText("1 written answer from 1 submitted response.")).toBeInTheDocument();
    cleanup();

    renderView(feedbackDTO({ qualitativeItemCount: 12, qualitativeResponseCount: 9 }));
    expect(screen.getByText("12 written answers from 9 submitted responses.")).toBeInTheDocument();
  });

  it("explains the redaction floor instead of an empty chart when no term is released", () => {
    renderView(feedbackDTO({ tokens: [] }));

    expect(screen.getByText("No term cleared the redaction floor")).toBeInTheDocument();
    expect(screen.queryByText(/word cloud:/)).toBeNull();
    // Written evidence stays counted even though nothing reached the chart.
    expect(screen.getByText("12 written answers from 9 submitted responses.")).toBeInTheDocument();
  });

  it("keeps one row per instrument when two instruments share a prompt label", () => {
    renderView();

    const table = screen.getByRole("table", { name: "Exact values: prompt structure" });
    expect(within(table).getAllByText(/What went well\?/)).toHaveLength(2);
    expect(within(table).getByText("GEETHICS v1")).toBeInTheDocument();
    expect(within(table).getByText("GEETHICS v2")).toBeInTheDocument();
    expect(within(table).getByText("8 / 3 / 1")).toBeInTheDocument();
    expect(within(table).getByText("1 / 2 / 0")).toBeInTheDocument();
  });

  it("reports a scope whose prompts carry no released written answer without a prompt table", () => {
    renderView(feedbackDTO({ promptCounts: [] }));

    expect(
      screen.getByText("No instrument prompt carried a released written answer in this scope.")
    ).toBeInTheDocument();
    expect(screen.queryByRole("table", { name: "Exact values: prompt structure" })).toBeNull();
  });

  it("scopes identified review to the whole window rather than one evaluation", () => {
    renderView();

    const links = screen.getAllByRole("link", {
      name: /Review all identified responses in this scope/,
    });
    expect(links).toHaveLength(2);
    for (const link of links) {
      expect(link).toHaveAttribute("href", SCOPED_REVIEW_HREF);
    }
    expect(links[0]).toHaveTextContent("GEETHICS Post-Term and 1 more");
    expect(links[1]).toHaveTextContent("GEETHICS Mid-Term and 1 more");
  });

  it("says no evaluation contributed answers instead of an empty review list", () => {
    renderView(feedbackDTO({ evidenceEvaluations: [] }));

    expect(
      screen.getByText("No General Education evaluation contributed written answers in this scope.")
    ).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Review all identified responses/ })).toBeNull();
  });

  it("reports a scope with no submissions without qualitative detail and still mounts one insight", () => {
    renderView(feedbackDTO({ emptyReason: "no-submissions" }));

    expect(screen.getByText("No submitted responses")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View all periods" })).toHaveAttribute(
      "href",
      RESET_HREF
    );
    // The scope-level reason discloses absence, so the qualitative-specific
    // copy must not claim written evidence was withheld by the release floor.
    expect(screen.queryByText("No qualitative evidence")).toBeNull();
    expect(screen.queryByRole("table", { name: "Exact values: prompt structure" })).toBeNull();
    expect(
      screen.getByText(
        "AI insight [qualitative qualitative]: No released written feedback in this scope"
      )
    ).toBeInTheDocument();
  });

  it("keeps quantitative views reachable when submissions exist but no comment does", () => {
    renderView(feedbackDTO({ emptyReason: "no-qualitative-evidence", tokens: [] }));

    expect(screen.getByText("No qualitative evidence")).toBeInTheDocument();
    expect(screen.getByText(/none include a non-empty written comment/)).toBeInTheDocument();
    // Terms were withheld by the release floor on purpose, not by redaction, so
    // the released-terms alert must not appear on this path.
    expect(screen.queryByText("No term cleared the redaction floor")).toBeNull();
    expect(screen.queryByRole("table", { name: "Exact values: prompt structure" })).toBeNull();
    expect(
      screen.getByText(
        "AI insight [qualitative qualitative]: No released written feedback in this scope"
      )
    ).toBeInTheDocument();
  });

  it("mounts exactly one insight carrying the deterministic evidence basis", () => {
    renderView();

    const insights = screen.getAllByText(/^AI insight /);
    expect(insights).toHaveLength(1);
    expect(insights[0]).toHaveTextContent(
      "AI insight [qualitative qualitative]: 12 identifier-redacted written answers from 9 submitted responses"
    );
  });
});
