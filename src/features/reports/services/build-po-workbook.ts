import ExcelJS from "exceljs";
import type {
  ProgramHeadOutcomesDTO,
  ProgramHeadProgramWideOutcomeDTO,
} from "@/features/analytics/program-head-analytics-types";
import { buildParticipationSummary } from "@/features/analytics/aggregators/participation";
import type { OutcomeAttainment } from "@/features/analytics/aggregators/outcome-attainment";
import { formatDateTime } from "@/lib/utils/date-format";
import {
  REPORT_STAKEHOLDER_LABELS,
  reportCentralSourceLabel,
  REPORT_EVIDENCE_SOURCE_LABELS,
  type ReportEvidence,
} from "../types";
import {
  attainmentOrNoEvidence,
  attainmentStatusLabel,
  buildClassGroupModel,
  reportScaleLabelFromCategories,
  type ReportClassGroupModel,
} from "./report-tallies";
import {
  CONFIDENTIALITY_NOTICE,
  CURRENT_MAPPING_DISCLOSURE,
  PO_DICTIONARY_ROWS,
  PROPOSED_POLICY_NOTICE,
  SCOPE_NOTICE,
  SHARED_DICTIONARY_ROWS,
} from "./report-text";
import {
  applyFilter,
  applyPrintSetup,
  bandRow,
  displayMean,
  freezeHeadingRows,
  outlineTable,
  setColumnWidths,
  writeCount,
  writeHeaderRow,
  writeMean,
  writeNote,
  writePercent,
  writeSectionHeading,
  writeStatus,
  writeText,
  writeTitleBlock,
  writeUnavailable,
  writeWrappedText,
  type HeaderCell,
} from "./workbook-kit";

// ---------------------------------------------------------------------------
// Program Outcome report workbook
//
// Program-level PO evidence for one authorized Program and academic period.
// Course-bound evidence and program-wide (Central) evidence are reported in
// separate sheets, source-separated by respondent category, and never combined
// into one mean. PO numbers come from the authorized Analytics outcomes read, so
// an export and the live Outcomes view can never disagree.
// ---------------------------------------------------------------------------

export type PoWorkbookInput = {
  evidence: ReportEvidence;
  outcomes: ProgramHeadOutcomesDTO;
  generatedAt: Date;
  exportedBy: string;
};

/** Program Outcome rows always carry a classification; absent means no evidence. */
function poAttainment(outcome: { attainment?: OutcomeAttainment }): OutcomeAttainment {
  return attainmentOrNoEvidence(outcome.attainment);
}

/**
 * Classification lookup for PO rows. A live PO id resolves directly. A frozen
 * publication-snapshot identity resolves through its exact code inside the same
 * Program, whose codes are unique per Program: that is a lookup of the same
 * record, not a classification inferred from a code's shape. Anything else keeps
 * its neutral "Not available" label.
 */
function classificationLookup(evidence: ReportEvidence): Map<string, string> {
  const lookup = new Map<string, string>();
  for (const outcome of evidence.outcomes) {
    lookup.set(outcome.id, outcome.classificationLabel);
    lookup.set(`code:${outcome.code}`, outcome.classificationLabel);
  }
  return lookup;
}

function classificationOf(lookup: Map<string, string>, poId: string, poCode: string): string {
  return lookup.get(poId) ?? lookup.get(`code:${poCode}`) ?? "Not available";
}

