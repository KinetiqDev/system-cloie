"use server";

import { AcademicPeriodStatus, AcademicSemester, Prisma, type Prisma as PrismaTypes } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { ROLES } from "@/lib/constants/roles";
import { type ServiceResult } from "@/lib/utils/service-result";
import { canTransitionPeriod } from "../policies";
import { persistPeriodReadinessSnapshot } from "./read-period-readiness";
import { invalidateAcademicPeriodReadModelTags } from "@/lib/cache/academic-periods";

type Tx = PrismaTypes.TransactionClient;

type PeriodWithSchoolYear = {
  semester: AcademicSemester | null;
  school_year: {
    is_archived: boolean;
    is_active: boolean;
    active_semester: AcademicSemester | null;
  } | null;
};

/**
 * Validate the School Year hierarchy before activating a period: the School
 * Year must be unarchived, active, and its active_semester must match the
 * period's semester. Returns an error message, or null when valid.
 */
function checkActivationHierarchy(period: PeriodWithSchoolYear): string | null {
  const schoolYear = period.school_year;
  if (!schoolYear) return "Academic period has no school year";
  if (schoolYear.is_archived) {
    return "Cannot activate a term in an archived school year";
  }
  if (!schoolYear.is_active) {
    return "Cannot activate a term in a school year that is not active";
  }
  if (period.semester !== schoolYear.active_semester) {
    return "Period semester does not match the school year's active semester";
  }
  return null;
}

/**
 * Stable completion seam for readiness snapshot persistence.
 * Must run inside the same transaction that promotes ACTIVE -> COMPLETED.
 */
async function onPeriodCompleted(
  periodId: string,
  tx: Tx
): Promise<void> {
  await persistPeriodReadinessSnapshot(periodId, tx);
}

class LifecycleConflictError extends Error {}

/**
 * Atomically complete the currently active period (if any) so a new period can
 * take over the one-active slot. Rejects when the prior period has no end_date.
 */
async function completePriorActivePeriod(
  tx: Tx,
  periodId: string
): Promise<ServiceResult<{ completed: boolean }>> {
  const priorActive = await tx.academicTermInstance.findFirst({
    where: { status: "ACTIVE", id: { not: periodId } },
    select: { id: true, end_date: true },
  });

  if (!priorActive) {
    return { success: true, data: { completed: false } };
  }

  if (!priorActive.end_date) {
    return {
      success: false,
      error:
        "Current active period is missing end_date; cannot complete it before activating a new period",
    };
  }

  const completed = await tx.academicTermInstance.updateMany({
    where: { id: priorActive.id, status: "ACTIVE" },
    data: { status: "COMPLETED" },
  });
  if (completed.count !== 1) throw new LifecycleConflictError();

  await onPeriodCompleted(priorActive.id, tx);
  return { success: true, data: { completed: true } };
}

/**
 * Secretary-only Academic Period lifecycle transition.
 *
 * Spec #113:
 * - PLANNED -> ACTIVE | CANCELLED
 * - ACTIVE  -> COMPLETED | CANCELLED
 * - terminal states immutable
 * - activating a period atomically completes the prior active period,
 *   rejecting when prior period has no end_date
 * - one-active is enforced by a partial unique index in Postgres
 */
export async function transitionPeriodStatus(
  periodId: string,
  target: AcademicPeriodStatus
): Promise<ServiceResult<{ id: string; status: AcademicPeriodStatus }>> {
  const session = await resolveAuthSession();

  if (session?.activeRole !== ROLES.SECRETARY) {
    return { success: false, error: "Secretary access required" };
  }

  try {
    let activePeriodChanged = false;
    const result = await prisma.$transaction(
      async (tx): Promise<ServiceResult<{ id: string; status: AcademicPeriodStatus }>> => {
        const existing = await tx.academicTermInstance.findUnique({
          where: { id: periodId },
          select: {
            id: true,
            end_date: true,
            status: true,
            semester: true,
            school_year: {
              select: { is_archived: true, is_active: true, active_semester: true },
            },
          },
        });

        if (!existing) {
          return { success: false, error: "Academic period not found" };
        }

        const decision = canTransitionPeriod(existing.status, target);
        if (!decision.allowed) {
          return { success: false, error: decision.reason };
        }

        if (target === "ACTIVE") {
          // Revalidate the School Year hierarchy inside the transaction: a
          // concurrent archive/deactivate/semester change must not leave an
          // active period in an inactive School Year or mismatched semester.
          const hierarchyError = checkActivationHierarchy(existing);
          if (hierarchyError) {
            return { success: false, error: hierarchyError };
          }

          const prior = await completePriorActivePeriod(tx, periodId);
          if (!prior.success) {
            return prior;
          }
          activePeriodChanged = true;
        } else if (target === "COMPLETED") {
          if (!existing.end_date) {
            return {
              success: false,
              error: "Cannot complete a period without an end_date",
            };
          }
          activePeriodChanged = true;
        } else if (existing.status === "ACTIVE") {
          // ACTIVE -> CANCELLED also changes which period is live.
          activePeriodChanged = true;
        }

        const updated = await tx.academicTermInstance.updateMany({
          where: { id: periodId, status: existing.status },
          data: { status: target },
        });
        if (updated.count !== 1) throw new LifecycleConflictError();

        if (target === "COMPLETED") await onPeriodCompleted(periodId, tx);

        return { success: true, data: { id: periodId, status: target } };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
    if (result.success) {
      invalidateAcademicPeriodReadModelTags({ activePeriodChanged });
    }

    return result;
  } catch (error) {
    if (
      error instanceof LifecycleConflictError ||
      (error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === "P2002" || error.code === "P2034"))
    ) {
      return { success: false, error: "Academic period changed; retry the transition" };
    }
    throw error;
  }
}
