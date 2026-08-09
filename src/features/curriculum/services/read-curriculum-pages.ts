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
 */
async function listAllCurriculumPrograms(): Promise<CurriculumPageProgram[]> {
  return prisma.program.findMany({
    select: { id: true, code: true, name: true },
    orderBy: { code: "asc" },
  });
}

/**
 * All curricula across every program, newest first, with course counts.
 */
async function listAllCurricula(): Promise<CurriculumVersionSummaryItem[]> {
  const versions = await prisma.curriculumVersion.findMany({
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
 * Curriculum versions for one program, newest first, with course counts.
 */
async function listProgramCurriculaSummary(
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
 * Active course options for the add-course picker. PROGRAM_HEAD callers pass
 * their selected program so only that program's program-specific courses and
 * shared General Education courses are offered.
 */
async function listCurriculumCourseOptions(
  programId?: string
): Promise<CurriculumCourseOption[]> {
  const where =
    programId === undefined
      ? { is_active: true }
      : {
          is_active: true,
          OR: [{ program_id: programId }, { course_scope: CourseScope.GENERAL_EDUCATION }],
        };

  const courses = await prisma.course.findMany({
    where,
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
 * Secretary curriculum page data: every program, every curriculum, the full
 * active course catalog, and school years.
 */
export async function listSecretaryCurriculumPageData() {
  const [programs, curricula, courses, schoolYears] = await Promise.all([
    listAllCurriculumPrograms(),
    listAllCurricula(),
    listCurriculumCourseOptions(),
    listSchoolYearOptions(),
  ]);

  return { programs, curricula, courses, schoolYears };
}

type ProgramHeadCurriculumPageData = {
  program: CurriculumPageProgram;
  curricula: CurriculumVersionSummaryItem[];
  courses: CurriculumCourseOption[];
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

  const [curricula, courses, schoolYears] = await Promise.all([
    listProgramCurriculaSummary(programId),
    listCurriculumCourseOptions(programId),
    listSchoolYearOptions(),
  ]);

  return {
    success: true,
    data: {
      program: context.data.selectedProgram,
      curricula,
      courses,
      schoolYears,
    },
  };
}
