import { Prisma } from "@prisma/client";

import {
  revalidateProgramHeadAssignment,
  resolveProgramHeadContext,
} from "@/features/auth/services/resolve-program-head-context";
import { prisma } from "@/lib/db/prisma";
import type { ServiceResult } from "@/lib/utils/service-result";
import type { POImportRequest } from "../schemas/po-import";
import type {
  POImportOutcome,
  POImportResult,
  POImportResultRow,
  POImportRowStatus,
} from "../types/po-import";
import { normalizePOCode, previewPOImport } from "./preview-po-import";

function duplicateOutcome(isActive: boolean): POImportOutcome {
  return isActive ? "DUPLICATE_EXISTING_ACTIVE" : "DUPLICATE_EXISTING_ARCHIVED";
}

export async function confirmPOImport(
  request: POImportRequest
): Promise<ServiceResult<POImportResult>> {
  const context = await resolveProgramHeadContext(request.programId);
  if (!context.success) return context;
  const preview = await previewPOImport(request);
  if (!preview.success) return preview;
  const programId = context.data.selectedProgram.id;

  const runImport = (): Promise<ServiceResult<POImportResult>> =>
    prisma.$transaction(
      async (tx) => {
        const assignment = await revalidateProgramHeadAssignment(tx, {
          userId: context.data.userId,
          programId,
        });
        if (!assignment) {
          return {
            success: false,
            error: "You do not have permission to import Program Outcomes for this Program.",
          };
        }
        const program = await tx.program.findUnique({
          where: { id: programId },
          select: { is_active: true },
        });
        if (!program?.is_active) {
          return { success: false, error: "Active Academic Program is required." };
        }
        const current = await tx.pO.findMany({
          where: { program_id: programId },
          select: { code: true, order: true, is_active: true },
          orderBy: { order: "asc" },
        });
        const currentByCode = new Map(
          current.map((po) => [normalizePOCode(po.code), po.is_active] as const)
        );
        const startOrder = current.reduce((maximum, po) => Math.max(maximum, po.order), -1) + 1;
        const readyRows = preview.data.rows.filter(
          (row) => row.status === "READY" && !currentByCode.has(row.poCode)
        );
        if (readyRows.length > 0) {
          await tx.pO.createMany({
            data: readyRows.map((row, index) => ({
              code: row.poCode,
              description: row.description,
              classification: row.classification!,
              order: startOrder + index,
              program_id: programId,
            })),
          });
        }

        const rows: POImportResultRow[] = preview.data.rows.map((row) => {
          if (row.status !== "READY") return { ...row, outcome: row.status };
          const currentActive = currentByCode.get(row.poCode);
          if (currentActive !== undefined) {
            const outcome = duplicateOutcome(currentActive);
            const status = outcome as POImportRowStatus;
            return {
              ...row,
              status,
              outcome,
              error:
                outcome === "DUPLICATE_EXISTING_ARCHIVED"
                  ? `PO code "${row.poCode}" already belongs to an archived Program Outcome. It was not restored.`
                  : `PO code "${row.poCode}" already exists in this Program. It was not changed.`,
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
        error: "The PO catalog changed during import. Check the file again.",
      };
    }
    return {
      success: false,
      error: "Program Outcomes could not be imported. No POs were created. Try again.",
    };
  }
}
