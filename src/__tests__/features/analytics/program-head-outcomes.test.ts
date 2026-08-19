import { beforeEach, describe, expect, it, vi } from "vitest";
import { getProgramHeadOutcomes } from "@/features/analytics/services/get-program-head-analytics";
import {
  aggregateOutcomeEvidence,
  resolveSnapshotItemScale,
  type OutcomeEvidenceRow,
} from "@/features/analytics/services/program-head-analytics-aggregators";

const { resolveProgramHeadContextMock, prismaMock } = vi.hoisted(() => ({
  resolveProgramHeadContextMock: vi.fn(),
  prismaMock: {
    academicTermInstance: { findMany: vi.fn() },
    schoolYear: { findUnique: vi.fn() },
    quantitativeResponseItem: { findMany: vi.fn() },
    courseBoundCiloQuestionBinding: { findMany: vi.fn() },
    evaluationAssignment: { count: vi.fn() },
    response: { count: vi.fn() },
    instrumentVersion: { findMany: vi.fn() },
  },
}));

vi.mock("@/features/auth/services/resolve-program-head-context", () => ({
  resolveProgramHeadContext: resolveProgramHeadContextMock,
}));
vi.mock("@/lib/db/prisma", () => ({ prisma: prismaMock }));

const bsedContext = {
  success: true,
  data: {
    userId: "head-1",
    authorizedPrograms: [
      { code: "BEED", id: "program-beed", name: "Bachelor of Elementary Education" },
      { code: "BSED", id: "program-bsed", name: "Bachelor of Secondary Education" },
    ],
    selectedProgram: { code: "BSED", id: "program-bsed", name: "Bachelor of Secondary Education" },
  },
};

const termInstances = [
  {
    id: "term-2025-1st",
    semester: "FIRST",
    term: "FIRST_TERM",
    school_year: { id: "sy-2025", code: "2025-2026" },
  },
];

const outcomesFilters = { tab: "outcomes" as const };

// Frozen instrument-version structure snapshots. The CILO snapshot uses a
// numeric 1–5 scale; the exit snapshot uses a labeled 1–4 Likert scale to
// prove no universal 1–5 binning is assumed.
const ciloStructure = [
  {
    key: "cilo-items",
    title: "CILO",
    items: [
      {
        key: "cilo-attainment-1",
        kind: "quantitative",
        prompt: "I achieved the first outcome.",
        scale: [1, 2, 3, 4, 5],
      },
    ],
  },
];

const likertStructure = [
  {
    key: "program-academic",
    title: "Program",
    questions: [
      {
        key: "q1",
        type: "likert",
        prompt: "Q",
        likertDescriptors: [
          { value: 1, label: "Strongly Disagree" },
          { value: 2, label: "Disagree" },
          { value: 3, label: "Agree" },
          { value: 4, label: "Strongly Agree" },
        ],
      },
    ],
  },
];

const instrumentVersions = [
  { id: "iv-cilo-v1", structure_snapshot: ciloStructure },
  { id: "iv-exit-v1", structure_snapshot: likertStructure },
];

function prismaRatingRow(opts: {
  ratingValue: number;
  responseId: string;
  sectionKey: string;
  itemKey: string;
  instrumentVersionId: string | null;
  evaluationId?: string;
}) {
  return {
    rating_value: opts.ratingValue,
    response_id: opts.responseId,
    section_key: opts.sectionKey,
    item_key: opts.itemKey,
    response: {
      assignment: {
        course_bound_id: opts.evaluationId ?? "eval-1",
        course_bound: { instrument_version_id: opts.instrumentVersionId },
      },
    },
  };
}

const ploA = { plo: { id: "go-a", code: "GO-1", description: "Effective communicator" } };
const ploB = { plo: { id: "go-b", code: "GO-2", description: "Critical thinker" } };

