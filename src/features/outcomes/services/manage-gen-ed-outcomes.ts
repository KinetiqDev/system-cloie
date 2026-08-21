import { prisma } from "@/lib/db/prisma";
import { ROLES } from "@/lib/constants/roles";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import type { ServiceResult } from "@/lib/utils/service-result";
import type { CreateILOInput, UpdateILOInput } from "../schemas/ilo";
import { commitOutcomeWrite, prepareOutcomeWrite } from "./manage-outcome-writes";

function failure(error: string): ServiceResult<never> {
  return { success: false, error };
}

async function requireCoordinator(): Promise<ServiceResult<never> | null> {
  const session = await resolveAuthSession();
  if (!session || session.activeRole !== ROLES.GEN_ED_COORDINATOR) {
    return failure("You do not have permission to modify this outcome.");
  }
  return null;
}

export type InstitutionalOutcomeItem = {
  id: string;
  code: string;
  description: string;
  order: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  _count: { cilo_institutional_outcome_mappings: number };
};

export async function listInstitutionalOutcomes(): Promise<
  ServiceResult<{ ilos: InstitutionalOutcomeItem[] }>
> {
  const session = await resolveAuthSession();
  if (!session || session.activeRole !== ROLES.GEN_ED_COORDINATOR) {
    return failure("You do not have permission to view Institutional Outcomes.");
  }

  const raw = await prisma.institutionalOutcome.findMany({
    include: { _count: { select: { cilo_mappings: true } } },
    orderBy: [{ order: "asc" }, { code: "asc" }],
  });

  const ilos: InstitutionalOutcomeItem[] = raw.map((row) => ({
    id: row.id,
    code: row.code,
    description: row.description,
    order: row.order,
    is_active: row.is_active,
    created_at: row.created_at,
    updated_at: row.updated_at,
    _count: {
      cilo_institutional_outcome_mappings: row._count.cilo_mappings,
    },
  }));

  return { success: true, data: { ilos } };
}

async function writeGenEdOutcome(
  input: Parameters<typeof prepareOutcomeWrite>[0]
): Promise<ServiceResult<{ id?: string }>> {
  const guard = await requireCoordinator();
  if (guard) return guard;
  const review = await prepareOutcomeWrite(input);
  if (!review.success) return review;
  return commitOutcomeWrite(review.data, true);
}

export async function createILO(input: CreateILOInput): Promise<ServiceResult<{ id: string }>> {
  const result = await writeGenEdOutcome({ kind: "ILO", action: "create", ...input });
  if (!result.success) return result;
  if (!result.data.id) return failure("Institutional Outcome was not created.");
  return { success: true, data: { id: result.data.id } };
}

export async function updateILO(input: UpdateILOInput): Promise<ServiceResult<{ id: string }>> {
  const existing = await prisma.institutionalOutcome.findUnique({
    where: { id: input.id },
    select: { id: true },
  });
  if (!existing) return failure("Institutional Outcome not found.");
  const result = await writeGenEdOutcome({ kind: "ILO", action: "update", ...input });
  if (!result.success) return result;
  if (!result.data.id) return failure("Institutional Outcome was not updated.");
  return { success: true, data: { id: result.data.id } };
}

async function transitionArchiveState(
  id: string,
  action: "archive" | "restore"
): Promise<ServiceResult> {
  const existing = await prisma.institutionalOutcome.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) return failure("Institutional Outcome not found.");
  const result = await writeGenEdOutcome({ kind: "ILO", action, id });
  if (!result.success) return result;
  return { success: true, data: undefined };
}

export async function archiveILO(id: string): Promise<ServiceResult> {
  return transitionArchiveState(id, "archive");
}

export async function restoreILO(id: string): Promise<ServiceResult> {
  return transitionArchiveState(id, "restore");
}

export async function reorderILOs(orderedIds: string[]): Promise<ServiceResult> {
  const result = await writeGenEdOutcome({ kind: "ILO", action: "reorder", orderedIds });
  if (!result.success) return result;
  return { success: true, data: undefined };
}
