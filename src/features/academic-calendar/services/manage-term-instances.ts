"use server";

import { prisma } from "@/lib/db/prisma";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { ROLES } from "@/lib/constants/roles";
import { canDeleteTermInstance, isStructuralTerm } from "../policies";
import type { UpdateTermInstanceInput } from "../schemas/term-instance";
import { type ServiceResult } from "@/lib/utils/service-result";
import { invalidateAcademicPeriodReadModelTags } from "@/lib/cache/academic-periods";

/**
 * Verify secretary access.
 */
export async function verifySecretaryAccess(): Promise<ServiceResult<{ userId: string }>> {
  const session = await resolveAuthSession();

  if (!session || session.activeRole !== ROLES.SECRETARY) {
    return { success: false, error: "Secretary access required" };
  }

  return { success: true, data: { userId: session.userId } };
}

/**
 * Update an existing Term Instance.
 */
export async function updateTermInstance(
  input: UpdateTermInstanceInput
): Promise<ServiceResult<{ id: string }>> {
  const auth = await verifySecretaryAccess();
  if (!auth.success) return auth;

  const existing = await prisma.academicTermInstance.findUnique({
    where: { id: input.id },
    include: {
      school_year: {
        select: { is_archived: true },
      },
    },
  });

  if (!existing) {
    return { success: false, error: "Term instance not found" };
  }

  if (existing.school_year.is_archived) {
    return { success: false, error: "Cannot modify terms of an archived school year" };
  }

  if (existing.status === "COMPLETED" || existing.status === "CANCELLED") {
    return { success: false, error: "Completed and cancelled periods are immutable" };
  }

  const updated = await prisma.academicTermInstance.update({
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
 * Delete a Term Instance.
 */
export async function deleteTermInstance(id: string): Promise<ServiceResult> {
  const auth = await verifySecretaryAccess();
  if (!auth.success) return auth;

  const existing = await prisma.academicTermInstance.findUnique({
    where: { id },
    include: {
      school_year: {
        select: { is_archived: true },
      },
    },
  });

  if (!existing) {
    return { success: false, error: "Term instance not found" };
  }

  if (existing.school_year.is_archived) {
    return { success: false, error: "Cannot delete terms of an archived school year" };
  }

  // Structural (canonical) terms must never be deleted; only legacy
  // non-canonical terms may be removed.
  if (isStructuralTerm(existing)) {
    return { success: false, error: "Structural terms cannot be deleted" };
  }

  // Check if this is the active term
  const activeTerm = await prisma.academicTermInstance.findFirst({
    where: { status: "ACTIVE" },
    select: { id: true },
  });

  // Check for dependent records (simplified - in production check enrollments/deployments)
  const hasDependents = await checkHasDependentRecords(id);

  const check = canDeleteTermInstance(id, activeTerm?.id ?? null, hasDependents);

  if (!check.allowed) {
    return { success: false, error: check.reason };
  }

  await prisma.academicTermInstance.delete({
    where: { id },
  });

  invalidateAcademicPeriodReadModelTags();
  return { success: true, data: undefined };
}

/**
 * Check if a term instance has dependent records across all related tables.
 * Returns true if any related record references this term.
 */
async function checkHasDependentRecords(termInstanceId: string): Promise<boolean> {
  const [enrollments, assignments, evaluations, deployments, snapshots] = await Promise.all([
    prisma.studentEnrollment.count({ where: { term_instance_id: termInstanceId }, take: 1 }),
    prisma.courseAssignment.count({ where: { term_instance_id: termInstanceId }, take: 1 }),
    prisma.courseBoundEvaluation.count({ where: { term_instance_id: termInstanceId }, take: 1 }),
    prisma.centralDeployment.count({ where: { term_instance_id: termInstanceId }, take: 1 }),
    prisma.academicPeriodReadinessSnapshot.count({ where: { period_id: termInstanceId }, take: 1 }),
  ]);

  return enrollments + assignments + evaluations + deployments + (snapshots ?? 0) > 0;
}
