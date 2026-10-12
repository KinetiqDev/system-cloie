import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import {
  aggregateOutcomeEvidence,
  buildOutcomeEvidenceDtos,
} from "@/features/analytics/aggregators/outcome-evidence";
import { buildCiloMetrics } from "@/features/analytics/aggregators/cilo";
import { buildCourseWorkbook } from "@/features/reports/services/build-course-workbook";
import {
  buildClassGroupModel,
  buildClassGroupRatingRows,
  buildOutcomeEvidenceRows,
} from "@/features/reports/services/report-tallies";
import {
  CILO_MAPPINGS_BY_CILO,
  groupWithMixedScaleCilo,
  groupWithTenPointGeneralQuestion,
  groupWithTwoDirectPoBindings,
} from "./report-fixture";
import {
  cellValue,
  dataRowWith,
  dataRowsAfter,
  findRowByValues,
  numericCell,
} from "./workbook-reader";

// ---------------------------------------------------------------------------
// Export accuracy regressions
//
// Each test pins a defect review found in a real export: every number printed
// must reconcile with the canonical aggregator behind it, including inside a
// multi-binding question, a mixed-scale group, and a question whose scale the
// class group never enumerates.
// ---------------------------------------------------------------------------

async function workbookFor(group: Parameters<typeof buildClassGroupModel>[0]) {
  const evidence = {
    programId: "prog-bsit",
    programCode: "BSIT",
    programName: "Bachelor of Science in Information Technology",
    period: {
      schoolYearId: "sy-1",
      schoolYearCode: "2026-2027",
      semester: "FIRST" as const,
      semesterLabel: "1st Semester",
      termInstanceId: "term-1",
      termLabel: "1st Term",
      label: "2026-2027 · 1st Semester · 1st Term",
    },
    yearLevel: null,
    yearLevelLabel: "All year levels",
    outcomes: [],
    ciloMappings: CILO_MAPPINGS_BY_CILO,
    courseGroups: [group],
    centralGroups: [],
  };
  const bytes = await buildCourseWorkbook({
    evidence,
    generatedAt: new Date("2026-02-02T08:00:00.000Z"),
    exportedBy: "Program Head, Test",
  });
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(bytes as never);
  return { workbook, evidence };
}

describe("a question bound to several Program Outcomes", () => {
  it("credits every binding, exactly as the analytics PO read does", async () => {
    const group = groupWithTwoDirectPoBindings();
    const canonical = buildOutcomeEvidenceDtos(
      aggregateOutcomeEvidence(
        buildOutcomeEvidenceRows([buildClassGroupModel(group, CILO_MAPPINGS_BY_CILO)])
      )
    );
    const exported = buildOutcomeEvidenceDtos(
      aggregateOutcomeEvidence(
        buildOutcomeEvidenceRows([buildClassGroupModel(group, CILO_MAPPINGS_BY_CILO)])
      )
    );
    // Both Program Outcomes reach the same two answers in the canonical rows...
    expect(canonical.map((row) => row.code).sort()).toEqual(["BSIT-GO2", "BSIT-GO4"]);
    expect(canonical.every((row) => row.ratingCount === 2)).toBe(true);
    // ...and the exported workbook prints both.
    const { workbook } = await workbookFor(group);
    const summary = workbook.getWorksheet("PO Summary")!;
    const headerRow = findRowByValues(summary, { 1: "PO code", 2: "PO description" });
    const codes = dataRowsAfter(summary, headerRow).map((row) =>
      cellValue(summary.getCell(row, 1))
    );
    expect(codes.sort()).toEqual(["BSIT-GO2", "BSIT-GO4"]);
    for (const code of ["BSIT-GO2", "BSIT-GO4"]) {
      const row = dataRowWith(summary, headerRow, 1, code);
      expect(numericCell(summary.getCell(row, 5)), code).toBe(2);
      expect(numericCell(summary.getCell(row, 8)), code).toBeCloseTo(4.5, 10);
    }
    expect(exported).toEqual(canonical);
  });
});

