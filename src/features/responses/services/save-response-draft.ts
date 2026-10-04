import { ResponseStatus, type Prisma } from "@prisma/client";
import type { StudentEvaluationSection } from "@/features/responses/types";
import { buildQualitativeUpserts, buildQuantitativeUpserts } from "./build-draft-upserts";
import { lockResponseSubmission } from "./lock-response-submission";

/** Replace only the selected section; finalized responses remain immutable. */

type SaveResponseDraftInput = {
  answers: Record<string, unknown>;
  client: {
    $transaction<T>(work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T>;
  };
  createData: Prisma.ResponseUncheckedCreateInput;
  section: StudentEvaluationSection;
};

type SavedResponseDraft =
  | {
      status: "SAVED";
      responseId: string;
      savedAt: string;
    }
  | {
      status: "ALREADY_SUBMITTED";
    };

export async function saveResponseDraft(
  input: SaveResponseDraftInput
): Promise<SavedResponseDraft> {
  return input.client.$transaction((tx) => replaceDraftSection({ ...input, client: tx }));
}

async function replaceDraftSection({
  answers,
  client,
  createData,
  section,
}: Omit<SaveResponseDraftInput, "client"> & {
  client: Prisma.TransactionClient;
}): Promise<SavedResponseDraft> {
  await lockResponseSubmission(client, createData.assignment_id);

  let response = await client.response.findUnique({
    where: { assignment_id: createData.assignment_id },
  });

  if (response?.status === ResponseStatus.SUBMITTED) {
    return { status: "ALREADY_SUBMITTED" };
  }

  if (!response) {
    response = await client.response.create({ data: createData });
  }

  const savedAt = new Date().toISOString();
  const quantitativeUpserts = buildQuantitativeUpserts({
    answers,
    responseId: response.id,
    section,
    updatedAt: savedAt,
  });
  const qualitativeUpserts = buildQualitativeUpserts({
    answers,
    responseId: response.id,
    section,
    updatedAt: savedAt,
  });

  await client.quantitativeResponseItem.deleteMany({
    where: {
      response_id: response.id,
      section_key: section.id,
    },
  });
  await client.qualitativeResponseItem.deleteMany({
    where: {
      response_id: response.id,
      section_key: section.id,
    },
  });

  if (quantitativeUpserts.length > 0) {
    await client.quantitativeResponseItem.createMany({ data: quantitativeUpserts });
  }

  if (qualitativeUpserts.length > 0) {
    await client.qualitativeResponseItem.createMany({ data: qualitativeUpserts });
  }

  return {
    responseId: response.id,
    savedAt,
    status: "SAVED",
  };
}
