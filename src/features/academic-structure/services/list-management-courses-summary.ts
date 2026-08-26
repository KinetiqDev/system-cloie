import { CourseScope } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ManagementCourseSummaryItem = {
  id: string;
  code: string;
  title: string;
  courseScope: CourseScope;
  courseScopeLabel: string;
  isActive: boolean;
  programId: string | null;
  programCode: string | null;
  programName: string | null;
  majorId: string | null;
  majorName: string | null;
  ciloCount: number;
  evaluationCount: number;
};

export type ManagementCoursesKPI = {
  totalCourses: number;
  activeCourses: number;
  generalEducationCourses: number;
  programSpecificCourses: number;
};

export type MajorFilterOption = {
  id: string;
  name: string;
};

export type ProgramFilterOption = {
  id: string;
  code: string;
  name: string;
  majors: MajorFilterOption[];
};

function countCourseEvaluations(course: {
  course_assignments: Array<{ _count: { course_bound_evaluations: number } }>;
}) {
  return course.course_assignments.reduce(
    (sum, assignment) => sum + assignment._count.course_bound_evaluations,
    0
  );
}

// ---------------------------------------------------------------------------
// Main service function
// ---------------------------------------------------------------------------

export async function listManagementCoursesSummary(): Promise<{
  courses: ManagementCourseSummaryItem[];
  kpi: ManagementCoursesKPI;
  programs: ProgramFilterOption[];
}> {
  const [rawCourses, rawPrograms] = await Promise.all([
    prisma.course.findMany({
      include: {
        program: { select: { id: true, code: true, name: true } },
        major: { select: { id: true, name: true } },
        course_assignments: {
          select: {
            _count: {
              select: {
                course_bound_evaluations: true,
              },
            },
          },
        },
        _count: {
          select: {
            cilos: { where: { is_active: true } },
          },
        },
      },
      orderBy: { code: "asc" },
    }),
    prisma.program.findMany({
      where: { is_active: true },
      select: {
        id: true,
        code: true,
        name: true,
        majors: {
          where: { is_active: true },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        },
      },
      orderBy: { code: "asc" },
    }),
  ]);

  // KPI accumulators
  let activeCourses = 0;
  let generalEducationCourses = 0;
  let programSpecificCourses = 0;

  const courses: ManagementCourseSummaryItem[] = rawCourses.map((c) => {
    if (c.is_active) activeCourses++;
    if (c.course_scope === CourseScope.GENERAL_EDUCATION) {
      generalEducationCourses++;
    } else {
      programSpecificCourses++;
    }

    return {
      id: c.id,
      code: c.code,
      title: c.title,
      courseScope: c.course_scope,
      courseScopeLabel:
        c.course_scope === CourseScope.GENERAL_EDUCATION ? "General Education" : "Program-Specific",
      isActive: c.is_active,
      programId: c.program?.id ?? null,
      programCode: c.program?.code ?? null,
      programName: c.program?.name ?? null,
      majorId: c.major?.id ?? null,
      majorName: c.major?.name ?? null,
      ciloCount: c._count.cilos,
      evaluationCount: countCourseEvaluations(c),
    };
  });

  return {
    courses,
    kpi: {
      totalCourses: rawCourses.length,
      activeCourses,
      generalEducationCourses,
      programSpecificCourses,
    },
    programs: rawPrograms,
  };
}
