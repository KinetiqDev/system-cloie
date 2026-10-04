import { beforeEach, describe, expect, it, vi } from "vitest";
import { saveEvaluationDraft } from "@/features/responses/services/save-evaluation-draft";

const {
  createMock,
  deleteManyQualMock,
  deleteManyQuantMock,
  findAssignmentMock,
  findResponseByAssignmentMock,
  membershipFindUniqueMock,
  resolveAuthSessionMock,
} = vi.hoisted(() => ({
  createMock: vi.fn(),
  deleteManyQualMock: vi.fn(),
  deleteManyQuantMock: vi.fn(),
  findAssignmentMock: vi.fn(),
  findResponseByAssignmentMock: vi.fn(),
  membershipFindUniqueMock: vi.fn(),
  resolveAuthSessionMock: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    evaluationAssignment: {
      findFirst: findAssignmentMock,
    },
    courseAssignmentMembership: {
      findUnique: membershipFindUniqueMock,
    },
    qualitativeResponseItem: {
      createMany: vi.fn(),
      deleteMany: deleteManyQualMock,
    },
    quantitativeResponseItem: {
      createMany: vi.fn(),
      deleteMany: deleteManyQuantMock,
    },
    response: {
      create: createMock,
      findUnique: findResponseByAssignmentMock,
    },
  },
}));

vi.mock("@/features/auth/services/resolve-auth-session", () => ({
  resolveAuthSession: resolveAuthSessionMock,
}));

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
      instrument: {
        structure_snapshot: [
          {
            items: [
              { key: "q1", kind: "quantitative", prompt: "Question 1", scale: [1, 2, 3, 4, 5] },
              { key: "remarks", kind: "qualitative", prompt: "Remarks" },
            ],
            key: "section-a",
            title: "Section A",
          },
          {
            items: [
              { key: "q2", kind: "quantitative", prompt: "Question 2", scale: [1, 2, 3, 4, 5] },
            ],
            key: "section-b",
            title: "Section B",
          },
        ],
      },
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