function ciloRow(opts: {
  ciloId?: string;
  ciloDescription?: string;
  courseCode?: string;
  ploMappings?: Array<typeof ploA>;
} = {}) {
  const { ciloId = "cilo-1", ciloDescription = "Achieve the outcome", courseCode = "EDUC 101" } = opts;
  return {
    id: ciloId,
    description: ciloDescription,
    course: { id: "course-1", code: courseCode, title: "Education 101" },
    cilo_mappings: opts.ploMappings ?? [ploA],
  };
}

function bindingRow(opts: {
  evaluationId?: string;
  deploymentName?: string;
  sectionKey?: string;
  itemKey?: string;
  cilo?: ReturnType<typeof ciloRow> | null;
} = {}) {
  return {
    section_key: opts.sectionKey ?? "cilo-items",
    item_key: opts.itemKey ?? "cilo-attainment-1",
    course_bound_evaluation_id: opts.evaluationId ?? "eval-1",
    course_bound_evaluation: { deployment_name: opts.deploymentName ?? "CILO Evaluation" },
    cilo: opts.cilo === undefined ? ciloRow() : opts.cilo,
  };
}

function mockScopeCounts(opts: { opportunities?: number; submitted?: number }) {
  prismaMock.evaluationAssignment.count.mockResolvedValue(opts.opportunities ?? 5);
  prismaMock.response.count.mockResolvedValue(opts.submitted ?? 3);
}