function writeOverviewSheet(
  worksheet: ExcelJS.Worksheet,
  { evidence, outcomes, generatedAt, exportedBy }: PoWorkbookInput,
  models: ReportClassGroupModel[]
): void {
  setColumnWidths(worksheet, [{ width: 32 }, { width: 60 }, { width: 22 }, { width: 22 }]);
  const courseResponses = new Set<string>();
  let courseAnswerCount = 0;
  for (const model of models) {
    for (const response of model.group.responses) {
      courseResponses.add(response.responseId);
      courseAnswerCount += response.answers.length;
    }
  }
  const centralResponses = new Set<string>();
  let centralAnswerCount = 0;
  for (const group of evidence.centralGroups) {
    for (const response of group.responses) {
      centralResponses.add(response.responseId);
      centralAnswerCount += response.answers.length;
    }
  }

  let row = writeTitleBlock(worksheet, [
    { text: "System CLOIE", size: 12, bold: true },
    { text: "Program Outcome report", size: 16, bold: true },
    { text: `Program: ${evidence.programCode} — ${evidence.programName}` },
    { text: `Academic period: ${evidence.period.label}` },
    { text: `Generated: ${formatDateTime(generatedAt)} by ${exportedBy}` },
    { text: CONFIDENTIALITY_NOTICE, size: 9, color: "FF7F1D1D" },
  ]);
  row += 1;

  row = writeSectionHeading(worksheet, row, "Scope summary");
  row = writeHeaderRow(worksheet, row, [{ text: "Measure" }, { text: "Value" }]);
  const summaryRows: Array<[string, string]> = [
    [
      "Courses with course-bound evidence",
      String(new Set(models.map((m) => m.group.courseCode)).size),
    ],
    ["Class groups with course-bound evidence", String(models.length)],
    ["Course-bound submitted responses", String(courseResponses.size)],
    ["Course-bound quantitative answers", String(courseAnswerCount)],
    ["Program-wide submitted responses", String(centralResponses.size)],
    ["Program-wide quantitative answers", String(centralAnswerCount)],
    ["Course-bound Program Outcome rows", String(outcomes.outcomes.length)],
    ["Program-wide Program Outcome rows", String(outcomes.programWideOutcomes.length)],
    ["Program Outcomes in catalog", String(evidence.outcomes.length)],
  ];
  for (const [label, value] of summaryRows) {
    writeText(worksheet, row, 1, label);
    writeText(worksheet, row, 2, value);
    row += 1;
  }
  row += 1;

  row = writeSectionHeading(worksheet, row, "Sheet index");
  row = writeHeaderRow(worksheet, row, [{ text: "Sheet" }, { text: "Contents", wrap: true }]);
  const sheets: Array<[string, string]> = [
    ["PO Summary", "Course-bound Program Outcome evidence with distributions and interpretation."],
    [
      "PO Classification",
      "The Program's Program Outcome catalog with its recorded classification and evidence counts.",
    ],
    [
      "PO Rating Tallies",
      "Per scale identity and rating option counts behind every Program Outcome row.",
    ],
    [
      "Course and CILO Contributions",
      "Per course and CILO contributions with counts, means, and manifestations.",
    ],
    ["Program-wide Evidence", "Central deployment evidence, separated by respondent category."],
    ["Data Dictionary", "Definitions of every column, denominator, and rule used."],
  ];
  for (const [sheet, contents] of sheets) {
    writeText(worksheet, row, 1, sheet);
    writeWrappedText(worksheet, row, 2, contents);
    row += 1;
  }
  row += 1;

  row = writeSectionHeading(worksheet, row, "Disclosures");
  row = writeNote(worksheet, row, SCOPE_NOTICE);
  row = writeNote(worksheet, row, PROPOSED_POLICY_NOTICE);
  row = writeNote(worksheet, row, CURRENT_MAPPING_DISCLOSURE);
  row = writeNote(
    worksheet,
    row,
    outcomes.manyToManyDisclosure
      ? "Some CILOs map to more than one Program Outcome in this Program, so each mapped Program Outcome receives the same rating and outcome rows are not additive across Program Outcomes."
      : "No CILO in this scope maps to more than one Program Outcome."
  );

  freezeHeadingRows(worksheet, 4);
  applyPrintSetup(worksheet, 4);
}

