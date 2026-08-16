import { beforeEach, describe, expect, it, vi } from "vitest";
import { CourseScope } from "@prisma/client";

import { createAuthSessionSnapshot } from "@/__tests__/helpers/auth-session";
import { ROLES } from "@/lib/constants/roles";
import { prisma } from "@/lib/db/prisma";
import { previewCourseRoster } from "@/features/course-assignments/services/preview-course-roster";
import * as authModule from "@/features/auth/services/resolve-auth-session";
import * as rosterModule from "@/features/course-assignments/services/course-assignment-roster";

vi.mock("@/features/auth/services/resolve-auth-session");
vi.mock("@/features/course-assignments/services/course-assignment-roster", async (importOriginal) => {
  const actual = await importOriginal<typeof rosterModule>();
  return {
    ...actual,
    resolveAuthorizedCourseAssignmentRoster: vi.fn(),
  };
});
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    user: { findMany: vi.fn() },
    courseAssignmentMembership: { findMany: vi.fn() },
  },
}));

const ASSIGNMENT = {
  assignmentId: "assignment-1",
  facultyId: "faculty-1",
  courseId: "course-1",
  programId: "program-1",
  termInstanceId: "term-1",
  courseScope: CourseScope.PROGRAM_SPECIFIC,
  isActive: true,
  periodStatus: "ACTIVE" as const,
  hasPublishedEvaluation: false,
  canManage: true,
  canMutate: true,
  mutabilityReason: null,
};

function profile(programId: string) {
  return {
    program_id: programId,
    major_id: null,
    program: { is_active: true, majors: [] },
    major: null,
  };
}

function student(id: string, name: string, programId: string) {
  return {
    id,
    name,
    email: `${id}@school.edu`,
    roles: [{ role: ROLES.STUDENT }],
    is_active: true,
    student_profile: profile(programId),
    enrollments: [{ program_id: programId }],
  };
}

