import { Prisma } from "@prisma/client";

import {
  revalidateProgramHeadAssignment,
  resolveProgramHeadContext,
} from "@/features/auth/services/resolve-program-head-context";
import { prisma } from "@/lib/db/prisma";
import type { ServiceResult } from "@/lib/utils/service-result";
import type { GOImportRequest } from "../schemas/go-import";
import type {
  GOImportOutcome,
  GOImportResult,
  GOImportResultRow,
  GOImportRowStatus,
} from "../types/go-import";
import { normalizeGOCode, previewGOImport } from "./preview-go-import";

function duplicateOutcome(isActive: boolean): GOImportOutcome {
  return isActive ? "DUPLICATE_EXISTING_ACTIVE" : "DUPLICATE_EXISTING_ARCHIVED";
}

export async function confirmGOImport(
  request: GOImportRequest
): Promise<ServiceResult<GOImportResult>> {
  const context = await resolveProgramHeadContext(request.programId);
  if (!context.success) return context;
  const preview = await previewGOImport(request);
  if (!preview.success) return preview;
  const programId = context.data.selectedProgram.id;

  const runImport = (): Promise<ServiceResult<GOImportResult>> =>
    prisma.$transaction(
      async (tx) => {
        const assignment = await revalidateProgramHeadAssignment(tx, {
          userId: context.data.userId,
          programId,
        });
        if (!assignment) {
          return {
            success: false,
            error: "You do not have permission to import Graduate Outcomes for this Program.",
          };
        }
        const program = await tx.program.findUnique({
          where: { id: programId },
          select: { is_active: true },
        });
        if (!program?.is_active) {
          return { success: false, error: "Active Academic Program is required." };
        }
        const current = await tx.gO.findMany({
          where: { program_id: programId },
          select: { code: true, order: true, is_active: true },
          orderBy: { order: "asc" },
        });
        const currentByCode = new Map(
          current.map((go) => [normalizeGOCode(go.code), go.is_active] as const)
        );
        const startOrder = current.reduce((maximum, go) => Math.max(maximum, go.order), -1) + 1;
        const readyRows = preview.data.rows.filter(
          (row) => row.status === "READY" && !currentByCode.has(row.goCode)
        );
        if (readyRows.length > 0) {
          await tx.gO.createMany({
            data: readyRows.map((row, index) => ({
              code: row.goCode,
              description: row.description,
              order: startOrder + index,
              program_id: programId,
            })),
          });
        }

        const rows: GOImportResultRow[] = preview.data.rows.map((row) => {
          if (row.status !== "READY") return { ...row, outcome: row.status };
          const currentActive = currentByCode.get(row.goCode);
          if (currentActive !== undefined) {
            const outcome = duplicateOutcome(currentActive);
            const status = outcome as GOImportRowStatus;
            return {
              ...row,
              status,
              outcome,
              error:
                outcome === "DUPLICATE_EXISTING_ARCHIVED"
                  ? `GO code "${row.goCode}" already belongs to an archived Graduate Outcome. It was not restored.`
                  : `GO code "${row.goCode}" already exists in this Program. It was not changed.`,
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
        error: "The GO catalog changed during import. Check the file again.",
      };
    }
    return {
      success: false,
      error: "Graduate Outcomes could not be imported. No GOs were created. Try again.",
    };
  }
}
