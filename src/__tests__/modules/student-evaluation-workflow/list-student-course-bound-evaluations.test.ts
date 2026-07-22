import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildStudentEvaluationListItem,
  deriveStudentEvaluationStatus,
  listStudentCourseBoundEvaluations,
} from "@/features/responses/services/list-student-course-bound-evaluations";

const { findManyMock, membershipFindUniqueMock, resolveAuthSessionMock } = vi.hoisted(() => ({
  findManyMock: vi.fn(),
  membershipFindUniqueMock: vi.fn(),
  resolveAuthSessionMock: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    evaluationAssignment: {
      findMany: findManyMock,
    },
    courseAssignmentMembership: {
      findUnique: membershipFindUniqueMock,
    },
  },
}));

vi.mock("@/features/auth/services/resolve-auth-session", () => ({
  resolveAuthSession: resolveAuthSessionMock,
}));

describe("deriveStudentEvaluationStatus", () => {
  it("returns NOT_STARTED when no response exists", () => {
    expect(
      deriveStudentEvaluationStatus({
        answeredItems: 0,
        deadlineAt: new Date("2026-05-20T00:00:00.000Z"),
        now: new Date("2026-05-10T00:00:00.000Z"),
        responseId: null,
        submittedAt: null,
        totalItems: 6,
      })
    ).toEqual({ progress: 0, status: "NOT_STARTED" });
  });

  it("returns IN_PROGRESS with 50 progress when 3 of 6 items are answered", () => {
    expect(
      deriveStudentEvaluationStatus({
        answeredItems: 3,
        deadlineAt: new Date("2026-05-20T00:00:00.000Z"),
        now: new Date("2026-05-10T00:00:00.000Z"),
        responseId: "response-1",
        submittedAt: null,
        totalItems: 6,
      })
    ).toEqual({ progress: 50, status: "IN_PROGRESS" });
  });

  it("returns DUE_SOON when the deadline is within 3 days and no response exists", () => {
    expect(
      deriveStudentEvaluationStatus({
        answeredItems: 0,
        deadlineAt: new Date("2026-05-12T00:00:00.000Z"),
        now: new Date("2026-05-10T00:00:00.000Z"),
        responseId: null,
        submittedAt: null,
        totalItems: 6,
      })
    ).toEqual({ progress: 0, status: "DUE_SOON" });
  });

  it("returns SUBMITTED when the session has been submitted", () => {
    expect(
      deriveStudentEvaluationStatus({
        answeredItems: 3,
        deadlineAt: new Date("2026-05-20T00:00:00.000Z"),
        now: new Date("2026-05-10T00:00:00.000Z"),
        responseId: "response-1",
        submittedAt: new Date("2026-05-11T00:00:00.000Z"),
        totalItems: 6,
      })
    ).toEqual({ progress: 50, status: "SUBMITTED" });
  });

  it("returns SUBMITTED when submittedAt exists even if responseId is null", () => {
    expect(
      deriveStudentEvaluationStatus({
        answeredItems: 3,
        deadlineAt: new Date("2026-05-20T00:00:00.000Z"),
        now: new Date("2026-05-10T00:00:00.000Z"),
        responseId: null,
        submittedAt: new Date("2026-05-11T00:00:00.000Z"),
        totalItems: 6,
      })
    ).toEqual({ progress: 50, status: "SUBMITTED" });
  });

  it("returns zero progress for zero-item sessions", () => {
    expect(
      deriveStudentEvaluationStatus({
        answeredItems: 0,
        deadlineAt: new Date("2026-05-20T00:00:00.000Z"),
        now: new Date("2026-05-10T00:00:00.000Z"),
        responseId: "response-1",
        submittedAt: null,
        totalItems: 0,
      })
    ).toEqual({ progress: 0, status: "IN_PROGRESS" });
  });

  it("clamps progress into the 0 to 100 range", () => {
    expect(
      deriveStudentEvaluationStatus({
        answeredItems: 8,
        deadlineAt: new Date("2026-05-20T00:00:00.000Z"),
        now: new Date("2026-05-10T00:00:00.000Z"),
        responseId: "response-1",
        submittedAt: null,
        totalItems: 6,
      })
    ).toEqual({ progress: 100, status: "IN_PROGRESS" });

    expect(
      deriveStudentEvaluationStatus({
        answeredItems: -2,
        deadlineAt: new Date("2026-05-20T00:00:00.000Z"),
        now: new Date("2026-05-10T00:00:00.000Z"),
        responseId: "response-1",
        submittedAt: null,
        totalItems: 6,
      })
    ).toEqual({ progress: 0, status: "IN_PROGRESS" });
  });
});

