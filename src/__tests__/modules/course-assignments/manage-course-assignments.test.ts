import { beforeEach, describe, expect, it, vi } from "vitest";
import { StudentSection, YearLevel } from "@prisma/client";
import { ROLES } from "@/lib/constants/roles";
import { createPrismaUniqueConstraintError } from "@/__tests__/helpers/prisma-test-helpers";
import { createAuthSessionSnapshot } from "@/__tests__/helpers/auth-session";
import {
  createCourseAssignment,
  updateCourseAssignment,
  deactivateCourseAssignment,
  bulkCreateCourseAssignments,
} from "@/features/course-assignments/services/manage-course-assignments";
import * as authModule from "@/features/auth/services/resolve-auth-session";

vi.mock("@/features/auth/services/resolve-auth-session");
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    courseAssignment: {
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
    },
    course: {
      findUnique: vi.fn(),
    },
    programHeadAssignment: {
      findMany: vi.fn(),
    },
  },
}));

describe("manage-course-assignments", () => {
  const mockAdminSession = createAuthSessionSnapshot({
    userId: "admin-1",
    email: "secretary@test.com",
    roles: [ROLES.SECRETARY],
  });

  const mockProgramHeadSession = createAuthSessionSnapshot({
    userId: "ph-1",
    email: "ph@test.com",
    roles: [ROLES.PROGRAM_HEAD],
  });

  const mockFacultySession = createAuthSessionSnapshot({
    userId: "faculty-1",
    email: "faculty@test.com",
    roles: [ROLES.FACULTY],
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createCourseAssignment", () => {
    it("should allow admin to create assignment", async () => {
      vi.mocked(authModule.resolveAuthSession).mockResolvedValue(mockAdminSession);

      const { prisma } = await import("@/lib/db/prisma");
      vi.mocked(prisma.course.findUnique).mockResolvedValue({
        id: "course-1",
        program_id: "program-1",
      } as never);
      vi.mocked(prisma.courseAssignment.findFirst).mockResolvedValue(null as never);
      vi.mocked(prisma.courseAssignment.create).mockResolvedValue({ id: "assignment-1" } as never);

      const result = await createCourseAssignment({
        termInstanceId: "term-1",
        facultyId: "faculty-1",
        courseId: "course-1",
        programId: "program-1",
        yearLevel: YearLevel.FIRST_YEAR,
        section: StudentSection.MORNING,
      });

      expect(result.success).toBe(true);
    });

    it("should return error when faculty tries to create assignment", async () => {
      vi.mocked(authModule.resolveAuthSession).mockResolvedValue(mockFacultySession);

      const { prisma } = await import("@/lib/db/prisma");
      vi.mocked(prisma.course.findUnique).mockResolvedValue({
        id: "course-1",
        program_id: "program-1",
      } as never);

      const result = await createCourseAssignment({
        termInstanceId: "term-1",
        facultyId: "faculty-1",
        courseId: "course-1",
        programId: "program-1",
        yearLevel: YearLevel.FIRST_YEAR,
        section: StudentSection.MORNING,
      });

      expect(result.success).toBe(false);
    });

    it("should allow Program Head to create an assignment within their program scope", async () => {
      vi.mocked(authModule.resolveAuthSession).mockResolvedValue(mockProgramHeadSession);

      const { prisma } = await import("@/lib/db/prisma");
      vi.mocked(prisma.programHeadAssignment.findMany).mockResolvedValue([
        { program_id: "program-1" },
      ] as never);
      vi.mocked(prisma.course.findUnique).mockResolvedValue({
        id: "course-1",
        program_id: "program-1",
      } as never);
      vi.mocked(prisma.courseAssignment.create).mockResolvedValue({ id: "assignment-1" } as never);

      const result = await createCourseAssignment({
        termInstanceId: "term-1",
        facultyId: "faculty-1",
        courseId: "course-1",
        programId: "program-1",
        yearLevel: YearLevel.FIRST_YEAR,
        section: StudentSection.MORNING,
      });

      expect(result.success).toBe(true);
    });

    it("should reject Program Head creation of a General Education assignment", async () => {
      vi.mocked(authModule.resolveAuthSession).mockResolvedValue(mockProgramHeadSession);

      const { prisma } = await import("@/lib/db/prisma");
      vi.mocked(prisma.programHeadAssignment.findMany).mockResolvedValue([
        { program_id: "program-1" },
      ] as never);
      vi.mocked(prisma.course.findUnique).mockResolvedValue({
        id: "ge-course",
        program_id: null,
      } as never);

      const result = await createCourseAssignment({
        termInstanceId: "term-1",
        facultyId: "faculty-1",
        courseId: "ge-course",
        programId: "program-1",
        yearLevel: YearLevel.FIRST_YEAR,
        section: StudentSection.MORNING,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toMatch(/Program Heads cannot manage General Education assignments/i);
      }
    });

    it("should allow secretary to create a General Education assignment for a program", async () => {
      vi.mocked(authModule.resolveAuthSession).mockResolvedValue(mockAdminSession);

      const { prisma } = await import("@/lib/db/prisma");
      vi.mocked(prisma.course.findUnique).mockResolvedValue({
        id: "ge-course",
        program_id: null,
      } as never);
      vi.mocked(prisma.courseAssignment.create).mockResolvedValue({ id: "assignment-1" } as never);

      const result = await createCourseAssignment({
        termInstanceId: "term-1",
        facultyId: "faculty-1",
        courseId: "ge-course",
        programId: "program-1",
        yearLevel: YearLevel.FIRST_YEAR,
        section: StudentSection.MORNING,
      });

      expect(result.success).toBe(true);
      expect(prisma.courseAssignment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            course_id: "ge-course",
            program_id: "program-1",
          }),
        })
      );
    });

    it("should reject assignment creation when programId differs from the Course's owning program", async () => {
      vi.mocked(authModule.resolveAuthSession).mockResolvedValue(mockProgramHeadSession);

      const { prisma } = await import("@/lib/db/prisma");
      vi.mocked(prisma.programHeadAssignment.findMany).mockResolvedValue([
        { program_id: "program-1" },
      ] as never);
      vi.mocked(prisma.course.findUnique).mockResolvedValue({
        id: "course-1",
        program_id: "program-1",
      } as never);

      const result = await createCourseAssignment({
        termInstanceId: "term-1",
        facultyId: "faculty-1",
        courseId: "course-1",
        programId: "program-2",
        yearLevel: YearLevel.FIRST_YEAR,
        section: StudentSection.MORNING,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("must match");
      }
    });

    it("should allow Program Head to assign a cross-program faculty member", async () => {
      vi.mocked(authModule.resolveAuthSession).mockResolvedValue(mockProgramHeadSession);

      const { prisma } = await import("@/lib/db/prisma");
      vi.mocked(prisma.programHeadAssignment.findMany).mockResolvedValue([
        { program_id: "program-1" },
      ] as never);
      vi.mocked(prisma.course.findUnique).mockResolvedValue({
        id: "course-1",
        program_id: "program-1",
      } as never);
      vi.mocked(prisma.courseAssignment.create).mockResolvedValue({ id: "assignment-1" } as never);

      const result = await createCourseAssignment({
        termInstanceId: "term-1",
        facultyId: "faculty-other-program",
        courseId: "course-1",
        programId: "program-1",
        yearLevel: YearLevel.FIRST_YEAR,
        section: StudentSection.MORNING,
      });

      expect(result.success).toBe(true);
    });

    it("should handle unique constraint violation", async () => {
      vi.mocked(authModule.resolveAuthSession).mockResolvedValue(mockAdminSession);

      const { prisma } = await import("@/lib/db/prisma");
      vi.mocked(prisma.course.findUnique).mockResolvedValue({
        id: "course-1",
        program_id: "program-1",
      } as never);
      vi.mocked(prisma.courseAssignment.findFirst).mockResolvedValue(null as never);
      vi.mocked(prisma.courseAssignment.create).mockRejectedValue(
        createPrismaUniqueConstraintError()
      );

      const result = await createCourseAssignment({
        termInstanceId: "term-1",
        facultyId: "faculty-1",
        courseId: "course-1",
        programId: "program-1",
        yearLevel: YearLevel.FIRST_YEAR,
        section: StudentSection.MORNING,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("already exists");
      }
    });
  });

  describe("updateCourseAssignment", () => {
    it("should allow admin to update assignment", async () => {
      vi.mocked(authModule.resolveAuthSession).mockResolvedValue(mockAdminSession);

      const { prisma } = await import("@/lib/db/prisma");
      vi.mocked(prisma.courseAssignment.findUnique).mockResolvedValue({
        id: "assignment-1",
        course: { program_id: "program-1" },
      } as never);
      vi.mocked(prisma.courseAssignment.update).mockResolvedValue({ id: "assignment-1" } as never);

      const result = await updateCourseAssignment({
        assignmentId: "assignment-1",
        yearLevel: YearLevel.SECOND_YEAR,
      });

      expect(result.success).toBe(true);
    });

    it("should allow secretary to update a General Education assignment program", async () => {
      vi.mocked(authModule.resolveAuthSession).mockResolvedValue(mockAdminSession);

      const { prisma } = await import("@/lib/db/prisma");
      vi.mocked(prisma.courseAssignment.findUnique).mockResolvedValue({
        id: "assignment-1",
        course: { program_id: null },
      } as never);
      vi.mocked(prisma.courseAssignment.update).mockResolvedValue({ id: "assignment-1" } as never);

      const result = await updateCourseAssignment({
        assignmentId: "assignment-1",
        programId: "program-1",
      });

      expect(result.success).toBe(true);
      expect(prisma.courseAssignment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ program_id: "program-1" }),
        })
      );
    });
  });

  describe("deactivateCourseAssignment", () => {
    it("should allow admin to deactivate assignment", async () => {
      vi.mocked(authModule.resolveAuthSession).mockResolvedValue(mockAdminSession);

      const { prisma } = await import("@/lib/db/prisma");
      vi.mocked(prisma.courseAssignment.findUnique).mockResolvedValue({
        id: "assignment-1",
        course: { program_id: "program-1" },
      } as never);
      vi.mocked(prisma.courseAssignment.update).mockResolvedValue({ id: "assignment-1" } as never);

      const result = await deactivateCourseAssignment("assignment-1");

      expect(result.success).toBe(true);
    });
  });

  describe("bulkCreateCourseAssignments", () => {
    it("should return success=true when some assignments are created despite errors", async () => {
      vi.mocked(authModule.resolveAuthSession).mockResolvedValue(mockAdminSession);

      const { prisma } = await import("@/lib/db/prisma");
      vi.mocked(prisma.course.findUnique)
        .mockResolvedValueOnce({ id: "course-1", program_id: "program-1" } as never)
        .mockResolvedValueOnce({ id: "course-2", program_id: "program-1" } as never)
        .mockResolvedValueOnce({ id: "course-3", program_id: "program-1" } as never);
      vi.mocked(prisma.courseAssignment.create)
        .mockResolvedValueOnce({ id: "assignment-1" } as never)
        .mockRejectedValueOnce(createPrismaUniqueConstraintError())
        .mockResolvedValueOnce({ id: "assignment-3" } as never);

      const result = await bulkCreateCourseAssignments([
        {
          termInstanceId: "term-1",
          facultyId: "faculty-1",
          courseId: "course-1",
          programId: "program-1",
          yearLevel: YearLevel.FIRST_YEAR,
          section: StudentSection.MORNING,
        },
        {
          termInstanceId: "term-1",
          facultyId: "faculty-2",
          courseId: "course-2",
          programId: "program-1",
          yearLevel: YearLevel.FIRST_YEAR,
          section: StudentSection.MORNING,
        },
        {
          termInstanceId: "term-1",
          facultyId: "faculty-3",
          courseId: "course-3",
          programId: "program-1",
          yearLevel: YearLevel.FIRST_YEAR,
          section: StudentSection.MORNING,
        },
      ]);

      expect(result.success).toBe(true);
      expect(result.created).toBe(2);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toContain("already exists");
      expect(result.errors[0].error).toContain("activate it instead");
    });

    it("should return success=false when every assignment fails", async () => {
      vi.mocked(authModule.resolveAuthSession).mockResolvedValue(mockAdminSession);

      const { prisma } = await import("@/lib/db/prisma");
      vi.mocked(prisma.course.findUnique)
        .mockResolvedValueOnce({ id: "course-1", program_id: "program-1" } as never)
        .mockResolvedValueOnce({ id: "course-2", program_id: "program-1" } as never);
      vi.mocked(prisma.courseAssignment.create)
        .mockRejectedValueOnce(createPrismaUniqueConstraintError())
        .mockRejectedValueOnce(createPrismaUniqueConstraintError());

      const result = await bulkCreateCourseAssignments([
        {
          termInstanceId: "term-1",
          facultyId: "faculty-1",
          courseId: "course-1",
          programId: "program-1",
          yearLevel: YearLevel.FIRST_YEAR,
          section: StudentSection.MORNING,
        },
        {
          termInstanceId: "term-1",
          facultyId: "faculty-2",
          courseId: "course-2",
          programId: "program-1",
          yearLevel: YearLevel.FIRST_YEAR,
          section: StudentSection.MORNING,
        },
      ]);

      expect(result.success).toBe(false);
      expect(result.created).toBe(0);
      expect(result.errors).toHaveLength(2);
    });

    it("should allow secretary to bulk create General Education assignments", async () => {
      vi.mocked(authModule.resolveAuthSession).mockResolvedValue(mockAdminSession);

      const { prisma } = await import("@/lib/db/prisma");
      vi.mocked(prisma.course.findUnique).mockResolvedValue({
        id: "ge-course",
        program_id: null,
      } as never);
      vi.mocked(prisma.courseAssignment.create).mockResolvedValue({ id: "assignment-1" } as never);

      const result = await bulkCreateCourseAssignments([
        {
          termInstanceId: "term-1",
          facultyId: "faculty-1",
          courseId: "ge-course",
          programId: "program-1",
          yearLevel: YearLevel.FIRST_YEAR,
          section: StudentSection.MORNING,
        },
      ]);

      expect(result).toEqual({ success: true, created: 1, errors: [] });
      expect(prisma.courseAssignment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            course_id: "ge-course",
            program_id: "program-1",
          }),
        })
      );
    });
  });
});
