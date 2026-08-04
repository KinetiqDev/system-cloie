import { beforeEach, describe, expect, it, vi } from "vitest";
import { CourseScope } from "@prisma/client";

import { createAuthSessionSnapshot } from "@/__tests__/helpers/auth-session";
import * as authModule from "@/features/auth/services/resolve-auth-session";
import { ROLES } from "@/lib/constants/roles";
import {
  addRosterMembership,
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
  email: "student@example.com",
  is_active: true,
  roles: [{ role: ROLES.STUDENT }],
  student_profile: { program_id: "program-1", student_id_number: "S00001" },
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
  });

  it("creates eligible Student membership with server-owned scope and audit actor", async () => {
    prismaMock.user.findUnique.mockResolvedValue(student as never);
    prismaMock.courseAssignmentMembership.findUnique.mockResolvedValue(null);

    await expect(addRosterMembership("assignment-1", " STUDENT@EXAMPLE.COM ")).resolves.toEqual({
      success: true,
      data: { outcome: "CREATED", message: "Student added to Course roster." },
    });

    expect(prismaMock.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { email: "student@example.com" } })
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

    await addRosterMembership("assignment-1", "student@example.com");

    expect(prismaMock.$queryRaw).toHaveBeenCalled();
  });

  it("returns distinct active-membership and other-section outcomes", async () => {
    prismaMock.user.findUnique.mockResolvedValue(student as never);
    prismaMock.courseAssignmentMembership.findUnique.mockResolvedValue({
      id: "membership-1",
      is_active: true,
    } as never);
    const facultyResult = await addRosterMembership("assignment-1", "student@example.com");
    expect(facultyResult).toMatchObject({
      success: false,
      error: expect.stringContaining("active member of this"),
    });

    prismaMock.courseAssignmentMembership.findUnique.mockResolvedValue(null);
    prismaMock.courseAssignmentMembership.findFirst.mockResolvedValue({
      id: "other-membership",
    } as never);
    await expect(addRosterMembership("assignment-1", "student@example.com")).resolves.toMatchObject(
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

    await expect(addRosterMembership("assignment-1", "student@example.com")).resolves.toMatchObject(
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

    await expect(addRosterMembership("assignment-1", "student@example.com")).resolves.toEqual({
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
    await expect(addRosterMembership("assignment-1", "student@example.com")).resolves.toMatchObject(
      {
        success: true,
      }
    );

    vi.mocked(authModule.resolveAuthSession).mockResolvedValue(
      createAuthSessionSnapshot({ userId: "faculty-2", roles: [ROLES.FACULTY] })
    );
    await expect(addRosterMembership("assignment-1", "student@example.com")).resolves.toEqual({
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
    await expect(addRosterMembership("assignment-1", "student@example.com", "program-1")).resolves.toMatchObject(
      {
        success: true,
      }
    );

    prismaMock.courseAssignment.findUnique.mockResolvedValue({
      ...assignment,
      course: { course_scope: CourseScope.GENERAL_EDUCATION },
    } as never);
    await expect(
      addRosterMembership("assignment-1", "student@example.com", "program-1")
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
    await expect(addRosterMembership("assignment-1", "student@example.com")).resolves.toEqual({
      success: false,
      error: "This Academic Period is no longer active. The roster is read-only.",
    });

    prismaMock.courseAssignment.findUnique.mockResolvedValue({
      ...assignment,
      course_bound_evaluations: [{ published_at: new Date() }],
    } as never);
    await expect(addRosterMembership("assignment-1", "student@example.com")).resolves.toEqual({
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
      addRosterMembership("assignment-1", "student@example.com", "program-1")
    ).resolves.toEqual({ success: false, error: "Course assignment not found." });
    expect(prismaMock.courseAssignmentMembership.create).not.toHaveBeenCalled();
  });
});
