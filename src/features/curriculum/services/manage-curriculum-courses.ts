"use server";

import {
  AcademicSemester,
  AcademicTerm,
  CourseScope,
  CurriculumVersionStatus,
  Prisma,
  type Prisma as PrismaTypes,
  YearLevel,
} from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { type ServiceResult } from "@/lib/utils/service-result";
import { assertValidSemesterTerm } from "@/lib/constants/academic-period";
import { canModifyCurriculumCourse } from "../policies";
import type { AddCurriculumCourseInput, UpdateCurriculumCourseInput } from "../types";
import {
  addCurriculumCourseSchema,
  removeCurriculumCourseSchema,
  updateCurriculumCourseSchema,
} from "../schemas/curriculum";
import { assertProgramAccess, resolveWriteActor } from "./curriculum-write-auth";

type Tx = PrismaTypes.TransactionClient;

/**
 * Validate the merged placement (supplied fields over the stored placement)
 * before mutating. Mirrors the database CHECK constraint on curriculum_courses.
 */
function validateMergedPlacement(
  semester: AcademicSemester,
  term: AcademicTerm | null
): ServiceResult<null> {
  const check = assertValidSemesterTerm(semester, term);
  if (check.valid) {
    return { success: true, data: null };
  }
  return { success: false, error: check.error };
}

/**
 * Load the version a course row belongs to, with its program and status.
 */
async function resolveVersionScope(
  tx: Tx,
  versionId: string
): Promise<ServiceResult<{ status: CurriculumVersionStatus; program_id: string }>> {
  const version = await tx.curriculumVersion.findUnique({
    where: { id: versionId },
    select: { id: true, status: true, program_id: true },
  });

  if (!version) {
    return { success: false, error: "Curriculum version not found" };
  }

  return { success: true, data: version };
}

/**
 * A Course may be placed in a Curriculum Version when it is a shared General
 * Education Course or belongs to the version's program. Rejects program-specific
 * Courses owned by another program, matching the browser picker filter.
 */
function resolveCoursePlacementEligibility(
  course: { program_id: string | null; course_scope: CourseScope },
  programId: string
): { allowed: true } | { allowed: false; error: string } {
  if (course.course_scope === CourseScope.GENERAL_EDUCATION || course.program_id === null) {
    return { allowed: true };
  }
  if (course.program_id !== programId) {
    return {
      allowed: false,
      error: "Course does not belong to this program",
    };
  }
  return { allowed: true };
}

/**
 * Add a Course placement to a DRAFT Curriculum Version. Captures the Course's
 * current code and title as snapshots. The same Course may appear multiple
 * times in one version.
 */
export async function addCurriculumCourse(
  input: AddCurriculumCourseInput
): Promise<ServiceResult<{ id: string }>> {
  const parsed = addCurriculumCourseSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const actor = await resolveWriteActor();
  if (!actor.success) return actor;

  try {
    const result = await prisma.$transaction(
      async (tx): Promise<ServiceResult<{ id: string }>> => {
        const scope = await resolveVersionScope(tx, parsed.data.curriculumVersionId);
        if (!scope.success) return scope;

        const access = await assertProgramAccess(actor.data, tx, scope.data.program_id);
        if (!access.success) return access;

        const decision = canModifyCurriculumCourse(scope.data.status);
        if (!decision.allowed) {
          return { success: false, error: decision.reason };
        }

        const course = await tx.course.findUnique({
          where: { id: parsed.data.courseId },
          select: {
            id: true,
            code: true,
            title: true,
            program_id: true,
            course_scope: true,
            is_active: true,
          },
        });
        if (!course) {
          return { success: false, error: "Course not found" };
        }
        if (!course.is_active) {
          return { success: false, error: "Inactive courses cannot be added to curricula" };
        }

        const placement = resolveCoursePlacementEligibility(course, scope.data.program_id);
        if (!placement.allowed) {
          return { success: false, error: placement.error };
        }

        const created = await tx.curriculumCourse.create({
          data: {
            curriculum_version_id: parsed.data.curriculumVersionId,
            course_id: course.id,
            year_level: parsed.data.yearLevel,
            semester: parsed.data.semester,
            term: parsed.data.term ?? null,
            course_code_snapshot: course.code,
            course_title_snapshot: course.title,
          },
          select: { id: true },
        });

        return { success: true, data: created };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );

    return result;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      return { success: false, error: "Curriculum version changed; retry the change" };
    }
    throw error;
  }
}

