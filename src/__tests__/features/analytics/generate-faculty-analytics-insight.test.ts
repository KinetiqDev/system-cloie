import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FacultyAnalyticsData } from "@/features/analytics/types";

const { analyticsMock, createCompletionMock } = vi.hoisted(() => ({
  analyticsMock: vi.fn(),
  createCompletionMock: vi.fn(),
}));

vi.mock("@/features/analytics/services/get-faculty-analytics-data", () => ({
  getFacultyAnalyticsDataWithPrincipal: analyticsMock,
}));

vi.mock("openai", () => ({
  default: class OpenAI {
    static APIConnectionTimeoutError = class APIConnectionTimeoutError extends Error {};
    chat = { completions: { create: createCompletionMock } };
  },
}));

const insight = {
  participation: {
    summary: "5 of 5 invited students submitted responses.",
    implication: "Participation is complete, so the ratings represent the whole class.",
    sentiment: "positive",
    watchPoints: [],
  },
  ratings: {
    summary: "Most ratings were 4 or 5 on the 1-5 scale.",
    implication: "Respondents consistently chose the favorable descriptors.",
    sentiment: "positive",
    watchPoints: ["Compare distributions across terms."],
  },
  cilos: {
    summary: "CILO ratings are consistent.",
    implication: "No outcome trails its peers in this scope.",
    sentiment: "neutral",
    watchPoints: [],
  },
  questions: {
    summary: "Question ratings are consistent.",
    implication: "No single item stands apart from the rest.",
    sentiment: "neutral",
    watchPoints: ["Check item spread."],
  },
  trends: {
    summary: "No comparable trend periods exist yet.",
    implication: "Trend interpretation needs another comparable period.",
    sentiment: "neutral",
    watchPoints: [],
  },
  qualitative: null,
};

function analyticsData(validRatingCount = 5): FacultyAnalyticsData {
  return {
    filters: { view: "overview" },
    scopeLabel: "Showing one evaluation based on five submitted responses.",
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
        responseCount: 5,
        opportunityCount: 5,
      },
    ],
    kpi: {
      submittedResponseCount: 5,
      opportunityCount: 5,
      responseRate: 1,
      validRatingCount,
      overallMean: 4,
      overallScaleLabel: "1–5 (5-point)",
      overallScaleMax: 5,
      spansMultipleScales: false,
    },
    ratingDistributions: [],
    ciloMetrics: [],
    questionMetrics: [],
    trends: [],
    qualitative: {
      available: false,
      submittedResponseCount: 5,
      responseCount: 0,
      itemCount: 0,
      evaluationCount: 0,
      tokens: [],
      promptCounts: [],
    },
  };
}

