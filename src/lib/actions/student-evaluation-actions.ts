"use server";

import {
  saveEvaluationDraft,
  type SaveEvaluationDraftInput,
} from "@/features/responses/services/save-evaluation-draft";
import {
  submitEvaluationResponse,
  type SubmitEvaluationResponseInput,
} from "@/features/responses/services/submit-evaluation-response";

export async function saveStudentEvaluationDraftAction(payload: SaveEvaluationDraftInput) {
  return await saveEvaluationDraft("STUDENT", payload);
}

export async function submitStudentEvaluationResponseAction(
  payload: SubmitEvaluationResponseInput
) {
  return await submitEvaluationResponse("STUDENT", payload);
}
