import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { resolveProgramHeadContext } from "@/features/auth/services/resolve-program-head-context";
import { getProgramHeadOutcomes } from "@/features/analytics/services/get-program-head-analytics";
import type { AnalyticsFilterState } from "@/features/analytics/services/program-head-analytics-state";
import { ROLES } from "@/lib/constants/roles";
import { REPORT_EXPORT_LABELS, type ReportEvidence, type ReportExportKind } from "../types";
import { buildCourseWorkbook } from "./build-course-workbook";
import { buildPoWorkbook } from "./build-po-workbook";
import { buildRawQuantitativeCsv } from "./build-raw-csv";
import { readProgramHeadReportEvidence, type ReportExportFilters } from "./report-evidence";
import {
  buildReportExportFilename,
  recordReportExport,
  reportExportContentType,
  type ReportExportRequest,
} from "./report-export-state";

// ---------------------------------------------------------------------------
// Program Head report export
//
// Authorization, evidence read, file build, and audit all happen on the server
// for one request. A download is refused unless the actor is a Program Head
// authorized for the selected Program, and it fails closed when its audit record
// cannot be written. Nothing about the generated file is ever logged: only the
// export kind, scope, and aggregate counts are.
// ---------------------------------------------------------------------------

export type ReportExportEmptyReason =
  | "no-course-assignments"
  | "no-course-submissions"
  | "no-course-evidence"
  | "no-outcome-evidence"
  | "no-rating-items";

export type ReportExportResult =
  | {
      ok: true;
      filename: string;
      contentType: string;
      bytes: Buffer;
      submittedResponseCount: number;
      ratingItemCount: number;
    }
  | { ok: false; status: 400 | 403 | 404; error: string; reason?: ReportExportEmptyReason };

/** Analytics filters for one export scope. */
function analyticsFilters(filters: ReportExportFilters): AnalyticsFilterState {
  const state: AnalyticsFilterState = { tab: "outcomes" };
  if (filters.schoolYearId) state.schoolYearId = filters.schoolYearId;
  if (filters.semester) state.semester = filters.semester;
  if (filters.termInstanceId) state.termInstanceId = filters.termInstanceId;
  return state;
}

function countSubmittedResponses(evidence: ReportEvidence): number {
  const ids = new Set<string>();
  for (const group of [...evidence.courseGroups, ...evidence.centralGroups]) {
    for (const response of group.responses) ids.add(response.responseId);
  }
  return ids.size;
}

function countRatingItems(evidence: ReportEvidence): number {
  return [...evidence.courseGroups, ...evidence.centralGroups].reduce(
    (total, group) =>
      total + group.responses.reduce((sum, response) => sum + response.answers.length, 0),
    0
  );
}

function slugPeriod(evidence: ReportEvidence): string {
  return evidence.period.label.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function courseExportEmptyReason(evidence: ReportEvidence): ReportExportEmptyReason | null {
  if (evidence.courseGroups.length === 0) return "no-course-assignments";
  if (countRatingItems(evidence) === 0) return "no-course-submissions";
  return null;
}

/**
 * Build one authorized Program Head export. Returns a typed refusal rather than
 * throwing for authorization, empty-scope, and audit failures.
 */
export async function buildProgramHeadReportExport(
  programId: string,
  request: ReportExportRequest
): Promise<ReportExportResult> {
  const session = await resolveAuthSession();
  if (!session) {
    return { ok: false, status: 403, error: "Sign in to export Program Head reports." };
  }
  if (session.activeRole !== ROLES.PROGRAM_HEAD) {
    return { ok: false, status: 403, error: "Program Head access required." };
  }
  const contextResult = await resolveProgramHeadContext(programId);
  if (!contextResult.success) {
    return { ok: false, status: 403, error: "This Program is not assigned to you." };
  }

  const evidence = await readProgramHeadReportEvidence(programId, request.filters);
  if (!evidence) {
    return { ok: false, status: 403, error: "This Program is not assigned to you." };
  }

  const built = await buildExportBytes(programId, request.kind, request.filters, evidence);
  if (!built.ok) return built;

  const submittedResponseCount = countSubmittedResponses(evidence);
  const ratingItemCount = countRatingItems(evidence);
  try {
    await recordReportExport({
      actorId: contextResult.data.userId,
      programId: evidence.programId,
      kind: request.kind,
      identified: true,
      filters: request.filters,
      submittedResponseCount,
      ratingItemCount,
    });
  } catch {
    // Fail closed: an unaudited release of identified responses must not happen.
    return { ok: false, status: 400, error: "The export could not be recorded. Try again." };
  }

  return {
    ok: true,
    filename: buildReportExportFilename(request.kind, {
      programCode: evidence.programCode,
      periodSlug: slugPeriod(evidence),
    }),
    contentType: reportExportContentType(request.kind),
    bytes: built.bytes,
    submittedResponseCount,
    ratingItemCount,
  };
}

async function buildExportBytes(
  programId: string,
  kind: ReportExportKind,
  filters: ReportExportFilters,
  evidence: ReportEvidence
): Promise<
  | { ok: true; bytes: Buffer }
  | { ok: false; status: 400 | 403 | 404; error: string; reason?: ReportExportEmptyReason }
> {
  const generatedAt = new Date();

  if (kind === "COURSE_WORKBOOK") {
    const emptyReason = courseExportEmptyReason(evidence);
    if (emptyReason) {
      return {
        ok: false,
        status: 404,
        error: `No course evaluation evidence in this scope (${REPORT_EXPORT_LABELS[kind]}).`,
        reason: emptyReason,
      };
    }
    return {
      ok: true,
      bytes: await buildCourseWorkbook({
        evidence,
        generatedAt,
        exportedBy: "Authorized Program Head",
      }),
    };
  }

  if (kind === "PROGRAM_OUTCOME_WORKBOOK") {
    const outcomes = await getProgramHeadOutcomes(programId, analyticsFilters(filters));
    if (!outcomes) {
      return { ok: false, status: 403, error: "This Program is not assigned to you." };
    }
    if (outcomes.outcomes.length === 0 && outcomes.programWideOutcomes.length === 0) {
      return {
        ok: false,
        status: 404,
        error: "No Program Outcome evidence in this scope.",
        reason: "no-outcome-evidence",
      };
    }
    return {
      ok: true,
      bytes: await buildPoWorkbook({
        evidence,
        outcomes,
        generatedAt,
        exportedBy: "Authorized Program Head",
      }),
    };
  }

  const { csv } = await buildRawQuantitativeCsv(evidence);
  const rowCount = csv.split("\r\n").length - 2;
  if (rowCount <= 0) {
    return {
      ok: false,
      status: 404,
      error: "No quantitative answers in this scope.",
      reason: "no-rating-items",
    };
  }
  return { ok: true, bytes: Buffer.from(csv, "utf8") };
}
