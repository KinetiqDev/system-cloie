import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import type {
  AiModelTransport,
  AiModelTransportResult,
} from "@/features/analytics/services/ai-insight-runtime";
import {
  AI_EVIDENCE_END,
  AI_EVIDENCE_START,
} from "@/features/analytics/services/program-head-ai-schema";
import type {
  GeneralEducationAnalyticsFilterState,
  GeneralEducationAnalyticsTab,
} from "@/features/analytics/services/general-education-analytics-state";
import type {
  GeneralEducationAnalyticsFrameDTO,
  GeneralEducationCoursesDTO,
  GeneralEducationFeedbackDTO,
  GeneralEducationOutcomesDTO,
  GeneralEducationProgramsDTO,
  GeneralEducationTrendsDTO,
} from "@/features/analytics/general-education-analytics-types";

const {
  frameMock,
  outcomesMock,
  coursesMock,
  programsMock,
  trendsMock,
  feedbackMock,
  sessionMock,
} = vi.hoisted(() => ({
  frameMock: vi.fn(),
  outcomesMock: vi.fn(),
  coursesMock: vi.fn(),
  programsMock: vi.fn(),
  trendsMock: vi.fn(),
  feedbackMock: vi.fn(),
  sessionMock: vi.fn(),
}));

vi.mock("@/features/analytics/services/general-education-analytics", () => ({
  getGeneralEducationAnalyticsFrame: frameMock,
  getGeneralEducationOutcomes: outcomesMock,
  getGeneralEducationCourses: coursesMock,
  getGeneralEducationPrograms: programsMock,
  getGeneralEducationTrends: trendsMock,
  getGeneralEducationFeedback: feedbackMock,
}));

vi.mock("@/features/auth/services/resolve-auth-session", () => ({
  resolveAuthSession: sessionMock,
}));

const FILTER = (tab: GeneralEducationAnalyticsTab): GeneralEducationAnalyticsFilterState => ({
  tab,
});

const frameDTO = (): GeneralEducationAnalyticsFrameDTO => ({
  scope: { periodLabel: "2025-2026 · 1st Semester" },
  kpi: {
    submittedResponseCount: 24,
    evaluationOpportunityCount: 40,
    responseRate: 0.6,
    ratingCount: 96,
    meanRating: 4.1875,
    spansMultipleScales: false,
    scaleContext: "1–5 (5-point)",
    excludedRatingCount: 0,
  },
  emptyReason: null,
  options: {
    schoolYears: [],
    semesters: [],
    termInstances: [],
    courses: [{ id: "course-1", label: "GE 101 — General Chemistry" }],
    programs: [{ id: "program-1", label: "BS Chemistry" }],
    yearLevels: [{ value: "FIRST_YEAR", label: "1st Year" }],
    ilos: [{ id: "ilo-1", label: "ILO-1 Critical thinking" }],
  },
});

const outcomesDTO = (): GeneralEducationOutcomesDTO => ({
  emptyReason: null,
  outcomes: [
    {
      outcomeId: "ilo-1",
      code: "ILO-1",
      name: "Critical thinking",
      isActive: true,
      order: 1,
      meanRating: 4.25,
      ratingCount: 8,
      submittedResponseCount: 6,
      contributingCilos: [{ id: "cilo-1", description: "Analyze evidence" }],
      contributingCourses: [{ id: "course-1", code: "GE 101", title: "General Chemistry" }],
      contributors: [],
      evidenceEvaluations: [{ evaluationId: "evaluation-1", deploymentName: "Midterm evaluation" }],
      distributions: [
        {
          scaleLabel: "1–5 (5-point)",
          maxValue: 5,
          categories: [{ value: 4, label: null, count: 6, percentage: 0.75 }],
        },
      ],
      spansMultipleScales: false,
      excludedRatingCount: 0,
      evidenceSummary: {} as GeneralEducationOutcomesDTO["outcomes"][number]["evidenceSummary"],
    },
  ],
  currentMappingDisclosure: "Current CILO-to-ILO mappings group historical ratings.",
  manyToManyDisclosure: false,
  unlinkedRatings: { generalItems: 0, unmappedCilos: 0 },
  alignmentCoverage: [
    {
      outcomeId: "ilo-1",
      code: "ILO-1",
      learning: 1,
      practice: 0,
      opportunity: 0,
      unclassified: 0,
    },
  ],
  courseMatrix: [
    {
      courseId: "course-1",
      courseCode: "GE 101",
      courseTitle: "General Chemistry",
      cells: [
        {
          outcomeId: "ilo-1",
          aligned: true,
          meanRating: 4.25,
          ratingCount: 8,
          spansMultipleScales: false,
        },
      ],
    },
  ],
});

