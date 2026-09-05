import { beforeEach, describe, expect, it, vi } from "vitest";
import { CourseScope } from "@prisma/client";

import { listFacultyPublishedEvaluations } from "@/features/evaluations/services/list-faculty-published-evaluations";
import { ROLES } from "@/lib/constants/roles";

const resolveAuthSessionMock = vi.hoisted(() => vi.fn());
vi.mock("@/features/auth/services/resolve-auth-session", () => ({
  resolveAuthSession: resolveAuthSessionMock,
}));

const prismaMocks = vi.hoisted(() => ({
  courseAssignmentFindMany: vi.fn(),
  courseBoundEvaluationFindMany: vi.fn(),
  facultyProgramAffiliationFindMany: vi.fn(),
}));
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    courseAssignment: { findMany: prismaMocks.courseAssignmentFindMany },
    courseBoundEvaluation: { findMany: prismaMocks.courseBoundEvaluationFindMany },
    facultyProgramAffiliation: { findMany: prismaMocks.facultyProgramAffiliationFindMany },
  },
}));

const affiliation = {
  program: { id: "program-1", code: "BSIT", name: "BS Information Technology" },
};

const publishedEvaluation = {
  id: "evaluation-1",
  activation_at: null,
  deadline_at: null,
  deployment_name: "Capstone CILO Evaluation",
  published_at: new Date("2026-07-01T00:00:00.000Z"),
  status: "ACTIVE",
  course_info_snapshot: null,
  cilos_snapshot: null,
  course_assignment: {
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
  targets: [{ year_level: "FOURTH_YEAR" }],
  _count: { assignments: 12 },
  assignments: [{ id: "assignment-1" }, { id: "assignment-2" }],
  term_instance: {
    semester: "SECOND",
    term: "SECOND_TERM",
    school_year: { code: "2025-2026" },
  },
};

const v2Evaluation = {
  ...publishedEvaluation,
  course_info_snapshot: {
    snapshotSchemaVersion: 2,
    courseAssignmentId: "assignment-1",
    courseId: "course-1",
    courseCode: "IT-401-PREV",
    courseTitle: "Capstone 1 (previous edition)",
    courseScope: "PROGRAM_SPECIFIC",
    programId: "program-1",
    programCode: "BSIT",
    programName: "BS Information Technology",
    majorId: null,
    majorName: null,
    termInstanceId: "term-instance-previous",
    schoolYearCode: "2024-2025",
    semester: "SECOND",
    term: "SECOND_TERM",
    yearLevel: "FOURTH_YEAR",
    section: "MORNING",
    facultyId: "faculty-1",
    facultyName: "Faculty One",
    capturedAt: "2025-06-01T00:00:00.000Z",
    assignmentContextSource: "PUBLICATION",
  },
};

describe("listFacultyPublishedEvaluations – course info snapshots", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveAuthSessionMock.mockResolvedValue({
      activeRole: ROLES.FACULTY,
      profileGate: { status: "COMPLETE" },
      roles: [ROLES.FACULTY],
      userId: "faculty-1",
    });
    prismaMocks.facultyProgramAffiliationFindMany.mockResolvedValue([affiliation]);
  });

  it("prefers published snapshot labels over live relations for historical records", async () => {
    prismaMocks.courseAssignmentFindMany.mockResolvedValue([{ id: "assignment-1" }]);
    prismaMocks.courseBoundEvaluationFindMany.mockResolvedValue([v2Evaluation] as never);

    const result = await listFacultyPublishedEvaluations();

    expect(result.success).toBe(true);
    expect(result.success && result.data.evaluations[0]).toMatchObject({
      courseCode: "IT-401-PREV",
      courseTitle: "Capstone 1 (previous edition)",
      termInstanceLabel: "2024-2025 — 2nd Semester — 2nd Term",
    });
  });

  it("normalizes legacy code/title snapshot shapes", async () => {
    prismaMocks.courseAssignmentFindMany.mockResolvedValue([{ id: "assignment-1" }]);
    prismaMocks.courseBoundEvaluationFindMany.mockResolvedValue([
      {
        ...publishedEvaluation,
        course_info_snapshot: { code: "IT-401-LEGACY", title: "Legacy Capstone" },
      },
    ] as never);

    const result = await listFacultyPublishedEvaluations();

    expect(result.success).toBe(true);
    expect(result.success && result.data.evaluations[0]).toMatchObject({
      courseCode: "IT-401-LEGACY",
      courseTitle: "Legacy Capstone",
    });
  });
});

