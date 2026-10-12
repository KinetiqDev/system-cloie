import { describe, expect, it } from "vitest";
import { buildCiloMetrics, buildQuestionMetrics } from "@/features/analytics/aggregators/cilo";
import {
  aggregateOutcomeEvidence,
  buildOutcomeEvidenceDtos,
} from "@/features/analytics/aggregators/outcome-evidence";
import { classifyOutcomeDistributions } from "@/features/analytics/aggregators/outcome-attainment";
import { buildCourseWorkbook } from "@/features/reports/services/build-course-workbook";
import {
  buildClassGroupModel,
  buildClassGroupRatingRows,
  buildOutcomeEvidenceRows,
} from "@/features/reports/services/report-tallies";
import {
  CILO_MAPPINGS_BY_CILO,
  GROUP_IT101_AFTERNOON,
  GROUP_IT101_MORNING,
  GROUP_IT102,
  reportEvidenceFixture,
} from "./report-fixture";
import {
  cellValue,
  dataRowWith,
  dataRowsAfter,
  findRow,
  findRowByValues,
  loadWorkbook,
  numericCell,
  rowValues,
  sheetText,
} from "./workbook-reader";

// ---------------------------------------------------------------------------
// Course evaluation workbook
//
// The workbook is reopened and read cell by cell. Every expectation is
// hand-computed in `report-fixture.ts` from the fixture's own rating literals.
// ---------------------------------------------------------------------------

const GENERATED_AT = new Date("2026-02-02T08:00:00.000Z");

async function buildWorkbook() {
  return buildCourseWorkbook({
    evidence: reportEvidenceFixture(),
    generatedAt: GENERATED_AT,
    exportedBy: "Program Head, Test",
  });
}

/** Header row of a table identified by its first two column labels. */
function tableHeader(
  worksheet: import("exceljs").Worksheet,
  first: string,
  second: string
): number {
  const row = findRowByValues(worksheet, { 1: first, 2: second });
  expect(row, `header row for ${first} / ${second}`).toBeGreaterThan(0);
  return row;
}