function writePoSummarySheet(worksheet: ExcelJS.Worksheet, input: PoWorkbookInput): void {
  setColumnWidths(worksheet, [
    { width: 20 },
    { width: 46 },
    { width: 20 },
    { width: 30 },
    { width: 14 },
    { width: 16 },
    { width: 14 },
    { width: 18 },
    { width: 14 },
    { width: 24 },
    { width: 18 },
    { width: 30 },
  ]);
  const { evidence, outcomes } = input;
  const classifications = classificationLookup(evidence);
  let row = writeTitleBlock(worksheet, [
    { text: "System CLOIE", size: 12, bold: true },
    { text: "Program Outcome summary — course-bound evidence", size: 14, bold: true },
    { text: `Program: ${evidence.programCode} — ${evidence.programName}` },
    { text: `Academic period: ${evidence.period.label}` },
    { text: CONFIDENTIALITY_NOTICE, size: 9, color: "FF7F1D1D" },
  ]);
  row += 1;
  row = writeNote(worksheet, row, CURRENT_MAPPING_DISCLOSURE);
  row = writeNote(worksheet, row, PROPOSED_POLICY_NOTICE);
  row += 1;

  const headers: HeaderCell[] = [
    { text: "PO code" },
    { text: "PO description", wrap: true },
    { text: "PO classification" },
    { text: "Contributing courses" },
    { text: "Contributing CILOs" },
    { text: "Valid rating count" },
    { text: "Distinct submitted responses" },
    { text: "Excluded rating count" },
    { text: "Mean (full precision)" },
    { text: "Interpretation" },
    { text: "CQI status" },
    { text: "Contributing evaluations" },
  ];
  const headerRow = row;
  row = writeHeaderRow(worksheet, row, headers);
  const firstDataRow = row;
  outcomes.outcomes.forEach((outcome, index) => {
    writeText(worksheet, row, 1, outcome.code);
    writeWrappedText(worksheet, row, 2, outcome.name);
    writeText(
      worksheet,
      row,
      3,
      classificationOf(classifications, outcome.outcomeId, outcome.code)
    );
    writeText(
      worksheet,
      row,
      4,
      outcome.contributingCourses.map((course) => course.code).join(" | ") || "—"
    );
    writeText(
      worksheet,
      row,
      5,
      outcome.contributingCilos.map((cilo) => cilo.description).join(" | ") || "—"
    );
    writeCount(worksheet, row, 6, outcome.ratingCount);
    writeCount(worksheet, row, 7, outcome.submittedResponseCount);
    writeCount(worksheet, row, 8, outcome.excludedRatingCount);
    writeMean(worksheet, row, 9, outcome.meanRating);
    writeText(worksheet, row, 10, attainmentStatusLabel(poAttainment(outcome)));
    writeStatus(
      worksheet,
      row,
      11,
      poAttainment(outcome).cqi ?? "Unclassified",
      poAttainment(outcome).cqi
    );
    writeText(
      worksheet,
      row,
      12,
      outcome.evidenceEvaluations.map((entry) => entry.deploymentName).join(" | ") || "—"
    );
    bandRow(worksheet, row, headers.length, index % 2 === 1);
    row += 1;
  });
  outlineTable(worksheet, headerRow, row - 1, headers.length);
  applyFilter(worksheet, headerRow, firstDataRow, row - 1, headers.length);
  if (outcomes.outcomes.length === 0) {
    row += 1;
    row = writeNote(
      worksheet,
      row,
      "No course-bound Program Outcome evidence exists in this scope."
    );
  }
  row += 1;
  row = writeNote(
    worksheet,
    row,
    "A Program Outcome whose ratings span incompatible scale identities has no single mean; each identity keeps its own mean, counts, and distribution on the PO Rating Tallies sheet."
  );
  freezeHeadingRows(worksheet, 6);
  applyPrintSetup(worksheet, 6);
}

