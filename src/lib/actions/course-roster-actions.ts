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
  importCourseRosterTextSchema,
  removeRosterMembershipSchema,
  restoreRosterMembershipSchema,
} from "@/features/course-assignments/schemas/course-assignment";
import {
  addRosterMembership,
  removeRosterMembership,
  restoreRosterMembership,
} from "@/features/course-assignments/services/manage-course-roster";
import { importCourseRoster } from "@/features/course-assignments/services/import-course-roster";

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
    return { success: false as const, error: "Enter a valid Student email address." };
  if (!(await validateProgramHeadActionScope(parsed.data.programId))) {
    return { success: false as const, error: "Course assignment not found." };
  }
  const result = parsed.data.programId
    ? await addRosterMembership(
        parsed.data.assignmentId,
        parsed.data.studentEmail,
        parsed.data.programId
      )
    : await addRosterMembership(parsed.data.assignmentId, parsed.data.studentEmail);
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

export async function importCourseRosterAction(input: unknown) {
  if (input instanceof FormData) {
    const assignmentId = input.get("assignmentId");
    const programIdValue = input.get("programId");
    const programId = typeof programIdValue === "string" ? programIdValue : null;
    const file = input.get("file");
    if (
      typeof assignmentId !== "string" ||
      !importCourseRosterTextSchema.shape.assignmentId.safeParse(assignmentId).success ||
      (programId !== null &&
        !importCourseRosterTextSchema.shape.programId.safeParse(programId).success) ||
      !isFileLike(file)
    ) {
      return { success: false as const, error: "Choose a valid CSV file." };
    }
    if (!(await validateProgramHeadActionScope(programId ?? undefined))) {
      return { success: false as const, error: "Course assignment not found." };
    }
    const result = programId
      ? await importCourseRoster(
          assignmentId,
          new Uint8Array(await file.arrayBuffer()),
          programId
        )
      : await importCourseRoster(assignmentId, new Uint8Array(await file.arrayBuffer()));
    if (result.success) revalidateRosterRoutes(assignmentId, programId ?? undefined);
    return result;
  }

  if (
    typeof input === "object" &&
    input !== null &&
    "assignmentId" in input &&
    "csvText" in input &&
    importCourseRosterTextSchema.safeParse(input).success
  ) {
    const parsed = importCourseRosterTextSchema.parse(input);
    if (!(await validateProgramHeadActionScope(parsed.programId))) {
      return { success: false as const, error: "Course assignment not found." };
    }
    const result = parsed.programId
      ? await importCourseRoster(parsed.assignmentId, parsed.csvText, parsed.programId)
      : await importCourseRoster(parsed.assignmentId, parsed.csvText);
    if (result.success) revalidateRosterRoutes(parsed.assignmentId, parsed.programId);
    return result;
  }

  return { success: false as const, error: "Choose a valid CSV file." };
}

function isFileLike(value: FormDataEntryValue | null): value is File {
  return value !== null && typeof value !== "string" && typeof value.arrayBuffer === "function";
}
