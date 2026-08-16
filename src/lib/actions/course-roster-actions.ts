"use server";

import { revalidatePath } from "next/cache";
import { ROLES } from "@/lib/constants/roles";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { resolveProgramHeadContext } from "@/features/auth/services/resolve-program-head-context";
import {
  buildProgramHeadCourseAssignmentsPath,
  buildProgramHeadCourseRosterPath,
} from "@/lib/constants/program-head-routes";

import {
  addRosterMembershipSchema,
  confirmRosterResolutionSchema,
  previewCourseRosterSchema,
  removeRosterMembershipSchema,
  restoreRosterMembershipSchema,
  searchScopedRosterStudentsSchema,
} from "@/features/course-assignments/schemas/course-assignment";
import {
  addRosterMembership,
  confirmRosterResolution,
  removeRosterMembership,
  restoreRosterMembership,
} from "@/features/course-assignments/services/manage-course-roster";
import { previewCourseRoster } from "@/features/course-assignments/services/preview-course-roster";
import { searchScopedRosterStudents } from "@/features/course-assignments/services/search-scoped-roster-students";


function revalidateRosterRoutes(assignmentId: string, programId?: string) {
  revalidatePath(`/course-rosters/${assignmentId}`);
  revalidatePath("/faculty/course-rosters");
  revalidatePath("/secretary/course-assignments");
  revalidatePath("/dean/academic-structure/course-assignments");
  if (programId) {
    revalidatePath(buildProgramHeadCourseAssignmentsPath(programId));
    revalidatePath(buildProgramHeadCourseRosterPath(programId, assignmentId));
  }
}

async function validateProgramHeadActionScope(programId: string | undefined) {
  const session = await resolveAuthSession();
  if (session?.activeRole !== ROLES.PROGRAM_HEAD) return true;
  if (!programId) return false;
  return (await resolveProgramHeadContext(programId)).success;
}

export async function addRosterMembershipAction(input: unknown) {
  const parsed = addRosterMembershipSchema.safeParse(input);
  if (!parsed.success)
    return { success: false as const, error: "Enter a valid Student account." };
  if (!(await validateProgramHeadActionScope(parsed.data.programId))) {
    return { success: false as const, error: "Course assignment not found." };
  }
  const result = parsed.data.programId
    ? await addRosterMembership(
        parsed.data.assignmentId,
        parsed.data.studentUserId,
        parsed.data.programId
      )
    : await addRosterMembership(parsed.data.assignmentId, parsed.data.studentUserId);
  if (result.success) revalidateRosterRoutes(parsed.data.assignmentId, parsed.data.programId);
  return result;
}

export async function confirmRosterResolutionAction(input: unknown) {
  const parsed = confirmRosterResolutionSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: "Enter a valid roster confirmation." };
  }
  if (!(await validateProgramHeadActionScope(parsed.data.programId))) {
    return { success: false as const, error: "Course assignment not found." };
  }
  const result = await confirmRosterResolution(parsed.data);
  if (result.success) revalidateRosterRoutes(parsed.data.assignmentId, parsed.data.programId);
  return result;
}

export async function restoreRosterMembershipAction(input: unknown) {
  const parsed = restoreRosterMembershipSchema.safeParse(input);
  if (!parsed.success) return { success: false as const, error: "Invalid roster membership." };
  if (!(await validateProgramHeadActionScope(parsed.data.programId))) {
    return { success: false as const, error: "Course assignment not found." };
  }
  const result = parsed.data.programId
    ? await restoreRosterMembership(
        parsed.data.assignmentId,
        parsed.data.membershipId,
        parsed.data.programId
      )
    : await restoreRosterMembership(parsed.data.assignmentId, parsed.data.membershipId);
  if (result.success) revalidateRosterRoutes(parsed.data.assignmentId, parsed.data.programId);
  return result;
}

export async function removeRosterMembershipAction(input: unknown) {
  const parsed = removeRosterMembershipSchema.safeParse(input);
  if (!parsed.success) return { success: false as const, error: "Invalid roster membership." };
  if (!(await validateProgramHeadActionScope(parsed.data.programId))) {
    return { success: false as const, error: "Course assignment not found." };
  }
  const result = parsed.data.programId
    ? await removeRosterMembership(
        parsed.data.assignmentId,
        parsed.data.membershipId,
        parsed.data.programId
      )
    : await removeRosterMembership(parsed.data.assignmentId, parsed.data.membershipId);
  if (result.success) revalidateRosterRoutes(parsed.data.assignmentId, parsed.data.programId);
  return result;
}


export async function previewCourseRosterAction(input: unknown) {
  const parsed = previewCourseRosterSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: "Enter a valid roster preview request." };
  }
  if (!(await validateProgramHeadActionScope(parsed.data.programId))) {
    return { success: false as const, error: "Course assignment not found." };
  }
  // Preview performs zero membership writes; no route revalidation is needed.
  return previewCourseRoster(parsed.data);
}

export async function searchScopedRosterStudentsAction(input: unknown) {
  const parsed = searchScopedRosterStudentsSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: "Enter a valid Student search." };
  }
  if (!(await validateProgramHeadActionScope(parsed.data.programId))) {
    return { success: false as const, error: "Course assignment not found." };
  }
  return searchScopedRosterStudents(
    parsed.data.assignmentId,
    parsed.data.query,
    parsed.data.programId
  );
}


