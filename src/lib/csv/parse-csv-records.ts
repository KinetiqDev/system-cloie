export type CsvRecord = { cells: string[]; sourceIndex: number };

// fallow-ignore-next-line unused-type
export type CsvParseResult =
  | { success: true; records: CsvRecord[] }
  | { success: false; reason: "encoding" | "structure" };

type CsvCell = { value: string; nextIndex: number; lineBreaks: number };

function decodeCsv(input: string | Uint8Array): string | null {
  if (typeof input === "string") return input;
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(input);
  } catch {
    return null;
  }
}

function parsePlainCell(input: string, startIndex: number): CsvCell | null {
  const endOffset = input.slice(startIndex).search(/[\n,]/u);
  const nextIndex = endOffset === -1 ? input.length : startIndex + endOffset;
  const value = input.slice(startIndex, nextIndex);
  return value.includes('"') ? null : { value, nextIndex, lineBreaks: 0 };
}

function parseQuotedCell(input: string, startIndex: number): CsvCell | null {
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
    if (nextIndex < input.length && ![",", "\n"].includes(input[nextIndex] ?? "")) return null;
    return { value, nextIndex, lineBreaks };
  }
  return null;
}

type CsvRow = { cells: string[]; nextIndex: number; line: number };

function parseRecordCells(input: string, startIndex: number, startLine: number): CsvRow | null {
  const cells: string[] = [];
  let index = startIndex;
  let line = startLine;
  while (true) {
    const cell =
      input[index] === '"' ? parseQuotedCell(input, index) : parsePlainCell(input, index);
    if (!cell) return null;
    cells.push(cell.value);
    index = cell.nextIndex;
    line += cell.lineBreaks;
    if (input[index] !== ",") break;
    index += 1;
  }
  return { cells, nextIndex: index, line };
}

function parseRecords(input: string): CsvRecord[] | null {
  const records: CsvRecord[] = [];
  let index = 0;
  let line = 1;

  while (index < input.length) {
    const sourceIndex = line;
    const row = parseRecordCells(input, index, line);
    if (!row) return null;
    records.push({ cells: row.cells, sourceIndex });
    index = row.nextIndex;
    line = row.line;
    if (index === input.length) break;
    if (input[index] !== "\n") return null;
    index += 1;
    line += 1;
  }
  return records;
}

export function parseCsvRecords(input: string | Uint8Array): CsvParseResult {
  const decoded = decodeCsv(input);
  if (decoded === null) return { success: false, reason: "encoding" };
  const withoutBom = decoded.startsWith("\uFEFF") ? decoded.slice(1) : decoded;
  if (withoutBom.includes("\r") && !withoutBom.includes("\r\n")) {
    return { success: false, reason: "structure" };
  }
  const records = parseRecords(withoutBom.replaceAll("\r\n", "\n"));
  return records ? { success: true, records } : { success: false, reason: "structure" };
}
