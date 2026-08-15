import { parseCourseRosterCsv } from "./course-roster-csv";
import type {
  CourseRosterImportRow,
  CourseRosterImportSummary,
  RosterServiceResult,
} from "../types";

function summarize(rows: CourseRosterImportRow[]): CourseRosterImportSummary {
  return {
    total: rows.length,
    parsed: rows.filter((row) => row.status === "PARSED").length,
    invalid: rows.filter((row) => row.status === "INVALID_NAME").length,
    rows,
  };
}

export async function importCourseRoster(
  _assignmentId: string,
  input: string | Uint8Array
): Promise<RosterServiceResult<CourseRosterImportSummary>> {
  const parsed = parseCourseRosterCsv(input);
  if (!parsed.success) return { success: false, error: parsed.error };
  return {
    success: true,
    data: summarize(
      parsed.rows.map((row) => ({
        sourceIndex: row.sourceIndex,
        name: row.submittedName,
        status: row.status === "INVALID_NAME" ? "INVALID_NAME" : "PARSED",
        error: row.error,
      }))
    ),
  };
}
