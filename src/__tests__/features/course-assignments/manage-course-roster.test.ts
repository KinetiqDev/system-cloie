import { beforeEach, describe, expect, it, vi } from "vitest";
import { CourseScope } from "@prisma/client";

import { createAuthSessionSnapshot } from "@/__tests__/helpers/auth-session";
import * as authModule from "@/features/auth/services/resolve-auth-session";
import { ROLES } from "@/lib/constants/roles";
import {
  addRosterMembership,
  confirmRosterResolution,
  preflightRosterConfirmation,
  removeRosterMembership,
  restoreRosterMembership,
} from "@/features/course-assignments/services/manage-course-roster";

const assignment = {
  id: "assignment-1",
  faculty_id: "faculty-1",
  course_id: "course-1",
  program_id: "program-1",
  term_instance_id: "term-1",
  is_active: true,
  course: { course_scope: CourseScope.PROGRAM_SPECIFIC },
  term_instance: { status: "ACTIVE" },
  course_bound_evaluations: [],
};

const student = {
  id: "student-1",
  is_active: true,
  roles: [{ role: ROLES.STUDENT }],
  student_profile: {
    program_id: "program-1",
    major_id: null,
    program: { is_active: true, majors: [] },
    major: null,
  },
  enrollments: [{ program_id: "program-1" }],
};

const prismaMock = vi.hoisted(() => ({
  $transaction: vi.fn(),
  $queryRaw: vi.fn(),
  courseAssignment: { findUnique: vi.fn() },
  courseAssignmentMembership: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  programHeadAssignment: { findMany: vi.fn() },
  program: { findUnique: vi.fn() },
  user: { findUnique: vi.fn() },
}));
const programHeadContextMock = vi.hoisted(() => vi.fn());
const scopedCandidatesMock = vi.hoisted(() => vi.fn());

vi.mock("@/features/auth/services/resolve-auth-session");
vi.mock("@/lib/db/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/features/auth/services/resolve-program-head-context", () => ({
  resolveProgramHeadContext: programHeadContextMock,
  revalidateProgramHeadAssignment: vi.fn(async (_tx, input) => ({
    id: input.programId,
    code: "BSED",
    name: "Education",
  })),
}));
vi.mock("@/features/course-assignments/services/course-roster-candidate-scope", () => ({
  loadScopedRosterCandidates: scopedCandidatesMock,
}));