describe("previewCourseRoster service", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.mocked(authModule.resolveAuthSession).mockResolvedValue(
      createAuthSessionSnapshot({ userId: "manager-1", roles: [ROLES.SECRETARY] })
    );
    vi.mocked(rosterModule.resolveAuthorizedCourseAssignmentRoster).mockResolvedValue({
      success: true,
      data: ASSIGNMENT,
    });

    vi.mocked(prisma.user.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.courseAssignmentMembership.findMany).mockResolvedValue([] as never);
  });

  it("authorizes once and loads candidates in one batched Student read plus membership reads", async () => {


    await previewCourseRoster({
      assignmentId: "assignment-1",
      rows: [{ sourceIndex: 0, submittedName: "Andy Egut", status: "VALID" }],
    });

    expect(rosterModule.resolveAuthorizedCourseAssignmentRoster).toHaveBeenCalledTimes(1);
    expect(rosterModule.resolveAuthorizedCourseAssignmentRoster).toHaveBeenCalledWith(
      "assignment-1",
      { manage: true, programId: undefined }
    );
    expect(prisma.user.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.courseAssignmentMembership.findMany).toHaveBeenCalledTimes(2);
  });

  it("scopes the batch to the assignment period and never to year level or section", async () => {


    await previewCourseRoster({
      assignmentId: "assignment-1",
      rows: [{ sourceIndex: 0, submittedName: "Andy Egut", status: "VALID" }],
    });

    const call = vi.mocked(prisma.user.findMany).mock.calls[0]?.[0] as {
      where: Record<string, unknown>;
    };
    expect(call.where).toMatchObject({
      is_active: true,
      student_profile: { isNot: null },
      enrollments: { some: { term_instance_id: "term-1", is_active: true } },
    });
    expect(call.where).not.toHaveProperty("year_level");
    expect(call.where).not.toHaveProperty("section");
  });

  it("classifies an exact match as READY_CREATE for a new membership", async () => {

    vi.mocked(prisma.user.findMany).mockResolvedValue([
      student("student-1", "Andy Egut", "program-1"),
    ] as never);

    const result = await previewCourseRoster({
      assignmentId: "assignment-1",
      rows: [{ sourceIndex: 3, submittedName: "ANDY EGUT", status: "VALID" }],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.rows[0]).toMatchObject({
        sourceIndex: 3,
        resolution: { status: "EXACT_MATCH", reason: "EXACT", candidateIds: ["student-1"] },
        disposition: "READY_CREATE",
      });
      expect(result.data.rows[0]?.candidates[0]).toMatchObject({
        userId: "student-1",
        selectable: true,
        reason: null,
      });
      expect(result.data.summary).toEqual({
        readyToCreate: 1,
        willRestore: 0,
        alreadyActive: 0,
        needsReview: 0,
        ineligible: 0,
      });
    }
  });

  it("treats an irregular Student with matching Program as selectable", async () => {

    vi.mocked(prisma.user.findMany).mockResolvedValue([
      {
        ...student("student-1", "Andy Egut", "program-1"),
        enrollments: [{ program_id: "program-1", year_level: "FIRST_YEAR", section: "MORNING" }],
      },
    ] as never);

    const result = await previewCourseRoster({
      assignmentId: "assignment-1",
      rows: [{ sourceIndex: 0, submittedName: "Andy Egut", status: "VALID" }],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.rows[0]?.disposition).toBe("READY_CREATE");
    }
  });

  it("maps full placement context onto preview candidates", async () => {
    vi.mocked(prisma.user.findMany).mockResolvedValue([
      {
        ...student("student-1", "Andy Egut", "program-1"),
        enrollments: [
          {
            program_id: "program-1",
            year_level: "SECOND_YEAR",
            section: "AFTERNOON",
            program: { code: "BSIT", name: "Bachelor of Science in Information Technology" },
            major: { name: "Software Engineering" },
          },
        ],
      },
    ] as never);

    const result = await previewCourseRoster({
      assignmentId: "assignment-1",
      rows: [{ sourceIndex: 0, submittedName: "Andy Egut", status: "VALID" }],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.rows[0]?.candidates[0]).toMatchObject({
        programCode: "BSIT",
        programName: "Bachelor of Science in Information Technology",
        yearLevel: "SECOND_YEAR",
        section: "AFTERNOON",
        majorName: "Software Engineering",
      });
      for (const row of result.data.rows) {
        for (const candidate of row.candidates) {
          expect(candidate).not.toHaveProperty("studentId");
          expect(candidate).not.toHaveProperty("studentIdNumber");
          expect(candidate).not.toHaveProperty("student_id_number");
        }
      }
    }
    expect(JSON.stringify(result)).not.toMatch(/studentId|studentIdNumber|student_id_number|Student ID/i);
  });

  it("does not disclose a Program-mismatched Student outside the authorized candidate scope", async () => {
    vi.mocked(prisma.user.findMany).mockResolvedValue([
      student("student-2", "Andy Egut", "program-2"),
    ] as never);

    const result = await previewCourseRoster({
      assignmentId: "assignment-1",
      rows: [{ sourceIndex: 0, submittedName: "Andy Egut", status: "VALID" }],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.rows[0]).toEqual({
        sourceIndex: 0,
        submittedName: "Andy Egut",
        resolution: { status: "NO_MATCH", reason: "NO_EVIDENCE", candidateIds: [] },
        disposition: null,
        candidates: [],
      });
    }
  });
  it("does not disclose an out-of-program Student to a Program Head", async () => {
    vi.mocked(authModule.resolveAuthSession).mockResolvedValue(
      createAuthSessionSnapshot({ userId: "manager-1", roles: [ROLES.PROGRAM_HEAD] })
    );
    vi.mocked(prisma.user.findMany).mockResolvedValue([
      student("student-2", "Andy Egut", "program-2"),
    ] as never);

    const result = await previewCourseRoster({
      assignmentId: "assignment-1",
      programId: "program-1",
      rows: [{ sourceIndex: 0, submittedName: "Andy Egut", status: "VALID" }],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.rows[0]).toEqual({
        sourceIndex: 0,
        submittedName: "Andy Egut",
        resolution: { status: "NO_MATCH", reason: "NO_EVIDENCE", candidateIds: [] },
        disposition: null,
        candidates: [],
      });
    }
  });

  it("reports an existing inactive account as ALREADY_ACTIVE", async () => {
    const inactiveMember = {
      ...student("student-1", "Inactive Member", "program-1"),
      is_active: false,
    };
    vi.mocked(prisma.courseAssignmentMembership.findMany)
      .mockResolvedValueOnce([
        {
          student_user_id: "student-1",
          is_active: true,
          removed_at: null,
          student: inactiveMember,
        },
      ] as never)
      .mockResolvedValueOnce([] as never);

    const result = await previewCourseRoster({
      assignmentId: "assignment-1",
      rows: [{ sourceIndex: 0, submittedName: "Inactive Member", status: "VALID" }],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.rows[0]).toMatchObject({
        resolution: { status: "EXACT_MATCH", candidateIds: ["student-1"] },
        disposition: "ALREADY_ACTIVE",
      });
    }
  });

  it("reports an existing member without a current placement as ALREADY_ACTIVE", async () => {
    const memberWithoutPlacement = {
      ...student("student-1", "Unplaced Member", "program-1"),
      enrollments: [],
    };
    vi.mocked(prisma.courseAssignmentMembership.findMany)
      .mockResolvedValueOnce([
        {
          student_user_id: "student-1",
          is_active: true,
          removed_at: null,
          student: memberWithoutPlacement,
        },
      ] as never)
      .mockResolvedValueOnce([] as never);

    const result = await previewCourseRoster({
      assignmentId: "assignment-1",
      rows: [{ sourceIndex: 0, submittedName: "Unplaced Member", status: "VALID" }],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.rows[0]).toMatchObject({
        resolution: { status: "EXACT_MATCH", candidateIds: ["student-1"] },
        disposition: "ALREADY_ACTIVE",
      });
    }
  });

  it("marks repeated exact matches as needing review instead of promising a second create", async () => {
    vi.mocked(prisma.user.findMany).mockResolvedValue([
      student("student-1", "Repeated Student", "program-1"),
    ] as never);

    const result = await previewCourseRoster({
      assignmentId: "assignment-1",
      rows: [
        { sourceIndex: 0, submittedName: "Repeated Student", status: "VALID" },
        { sourceIndex: 1, submittedName: "Repeated Student", status: "VALID" },
      ],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.rows[0]).toMatchObject({
        resolution: { status: "EXACT_MATCH", candidateIds: ["student-1"] },
        disposition: "READY_CREATE",
      });
      expect(result.data.rows[1]).toMatchObject({
        resolution: { status: "DUPLICATE_MATCH", reason: "DUPLICATE_IDENTITY", candidateIds: ["student-1"] },
        disposition: null,
      });
      expect(result.data.summary).toMatchObject({ readyToCreate: 1, needsReview: 1 });
    }
  });

  it("does not disclose a program-mismatched existing member", async () => {
    vi.mocked(prisma.courseAssignmentMembership.findMany)
      .mockResolvedValueOnce([
        {
          student_user_id: "student-2",
          is_active: true,
          removed_at: null,
          student: student("student-2", "Andy Egut", "program-2"),
        },
      ] as never)
      .mockResolvedValueOnce([] as never);

    const result = await previewCourseRoster({
      assignmentId: "assignment-1",
      programId: "program-1",
      rows: [{ sourceIndex: 0, submittedName: "Andy Egut", status: "VALID" }],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.rows[0]).toEqual({
        sourceIndex: 0,
        submittedName: "Andy Egut",
        resolution: { status: "NO_MATCH", reason: "NO_EVIDENCE", candidateIds: [] },
        disposition: null,
        candidates: [],
      });
    }
  });

  it("prefers an exact eligible match over a suggested existing member", async () => {
    vi.mocked(prisma.user.findMany).mockResolvedValue([
      student("student-1", "Andy Egut", "program-1"),
    ] as never);
    vi.mocked(prisma.courseAssignmentMembership.findMany)
      .mockResolvedValueOnce([
        {
          student_user_id: "student-2",
          is_active: true,
          removed_at: null,
          student: student("student-2", "Andy Egut Jr", "program-1"),
        },
      ] as never)
      .mockResolvedValueOnce([] as never);

    const result = await previewCourseRoster({
      assignmentId: "assignment-1",
      rows: [{ sourceIndex: 0, submittedName: "Andy Egut", status: "VALID" }],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.rows[0]).toMatchObject({
        resolution: { status: "EXACT_MATCH", candidateIds: ["student-1"] },
        disposition: "READY_CREATE",
      });
    }
  });

  it("keeps an existing member and a same-name eligible Student ambiguous", async () => {
    vi.mocked(prisma.user.findMany).mockResolvedValue([
      student("student-1", "Andy Egut", "program-1"),
    ] as never);
    vi.mocked(prisma.courseAssignmentMembership.findMany)
      .mockResolvedValueOnce([
        {
          student_user_id: "student-2",
          is_active: true,
          removed_at: null,
          student: student("student-2", "Andy Egut", "program-1"),
        },
      ] as never)
      .mockResolvedValueOnce([] as never);

    const result = await previewCourseRoster({
      assignmentId: "assignment-1",
      rows: [{ sourceIndex: 0, submittedName: "Andy Egut", status: "VALID" }],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.rows[0]?.resolution).toMatchObject({
        status: "AMBIGUOUS",
        reason: "EQUAL_TIER",
      });
      expect(result.data.rows[0]?.resolution.candidateIds).toEqual(
        expect.arrayContaining(["student-1", "student-2"])
      );
      expect(result.data.rows[0]?.disposition).toBeNull();
    }
  });

  it("lets a later exact match keep the identity claimed by an earlier suggestion", async () => {
    vi.mocked(prisma.user.findMany).mockResolvedValue([
      student("student-1", "Maria Therese Reyes", "program-1"),
    ] as never);

    const result = await previewCourseRoster({
      assignmentId: "assignment-1",
      rows: [
        { sourceIndex: 0, submittedName: "MARIA THERESE ANN GONZALES REYES", status: "VALID" },
        { sourceIndex: 1, submittedName: "Maria Therese Reyes", status: "VALID" },
      ],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.rows[0]).toMatchObject({
        resolution: { status: "DUPLICATE_MATCH", reason: "DUPLICATE_IDENTITY", candidateIds: ["student-1"] },
        disposition: null,
      });
      expect(result.data.rows[1]).toMatchObject({
        resolution: { status: "EXACT_MATCH", candidateIds: ["student-1"] },
        disposition: "READY_CREATE",
      });
      expect(result.data.summary).toMatchObject({ readyToCreate: 1, needsReview: 1 });
    }
  });

  it("accepts any active placement for a General Education assignment", async () => {

    vi.mocked(rosterModule.resolveAuthorizedCourseAssignmentRoster).mockResolvedValue({
      success: true,
      data: { ...ASSIGNMENT, courseScope: CourseScope.GENERAL_EDUCATION },
    });
    vi.mocked(prisma.user.findMany).mockResolvedValue([
      student("student-2", "Andy Egut", "program-2"),
    ] as never);

    const result = await previewCourseRoster({
      assignmentId: "assignment-1",
      rows: [{ sourceIndex: 0, submittedName: "Andy Egut", status: "VALID" }],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.rows[0]?.disposition).toBe("READY_CREATE");
    }
  });

  it("suggests a unique middle-token variant with its closed reason", async () => {

    vi.mocked(prisma.user.findMany).mockResolvedValue([
      student("student-1", "Maria Therese Reyes", "program-1"),
    ] as never);

    const result = await previewCourseRoster({
      assignmentId: "assignment-1",
      rows: [{ sourceIndex: 0, submittedName: "MARIA THERESE ANN GONZALES REYES", status: "VALID" }],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.rows[0]?.resolution).toMatchObject({
        status: "SUGGESTED_MATCH",
        reason: "MIDDLE_TOKEN",
        candidateIds: ["student-1"],
      });
      expect(result.data.summary.needsReview).toBe(1);
    }
  });

  it("keeps equal-tier same-name candidates ambiguous", async () => {

    vi.mocked(prisma.user.findMany).mockResolvedValue([
      student("student-1", "Andy Egut", "program-1"),
      student("student-2", "Andy Egut", "program-1"),
    ] as never);

    const result = await previewCourseRoster({
      assignmentId: "assignment-1",
      rows: [{ sourceIndex: 0, submittedName: "Andy Egut", status: "VALID" }],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.rows[0]?.resolution).toMatchObject({
        status: "AMBIGUOUS",
        reason: "EQUAL_TIER",
        candidateIds: ["student-1", "student-2"],
      });
      expect(result.data.rows[0]?.disposition).toBeNull();
    }
  });

  it("reports ALREADY_ACTIVE, WILL_RESTORE, and OTHER_SECTION_CONFLICT dispositions", async () => {

    vi.mocked(prisma.user.findMany).mockResolvedValue([
      student("student-1", "One Student", "program-1"),
      student("student-2", "Two Student", "program-1"),
      student("student-3", "Three Student", "program-1"),
    ] as never);
    vi.mocked(prisma.courseAssignmentMembership.findMany)
      .mockResolvedValueOnce([
        {
          student_user_id: "student-1",
          is_active: true,
          removed_at: null,
          student: student("student-1", "One Student", "program-1"),
        },
        {
          student_user_id: "student-2",
          is_active: false,
          removed_at: new Date("2026-07-01"),
          student: student("student-2", "Two Student", "program-1"),
        }
      ] as never)
      .mockResolvedValueOnce([{ student_user_id: "student-3" }] as never);

    const result = await previewCourseRoster({
      assignmentId: "assignment-1",
      rows: [
        { sourceIndex: 0, submittedName: "One Student", status: "VALID" },
        { sourceIndex: 1, submittedName: "Two Student", status: "VALID" },
        { sourceIndex: 2, submittedName: "Three Student", status: "VALID" },
      ],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.rows[0]?.disposition).toBe("ALREADY_ACTIVE");
      expect(result.data.rows[1]?.disposition).toBe("WILL_RESTORE");
      expect(result.data.rows[2]?.disposition).toBe("OTHER_SECTION_CONFLICT");
      expect(result.data.summary).toMatchObject({
        alreadyActive: 1,
        willRestore: 1,
        ineligible: 1,
      });
    }
  });

  it("reports OTHER_SECTION_CONFLICT ahead of a restorable membership", async () => {
    const { prisma } = vi.mocked(await import("@/lib/db/prisma"));
    vi.mocked(prisma.user.findMany).mockResolvedValue([
      student("student-1", "Moved Student", "program-1"),
    ] as never);
    vi.mocked(prisma.courseAssignmentMembership.findMany)
      .mockResolvedValueOnce([
        {
          student_user_id: "student-1",
          is_active: false,
          removed_at: new Date("2026-07-01"),
          student: student("student-1", "Moved Student", "program-1"),
        },
      ] as never)
      .mockResolvedValueOnce([{ student_user_id: "student-1" }] as never);

    const result = await previewCourseRoster({
      assignmentId: "assignment-1",
      rows: [{ sourceIndex: 0, submittedName: "Moved Student", status: "VALID" }],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      // Confirmation rejects a restore while an active same-Course/period
      // other-section membership exists, so the preview must not promise one.
      expect(result.data.rows[0]?.disposition).toBe("OTHER_SECTION_CONFLICT");
    }
  });

  it("carries INVALID_NAME rows without matching or candidates", async () => {
    vi.mocked(prisma.user.findMany).mockResolvedValue([
      student("student-1", "Andy Egut", "program-1"),
    ] as never);

    const result = await previewCourseRoster({
      assignmentId: "assignment-1",
      rows: [{ sourceIndex: 7, submittedName: "", status: "INVALID_NAME" }],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.rows[0]).toMatchObject({
        sourceIndex: 7,
        resolution: { status: "INVALID_NAME", reason: "INVALID", candidateIds: [] },
        disposition: null,
        candidates: [],
      });
      expect(result.data.summary.needsReview).toBe(1);
    }
  });

  it("performs zero membership writes during preview", async () => {

    vi.mocked(prisma.user.findMany).mockResolvedValue([
      student("student-1", "Andy Egut", "program-1"),
    ] as never);

    const result = await previewCourseRoster({
      assignmentId: "assignment-1",
      rows: [{ sourceIndex: 0, submittedName: "Andy Egut", status: "VALID" }],
    });

    expect(result.success).toBe(true);
    expect(prisma.courseAssignmentMembership.create).toBeUndefined();
    expect(prisma.courseAssignmentMembership.update).toBeUndefined();
  });

  it("does not disclose an assignment outside the selected Program", async () => {

    vi.mocked(rosterModule.resolveAuthorizedCourseAssignmentRoster).mockResolvedValue({
      success: false,
      error: "Course assignment not found.",
    });

    const result = await previewCourseRoster({
      assignmentId: "assignment-1",
      programId: "program-2",
      rows: [{ sourceIndex: 0, submittedName: "Andy Egut", status: "VALID" }],
    });

    expect(result).toEqual({ success: false, error: "Course assignment not found." });
  });
});
