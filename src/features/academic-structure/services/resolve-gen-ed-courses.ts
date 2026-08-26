import { CourseScope } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { ROLES } from "@/lib/constants/roles";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import type { ServiceResult } from "@/lib/utils/service-result";

export type GenEdCourseItem = {
  id: string;
  code: string;
  title: string;
  course_scope: CourseScope;
  program_id: string | null;
  major_id: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  _count: { cilos: number };
};

export type GenEdCoursesSummary = {
  total: number;
  active: number;
  archived: number;
};

// fallow-ignore-next-line unused-type
export type GenEdCoursesResult = {
  courses: GenEdCourseItem[];
  summary: GenEdCoursesSummary;
};

export async function listGenEdCourses(): Promise<ServiceResult<GenEdCoursesResult>> {
  const session = await resolveAuthSession();

  if (!session) {
    return { success: false, error: "Authentication is required." };
  }

  if (session.activeRole !== ROLES.GEN_ED_COORDINATOR) {
    return {
      success: false,
      error: "You do not have permission to view General Education courses.",
    };
  }

  const courses = await prisma.course.findMany({
    where: { course_scope: CourseScope.GENERAL_EDUCATION },
    include: { _count: { select: { cilos: { where: { is_active: true } } } } },
    orderBy: [{ code: "asc" }],
  });

  const active = courses.filter((c) => c.is_active).length;
  const archived = courses.length - active;

  const mapped: GenEdCourseItem[] = courses.map((c) => ({
    id: c.id,
    code: c.code,
    title: c.title,
    course_scope: c.course_scope,
    program_id: c.program_id,
    major_id: c.major_id,
    is_active: c.is_active,
    created_at: c.created_at,
    updated_at: c.updated_at,
    _count: { cilos: c._count.cilos },
  }));

  return {
    success: true,
    data: {
      courses: mapped,
      summary: { total: courses.length, active, archived },
    },
  };
}
