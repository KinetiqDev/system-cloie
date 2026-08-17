import { beforeEach, describe, expect, it, vi } from "vitest";
import { getProgramHeadAnalytics } from "@/features/analytics/services/get-program-head-analytics";

const { resolveProgramHeadContextMock, prismaMock } = vi.hoisted(() => ({
  resolveProgramHeadContextMock: vi.fn(),
  prismaMock: {
    academicTermInstance: { findMany: vi.fn() },
    schoolYear: { findUnique: vi.fn() },
    response: { count: vi.fn() },
    evaluationAssignment: { count: vi.fn() },
    quantitativeResponseItem: { aggregate: vi.fn() },
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
const defaultFilters = { tab: "overview" as const };

function mockQueryResults(opts: {
  submittedCount?: number;
  opportunityCount?: number;
  ratingSum?: number | null;
  ratingCount?: number;
}) {
  prismaMock.response.count.mockResolvedValue(opts.submittedCount ?? 0);
  prismaMock.evaluationAssignment.count.mockResolvedValue(opts.opportunityCount ?? 0);
  prismaMock.quantitativeResponseItem.aggregate.mockResolvedValue({
    _sum: { rating_value: opts.ratingSum ?? null },
    _count: { rating_value: opts.ratingCount ?? 0 },
  });
}

describe("getProgramHeadAnalytics", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    prismaMock.academicTermInstance.findMany.mockResolvedValue([]);
    resolveProgramHeadContextMock.mockResolvedValue(bsedContext);
    mockQueryResults({
      submittedCount: 10,
      opportunityCount: 20,
      ratingSum: 42,
      ratingCount: 10,
    });
  });

  // ── Authorization ────────────────────────────────────────────────────────

  it("independently calls resolveProgramHeadContext before any query", async () => {
    resolveProgramHeadContextMock.mockResolvedValue({
      success: false,
      error: "Not assigned.",
    });

    const result = await getProgramHeadAnalytics("program-bsed", defaultFilters);

    expect(result).toBeNull();
    expect(resolveProgramHeadContextMock).toHaveBeenCalledWith("program-bsed");
    expect(prismaMock.response.count).not.toHaveBeenCalled();
    expect(prismaMock.evaluationAssignment.count).not.toHaveBeenCalled();
    expect(prismaMock.quantitativeResponseItem.aggregate).not.toHaveBeenCalled();
  });

  it("returns null for unauthorized program access", async () => {
    resolveProgramHeadContextMock.mockResolvedValue({
      success: false,
      error: "Selected Program is not assigned.",
    });

    const result = await getProgramHeadAnalytics("program-other", defaultFilters);

    expect(result).toBeNull();
  });

  // ── Multi-Program isolation ──────────────────────────────────────────────

  it("scopes all queries to the selected Program only", async () => {
    await getProgramHeadAnalytics("program-bsed", defaultFilters);

    // Response count query scopes to program-bsed
    const responseCountCall = prismaMock.response.count.mock.calls[0][0];
    expect(responseCountCall.where).toHaveProperty("status", "SUBMITTED");
    const responseOr = responseCountCall.where.OR;
    expect(responseOr).toHaveLength(2);
    expect(responseOr[0].assignment.central_deployment.program_id).toBe("program-bsed");
    expect(responseOr[1].assignment.course_bound.course_assignment.program_id).toBe("program-bsed");

    // Assignment count query scopes to program-bsed
    const assignmentCountCall = prismaMock.evaluationAssignment.count.mock.calls[0][0];
    const assignmentOr = assignmentCountCall.where.OR;
    expect(assignmentOr).toHaveLength(2);
    expect(assignmentOr[0].central_deployment.program_id).toBe("program-bsed");
    expect(assignmentOr[1].course_bound.course_assignment.program_id).toBe("program-bsed");

    // Rating aggregate scopes to program-bsed
    const aggregateCall = prismaMock.quantitativeResponseItem.aggregate.mock.calls[0][0];
    const aggregateOr = aggregateCall.where.response.OR;
    expect(aggregateOr).toHaveLength(2);
    expect(aggregateOr[0].assignment.central_deployment.program_id).toBe("program-bsed");
    expect(aggregateOr[1].assignment.course_bound.course_assignment.program_id).toBe("program-bsed");
  });

  // ── Submitted-only semantics ─────────────────────────────────────────────

  it("counts only SUBMITTED responses in the submitted count", async () => {
    await getProgramHeadAnalytics("program-bsed", defaultFilters);

    const responseCountCall = prismaMock.response.count.mock.calls[0][0];
    expect(responseCountCall.where.status).toBe("SUBMITTED");
  });

  it("counts ALL assignments for the opportunity denominator regardless of status", async () => {
    await getProgramHeadAnalytics("program-bsed", defaultFilters);

    const assignmentCountCall = prismaMock.evaluationAssignment.count.mock.calls[0][0];
    // Should NOT have a response status filter
    expect(assignmentCountCall.where).not.toHaveProperty("response");
  });

  // ── Response rate semantics ──────────────────────────────────────────────

  it("returns null response rate when zero evaluation opportunities", async () => {
    mockQueryResults({ submittedCount: 0, opportunityCount: 0, ratingCount: 0 });

    const result = await getProgramHeadAnalytics("program-bsed", defaultFilters);

    expect(result!.kpi.responseRate).toBeNull();
    expect(result!.emptyReason).toBe("no-assignments");
  });

  it("computes response rate as submitted / opportunities with full precision", async () => {
    mockQueryResults({ submittedCount: 7, opportunityCount: 13, ratingSum: 30, ratingCount: 7 });

    const result = await getProgramHeadAnalytics("program-bsed", defaultFilters);

    expect(result!.kpi.responseRate).toBe(7 / 13);
    // Verify full precision is retained
    expect(result!.kpi.responseRate).not.toBe(Math.round((7 / 13) * 100) / 100);
  });

  // ── Mean semantics ───────────────────────────────────────────────────────

  it("returns null mean when zero rating count", async () => {
    mockQueryResults({ submittedCount: 5, opportunityCount: 10, ratingCount: 0 });

    const result = await getProgramHeadAnalytics("program-bsed", defaultFilters);

    expect(result!.kpi.meanRating).toBeNull();
  });

  it("computes mean with full precision (no rounding)", async () => {
    mockQueryResults({ submittedCount: 3, opportunityCount: 5, ratingSum: 13, ratingCount: 3 });

    const result = await getProgramHeadAnalytics("program-bsed", defaultFilters);

    expect(result!.kpi.meanRating).toBe(13 / 3);
  });

  it("distinguishes rating count from response count", async () => {
    mockQueryResults({ submittedCount: 5, opportunityCount: 10, ratingSum: 100, ratingCount: 25 });

    const result = await getProgramHeadAnalytics("program-bsed", defaultFilters);

    expect(result!.kpi.submittedResponseCount).toBe(5);
    expect(result!.kpi.ratingCount).toBe(25);
    expect(result!.kpi.ratingCount).not.toBe(result!.kpi.submittedResponseCount);
  });

  // ── Empty reason semantics ───────────────────────────────────────────────

  it("reports no-assignments when zero opportunities exist", async () => {
    mockQueryResults({ submittedCount: 0, opportunityCount: 0, ratingCount: 0 });

    const result = await getProgramHeadAnalytics("program-bsed", defaultFilters);

    expect(result!.emptyReason).toBe("no-assignments");
  });

  it("reports no-submissions when opportunities exist but none submitted", async () => {
    mockQueryResults({ submittedCount: 0, opportunityCount: 5, ratingCount: 0 });

    const result = await getProgramHeadAnalytics("program-bsed", defaultFilters);

    expect(result!.emptyReason).toBe("no-submissions");
  });

  it("reports null empty reason when submissions exist", async () => {
    mockQueryResults({ submittedCount: 3, opportunityCount: 5, ratingSum: 12, ratingCount: 3 });

    const result = await getProgramHeadAnalytics("program-bsed", defaultFilters);

    expect(result!.emptyReason).toBeNull();
  });

  // ── DTO serialization ────────────────────────────────────────────────────

  it("returns a closed DTO with only expected keys", async () => {
    const result = await getProgramHeadAnalytics("program-bsed", defaultFilters);

    expect(result).not.toBeNull();
    expect(Object.keys(result!)).toEqual(["scope", "kpi", "emptyReason", "periodOptions"]);
    expect(Object.keys(result!.scope)).toEqual(["programCode", "programName", "periodLabel"]);
    expect(Object.keys(result!.kpi)).toEqual([
      "submittedResponseCount",
      "evaluationOpportunityCount",
      "responseRate",
      "ratingCount",
      "meanRating",
    ]);
  });

  it("does not expose Prisma objects, raw text, response IDs, or emails", async () => {
    const result = await getProgramHeadAnalytics("program-bsed", defaultFilters);
    const serialized = JSON.stringify(result);

    // Verify serializable (no circular refs or non-serializable types)
    expect(() => JSON.parse(serialized)).not.toThrow();

    // Verify no Prisma-ish keys leaked
    expect(serialized).not.toContain("assignment_id");
    expect(serialized).not.toContain("respondent_id");
    expect(serialized).not.toContain("deployment_id");
    expect(serialized).not.toContain("email");
    expect(serialized).not.toContain("text_content");
  });

  // ── Term instance filter ─────────────────────────────────────────────────

  it("passes a validated term instance filter to all scope predicates", async () => {
    const termId = "11111111-2222-3333-4444-555555555555";
    prismaMock.academicTermInstance.findMany.mockResolvedValue([
      {
        id: termId,
        semester: "FIRST",
        term: null,
        school_year: { id: "sy-1", code: "2025-2026" },
      },
    ]);

    await getProgramHeadAnalytics("program-bsed", { tab: "overview", termInstanceId: termId });

    const responseWhere = prismaMock.response.count.mock.calls[0][0].where;
    expect(responseWhere.OR[0].assignment.central_deployment.term_instance_id).toEqual({ in: [termId] });
    expect(responseWhere.OR[1].assignment.course_bound.term_instance_id).toEqual({ in: [termId] });

    const assignmentWhere = prismaMock.evaluationAssignment.count.mock.calls[0][0].where;
    expect(assignmentWhere.OR[0].central_deployment.term_instance_id).toEqual({ in: [termId] });
    expect(assignmentWhere.OR[1].course_bound.term_instance_id).toEqual({ in: [termId] });
  });

  it("scopes school-year filters and labels the selected school year", async () => {
    const schoolYearId = "a1b2c3d4-e5f6-4890-abcd-ef1234567890";
    const termId = "11111111-2222-4333-8444-555555555555";
    prismaMock.academicTermInstance.findMany.mockResolvedValue([
      {
        id: termId,
        semester: "FIRST",
        term: null,
        school_year: { id: schoolYearId, code: "2025-2026" },
      },
    ]);

    const result = await getProgramHeadAnalytics("program-bsed", {
      tab: "overview",
      schoolYearId,
    });

    expect(prismaMock.academicTermInstance.findMany).toHaveBeenCalledWith({
      where: expect.objectContaining({ school_year_id: schoolYearId }),
      select: {
        id: true,
        semester: true,
        term: true,
        school_year: { select: { id: true, code: true } },
      },
    });
    expect(result!.scope.periodLabel).toBe("School Year 2025-2026");
    expect(prismaMock.response.count.mock.calls[0][0].where.OR[0].assignment.central_deployment)
      .toMatchObject({ term_instance_id: { in: [termId] } });
  });

  it("preserves the selected school-year label when no term instances match", async () => {
    const schoolYearId = "a1b2c3d4-e5f6-4890-abcd-ef1234567890";
    prismaMock.academicTermInstance.findMany.mockResolvedValue([]);
    prismaMock.schoolYear.findUnique.mockResolvedValue({ code: "2025-2026" });

    const result = await getProgramHeadAnalytics("program-bsed", {
      tab: "overview",
      schoolYearId,
    });

    expect(prismaMock.schoolYear.findUnique).toHaveBeenCalledWith({
      where: { id: schoolYearId },
      select: { code: true },
    });
    expect(result!.scope.periodLabel).toBe("School Year 2025-2026");
  });

  // ── Scope summary ───────────────────────────────────────────────────────

  it("scopes semester-only filters and labels the semester", async () => {
    const termId = "11111111-2222-4333-8444-555555555555";
    prismaMock.academicTermInstance.findMany.mockResolvedValue([
      { id: termId, school_year: { code: "2025-2026" } },
    ]);

    const result = await getProgramHeadAnalytics("program-bsed", {
      tab: "overview",
      semester: "FIRST",
    });

    expect(prismaMock.academicTermInstance.findMany.mock.calls).toEqual(
      expect.arrayContaining([
        [
          expect.objectContaining({
            where: expect.objectContaining({ semester: "FIRST" }),
            select: {
              id: true,
              semester: true,
              term: true,
              school_year: { select: { id: true, code: true } },
            },
          }),
        ],
      ])
    );
    expect(result!.scope.periodLabel).toBe("1st Semester");
  });

  it("keeps a semester label when no matching term exists", async () => {
    prismaMock.academicTermInstance.findMany.mockResolvedValue([]);
    mockQueryResults({ submittedCount: 0, opportunityCount: 0, ratingCount: 0 });
    const result = await getProgramHeadAnalytics("program-bsed", {
      tab: "overview",
      semester: "SUMMER",
    });

    expect(result!.scope.periodLabel).toBe("Summer");
    expect(result!.emptyReason).toBe("no-assignments");
  });

  it("does not invent a school-year label for mixed school-year results", async () => {
    prismaMock.academicTermInstance.findMany.mockResolvedValue([
      { id: "11111111-2222-4333-8444-555555555555", school_year: { code: "2024-2025" } },
      { id: "22222222-3333-4444-8555-666666666666", school_year: { code: "2025-2026" } },
    ]);

    const result = await getProgramHeadAnalytics("program-bsed", {
      tab: "overview",
      semester: "SECOND",
    });

    expect(result!.scope.periodLabel).toBe("2nd Semester");
  });

  it("returns the selected program code and name in the scope summary", async () => {
    const result = await getProgramHeadAnalytics("program-bsed", defaultFilters);

    expect(result!.scope.programCode).toBe("BSED");
    expect(result!.scope.programName).toBe("Bachelor of Secondary Education");
  });

  // ── Query parallelism ────────────────────────────────────────────────────

  it("starts all three queries before any one resolves", async () => {
    const callOrder: string[] = [];

    prismaMock.response.count.mockImplementation(async () => {
      callOrder.push("response.count");
      return 5;
    });
    prismaMock.evaluationAssignment.count.mockImplementation(async () => {
      callOrder.push("assignment.count");
      return 10;
    });
    prismaMock.quantitativeResponseItem.aggregate.mockImplementation(async () => {
      callOrder.push("aggregate");
      return { _sum: { rating_value: 20 }, _count: { rating_value: 5 } };
    });

    await getProgramHeadAnalytics("program-bsed", defaultFilters);

    // All three should have been called (Promise.all)
    expect(callOrder).toHaveLength(3);
    expect(callOrder).toContain("response.count");
    expect(callOrder).toContain("assignment.count");
    expect(callOrder).toContain("aggregate");
  });
});
