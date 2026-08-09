import { CourseScope } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import type { ServiceResult } from "@/lib/utils/service-result";
import { listSchoolYears } from "@/features/academic-calendar/services/list-school-years";
import { resolveProgramHeadContext } from "@/features/auth/services/resolve-program-head-context";
import type {
  CurriculumCourseOption,
  CurriculumPageProgram,
  CurriculumVersionSummaryItem,
  SchoolYearOption,
} from "../types";

/**
 * All program options for the Secretary curriculum pages, ordered by code.
 * Programs are a bounded selector list (id/code/name per program).
 */
async function listAllCurriculumPrograms(): Promise<CurriculumPageProgram[]> {
  return prisma.program.findMany({
    select: { id: true, code: true, name: true },
    orderBy: { code: "asc" },
  });
}

/**
 * Curriculum versions for one program, newest first, with course counts.
 * Scoped to a single program so page reads stay bounded.
 */
export async function listProgramCurriculaSummary(
  programId: string
): Promise<CurriculumVersionSummaryItem[]> {
  const versions = await prisma.curriculumVersion.findMany({
    where: { program_id: programId },
    include: { _count: { select: { courses: true } } },
    orderBy: { created_at: "desc" },
  });

  return versions.map((version) => ({
    id: version.id,
    programId: version.program_id,
    majorId: version.major_id,
    code: version.code,
    name: version.name,
    status: version.status,
    effectiveFromSchoolYearId: version.effective_from_school_year_id,
    publishedAt: version.published_at,
    publishedBy: version.published_by,
    createdAt: version.created_at,
    updatedAt: version.updated_at,
    courseCount: version._count.courses,
  }));
}

/**
 * Active course options for the add-course picker, scoped to one program:
 * that program's program-specific courses plus shared General Education
 * courses. Loaded on demand when adding courses, never as a global catalog.
 */
export async function listCurriculumCourseOptions(
  programId: string
): Promise<CurriculumCourseOption[]> {
  const courses = await prisma.course.findMany({
    where: {
      is_active: true,
      OR: [{ program_id: programId }, { course_scope: CourseScope.GENERAL_EDUCATION }],
    },
    select: { id: true, code: true, title: true, program_id: true },
    orderBy: { code: "asc" },
  });

  return courses.map((course) => ({
    id: course.id,
    code: course.code,
    title: course.title,
    programId: course.program_id,
  }));
}

/**
 * Non-archived school years for the effective school year selector.
 */
async function listSchoolYearOptions(): Promise<SchoolYearOption[]> {
  const { items } = await listSchoolYears({ includeArchived: false });
  return items.map((year) => ({ id: year.id, code: year.code }));
}

/**
 * Secretary curriculum page data: the bounded program selector list and school
 * years. Curricula and course options load on demand per selected program.
 */
export async function listSecretaryCurriculumPageData() {
  const [programs, schoolYears] = await Promise.all([
    listAllCurriculumPrograms(),
    listSchoolYearOptions(),
  ]);

  return { programs, schoolYears };
}

type ProgramHeadCurriculumPageData = {
  program: CurriculumPageProgram;
  schoolYears: SchoolYearOption[];
};

/**
 * Program Head curriculum page data, scoped to the selected assigned program
 * per ADR 0009. Returns the context failure unchanged so pages can notFound().
 */
export async function listProgramHeadCurriculumPageData(
  programId: string
): Promise<ServiceResult<ProgramHeadCurriculumPageData>> {
  const context = await resolveProgramHeadContext(programId);
  if (!context.success) return context;

  const schoolYears = await listSchoolYearOptions();

  return {
    success: true,
    data: {
      program: context.data.selectedProgram,
      schoolYears,
    },
  };
}
