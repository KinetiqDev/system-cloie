import { prisma } from "@/lib/db/prisma";
import type { TermInstanceItem } from "@/features/academic-calendar/types";
import type { AssignableCourse } from "@/features/course-assignments/types";

export type FacultyOption = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};

export type ProgramOption = {
  id: string;
  code: string;
  name: string;
};

export type AllProgramCourseAssignmentsPageData = {
  availableCourses: AssignableCourse[];
  availablePrograms: ProgramOption[];
  availableFaculty: FacultyOption[];
  termInstances: TermInstanceItem[];
};

/**
 * Load the page data shared by all-program Course assignment managers
 * (Secretary and Dean). Keeps route files thin and avoids duplicating
 * dropdown-loading queries across role-owned dashboard routes.
 */
export async function loadAllProgramCourseAssignmentsPageData(): Promise<AllProgramCourseAssignmentsPageData> {
  const [schoolYears, programs, courses, faculty] = await Promise.all([
    prisma.schoolYear.findMany({
      include: {
        term_instances: {
          orderBy: [
            { semester: "asc" },
            { term: "asc" },
          ],
        },
      },
      orderBy: { created_at: "desc" },
    }),
    prisma.program.findMany({
      where: { is_active: true },
      select: { id: true, code: true, name: true },
      orderBy: { code: "asc" },
    }),
    prisma.course.findMany({
      where: { is_active: true },
      select: {
        id: true,
        code: true,
        title: true,
        default_year_level: true,
        course_scope: true,
        program_id: true,
      },
      orderBy: { code: "asc" },
    }),
    prisma.facultyProgramAffiliation.findMany({
      where: { is_active: true },
      select: {
        faculty: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
          },
        },
      },
    }),
  ]);

  const availableFaculty = [
    ...new Map(
      faculty.map(({ faculty: f }) => [
        f.id,
        { id: f.id, firstName: f.first_name, lastName: f.last_name, email: f.email },
      ])
    ).values(),
  ].sort((a, b) => a.lastName.localeCompare(b.lastName));

  const termInstances: TermInstanceItem[] = schoolYears.flatMap((sy) =>
    sy.term_instances.map((ti) => ({
      id: ti.id,
      schoolYearId: ti.school_year_id,
      schoolYearCode: sy.code,
      semester: ti.semester,
      term: ti.term,
      startDate: ti.start_date,
      endDate: ti.end_date,
      isActive: ti.is_active,
      createdAt: ti.created_at,
      updatedAt: ti.updated_at,
    }))
  );

  const availableCourses: AssignableCourse[] = courses.map((c) => ({
    id: c.id,
    code: c.code,
    title: c.title,
    default_year_level: c.default_year_level,
    course_scope: c.course_scope,
    program_id: c.program_id,
  }));

  return {
    availableCourses,
    availablePrograms: programs,
    availableFaculty,
    termInstances,
  };
}
