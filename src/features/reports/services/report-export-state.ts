import { z } from "zod";
import { AcademicSemester, YearLevel } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import type { ReportExportKind } from "../types";

// ---------------------------------------------------------------------------
// Report export request grammar and transport metadata
//
// Frontend controls are validated here, but they are never authorization: every
// download re-authorizes the Program Head and the selected Program server-side.
// ---------------------------------------------------------------------------

const yearLevelSchema = z.nativeEnum(YearLevel);
const semesterSchema = z.nativeEnum(AcademicSemester);
const exportKindSchema = z.enum(["course-workbook", "po-report", "raw-csv"]);

export const REPORT_EXPORT_KINDS = exportKindSchema.options;

/** Validated export request: the export shape plus the applied filters. */
export type ReportExportRequest = {
  kind: ReportExportKind;
  filters: {
    schoolYearId?: string;
    semester?: AcademicSemester;
    termInstanceId?: string;
    yearLevel?: YearLevel;
  };
};

const rawSchema = z.object({
  kind: exportKindSchema,
  schoolYearId: z.string().uuid().optional(),
  semester: semesterSchema.optional(),
  termInstanceId: z.string().uuid().optional(),
  yearLevel: yearLevelSchema.optional(),
});

/** Parse one export request; null when the query is not a valid export request. */
export function parseReportExportRequest(params: URLSearchParams): ReportExportRequest | null {
  const parsed = rawSchema.safeParse({
    kind: params.get("kind") ?? undefined,
    schoolYearId: params.get("schoolYearId") ?? undefined,
    semester: params.get("semester") ?? undefined,
    termInstanceId: params.get("termInstanceId") ?? undefined,
    yearLevel: params.get("yearLevel") ?? undefined,
  });
  if (!parsed.success) return null;

  return {
    kind: exportRequestKind(parsed.data.kind),
    filters: {
      schoolYearId: parsed.data.schoolYearId,
      semester: parsed.data.semester,
      termInstanceId: parsed.data.termInstanceId,
      yearLevel: parsed.data.yearLevel,
    },
  };
}

function exportRequestKind(kind: z.infer<typeof exportKindSchema>): ReportExportKind {
  if (kind === "course-workbook") return "COURSE_WORKBOOK";
  if (kind === "po-report") return "PROGRAM_OUTCOME_WORKBOOK";
  return "RAW_QUANTITATIVE_CSV";
}

/** Slugged filename for one export, scoped by program and period. */
export function buildReportExportFilename(
  kind: ReportExportKind,
  context: { programCode: string; periodSlug: string }
): string {
  const extension = kind === "RAW_QUANTITATIVE_CSV" ? "csv" : "xlsx";
  const report = {
    COURSE_WORKBOOK: "course-workbook",
    PROGRAM_OUTCOME_WORKBOOK: "program-outcome-report",
    RAW_QUANTITATIVE_CSV: "raw-quantitative-data",
  }[kind];
  return `${slug(context.programCode)}-${report}-${slug(context.periodSlug)}.${extension}`;
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/** Content type of one export. */
export function reportExportContentType(kind: ReportExportKind): string {
  return kind === "RAW_QUANTITATIVE_CSV" ? "text/csv; charset=utf-8" : REPORT_XLSX_CONTENT_TYPE;
}

export const REPORT_XLSX_CONTENT_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/**
 * Record one export download. Only the actor, Program, filters, and aggregate
 * counts are stored: no respondent identity and no rating value.
 */
export async function recordReportExport(input: {
  actorId: string;
  programId: string;
  kind: ReportExportKind;
  identified: boolean;
  filters: ReportExportRequest["filters"];
  submittedResponseCount: number;
  ratingItemCount: number;
}): Promise<void> {
  await prisma.reportExportAudit.create({
    data: {
      actor_id: input.actorId,
      program_id: input.programId,
      export_kind: input.kind,
      identified: input.identified,
      school_year_id: input.filters.schoolYearId ?? null,
      semester: input.filters.semester ?? null,
      term_instance_id: input.filters.termInstanceId ?? null,
      year_level: input.filters.yearLevel ?? null,
      submitted_response_count: input.submittedResponseCount,
      rating_item_count: input.ratingItemCount,
    },
    select: { id: true },
  });
}