function writeClassificationSheet(worksheet: ExcelJS.Worksheet, input: PoWorkbookInput): void {
  setColumnWidths(worksheet, [
    { width: 22 },
    { width: 56 },
    { width: 22 },
    { width: 14 },
    { width: 12 },
    { width: 18 },
    { width: 22 },
    { width: 22 },
  ]);
  const { evidence, outcomes } = input;
  const courseRowByPoId = new Map(outcomes.outcomes.map((outcome) => [outcome.outcomeId, outcome]));
  const programWideByPoId = new Map<string, ProgramHeadProgramWideOutcomeDTO[]>();
  for (const row of outcomes.programWideOutcomes) {
    programWideByPoId.set(row.poId, [...(programWideByPoId.get(row.poId) ?? []), row]);
  }

  let row = writeTitleBlock(worksheet, [
    { text: "System CLOIE", size: 12, bold: true },
    { text: "Program Outcome classification", size: 14, bold: true },
    { text: `Program: ${evidence.programCode} — ${evidence.programName}` },
    { text: `Academic period: ${evidence.period.label}` },
  ]);
  row += 1;
  row = writeNote(
    worksheet,
    row,
    "Classification is read from the Program Outcome record itself and is never inferred from its code. Persisted codes, including legacy GO-era codes, are printed unchanged."
  );
  row += 1;

  const headers: HeaderCell[] = [
    { text: "PO code" },
    { text: "PO description", wrap: true },
    { text: "Classification" },
    { text: "Active" },
    { text: "Order" },
    { text: "Course-bound valid ratings" },
    { text: "Program-wide respondent categories" },
    { text: "Course-bound mean (2 dp)" },
  ];
  const headerRow = row;
  row = writeHeaderRow(worksheet, row, headers);
  const firstDataRow = row;
  evidence.outcomes.forEach((outcome, index) => {
    const courseRow = courseRowByPoId.get(outcome.id);
    const programWideRows = programWideByPoId.get(outcome.id) ?? [];
    writeText(worksheet, row, 1, outcome.code);
    writeWrappedText(worksheet, row, 2, outcome.description);
    writeText(worksheet, row, 3, outcome.classificationLabel);
    writeText(worksheet, row, 4, outcome.isActive ? "Yes" : "No");
    writeCount(worksheet, row, 5, outcome.order);
    writeCount(worksheet, row, 6, courseRow?.ratingCount ?? 0);
    writeText(
      worksheet,
      row,
      7,
      [
        ...new Set(programWideRows.map((entry) => REPORT_STAKEHOLDER_LABELS[entry.stakeholder])),
      ].join(" | ") || "—"
    );
    writeText(worksheet, row, 8, displayMean(courseRow?.meanRating ?? null) ?? "—");
    bandRow(worksheet, row, headers.length, index % 2 === 1);
    row += 1;
  });
  outlineTable(worksheet, headerRow, row - 1, headers.length);
  applyFilter(worksheet, headerRow, firstDataRow, row - 1, headers.length);

  row += 1;
  row = writeSectionHeading(worksheet, row, "Classification reference");
  row = writeHeaderRow(worksheet, row, [
    { text: "Classification" },
    { text: "Meaning", wrap: true },
  ]);
  const reference: Array<[string, string]> = [
    [
      "Common",
      "Adopted from the college-wide Common Program Outcome catalog. Curriculum coverage, not attainment evidence.",
    ],
    ["Core", "Program-owned core outcome, authored by the Program Head."],
    ["Professional", "Program-owned professional outcome, authored by the Program Head."],
    [
      "Institution-specific",
      "Program-owned institution-specific outcome; not an Institutional Learning Outcome.",
    ],
    [
      "Needs classification",
      "Migration-only compatibility state. No classification is claimed for this record.",
    ],
  ];
  for (const [classification, meaning] of reference) {
    writeText(worksheet, row, 1, classification);
    writeWrappedText(worksheet, row, 2, meaning);
    row += 1;
  }
  freezeHeadingRows(worksheet, 5);
  applyPrintSetup(worksheet, 5);
}