describe("getProgramHeadOutcomes", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    prismaMock.academicTermInstance.findMany.mockResolvedValue(termInstances);
    prismaMock.schoolYear.findUnique.mockResolvedValue(null);
    prismaMock.quantitativeResponseItem.findMany.mockResolvedValue([]);
    prismaMock.courseBoundCiloQuestionBinding.findMany.mockResolvedValue([]);
    prismaMock.instrumentVersion.findMany.mockResolvedValue([]);
    mockScopeCounts({ opportunities: 5, submitted: 3 });
    resolveProgramHeadContextMock.mockResolvedValue(bsedContext);
  });

  // ── Authorization ────────────────────────────────────────────────────────

  it("independently re-authorizes the selected Program before any outcome read", async () => {
    resolveProgramHeadContextMock.mockResolvedValue({
      success: false,
      error: "Selected Program is not assigned.",
    });

    const result = await getProgramHeadOutcomes("program-bsed", outcomesFilters);

    expect(result).toBeNull();
    expect(resolveProgramHeadContextMock).toHaveBeenCalledWith("program-bsed");
    expect(prismaMock.quantitativeResponseItem.findMany).not.toHaveBeenCalled();
    expect(prismaMock.evaluationAssignment.count).not.toHaveBeenCalled();
    expect(prismaMock.response.count).not.toHaveBeenCalled();
    expect(prismaMock.instrumentVersion.findMany).not.toHaveBeenCalled();
  });

  it("returns null for unauthorized program access", async () => {
    resolveProgramHeadContextMock.mockResolvedValue({
      success: false,
      error: "Selected Program is not assigned.",
    });

    const result = await getProgramHeadOutcomes("program-other", outcomesFilters);

    expect(result).toBeNull();
  });

  // ── Selected-Program isolation and course-bound-only evidence ────────────

  it("scopes every outcome read to the selected Program and course-bound evidence only", async () => {
    await getProgramHeadOutcomes("program-bsed", outcomesFilters);

    const ratingCall = prismaMock.quantitativeResponseItem.findMany.mock.calls[0][0];
    expect(ratingCall.where.response.status).toBe("SUBMITTED");
    expect(ratingCall.where.response.deployment_type).toBe("COURSE_BOUND");
    expect(ratingCall.where.response.assignment.course_bound.course_assignment.program_id).toBe(
      "program-bsed"
    );

    const opportunityCall = prismaMock.evaluationAssignment.count.mock.calls[0][0];
    expect(opportunityCall.where.course_bound.course_assignment.program_id).toBe("program-bsed");

    const submittedCall = prismaMock.response.count.mock.calls[0][0];
    expect(submittedCall.where.status).toBe("SUBMITTED");
    expect(submittedCall.where.deployment_type).toBe("COURSE_BOUND");
    expect(submittedCall.where.assignment.course_bound.course_assignment.program_id).toBe(
      "program-bsed"
    );
  });

  it("resolves publication-time bindings by evaluation and item keys with mapped CILOs only", async () => {
    prismaMock.quantitativeResponseItem.findMany.mockResolvedValue([
      prismaRatingRow({
        ratingValue: 4,
        responseId: "resp-1",
        sectionKey: "cilo-items",
        itemKey: "cilo-attainment-1",
        instrumentVersionId: "iv-cilo-v1",
      }),
    ]);

    await getProgramHeadOutcomes("program-bsed", outcomesFilters);

    expect(prismaMock.courseBoundCiloQuestionBinding.findMany).toHaveBeenCalledWith({
      where: { course_bound_evaluation_id: { in: ["eval-1"] }, cilo_id: { not: null } },
      select: expect.objectContaining({
        section_key: true,
        item_key: true,
        course_bound_evaluation_id: true,
      }),
    });
  });

  it("passes a validated term instance filter to every outcome read", async () => {
    const termId = "11111111-2222-3333-4444-555555555555";
    prismaMock.academicTermInstance.findMany.mockResolvedValue([
      { id: termId, semester: "FIRST", term: null, school_year: { id: "sy-1", code: "2025-2026" } },
    ]);

    await getProgramHeadOutcomes("program-bsed", { tab: "outcomes", termInstanceId: termId });

    const ratingCall = prismaMock.quantitativeResponseItem.findMany.mock.calls[0][0];
    expect(ratingCall.where.response.assignment.course_bound.term_instance_id).toEqual({
      in: [termId],
    });
    const opportunityCall = prismaMock.evaluationAssignment.count.mock.calls[0][0];
    expect(opportunityCall.where.course_bound.term_instance_id).toEqual({ in: [termId] });
  });

  // ── GO row semantics ─────────────────────────────────────────────────────

  it("builds a GO row with code, name, full-precision mean, and distinct counts", async () => {
    prismaMock.quantitativeResponseItem.findMany.mockResolvedValue([
      prismaRatingRow({
        ratingValue: 4,
        responseId: "resp-1",
        sectionKey: "cilo-items",
        itemKey: "cilo-attainment-1",
        instrumentVersionId: "iv-cilo-v1",
      }),
      prismaRatingRow({
        ratingValue: 5,
        responseId: "resp-1",
        sectionKey: "cilo-items",
        itemKey: "cilo-attainment-1",
        instrumentVersionId: "iv-cilo-v1",
      }),
      prismaRatingRow({
        ratingValue: 3,
        responseId: "resp-2",
        sectionKey: "cilo-items",
        itemKey: "cilo-attainment-1",
        instrumentVersionId: "iv-cilo-v1",
        evaluationId: "eval-2",
      }),
    ]);
    prismaMock.courseBoundCiloQuestionBinding.findMany.mockResolvedValue([
      bindingRow(),
      bindingRow({
        evaluationId: "eval-2",
        cilo: ciloRow({ ciloId: "cilo-2", ciloDescription: "Analyze evidence" }),
      }),
    ]);
    prismaMock.instrumentVersion.findMany.mockResolvedValue([instrumentVersions[0]]);

    const result = await getProgramHeadOutcomes("program-bsed", outcomesFilters);

    expect(result).not.toBeNull();
    expect(result!.emptyReason).toBeNull();
    expect(result!.outcomes).toHaveLength(1);
    const row = result!.outcomes[0];
    expect(row.code).toBe("GO-1");
    expect(row.name).toBe("Effective communicator");
    expect(row.meanRating).toBe(4); // (4 + 5 + 3) / 3, full precision
    expect(row.ratingCount).toBe(3);
    expect(row.submittedResponseCount).toBe(2); // resp-1, resp-2 distinct
    expect(row.contributingCilos.map((cilo) => cilo.description).sort()).toEqual([
      "Achieve the outcome",
      "Analyze evidence",
    ]);
    expect(row.contributingCourses).toEqual([
      { id: "course-1", code: "EDUC 101", title: "Education 101" },
    ]);
    expect(row.evidenceEvaluations).toEqual([
      { evaluationId: "eval-1", deploymentName: "CILO Evaluation" },
      { evaluationId: "eval-2", deploymentName: "CILO Evaluation" },
    ]);
    expect(row.spansMultipleScales).toBe(false);
  });

  it("ranks GO rows by mean rating descending", async () => {
    prismaMock.quantitativeResponseItem.findMany.mockResolvedValue([
      prismaRatingRow({
        ratingValue: 2,
        responseId: "resp-1",
        sectionKey: "cilo-items",
        itemKey: "cilo-attainment-1",
        instrumentVersionId: "iv-cilo-v1",
      }),
      prismaRatingRow({
        ratingValue: 5,
        responseId: "resp-2",
        sectionKey: "cilo-items",
        itemKey: "cilo-attainment-1",
        instrumentVersionId: "iv-cilo-v1",
        evaluationId: "eval-2",
      }),
    ]);
    prismaMock.courseBoundCiloQuestionBinding.findMany.mockResolvedValue([
      bindingRow({ cilo: ciloRow({ ciloId: "cilo-a", ploMappings: [ploA] }) }),
      bindingRow({
        evaluationId: "eval-2",
        cilo: ciloRow({ ciloId: "cilo-b", ploMappings: [ploB] }),
      }),
    ]);
    prismaMock.instrumentVersion.findMany.mockResolvedValue([instrumentVersions[0]]);

    const result = await getProgramHeadOutcomes("program-bsed", outcomesFilters);

    expect(result!.outcomes.map((row) => row.code)).toEqual(["GO-2", "GO-1"]);
  });

  // ── Many-to-many mapping multiplicity ────────────────────────────────────

  it("contributes one rating to each mapped GO row and discloses the rule", async () => {
    prismaMock.quantitativeResponseItem.findMany.mockResolvedValue([
      prismaRatingRow({
        ratingValue: 4,
        responseId: "resp-1",
        sectionKey: "cilo-items",
        itemKey: "cilo-attainment-1",
        instrumentVersionId: "iv-cilo-v1",
      }),
    ]);
    prismaMock.courseBoundCiloQuestionBinding.findMany.mockResolvedValue([
      bindingRow({ cilo: ciloRow({ ciloId: "cilo-multi", ploMappings: [ploA, ploB] }) }),
    ]);
    prismaMock.instrumentVersion.findMany.mockResolvedValue([instrumentVersions[0]]);

    const result = await getProgramHeadOutcomes("program-bsed", outcomesFilters);

    expect(result!.manyToManyDisclosure).toBe(true);
    expect(result!.outcomes).toHaveLength(2);
    const byCode = new Map(result!.outcomes.map((row) => [row.code, row]));
    expect(byCode.get("GO-1")!.meanRating).toBe(4);
    expect(byCode.get("GO-1")!.ratingCount).toBe(1);
    expect(byCode.get("GO-1")!.submittedResponseCount).toBe(1);
    expect(byCode.get("GO-2")!.meanRating).toBe(4);
    expect(byCode.get("GO-2")!.ratingCount).toBe(1);
  });

  it("leaves the many-to-many disclosure off when no CILO maps to multiple GOs", async () => {
    prismaMock.quantitativeResponseItem.findMany.mockResolvedValue([
      prismaRatingRow({
        ratingValue: 4,
        responseId: "resp-1",
        sectionKey: "cilo-items",
        itemKey: "cilo-attainment-1",
        instrumentVersionId: "iv-cilo-v1",
      }),
    ]);
    prismaMock.courseBoundCiloQuestionBinding.findMany.mockResolvedValue([
      bindingRow({ cilo: ciloRow({ ploMappings: [ploA] }) }),
    ]);
    prismaMock.instrumentVersion.findMany.mockResolvedValue([instrumentVersions[0]]);

    const result = await getProgramHeadOutcomes("program-bsed", outcomesFilters);

    expect(result!.manyToManyDisclosure).toBe(false);
    expect(result!.outcomes).toHaveLength(1);
  });

  // ── Central / unmapped exclusion ─────────────────────────────────────────

  it("never creates a GO row from an unbound or deleted-CILO rating", async () => {
    prismaMock.quantitativeResponseItem.findMany.mockResolvedValue([
      // Rating whose item has no published binding in this evaluation.
      prismaRatingRow({
        ratingValue: 4,
        responseId: "resp-1",
        sectionKey: "cilo-items",
        itemKey: "unbound-item",
        instrumentVersionId: "iv-cilo-v1",
      }),
      // Deleted CILO: binding exists but the CILO is gone — no mapping possible.
      prismaRatingRow({
        ratingValue: 5,
        responseId: "resp-2",
        sectionKey: "cilo-items",
        itemKey: "cilo-attainment-1",
        instrumentVersionId: "iv-cilo-v1",
      }),
    ]);
    prismaMock.courseBoundCiloQuestionBinding.findMany.mockResolvedValue([
      bindingRow({ itemKey: "cilo-attainment-1", cilo: null }),
    ]);
    mockScopeCounts({ opportunities: 5, submitted: 3 });

    const result = await getProgramHeadOutcomes("program-bsed", outcomesFilters);

    expect(result!.outcomes).toHaveLength(0);
    // Ratings exist but nothing maps: the view explains the absence explicitly.
    expect(result!.emptyReason).toBe("no-mapped-outcomes");
  });

  it("never creates a GO row when a bound CILO has no canonical mapping", async () => {
    prismaMock.quantitativeResponseItem.findMany.mockResolvedValue([
      prismaRatingRow({
        ratingValue: 5,
        responseId: "resp-2",
        sectionKey: "cilo-items",
        itemKey: "cilo-attainment-1",
        instrumentVersionId: "iv-cilo-v1",
      }),
    ]);
    prismaMock.courseBoundCiloQuestionBinding.findMany.mockResolvedValue([
      bindingRow({ cilo: ciloRow({ ciloId: "cilo-unmapped", ploMappings: [] }) }),
    ]);
    mockScopeCounts({ opportunities: 5, submitted: 3 });

    const result = await getProgramHeadOutcomes("program-bsed", outcomesFilters);

    expect(result!.outcomes).toHaveLength(0);
    expect(result!.emptyReason).toBe("no-mapped-outcomes");
  });

  // ── Invalid rating exclusion ─────────────────────────────────────────────

  it("excludes out-of-scale ratings from the valid aggregate and counts them diagnostically", async () => {
    prismaMock.quantitativeResponseItem.findMany.mockResolvedValue([
      prismaRatingRow({
        ratingValue: 4,
        responseId: "resp-1",
        sectionKey: "cilo-items",
        itemKey: "cilo-attainment-1",
        instrumentVersionId: "iv-cilo-v1",
      }),
      // 9 is not a value on the 1–5 scale in the frozen snapshot.
      prismaRatingRow({
        ratingValue: 9,
        responseId: "resp-2",
        sectionKey: "cilo-items",
        itemKey: "cilo-attainment-1",
        instrumentVersionId: "iv-cilo-v1",
      }),
    ]);
    prismaMock.courseBoundCiloQuestionBinding.findMany.mockResolvedValue([bindingRow()]);
    prismaMock.instrumentVersion.findMany.mockResolvedValue([instrumentVersions[0]]);

    const result = await getProgramHeadOutcomes("program-bsed", outcomesFilters);

    expect(result!.outcomes).toHaveLength(1);
    const row = result!.outcomes[0];
    expect(row.meanRating).toBe(4); // only the valid rating
    expect(row.ratingCount).toBe(1);
    expect(row.submittedResponseCount).toBe(1);
    expect(row.excludedRatingCount).toBe(1);
  });

  // ── Scale-aware distributions ────────────────────────────────────────────

  it("keeps incompatible scales separate and uses snapshot labels for categories", async () => {
    prismaMock.quantitativeResponseItem.findMany.mockResolvedValue([
      prismaRatingRow({
        ratingValue: 4,
        responseId: "resp-1",
        sectionKey: "cilo-items",
        itemKey: "cilo-attainment-1",
        instrumentVersionId: "iv-cilo-v1",
      }),
      prismaRatingRow({
        ratingValue: 3,
        responseId: "resp-2",
        sectionKey: "program-academic",
        itemKey: "q1",
        instrumentVersionId: "iv-exit-v1",
        evaluationId: "eval-2",
      }),
    ]);
    prismaMock.courseBoundCiloQuestionBinding.findMany.mockResolvedValue([
      bindingRow({ cilo: ciloRow({ ciloId: "cilo-a" }) }),
      bindingRow({
        evaluationId: "eval-2",
        sectionKey: "program-academic",
        itemKey: "q1",
        cilo: ciloRow({ ciloId: "cilo-b", courseCode: "EDUC 202" }),
      }),
    ]);
    prismaMock.instrumentVersion.findMany.mockResolvedValue(instrumentVersions);

    const result = await getProgramHeadOutcomes("program-bsed", outcomesFilters);

    expect(result!.outcomes).toHaveLength(1);
    const row = result!.outcomes[0];
    expect(row.meanRating).toBe(3.5); // (4 + 3) / 2
    expect(row.spansMultipleScales).toBe(true);
    expect(row.distributions).toHaveLength(2);
    const labels = row.distributions.map((distribution) => distribution.scaleLabel).sort();
    expect(labels).toEqual(["1–4 (4-point)", "1–5 (5-point)"]);

    const likert = row.distributions.find((distribution) => distribution.scaleLabel === "1–4 (4-point)");
    expect(likert).toBeDefined();
    const agree = likert!.categories.find((category) => category.value === 3);
    expect(agree).toEqual({ value: 3, label: "Agree", count: 1, percentage: 1 });
    const stronglyDisagree = likert!.categories.find((category) => category.value === 1);
    expect(stronglyDisagree).toEqual({ value: 1, label: "Strongly Disagree", count: 0, percentage: 0 });
    // All snapshot categories are exposed, including zero-count ones.
    expect(likert!.categories).toHaveLength(4);
  });

  it("does not fabricate a distribution when the item scale cannot be resolved", async () => {
    // The binding exists and maps to a GO, but the frozen snapshot does not
    // carry the item's scale, so the rating cannot be validated or binned.
    const emptyStructure = [
      {
        key: "cilo-items",
        title: "CILO",
        items: [],
      },
    ];
    prismaMock.quantitativeResponseItem.findMany.mockResolvedValue([
      prismaRatingRow({
        ratingValue: 4,
        responseId: "resp-1",
        sectionKey: "cilo-items",
        itemKey: "cilo-attainment-1",
        instrumentVersionId: "iv-empty",
      }),
    ]);
    prismaMock.courseBoundCiloQuestionBinding.findMany.mockResolvedValue([bindingRow()]);
    prismaMock.instrumentVersion.findMany.mockResolvedValue([
      { id: "iv-empty", structure_snapshot: emptyStructure },
    ]);

    const result = await getProgramHeadOutcomes("program-bsed", outcomesFilters);

    expect(result!.outcomes).toHaveLength(1);
    const row = result!.outcomes[0];
    expect(row.ratingCount).toBe(0);
    expect(row.meanRating).toBeNull();
    expect(row.distributions).toHaveLength(0);
    expect(row.excludedRatingCount).toBe(1);
  });

  // ── Current-mapping disclosure ───────────────────────────────────────────

  it("discloses current-mapping interpretation on the DTO", async () => {
    prismaMock.quantitativeResponseItem.findMany.mockResolvedValue([
      prismaRatingRow({
        ratingValue: 4,
        responseId: "resp-1",
        sectionKey: "cilo-items",
        itemKey: "cilo-attainment-1",
        instrumentVersionId: "iv-cilo-v1",
      }),
    ]);
    prismaMock.courseBoundCiloQuestionBinding.findMany.mockResolvedValue([bindingRow()]);
    prismaMock.instrumentVersion.findMany.mockResolvedValue([instrumentVersions[0]]);

    const result = await getProgramHeadOutcomes("program-bsed", outcomesFilters);

    expect(result!.currentMappingDisclosure).toMatch(/current CILO-to-PLO mappings/i);
    expect(result!.currentMappingDisclosure).toMatch(/publication-time/i);
  });

  it("resolves ratings written without a binding ID through publication-time item bindings", async () => {
    // The live student submission flow writes quantitative items with only
    // section/item keys (no cilo_question_binding_id); the Outcomes read must
    // still attach them to their published bindings via evaluation + keys.
    prismaMock.quantitativeResponseItem.findMany.mockResolvedValue([
      prismaRatingRow({
        ratingValue: 5,
        responseId: "resp-1",
        sectionKey: "cilo-items",
        itemKey: "cilo-attainment-1",
        instrumentVersionId: "iv-cilo-v1",
      }),
    ]);
    prismaMock.courseBoundCiloQuestionBinding.findMany.mockResolvedValue([bindingRow()]);
    prismaMock.instrumentVersion.findMany.mockResolvedValue([instrumentVersions[0]]);

    const result = await getProgramHeadOutcomes("program-bsed", outcomesFilters);

    expect(result!.outcomes).toHaveLength(1);
    expect(result!.outcomes[0].code).toBe("GO-1");
    expect(result!.outcomes[0].meanRating).toBe(5);
    expect(result!.outcomes[0].ratingCount).toBe(1);
    expect(result!.outcomes[0].submittedResponseCount).toBe(1);
  });

  // ── Empty reasons ────────────────────────────────────────────────────────

  it("reports no-assignments when no course-bound opportunities exist", async () => {
    mockScopeCounts({ opportunities: 0, submitted: 0 });

    const result = await getProgramHeadOutcomes("program-bsed", outcomesFilters);

    expect(result!.emptyReason).toBe("no-assignments");
    expect(result!.outcomes).toHaveLength(0);
  });

  it("reports no-submissions when opportunities exist but no submitted responses", async () => {
    mockScopeCounts({ opportunities: 5, submitted: 0 });

    const result = await getProgramHeadOutcomes("program-bsed", outcomesFilters);

    expect(result!.emptyReason).toBe("no-submissions");
  });

  // ── DTO serialization ────────────────────────────────────────────────────

  it("returns a closed DTO with only expected keys and no raw identifiers", async () => {
    prismaMock.quantitativeResponseItem.findMany.mockResolvedValue([
      prismaRatingRow({
        ratingValue: 4,
        responseId: "resp-1",
        sectionKey: "cilo-items",
        itemKey: "cilo-attainment-1",
        instrumentVersionId: "iv-cilo-v1",
      }),
    ]);
    prismaMock.courseBoundCiloQuestionBinding.findMany.mockResolvedValue([bindingRow()]);
    prismaMock.instrumentVersion.findMany.mockResolvedValue([instrumentVersions[0]]);

    const result = await getProgramHeadOutcomes("program-bsed", outcomesFilters);

    expect(result).not.toBeNull();
    expect(Object.keys(result!)).toEqual([
      "scope",
      "periodOptions",
      "emptyReason",
      "currentMappingDisclosure",
      "manyToManyDisclosure",
      "outcomes",
    ]);
    const serialized = JSON.stringify(result);
    expect(() => JSON.parse(serialized)).not.toThrow();
    expect(serialized).not.toContain("resp-1");
    expect(serialized).not.toContain("respondent_id");
    expect(serialized).not.toContain("assignment_id");
    expect(serialized).not.toContain("email");
    expect(serialized).not.toContain("text_content");
  });
});

