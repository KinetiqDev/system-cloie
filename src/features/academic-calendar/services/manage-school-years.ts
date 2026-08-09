"use server";

import { Prisma, AcademicPeriodStatus, AcademicSemester } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { ROLES } from "@/lib/constants/roles";
import { CANONICAL_TERMS, formatSchoolYearCode } from "@/lib/constants/academic-period";
import {
  canActivateSchoolYear,
  canArchiveSchoolYear,
  canDeactivateSchoolYear,
  canSetActiveSemester,
} from "../policies";
import type {
  CreateSchoolYearInput,
  UpdateSchoolYearInput,
} from "../schemas/school-year";
import { type ServiceResult } from "@/lib/utils/service-result";
import { isUniqueConstraintError } from "@/lib/utils/prisma-errors";
import { invalidateAcademicPeriodReadModelTags } from "@/lib/cache/academic-periods";

/**
 * Verify secretary authentication through the active account role.
 */
async function verifyAdminAccess(): Promise<ServiceResult<{ userId: string }>> {
  const session = await resolveAuthSession();

  if (!session || session.activeRole !== ROLES.SECRETARY) {
    return { success: false, error: "Secretary access required" };
  }

  return { success: true, data: { userId: session.userId } };
}

/**
 * Create a new School Year together with its 5 canonical AcademicTermInstance
 * rows, all with status PLANNED. The whole operation is one Serializable
 * transaction: any term creation failure rolls back the School Year too.
 */
export async function createSchoolYear(
  input: CreateSchoolYearInput
): Promise<ServiceResult<{ id: string; code: string }>> {
  const auth = await verifyAdminAccess();
  if (!auth.success) return auth;

  const code = formatSchoolYearCode(input.startYear);

  try {
    const schoolYear = await prisma.$transaction(
      async (tx) => {
        const created = await tx.schoolYear.create({
          data: {
            code,
            start_date: input.startDate ?? null,
            end_date: input.endDate ?? null,
            is_archived: false,
          },
        });

        for (const canonical of CANONICAL_TERMS) {
          await tx.academicTermInstance.create({
            data: {
              school_year_id: created.id,
              semester: canonical.semester,
              term: canonical.term,
              status: AcademicPeriodStatus.PLANNED,
            },
          });
        }

        return created;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );

    invalidateAcademicPeriodReadModelTags();
    return {
      success: true,
      data: { id: schoolYear.id, code: schoolYear.code },
    };
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return {
        success: false,
        error: `A school year with code "${code}" already exists`,
      };
    }
    throw error;
  }
}

/**
 * Idempotently ensure every existing School Year has its 5 canonical term
 * instances, creating only the missing ones with status PLANNED. Safe to run
 * repeatedly: running twice changes nothing.
 */
export async function backfillCanonicalTermInstances(): Promise<
  { schoolYearId: string; created: number }[]
> {
  const schoolYears = await prisma.schoolYear.findMany({
    select: {
      id: true,
      term_instances: { select: { semester: true, term: true } },
    },
  });

  const backfilled: { schoolYearId: string; created: number }[] = [];

  for (const schoolYear of schoolYears) {
    const existing = new Set(
      schoolYear.term_instances.map((t) => `${t.semester}:${t.term ?? ""}`)
    );
    const missing = CANONICAL_TERMS.filter(
      (canonical) => !existing.has(`${canonical.semester}:${canonical.term ?? ""}`)
    );

    if (missing.length === 0) continue;

    await prisma.academicTermInstance.createMany({
      data: missing.map((canonical) => ({
        school_year_id: schoolYear.id,
        semester: canonical.semester,
        term: canonical.term,
        status: AcademicPeriodStatus.PLANNED,
      })),
      skipDuplicates: true,
    });

    backfilled.push({ schoolYearId: schoolYear.id, created: missing.length });
  }

  return backfilled;
}

/**
 * Update an existing School Year.
 */
export async function updateSchoolYear(
  input: UpdateSchoolYearInput
): Promise<ServiceResult<{ id: string }>> {
  const auth = await verifyAdminAccess();
  if (!auth.success) return auth;

  const existing = await prisma.schoolYear.findUnique({
    where: { id: input.id },
    select: { id: true, is_archived: true },
  });

  if (!existing) {
    return { success: false, error: "School year not found" };
  }

  if (existing.is_archived) {
    return { success: false, error: "Cannot modify an archived school year" };
  }

  const updated = await prisma.schoolYear.update({
    where: { id: input.id },
    data: {
      start_date: input.startDate ?? null,
      end_date: input.endDate ?? null,
    },
  });

  invalidateAcademicPeriodReadModelTags();
  return { success: true, data: { id: updated.id } };
}

