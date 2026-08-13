import { prisma } from "@/lib/db/prisma";
import type { TermInstanceItem } from "@/features/academic-calendar/types";
import type { AssignableCourse } from "@/features/course-assignments/types";
import { CourseScope } from "@prisma/client";
import { resolveProgramHeadContext } from "@/features/auth/services/resolve-program-head-context";

export type FacultyOption = {
  id: string;
  /** Opaque canonical account name (ADR 0014). No first/last aliases. */
  name: string;
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
export async function loadAllProgramCourseAssignmentsPageData(
  selectedProgramId?: string
): Promise<AllProgramCourseAssignmentsPageData> {
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
      where: {
        is_active: true,
        ...(selectedProgramId ? { id: selectedProgramId } : {}),
      },
      select: { id: true, code: true, name: true },
      orderBy: { code: "asc" },
    }),
    prisma.course.findMany({
      where: {
        is_active: true,
        ...(selectedProgramId
          ? { program_id: selectedProgramId, course_scope: CourseScope.PROGRAM_SPECIFIC }
          : {}),
      },
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
            name: true,
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
        { id: f.id, name: f.name, email: f.email },
      ])
    ).values(),
  ].sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));

  const termInstances: TermInstanceItem[] = schoolYears.flatMap((sy) =>
    sy.term_instances.map((ti) => ({
      id: ti.id,
      schoolYearId: ti.school_year_id,
      schoolYearCode: sy.code,
      semester: ti.semester,
      term: ti.term,
      startDate: ti.start_date,
      endDate: ti.end_date,
      status: ti.status,
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

export async function loadProgramHeadCourseAssignmentsPageData(
  programId: string
): Promise<AllProgramCourseAssignmentsPageData> {
  const contextResult = await resolveProgramHeadContext(programId);
  if (!contextResult.success) {
    throw new Error(contextResult.error);
  }

  return loadAllProgramCourseAssignmentsPageData(contextResult.data.selectedProgram.id);
}
