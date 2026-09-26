import { beforeEach, describe, expect, it, vi } from "vitest";
import { getStudentAssignedEvaluationSession } from "@/features/responses/services/get-student-assigned-evaluation-session";

const { findFirstMock, membershipFindUniqueMock, resolveAuthSessionMock } = vi.hoisted(() => ({
  findFirstMock: vi.fn(),
  membershipFindUniqueMock: vi.fn(),
  resolveAuthSessionMock: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    evaluationAssignment: {
      findFirst: findFirstMock,
    },
    courseAssignmentMembership: {
      findUnique: membershipFindUniqueMock,
    },
  },
}));

vi.mock("@/features/auth/services/resolve-auth-session", () => ({
  resolveAuthSession: resolveAuthSessionMock,
}));

const COURSE_ASSIGNMENT_ID = "course-assignment-1";

type AssignedEvaluationFixture = {
  central_deployment: null;
  course_bound: Record<string, unknown>;
  id: string;
  response: {
    id: string;
    qual_items: Array<{ prompt_key: string; section_key: string; text_content: string }>;
    quant_items: Array<{ item_key: string; rating_value: number; section_key: string }>;
    submitted_at: Date | null;
  } | null;
};

function activeCourseBoundAssignment(
  overrides: Record<string, unknown> = {}
): AssignedEvaluationFixture {
  return {
    central_deployment: null,
    course_bound: {
      activation_at: new Date("2026-04-01T00:00:00.000Z"),
      course_assignment: {
        course: { major: null, title: "Introduction to Computing" },
        id: COURSE_ASSIGNMENT_ID,
        major_id: null,
        program: { name: "BSIT" },
        program_id: "program-1",
        term_instance_id: "term-1",
      },
      deadline_at: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      deployment_name: "Post-Term CILO Evaluation",
      instrument: {
        structure_snapshot: [
          {
            key: "section-a",
            questions: [{ key: "q1", prompt: "Question 1", type: "likert" }],
            title: "Section A",
          },
        ],
        template: { name: "Course Evaluation" },
      },
      status: "ACTIVE",
      ...overrides,
    },
    id: "assignment-1",
    response: null,
  };
}

function eligibleMembership() {
  return {
    is_active: true,
    student: {
      enrollments: [{ program_id: "program-1", term_instance_id: "term-1" }],
      is_active: true,
      roles: [{ role: "STUDENT" }],
      student_profile: {
        major: null,
        major_id: null,
        program: { is_active: true, majors: [] },
        program_id: "program-1",
      },
    },
  };
}

describe("getStudentAssignedEvaluationSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveAuthSessionMock.mockResolvedValue({ userId: "student-1" });
    membershipFindUniqueMock.mockResolvedValue(eligibleMembership());
  });

  it("returns null without a session and does not read an assignment", async () => {
    resolveAuthSessionMock.mockResolvedValue(null);

    await expect(getStudentAssignedEvaluationSession("assignment-1")).resolves.toBeNull();
    expect(findFirstMock).not.toHaveBeenCalled();
  });

  it("scopes the assignment read to the acting Student", async () => {
    findFirstMock.mockResolvedValue(activeCourseBoundAssignment());

    await getStudentAssignedEvaluationSession("assignment-1");

    const args = findFirstMock.mock.calls[0][0] as { where: Record<string, unknown> };
    expect(args.where).toMatchObject({ id: "assignment-1", respondent_id: "student-1" });
  });

  it("prepares the frozen structure and saved answers for a member Student", async () => {
    findFirstMock.mockResolvedValue(activeCourseBoundAssignment());

    const result = await getStudentAssignedEvaluationSession("assignment-1");

    expect(result).toMatchObject({
      assignmentId: "assignment-1",
      courseTitle: "Introduction to Computing",
      deploymentType: "COURSE_BOUND",
      programLabel: "BSIT",
      session: { answeredItems: 0, responseId: null, submittedAt: null, totalItems: 1 },
    });
    expect(result?.sections).toHaveLength(1);
    expect(result?.savedAnswers).toEqual({});
  });

  it("labels the session from the publication snapshot over drifted live records", async () => {
    const drifted = activeCourseBoundAssignment({
      course_info_snapshot: {
        assignmentContextSource: "PUBLICATION",
        capturedAt: "2025-06-01T00:00:00.000Z",
        courseAssignmentId: COURSE_ASSIGNMENT_ID,
        courseCode: "IT-101",
        courseId: "course-1",
        courseScope: "PROGRAM_SPECIFIC",
        courseTitle: "Introduction to Computing (previous edition)",
        facultyId: "faculty-1",
        facultyName: "Previous Faculty",
        majorId: null,
        majorName: null,
        programCode: "BSIT",
        programId: "program-1",
        programName: "BS Information Technology",
        schoolYearCode: "2025-2026",
        semester: "FIRST",
        section: "MORNING",
        snapshotSchemaVersion: 2,
        term: null,
        termInstanceId: "term-1",
        yearLevel: "FIRST_YEAR",
      },
    });
    findFirstMock.mockResolvedValue(drifted);

    const result = await getStudentAssignedEvaluationSession("assignment-1");

    expect(result).toMatchObject({
      courseTitle: "Introduction to Computing (previous edition)",
      programLabel: "BS Information Technology",
    });
  });

  it("denies access once the Student's Course-assignment membership is inactive", async () => {
    findFirstMock.mockResolvedValue(activeCourseBoundAssignment());
    membershipFindUniqueMock.mockResolvedValue({ is_active: false, student: null });

    await expect(getStudentAssignedEvaluationSession("assignment-1")).resolves.toBeNull();
  });

  it("denies access outside the deployment availability window while unsubmitted", async () => {
    findFirstMock.mockResolvedValue(
      activeCourseBoundAssignment({
        activation_at: new Date("2025-01-01T00:00:00.000Z"),
        deadline_at: new Date("2025-02-01T00:00:00.000Z"),
      })
    );

    await expect(getStudentAssignedEvaluationSession("assignment-1")).resolves.toBeNull();
    // The window gate returns before any membership read.
    expect(membershipFindUniqueMock).not.toHaveBeenCalled();
  });

  it("keeps a submitted Course-bound response readable after the window closes", async () => {
    const submitted = activeCourseBoundAssignment({
      activation_at: new Date("2025-01-01T00:00:00.000Z"),
      deadline_at: new Date("2025-02-01T00:00:00.000Z"),
      status: "CLOSED",
    });
    submitted.response = {
      id: "response-1",
      qual_items: [],
      quant_items: [{ item_key: "q1", rating_value: 4, section_key: "section-a" }],
      submitted_at: new Date("2025-01-15T00:00:00.000Z"),
    };
    findFirstMock.mockResolvedValue(submitted);

    const result = await getStudentAssignedEvaluationSession("assignment-1");

    expect(result?.session).toMatchObject({
      answeredItems: 1,
      responseId: "response-1",
      submittedAt: new Date("2025-01-15T00:00:00.000Z"),
      totalItems: 1,
    });
    expect(result?.savedAnswers).toEqual({ "section-a:quantitative:q1": 4 });
    // The window and membership gates both govern answering only, so a
    // submitted response neither reads membership nor 404s on a closed window.
    expect(membershipFindUniqueMock).not.toHaveBeenCalled();
  });

  it("keeps a submitted Course-bound response readable after membership is lost", async () => {
    const submitted = activeCourseBoundAssignment();
    submitted.response = {
      id: "response-2",
      qual_items: [],
      quant_items: [],
      submitted_at: new Date("2026-04-15T00:00:00.000Z"),
    };
    findFirstMock.mockResolvedValue(submitted);
    membershipFindUniqueMock.mockResolvedValue({ is_active: false, student: null });

    const result = await getStudentAssignedEvaluationSession("assignment-1");

    expect(result?.session).toMatchObject({ responseId: "response-2" });
    expect(membershipFindUniqueMock).not.toHaveBeenCalled();
  });

  it("keeps a submitted Central response readable after the window closes", async () => {
    findFirstMock.mockResolvedValue({
      central_deployment: {
        activation_at: new Date("2025-01-01T00:00:00.000Z"),
        deadline_at: new Date("2025-02-01T00:00:00.000Z"),
        deployment_name: "Graduating Student Exit Survey",
        instrument: {
          structure_snapshot: [{ key: "section-a", title: "Section A" }],
          template: { name: "Exit Survey" },
        },
        major: null,
        program: { code: "BSIT", name: "Information Technology" },
        status: "CLOSED",
        target_stakeholder: "STUDENT",
        year_level: null,
      },
      course_bound: null,
      id: "assignment-central",
      response: {
        id: "response-central",
        qual_items: [],
        quant_items: [],
        submitted_at: new Date("2025-01-15T00:00:00.000Z"),
      },
    });

    const result = await getStudentAssignedEvaluationSession("assignment-central");

    expect(result?.session).toMatchObject({
      responseId: "response-central",
      submittedAt: new Date("2025-01-15T00:00:00.000Z"),
    });
    expect(result?.deploymentType).toBe("CENTRAL");
  });

  it("reads an in-window response as a resumable draft with its saved answers", async () => {
    const draft = activeCourseBoundAssignment();
    draft.response = {
      id: "response-draft",
      qual_items: [{ prompt_key: "remarks", section_key: "section-a", text_content: "Good" }],
      quant_items: [{ item_key: "q1", rating_value: 5, section_key: "section-a" }],
      submitted_at: null,
    };
    findFirstMock.mockResolvedValue(draft);

    const result = await getStudentAssignedEvaluationSession("assignment-1");

    expect(result?.session).toMatchObject({
      answeredItems: 2,
      responseId: "response-draft",
      submittedAt: null,
    });
    expect(result?.savedAnswers).toEqual({
      "section-a:qualitative:remarks": "Good",
      "section-a:quantitative:q1": 5,
    });
  });
});