describe("a general question on its own scale", () => {
  it("prints option columns for every quantitative question, not only CILO-bound ones", async () => {
    const group = groupWithTenPointGeneralQuestion();
    const { workbook } = await workbookFor(group);
    const sheet = workbook.getWorksheet(group.courseCode)!;
    const headerRow = findRowByValues(sheet, { 1: "CILO", 2: "Question prompt" });
    const tally = dataRowWith(sheet, headerRow, 4, "general-10");

    // The option grid must reach value 10, otherwise the counts fall outside it.
    expect(cellValue(sheet.getCell(tally, 5))).toContain("1–10");
    // Answers of 8 and 10 appear in the printed columns, and they reconcile.
    const optionCount = 10;
    const optionColumns = Array.from(
      { length: optionCount },
      (_, index) => numericCell(sheet.getCell(tally, 6 + index)) ?? 0
    );
    expect(optionColumns[7]).toBe(1);
    expect(optionColumns[9]).toBe(1);
    expect(optionColumns.reduce((sum, count) => sum + count, 0)).toBe(2);
    const validColumn = 6 + optionCount;
    expect(numericCell(sheet.getCell(tally, validColumn))).toBe(2);
    expect(numericCell(sheet.getCell(tally, validColumn + 3))).toBe(18);
  });
});

describe("a CILO answered on two incompatible scales", () => {
  it("keeps the canonical distinct response count and prints a row per scale identity", () => {
    const group = groupWithMixedScaleCilo();
    const model = buildClassGroupModel(group, CILO_MAPPINGS_BY_CILO);
    const canonical = buildCiloMetrics(buildClassGroupRatingRows(group, CILO_MAPPINGS_BY_CILO))[0];

    const summary = model.ciloSummaries[0];
    // The count is canonical even though no single combined mean exists.
    expect(summary.distinctResponseCount).toBe(canonical.evidenceSummary.responseCount);
    expect(summary.distinctResponseCount).toBe(3);
    expect(summary.mean).toBeNull();
    expect(summary.scaleGroups).toHaveLength(2);
    // Per-scale response counts overlap, so they are never summed.
    const overlap = summary.scaleGroups.map((group_) => group_.ratingCount);
    expect(overlap).toEqual([2, 2]);
    expect(overlap.reduce((sum, count) => sum + count, 0)).toBeGreaterThan(
      summary.distinctResponseCount
    );
  });

  it("prints each scale identity's own mean and count in the workbook", async () => {
    const { workbook } = await workbookFor(groupWithMixedScaleCilo());
    const sheet = workbook.getWorksheet("IT101")!;
    const summaryHeader = findRowByValues(sheet, {
      1: "CILO",
      2: "CILO description",
      4: "Distinct submitted responses",
    });
    const rows = dataRowsAfter(sheet, summaryHeader);
    // Two scale identities means two printed rows for the one CILO.
    expect(rows).toHaveLength(2);

    const model = buildClassGroupModel(groupWithMixedScaleCilo(), CILO_MAPPINGS_BY_CILO);
    // One option column per rating value of the union, then the identity,
    // full-precision mean, display mean, interpretation, and CQI columns.
    const scaleValues = 5;
    const meanColumn = 6 + scaleValues + 1;
    const means = rows.map((row) => numericCell(sheet.getCell(row, meanColumn)));
    expect(means).toEqual(model.ciloSummaries[0].scaleGroups.map((group_) => group_.mean));
    for (const row of rows) {
      // Respondents are reported once per CILO, not once per scale identity.
      expect(numericCell(sheet.getCell(row, 4))).toBe(3);
    }
  });
});

describe("scale-group rows", () => {
  it("print the group's own mean and denominator instead of the pooled outcome mean", async () => {
    const group = groupWithMixedScaleCilo();
    const { workbook } = await workbookFor(group);
    const sheet = workbook.getWorksheet("PO Summary")!;
    const distributionHeader = findRowByValues(sheet, {
      1: "PO code",
      2: "Scale identity",
      7: "Scale group valid ratings",
    });
    expect(distributionHeader).toBeGreaterThan(0);

    // Every row of one scale identity prints that identity's own count and mean.
    const byScale = new Map<string, { count: number; mean: number | null; rows: number }>();
    for (const row of dataRowsAfter(sheet, distributionHeader)) {
      const key = `${cellValue(sheet.getCell(row, 1))}|${cellValue(sheet.getCell(row, 2))}`;
      const existing = byScale.get(key);
      byScale.set(key, {
        count: numericCell(sheet.getCell(row, 7)) ?? 0,
        mean: numericCell(sheet.getCell(row, 8)),
        rows: (existing?.rows ?? 0) + 1,
      });
    }

    const groups = [...byScale.entries()];
    expect(groups.length).toBeGreaterThanOrEqual(2);
    for (const [key, stats] of groups) {
      // Two ratings on each identity, and the same value on every option row.
      expect(stats.count, key).toBe(2);
      expect(stats.rows, key).toBe(5);
      expect(stats.mean, key).not.toBeNull();
    }
    // The pooled Program Outcome mean spans both identities, so per-identity
    // means must not collapse onto one value.
    expect(new Set(groups.map(([, stats]) => stats.mean)).size).toBeGreaterThan(1);
  });
});