function writeRatingTalliesSheet(worksheet: ExcelJS.Worksheet, input: PoWorkbookInput): void {
  setColumnWidths(worksheet, [
    { width: 20 },
    { width: 24 },
    { width: 46 },
    { width: 22 },
    { width: 20 },
    { width: 12 },
    { width: 22 },
    { width: 12 },
    { width: 14 },
    { width: 18 },
    { width: 14 },
    { width: 24 },
    { width: 18 },
  ]);
  const { evidence, outcomes } = input;
  const classifications = classificationLookup(evidence);
  let row = writeTitleBlock(worksheet, [
    { text: "System CLOIE", size: 12, bold: true },
    { text: "Program Outcome rating tallies", size: 14, bold: true },
    { text: `Program: ${evidence.programCode} — ${evidence.programName}` },
    { text: `Academic period: ${evidence.period.label}` },
    { text: CONFIDENTIALITY_NOTICE, size: 9, color: "FF7F1D1D" },
  ]);
  row += 1;

  const headers: HeaderCell[] = [
    { text: "PO code" },
    { text: "PO classification" },
    { text: "PO description", wrap: true },
    { text: "Evidence source" },
    { text: "Scale identity" },
    { text: "Rating value" },
    { text: "Descriptor" },
    { text: "Count" },
    { text: "Percentage" },
    { text: "Valid rating count" },
    { text: "Excluded rating count" },
    { text: "Mean (full precision)" },
    { text: "Mean (2 dp)" },
    { text: "Interpretation" },
  ];
  const rowStart = row;
  row = writeHeaderRow(worksheet, row, [...headers, { text: "CQI status" }]);
  const firstDataRow = row;
  const totalColumns = headers.length + 1;

  for (const outcome of outcomes.outcomes) {
    for (const distribution of outcome.distributions) {
      for (const category of distribution.categories) {
        writeText(worksheet, row, 1, outcome.code);
        writeText(
          worksheet,
          row,
          2,
          classificationOf(classifications, outcome.outcomeId, outcome.code)
        );
        writeWrappedText(worksheet, row, 3, outcome.name);
        writeText(worksheet, row, 4, REPORT_EVIDENCE_SOURCE_LABELS.COURSE_STUDENT);
        writeText(worksheet, row, 5, reportScaleLabelFromCategories(distribution.categories));
        writeCount(worksheet, row, 6, category.value);
        writeText(worksheet, row, 7, category.label ?? String(category.value));
        writeCount(worksheet, row, 8, category.count);
        writePercent(worksheet, row, 9, category.percentage);
        writeCount(worksheet, row, 10, outcome.ratingCount);
        writeCount(worksheet, row, 11, outcome.excludedRatingCount);
        writeMean(worksheet, row, 12, outcome.meanRating);
        writeText(worksheet, row, 13, displayMean(outcome.meanRating) ?? "—");
        writeText(worksheet, row, 14, attainmentStatusLabel(poAttainment(outcome)));
        writeStatus(
          worksheet,
          row,
          totalColumns,
          poAttainment(outcome).cqi ?? "Unclassified",
          poAttainment(outcome).cqi
        );
        row += 1;
      }
    }
  }

  for (const outcome of outcomes.programWideOutcomes) {
    for (const group of outcome.scaleGroups) {
      for (const category of group.categories) {
        writeText(worksheet, row, 1, outcome.code);
        writeText(worksheet, row, 2, classifications.get(outcome.poId) ?? "Not available");
        writeWrappedText(worksheet, row, 3, outcome.name);
        writeText(
          worksheet,
          row,
          4,
          REPORT_EVIDENCE_SOURCE_LABELS[reportCentralSourceLabel(outcome.stakeholder)]
        );
        writeText(worksheet, row, 5, reportScaleLabelFromCategories(group.categories));
        writeCount(worksheet, row, 6, category.value);
        writeText(worksheet, row, 7, category.label);
        writeCount(worksheet, row, 8, category.count);
        writePercent(worksheet, row, 9, category.percentage);
        writeCount(worksheet, row, 10, outcome.ratingCount);
        writeUnavailable(worksheet, row, 11, "Not reported");
        writeMean(worksheet, row, 12, outcome.meanRating);
        writeText(worksheet, row, 13, displayMean(outcome.meanRating) ?? "—");
        writeText(worksheet, row, 14, attainmentStatusLabel(poAttainment(outcome)));
        writeStatus(
          worksheet,
          row,
          totalColumns,
          poAttainment(outcome).cqi ?? "Unclassified",
          poAttainment(outcome).cqi
        );
        row += 1;
      }
    }
  }

  outlineTable(worksheet, rowStart, row - 1, totalColumns);
  applyFilter(worksheet, rowStart, firstDataRow, row - 1, totalColumns);
  if (firstDataRow === row) {
    row = writeNote(worksheet, row + 1, "No Program Outcome rating evidence exists in this scope.");
  }
  freezeHeadingRows(worksheet, 6);
  applyPrintSetup(worksheet, 6);
}

