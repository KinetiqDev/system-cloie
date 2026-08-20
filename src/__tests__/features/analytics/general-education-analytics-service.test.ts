import { beforeEach, describe, expect, it, vi } from "vitest";
import { getGeneralEducationAnalytics } from "@/features/analytics/services/general-education-analytics";

const { resolveAuthSessionMock, prismaMock } = vi.hoisted(() => ({
  resolveAuthSessionMock: vi.fn(),
  prismaMock: {
    academicTermInstance: { findMany: vi.fn() },
    schoolYear: { findUnique: vi.fn() },
    response: { count: vi.fn(), findMany: vi.fn() },
    evaluationAssignment: { count: vi.fn() },
    quantitativeResponseItem: { aggregate: vi.fn(), findMany: vi.fn() },
    qualitativeResponseItem: { findMany: vi.fn() },
    instrumentVersion: { findMany: vi.fn() },
  },
}));

vi.mock("@/features/auth/services/resolve-auth-session", () => ({
  resolveAuthSession: resolveAuthSessionMock,
}));
vi.mock("@/lib/db/prisma", () => ({ prisma: prismaMock }));

function mockBase() {
  prismaMock.academicTermInstance.findMany.mockResolvedValue([]);
  prismaMock.response.count.mockResolvedValue(0);
  prismaMock.evaluationAssignment.count.mockResolvedValue(0);
  prismaMock.quantitativeResponseItem.aggregate.mockResolvedValue({ _sum: { rating_value: null }, _count: { rating_value: 0 } });
  prismaMock.quantitativeResponseItem.findMany.mockResolvedValue([]);
  prismaMock.response.findMany.mockResolvedValue([]);
  prismaMock.qualitativeResponseItem.findMany.mockResolvedValue([]);
  prismaMock.instrumentVersion.findMany.mockResolvedValue([]);
}

describe("getGeneralEducationAnalytics", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockBase();
    resolveAuthSessionMock.mockResolvedValue({ userId: "coord-1", activeRole: "GEN_ED_COORDINATOR", roles: ["GEN_ED_COORDINATOR"] });
  });

  it("denies non-coordinator role", async () => {
    resolveAuthSessionMock.mockResolvedValue({ userId: "u", activeRole: "PROGRAM_HEAD", roles: ["PROGRAM_HEAD"] });
    const r = await getGeneralEducationAnalytics({});
    expect(r).toBeNull();
    expect(prismaMock.response.count).not.toHaveBeenCalled();
  });

  it("scopes to Course-bound GE only and submitted only", async () => {
    await getGeneralEducationAnalytics({});
    const where = prismaMock.response.count.mock.calls[0][0].where;
    expect(where.status).toBe("SUBMITTED");
    expect(where.deployment_type).toBe("COURSE_BOUND");
    expect(where.assignment.course_bound.course_assignment.course.course_scope).toBe("GENERAL_EDUCATION");
    expect(prismaMock.evaluationAssignment.count.mock.calls[0][0].where.course_bound.course_assignment.course.course_scope).toBe("GENERAL_EDUCATION");
    // No central deployments anywhere
    expect(JSON.stringify(where)).not.toContain("CENTRAL");
  });

  it("reports unavailable response rate when zero opportunities", async () => {
    prismaMock.response.count.mockResolvedValue(0);
    prismaMock.evaluationAssignment.count.mockResolvedValue(0);
    const r = await getGeneralEducationAnalytics({});
    expect(r!.kpi.responseRate).toBeNull();
    expect(r!.emptyReason).toBe("no-assignments");
  });

  it("keeps ratingCount distinct from responseCount and full precision", async () => {
    prismaMock.response.count.mockResolvedValue(2);
    prismaMock.evaluationAssignment.count.mockResolvedValue(10);
    prismaMock.quantitativeResponseItem.aggregate.mockResolvedValue({ _sum: { rating_value: 7 }, _count: { rating_value: 2 } });
    // rating rows with course info so breakdowns compute
    prismaMock.quantitativeResponseItem.findMany.mockResolvedValue([
      { rating_value: 3, response_id: "r1", section_key: "s", item_key: "i1", cilo_question_binding: null, response: { assignment: { course_bound: { term_instance_id: "t1", instrument_version_id: "iv1", course_assignment: { course: { id: "c1", code: "GE 101", title: "GE" } }, instrument: { id: "iv1", version_number: 1, template: { name: "T" }, structure_snapshot: [] } } } } },
      { rating_value: 4, response_id: "r2", section_key: "s", item_key: "i1", cilo_question_binding: null, response: { assignment: { course_bound: { term_instance_id: "t1", instrument_version_id: "iv1", course_assignment: { course: { id: "c1", code: "GE 101", title: "GE" } }, instrument: { id: "iv1", version_number: 1, template: { name: "T" }, structure_snapshot: [] } } } } },
    ] as unknown as Awaited<ReturnType<typeof prismaMock.quantitativeResponseItem.findMany>>);
    prismaMock.response.findMany.mockResolvedValue([
      { id: "r1", assignment: { course_bound: { term_instance_id: "t1", course_assignment: { course: { id: "c1", code: "GE 101", title: "GE" } }, instrument: { id: "iv1", version_number: 1, template: { name: "T" }, structure_snapshot: [] } } } },
      { id: "r2", assignment: { course_bound: { term_instance_id: "t1", course_assignment: { course: { id: "c1", code: "GE 101", title: "GE" } }, instrument: { id: "iv1", version_number: 1, template: { name: "T" }, structure_snapshot: [] } } } },
    ] as unknown as Awaited<ReturnType<typeof prismaMock.response.findMany>>);
    const r = await getGeneralEducationAnalytics({});
    expect(r!.kpi.ratingCount).toBe(2);
    expect(r!.kpi.submittedResponseCount).toBe(2);
    expect(r!.kpi.meanRating).toBe(3.5);
    expect(r!.kpi.responseRate).toBe(0.2);
  });

  it("excludes raw privacy fields from DTO (no text, ids leaked beyond aggregates)", async () => {
    prismaMock.qualitativeResponseItem.findMany.mockResolvedValue([
      { text_content: "great course", section_key: "s", prompt_key: "p", response: { id: "r1", assignment: { course_bound: { id: "e1", deployment_name: "Eval 1", instrument: { id: "iv1", structure_snapshot: [{ key: "s", title: "S", items: [{ key: "p", kind: "qualitative", prompt: "Prompt" }] }] } } } } },
    ] as unknown as Awaited<ReturnType<typeof prismaMock.qualitativeResponseItem.findMany>>);
    prismaMock.response.count.mockResolvedValue(1);
    prismaMock.evaluationAssignment.count.mockResolvedValue(1);
    const r = await getGeneralEducationAnalytics({});
    const serialized = JSON.stringify(r);
    expect(serialized).not.toContain("great course");
    expect(r!.feedback.tokens.every((t) => /^[a-z][a-z-]*$/.test(t.text))).toBe(true);
  });

  it("handles zero opportunities without crashing", async () => {
    const r = await getGeneralEducationAnalytics({ schoolYearId: "00000000-0000-0000-0000-000000000001" });
    // impossible term filter handled via resolveTermInstanceFilter
    expect(r).not.toBeNull();
  });
});