/**
 * Archive a School Year.
 * Rejects the active School Year and any School Year containing the active
 * period. All reads, checks, and the write run in one Serializable transaction
 * so a concurrent activation cannot leave an archived School Year active.
 */
export async function archiveSchoolYear(
  id: string
): Promise<ServiceResult<{ id: string }>> {
  const auth = await verifyAdminAccess();
  if (!auth.success) return auth;

  try {
    const result = await prisma.$transaction(
      async (tx): Promise<ServiceResult<{ id: string }>> => {
        const schoolYear = await tx.schoolYear.findUnique({
          where: { id },
          select: {
            id: true,
            is_archived: true,
            is_active: true,
            term_instances: { select: { id: true } },
          },
        });

        if (!schoolYear) {
          return { success: false, error: "School year not found" };
        }

        if (schoolYear.is_active) {
          return {
            success: false,
            error: "Cannot archive the active school year; deactivate it first",
          };
        }

        const activeTerm = await tx.academicTermInstance.findFirst({
          where: { school_year_id: id, status: "ACTIVE" },
          select: { id: true },
        });

        const termInstanceIds = schoolYear.term_instances.map((t) => t.id);
        const check = canArchiveSchoolYear(
          id,
          activeTerm?.id ?? null,
          schoolYear.is_archived,
          termInstanceIds
        );

        if (!check.allowed) {
          return { success: false, error: check.reason };
        }

        await tx.schoolYear.update({
          where: { id },
          data: {
            is_archived: true,
            archived_by: auth.data.userId,
            archived_at: new Date(),
          },
        });

        return { success: true, data: { id } };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );

    if (result.success) {
      invalidateAcademicPeriodReadModelTags();
    }

    return result;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      return { success: false, error: "School year changed; retry the archive" };
    }
    throw error;
  }
}

/**
 * Activate a School Year.
 *
 * A School Year must have an active_semester before it can be activated: it
 * either already carries one, or the caller supplies it via `semester` and it
 * is persisted atomically with the activation (the database CHECK constraint
 * forbids an inactive School Year holding an active_semester, so the semester
 * cannot be set ahead of time). Any prior active School Year is deactivated
 * atomically inside the same Serializable transaction; the one-active-school-
 * year partial unique index in Postgres is the final authority under
 * concurrency (P2002 on a loser).
 *
 * All prerequisite reads and writes run inside the transaction so a concurrent
 * archive or deactivation cannot leave an invalid state behind.
 */
