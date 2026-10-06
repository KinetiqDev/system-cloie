import { resolveProgramHeadContext } from "@/features/auth/services/resolve-program-head-context";
import { prisma } from "@/lib/db/prisma";
import type { ServiceResult } from "@/lib/utils/service-result";
import { poDetailsSchema } from "../schemas/po";
import type { POImportRequest } from "../schemas/po-import";
import type { POImportPreview, POImportPreviewRow, POImportSummary } from "../types/po-import";
export function normalizePOCode(value: string): string {
  return value.normalize("NFKC").trim().replace(/\s+/gu, " ").toUpperCase();
}

function normalizeText(value: string): string {
  return value.normalize("NFKC").trim().replace(/\s+/gu, " ");
}

function summarize(rows: POImportPreviewRow[]): POImportSummary {
  const ready = rows.filter((row) => row.status === "READY").length;
  const existing = rows.filter((row) => row.status.startsWith("DUPLICATE_EXISTING")).length;
  return {
    total: rows.length,
    ready,
    attention: rows.length - ready,
    existing,
    created: 0,
    notCreated: 0,
  };
}

export async function previewPOImport(
  request: POImportRequest
): Promise<ServiceResult<POImportPreview>> {
  const context = await resolveProgramHeadContext(request.programId);
  if (!context.success) return context;
  const programId = context.data.selectedProgram.id;
  const program = await prisma.program.findUnique({
    where: { id: programId },
    select: { id: true, is_active: true },
  });
  if (!program?.is_active) return { success: false, error: "Active Academic Program is required." };

  const existing = await prisma.pO.findMany({
    where: { program_id: programId },
    select: { code: true, is_active: true },
  });
  const existingByCode = new Map(
    existing.map((po) => [normalizePOCode(po.code), po.is_active] as const)
  );
  const counts = new Map<string, number>();
  const parsedRows = request.rows.map((row) => {
    const parsed = poDetailsSchema.safeParse({
      code: normalizeText(row.input.po_code),
      description: normalizeText(row.input.description),
    });
    const poCode = normalizePOCode(row.input.po_code);
    if (poCode) counts.set(poCode, (counts.get(poCode) ?? 0) + 1);
    return { row, parsed, poCode };
  });

  const rows: POImportPreviewRow[] = parsedRows.map(({ row, parsed, poCode }) => {
    const description = normalizeText(row.input.description);
    if (!parsed.success) {
      return {
        sourceIndex: row.sourceIndex,
        input: row.input,
        poCode,
        description,
        status: "INVALID",
        error: parsed.error.issues[0]?.message ?? "Enter valid Program Outcome details.",
      };
    }
    if ((counts.get(parsed.data.code) ?? 0) > 1) {
      return {
        sourceIndex: row.sourceIndex,
        input: row.input,
        poCode: parsed.data.code,
        description: parsed.data.description,
        status: "DUPLICATE_IN_FILE",
        error: `PO code "${parsed.data.code}" appears more than once in this file. Keep one row.`,
      };
    }
    if (existingByCode.has(parsed.data.code)) {
      const archived = existingByCode.get(parsed.data.code) === false;
      return {
        sourceIndex: row.sourceIndex,
        input: row.input,
        poCode: parsed.data.code,
        description: parsed.data.description,
        status: archived ? "DUPLICATE_EXISTING_ARCHIVED" : "DUPLICATE_EXISTING_ACTIVE",
        error: archived
          ? `PO code "${parsed.data.code}" already belongs to an archived Program Outcome. It will not be restored.`
          : `PO code "${parsed.data.code}" already exists in this Program. It will not be changed.`,
      };
    }
    return {
      sourceIndex: row.sourceIndex,
      input: row.input,
      poCode: parsed.data.code,
      description: parsed.data.description,
      status: "READY",
      error: null,
    };
  });

  return { success: true, data: { rows, summary: summarize(rows) } };
}
