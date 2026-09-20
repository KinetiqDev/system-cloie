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
import { goImportRequestSchema } from "@/features/outcomes/schemas/go-import";
import {
  createGO,
  deleteGO,
  reorderGOs,
  restoreGO,
  updateGO,
} from "@/features/outcomes/services/manage-program-head-outcomes";
import { previewGOImport } from "@/features/outcomes/services/preview-go-import";
import { confirmGOImport } from "@/features/outcomes/services/confirm-go-import";
import type { GOImportPreview, GOImportResult } from "@/features/outcomes/types/go-import";
import type { ServiceResult } from "@/lib/utils/service-result";

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
function firstImportIssue(error: { issues: Array<{ message?: string }> }): string {
  return error.issues[0]?.message ?? "Enter a valid GO import.";
}

export async function previewGOImportAction(
  input: unknown
): Promise<ServiceResult<GOImportPreview>> {
  const parsed = goImportRequestSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: firstImportIssue(parsed.error) };
  return previewGOImport(parsed.data);
}

export async function confirmGOImportAction(
  input: unknown
): Promise<ServiceResult<GOImportResult>> {
  const parsed = goImportRequestSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: firstImportIssue(parsed.error) };
  const result = await confirmGOImport(parsed.data);
  if (result.success && result.data.summary.created > 0) revalidateOutcomes(parsed.data.programId);
  return result;
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
