import { beforeEach, describe, expect, it, vi } from "vitest";
import { listStudentAssignedEvaluations } from "@/features/responses/services/list-student-assigned-evaluations";

const { findManyMock, membershipFindManyMock, resolveAuthSessionMock } = vi.hoisted(() => ({
  findManyMock: vi.fn(),
  membershipFindManyMock: vi.fn(),
  resolveAuthSessionMock: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    evaluationAssignment: {
      findMany: findManyMock,
    },
    courseAssignmentMembership: {
      findMany: membershipFindManyMock,
    },
  },
}));

vi.mock("@/features/auth/services/resolve-auth-session", () => ({
  resolveAuthSession: resolveAuthSessionMock,
}));

describe("listStudentAssignedEvaluations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty lists without a session and does not query assignments", async () => {
    resolveAuthSessionMock.mockResolvedValue(null);

    await expect(listStudentAssignedEvaluations()).resolves.toEqual({
      active: [],
      submitted: [],
    });
    expect(findManyMock).not.toHaveBeenCalled();
    expect(membershipFindManyMock).not.toHaveBeenCalled();
  });

  it("includes graduating-student central deployments alongside course-bound work", async () => {
    resolveAuthSessionMock.mockResolvedValue({ userId: "student-1" });
    findManyMock.mockResolvedValue([
      {
        central_deployment: {
          activation_at: new Date("2026-04-01T00:00:00.000Z"),
          deadline_at: new Date("2026-05-20T00:00:00.000Z"),
          instrument: {
            structure_snapshot: [{ key: "section-a", title: "Section A" }],
            template: { name: "Graduating Student Exit Survey" },
          },
          major: { name: "Software Engineering" },
          program: { code: "BSIT", name: "Information Technology" },
          status: "ACTIVE",
          target_stakeholder: "STUDENT",
          year_level: "FOURTH_YEAR",
        },
        course_bound: null,
        id: "assignment-central-1",
        response: {
          id: "response-central-1",
          qual_items: [],
          quant_items: [{ id: "quant-1" }],
          submitted_at: null,
        },
      },
    ]);

    const result = await listStudentAssignedEvaluations();

    expect(result).toEqual({
      active: [
        expect.objectContaining({
          assignmentId: "assignment-central-1",
          courseTitle: null,
          deploymentType: "CENTRAL",
          evaluationTitle: "Graduating Student Exit Survey",
          href: "/student/evaluations/assignment-central-1",
          programLabel: "BSIT • Software Engineering • 4th Year",
          status: "IN_PROGRESS",
        }),
      ],
      submitted: [],
    });
  });

  it("batches course-bound eligibility while preserving central and submitted assignments", async () => {
    resolveAuthSessionMock.mockResolvedValue({ userId: "student-1" });
    membershipFindManyMock.mockResolvedValue([
      {
        course_assignment_id: "course-assignment-eligible",
        is_active: true,
        student: {
          enrollments: [{ program_id: "program-1", term_instance_id: "term-1" }],
          is_active: true,
          roles: [{ role: "STUDENT" }],
          student_profile: {
            program_id: "program-1",
            major_id: null,
            program: { is_active: true, majors: [] },
            major: null,
          },
        },
      },
      {
        course_assignment_id: "course-assignment-ineligible",
        is_active: true,
        student: {
          enrollments: [{ program_id: "program-2", term_instance_id: "term-1" }],
          is_active: true,
          roles: [{ role: "STUDENT" }],
          student_profile: {
            program_id: "program-2",
            major_id: null,
            program: { is_active: true, majors: [] },
            major: null,
          },
        },
      },
    ]);
    findManyMock.mockResolvedValue([
      {
        central_deployment: null,
        course_bound: {
          activation_at: new Date("2026-04-01T00:00:00.000Z"),
          course_assignment: {
            id: "course-assignment-eligible",
            program_id: "program-1",
            term_instance_id: "term-1",
            course: { course_scope: "PROGRAM_SPECIFIC", major: null, title: "Capstone 1" },
            program: { name: "BSIT" },
            faculty: { name: "Ada Lovelace" },
          },
          deadline_at: new Date("2027-06-20T00:00:00.000Z"),
          deployment_name: "Eligible Course Evaluation",
          instrument: {
            structure_snapshot: [{ key: "section-a", title: "Section A" }],
            template: { name: "Course Evaluation" },
          },
          status: "ACTIVE",
        },
        id: "assignment-eligible",
        response: null,
      },
      {
        central_deployment: null,
        course_bound: {
          activation_at: new Date("2026-04-01T00:00:00.000Z"),
          course_assignment: {
            id: "course-assignment-ineligible",
            program_id: "program-1",
            term_instance_id: "term-1",
            course: { course_scope: "PROGRAM_SPECIFIC", major: null, title: "Networks" },
            program: { name: "BSIT" },
            faculty: { name: "Grace Hopper" },
          },
          deadline_at: new Date("2027-06-20T00:00:00.000Z"),
          deployment_name: "Ineligible Course Evaluation",
          instrument: {
            structure_snapshot: [{ key: "section-b", title: "Section B" }],
            template: { name: "Course Evaluation" },
          },
          status: "ACTIVE",
        },
        id: "assignment-ineligible",
        response: null,
      },
      {
        central_deployment: null,
        course_bound: {
          activation_at: new Date("2026-04-01T00:00:00.000Z"),
          course_assignment: {
            id: "course-assignment-submitted",
            program_id: "program-1",
            term_instance_id: "term-1",
            course: { course_scope: "PROGRAM_SPECIFIC", major: null, title: "Databases" },
            program: { name: "BSIT" },
            faculty: { name: "Alan Turing" },
          },
          deadline_at: new Date("2027-05-01T00:00:00.000Z"),
          deployment_name: "Submitted Course Evaluation",
          instrument: {
            structure_snapshot: [{ key: "section-c", title: "Section C" }],
            template: { name: "Course Evaluation" },
          },
          status: "ACTIVE",
        },
        id: "assignment-submitted",
        response: {
          id: "response-submitted",
          qual_items: [],
          quant_items: [],
          submitted_at: new Date("2026-05-02T00:00:00.000Z"),
        },
      },
      {
        central_deployment: {
          activation_at: new Date("2026-04-01T00:00:00.000Z"),
          deadline_at: new Date("2027-06-20T00:00:00.000Z"),
          instrument: {
            structure_snapshot: [{ key: "section-d", title: "Section D" }],
            template: { name: "Central Evaluation" },
          },
          major: null,
          program: { code: "BSIT", name: "Information Technology" },
          status: "ACTIVE",
          target_stakeholder: "STUDENT",
          year_level: null,
        },
        course_bound: null,
        id: "assignment-central",
        response: null,
      },
    ]);

    const result = await listStudentAssignedEvaluations();

    expect(result.active.map((item) => item.assignmentId)).toEqual([
      "assignment-eligible",
      "assignment-central",
    ]);
    expect(result.active[0]).toEqual(
      expect.objectContaining({
        assignmentId: "assignment-eligible",
        facultyName: "Ada Lovelace",
      })
    );
    expect(result.active[0]).not.toHaveProperty("firstName");
    expect(result.active[0]).not.toHaveProperty("lastName");
    expect(result.submitted).toEqual([
      expect.objectContaining({
        assignmentId: "assignment-submitted",
        facultyName: "Alan Turing",
        href: "/student/history/response-submitted",
        status: "SUBMITTED",
      }),
    ]);
    expect(membershipFindManyMock).toHaveBeenCalledTimes(1);
    expect(membershipFindManyMock).toHaveBeenCalledWith({
      where: {
        course_assignment_id: {
          in: ["course-assignment-eligible", "course-assignment-ineligible"],
        },
        student_user_id: "student-1",
      },
      select: expect.any(Object),
    });
  });

  it("keeps submitted evaluations visible when the linked curriculum version is retired", async () => {
    resolveAuthSessionMock.mockResolvedValue({ userId: "student-1" });
    findManyMock.mockResolvedValue([
      {
        central_deployment: null,
        course_bound: {
          activation_at: new Date("2026-04-01T00:00:00.000Z"),
          course_assignment: {
            id: "course-assignment-retired",
            program_id: "program-1",
            term_instance_id: "term-1",
            course: { course_scope: "PROGRAM_SPECIFIC", major: null, title: "Legacy Course" },
            program: { name: "BSIT" },
            faculty: { name: "Alan Turing" },
          },
          deadline_at: new Date("2026-05-01T00:00:00.000Z"),
          deployment_name: "Retired Curriculum Evaluation",
          instrument: {
            structure_snapshot: [{ key: "section-c", title: "Section C" }],
            template: { name: "Course Evaluation" },
          },
          status: "ACTIVE",
        },
        id: "assignment-retired",
        response: {
          id: "response-retired",
          qual_items: [],
          quant_items: [],
          submitted_at: new Date("2026-05-02T00:00:00.000Z"),
        },
      },
    ]);

    const result = await listStudentAssignedEvaluations();

    const findManyArgs = findManyMock.mock.calls[0][0] as { where: Record<string, unknown> };
    expect(findManyArgs.where).not.toHaveProperty("curriculumCourse");
    expect(JSON.stringify(findManyArgs.where)).not.toContain("curriculum_version");
    expect(result.active).toEqual([]);
    expect(result.submitted).toEqual([
      expect.objectContaining({
        assignmentId: "assignment-retired",
        href: "/student/history/response-retired",
        status: "SUBMITTED",
      }),
    ]);
  });

  it("renders published snapshot labels over drifted live Course and Faculty records", async () => {
    resolveAuthSessionMock.mockResolvedValue({ userId: "student-1" });
    membershipFindManyMock.mockResolvedValue([
      {
        course_assignment_id: "course-assignment-snapshot",
        is_active: true,
        student: {
          enrollments: [{ program_id: "program-1", term_instance_id: "term-1" }],
          is_active: true,
          roles: [{ role: "STUDENT" }],
          student_profile: {
            program_id: "program-1",
            major_id: null,
            program: { is_active: true, majors: [] },
            major: null,
          },
        },
      },
    ]);
    findManyMock.mockResolvedValue([
      {
        central_deployment: null,
        course_bound: {
          activation_at: new Date("2026-04-01T00:00:00.000Z"),
          course_assignment: {
            course_scope: "PROGRAM_SPECIFIC",
            id: "course-assignment-snapshot",
            program_id: "program-1",
            term_instance_id: "term-1",
            course: { major: null, title: "Capstone 1 (renamed)" },
            faculty: { name: "Current Faculty" },
            program: { name: "Information Technology" },
          },
          course_info_snapshot: {
            assignmentContextSource: "PUBLICATION",
            capturedAt: "2025-06-01T00:00:00.000Z",
            courseAssignmentId: "course-assignment-snapshot",
            courseCode: "IT-401",
            courseId: "course-1",
            courseScope: "PROGRAM_SPECIFIC",
            courseTitle: "Capstone 1 (previous edition)",
            facultyId: "faculty-1",
            facultyName: "Previous Faculty",
            majorId: null,
            majorName: null,
            programCode: "BSIT",
            programId: "program-1",
            programName: "BS Information Technology",
            schoolYearCode: "2025-2026",
            semester: "SECOND",
            section: "MORNING",
            snapshotSchemaVersion: 2,
            term: null,
            termInstanceId: "term-1",
            yearLevel: "FOURTH_YEAR",
          },
          deadline_at: new Date("2026-05-20T00:00:00.000Z"),
          deployment_name: "Post-Term CILO Evaluation Tool",
          instrument: { structure_snapshot: [], template: { name: "Course Evaluation" } },
          status: "ACTIVE",
        },
        id: "assignment-snapshot",
        response: null,
      },
    ]);

    const result = await listStudentAssignedEvaluations();

    expect(result.active[0]).toMatchObject({
      courseTitle: "Capstone 1 (previous edition)",
      facultyName: "Previous Faculty",
      programLabel: "BS Information Technology",
    });
  });

  it("marks an untouched assignment DUE_SOON within three days, but not a started one", async () => {
    resolveAuthSessionMock.mockResolvedValue({ userId: "student-1" });
    membershipFindManyMock.mockResolvedValue([
      {
        course_assignment_id: "course-assignment-due",
        is_active: true,
        student: {
          enrollments: [{ program_id: "program-1", term_instance_id: "term-1" }],
          is_active: true,
          roles: [{ role: "STUDENT" }],
          student_profile: {
            program_id: "program-1",
            major_id: null,
            program: { is_active: true, majors: [] },
            major: null,
          },
        },
      },
      {
        course_assignment_id: "course-assignment-started",
        is_active: true,
        student: {
          enrollments: [{ program_id: "program-1", term_instance_id: "term-1" }],
          is_active: true,
          roles: [{ role: "STUDENT" }],
          student_profile: {
            program_id: "program-1",
            major_id: null,
            program: { is_active: true, majors: [] },
            major: null,
          },
        },
      },
      {
        course_assignment_id: "course-assignment-far",
        is_active: true,
        student: {
          enrollments: [{ program_id: "program-1", term_instance_id: "term-1" }],
          is_active: true,
          roles: [{ role: "STUDENT" }],
          student_profile: {
            program_id: "program-1",
            major_id: null,
            program: { is_active: true, majors: [] },
            major: null,
          },
        },
      },
    ]);
    const withinThreeDays = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    findManyMock.mockResolvedValue([
      {
        central_deployment: null,
        course_bound: {
          activation_at: new Date("2026-04-01T00:00:00.000Z"),
          course_assignment: {
            course_scope: "PROGRAM_SPECIFIC",
            id: "course-assignment-due",
            program_id: "program-1",
            term_instance_id: "term-1",
            course: { major: null, title: "Due Course" },
            faculty: { name: "Ada Lovelace" },
            program: { name: "BSIT" },
          },
          course_info_snapshot: null,
          deadline_at: withinThreeDays,
          deployment_name: "Due Soon Evaluation",
          instrument: {
            structure_snapshot: [{ key: "section-a", title: "Section A" }],
            template: { name: "Course Evaluation" },
          },
          status: "ACTIVE",
        },
        id: "assignment-due",
        response: null,
      },
      {
        central_deployment: null,
        course_bound: {
          activation_at: new Date("2026-04-01T00:00:00.000Z"),
          course_assignment: {
            course_scope: "PROGRAM_SPECIFIC",
            id: "course-assignment-started",
            program_id: "program-1",
            term_instance_id: "term-1",
            course: { major: null, title: "Started Course" },
            faculty: { name: "Alan Turing" },
            program: { name: "BSIT" },
          },
          course_info_snapshot: null,
          deadline_at: withinThreeDays,
          deployment_name: "Started Evaluation",
          instrument: {
            structure_snapshot: [
              {
                key: "section-b",
                title: "Section B",
                questions: [{ key: "q1", prompt: "Question 1", type: "likert" }],
              },
            ],
            template: { name: "Course Evaluation" },
          },
          status: "ACTIVE",
        },
        id: "assignment-started",
        response: {
          id: "response-started",
          qual_items: [],
          quant_items: [{ id: "quant-1" }],
          submitted_at: null,
        },
      },
      {
        central_deployment: null,
        course_bound: {
          activation_at: new Date("2026-04-01T00:00:00.000Z"),
          course_assignment: {
            course_scope: "PROGRAM_SPECIFIC",
            id: "course-assignment-far",
            program_id: "program-1",
            term_instance_id: "term-1",
            course: { major: null, title: "Far Course" },
            faculty: { name: "Grace Hopper" },
            program: { name: "BSIT" },
          },
          course_info_snapshot: null,
          deadline_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          deployment_name: "Far Evaluation",
          instrument: {
            structure_snapshot: [{ key: "section-c", title: "Section C" }],
            template: { name: "Course Evaluation" },
          },
          status: "ACTIVE",
        },
        id: "assignment-far",
        response: null,
      },
    ]);

    const result = await listStudentAssignedEvaluations();

    // DUE_SOON is precedence, not merely a deadline check: an already-started
    // response stays IN_PROGRESS even inside the three-day window, and a
    // deadline beyond it stays NOT_STARTED.
    const byId = new Map(result.active.map((item) => [item.assignmentId, item]));
    expect(byId.get("assignment-due")).toMatchObject({ progress: 0, status: "DUE_SOON" });
    expect(byId.get("assignment-started")).toMatchObject({
      progress: 100,
      status: "IN_PROGRESS",
    });
    expect(byId.get("assignment-far")).toMatchObject({ progress: 0, status: "NOT_STARTED" });
  });
});
