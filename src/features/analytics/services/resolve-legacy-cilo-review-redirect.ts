import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

const uuid = z.string().uuid();

export async function resolveLegacyCourseEvaluation(evaluationId: string, programId: string): Promise<string | null> {
  if (!uuid.safeParse(evaluationId).success || !uuid.safeParse(programId).success) return null;
  const evaluation = await prisma.courseBoundEvaluation.findFirst({
    where: { id: evaluationId, course_assignment: { program_id: programId } },
    select: { id: true },
  });
  return evaluation?.id ?? null;
}

export async function resolveLegacyCourseResponse(responseId: string, evaluationId: string, programId: string): Promise<string | null> {
  if (![responseId, evaluationId, programId].every((value) => uuid.safeParse(value).success)) return null;
  const response = await prisma.response.findFirst({
    where: {
      id: responseId,
      status: "SUBMITTED",
      deployment_type: "COURSE_BOUND",
      assignment: { course_bound: { id: evaluationId, course_assignment: { program_id: programId } } },
    },
    select: { id: true },
  });
  return response?.id ?? null;
}
