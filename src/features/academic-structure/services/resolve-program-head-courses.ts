import { AcademicSemester, AcademicTerm, CourseScope, YearLevel } from "@prisma/client";
import { ROLES } from "@/lib/constants/roles";
import { prisma } from "@/lib/db/prisma";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";

export type ProgramHeadCourseItem = {
  id: string;
  code: string;
  title: string;
  description: string | null;
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
  isReadOnly: boolean;
};

export type ProgramHeadCourseSummary = {
  total: number;
  programWide: number;
  majorSpecific: number;
  generalEducation: number;
  archived: number;
};

export type ProgramHeadCoursesResult = {
  courses: ProgramHeadCourseItem[];
  summary: ProgramHeadCourseSummary;
  programs: Array<{ id: string; code: string; name: string }>;
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

async function resolveProgramHeadProgramIds(userId: string): Promise<string[]> {
  const rows = await prisma.programHeadAssignment.findMany({
    where: { program_head_id: userId, is_active: true },
    select: { program_id: true },
  });

  return [...new Set(rows.map((row) => row.program_id))];
}

export async function listProgramHeadCourses(): Promise<ProgramHeadCoursesResult | null> {
  const session = await resolveAuthSession();

  if (!session || session.activeRole !== ROLES.PROGRAM_HEAD) {
    return null;
  }

  const programIds = await resolveProgramHeadProgramIds(session.userId);

  // Fetch PH-scoped courses (program-specific within assigned programs)
  const programCourses = await prisma.course.findMany({
    where: {
      program_id: { in: programIds },
      course_scope: CourseScope.PROGRAM_SPECIFIC,
    },
    include: {
      major: { select: { id: true, name: true } },
      program: { select: { id: true, code: true, name: true } },
      course_assignments: {
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

  // Fetch GE courses (read-only for PH)
  const geCourses = await prisma.course.findMany({
    where: { course_scope: CourseScope.GENERAL_EDUCATION },
    include: {
      major: { select: { id: true, name: true } },
      program: { select: { id: true, code: true, name: true } },
      course_assignments: {
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

  // Fetch programs with majors for the form dropdowns
  const programs = await prisma.program.findMany({
    where: { id: { in: programIds }, is_active: true },
    select: { id: true, code: true, name: true },
    orderBy: { code: "asc" },
  });

  const majors = await prisma.major.findMany({
    where: { program_id: { in: programIds }, is_active: true },
    select: { id: true, name: true, program_id: true },
    orderBy: { name: "asc" },
  });

  const courses: ProgramHeadCourseItem[] = [
    ...programCourses.map((c) => ({
      ...c,
      _count: {
        cilos: c._count.cilos,
        course_bound_evaluations: countCourseEvaluations(c),
      },
      isReadOnly: false,
    })),
    ...geCourses.map((c) => ({
      ...c,
      _count: {
        cilos: c._count.cilos,
        course_bound_evaluations: countCourseEvaluations(c),
      },
      isReadOnly: true,
    })),
  ];

  const activeProgramCourses = programCourses.filter((c) => c.is_active);
  const summary: ProgramHeadCourseSummary = {
    total:
      programCourses.filter((c) => c.is_active).length +
      geCourses.filter((c) => c.is_active).length,
    programWide: activeProgramCourses.filter((c) => !c.major_id).length,
    majorSpecific: activeProgramCourses.filter((c) => c.major_id !== null).length,
    generalEducation: geCourses.filter((c) => c.is_active).length,
    archived: programCourses.filter((c) => !c.is_active).length,
  };

  return { courses, summary, programs, majors };
}
