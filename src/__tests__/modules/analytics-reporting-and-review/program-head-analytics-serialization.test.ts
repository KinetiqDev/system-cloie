import { describe, expect, it } from "vitest";
import {
  buildAiEvidencePacket,
  type AiEvidencePacket,
} from "@/features/analytics/services/generate-program-head-analytics-insight";
import type { AiConfiguration } from "@/features/analytics/services/program-head-ai-schema";
import type {
  ProgramHeadAIInsightsSuccessDTO,
  ProgramHeadBreakdownsDTO,
  ProgramHeadFeedbackDTO,
  ProgramHeadOutcomesDTO,
  ProgramHeadOverviewDTO,
  ProgramHeadStakeholdersDTO,
  ProgramHeadTrendsDTO,
} from "@/features/analytics/program-head-analytics-types";

const SCOPE = {
  programCode: "BSED",
  programName: "Bachelor of Secondary Education",
  periodLabel: "2025-2026 · 1st Semester",
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

const outcomes: ProgramHeadOutcomesDTO = {
  scope: SCOPE,
  periodOptions: PERIOD_OPTIONS,
  emptyReason: null,
  programWideOutcomes: [],
      currentMappingDisclosure: "Current CILO-to-PLO mappings group historical ratings.",
  manyToManyDisclosure: true,
  outcomes: [
    {
      ploId: "go-1",
      code: "GO-1",
      name: "Effective communicator",
      meanRating: 11 / 3,
      ratingCount: 3,
      submittedResponseCount: 2,
      contributingCilos: [{ id: "cilo-1", description: "Analyze evidence" }],
      contributingCourses: [{ id: "course-1", code: "EDUC 101", title: "Education 101" }],
      evidenceEvaluations: [{ evaluationId: "eval-1", deploymentName: "CILO Evaluation" }],
      distributions: [
        {
          scaleLabel: "1–5 (5-point)",
          categories: [
            { value: 3, label: null, count: 1, percentage: 1 / 3 },
            { value: 4, label: null, count: 2, percentage: 2 / 3 },
          ],
        },
      ],
      spansMultipleScales: false,
      excludedRatingCount: 1,
      evidenceSummary: {
        ratingCount: 3,
        responseCount: 2,
        explanation: "Mean of 3 valid ratings from 1 course-bound evaluation(s).",
      },
    },
  ],
};

const stakeholders: ProgramHeadStakeholdersDTO = {
  scope: SCOPE,
  periodOptions: PERIOD_OPTIONS,
  emptyReason: null,
  sourceSeparationDisclosure: "Sources use different instruments and populations.",
  buckets: [
    {
      sourceKey: "COURSE_STUDENT",
      sourceLabel: "Course-bound student evidence",
      sourceDescription: "Course-bound evaluation responses.",
      instrumentContext: "CILO Evaluation v2",
      meanRating: 4.25,
      ratingCount: 60,
      submittedResponseCount: 15,
    },
  ],
};

const breakdowns: ProgramHeadBreakdownsDTO = {
  scope: SCOPE,
  periodOptions: PERIOD_OPTIONS,
  emptyReason: null,
  courseRows: [
    {
      key: "course-1",
      label: "Education 101",
      courseCode: "EDUC 101",
      isUnspecified: false,
      meanRating: 4.3,
      ratingCount: 20,
      submittedResponseCount: 5,
      instrumentContext: "CILO Evaluation v2",
      evidenceEvaluations: [{ evaluationId: "eval-1", deploymentName: "CILO Evaluation" }],
    },
  ],
  instrumentRows: [],
  majorBreakdown: null,
  yearLevelBreakdown: null,
};

const trends: ProgramHeadTrendsDTO = {
  scope: SCOPE,
  periodOptions: PERIOD_OPTIONS,
  emptyReason: null,
  periods: [
    {
      termInstanceId: "term-1",
      periodLabel: "2024-2025 · 2nd Semester",
      meanRating: 4.1,
      submittedResponseCount: 10,
      ratingCount: 40,
      instrumentContext: "CILO Evaluation v2",
      scaleContext: "1–5 (5-point)",
      outcomeCodes: ["GO-1"],
      comparableWithPrevious: false,
    },
  ],
  breaks: [
    {
      fromPeriodLabel: "2024-2025 · 2nd Semester",
      toPeriodLabel: "2025-2026 · 1st Semester",
      reason: "Instrument version changed between periods.",
    },
  ],
};

const feedback: ProgramHeadFeedbackDTO = {
  scope: SCOPE,
  periodOptions: PERIOD_OPTIONS,
  emptyReason: null,
  tokens: [
    { text: "helpful", value: 6 },
    { text: "caring", value: 5 },
  ],
  qualitativeItemCount: 12,
  qualitativeResponseCount: 8,
  sourceCounts: [
    { sourceKey: "COURSE_STUDENT", sourceLabel: "Course-bound student evidence", itemCount: 12, responseCount: 8 },
  ],
  promptCounts: [
    { sourceLabel: "Course-bound student evidence", promptLabel: "What worked well?", itemCount: 12, responseCount: 8 },
  ],
  evidenceEvaluations: [{ evaluationId: "eval-1", deploymentName: "CILO Evaluation" }],
};

function buildReads(overrides: Partial<Parameters<typeof buildAiEvidencePacket>[0]> = {}) {
  return {
    overview,
    outcomes,
    stakeholders,
    breakdowns,
    trends,
    feedback,
    ...overrides,
  };
}

describe("AI evidence packet privacy bounds", () => {
  it("serializes a closed aggregate projection without raw text, identifiers, or authorization context", () => {
    const { packet } = buildAiEvidencePacket(buildReads(), CONFIG);
    const serialized = JSON.stringify(packet);

    // Raw comments and response-level rows never enter the packet.
    expect(serialized).not.toContain("text_content");
    expect(serialized).not.toContain("great teacher");
    // Response, respondent, evaluation, and course identifiers stay out.
    expect(serialized).not.toContain("eval-1");
    expect(serialized).not.toContain("course-1");
    expect(serialized).not.toContain("go-1");
    expect(serialized).not.toContain("term-1");
    expect(serialized).not.toContain("maria@assumption.edu.ph");
    expect(serialized).not.toContain("response-");
    expect(serialized).not.toContain("cilo-1");
    // No client-facing navigation or authorization context.
    expect(serialized).not.toContain("evidenceEvaluations");
    expect(serialized).not.toContain("authorizedPrograms");
  });

  it("keeps only bounded token {text, value} entries", () => {
    const { packet } = buildAiEvidencePacket(buildReads(), CONFIG);
    expect(packet.wordFrequencyTokens).toEqual([
      { text: "helpful", value: 6 },
      { text: "caring", value: 5 },
    ]);
  });

  it("clamps long token text and long labels", () => {
    const { packet } = buildAiEvidencePacket(
      buildReads({
        feedback: {
          ...feedback,
          tokens: [{ text: "a".repeat(80), value: 2 }],
        },
        stakeholders: {
          ...stakeholders,
          buckets: [
            {
              ...stakeholders.buckets[0],
              sourceDescription: "x".repeat(500),
            },
          ],
        },
      }),
      CONFIG
    );
    const packetJson = JSON.stringify(packet);
    expect(packetJson).not.toContain("a".repeat(80));
    expect(packetJson).not.toContain("x".repeat(500));
    expect(packet.wordFrequencyTokens[0].text.length).toBeLessThanOrEqual(41);
  });

  it("rounds aggregate means and shares to three decimals", () => {
    const { packet } = buildAiEvidencePacket(buildReads(), CONFIG);
    expect(packet.overview.meanRating).toBe(4.188);
    expect(packet.outcomes.rows[0].meanRating).toBe(3.667);
    expect(packet.outcomes.rows[0].distributions[0].categories[0].percentage).toBe(0.333);
  });

  it("caps tokens to the configured limit and records truncation", () => {
    const manyTokens = Array.from({ length: 10 }, (_, index) => ({
      text: `token-${index}`,
      value: 10 - index,
    }));
    const { packet, evidenceScope } = buildAiEvidencePacket(
      buildReads({ feedback: { ...feedback, tokens: manyTokens } }),
      { ...CONFIG, maxTokens: 3 }
    );
    expect(packet.wordFrequencyTokens).toHaveLength(3);
    expect(packet.wordFrequencyTokens.map((token) => token.text)).toEqual([
      "token-0",
      "token-1",
      "token-2",
    ]);
    expect(evidenceScope.tokenAnalysis).toEqual({
      availableTokenCount: 10,
      includedTokenCount: 3,
      truncated: true,
    });
  });

  it("respects the configured packet character budget", () => {
    const manyTokens = Array.from({ length: 500 }, (_, index) => ({
      text: `token${index}`,
      value: 1000 - index,
    }));
    // Budget = full packet without tokens + room for a small token slice, so the
    // base packet always fits while the 500-token corpus must be truncated.
    const base = buildAiEvidencePacket(
      buildReads({ feedback: { ...feedback, tokens: [] } }),
      { ...CONFIG, maxPacketChars: 1_000_000, maxTokens: 500 }
    );
    const budget = JSON.stringify(base.packet).length + 600;
    const { packet, evidenceScope } = buildAiEvidencePacket(
      buildReads({ feedback: { ...feedback, tokens: manyTokens } }),
      { ...CONFIG, maxPacketChars: budget, maxTokens: 500 }
    );
    expect(JSON.stringify(packet).length).toBeLessThanOrEqual(budget);
    expect(evidenceScope.tokenAnalysis.includedTokenCount).toBeGreaterThan(0);
    expect(evidenceScope.tokenAnalysis.includedTokenCount).toBeLessThan(500);
    expect(evidenceScope.tokenAnalysis.truncated).toBe(true);
  });

  it("never exceeds the packet limit at the token budget boundary", () => {
    // Regression: bracket characters must stay in the base size so a token
    // that exactly fills the limit is accepted and one character over is
    // dropped instead of throwing the size guard.
    const base = buildAiEvidencePacket(buildReads(), {
      ...CONFIG,
      maxPacketChars: 1_000_000,
      maxTokens: 1,
    });
    const baseWithEmptyTokens = JSON.stringify({
      ...base.packet,
      wordFrequencyTokens: [],
    }).length;
    const entrySize = JSON.stringify({ text: "helpful", value: 6 }).length;
    const exactLimit = baseWithEmptyTokens + entrySize;

    const atLimit = buildAiEvidencePacket(buildReads(), {
      ...CONFIG,
      maxPacketChars: exactLimit,
      maxTokens: 1,
    });
    expect(atLimit.packet.wordFrequencyTokens).toHaveLength(1);
    expect(JSON.stringify(atLimit.packet).length).toBe(exactLimit);

    const oneLess = buildAiEvidencePacket(buildReads(), {
      ...CONFIG,
      maxPacketChars: exactLimit - 1,
      maxTokens: 1,
    });
    expect(oneLess.packet.wordFrequencyTokens).toHaveLength(0);
    expect(JSON.stringify(oneLess.packet).length).toBeLessThanOrEqual(exactLimit - 1);
  });

  it("keeps tokens when the raw corpus alone exceeds the packet budget", () => {
    // Regression: the token budget must come from the packet without tokens;
    // otherwise a corpus larger than maxPacketChars drives the remaining
    // budget negative and all qualitative tokens are dropped.
    const manyTokens = Array.from({ length: 500 }, (_, index) => ({
      text: `token-${index}`,
      value: 1000 - index,
    }));
    const fullCorpusSize = JSON.stringify({ wordFrequencyTokens: manyTokens }).length;
    const base = buildAiEvidencePacket(
      buildReads({ feedback: { ...feedback, tokens: [] } }),
      { ...CONFIG, maxPacketChars: 1_000_000, maxTokens: 500 }
    );
    const budget = JSON.stringify(base.packet).length + 200;
    expect(budget).toBeLessThan(fullCorpusSize);

    const { packet, evidenceScope } = buildAiEvidencePacket(
      buildReads({ feedback: { ...feedback, tokens: manyTokens } }),
      { ...CONFIG, maxPacketChars: budget, maxTokens: 500 }
    );
    expect(evidenceScope.tokenAnalysis.includedTokenCount).toBeGreaterThan(0);
    expect(JSON.stringify(packet).length).toBeLessThanOrEqual(budget);
  });

  it("reports analyzed versus available evidence", () => {
    const { evidenceScope } = buildAiEvidencePacket(buildReads(), CONFIG);
    expect(evidenceScope).toEqual({
      submittedResponseCount: 24,
      qualitativeItemCount: 12,
      evaluatedSourceLabels: ["Course-bound student evidence"],
      tokenAnalysis: { availableTokenCount: 2, includedTokenCount: 2, truncated: false },
    });
  });
});

describe("AI result DTO closure", () => {
  it("exposes only validated aggregate fields with locally computed counts", () => {
    const result: ProgramHeadAIInsightsSuccessDTO = {
      fingerprint: "||",
      scope: SCOPE,
      summary: "Summary.",
      strengths: ["Strength"],
      areasForReview: ["Area"],
      themes: [{ name: "Theme", summary: "Theme summary" }],
      sentimentClassifications: [
        { evidenceCategory: "Course-bound student evidence", sentiment: "positive", rationale: "R." },
      ],
      sentimentCounts: [{ sentiment: "positive", count: 1, percentage: 1 }],
      questionsForHumanReview: ["Question"],
      limitations: ["Limitation"],
      evidenceScope: {
        submittedResponseCount: 24,
        qualitativeItemCount: 12,
        evaluatedSourceLabels: ["Course-bound student evidence"],
        tokenAnalysis: { availableTokenCount: 2, includedTokenCount: 2, truncated: false },
      },
    };
    const serialized = JSON.stringify(result);
    const keys = Object.keys(result).sort();
    expect(keys).toEqual(
      [
        "areasForReview",
        "evidenceScope",
        "fingerprint",
        "limitations",
        "questionsForHumanReview",
        "scope",
        "sentimentClassifications",
        "sentimentCounts",
        "strengths",
        "summary",
        "themes",
      ].sort()
    );
    expect(serialized).not.toContain("maria@assumption.edu.ph");
    expect(serialized).not.toContain("text_content");
  });

  it("keeps the packet free of provider-instruction escape hatches", () => {
    const { packet } = buildAiEvidencePacket(buildReads(), CONFIG);
    const serialized = JSON.stringify(packet);
    expect(serialized).not.toContain("<tool");
    expect(serialized).not.toContain("tool_calls");
  });

  it("never includes qualitative item rows in the packet", () => {
    const { packet } = buildAiEvidencePacket(buildReads(), CONFIG);
    const rows = (packet as unknown as Record<string, unknown>);
    expect(rows).not.toHaveProperty("qualitativeItems");
    expect(rows).not.toHaveProperty("responses");
    expect((packet as AiEvidencePacket).feedback).not.toHaveProperty("items");
  });
});