"use server";

import { InviteStatus, SystemRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { ROLES } from "@/lib/constants/roles";
import type { ZodType } from "zod";
import {
  createCourseSchema,
  updateCourseSchema,
} from "@/features/academic-structure/schemas/course";
import {
  createCourse,
  deleteCourse,
  toggleCourseActive,
  updateCourse,
} from "@/features/academic-structure/services/manage-courses";
import {
  assignRoleSchema,
  createExternalInviteDraftSchema,
  createFacultyAffiliationSchema,
  createProgramHeadAssignmentSchema,
  deactivateProgramHeadAssignmentSchema,
  updateIndustryPartnerProfileSchema,
  updateStudentAcademicContextSchema,
} from "@/features/users/schemas/secretary-user";
import {
  assignUserRole,
  createExternalInviteDraft,
  createFacultyProgramAffiliation,
  createProgramHeadAssignment,
  deactivateFacultyProgramAffiliation,
  deactivateProgramHeadAssignment,
  deleteIndustryPartnerProfile,
  deleteStudentAcademicContext,
  revokeUserRole,
  toggleUserActive,
  updateExternalInviteStatus,
  upsertIndustryPartnerProfile,
  upsertStudentAcademicContext,
} from "@/features/users/services/manage-users";
import {
  createBaselineTemplateSchema,
  updateBaselineTemplateSchema,
} from "@/features/instruments/schemas/template";
import {
  createBaselineTemplate,
  toggleBaselineTemplateActive,
  updateBaselineTemplate,
} from "@/features/instruments/services/manage-instruments";

type ActionResult = { success: true } | { success: false; error: string };

function parseWithSchema<T>(
  schema: ZodType<T>,
  value: unknown
): { success: true; data: T } | { success: false; error: string } {
  const parsed = schema.safeParse(value);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  return parsed;
}

function revalidateAdminFoundation() {
  revalidatePath("/secretary/dashboard");
  revalidatePath("/secretary/courses");
  revalidatePath("/secretary/users");
  revalidatePath("/secretary/instruments");
}

export async function createCourseAction(formData: FormData): Promise<ActionResult> {
  const session = await resolveAuthSession();
  if (!session || !session.activeRole) {
    return { error: "Authentication required.", success: false };
  }
  const allowedRoles: SystemRole[] = [ROLES.SECRETARY, ROLES.DEAN, ROLES.PROGRAM_HEAD];
  if (!allowedRoles.includes(session.activeRole)) {
    return { error: "Insufficient permissions.", success: false };
  }

  const parsed = parseWithSchema(createCourseSchema, {
    code: formData.get("code"),
    title: formData.get("title"),
    description: formData.get("description"),
    course_scope: formData.get("course_scope"),
    program_id: formData.get("program_id"),
    major_id: formData.get("major_id"),
    default_year_level: formData.get("default_year_level"),
    default_semester: formData.get("default_semester"),
    default_term: formData.get("default_term"),
  });

  if (!parsed.success) {
    return parsed;
  }

  const result = await createCourse(parsed.data);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidateAdminFoundation();
  return { success: true };
}

export async function updateCourseAction(formData: FormData): Promise<ActionResult> {
  const session = await resolveAuthSession();
  if (!session || !session.activeRole) {
    return { error: "Authentication required.", success: false };
  }
  const allowedRoles: SystemRole[] = [ROLES.SECRETARY, ROLES.DEAN, ROLES.PROGRAM_HEAD];
  if (!allowedRoles.includes(session.activeRole)) {
    return { error: "Insufficient permissions.", success: false };
  }

  const parsed = parseWithSchema(updateCourseSchema, {
    id: formData.get("id"),
    code: formData.get("code"),
    title: formData.get("title"),
    description: formData.get("description"),
    course_scope: formData.get("course_scope"),
    program_id: formData.get("program_id"),
    major_id: formData.get("major_id"),
    default_year_level: formData.get("default_year_level"),
    default_semester: formData.get("default_semester"),
    default_term: formData.get("default_term"),
  });

  if (!parsed.success) {
    return parsed;
  }

  const result = await updateCourse(parsed.data);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidateAdminFoundation();
  return { success: true };
}

export async function toggleCourseActiveAction(
  id: string,
  is_active: boolean
): Promise<ActionResult> {
  const session = await resolveAuthSession();
  if (!session || !session.activeRole) {
    return { error: "Authentication required.", success: false };
  }
  const allowedRoles: SystemRole[] = [ROLES.SECRETARY, ROLES.DEAN, ROLES.PROGRAM_HEAD];
  if (!allowedRoles.includes(session.activeRole)) {
    return { error: "Insufficient permissions.", success: false };
  }

  const result = await toggleCourseActive(id, is_active);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidateAdminFoundation();
  return { success: true };
}

export async function deleteCourseAction(id: string): Promise<ActionResult> {
  const session = await resolveAuthSession();
  if (!session || !session.activeRole) {
    return { error: "Authentication required.", success: false };
  }
  const allowedRoles: SystemRole[] = [ROLES.SECRETARY, ROLES.DEAN, ROLES.PROGRAM_HEAD];
  if (!allowedRoles.includes(session.activeRole)) {
    return { error: "Insufficient permissions.", success: false };
  }

  const result = await deleteCourse(id);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidateAdminFoundation();
  return { success: true };
}

export async function toggleUserActiveAction(
  id: string,
  is_active: boolean
): Promise<ActionResult> {
  const session = await resolveAuthSession();
  if (!session || !session.activeRole) {
    return { error: "Authentication required.", success: false };
  }
  const allowedRoles: SystemRole[] = [ROLES.SECRETARY, ROLES.DEAN];
  if (!allowedRoles.includes(session.activeRole)) {
    return { error: "Insufficient permissions.", success: false };
  }
  if (id === session.userId) {
    return { error: "Cannot modify own account.", success: false };
  }
  const result = await toggleUserActive(id, is_active);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidateAdminFoundation();
  return { success: true };
}

export async function assignUserRoleAction(formData: FormData): Promise<ActionResult> {
  const session = await resolveAuthSession();
  if (!session || !session.activeRole) {
    return { error: "Authentication required.", success: false };
  }
  const allowedRoles: SystemRole[] = [ROLES.SECRETARY, ROLES.DEAN];
  if (!allowedRoles.includes(session.activeRole)) {
    return { error: "Insufficient permissions.", success: false };
  }
  const parsed = parseWithSchema(assignRoleSchema, {
    user_id: formData.get("user_id"),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    return parsed;
  }

  if (parsed.data.user_id === session.userId) {
    return { error: "Cannot modify own account.", success: false };
  }
  const result = await assignUserRole(parsed.data);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidateAdminFoundation();
  return { success: true };
}

export async function revokeUserRoleAction(
  userId: string,
  role: SystemRole
): Promise<ActionResult> {
  const session = await resolveAuthSession();
  if (!session || !session.activeRole) {
    return { error: "Authentication required.", success: false };
  }
  const allowedRoles: SystemRole[] = [ROLES.SECRETARY, ROLES.DEAN];
  if (!allowedRoles.includes(session.activeRole)) {
    return { error: "Insufficient permissions.", success: false };
  }
  if (userId === session.userId) {
    return { error: "Cannot modify own account.", success: false };
  }
  const result = await revokeUserRole(userId, role);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidateAdminFoundation();
  return { success: true };
}

export async function updateStudentAcademicContextAction(
  formData: FormData
): Promise<ActionResult> {
  const session = await resolveAuthSession();
  if (!session || !session.activeRole) {
    return { error: "Authentication required.", success: false };
  }
  const allowedRoles: SystemRole[] = [ROLES.SECRETARY, ROLES.DEAN];
  if (!allowedRoles.includes(session.activeRole)) {
    return { error: "Insufficient permissions.", success: false };
  }
  const parsed = parseWithSchema(updateStudentAcademicContextSchema, {
    user_id: formData.get("user_id"),
    program_id: formData.get("program_id"),
    major_id: formData.get("major_id"),
    year_level: formData.get("year_level"),
    student_id_number: formData.get("student_id_number"),
    academic_year: formData.get("academic_year"),
    section: formData.get("section"),
  });

  if (!parsed.success) {
    return parsed;
  }

  const result = await upsertStudentAcademicContext(parsed.data);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidateAdminFoundation();
  return { success: true };
}

export async function deleteStudentAcademicContextAction(userId: string): Promise<ActionResult> {
  const session = await resolveAuthSession();
  if (!session || !session.activeRole) {
    return { error: "Authentication required.", success: false };
  }
  const allowedRoles: SystemRole[] = [ROLES.SECRETARY, ROLES.DEAN];
  if (!allowedRoles.includes(session.activeRole)) {
    return { error: "Insufficient permissions.", success: false };
  }
  if (userId === session.userId) {
    return { error: "Cannot modify own account.", success: false };
  }
  const result = await deleteStudentAcademicContext(userId);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidateAdminFoundation();
  return { success: true };
}

export async function createFacultyProgramAffiliationAction(
  formData: FormData
): Promise<ActionResult> {
  const session = await resolveAuthSession();
  if (!session || !session.activeRole) {
    return { error: "Authentication required.", success: false };
  }
  const allowedRoles: SystemRole[] = [ROLES.SECRETARY, ROLES.DEAN];
  if (!allowedRoles.includes(session.activeRole)) {
    return { error: "Insufficient permissions.", success: false };
  }
  const parsed = parseWithSchema(createFacultyAffiliationSchema, {
    faculty_id: formData.get("faculty_id"),
    program_id: formData.get("program_id"),
  });

  if (!parsed.success) {
    return parsed;
  }

  if (parsed.data.faculty_id === session.userId) {
    return { error: "Cannot modify own account.", success: false };
  }
  const result = await createFacultyProgramAffiliation(parsed.data);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidateAdminFoundation();
  return { success: true };
}

export async function deactivateFacultyProgramAffiliationAction(id: string): Promise<ActionResult> {
  const session = await resolveAuthSession();
  if (!session || !session.activeRole) {
    return { error: "Authentication required.", success: false };
  }
  const allowedRoles: SystemRole[] = [ROLES.SECRETARY, ROLES.DEAN];
  if (!allowedRoles.includes(session.activeRole)) {
    return { error: "Insufficient permissions.", success: false };
  }
  const result = await deactivateFacultyProgramAffiliation(id);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidateAdminFoundation();
  return { success: true };
}

export async function createProgramHeadAssignmentAction(formData: FormData): Promise<ActionResult> {
  const session = await resolveAuthSession();
  if (!session || !session.activeRole) {
    return { error: "Authentication required.", success: false };
  }
  const allowedRoles: SystemRole[] = [ROLES.SECRETARY, ROLES.DEAN];
  if (!allowedRoles.includes(session.activeRole)) {
    return { error: "Insufficient permissions.", success: false };
  }
  const parsed = parseWithSchema(createProgramHeadAssignmentSchema, {
    program_head_id: formData.get("program_head_id"),
    program_id: formData.get("program_id"),
  });

  if (!parsed.success) {
    return parsed;
  }

  if (parsed.data.program_head_id === session.userId) {
    return { error: "Cannot modify own account.", success: false };
  }
  const result = await createProgramHeadAssignment(parsed.data);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidateAdminFoundation();
  return { success: true };
}

export async function deactivateProgramHeadAssignmentAction(
  assignmentId: string,
  programHeadId: string
): Promise<ActionResult> {
  const session = await resolveAuthSession();
  if (!session || !session.activeRole) {
    return { error: "Authentication required.", success: false };
  }
  const allowedRoles: SystemRole[] = [ROLES.SECRETARY, ROLES.DEAN];
  if (!allowedRoles.includes(session.activeRole)) {
    return { error: "Insufficient permissions.", success: false };
  }
  const parsed = parseWithSchema(deactivateProgramHeadAssignmentSchema, {
    assignment_id: assignmentId,
    program_head_id: programHeadId,
  });

  if (!parsed.success) {
    return parsed;
  }

  const result = await deactivateProgramHeadAssignment(
    parsed.data.assignment_id,
    parsed.data.program_head_id
  );

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidateAdminFoundation();
  return { success: true };
}

export async function upsertIndustryPartnerProfileAction(
  formData: FormData
): Promise<ActionResult> {
  const session = await resolveAuthSession();
  if (!session || !session.activeRole) {
    return { error: "Authentication required.", success: false };
  }
  const allowedRoles: SystemRole[] = [ROLES.SECRETARY, ROLES.DEAN];
  if (!allowedRoles.includes(session.activeRole)) {
    return { error: "Insufficient permissions.", success: false };
  }
  const parsed = parseWithSchema(updateIndustryPartnerProfileSchema, {
    user_id: formData.get("user_id"),
    company_name: formData.get("company_name"),
    position: formData.get("position"),
    program_id: formData.get("program_id"),
  });

  if (!parsed.success) {
    return parsed;
  }

  const result = await upsertIndustryPartnerProfile(parsed.data);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidateAdminFoundation();
  return { success: true };
}

export async function deleteIndustryPartnerProfileAction(userId: string): Promise<ActionResult> {
  const session = await resolveAuthSession();
  if (!session || !session.activeRole) {
    return { error: "Authentication required.", success: false };
  }
  const allowedRoles: SystemRole[] = [ROLES.SECRETARY, ROLES.DEAN];
  if (!allowedRoles.includes(session.activeRole)) {
    return { error: "Insufficient permissions.", success: false };
  }
  if (userId === session.userId) {
    return { error: "Cannot modify own account.", success: false };
  }
  const result = await deleteIndustryPartnerProfile(userId);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidateAdminFoundation();
  return { success: true };
}

export async function createExternalInviteDraftAction(formData: FormData): Promise<ActionResult> {
  const session = await resolveAuthSession();
  if (!session || !session.activeRole) {
    return { error: "Authentication required.", success: false };
  }
  const allowedRoles: SystemRole[] = [ROLES.SECRETARY, ROLES.DEAN];
  if (!allowedRoles.includes(session.activeRole)) {
    return { error: "Insufficient permissions.", success: false };
  }
  const parsed = parseWithSchema(createExternalInviteDraftSchema, {
    email: formData.get("email"),
    role: formData.get("role"),
    program_id: formData.get("program_id"),
    invitee_name: formData.get("invitee_name"),
    company_name: formData.get("company_name"),
    note: formData.get("note"),
  });

  if (!parsed.success) {
    return parsed;
  }

  const result = await createExternalInviteDraft(parsed.data);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidateAdminFoundation();
  return { success: true };
}

export async function revokeExternalInviteAction(id: string): Promise<ActionResult> {
  const session = await resolveAuthSession();
  if (!session || !session.activeRole) {
    return { error: "Authentication required.", success: false };
  }
  const allowedRoles: SystemRole[] = [ROLES.SECRETARY, ROLES.DEAN];
  if (!allowedRoles.includes(session.activeRole)) {
    return { error: "Insufficient permissions.", success: false };
  }
  const result = await updateExternalInviteStatus(id, InviteStatus.REVOKED);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidateAdminFoundation();
  return { success: true };
}

export async function createBaselineTemplateAction(formData: FormData): Promise<ActionResult> {
  const session = await resolveAuthSession();
  if (!session || !session.activeRole) {
    return { error: "Authentication required.", success: false };
  }
  const allowedRoles: SystemRole[] = [ROLES.SECRETARY, ROLES.DEAN];
  if (!allowedRoles.includes(session.activeRole)) {
    return { error: "Insufficient permissions.", success: false };
  }
  const parsed = parseWithSchema(createBaselineTemplateSchema, {
    code: formData.get("code"),
    name: formData.get("name"),
    description: formData.get("description"),
    is_faculty_accessible: formData.get("is_faculty_accessible"),
  });

  if (!parsed.success) {
    return parsed;
  }

  const result = await createBaselineTemplate(parsed.data);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidateAdminFoundation();
  return { success: true };
}

export async function updateBaselineTemplateAction(formData: FormData): Promise<ActionResult> {
  const session = await resolveAuthSession();
  if (!session || !session.activeRole) {
    return { error: "Authentication required.", success: false };
  }
  const allowedRoles: SystemRole[] = [ROLES.SECRETARY, ROLES.DEAN];
  if (!allowedRoles.includes(session.activeRole)) {
    return { error: "Insufficient permissions.", success: false };
  }
  const parsed = parseWithSchema(updateBaselineTemplateSchema, {
    id: formData.get("id"),
    code: formData.get("code"),
    name: formData.get("name"),
    description: formData.get("description"),
    is_faculty_accessible: formData.get("is_faculty_accessible"),
  });

  if (!parsed.success) {
    return parsed;
  }

  const result = await updateBaselineTemplate(parsed.data);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidateAdminFoundation();
  return { success: true };
}

export async function toggleBaselineTemplateActiveAction(
  id: string,
  is_active: boolean
): Promise<ActionResult> {
  const session = await resolveAuthSession();
  if (!session || !session.activeRole) {
    return { error: "Authentication required.", success: false };
  }
  const allowedRoles: SystemRole[] = [ROLES.SECRETARY, ROLES.DEAN];
  if (!allowedRoles.includes(session.activeRole)) {
    return { error: "Insufficient permissions.", success: false };
  }
  const result = await toggleBaselineTemplateActive(id, is_active);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidateAdminFoundation();
  return { success: true };
}