describe("listFacultyPublishedEvaluations – historical visibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveAuthSessionMock.mockResolvedValue({
      activeRole: ROLES.FACULTY,
      profileGate: { status: "COMPLETE" },
      roles: [ROLES.FACULTY],
      userId: "faculty-1",
    });
    prismaMocks.facultyProgramAffiliationFindMany.mockResolvedValue([affiliation]);
  });

  it("looks up faculty assignments without an is_active filter", async () => {
    prismaMocks.courseAssignmentFindMany.mockResolvedValue([]);
    prismaMocks.courseBoundEvaluationFindMany.mockResolvedValue([]);

    await listFacultyPublishedEvaluations();

    expect(prismaMocks.courseAssignmentFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { faculty_id: "faculty-1" } })
    );
    expect(prismaMocks.courseAssignmentFindMany.mock.calls[0][0].where).not.toHaveProperty(
      "is_active"
    );
  });

  it("keeps published evaluations visible when their assignment was deactivated", async () => {
    prismaMocks.courseAssignmentFindMany.mockResolvedValue([
      { id: "assignment-1", is_active: false },
    ]);
    prismaMocks.courseBoundEvaluationFindMany.mockResolvedValue([publishedEvaluation] as never);

    const result = await listFacultyPublishedEvaluations();

    expect(result.success).toBe(true);
    expect(result.success && result.data.evaluations).toHaveLength(1);
    expect(result.success && result.data.evaluations[0]).toMatchObject({
      evaluationId: "evaluation-1",
      courseCode: "IT-401",
      responseCount: 2,
      totalAssignments: 12,
    });
    expect(result.success && result.data.evaluations[0].termInstanceLabel).toBe(
      "2025-2026 — 2nd Semester — 2nd Term"
    );
    expect(prismaMocks.courseBoundEvaluationFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { course_assignment_id: { in: ["assignment-1"] } },
      })
    );
  });

  it("returns an empty list when the faculty member has no assignments", async () => {
    prismaMocks.courseAssignmentFindMany.mockResolvedValue([]);

    const result = await listFacultyPublishedEvaluations();

    expect(result).toEqual({
      success: true,
      data: { evaluations: [], program: affiliation.program },
    });
  });

  it("prefers published snapshot labels over live relations for historical records", async () => {
    prismaMocks.courseAssignmentFindMany.mockResolvedValue([{ id: "assignment-1" }]);
    prismaMocks.courseBoundEvaluationFindMany.mockResolvedValue([v2Evaluation] as never);

    const result = await listFacultyPublishedEvaluations();

    expect(result.success).toBe(true);
    expect(result.success && result.data.evaluations[0]).toMatchObject({
      courseCode: "IT-401-PREV",
      courseTitle: "Capstone 1 (previous edition)",
      termInstanceLabel: "2024-2025 — 2nd Semester — 2nd Term",
    });
  });

  it("normalizes legacy code/title snapshot shapes", async () => {
    prismaMocks.courseAssignmentFindMany.mockResolvedValue([{ id: "assignment-1" }]);
    prismaMocks.courseBoundEvaluationFindMany.mockResolvedValue([
      {
        ...publishedEvaluation,
        course_info_snapshot: { code: "IT-401-LEGACY", title: "Legacy Capstone" },
      },
    ] as never);

    const result = await listFacultyPublishedEvaluations();

    expect(result.success).toBe(true);
    expect(result.success && result.data.evaluations[0]).toMatchObject({
      courseCode: "IT-401-LEGACY",
      courseTitle: "Legacy Capstone",
    });
  });
});
