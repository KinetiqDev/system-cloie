import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProgramHeadAIInsightsView } from "@/features/analytics/components/program-head-ai-insights-view";
import type { GenerateAIInsightResult } from "@/features/analytics/services/generate-program-head-analytics-insight";

const { actionMock } = vi.hoisted(() => ({
  actionMock: vi.fn(),
}));

vi.mock("@/lib/actions/program-head-analytics-actions", () => ({
  generateProgramHeadAnalyticsInsightAction: actionMock,
}));

const SCOPE = {
  programCode: "BSED",
  programName: "Bachelor of Secondary Education",
  periodLabel: null,
};

const SUCCESS: GenerateAIInsightResult = {
  ok: true,
  data: {
    fingerprint: "school-year-1|FIRST|term-1|ALUMNI|ALUMNI",
    scope: SCOPE,
    summary: "Evidence shows engaged cohorts.",
    strengths: ["Consistent course-bound engagement"],
    areasForReview: ["Qualitative prompts draw few responses"],
    themes: [{ name: "Teaching clarity", summary: "Ratings cluster at the top of the scale." }],
    sentimentClassifications: [
      { evidenceCategory: "Course-bound student evidence", sentiment: "positive", rationale: "High means." },
      { evidenceCategory: "Course-bound student evidence", sentiment: "positive", rationale: "Consistent distributions." },
      { evidenceCategory: "Alumni evidence", sentiment: "negative", rationale: "Lower coverage." },
    ],
    sentimentCounts: [
      { sentiment: "positive", count: 2, percentage: 2 / 3 },
      { sentiment: "negative", count: 1, percentage: 1 / 3 },
      { sentiment: "neutral", count: 0, percentage: 0 },
      { sentiment: "mixed", count: 0, percentage: 0 },
    ],
    questionsForHumanReview: ["Why do alumni respond less?"],
    limitations: ["Aggregate evidence only."],
    evidenceScope: {
      submittedResponseCount: 24,
      qualitativeItemCount: 12,
      evaluatedSourceLabels: ["Course-bound student evidence", "Alumni evidence"],
      tokenAnalysis: { availableTokenCount: 20, includedTokenCount: 20, truncated: false },
    },
  },
};

const FILTERS = {
  tab: "ai" as const,
  schoolYearId: "school-year-1",
  semester: "FIRST" as const,
  termInstanceId: "term-1",
  evidenceSource: "ALUMNI" as const,
  stakeholder: "ALUMNI" as const,
};

function renderView() {
  return render(
    <ProgramHeadAIInsightsView programId="program-bsed" filters={FILTERS} scope={SCOPE} />
  );
}

