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

export const COURSE_IMPORT_TEMPLATES: Record<CourseImportMode, string> = {
  secretary: `${SECRETARY_HEADERS.join(",")}\n`,
  "program-head": `${PROGRAM_HEAD_HEADERS.join(",")}\n`,
  "general-education": `${GENERAL_EDUCATION_HEADERS.join(",")}\n`,
};

const INVALID_STRUCTURE =
  "The CSV must use the downloaded template and contain 1 to 100 Course rows.";
const INVALID_ENCODING = "The CSV could not be read. Save it as a UTF-8 CSV file and try again.";

type CsvCell = { value: string; nextIndex: number; lineBreaks: number };
type CsvRecord = { cells: string[]; sourceIndex: number };

function decodeCsv(input: string | Uint8Array): string | null {
  if (typeof input === "string") return input;

  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(input);
  } catch {
    return null;
  }
}

function parsePlainCsvCell(input: string, startIndex: number): CsvCell | null {
  const endIndex = input.slice(startIndex).search(/[\n,]/u);
  const nextIndex = endIndex === -1 ? input.length : startIndex + endIndex;
  const value = input.slice(startIndex, nextIndex);

  return value.includes('"') ? null : { value, nextIndex, lineBreaks: 0 };
}

function parseQuotedCsvCell(input: string, startIndex: number): CsvCell | null {
  let value = "";
  let lineBreaks = 0;

  for (let index = startIndex + 1; index < input.length; index += 1) {
    if (input[index] !== '"') {
      if (input[index] === "\n") lineBreaks += 1;
      value += input[index];
      continue;
    }

    if (input[index + 1] === '"') {
      value += '"';
      index += 1;
      continue;
    }

    const nextIndex = index + 1;
    if (nextIndex < input.length && ![",", "\n"].includes(input[nextIndex] ?? "")) {
      return null;
    }

    return { value, nextIndex, lineBreaks };
  }

  return null;
}

function parseCsvCell(input: string, startIndex: number): CsvCell | null {
  return input[startIndex] === '"'
    ? parseQuotedCsvCell(input, startIndex)
    : parsePlainCsvCell(input, startIndex);
}

function parseRecords(input: string): CsvRecord[] | null {
  const records: CsvRecord[] = [];
  let index = 0;
  let line = 1;

  while (index < input.length) {
    const sourceIndex = line;
    const cells: string[] = [];

    while (true) {
      const cell = parseCsvCell(input, index);
      if (!cell) return null;

      cells.push(cell.value);
      index = cell.nextIndex;
      line += cell.lineBreaks;

      if (input[index] !== ",") break;
      index += 1;
    }

    records.push({ cells, sourceIndex });

    if (index === input.length) break;
    if (input[index] !== "\n") return null;

    index += 1;
    line += 1;
  }

  return records;
}

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
  const decoded = decodeCsv(input);
  if (decoded === null) return invalidStructure(INVALID_ENCODING);

  const withoutBom = decoded.startsWith("\uFEFF") ? decoded.slice(1) : decoded;
  if (withoutBom.includes("\r") && !withoutBom.includes("\r\n")) {
    return invalidStructure();
  }

  const records = parseRecords(withoutBom.replaceAll("\r\n", "\n"));
  if (!records || records.length === 0) return invalidStructure();

  const expectedHeaders = headersForMode(mode);
  const [header, ...sourceRecords] = records;
  const actualHeaders = header?.cells.map((cell) => normalize(cell).toLowerCase()) ?? [];

  if (
    actualHeaders.length !== expectedHeaders.length ||
    actualHeaders.some((value, index) => value !== expectedHeaders[index])
  ) {
    return invalidStructure(
      `Use the ${mode} Course import template with these columns: ${expectedHeaders.join(", ")}.`
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
