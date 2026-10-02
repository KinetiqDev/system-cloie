import { ResponseStatus, type Prisma } from "@prisma/client";
import { parseStudentEvaluationAnswerKey } from "@/features/responses/answer-keys";
import { lockResponseSubmission } from "./lock-response-submission";

/** Sentinel message the caller maps onto its already-submitted failure result. */
export const ALREADY_SUBMITTED_ERROR = "ALREADY_SUBMITTED";

type QuantitativeItem = Prisma.QuantitativeResponseItemCreateManyInput;
type QualitativeItem = Prisma.QualitativeResponseItemCreateManyInput;

type FinalizeResponseSubmissionInput = {
  answers: Record<string, unknown>;
  assignmentId: string;
  createData: Prisma.ResponseUncheckedCreateInput;
  tx: Prisma.TransactionClient;
};

type FinalizedResponse = {
  responseId: string;
  submittedAt: string;
};

function buildQuantitativeItems(
  answers: Record<string, unknown>,
  responseId: string
): QuantitativeItem[] {
  const items: QuantitativeItem[] = [];

  for (const [answerKey, value] of Object.entries(answers)) {
    const parsed = parseStudentEvaluationAnswerKey(answerKey);

    if (parsed?.kind === "quantitative" && typeof value === "number") {
      items.push({
        item_key: parsed.itemKey,
        rating_value: value,
        response_id: responseId,
        section_key: parsed.sectionKey,
      });
    }
  }

  return items;
}

function buildQualitativeItems(
  answers: Record<string, unknown>,
  responseId: string
): QualitativeItem[] {
  const items: QualitativeItem[] = [];

  for (const [answerKey, value] of Object.entries(answers)) {
    const parsed = parseStudentEvaluationAnswerKey(answerKey);

    if (parsed?.kind === "qualitative" && typeof value === "string") {
      items.push({
        prompt_key: parsed.itemKey,
        response_id: responseId,
        section_key: parsed.sectionKey,
        text_content: value,
      });
    }
  }

  return items;
}

/** The assignment lock must precede the response read inside the caller's transaction. */

export async function finalizeResponseSubmission({
  answers,
  assignmentId,
  createData,
  tx,
}: FinalizeResponseSubmissionInput): Promise<FinalizedResponse> {
  await lockResponseSubmission(tx, assignmentId);

  let response = await tx.response.findUnique({ where: { assignment_id: assignmentId } });

  if (response?.status === ResponseStatus.SUBMITTED) {
    throw new Error(ALREADY_SUBMITTED_ERROR);
  }

  if (!response) {
    response = await tx.response.create({ data: createData });
  }

  const quantitativeItems = buildQuantitativeItems(answers, response.id);
  const qualitativeItems = buildQualitativeItems(answers, response.id);

  await tx.quantitativeResponseItem.deleteMany({ where: { response_id: response.id } });
  await tx.qualitativeResponseItem.deleteMany({ where: { response_id: response.id } });

  if (quantitativeItems.length > 0) {
    await tx.quantitativeResponseItem.createMany({ data: quantitativeItems });
  }

  if (qualitativeItems.length > 0) {
    await tx.qualitativeResponseItem.createMany({ data: qualitativeItems });
  }

  const submittedAt = new Date().toISOString();

  await tx.response.update({
    data: {
      status: ResponseStatus.SUBMITTED,
      submitted_at: new Date(submittedAt),
    },
    where: {
      id: response.id,
    },
  });

  return {
    responseId: response.id,
    submittedAt,
  };
}
