"use server";

import { revalidatePath } from "next/cache";
import type { ZodType } from "zod";
import {
  buildProgramHeadOutcomeMappingPath,
  buildProgramHeadOutcomesPath,
} from "@/lib/constants/program-head-routes";
import {
  createGOSchema,
  programHeadGOActionSchema,
  reorderGOsSchema,
  updateGOSchema,
} from "@/features/outcomes/schemas/go";
import {
  createGO,
  deleteGO,
  reorderGOs,
  restoreGO,
  updateGO,
} from "@/features/outcomes/services/manage-program-head-outcomes";

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

function revalidateOutcomes(programId: string) {
  revalidatePath(buildProgramHeadOutcomesPath(programId));
  revalidatePath(buildProgramHeadOutcomeMappingPath(programId));
}

export async function createGOAction(formData: FormData): Promise<ActionResult> {
  const parsed = parseWithSchema(createGOSchema, {
    code: formData.get("code"),
    description: formData.get("description"),
    order: formData.get("order"),
    programId: formData.get("programId"),
  });

  if (!parsed.success) {
    return parsed;
  }

  const result = await createGO(parsed.data);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidateOutcomes(parsed.data.programId);
  return { success: true };
}

export async function updateGOAction(formData: FormData): Promise<ActionResult> {
  const parsed = parseWithSchema(updateGOSchema, {
    id: formData.get("id"),
    code: formData.get("code"),
    description: formData.get("description"),
    order: formData.get("order"),
    programId: formData.get("programId"),
  });

  if (!parsed.success) {
    return parsed;
  }

  const result = await updateGO(parsed.data);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidateOutcomes(parsed.data.programId);
  return { success: true };
}

export async function deleteGOAction(programId: string, id: string): Promise<ActionResult> {
  const parsed = parseWithSchema(programHeadGOActionSchema, { programId, id });
  if (!parsed.success) return parsed;
  const result = await deleteGO(parsed.data.programId, parsed.data.id);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidateOutcomes(parsed.data.programId);
  return { success: true };
}

export async function restoreGOAction(programId: string, id: string): Promise<ActionResult> {
  const parsed = parseWithSchema(programHeadGOActionSchema, { programId, id });
  if (!parsed.success) return parsed;
  const result = await restoreGO(parsed.data.programId, parsed.data.id);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidateOutcomes(parsed.data.programId);
  return { success: true };
}

export async function reorderGOsAction(
  programId: string,
  orderedIds: string[]
): Promise<ActionResult> {
  const parsed = parseWithSchema(reorderGOsSchema, { programId, orderedIds });
  if (!parsed.success) return parsed;
  const result = await reorderGOs(parsed.data.programId, parsed.data.orderedIds);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidateOutcomes(parsed.data.programId);
  return { success: true };
}