describe("manage course roster service", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(authModule.resolveAuthSession).mockResolvedValue(
      createAuthSessionSnapshot({ userId: "manager-1", roles: [ROLES.SECRETARY] })
    );
    prismaMock.$transaction.mockImplementation(async (callback) => callback(prismaMock));
    prismaMock.courseAssignment.findUnique.mockResolvedValue(assignment as never);
    prismaMock.$queryRaw.mockResolvedValue([]);
    prismaMock.program.findUnique.mockResolvedValue({ id: "program-1", code: "BSED", name: "Education" });
    prismaMock.courseAssignmentMembership.findFirst.mockResolvedValue(null);
    scopedCandidatesMock.mockResolvedValue({
      success: true,
      data: {
        assignment: { assignmentId: "assignment-1" },
        candidates: [
          { userId: "student-1", selectable: true },
          { userId: "student-2", selectable: true },
          { userId: "student-3", selectable: true },
        ],
      },
    });
  });

  it("creates eligible Student membership with server-owned scope and audit actor", async () => {
    prismaMock.user.findUnique.mockResolvedValue(student as never);
    prismaMock.courseAssignmentMembership.findUnique.mockResolvedValue(null);

    await expect(addRosterMembership("assignment-1", "student-1")).resolves.toEqual({
      success: true,
      data: { outcome: "CREATED", message: "Student added to Course roster." },
    });

    expect(prismaMock.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "student-1" } })
    );
    expect(prismaMock.courseAssignmentMembership.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        course_assignment_id: "assignment-1",
        student_user_id: "student-1",
        course_id: "course-1",
        term_instance_id: "term-1",
        program_id: "program-1",
        created_by: "manager-1",
        updated_by: "manager-1",
      }),
    });
  });

  it("locks assignment rows with UUID-safe SQL before writes", async () => {
    prismaMock.user.findUnique.mockResolvedValue(student as never);
    prismaMock.courseAssignmentMembership.findUnique.mockResolvedValue(null);

    await addRosterMembership("assignment-1", "student-1");

    expect(prismaMock.$queryRaw).toHaveBeenCalled();
  });

  it("returns distinct active-membership and other-section outcomes", async () => {
    prismaMock.user.findUnique.mockResolvedValue(student as never);
    prismaMock.courseAssignmentMembership.findUnique.mockResolvedValue({
      id: "membership-1",
      is_active: true,
    } as never);
    const facultyResult = await addRosterMembership("assignment-1", "student-1");
    expect(facultyResult).toMatchObject({
      success: false,
      error: expect.stringContaining("active member of this"),
    });

    prismaMock.courseAssignmentMembership.findUnique.mockResolvedValue(null);
    prismaMock.courseAssignmentMembership.findFirst.mockResolvedValue({
      id: "other-membership",
    } as never);
    await expect(addRosterMembership("assignment-1", "student-1")).resolves.toMatchObject(
      {
        success: false,
        error: expect.stringContaining("another section"),
      }
    );
  });

  it("restores membership without replacing creation provenance", async () => {
    prismaMock.courseAssignmentMembership.findUnique.mockResolvedValueOnce({
      id: "membership-1",
      course_assignment_id: "assignment-1",
      student_user_id: "student-1",
      is_active: false,
      created_by: "original-creator",
      created_at: new Date("2026-07-01T00:00:00Z"),
    } as never);
    prismaMock.user.findUnique.mockResolvedValue(student as never);

    await expect(restoreRosterMembership("assignment-1", "membership-1")).resolves.toMatchObject({
      success: true,
      data: { outcome: "RESTORED" },
    });
    expect(prismaMock.courseAssignmentMembership.update).toHaveBeenCalledWith({
      where: { id: "membership-1" },
      data: {
        is_active: true,
        updated_by: "manager-1",
        removed_by: null,
        removed_at: null,
      },
    });
  });

  it("soft-removes membership with removal audit fields", async () => {
    prismaMock.courseAssignmentMembership.findUnique.mockResolvedValue({
      id: "membership-1",
      course_assignment_id: "assignment-1",
      is_active: true,
    } as never);

    await expect(removeRosterMembership("assignment-1", "membership-1")).resolves.toMatchObject({
      success: true,
      data: { outcome: "REMOVED" },
    });
    expect(prismaMock.courseAssignmentMembership.update).toHaveBeenCalledWith({
      where: { id: "membership-1" },
      data: expect.objectContaining({
        is_active: false,
        updated_by: "manager-1",
        removed_by: "manager-1",
        removed_at: expect.any(Date),
      }),
    });
  });

  it("maps unique races to safe cross-section result", async () => {
    prismaMock.user.findUnique.mockResolvedValue(student as never);
    prismaMock.courseAssignmentMembership.findUnique.mockResolvedValue(null);
    prismaMock.courseAssignmentMembership.create.mockRejectedValue({ code: "P2002" });

    await expect(addRosterMembership("assignment-1", "student-1")).resolves.toMatchObject(
      {
        success: false,
        error: expect.stringContaining("another section"),
      }
    );
  });

  it("blocks writes after assignment lifecycle changes are observed in transaction", async () => {
    prismaMock.courseAssignment.findUnique.mockResolvedValue({
      ...assignment,
      is_active: false,
    } as never);
    prismaMock.user.findUnique.mockResolvedValue(student as never);

    await expect(addRosterMembership("assignment-1", "student-1")).resolves.toEqual({
      success: false,
      error: "This Course assignment is inactive. The roster is read-only.",
    });
    expect(prismaMock.courseAssignmentMembership.create).not.toHaveBeenCalled();
  });

  it("applies Faculty ownership and Program Head scope from active role", async () => {
    prismaMock.user.findUnique.mockResolvedValue(student as never);
    prismaMock.courseAssignmentMembership.findUnique.mockResolvedValue(null);

    vi.mocked(authModule.resolveAuthSession).mockResolvedValue(
      createAuthSessionSnapshot({ userId: "faculty-1", roles: [ROLES.FACULTY] })
    );
    await expect(addRosterMembership("assignment-1", "student-1")).resolves.toMatchObject(
      {
        success: true,
      }
    );

    vi.mocked(authModule.resolveAuthSession).mockResolvedValue(
      createAuthSessionSnapshot({ userId: "faculty-2", roles: [ROLES.FACULTY] })
    );
    await expect(addRosterMembership("assignment-1", "student-1")).resolves.toEqual({
      success: false,
      error: "Course assignment not found.",
    });

    vi.mocked(authModule.resolveAuthSession).mockResolvedValue(
      createAuthSessionSnapshot({ userId: "head-1", roles: [ROLES.PROGRAM_HEAD] })
    );
    prismaMock.programHeadAssignment.findMany.mockResolvedValue([
      { program_id: "program-1" },
    ] as never);
    prismaMock.$queryRaw.mockResolvedValue([{ is_active: true, program_id: "program-1" }]);
    programHeadContextMock.mockResolvedValue({
      success: true,
      data: {
        userId: "head-1",
        authorizedPrograms: [],
        selectedProgram: { id: "program-1", code: "BSED", name: "Education" },
      },
    });
    await expect(addRosterMembership("assignment-1", "student-1", "program-1")).resolves.toMatchObject(
      {
        success: true,
      }
    );

    prismaMock.courseAssignment.findUnique.mockResolvedValue({
      ...assignment,
      course: { course_scope: CourseScope.GENERAL_EDUCATION },
    } as never);
    await expect(
      addRosterMembership("assignment-1", "student-1", "program-1")
    ).resolves.toEqual({
      success: false,
      error: "Program Heads cannot manage General Education assignments.",
    });
  });

  it("blocks completed-period and published-evaluation writes with lifecycle messages", async () => {
    prismaMock.courseAssignment.findUnique.mockResolvedValue({
      ...assignment,
      term_instance: { status: "COMPLETED" },
    } as never);
    await expect(addRosterMembership("assignment-1", "student-1")).resolves.toEqual({
      success: false,
      error: "This Academic Period is no longer active. The roster is read-only.",
    });

    prismaMock.courseAssignment.findUnique.mockResolvedValue({
      ...assignment,
      course_bound_evaluations: [{ published_at: new Date() }],
    } as never);
    await expect(addRosterMembership("assignment-1", "student-1")).resolves.toEqual({
      success: false,
      error:
        "A Course-bound evaluation has been published for this assignment. The roster is locked.",
    });
  });

  it("rejects a selected Program write when the assignment is revoked in the transaction", async () => {
    vi.mocked(authModule.resolveAuthSession).mockResolvedValue(
      createAuthSessionSnapshot({ userId: "head-1", roles: [ROLES.PROGRAM_HEAD] })
    );
    programHeadContextMock.mockResolvedValue({
      success: true,
      data: {
        userId: "head-1",
        authorizedPrograms: [],
        selectedProgram: { id: "program-1", code: "BSED", name: "Education" },
      },
    });
    const { revalidateProgramHeadAssignment } = await import(
      "@/features/auth/services/resolve-program-head-context"
    );
    vi.mocked(revalidateProgramHeadAssignment).mockResolvedValueOnce(null);
    prismaMock.programHeadAssignment.findMany.mockResolvedValue([
      { program_id: "program-1" },
    ] as never);
    prismaMock.courseAssignment.findUnique.mockResolvedValue(assignment as never);

    await expect(
      addRosterMembership("assignment-1", "student-1", "program-1")
    ).resolves.toEqual({ success: false, error: "Course assignment not found." });
    expect(prismaMock.courseAssignmentMembership.create).not.toHaveBeenCalled();
  });
});

