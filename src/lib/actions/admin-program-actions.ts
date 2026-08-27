"use server";

import { SystemRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { ROLES } from "@/lib/constants/roles";
import type { ServiceResult } from "@/lib/utils/service-result";
import {
  createProgramSchema,
  updateProgramSchema,
  deleteProgramSchema,
  createMajorSchema,
  updateMajorSchema,
} from "@/features/academic-structure/schemas/program";
import {
  createProgram,
  updateProgram,
  toggleProgramActive,
  preflightProgramDeletion,
  deleteProgram,
  type ProgramDeletionPreflight,
  type DeleteProgramResult,
  createMajor,
  updateMajor,
  toggleMajorActive,
  deleteMajor,
} from "@/features/academic-structure/services/manage-programs";

type ActionResult = { success: true } | { success: false; error: string };
export type BulkProgramLifecycleResult = {
  succeeded: string[];
  failed: Array<{ id: string; error: string }>;
};

type ProgramDeletionResult = ServiceResult<ProgramDeletionPreflight> | DeleteProgramResult;

const PROGRAM_LIFECYCLE_ROLES: SystemRole[] = [ROLES.SECRETARY, ROLES.DEAN];

async function requireProgramLifecycleSteward(): Promise<ActionResult> {
  const session = await resolveAuthSession();
  if (!session || !session.activeRole) return { error: "Authentication required.", success: false };
  if (!PROGRAM_LIFECYCLE_ROLES.includes(session.activeRole))
    return { error: "Insufficient permissions.", success: false };
  return { success: true };
}

export async function createProgramAction(formData: FormData): Promise<ActionResult> {
  const session = await resolveAuthSession();
  if (!session || !session.activeRole) {
    return { error: "Authentication required.", success: false };
  }
  if (!PROGRAM_LIFECYCLE_ROLES.includes(session.activeRole)) {
    return { error: "Insufficient permissions.", success: false };
  }

  const parsed = createProgramSchema.safeParse({
    code: formData.get("code"),
    name: formData.get("name"),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const result = await createProgram(parsed.data);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidatePath("/secretary/programs");
  revalidatePath("/dean/academic-structure/programs");
  return { success: true };
}

export async function updateProgramAction(formData: FormData): Promise<ActionResult> {
  const session = await resolveAuthSession();
  if (!session || !session.activeRole) {
    return { error: "Authentication required.", success: false };
  }
  if (!PROGRAM_LIFECYCLE_ROLES.includes(session.activeRole)) {
    return { error: "Insufficient permissions.", success: false };
  }

  const parsed = updateProgramSchema.safeParse({
    id: formData.get("id"),
    code: formData.get("code"),
    name: formData.get("name"),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const result = await updateProgram(parsed.data);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidatePath("/secretary/programs");
  revalidatePath("/dean/academic-structure/programs");
  return { success: true };
}

export async function toggleProgramActiveAction(
  id: string,
  is_active: boolean,
  expectedIsActive = !is_active
): Promise<ActionResult> {
  const authorization = await requireProgramLifecycleSteward();
  if (!authorization.success) return authorization;

  const result = await toggleProgramActive(id, is_active, expectedIsActive);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidatePath("/secretary/programs");
  revalidatePath("/dean/academic-structure/programs");
  return { success: true };
}
export async function bulkToggleProgramsActiveAction(
  ids: string[],
  isActive: boolean
): Promise<BulkProgramLifecycleResult> {
  if (ids.length === 0 || ids.length > 100 || new Set(ids).size !== ids.length) {
    return {
      succeeded: [],
      failed: [{ id: "selection", error: "Select between 1 and 100 unique programs." }],
    };
  }

  const authorization = await requireProgramLifecycleSteward();
  if (!authorization.success) {
    return { succeeded: [], failed: ids.map((id) => ({ id, error: authorization.error })) };
  }

  const result: BulkProgramLifecycleResult = { succeeded: [], failed: [] };
  for (const id of ids) {
    const item = await toggleProgramActive(id, isActive, !isActive);
    if (item.success) result.succeeded.push(id);
    else result.failed.push({ id, error: item.error });
  }
  if (result.succeeded.length > 0) {
    revalidatePath("/secretary/programs");
    revalidatePath("/dean/academic-structure/programs");
  }
  return result;
}

export async function preflightProgramDeletionAction(id: string): Promise<ProgramDeletionResult> {
  const authorization = await requireProgramLifecycleSteward();
  if (!authorization.success) return authorization;
  return preflightProgramDeletion(id);
}

export async function deleteProgramAction(input: {
  id: string;
  confirmationCode: string;
  revision: string;
}): Promise<ProgramDeletionResult> {
  const authorization = await requireProgramLifecycleSteward();
  if (!authorization.success) return authorization;

  const parsed = deleteProgramSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid deletion confirmation." };

  const result = await deleteProgram({
    ...parsed.data,
    confirmationCode: input.confirmationCode.trim(),
  });
  if (!result.success) return result;

  revalidatePath("/secretary/programs");
  revalidatePath("/dean/academic-structure/programs");
  return result;
}

export async function createMajorAction(formData: FormData): Promise<ActionResult> {
  const session = await resolveAuthSession();
  if (!session || !session.activeRole) {
    return { error: "Authentication required.", success: false };
  }
  const allowedRoles: SystemRole[] = [ROLES.SECRETARY, ROLES.DEAN];
  if (!allowedRoles.includes(session.activeRole)) {
    return { error: "Insufficient permissions.", success: false };
  }

  const parsed = createMajorSchema.safeParse({
    program_id: formData.get("program_id"),
    name: formData.get("name"),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const result = await createMajor(parsed.data);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidatePath("/secretary/programs");
  revalidatePath("/dean/academic-structure/programs");
  return { success: true };
}

async function updateMajorAction(formData: FormData): Promise<ActionResult> {
  const parsed = updateMajorSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const result = await updateMajor(parsed.data);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidatePath("/secretary/programs");
  return { success: true };
}

export async function toggleMajorActiveAction(
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

  const result = await toggleMajorActive(id, is_active);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidatePath("/secretary/programs");
  revalidatePath("/dean/academic-structure/programs");
  return { success: true };
}

export async function deleteMajorAction(id: string): Promise<ActionResult> {
  const session = await resolveAuthSession();
  if (!session || !session.activeRole) {
    return { error: "Authentication required.", success: false };
  }
  const allowedRoles: SystemRole[] = [ROLES.SECRETARY, ROLES.DEAN];
  if (!allowedRoles.includes(session.activeRole)) {
    return { error: "Insufficient permissions.", success: false };
  }

  const result = await deleteMajor(id);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidatePath("/secretary/programs");
  revalidatePath("/dean/academic-structure/programs");
  return { success: true };
}