export async function activateSchoolYear(
  schoolYearId: string,
  semester?: AcademicSemester
): Promise<ServiceResult<{ id: string }>> {
  const auth = await verifyAdminAccess();
  if (!auth.success) return auth;

  try {
    const result = await prisma.$transaction(
      async (tx): Promise<ServiceResult<{ id: string }>> => {
        const existing = await tx.schoolYear.findUnique({
          where: { id: schoolYearId },
          select: { id: true, is_active: true, is_archived: true, active_semester: true },
        });

        if (!existing) {
          return { success: false, error: "School year not found" };
        }

        if (existing.is_archived) {
          return { success: false, error: "Cannot activate an archived school year" };
        }

        const effectiveSemester = existing.active_semester ?? semester ?? null;
        const check = canActivateSchoolYear(existing.is_active, effectiveSemester);
        if (!check.allowed) {
          return { success: false, error: check.reason };
        }

        // Replacing the active School Year must not silently deactivate one
        // that still contains an ACTIVE period — same guard as deactivation.
        const priorActiveWithPeriod = await tx.academicTermInstance.findFirst({
          where: {
            status: "ACTIVE",
            school_year: { is_active: true, id: { not: schoolYearId } },
          },
          select: { id: true },
        });

        if (priorActiveWithPeriod) {
          return {
            success: false,
            error:
              "Cannot activate a school year while the current active school year contains an active period",
          };
        }

        await tx.schoolYear.updateMany({
          where: { is_active: true, id: { not: schoolYearId } },
          data: {
            is_active: false,
            active_semester: null,
            active_semester_activated_by: null,
            active_semester_activated_at: null,
          },
        });

        await tx.schoolYear.update({
          where: { id: schoolYearId },
          data: {
            is_active: true,
            ...(existing.active_semester === null && effectiveSemester !== null
              ? {
                  active_semester: effectiveSemester,
                  active_semester_activated_by: auth.data.userId,
                  active_semester_activated_at: new Date(),
                }
              : {}),
          },
        });

        return { success: true, data: { id: schoolYearId } };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );

    if (result.success) {
      invalidateAcademicPeriodReadModelTags({ activePeriodChanged: true });
    }

    return result;
  } catch (error) {
    if (
      isUniqueConstraintError(error) ||
      (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034")
    ) {
      return {
        success: false,
        error: "Another school year is already active; retry the activation",
      };
    }
    throw error;
  }
}

/**
 * Deactivate a School Year. Rejects while any of its AcademicTermInstances is
 * ACTIVE. On success clears active_semester and its audit fields (the database
 * CHECK constraint requires active_semester IS NULL when is_active = false).
 *
 * The active-period check and the state flip run in one Serializable
 * transaction so a concurrent period activation cannot leave an inactive
 * School Year holding an ACTIVE period.
 */
export async function deactivateSchoolYear(
  schoolYearId: string
): Promise<ServiceResult<{ id: string }>> {
  const auth = await verifyAdminAccess();
  if (!auth.success) return auth;

  try {
    const result = await prisma.$transaction(
      async (tx): Promise<ServiceResult<{ id: string }>> => {
        const existing = await tx.schoolYear.findUnique({
          where: { id: schoolYearId },
          select: { id: true, is_active: true, is_archived: true },
        });

        if (!existing) {
          return { success: false, error: "School year not found" };
        }

        if (existing.is_archived) {
          return { success: false, error: "Cannot modify an archived school year" };
        }

        const activePeriod = await tx.academicTermInstance.findFirst({
          where: { school_year_id: schoolYearId, status: "ACTIVE" },
          select: { id: true },
        });

        const check = canDeactivateSchoolYear(existing.is_active, activePeriod !== null);
        if (!check.allowed) {
          return { success: false, error: check.reason };
        }

        await tx.schoolYear.update({
          where: { id: schoolYearId },
          data: {
            is_active: false,
            active_semester: null,
            active_semester_activated_by: null,
            active_semester_activated_at: null,
          },
        });

        return { success: true, data: { id: schoolYearId } };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );

    if (result.success) {
      invalidateAcademicPeriodReadModelTags({ activePeriodChanged: true });
    }

    return result;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      return { success: false, error: "School year changed; retry the deactivation" };
    }
    throw error;
  }
}

/**
 * Set the active semester of an active School Year, recording the activating
 * user and timestamp for audit. Mid-year changes move the active semester
 * without touching is_active, but are rejected while an AcademicTermInstance
 * in a different semester is still ACTIVE — the active period must be
 * completed first so the hierarchy stays consistent.
 */
export async function setActiveSemester(
  schoolYearId: string,
  semester: AcademicSemester
): Promise<ServiceResult<{ id: string }>> {
  const auth = await verifyAdminAccess();
  if (!auth.success) return auth;

  try {
    const result = await prisma.$transaction(
      async (tx): Promise<ServiceResult<{ id: string }>> => {
        const existing = await tx.schoolYear.findUnique({
          where: { id: schoolYearId },
          select: { id: true, is_active: true, is_archived: true },
        });

        if (!existing) {
          return { success: false, error: "School year not found" };
        }

        if (existing.is_archived) {
          return { success: false, error: "Cannot modify an archived school year" };
        }

        const check = canSetActiveSemester(existing.is_active, semester);
        if (!check.allowed) {
          return { success: false, error: check.reason };
        }

        const conflictingActivePeriod = await tx.academicTermInstance.findFirst({
          where: {
            school_year_id: schoolYearId,
            status: "ACTIVE",
            semester: { not: semester },
          },
          select: { id: true },
        });

        if (conflictingActivePeriod) {
          return {
            success: false,
            error:
              "Cannot change the active semester while a period in another semester is active",
          };
        }

        await tx.schoolYear.update({
          where: { id: schoolYearId },
          data: {
            active_semester: semester,
            active_semester_activated_by: auth.data.userId,
            active_semester_activated_at: new Date(),
          },
        });

        return { success: true, data: { id: schoolYearId } };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );

    if (result.success) {
      invalidateAcademicPeriodReadModelTags({ activePeriodChanged: true });
    }

    return result;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      return { success: false, error: "School year changed; retry the change" };
    }
    throw error;
  }
}