function writeContributionsSheet(worksheet: ExcelJS.Worksheet, input: PoWorkbookInput): void {
  setColumnWidths(worksheet, [
    { width: 20 },
    { width: 46 },
    { width: 18 },
    { width: 22 },
    { width: 44 },
    { width: 18 },
    { width: 16 },
    { width: 16 },
    { width: 14 },
    { width: 30 },
  ]);
  const { evidence, outcomes } = input;
  let row = writeTitleBlock(worksheet, [
    { text: "System CLOIE", size: 12, bold: true },
    { text: "Course and CILO contributions", size: 14, bold: true },
    { text: `Program: ${evidence.programCode} — ${evidence.programName}` },
    { text: `Academic period: ${evidence.period.label}` },
  ]);
  row += 1;
  row = writeNote(worksheet, row, CURRENT_MAPPING_DISCLOSURE);
  row += 1;

  const headers: HeaderCell[] = [
    { text: "PO code" },
    { text: "PO description", wrap: true },
    { text: "Contribution type" },
    { text: "Course" },
    { text: "Contributor" },
    { text: "Manifestation" },
    { text: "Valid rating count" },
    { text: "Mean (full precision)" },
    { text: "Mean (2 dp)" },
    { text: "Evidence provenance" },
  ];
  const headerRow = row;
  row = writeHeaderRow(worksheet, row, headers);
  const firstDataRow = row;
  let index = 0;
  for (const outcome of outcomes.outcomes) {
    for (const contributor of outcome.contributors) {
      const isCilo = contributor.kind === "CILO";
      writeText(worksheet, row, 1, outcome.code);
      writeWrappedText(worksheet, row, 2, outcome.name);
      writeText(worksheet, row, 3, isCilo ? "CILO mapping" : "Direct question binding");
      writeText(worksheet, row, 4, contributor.course?.code ?? "—");
      writeWrappedText(
        worksheet,
        row,
        5,
        isCilo
          ? `${contributor.ciloCode} — ${contributor.ciloDescription}`
          : contributor.questionPrompt
      );
      writeText(
        worksheet,
        row,
        6,
        isCilo && contributor.manifestation
          ? contributor.manifestation.charAt(0) + contributor.manifestation.slice(1).toLowerCase()
          : "—"
      );
      writeCount(worksheet, row, 7, contributor.ratingCount);
      writeMean(worksheet, row, 8, contributor.meanRating);
      writeText(worksheet, row, 9, displayMean(contributor.meanRating) ?? "—");
      writeText(
        worksheet,
        row,
        10,
        isCilo
          ? "Course-bound CILO question binding"
          : `${contributor.deploymentName} · question binding`
      );
      bandRow(worksheet, row, headers.length, index % 2 === 1);
      index += 1;
      row += 1;
    }
  }
  outlineTable(worksheet, headerRow, row - 1, headers.length);
  applyFilter(worksheet, headerRow, firstDataRow, row - 1, headers.length);
  if (firstDataRow === row) {
    row = writeNote(
      worksheet,
      row + 1,
      "No course-bound contribution evidence exists in this scope."
    );
  }
  freezeHeadingRows(worksheet, 5);
  applyPrintSetup(worksheet, 5);
}