describe("saveEvaluationDraft", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    membershipFindUniqueMock.mockResolvedValue(eligibleMembership());
    resolveAuthSessionMock.mockResolvedValue({ userId: "user-1" });
  });

  it("creates or reuses a draft response and reports success", async () => {
    findAssignmentMock.mockResolvedValue(courseBoundAssignment());
    findResponseByAssignmentMock.mockResolvedValue(null);
    createMock.mockResolvedValue({ id: "response-1" });

    await expect(
      saveEvaluationDraft("STUDENT", {
        answers: {
          "section-a:quantitative:q1": 4,
          "section-a:qualitative:remarks": "Clear and helpful explanations.",
        },
        assignmentId: "assignment-1",
        sectionKey: "section-a",
      })
    ).resolves.toEqual(
      expect.objectContaining({
        responseId: "response-1",
        success: true,
      })
    );
  });

  it("starts a Course-bound response with the course-bound deployment type", async () => {
    findAssignmentMock.mockResolvedValue(courseBoundAssignment());
    findResponseByAssignmentMock.mockResolvedValue(null);
    createMock.mockResolvedValue({ id: "response-1" });

    await saveEvaluationDraft("STUDENT", {
      answers: { "section-a:quantitative:q1": 4 },
      assignmentId: "assignment-1",
      sectionKey: "section-a",
    });

    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          assignment_id: "assignment-1",
          deployment_id: "course-bound-1",
          deployment_type: "COURSE_BOUND",
          respondent_id: "user-1",
          status: "IN_PROGRESS",
        }),
      })
    );
  });

  it("starts a Central student response with the central deployment type", async () => {
    findAssignmentMock.mockResolvedValue({
      central_deployment: {
        activation_at: new Date("2026-04-01T00:00:00.000Z"),
        central_deployment_id: "central-1",
        deadline_at: new Date("2026-05-20T00:00:00.000Z"),
        instrument: {
          structure_snapshot: [
            {
              items: [
                { key: "q1", kind: "quantitative", prompt: "Question 1", scale: [1, 2, 3, 4, 5] },
              ],
              key: "section-a",
              title: "Section A",
            },
          ],
        },
        status: "ACTIVE",
        target_stakeholder: "STUDENT",
      },
      course_bound: null,
      course_bound_id: null,
      central_deployment_id: "central-1",
      id: "assignment-central",
    });
    findResponseByAssignmentMock.mockResolvedValue(null);
    createMock.mockResolvedValue({ id: "response-central" });

    await expect(
      saveEvaluationDraft("STUDENT", {
        answers: { "section-a:quantitative:q1": 5 },
        assignmentId: "assignment-central",
        sectionKey: "section-a",
      })
    ).resolves.toEqual(expect.objectContaining({ responseId: "response-central", success: true }));

    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          deployment_id: "central-1",
          deployment_type: "CENTRAL",
        }),
      })
    );
    // Central student assignments are not scoped by a Course roster.
    expect(membershipFindUniqueMock).not.toHaveBeenCalled();
  });

  it("replaces only the saved section's items", async () => {
    findAssignmentMock.mockResolvedValue(courseBoundAssignment());
    findResponseByAssignmentMock.mockResolvedValue({ id: "response-1", status: "IN_PROGRESS" });

    await expect(
      saveEvaluationDraft("STUDENT", {
        answers: {
          "section-a:quantitative:q1": 4,
          "section-a:qualitative:remarks": "Clear and helpful explanations.",
          "section-b:quantitative:q2": 5,
        },
        assignmentId: "assignment-1",
        sectionKey: "section-a",
      })
    ).resolves.toEqual(expect.objectContaining({ responseId: "response-1", success: true }));

    // Section B's stored items survive a section-A save.
    expect(deleteManyQuantMock).toHaveBeenCalledWith({
      where: { response_id: "response-1", section_key: "section-a" },
    });
    expect(deleteManyQualMock).toHaveBeenCalledWith({
      where: { response_id: "response-1", section_key: "section-a" },
    });
  });

  it("rejects an unknown section key before touching stored items", async () => {
    findAssignmentMock.mockResolvedValue(courseBoundAssignment());
    findResponseByAssignmentMock.mockResolvedValue({ id: "response-1", status: "IN_PROGRESS" });

    await expect(
      saveEvaluationDraft("STUDENT", {
        answers: {},
        assignmentId: "assignment-1",
        sectionKey: "section-missing",
      })
    ).resolves.toEqual({
      error: "Unknown section section-missing.",
      success: false,
    });
    expect(deleteManyQuantMock).not.toHaveBeenCalled();
    expect(deleteManyQualMock).not.toHaveBeenCalled();
  });

  it("rejects draft saves after the assignment has already been submitted", async () => {
    findAssignmentMock.mockResolvedValue(courseBoundAssignment());
    findResponseByAssignmentMock.mockResolvedValue({ id: "response-1", status: "SUBMITTED" });

    await expect(
      saveEvaluationDraft("STUDENT", {
        answers: { "section-a:quantitative:q1": 4 },
        assignmentId: "assignment-1",
        sectionKey: "section-a",
      })
    ).resolves.toEqual({
      error: "This evaluation has already been submitted.",
      success: false,
    });
  });

  it("rejects draft saves when the course-bound evaluation is unavailable", async () => {
    findAssignmentMock.mockResolvedValue(
      courseBoundAssignment({
        activation_at: new Date("2026-05-15T00:00:00.000Z"),
        deadline_at: new Date("2026-05-20T00:00:00.000Z"),
        status: "SCHEDULED",
      })
    );
    findResponseByAssignmentMock.mockResolvedValue(null);

    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-10T00:00:00.000Z"));

    await expect(
      saveEvaluationDraft("STUDENT", {
        answers: { "section-a:quantitative:q1": 4 },
        assignmentId: "assignment-1",
        sectionKey: "section-a",
      })
    ).resolves.toEqual({
      error: "This evaluation is not currently available.",
      success: false,
    });

    vi.useRealTimers();
  });

  it("rejects a central assignment that does not target Students", async () => {
    findAssignmentMock.mockResolvedValue({
      central_deployment: {
        activation_at: new Date("2026-04-01T00:00:00.000Z"),
        deadline_at: new Date("2026-05-20T00:00:00.000Z"),
        instrument: { structure_snapshot: [] },
        status: "ACTIVE",
        target_stakeholder: "ALUMNI",
      },
      course_bound: null,
      id: "assignment-alumni",
    });

    await expect(
      saveEvaluationDraft("STUDENT", {
        answers: {},
        assignmentId: "assignment-alumni",
        sectionKey: "section-a",
      })
    ).resolves.toEqual({
      error: "Evaluation assignment not found.",
      success: false,
    });
  });

  it("keeps an existing draft stored but rejects saves while Student is ineligible", async () => {
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
      saveEvaluationDraft("STUDENT", {
        answers: {},
        assignmentId: "assignment-1",
        sectionKey: "section-a",
      })
    ).resolves.toEqual({
      error: "This evaluation is not currently available.",
      success: false,
    });
    expect(findResponseByAssignmentMock).not.toHaveBeenCalled();
  });

  it("rejects draft saves without an authenticated session", async () => {
    resolveAuthSessionMock.mockResolvedValue(null);

    await expect(
      saveEvaluationDraft("STUDENT", {
        answers: {},
        assignmentId: "assignment-1",
        sectionKey: "section-a",
      })
    ).resolves.toEqual({
      error: "Authentication is required.",
      success: false,
    });
    expect(findAssignmentMock).not.toHaveBeenCalled();
  });
});
