import { describe, expect, it } from "vitest";
import {
  aggregateOutcomeEvidence,
  buildOutcomeEvidenceDtos,
} from "@/features/analytics/aggregators/outcome-evidence";
import { classifyOutcomeDistributions } from "@/features/analytics/aggregators/outcome-attainment";
import type {
  ProgramHeadOutcomesDTO,
  ProgramHeadProgramWideOutcomeDTO,
} from "@/features/analytics/program-head-analytics-types";
import { buildPoWorkbook } from "@/features/reports/services/build-po-workbook";
import {
  attainmentStatusLabel,
  buildClassGroupModel,
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
  sheetText,
} from "./workbook-reader";

// ---------------------------------------------------------------------------
// Program Outcome report workbook
//
// The workbook prints the authorized Analytics outcomes read verbatim, so these
// tests hand it the same DTO the live service produces and assert the printed
// cells, the source separation, and the classification provenance.
// ---------------------------------------------------------------------------

const GENERATED_AT = new Date("2026-02-02T08:00:00.000Z");

/** The course-bound rows the Analytics PO read builds for this fixture scope. */
function courseBoundOutcomes(): ProgramHeadOutcomesDTO["outcomes"] {
  const models = [GROUP_IT101_MORNING, GROUP_IT101_AFTERNOON, GROUP_IT102].map((group) =>
    buildClassGroupModel(group, CILO_MAPPINGS_BY_CILO)
  );
  const aggregation = aggregateOutcomeEvidence(buildOutcomeEvidenceRows(models));
  return buildOutcomeEvidenceDtos(aggregation).map((outcome) => ({
    ...outcome,
    attainment: classifyOutcomeDistributions(
      outcome.meanRating,
      outcome.distributions,
      outcome.spansMultipleScales
    ),
  }));
}

/** Hand-built program-wide rows, shaped exactly as the Analytics read returns. */
const PROGRAM_WIDE_OUTCOMES: ProgramHeadProgramWideOutcomeDTO[] = [
  {
    stakeholder: "STUDENT",
    poId: "po-1",
    code: "BSIT-GO1",
    name: "Explain technical concepts to non-specialists",
    meanRating: 3.5,
    ratingCount: 2,
    submittedResponseCount: 2,
    evaluationCount: 1,
    questionCount: 1,
    scaleGroups: [
      {
        scaleKey: "attainment",
        scaleLabel: "1–5 (5-point)",
        meanRating: 3.5,
        ratingCount: 2,
        categories: [
          { value: 1, label: "Not Achieved", count: 0, percentage: 0 },
          { value: 2, label: "Slightly Achieved", count: 0, percentage: 0 },
          { value: 3, label: "Moderately Achieved", count: 1, percentage: 0.5 },
          { value: 4, label: "Mostly Achieved", count: 1, percentage: 0.5 },
          { value: 5, label: "Fully Achieved", count: 0, percentage: 0 },
        ],
      },
    ],
    attainment: {
      policyId: "CLOIE_OUTCOME_MEAN_V1",
      benchmark: 3.5,
      status: "classified",
      interpretation: "Attained",
      cqi: "Meets Benchmark",
      meetsBenchmark: true,
      scaleKind: "direct-attainment",
      isIndirect: false,
    },
    evidenceSummary: { ratingCount: 2, explanation: "Program-wide bound question." },
  },
  {
    stakeholder: "ALUMNI",
    poId: "po-1",
    code: "BSIT-GO1",
    name: "Explain technical concepts to non-specialists",
    meanRating: 5,
    ratingCount: 1,
    submittedResponseCount: 1,
    evaluationCount: 1,
    questionCount: 1,
    scaleGroups: [
      {
        scaleKey: "attainment",
        scaleLabel: "1–5 (5-point)",
        meanRating: 5,
        ratingCount: 1,
        categories: [{ value: 5, label: "Fully Achieved", count: 1, percentage: 1 }],
      },
    ],
    attainment: {
      policyId: "CLOIE_OUTCOME_MEAN_V1",
      benchmark: 3.5,
      status: "classified",
      interpretation: "Fully Attained",
      cqi: "Meets Benchmark",
      meetsBenchmark: true,
      scaleKind: "direct-attainment",
      isIndirect: false,
    },
    evidenceSummary: { ratingCount: 1, explanation: "Alumni bound question." },
  },
];