function writeProgramWideSheet(worksheet: ExcelJS.Worksheet, input: PoWorkbookInput): void {
  setColumnWidths(worksheet, [
    { width: 22 },
    { width: 24 },
    { width: 20 },
    { width: 46 },
    { width: 26 },
    { width: 20 },
    { width: 20 },
    { width: 16 },
    { width: 16 },
    { width: 16 },
    { width: 18 },
    { width: 18 },
    { width: 24 },
    { width: 18 },
    { width: 40 },
  ]);
  const { evidence, outcomes } = input;
  const classifications = classificationLookup(evidence);
  let row = writeTitleBlock(worksheet, [
    { text: "System CLOIE", size: 12, bold: true },
    { text: "Program-wide evidence", size: 14, bold: true },
    { text: `Program: ${evidence.programCode} — ${evidence.programName}` },
    { text: `Academic period: ${evidence.period.label}` },
    { text: CONFIDENTIALITY_NOTICE, size: 9, color: "FF7F1D1D" },
  ]);
  row += 1;
  row = writeNote(
    worksheet,
    row,
    "Evidence sources are kept separate because they use different instruments and respondent populations. Course-bound student evidence is reported on the PO Summary sheet and is never combined with the rows below."
  );
  row += 1;

  const rowStart = row;
  row = writeHeaderRow(worksheet, row, [
    { text: "Respondent category" },
    { text: "Evidence source" },
    { text: "PO code" },
    { text: "PO description", wrap: true },
    { text: "PO classification" },
    { text: "Deployments", wrap: true },
    { text: "Scale identity" },
    { text: "Valid rating count" },
    { text: "Submitted responses" },
    { text: "Bound questions" },
    { text: "Mean (full precision)" },
    { text: "Mean (2 dp)" },
    { text: "Interpretation" },
    { text: "CQI status" },
    { text: "Deployment context", wrap: true },
  ]);
  const firstDataRow = row;
  const deploymentsByStakeholder = new Map<string, string[]>();
  for (const group of evidence.centralGroups) {
    const key = REPORT_STAKEHOLDER_LABELS[group.targetStakeholder];
    deploymentsByStakeholder.set(key, [
      ...(deploymentsByStakeholder.get(key) ?? []),
      `${group.deploymentName} (${group.deploymentStatus}, assigned ${group.assignedRespondentCount}, submitted ${group.responses.length})`,
    ]);
  }
  for (const outcome of outcomes.programWideOutcomes) {
    const category = REPORT_STAKEHOLDER_LABELS[outcome.stakeholder];
    for (const group of outcome.scaleGroups) {
      writeText(worksheet, row, 1, category);
      writeText(
        worksheet,
        row,
        2,
        REPORT_EVIDENCE_SOURCE_LABELS[reportCentralSourceLabel(outcome.stakeholder)]
      );
      writeText(worksheet, row, 3, outcome.code);
      writeWrappedText(worksheet, row, 4, outcome.name);
      writeText(worksheet, row, 5, classificationOf(classifications, outcome.poId, outcome.code));
      writeCount(worksheet, row, 6, outcome.evaluationCount);
      writeText(worksheet, row, 7, reportScaleLabelFromCategories(group.categories));
      writeCount(worksheet, row, 8, group.ratingCount);
      writeCount(worksheet, row, 9, outcome.submittedResponseCount);
      writeCount(worksheet, row, 10, outcome.questionCount);
      writeMean(worksheet, row, 11, group.meanRating);
      writeText(worksheet, row, 12, displayMean(group.meanRating) ?? "—");
      writeText(worksheet, row, 13, attainmentStatusLabel(poAttainment(outcome)));
      writeStatus(
        worksheet,
        row,
        14,
        poAttainment(outcome).cqi ?? "Unclassified",
        poAttainment(outcome).cqi
      );
      writeWrappedText(
        worksheet,
        row,
        15,
        deploymentsByStakeholder.get(category)?.join(" | ") ?? "—"
      );
      row += 1;
    }
  }
  outlineTable(worksheet, rowStart, row - 1, 15);
  applyFilter(worksheet, rowStart, firstDataRow, row - 1, 15);
  if (firstDataRow === row) {
    row = writeNote(
      worksheet,
      row + 1,
      "No program-wide Program Outcome evidence exists in this scope."
    );
  }

  row += 1;
  row = writeSectionHeading(worksheet, row, "Deployment participation");
  const participationHeaders: HeaderCell[] = [
    { text: "Deployment" },
    { text: "Respondent category" },
    { text: "Status" },
    { text: "Instrument version" },
    { text: "Assigned respondents" },
    { text: "Submitted responses" },
    { text: "Response rate" },
  ];
  const participationHeaderRow = row;
  row = writeHeaderRow(worksheet, row, participationHeaders);
  const participationFirstRow = row;
  for (const group of evidence.centralGroups) {
    const participation = buildParticipationSummary(
      group.submissions.map((submission) => ({
        respondentId: submission.respondentId,
        stakeholder: group.targetStakeholder,
        responseStatus: submission.responseStatus,
      }))
    );
    writeText(worksheet, row, 1, group.deploymentName);
    writeText(worksheet, row, 2, REPORT_STAKEHOLDER_LABELS[group.targetStakeholder]);
    writeText(worksheet, row, 3, group.deploymentStatus);
    writeText(worksheet, row, 4, group.instrumentLabel);
    writeCount(worksheet, row, 5, participation.assigned);
    writeCount(worksheet, row, 6, participation.submitted);
    if (participation.completionRate === null) {
      writeUnavailable(worksheet, row, 7, "Unavailable");
    } else {
      writePercent(worksheet, row, 7, participation.completionRate);
    }
    row += 1;
  }
  outlineTable(worksheet, participationHeaderRow, row - 1, participationHeaders.length);
  applyFilter(
    worksheet,
    participationHeaderRow,
    participationFirstRow,
    row - 1,
    participationHeaders.length
  );
  freezeHeadingRows(worksheet, 6);
  applyPrintSetup(worksheet, 6);
}

