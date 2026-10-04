import { ResponseStatus } from "@prisma/client";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { prisma } from "@/lib/db/prisma";
import { assertSubmissionIsAllowed } from "./assert-submission-is-allowed";
import {
  ALREADY_SUBMITTED_ERROR,
  finalizeResponseSubmission,
} from "./finalize-response-submission";
import { resolveAnswerableAssignment, type AnswerAudience } from "./resolve-answerable-assignment";

export type SubmitEvaluationResponseInput = {
  answers: Record<string, unknown>;
  assignmentId: string;
};

type SubmitEvaluationResponseResult =
  | {
      error: string;
      success: false;
    }
  | {
      responseId: string;
      status: "SUBMITTED";
      submittedAt: string;
      success: true;
    };

/**
 * Validate and finalize a respondent's response in one transaction. Student and
 * stakeholder entry points differ only in which assignments they may answer.
 */
export async function submitEvaluationResponse(
  audience: AnswerAudience,
  { answers, assignmentId }: SubmitEvaluationResponseInput
): Promise<SubmitEvaluationResponseResult> {
  const authSession = await resolveAuthSession();

  if (!authSession) {
    return { error: "Authentication is required.", success: false };
  }

  const resolved = await resolveAnswerableAssignment({
    assignmentId,
    audience,
    userId: authSession.userId,
    withCiloBindings: true,
  });

  if (!resolved.success) {
    return { error: resolved.error, success: false };
  }

  const { ciloQuestionBindings, createData, structureSnapshot } = resolved.data;

  assertSubmissionIsAllowed({ answers, structureSnapshot });

  try {
    const result = await prisma.$transaction((tx) =>
      finalizeResponseSubmission({
        answers,
        assignmentId: createData.assignment_id,
        ciloQuestionBindings,
        createData,
        tx,
      })
    );

    return {
      responseId: result.responseId,
      status: ResponseStatus.SUBMITTED,
      submittedAt: result.submittedAt,
      success: true,
    };
  } catch (error) {
    if (error instanceof Error && error.message === ALREADY_SUBMITTED_ERROR) {
      return { error: "This evaluation has already been submitted.", success: false };
    }
    console.error("Failed to submit evaluation response:", error);
    return {
      error: "An unexpected error occurred while submitting your response.",
      success: false,
    };
  }
}