describe("generateFacultyAnalyticsInsight cache", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubEnv("CLOIE_AI_ENABLED", "true");
    vi.stubEnv("CLOIE_AI_API_KEY", "test-key");
    vi.stubEnv("CLOIE_AI_BASE_URL", "https://example.test/v1");
    vi.stubEnv("CLOIE_AI_MODEL", "test-model");
    vi.stubEnv("CLOIE_AI_MIN_SUBMITTED_RESPONSES", "1");
    vi.stubEnv("CLOIE_AI_MIN_QUALITATIVE_ITEMS", "1");
    createCompletionMock.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(insight) } }],
    });
  });

  it("reuses one validated insight across reloads and tab-only navigation", async () => {
    analyticsMock.mockImplementation(async (filters) => ({
      success: true,
      facultyUserId: "faculty-1",
      data: { ...analyticsData(), filters: { view: filters.view ?? "overview" } },
    }));
    const { generateFacultyAnalyticsInsight } =
      await import("@/features/analytics/services/generate-faculty-analytics-insight");

    const first = await generateFacultyAnalyticsInsight({ view: "overview" });
    const reloaded = await generateFacultyAnalyticsInsight({ view: "overview" });
    const anotherTab = await generateFacultyAnalyticsInsight({ view: "cilos" });

    expect(first).toEqual(reloaded);
    expect(first).toEqual(anotherTab);
    expect(createCompletionMock).toHaveBeenCalledTimes(1);
  });

  it("regenerates when aggregate evidence changes", async () => {
    let validRatingCount = 5;
    analyticsMock.mockImplementation(async () => ({
      success: true,
      facultyUserId: "faculty-2",
      data: analyticsData(validRatingCount),
    }));
    const { generateFacultyAnalyticsInsight } =
      await import("@/features/analytics/services/generate-faculty-analytics-insight");

    await generateFacultyAnalyticsInsight({ view: "overview" });
    validRatingCount = 6;
    await generateFacultyAnalyticsInsight({ view: "overview" });

    expect(createCompletionMock).toHaveBeenCalledTimes(2);
  });

  it("shares one provider call between identical requests already in flight", async () => {
    analyticsMock.mockResolvedValue({
      success: true,
      facultyUserId: "faculty-concurrent",
      data: analyticsData(),
    });
    const { promise, resolve } = Promise.withResolvers<{
      choices: Array<{ message: { content: string } }>;
    }>();
    createCompletionMock.mockReturnValue(promise);
    const { generateFacultyAnalyticsInsight } =
      await import("@/features/analytics/services/generate-faculty-analytics-insight");

    const first = generateFacultyAnalyticsInsight({ view: "overview" });
    const second = generateFacultyAnalyticsInsight({ view: "overview" });
    await vi.waitFor(() => expect(createCompletionMock).toHaveBeenCalledTimes(1));
    resolve({ choices: [{ message: { content: JSON.stringify(insight) } }] });

    await expect(Promise.all([first, second])).resolves.toHaveLength(2);
    expect(createCompletionMock).toHaveBeenCalledTimes(1);
  });

  it("does not share cached insights between faculty principals", async () => {
    let facultyUserId = "faculty-3";
    analyticsMock.mockImplementation(async () => ({
      success: true,
      facultyUserId,
      data: analyticsData(),
    }));
    const { generateFacultyAnalyticsInsight } =
      await import("@/features/analytics/services/generate-faculty-analytics-insight");

    await generateFacultyAnalyticsInsight({ view: "overview" });
    facultyUserId = "faculty-4";
    await generateFacultyAnalyticsInsight({ view: "overview" });

    expect(createCompletionMock).toHaveBeenCalledTimes(2);
  });
});

describe("generateFacultyAnalyticsInsight output contract", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubEnv("CLOIE_AI_ENABLED", "true");
    vi.stubEnv("CLOIE_AI_API_KEY", "test-key");
    vi.stubEnv("CLOIE_AI_BASE_URL", "https://example.test/v1");
    vi.stubEnv("CLOIE_AI_MODEL", "test-model");
    vi.stubEnv("CLOIE_AI_MIN_SUBMITTED_RESPONSES", "1");
    vi.stubEnv("CLOIE_AI_MIN_QUALITATIVE_ITEMS", "1");
    analyticsMock.mockResolvedValue({
      success: true,
      facultyUserId: "faculty-contract",
      data: analyticsData(),
    });
  });

  it("accepts provider JSON fenced in markdown", async () => {
    createCompletionMock.mockResolvedValue({
      choices: [{ message: { content: "```json\n" + JSON.stringify(insight) + "\n```" } }],
    });
    const { generateFacultyAnalyticsInsight } =
      await import("@/features/analytics/services/generate-faculty-analytics-insight");

    const result = await generateFacultyAnalyticsInsight({ view: "overview" });

    expect(result.ok).toBe(true);
    expect(result.ok && result.data.ratings.summary).toContain("4 or 5");
  });

  it("rejects output missing the required sentiment signal", async () => {
    const { participation: _omitted, ...rest } = insight;
    void _omitted;
    createCompletionMock.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              ...rest,
              participation: {
                summary: "5 of 5 invited students submitted responses.",
                implication: "Participation is complete.",
                watchPoints: [],
              },
            }),
          },
        },
      ],
    });
    const { generateFacultyAnalyticsInsight } =
      await import("@/features/analytics/services/generate-faculty-analytics-insight");

    const result = await generateFacultyAnalyticsInsight({ view: "overview" });

    expect(result).toEqual({ ok: false, state: "invalid-output" });
  });

  it("forces qualitative to null when the evidence is unavailable", async () => {
    createCompletionMock.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              ...insight,
              qualitative: {
                summary: "Common terms recur across answers.",
                implication: "Written feedback clusters around a few topics.",
                sentiment: "neutral",
                watchPoints: [],
              },
            }),
          },
        },
      ],
    });
    const { generateFacultyAnalyticsInsight } =
      await import("@/features/analytics/services/generate-faculty-analytics-insight");

    const result = await generateFacultyAnalyticsInsight({ view: "overview" });

    expect(result.ok).toBe(true);
    expect(result.ok && result.data.qualitative).toBeNull();
  });
});
