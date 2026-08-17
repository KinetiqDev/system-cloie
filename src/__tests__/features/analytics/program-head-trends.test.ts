import { beforeEach, describe, expect, it, vi } from "vitest";
import { getProgramHeadTrends } from "@/features/analytics/services/get-program-head-analytics";
import {
  buildScaleIdentities,
  buildTrendSeries,
  describeScale,
  extractDistinctScales,
  fingerprintsEqual,
  type TrendComparabilityFingerprint,
  type TrendSeriesPeriodInput,
} from "@/features/analytics/services/program-head-analytics-aggregators";

const { resolveProgramHeadContextMock, prismaMock } = vi.hoisted(() => ({
  resolveProgramHeadContextMock: vi.fn(),
  prismaMock: {
    academicTermInstance: { findMany: vi.fn() },
    schoolYear: { findUnique: vi.fn() },
    quantitativeResponseItem: { findMany: vi.fn() },
    response: { findMany: vi.fn() },
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
    id: "term-2024-1st",
    semester: "FIRST",
    term: "FIRST_TERM",
    school_year: { id: "sy-2024", code: "2024-2025" },
  },
  {
    id: "term-2025-1st",
    semester: "FIRST",
    term: "FIRST_TERM",
    school_year: { id: "sy-2025", code: "2025-2026" },
  },
  {
    id: "term-2025-2nd",
    semester: "SECOND",
    term: null,
    school_year: { id: "sy-2025", code: "2025-2026" },
  },
];

const ciloStructureV1 = [
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

const ciloStructureV2 = [
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

const exitStructure = [
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
          { value: 3, label: "Neutral" },
          { value: 4, label: "Agree" },
          { value: 5, label: "Strongly Agree" },
        ],
      },
    ],
  },
];

const instrumentVersions = [
  { id: "iv-cilo-v1", version_number: 1, structure_snapshot: ciloStructureV1, template: { name: "CILO Evaluation" } },
  { id: "iv-cilo-v2", version_number: 2, structure_snapshot: ciloStructureV2, template: { name: "CILO Evaluation" } },
  { id: "iv-exit-v1", version_number: 1, structure_snapshot: exitStructure, template: { name: "Exit Survey" } },
  // Distinct versions whose display labels collide (same template name + version number).
  { id: "iv-collide-a", version_number: 1, structure_snapshot: ciloStructureV2, template: { name: "Course Evaluation" } },
  { id: "iv-collide-b", version_number: 1, structure_snapshot: ciloStructureV2, template: { name: "Course Evaluation" } },
];

function ratingRow(opts: {
  termInstanceId: string;
  instrumentVersionId: string;
  value: number;
  responseId: string;
  goCodes?: string[];
}) {
  const courseBound = {
    term_instance_id: opts.termInstanceId,
    instrument_version_id: opts.instrumentVersionId,
  };
  return {
    rating_value: opts.value,
    response_id: opts.responseId,
    cilo_question_binding: {
      cilo: {
        cilo_mappings: (opts.goCodes ?? []).map((code) => ({ go: { code } })),
      },
    },
    response: {
      assignment: {
        course_bound: courseBound,
        central_deployment: null,
      },
    },
  };
}

function responseRow(opts: { termInstanceId: string; id: string }) {
  return {
    id: opts.id,
    assignment: {
      course_bound: { term_instance_id: opts.termInstanceId },
      central_deployment: null,
    },
  };
}

const trendsFilters = { tab: "trends" as const };

