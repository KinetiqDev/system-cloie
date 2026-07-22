import { CourseScope } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { ROLES } from "@/lib/constants/roles";
import { type ServiceResult } from "@/lib/utils/service-result";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FacultyCourseWithCiloCount = {
  id: string;
  code: string;
  title: string;
  description: string | null;
  courseScope: CourseScope;
  courseScopeLabel: string;
  programId: string | null;
  programCode: string | null;
  programName: string | null;
  majorId: string | null;
  majorName: string | null;
  ciloCount: number;
};

export type FacultyCourseWithCilosResult = ServiceResult<{
  courses: FacultyCourseWithCiloCount[];
  programs: Array<{ id: string; code: string; name: string }>;
}>;

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

import { resolveFacultyCourseIds } from "./resolve-faculty-course-ids";

/**
 * List faculty courses with CILO counts.
 * If termInstanceId is provided, returns courses assigned to faculty for that term.
 * Otherwise, falls back to program-affiliated courses (legacy behavior).
 */
export async function listFacultyCoursesWithCilos(
  termInstanceId?: string
): Promise<FacultyCourseWithCilosResult> {
  const session = await resolveAuthSession();

  if (!session || session.activeRole !== ROLES.FACULTY) {
    return { success: false, error: "Faculty authentication is required." };
  }

  const courseIds = await resolveFacultyCourseIds(session.userId, termInstanceId);

  if (courseIds.length === 0) {
    return {
      success: true,
      data: {
        courses: [],
        programs: [],
      },
    };
  }

  // Fetch full course details with CILO counts
  const rawCourses = await prisma.course.findMany({
    where: {
      id: { in: courseIds },
      is_active: true,
    },
    include: {
      program: { select: { id: true, code: true, name: true } },
      major: { select: { id: true, name: true } },
      _count: { select: { cilos: { where: { is_active: true } } } },
    },
    orderBy: { code: "asc" },
  });

  // Build unique programs list
  const programsMap = new Map<string, { id: string; code: string; name: string }>();
  rawCourses.forEach((c) => {
    if (c.program) {
      programsMap.set(c.program.id, c.program);
    }
  });

  const courses: FacultyCourseWithCiloCount[] = rawCourses.map((c) => {
    let scopeLabel = "Program-Specific";
    if (c.course_scope === CourseScope.GENERAL_EDUCATION) {
      scopeLabel = "General Education";
    } else if (c.major_id) {
      scopeLabel = "Major-Specific";
    }

    return {
      id: c.id,
      code: c.code,
      title: c.title,
      description: c.description,
      courseScope: c.course_scope,
      courseScopeLabel: scopeLabel,
      programId: c.program?.id ?? null,
      programCode: c.program?.code ?? null,
      programName: c.program?.name ?? null,
      majorId: c.major?.id ?? null,
      majorName: c.major?.name ?? null,
      ciloCount: c._count.cilos,
    };
  });

  return {
    success: true,
    data: {
      courses,
      programs: Array.from(programsMap.values()),
    },
  };
}