// ── Pure aggregation helpers ───────────────────────────────────────────────

describe("resolveSnapshotItemScale", () => {
  it("resolves a numeric scale from the modern items format", () => {
    expect(resolveSnapshotItemScale(ciloStructure, "cilo-items", "cilo-attainment-1")).toEqual([
      { value: 1, label: null },
      { value: 2, label: null },
      { value: 3, label: null },
      { value: 4, label: null },
      { value: 5, label: null },
    ]);
  });

  it("resolves labeled descriptors from the questions format", () => {
    expect(resolveSnapshotItemScale(likertStructure, "program-academic", "q1")).toEqual([
      { value: 1, label: "Strongly Disagree" },
      { value: 2, label: "Disagree" },
      { value: 3, label: "Agree" },
      { value: 4, label: "Strongly Agree" },
    ]);
  });

  it("resolves a numeric scale from the legacy quantitative_items format", () => {
    const legacyStructure = [
      {
        key: "legacy-section",
        title: "Legacy",
        quantitative_items: [
          { key: "legacy-q1", prompt: "Q", scale: [1, 2, 3, 4, 5, 6] },
        ],
      },
    ];

    expect(resolveSnapshotItemScale(legacyStructure, "legacy-section", "legacy-q1")).toEqual([
      { value: 1, label: null },
      { value: 2, label: null },
      { value: 3, label: null },
      { value: 4, label: null },
      { value: 5, label: null },
      { value: 6, label: null },
    ]);
  });

  it("returns null for unknown sections, items, or non-array snapshots", () => {
    expect(resolveSnapshotItemScale(ciloStructure, "missing", "cilo-attainment-1")).toBeNull();
    expect(resolveSnapshotItemScale(ciloStructure, "cilo-items", "missing")).toBeNull();
    expect(resolveSnapshotItemScale({ not: "an array" }, "cilo-items", "cilo-attainment-1")).toBeNull();
  });
});

