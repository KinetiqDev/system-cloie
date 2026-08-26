import { beforeEach, describe, expect, it, vi } from "vitest";
import { CourseScope, StudentSection, YearLevel } from "@prisma/client";
import { ROLES } from "@/lib/constants/roles";
import { createAuthSessionSnapshot } from "@/__tests__/helpers/auth-session";
import { canManageCourseAssignment } from "@/features/course-assignments/policies";
import {
  createCourseAssignment,
  updateCourseAssignment,
  deactivateCourseAssignment,
  activateCourseAssignment,
  bulkCreateCourseAssignments,
} from "@/features/course-assignments/services/manage-course-assignments";
import { listCourseAssignments } from "@/features/course-assignments/services/list-course-assignments";
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
    course: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    courseAssignment: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    curriculumVersion: {
      findUnique: vi.fn(),
    },
    curriculumCourse: {
      findUnique: vi.fn(),
    },
    courseAssignmentMembership: {
      count: vi.fn(),
    },
    programHeadAssignment: {
      findMany: vi.fn(),
    },
    user: {
      findFirst: vi.fn(),
    },
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => {
      const { prisma } = await import("@/lib/db/prisma");
      return fn({
        ...prisma,
        $queryRaw: vi.fn().mockResolvedValue([]),
      });
    }),
  },
}));