const scaleGroups = [
  {
    scaleKey: "scale-1",
    scaleLabel: "1–5 (5-point)",
    meanRating: 4.1,
    ratingCount: 9,
    submittedResponseCount: 9,
    distribution: {
      scaleLabel: "1–5 (5-point)",
      maxValue: 5,
      categories: [{ value: 4, label: null, count: 9, percentage: 1 }],
    },
  },
];

const coursesDTO = (): GeneralEducationCoursesDTO => ({
  emptyReason: null,
  rows: [
    {
      courseId: "course-1",
      courseCode: "GE 101",
      courseTitle: "General Chemistry",
      sectionCount: 2,
      programCount: 3,
      evaluationOpportunityCount: 20,
      submittedResponseCount: 12,
      responseRate: 0.6,
      meanRating: 4.1,
      ratingCount: 9,
      excludedRatingCount: 0,
      spansMultipleScales: false,
      instrumentContext: "GE Evaluation v2",
      scaleGroups,
      alignedIlos: [{ id: "ilo-1", code: "ILO-1" }],
      previousComparable: { periodLabel: "2024-2025 · 2nd Semester", meanRating: 3.9, change: 0.2 },
      evidenceEvaluations: [{ evaluationId: "evaluation-1", deploymentName: "Midterm evaluation" }],
      sections: [
        {
          evaluationId: "evaluation-1",
          programCode: "BS Chemistry",
          yearLevel: "FIRST_YEAR",
          section: "A",
          facultyName: "Dr. Rivera",
          submittedResponseCount: 6,
          evaluationOpportunityCount: 10,
          meanRating: 4.2,
        },
      ],
    },
  ],
});

const programsDTO = (): GeneralEducationProgramsDTO => ({
  emptyReason: null,
  attributionNote: "Programs are attributed by the class context of each respondent.",
  rows: [
    {
      programId: "program-1",
      programCode: "BSCH",
      programName: "BS Chemistry",
      courseCount: 2,
      sectionCount: 4,
      evaluationOpportunityCount: 20,
      submittedResponseCount: 12,
      responseRate: 0.6,
      meanRating: 4.1,
      ratingCount: 9,
      spansMultipleScales: false,
      scaleGroups,
    },
  ],
  courseMatrix: [],
});

const trendsDTO = (): GeneralEducationTrendsDTO => ({
  periods: [
    {
      termInstanceId: "term-1",
      periodLabel: "2025-2026 · 1st Semester",
      meanRating: 4.1,
      submittedResponseCount: 10,
      evaluationOpportunityCount: 20,
      responseRate: 0.5,
      ratingCount: 40,
      instrumentContext: "GE Evaluation v2",
      scaleContext: "1–5 (5-point)",
      scaleDomain: [1, 5],
      outcomeCodes: ["ILO-1"],
      comparableWithPrevious: false,
    },
  ],
  breaks: [],
  emptyReason: null,
});

