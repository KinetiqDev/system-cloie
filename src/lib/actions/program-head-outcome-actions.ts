"use server";

import { revalidatePath } from "next/cache";
import type { ZodType } from "zod";
import {
  buildProgramHeadOutcomeMappingPath,
  buildProgramHeadOutcomesPath,
} from "@/lib/constants/program-head-routes";
import {
  createPLOSchema,
  programHeadPLOActionSchema,
  reorderPLOsSchema,
  updatePLOSchema,
} from "@/features/outcomes/schemas/plo";
import { ploImportRequestSchema } from "@/features/outcomes/schemas/plo-import";
import {
  createPLO,
  deletePLO,
  reorderPLOs,
  restorePLO,
  updatePLO,
} from "@/features/outcomes/services/manage-program-head-outcomes";
import { previewPLOImport } from "@/features/outcomes/services/preview-plo-import";
import { confirmPLOImport } from "@/features/outcomes/services/confirm-plo-import";
import type { PLOImportPreview, PLOImportResult } from "@/features/outcomes/types/plo-import";
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
  return error.issues[0]?.message ?? "Enter a valid PLO import.";
}

export async function previewPLOImportAction(
  input: unknown
): Promise<ServiceResult<PLOImportPreview>> {
  const parsed = ploImportRequestSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: firstImportIssue(parsed.error) };
  return previewPLOImport(parsed.data);
}

export async function confirmPLOImportAction(
  input: unknown
): Promise<ServiceResult<PLOImportResult>> {
  const parsed = ploImportRequestSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: firstImportIssue(parsed.error) };
  const result = await confirmPLOImport(parsed.data);
  if (result.success && result.data.summary.created > 0) revalidateOutcomes(parsed.data.programId);
  return result;
}

export async function createPLOAction(formData: FormData): Promise<ActionResult> {
  const parsed = parseWithSchema(createPLOSchema, {
    code: formData.get("code"),
    description: formData.get("description"),
    order: formData.get("order"),
    programId: formData.get("programId"),
  });

  if (!parsed.success) {
    return parsed;
  }

  const result = await createPLO(parsed.data);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidateOutcomes(parsed.data.programId);
  return { success: true };
}

export async function updatePLOAction(formData: FormData): Promise<ActionResult> {
  const parsed = parseWithSchema(updatePLOSchema, {
    id: formData.get("id"),
    code: formData.get("code"),
    description: formData.get("description"),
    order: formData.get("order"),
    programId: formData.get("programId"),
  });

  if (!parsed.success) {
    return parsed;
  }

  const result = await updatePLO(parsed.data);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidateOutcomes(parsed.data.programId);
  return { success: true };
}

export async function deletePLOAction(programId: string, id: string): Promise<ActionResult> {
  const parsed = parseWithSchema(programHeadPLOActionSchema, { programId, id });
  if (!parsed.success) return parsed;
  const result = await deletePLO(parsed.data.programId, parsed.data.id);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidateOutcomes(parsed.data.programId);
  return { success: true };
}

export async function restorePLOAction(programId: string, id: string): Promise<ActionResult> {
  const parsed = parseWithSchema(programHeadPLOActionSchema, { programId, id });
  if (!parsed.success) return parsed;
  const result = await restorePLO(parsed.data.programId, parsed.data.id);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidateOutcomes(parsed.data.programId);
  return { success: true };
}

export async function reorderPLOsAction(
  programId: string,
  orderedIds: string[]
): Promise<ActionResult> {
  const parsed = parseWithSchema(reorderPLOsSchema, { programId, orderedIds });
  if (!parsed.success) return parsed;
  const result = await reorderPLOs(parsed.data.programId, parsed.data.orderedIds);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidateOutcomes(parsed.data.programId);
  return { success: true };
}
