import { parseCsvRecords, type CsvRecord } from "@/lib/csv/parse-csv-records";
import { PO_IMPORT_MAX_ROWS, type POImportSourceRow } from "../types/po-import";

export { PO_IMPORT_MAX_ROWS } from "../types/po-import";

export const PO_IMPORT_TEMPLATE = "\uFEFFPO Code,Description\r\n";

// fallow-ignore-next-line unused-type
export type POImportParseResult =
  | { success: true; rows: POImportSourceRow[] }
  | { success: false; error: string };

type ImportHeader = keyof POImportSourceRow["input"] | "error";
const HEADER_ALIASES: Record<string, ImportHeader> = {
  pocode: "po_code",
  // Legacy GO-era and PLO-era headers stay accepted for older spreadsheets.
  gocode: "po_code",
  plocode: "po_code",
  description: "description",
  error: "error",
};
const EXPECTED_COLUMNS =
  "Use the Program Outcome import template. Expected columns: PO Code, Description.";

function normalizedHeader(value: string): string {
  return value.normalize("NFKC").trim().toLowerCase().replaceAll("_", "").replaceAll(" ", "");
}

function isBlank(cells: string[]): boolean {
  return cells.every((cell) => cell.trim() === "");
}

// Unlike exportFailedCourseImportRows (Course import), this export prefixes
// spreadsheet-formula-leading cells (=+-@) with an apostrophe so a rows-to-fix
// file cannot execute formulas when reopened. The Course surface is unchanged
// here on purpose; aligning it is a separate Course-domain change.

function csvCell(value: string): string {
  const safe = /^[=+\-@]/u.test(value) ? `'${value}` : value;
  return /[",\n\r]/u.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}

function mappedHeaderNames(cells: string[]): ImportHeader[] | null {
  const headers = cells.map((cell) => HEADER_ALIASES[normalizedHeader(cell)]);
  const uniqueHeaders = new Set(headers);
  const valid =
    headers.every((headerName) => headerName !== undefined) &&
    uniqueHeaders.size === headers.length &&
    headers.includes("po_code") &&
    headers.includes("description") &&
    (headers.length === 2 || (headers.length === 3 && headers.includes("error")));
  return valid ? headers : null;
}

function toImportRow(record: CsvRecord, headers: ImportHeader[]): POImportSourceRow {
  const inputValues = Object.fromEntries(
    headers.flatMap((headerName, index) =>
      headerName === "error" ? [] : [[headerName, record.cells[index] ?? ""]]
    )
  ) as POImportSourceRow["input"];
  return { sourceIndex: record.sourceIndex, input: inputValues };
}

export function parsePOImportCsv(input: string | Uint8Array): POImportParseResult {
  const empty = typeof input === "string" ? input.length === 0 : input.byteLength === 0;
  if (empty) {
    return { success: false, error: "The CSV file is empty." };
  }
  const parsed = parseCsvRecords(input);
  if (!parsed.success) {
    return {
      success: false,
      error:
        parsed.reason === "encoding"
          ? "The CSV could not be read. Save it as a UTF-8 CSV file and try again."
          : "The CSV contains malformed rows or quotation marks. Use the downloaded template and try again.",
    };
  }
  const [header, ...records] = parsed.records;
  const headers = header && mappedHeaderNames(header.cells);
  if (!headers) {
    return { success: false, error: EXPECTED_COLUMNS };
  }

  const dataRecords = records.filter((record) => !isBlank(record.cells));
  if (dataRecords.length === 0) {
    return { success: false, error: "Add at least one PO row to the CSV file." };
  }
  if (dataRecords.length > PO_IMPORT_MAX_ROWS) {
    const excess = dataRecords.length - PO_IMPORT_MAX_ROWS;
    return {
      success: false,
      error: `This file contains ${dataRecords.length} PO rows. Each import can contain up to ${PO_IMPORT_MAX_ROWS}. Remove ${excess} row${excess === 1 ? "" : "s"} or split the file into smaller files, then try again.`,
    };
  }
  if (dataRecords.some((record) => record.cells.length !== headers.length)) {
    return { success: false, error: EXPECTED_COLUMNS };
  }

  return { success: true, rows: dataRecords.map((record) => toImportRow(record, headers)) };
}

export function exportFailedPOImportRows(
  rows: Array<{ poCode: string; description: string; error: string }>
): string {
  return [
    "\uFEFFPO Code,Description,Error",
    ...rows.map((row) =>
      [row.poCode, row.description, row.error].map((value) => csvCell(value)).join(",")
    ),
    "",
  ].join("\r\n");
}