describe("confirmRosterResolution", () => {
  const confirmation = {
    assignmentId: "assignment-1",
    rows: [
      { sourceIndex: 0, studentUserId: "student-1" },
      { sourceIndex: 1, studentUserId: "student-2" },
    ],
    skippedIndexes: [],
    suggestedAcknowledged: true,
  };

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(authModule.resolveAuthSession).mockResolvedValue(
      createAuthSessionSnapshot({ userId: "manager-1", roles: [ROLES.SECRETARY] })
    );
    prismaMock.$transaction.mockImplementation(async (callback) => callback(prismaMock));
    prismaMock.courseAssignment.findUnique.mockResolvedValue(assignment as never);
    prismaMock.$queryRaw.mockResolvedValue([]);
    prismaMock.program.findUnique.mockResolvedValue({ id: "program-1", code: "BSED", name: "Education" });
    prismaMock.courseAssignmentMembership.findUnique.mockResolvedValue(null);
    prismaMock.courseAssignmentMembership.findFirst.mockResolvedValue(null);
    scopedCandidatesMock.mockResolvedValue({
      success: true,
      data: {
        assignment: { assignmentId: "assignment-1" },
        candidates: [
          { userId: "student-1", selectable: true },
          { userId: "student-2", selectable: true },
          { userId: "student-3", selectable: true },
        ],
      },
    });
  });

  it("continues after an expected other-section conflict", async () => {
    prismaMock.user.findUnique.mockImplementation(async ({ where }) => ({
      ...student,
      id: where.id,
    }) as never);
    prismaMock.courseAssignmentMembership.findFirst
      .mockResolvedValueOnce({ id: "other-membership" } as never)
      .mockResolvedValueOnce(null);

    await expect(confirmRosterResolution(confirmation)).resolves.toEqual({
      success: true,
      data: {
        rows: [
          {
            sourceIndex: 0,
            outcome: "OTHER_SECTION_CONFLICT",
            error: "Student is already active in another section for this Course and Academic Period.",
          },
          {
            sourceIndex: 1,
            outcome: "CREATED",
            error: null,
          },
        ],
        referenceId: undefined,
      },
    });
    expect(prismaMock.courseAssignmentMembership.create).toHaveBeenCalledTimes(1);
  });

  it("continues after an account loses its Student role", async () => {
    prismaMock.user.findUnique
      .mockResolvedValueOnce({ ...student, roles: [{ role: ROLES.FACULTY }] } as never)
      .mockResolvedValueOnce({ ...student, id: "student-2" } as never);

    await expect(confirmRosterResolution(confirmation)).resolves.toEqual({
      success: true,
      data: {
        rows: [
          { sourceIndex: 0, outcome: "OUT_OF_SCOPE", error: "Account is not a Student account." },
          { sourceIndex: 1, outcome: "CREATED", error: null },
        ],
      },
    });
    expect(prismaMock.courseAssignmentMembership.create).toHaveBeenCalledTimes(1);
  });

  it("reports an out-of-scope row and commits later valid identities", async () => {
    scopedCandidatesMock.mockResolvedValue({
      success: true,
      data: {
        assignment: { assignmentId: "assignment-1" },
        candidates: [{ userId: "student-2", selectable: true }],
      },
    });
    prismaMock.user.findUnique.mockImplementation(async ({ where }) => ({
      ...student,
      id: where.id,
    }) as never);

    await expect(confirmRosterResolution(confirmation)).resolves.toEqual({
      success: true,
      data: {
        rows: [
          {
            sourceIndex: 0,
            outcome: "OUT_OF_SCOPE",
            error: "Selected account is no longer eligible for this Course roster.",
          },
          { sourceIndex: 1, outcome: "CREATED", error: null },
        ],
      },
    });
    expect(prismaMock.courseAssignmentMembership.create).toHaveBeenCalledTimes(1);
  });

  it("rejects a read-only roster before loading candidates or writing rows", async () => {
    prismaMock.courseAssignment.findUnique.mockResolvedValue({
      ...assignment,
      is_active: false,
    } as never);

    await expect(confirmRosterResolution(confirmation)).resolves.toEqual({
      success: false,
      error: "This Course assignment is inactive. The roster is read-only.",
    });
    expect(scopedCandidatesMock).not.toHaveBeenCalled();
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("returns a request-level read-only result if the roster locks after preflight", async () => {
    prismaMock.courseAssignment.findUnique
      .mockResolvedValueOnce(assignment as never)
      .mockResolvedValueOnce({ ...assignment, is_active: false } as never);

    await expect(confirmRosterResolution(confirmation)).resolves.toEqual({
      success: false,
      error: "This Course assignment is inactive. The roster is read-only.",
    });
    expect(prismaMock.courseAssignmentMembership.create).not.toHaveBeenCalled();
  });

  it("preserves prior commits and marks later rows unprocessed after an unexpected failure", async () => {
    prismaMock.user.findUnique.mockImplementation(async ({ where }) => ({
      ...student,
      id: where.id,
    }) as never);
    prismaMock.courseAssignmentMembership.create
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error("database unavailable"));
    scopedCandidatesMock.mockResolvedValue({
      success: true,
      data: {
        assignment: { assignmentId: "assignment-1" },
        candidates: [
          { userId: "student-1", selectable: true },
          { userId: "student-2", selectable: true },
          { userId: "student-3", selectable: true },
        ],
      },
    });
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const result = await confirmRosterResolution({
      ...confirmation,
      rows: [...confirmation.rows, { sourceIndex: 2, studentUserId: "student-3" }],
    });

    expect(result).toMatchObject({
      success: true,
      data: {
        rows: [
          { sourceIndex: 0, outcome: "CREATED", error: null },
          { sourceIndex: 1, outcome: "UNEXPECTED_FAILURE" },
          { sourceIndex: 2, outcome: "UNPROCESSED" },
        ],
        referenceId: expect.any(String),
      },
    });
    expect(prismaMock.courseAssignmentMembership.create).toHaveBeenCalledTimes(2);
    consoleError.mockRestore();
  });

  it("stops unknown safe mutation failures rather than treating them as a conflict", async () => {
    prismaMock.user.findUnique.mockImplementation(async ({ where }) => ({
      ...student,
      id: where.id,
    }) as never);
    prismaMock.courseAssignmentMembership.create.mockRejectedValueOnce(new Error("database unavailable"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const result = await confirmRosterResolution({
      ...confirmation,
      rows: [...confirmation.rows, { sourceIndex: 2, studentUserId: "student-3" }],
    });

    expect(result).toMatchObject({
      success: true,
      data: {
        rows: [
          { sourceIndex: 0, outcome: "UNEXPECTED_FAILURE", error: "The roster request could not be completed." },
          { sourceIndex: 1, outcome: "UNPROCESSED" },
          { sourceIndex: 2, outcome: "UNPROCESSED" },
        ],
      },
    });
    consoleError.mockRestore();
  });
});

describe("preflightRosterConfirmation", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(authModule.resolveAuthSession).mockResolvedValue(
      createAuthSessionSnapshot({ userId: "manager-1", roles: [ROLES.SECRETARY] })
    );
    prismaMock.courseAssignment.findUnique.mockResolvedValue(assignment as never);
    prismaMock.$transaction.mockImplementation(async (callback) => callback(prismaMock));
    prismaMock.$queryRaw.mockResolvedValue([]);
    prismaMock.courseAssignmentMembership.findFirst.mockResolvedValue(null);
  });

  it("reauthorizes a mutable assignment for confirmation", async () => {
    await expect(preflightRosterConfirmation("assignment-1")).resolves.toEqual({
      success: true,
      data: { assignmentId: "assignment-1" },
    });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("rejects a read-only roster before any write", async () => {
    prismaMock.courseAssignment.findUnique.mockResolvedValue({
      ...assignment,
      course_bound_evaluations: [{ published_at: new Date("2026-08-01T00:00:00Z") }],
    } as never);

    const result = await preflightRosterConfirmation("assignment-1");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/locked/i);
    }
  });

  it("does not disclose an assignment the actor cannot manage", async () => {
    vi.mocked(authModule.resolveAuthSession).mockResolvedValue(
      createAuthSessionSnapshot({ userId: "other-faculty", roles: [ROLES.FACULTY] })
    );

    await expect(preflightRosterConfirmation("assignment-1")).resolves.toEqual({
      success: false,
      error: "Course assignment not found.",
    });
  });

  it("reports an unknown Student account id safely", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null as never);

    await expect(addRosterMembership("assignment-1", "unknown-student")).resolves.toEqual({
      success: false,
      error: "No matching account was found.",
    });
  });
});
