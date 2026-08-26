import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  assertSubmissionIsAllowed,
  buildSubmittedResponsePatch,
  submitStudentCourseBoundResponse,
} from "@/features/responses/services/submit-student-course-bound-response";

const {
  createMock,
  findAssignmentMock,
  findResponseByAssignmentMock,
  membershipFindUniqueMock,
  resolveAuthSessionMock,
  updateMock,
} = vi.hoisted(() => ({
  createMock: vi.fn(),
  findAssignmentMock: vi.fn(),
  findResponseByAssignmentMock: vi.fn(),
  membershipFindUniqueMock: vi.fn(),
  resolveAuthSessionMock: vi.fn(),
  updateMock: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => {
  const mockTx = {
    $executeRaw: vi.fn(),
    qualitativeResponseItem: {
      createMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    quantitativeResponseItem: {
      createMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    response: {
      create: createMock,
      findUnique: findResponseByAssignmentMock,
      update: updateMock,
    },
  };

  return {
    prisma: {
      $transaction: vi.fn((fn) => fn(mockTx)),
      evaluationAssignment: {
        findFirst: findAssignmentMock,
      },
      courseAssignmentMembership: {
        findUnique: membershipFindUniqueMock,
      },
      ...mockTx,
    },
  };
});

vi.mock("@/features/auth/services/resolve-auth-session", () => ({
  resolveAuthSession: resolveAuthSessionMock,
}));

const structureSnapshot = [
  {
    items: [
      {
        key: "remarks",
        kind: "qualitative",
        prompt: "Share your remarks.",
      },
      {
        key: "q1",
        kind: "quantitative",
        prompt: "Rate the instructor.",
        scale: [1, 2, 3, 4, 5],
      },
    ],
    key: "section-a",
    qualitative_prompts: [
      {
        key: "remarks",
        prompt: "Share your remarks.",
      },
    ],
    quantitative_items: [
      {
        key: "q1",
        prompt: "Rate the instructor.",
      },
    ],
    title: "Section A",
  },
] as const;

describe("assertSubmissionIsAllowed", () => {
  it("rejects when required answers are missing", () => {
    expect(() =>
      assertSubmissionIsAllowed({
        answers: {
          "section-a:quantitative:q1": 4,
        },
        structureSnapshot,
      })
    ).toThrowError("Missing required answers: section-a:qualitative:remarks");
  });

  it("allows optional qualitative items (required: false) to remain blank", () => {
    const snapshot = [
      {
        key: "section-a",
        title: "Section A",
        items: [
          {
            key: "q1",
            kind: "quantitative",
            prompt: "Rate the instructor.",
            scale: [1, 2, 3, 4, 5],
            required: true,
          },
          {
            key: "remarks",
            kind: "qualitative",
            prompt: "Share your remarks.",
            required: false,
          },
        ],
      },
    ];

    expect(() =>
      assertSubmissionIsAllowed({
        answers: { "section-a:quantitative:q1": 4 },
        structureSnapshot: snapshot,
      })
    ).not.toThrow();
  });
});

describe("buildSubmittedResponsePatch", () => {
  it("creates a submitted patch with workflow field names for later persistence translation", () => {
    expect(
      buildSubmittedResponsePatch({
        submittedAt: "2026-04-20T12:00:00.000Z",
      })
    ).toEqual({
      status: "SUBMITTED",
      submittedAt: "2026-04-20T12:00:00.000Z",
    });
  });
});

describe("submitStudentCourseBoundResponse", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    membershipFindUniqueMock.mockResolvedValue({
      is_active: true,
      student: {
        enrollments: [{ program_id: "program-1" }],
        is_active: true,
        roles: [{ role: "STUDENT" }],
        student_profile: {
          program_id: "program-1",
          major_id: null,
          program: { is_active: true, majors: [] },
          major: null,
        },
      },
    });
    vi.useRealTimers();
  });

  it("submits a course-bound response and returns its id", async () => {
    resolveAuthSessionMock.mockResolvedValue({ userId: "user-1" });
    findAssignmentMock.mockResolvedValue({
      course_bound_id: "course-bound-1",
      id: "assignment-1",
      course_bound: {
        course_assignment: {
          course: { course_scope: "PROGRAM_SPECIFIC" },
          id: "course-assignment-1",
          program_id: "program-1",
          term_instance_id: "term-1",
        },
        activation_at: new Date("2026-04-01T00:00:00.000Z"),
        deadline_at: new Date("2026-05-20T00:00:00.000Z"),
        instrument: {
          structure_snapshot: structureSnapshot,
        },
        status: "ACTIVE",
      },
    });
    findResponseByAssignmentMock.mockResolvedValue({ id: "response-1" });
    updateMock.mockResolvedValue({ id: "response-1" });

    await expect(
      submitStudentCourseBoundResponse({
        answers: {
          "section-a:qualitative:remarks": "Clear and helpful explanations.",
          "section-a:quantitative:q1": 5,
        },
        assignmentId: "assignment-1",
      })
    ).resolves.toEqual({
      responseId: "response-1",
      status: "SUBMITTED",
      success: true,
    });
  });

  it("rejects a second submission when a submitted response already exists", async () => {
    resolveAuthSessionMock.mockResolvedValue({ userId: "user-1" });
    findAssignmentMock.mockResolvedValue({
      course_bound_id: "course-bound-1",
      id: "assignment-1",
      course_bound: {
        course_assignment: {
          course: { course_scope: "PROGRAM_SPECIFIC" },
          id: "course-assignment-1",
          program_id: "program-1",
          term_instance_id: "term-1",
        },
        activation_at: new Date("2026-04-01T00:00:00.000Z"),
        deadline_at: new Date("2026-05-20T00:00:00.000Z"),
        instrument: {
          structure_snapshot: structureSnapshot,
        },
        status: "ACTIVE",
      },
    });
    findResponseByAssignmentMock.mockResolvedValue({ id: "response-1", status: "SUBMITTED" });

    await expect(
      submitStudentCourseBoundResponse({
        answers: {
          "section-a:qualitative:remarks": "Clear and helpful explanations.",
          "section-a:quantitative:q1": 5,
        },
        assignmentId: "assignment-1",
      })
    ).resolves.toEqual({
      error: "This evaluation has already been submitted.",
      success: false,
    });
  });

  it("rejects submissions when the course-bound evaluation is unavailable", async () => {
    resolveAuthSessionMock.mockResolvedValue({ userId: "user-1" });
    findAssignmentMock.mockResolvedValue({
      course_bound_id: "course-bound-1",
      id: "assignment-1",
      course_bound: {
        course_assignment: {
          course: { course_scope: "PROGRAM_SPECIFIC" },
          id: "course-assignment-1",
          program_id: "program-1",
          term_instance_id: "term-1",
        },
        activation_at: new Date("2026-05-01T00:00:00.000Z"),
        deadline_at: new Date("2026-05-05T00:00:00.000Z"),
        instrument: {
          structure_snapshot: structureSnapshot,
        },
        status: "ACTIVE",
      },
    });
    findResponseByAssignmentMock.mockResolvedValue(null);

    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-10T00:00:00.000Z"));

    await expect(
      submitStudentCourseBoundResponse({
        answers: {
          "section-a:qualitative:remarks": "Clear and helpful explanations.",
          "section-a:quantitative:q1": 5,
        },
        assignmentId: "assignment-1",
      })
    ).resolves.toEqual({
      error: "This evaluation is not currently available.",
      success: false,
    });

    vi.useRealTimers();
  });

  it("rejects submission while Student is ineligible", async () => {
    resolveAuthSessionMock.mockResolvedValue({ userId: "user-1" });
    membershipFindUniqueMock.mockResolvedValue({
      is_active: true,
      student: {
        enrollments: [],
        is_active: true,
        roles: [{ role: "STUDENT" }],
        student_profile: {
          program_id: "program-1",
          major_id: null,
          program: { is_active: true, majors: [] },
          major: null,
        },
      },
    });
    findAssignmentMock.mockResolvedValue({
      course_bound_id: "course-bound-1",
      id: "assignment-1",
      course_bound: {
        course_assignment: {
          course: { course_scope: "PROGRAM_SPECIFIC" },
          id: "course-assignment-1",
          program_id: "program-1",
          term_instance_id: "term-1",
        },
        activation_at: new Date("2026-04-01T00:00:00.000Z"),
        deadline_at: new Date("2026-05-20T00:00:00.000Z"),
        instrument: { structure_snapshot: structureSnapshot },
        status: "ACTIVE",
      },
    });

    await expect(
      submitStudentCourseBoundResponse({
        answers: {
          "section-a:qualitative:remarks": "Clear and helpful explanations.",
          "section-a:quantitative:q1": 5,
        },
        assignmentId: "assignment-1",
      })
    ).resolves.toEqual({
      error: "This evaluation is not currently available.",
      success: false,
    });
  });
});
