"use server";

import { revalidatePath } from "next/cache";
import {
  institutionalOutcomeIdSchema,
  institutionalOutcomeReviewSchema,
  institutionalOutcomeWriteInputSchema,
  reorderInstitutionalOutcomesSchema,
} from "@/features/outcomes/schemas/institutional-outcome";
import {
  commitInstitutionalOutcomeWrite,
  prepareInstitutionalOutcomeWrite,
} from "@/features/outcomes/services/manage-institutional-outcomes";
import type { OutcomeWriteReview } from "@/features/outcomes/services/manage-outcome-writes";
import type { InstitutionalOutcomeWriteInput } from "@/features/outcomes/schemas/institutional-outcome";

type ActionResult = { success: true } | { success: false; error: string };
type InstitutionalOutcomePrepareResult =
  | { success: true; review: OutcomeWriteReview }
  | { success: false; error: string };

function invalid(): { success: false; error: string } {
  return { success: false, error: "Invalid Institutional Outcome input." };
}

function revalidateInstitutionalOutcomes() {
  revalidatePath("/secretary/learning-outcomes");
}

async function prepareInstitutionalOutcomeAction(
  input: InstitutionalOutcomeWriteInput
): Promise<InstitutionalOutcomePrepareResult> {
  const parsed = institutionalOutcomeWriteInputSchema.safeParse(input);
  if (!parsed.success) return invalid();
  const result = await prepareInstitutionalOutcomeWrite(parsed.data);
  if (!result.success) return result;
  return { success: true, review: result.data };
}

export async function commitInstitutionalOutcomeAction(
  review: unknown,
  confirmed: boolean
): Promise<ActionResult> {
  const parsed = institutionalOutcomeReviewSchema.safeParse(review);
  if (!parsed.success) return invalid();
  const result = await commitInstitutionalOutcomeWrite(
    parsed.data as OutcomeWriteReview,
    confirmed
  );
  if (!result.success) return result;
  revalidateInstitutionalOutcomes();
  return { success: true };
}

export async function prepareCreateInstitutionalOutcomeAction(input: {
  code: string;
  description: string;
}): Promise<InstitutionalOutcomePrepareResult> {
  return prepareInstitutionalOutcomeAction({ kind: "ILO", action: "create", ...input });
}

export async function prepareUpdateInstitutionalOutcomeAction(input: {
  id: string;
  code: string;
  description: string;
}): Promise<InstitutionalOutcomePrepareResult> {
  return prepareInstitutionalOutcomeAction({ kind: "ILO", action: "update", ...input });
}

export async function prepareArchiveInstitutionalOutcomeAction(
  id: string
): Promise<InstitutionalOutcomePrepareResult> {
  const parsed = institutionalOutcomeIdSchema.safeParse(id);
  if (!parsed.success) return invalid();
  return prepareInstitutionalOutcomeAction({ kind: "ILO", action: "archive", id: parsed.data });
}

export async function prepareRestoreInstitutionalOutcomeAction(
  id: string
): Promise<InstitutionalOutcomePrepareResult> {
  const parsed = institutionalOutcomeIdSchema.safeParse(id);
  if (!parsed.success) return invalid();
  return prepareInstitutionalOutcomeAction({ kind: "ILO", action: "restore", id: parsed.data });
}

export async function prepareReorderInstitutionalOutcomesAction(
  input:
    | {
        orderedIds: string[];
      }
    | string[]
): Promise<InstitutionalOutcomePrepareResult> {
  const parsed = reorderInstitutionalOutcomesSchema.safeParse(
    Array.isArray(input) ? { orderedIds: input } : input
  );
  if (!parsed.success) return invalid();
  return prepareInstitutionalOutcomeAction({ kind: "ILO", action: "reorder", ...parsed.data });
}
