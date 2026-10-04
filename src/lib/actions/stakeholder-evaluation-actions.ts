"use server";

import {
  saveEvaluationDraft,
  type SaveEvaluationDraftInput,
} from "@/features/responses/services/save-evaluation-draft";
import {
  submitEvaluationResponse,
  type SubmitEvaluationResponseInput,
} from "@/features/responses/services/submit-evaluation-response";

/** Save a draft for a Central deployment evaluation (alumni, industry partner). */
export async function saveCentralDeploymentDraftAction(payload: SaveEvaluationDraftInput) {
  return await saveEvaluationDraft("STAKEHOLDER", payload);
}

/** Submit a Central deployment evaluation response (alumni, industry partner). */
export async function submitCentralDeploymentResponseAction(
  payload: SubmitEvaluationResponseInput
) {
  return await submitEvaluationResponse("STAKEHOLDER", payload);
}
