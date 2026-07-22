"use server";

import { revalidatePath } from "next/cache";

import {
  addRosterMembershipSchema,
  removeRosterMembershipSchema,
  restoreRosterMembershipSchema,
} from "@/features/course-assignments/schemas/course-assignment";
import {
  addRosterMembership,
  removeRosterMembership,
  restoreRosterMembership,
} from "@/features/course-assignments/services/manage-course-roster";

function revalidateRosterRoutes(assignmentId: string) {
  revalidatePath(`/course-rosters/${assignmentId}`);
  revalidatePath("/faculty/course-rosters");
  revalidatePath("/secretary/course-assignments");
  revalidatePath("/dean/academic-structure/course-assignments");
  revalidatePath("/program-head/course-assignments");
}

export async function addRosterMembershipAction(input: unknown) {
  const parsed = addRosterMembershipSchema.safeParse(input);
  if (!parsed.success)
    return { success: false as const, error: "Enter a valid Student email address." };
  const result = await addRosterMembership(parsed.data.assignmentId, parsed.data.studentEmail);
  if (result.success) revalidateRosterRoutes(parsed.data.assignmentId);
  return result;
}

export async function restoreRosterMembershipAction(input: unknown) {
  const parsed = restoreRosterMembershipSchema.safeParse(input);
  if (!parsed.success) return { success: false as const, error: "Invalid roster membership." };
  const result = await restoreRosterMembership(parsed.data.assignmentId, parsed.data.membershipId);
  if (result.success) revalidateRosterRoutes(parsed.data.assignmentId);
  return result;
}

export async function removeRosterMembershipAction(input: unknown) {
  const parsed = removeRosterMembershipSchema.safeParse(input);
  if (!parsed.success) return { success: false as const, error: "Invalid roster membership." };
  const result = await removeRosterMembership(parsed.data.assignmentId, parsed.data.membershipId);
  if (result.success) revalidateRosterRoutes(parsed.data.assignmentId);
  return result;
}