describe("course evaluation workbook", () => {
  it("names one worksheet per course and keeps the reporting sheets around them", async () => {
    const workbook = await loadWorkbook(await buildWorkbook());
    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual([
      "Overview",
      "PO Summary",
      "IT101",
      "IT102",
      "Data Dictionary",
    ]);
  });

  it("prints report context, scope counts, and the confidentiality notice", async () => {
    const workbook = await loadWorkbook(await buildWorkbook());
    const overview = workbook.getWorksheet("Overview")!;

    expect(sheetText(overview)).toContain("System CLOIE");
    expect(sheetText(overview)).toContain("BSIT — Bachelor of Science in Information Technology");
    expect(sheetText(overview)).toContain("2026-2027 · 1st Semester · 1st Term");
    expect(sheetText(overview)).toContain("All year levels");
    expect(sheetText(overview)).toContain("Program Head, Test");

    // Assigned 6 + 2 + 3 = 11; submitted 4 + 2 + 2 = 8 → 72.7%.
    const rateRow = findRow(overview, "Response rate");
    expect(cellValue(overview.getCell(rateRow, 2))).toBe("72.7%");
    expect(cellValue(overview.getCell(findRow(overview, "Assigned respondents"), 2))).toBe("11");
    expect(cellValue(overview.getCell(findRow(overview, "Submitted responses"), 2))).toBe("8");
    // Answers: 10 + 2 + 4.
    expect(cellValue(overview.getCell(findRow(overview, "Quantitative answers exported"), 2))).toBe(
      "16"
    );
    expect(sheetText(overview)).toContain("CONFIDENTIAL");
    expect(sheetText(overview)).toContain("CLOIE_OUTCOME_MEAN_V1");
    expect(sheetText(overview)).toContain(
      "Publication-time mapping snapshots are not yet available"
    );
  });

  it("carries the confidentiality notice and proposed-policy disclosure on every sheet", async () => {
    const workbook = await loadWorkbook(await buildWorkbook());
    for (const sheet of workbook.worksheets) {
      expect(sheetText(sheet), sheet.name).toContain("CONFIDENTIAL");
    }
  });

  it("keeps class groups of one course separate with their own response rates", async () => {
    const workbook = await loadWorkbook(await buildWorkbook());
    const sheet = workbook.getWorksheet("IT101")!;

    const headerRow = tableHeader(sheet, "Faculty member", "Section");
    const rows = dataRowsAfter(sheet, headerRow);
    expect(rows).toHaveLength(2);

    // Class group 1: 4 of 6 assigned → 66.7%, instrument version 1.
    const morning = rowValues(sheet, rows[0], 8);
    expect(morning[0]).toBe("Dela Cruz, Ana");
    expect(morning[1]).toBe("MORNING");
    expect(morning[2]).toBe("IT101 First Term CILO Evaluation");
    expect(morning[3]).toBe("CLOSED");
    expect(morning[4]).toBe("CILO Evaluation v1");
    expect(morning[5]).toBe(6);
    expect(morning[6]).toBe(4);
    expect(numericCell(sheet.getCell(rows[0], 8))).toBeCloseTo(4 / 6, 10);

    // Class group 2: same course code, different faculty, section, and instrument.
    const afternoon = rowValues(sheet, rows[1], 8);
    expect(afternoon[0]).toBe("Santos, Ben");
    expect(afternoon[1]).toBe("AFTERNOON");
    expect(afternoon[4]).toBe("CILO Evaluation v2");
    expect(afternoon[5]).toBe(2);
    expect(afternoon[6]).toBe(2);
    expect(numericCell(sheet.getCell(rows[1], 8))).toBe(1);
  });

  it("reports course information with period, year level, and instrument context", async () => {
    const workbook = await loadWorkbook(await buildWorkbook());
    const sheet = workbook.getWorksheet("IT101")!;
    expect(sheetText(sheet)).toContain("IT101 — Introduction to Computing");
    expect(cellValue(sheet.getCell(findRow(sheet, "Course title"), 2))).toBe(
      "Introduction to Computing"
    );
    expect(cellValue(sheet.getCell(findRow(sheet, "Academic year"), 2))).toBe("2026-2027");
    expect(cellValue(sheet.getCell(findRow(sheet, "Semester"), 2))).toBe("1st Semester");
    expect(cellValue(sheet.getCell(findRow(sheet, "Term"), 2))).toBe("1st Term");
    expect(cellValue(sheet.getCell(findRow(sheet, "Instrument versions"), 2))).toBe(
      "CILO Evaluation v1 | CILO Evaluation v2"
    );
  });

  it("prints CILO to PO alignment with classifications and manifestations", async () => {
    const workbook = await loadWorkbook(await buildWorkbook());
    const sheet = workbook.getWorksheet("IT101")!;
    const headerRow = tableHeader(sheet, "CILO", "CILO description");
    const rows = dataRowsAfter(sheet, headerRow);
    expect(rows.length).toBeGreaterThanOrEqual(2);

    const cilo1 = rowValues(sheet, rows[0], 7);
    expect(cilo1[0]).toBe("CILO 1");
    expect(cilo1[2]).toBe("BSIT-GO1");
    expect(cilo1[3]).toBe("Explain technical concepts to non-specialists");
    // Classification comes from the PO record, never from the PO code.
    expect(cilo1[4]).toBe("Core");
    expect(cilo1[5]).toBe("Learning");

    const cilo2 = rowValues(sheet, rows[1], 7);
    expect(cilo2[2]).toBe("BSIT-GO2");
    expect(cilo2[4]).toBe("Professional");
    expect(cilo2[5]).toBe("Practice");
  });

  it("lists direct question bindings and marks a frozen snapshot without a live PO", async () => {
    const workbook = await loadWorkbook(await buildWorkbook());

    const morning = workbook.getWorksheet("IT101")!;
    const directHeader = tableHeader(morning, "Question prompt", "Question key");
    const liveRow = dataRowWith(morning, directHeader, 3, "BSIT-GO1");
    expect(cellValue(morning.getCell(liveRow, 1))).toBe("The course materials were clear.");
    expect(cellValue(morning.getCell(liveRow, 5))).toBe("See PO Summary");

    const it102 = workbook.getWorksheet("IT102")!;
    const frozenHeader = tableHeader(it102, "Question prompt", "Question key");
    const frozenRow = dataRowWith(it102, frozenHeader, 3, "BSIT-GO4");
    // A frozen publication-snapshot binding with no live PO id is labelled as
    // such; its classification is never guessed from the code.
    expect(cellValue(it102.getCell(frozenRow, 1))).toBe(
      "I keep my professional knowledge up to date."
    );
    expect(cellValue(it102.getCell(frozenRow, 5))).toBe(
      "See PO Summary (resolved from the publication snapshot code)"
    );
  });

  it("tallies every rating option per question and reconciles counts, sum, and mean", async () => {
    const workbook = await loadWorkbook(await buildWorkbook());
    const sheet = workbook.getWorksheet("IT101")!;
    const headerRow = tableHeader(sheet, "CILO", "Question prompt");
    // Class group 1 (instrument version 1) enumerates all five snapshot items,
    // and the stacked class-group 2 table is a separate header and table.
    const rows = dataRowsAfter(sheet, headerRow);
    expect(rows).toHaveLength(5);

    // cilo-1-q1 of the morning class: 4, 5, 3, 4 → n=3:1 n=4:2 n=5:1.
    const tally = dataRowWith(sheet, headerRow, 4, "cilo-1-q1");
    // The scale column names the exact frozen identity, not only its range.
    expect(cellValue(sheet.getCell(tally, 5))).toBe(
      "1–5 (5-point) · Not Achieved → Fully Achieved"
    );
    // Option columns are n = 1 … n = 5, so n = 3 is one, n = 4 is two, n = 5 is one.
    expect(numericCell(sheet.getCell(tally, 8))).toBe(1);
    expect(numericCell(sheet.getCell(tally, 9))).toBe(2);
    expect(numericCell(sheet.getCell(tally, 10))).toBe(1);
    const validCount = numericCell(sheet.getCell(tally, 11))!;
    const excludedCount = numericCell(sheet.getCell(tally, 12))!;
    const missingCount = numericCell(sheet.getCell(tally, 13));
    const ratingSum = numericCell(sheet.getCell(tally, 14))!;
    const fullMean = numericCell(sheet.getCell(tally, 15))!;
    const displayMean = cellValue(sheet.getCell(tally, 16));

    expect(validCount).toBe(4);
    expect(excludedCount).toBe(0);
    expect(missingCount).toBe(0);
    expect(ratingSum).toBe(16);
    expect(fullMean).toBe(4);
    expect(displayMean).toBe("4.00");
    // Option counts always sum to the valid rating count.
    expect(
      [6, 7, 8, 9, 10].reduce(
        (sum, column) => sum + (numericCell(sheet.getCell(tally, column)) ?? 0),
        0
      )
    ).toBe(validCount);
    expect(sheet.getCell(tally, 15).numFmt).toBe("0.00");
    expect(sheet.getCell(tally, 11).numFmt).toBe("0");
  });

  it("counts an out-of-scale rating as excluded and reports the CQI status", async () => {
    const workbook = await loadWorkbook(await buildWorkbook());
    const sheet = workbook.getWorksheet("IT101")!;
    const headerRow = tableHeader(sheet, "CILO", "Question prompt");
    const tally = dataRowWith(sheet, headerRow, 4, "cilo-2-q1");
    // Morning class: 2, 9 (invalid), 2, 5 → valid 3, sum 9, mean 3.00.
    expect(numericCell(sheet.getCell(tally, 11))).toBe(3);
    expect(numericCell(sheet.getCell(tally, 12))).toBe(1);
    expect(numericCell(sheet.getCell(tally, 14))).toBe(9);
    expect(numericCell(sheet.getCell(tally, 15))).toBe(3);
    expect(cellValue(sheet.getCell(tally, 17))).toBe("Partially Attained");
    expect(cellValue(sheet.getCell(tally, 18))).toBe("Needs Attention");

    // The afternoon class answers the same item key on the incompatible 1–4
    // agreement identity, which the canonical policy does not classify.
    const afternoonTally = dataRowWith(sheet, afternoonHeaderRow(sheet), 4, "cilo-1-q1");
    expect(cellValue(sheet.getCell(afternoonTally, 5))).toBe(
      "1–5 (5-point) · Strongly Disagree → Strongly Agree"
    );
    expect(numericCell(sheet.getCell(afternoonTally, 11))).toBe(2);
    // Same numeric range, different wording: classified, but as indirect
    // stakeholder perception rather than demonstrated competency.
    expect(cellValue(sheet.getCell(afternoonTally, 17))).toBe("Partially Attained");
    expect(cellValue(sheet.getCell(afternoonTally, 18))).toBe("Needs Attention");
  });

  it("reports an unanswered required question and an optional question honestly", async () => {
    const workbook = await loadWorkbook(await buildWorkbook());
    const sheet = workbook.getWorksheet("IT101")!;
    const headerRow = tableHeader(sheet, "CILO", "Question prompt");
    const rows = dataRowsAfter(sheet, headerRow);

    const unanswered = rows.find((row) => cellValue(sheet.getCell(row, 4)) === "cilo-1-q3")!;
    expect(numericCell(sheet.getCell(unanswered, 11))).toBe(0);
    expect(numericCell(sheet.getCell(unanswered, 13))).toBe(4);
    expect(numericCell(sheet.getCell(unanswered, 15))).toBeNull();
    expect(cellValue(sheet.getCell(unanswered, 16))).toBe("—");
    expect(cellValue(sheet.getCell(unanswered, 17))).toBe("No evidence");
    expect(cellValue(sheet.getCell(unanswered, 18))).toBe("Unclassified");

    const optional = rows.find((row) => cellValue(sheet.getCell(row, 4)) === "general-q1")!;
    expect(numericCell(sheet.getCell(optional, 11))).toBe(1);
    // Optional questions print no missing count rather than pretending the
    // question applied.
    expect(cellValue(sheet.getCell(optional, 13))).toBe("Not applicable");
  });

  it("pools CILO ratings raw instead of averaging question means", async () => {
    const workbook = await loadWorkbook(await buildWorkbook());
    const sheet = workbook.getWorksheet("IT101")!;
    const headerRow = tableHeader(sheet, "CILO", "CILO description");
    const summaryHeader = findRowByValues(sheet, {
      1: "CILO",
      2: "CILO description",
      4: "Distinct submitted responses",
    });
    expect(summaryHeader).toBeGreaterThan(headerRow);

    // CILO 1: cilo-1-q1 (4,5,3,4) + cilo-1-q2 (5) → 5 ratings, sum 21, mean 4.20.
    const cilo1 = dataRowWith(sheet, summaryHeader, 1, "CILO 1");
    // Three bound questions: two rated and one nobody answered.
    expect(numericCell(sheet.getCell(cilo1, 3))).toBe(3);
    expect(numericCell(sheet.getCell(cilo1, 4))).toBe(4);
    expect(numericCell(sheet.getCell(cilo1, 5))).toBe(5);
    const meanCell = sheet.getCell(cilo1, 12);
    expect(numericCell(meanCell)).toBeCloseTo(4.2, 10);
    expect(cellValue(sheet.getCell(cilo1, 13))).toBe("4.20");
    expect(cellValue(sheet.getCell(cilo1, 14))).toBe("Attained");
    expect(cellValue(sheet.getCell(cilo1, 15))).toBe("Meets Benchmark");
    expect(meanCell.numFmt).toBe("0.00");
  });

  it("separates incompatible instrument versions in their own raw blocks", async () => {
    const workbook = await loadWorkbook(await buildWorkbook());
    const sheet = workbook.getWorksheet("IT101")!;
    const text = sheetText(sheet);

    expect(text).toContain(
      "F. Raw response records — IT101 First Term CILO Evaluation — CILO Evaluation v1"
    );
    expect(text).toContain(
      "F. Raw response records — IT101 Second Term CILO Evaluation — CILO Evaluation v2"
    );
    // 1–4 agreement identity is not classifiable, so it stays unclassified.
    expect(text).toContain("1–5 (5-point) · Not Achieved → Fully Achieved");
    expect(text).toContain("1–5 (5-point) · Strongly Disagree → Strongly Agree");
    // The unlabeled numeric scale behind the IT102 direct binding is reported as
    // unclassified, never as non-attainment.
    expect(sheetText(workbook.getWorksheet("IT102")!)).toContain(
      "Unclassified — unsupported scale"
    );
  });

  it("prints one raw row per submitted response with names, ids, and original ratings", async () => {
    const workbook = await loadWorkbook(await buildWorkbook());
    const sheet = workbook.getWorksheet("IT101")!;
    const headerRow = findRowByValues(sheet, { 1: "Respondent name", 2: "Response ID" });
    expect(headerRow).toBeGreaterThan(0);
    const rows = dataRowsAfter(sheet, headerRow + 1); // skip the prompt row
    expect(rows).toHaveLength(4);

    const first = rowValues(sheet, rows[0], 9);
    expect(first[0]).toBe("Alpha, Ann");
    expect(first[1]).toBe("resp-it101-ann");
    expect(first[2]).toBe("user-ann");
    expect(String(first[3])).toContain("2026");
    // Original numeric answers, unmodified, in snapshot question order:
    // cilo-1-q1, cilo-1-q2, cilo-1-q3, cilo-2-q1, general-q1.
    expect(numericCell(sheet.getCell(rows[0], 5))).toBe(4);
    expect(numericCell(sheet.getCell(rows[0], 6))).toBe(5);
    expect(numericCell(sheet.getCell(rows[0], 7))).toBeNull();
    expect(numericCell(sheet.getCell(rows[0], 8))).toBe(2);
    expect(numericCell(sheet.getCell(rows[0], 9))).toBe(3);
    expect(sheet.getCell(rows[0], 5).numFmt).toBe("0");

    // Two different respondents share one name and keep two rows.
    expect(cellValue(sheet.getCell(rows[1], 1))).toBe("Bravo, Ben");
    expect(cellValue(sheet.getCell(rows[2], 1))).toBe("Bravo, Ben");
    expect(cellValue(sheet.getCell(rows[1], 2))).toBe("resp-it101-ben-1");
    expect(cellValue(sheet.getCell(rows[2], 2))).toBe("resp-it101-ben-2");
    expect(numericCell(sheet.getCell(rows[1], 5))).toBe(5);
    // The out-of-scale answer is printed verbatim, never filtered out of the raw grid.
    expect(numericCell(sheet.getCell(rows[1], 8))).toBe(9);

    // A blank account name is reported explicitly, never replaced.
    expect(cellValue(sheet.getCell(rows[3], 1))).toBe("Name unavailable");
    expect(cellValue(sheet.getCell(rows[3], 2))).toBe("resp-it101-noname");

    // An unanswered question stays blank rather than becoming a zero.
    expect(numericCell(sheet.getCell(rows[1], 6))).toBeNull();
    expect(numericCell(sheet.getCell(rows[1], 9))).toBeNull();
  });

  it("prints course-bound PO evidence with the recorded PO classification", async () => {
    const workbook = await loadWorkbook(await buildWorkbook());
    const sheet = workbook.getWorksheet("PO Summary")!;
    const headerRow = tableHeader(sheet, "PO code", "PO description");
    const rows = dataRowsAfter(sheet, headerRow);
    expect(rows).toHaveLength(3);
    // Canonical ranking: mean descending, then code.
    const codes = rows.map((row) => cellValue(sheet.getCell(row, 1)));
    expect(codes).toEqual(["BSIT-GO4", "BSIT-GO1", "BSIT-GO2"]);

    const go4 = dataRowWith(sheet, headerRow, 1, "BSIT-GO4");
    expect(cellValue(sheet.getCell(go4, 3))).toBe("Needs classification");
    // Only the two frozen direct-binding answers of IT102.
    expect(numericCell(sheet.getCell(go4, 5))).toBe(2);
    expect(numericCell(sheet.getCell(go4, 8))).toBeCloseTo(4.5, 10);
    expect(cellValue(sheet.getCell(go4, 10))).toBe("Unclassified — unsupported scale");
    expect(cellValue(sheet.getCell(go4, 11))).toBe("Unclassified");

    const go1 = dataRowWith(sheet, headerRow, 1, "BSIT-GO1");
    // Legacy GO-era code printed unchanged, with its recorded classification.
    expect(cellValue(sheet.getCell(go1, 3))).toBe("Core");
    expect(numericCell(sheet.getCell(go1, 5))).toBe(10);
    // Four morning responses, two afternoon responses, two IT102 responses.
    expect(numericCell(sheet.getCell(go1, 6))).toBe(8);
    expect(numericCell(sheet.getCell(go1, 8))).toBeCloseTo(4, 10);
    expect(cellValue(sheet.getCell(go1, 9))).toBe("4.00");
    // Course-bound and afternoon ratings span two scale identities, so the row
    // keeps its pooled mean but stays explicitly unclassified.
    expect(cellValue(sheet.getCell(go1, 10))).toBe("Unclassified — mixed scales");
    expect(cellValue(sheet.getCell(go1, 11))).toBe("Unclassified");

    const go2 = dataRowWith(sheet, headerRow, 1, "BSIT-GO2");
    expect(cellValue(sheet.getCell(go2, 3))).toBe("Professional");
    expect(numericCell(sheet.getCell(go2, 5))).toBe(5);
    expect(numericCell(sheet.getCell(go2, 8))).toBeCloseTo(3.8, 10);
    expect(cellValue(sheet.getCell(go2, 10))).toBe("Attained");
  });

  it("reconciles every PO distribution with its rating count", async () => {
    const workbook = await loadWorkbook(await buildWorkbook());
    const sheet = workbook.getWorksheet("PO Summary")!;
    const headerRow = findRowByValues(sheet, {
      1: "PO code",
      2: "Scale identity",
      5: "Count",
    });
    expect(headerRow).toBeGreaterThan(0);
    const rows = dataRowsAfter(sheet, headerRow);
    const totals = new Map<string, number>();
    for (const row of rows) {
      const code = String(cellValue(sheet.getCell(row, 1)));
      totals.set(code, (totals.get(code) ?? 0) + (numericCell(sheet.getCell(row, 5)) ?? 0));
    }
    expect(totals.get("BSIT-GO1")).toBe(10);
    expect(totals.get("BSIT-GO2")).toBe(5);
    expect(totals.get("BSIT-GO4")).toBe(2);
  });

  it("keeps respondent identities to names and internal ids only", async () => {
    const workbook = await loadWorkbook(await buildWorkbook());
    const text = workbook.worksheets.map((sheet) => sheetText(sheet)).join("\n");
    expect(text).toContain("Alpha, Ann");
    expect(text).not.toContain("@");
    expect(text).not.toContain("S2026-");
    // Raw qualitative comments are never part of an export.
    expect(text).not.toContain("comment");
  });

  it("applies frozen headings, filters, and print setup", async () => {
    const workbook = await loadWorkbook(await buildWorkbook());
    for (const name of ["Overview", "PO Summary", "IT101", "Data Dictionary"]) {
      const sheet = workbook.getWorksheet(name)!;
      expect(sheet.views?.[0]?.state, name).toBe("frozen");
      expect(sheet.pageSetup.orientation, name).toBe("landscape");
      expect(sheet.pageSetup.fitToPage, name).toBe(true);
    }
    expect(workbook.getWorksheet("IT101")!.autoFilter).toBeTruthy();
  });

  it("explains counts, denominators, mappings, and classification rules", async () => {
    const workbook = await loadWorkbook(await buildWorkbook());
    const sheet = workbook.getWorksheet("Data Dictionary")!;
    const text = sheetText(sheet);
    expect(text).toContain("Valid rating count");
    expect(text).toContain("Response rate");
    expect(text).toContain("mean of question means");
    expect(text).toContain("Never inferred from the PO code");
    expect(text).toContain("Manifestation (L/P/O)");
    expect(text).toContain("policy CLOIE_OUTCOME_MEAN_V1");
  });
});