describe("getProgramHeadTrends", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    prismaMock.academicTermInstance.findMany.mockResolvedValue(termInstances);
    prismaMock.schoolYear.findUnique.mockResolvedValue(null);
    prismaMock.quantitativeResponseItem.findMany.mockResolvedValue([]);
    prismaMock.response.findMany.mockResolvedValue([]);
    prismaMock.instrumentVersion.findMany.mockResolvedValue([]);
    resolveProgramHeadContextMock.mockResolvedValue(bsedContext);
  });

  // ── Authorization ────────────────────────────────────────────────────────

  it("independently re-authorizes the selected Program before any period read", async () => {
    resolveProgramHeadContextMock.mockResolvedValue({
      success: false,
      error: "Selected Program is not assigned.",
    });

    const result = await getProgramHeadTrends("program-bsed", trendsFilters);

    expect(result).toBeNull();
    expect(resolveProgramHeadContextMock).toHaveBeenCalledWith("program-bsed");
    expect(prismaMock.academicTermInstance.findMany).not.toHaveBeenCalled();
    expect(prismaMock.quantitativeResponseItem.findMany).not.toHaveBeenCalled();
    expect(prismaMock.response.findMany).not.toHaveBeenCalled();
    expect(prismaMock.instrumentVersion.findMany).not.toHaveBeenCalled();
  });

  // ── Selected-Program isolation ───────────────────────────────────────────

  it("scopes every period read to the selected Program only", async () => {
    await getProgramHeadTrends("program-bsed", trendsFilters);

    const ratingCall = prismaMock.quantitativeResponseItem.findMany.mock.calls[0][0];
    const ratingOr = ratingCall.where.response.OR;
    expect(ratingOr).toHaveLength(2);
    expect(ratingOr[0].assignment.central_deployment.program_id).toBe("program-bsed");
    expect(ratingOr[1].assignment.course_bound.course_assignment.program_id).toBe("program-bsed");

    const responseCall = prismaMock.response.findMany.mock.calls[0][0];
    const responseOr = responseCall.where.OR;
    expect(responseOr).toHaveLength(2);
    expect(responseOr[0].assignment.central_deployment.program_id).toBe("program-bsed");
    expect(responseOr[1].assignment.course_bound.course_assignment.program_id).toBe("program-bsed");
  });

  // ── Submitted-only semantics ─────────────────────────────────────────────

  it("includes only SUBMITTED responses in every period read", async () => {
    await getProgramHeadTrends("program-bsed", trendsFilters);

    const ratingCall = prismaMock.quantitativeResponseItem.findMany.mock.calls[0][0];
    expect(ratingCall.where.response.status).toBe("SUBMITTED");

    const responseCall = prismaMock.response.findMany.mock.calls[0][0];
    expect(responseCall.where.status).toBe("SUBMITTED");
  });

  // ── Canonical period resolution ──────────────────────────────────────────

  it("resolves periods through AcademicTermInstance context, not a parallel model", async () => {
    prismaMock.academicTermInstance.findMany.mockResolvedValue([
      { id: "term-2025-1st", semester: "FIRST", term: "FIRST_TERM", school_year: { id: "sy-2025", code: "2025-2026" } },
    ]);
    prismaMock.quantitativeResponseItem.findMany.mockResolvedValue([
      ratingRow({ termInstanceId: "term-2025-1st", instrumentVersionId: "iv-cilo-v2", value: 4, responseId: "resp-1", goCodes: ["GO-1"] }),
    ]);
    prismaMock.response.findMany.mockResolvedValue([
      responseRow({ termInstanceId: "term-2025-1st", id: "resp-1" }),
    ]);
    prismaMock.instrumentVersion.findMany.mockResolvedValue([instrumentVersions[1]]);

    const result = await getProgramHeadTrends("program-bsed", {
      tab: "trends",
      schoolYearId: "sy-2025",
    });

    // The term filter is derived from AcademicTermInstance rows...
    expect(prismaMock.academicTermInstance.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ school_year_id: "sy-2025" }) })
    );
    const ratingCall = prismaMock.quantitativeResponseItem.findMany.mock.calls[0][0];
    expect(ratingCall.where.response.OR[0].assignment.central_deployment).toMatchObject({
      term_instance_id: { in: ["term-2025-1st"] },
    });

    // ...and the period label is built from the canonical instance's school year,
    // semester, and term fields.
    expect(result).not.toBeNull();
    expect(result!.periods).toHaveLength(1);
    expect(result!.periods[0].periodLabel).toBe("2025-2026 · 1st Semester · 1st Term");
  });

  it("does not query any parallel period model", async () => {
    prismaMock.quantitativeResponseItem.findMany.mockResolvedValue([
      ratingRow({ termInstanceId: "term-2025-1st", instrumentVersionId: "iv-cilo-v2", value: 4, responseId: "resp-1" }),
    ]);
    prismaMock.response.findMany.mockResolvedValue([
      responseRow({ termInstanceId: "term-2025-1st", id: "resp-1" }),
    ]);
    prismaMock.instrumentVersion.findMany.mockResolvedValue([instrumentVersions[1]]);

    await getProgramHeadTrends("program-bsed", trendsFilters);

    const calledModels = Object.entries(prismaMock)
      .filter(([, model]) => Object.values(model as Record<string, unknown>).some((fn) => vi.isMockFunction(fn) && (fn as ReturnType<typeof vi.fn>).mock.calls.length > 0))
      .map(([name]) => name)
      .sort();

    expect(calledModels).toEqual(
      ["academicTermInstance", "instrumentVersion", "quantitativeResponseItem", "response"].sort()
    );
  });

  // ── Comparable period construction ───────────────────────────────────────

  it("builds comparable periods with full-precision means and distinct counts", async () => {
    prismaMock.quantitativeResponseItem.findMany.mockResolvedValue([
      ratingRow({ termInstanceId: "term-2025-1st", instrumentVersionId: "iv-cilo-v2", value: 4, responseId: "resp-1", goCodes: ["GO-1"] }),
      ratingRow({ termInstanceId: "term-2025-1st", instrumentVersionId: "iv-cilo-v2", value: 5, responseId: "resp-2", goCodes: ["GO-1"] }),
      ratingRow({ termInstanceId: "term-2025-2nd", instrumentVersionId: "iv-cilo-v2", value: 3, responseId: "resp-3", goCodes: ["GO-1"] }),
    ]);
    prismaMock.response.findMany.mockResolvedValue([
      responseRow({ termInstanceId: "term-2025-1st", id: "resp-1" }),
      responseRow({ termInstanceId: "term-2025-1st", id: "resp-2" }),
      responseRow({ termInstanceId: "term-2025-1st", id: "resp-4" }),
      responseRow({ termInstanceId: "term-2025-2nd", id: "resp-3" }),
    ]);
    prismaMock.instrumentVersion.findMany.mockResolvedValue([instrumentVersions[1]]);

    const result = await getProgramHeadTrends("program-bsed", trendsFilters);

    expect(result).not.toBeNull();
    expect(result!.periods).toHaveLength(2);

    const [first, second] = result!.periods;
    expect(first.periodLabel).toBe("2025-2026 · 1st Semester · 1st Term");
    expect(first.meanRating).toBe(4.5); // full precision, not rounded
    expect(first.submittedResponseCount).toBe(3); // resp-1, resp-2, resp-4
    expect(first.ratingCount).toBe(2); // only quant items
    expect(first.instrumentContext).toBe("CILO Evaluation v2");
    expect(first.scaleContext).toBe("1–5 (5-point)");
    expect(first.outcomeCodes).toEqual(["GO-1"]);
    expect(first.comparableWithPrevious).toBe(false); // first period

    expect(second.periodLabel).toBe("2025-2026 · 2nd Semester");
    expect(second.meanRating).toBe(3);
    expect(second.submittedResponseCount).toBe(1);
    expect(second.ratingCount).toBe(1);
    expect(second.comparableWithPrevious).toBe(true); // same instrument, scale, outcomes
    expect(result!.emptyReason).toBeNull();
  });

  it("orders periods chronologically by school year, semester, and term", async () => {
    prismaMock.quantitativeResponseItem.findMany.mockResolvedValue([
      ratingRow({ termInstanceId: "term-2025-2nd", instrumentVersionId: "iv-cilo-v2", value: 3, responseId: "resp-c" }),
      ratingRow({ termInstanceId: "term-2025-1st", instrumentVersionId: "iv-cilo-v2", value: 4, responseId: "resp-b" }),
      ratingRow({ termInstanceId: "term-2024-1st", instrumentVersionId: "iv-cilo-v2", value: 5, responseId: "resp-a" }),
    ]);
    prismaMock.response.findMany.mockResolvedValue([
      responseRow({ termInstanceId: "term-2025-2nd", id: "resp-c" }),
      responseRow({ termInstanceId: "term-2025-1st", id: "resp-b" }),
      responseRow({ termInstanceId: "term-2024-1st", id: "resp-a" }),
    ]);

    const result = await getProgramHeadTrends("program-bsed", trendsFilters);

    expect(result!.periods.map((period) => period.periodLabel)).toEqual([
      "2024-2025 · 1st Semester · 1st Term",
      "2025-2026 · 1st Semester · 1st Term",
      "2025-2026 · 2nd Semester",
    ]);
  });

  // ── Break detection ──────────────────────────────────────────────────────

  it("marks a changed instrument version as a comparability break", async () => {
    prismaMock.quantitativeResponseItem.findMany.mockResolvedValue([
      ratingRow({ termInstanceId: "term-2024-1st", instrumentVersionId: "iv-cilo-v1", value: 5, responseId: "resp-a", goCodes: ["GO-1"] }),
      ratingRow({ termInstanceId: "term-2025-1st", instrumentVersionId: "iv-cilo-v2", value: 4, responseId: "resp-b", goCodes: ["GO-1"] }),
    ]);
    prismaMock.response.findMany.mockResolvedValue([
      responseRow({ termInstanceId: "term-2024-1st", id: "resp-a" }),
      responseRow({ termInstanceId: "term-2025-1st", id: "resp-b" }),
    ]);
    prismaMock.instrumentVersion.findMany.mockResolvedValue([
      instrumentVersions[0],
      instrumentVersions[1],
    ]);

    const result = await getProgramHeadTrends("program-bsed", trendsFilters);

    expect(result!.periods[1].comparableWithPrevious).toBe(false);
    expect(result!.breaks).toHaveLength(1);
    expect(result!.breaks[0].fromPeriodLabel).toBe("2024-2025 · 1st Semester · 1st Term");
    expect(result!.breaks[0].toPeriodLabel).toBe("2025-2026 · 1st Semester · 1st Term");
    expect(result!.breaks[0].reason).toMatch(/instrument version/i);
  });

  it("marks a changed Likert scale identity as a comparability break", async () => {
    prismaMock.quantitativeResponseItem.findMany.mockResolvedValue([
      ratingRow({ termInstanceId: "term-2024-1st", instrumentVersionId: "iv-cilo-v2", value: 5, responseId: "resp-a", goCodes: ["GO-1"] }),
      ratingRow({ termInstanceId: "term-2025-1st", instrumentVersionId: "iv-exit-v1", value: 4, responseId: "resp-b", goCodes: ["GO-1"] }),
    ]);
    prismaMock.response.findMany.mockResolvedValue([
      responseRow({ termInstanceId: "term-2024-1st", id: "resp-a" }),
      responseRow({ termInstanceId: "term-2025-1st", id: "resp-b" }),
    ]);
    prismaMock.instrumentVersion.findMany.mockResolvedValue([
      instrumentVersions[1],
      instrumentVersions[2],
    ]);

    const result = await getProgramHeadTrends("program-bsed", trendsFilters);

    expect(result!.periods[1].comparableWithPrevious).toBe(false);
    expect(result!.breaks[0].reason).toMatch(/rating scale/i);
  });

  it("marks a changed outcome identity as a comparability break", async () => {
    prismaMock.quantitativeResponseItem.findMany.mockResolvedValue([
      ratingRow({ termInstanceId: "term-2024-1st", instrumentVersionId: "iv-cilo-v2", value: 5, responseId: "resp-a", goCodes: ["GO-1"] }),
      ratingRow({ termInstanceId: "term-2025-1st", instrumentVersionId: "iv-cilo-v2", value: 4, responseId: "resp-b", goCodes: ["GO-2"] }),
    ]);
    prismaMock.response.findMany.mockResolvedValue([
      responseRow({ termInstanceId: "term-2024-1st", id: "resp-a" }),
      responseRow({ termInstanceId: "term-2025-1st", id: "resp-b" }),
    ]);
    prismaMock.instrumentVersion.findMany.mockResolvedValue([instrumentVersions[1]]);

    const result = await getProgramHeadTrends("program-bsed", trendsFilters);

    expect(result!.periods[1].comparableWithPrevious).toBe(false);
    expect(result!.breaks[0].reason).toMatch(/outcomes/i);
  });

  it("breaks when distinct instrument versions share a display label", async () => {
    prismaMock.quantitativeResponseItem.findMany.mockResolvedValue([
      ratingRow({ termInstanceId: "term-2024-1st", instrumentVersionId: "iv-collide-a", value: 5, responseId: "resp-a", goCodes: ["GO-1"] }),
      ratingRow({ termInstanceId: "term-2025-1st", instrumentVersionId: "iv-collide-b", value: 4, responseId: "resp-b", goCodes: ["GO-1"] }),
    ]);
    prismaMock.response.findMany.mockResolvedValue([
      responseRow({ termInstanceId: "term-2024-1st", id: "resp-a" }),
      responseRow({ termInstanceId: "term-2025-1st", id: "resp-b" }),
    ]);
    prismaMock.instrumentVersion.findMany.mockResolvedValue([
      instrumentVersions[3],
      instrumentVersions[4],
    ]);

    const result = await getProgramHeadTrends("program-bsed", trendsFilters);

    // Same template name and version number, different version IDs: not comparable.
    expect(result!.periods[1].comparableWithPrevious).toBe(false);
    expect(result!.breaks).toHaveLength(1);
    expect(result!.breaks[0].reason).toMatch(/instrument version/i);
  });

  it("never silently merges unlike periods into one comparable run", async () => {
    prismaMock.quantitativeResponseItem.findMany.mockResolvedValue([
      ratingRow({ termInstanceId: "term-2024-1st", instrumentVersionId: "iv-cilo-v2", value: 5, responseId: "resp-a", goCodes: ["GO-1"] }),
      ratingRow({ termInstanceId: "term-2025-1st", instrumentVersionId: "iv-cilo-v2", value: 4, responseId: "resp-b", goCodes: ["GO-1"] }),
      ratingRow({ termInstanceId: "term-2025-2nd", instrumentVersionId: "iv-exit-v1", value: 3, responseId: "resp-c", goCodes: ["GO-1"] }),
    ]);
    prismaMock.response.findMany.mockResolvedValue([
      responseRow({ termInstanceId: "term-2024-1st", id: "resp-a" }),
      responseRow({ termInstanceId: "term-2025-1st", id: "resp-b" }),
      responseRow({ termInstanceId: "term-2025-2nd", id: "resp-c" }),
    ]);
    prismaMock.instrumentVersion.findMany.mockResolvedValue([
      instrumentVersions[1],
      instrumentVersions[2],
    ]);

    const result = await getProgramHeadTrends("program-bsed", trendsFilters);

    // flags: first=false, second=true (same run), third=false (new run)
    expect(result!.periods.map((period) => period.comparableWithPrevious)).toEqual([
      false,
      true,
      false,
    ]);
    // exactly one break: between the second and third period
    expect(result!.breaks).toHaveLength(1);
    expect(result!.breaks[0].toPeriodLabel).toBe("2025-2026 · 2nd Semester");
  });

  // ── No-history behavior ──────────────────────────────────────────────────

  it("reports no-evidence when no period has submitted evidence", async () => {
    const result = await getProgramHeadTrends("program-bsed", trendsFilters);

    expect(result!.periods).toEqual([]);
    expect(result!.emptyReason).toBe("no-evidence");
    expect(result!.breaks).toEqual([]);
  });

  it("reports no-comparable-history with a single evidence period", async () => {
    prismaMock.quantitativeResponseItem.findMany.mockResolvedValue([
      ratingRow({ termInstanceId: "term-2025-1st", instrumentVersionId: "iv-cilo-v2", value: 4, responseId: "resp-1" }),
    ]);
    prismaMock.response.findMany.mockResolvedValue([
      responseRow({ termInstanceId: "term-2025-1st", id: "resp-1" }),
    ]);

    const result = await getProgramHeadTrends("program-bsed", trendsFilters);

    expect(result!.periods).toHaveLength(1);
    expect(result!.emptyReason).toBe("no-comparable-history");
  });

  it("reports no-comparable-history when only unlike periods exist", async () => {
    prismaMock.quantitativeResponseItem.findMany.mockResolvedValue([
      ratingRow({ termInstanceId: "term-2024-1st", instrumentVersionId: "iv-cilo-v1", value: 5, responseId: "resp-a" }),
      ratingRow({ termInstanceId: "term-2025-1st", instrumentVersionId: "iv-cilo-v2", value: 4, responseId: "resp-b" }),
    ]);
    prismaMock.response.findMany.mockResolvedValue([
      responseRow({ termInstanceId: "term-2024-1st", id: "resp-a" }),
      responseRow({ termInstanceId: "term-2025-1st", id: "resp-b" }),
    ]);
    prismaMock.instrumentVersion.findMany.mockResolvedValue([
      instrumentVersions[0],
      instrumentVersions[1],
    ]);

    const result = await getProgramHeadTrends("program-bsed", trendsFilters);

    expect(result!.emptyReason).toBe("no-comparable-history");
  });

  it("exposes unrated periods without fabricating comparability breaks", async () => {
    prismaMock.quantitativeResponseItem.findMany.mockResolvedValue([
      ratingRow({ termInstanceId: "term-2024-1st", instrumentVersionId: "iv-cilo-v2", value: 5, responseId: "resp-a", goCodes: ["GO-1"] }),
    ]);
    prismaMock.response.findMany.mockResolvedValue([
      responseRow({ termInstanceId: "term-2024-1st", id: "resp-a" }),
      responseRow({ termInstanceId: "term-2025-1st", id: "resp-b" }),
    ]);
    prismaMock.instrumentVersion.findMany.mockResolvedValue([instrumentVersions[1]]);

    const result = await getProgramHeadTrends("program-bsed", trendsFilters);

    expect(result!.periods).toHaveLength(2);
    expect(result!.periods[0].meanRating).toBe(5);
    expect(result!.periods[1].meanRating).toBeNull();
    expect(result!.periods[1].comparableWithPrevious).toBe(false);
    expect(result!.breaks).toEqual([]);
    expect(result!.emptyReason).toBe("no-comparable-history");
  });

  // ── Historical evidence remains queryable ────────────────────────────────

  it("does not filter retired or inactive catalog records", async () => {
    prismaMock.quantitativeResponseItem.findMany.mockResolvedValue([
      ratingRow({ termInstanceId: "term-2025-1st", instrumentVersionId: "iv-cilo-v2", value: 4, responseId: "resp-1" }),
    ]);
    prismaMock.response.findMany.mockResolvedValue([
      responseRow({ termInstanceId: "term-2025-1st", id: "resp-1" }),
    ]);
    prismaMock.instrumentVersion.findMany.mockResolvedValue([
      { ...instrumentVersions[1], template: { name: "Retired Instrument" } },
    ]);

    const result = await getProgramHeadTrends("program-bsed", trendsFilters);

    const ratingCall = prismaMock.quantitativeResponseItem.findMany.mock.calls[0][0];
    expect(JSON.stringify(ratingCall.where)).not.toContain("is_active");
    expect(prismaMock.instrumentVersion.findMany).toHaveBeenCalledWith({
      where: { id: { in: ["iv-cilo-v2"] } },
      select: expect.objectContaining({
        id: true,
        version_number: true,
        structure_snapshot: true,
        template: { select: { name: true } },
      }),
    });
    expect(result!.periods[0].instrumentContext).toBe("Retired Instrument v2");
  });

  // ── DTO serialization ────────────────────────────────────────────────────

  it("returns a closed DTO with only expected keys", async () => {
    prismaMock.quantitativeResponseItem.findMany.mockResolvedValue([
      ratingRow({ termInstanceId: "term-2025-1st", instrumentVersionId: "iv-cilo-v2", value: 4, responseId: "resp-1", goCodes: ["GO-1"] }),
    ]);
    prismaMock.response.findMany.mockResolvedValue([
      responseRow({ termInstanceId: "term-2025-1st", id: "resp-1" }),
    ]);

    const result = await getProgramHeadTrends("program-bsed", trendsFilters);

    expect(Object.keys(result!)).toEqual(["scope", "periods", "breaks", "emptyReason", "periodOptions"]);
    expect(Object.keys(result!.scope)).toEqual(["programCode", "programName", "periodLabel"]);
    expect(Object.keys(result!.periods[0])).toEqual([
      "termInstanceId",
      "periodLabel",
      "meanRating",
      "submittedResponseCount",
      "ratingCount",
      "instrumentContext",
      "scaleContext",
      "outcomeCodes",
      "comparableWithPrevious",
    ]);
  });

  it("does not expose raw text, response IDs, respondent IDs, or emails", async () => {
    prismaMock.quantitativeResponseItem.findMany.mockResolvedValue([
      ratingRow({ termInstanceId: "term-2025-1st", instrumentVersionId: "iv-cilo-v2", value: 4, responseId: "resp-1" }),
    ]);
    prismaMock.response.findMany.mockResolvedValue([
      responseRow({ termInstanceId: "term-2025-1st", id: "resp-1" }),
    ]);

    const result = await getProgramHeadTrends("program-bsed", trendsFilters);
    const serialized = JSON.stringify(result);

    expect(() => JSON.parse(serialized)).not.toThrow();
    expect(serialized).not.toContain("text_content");
    expect(serialized).not.toContain("respondent_id");
    expect(serialized).not.toContain("email");
    expect(serialized).not.toContain("assignment_id");
  });
});

