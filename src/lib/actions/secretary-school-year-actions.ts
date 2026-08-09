"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { AcademicPeriodStatus } from "@prisma/client";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { ROLES } from "@/lib/constants/roles";
import {
  createSchoolYear,
  updateSchoolYear,
  archiveSchoolYear,
  activateSchoolYear,
  deactivateSchoolYear,
  setActiveSemester,
} from "@/features/academic-calendar/services/manage-school-years";
import {
  updateTermInstance,
  deleteTermInstance,
  setActiveTermInstance,
} from "@/features/academic-calendar/services/manage-term-instances";
import { transitionPeriodStatus } from "@/features/academic-calendar/services/manage-academic-period-lifecycle";
import {
  createSchoolYearSchema,
  updateSchoolYearSchema,
  setActiveSemesterSchema,
} from "@/features/academic-calendar/schemas/school-year";
import {
  updateTermInstanceSchema,
  setActiveTermSchema,
} from "@/features/academic-calendar/schemas/term-instance";
import type { ServiceResult } from "@/lib/utils/service-result";
import { revalidateAcademicPeriodReadModelRoutes } from "@/lib/cache/academic-periods";

// ============================================================================
// Authorization Helper
// ============================================================================

export async function verifySecretaryAccess(): Promise<ServiceResult<{ userId: string }>> {
  const session = await resolveAuthSession();
  if (!session || session.activeRole !== ROLES.SECRETARY) {
    return { success: false, error: "Secretary access required" };
  }
  return { success: true, data: { userId: session.userId } };
}

// ============================================================================
// School Year Actions
// ============================================================================

export async function createSchoolYearAction(
  formData: FormData
): Promise<ServiceResult<{ id: string; code: string }>> {
  const auth = await verifySecretaryAccess();
  if (!auth.success) return auth;

  const startYearStr = formData.get("startYear");
  const startDateStr = formData.get("startDate");
  const endDateStr = formData.get("endDate");

  const parsed = createSchoolYearSchema.safeParse({
    startYear: startYearStr ? parseInt(startYearStr as string, 10) : undefined,
    startDate: startDateStr ? new Date(startDateStr as string) : undefined,
    endDate: endDateStr ? new Date(endDateStr as string) : undefined,
  });

  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    return { success: false, error: firstError?.message ?? "Invalid input" };
  }

  const result = await createSchoolYear(parsed.data);

  if (result.success) {
    revalidatePath("/secretary/school-years");
    revalidateAcademicPeriodReadModelRoutes();
  }

  return result;
}

export async function updateSchoolYearAction(
  formData: FormData
): Promise<ServiceResult<{ id: string }>> {
  const auth = await verifySecretaryAccess();
  if (!auth.success) return auth;

  const id = formData.get("id");
  const startDateStr = formData.get("startDate");
  const endDateStr = formData.get("endDate");

  const parsed = updateSchoolYearSchema.safeParse({
    id,
    startDate: startDateStr ? new Date(startDateStr as string) : undefined,
    endDate: endDateStr ? new Date(endDateStr as string) : undefined,
  });

  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    return { success: false, error: firstError?.message ?? "Invalid input" };
  }

  const result = await updateSchoolYear(parsed.data);

  if (result.success) {
    revalidatePath("/secretary/school-years");
    revalidatePath(`/secretary/school-years/${result.data.id}`);
    revalidateAcademicPeriodReadModelRoutes();
  }

  return result;
}

export async function archiveSchoolYearAction(
  formData: FormData
): Promise<ServiceResult<{ id: string }>> {
  const auth = await verifySecretaryAccess();
  if (!auth.success) return auth;

  const id = formData.get("id");
  if (!id || typeof id !== "string") {
    return { success: false, error: "Invalid school year ID" };
  }

  const result = await archiveSchoolYear(id);

  if (result.success) {
    revalidatePath("/secretary/school-years");
    revalidatePath(`/secretary/school-years/${result.data.id}`);
    revalidateAcademicPeriodReadModelRoutes();
  }

  return result;
}

const schoolYearIdSchema = z.string().uuid("Invalid school year ID");

export async function activateSchoolYearAction(
  formData: FormData
): Promise<ServiceResult<{ id: string }>> {
  const auth = await verifySecretaryAccess();
  if (!auth.success) return auth;

  const idParsed = schoolYearIdSchema.safeParse(formData.get("id"));
  if (!idParsed.success) {
    return { success: false, error: idParsed.error.issues[0]?.message ?? "Invalid school year ID" };
  }

  // The starting semester may ride along with activation for a fresh School
  // Year (an inactive School Year cannot persist an active_semester).
  const semesterRaw = formData.get("semester");
  const semesterParsed = semesterRaw
    ? z.enum(["FIRST", "SECOND", "SUMMER"]).safeParse(semesterRaw)
    : { success: true, data: undefined };

  if (!semesterParsed.success) {
    return { success: false, error: "Semester must be FIRST, SECOND, or SUMMER" };
  }

  const result = await activateSchoolYear(idParsed.data, semesterParsed.data);

  if (result.success) {
    revalidatePath("/secretary/school-years");
    revalidatePath(`/secretary/school-years/${result.data.id}`);
    revalidatePath("/secretary/dashboard");
    revalidatePath("/program-head/dashboard");
    revalidatePath("/faculty/dashboard");
    revalidateAcademicPeriodReadModelRoutes();
  }

  return result;
}

