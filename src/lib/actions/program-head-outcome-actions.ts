"use server";

import { revalidatePath } from "next/cache";
import type { ZodType } from "zod";
import { z } from "zod";
import {
  buildProgramHeadOutcomeMappingPath,
  buildProgramHeadOutcomesPath,
} from "@/lib/constants/program-head-routes";
import {
  createGOSchema,
  createMappingSchema,
  removeMappingSchema,
  updateGOSchema,
} from "@/features/outcomes/schemas/go";
import { programHeadGOActionSchema, reorderGOsSchema } from "@/features/outcomes/schemas/go";
import {
  createGO,
  deleteGO,
  reorderGOs,
  updateGO,
} from "@/features/outcomes/services/manage-program-head-outcomes";
import {
  commitOutcomeWrite,
  prepareOutcomeWrite,
} from "@/features/outcomes/services/manage-outcome-writes";
import type { OutcomeWriteReview } from "@/features/outcomes/services/manage-outcome-writes";

type ActionResult = { success: true } | { success: false; error: string };
export type MappingPrepareResult =
  | { success: true; review: OutcomeWriteReview }
  | { success: false; error: string };

const mappingReviewSchema = z.object({
  input: z.discriminatedUnion("action", [
    z.object({
      kind: z.literal("MAPPING"),
      action: z.literal("create"),
      programId: z.string().uuid(),
      ciloId: z.string().uuid(),
      goId: z.string().uuid(),
    }),
    z.object({
      kind: z.literal("MAPPING"),
      action: z.literal("remove"),
      programId: z.string().uuid(),
      id: z.string().uuid(),
    }),
  ]),
  before: z.unknown(),
  after: z.unknown(),
  freshnessToken: z.string(),
  signature: z.string().regex(/^[0-9a-f]+$/i),
});

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

export async function prepareMappingAction(formData: FormData): Promise<MappingPrepareResult> {
  const parsed = parseWithSchema(createMappingSchema, {
    programId: formData.get("programId"),
    ciloId: formData.get("ciloId"),
    goId: formData.get("goId"),
  });
  if (!parsed.success) return parsed;
  const review = await prepareOutcomeWrite({ kind: "MAPPING", action: "create", ...parsed.data });
  if (!review.success) return { success: false, error: review.error };
  return { success: true, review: review.data };
}

export async function commitMappingAction(
  review: unknown,
  confirmed: boolean
): Promise<ActionResult> {
  const parsed = mappingReviewSchema.safeParse(review);
  if (!parsed.success) return { success: false, error: "Invalid mapping review." };
  const result = await commitOutcomeWrite(parsed.data as OutcomeWriteReview, confirmed);
  if (!result.success) return { success: false, error: result.error };
  revalidateOutcomes(parsed.data.input.programId);
  return { success: true };
}
export async function prepareRemoveMappingAction(
  formData: FormData
): Promise<MappingPrepareResult> {
  const parsed = parseWithSchema(removeMappingSchema, {
    programId: formData.get("programId"),
    id: formData.get("id"),
  });
  if (!parsed.success) return parsed;
  const review = await prepareOutcomeWrite({ kind: "MAPPING", action: "remove", ...parsed.data });
  if (!review.success) return { success: false, error: review.error };
  return { success: true, review: review.data };
}
