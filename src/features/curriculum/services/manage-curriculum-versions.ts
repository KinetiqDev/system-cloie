"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { type ServiceResult } from "@/lib/utils/service-result";
import { isUniqueConstraintError } from "@/lib/utils/prisma-errors";
import {
  canEditCurriculumVersion,
  canPublishCurriculumVersion,
  canRetireCurriculumVersion,
} from "../policies";
import type { CreateCurriculumVersionInput } from "../types";
import {
  createCurriculumVersionSchema,
  publishCurriculumVersionSchema,
} from "../schemas/curriculum";
import { assertProgramAccess, resolveWriteActor } from "./curriculum-write-auth";

const MAX_CLONE_CODE_ATTEMPTS = 10;

/**
 * Create a DRAFT Curriculum Version for a program. PROGRAM_HEAD callers are
 * scoped to their active ProgramHeadAssignment set.
 */
export async function createCurriculumVersion(
  input: CreateCurriculumVersionInput
): Promise<ServiceResult<{ id: string }>> {
  const parsed = createCurriculumVersionSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const actor = await resolveWriteActor();
  if (!actor.success) return actor;

  try {
    const result = await prisma.$transaction(
      async (tx): Promise<ServiceResult<{ id: string }>> => {
        const access = await assertProgramAccess(actor.data, tx, parsed.data.programId);
        if (!access.success) return access;

      if (parsed.data.majorId) {
        const major = await tx.major.findFirst({
          where: { id: parsed.data.majorId, program_id: parsed.data.programId },
          select: { id: true },
        });
        if (!major) {
          return { success: false, error: "Major does not belong to the selected program" };
        }
      }

      const created = await tx.curriculumVersion.create({
        data: {
          program_id: parsed.data.programId,
          major_id: parsed.data.majorId ?? null,
          code: parsed.data.code,
          name: parsed.data.name ?? null,
          effective_from_school_year_id: parsed.data.effectiveFromSchoolYearId ?? null,
          status: "DRAFT",
        },
        select: { id: true },
      });

      return { success: true as const, data: created };
    });

    return result;
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return {
        success: false,
        error: `A curriculum with code "${parsed.data.code}" already exists for this program`,
      };
    }
    throw error;
  }
}

/**
 * Publish a DRAFT Curriculum Version: promotes to PUBLISHED, records
 * published_at and published_by. Rejects versions with no courses and any
 * version that is already immutable. Runs in a Serializable transaction so a
 * concurrent publish or course removal cannot leave an empty version
 * published.
 */
export async function publishCurriculumVersion(
  id: string
): Promise<ServiceResult<{ id: string; status: "PUBLISHED" }>> {
  const parsed = publishCurriculumVersionSchema.safeParse({ id });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const actor = await resolveWriteActor();
  if (!actor.success) return actor;

  try {
    const result = await prisma.$transaction(
      async (tx): Promise<ServiceResult<{ id: string; status: "PUBLISHED" }>> => {
        const existing = await tx.curriculumVersion.findUnique({
          where: { id },
          select: { id: true, status: true, program_id: true },
        });

        if (!existing) {
          return { success: false, error: "Curriculum version not found" };
        }

        const access = await assertProgramAccess(actor.data, tx, existing.program_id);
        if (!access.success) return access;

        const courseCount = await tx.curriculumCourse.count({
          where: { curriculum_version_id: id },
        });

        const decision = canPublishCurriculumVersion(existing.status, courseCount);
        if (!decision.allowed) {
          return { success: false, error: decision.reason };
        }

        const updated = await tx.curriculumVersion.updateMany({
          where: { id, status: "DRAFT" },
          data: {
            status: "PUBLISHED",
            published_at: new Date(),
            published_by: actor.data.userId,
          },
        });
        if (updated.count !== 1) {
          return { success: false, error: "Curriculum version changed; retry the publish" };
        }

        return { success: true, data: { id, status: "PUBLISHED" } };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );

    return result;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      return { success: false, error: "Curriculum version changed; retry the publish" };
    }
    throw error;
  }
}

/**
 * Retire a PUBLISHED Curriculum Version: promotes to RETIRED. RETIRED versions
 * stay fully queryable but are no longer offered for new assignments.
 */