export async function deactivateSchoolYearAction(
  formData: FormData
): Promise<ServiceResult<{ id: string }>> {
  const auth = await verifySecretaryAccess();
  if (!auth.success) return auth;

  const idParsed = schoolYearIdSchema.safeParse(formData.get("id"));
  if (!idParsed.success) {
    return { success: false, error: idParsed.error.issues[0]?.message ?? "Invalid school year ID" };
  }

  const result = await deactivateSchoolYear(idParsed.data);

  if (result.success) {
    revalidatePath("/secretary/school-years");
    revalidatePath(`/secretary/school-years/${result.data.id}`);
    revalidatePath("/secretary/dashboard");
    revalidatePath("/program-head/dashboard");
    revalidatePath("/faculty/dashboard");
    revalidateAcademicPeriodReadModelRoutes();
  }

  return result;
}

export async function setActiveSemesterAction(
  formData: FormData
): Promise<ServiceResult<{ id: string }>> {
  const auth = await verifySecretaryAccess();
  if (!auth.success) return auth;

  const parsed = setActiveSemesterSchema.safeParse({
    schoolYearId: formData.get("schoolYearId"),
    semester: formData.get("semester"),
  });

  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    return { success: false, error: firstError?.message ?? "Invalid input" };
  }

  const result = await setActiveSemester(parsed.data.schoolYearId, parsed.data.semester);

  if (result.success) {
    revalidatePath("/secretary/school-years");
    revalidatePath(`/secretary/school-years/${result.data.id}`);
    revalidatePath("/secretary/dashboard");
    revalidatePath("/program-head/dashboard");
    revalidatePath("/faculty/dashboard");
    revalidateAcademicPeriodReadModelRoutes();
  }

  return result;
}

// ============================================================================
// Term Instance Actions
// ============================================================================

export async function updateTermInstanceAction(
  formData: FormData
): Promise<ServiceResult<{ id: string }>> {
  const auth = await verifySecretaryAccess();
  if (!auth.success) return auth;

  const id = formData.get("id");
  const startDateStr = formData.get("startDate");
  const endDateStr = formData.get("endDate");

  const parsed = updateTermInstanceSchema.safeParse({
    id,
    startDate: startDateStr ? new Date(startDateStr as string) : undefined,
    endDate: endDateStr ? new Date(endDateStr as string) : undefined,
  });

  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    return { success: false, error: firstError?.message ?? "Invalid input" };
  }

  const result = await updateTermInstance(parsed.data);

  if (result.success) {
    revalidatePath("/secretary/school-years");
    revalidateAcademicPeriodReadModelRoutes();
  }

  return result;
}

export async function deleteTermInstanceAction(
  formData: FormData
): Promise<ServiceResult> {
  const auth = await verifySecretaryAccess();
  if (!auth.success) return auth;

  const id = formData.get("id");
  if (!id || typeof id !== "string") {
    return { success: false, error: "Invalid term instance ID" };
  }

  const result = await deleteTermInstance(id);

  if (result.success) {
    revalidatePath("/secretary/school-years");
    revalidateAcademicPeriodReadModelRoutes();
  }

  return result;
}

export async function setActiveTermInstanceAction(
  formData: FormData
): Promise<ServiceResult<{ id: string; previousActiveId: string | null; rolloverSuggested: string | null }>> {
  const auth = await verifySecretaryAccess();
  if (!auth.success) return auth;

  const termInstanceId = formData.get("termInstanceId");

  const parsed = setActiveTermSchema.safeParse({
    termInstanceId,
  });

  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    return { success: false, error: firstError?.message ?? "Invalid input" };
  }

  const result = await setActiveTermInstance(parsed.data.termInstanceId);

  if (result.success) {
    revalidatePath("/secretary/school-years");
    // Also revalidate any pages that show the active term badge
    revalidatePath("/secretary/dashboard");
    revalidatePath("/program-head/dashboard");
    revalidatePath("/faculty/dashboard");
    revalidateAcademicPeriodReadModelRoutes();
  }

  return result;
}

export async function transitionPeriodStatusAction(
  formData: FormData
): Promise<ServiceResult<{ id: string; status: AcademicPeriodStatus }>> {
  const auth = await verifySecretaryAccess();
  if (!auth.success) return auth;

  const periodId = formData.get("periodId");
  const target = formData.get("target");

  const parsed = z
    .object({
      periodId: z.string().uuid("Invalid period ID"),
      target: z.enum(["ACTIVE", "COMPLETED", "CANCELLED"]),
    })
    .safeParse({ periodId, target });

  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    return { success: false, error: firstError?.message ?? "Invalid input" };
  }

  const result = await transitionPeriodStatus(parsed.data.periodId, parsed.data.target);

  if (result.success) {
    revalidatePath("/secretary/school-years");
    revalidatePath(`/secretary/school-years/${result.data.id}`);
    revalidatePath("/secretary/dashboard");
    revalidatePath("/program-head/dashboard");
    revalidatePath("/faculty/dashboard");
    revalidateAcademicPeriodReadModelRoutes();
  }

  return result;
}