/**
 * Remove a Course placement from a DRAFT Curriculum Version. Rejected on
 * PUBLISHED and RETIRED versions.
 */
export async function removeCurriculumCourse(
  id: string
): Promise<ServiceResult<{ id: string }>> {
  const parsed = removeCurriculumCourseSchema.safeParse({ id });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const actor = await resolveWriteActor();
  if (!actor.success) return actor;

  try {
    const result = await prisma.$transaction(
      async (tx): Promise<ServiceResult<{ id: string }>> => {
        const course = await tx.curriculumCourse.findUnique({
          where: { id },
          select: {
            id: true,
            curriculum_version: { select: { id: true, status: true, program_id: true } },
          },
        });

        if (!course) {
          return { success: false, error: "Curriculum course not found" };
        }

        const version = course.curriculum_version;
        const access = await assertProgramAccess(actor.data, tx, version.program_id);
        if (!access.success) return access;

        const decision = canModifyCurriculumCourse(version.status);
        if (!decision.allowed) {
          return { success: false, error: decision.reason };
        }

        await tx.curriculumCourse.delete({ where: { id } });

        return { success: true, data: { id } };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );

    return result;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      return { success: false, error: "Curriculum version changed; retry the change" };
    }
    throw error;
  }
}

/**
 * Update a Course placement (year level, semester, term) within a DRAFT
 * Curriculum Version. Rejected on PUBLISHED and RETIRED versions. Changing
 * the placement never rewrites the snapshots.
 */
export async function updateCurriculumCourse(
  id: string,
  input: UpdateCurriculumCourseInput
): Promise<ServiceResult<{ id: string }>> {
  const parsed = updateCurriculumCourseSchema.safeParse({ ...input, id });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const actor = await resolveWriteActor();
  if (!actor.success) return actor;

  try {
    const result = await prisma.$transaction(
      async (tx): Promise<ServiceResult<{ id: string }>> => {
        const course = await tx.curriculumCourse.findUnique({
          where: { id },
          select: {
            id: true,
            semester: true,
            term: true,
            curriculum_version: { select: { id: true, status: true, program_id: true } },
          },
        });

        if (!course) {
          return { success: false, error: "Curriculum course not found" };
        }

        const version = course.curriculum_version;
        const access = await assertProgramAccess(actor.data, tx, version.program_id);
        if (!access.success) return access;

        const decision = canModifyCurriculumCourse(version.status);
        if (!decision.allowed) {
          return { success: false, error: decision.reason };
        }

        const merged = validateMergedPlacement(
          parsed.data.semester ?? course.semester,
          parsed.data.term !== undefined ? parsed.data.term : course.term
        );
        if (!merged.success) return merged;

        await tx.curriculumCourse.update({
          where: { id },
          data: buildPlacementUpdateData(parsed.data),
        });

        return { success: true, data: { id } };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );

    return result;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      return { success: false, error: "Curriculum version changed; retry the change" };
    }
    throw error;
  }
}

/**
 * Build the Prisma update data for a placement, applying only the fields the
 * caller supplied. Keeps the transaction callback branch-light.
 */
function buildPlacementUpdateData(input: UpdateCurriculumCourseInput): {
  year_level?: YearLevel;
  semester?: AcademicSemester;
  term?: AcademicTerm | null;
} {
  return {
    ...(input.yearLevel !== undefined ? { year_level: input.yearLevel } : {}),
    ...(input.semester !== undefined ? { semester: input.semester } : {}),
    ...(input.term !== undefined ? { term: input.term } : {}),
  };
}