export async function retireCurriculumVersion(
  id: string
): Promise<ServiceResult<{ id: string; status: "RETIRED" }>> {
  const parsed = publishCurriculumVersionSchema.safeParse({ id });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const actor = await resolveWriteActor();
  if (!actor.success) return actor;

  try {
    const result = await prisma.$transaction(
      async (tx): Promise<ServiceResult<{ id: string; status: "RETIRED" }>> => {
        const existing = await tx.curriculumVersion.findUnique({
          where: { id },
          select: { id: true, status: true, program_id: true },
        });

        if (!existing) {
          return { success: false, error: "Curriculum version not found" };
        }

        const access = await assertProgramAccess(actor.data, tx, existing.program_id);
        if (!access.success) return access;

        const decision = canRetireCurriculumVersion(existing.status);
        if (!decision.allowed) {
          return { success: false, error: decision.reason };
        }

        const updated = await tx.curriculumVersion.updateMany({
          where: { id, status: "PUBLISHED" },
          data: { status: "RETIRED" },
        });
        if (updated.count !== 1) {
          return { success: false, error: "Curriculum version changed; retry the retire" };
        }

        return { success: true, data: { id, status: "RETIRED" } };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );

    return result;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      return { success: false, error: "Curriculum version changed; retry the retire" };
    }
    throw error;
  }
}

/**
 * Derive the code for a clone: the source code suffixed with "-COPY", falling
 * back to "-COPY-2", "-COPY-3", ... when the plain suffix is already taken.
 */
function deriveCloneCode(sourceCode: string, attempt: number): string {
  return attempt === 1 ? `${sourceCode}-COPY` : `${sourceCode}-COPY-${attempt}`;
}

/**
 * Clone a PUBLISHED or RETIRED Curriculum Version into a new DRAFT with
 * identical CurriculumCourse rows (placements and snapshots). The original
 * version is never modified. The clone keeps the source's major scope and
 * name but starts with no effectivity and no publish metadata.
 */
export async function cloneCurriculumVersion(
  id: string
): Promise<ServiceResult<{ id: string; code: string }>> {
  const parsed = publishCurriculumVersionSchema.safeParse({ id });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const actor = await resolveWriteActor();
  if (!actor.success) return actor;

  for (let attempt = 1; attempt <= MAX_CLONE_CODE_ATTEMPTS; attempt++) {
    try {
      const result = await prisma.$transaction(
        async (tx): Promise<ServiceResult<{ id: string; code: string }>> => {
          const source = await tx.curriculumVersion.findUnique({
            where: { id },
            select: {
              id: true,
              status: true,
              program_id: true,
              major_id: true,
              code: true,
              name: true,
              courses: {
                select: {
                  course_id: true,
                  year_level: true,
                  semester: true,
                  term: true,
                  course_code_snapshot: true,
                  course_title_snapshot: true,
                },
              },
            },
          });

          if (!source) {
            return { success: false, error: "Curriculum version not found" };
          }

          const access = await assertProgramAccess(actor.data, tx, source.program_id);
          if (!access.success) return access;

          const editDecision = canEditCurriculumVersion(source.status);
          if (editDecision.allowed) {
            return {
              success: false,
              error: "Only published or retired curricula can be cloned",
            };
          }

          const code = deriveCloneCode(source.code, attempt);

          const clone = await tx.curriculumVersion.create({
            data: {
              program_id: source.program_id,
              major_id: source.major_id,
              code,
              name: source.name,
              status: "DRAFT",
              courses: {
                create: source.courses.map((course) => ({
                  course_id: course.course_id,
                  year_level: course.year_level,
                  semester: course.semester,
                  term: course.term,
                  course_code_snapshot: course.course_code_snapshot,
                  course_title_snapshot: course.course_title_snapshot,
                })),
              },
            },
            select: { id: true, code: true },
          });

          return { success: true, data: clone };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      );

      return result;
    } catch (error) {
      if (!isUniqueConstraintError(error)) {
        throw error;
      }
      // The derived code collided (concurrent clone or prior "-COPY" rows);
      // retry with the next suffix. Exhausting attempts falls through.
    }
  }

  return {
    success: false,
    error: "Unable to derive a unique code for the cloned curriculum; retry the clone",
  };
}
