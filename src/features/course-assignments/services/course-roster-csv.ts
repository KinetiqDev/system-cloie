export const COURSE_ROSTER_MAX_ROWS = 100;
export const COURSE_ROSTER_TEMPLATE = "name\nStudent name\n";

type CourseRosterCsvRow = {
  sourceIndex: number;
  submittedName: string;
  normalizedName: string;
  status: "VALID" | "INVALID_NAME";
  error: string;
};

export type CourseRosterCsvParseResult =
  | { success: true; rows: CourseRosterCsvRow[] }
  | { success: false; error: string };

const INVALID_STRUCTURE = "CSV must contain one name column and 1 to 100 data rows.";
const INVALID_NAME = "Name must contain 1 to 200 characters.";

function decodeCsv(input: string | Uint8Array) {
  if (typeof input === "string") return input;
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(input);
  } catch {
    return null;
  }
}

type CsvCell = { value: string; nextIndex: number; lineBreaks: number };

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
    if (nextIndex < input.length && ![",", "\n"].includes(input[nextIndex])) return null;
    return { value, nextIndex, lineBreaks };
  }
  return null;
}

function parseCsvCell(input: string, startIndex: number): CsvCell | null {
  return input[startIndex] === '"'
    ? parseQuotedCsvCell(input, startIndex)
    : parsePlainCsvCell(input, startIndex);
}

function parseRecords(input: string): Array<{ cells: string[]; sourceIndex: number }> | null {
  const records: Array<{ cells: string[]; sourceIndex: number }> = [];
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

function normalizeRosterName(name: string) {
  return name.normalize("NFKC").trim().replace(/\s+/gu, " ");
}

function isBlankRecord(cells: string[]) {
  return cells.every((cell) => cell.trim() === "");
}

export function parseCourseRosterCsv(input: string | Uint8Array): CourseRosterCsvParseResult {
  const decoded = decodeCsv(input);
  if (decoded === null) return { success: false, error: INVALID_STRUCTURE };

  const withoutBom = decoded.startsWith("\uFEFF") ? decoded.slice(1) : decoded;
  if (withoutBom.includes("\r") && !withoutBom.includes("\r\n")) {
    return { success: false, error: INVALID_STRUCTURE };
  }
  const records = parseRecords(withoutBom.replaceAll("\r\n", "\n"));
  if (!records || records.length === 0) return { success: false, error: INVALID_STRUCTURE };

  const [header, ...sourceRecords] = records;
  if (
    header.cells.length === 0 ||
    !["name", "student name"].includes(header.cells[0].trim().toLocaleLowerCase()) ||
    header.cells.slice(1).some((cell) => cell.trim() !== "")
  ) {
    return { success: false, error: INVALID_STRUCTURE };
  }

  const dataRecords = sourceRecords.filter((record) => !isBlankRecord(record.cells));
  if (dataRecords.length === 0 || dataRecords.length > COURSE_ROSTER_MAX_ROWS) {
    return { success: false, error: INVALID_STRUCTURE };
  }
  if (dataRecords.some((record) => record.cells.slice(1).some((cell) => cell.trim() !== ""))) {
    return { success: false, error: INVALID_STRUCTURE };
  }

  return {
    success: true,
    rows: dataRecords.map((record) => {
      const submittedName = record.cells[0] ?? "";
      const normalizedName = normalizeRosterName(submittedName);
      const invalid = normalizedName.length === 0 || normalizedName.length > 200;
      return {
        sourceIndex: record.sourceIndex,
        submittedName,
        normalizedName,
        status: invalid ? "INVALID_NAME" : "VALID",
        error: invalid ? INVALID_NAME : "",
      };
    }),
  };
}

function csvCell(value: string) {
  return /[",\n\r]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

export function exportFailedCourseRosterRows(
  rows: Array<{ sourceIndex: number; name: string; error: string; status: string }>
) {
  const failedRows = rows.filter((row) => row.status !== "CREATED" && row.status !== "RESTORED");
  const exportError = (row: (typeof failedRows)[number]) => {
    if (row.status === "UNEXPECTED_FAILURE") return "The roster request could not be completed.";
    if (row.status === "UNPROCESSED") return "This row was not processed because import stopped unexpectedly.";
    return row.error;
  };
  return [
    "row,name,status,error",
    ...failedRows.map((row) =>
      [row.sourceIndex, row.name, row.status, exportError(row)].map((value) =>
        csvCell(String(value))
      ).join(",")
    ),
    "",
  ].join("\n");
}
