import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getDeanCollegeAnalytics,
  summarizeDeanParticipation,
  type DeanDeploymentEvidence,
} from "@/features/analytics/services/dean-analytics";
import {
  deanAnalyticsUrl,
  parseDeanAnalyticsFilters,
} from "@/features/analytics/services/dean-analytics-state";
const { auth, db } = vi.hoisted(() => ({
  auth: vi.fn(),
  db: {
    courseAssignment: { groupBy: vi.fn() },
    program: { findMany: vi.fn() },
    academicTermInstance: { findMany: vi.fn() },
    courseBoundEvaluation: { findMany: vi.fn() },
    centralDeployment: { findMany: vi.fn() },
    evaluationAssignment: { groupBy: vi.fn() },
    response: { groupBy: vi.fn() },
  },
}));
vi.mock("@/features/auth/services/resolve-auth-session", () => ({ resolveAuthSession: auth }));
vi.mock("@/lib/db/prisma", () => ({ prisma: db }));
const row = (overrides: Partial<DeanDeploymentEvidence> = {}): DeanDeploymentEvidence => ({
  id: "eval",
  name: "Cycle",
  programId: "p",
  courseId: "c",
  courseLabel: "Course",
  source: "COURSE",
  status: "CLOSED",
  periodId: "term",
  periodLabel: "Term",
  instrument: "Course v1",
  opportunities: 10,
  submitted: 3,
  ...overrides,
});
describe("Dean college analytics", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    Object.values(db).forEach((model) =>
      Object.values(model).forEach((fn) => fn.mockResolvedValue([]))
    );
  });
  it.each([
    null,
    "PROGRAM_HEAD",
    "FACULTY",
    "GEN_ED_COORDINATOR",
    "SECRETARY",
    "STUDENT",
    "ALUMNI",
    "INDUSTRY_PARTNER",
  ])("denies active role %s before reads", async (role) => {
    auth.mockResolvedValue(role ? { activeRole: role } : null);
    expect(await getDeanCollegeAnalytics({ view: "college" })).toBeNull();
    for (const model of Object.values(db))
      for (const fn of Object.values(model)) expect(fn).not.toHaveBeenCalled();
  });
  it("uses historical opportunities, not current eligibility, and zero is unavailable", () => {
    expect(summarizeDeanParticipation([]).rate).toBeNull();
    expect(
      summarizeDeanParticipation([
        row(),
        row({ opportunities: 20, submitted: 12, status: "ACTIVE" }),
      ])
    ).toEqual({
      opportunities: 30,
      submitted: 15,
      rate: 50,
      deployments: 2,
      active: 1,
      closedIncomplete: 1,
    });
  });
  it("includes empty and archived programs, keeps General Education outside program PO coverage", async () => {
    auth.mockResolvedValue({ activeRole: "DEAN" });
    db.program.findMany.mockResolvedValue([
      { id: "p", code: "A", name: "Program A", is_active: true },
      { id: "b", code: "B", name: "Different POs", is_active: false },
      { id: "c", code: "C", name: "No evidence", is_active: true },
    ]);
    db.courseBoundEvaluation.findMany.mockResolvedValue([
      {
        id: "ge",
        deployment_name: "GE",
        status: "ACTIVE",
        term_instance_id: "t",
        instrument: { version_number: 1, template: { name: "GenEd" } },
        course_assignment: {
          program_id: "p",
          course: { id: "ge-c", code: "GE", title: "GE course", course_scope: "GENERAL_EDUCATION" },
        },
      },
    ]);
    db.evaluationAssignment.groupBy.mockResolvedValue([
      { course_bound_id: "ge", central_deployment_id: null, _count: { _all: 8 } },
    ]);
    db.response.groupBy.mockResolvedValue([{ deployment_id: "ge", _count: { _all: 5 } }]);
    const result = await getDeanCollegeAnalytics({ view: "college" });
    expect(result?.summary.submitted).toBe(5);
    expect(result?.programRows).toHaveLength(3);
    expect(db.courseAssignment.groupBy.mock.calls[0][0].where.is_active).toBe(true);
    expect(db.courseAssignment.groupBy.mock.calls[1][0].where.is_active).toBe(true);

    expect(result?.programRows.every((p) => p.submitted === 0)).toBe(true);
    expect(db.response.groupBy.mock.calls[0][0].where.status).toBe("SUBMITTED");
    expect(JSON.stringify(result)).not.toMatch(/respondent|text_content|email|response_id/);
  });
  it("keeps a stale valid UUID period empty rather than widening", async () => {
    auth.mockResolvedValue({ activeRole: "DEAN" });
    const id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const result = await getDeanCollegeAnalytics({ view: "college", termInstanceId: id });
    expect(result?.invalidPeriod).toBe(true);
    expect(db.courseBoundEvaluation.findMany.mock.calls[0][0].where.term_instance_id).toBe(id);
  });
});
describe("Dean URL state", () => {
  it("normalizes invalid input and removes incompatible context", () => {
    expect(
      parseDeanAnalyticsFilters({ view: "unknown", programId: "not-uuid", source: "COURSE" })
    ).toEqual({ view: "college" });
    expect(
      parseDeanAnalyticsFilters({
        view: "institutional",
        programId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        source: "ALUMNI",
      })
    ).toEqual({ view: "institutional" });
  });
  it("round trips the bookmarkable scope", () => {
    const filters = parseDeanAnalyticsFilters({
      view: "outcomes",
      programId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      source: "ALUMNI",
    });
    const url = deanAnalyticsUrl(filters);
    expect(
      parseDeanAnalyticsFilters(
        Object.fromEntries(new URL(url, "https://example.test").searchParams)
      )
    ).toEqual(filters);
  });
});
