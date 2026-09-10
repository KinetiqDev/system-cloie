import { describe, expect, it } from "vitest";
import { insightSectionSchema } from "@/features/analytics/services/ai-insight-contract";
import {
  buildAnalyticsViewPacket,
  describeAppliedFilters,
} from "@/features/analytics/services/generate-program-head-analytics-insight";
import { describeFacultyAppliedFilters } from "@/features/analytics/services/generate-faculty-analytics-insight";
import type { FacultyAnalyticsData } from "@/features/analytics/types";
import { aiActionInputSchema } from "@/features/analytics/services/program-head-ai-schema";
import type { AiConfiguration } from "@/features/analytics/services/program-head-ai-schema";
import type {
  ProgramHeadFeedbackDTO,
  ProgramHeadOverviewDTO,
} from "@/features/analytics/program-head-analytics-types";

const SCOPE = {
  programCode: "BSIT",
  programName: "BS Information Technology",
  periodLabel: "2025-2026 · 2nd Semester",
};
const PERIOD_OPTIONS = { schoolYears: [], semesters: [], termInstances: [] };
const CONFIG: AiConfiguration = {
  apiKey: "key",
  baseUrl: "https://provider.test/v1",
  model: "model",
  minimumSubmittedResponses: 10,
  minimumQualitativeItems: 5,
  maxPacketChars: 16_000,
  maxTokens: 50,
};

const overview: ProgramHeadOverviewDTO = {
  scope: SCOPE,
  kpi: {
    submittedResponseCount: 24,
    evaluationOpportunityCount: 40,
    responseRate: 0.6,
    ratingCount: 96,
    meanRating: 4.1875,
  },
  emptyReason: null,
  periodOptions: PERIOD_OPTIONS,
};

const feedback: ProgramHeadFeedbackDTO = {
  scope: SCOPE,
  periodOptions: PERIOD_OPTIONS,
  emptyReason: null,
  tokens: [
    { text: "laboratory", value: 9, responseCount: 6 },
    { text: "workload", value: 5, responseCount: 3 },
  ],
  tone: { scoredItemCount: 12, positive: 5, neutral: 4, negative: 3 },
  qualitativeItemCount: 12,
  qualitativeResponseCount: 8,
  sourceCounts: [
    {
      sourceKey: "ALUMNI",
      sourceLabel: "Alumni evidence",
      itemCount: 12,
      responseCount: 8,
      tone: { scoredItemCount: 12, positive: 5, neutral: 4, negative: 3 },
    },
  ],
  promptCounts: [
    {
      sourceLabel: "Alumni evidence",
      promptLabel: "Strengths of the program:",
      itemCount: 7,
      responseCount: 5,
      tone: { scoredItemCount: 7, positive: 5, neutral: 1, negative: 1 },
      terms: [
        { text: "laboratory", value: 6, responseCount: 4 },
        { text: "mentoring", value: 3, responseCount: 3 },
      ],
    },
    {
      sourceLabel: "Alumni evidence",
      promptLabel: "Areas for improvement:",
      itemCount: 5,
      responseCount: 4,
      tone: { scoredItemCount: 5, positive: 0, neutral: 3, negative: 2 },
      terms: [{ text: "workload", value: 5, responseCount: 3 }],
    },
  ],
  evidenceEvaluations: [],
};

function qualitativePacket(filters: Parameters<typeof buildAnalyticsViewPacket>[4] = {}) {
  const result = buildAnalyticsViewPacket(
    "qualitative",
    overview,
    { view: "qualitative", feedback },
    CONFIG,
    filters
  );
  return result;
}

describe("insight section contract", () => {
  it("strips provider-authored sentiment so a verdict can never reach the browser", () => {
    const parsed = insightSectionSchema.safeParse({
      observation: "Most scored answers fall in the positive band.",
      evidence: ["5 of 12 answers"],
      limitation: null,
      reviewQuestion: null,
      sentiment: "positive",
      polarity: "negative",
    });

    expect(parsed.success).toBe(true);
    if (!parsed.success || parsed.data === null) throw new Error("expected a parsed section");
    expect(parsed.data).not.toHaveProperty("sentiment");
    expect(parsed.data).not.toHaveProperty("polarity");
  });
});

describe("applied filters", () => {
  it("maps the reviewer's facets to the shipped labels", () => {
    expect(describeAppliedFilters({})).toEqual({ evidenceSource: null, stakeholder: null });
    expect(describeAppliedFilters({ evidenceSource: "ALUMNI" })).toEqual({
      evidenceSource: "Alumni",
      stakeholder: null,
    });
    expect(describeAppliedFilters({ evidenceSource: "COURSE", stakeholder: "ALUMNI" })).toEqual({
      evidenceSource: "Course evaluations",
      stakeholder: "Alumni",
    });
  });

  it("states the applied facets inside every packet", () => {
    const { packet } = qualitativePacket({ evidenceSource: "ALUMNI", stakeholder: "ALUMNI" });

    expect(packet.appliedFilters).toEqual({ evidenceSource: "Alumni", stakeholder: "Alumni" });
    expect(qualitativePacket().packet.appliedFilters).toEqual({
      evidenceSource: null,
      stakeholder: null,
    });
  });

  it("never accepts a scope facet the server does not read", () => {
    const nested = aiActionInputSchema.safeParse({
      programId: "00000000-0000-4000-8000-000000000009",
      analyticsView: "qualitative",
      filters: { tab: "qualitative", evaluationId: "00000000-0000-4000-8000-000000000006" },
    });
    expect(nested.success).toBe(true);
    if (!nested.success) throw new Error("expected the nested facet to be accepted");
    expect(nested.data.filters).toEqual({ tab: "qualitative" });

    const topLevel = aiActionInputSchema.safeParse({
      programId: "00000000-0000-4000-8000-000000000009",
      analyticsView: "qualitative",
      filters: { tab: "qualitative" },
      evaluationId: "00000000-0000-4000-8000-000000000006",
    });
    expect(topLevel.success).toBe(false);
  });
});

