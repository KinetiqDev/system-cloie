import type { Cell, CellValue, Worksheet } from "exceljs";

// ---------------------------------------------------------------------------
// Shared spreadsheet presentation
//
// One small vocabulary for every report export: a title block, section
// headings, header rows, typed cells, status colors, frozen headings, filters,
// and print setup. The rules are deliberately plain — the exports are
// numerical reports, so styling exists to keep them readable, never to
// decorate them.
// ---------------------------------------------------------------------------

/** Print-safe palette derived from the canonical status tokens. */
const REPORT_COLORS = {
  ink: "FF17233A",
  mutedInk: "FF4A5568",
  headerFill: "FF1F3A5F",
  headerInk: "FFFFFFFF",
  bandFill: "FFF2F5F9",
  neutralFill: "FFEDF0F4",
  successFill: "FFDCFCE7",
  successInk: "FF14532D",
  warningFill: "FFFEF3C7",
  warningInk: "FF78350F",
  dangerFill: "FFFEE2E2",
  dangerInk: "FF7F1D1D",
  border: "FFCBD5E1",
} as const;

const TITLE_FONT = "Calibri";
const FORBIDDEN_SHEET_CHARACTERS = /[:\\/?*[\]]/g;
const SHEET_NAME_LIMIT = 31;

/**
 * Neutralize spreadsheet formula injection for exported text. Values that a
 * spreadsheet would treat as a formula become literal text instead. Numbers are
 * never touched: only string values are considered.
 */
export function safeSpreadsheetText(value: string): string {
  const trimmed = value.replace(/\u0000/g, "");
  return /^[=+\-@\t\r]/.test(trimmed) ? `'${trimmed}` : trimmed;
}

/** Any cell value, with string values neutralized against formula injection. */
function safeCellValue(value: string | number | null | undefined): CellValue | null {
  if (value === null || value === undefined) return null;
  return typeof value === "string" ? safeSpreadsheetText(value) : value;
}

/**
 * Deterministic, Excel-safe worksheet name. Excel forbids `: \ / ? * [ ]`,
 * caps names at 31 characters, rejects empty names and case-insensitive
 * duplicates, and ignores leading or trailing apostrophes. Collisions resolve
 * with a numbered suffix so two courses that share a code keep two sheets.
 */
