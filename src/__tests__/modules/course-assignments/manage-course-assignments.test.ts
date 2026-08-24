import { beforeEach, describe, expect, it, vi } from "vitest";
import { CourseScope, StudentSection, YearLevel } from "@prisma/client";
import { ROLES } from "@/lib/constants/roles";
import { createPrismaUniqueConstraintError } from "@/__tests__/helpers/prisma-test-helpers";
import { createAuthSessionSnapshot } from "@/__tests__/helpers/auth-session";
import {
  createCourseAssignment,
  updateCourseAssignment,
  deactivateCourseAssignment,
  activateCourseAssignment,
  deleteCourseAssignment,
  bulkCreateCourseAssignments,
} from "@/features/course-assignments/services/manage-course-assignments";
import * as authModule from "@/features/auth/services/resolve-auth-session";

const resolveProgramHeadContextMock = vi.hoisted(() => vi.fn());
const revalidateProgramHeadAssignmentMock = vi.hoisted(() => vi.fn());

vi.mock("@/features/auth/services/resolve-auth-session");
vi.mock("@/features/auth/services/resolve-program-head-context", () => ({
  resolveProgramHeadContext: resolveProgramHeadContextMock,
  revalidateProgramHeadAssignment: revalidateProgramHeadAssignmentMock,
}));
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    courseAssignment: {
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
    courseAssignmentMembership: {
      count: vi.fn(),
    },
    user: {
      findFirst: vi.fn(),
    },
    course: {
      findUnique: vi.fn(),
    },
    curriculumCourse: {
      findUnique: vi.fn(),
    },
    programHeadAssignment: {
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

describe("manage-course-assignments", () => {
  const mockAdminSession = createAuthSessionSnapshot({
    userId: "admin-1",
    email: "secretary@test.com",
    roles: [ROLES.SECRETARY],
  });

  const mockDeanSession = createAuthSessionSnapshot({
    userId: "dean-1",
    email: "dean@test.com",
    roles: [ROLES.DEAN],
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

  const mockCoordinatorSession = createAuthSessionSnapshot({
    userId: "coordinator-1",
    email: "coordinator@test.com",
    roles: [ROLES.GEN_ED_COORDINATOR],
  });
  beforeEach(async () => {
    vi.clearAllMocks();
    resolveProgramHeadContextMock.mockResolvedValue({
      success: true,
      data: {
        userId: "ph-1",
        authorizedPrograms: [],
        selectedProgram: { id: "program-1", code: "P1", name: "Program 1" },
      },
    });
    revalidateProgramHeadAssignmentMock.mockResolvedValue({
      id: "program-1",
      code: "P1",
      name: "Program 1",
    });
    const { prisma } = await import("@/lib/db/prisma");
    vi.mocked(prisma.courseAssignmentMembership.count).mockResolvedValue(0);
    vi.mocked(prisma.$transaction).mockImplementation(async (callback) =>
      callback({
        $queryRaw: vi.fn().mockResolvedValue([]),
        courseAssignment: prisma.courseAssignment,
        courseAssignmentMembership: prisma.courseAssignmentMembership,
        course: prisma.course,
        curriculumCourse: prisma.curriculumCourse,
        programHeadAssignment: prisma.programHeadAssignment,
        user: prisma.user,
      } as never)
    );
  });

  describe("createCourseAssignment", () => {
    it("should allow Dean to create assignment", async () => {
      vi.mocked(authModule.resolveAuthSession).mockResolvedValue(mockDeanSession);

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
        selectedProgramId: "program-1",
        yearLevel: YearLevel.FIRST_YEAR,
        section: StudentSection.MORNING,
      });

      expect(result.success).toBe(true);
    });

    it("rejects Secretary creation before persistence", async () => {
      vi.mocked(authModule.resolveAuthSession).mockResolvedValue(mockAdminSession);

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
        selectedProgramId: "program-1",
        yearLevel: YearLevel.FIRST_YEAR,
        section: StudentSection.MORNING,
      });

      expect(result).toEqual({
        success: false,
        error: "Secretary cannot manage course assignments.",
      });
      expect(prisma.courseAssignment.create).not.toHaveBeenCalled();
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
        selectedProgramId: "program-1",
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
        selectedProgramId: "program-1",
        yearLevel: YearLevel.FIRST_YEAR,
        section: StudentSection.MORNING,
      });

      expect(result.success).toBe(true);
    });

    it("accepts a curriculum link and preserves an overridden year level", async () => {
      vi.mocked(authModule.resolveAuthSession).mockResolvedValue(mockDeanSession);

      const { prisma } = await import("@/lib/db/prisma");
      vi.mocked(prisma.course.findUnique).mockResolvedValue({
        id: "course-1",
        program_id: "program-1",
      } as never);
      vi.mocked(prisma.curriculumCourse.findUnique).mockResolvedValue({
        course_id: "course-1",
        year_level: YearLevel.SECOND_YEAR,
        course: { is_active: true },
        curriculum_version: { program_id: "program-1", status: "PUBLISHED" },
      } as never);
      vi.mocked(prisma.courseAssignment.create).mockResolvedValue({ id: "assignment-1" } as never);

      const result = await createCourseAssignment({
        termInstanceId: "term-1",
        facultyId: "faculty-1",
        courseId: "course-1",
        programId: "program-1",
        curriculumCourseId: "curriculum-course-1",
        yearLevel: YearLevel.THIRD_YEAR,
        section: StudentSection.MORNING,
      });

      expect(result.success).toBe(true);
      expect(prisma.courseAssignment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            curriculum_course_id: "curriculum-course-1",
            year_level: YearLevel.THIRD_YEAR,
          }),
        })
      );
    });

    it("rejects a curriculum link for a different course", async () => {
      vi.mocked(authModule.resolveAuthSession).mockResolvedValue(mockAdminSession);
      const { prisma } = await import("@/lib/db/prisma");
      vi.mocked(prisma.course.findUnique).mockResolvedValue({
        id: "course-2",
        program_id: "program-1",
      } as never);
      vi.mocked(prisma.curriculumCourse.findUnique).mockResolvedValue({
        course_id: "course-1",
        year_level: YearLevel.SECOND_YEAR,
        course: { is_active: true },
        curriculum_version: { program_id: "program-1", status: "PUBLISHED" },
      } as never);

      const result = await createCourseAssignment({
        termInstanceId: "term-1",
        facultyId: "faculty-1",
        courseId: "course-2",
        programId: "program-1",
        curriculumCourseId: "curriculum-course-1",
        yearLevel: YearLevel.SECOND_YEAR,
        section: StudentSection.MORNING,
      });

      expect(result).toEqual({
        success: false,
        error: "Selected curriculum course does not match the assigned course",
      });
    });

    it("rejects a curriculum link from a different program", async () => {
      vi.mocked(authModule.resolveAuthSession).mockResolvedValue(mockAdminSession);
      const { prisma } = await import("@/lib/db/prisma");
      vi.mocked(prisma.course.findUnique).mockResolvedValue({
        id: "course-1",
        program_id: "program-1",
      } as never);
      vi.mocked(prisma.curriculumCourse.findUnique).mockResolvedValue({
        course_id: "course-1",
        year_level: YearLevel.SECOND_YEAR,
        course: { is_active: true },
        curriculum_version: { program_id: "program-2", status: "PUBLISHED" },
      } as never);

      const result = await createCourseAssignment({
        termInstanceId: "term-1",
        facultyId: "faculty-1",
        courseId: "course-1",
        programId: "program-1",
        curriculumCourseId: "curriculum-course-1",
        yearLevel: YearLevel.SECOND_YEAR,
        section: StudentSection.MORNING,
      });

      expect(result).toEqual({
        success: false,
        error: "Selected curriculum course does not belong to the assignment program.",
      });
    });

    it("rejects an inactive course without a curriculum link", async () => {
      vi.mocked(authModule.resolveAuthSession).mockResolvedValue(mockAdminSession);
      const { prisma } = await import("@/lib/db/prisma");
      vi.mocked(prisma.course.findUnique).mockResolvedValue({
        id: "course-1",
        program_id: "program-1",
        is_active: false,
      } as never);

      const result = await createCourseAssignment({
        termInstanceId: "term-1",
        facultyId: "faculty-1",
        courseId: "course-1",
        programId: "program-1",
        yearLevel: YearLevel.SECOND_YEAR,
        section: StudentSection.MORNING,
      });

      expect(result).toEqual({
        success: false,
        error: "Inactive courses cannot receive new assignments.",
      });
      expect(prisma.courseAssignment.create).not.toHaveBeenCalled();
    });

    it.each(["DRAFT", "RETIRED"] as const)(
      "rejects a %s curriculum link for a new assignment",
      async (status) => {
        vi.mocked(authModule.resolveAuthSession).mockResolvedValue(mockAdminSession);
        const { prisma } = await import("@/lib/db/prisma");
        vi.mocked(prisma.course.findUnique).mockResolvedValue({
          id: "course-1",
          program_id: "program-1",
        } as never);
        vi.mocked(prisma.curriculumCourse.findUnique).mockResolvedValue({
          course_id: "course-1",
          year_level: YearLevel.SECOND_YEAR,
          course: { is_active: true },
          curriculum_version: { program_id: "program-1", status },
        } as never);

        const result = await createCourseAssignment({
          termInstanceId: "term-1",
          facultyId: "faculty-1",
          courseId: "course-1",
          programId: "program-1",
          curriculumCourseId: "curriculum-course-1",
          yearLevel: YearLevel.SECOND_YEAR,
          section: StudentSection.MORNING,
        });

        expect(result).toEqual({
          success: false,
          error: "Only published curriculum courses can be linked to new assignments.",
        });
        expect(prisma.courseAssignment.create).not.toHaveBeenCalled();
      }
    );

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
        selectedProgramId: "program-1",
        yearLevel: YearLevel.FIRST_YEAR,
        section: StudentSection.MORNING,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toMatch(/Program Heads cannot manage General Education assignments/i);
      }
    });

    it("should allow Gen Ed Coordinator to create a General Education assignment for a program", async () => {
      vi.mocked(authModule.resolveAuthSession).mockResolvedValue(mockCoordinatorSession);

      const { prisma } = await import("@/lib/db/prisma");
      vi.mocked(prisma.course.findUnique).mockResolvedValue({
        id: "ge-course",
        program_id: null,
        course_scope: CourseScope.GENERAL_EDUCATION,
      } as never);
      vi.mocked(prisma.courseAssignment.create).mockResolvedValue({
        id: "assignment-1",
      } as never);

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

    it("should reject Dean creation of a Program-specific assignment for a non-owning program", async () => {
      vi.mocked(authModule.resolveAuthSession).mockResolvedValue(mockDeanSession);

      const { prisma } = await import("@/lib/db/prisma");
      vi.mocked(prisma.course.findUnique).mockResolvedValue({
        id: "course-1",
        program_id: "program-1",
      } as never);

      const result = await createCourseAssignment({
        termInstanceId: "term-1",
        facultyId: "faculty-1",
        courseId: "course-1",
        programId: "program-2",
        selectedProgramId: "program-1",
        yearLevel: YearLevel.FIRST_YEAR,
        section: StudentSection.MORNING,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("must match");
      }
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
        selectedProgramId: "program-1",
        yearLevel: YearLevel.FIRST_YEAR,
        section: StudentSection.MORNING,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Selected Program");
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
        selectedProgramId: "program-1",
        yearLevel: YearLevel.FIRST_YEAR,
        section: StudentSection.MORNING,
      });

      expect(result.success).toBe(true);
    });

    it("should handle unique constraint violation", async () => {
      vi.mocked(authModule.resolveAuthSession).mockResolvedValue(mockDeanSession);

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
    it("rejects a resource from another Program in the selected context", async () => {
      vi.mocked(authModule.resolveAuthSession).mockResolvedValue(mockProgramHeadSession);
      const { prisma } = await import("@/lib/db/prisma");
      vi.mocked(prisma.courseAssignment.findUnique).mockResolvedValue({
        id: "assignment-beed",
        program_id: "program-2",
        course: { program_id: "program-2" },
      } as never);

      const result = await updateCourseAssignment({
        assignmentId: "assignment-beed",
        selectedProgramId: "program-1",
        facultyId: "faculty-2",
      });

      expect(result).toEqual({
        success: false,
        error: "Course assignment is outside the selected Program.",
      });
      expect(prisma.courseAssignment.update).not.toHaveBeenCalled();
    });

    it("rejects a General Education reassignment outside the selected Program", async () => {
      vi.mocked(authModule.resolveAuthSession).mockResolvedValue(mockProgramHeadSession);
      const { prisma } = await import("@/lib/db/prisma");
      vi.mocked(prisma.courseAssignment.findUnique).mockResolvedValue({
        id: "assignment-ge",
        program_id: "program-1",
        course: { program_id: null },
      } as never);

      const result = await updateCourseAssignment({
        assignmentId: "assignment-ge",
        selectedProgramId: "program-1",
        programId: "program-2",
      });

      expect(result).toEqual({
        success: false,
        error: "Course assignment is outside the selected Program.",
      });
      expect(prisma.courseAssignment.update).not.toHaveBeenCalled();
    });

    it("rejects a write when the selected Program assignment is revoked in the transaction", async () => {
      vi.mocked(authModule.resolveAuthSession).mockResolvedValue(mockProgramHeadSession);
      revalidateProgramHeadAssignmentMock.mockResolvedValueOnce(null);
      const { prisma } = await import("@/lib/db/prisma");
      vi.mocked(prisma.courseAssignment.findUnique).mockResolvedValue({
        id: "assignment-bsed",
        program_id: "program-1",
        course: { program_id: "program-1" },
      } as never);

      const result = await updateCourseAssignment({
        assignmentId: "assignment-bsed",
        selectedProgramId: "program-1",
        facultyId: "faculty-2",
      });

      expect(result).toEqual({
        success: false,
        error: "Course assignment is outside the selected Program.",
      });
      expect(prisma.courseAssignment.update).not.toHaveBeenCalled();
    });

    it("should allow Dean to update assignment", async () => {
      vi.mocked(authModule.resolveAuthSession).mockResolvedValue(mockDeanSession);

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

    it("should allow Dean to update valid class identity fields", async () => {
      vi.mocked(authModule.resolveAuthSession).mockResolvedValue(mockDeanSession);

      const { prisma } = await import("@/lib/db/prisma");
      vi.mocked(prisma.courseAssignment.findUnique).mockResolvedValue({
        id: "assignment-1",
        course: { program_id: "program-1" },
      } as never);
      vi.mocked(prisma.courseAssignment.update).mockResolvedValue({ id: "assignment-1" } as never);

      const result = await updateCourseAssignment({
        assignmentId: "assignment-1",
        yearLevel: YearLevel.THIRD_YEAR,
        section: StudentSection.AFTERNOON,
      });

      expect(result.success).toBe(true);
      expect(prisma.courseAssignment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            year_level: YearLevel.THIRD_YEAR,
            section: StudentSection.AFTERNOON,
          }),
        })
      );
    });

    it("rejects a Secretary update of a General Education assignment", async () => {
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

      expect(result).toEqual({
        success: false,
        error: "Secretary cannot manage course assignments.",
      });
      expect(prisma.courseAssignment.update).not.toHaveBeenCalled();
    });

    it("rejects class identity changes after the first roster membership", async () => {
      vi.mocked(authModule.resolveAuthSession).mockResolvedValue(mockDeanSession);

      const { prisma } = await import("@/lib/db/prisma");
      vi.mocked(prisma.courseAssignment.findUnique).mockResolvedValue({
        id: "assignment-1",
        program_id: "program-1",
        year_level: YearLevel.SECOND_YEAR,
        section: StudentSection.MORNING,
        course: { program_id: "program-1" },
      } as never);
      vi.mocked(prisma.courseAssignmentMembership.count).mockResolvedValue(1);

      const result = await updateCourseAssignment({
        assignmentId: "assignment-1",
        yearLevel: YearLevel.THIRD_YEAR,
      });

      expect(result).toEqual({
        success: false,
        error:
          "Course, academic period, program, year level, and section cannot change after roster membership exists.",
      });
      expect(prisma.courseAssignment.update).not.toHaveBeenCalled();
    });

    it("uses active role for lifecycle authorization", async () => {
      vi.mocked(authModule.resolveAuthSession).mockResolvedValue({
        ...mockAdminSession,
        activeRole: ROLES.STUDENT,
      });

      const { prisma } = await import("@/lib/db/prisma");
      vi.mocked(prisma.courseAssignment.findUnique).mockResolvedValue({
        id: "assignment-1",
        course: { program_id: "program-1" },
      } as never);

      const result = await updateCourseAssignment({
        assignmentId: "assignment-1",
        yearLevel: YearLevel.THIRD_YEAR,
      });

      expect(result).toEqual({ success: false, error: "Insufficient permissions." });
    });

    it("updates Faculty and class identity in one transaction", async () => {
      vi.mocked(authModule.resolveAuthSession).mockResolvedValue(mockDeanSession);

      const { prisma } = await import("@/lib/db/prisma");
      const tx = {
        $queryRaw: vi.fn().mockResolvedValue([]),
        courseAssignment: {
          findUnique: vi.fn().mockResolvedValue({
            id: "assignment-1",
            faculty_id: "faculty-1",
            program_id: "program-1",
            year_level: YearLevel.SECOND_YEAR,
            section: StudentSection.MORNING,
            course: { program_id: "program-1" },
          }),
          update: vi.fn().mockResolvedValue({ id: "assignment-1" }),
        },
        courseAssignmentMembership: { count: vi.fn().mockResolvedValue(0) },
        programHeadAssignment: { findMany: vi.fn() },
        user: { findFirst: vi.fn().mockResolvedValue({ id: "faculty-2" }) },
      };
      vi.mocked(prisma.$transaction).mockImplementation(async (callback) => callback(tx as never));

      const result = await updateCourseAssignment({
        assignmentId: "assignment-1",
        yearLevel: YearLevel.THIRD_YEAR,
        facultyId: "faculty-2",
      });

      expect(result.success).toBe(true);
      expect(tx.courseAssignment.update).toHaveBeenCalledWith({
        where: { id: "assignment-1" },
        data: {
          year_level: YearLevel.THIRD_YEAR,
          faculty_id: "faculty-2",
        },
      });
    });
  });

  describe("Faculty reassignment", () => {
    it("changes Faculty ownership without changing membership records", async () => {
      vi.mocked(authModule.resolveAuthSession).mockResolvedValue(mockDeanSession);

      const { prisma } = await import("@/lib/db/prisma");
      vi.mocked(prisma.courseAssignment.findUnique).mockResolvedValue({
        id: "assignment-1",
        course: { program_id: "program-1" },
      } as never);
      vi.mocked(prisma.user.findFirst).mockResolvedValue({ id: "faculty-2" } as never);
      vi.mocked(prisma.courseAssignment.update).mockResolvedValue({ id: "assignment-1" } as never);

      const result = await updateCourseAssignment({
        assignmentId: "assignment-1",
        facultyId: "faculty-2",
      });

      expect(result.success).toBe(true);
      expect(prisma.courseAssignment.update).toHaveBeenCalledWith({
        where: { id: "assignment-1" },
        data: { faculty_id: "faculty-2" },
      });
    });
  });

  describe("deactivateCourseAssignment", () => {
    it("should allow Dean to deactivate assignment", async () => {
      vi.mocked(authModule.resolveAuthSession).mockResolvedValue(mockDeanSession);

      const { prisma } = await import("@/lib/db/prisma");
      vi.mocked(prisma.courseAssignment.findUnique).mockResolvedValue({
        id: "assignment-1",
        course: { program_id: "program-1" },
      } as never);
      vi.mocked(prisma.courseAssignment.update).mockResolvedValue({ id: "assignment-1" } as never);

      const result = await deactivateCourseAssignment("assignment-1");

      expect(result.success).toBe(true);
    });

    it("rejects Secretary deactivation before persistence", async () => {
      vi.mocked(authModule.resolveAuthSession).mockResolvedValue(mockAdminSession);

      const { prisma } = await import("@/lib/db/prisma");
      vi.mocked(prisma.courseAssignment.findUnique).mockResolvedValue({
        id: "assignment-1",
        course: { program_id: "program-1" },
      } as never);

      const result = await deactivateCourseAssignment("assignment-1");

      expect(result).toEqual({
        success: false,
        error: "Secretary cannot manage course assignments.",
      });
      expect(prisma.courseAssignment.update).not.toHaveBeenCalled();
    });

    it("blocks a Program Head from deactivating an assignment in another selected Program", async () => {
      vi.mocked(authModule.resolveAuthSession).mockResolvedValue(mockProgramHeadSession);
      const { prisma } = await import("@/lib/db/prisma");
      vi.mocked(prisma.courseAssignment.findUnique).mockResolvedValue({
        id: "assignment-beed",
        program_id: "program-2",
        course: { program_id: "program-2" },
      } as never);

      const result = await deactivateCourseAssignment({
        assignmentId: "assignment-beed",
        programId: "program-1",
      });

      expect(result).toEqual({
        success: false,
        error: "Course assignment is outside the selected Program.",
      });
      expect(prisma.courseAssignment.update).not.toHaveBeenCalled();
    });

    it("blocks deactivation when the selected Program assignment is revoked in the transaction", async () => {
      vi.mocked(authModule.resolveAuthSession).mockResolvedValue(mockProgramHeadSession);
      revalidateProgramHeadAssignmentMock.mockResolvedValueOnce(null);
      const { prisma } = await import("@/lib/db/prisma");
      vi.mocked(prisma.courseAssignment.findUnique).mockResolvedValue({
        id: "assignment-bsed",
        program_id: "program-1",
        course: { program_id: "program-1" },
      } as never);

      const result = await deactivateCourseAssignment({
        assignmentId: "assignment-bsed",
        programId: "program-1",
      });

      expect(result).toEqual({
        success: false,
        error: "Course assignment is outside the selected Program.",
      });
      expect(prisma.courseAssignment.update).not.toHaveBeenCalled();
    });
  });

  describe("activateCourseAssignment", () => {
    it("should allow Dean to reactivate assignment", async () => {
      vi.mocked(authModule.resolveAuthSession).mockResolvedValue(mockDeanSession);

      const { prisma } = await import("@/lib/db/prisma");
      vi.mocked(prisma.courseAssignment.findUnique).mockResolvedValue({
        id: "assignment-1",
        course: { program_id: "program-1" },
      } as never);
      vi.mocked(prisma.courseAssignment.update).mockResolvedValue({ id: "assignment-1" } as never);

      const result = await activateCourseAssignment({ assignmentId: "assignment-1" });

      expect(result.success).toBe(true);
      expect(prisma.courseAssignment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ is_active: true }),
        })
      );
    });

    it("rejects Secretary reactivation before persistence", async () => {
      vi.mocked(authModule.resolveAuthSession).mockResolvedValue(mockAdminSession);

      const { prisma } = await import("@/lib/db/prisma");
      vi.mocked(prisma.courseAssignment.findUnique).mockResolvedValue({
        id: "assignment-1",
        course: { program_id: "program-1" },
      } as never);

      const result = await activateCourseAssignment({ assignmentId: "assignment-1" });

      expect(result).toEqual({
        success: false,
        error: "Secretary cannot manage course assignments.",
      });
      expect(prisma.courseAssignment.update).not.toHaveBeenCalled();
    });

    it("blocks a Program Head from activating an assignment in another selected Program", async () => {
      vi.mocked(authModule.resolveAuthSession).mockResolvedValue(mockProgramHeadSession);
      const { prisma } = await import("@/lib/db/prisma");
      vi.mocked(prisma.courseAssignment.findUnique).mockResolvedValue({
        id: "assignment-beed",
        program_id: "program-2",
        course: { program_id: "program-2" },
      } as never);

      const result = await activateCourseAssignment({
        assignmentId: "assignment-beed",
        programId: "program-1",
      });

      expect(result).toEqual({
        success: false,
        error: "Course assignment is outside the selected Program.",
      });
      expect(prisma.courseAssignment.update).not.toHaveBeenCalled();
    });

    it("blocks activation when the selected Program assignment is revoked in the transaction", async () => {
      vi.mocked(authModule.resolveAuthSession).mockResolvedValue(mockProgramHeadSession);
      revalidateProgramHeadAssignmentMock.mockResolvedValueOnce(null);
      const { prisma } = await import("@/lib/db/prisma");
      vi.mocked(prisma.courseAssignment.findUnique).mockResolvedValue({
        id: "assignment-bsed",
        program_id: "program-1",
        course: { program_id: "program-1" },
      } as never);

      const result = await activateCourseAssignment({
        assignmentId: "assignment-bsed",
        programId: "program-1",
      });

      expect(result).toEqual({
        success: false,
        error: "Course assignment is outside the selected Program.",
      });
      expect(prisma.courseAssignment.update).not.toHaveBeenCalled();
    });
  });

  describe("deleteCourseAssignment", () => {
    const lifecycleAssignment = {
      id: "assignment-1",
      course_id: "course-1",
      program_id: "program-1",
      year_level: YearLevel.SECOND_YEAR,
      section: StudentSection.MORNING,
      updated_at: new Date("2026-07-21T00:00:00.000Z"),
      course: { code: "CS101", title: "Intro to Computing", program_id: "program-1" },
      program: { code: "BSCS", name: "BS Computer Science" },
      term_instance: {
        semester: "FIRST" as const,
        term: "FIRST_TERM" as const,
        school_year: { code: "2025-2026" },
      },
      _count: { memberships: 0, course_bound_evaluations: 0 },
    };

    it("should allow Dean to safely delete assignment with no course-bound evaluations", async () => {
      vi.mocked(authModule.resolveAuthSession).mockResolvedValue(mockDeanSession);

      const { prisma } = await import("@/lib/db/prisma");
      const tx = {
        courseAssignment: {
          findUnique: vi.fn().mockResolvedValue(lifecycleAssignment),
          delete: vi.fn().mockResolvedValue({ id: "assignment-1" }),
        },
        courseAssignmentMembership: { count: vi.fn().mockResolvedValue(0) },
        programHeadAssignment: { findMany: vi.fn() },
        $queryRaw: vi.fn().mockResolvedValue([]),
      };
      vi.mocked(prisma.$transaction).mockImplementation(async (callback) =>
        callback(tx as never)
      );

      const result = await deleteCourseAssignment({
        assignmentId: "assignment-1",
        confirmationLabel:
          "CS101 — Intro to Computing · BSCS · 2nd Year · Morning · 2025-2026 — 1st Semester — 1st Term",
        revision: lifecycleAssignment.updated_at.toISOString(),
        membershipCount: 0,
        activeMembershipCount: 0,
        removedMembershipCount: 0,
      });

      expect(result.success).toBe(true);
      expect(tx.courseAssignment.delete).toHaveBeenCalledWith({ where: { id: "assignment-1" } });
    });

    it("rejects Secretary deletion before persistence", async () => {
      vi.mocked(authModule.resolveAuthSession).mockResolvedValue(mockAdminSession);

      const { prisma } = await import("@/lib/db/prisma");
      const tx = {
        courseAssignment: {
          findUnique: vi.fn().mockResolvedValue(lifecycleAssignment),
          delete: vi.fn(),
        },
        courseAssignmentMembership: { count: vi.fn().mockResolvedValue(0) },
        programHeadAssignment: { findMany: vi.fn() },
        $queryRaw: vi.fn().mockResolvedValue([]),
      };
      vi.mocked(prisma.$transaction).mockImplementation(async (callback) =>
        callback(tx as never)
      );

      const result = await deleteCourseAssignment({
        assignmentId: "assignment-1",
        confirmationLabel:
          "CS101 — Intro to Computing · BSCS · 2nd Year · Morning · 2025-2026 — 1st Semester — 1st Term",
        revision: lifecycleAssignment.updated_at.toISOString(),
        membershipCount: 0,
        activeMembershipCount: 0,
        removedMembershipCount: 0,
      });

      expect(result).toEqual({
        success: false,
        error: "Secretary cannot manage course assignments.",
      });
      expect(tx.courseAssignment.delete).not.toHaveBeenCalled();
    });

    it("blocks a Program Head from deleting an assignment in another selected Program", async () => {
      vi.mocked(authModule.resolveAuthSession).mockResolvedValue(mockProgramHeadSession);
      const { prisma } = await import("@/lib/db/prisma");
      const tx = {
        courseAssignment: {
          findUnique: vi.fn().mockResolvedValue({
            ...lifecycleAssignment,
            program_id: "program-2",
            course: { ...lifecycleAssignment.course, program_id: "program-2" },
          }),
          delete: vi.fn(),
        },
        courseAssignmentMembership: { count: vi.fn().mockResolvedValue(0) },
        $queryRaw: vi.fn().mockResolvedValue([]),
      };
      vi.mocked(prisma.$transaction).mockImplementation(async (callback) => callback(tx as never));

      const result = await deleteCourseAssignment({
        assignmentId: "assignment-beed",
        programId: "program-1",
        confirmationLabel: "unused",
        revision: lifecycleAssignment.updated_at.toISOString(),
        membershipCount: 0,
        activeMembershipCount: 0,
        removedMembershipCount: 0,
      });

      expect(result).toEqual({
        success: false,
        error: "Course assignment is outside the selected Program.",
      });
      expect(tx.courseAssignment.delete).not.toHaveBeenCalled();
    });

    it("blocks deletion when the selected Program assignment is revoked in the transaction", async () => {
      vi.mocked(authModule.resolveAuthSession).mockResolvedValue(mockProgramHeadSession);
      revalidateProgramHeadAssignmentMock.mockResolvedValueOnce(null);
      const { prisma } = await import("@/lib/db/prisma");
      const tx = {
        courseAssignment: {
          findUnique: vi.fn().mockResolvedValue(lifecycleAssignment),
          delete: vi.fn(),
        },
        courseAssignmentMembership: { count: vi.fn().mockResolvedValue(0) },
        $queryRaw: vi.fn().mockResolvedValue([]),
      };
      vi.mocked(prisma.$transaction).mockImplementation(async (callback) => callback(tx as never));

      const result = await deleteCourseAssignment({
        assignmentId: "assignment-1",
        programId: "program-1",
        confirmationLabel: "unused",
        revision: lifecycleAssignment.updated_at.toISOString(),
        membershipCount: 0,
        activeMembershipCount: 0,
        removedMembershipCount: 0,
      });

      expect(result).toEqual({
        success: false,
        error: "Course assignment is outside the selected Program.",
      });
      expect(tx.courseAssignment.delete).not.toHaveBeenCalled();
    });

    it("blocks deletion when course-bound evaluations exist", async () => {
      vi.mocked(authModule.resolveAuthSession).mockResolvedValue(mockDeanSession);

      const { prisma } = await import("@/lib/db/prisma");
      const tx = {
        courseAssignment: {
          findUnique: vi.fn().mockResolvedValue({
            ...lifecycleAssignment,
            _count: { memberships: 0, course_bound_evaluations: 1 },
          }),
          delete: vi.fn(),
        },
        courseAssignmentMembership: { count: vi.fn().mockResolvedValue(0) },
        programHeadAssignment: { findMany: vi.fn() },
        $queryRaw: vi.fn().mockResolvedValue([]),
      };
      vi.mocked(prisma.$transaction).mockImplementation(async (callback) => callback(tx as never));

      const result = await deleteCourseAssignment({
        assignmentId: "assignment-1",
        confirmationLabel:
          "CS101 — Intro to Computing · BSCS · 2nd Year · Morning · 2025-2026 — 1st Semester — 1st Term",
        revision: lifecycleAssignment.updated_at.toISOString(),
        membershipCount: 0,
        activeMembershipCount: 0,
        removedMembershipCount: 0,
      });

      expect(result.success).toBe(false);
      expect(tx.courseAssignment.delete).not.toHaveBeenCalled();
      if (!result.success) {
        expect(result.error).toMatch(/Course-bound evaluation exists/i);
      }
    });
  });

  describe("bulkCreateCourseAssignments", () => {
    it("blocks Program Head bulk creation when the selected Program assignment is revoked", async () => {
      vi.mocked(authModule.resolveAuthSession).mockResolvedValue(mockProgramHeadSession);
      revalidateProgramHeadAssignmentMock.mockResolvedValueOnce(null);
      const { prisma } = await import("@/lib/db/prisma");

      const result = await bulkCreateCourseAssignments(
        [
          {
            termInstanceId: "term-1",
            facultyId: "faculty-1",
            courseId: "course-1",
            programId: "program-1",
            yearLevel: YearLevel.FIRST_YEAR,
            section: StudentSection.MORNING,
          },
        ],
        "program-1"
      );

      expect(result).toEqual({
        success: false,
        created: 0,
        errors: [{ index: 0, error: "Selected Program is no longer assigned." }],
      });
      expect(prisma.courseAssignment.create).not.toHaveBeenCalled();
    });

    it("uses active role instead of any retained role for authorization", async () => {
      vi.mocked(authModule.resolveAuthSession).mockResolvedValue({
        ...mockAdminSession,
        activeRole: ROLES.STUDENT,
      });

      const result = await bulkCreateCourseAssignments([
        {
          termInstanceId: "term-1",
          facultyId: "faculty-1",
          courseId: "course-1",
          programId: "program-1",
          yearLevel: YearLevel.FIRST_YEAR,
          section: StudentSection.MORNING,
        },
      ]);

      expect(result).toEqual({
        success: false,
        created: 0,
        errors: [{ index: -1, error: "Insufficient permissions." }],
      });
    });

    it("should return success=true when some assignments are created despite errors", async () => {
      vi.mocked(authModule.resolveAuthSession).mockResolvedValue(mockDeanSession);

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
      vi.mocked(authModule.resolveAuthSession).mockResolvedValue(mockDeanSession);

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

    it("rejects Secretary bulk creation via the role allowlist", async () => {
      vi.mocked(authModule.resolveAuthSession).mockResolvedValue(mockAdminSession);

      const { prisma } = await import("@/lib/db/prisma");

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

      expect(result).toEqual({
        success: false,
        created: 0,
        errors: [{ index: -1, error: "Insufficient permissions." }],
      });
      expect(prisma.courseAssignment.create).not.toHaveBeenCalled();
    });
  });
});
