"use server";

import { revalidatePath } from "next/cache";
import type { ZodType } from "zod";
import {
  buildGenEdOutcomeMappingPath,
  buildGenEdOutcomesPath,
} from "@/lib/constants/gen-ed-routes";
import {
  createILOSchema,
  iloActionSchema,
  reorderILOsSchema,
  updateILOSchema,
} from "@/features/outcomes/schemas/ilo";
import {
  archiveILO,
  createILO,
  reorderILOs,
  restoreILO,
  updateILO,
} from "@/features/outcomes/services/manage-gen-ed-outcomes";

type ActionResult = { success: true } | { success: false; error: string };

// fallow-ignore-next-line code-duplication
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

function revalidateOutcomes() {
  revalidatePath(buildGenEdOutcomesPath());
  revalidatePath(buildGenEdOutcomeMappingPath());
}

export async function createILOAction(formData: FormData): Promise<ActionResult> {
  const parsed = parseWithSchema(createILOSchema, {
    code: formData.get("code"),
    description: formData.get("description"),
  });
  if (!parsed.success) return parsed;
  const result = await createILO(parsed.data);
  if (!result.success) return { success: false, error: result.error };
  revalidateOutcomes();
  return { success: true };
}

export async function updateILOAction(formData: FormData): Promise<ActionResult> {
  const parsed = parseWithSchema(updateILOSchema, {
    id: formData.get("id"),
    code: formData.get("code"),
    description: formData.get("description"),
  });
  if (!parsed.success) return parsed;
  const result = await updateILO(parsed.data);
  if (!result.success) return { success: false, error: result.error };
  revalidateOutcomes();
  return { success: true };
}

export async function archiveILOAction(id: string): Promise<ActionResult> {
  const parsed = parseWithSchema(iloActionSchema, { id });
  if (!parsed.success) return parsed;
  const result = await archiveILO(parsed.data.id);
  if (!result.success) return { success: false, error: result.error };
  revalidateOutcomes();
  return { success: true };
}

export async function restoreILOAction(id: string): Promise<ActionResult> {
  const parsed = parseWithSchema(iloActionSchema, { id });
  if (!parsed.success) return parsed;
  const result = await restoreILO(parsed.data.id);
  if (!result.success) return { success: false, error: result.error };
  revalidateOutcomes();
  return { success: true };
}

export async function reorderILOsAction(orderedIds: string[]): Promise<ActionResult> {
  const parsed = parseWithSchema(reorderILOsSchema, { orderedIds });
  if (!parsed.success) return parsed;
  const result = await reorderILOs(parsed.data.orderedIds);
  if (!result.success) return { success: false, error: result.error };
  revalidateOutcomes();
  return { success: true };
}