describe("ProgramHeadAIInsightsView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    actionMock.mockResolvedValue({
      ok: false,
      state: "disabled",
    } satisfies GenerateAIInsightResult);
  });

  it("requests interpretation on demand, sending only program id and validated filter state", async () => {
    actionMock.mockResolvedValue(SUCCESS);
    renderView();

    fireEvent.click(screen.getByRole("button", { name: "Generate interpretation" }));

    await waitFor(() => {
      expect(actionMock).toHaveBeenCalledWith({
        programId: "program-bsed",
        filters: {
          tab: "ai",
          schoolYearId: "school-year-1",
          semester: "FIRST",
          termInstanceId: "term-1",
          evidenceSource: "ALUMNI",
          stakeholder: "ALUMNI",
        },
      });
    });
  });

  it("renders validated aggregate findings with locally computed counts", async () => {
    actionMock.mockResolvedValue(SUCCESS);
    renderView();
    fireEvent.click(screen.getByRole("button", { name: "Generate interpretation" }));

    expect(await screen.findByText("Evidence shows engaged cohorts.")).toBeInTheDocument();
    expect(screen.getByText("Consistent course-bound engagement")).toBeInTheDocument();
    expect(screen.getByText("Teaching clarity")).toBeInTheDocument();
    expect(screen.getByText("66.7%")).toBeInTheDocument();
    expect(screen.getByText("33.3%")).toBeInTheDocument();
    expect(screen.getByText(/Interpreted 24 submitted responses and 12 non-empty/)).toBeInTheDocument();
    expect(screen.getByText("Human CQI decision remains authoritative")).toBeInTheDocument();
    // No raw evidence text is ever rendered.
    expect(screen.queryByText(/helpful|teacher was amazing/)).not.toBeInTheDocument();
  });

  it("explains that AI is disabled and keeps the view recoverable", async () => {
    renderView();
    fireEvent.click(screen.getByRole("button", { name: "Generate interpretation" }));

    expect(await screen.findByText("AI Insights are not enabled")).toBeInTheDocument();
    expect(screen.getByText(/deterministic analytics views remain available/)).toBeInTheDocument();
  });

  it("shows an explicit insufficient-evidence state with the corpus counts", async () => {
    actionMock.mockResolvedValue({
      ok: false,
      state: "insufficient-evidence",
      detail: {
        submittedResponseCount: 3,
        minimumSubmittedResponses: 10,
        qualitativeItemCount: 2,
        minimumQualitativeItems: 5,
      },
    } satisfies GenerateAIInsightResult);
    renderView();
    fireEvent.click(screen.getByRole("button", { name: "Generate interpretation" }));

    expect(
      await screen.findByText("Not enough evidence for a responsible interpretation")
    ).toBeInTheDocument();
    expect(
      screen.getByText(/3 submitted responses \(minimum 10\) and 2 non-empty qualitative items \(minimum 5\)/)
    ).toBeInTheDocument();
    expect(screen.getByText(/No provider request was made/)).toBeInTheDocument();
  });

  it("shows a recoverable error state without exposing provider details", async () => {
    actionMock.mockResolvedValue({ ok: false, state: "provider-error" } satisfies GenerateAIInsightResult);
    renderView();
    fireEvent.click(screen.getByRole("button", { name: "Generate interpretation" }));

    expect(await screen.findByText("Interpretation unavailable")).toBeInTheDocument();
    expect(
      screen.getByText(/The interpretation could not be generated\. This is recoverable/)
    ).toBeInTheDocument();
    // No provider details or secrets are disclosed in the error state.
    expect(screen.queryByText(/timed out|api key|secret|base URL/i)).not.toBeInTheDocument();
  });

  it("marks results stale when the URL filter state changes after generation", async () => {
    actionMock.mockResolvedValue(SUCCESS);
    const { rerender } = renderView();
    fireEvent.click(screen.getByRole("button", { name: "Generate interpretation" }));
    expect(await screen.findByText("Evidence shows engaged cohorts.")).toBeInTheDocument();
    expect(screen.queryByText("Filters changed since this interpretation")).not.toBeInTheDocument();

    const changedFilters = { ...FILTERS, termInstanceId: "term-2" };
    rerender(
      <ProgramHeadAIInsightsView programId="program-bsed" filters={changedFilters} scope={SCOPE} />
    );

    expect(screen.getByText("Filters changed since this interpretation")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Generate new interpretation" })
    ).toBeInTheDocument();
  });

  it("keeps a matching fingerprint current when the scope is unchanged", async () => {
    actionMock.mockResolvedValue(SUCCESS);
    const { rerender } = renderView();
    fireEvent.click(screen.getByRole("button", { name: "Generate interpretation" }));
    await screen.findByText("Evidence shows engaged cohorts.");

    rerender(
      <ProgramHeadAIInsightsView programId="program-bsed" filters={FILTERS} scope={SCOPE} />
    );

    expect(screen.queryByText("Filters changed since this interpretation")).not.toBeInTheDocument();
  });

  it("requires an explicit new request after a filter change", async () => {
    actionMock
      .mockResolvedValueOnce(SUCCESS)
      .mockResolvedValueOnce({
        ...SUCCESS,
        data: { ...SUCCESS.data, fingerprint: "school-year-1|FIRST|term-2|ALUMNI|ALUMNI" },
      } satisfies GenerateAIInsightResult);
    const { rerender } = renderView();
    fireEvent.click(screen.getByRole("button", { name: "Generate interpretation" }));
    await screen.findByText("Evidence shows engaged cohorts.");

    rerender(
      <ProgramHeadAIInsightsView
        programId="program-bsed"
        filters={{ ...FILTERS, termInstanceId: "term-2" }}
        scope={SCOPE}
      />
    );
    expect(screen.getByText("Filters changed since this interpretation")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Generate new interpretation" }));
    await waitFor(() => {
      expect(actionMock).toHaveBeenLastCalledWith({
        programId: "program-bsed",
        filters: {
          tab: "ai",
          schoolYearId: "school-year-1",
          semester: "FIRST",
          termInstanceId: "term-2",
          evidenceSource: "ALUMNI",
          stakeholder: "ALUMNI",
        },
      });
    });
    // Fresh result fingerprint matches the current scope, so the banner clears.
    await waitFor(() => {
      expect(screen.queryByText("Filters changed since this interpretation")).not.toBeInTheDocument();
    });
  });

  it("does not auto-generate on mount and leaves deterministic controls accessible", () => {
    renderView();
    expect(actionMock).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Generate interpretation" })).toBeEnabled();
  });

  it("renders a loading state while generating", async () => {
    let resolveAction: (value: GenerateAIInsightResult) => void = () => {};
    actionMock.mockImplementation(
      () =>
        new Promise<GenerateAIInsightResult>((resolve) => {
          resolveAction = resolve;
        })
    );
    renderView();
    fireEvent.click(screen.getByRole("button", { name: "Generate interpretation" }));

    expect(await screen.findByText(/Rebuilding evidence and requesting interpretation/)).toBeInTheDocument();
    resolveAction(SUCCESS);
    expect(await screen.findByText("Evidence shows engaged cohorts.")).toBeInTheDocument();
  });

  it("renders supplementary interpretation with links back to deterministic evidence", async () => {
    actionMock.mockResolvedValue(SUCCESS);
    renderView();
    fireEvent.click(screen.getByRole("button", { name: "Generate interpretation" }));
    await screen.findByText("Evidence shows engaged cohorts.");

    const outcomesLink = screen.getByRole("link", { name: "Review Outcomes" });
    expect(outcomesLink).toHaveAttribute(
      "href",
      expect.stringContaining("/program-head/programs/program-bsed/analytics")
    );
    expect(screen.getByRole("link", { name: "Review Qualitative" })).toBeInTheDocument();
  });
});