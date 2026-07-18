"use server";

import { prisma } from "@/lib/db/prisma";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { ROLES } from "@/lib/constants/roles";
import { isValidSemesterTerm, compareSemesters } from "@/lib/constants/academic-period";
import { canDeleteTermInstance } from "../policies";
import type {
  CreateTermInstanceInput,
  UpdateTermInstanceInput,
} from "../schemas/term-instance";
import { type ServiceResult } from "@/lib/utils/service-result";
import { isUniqueConstraintError } from "@/lib/utils/prisma-errors";
import { transitionPeriodStatus } from "./manage-academic-period-lifecycle";

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
 * Add a new Term Instance to a School Year.
 */
export async function addTermInstance(
  input: CreateTermInstanceInput
): Promise<ServiceResult<{ id: string }>> {
  const auth = await verifySecretaryAccess();
  if (!auth.success) return auth;

  // Validate semester-term combination
  if (!isValidSemesterTerm(input.semester, input.term ?? null)) {
    return {
      success: false,
      error:
        input.semester === "SUMMER"
          ? "Summer semester cannot have a term"
          : "First and Second semesters must have a term",
    };
  }

  // Verify school year exists and is not archived
  const schoolYear = await prisma.schoolYear.findUnique({
    where: { id: input.schoolYearId },
    select: { id: true, is_archived: true },
  });

  if (!schoolYear) {
    return { success: false, error: "School year not found" };
  }

  if (schoolYear.is_archived) {
    return { success: false, error: "Cannot add terms to an archived school year" };
  }

  try {
    const termInstance = await prisma.academicTermInstance.create({
      data: {
        school_year_id: input.schoolYearId,
        semester: input.semester,
        term: input.term ?? null,
        start_date: input.startDate ?? null,
        end_date: input.endDate ?? null,
      },
    });

    return { success: true, data: { id: termInstance.id } };
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return {
        success: false,
        error: "A term instance with this semester and term already exists for this school year",
      };
    }
    throw error;
  }
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

  return { success: true, data: undefined };
}

/**
 * Set a Term Instance as the active term.
 * Delegates to the lifecycle service so the transition rules and one-active
 * enforcement live in one place. Returns rollover suggestion for the UI.
 */
export async function setActiveTermInstance(
  termInstanceId: string
): Promise<ServiceResult<{ id: string; previousActiveId: string | null; rolloverSuggested: string | null }>> {
  const auth = await verifySecretaryAccess();
  if (!auth.success) return auth;

  const termInstance = await prisma.academicTermInstance.findUnique({
    where: { id: termInstanceId },
    include: {
      school_year: {
        select: { is_archived: true, code: true, id: true },
      },
    },
  });

  if (!termInstance) {
    return { success: false, error: "Term instance not found" };
  }

  if (termInstance.school_year.is_archived) {
    return { success: false, error: "Cannot activate a term in an archived school year" };
  }

  const priorActive = await prisma.academicTermInstance.findFirst({
    where: { status: "ACTIVE", id: { not: termInstanceId } },
    select: { id: true },
  });

  const transition = await transitionPeriodStatus(termInstanceId, "ACTIVE");
  if (!transition.success) {
    return { success: false, error: transition.error };
  }

  const allTerms = await prisma.academicTermInstance.findMany({
    where: {
      school_year_id: termInstance.school_year.id,
      status: { not: "ACTIVE" },
      id: { not: termInstanceId },
    },
    orderBy: [{ semester: "asc" }, { term: "asc" }],
    select: { id: true, semester: true, term: true },
  });

  const nextTerm = allTerms.find((t) => {
    const semesterComparison = compareSemesters(t.semester, termInstance.semester);

    if (semesterComparison > 0) return true;
    if (semesterComparison === 0 && termInstance.term && t.term) {
      const termOrder = ["FIRST", "SECOND"];
      return termOrder.indexOf(t.term) > termOrder.indexOf(termInstance.term);
    }
    return false;
  });

  return {
    success: true,
    data: {
      id: termInstanceId,
      previousActiveId: priorActive?.id ?? null,
      rolloverSuggested: nextTerm?.id ?? null,
    },
  };
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
