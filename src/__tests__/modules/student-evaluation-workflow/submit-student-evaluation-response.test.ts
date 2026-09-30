import { beforeEach, describe, expect, it, vi } from "vitest";
import { submitStudentEvaluationResponse } from "@/features/responses/services/submit-student-evaluation-response";

const {
  createMock,
  createManyQualMock,
  createManyQuantMock,
  deleteManyQualMock,
  deleteManyQuantMock,
  executeRawMock,
  findAssignmentMock,
  findResponseByAssignmentMock,
  membershipFindUniqueMock,
  resolveAuthSessionMock,
  updateMock,
} = vi.hoisted(() => ({
  createMock: vi.fn(),
  createManyQualMock: vi.fn(),
  createManyQuantMock: vi.fn(),
  deleteManyQualMock: vi.fn(),
  deleteManyQuantMock: vi.fn(),
  executeRawMock: vi.fn(),
  findAssignmentMock: vi.fn(),
  findResponseByAssignmentMock: vi.fn(),
  membershipFindUniqueMock: vi.fn(),
  resolveAuthSessionMock: vi.fn(),
  updateMock: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => {
  const mockTx = {
    $executeRaw: executeRawMock,
    qualitativeResponseItem: {
      createMany: createManyQualMock,
      deleteMany: deleteManyQualMock,
    },
    quantitativeResponseItem: {
      createMany: createManyQuantMock,
      deleteMany: deleteManyQuantMock,
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
    title: "Section A",
  },
];

const validAnswers = {
  "section-a:qualitative:remarks": "Clear and helpful explanations.",
  "section-a:quantitative:q1": 5,
};

function courseBoundAssignment(overrides: Record<string, unknown> = {}) {
  return {
    central_deployment: null,
    course_bound_id: "course-bound-1",
    id: "assignment-1",
    course_bound: {
      activation_at: new Date("2026-04-01T00:00:00.000Z"),
      course_assignment: {
        course: { course_scope: "PROGRAM_SPECIFIC" },
        id: "course-assignment-1",
        program_id: "program-1",
        term_instance_id: "term-1",
      },
      deadline_at: new Date("2026-05-20T00:00:00.000Z"),
      instrument: { structure_snapshot: structureSnapshot },
      status: "ACTIVE",
      ...overrides,
    },
  };
}

function eligibleMembership() {
  return {
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
  };
}

describe("submitStudentEvaluationResponse", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    membershipFindUniqueMock.mockResolvedValue(eligibleMembership());
    resolveAuthSessionMock.mockResolvedValue({ userId: "user-1" });
  });

  it("submits a course-bound response and returns its id", async () => {
    findAssignmentMock.mockResolvedValue(courseBoundAssignment());
    findResponseByAssignmentMock.mockResolvedValue({ id: "response-1" });
    updateMock.mockResolvedValue({ id: "response-1" });

    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-20T12:00:00.000Z"));

    await expect(
      submitStudentEvaluationResponse({
        answers: validAnswers,
        assignmentId: "assignment-1",
      })
    ).resolves.toEqual({
      responseId: "response-1",
      status: "SUBMITTED",
      submittedAt: "2026-04-20T12:00:00.000Z",
      success: true,
    });

    // The returned timestamp is the exact value frozen inside the transaction.
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "SUBMITTED",
          submitted_at: new Date("2026-04-20T12:00:00.000Z"),
        }),
      })
    );

    vi.useRealTimers();
  });

  it("locks the assignment before reading or writing the response row", async () => {
    findAssignmentMock.mockResolvedValue(courseBoundAssignment());
    findResponseByAssignmentMock.mockResolvedValue({ id: "response-1" });
    updateMock.mockResolvedValue({ id: "response-1" });

    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-20T12:00:00.000Z"));

    await submitStudentEvaluationResponse({ answers: validAnswers, assignmentId: "assignment-1" });

    expect(executeRawMock).toHaveBeenCalledTimes(1);
    expect(executeRawMock.mock.invocationCallOrder[0]).toBeLessThan(
      findResponseByAssignmentMock.mock.invocationCallOrder[0]
    );

    vi.useRealTimers();
  });

  it("replaces prior answer items and freezes submission on the response", async () => {
    findAssignmentMock.mockResolvedValue(courseBoundAssignment());
    findResponseByAssignmentMock.mockResolvedValue({ id: "response-1" });
    updateMock.mockResolvedValue({ id: "response-1" });

    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-20T12:00:00.000Z"));

    await submitStudentEvaluationResponse({ answers: validAnswers, assignmentId: "assignment-1" });

    // The one-response invariant replaces the whole prior item set.
    expect(deleteManyQuantMock).toHaveBeenCalledWith({ where: { response_id: "response-1" } });
    expect(deleteManyQualMock).toHaveBeenCalledWith({ where: { response_id: "response-1" } });
    expect(createManyQuantMock).toHaveBeenCalledWith({
      data: [
        {
          item_key: "q1",
          rating_value: 5,
          response_id: "response-1",
          section_key: "section-a",
        },
      ],
    });
    expect(createManyQualMock).toHaveBeenCalledWith({
      data: [
        {
          prompt_key: "remarks",
          response_id: "response-1",
          section_key: "section-a",
          text_content: "Clear and helpful explanations.",
        },
      ],
    });

    vi.useRealTimers();
  });

  it("creates the response row for a first submission", async () => {
    findAssignmentMock.mockResolvedValue(courseBoundAssignment());
    findResponseByAssignmentMock.mockResolvedValue(null);
    createMock.mockResolvedValue({ id: "response-new" });
    updateMock.mockResolvedValue({ id: "response-new" });

    await expect(
      submitStudentEvaluationResponse({ answers: validAnswers, assignmentId: "assignment-1" })
    ).resolves.toEqual(expect.objectContaining({ responseId: "response-new", success: true }));

    expect(createMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        assignment_id: "assignment-1",
        deployment_id: "course-bound-1",
        deployment_type: "COURSE_BOUND",
        respondent_id: "user-1",
        status: "IN_PROGRESS",
      }),
    });
  });

  it("rejects a second submission when a submitted response already exists", async () => {
    findAssignmentMock.mockResolvedValue(courseBoundAssignment());
    findResponseByAssignmentMock.mockResolvedValue({ id: "response-1", status: "SUBMITTED" });

    await expect(
      submitStudentEvaluationResponse({ answers: validAnswers, assignmentId: "assignment-1" })
    ).resolves.toEqual({
      error: "This evaluation has already been submitted.",
      success: false,
    });
  });

  it("rejects submissions when the course-bound evaluation is unavailable", async () => {
    findAssignmentMock.mockResolvedValue(
      courseBoundAssignment({
        activation_at: new Date("2026-05-01T00:00:00.000Z"),
        deadline_at: new Date("2026-05-05T00:00:00.000Z"),
        status: "ACTIVE",
      })
    );
    findResponseByAssignmentMock.mockResolvedValue(null);

    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-10T00:00:00.000Z"));

    await expect(
      submitStudentEvaluationResponse({ answers: validAnswers, assignmentId: "assignment-1" })
    ).resolves.toEqual({
      error: "This evaluation is not currently available.",
      success: false,
    });

    vi.useRealTimers();
  });

  it("rejects submission while Student is ineligible", async () => {
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
    findAssignmentMock.mockResolvedValue(courseBoundAssignment());

    await expect(
      submitStudentEvaluationResponse({ answers: validAnswers, assignmentId: "assignment-1" })
    ).resolves.toEqual({
      error: "This evaluation is not currently available.",
      success: false,
    });
    // The eligibility gate runs before the transaction, so no row is touched.
    expect(findResponseByAssignmentMock).not.toHaveBeenCalled();
  });

  it("rejects an incomplete answer set before opening a transaction", async () => {
    findAssignmentMock.mockResolvedValue(courseBoundAssignment());

    await expect(
      submitStudentEvaluationResponse({
        answers: { "section-a:quantitative:q1": 5 },
        assignmentId: "assignment-1",
      })
    ).rejects.toThrowError("Missing required answers: section-a:qualitative:remarks");
    expect(findResponseByAssignmentMock).not.toHaveBeenCalled();
  });

  it("rejects submissions without an authenticated session", async () => {
    resolveAuthSessionMock.mockResolvedValue(null);

    await expect(
      submitStudentEvaluationResponse({ answers: validAnswers, assignmentId: "assignment-1" })
    ).resolves.toEqual({
      error: "Authentication is required.",
      success: false,
    });
    expect(findAssignmentMock).not.toHaveBeenCalled();
  });

  it("rejects submissions for an assignment the respondent does not hold", async () => {
    findAssignmentMock.mockResolvedValue(null);

    await expect(
      submitStudentEvaluationResponse({ answers: validAnswers, assignmentId: "assignment-1" })
    ).resolves.toEqual({
      error: "Evaluation assignment not found.",
      success: false,
    });
  });

  it("submits a central Student assignment without a Course roster read", async () => {
    findAssignmentMock.mockResolvedValue({
      central_deployment: {
        activation_at: new Date("2026-04-01T00:00:00.000Z"),
        deadline_at: new Date("2026-05-20T00:00:00.000Z"),
        instrument: { structure_snapshot: structureSnapshot },
        status: "ACTIVE",
        target_stakeholder: "STUDENT",
      },
      central_deployment_id: "central-1",
      course_bound: null,
      course_bound_id: null,
      id: "assignment-central",
    });
    findResponseByAssignmentMock.mockResolvedValue(null);
    createMock.mockResolvedValue({ id: "response-central" });
    updateMock.mockResolvedValue({ id: "response-central" });

    await expect(
      submitStudentEvaluationResponse({
        answers: validAnswers,
        assignmentId: "assignment-central",
      })
    ).resolves.toEqual(expect.objectContaining({ responseId: "response-central", success: true }));

    expect(createMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        deployment_id: "central-1",
        deployment_type: "CENTRAL",
      }),
    });
    expect(membershipFindUniqueMock).not.toHaveBeenCalled();
  });
});
