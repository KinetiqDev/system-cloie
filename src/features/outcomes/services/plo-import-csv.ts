import { parseCsvRecords } from "@/lib/csv/parse-csv-records";
import { PLO_IMPORT_MAX_ROWS, type PLOImportSourceRow } from "../types/plo-import";

export { PLO_IMPORT_MAX_ROWS } from "../types/plo-import";

export const PLO_IMPORT_TEMPLATE = "\uFEFFPLO Code,Description\r\n";

// fallow-ignore-next-line unused-type
export type PLOImportParseResult =
  | { success: true; rows: PLOImportSourceRow[] }
  | { success: false; error: string };

type ImportHeader = keyof PLOImportSourceRow["input"] | "error";
const HEADER_ALIASES: Record<string, ImportHeader> = {
  plocode: "plo_code",
  description: "description",
  error: "error",
};
const EXPECTED_COLUMNS =
  "Use the Program Learning Outcome import template. Expected columns: PLO Code, Description.";

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

export function parsePLOImportCsv(input: string | Uint8Array): PLOImportParseResult {
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
  if (!header || (header.cells.length !== 2 && header.cells.length !== 3)) {
    return { success: false, error: EXPECTED_COLUMNS };
  }
  const mappedHeaders = header.cells.map((cell) => HEADER_ALIASES[normalizedHeader(cell)]);
  const uniqueHeaders = new Set(mappedHeaders);
  if (
    mappedHeaders.some((headerName) => !headerName) ||
    uniqueHeaders.size !== mappedHeaders.length ||
    !mappedHeaders.includes("plo_code") ||
    !mappedHeaders.includes("description") ||
    (mappedHeaders.length === 3 && !mappedHeaders.includes("error"))
  ) {
    return { success: false, error: EXPECTED_COLUMNS };
  }

  const dataRecords = records.filter((record) => !isBlank(record.cells));
  if (dataRecords.length === 0) {
    return { success: false, error: "Add at least one PLO row to the CSV file." };
  }
  if (dataRecords.length > PLO_IMPORT_MAX_ROWS) {
    const excess = dataRecords.length - PLO_IMPORT_MAX_ROWS;
    return {
      success: false,
      error: `This file contains ${dataRecords.length} PLO rows. Each import can contain up to ${PLO_IMPORT_MAX_ROWS}. Remove ${excess} row${excess === 1 ? "" : "s"} or split the file into smaller files, then try again.`,
    };
  }
  if (dataRecords.some((record) => record.cells.length !== mappedHeaders.length)) {
    return { success: false, error: EXPECTED_COLUMNS };
  }

  return {
    success: true,
    rows: dataRecords.map((record) => {
      const inputValues = Object.fromEntries(
        mappedHeaders.flatMap((headerName, index) =>
          headerName === "error" ? [] : [[headerName, record.cells[index] ?? ""]]
        )
      ) as PLOImportSourceRow["input"];
      return { sourceIndex: record.sourceIndex, input: inputValues };
    }),
  };
}

export function exportFailedPLOImportRows(
  rows: Array<{ ploCode: string; description: string; error: string }>
): string {
  return [
    "\uFEFFPLO Code,Description,Error",
    ...rows.map((row) =>
      [row.ploCode, row.description, row.error].map((value) => csvCell(value)).join(",")
    ),
    "",
  ].join("\r\n");
}