function outcomesDto(): ProgramHeadOutcomesDTO {
  return {
    scope: {
      programCode: "BSIT",
      programName: "Bachelor of Science in Information Technology",
      periodLabel: "2026-2027 · 1st Semester · 1st Term",
    },
    periodOptions: { schoolYears: [], semesters: [], termInstances: [] },
    emptyReason: null,
    currentMappingDisclosure:
      "Outcome rows group historical ratings using the Program's current CILO-to-PO mappings.",
    manyToManyDisclosure: true,
    outcomes: courseBoundOutcomes(),
    programWideOutcomes: PROGRAM_WIDE_OUTCOMES,
  };
}

async function buildWorkbook() {
  return buildPoWorkbook({
    evidence: reportEvidenceFixture(),
    outcomes: outcomesDto(),
    generatedAt: GENERATED_AT,
    exportedBy: "Program Head, Test",
  });
}

describe("Program Outcome report workbook", () => {
  it("carries the required worksheets in order", async () => {
    const workbook = await loadWorkbook(await buildWorkbook());
    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual([
      "Overview",
      "PO Summary",
      "PO Classification",
      "PO Rating Tallies",
      "Course and CILO Contributions",
      "Program-wide Evidence",
      "Data Dictionary",
    ]);
  });

  it("summarizes scope and prints the current-mapping disclosure", async () => {
    const workbook = await loadWorkbook(await buildWorkbook());
    const overview = workbook.getWorksheet("Overview")!;
    const text = sheetText(overview);
    expect(text).toContain("Program Outcome report");
    expect(text).toContain("2026-2027 · 1st Semester · 1st Term");
    expect(text).toContain("Publication-time mapping snapshots are not yet available");
    expect(text).toContain("map to more than one Program Outcome");
    expect(text).toContain("CONFIDENTIAL");
    expect(
      cellValue(overview.getCell(findRow(overview, "Course-bound submitted responses"), 2))
    ).toBe("8");
    expect(
      cellValue(overview.getCell(findRow(overview, "Program-wide submitted responses"), 2))
    ).toBe("4");
    expect(cellValue(overview.getCell(findRow(overview, "Program Outcomes in catalog"), 2))).toBe(
      "4"
    );
  });

  it("prints each Analytics PO row verbatim, including its unclassified status", async () => {
    const workbook = await loadWorkbook(await buildWorkbook());
    const sheet = workbook.getWorksheet("PO Summary")!;
    const headerRow = findRowByValues(sheet, { 1: "PO code", 2: "PO description" });
    const analyticsRow = (code: string) =>
      outcomesDto().outcomes.find((outcome) => outcome.code === code)!;

    for (const code of ["BSIT-GO1", "BSIT-GO2", "BSIT-GO4"]) {
      const row = dataRowWith(sheet, headerRow, 1, code);
      const source = analyticsRow(code);
      expect(cellValue(sheet.getCell(row, 1))).toBe(source.code);
      expect(cellValue(sheet.getCell(row, 2))).toBe(source.name);
      expect(numericCell(sheet.getCell(row, 6))).toBe(source.ratingCount);
      expect(numericCell(sheet.getCell(row, 7))).toBe(source.submittedResponseCount);
      expect(numericCell(sheet.getCell(row, 8))).toBe(source.excludedRatingCount);
      expect(numericCell(sheet.getCell(row, 9))).toBeCloseTo(source.meanRating as number, 10);
      expect(cellValue(sheet.getCell(row, 10))).toBe(attainmentStatusLabel(source.attainment!));
    }
  });

  it("reads the classification from the PO record, keeping legacy codes unchanged", async () => {
    const workbook = await loadWorkbook(await buildWorkbook());
    const sheet = workbook.getWorksheet("PO Classification")!;
    const headerRow = findRowByValues(sheet, { 1: "PO code", 2: "PO description" });
    const rows = dataRowsAfter(sheet, headerRow);
    expect(rows.map((row) => cellValue(sheet.getCell(row, 1)))).toEqual([
      "BSIT-GO1",
      "BSIT-GO2",
      "BSIT-GO3",
      "BSIT-GO4",
    ]);
    expect(rows.map((row) => cellValue(sheet.getCell(row, 3)))).toEqual([
      "Core",
      "Professional",
      "Common",
      "Needs classification",
    ]);
    // PO3 has no course-bound evidence in this scope.
    const go3 = dataRowWith(sheet, headerRow, 1, "BSIT-GO3");
    expect(numericCell(sheet.getCell(go3, 6))).toBe(0);
    // No published program-wide binding reached this Program Outcome.
    expect(cellValue(sheet.getCell(go3, 7))).toBe("—");
    const go1 = dataRowWith(sheet, headerRow, 1, "BSIT-GO1");
    expect(cellValue(sheet.getCell(go1, 7))).toBe("Student | Alumni");
    expect(cellValue(sheet.getCell(go1, 8))).toBe("4.00");
    expect(sheetText(sheet)).toContain("never inferred from its code");
  });

  it("prints rating tallies per scale identity and keeps sources separate", async () => {
    const workbook = await loadWorkbook(await buildWorkbook());
    const sheet = workbook.getWorksheet("PO Rating Tallies")!;
    const headerRow = findRowByValues(sheet, { 1: "PO code", 4: "Evidence source" });
    const rows = dataRowsAfter(sheet, headerRow);
    expect(rows.length).toBeGreaterThan(0);

    const courseRows = rows.filter(
      (row) => cellValue(sheet.getCell(row, 4)) === "Course-bound student"
    );
    const programWideRows = rows.filter(
      (row) => cellValue(sheet.getCell(row, 4)) !== "Course-bound student"
    );
    expect(courseRows.length).toBeGreaterThan(0);
    expect(programWideRows.map((row) => cellValue(sheet.getCell(row, 1)))).toEqual([
      "BSIT-GO1",
      "BSIT-GO1",
      "BSIT-GO1",
      "BSIT-GO1",
      "BSIT-GO1",
      "BSIT-GO1",
    ]);

    // Every PO's option counts reconcile with its printed rating count.
    const totals = new Map<string, number>();
    for (const row of courseRows) {
      const code = String(cellValue(sheet.getCell(row, 1)));
      totals.set(code, (totals.get(code) ?? 0) + (numericCell(sheet.getCell(row, 8)) ?? 0));
    }
    expect(totals.get("BSIT-GO1")).toBe(10);
    expect(totals.get("BSIT-GO2")).toBe(5);

    // A mixed-scale row reports each identity separately.
    const go1Identities = new Set(
      courseRows
        .filter((row) => cellValue(sheet.getCell(row, 1)) === "BSIT-GO1")
        .map((row) => cellValue(sheet.getCell(row, 5)))
    );
    expect(go1Identities.size).toBe(2);
  });

  it("lists course and CILO contributions with counts, means, and manifestations", async () => {
    const workbook = await loadWorkbook(await buildWorkbook());
    const sheet = workbook.getWorksheet("Course and CILO Contributions")!;
    const headerRow = findRowByValues(sheet, { 1: "PO code", 3: "Contribution type" });
    const rows = dataRowsAfter(sheet, headerRow);
    expect(rows.length).toBeGreaterThan(0);

    const types = new Set(rows.map((row) => cellValue(sheet.getCell(row, 3))));
    expect(types).toEqual(new Set(["CILO mapping", "Direct question binding"]));

    const directRow = rows.find(
      (row) => cellValue(sheet.getCell(row, 3)) === "Direct question binding"
    )!;
    expect(cellValue(sheet.getCell(directRow, 5))).toBe(
      "I keep my professional knowledge up to date."
    );
    expect(cellValue(sheet.getCell(directRow, 10))).toContain("question binding");

    const ciloRow = rows.find((row) => cellValue(sheet.getCell(row, 3)) === "CILO mapping")!;
    expect(["Learning", "Practice", "Opportunity", "—"]).toContain(
      cellValue(sheet.getCell(ciloRow, 6))
    );
    expect(numericCell(sheet.getCell(ciloRow, 8))).not.toBeNull();
  });

  it("keeps program-wide respondent categories apart from course evidence", async () => {
    const workbook = await loadWorkbook(await buildWorkbook());
    const sheet = workbook.getWorksheet("Program-wide Evidence")!;
    const headerRow = findRowByValues(sheet, { 1: "Respondent category", 2: "Evidence source" });
    const rows = dataRowsAfter(sheet, headerRow);
    expect(rows.map((row) => cellValue(sheet.getCell(row, 1)))).toEqual(["Student", "Alumni"]);
    expect(rows.map((row) => cellValue(sheet.getCell(row, 2)))).toEqual([
      "Program-wide student",
      "Alumni",
    ]);
    // The printed group means come from the program-wide rows, never the pooled
    // course-bound mean of the same PO.
    const student = dataRowWith(sheet, headerRow, 1, "Student");
    expect(numericCell(sheet.getCell(student, 11))).toBeCloseTo(3.5, 10);
    expect(cellValue(sheet.getCell(student, 13))).toBe("Attained");
    const alumni = dataRowWith(sheet, headerRow, 1, "Alumni");
    expect(numericCell(sheet.getCell(alumni, 11))).toBeCloseTo(5, 10);
    expect(sheetText(sheet)).toContain("never combined with the rows below");
  });

  it("reports deployment participation per respondent category", async () => {
    const workbook = await loadWorkbook(await buildWorkbook());
    const sheet = workbook.getWorksheet("Program-wide Evidence")!;
    const headerRow = findRowByValues(sheet, {
      1: "Deployment",
      2: "Respondent category",
      5: "Assigned respondents",
    });
    const rows = dataRowsAfter(sheet, headerRow);
    expect(rows).toHaveLength(3);
    const studentRow = dataRowWith(sheet, headerRow, 1, "Program-wide Student Evaluation v2");
    expect(cellValue(sheet.getCell(studentRow, 2))).toBe("Student");
    expect(numericCell(sheet.getCell(studentRow, 5))).toBe(2);
    expect(numericCell(sheet.getCell(studentRow, 6))).toBe(2);
    expect(numericCell(sheet.getCell(studentRow, 7))).toBe(1);
  });

  it("keeps the empty-scope note clear of the next table heading", async () => {
    // Course-bound evidence exists, Central PO evidence does not.
    const workbook = await loadWorkbook(
      await buildPoWorkbook({
        evidence: reportEvidenceFixture(),
        outcomes: { ...outcomesDto(), programWideOutcomes: [] },
        generatedAt: GENERATED_AT,
        exportedBy: "Program Head, Test",
      })
    );
    const sheet = workbook.getWorksheet("Program-wide Evidence")!;
    const text = sheetText(sheet);
    expect(text).toContain("No program-wide Program Outcome evidence exists in this scope.");
    // The note and the following section heading must not share one row.
    const noteRow = findRow(
      sheet,
      "No program-wide Program Outcome evidence exists in this scope."
    );
    const headingRow = findRow(sheet, "Deployment participation");
    expect(noteRow).toBeGreaterThan(0);
    expect(headingRow).toBeGreaterThan(noteRow);
  });

  it("documents denominators, contribution rules, and source separation", async () => {
    const workbook = await loadWorkbook(await buildWorkbook());
    const text = sheetText(workbook.getWorksheet("Data Dictionary")!);
    expect(text).toContain("Each submitted answer contributes once per");
    expect(text).toContain("PO rows are not additive");
    expect(text).toContain("never combined with course-bound evidence");
    expect(text).toContain("Valid rating count");
    expect(text).toContain("policy CLOIE_OUTCOME_MEAN_V1");
    expect(text).toContain("CONFIDENTIAL");
  });
});
