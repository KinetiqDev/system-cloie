// fallow-ignore-file code-duplication
import { act, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FacultyAnalyticsDashboard } from "@/features/analytics/components/faculty-analytics-dashboard";
import type { FacultyAnalyticsData, FacultyAnalyticsOptions } from "@/features/analytics/types";
import { classifyOutcomeDistributions } from "@/features/analytics/aggregators/outcome-attainment";

const { pushMock, generateInsightMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  generateInsightMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("@/lib/actions/faculty-analytics-actions", () => ({
  generateFacultyAnalyticsInsightAction: generateInsightMock,
}));

// The written-feedback view mounts the word cloud, which pulls in the layout
// library through next/dynamic. Only the AI section is under test here, so the
// cloud renders as its own titled placeholder.
vi.mock("@/features/analytics/components/qualitative-word-cloud", () => ({
  QualitativeWordCloud: ({ title }: { title: string }) => <div>{title}</div>,
}));

const data: FacultyAnalyticsData = {
  filters: { view: "overview" },
  scopeLabel: "No evaluation evidence matches this scope.",
  evaluations: [],
  kpi: {
    submittedResponseCount: 0,
    opportunityCount: 0,
    responseRate: null,
    validRatingCount: 0,
    overallMean: null,
    overallScaleLabel: null,
    overallScaleMax: null,
    spansMultipleScales: false,
  },
  ratingDistributions: [],
  ciloMetrics: [],
  questionMetrics: [],
  trends: [],
  qualitative: {
    available: false,
    submittedResponseCount: 0,
    responseCount: 0,
    itemCount: 0,
    evaluationCount: 0,
    tokens: [],
    tone: { scoredItemCount: 0, positive: 0, neutral: 0, negative: 0 },
    promptCounts: [],
  },
};

const options: FacultyAnalyticsOptions = {
  terms: [],
  courses: [],
  assignments: [],
  evaluations: [],
};

// A rated scope with submitted responses: the AI request is worth making, and
// the exact participation figures stay on screen whatever it returns.
const ratedScope: FacultyAnalyticsData = {
  ...data,
  scopeLabel: "Showing 1 evaluation across 1 course, based on 12 submitted responses.",
  evaluations: [
    {
      id: "evaluation-1",
      deploymentName: "End-of-term evaluation",
      assignmentId: "assignment-1",
      courseId: "course-1",
      courseCode: "IT201",
      courseTitle: "Data Structures",
      classLabel: "BSIT · 2nd year · Morning",
      programName: "BSIT",
      termInstanceId: "term-1",
      termInstanceLabel: "2026–2027 · 1st Semester",
      status: "CLOSED",
      responseCount: 12,
      opportunityCount: 20,
    },
  ],
  kpi: {
    submittedResponseCount: 12,
    opportunityCount: 20,
    responseRate: 0.6,
    validRatingCount: 40,
    overallMean: 4.3,
    overallScaleLabel: "1–5 (5-point)",
    overallScaleMax: 5,
    spansMultipleScales: false,
  },
  ratingDistributions: [
    {
      scaleKey: "scale-1",
      scaleLabel: "1–5 (5-point)",
      scaleMin: 1,
      scaleMax: 5,
      mean: 4.3,
      ratingCount: 40,
      responseCount: 12,
      excludedRatingCount: 0,
      categories: [
        { value: 5, label: "Excellent", count: 24, percentage: 0.6 },
        { value: 4, label: "Good", count: 16, percentage: 0.4 },
      ],
    },
  ],
};

const qualitativeScope: FacultyAnalyticsData = {
  ...ratedScope,
  filters: { view: "qualitative" },
  qualitative: {
    available: true,
    submittedResponseCount: 12,
    responseCount: 10,
    itemCount: 30,
    evaluationCount: 1,
    tokens: [{ text: "helpful", value: 6 }],
    tone: { scoredItemCount: 30, positive: 12, neutral: 14, negative: 4 },
    promptCounts: [],
  },
};

const SECTION = {
  observation: "Ratings on this scale ranged from 4 to 5 across 40 ratings.",
  evidence: ["40 valid ratings sit on the 1–5 scale."],
  connection: null,
  limitation: null,
  reviewQuestion: null,
};

function insightResult({
  overview = SECTION,
  qualitative = null,
  truncatedEvidence = false,
  qualitativeTruncated = false,
}: {
  overview?: typeof SECTION | null;
  qualitative?: typeof SECTION | null;
  truncatedEvidence?: boolean;
  qualitativeTruncated?: boolean;
} = {}) {
  return {
    ok: true as const,
    data: {
      overview,
      cilos: null,
      questions: null,
      trends: null,
      qualitative,
      evidence: {
        submittedResponseCount: 12,
        validRatingCount: 40,
        qualitativeItemCount: 30,
        truncatedEvidence,
        qualitativeTruncated,
      },
    },
  };
}

async function settleInsight() {
  await act(async () => {
    await vi.waitFor(() => expect(generateInsightMock).toHaveBeenCalled());
  });
}

describe("CILO attainment chart presentation", () => {
  it.each([true, false])(
    "uses validated status colors and gates the benchmark, classified=%s",
    (classified) => {
      const mean = 3;
      const categories = [
        "Not Achieved",
        "Slightly Achieved",
        "Moderately Achieved",
        "Mostly Achieved",
        "Fully Achieved",
      ].map((label, index) => ({ value: index + 1, label, count: 1, percentage: 0.2 }));
      const attainment = classifyOutcomeDistributions(
        mean,
        classified ? [{ categories }] : [],
        false
      );
      const { container } = render(
        <FacultyAnalyticsDashboard
          options={options}
          data={{
            ...ratedScope,
            filters: { view: "cilos" },
            ciloMetrics: [
              {
                key: "cilo-1",
                ciloId: "cilo-1",
                label: "CILO 1",
                courseId: "course-1",
                courseCode: "IT201",
                courseTitle: "Data Structures",
                evaluationId: "evaluation-1",
                evaluationName: "End-of-term evaluation",
                description: "Apply data structures",
                questions: [],
                attainment,
                scaleGroups: [{ ...ratedScope.ratingDistributions[0], mean, categories }],
              },
            ],
          }}
        />
      );
      expect(
        screen.getByRole("region", { name: "Attainment interpretation guide" })
      ).toBeInTheDocument();
      expect(container.querySelector(".recharts-bar-rectangle path")).toHaveAttribute(
        "fill",
        classified ? "var(--color-warning)" : "var(--text-muted)"
      );
      expect(container.querySelectorAll(".recharts-reference-line")).toHaveLength(
        classified ? 1 : 0
      );
    }
  );
});

afterEach(() => {
  vi.restoreAllMocks();
  pushMock.mockReset();
  // Call history must not leak: one test asserts that a scope with no
  // submissions never reaches the action at all.
  generateInsightMock.mockReset();
});

describe("FacultyAnalyticsDashboard", () => {
  it.each(["overview", "cilos", "questions", "trends", "qualitative"] as const)(
    "places view navigation before the evidence scope in the %s view",
    (view) => {
      render(<FacultyAnalyticsDashboard data={{ ...data, filters: { view } }} options={options} />);

      const heading = screen.getByRole("heading", { level: 1 });
      const navigation = screen.getByRole("navigation", { name: "Analytics view" });
      const scope = screen.getByRole("region", { name: "Evidence scope" });
      const mobileViewSelect = screen.getByRole("combobox", { name: "Analytics view" });
      expect(
        mobileViewSelect.compareDocumentPosition(scope) & Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy();
      expect(
        heading.compareDocumentPosition(navigation) & Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy();
      expect(
        navigation.compareDocumentPosition(scope) & Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy();
    }
  );

  it("renders the analytics views as link tabs that mark the active view", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    render(<FacultyAnalyticsDashboard data={data} options={options} />);

    const navigation = screen.getByRole("navigation", { name: "Analytics view" });
    const tabs = within(navigation).getAllByRole("link");
    expect(tabs).toHaveLength(5);
    expect(within(navigation).getByRole("link", { name: "CILO results" })).toHaveAttribute(
      "href",
      "/faculty/analytics?view=cilos"
    );
    expect(within(navigation).getByRole("link", { name: "Overview" })).toHaveAttribute(
      "aria-current",
      "page"
    );
    expect(within(navigation).getByRole("link", { name: "CILO results" })).not.toHaveAttribute(
      "aria-current"
    );
    const consoleMessages = consoleError.mock.calls.flat().map(String);
    expect(consoleMessages).not.toEqual(
      expect.arrayContaining([expect.stringContaining("expected a native <button>")])
    );
  });

  it("groups repeated CILO labels under their course and evaluation context", () => {
    const scaleGroup = {
      scaleKey: "scale-1",
      scaleLabel: "1–5 (5-point)",
      scaleMin: 1,
      scaleMax: 5,
      mean: 4.5,
      ratingCount: 2,
      responseCount: 2,
      excludedRatingCount: 0,
      categories: [],
    };
    const ciloData: FacultyAnalyticsData = {
      ...data,
      filters: { view: "cilos" },
      evaluations: [
        {
          id: "evaluation-1",
          deploymentName: "Capstone exit evaluation",
          assignmentId: "assignment-1",
          courseId: "course-1",
          courseCode: "ITRES1",
          courseTitle: "Capstone Project 1",
          classLabel: "BSIT · 4th year · Morning",
          programName: "BSIT",
          termInstanceId: "term-1",
          termInstanceLabel: "2026–2027 · 2nd Semester",
          status: "CLOSED",
          responseCount: 2,
          opportunityCount: 2,
        },
      ],
      ciloMetrics: [
        {
          key: "binding-1",
          ciloId: "cilo-1",
          courseId: "course-1",
          courseCode: "ITRES1",
          courseTitle: "Capstone Project 1",
          evaluationId: "evaluation-1",
          evaluationName: "Capstone exit evaluation",
          label: "CILO 1",
          description: "Defend the proposed capstone scope and methodology.",
          questions: [
            {
              sectionKey: "cilo-items",
              itemKey: "cilo-attainment-1",
              prompt: "I achieved the first course intended learning outcome.",
            },
          ],
          scaleGroups: [scaleGroup],
        },
        {
          key: "binding-2",
          ciloId: "cilo-2",
          courseId: "course-2",
          courseCode: "IT201",
          courseTitle: "Data Structures",
          evaluationId: "evaluation-2",
          evaluationName: "End-of-term evaluation",
          label: "CILO 1",
          description:
            "Implement fundamental data structures (arrays, linked lists, trees, graphs) in a programming language.",
          questions: [
            {
              sectionKey: "cilo-items",
              itemKey: "cilo-attainment-1",
              prompt: "I achieved the first course intended learning outcome.",
            },
          ],
          scaleGroups: [{ ...scaleGroup, scaleKey: "scale-2" }],
        },
      ],
    };

    render(<FacultyAnalyticsDashboard data={ciloData} options={options} />);

    expect(screen.getByRole("heading", { name: "Capstone Project 1" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Data Structures" })).toBeInTheDocument();
    expect(screen.getAllByText("CILO 1").length).toBeGreaterThanOrEqual(4);
    expect(screen.getAllByText("ITRES1").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("IT201").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("Capstone exit evaluation").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("End-of-term evaluation").length).toBeGreaterThanOrEqual(2);
    expect(
      screen.getByText(
        "The highest CILO mean is shared by 2 CILOs (4.50). The lowest is shared by 2 CILOs (4.50)."
      )
    ).toBeInTheDocument();
  });

  it("renders every bound question when section and item keys collide under a separator join", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const scaleGroup = {
      scaleKey: "scale-1",
      scaleLabel: "1–5 (5-point)",
      scaleMin: 1,
      scaleMax: 5,
      mean: 4,
      ratingCount: 2,
      responseCount: 2,
      excludedRatingCount: 0,
      categories: [],
    };
    const collidingData: FacultyAnalyticsData = {
      ...data,
      filters: { view: "cilos" },
      evaluations: [
        {
          id: "evaluation-1",
          deploymentName: "End-of-term evaluation",
          assignmentId: "assignment-1",
          courseId: "course-1",
          courseCode: "IT201",
          courseTitle: "Data Structures",
          classLabel: "BSIT · 2nd year · Morning",
          programName: "BSIT",
          termInstanceId: "term-1",
          termInstanceLabel: "2026–2027 · 1st Semester",
          status: "CLOSED",
          responseCount: 2,
          opportunityCount: 2,
        },
      ],
      ciloMetrics: [
        {
          key: '["evaluation-1","cilo-1"]',
          ciloId: "cilo-1",
          courseId: "course-1",
          courseCode: "IT201",
          courseTitle: "Data Structures",
          evaluationId: "evaluation-1",
          evaluationName: "End-of-term evaluation",
          label: "CILO 1",
          description: "Apply structural identities",
          // Distinct questions whose `sectionKey:itemKey` joins are identical.
          questions: [
            { sectionKey: "outcomes", itemKey: "application:lab", prompt: "I apply methods." },
            { sectionKey: "outcomes:application", itemKey: "lab", prompt: "I defend methods." },
          ],
          scaleGroups: [scaleGroup],
        },
      ],
    };

    render(<FacultyAnalyticsDashboard data={collidingData} options={options} />);

    // A separator-joined React key collapses this pair into one list item and
    // logs a duplicate-key warning; both prompts must survive.
    expect(screen.getAllByText("I apply methods.")).toHaveLength(2);
    expect(screen.getAllByText("I defend methods.")).toHaveLength(2);
    const consoleMessages = consoleError.mock.calls.flat().map(String);
    expect(consoleMessages).not.toEqual(
      expect.arrayContaining([expect.stringContaining("same key")])
    );
  });

  it("shows an accessible, reduced-motion-safe skeleton while AI interpretation is pending", async () => {
    const { promise, resolve } = Promise.withResolvers<unknown>();
    generateInsightMock.mockReturnValue(promise);
    const loadingData: FacultyAnalyticsData = {
      ...data,
      evaluations: [
        {
          id: "evaluation-1",
          deploymentName: "End-of-term evaluation",
          assignmentId: "assignment-1",
          courseId: "course-1",
          courseCode: "IT201",
          courseTitle: "Data Structures",
          classLabel: "BSIT · 2nd year · Morning",
          programName: "BSIT",
          termInstanceId: "term-1",
          termInstanceLabel: "2026–2027 · 1st Semester",
          status: "CLOSED",
          responseCount: 1,
          opportunityCount: 1,
        },
      ],
      kpi: { ...data.kpi, submittedResponseCount: 1, validRatingCount: 1 },
    };

    render(<FacultyAnalyticsDashboard data={loadingData} options={options} />);

    const statuses = await screen.findAllByRole("status", { name: "Generating AI insight" });
    expect(statuses).toHaveLength(2);
    for (const status of statuses) {
      expect(status).toHaveAttribute("aria-busy", "true");
      const skeletons = status.querySelectorAll('[data-slot="skeleton"]');
      expect(skeletons).toHaveLength(3);
      expect(skeletons[0]).toHaveClass("animate-pulse", "motion-reduce:animate-none");
    }
    resolve({ ok: false, state: "disabled" });
    await act(async () => {});
  });
  it("renders the AI overview with observation, evidence, and connection", async () => {
    generateInsightMock.mockReset();
    generateInsightMock.mockResolvedValue({
      ok: true,
      data: {
        overview: {
          observation: "5 of 5 invited students submitted responses.",
          evidence: ["Compare distributions across terms."],
          connection: "Participation is complete, so the ratings represent the whole class.",
          limitation: null,
          reviewQuestion: null,
        },
        cilos: null,
        questions: null,
        trends: null,
        qualitative: null,
        evidence: {
          submittedResponseCount: 1,
          validRatingCount: 1,
          qualitativeItemCount: 0,
        },
      },
    });
    const loadedData: FacultyAnalyticsData = {
      ...data,
      evaluations: [
        {
          id: "evaluation-1",
          deploymentName: "End-of-term evaluation",
          assignmentId: "assignment-1",
          courseId: "course-1",
          courseCode: "IT201",
          courseTitle: "Data Structures",
          classLabel: "BSIT · 2nd year · Morning",
          programName: "BSIT",
          termInstanceId: "term-1",
          termInstanceLabel: "2026–2027 · 1st Semester",
          status: "CLOSED",
          responseCount: 1,
          opportunityCount: 1,
        },
      ],
      kpi: { ...data.kpi, submittedResponseCount: 1, validRatingCount: 1 },
    };

    render(<FacultyAnalyticsDashboard data={loadedData} options={options} />);
    await act(async () => {
      await vi.waitFor(() => expect(generateInsightMock).toHaveBeenCalled());
    });
    // The overview AI section renders in both the participation and rating
    // distribution cards, so the observation appears twice.
    expect(await screen.findAllByText("5 of 5 invited students submitted responses.")).toHaveLength(
      2
    );
    expect(
      await screen.findAllByText(
        /Participation is complete, so the ratings represent the whole class./
      )
    ).toHaveLength(2);
    expect(await screen.findAllByText("Compare distributions across terms.")).toHaveLength(2);
    expect(await screen.findAllByText("AI-generated insight")).toHaveLength(2);
  });

  it("keeps every exact figure on screen and names the deployment when AI is disabled", async () => {
    generateInsightMock.mockResolvedValue({ ok: false, state: "disabled" });

    render(<FacultyAnalyticsDashboard data={ratedScope} options={options} />);
    await settleInsight();

    // The overview section renders in both the participation and the rating
    // distribution card, so the same notice states the state twice.
    expect(
      await screen.findAllByText("AI overview is not enabled for this deployment.")
    ).toHaveLength(2);
    // The deterministic evidence is never gated on the AI request: the exact
    // participation pair survives in both the bar list and the class summary.
    expect(screen.getAllByText("12 / 20")).toHaveLength(2);
    expect(screen.getAllByText("60.0%")).toHaveLength(2);
    expect(screen.queryByText("AI-generated insight")).not.toBeInTheDocument();
  });

  it("offers no retry and keeps the verified analytics when the AI request fails recoverably", async () => {
    generateInsightMock.mockResolvedValue({ ok: false, state: "timeout" });

    render(<FacultyAnalyticsDashboard data={ratedScope} options={options} />);
    await settleInsight();

    expect(
      await screen.findAllByText(
        "The AI overview is temporarily unavailable. The verified analytics above are unaffected."
      )
    ).toHaveLength(2);
    expect(screen.queryByRole("button", { name: /try again/i })).not.toBeInTheDocument();
    // The failure states a temporary outage, never that the scope lacks evidence.
    expect(screen.queryByText(/not enough combined evidence/)).not.toBeInTheDocument();
    expect(screen.getAllByText("12 / 20")).toHaveLength(2);
  });

  it("blames the evidence, not the service, when the scope holds too little for an overview", async () => {
    generateInsightMock.mockResolvedValue({ ok: false, state: "insufficient-evidence" });

    render(<FacultyAnalyticsDashboard data={ratedScope} options={options} />);
    await settleInsight();

    expect(
      await screen.findAllByText(
        "There is not enough combined evidence in this scope for a responsible AI overview."
      )
    ).toHaveLength(2);
    expect(
      screen.queryByText(
        "The AI overview is temporarily unavailable. The verified analytics above are unaffected."
      )
    ).not.toBeInTheDocument();
  });

  it("refuses an overview on a scope with no submissions instead of asking the provider", () => {
    const emptyScope: FacultyAnalyticsData = {
      ...ratedScope,
      evaluations: ratedScope.evaluations.map((item) => ({ ...item, responseCount: 0 })),
      kpi: { ...ratedScope.kpi, submittedResponseCount: 0, responseRate: 0, validRatingCount: 0 },
      ratingDistributions: [],
    };

    render(<FacultyAnalyticsDashboard data={emptyScope} options={options} />);

    // No submission means no request is worth making, and the reader is told
    // why the overview is absent rather than watching it hang.
    expect(
      screen.getAllByText(
        "There is not enough combined evidence in this scope for a responsible AI overview."
      )
    ).toHaveLength(2);
    expect(screen.queryByRole("status", { name: "Generating AI insight" })).not.toBeInTheDocument();
    expect(generateInsightMock).not.toHaveBeenCalled();
    // The invitation count is still reported in both the bar list and the class
    // summary, so the reason for the refusal is legible.
    expect(screen.getAllByText("0 / 20")).toHaveLength(2);
  });

  it("declines to show an overview when a successful request returns no observation", async () => {
    generateInsightMock.mockResolvedValue(insightResult({ overview: null }));

    render(<FacultyAnalyticsDashboard data={ratedScope} options={options} />);
    await settleInsight();

    // A declined request must read as absent evidence, never as a card with an
    // empty body or as an outage the reader could retry.
    expect(
      await screen.findAllByText(
        "There is not enough combined evidence in this scope for a responsible AI overview."
      )
    ).toHaveLength(2);
    expect(screen.queryByText("AI-generated insight")).not.toBeInTheDocument();
  });

  it("discloses that a bounded packet carried only the highest-volume groups", async () => {
    generateInsightMock.mockResolvedValue(insightResult({ truncatedEvidence: true }));

    render(<FacultyAnalyticsDashboard data={ratedScope} options={options} />);
    await settleInsight();

    // The overview section renders in both the participation and the rating
    // distribution card, so each notice states it twice.
    expect(
      await screen.findAllByText(
        "A scope this wide exceeds one AI evidence packet, so the interpretation used the highest-volume groups only. The charts above carry the complete figures."
      )
    ).toHaveLength(2);
    // The basis sits inside a sentence that also carries the "AI can be wrong"
    // caution, so the count is matched as a substring rather than a whole node.
    expect(
      await screen.findAllByText(/Based on 12 submitted responses and 40 valid ratings\./)
    ).toHaveLength(2);
  });

  it("drops the omission notice when the packet carried the whole scope", async () => {
    generateInsightMock.mockResolvedValue(insightResult({ truncatedEvidence: false }));

    render(<FacultyAnalyticsDashboard data={ratedScope} options={options} />);
    await settleInsight();

    expect(
      await screen.findAllByText("Ratings on this scale ranged from 4 to 5 across 40 ratings.")
    ).toHaveLength(2);
    // A whole packet carries no omission notice; claiming one would misdescribe
    // evidence the provider actually received.
    expect(screen.queryByText(/exceeds one AI evidence packet/)).not.toBeInTheDocument();
  });

  it("grounds a written-feedback overview in anonymous answer counts, not response totals", async () => {
    generateInsightMock.mockResolvedValue(
      insightResult({
        overview: null,
        qualitative: {
          observation: "The most repeated term was helpful, mentioned 6 times.",
          evidence: ["Terms cross only when they are mentioned more than once."],
          connection: null,
          limitation: null,
          reviewQuestion: null,
        },
        truncatedEvidence: false,
        qualitativeTruncated: true,
      })
    );

    render(<FacultyAnalyticsDashboard data={qualitativeScope} options={options} />);
    await settleInsight();

    expect(
      await screen.findByText("The most repeated term was helpful, mentioned 6 times.")
    ).toBeInTheDocument();
    // The basis a reader checks is written answers, which is what the qualitative
    // packet carries; response and rating totals do not back this section.
    expect(screen.getByText(/Based on 30 anonymous written answers\./)).toBeInTheDocument();
    expect(screen.queryByText(/submitted responses and 40 valid ratings/)).not.toBeInTheDocument();
    expect(
      screen.getByText(
        "The interpretation used a bounded slice of the written-feedback evidence, not the entire corpus."
      )
    ).toBeInTheDocument();
    expect(screen.queryByText(/highest-volume groups only/)).not.toBeInTheDocument();
  });
});