export function safeSheetName(preferred: string, taken: Set<string>): string {
  const base = preferred.replace(FORBIDDEN_SHEET_CHARACTERS, " ").replace(/[']/g, "").trim();
  const seed = base.length > 0 ? base : "Sheet";
  let candidate = seed.slice(0, SHEET_NAME_LIMIT);
  let suffix = 1;
  while (taken.has(candidate.toLowerCase())) {
    suffix += 1;
    const tail = ` (${suffix})`;
    candidate = `${seed.slice(0, SHEET_NAME_LIMIT - tail.length)}${tail}`;
  }
  taken.add(candidate.toLowerCase());
  return candidate;
}

/** Column widths for one worksheet, applied once per column. */
type ColumnWidth = { width: number };

export function setColumnWidths(worksheet: Worksheet, widths: ColumnWidth[]): void {
  widths.forEach((entry, index) => {
    worksheet.getColumn(index + 1).width = entry.width;
  });
}

/** Freeze the rows above the first data row so headings stay visible. */
export function freezeHeadingRows(worksheet: Worksheet, frozenRowCount: number): void {
  if (frozenRowCount < 1) return;
  worksheet.views = [{ state: "frozen", xSplit: 0, ySplit: frozenRowCount }];
}

/**
 * Report title block: product name, report name, and report context lines.
 * Returns the next free row.
 */
export function writeTitleBlock(
  worksheet: Worksheet,
  lines: Array<{ text: string; size?: number; bold?: boolean; color?: string }>
): number {
  let row = 1;
  for (const line of lines) {
    const cell = worksheet.getCell(row, 1);
    cell.value = safeCellValue(line.text);
    cell.font = {
      name: TITLE_FONT,
      size: line.size ?? 11,
      bold: line.bold ?? false,
      color: { argb: line.color ?? REPORT_COLORS.ink },
    };
    cell.alignment = { vertical: "middle", wrapText: false };
    row += 1;
  }
  return row;
}

/** A section heading spanning the sheet, followed by a blank spacer row. */
export function writeSectionHeading(worksheet: Worksheet, row: number, text: string): number {
  const cell = worksheet.getCell(row, 1);
  cell.value = safeCellValue(text);
  cell.font = { name: TITLE_FONT, size: 12, bold: true, color: { argb: REPORT_COLORS.ink } };
  cell.alignment = { vertical: "middle" };
  worksheet.getRow(row).height = 20;
  return row + 2;
}

/** A wrapped note line, used for disclosures and instructions. */
export function writeNote(worksheet: Worksheet, row: number, text: string): number {
  const cell = worksheet.getCell(row, 1);
  cell.value = safeCellValue(text);
  cell.font = { name: TITLE_FONT, size: 9, color: { argb: REPORT_COLORS.mutedInk } };
  cell.alignment = { vertical: "top", wrapText: false };
  return row + 1;
}

export type HeaderCell = {
  text: string;
  /** Wrap long prompts and headings inside a taller header row. */
  wrap?: boolean;
  width?: number;
};

/** Write one header row and return the next free row. */
export function writeHeaderRow(worksheet: Worksheet, row: number, headers: HeaderCell[]): number {
  headers.forEach((header, index) => {
    const cell = worksheet.getCell(row, index + 1);
    cell.value = safeCellValue(header.text);
    cell.font = {
      name: TITLE_FONT,
      size: 10,
      bold: true,
      color: { argb: REPORT_COLORS.headerInk },
    };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: REPORT_COLORS.headerFill } };
    cell.alignment = {
      vertical: "middle",
      horizontal: "left",
      wrapText: header.wrap ?? false,
    };
    cell.border = thinBorder();
  });
  worksheet.getRow(row).height = headers.some((header) => header.wrap) ? 30 : 18;
  return row + 1;
}

/** Numeric cell: integers stay integral, means keep full precision. */
export function writeNumber(
  worksheet: Worksheet,
  row: number,
  column: number,
  value: number | null,
  numFmt: string
): Cell {
  const cell = worksheet.getCell(row, column);
  cell.value = value === null ? null : value;
  cell.numFmt = numFmt;
  cell.font = { name: TITLE_FONT, size: 10, color: { argb: REPORT_COLORS.ink } };
  cell.alignment = { vertical: "middle", horizontal: typeof value === "number" ? "right" : "left" };
  return cell;
}

/** Integer tally cell. */
export function writeCount(worksheet: Worksheet, row: number, column: number, value: number): Cell {
  return writeNumber(worksheet, row, column, value, "0");
}

/** Mean cell: full precision stored, two decimals displayed. */
export function writeMean(
  worksheet: Worksheet,
  row: number,
  column: number,
  value: number | null
): Cell {
  return writeNumber(worksheet, row, column, value, "0.00");
}

/** Percentage cell stored as a full-precision fraction. */
export function writePercent(
  worksheet: Worksheet,
  row: number,
  column: number,
  value: number | null
): Cell {
  return writeNumber(worksheet, row, column, value, "0.0%");
}

/** Plain text cell. */
export function writeText(
  worksheet: Worksheet,
  row: number,
  column: number,
  value: string | null
): Cell {
  const cell = worksheet.getCell(row, column);
  cell.value = safeCellValue(value);
  cell.font = { name: TITLE_FONT, size: 10, color: { argb: REPORT_COLORS.ink } };
  cell.alignment = { vertical: "middle", wrapText: false };
  return cell;
}