const feedbackDTO = (): GeneralEducationFeedbackDTO => ({
  emptyReason: null,
  tokens: [
    { text: "helpful", value: 6, responseCount: 6 },
    { text: "clear", value: 4, responseCount: 4 },
  ],
  tone: { scoredItemCount: 12, positive: 3, neutral: 8, negative: 1 },
  qualitativeItemCount: 12,
  qualitativeResponseCount: 8,
  sourceLabel: "General Education course evidence",
  promptCounts: [
    {
      sourceLabel: "General Education course evidence",
      promptLabel: "What worked well?",
      promptKey: '["qualitative","worked"]',
      instrumentId: "instrument-1",
      instrumentLabel: "GE Evaluation v1",
      itemCount: 12,
      responseCount: 8,
      tone: { scoredItemCount: 12, positive: 3, neutral: 8, negative: 1 },
      terms: [{ text: "helpful", value: 6, responseCount: 6 }],
    },
  ],
  evidenceEvaluations: [{ evaluationId: "evaluation-1", deploymentName: "Midterm evaluation" }],
});

const VALID_SECTION = {
  observation: "ILO-1 averaged 4.25 on the 1–5 scale across 8 valid ratings.",
  evidence: ["ILO-1 averaged 4.25 on the 1–5 scale across 8 valid ratings."],
  connection: "The same responses drive the mean and the distribution shape.",
  limitation: "Only 24 submitted responses back these figures.",
  reviewQuestion: "Which course contributes most ratings to this ILO?",
};

function enabledTransport(result: AiModelTransportResult) {
  return vi.fn<AiModelTransport>(async () => result);
}

function stubEnabledConfig(overrides: Record<string, string> = {}) {
  vi.stubEnv("CLOIE_AI_ENABLED", "true");
  vi.stubEnv("CLOIE_AI_API_KEY", "test-key");
  vi.stubEnv("CLOIE_AI_BASE_URL", "https://provider.test/v1");
  vi.stubEnv("CLOIE_AI_MODEL", "test-model");
  vi.stubEnv("CLOIE_AI_MIN_SUBMITTED_RESPONSES", "10");
  vi.stubEnv("CLOIE_AI_MIN_QUALITATIVE_ITEMS", "5");
  for (const [key, value] of Object.entries(overrides)) {
    vi.stubEnv(key, value);
  }
}
function packetFrom(transport: Mock<AiModelTransport>, call = 0) {
  const userMessage = transport.mock.calls[call]?.[0]?.userMessage ?? "";
  const start = userMessage.indexOf(AI_EVIDENCE_START) + AI_EVIDENCE_START.length;
  const end = userMessage.lastIndexOf(AI_EVIDENCE_END);
  return { userMessage, packetJson: userMessage.slice(start, end) };
}

type ServiceModule =
  typeof import("@/features/analytics/services/generate-general-education-analytics-insight");

