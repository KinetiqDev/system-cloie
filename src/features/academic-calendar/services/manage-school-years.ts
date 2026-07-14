"use server";

import { prisma } from "@/lib/db/prisma";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { ROLES } from "@/lib/constants/roles";
import { formatSchoolYearCode } from "@/lib/constants/academic-period";
import { canArchiveSchoolYear } from "../policies";
import type {
  CreateSchoolYearInput,
  UpdateSchoolYearInput,
} from "../schemas/school-year";
import { type ServiceResult } from "@/lib/utils/service-result";
import { isUniqueConstraintError } from "@/lib/utils/prisma-errors";

/**
 * Verify admin authentication.
 */
async function verifyAdminAccess(): Promise<ServiceResult<{ userId: string }>> {
  const session = await resolveAuthSession();

  if (!session || !session.roles.includes(ROLES.SECRETARY)) {
    return { success: false, error: "Admin access required" };
  }

  return { success: true, data: { userId: session.userId } };
}

/**
 * Create a new School Year.
 */
export async function createSchoolYear(
  input: CreateSchoolYearInput
): Promise<ServiceResult<{ id: string; code: string }>> {
  const auth = await verifyAdminAccess();
  if (!auth.success) return auth;

  const code = formatSchoolYearCode(input.startYear);

  try {
    const schoolYear = await prisma.schoolYear.create({
      data: {
        code,
        start_date: input.startDate ?? null,
        end_date: input.endDate ?? null,
        is_archived: false,
      },
    });

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

  return { success: true, data: { id: updated.id } };
}

/**
 * Archive a School Year.
 */
export async function archiveSchoolYear(
  id: string
): Promise<ServiceResult<{ id: string }>> {
  const auth = await verifyAdminAccess();
  if (!auth.success) return auth;

  const schoolYear = await prisma.schoolYear.findUnique({
    where: { id },
    include: {
      term_instances: {
        select: { id: true },
      },
    },
  });

  if (!schoolYear) {
    return { success: false, error: "School year not found" };
  }

  // Get active term instance to check constraint
  const activeTerm = await prisma.academicTermInstance.findFirst({
    where: { status: "ACTIVE" },
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

  const archived = await prisma.schoolYear.update({
    where: { id },
    data: {
      is_archived: true,
      archived_by: auth.data.userId,
      archived_at: new Date(),
    },
  });

  return { success: true, data: { id: archived.id } };
}