/** Wrapped long text cell, used for prompts and descriptions. */
export function writeWrappedText(
  worksheet: Worksheet,
  row: number,
  column: number,
  value: string | null
): Cell {
  const cell = writeText(worksheet, row, column, value);
  cell.alignment = { vertical: "top", wrapText: true };
  return cell;
}

/**
 * Status cell colored by canonical CQI classification. An unclassified or
 * unavailable result stays neutral and is never painted as a failure.
 */
export function writeStatus(
  worksheet: Worksheet,
  row: number,
  column: number,
  label: string,
  cqi: string | null
): Cell {
  const cell = writeText(worksheet, row, column, label);
  const style = statusStyle(cqi);
  if (style) {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: style.fill } };
    cell.font = { name: TITLE_FONT, size: 10, bold: true, color: { argb: style.ink } };
  }
  return cell;
}

function statusStyle(cqi: string | null): { fill: string; ink: string } | null {
  if (cqi === "Meets Benchmark") {
    return { fill: REPORT_COLORS.successFill, ink: REPORT_COLORS.successInk };
  }
  if (cqi === "Needs Attention") {
    return { fill: REPORT_COLORS.warningFill, ink: REPORT_COLORS.warningInk };
  }
  if (cqi === "Below Benchmark") {
    return { fill: REPORT_COLORS.dangerFill, ink: REPORT_COLORS.dangerInk };
  }
  return null;
}

/** Neutral "unavailable" cell for a result that does not exist. */
export function writeUnavailable(
  worksheet: Worksheet,
  row: number,
  column: number,
  label = "Not available"
): Cell {
  const cell = writeText(worksheet, row, column, label);
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: REPORT_COLORS.neutralFill } };
  cell.font = { name: TITLE_FONT, size: 10, italic: true, color: { argb: REPORT_COLORS.mutedInk } };
  return cell;
}

/** Shade alternating data rows so tall tables stay readable when printed. */
export function bandRow(
  worksheet: Worksheet,
  row: number,
  columnCount: number,
  isBand: boolean
): void {
  if (!isBand) return;
  for (let column = 1; column <= columnCount; column += 1) {
    const cell = worksheet.getCell(row, column);
    if (cell.fill?.type === "pattern") continue;
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: REPORT_COLORS.bandFill } };
  }
}

/** Apply thin borders to a written table region. */
export function outlineTable(
  worksheet: Worksheet,
  fromRow: number,
  toRow: number,
  columnCount: number
): void {
  for (let row = fromRow; row <= toRow; row += 1) {
    for (let column = 1; column <= columnCount; column += 1) {
      worksheet.getCell(row, column).border = thinBorder();
    }
  }
}

/** AutoFilter across a header row and its data rows. */
export function applyFilter(
  worksheet: Worksheet,
  headerRow: number,
  firstDataRow: number,
  lastDataRow: number,
  columnCount: number
): void {
  if (lastDataRow < firstDataRow || columnCount < 1) return;
  worksheet.autoFilter = {
    from: { row: headerRow, column: 1 },
    to: { row: lastDataRow, column: columnCount },
  };
}

/** Landscape, fit-to-width print setup with repeated heading rows. */
export function applyPrintSetup(worksheet: Worksheet, repeatRowsThrough: number): void {
  worksheet.pageSetup = {
    orientation: "landscape",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    printTitlesRow: repeatRowsThrough > 0 ? `1:${repeatRowsThrough}` : undefined,
    margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 },
  };
  worksheet.headerFooter = {
    oddFooter: "&LSystem CLOIE — confidential report&RPage &P of &N",
  };
}

function thinBorder() {
  const side = { style: "thin" as const, color: { argb: REPORT_COLORS.border } };
  return { top: side, left: side, bottom: side, right: side };
}

/** Display helper: two decimals for a mean, or the neutral unavailable label. */
export function displayMean(mean: number | null): string | null {
  return mean === null ? null : mean.toFixed(2);
}