describe("qualitative packet structure", () => {
  it("carries tone shape and per-prompt structure without any answer text or identity", () => {
    const { packet, evidenceScope } = qualitativePacket();
    if (!("promptEvidence" in packet)) throw new Error("expected a qualitative packet");
    const serialized = JSON.stringify(packet);

    expect(packet.feedback.toneShape).toEqual(feedback.tone);
    expect(packet.feedback.sourceCounts[0]?.tone).toEqual(feedback.tone);
    expect(packet.feedback.promptCounts.map((prompt) => prompt.tone)).toEqual([
      feedback.promptCounts[0]?.tone,
      feedback.promptCounts[1]?.tone,
    ]);
    expect(packet.promptEvidence).toEqual([
      expect.objectContaining({
        promptLabel: "Strengths of the program:",
        itemCount: 7,
        responseCount: 5,
        terms: [
          { text: "laboratory", mentions: 6, responseCount: 4 },
          { text: "mentoring", mentions: 3, responseCount: 3 },
        ],
      }),
      expect.objectContaining({ promptLabel: "Areas for improvement:", itemCount: 5 }),
    ]);
    expect(evidenceScope.promptAnalysis).toEqual({
      availablePromptCount: 2,
      includedPromptCount: 2,
      truncated: false,
    });
    expect(serialized).not.toMatch(/text_content|responseId|respondent/);
  });

  it("caps the terms carried per prompt", () => {
    const manyTerms = Array.from({ length: 12 }, (_, index) => ({
      text: `term-${index}`,
      value: 12 - index,
      responseCount: 12 - index,
    }));
    const { packet } = buildAnalyticsViewPacket(
      "qualitative",
      overview,
      {
        view: "qualitative",
        feedback: {
          ...feedback,
          promptCounts: [{ ...feedback.promptCounts[0]!, terms: manyTerms }],
        },
      },
      CONFIG
    );
    if (!("promptEvidence" in packet)) throw new Error("expected a qualitative packet");

    expect(packet.promptEvidence[0]?.terms).toHaveLength(6);
    expect(packet.promptEvidence[0]?.terms[0]).toEqual({
      text: "term-0",
      mentions: 12,
      responseCount: 12,
    });
  });

  it("omits prompt evidence by disclosure when the character budget cannot hold it", () => {
    const { evidenceScope } = buildAnalyticsViewPacket(
      "qualitative",
      overview,
      {
        view: "qualitative",
        feedback: {
          ...feedback,
          tokens: Array.from({ length: 400 }, (_, index) => ({
            text: `term-${index}`,
            value: 400 - index,
            responseCount: 400 - index,
          })),
        },
      },
      { ...CONFIG, maxPacketChars: 4_000, maxTokens: 500 }
    );

    expect(evidenceScope.tokenAnalysis?.truncated).toBe(true);
    expect(evidenceScope.promptAnalysis).toEqual({
      availablePromptCount: 2,
      includedPromptCount: 0,
      truncated: true,
    });
  });
});

describe("faculty applied filters", () => {
  function facultyData(filters: FacultyAnalyticsData["filters"]): FacultyAnalyticsData {
    return {
      filters,
      scopeLabel: "Showing one evaluation.",
      evaluations: [
        {
          id: "evaluation-1",
          deploymentName: "End-of-term evaluation",
          courseId: "course-1",
          courseCode: "IT201",
          courseTitle: "Data Structures",
          classLabel: "BSIT · 2nd year · Morning",
          programName: "BSIT",
          assignmentId: "assignment-1",
          termInstanceId: "term-1",
          termInstanceLabel: "2026-2027 · 1st Semester",
          status: "CLOSED",
          responseCount: 6,
          opportunityCount: 8,
        },
      ],
    } as FacultyAnalyticsData;
  }

  it("names the facets the faculty member chose and nothing when unfiltered", () => {
    expect(describeFacultyAppliedFilters(facultyData({ view: "qualitative" }))).toEqual({
      course: null,
      evaluation: null,
      term: null,
      status: null,
    });

    expect(
      describeFacultyAppliedFilters(
        facultyData({
          view: "qualitative",
          courseId: "course-1",
          evaluationId: "evaluation-1",
          termInstanceId: "term-1",
          status: "CLOSED",
        })
      )
    ).toEqual({
      course: "IT201 Data Structures",
      evaluation: "End-of-term evaluation",
      term: "2026-2027 · 1st Semester",
      status: "CLOSED",
    });
  });
});
