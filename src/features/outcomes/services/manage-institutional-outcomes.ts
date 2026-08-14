import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { ROLES } from "@/lib/constants/roles";
import { prisma } from "@/lib/db/prisma";
import type { ServiceResult } from "@/lib/utils/service-result";
import {
  commitOutcomeWrite,
  prepareOutcomeWrite,
  type OutcomeWriteReview,
} from "./manage-outcome-writes";
import type { InstitutionalOutcomeWriteInput } from "../schemas/institutional-outcome";

export type InstitutionalOutcomeItem = {
  id: string;
  code: string;
  description: string;
  order: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
};

type ListInstitutionalOutcomesResult = { outcomes: InstitutionalOutcomeItem[] };

export async function listInstitutionalOutcomes(): Promise<
  ServiceResult<ListInstitutionalOutcomesResult>
> {
  const session = await resolveAuthSession();
  if (!session || session.activeRole !== ROLES.SECRETARY) {
    return { success: false, error: "Secretary access required." };
  }
  const outcomes = await prisma.institutionalOutcome.findMany({
    orderBy: [{ order: "asc" }, { code: "asc" }],
  });
  return { success: true, data: { outcomes } };
}

export async function prepareInstitutionalOutcomeWrite(
  input: InstitutionalOutcomeWriteInput
): Promise<ServiceResult<OutcomeWriteReview>> {
  return prepareOutcomeWrite(input);
}

export async function commitInstitutionalOutcomeWrite(
  review: OutcomeWriteReview,
  confirmed: boolean
): Promise<ServiceResult<{ id?: string }>> {
  return commitOutcomeWrite(review, confirmed);
}
