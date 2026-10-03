"use server";

import {
  saveStudentEvaluationDraft,
  type SaveStudentEvaluationDraftInput,
} from "@/features/responses/services/save-student-evaluation-draft";
import {
  submitStudentEvaluationResponse,
  type SubmitStudentEvaluationResponseInput,
} from "@/features/responses/services/submit-student-evaluation-response";

export async function saveStudentEvaluationDraftAction(payload: SaveStudentEvaluationDraftInput) {
  return await saveStudentEvaluationDraft(payload);
}

export async function submitStudentEvaluationResponseAction(
  payload: SubmitStudentEvaluationResponseInput
) {
  return await submitStudentEvaluationResponse(payload);
}
