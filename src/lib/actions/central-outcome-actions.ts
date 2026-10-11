"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { poDetailsSchema } from "@/features/outcomes/schemas/po";
import {
  prepareOutcomeWrite,
  commitOutcomeWrite,
} from "@/features/outcomes/services/manage-outcome-writes";

const details = poDetailsSchema.shape;
const commonInput = z.discriminatedUnion("action", [
  z.object({
    kind: z.literal("COMMON_PO"),
    action: z.literal("create"),
    ...details,
    sourceRef: z.string().max(1000).nullable().optional(),
  }),
  z.object({
    kind: z.literal("COMMON_PO"),
    action: z.literal("update"),
    id: z.string().uuid(),
    ...details,
    sourceRef: z.string().max(1000).nullable().optional(),
  }),
  z.object({ kind: z.literal("COMMON_PO"), action: z.literal("archive"), id: z.string().uuid() }),
  z.object({ kind: z.literal("COMMON_PO"), action: z.literal("restore"), id: z.string().uuid() }),
  z.object({
    kind: z.literal("COMMON_PO"),
    action: z.literal("reorder"),
    orderedIds: z.array(z.string().uuid()),
  }),
]);
const adminPOFields = {
  ...details,
  programId: z.string().uuid(),
  classification: z.enum(["COMMON", "INSTITUTION_SPECIFIC"]),
  commonOutcomeId: z.string().uuid().nullable().optional(),
};
const adminPOInput = z.discriminatedUnion("action", [
  z.object({ kind: z.literal("PO"), action: z.literal("create"), ...adminPOFields }),
  z.object({
    kind: z.literal("PO"),
    action: z.literal("update"),
    id: z.string().uuid(),
    ...adminPOFields,
  }),
  z.object({
    kind: z.literal("PO"),
    action: z.literal("archive"),
    id: z.string().uuid(),
    programId: z.string().uuid(),
  }),
  z.object({
    kind: z.literal("PO"),
    action: z.literal("restore"),
    id: z.string().uuid(),
    programId: z.string().uuid(),
  }),
]);

export async function reviewCentralOutcomeAction(value: unknown) {
  const parsed = z.union([commonInput, adminPOInput]).safeParse(value);
  if (!parsed.success)
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid outcome.",
    } as const;
  return prepareOutcomeWrite(parsed.data);
}

export async function commitCentralOutcomeAction(
  review: Parameters<typeof commitOutcomeWrite>[0],
  confirmed: boolean
) {
  if (review.input.kind !== "COMMON_PO" && review.input.kind !== "PO")
    return { success: false, error: "Invalid outcome review." } as const;
  const result = await commitOutcomeWrite(review, confirmed);
  if (result.success) {
    revalidatePath("/secretary/common-outcomes");
    revalidatePath("/dean/common-outcomes");
    revalidatePath("/program-head/outcomes");
    revalidatePath("/faculty/cilos");
    revalidatePath("/gen-ed-coordinator/outcomes");
  }
  return result;
}
