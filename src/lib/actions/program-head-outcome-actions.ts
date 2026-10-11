"use server";

import { revalidatePath } from "next/cache";
import type { ZodType } from "zod";
import {
  buildProgramHeadOutcomeMappingPath,
  buildProgramHeadOutcomesPath,
} from "@/lib/constants/program-head-routes";
import {
  createPOSchema,
  programHeadPOActionSchema,
  reorderPOsSchema,
  updatePOSchema,
} from "@/features/outcomes/schemas/po";
import { poImportRequestSchema } from "@/features/outcomes/schemas/po-import";
import {
  createPO,
  deletePO,
  reorderPOs,
  restorePO,
  updatePO,
} from "@/features/outcomes/services/manage-program-head-outcomes";
import { previewPOImport } from "@/features/outcomes/services/preview-po-import";
import { confirmPOImport } from "@/features/outcomes/services/confirm-po-import";
import type { POImportPreview, POImportResult } from "@/features/outcomes/types/po-import";
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
  return error.issues[0]?.message ?? "Enter a valid PO import.";
}

export async function previewPOImportAction(
  input: unknown
): Promise<ServiceResult<POImportPreview>> {
  const parsed = poImportRequestSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: firstImportIssue(parsed.error) };
  return previewPOImport(parsed.data);
}

export async function confirmPOImportAction(
  input: unknown
): Promise<ServiceResult<POImportResult>> {
  const parsed = poImportRequestSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: firstImportIssue(parsed.error) };
  const result = await confirmPOImport(parsed.data);
  if (result.success && result.data.summary.created > 0) revalidateOutcomes(parsed.data.programId);
  return result;
}

export async function createPOAction(formData: FormData): Promise<ActionResult> {
  const parsed = parseWithSchema(createPOSchema, {
    code: formData.get("code"),
    description: formData.get("description"),
    order: formData.get("order"),
    classification: formData.get("classification"),
    programId: formData.get("programId"),
  });

  if (!parsed.success) {
    return parsed;
  }

  const result = await createPO(parsed.data);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidateOutcomes(parsed.data.programId);
  return { success: true };
}

export async function updatePOAction(formData: FormData): Promise<ActionResult> {
  const parsed = parseWithSchema(updatePOSchema, {
    id: formData.get("id"),
    code: formData.get("code"),
    description: formData.get("description"),
    order: formData.get("order"),
    classification: formData.get("classification"),
    programId: formData.get("programId"),
  });

  if (!parsed.success) {
    return parsed;
  }

  const result = await updatePO(parsed.data);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidateOutcomes(parsed.data.programId);
  return { success: true };
}

export async function deletePOAction(programId: string, id: string): Promise<ActionResult> {
  const parsed = parseWithSchema(programHeadPOActionSchema, { programId, id });
  if (!parsed.success) return parsed;
  const result = await deletePO(parsed.data.programId, parsed.data.id);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidateOutcomes(parsed.data.programId);
  return { success: true };
}

export async function restorePOAction(programId: string, id: string): Promise<ActionResult> {
  const parsed = parseWithSchema(programHeadPOActionSchema, { programId, id });
  if (!parsed.success) return parsed;
  const result = await restorePO(parsed.data.programId, parsed.data.id);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidateOutcomes(parsed.data.programId);
  return { success: true };
}

export async function reorderPOsAction(
  programId: string,
  orderedIds: string[]
): Promise<ActionResult> {
  const parsed = parseWithSchema(reorderPOsSchema, { programId, orderedIds });
  if (!parsed.success) return parsed;
  const result = await reorderPOs(parsed.data.programId, parsed.data.orderedIds);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidateOutcomes(parsed.data.programId);
  return { success: true };
}
