import { describe, expect, it, vi } from "vitest";
import { YearLevel } from "@prisma/client";
import { listStudentsForClass } from "@/features/enrollments/services/list-students-for-class";
import * as authModule from "@/features/auth/services/resolve-auth-session";
import { ROLES } from "@/lib/constants/roles";
import { createAuthSessionSnapshot } from "@/__tests__/helpers/auth-session";

vi.mock("@/features/auth/services/resolve-auth-session");
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    studentEnrollment: {
      findMany: vi.fn(),
    },
  },
}));

describe("list-students-for-class", () => {
  const mockFacultySession = createAuthSessionSnapshot({
    userId: "faculty-1",
    email: "faculty@test.com",
    roles: [ROLES.FACULTY],
  });

  const mockStudentSession = createAuthSessionSnapshot({
    userId: "student-1",
    email: "student@test.com",
    roles: [ROLES.STUDENT],
  });

  it("should return error when student tries to access", async () => {
    vi.mocked(authModule.resolveAuthSession).mockResolvedValue(mockStudentSession);

    const result = await listStudentsForClass({
      termInstanceId: "term-1",
      programId: "program-1",
      yearLevel: YearLevel.FIRST_YEAR,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Access denied");
    }
  });

  it("should return students for faculty", async () => {
    vi.mocked(authModule.resolveAuthSession).mockResolvedValue(mockFacultySession);

    const { prisma } = await import("@/lib/db/prisma");
    vi.mocked(prisma.studentEnrollment.findMany).mockResolvedValue([
      {
        student_user_id: "student-1",
        id: "enrollment-1",
        major_id: "major-1",
        student: {
          id: "student-1",
          email: "student1@test.com",
          name: "John Doe",
          student_profile: {
            student_id_number: "S001",
          },
        },
        major: {
          id: "major-1",
          name: "Computer Science",
        },
      },
    ] as never);

    const result = await listStudentsForClass({
      termInstanceId: "term-1",
      programId: "program-1",
      yearLevel: YearLevel.FIRST_YEAR,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe("John Doe");
    }
  });

  it("should filter by section when provided", async () => {
    vi.mocked(authModule.resolveAuthSession).mockResolvedValue(mockFacultySession);

    const { prisma } = await import("@/lib/db/prisma");
    vi.mocked(prisma.studentEnrollment.findMany).mockResolvedValue([] as never);

    await listStudentsForClass({
      termInstanceId: "term-1",
      programId: "program-1",
      yearLevel: YearLevel.FIRST_YEAR,
      section: "MORNING",
    });

    expect(prisma.studentEnrollment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          section: "MORNING",
        }),
      })
    );
  });

  it("projects opaque complete names including compound and punctuation values", async () => {
    vi.mocked(authModule.resolveAuthSession).mockResolvedValue(mockFacultySession);

    const { prisma } = await import("@/lib/db/prisma");
    vi.mocked(prisma.studentEnrollment.findMany).mockResolvedValue([
      {
        student_user_id: "student-2",
        id: "enrollment-2",
        major_id: null,
        student: {
          id: "student-2",
          email: "mary@test.com",
          name: "Mary Anne O'Connor",
          student_profile: {
            student_id_number: "S002",
          },
        },
        major: null,
      },
      {
        student_user_id: "student-3",
        id: "enrollment-3",
        major_id: null,
        student: {
          id: "student-3",
          email: "prince@test.com",
          name: "Prince",
          student_profile: {
            student_id_number: null,
          },
        },
        major: null,
      },
    ] as never);

    const result = await listStudentsForClass({
      termInstanceId: "term-1",
      programId: "program-1",
      yearLevel: YearLevel.FIRST_YEAR,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.map((s) => s.name)).toEqual(["Mary Anne O'Connor", "Prince"]);
    }
    expect(prisma.studentEnrollment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ student: { name: "asc" } }, { student_user_id: "asc" }],
      })
    );
  });

});