describe("buildStudentEvaluationListItem", () => {
  it("shapes the workflow list item", () => {
    expect(
      buildStudentEvaluationListItem({
        assignmentId: "assignment-1",
        courseTitle: "ITE 18 - Capstone 1",
        deadlineAt: new Date("2026-05-20T00:00:00.000Z"),
        evaluationId: "evaluation-1",
        evaluationTitle: "Post-Term CILO Evaluation Tool",
        facultyName: "Dr. Test Faculty",
        href: "/student/evaluations/evaluation-1",
        now: new Date("2026-05-10T00:00:00.000Z"),
        programLabel: "BSIT • 4th Year",
        section: {
          description: "",
          id: "section-1",
          items: [],
          name: "Section A",
        },
        session: {
          answeredItems: 3,
          responseId: "response-1",
          submittedAt: null,
          totalItems: 6,
        },
      })
    ).toEqual({
      assignmentId: "assignment-1",
      courseTitle: "ITE 18 - Capstone 1",
      deadlineAt: new Date("2026-05-20T00:00:00.000Z"),
      deploymentType: "COURSE_BOUND",
      evaluationId: "evaluation-1",
      evaluationTitle: "Post-Term CILO Evaluation Tool",
      facultyName: "Dr. Test Faculty",
      href: "/student/evaluations/evaluation-1",
      progress: 50,
      programLabel: "BSIT • 4th Year",
      section: {
        description: "",
        id: "section-1",
        items: [],
        name: "Section A",
      },
      session: {
        answeredItems: 3,
        responseId: "response-1",
        submittedAt: null,
        totalItems: 6,
      },
      status: "IN_PROGRESS",
    });
  });
});

