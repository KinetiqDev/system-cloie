import { z } from "zod";

export const COURSE_ROSTER_MAX_ROWS = 500;
export const COURSE_ROSTER_TEMPLATE = "email\nstudent@example.com\n";

export type CourseRosterCsvRow = {
  sourceIndex: number;
  submittedEmail: string;
  normalizedEmail: string;
};

export type CourseRosterCsvParseResult =
  | { success: true; rows: CourseRosterCsvRow[] }
  | { success: false; error: string };

const emailSchema = z.email();
const INVALID_STRUCTURE = "CSV must contain one email column and 1 to 500 data rows.";

function decodeCsv(input: string | Uint8Array) {
  if (typeof input === "string") return input;
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(input);
  } catch {
    return null;
  }
}

export function normalizeRosterEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isRosterEmail(email: string) {
  return email.length <= 254 && emailSchema.safeParse(email).success;
}

export function parseCourseRosterCsv(input: string | Uint8Array): CourseRosterCsvParseResult {
  const decoded = decodeCsv(input);
  if (decoded === null) return { success: false, error: INVALID_STRUCTURE };

  const withoutBom = decoded.startsWith("\uFEFF") ? decoded.slice(1) : decoded;
  if (withoutBom.includes("\r") && !withoutBom.includes("\r\n")) {
    return { success: false, error: INVALID_STRUCTURE };
  }

  const normalized = withoutBom.replaceAll("\r\n", "\n");
  if (normalized.includes("\r")) return { success: false, error: INVALID_STRUCTURE };
  const lines = normalized.split("\n");
  if (lines.at(-1) === "") lines.pop();
  if (lines.length < 2 || lines[0] !== "email") {
    return { success: false, error: INVALID_STRUCTURE };
  }

  const dataLines = lines.slice(1);
  if (
    dataLines.length === 0 ||
    dataLines.length > COURSE_ROSTER_MAX_ROWS ||
    dataLines.some((line) => line.trim() === "")
  ) {
    return { success: false, error: INVALID_STRUCTURE };
  }

  const rows: CourseRosterCsvRow[] = [];
  for (const [index, line] of dataLines.entries()) {
    if (line.includes(",") || line.includes('"')) {
      return { success: false, error: INVALID_STRUCTURE };
    }
    const normalizedEmail = normalizeRosterEmail(line);
    rows.push({ sourceIndex: index + 2, submittedEmail: line, normalizedEmail });
  }

  return { success: true, rows };
}

function csvCell(value: string) {
  return /[",\n\r]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

export function exportFailedCourseRosterRows(
  rows: Array<{ email: string; error: string; status: string }>
) {
  const failedRows = rows.filter((row) => row.status !== "CREATED" && row.status !== "RESTORED");
  const exportError = (row: (typeof failedRows)[number]) => {
    if (row.status === "UNEXPECTED_FAILURE") return "The roster request could not be completed.";
    if (row.status === "UNPROCESSED") return "This row was not processed because import stopped unexpectedly.";
    return row.error;
  };
  return [
    "email,error",
    ...failedRows.map((row) => `${csvCell(row.email)},${csvCell(exportError(row))}`),
    "",
  ].join("\n");
}
