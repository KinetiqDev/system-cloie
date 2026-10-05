import { beforeEach, describe, expect, it, vi } from "vitest";

import { ROLES } from "@/lib/constants/roles";
import { listGeneralEducationEvaluations } from "@/features/response-review/services/list-general-education-evaluations";

const {
  courseBoundEvaluationCountMock,
  courseBoundEvaluationFindManyMock,
  evaluationAssignmentFindManyMock,
  quantitativeResponseItemFindManyMock,
  courseFindManyMock,
  userFindManyMock,
  academicTermInstanceFindManyMock,
  resolveAuthSessionMock,
} = vi.hoisted(() => ({
  courseBoundEvaluationCountMock: vi.fn(),
  courseBoundEvaluationFindManyMock: vi.fn(),
  evaluationAssignmentFindManyMock: vi.fn(),
  quantitativeResponseItemFindManyMock: vi.fn(),
  courseFindManyMock: vi.fn(),
  userFindManyMock: vi.fn(),
  academicTermInstanceFindManyMock: vi.fn(),
  resolveAuthSessionMock: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    courseBoundEvaluation: {
      count: courseBoundEvaluationCountMock,
      findMany: courseBoundEvaluationFindManyMock,
    },
    evaluationAssignment: { findMany: evaluationAssignmentFindManyMock },
    quantitativeResponseItem: { findMany: quantitativeResponseItemFindManyMock },
    course: { findMany: courseFindManyMock },
    user: { findMany: userFindManyMock },
    academicTermInstance: { findMany: academicTermInstanceFindManyMock },
  },
}));

vi.mock("@/features/auth/services/resolve-auth-session", () => ({
  resolveAuthSession: resolveAuthSessionMock,
}));

const FILTER = { page: 1 };

describe("listGeneralEducationEvaluations (ADR 0034)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveAuthSessionMock.mockResolvedValue({
      activeRole: ROLES.GEN_ED_COORDINATOR,
      roles: [ROLES.GEN_ED_COORDINATOR],
      userId: "coordinator-1",
    });
    courseBoundEvaluationCountMock.mockResolvedValue(0);
    courseBoundEvaluationFindManyMock.mockResolvedValue([]);
    evaluationAssignmentFindManyMock.mockResolvedValue([]);
    quantitativeResponseItemFindManyMock.mockResolvedValue([]);
    courseFindManyMock.mockResolvedValue([]);
    userFindManyMock.mockResolvedValue([]);
    academicTermInstanceFindManyMock.mockResolvedValue([]);
  });

  it("denies Program Heads, Deans, and unauthenticated callers without querying", async () => {
    for (const activeRole of [ROLES.PROGRAM_HEAD, ROLES.DEAN, ROLES.FACULTY]) {
      resolveAuthSessionMock.mockResolvedValue({
        activeRole,
        roles: [activeRole],
        userId: "user-1",
      });
      await expect(listGeneralEducationEvaluations(FILTER)).resolves.toBeNull();
    }
    resolveAuthSessionMock.mockResolvedValue(null);
    await expect(listGeneralEducationEvaluations(FILTER)).resolves.toBeNull();

    expect(courseBoundEvaluationFindManyMock).not.toHaveBeenCalled();
  });

  it("queries only General Education course-bound evaluations, never by Program", async () => {
    await listGeneralEducationEvaluations(FILTER);

    const where = courseBoundEvaluationFindManyMock.mock.calls[0][0].where;
    expect(where.course_assignment.course.course_scope).toBe("GENERAL_EDUCATION");
    expect(where.course_assignment.program_id).toBeUndefined();
    expect(where.status).toEqual({ not: "DRAFT" });
  });

  it("aggregates participation and mean ratings from assignment rows", async () => {
    courseBoundEvaluationCountMock.mockResolvedValue(1);
    courseBoundEvaluationFindManyMock.mockResolvedValue([
      {
        id: "eval-ge",
        deployment_name: "GEETHICS Post-Term CILO Evaluation",
        status: "CLOSED",
        instrument: { structure_snapshot: [], template: { name: "GE Template" } },
        term_instance: {
          semester: "SECOND",
          term: "FIRST_TERM",
          school_year: { code: "2025-2026" },
        },
        course_assignment: {
          year_level: "THIRD_YEAR",
          section: "MORNING",
          course: { id: "course-ge", code: "GEETHICS", title: "Ethics", major: null },
          faculty: { name: "Dr. Santos" },
        },
      },
    ]);
    evaluationAssignmentFindManyMock.mockResolvedValue([
      {
        course_bound_id: "eval-ge",
        response: { status: "SUBMITTED" },
      },
      { course_bound_id: "eval-ge", response: { status: "IN_PROGRESS" } },
    ]);
    quantitativeResponseItemFindManyMock.mockResolvedValue([
      { rating_value: 4, response: { assignment: { course_bound_id: "eval-ge" } } },
      { rating_value: 5, response: { assignment: { course_bound_id: "eval-ge" } } },
    ]);

    const list = await listGeneralEducationEvaluations(FILTER);

    expect(list!.total).toBe(1);
    expect(list!.items).toHaveLength(1);
    expect(list!.items[0]).toMatchObject({
      id: "eval-ge",
      assigned: 2,
      submitted: 1,
      mean: 4.5,
      faculty: "Dr. Santos",
      course: { code: "GEETHICS" },
    });
  });
});
