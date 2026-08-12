import { beforeEach, describe, expect, it, vi } from "vitest";
import { CourseScope } from "@prisma/client";

import { getFacultyEvaluationDetail } from "@/features/evaluations/services/get-faculty-evaluation-detail";
import { ROLES } from "@/lib/constants/roles";

const resolveAuthSessionMock = vi.hoisted(() => vi.fn());
vi.mock("@/features/auth/services/resolve-auth-session", () => ({
  resolveAuthSession: resolveAuthSessionMock,
}));

const prismaMocks = vi.hoisted(() => ({
  courseBoundEvaluationFindFirst: vi.fn(),
  programHeadAssignmentFindMany: vi.fn(),
}));
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    courseBoundEvaluation: { findFirst: prismaMocks.courseBoundEvaluationFindFirst },
    programHeadAssignment: { findMany: prismaMocks.programHeadAssignmentFindMany },
  },
}));

const evaluation = {
  id: "evaluation-1",
  activation_at: null,
  deadline_at: null,
  deployment_name: "Capstone CILO Evaluation",
  published_at: new Date("2026-07-01T00:00:00.000Z"),
  status: "ACTIVE",
  course_info_snapshot: null,
  cilos_snapshot: null,
  course_assignment: {
    faculty_id: "faculty-1",
    is_active: false,
    program_id: "program-1",
    course: {
      id: "course-1",
      code: "IT-401",
      title: "Capstone 1",
      course_scope: CourseScope.PROGRAM_SPECIFIC,
      major_id: null,
      major: null,
    },
    program: { id: "program-1", code: "BSIT", name: "BS Information Technology" },
  },
  targets: [],
  cilo_question_bindings: [],
  _count: { assignments: 5 },
  term_instance: { semester: "FIRST", term: null, school_year: { code: "2025-2026" } },
  assignments: [],
  exclusions: [],
};

describe("getFacultyEvaluationDetail – historical visibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMocks.courseBoundEvaluationFindFirst.mockResolvedValue(evaluation);
  });

  it("keeps a published evaluation readable for the owning faculty after assignment deactivation", async () => {
    resolveAuthSessionMock.mockResolvedValue({
      activeRole: ROLES.FACULTY,
      profileGate: { status: "COMPLETE" },
      roles: [ROLES.FACULTY],
      userId: "faculty-1",
    });

    const result = await getFacultyEvaluationDetail("evaluation-1");

    expect(result).toMatchObject({
      success: true,
      data: {
        evaluationId: "evaluation-1",
        courseInfo: { courseCode: "IT-401", courseTitle: "Capstone 1" },
        totalAssignments: 5,
      },
    });
  });

  it("returns an indistinguishable not-found response for a non-owning faculty member", async () => {
    resolveAuthSessionMock.mockResolvedValue({
      activeRole: ROLES.FACULTY,
      profileGate: { status: "COMPLETE" },
      roles: [ROLES.FACULTY],
      userId: "faculty-2",
    });

    const missing = await getFacultyEvaluationDetail("evaluation-1");
    prismaMocks.courseBoundEvaluationFindFirst.mockResolvedValue(null);
    const absent = await getFacultyEvaluationDetail("evaluation-1");

    expect(missing).toEqual({
      success: false,
      error: "Evaluation not found or you do not have access.",
    });
    expect(absent).toEqual(missing);
  });

  it("projects opaque exclusion student names without split keys", async () => {
    resolveAuthSessionMock.mockResolvedValue({
      activeRole: ROLES.FACULTY,
      profileGate: { status: "COMPLETE" },
      roles: [ROLES.FACULTY],
      userId: "faculty-1",
    });
    prismaMocks.courseBoundEvaluationFindFirst.mockResolvedValue({
      ...evaluation,
      exclusions: [
        {
          category: "ADMINISTRATIVE_EXCEPTION",
          course_assignment_membership_id: "membership-1",
          reversal_category: null,
          reversed_at: null,
          membership: {
            is_active: true,
            student: { name: "Mary Anne O'Connor" },
          },
        },
        {
          category: "OTHER",
          course_assignment_membership_id: "membership-2",
          reversal_category: null,
          reversed_at: null,
          membership: {
            is_active: true,
            student: { name: "Prince" },
          },
        },
      ],
    });

    const result = await getFacultyEvaluationDetail("evaluation-1");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.exclusions.map((row) => row.studentName)).toEqual([
        "Mary Anne O'Connor",
        "Prince",
      ]);
      expect(result.data.exclusions[0]).not.toHaveProperty("firstName");
      expect(result.data.exclusions[0]).not.toHaveProperty("lastName");
    }
  });
});
