import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildQualitativeUpserts,
  buildQuantitativeUpserts,
  saveStudentCourseBoundDraft,
} from "@/features/responses/services/save-student-course-bound-draft";

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

const section = {
  description: "",
  id: "section-a",
  items: [],
  name: "Section A",
};

describe("buildQuantitativeUpserts", () => {
  it("creates quantitative upserts only for the current section", () => {
    expect(
      buildQuantitativeUpserts({
        answers: {
          "section-a:qualitative:q1": 999,
          "section-a:quantitative:q1": 4,
          "section-a:quantitative:q2": 5,
          "section-b:quantitative:q1": 3,
        },
        responseId: "response-1",
        section,
        updatedAt: "2026-04-20T10:00:00.000Z",
      })
    ).toEqual([
      {
        item_key: "q1",
        rating_value: 4,
        response_id: "response-1",
        section_key: "section-a",
        updated_at: "2026-04-20T10:00:00.000Z",
      },
      {
        item_key: "q2",
        rating_value: 5,
        response_id: "response-1",
        section_key: "section-a",
        updated_at: "2026-04-20T10:00:00.000Z",
      },
    ]);
  });
});

describe("buildQualitativeUpserts", () => {
  it("creates qualitative upserts only for the current section", () => {
    expect(
      buildQualitativeUpserts({
        answers: {
          "section-a:qualitative:remarks": "Keep the class engaging.",
          "section-a:qualitative:suggestions": "Add more lab time.",
          "section-a:quantitative:remarks": "Ignore keys with the wrong kind.",
          "section-b:qualitative:remarks": "Different section should be ignored.",
        },
        responseId: "response-1",
        section,
        updatedAt: "2026-04-20T10:00:00.000Z",
      })
    ).toEqual([
      {
        prompt_key: "remarks",
        response_id: "response-1",
        section_key: "section-a",
        text_content: "Keep the class engaging.",
        updated_at: "2026-04-20T10:00:00.000Z",
      },
      {
        prompt_key: "suggestions",
        response_id: "response-1",
        section_key: "section-a",
        text_content: "Add more lab time.",
        updated_at: "2026-04-20T10:00:00.000Z",
      },
    ]);
  });
});

describe("saveStudentCourseBoundDraft", () => {
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

  it("creates or reuses a draft response and reports success", async () => {
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
        deadline_at: new Date("2026-05-20T00:00:00.000Z"),
        status: "ACTIVE",
      },
    });
    findResponseByAssignmentMock.mockResolvedValue(null);
    createMock.mockResolvedValue({ id: "response-1" });

    await expect(
      saveStudentCourseBoundDraft({
        answers: {
          "section-a:quantitative:q1": 4,
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

  it("rejects draft saves after the assignment has already been submitted", async () => {
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
        deadline_at: new Date("2026-05-20T00:00:00.000Z"),
        status: "ACTIVE",
      },
    });
    findResponseByAssignmentMock.mockResolvedValue({ id: "response-1", status: "SUBMITTED" });

    await expect(
      saveStudentCourseBoundDraft({
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
        activation_at: new Date("2026-05-15T00:00:00.000Z"),
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
        status: "SCHEDULED",
      },
    });
    findResponseByAssignmentMock.mockResolvedValue(null);

    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-10T00:00:00.000Z"));

    await expect(
      saveStudentCourseBoundDraft({
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

  it("keeps an existing draft stored but rejects saves while Student is ineligible", async () => {
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
        instrument: { structure_snapshot: [] },
        status: "ACTIVE",
      },
    });

    await expect(
      saveStudentCourseBoundDraft({
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
});
