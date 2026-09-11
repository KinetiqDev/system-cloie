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

function section(observation: string) {
  return {
    observation,
    evidence: ["5 of 5 invited students submitted responses on the 1-5 scale."],
    limitation: null,
    reviewQuestion: null,
  };
}

const insight = {
  overview: {
    ...section("Most ratings were 4 or 5 on the 1-5 scale."),
    connection: "The same respondents drive both the mean and the distribution shape.",
    reviewQuestion: "Which class sessions drew the lower ratings?",
  },
  cilos: section("CILO means sit between 3.8 and 4.4 on the 1-5 scale."),
  questions: section("Question means sit between 3.9 and 4.3 on the 1-5 scale."),
  trends: section("No comparable trend periods exist yet."),
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
      tone: { scoredItemCount: 0, positive: 0, neutral: 0, negative: 0 },
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
    expect(result.ok && result.data.overview?.observation).toContain("4 or 5");
  });

  it("requires the provider to enforce the complete section schema", async () => {
    createCompletionMock.mockImplementation(async (request) => ({
      choices: [
        {
          message: {
            content:
              request.response_format?.type === "json_schema"
                ? JSON.stringify(insight)
                : JSON.stringify({
                    ...insight,
                    questions: "Most ratings were favorable.",
                  }),
          },
        },
      ],
    }));
    const { generateFacultyAnalyticsInsight } =
      await import("@/features/analytics/services/generate-faculty-analytics-insight");

    const result = await generateFacultyAnalyticsInsight({ view: "overview" });

    expect(createCompletionMock.mock.calls[0][0].response_format).toMatchObject({
      type: "json_schema",
      json_schema: { strict: true },
    });
    expect(result.ok).toBe(true);
  });

  it("rejects output missing a required section", async () => {
    const { cilos: _omitted, ...rest } = insight;
    void _omitted;
    createCompletionMock.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(rest) } }],
    });
    const { generateFacultyAnalyticsInsight } =
      await import("@/features/analytics/services/generate-faculty-analytics-insight");

    const result = await generateFacultyAnalyticsInsight({ view: "overview" });

    expect(result).toEqual({ ok: false, state: "invalid-output" });
  });

  it("strips provider-invented sentiment labels from validated sections", async () => {
    createCompletionMock.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              ...insight,
              overview: { ...insight.overview, sentiment: "positive" },
              cilos: { ...insight.cilos, sentiment: "neutral" },
            }),
          },
        },
      ],
    });
    const { generateFacultyAnalyticsInsight } =
      await import("@/features/analytics/services/generate-faculty-analytics-insight");

    const result = await generateFacultyAnalyticsInsight({ view: "overview" });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.overview).not.toHaveProperty("sentiment");
    expect(result.data.cilos).not.toHaveProperty("sentiment");
    expect(result.data.overview?.observation).toContain("4 or 5");
  });

  it("forces qualitative to null when the evidence is unavailable", async () => {
    createCompletionMock.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              ...insight,
              qualitative: {
                observation: "Common terms recur across answers.",
                evidence: ["12 written answers mention 2 recurring terms."],
                limitation: "Term counts cannot show tone or context.",
                reviewQuestion: "Which prompts drew the most written answers?",
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

describe("generateFacultyAnalyticsInsight qualitative packet", () => {
  function qualitativeData() {
    const base = analyticsData();
    return {
      ...base,
      qualitative: {
        ...base.qualitative,
        available: true,
        responseCount: 5,
        itemCount: 6,
        evaluationCount: 1,
        tone: { scoredItemCount: 6, positive: 3, neutral: 2, negative: 1 },
        tokens: Array.from({ length: 60 }, (_, index) => ({
          text: `term-${index}`,
          value: 60 - index,
          responseCount: 5,
        })),
        promptCounts: [
          {
            prompt: "What worked well?",
            instrumentLabel: "Course Evaluation v1",
            itemCount: 6,
            responseCount: 5,
            tone: { scoredItemCount: 6, positive: 3, neutral: 2, negative: 1 },
            terms: Array.from({ length: 9 }, (_, index) => ({
              text: `prompt-term-${index}`,
              value: 9 - index,
              responseCount: 4,
            })),
          },
        ],
      },
    };
  }

  it("reports a bounded qualitative slice when the packet truncates", async () => {
    createCompletionMock.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              ...insight,
              qualitative: {
                observation: "Written answers concentrate on laboratory time.",
                evidence: ["6 written answers mention 2 recurring terms."],
                limitation: null,
                reviewQuestion: null,
              },
            }),
          },
        },
      ],
    });
    analyticsMock.mockImplementation(async () => ({
      success: true,
      facultyUserId: "faculty-1",
      data: {
        ...qualitativeData(),
        filters: {
          view: "qualitative",
          courseId: "course-1",
          evaluationId: "evaluation-1",
          termInstanceId: "term-1",
          status: "CLOSED",
        },
      },
    }));
    const { generateFacultyAnalyticsInsight } =
      await import("@/features/analytics/services/generate-faculty-analytics-insight");

    const result = await generateFacultyAnalyticsInsight({ view: "qualitative" });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.evidence.qualitativeTruncated).toBe(true);
  });

  it("degrades a broad scope by omission instead of failing the request", async () => {
    // A broad Faculty scope serializes every prompt the analyzer produced. The
    // qualitative prompt tier spends only what the bounded base packet leaves
    // and discloses the omission, so the request still reaches the provider
    // instead of returning `unexpected` with no insight at all.
    createCompletionMock.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              ...insight,
              qualitative: {
                observation: "Written answers mention recurring teaching terms.",
                evidence: ["Recurring redacted terms appear across the answered prompts."],
                limitation: "The packet carried a bounded slice of the prompt structure.",
                reviewQuestion: null,
              },
            }),
          },
        },
      ],
    });
    analyticsMock.mockImplementation(async () => ({
      success: true,
      facultyUserId: "faculty-broad",
      data: {
        ...qualitativeData(),
        qualitative: {
          ...qualitativeData().qualitative,
          promptCounts: Array.from({ length: 400 }, (_, index) => ({
            prompt: `Prompt ${index} about teaching practice and course design`,
            instrumentLabel: "Course Evaluation v1",
            itemCount: 5,
            responseCount: 5,
            tone: { scoredItemCount: 5, positive: 2, neutral: 2, negative: 1 },
            terms: [{ text: `term-${index}`, value: 3, responseCount: 2 }],
          })),
        },
      },
    }));
    const { generateFacultyAnalyticsInsight } =
      await import("@/features/analytics/services/generate-faculty-analytics-insight");

    const result = await generateFacultyAnalyticsInsight({ view: "qualitative" });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.evidence.qualitativeTruncated).toBe(true);
    const sentPacket = String(createCompletionMock.mock.calls.at(-1)?.[0]?.messages?.[1]?.content);
    expect(sentPacket).toContain('"promptCountsTruncated":true');
    expect(sentPacket).toContain('"tokensTruncated":true');
    const packet = sentPacket.slice(
      sentPacket.indexOf("<system-cloie-evidence>") + "<system-cloie-evidence>".length,
      sentPacket.lastIndexOf("</system-cloie-evidence>")
    );
    expect(JSON.parse(packet)).toHaveProperty("qualitative.promptCountsTruncated", true);
    expect(packet.length).toBeLessThanOrEqual(16_000);
  });

  it("reports no truncation when the whole qualitative corpus fits", async () => {
    analyticsMock.mockImplementation(async () => ({
      success: true,
      facultyUserId: "faculty-1",
      data: {
        ...qualitativeData(),
        qualitative: {
          ...qualitativeData().qualitative,
          tokens: [{ text: "laboratory", value: 4, responseCount: 3 }],
          promptCounts: [
            {
              prompt: "What worked well?",
              instrumentLabel: "Course Evaluation v1",
              itemCount: 4,
              responseCount: 3,
              tone: { scoredItemCount: 4, positive: 2, neutral: 1, negative: 1 },
              terms: [{ text: "laboratory", value: 4, responseCount: 3 }],
            },
          ],
        },
      },
    }));
    const { generateFacultyAnalyticsInsight } =
      await import("@/features/analytics/services/generate-faculty-analytics-insight");

    const result = await generateFacultyAnalyticsInsight({ view: "qualitative" });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.evidence.qualitativeTruncated).toBe(false);
  });
});
