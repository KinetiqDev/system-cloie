"use server";

import { revalidatePath } from "next/cache";
import { closeFacultyEvaluation } from "@/features/evaluations/services/close-faculty-evaluation";
import type { CloseFacultyEvaluationResult } from "@/features/evaluations/types";

export async function closeFacultyEvaluationAction(
  evaluationId: string
): Promise<CloseFacultyEvaluationResult> {
  const result = await closeFacultyEvaluation(evaluationId);

  if (result.success) {
    revalidatePath("/faculty/tools");
  }

  return result;
}
