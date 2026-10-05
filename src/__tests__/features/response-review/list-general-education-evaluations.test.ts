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

const fivePointSnapshot = [
  {
    key: "teaching",
    title: "Teaching",
    items: [{ kind: "quantitative", key: "clarity", prompt: "Clarity", scale: [1, 2, 3, 4, 5] }],
  },
];

function rating(ratingValue: number, sectionKey = "teaching", itemKey = "clarity") {
  return {
    rating_value: ratingValue,
    section_key: sectionKey,
    item_key: itemKey,
    response: { assignment: { course_bound_id: "eval-ge" } },
  };
}

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

  function evaluationRow(snapshot: unknown) {
    return {
      id: "eval-ge",
      deployment_name: "GEETHICS Post-Term CILO Evaluation",
      status: "CLOSED",
      instrument: { structure_snapshot: snapshot, template: { name: "GE Template" } },
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
    };
  }

  it("aggregates participation and excludes ratings outside the resolved scale", async () => {
    courseBoundEvaluationCountMock.mockResolvedValue(1);
    courseBoundEvaluationFindManyMock.mockResolvedValue([evaluationRow(fivePointSnapshot)]);
    evaluationAssignmentFindManyMock.mockResolvedValue([
      {
        course_bound_id: "eval-ge",
        response: { status: "SUBMITTED" },
      },
      { course_bound_id: "eval-ge", response: { status: "IN_PROGRESS" } },
    ]);
    quantitativeResponseItemFindManyMock.mockResolvedValue([rating(4), rating(5), rating(9)]);

    const list = await listGeneralEducationEvaluations(FILTER);

    expect(list!.total).toBe(1);
    expect(list!.items).toHaveLength(1);
    // 9 falls outside the 1–5 scale the snapshot resolves, so it never enters
    // the mean the detail view reports for the same evidence.
    expect(list!.items[0]).toMatchObject({
      id: "eval-ge",
      assigned: 2,
      submitted: 1,
      mean: 4.5,
      faculty: "Dr. Santos",
      course: { code: "GEETHICS" },
    });
  });

  it("reports no mean when submitted ratings resolve to incompatible scales", async () => {
    courseBoundEvaluationCountMock.mockResolvedValue(1);
    courseBoundEvaluationFindManyMock.mockResolvedValue([
      evaluationRow([
        {
          key: "teaching",
          title: "Teaching",
          items: [
            { kind: "quantitative", key: "clarity", prompt: "Clarity", scale: [1, 2, 3, 4, 5] },
            {
              kind: "quantitative",
              key: "satisfaction",
              prompt: "Satisfaction",
              scale: [1, 2, 3, 4, 5, 6, 7],
            },
          ],
        },
      ]),
    ]);

    evaluationAssignmentFindManyMock.mockResolvedValue([
      { course_bound_id: "eval-ge", response: { status: "SUBMITTED" } },
    ]);
    quantitativeResponseItemFindManyMock.mockResolvedValue([
      rating(4),
      rating(6, "teaching", "satisfaction"),
    ]);

    const list = await listGeneralEducationEvaluations(FILTER);

    expect(list!.items[0].mean).toBeNull();
    expect(list!.items[0].scaleLabel).toContain("1–5");
  });
});
