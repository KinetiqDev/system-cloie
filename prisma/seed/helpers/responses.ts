import { DeploymentType, ResponseStatus } from "@prisma/client";
import { prisma } from "../../../src/lib/db/prisma";

export async function ensureResponse(opts: {
  assignmentId: string;
  respondentId: string;
  deploymentType: DeploymentType;
  deploymentId: string;
  status: ResponseStatus;
  submittedAt?: Date;
}) {
  const existing = await prisma.response.findUnique({
    where: { assignment_id: opts.assignmentId },
  });
  if (existing) return existing;
  return prisma.response.create({
    data: {
      assignment_id: opts.assignmentId,
      respondent_id: opts.respondentId,
      deployment_type: opts.deploymentType,
      deployment_id: opts.deploymentId,
      status: opts.status,
      submitted_at: opts.submittedAt ?? null,
    },
  });
}

export async function seedQuantItems(
  responseId: string,
  items: { sk: string; ik: string; val: number }[]
) {
  for (const item of items) {
    const existing = await prisma.quantitativeResponseItem.findFirst({
      where: { response_id: responseId, section_key: item.sk, item_key: item.ik },
    });
    if (!existing) {
      await prisma.quantitativeResponseItem.create({
        data: {
          response_id: responseId,
          section_key: item.sk,
          item_key: item.ik,
          rating_value: item.val,
        },
      });
    }
  }
}

export async function seedQualItems(
  responseId: string,
  items: { sk: string; pk: string; text: string }[]
) {
  for (const item of items) {
    const existing = await prisma.qualitativeResponseItem.findFirst({
      where: { response_id: responseId, section_key: item.sk, prompt_key: item.pk },
    });
    if (!existing) {
      await prisma.qualitativeResponseItem.create({
        data: {
          response_id: responseId,
          section_key: item.sk,
          prompt_key: item.pk,
          text_content: item.text,
        },
      });
    }
  }
}
