import { resolveProgramHeadContext } from "@/features/auth/services/resolve-program-head-context";
import { prisma } from "@/lib/db/prisma";
import type { ServiceResult } from "@/lib/utils/service-result";
import { goDetailsSchema } from "../schemas/go";
import type { GOImportRequest } from "../schemas/go-import";
import type { GOImportPreview, GOImportPreviewRow, GOImportSummary } from "../types/go-import";
export function normalizeGOCode(value: string): string {
  return value.normalize("NFKC").trim().replace(/\s+/gu, " ").toUpperCase();
}

function normalizeText(value: string): string {
  return value.normalize("NFKC").trim().replace(/\s+/gu, " ");
}

function summarize(rows: GOImportPreviewRow[]): GOImportSummary {
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

export async function previewGOImport(
  request: GOImportRequest
): Promise<ServiceResult<GOImportPreview>> {
  const context = await resolveProgramHeadContext(request.programId);
  if (!context.success) return context;
  const programId = context.data.selectedProgram.id;
  const program = await prisma.program.findUnique({
    where: { id: programId },
    select: { id: true, is_active: true },
  });
  if (!program?.is_active) return { success: false, error: "Active Academic Program is required." };

  const existing = await prisma.gO.findMany({
    where: { program_id: programId },
    select: { code: true, is_active: true },
  });
  const existingByCode = new Map(
    existing.map((go) => [normalizeGOCode(go.code), go.is_active] as const)
  );
  const counts = new Map<string, number>();
  const parsedRows = request.rows.map((row) => {
    const parsed = goDetailsSchema.safeParse({
      code: normalizeText(row.input.go_code),
      description: normalizeText(row.input.description),
    });
    const goCode = normalizeGOCode(row.input.go_code);
    if (goCode) counts.set(goCode, (counts.get(goCode) ?? 0) + 1);
    return { row, parsed, goCode };
  });

  const rows: GOImportPreviewRow[] = parsedRows.map(({ row, parsed, goCode }) => {
    const description = normalizeText(row.input.description);
    if (!parsed.success) {
      return {
        sourceIndex: row.sourceIndex,
        input: row.input,
        goCode,
        description,
        status: "INVALID",
        error: parsed.error.issues[0]?.message ?? "Enter valid Graduate Outcome details.",
      };
    }
    if ((counts.get(parsed.data.code) ?? 0) > 1) {
      return {
        sourceIndex: row.sourceIndex,
        input: row.input,
        goCode: parsed.data.code,
        description: parsed.data.description,
        status: "DUPLICATE_IN_FILE",
        error: `GO code "${parsed.data.code}" appears more than once in this file. Keep one row.`,
      };
    }
    if (existingByCode.has(parsed.data.code)) {
      const archived = existingByCode.get(parsed.data.code) === false;
      return {
        sourceIndex: row.sourceIndex,
        input: row.input,
        goCode: parsed.data.code,
        description: parsed.data.description,
        status: archived ? "DUPLICATE_EXISTING_ARCHIVED" : "DUPLICATE_EXISTING_ACTIVE",
        error: archived
          ? `GO code "${parsed.data.code}" already belongs to an archived Graduate Outcome. It will not be restored.`
          : `GO code "${parsed.data.code}" already exists in this Program. It will not be changed.`,
      };
    }
    return {
      sourceIndex: row.sourceIndex,
      input: row.input,
      goCode: parsed.data.code,
      description: parsed.data.description,
      status: "READY",
      error: null,
    };
  });

  return { success: true, data: { rows, summary: summarize(rows) } };
}