describe("General Education Coordinator Scope Authorization (Issue #547)", () => {
  const coordinatorSession = createAuthSessionSnapshot({
    userId: "coordinator-1",
    email: "demo-gened@cloie.test",
    roles: [ROLES.GEN_ED_COORDINATOR],
    activeRole: ROLES.GEN_ED_COORDINATOR,
  });

  const secretarySession = createAuthSessionSnapshot({
    userId: "secretary-1",
    email: "demo-secretary@cloie.test",
    roles: [ROLES.SECRETARY],
    activeRole: ROLES.SECRETARY,
  });

  const deanSession = createAuthSessionSnapshot({
    userId: "dean-1",
    email: "demo-dean@cloie.test",
    roles: [ROLES.DEAN],
    activeRole: ROLES.DEAN,
  });

  const phSession = createAuthSessionSnapshot({
    userId: "ph-1",
    email: "demo-ph@cloie.test",
    roles: [ROLES.PROGRAM_HEAD],
    activeRole: ROLES.PROGRAM_HEAD,
  });

  const facultySession = createAuthSessionSnapshot({
    userId: "faculty-1",
    email: "demo-faculty@cloie.test",
    roles: [ROLES.FACULTY],
    activeRole: ROLES.FACULTY,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Pure Policy Checks (canManageCourseAssignment)", () => {
    it("allows Coordinator for GENERAL_EDUCATION courses across any program", () => {
      const resultBSIT = canManageCourseAssignment(
        coordinatorSession,
        CourseScope.GENERAL_EDUCATION,
        "program-bsit"
      );
      expect(resultBSIT).toEqual({ allowed: true });

      const resultBSBA = canManageCourseAssignment(
        coordinatorSession,
        CourseScope.GENERAL_EDUCATION,
        "program-bsba"
      );
      expect(resultBSBA).toEqual({ allowed: true });
    });

    it("denies Coordinator for PROGRAM_SPECIFIC courses", () => {
      const result = canManageCourseAssignment(
        coordinatorSession,
        CourseScope.PROGRAM_SPECIFIC,
        "program-bsit"
      );
      expect(result).toEqual({
        allowed: false,
        reason: "Coordinators can only manage General Education assignments.",
      });
    });

    it("preserves Secretary denial for all course assignments", () => {
      const resultGE = canManageCourseAssignment(
        secretarySession,
        CourseScope.GENERAL_EDUCATION,
        "program-bsit"
      );
      expect(resultGE).toEqual({
        allowed: false,
        reason: "Secretary cannot manage course assignments.",
      });

      const resultPS = canManageCourseAssignment(
        secretarySession,
        CourseScope.PROGRAM_SPECIFIC,
        "program-bsit"
      );
      expect(resultPS).toEqual({
        allowed: false,
        reason: "Secretary cannot manage course assignments.",
      });
    });

    it("preserves Program Head permissions (allowed for PS in scope, denied for GE)", () => {
      const resultGE = canManageCourseAssignment(
        phSession,
        CourseScope.GENERAL_EDUCATION,
        "program-bsit",
        ["program-bsit"]
      );
      expect(resultGE).toEqual({
        allowed: false,
        reason: "Program Heads cannot manage General Education assignments.",
      });

      const resultPSInScope = canManageCourseAssignment(
        phSession,
        CourseScope.PROGRAM_SPECIFIC,
        "program-bsit",
        ["program-bsit"]
      );
      expect(resultPSInScope).toEqual({ allowed: true });

      const resultPSOutOfScope = canManageCourseAssignment(
        phSession,
        CourseScope.PROGRAM_SPECIFIC,
        "program-bsba",
        ["program-bsit"]
      );
      expect(resultPSOutOfScope).toEqual({
        allowed: false,
        reason: "Course is outside your program scope.",
      });
    });

    it("preserves Dean permissions (allowed for both GE and PS across all programs)", () => {
      const resultGE = canManageCourseAssignment(
        deanSession,
        CourseScope.GENERAL_EDUCATION,
        "program-bsit"
      );
      expect(resultGE).toEqual({ allowed: true });

      const resultPS = canManageCourseAssignment(
        deanSession,
        CourseScope.PROGRAM_SPECIFIC,
        "program-bsba"
      );
      expect(resultPS).toEqual({ allowed: true });
    });

    it("preserves Faculty denial for all course assignment mutations", () => {
      const result = canManageCourseAssignment(
        facultySession,
        CourseScope.GENERAL_EDUCATION,
        "program-bsit"
      );
      expect(result).toEqual({ allowed: false, reason: "Insufficient permissions." });
    });
  });

  describe("Query Scope Enforcement (listCourseAssignments)", () => {
    it("forces course_scope == GENERAL_EDUCATION for Coordinator even if client sends forged filters", async () => {
      vi.mocked(authModule.resolveAuthSession).mockResolvedValue(coordinatorSession);
      const { prisma } = await import("@/lib/db/prisma");
      vi.mocked(prisma.courseAssignment.findMany).mockResolvedValue([] as never);
      vi.mocked(prisma.courseAssignment.count).mockResolvedValue(0);

      await listCourseAssignments({ courseScope: CourseScope.PROGRAM_SPECIFIC });

      expect(prisma.courseAssignment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            course: { course_scope: CourseScope.GENERAL_EDUCATION },
          }),
        })
      );
    });
  });

  describe("Server Services Authorization Boundaries", () => {
    it("createCourseAssignment: permits Coordinator for GE course, denies for PS course", async () => {
      vi.mocked(authModule.resolveAuthSession).mockResolvedValue(coordinatorSession);
      const { prisma } = await import("@/lib/db/prisma");

      // 1. GE course creation succeeds
      vi.mocked(prisma.course.findUnique).mockResolvedValue({
        id: "course-ge",
        program_id: null,
        course_scope: CourseScope.GENERAL_EDUCATION,
        is_active: true,
      } as never);
      vi.mocked(prisma.courseAssignment.create).mockResolvedValue({
        id: "assignment-ge",
      } as never);

      const successResult = await createCourseAssignment({
        termInstanceId: "term-1",
        facultyId: "faculty-1",
        courseId: "course-ge",
        programId: "program-bsit",
        yearLevel: YearLevel.FIRST_YEAR,
        section: StudentSection.MORNING,
      });
      expect(successResult.success).toBe(true);
      expect(prisma.courseAssignment.create).toHaveBeenCalledTimes(1);

      // 2. PS course creation fails – no write should occur
      vi.clearAllMocks();
      vi.mocked(authModule.resolveAuthSession).mockResolvedValue(coordinatorSession);
      vi.mocked(prisma.course.findUnique).mockResolvedValue({
        id: "course-ps",
        program_id: "program-bsit",
        course_scope: CourseScope.PROGRAM_SPECIFIC,
        is_active: true,
      } as never);

      const failResult = await createCourseAssignment({
        termInstanceId: "term-1",
        facultyId: "faculty-1",
        courseId: "course-ps",
        programId: "program-bsit",
        yearLevel: YearLevel.FIRST_YEAR,
        section: StudentSection.MORNING,
      });
      expect(failResult.success).toBe(false);
      if (!failResult.success) {
        expect(failResult.error).toBe(
          "Coordinators can only manage General Education assignments."
        );
      }
      expect(prisma.courseAssignment.create).not.toHaveBeenCalled();
    });

    it("updateCourseAssignment: permits Coordinator for GE assignment, denies for PS assignment", async () => {
      vi.mocked(authModule.resolveAuthSession).mockResolvedValue(coordinatorSession);
      const { prisma } = await import("@/lib/db/prisma");

      // 1. Update GE assignment succeeds
      vi.mocked(prisma.courseAssignment.findUnique).mockResolvedValue({
        id: "ca-ge",
        program_id: "program-bsit",
        year_level: YearLevel.FIRST_YEAR,
        section: StudentSection.MORNING,
        faculty_id: "faculty-1",
        course: { id: "course-ge", course_scope: CourseScope.GENERAL_EDUCATION, program_id: null },
      } as never);
      vi.mocked(prisma.courseAssignmentMembership.count).mockResolvedValue(0);
      vi.mocked(prisma.user.findFirst).mockResolvedValue({ id: "faculty-2" } as never);

      const successResult = await updateCourseAssignment({
        assignmentId: "ca-ge",
        facultyId: "faculty-2",
      });
      expect(successResult.success).toBe(true);
      expect(prisma.courseAssignment.update).toHaveBeenCalledTimes(1);

      // 2. Update PS assignment fails – no write should occur
      vi.clearAllMocks();
      vi.mocked(authModule.resolveAuthSession).mockResolvedValue(coordinatorSession);
      vi.mocked(prisma.courseAssignment.findUnique).mockResolvedValue({
        id: "ca-ps",
        program_id: "program-bsit",
        year_level: YearLevel.FIRST_YEAR,
        section: StudentSection.MORNING,
        faculty_id: "faculty-1",
        course: {
          id: "course-ps",
          course_scope: CourseScope.PROGRAM_SPECIFIC,
          program_id: "program-bsit",
        },
      } as never);

      const failResult = await updateCourseAssignment({
        assignmentId: "ca-ps",
        facultyId: "faculty-2",
      });
      expect(failResult.success).toBe(false);
      if (!failResult.success) {
        expect(failResult.error).toBe(
          "Coordinators can only manage General Education assignments."
        );
      }
      expect(prisma.courseAssignment.update).not.toHaveBeenCalled();
    });

    it("deactivateCourseAssignment: permits Coordinator for GE assignment, denies for PS assignment", async () => {
      vi.mocked(authModule.resolveAuthSession).mockResolvedValue(coordinatorSession);
      const { prisma } = await import("@/lib/db/prisma");

      // 1. Deactivate GE succeeds
      vi.mocked(prisma.courseAssignment.findUnique).mockResolvedValue({
        id: "ca-ge",
        program_id: "program-bsit",
        course: { course_scope: CourseScope.GENERAL_EDUCATION, program_id: null },
      } as never);
      vi.mocked(prisma.courseAssignment.update).mockResolvedValue({ id: "ca-ge" } as never);

      const successResult = await deactivateCourseAssignment("ca-ge");
      expect(successResult.success).toBe(true);
      expect(prisma.courseAssignment.update).toHaveBeenCalledTimes(1);

      // 2. Deactivate PS fails – no write should occur
      vi.clearAllMocks();
      vi.mocked(authModule.resolveAuthSession).mockResolvedValue(coordinatorSession);
      vi.mocked(prisma.courseAssignment.findUnique).mockResolvedValue({
        id: "ca-ps",
        program_id: "program-bsit",
        course: { course_scope: CourseScope.PROGRAM_SPECIFIC, program_id: "program-bsit" },
      } as never);

      const failResult = await deactivateCourseAssignment("ca-ps");
      expect(failResult.success).toBe(false);
      if (!failResult.success) {
        expect(failResult.error).toBe(
          "Coordinators can only manage General Education assignments."
        );
      }
      expect(prisma.courseAssignment.update).not.toHaveBeenCalled();
    });
    it("activateCourseAssignment: permits Coordinator for GE assignment, denies for PS assignment", async () => {
      vi.mocked(authModule.resolveAuthSession).mockResolvedValue(coordinatorSession);
      const { prisma } = await import("@/lib/db/prisma");

      // 1. Activate GE succeeds
      vi.mocked(prisma.courseAssignment.findUnique).mockResolvedValue({
        id: "ca-ge",
        program_id: "program-bsit",
        course: { course_scope: CourseScope.GENERAL_EDUCATION, program_id: null },
      } as never);
      vi.mocked(prisma.courseAssignment.update).mockResolvedValue({ id: "ca-ge" } as never);

      const successResult = await activateCourseAssignment({ assignmentId: "ca-ge" });
      expect(successResult.success).toBe(true);
      expect(prisma.courseAssignment.update).toHaveBeenCalledTimes(1);

      // 2. Activate PS fails – no write should occur
      vi.clearAllMocks();
      vi.mocked(authModule.resolveAuthSession).mockResolvedValue(coordinatorSession);
      vi.mocked(prisma.courseAssignment.findUnique).mockResolvedValue({
        id: "ca-ps",
        program_id: "program-bsit",
        course: { course_scope: CourseScope.PROGRAM_SPECIFIC, program_id: "program-bsit" },
      } as never);

      const failResult = await activateCourseAssignment({ assignmentId: "ca-ps" });
      expect(failResult.success).toBe(false);
      if (!failResult.success) {
        expect(failResult.error).toBe(
          "Coordinators can only manage General Education assignments."
        );
      }
      expect(prisma.courseAssignment.update).not.toHaveBeenCalled();
    });

    it("bulkCreateCourseAssignments: filters out PS assignments and creates only GE assignments", async () => {
      vi.mocked(authModule.resolveAuthSession).mockResolvedValue(coordinatorSession);
      const { prisma } = await import("@/lib/db/prisma");

      vi.mocked(prisma.course.findUnique).mockImplementation(
        async ({ where }: { where: { id: string } }) => {
          if (where.id === "course-ge") {
            return {
              id: "course-ge",
              program_id: null,
              course_scope: CourseScope.GENERAL_EDUCATION,
              is_active: true,
            } as never;
          }
          return {
            id: "course-ps",
            program_id: "program-bsit",
            course_scope: CourseScope.PROGRAM_SPECIFIC,
            is_active: true,
          } as never;
        }
      );

      vi.mocked(prisma.courseAssignment.create).mockResolvedValue({ id: "assignment-ge" } as never);

      const bulkResult = await bulkCreateCourseAssignments([
        {
          termInstanceId: "term-1",
          facultyId: "faculty-1",
          courseId: "course-ge",
          programId: "program-bsit",
          yearLevel: YearLevel.FIRST_YEAR,
          section: StudentSection.MORNING,
        },
        {
          termInstanceId: "term-1",
          facultyId: "faculty-1",
          courseId: "course-ps",
          programId: "program-bsit",
          yearLevel: YearLevel.FIRST_YEAR,
          section: StudentSection.MORNING,
        },
      ]);

      expect(bulkResult.created).toBe(1);
      expect(bulkResult.errors.length).toBe(1);
      expect(bulkResult.errors[0].error).toBe(
        "Coordinators can only manage General Education assignments."
      );
      expect(prisma.courseAssignment.create).toHaveBeenCalledTimes(1);
    });
  });
});
