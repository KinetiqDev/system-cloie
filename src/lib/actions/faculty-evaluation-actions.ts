"use server";

import { revalidatePath } from "next/cache";
import { closeFacultyEvaluation } from "@/features/evaluations/services/close-faculty-evaluation";
import { reopenFacultyEvaluation } from "@/features/evaluations/services/reopen-faculty-evaluation";
import type {
  CloseFacultyEvaluationResult,
  ReopenFacultyEvaluationResult,
} from "@/features/evaluations/types";

export async function closeFacultyEvaluationAction(
  evaluationId: string
): Promise<CloseFacultyEvaluationResult> {
  const result = await closeFacultyEvaluation(evaluationId);

  if (result.success) {
    revalidatePath("/faculty/tools");
  }

  return result;
}

export async function reopenFacultyEvaluationAction(
  evaluationId: string,
  deadlineAt: Date
): Promise<ReopenFacultyEvaluationResult> {
  const result = await reopenFacultyEvaluation(evaluationId, deadlineAt);

  if (result.success) {
    revalidatePath("/faculty/tools");
    revalidatePath(`/faculty/tools/published/${evaluationId}`);
  }

  return result;
}
