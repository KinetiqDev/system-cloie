import { describe, expect, it, vi } from "vitest";
import { listCourseAssignmentsForFaculty } from "@/features/course-assignments/services/list-course-assignments-for-faculty";
import * as authModule from "@/features/auth/services/resolve-auth-session";
import { ROLES } from "@/lib/constants/roles";
import { createAuthSessionSnapshot } from "@/__tests__/helpers/auth-session";

vi.mock("@/features/auth/services/resolve-auth-session");
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    courseAssignment: {
      findMany: vi.fn(),
    },
  },
}));

describe("list-course-assignments-for-faculty", () => {
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

  it("should return assignments grouped by course", async () => {
    vi.mocked(authModule.resolveAuthSession).mockResolvedValue(mockFacultySession);

    const { prisma } = await import("@/lib/db/prisma");
    vi.mocked(prisma.courseAssignment.findMany).mockResolvedValue([
      {
        id: "assignment-1",
        course_id: "course-1",
        course: { id: "course-1", code: "CS101", title: "Intro to CS" },
        program: { code: "CS" },
        term_instance: { school_year: { code: "2025-2026" } },
        year_level: "FIRST_YEAR",
        section: "MORNING",
      },
      {
        id: "assignment-2",
        course_id: "course-1",
        course: { id: "course-1", code: "CS101", title: "Intro to CS" },
        program: { code: "CS" },
        term_instance: { school_year: { code: "2024-2025" } },
        year_level: "FIRST_YEAR",
        section: "AFTERNOON",
      },
      {
        id: "assignment-3",
        course_id: "course-2",
        course: { id: "course-2", code: "CS201", title: "Data Structures" },
        program: { code: "CS" },
        term_instance: { school_year: { code: "2025-2026" } },
        year_level: "SECOND_YEAR",
        section: null,
      },
    ] as never);

    const result = await listCourseAssignmentsForFaculty();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(2); // 2 courses
      
      const cs101 = result.data.find((c) => c.courseCode === "CS101");
      expect(cs101).toBeDefined();
      expect(cs101?.assignments).toHaveLength(2);
      
      const cs201 = result.data.find((c) => c.courseCode === "CS201");
      expect(cs201).toBeDefined();
      expect(cs201?.assignments).toHaveLength(1);
    }
  });

  it("should deny access for students", async () => {
    vi.mocked(authModule.resolveAuthSession).mockResolvedValue(mockStudentSession);

    const result = await listCourseAssignmentsForFaculty();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Access denied");
    }
  });

  it("uses active role instead of another role in the session", async () => {
    vi.mocked(authModule.resolveAuthSession).mockResolvedValue({
      ...createAuthSessionSnapshot({
        userId: "faculty-1",
        email: "faculty@test.com",
        roles: [ROLES.SECRETARY, ROLES.FACULTY],
      }),
      activeRole: ROLES.STUDENT,
    });

    const result = await listCourseAssignmentsForFaculty();

    expect(result).toEqual({ success: false, error: "Access denied." });
  });

  it("should allow faculty to view their own assignments", async () => {
    vi.mocked(authModule.resolveAuthSession).mockResolvedValue(mockFacultySession);

    const { prisma } = await import("@/lib/db/prisma");
    vi.mocked(prisma.courseAssignment.findMany).mockResolvedValue([] as never);

    const result = await listCourseAssignmentsForFaculty();

    expect(result.success).toBe(true);
  });
});