describe("aggregateOutcomeEvidence", () => {
  function evidenceRow(overrides: Partial<OutcomeEvidenceRow>): OutcomeEvidenceRow {
    return {
      ratingValue: 4,
      responseId: "resp-1",
      sectionKey: "cilo-items",
      itemKey: "cilo-attainment-1",
      instrumentVersion: { id: "iv-cilo-v1", structureSnapshot: ciloStructure },
      cilo: {
        id: "cilo-1",
        description: "Achieve the outcome",
        course: { id: "course-1", code: "EDUC 101", title: "Education 101" },
      },
      ploMappings: [{ ploId: "go-a", code: "GO-1", name: "Effective communicator" }],
      evaluationId: "eval-1",
      deploymentName: "CILO Evaluation",
      ...overrides,
    };
  }

  it("skips rows without a CILO or without any mapped GO", () => {
    const aggregation = aggregateOutcomeEvidence([
      evidenceRow({ cilo: null }),
      evidenceRow({ ploMappings: [] }),
    ]);

    expect(aggregation.outcomes.size).toBe(0);
    expect(aggregation.hasMultiMappedCilo).toBe(false);
  });

  it("flags many-to-many mapping when one CILO maps to multiple GOs", () => {
    const aggregation = aggregateOutcomeEvidence([
      evidenceRow({
        ploMappings: [
          { ploId: "go-a", code: "GO-1", name: "A" },
          { ploId: "go-b", code: "GO-2", name: "B" },
        ],
      }),
    ]);

    expect(aggregation.hasMultiMappedCilo).toBe(true);
    expect(aggregation.outcomes.size).toBe(2);
    for (const aggregate of aggregation.outcomes.values()) {
      expect(aggregate.ratingCount).toBe(1);
      expect(aggregate.ratingSum).toBe(4);
    }
  });
});
