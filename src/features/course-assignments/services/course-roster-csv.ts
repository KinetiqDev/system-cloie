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

function parseRecords(input: string): Array<{ cells: string[]; sourceIndex: number }> | null {
  const records: Array<{ cells: string[]; sourceIndex: number }> = [];
  let cells: string[] = [];
  let cell = "";
  let quoted = false;
  let quoteClosed = false;
  let atCellStart = true;
  let sourceIndex = 1;
  let line = 1;

  function finishRecord() {
    cells.push(cell);
    records.push({ cells, sourceIndex });
    cells = [];
    cell = "";
    atCellStart = true;
    quoteClosed = false;
    sourceIndex = line + 1;
  }

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    if (quoted) {
      if (character === '"') {
        if (input[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else {
          quoted = false;
          quoteClosed = true;
        }
      } else {
        if (character === "\n") line += 1;
        cell += character;
      }
      continue;
    }

    if (character === '"') {
      if (!atCellStart) return null;
      quoted = true;
    } else if (character === ",") {
      cells.push(cell);
      cell = "";
      atCellStart = true;
    } else if (character === "\n") {
      finishRecord();
      line += 1;
    } else {
      if (quoteClosed) return null;
      cell += character;
      atCellStart = false;
    }
  }

  if (quoted) return null;
  if (cell !== "" || cells.length > 0) finishRecord();
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
