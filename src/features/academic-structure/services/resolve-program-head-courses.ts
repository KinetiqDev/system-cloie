import { AcademicSemester, AcademicTerm, CourseScope, YearLevel } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { resolveProgramHeadContext } from "@/features/auth/services/resolve-program-head-context";
import type { ServiceResult } from "@/lib/utils/service-result";

export type ProgramHeadCourseItem = {
  id: string;
  code: string;
  title: string;
  course_scope: CourseScope;
  program_id: string | null;
  major_id: string | null;
  default_year_level: YearLevel | null;
  default_semester: AcademicSemester | null;
  default_term: AcademicTerm | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  program: { id: string; code: string; name: string } | null;
  major: { id: string; name: string } | null;
  _count: { cilos: number; course_bound_evaluations: number };
};

export type ProgramHeadCourseSummary = {
  total: number;
  programWide: number;
  majorSpecific: number;
  archived: number;
};

export type ProgramHeadCoursesResult = {
  courses: ProgramHeadCourseItem[];
  summary: ProgramHeadCourseSummary;
  program: { id: string; code: string; name: string };
  majors: Array<{ id: string; name: string; program_id: string }>;
};

function countCourseEvaluations(course: {
  course_assignments: Array<{ _count: { course_bound_evaluations: number } }>;
}) {
  return course.course_assignments.reduce(
    (sum, assignment) => sum + assignment._count.course_bound_evaluations,
    0
  );
}

export async function listProgramHeadCourses(
  programId: string
): Promise<ServiceResult<ProgramHeadCoursesResult>> {
  const contextResult = await resolveProgramHeadContext(programId);

  if (!contextResult.success) {
    return contextResult;
  }

  const selectedProgram = contextResult.data.selectedProgram;

  // Fetch PH-scoped courses (program-specific within assigned programs)
  const programCourses = await prisma.course.findMany({
    where: {
      program_id: selectedProgram.id,
      course_scope: CourseScope.PROGRAM_SPECIFIC,
    },
    include: {
      major: { select: { id: true, name: true } },
      program: { select: { id: true, code: true, name: true } },
      course_assignments: {
        where: { program_id: selectedProgram.id },
        select: {
          _count: {
            select: {
              course_bound_evaluations: true,
            },
          },
        },
      },
      _count: { select: { cilos: { where: { is_active: true } } } },
    },
    orderBy: [{ code: "asc" }],
  });

  const majors = await prisma.major.findMany({
    where: { program_id: selectedProgram.id, is_active: true },
    select: { id: true, name: true, program_id: true },
    orderBy: { name: "asc" },
  });

  const courses: ProgramHeadCourseItem[] = programCourses.map((c) => ({
    ...c,
    _count: {
      cilos: c._count.cilos,
      course_bound_evaluations: countCourseEvaluations(c),
    },
  }));

  const activeProgramCourses = programCourses.filter((c) => c.is_active);
  const summary: ProgramHeadCourseSummary = {
    total: activeProgramCourses.length,
    programWide: activeProgramCourses.filter((c) => !c.major_id).length,
    majorSpecific: activeProgramCourses.filter((c) => c.major_id !== null).length,
    archived: programCourses.filter((c) => !c.is_active).length,
  };

  return {
    success: true,
    data: { courses, summary, program: selectedProgram, majors },
  };
}