// ---------------------------------------------------------------------------
// Pure aggregator tests
// ---------------------------------------------------------------------------

describe("trend comparability aggregators", () => {
  describe("extractDistinctScales", () => {
    it("extracts scales from the modern items format", () => {
      const scales = extractDistinctScales([
        {
          key: "s1",
          title: "S",
          items: [
            { key: "a", kind: "quantitative", prompt: "A", scale: [1, 2, 3, 4, 5] },
            { key: "b", kind: "qualitative", prompt: "B" },
          ],
        },
      ]);

      expect(scales).toEqual([[{ value: 1, label: null }, { value: 2, label: null }, { value: 3, label: null }, { value: 4, label: null }, { value: 5, label: null }]]);
    });

    it("extracts likert descriptors from the questions format", () => {
      const scales = extractDistinctScales([
        {
          key: "s1",
          title: "S",
          questions: [
            { key: "a", type: "likert", prompt: "A", likertDescriptors: [{ value: 1, label: "Poor" }, { value: 2, label: "Fair" }] },
          ],
        },
      ]);

      expect(scales).toEqual([
        [
          { value: 1, label: "Poor" },
          { value: 2, label: "Fair" },
        ],
      ]);
    });

    it("dedupes identical scales across sections and returns [] for non-arrays", () => {
      const scales = extractDistinctScales([
        { key: "s1", title: "S", items: [{ key: "a", kind: "quantitative", prompt: "A", scale: [1, 2, 3] }] },
        { key: "s2", title: "T", items: [{ key: "b", kind: "quantitative", prompt: "B", scale: [1, 2, 3] }] },
      ]);

      expect(scales).toHaveLength(1);
      expect(extractDistinctScales(null)).toEqual([]);
      expect(extractDistinctScales("nope")).toEqual([]);
    });
  });

  describe("scale identity", () => {
    it("distinguishes scales that share values but differ in labels", () => {
      const achieved = [
        [{ value: 1, label: "Not Achieved" }, { value: 5, label: "Fully Achieved" }],
      ];
      const agreement = [
        [{ value: 1, label: "Strongly Disagree" }, { value: 5, label: "Strongly Agree" }],
      ];

      expect(buildScaleIdentities(achieved)).not.toEqual(buildScaleIdentities(agreement));
    });

    it("describes consecutive scales as min–max with point count", () => {
      expect(
        describeScale([
          { value: 1, label: null },
          { value: 2, label: null },
          { value: 3, label: null },
          { value: 4, label: null },
          { value: 5, label: null },
        ])
      ).toBe("1–5 (5-point)");
    });
  });

  describe("buildTrendSeries", () => {
    function input(overrides: Partial<TrendSeriesPeriodInput> & { termInstanceId: string }): TrendSeriesPeriodInput {
      return {
        periodLabel: "Period",
        sortKey: ["2025-2026", 0, 0],
        meanRating: 4,
        submittedResponseCount: 1,
        ratingCount: 1,
        instrumentContext: "CILO Evaluation v2",
        scaleContext: "1–5 (5-point)",
        outcomeCodes: [],
        fingerprint: { instrumentVersions: ["CILO Evaluation v2"], scaleIdentities: [], outcomeCodes: [] },
        ...overrides,
      };
    }

    const fpX: TrendComparabilityFingerprint = {
      instrumentVersions: ["CILO Evaluation v2"],
      scaleIdentities: ["s1"],
      outcomeCodes: ["GO-1"],
    };
    const fpY: TrendComparabilityFingerprint = {
      instrumentVersions: ["Exit Survey v1"],
      scaleIdentities: ["s2"],
      outcomeCodes: ["GO-1"],
    };

    it("sorts periods by school year code, semester, then term", () => {
      const { periods } = buildTrendSeries([
        input({ termInstanceId: "c", sortKey: ["2025-2026", 1, 0], periodLabel: "2025-2026 2nd" }),
        input({ termInstanceId: "b", sortKey: ["2025-2026", 0, 1], periodLabel: "2025-2026 1st T2" }),
        input({ termInstanceId: "a", sortKey: ["2024-2025", 0, 0], periodLabel: "2024-2025 1st" }),
      ]);

      expect(periods.map((period) => period.periodLabel)).toEqual([
        "2024-2025 1st",
        "2025-2026 1st T2",
        "2025-2026 2nd",
      ]);
    });

    it("marks consecutive identical fingerprints as comparable", () => {
      const { periods, breaks, emptyReason } = buildTrendSeries([
        input({ termInstanceId: "a", fingerprint: fpX, periodLabel: "A" }),
        input({ termInstanceId: "b", fingerprint: fpX, periodLabel: "B" }),
      ]);

      expect(periods.map((period) => period.comparableWithPrevious)).toEqual([false, true]);
      expect(breaks).toEqual([]);
      expect(emptyReason).toBeNull();
    });

    it("reports breaks and reasons when the fingerprint changes", () => {
      const { periods, breaks } = buildTrendSeries([
        input({ termInstanceId: "a", fingerprint: fpX, periodLabel: "A" }),
        input({ termInstanceId: "b", fingerprint: fpY, periodLabel: "B" }),
      ]);

      expect(periods[1].comparableWithPrevious).toBe(false);
      expect(breaks).toHaveLength(1);
      expect(breaks[0].reason).toContain("instrument version");
    });

    it("reports no-evidence for an empty input", () => {
      expect(buildTrendSeries([]).emptyReason).toBe("no-evidence");
    });

    it("reports no-comparable-history when no run reaches two periods", () => {
      const { emptyReason } = buildTrendSeries([
        input({ termInstanceId: "a", fingerprint: fpX, periodLabel: "A" }),
        input({ termInstanceId: "b", fingerprint: fpY, periodLabel: "B" }),
      ]);

      expect(emptyReason).toBe("no-comparable-history");
    });

    it("keeps a null-mean period from bridging a comparable run", () => {
      const { periods, breaks, emptyReason } = buildTrendSeries([
        input({ termInstanceId: "a", fingerprint: fpX, periodLabel: "A", meanRating: 4 }),
        input({ termInstanceId: "b", fingerprint: fpX, periodLabel: "B", meanRating: null }),
        input({ termInstanceId: "c", fingerprint: fpX, periodLabel: "C", meanRating: 4 }),
      ]);

      expect(periods[1].comparableWithPrevious).toBe(false); // unrated period never joins a run
      expect(periods[2].comparableWithPrevious).toBe(false); // cannot bridge through B
      expect(breaks).toEqual([]); // unrated transitions never fabricate break reasons
      expect(emptyReason).toBe("no-comparable-history");
    });

    it("does not fabricate break reasons for unrated transitions", () => {
      const { periods, breaks, emptyReason } = buildTrendSeries([
        input({ termInstanceId: "a", fingerprint: fpX, periodLabel: "A", meanRating: 4 }),
        input({ termInstanceId: "b", fingerprint: fpX, periodLabel: "B", meanRating: null }),
        input({ termInstanceId: "c", fingerprint: fpX, periodLabel: "C", meanRating: 4 }),
        input({ termInstanceId: "d", fingerprint: fpX, periodLabel: "D", meanRating: 4.2 }),
      ]);

      expect(breaks).toEqual([]);
      expect(periods[3].comparableWithPrevious).toBe(true); // C → D is a drawable comparable run
      expect(emptyReason).toBeNull();
    });
  });

  describe("fingerprintsEqual", () => {
    it("requires every dimension to match", () => {
      const base: TrendComparabilityFingerprint = {
        instrumentVersions: ["a"],
        scaleIdentities: ["s"],
        outcomeCodes: ["GO-1"],
      };

      expect(fingerprintsEqual(base, base)).toBe(true);
      expect(
        fingerprintsEqual(base, { ...base, instrumentVersions: ["b"] })
      ).toBe(false);
      expect(fingerprintsEqual(base, { ...base, scaleIdentities: [] })).toBe(false);
      expect(fingerprintsEqual(base, { ...base, outcomeCodes: [] })).toBe(false);
    });
  });
});