function writeDataDictionarySheet(
  worksheet: ExcelJS.Worksheet,
  rows: ReadonlyArray<readonly [string, string]>
): void {
  setColumnWidths(worksheet, [{ width: 30 }, { width: 110 }]);
  let row = writeTitleBlock(worksheet, [
    { text: "System CLOIE", size: 12, bold: true },
    { text: "Data dictionary", size: 14, bold: true },
    { text: CONFIDENTIALITY_NOTICE, size: 9, color: "FF7F1D1D" },
  ]);
  row += 1;
  row = writeNote(worksheet, row, PROPOSED_POLICY_NOTICE);
  const headerRow = row;
  row = writeHeaderRow(worksheet, row, [{ text: "Field" }, { text: "Meaning", wrap: true }]);
  const firstDataRow = row;
  for (const [field, meaning] of rows) {
    writeText(worksheet, row, 1, field);
    writeWrappedText(worksheet, row, 2, meaning);
    row += 1;
  }
  outlineTable(worksheet, headerRow, row - 1, 2);
  applyFilter(worksheet, headerRow, firstDataRow, row - 1, 2);
  freezeHeadingRows(worksheet, 3);
  applyPrintSetup(worksheet, 3);
}

/** Build the program-level Program Outcome report workbook. */
export async function buildPoWorkbook(input: PoWorkbookInput): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "System CLOIE";
  workbook.created = input.generatedAt;
  const models = input.evidence.courseGroups.map((group) =>
    buildClassGroupModel(group, input.evidence.ciloMappings)
  );

  const overview = workbook.addWorksheet("Overview");
  writeOverviewSheet(overview, input, models);
  const summary = workbook.addWorksheet("PO Summary");
  writePoSummarySheet(summary, input);
  const classification = workbook.addWorksheet("PO Classification");
  writeClassificationSheet(classification, input);
  const tallies = workbook.addWorksheet("PO Rating Tallies");
  writeRatingTalliesSheet(tallies, input);
  const contributions = workbook.addWorksheet("Course and CILO Contributions");
  writeContributionsSheet(contributions, input);
  const programWide = workbook.addWorksheet("Program-wide Evidence");
  writeProgramWideSheet(programWide, input);
  const dictionary = workbook.addWorksheet("Data Dictionary");
  writeDataDictionarySheet(dictionary, [...SHARED_DICTIONARY_ROWS, ...PO_DICTIONARY_ROWS]);

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