describe("generateGeneralEducationAnalyticsInsight", () => {
  let service: ServiceModule;

  beforeEach(async () => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.clearAllMocks();
    sessionMock.mockResolvedValue({ userId: "coordinator-1", activeRole: "GEN_ED_COORDINATOR" });
    frameMock.mockResolvedValue(frameDTO());
    outcomesMock.mockResolvedValue(outcomesDTO());
    coursesMock.mockResolvedValue(coursesDTO());
    programsMock.mockResolvedValue(programsDTO());
    trendsMock.mockResolvedValue(trendsDTO());
    feedbackMock.mockResolvedValue(feedbackDTO());
    service =
      await import("@/features/analytics/services/generate-general-education-analytics-insight");
  });

  it("re-authorizes before reading evidence or calling the provider when the role is not Coordinator", async () => {
    stubEnabledConfig();
    sessionMock.mockResolvedValue({ userId: "faculty-1", activeRole: "FACULTY" });
    const transport = enabledTransport({ ok: true, content: JSON.stringify(VALID_SECTION) });

    const result = await service.generateGeneralEducationAnalyticsInsight(
      { view: "outcomes", filters: FILTER("outcomes") },
      transport
    );

    expect(result).toEqual({ ok: false, state: "unauthorized" });
    expect(frameMock).not.toHaveBeenCalled();
    expect(transport).not.toHaveBeenCalled();
  });

  it("re-authorizes before the provider when there is no session at all", async () => {
    stubEnabledConfig();
    sessionMock.mockResolvedValue(null);
    const transport = enabledTransport({ ok: true, content: JSON.stringify(VALID_SECTION) });

    const result = await service.generateGeneralEducationAnalyticsInsight(
      { view: "courses", filters: FILTER("courses") },
      transport
    );

    expect(result).toEqual({ ok: false, state: "unauthorized" });
    expect(transport).not.toHaveBeenCalled();
  });

  it("reports disabled without authorizing, reading evidence, or calling the provider", async () => {
    vi.stubEnv("CLOIE_AI_ENABLED", undefined);
    const transport = enabledTransport({ ok: true, content: JSON.stringify(VALID_SECTION) });

    const result = await service.generateGeneralEducationAnalyticsInsight(
      { view: "outcomes", filters: FILTER("outcomes") },
      transport
    );

    expect(result).toEqual({ ok: false, state: "disabled" });
    expect(sessionMock).not.toHaveBeenCalled();
    expect(frameMock).not.toHaveBeenCalled();
    expect(transport).not.toHaveBeenCalled();
  });

  it("fails safely as unauthorized when the frame rebuild denies the scope", async () => {
    stubEnabledConfig();
    frameMock.mockResolvedValue(null);
    const transport = enabledTransport({ ok: true, content: JSON.stringify(VALID_SECTION) });

    const result = await service.generateGeneralEducationAnalyticsInsight(
      { view: "outcomes", filters: FILTER("outcomes") },
      transport
    );

    expect(result).toEqual({ ok: false, state: "unauthorized" });
    expect(outcomesMock).not.toHaveBeenCalled();
    expect(transport).not.toHaveBeenCalled();
  });

  it("fails safely as unauthorized when the requested view read denies the scope", async () => {
    stubEnabledConfig();
    outcomesMock.mockResolvedValue(null);
    const transport = enabledTransport({ ok: true, content: JSON.stringify(VALID_SECTION) });

    const result = await service.generateGeneralEducationAnalyticsInsight(
      { view: "outcomes", filters: FILTER("outcomes") },
      transport
    );

    expect(result).toEqual({ ok: false, state: "unauthorized" });
    expect(transport).not.toHaveBeenCalled();
  });

  it("rebuilds only the evidence read backing the requested view", async () => {
    stubEnabledConfig();

    await service.generateGeneralEducationAnalyticsInsight(
      { view: "outcomes", filters: FILTER("outcomes") },
      enabledTransport({ ok: true, content: JSON.stringify(VALID_SECTION) })
    );

    expect(outcomesMock).toHaveBeenCalledTimes(1);
    expect(coursesMock).not.toHaveBeenCalled();
    expect(programsMock).not.toHaveBeenCalled();
    expect(trendsMock).not.toHaveBeenCalled();
    expect(feedbackMock).not.toHaveBeenCalled();
  });

  it("never sends a response, comment, identifier, email, or faculty identity to the provider", async () => {
    stubEnabledConfig();
    const transport = enabledTransport({ ok: true, content: JSON.stringify(VALID_SECTION) });

    await service.generateGeneralEducationAnalyticsInsight(
      { view: "courses", filters: FILTER("courses") },
      transport
    );

    const { userMessage, packetJson } = packetFrom(transport);
    // The course DTO carries a named faculty member, an evaluation id, and a
    // deployment name; none of them may reach the provider.
    expect(userMessage).not.toContain("Dr. Rivera");
    expect(userMessage).not.toContain("Midterm evaluation");
    expect(userMessage).not.toContain("evaluation-1");
    expect(userMessage).not.toContain("coordinator-1");
    const packet = JSON.parse(packetJson);
    expect(JSON.stringify(packet)).not.toContain("facultyName");
    expect(packet.courseRows[0]).not.toHaveProperty("sections");
    expect(packet.courseRows[0]).not.toHaveProperty("evidenceEvaluations");
    // The count that evidence supports still travels.
    expect(packet.courseRows[0].evidenceEvaluationCount).toBe(1);
  });

  it("keeps respondent-controlled term text inside the bounded evidence boundary", async () => {
    stubEnabledConfig();
    feedbackMock.mockResolvedValue(
      feedbackDTO() as GeneralEducationFeedbackDTO & {
        tokens: Array<{ text: string; value: number; responseCount: number }>;
      }
    );
    const transport = enabledTransport({ ok: true, content: JSON.stringify(VALID_SECTION) });

    await service.generateGeneralEducationAnalyticsInsight(
      { view: "qualitative", filters: FILTER("qualitative") },
      transport
    );

    const { packetJson } = packetFrom(transport);
    const packet = JSON.parse(packetJson);
    expect(packet.view).toBeUndefined();
    expect(packet.wordFrequencyTokens.length).toBeGreaterThan(0);
    expect(packet.truncations).toEqual([]);
  });

  it("applies the qualitative-item gate only to the written-feedback view", async () => {
    stubEnabledConfig();
    feedbackMock.mockResolvedValue({ ...feedbackDTO(), qualitativeItemCount: 2 });

    const gated = await service.generateGeneralEducationAnalyticsInsight(
      { view: "qualitative", filters: FILTER("qualitative") },
      enabledTransport({ ok: true, content: JSON.stringify(VALID_SECTION) })
    );
    expect(gated).toEqual({
      ok: false,
      state: "insufficient-evidence",
      detail: {
        view: "qualitative",
        submittedResponseCount: 24,
        minimumSubmittedResponses: 10,
        qualitativeItemCount: 2,
        minimumQualitativeItems: 5,
      },
    });

    const ungated = await service.generateGeneralEducationAnalyticsInsight(
      { view: "outcomes", filters: FILTER("outcomes") },
      enabledTransport({ ok: true, content: JSON.stringify(VALID_SECTION) })
    );
    expect(ungated.ok).toBe(true);
  });

  it("forwards every applicable ILO disclosure and scope limit as a limitation", async () => {
    stubEnabledConfig();
    outcomesMock.mockResolvedValue({
      ...outcomesDTO(),
      manyToManyDisclosure: true,
      unlinkedRatings: { generalItems: 4, unmappedCilos: 2 },
      outcomes: outcomesDTO().outcomes.map((outcome) => ({
        ...outcome,
        spansMultipleScales: true,
      })),
    });
    const transport = enabledTransport({ ok: true, content: JSON.stringify(VALID_SECTION) });

    const result = await service.generateGeneralEducationAnalyticsInsight(
      { view: "outcomes", filters: FILTER("outcomes") },
      transport
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const limitations = result.data.evidenceScope.limitations.join(" ");
    expect(limitations).toContain("Current CILO-to-ILO mappings");
    expect(limitations).toContain("not additive");
    expect(limitations).toContain("more than one ILO");
    expect(limitations).toContain("did not reach any ILO");
    expect(limitations).toContain("manifestation (learning, practice, opportunity)");
    expect(limitations).toContain("more than one scale identity");
    expect(limitations).toContain("or a mastery record");
  });

  it("names the applied filter labels and pins the packet to the requested view", async () => {
    stubEnabledConfig();
    const transport = enabledTransport({ ok: true, content: JSON.stringify(VALID_SECTION) });

    await service.generateGeneralEducationAnalyticsInsight(
      {
        view: "outcomes",
        // A stale tab in the submitted state must not describe another scope.
        filters: { ...FILTER("outcomes"), courseId: "course-1", iloId: "ilo-1" },
      },
      transport
    );

    const { packetJson } = packetFrom(transport);
    const packet = JSON.parse(packetJson);
    expect(packet.scope.appliedFilters).toEqual({
      period: null,
      course: "GE 101 — General Chemistry",
      program: null,
      yearLevel: null,
      ilo: "ILO-1 Critical thinking",
    });
  });

  it("reuses validated output for an identical scope and regenerates when evidence changes", async () => {
    stubEnabledConfig();
    const transport = enabledTransport({ ok: true, content: JSON.stringify(VALID_SECTION) });

    const first = await service.generateGeneralEducationAnalyticsInsight(
      { view: "outcomes", filters: FILTER("outcomes") },
      transport
    );
    const repeated = await service.generateGeneralEducationAnalyticsInsight(
      { view: "outcomes", filters: FILTER("outcomes") },
      transport
    );
    expect(first).toEqual(repeated);
    expect(transport).toHaveBeenCalledTimes(1);

    frameMock.mockResolvedValue({
      ...frameDTO(),
      kpi: { ...frameDTO().kpi, ratingCount: 97 },
    });
    const changed = await service.generateGeneralEducationAnalyticsInsight(
      { view: "outcomes", filters: FILTER("outcomes") },
      transport
    );
    expect(changed.ok).toBe(true);
    expect(transport).toHaveBeenCalledTimes(2);
  });

  it("keeps applied filter changes from reusing a cached scope with the wrong packet", async () => {
    stubEnabledConfig();
    const transport = enabledTransport({ ok: true, content: JSON.stringify(VALID_SECTION) });

    await service.generateGeneralEducationAnalyticsInsight(
      { view: "outcomes", filters: FILTER("outcomes") },
      transport
    );
    await service.generateGeneralEducationAnalyticsInsight(
      { view: "outcomes", filters: { ...FILTER("outcomes"), courseId: "course-1" } },
      transport
    );

    expect(transport).toHaveBeenCalledTimes(2);
    const { packetJson } = packetFrom(transport, 1);
    expect(JSON.parse(packetJson).scope.appliedFilters.course).toBe("GE 101 — General Chemistry");
  });

  it("does not share cached interpretations between Coordinator principals", async () => {
    stubEnabledConfig();
    const transport = enabledTransport({ ok: true, content: JSON.stringify(VALID_SECTION) });

    await service.generateGeneralEducationAnalyticsInsight(
      { view: "outcomes", filters: FILTER("outcomes") },
      transport
    );
    sessionMock.mockResolvedValue({ userId: "coordinator-2", activeRole: "GEN_ED_COORDINATOR" });
    await service.generateGeneralEducationAnalyticsInsight(
      { view: "outcomes", filters: FILTER("outcomes") },
      transport
    );

    expect(transport).toHaveBeenCalledTimes(2);
  });

  it("shares one provider call between identical requests already in flight", async () => {
    stubEnabledConfig();
    const transport = vi.fn<AiModelTransport>(async () => ({
      ok: true as const,
      content: JSON.stringify(VALID_SECTION),
    }));

    const first = service.generateGeneralEducationAnalyticsInsight(
      { view: "trends", filters: FILTER("trends") },
      transport
    );
    const second = service.generateGeneralEducationAnalyticsInsight(
      { view: "trends", filters: FILTER("trends") },
      transport
    );

    await expect(Promise.all([first, second])).resolves.toHaveLength(2);
    expect(transport).toHaveBeenCalledTimes(1);
  });

  it("never caches a failed generation", async () => {
    stubEnabledConfig();
    const transport = enabledTransport({ ok: false, timedOut: false });

    const failed = await service.generateGeneralEducationAnalyticsInsight(
      { view: "outcomes", filters: FILTER("outcomes") },
      transport
    );
    expect(failed).toEqual({ ok: false, state: "provider-error" });

    const retry = enabledTransport({ ok: true, content: JSON.stringify(VALID_SECTION) });
    const recovered = await service.generateGeneralEducationAnalyticsInsight(
      { view: "outcomes", filters: FILTER("outcomes") },
      retry
    );
    expect(recovered.ok).toBe(true);
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it("maps provider failures and malformed output to recoverable states", async () => {
    stubEnabledConfig();
    const timeout = await service.generateGeneralEducationAnalyticsInsight(
      { view: "courses", filters: FILTER("courses") },
      enabledTransport({ ok: false, timedOut: true })
    );
    expect(timeout).toEqual({ ok: false, state: "timeout" });

    vi.resetModules();
    sessionMock.mockResolvedValue({ userId: "coordinator-1", activeRole: "GEN_ED_COORDINATOR" });
    const malformed = await (
      await import("@/features/analytics/services/generate-general-education-analytics-insight")
    ).generateGeneralEducationAnalyticsInsight(
      { view: "programs", filters: FILTER("programs") },
      enabledTransport({ ok: true, content: "{not json" })
    );
    expect(malformed).toEqual({ ok: false, state: "invalid-output" });
  });

  it("bounds a wide scope by omission and discloses it instead of failing", async () => {
    stubEnabledConfig();
    const rows = Array.from({ length: 400 }, (_, index) => ({
      ...outcomesDTO().outcomes[0]!,
      outcomeId: `ilo-${index}`,
      code: `ILO-${index}`,
      name: `Institutional outcome number ${index} with a long descriptive label`,
      ratingCount: 400 - index,
    }));
    outcomesMock.mockResolvedValue({ ...outcomesDTO(), outcomes: rows });
    const transport = enabledTransport({ ok: true, content: JSON.stringify(VALID_SECTION) });

    const result = await service.generateGeneralEducationAnalyticsInsight(
      { view: "outcomes", filters: FILTER("outcomes") },
      transport
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { packetJson } = packetFrom(transport);
    expect(packetJson.length).toBeLessThanOrEqual(16_000);
    const packet = JSON.parse(packetJson);

    expect(packet.iloRows.length).toBeLessThan(400);
    expect(result.data.evidenceScope.truncations.length).toBeGreaterThan(0);
    expect(packet.truncations.join(" ")).toContain("ILO rows: carried");
  });

  it("accepts a null section when the evidence cannot support an observation", async () => {
    stubEnabledConfig();

    const result = await service.generateGeneralEducationAnalyticsInsight(
      { view: "qualitative", filters: FILTER("qualitative") },
      enabledTransport({ ok: true, content: "null" })
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.view).toBe("qualitative");
    expect(result.data.insight).toBeNull();
  });
  it("sends ILO codes and counts in alignment coverage instead of catalog outcome ids", async () => {
    stubEnabledConfig();
    const transport = enabledTransport({ ok: true, content: JSON.stringify(VALID_SECTION) });

    await service.generateGeneralEducationAnalyticsInsight(
      { view: "outcomes", filters: FILTER("outcomes") },
      transport
    );

    const { userMessage, packetJson } = packetFrom(transport);
    const packet = JSON.parse(packetJson);
    expect(packet.alignmentCoverage[0]).toEqual({
      code: "ILO-1",
      learning: 1,
      practice: 0,
      opportunity: 0,
      unclassified: 0,
    });
    expect(userMessage).not.toContain("outcomeId");
    expect(packetJson).not.toContain("ilo-1");
    expect(packet.matrix[0].cells[0].outcomeCode).toBe("ILO-1");
  });

  it("bounds nested outcome distributions and course matrix rows with a disclosure", async () => {
    stubEnabledConfig();
    outcomesMock.mockResolvedValue({
      ...outcomesDTO(),
      outcomes: Array.from({ length: 60 }, (_, index) => ({
        ...outcomesDTO().outcomes[0]!,
        outcomeId: `ilo-${index}`,
        code: `ILO-${index}`,
        ratingCount: 60 - index,
        // More scale identities than any packet may carry.
        distributions: Array.from({ length: 12 }, (_, group) => ({
          scaleLabel: `1–5 scale identity ${group}`,
          maxValue: 5,
          categories: [{ value: 4, label: null, count: 5, percentage: 1 }],
        })),
      })),
      courseMatrix: Array.from({ length: 50 }, (_, index) => ({
        courseId: `course-${index}`,
        courseCode: `GE ${index}`,
        courseTitle: `General Education course ${index}`,
        cells: [
          {
            outcomeId: "ilo-0",
            aligned: true,
            meanRating: 4,
            ratingCount: 5,
            spansMultipleScales: false,
          },
        ],
      })),
    });
    const transport = enabledTransport({ ok: true, content: JSON.stringify(VALID_SECTION) });

    const result = await service.generateGeneralEducationAnalyticsInsight(
      { view: "outcomes", filters: FILTER("outcomes") },
      transport
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { packetJson } = packetFrom(transport);
    // A bounded slice, not an `unexpected` abort on ordinary many-row evidence.
    expect(packetJson.length).toBeLessThanOrEqual(16_000);
    const packet = JSON.parse(packetJson);
    for (const row of packet.iloRows) {
      expect(row.distributions.length).toBeLessThanOrEqual(4);
      expect(row.distributionCount).toBe(12);
    }
    expect(packet.matrix.length).toBeLessThan(50);
    expect(packet.truncations.join(" ")).toContain("Course matrix rows");
  });

  it("puts the view limitations inside the packet the provider reads", async () => {
    stubEnabledConfig();
    outcomesMock.mockResolvedValue({ ...outcomesDTO(), manyToManyDisclosure: true });
    const transport = enabledTransport({ ok: true, content: JSON.stringify(VALID_SECTION) });

    const result = await service.generateGeneralEducationAnalyticsInsight(
      { view: "outcomes", filters: FILTER("outcomes") },
      transport
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { packetJson } = packetFrom(transport);
    const packet = JSON.parse(packetJson);
    expect(packet.limitations.join(" ")).toContain("not additive");
    expect(packet.limitations).toEqual(result.data.evidenceScope.limitations);
  });

  it("regenerates when only a disclosure changes, because the packet text changed", async () => {
    stubEnabledConfig();
    outcomesMock.mockResolvedValue({ ...outcomesDTO(), manyToManyDisclosure: true });
    const transport = enabledTransport({ ok: true, content: JSON.stringify(VALID_SECTION) });

    await service.generateGeneralEducationAnalyticsInsight(
      { view: "outcomes", filters: FILTER("outcomes") },
      transport
    );
    outcomesMock.mockResolvedValue(outcomesDTO());
    await service.generateGeneralEducationAnalyticsInsight(
      { view: "outcomes", filters: FILTER("outcomes") },
      transport
    );

    expect(transport).toHaveBeenCalledTimes(2);
  });

  it("describes a null scope-wide mean honestly instead of claiming a pooled figure", async () => {
    stubEnabledConfig();
    frameMock.mockResolvedValue({
      ...frameDTO(),
      kpi: { ...frameDTO().kpi, spansMultipleScales: true, meanRating: null },
    });
    const transport = enabledTransport({ ok: true, content: JSON.stringify(VALID_SECTION) });

    const result = await service.generateGeneralEducationAnalyticsInsight(
      { view: "outcomes", filters: FILTER("outcomes") },
      transport
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const limitations = result.data.evidenceScope.limitations.join(" ");
    expect(limitations).toContain("no single scope-wide mean is reported");
    expect(limitations).not.toContain("scope-wide mean pools");
  });

  it("keys the cache on the canonical scope while the provider still sees labels only", async () => {
    stubEnabledConfig();
    const transport = enabledTransport({ ok: true, content: JSON.stringify(VALID_SECTION) });

    await service.generateGeneralEducationAnalyticsInsight(
      { view: "outcomes", filters: { ...FILTER("outcomes"), courseId: "course-1" } },
      transport
    );
    await service.generateGeneralEducationAnalyticsInsight(
      { view: "outcomes", filters: { ...FILTER("outcomes"), iloId: "ilo-1" } },
      transport
    );

    expect(transport).toHaveBeenCalledTimes(2);
    // The canonical scope stays local: it keys the cache, never the packet.
    const { userMessage } = packetFrom(transport, 1);
    expect(userMessage).not.toContain("courseId");
    expect(userMessage).not.toContain("iloId");
    expect(userMessage).not.toContain("course-1");
  });
});