describe("listStudentCourseBoundEvaluations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    membershipFindUniqueMock.mockResolvedValue({
      is_active: true,
      student: {
        enrollments: [{ program_id: "program-1" }],
        is_active: true,
        roles: [{ role: "STUDENT" }],
        student_profile: { program_id: "program-1", student_id_number: "S0001" },
      },
    });
    vi.useRealTimers();
  });

  it("excludes unavailable unsubmitted assignments from the active list", async () => {
    resolveAuthSessionMock.mockResolvedValue({ userId: "user-1" });
    findManyMock.mockResolvedValue([
      {
        course_bound_id: "eval-scheduled",
        id: "assignment-scheduled",
        course_bound: {
          activation_at: new Date("2026-05-15T00:00:00.000Z"),
          course_assignment: {
            course_scope: "PROGRAM_SPECIFIC",
            id: "course-assignment-scheduled",
            program_id: "program-1",
            term_instance_id: "term-1",
            course: { title: "Capstone 1" },
            program: { name: "BSIT" },
          },
          deadline_at: new Date("2026-05-20T00:00:00.000Z"),
          instrument: {
            structure_snapshot: [{ key: "section-a", title: "Section A" }],
            template: { name: "Scheduled Evaluation" },
          },
          status: "SCHEDULED",
        },
        response: null,
      },
      {
        course_bound_id: "eval-expired",
        id: "assignment-expired",
        course_bound: {
          activation_at: new Date("2026-05-01T00:00:00.000Z"),
          course_assignment: {
            course_scope: "PROGRAM_SPECIFIC",
            id: "course-assignment-expired",
            program_id: "program-1",
            term_instance_id: "term-1",
            course: { title: "Networks" },
            program: { name: "BSIT" },
          },
          deadline_at: new Date("2026-05-05T00:00:00.000Z"),
          instrument: {
            structure_snapshot: [{ key: "section-b", title: "Section B" }],
            template: { name: "Expired Evaluation" },
          },
          status: "ACTIVE",
        },
        response: null,
      },
      {
        course_bound_id: "eval-submitted",
        id: "assignment-submitted",
        course_bound: {
          activation_at: new Date("2026-05-01T00:00:00.000Z"),
          course_assignment: {
            course_scope: "PROGRAM_SPECIFIC",
            id: "course-assignment-submitted",
            program_id: "program-1",
            term_instance_id: "term-1",
            course: { title: "Databases" },
            program: { name: "BSIT" },
          },
          deadline_at: new Date("2026-05-05T00:00:00.000Z"),
          instrument: {
            structure_snapshot: [{ key: "section-c", title: "Section C" }],
            template: { name: "Submitted Evaluation" },
          },
          status: "ACTIVE",
        },
        response: {
          id: "response-submitted",
          qual_items: [],
          quant_items: [],
          status: "SUBMITTED",
          submitted_at: new Date("2026-05-04T00:00:00.000Z"),
        },
      },
    ]);

    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-10T00:00:00.000Z"));

    await expect(listStudentCourseBoundEvaluations()).resolves.toEqual({
      active: [],
      submitted: [
        expect.objectContaining({
          assignmentId: "assignment-submitted",
          deploymentType: "COURSE_BOUND",
          evaluationId: "assignment-submitted",
          status: "SUBMITTED",
        }),
      ],
    });

    vi.useRealTimers();
  });

  it("returns active and submitted course-bound assignments with workflow hrefs", async () => {
    resolveAuthSessionMock.mockResolvedValue({ userId: "user-1" });
    findManyMock.mockResolvedValue([
      {
        course_bound_id: "eval-active",
        id: "assignment-1",
        course_bound: {
          activation_at: new Date("2026-04-01T00:00:00.000Z"),
          course_assignment: {
            course_scope: "PROGRAM_SPECIFIC",
            id: "course-assignment-active",
            program_id: "program-1",
            term_instance_id: "term-1",
            course: { title: "Capstone 1" },
            program: { name: "BSIT" },
          },
          deadline_at: new Date("2026-05-20T00:00:00.000Z"),
          instrument: {
            structure_snapshot: [{ key: "section-a", title: "Section A" }],
            template: { name: "Post-Term CILO Evaluation Tool" },
          },
          status: "ACTIVE",
        },
        response: {
          id: "response-1",
          qual_items: [],
          quant_items: [{ id: "q-1" }],
          status: "IN_PROGRESS",
          submitted_at: null,
        },
      },
      {
        course_bound_id: "eval-submitted",
        id: "assignment-2",
        course_bound: {
          activation_at: new Date("2026-04-01T00:00:00.000Z"),
          course_assignment: {
            course_scope: "PROGRAM_SPECIFIC",
            id: "course-assignment-submitted",
            program_id: "program-1",
            term_instance_id: "term-1",
            course: { title: "Networks" },
            program: { name: "BSIT" },
          },
          deadline_at: new Date("2026-05-10T00:00:00.000Z"),
          instrument: {
            structure_snapshot: [{ key: "section-b", title: "Section B" }],
            template: { name: "Midterm Evaluation" },
          },
          status: "ACTIVE",
        },
        response: {
          id: "response-2",
          qual_items: [],
          quant_items: [{ id: "q-1" }],
          status: "SUBMITTED",
          submitted_at: new Date("2026-05-09T00:00:00.000Z"),
        },
      },
    ]);

    await expect(listStudentCourseBoundEvaluations()).resolves.toEqual({
      active: [
        expect.objectContaining({
          assignmentId: "assignment-1",
          deploymentType: "COURSE_BOUND",
          evaluationId: "assignment-1",
          href: "/student/evaluations/assignment-1",
          status: "IN_PROGRESS",
        }),
      ],
      submitted: [
        expect.objectContaining({
          assignmentId: "assignment-2",
          deploymentType: "COURSE_BOUND",
          evaluationId: "assignment-2",
          href: "/student/history/response-2",
          status: "SUBMITTED",
        }),
      ],
    });
  });

  it("hides pending assignments for an ineligible Student but preserves submitted history", async () => {
    resolveAuthSessionMock.mockResolvedValue({ userId: "user-1" });
    membershipFindUniqueMock.mockResolvedValue({
      is_active: true,
      student: {
        enrollments: [],
        is_active: true,
        roles: [{ role: "STUDENT" }],
        student_profile: { program_id: "program-1", student_id_number: "S0001" },
      },
    });
    findManyMock.mockResolvedValue([
      {
        course_bound_id: "eval-pending",
        id: "assignment-pending",
        course_bound: {
          activation_at: new Date("2026-04-01T00:00:00.000Z"),
          course_assignment: {
            course_scope: "PROGRAM_SPECIFIC",
            id: "course-assignment-1",
            program_id: "program-1",
            term_instance_id: "term-1",
            course: { title: "Capstone 1" },
            program: { name: "BSIT" },
          },
          deadline_at: new Date("2026-05-20T00:00:00.000Z"),
          instrument: {
            structure_snapshot: [{ key: "section-a", title: "Section A" }],
            template: { name: "Pending Evaluation" },
          },
          status: "ACTIVE",
        },
        response: null,
      },
      {
        course_bound_id: "eval-submitted",
        id: "assignment-submitted",
        course_bound: {
          activation_at: new Date("2026-04-01T00:00:00.000Z"),
          course_assignment: {
            course_scope: "PROGRAM_SPECIFIC",
            id: "course-assignment-1",
            program_id: "program-1",
            term_instance_id: "term-1",
            course: { title: "Capstone 1" },
            program: { name: "BSIT" },
          },
          deadline_at: new Date("2026-05-20T00:00:00.000Z"),
          instrument: {
            structure_snapshot: [{ key: "section-a", title: "Section A" }],
            template: { name: "Submitted Evaluation" },
          },
          status: "ACTIVE",
        },
        response: {
          id: "response-submitted",
          qual_items: [],
          quant_items: [],
          status: "SUBMITTED",
          submitted_at: new Date("2026-05-04T00:00:00.000Z"),
        },
      },
    ]);

    await expect(listStudentCourseBoundEvaluations()).resolves.toEqual({
      active: [],
      submitted: [expect.objectContaining({ assignmentId: "assignment-submitted" })],
    });
  });
});
