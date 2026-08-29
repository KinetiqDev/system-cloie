import { Prisma } from "@prisma/client";

import {
  revalidateProgramHeadAssignment,
  resolveProgramHeadContext,
} from "@/features/auth/services/resolve-program-head-context";
import { prisma } from "@/lib/db/prisma";
import type { ServiceResult } from "@/lib/utils/service-result";
import type { PLOImportRequest } from "../schemas/plo-import";
import type {
  PLOImportOutcome,
  PLOImportResult,
  PLOImportResultRow,
  PLOImportRowStatus,
} from "../types/plo-import";
import { normalizePLOCode, previewPLOImport } from "./preview-plo-import";

function duplicateOutcome(isActive: boolean): PLOImportOutcome {
  return isActive ? "DUPLICATE_EXISTING_ACTIVE" : "DUPLICATE_EXISTING_ARCHIVED";
}

export async function confirmPLOImport(
  request: PLOImportRequest
): Promise<ServiceResult<PLOImportResult>> {
  const context = await resolveProgramHeadContext(request.programId);
  if (!context.success) return context;
  const preview = await previewPLOImport(request);
  if (!preview.success) return preview;
  const programId = context.data.selectedProgram.id;

  const runImport = (): Promise<ServiceResult<PLOImportResult>> =>
    prisma.$transaction(
      async (tx) => {
        const assignment = await revalidateProgramHeadAssignment(tx, {
          userId: context.data.userId,
          programId,
        });
        if (!assignment) {
          return {
            success: false,
            error:
              "You do not have permission to import Program Learning Outcomes for this Program.",
          };
        }
        const program = await tx.program.findUnique({
          where: { id: programId },
          select: { is_active: true },
        });
        if (!program?.is_active) {
          return { success: false, error: "Active Academic Program is required." };
        }
        const current = await tx.pLO.findMany({
          where: { program_id: programId },
          select: { code: true, order: true, is_active: true },
          orderBy: { order: "asc" },
        });
        const currentByCode = new Map(
          current.map((plo) => [normalizePLOCode(plo.code), plo.is_active] as const)
        );
        const startOrder = current.reduce((maximum, plo) => Math.max(maximum, plo.order), -1) + 1;
        const readyRows = preview.data.rows.filter(
          (row) => row.status === "READY" && !currentByCode.has(row.ploCode)
        );
        if (readyRows.length > 0) {
          await tx.pLO.createMany({
            data: readyRows.map((row, index) => ({
              code: row.ploCode,
              description: row.description,
              order: startOrder + index,
              program_id: programId,
            })),
          });
        }

        const rows: PLOImportResultRow[] = preview.data.rows.map((row) => {
          if (row.status !== "READY") return { ...row, outcome: row.status };
          const currentActive = currentByCode.get(row.ploCode);
          if (currentActive !== undefined) {
            const outcome = duplicateOutcome(currentActive);
            const status = outcome as PLOImportRowStatus;
            return {
              ...row,
              status,
              outcome,
              error:
                outcome === "DUPLICATE_EXISTING_ARCHIVED"
                  ? `PLO code "${row.ploCode}" already belongs to an archived Program Learning Outcome. It was not restored.`
                  : `PLO code "${row.ploCode}" already exists in this Program. It was not changed.`,
            };
          }
          return { ...row, outcome: "CREATED" };
        });
        const created = rows.filter((row) => row.outcome === "CREATED").length;
        const notCreated = rows.length - created;
        return {
          success: true,
          data: {
            rows,
            summary: {
              total: rows.length,
              ready: 0,
              attention: notCreated,
              existing: rows.filter((row) => row.outcome.startsWith("DUPLICATE_EXISTING")).length,
              created,
              notCreated,
            },
          },
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );

  try {
    try {
      return await runImport();
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return await runImport();
      }
      throw error;
    }
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      return {
        success: false,
        error: "The PLO catalog changed during import. Check the file again.",
      };
    }
    return {
      success: false,
      error: "Program Learning Outcomes could not be imported. No PLOs were created. Try again.",
    };
  }
}
