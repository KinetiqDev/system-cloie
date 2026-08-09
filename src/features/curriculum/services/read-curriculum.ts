import { prisma } from "@/lib/db/prisma";
import type { CurriculumCourseItem, CurriculumVersionDetail, CurriculumVersionItem } from "../types";

function toCurriculumVersionItem(version: {
  id: string;
  program_id: string;
  major_id: string | null;
  code: string;
  name: string | null;
  status: CurriculumVersionItem["status"];
  effective_from_school_year_id: string | null;
  published_at: Date | null;
  published_by: string | null;
  created_at: Date;
  updated_at: Date;
}): CurriculumVersionItem {
  return {
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
  };
}

function toCurriculumCourseItem(course: {
  id: string;
  curriculum_version_id: string;
  course_id: string;
  year_level: CurriculumCourseItem["yearLevel"];
  semester: CurriculumCourseItem["semester"];
  term: CurriculumCourseItem["term"];
  course_code_snapshot: string;
  course_title_snapshot: string;
  created_at: Date;
  updated_at: Date;
}): CurriculumCourseItem {
  return {
    id: course.id,
    curriculumVersionId: course.curriculum_version_id,
    courseId: course.course_id,
    yearLevel: course.year_level,
    semester: course.semester,
    term: course.term,
    courseCodeSnapshot: course.course_code_snapshot,
    courseTitleSnapshot: course.course_title_snapshot,
    createdAt: course.created_at,
    updatedAt: course.updated_at,
  };
}

/**
 * List the Curriculum Versions of a program, newest first.
 */
export async function listProgramCurricula(
  programId: string
): Promise<CurriculumVersionItem[]> {
  const versions = await prisma.curriculumVersion.findMany({
    where: { program_id: programId },
    orderBy: { created_at: "desc" },
  });

  return versions.map(toCurriculumVersionItem);
}

export async function getCurriculumVersionProgramId(id: string): Promise<string | null> {
  const version = await prisma.curriculumVersion.findUnique({
    where: { id },
    select: { program_id: true },
  });

  return version?.program_id ?? null;
}

/**
 * Get a single Curriculum Version with its courses and program/major context.
 * Returns null when the version does not exist.
 */
export async function getCurriculumVersionDetail(
  id: string
): Promise<CurriculumVersionDetail | null> {
  const version = await prisma.curriculumVersion.findUnique({
    where: { id },
    include: {
      program: { select: { id: true, code: true, name: true } },
      major: { select: { id: true, name: true } },
      courses: {
        orderBy: [{ year_level: "asc" }, { semester: "asc" }, { term: "asc" }],
      },
    },
  });

  if (!version) {
    return null;
  }

  return {
    ...toCurriculumVersionItem(version),
    program: version.program,
    major: version.major,
    courses: version.courses.map(toCurriculumCourseItem),
  };
}

export async function getCurriculumCourseProgramId(id: string): Promise<string | null> {
  const course = await prisma.curriculumCourse.findUnique({
    where: { id },
    select: { curriculum_version: { select: { program_id: true } } },
  });

  return course?.curriculum_version.program_id ?? null;
}