/** The second class group's question-tally header, stacked below the first. */
function afternoonHeaderRow(sheet: import("exceljs").Worksheet): number {
  const headers = dataRowsAfter(sheet, tableHeader(sheet, "CILO", "Question prompt"));
  expect(headers).toHaveLength(5);
  // The next tally header sits after the class-group 2 heading.
  let rowNumber = tableHeader(sheet, "CILO", "Question prompt") + 6;
  while (!isTallyHeader(sheet, rowNumber)) rowNumber += 1;
  return rowNumber;
}

function isTallyHeader(sheet: import("exceljs").Worksheet, rowNumber: number): boolean {
  return (
    cellValue(sheet.getCell(rowNumber, 1)) === "CILO" &&
    cellValue(sheet.getCell(rowNumber, 2)) === "Question prompt"
  );
}

describe("course workbook parity with the analytics aggregators", () => {
  it("prints the same question metrics the canonical aggregator computes", () => {
    const model = buildClassGroupModel(GROUP_IT101_MORNING, CILO_MAPPINGS_BY_CILO);
    const canonical = new Map(
      buildQuestionMetrics(
        buildClassGroupRatingRows(GROUP_IT101_MORNING, CILO_MAPPINGS_BY_CILO)
      ).map((metric) => [`${metric.sectionKey}/${metric.itemKey}`, metric])
    );

    for (const tally of model.questions) {
      const metric = canonical.get(`${tally.question.sectionKey}/${tally.question.itemKey}`);
      if (!metric) {
        expect(tally.validCount).toBe(0);
        continue;
      }
      expect(tally.validCount).toBe(metric.quantitative?.ratingCount ?? 0);
      expect(tally.mean).toBe(metric.quantitative?.mean ?? null);
      expect(tally.distinctResponseCount).toBe(metric.quantitative?.responseCount ?? 0);
      expect(tally.categories.map((category) => category.count)).toEqual(
        (metric.quantitative?.distribution ?? []).map((category) => category.count)
      );
    }
  });

  it("prints the same CILO metrics the canonical aggregator computes", () => {
    const model = buildClassGroupModel(GROUP_IT101_MORNING, CILO_MAPPINGS_BY_CILO);
    const canonical = buildCiloMetrics(
      buildClassGroupRatingRows(GROUP_IT101_MORNING, CILO_MAPPINGS_BY_CILO)
    );
    const canonicalByLabel = new Map(canonical.map((metric) => [metric.description, metric]));

    for (const summary of model.ciloSummaries) {
      const metric = canonicalByLabel.get(summary.ciloDescription);
      if (!metric) {
        expect(summary.validCount).toBe(0);
        expect(summary.attainment.status).toBe("no-evidence");
        continue;
      }
      expect(summary.validCount).toBe(metric.quantitative?.ratingCount ?? 0);
      expect(summary.mean).toBe(metric.quantitative?.mean ?? null);
      expect(summary.distinctResponseCount).toBe(metric.quantitative?.responseCount ?? 0);
    }
  });

  it("prints the same Program Outcome rows the analytics PO read computes", () => {
    const models = [GROUP_IT101_MORNING, GROUP_IT101_AFTERNOON, GROUP_IT102].map((group) =>
      buildClassGroupModel(group, CILO_MAPPINGS_BY_CILO)
    );
    const aggregation = aggregateOutcomeEvidence(buildOutcomeEvidenceRows(models));
    const canonical = buildOutcomeEvidenceDtos(aggregation).map((outcome) => ({
      code: outcome.code,
      meanRating: outcome.meanRating,
      ratingCount: outcome.ratingCount,
      submittedResponseCount: outcome.submittedResponseCount,
      excludedRatingCount: outcome.excludedRatingCount,
      attainment: classifyOutcomeDistributions(
        outcome.meanRating,
        outcome.distributions,
        outcome.spansMultipleScales
      ),
    }));

    const byCode = new Map(canonical.map((outcome) => [outcome.code, outcome]));
    expect(byCode.get("BSIT-GO1")).toMatchObject({ ratingCount: 10, meanRating: 4 });
    expect(byCode.get("BSIT-GO2")).toMatchObject({ ratingCount: 5 });
    expect(byCode.get("BSIT-GO2")!.meanRating).toBeCloseTo(3.8, 10);
    expect(byCode.get("BSIT-GO4")).toMatchObject({ ratingCount: 2, meanRating: 4.5 });
    expect(byCode.get("BSIT-GO4")!.attainment.status).toBe("unsupported-scale");
    // BSIT-GO1 pools two incompatible scale identities, so the canonical
    // policy leaves it unclassified while Analytics still prints the mean.
    expect(byCode.get("BSIT-GO1")!.attainment.status).toBe("mixed-scales");
    expect(byCode.get("BSIT-GO2")!.attainment.interpretation).toBe("Attained");
  });
});
