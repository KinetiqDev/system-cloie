import { parseCsvRecords } from "@/lib/csv/parse-csv-records";
import type {
  CourseImportMode,
  CourseImportParseResult,
  ParsedCourseImportRow,
} from "../types/course-import";
import { COURSE_IMPORT_MAX_ROWS } from "../types/course-import";

export { COURSE_IMPORT_MAX_ROWS } from "../types/course-import";

const SECRETARY_HEADERS = [
  "course_code",
  "course_title",
  "course_scope",
  "program_code",
  "major_name",
  "year_level",
  "semester",
  "term",
] as const;

const PROGRAM_HEAD_HEADERS = [
  "course_code",
  "course_title",
  "course_type",
  "major_name",
  "year_level",
  "semester",
  "term",
] as const;

const GENERAL_EDUCATION_HEADERS = [
  "course_code",
  "course_title",
  "year_level",
  "semester",
  "term",
] as const;

/** User-facing mode names for import error messages. */
const MODE_NAMES: Record<CourseImportMode, string> = {
  secretary: "Secretary",
  "program-head": "Program Head",
  "general-education": "General Education",
};

/** Humanized column labels per mode for import error messages. */
const HEADER_LABELS: Record<CourseImportMode, readonly string[]> = {
  secretary: [
    "Course code",
    "Course title",
    "Course scope",
    "Program code",
    "Major name",
    "Year level",
    "Semester",
    "Term",
  ],
  "program-head": [
    "Course code",
    "Course title",
    "Course type",
    "Major name",
    "Year level",
    "Semester",
    "Term",
  ],
  "general-education": ["Course code", "Course title", "Year level", "Semester", "Term"],
};

export const COURSE_IMPORT_TEMPLATES: Record<CourseImportMode, string> = {
  secretary: `${SECRETARY_HEADERS.join(",")}\n`,
  "program-head": `${PROGRAM_HEAD_HEADERS.join(",")}\n`,
  "general-education": `${GENERAL_EDUCATION_HEADERS.join(",")}\n`,
};

const INVALID_STRUCTURE =
  "The CSV must use the downloaded template and contain 1 to 100 Course rows.";
const INVALID_ENCODING = "The CSV could not be read. Save it as a UTF-8 CSV file and try again.";

function normalize(value: string): string {
  return value.normalize("NFKC").trim().replace(/\s+/gu, " ");
}

function isBlankRecord(cells: string[]): boolean {
  return cells.every((cell) => cell.trim() === "");
}

function headersForMode(mode: CourseImportMode): readonly string[] {
  switch (mode) {
    case "secretary":
      return SECRETARY_HEADERS;
    case "program-head":
      return PROGRAM_HEAD_HEADERS;
    case "general-education":
      return GENERAL_EDUCATION_HEADERS;
  }
}

function invalidStructure(error = INVALID_STRUCTURE): CourseImportParseResult {
  return { success: false, error };
}

export function parseCourseImportCsv(
  input: string | Uint8Array,
  mode: CourseImportMode
): CourseImportParseResult {
  const parsed = parseCsvRecords(input);
  if (!parsed.success) {
    return invalidStructure(parsed.reason === "encoding" ? INVALID_ENCODING : INVALID_STRUCTURE);
  }
  const records = parsed.records;
  if (records.length === 0) return invalidStructure();

  const expectedHeaders = headersForMode(mode);
  const [header, ...sourceRecords] = records;
  const actualHeaders = header?.cells.map((cell) => normalize(cell).toLowerCase()) ?? [];

  if (
    actualHeaders.length !== expectedHeaders.length ||
    actualHeaders.some((value, index) => value !== expectedHeaders[index])
  ) {
    return invalidStructure(
      `Use the ${MODE_NAMES[mode]} import template. Expected columns: ${HEADER_LABELS[mode].join(", ")}.`
    );
  }

  const dataRecords = sourceRecords.filter((record) => !isBlankRecord(record.cells));
  if (dataRecords.length === 0 || dataRecords.length > COURSE_IMPORT_MAX_ROWS) {
    return invalidStructure();
  }

  if (dataRecords.some((record) => record.cells.length !== expectedHeaders.length)) {
    return invalidStructure();
  }

  const rows = dataRecords.map((record) => {
    const row = Object.fromEntries(
      expectedHeaders.map((headerName, index) => [headerName, record.cells[index] ?? ""])
    ) as Omit<ParsedCourseImportRow, "sourceIndex">;

    return {
      sourceIndex: record.sourceIndex,
      ...row,
    } as ParsedCourseImportRow;
  });

  return { success: true, rows };
}

function csvCell(value: string): string {
  return /[",\n\r]/u.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

export function exportFailedCourseImportRows(
  rows: Array<{
    sourceIndex: number;
    input: Record<string, string | number | undefined>;
    status: string;
    error: string | null;
  }>
): string {
  if (rows.length === 0) return "";

  const headers = Object.keys(rows[0]?.input ?? {}).filter((header) => header !== "sourceIndex");
  return [
    ["row", ...headers, "status", "error"].join(","),
    ...rows.map((row) =>
      [
        row.sourceIndex,
        ...headers.map((header) => row.input[header] ?? ""),
        row.status,
        row.error ?? "",
      ]
        .map((value) => csvCell(String(value)))
        .join(",")
    ),
    "",
  ].join("\n");
}
