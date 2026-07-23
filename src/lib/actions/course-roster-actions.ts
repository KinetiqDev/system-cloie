"use server";

import { revalidatePath } from "next/cache";

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

export async function importCourseRosterAction(input: unknown) {
  if (input instanceof FormData) {
    const assignmentId = input.get("assignmentId");
    const file = input.get("file");
    if (typeof assignmentId !== "string" || !importCourseRosterTextSchema.shape.assignmentId.safeParse(assignmentId).success || !isFileLike(file)) {
      return { success: false as const, error: "Choose a valid CSV file." };
    }
    const result = await importCourseRoster(assignmentId, new Uint8Array(await file.arrayBuffer()));
    if (result.success) revalidateRosterRoutes(assignmentId);
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
    const result = await importCourseRoster(parsed.assignmentId, parsed.csvText);
    if (result.success) revalidateRosterRoutes(parsed.assignmentId);
    return result;
  }

  return { success: false as const, error: "Choose a valid CSV file." };
}

function isFileLike(value: FormDataEntryValue | null): value is File {
  return value !== null && typeof value !== "string" && typeof value.arrayBuffer === "function";
}
