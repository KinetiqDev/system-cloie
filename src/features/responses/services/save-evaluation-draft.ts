import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { prisma } from "@/lib/db/prisma";
import { mapTemplateStructureToSections } from "./map-template-structure";
import { resolveAnswerableAssignment, type AnswerAudience } from "./resolve-answerable-assignment";
import { saveResponseDraft } from "./save-response-draft";

export type SaveEvaluationDraftInput = {
  answers: Record<string, unknown>;
  assignmentId: string;
  sectionKey: string;
};

type SaveEvaluationDraftResult =
  | {
      error: string;
      success: false;
    }
  | {
      responseId: string;
      savedAt: string;
      success: true;
    };

/**
 * Save one section of a respondent's in-progress response. Student and
 * stakeholder entry points differ only in which assignments they may answer.
 */
export async function saveEvaluationDraft(
  audience: AnswerAudience,
  { answers, assignmentId, sectionKey }: SaveEvaluationDraftInput
): Promise<SaveEvaluationDraftResult> {
  const authSession = await resolveAuthSession();

  if (!authSession) {
    return { error: "Authentication is required.", success: false };
  }

  const resolved = await resolveAnswerableAssignment({
    assignmentId,
    audience,
    userId: authSession.userId,
    withCiloBindings: false,
  });

  if (!resolved.success) {
    return { error: resolved.error, success: false };
  }

  const section = mapTemplateStructureToSections(resolved.data.structureSnapshot).find(
    (entry) => entry.id === sectionKey
  );

  if (!section) {
    return { error: `Unknown section ${sectionKey}.`, success: false };
  }

  const result = await saveResponseDraft({
    answers,
    client: prisma,
    createData: resolved.data.createData,
    section,
  });

  if (result.status === "ALREADY_SUBMITTED") {
    return { error: "This evaluation has already been submitted.", success: false };
  }

  return { responseId: result.responseId, savedAt: result.savedAt, success: true };
}
