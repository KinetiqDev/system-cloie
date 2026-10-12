import ExcelJS from "exceljs";
import {
  aggregateOutcomeEvidence,
  buildOutcomeEvidenceDtos,
} from "@/features/analytics/aggregators/outcome-evidence";
import { classifyOutcomeDistributions } from "@/features/analytics/aggregators/outcome-attainment";
import { resolveItemScaleIdentity } from "@/features/analytics/aggregators/scale-identity";
import { encodeQuestionKey } from "@/features/analytics/aggregators/question-identity";
import { formatDateTime } from "@/lib/utils/date-format";
import type { ReportCourseGroup, ReportEvidence } from "../types";
import { REPORT_MANIFESTATION_LABELS, REPORT_NAME_UNAVAILABLE } from "../types";
import {
  attainmentStatusLabel,
  buildClassGroupModel,
  buildOutcomeEvidenceRows,
  reportScaleLabelFromCategories,
  type ReportClassGroupModel,
} from "./report-tallies";
import {
  CONFIDENTIALITY_NOTICE,
  COURSE_DICTIONARY_ROWS,
  CURRENT_MAPPING_DISCLOSURE,
  PROPOSED_POLICY_NOTICE,
  SCOPE_NOTICE,
  SHARED_DICTIONARY_ROWS,
  YEAR_LEVEL_NOTICE,
} from "./report-text";
import {
  applyFilter,
  applyPrintSetup,
  bandRow,
  displayMean,
  freezeHeadingRows,
  outlineTable,
  safeSheetName,
  setColumnWidths,
  writeCount,
  writeHeaderRow,
  writeMean,
  writeNote,
  writeNumber,
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
// Course evaluation workbook
//
// One worksheet per in-scope Professional Course. Each course worksheet stacks
// its class groups, and every class group carries its own course information,
// alignment, question tallies, CILO summaries, and raw response block: two
// faculty members or two sections of one course are never merged.
// ---------------------------------------------------------------------------

export type CourseWorkbookInput = {
  evidence: ReportEvidence;
  generatedAt: Date;
  exportedBy: string;
};

/** Distinct rating values of one class group, in ascending order. */
function scaleValuesOf(group: ReportCourseGroup): number[] {
  const values = new Set<number>();
  for (const binding of group.ciloBindings) {
    for (const descriptor of descriptorsOf(group, binding.sectionKey, binding.itemKey)) {
      values.add(descriptor.value);
    }
  }
  return [...values].sort((left, right) => left - right);
}

function descriptorsOf(
  group: ReportCourseGroup,
  sectionKey: string,
  itemKey: string
): Array<{ value: number; label: string | null }> {
  const scale = resolveItemScaleIdentity(group.structureSnapshot, sectionKey, itemKey);
  return scale?.descriptors ?? [];
}

function countColumnHeaders(values: number[]): HeaderCell[] {
  return values.map((value) => ({ text: `n = ${value}` }));
}

function writeDistributionCounts(
  worksheet: ExcelJS.Worksheet,
  row: number,
  startColumn: number,
  categories: Array<{ value: number; label: string; count: number; percentage: number }>,
  scaleValues: number[]
): void {
  const byValue = new Map(categories.map((category) => [category.value, category]));
  scaleValues.forEach((value, index) => {
    const category = byValue.get(value);
    // A value outside this question's scale identity has no count to report.
    writeCount(worksheet, row, startColumn + index, category ? category.count : 0);
  });
}

/** Course-level identity block shared by every worksheet of this workbook. */
function writeReportHeaderBlock(worksheet: ExcelJS.Worksheet, lines: string[]): number {
  let row = writeTitleBlock(worksheet, [
    { text: "System CLOIE", size: 12, bold: true },
    { text: "Course evaluation workbook", size: 16, bold: true },
    ...lines.map((text) => ({ text })),
    { text: CONFIDENTIALITY_NOTICE, size: 9, color: "FF7F1D1D" },
  ]);
  row += 1;
  return row;
}

function writeKeyValueBlock(
  worksheet: ExcelJS.Worksheet,
  startRow: number,
  title: string,
  entries: Array<[string, string]>
): number {
  let row = writeSectionHeading(worksheet, startRow, title);
  row = writeHeaderRow(worksheet, row, [{ text: "Field" }, { text: "Value", wrap: true }]);
  for (const [label, value] of entries) {
    writeText(worksheet, row, 1, label);
    writeWrappedText(worksheet, row, 2, value);
    row += 1;
  }
  return row + 1;
}

function writeClassGroupTable(
  worksheet: ExcelJS.Worksheet,
  startRow: number,
  models: ReportClassGroupModel[]
): number {
  let row = writeSectionHeading(worksheet, startRow, "B. Class group information");
  const headers: HeaderCell[] = [
    { text: "Faculty member" },
    { text: "Section" },
    { text: "Evaluation" },
    { text: "Status" },
    { text: "Instrument version" },
    { text: "Assigned respondents" },
    { text: "Submitted responses" },
    { text: "Response rate" },
  ];
  const headerRow = row;
  row = writeHeaderRow(worksheet, row, headers);
  const firstDataRow = row;
  models.forEach((model, index) => {
    const { group, participation } = model;
    writeText(worksheet, row, 1, group.facultyName);
    writeText(worksheet, row, 2, group.section);
    writeText(worksheet, row, 3, group.evaluationName);
    writeText(worksheet, row, 4, group.evaluationStatus);
    writeText(worksheet, row, 5, group.instrumentLabel);
    writeCount(worksheet, row, 6, participation.assignedRespondentCount);
    writeCount(worksheet, row, 7, participation.submittedResponseCount);
    if (participation.responseRate === null) {
      writeUnavailable(worksheet, row, 8, "Unavailable");
    } else {
      writePercent(worksheet, row, 8, participation.responseRate);
    }
    bandRow(worksheet, row, headers.length, index % 2 === 1);
    row += 1;
  });
  outlineTable(worksheet, headerRow, row - 1, headers.length);
  applyFilter(worksheet, headerRow, firstDataRow, row - 1, headers.length);
  return row + 1;
}

function writeAlignmentTables(
  worksheet: ExcelJS.Worksheet,
  startRow: number,
  model: ReportClassGroupModel
): number {
  let row = writeSectionHeading(worksheet, startRow, "C. CILO and Program Outcome alignment");

  const ciloHeaders: HeaderCell[] = [
    { text: "CILO" },
    { text: "CILO description", wrap: true },
    { text: "PO codes" },
    { text: "PO descriptions", wrap: true },
    { text: "PO classification" },
    { text: "Manifestation" },
    { text: "Contributing questions" },
  ];
  const ciloHeaderRow = row;
  row = writeHeaderRow(worksheet, row, ciloHeaders);
  model.ciloSummaries.forEach((summary, index) => {
    writeText(worksheet, row, 1, summary.ciloLabel);
    writeWrappedText(worksheet, row, 2, summary.ciloDescription || "—");
    writeText(
      worksheet,
      row,
      3,
      summary.mappings.map((mapping) => mapping.poCode).join(" | ") || "—"
    );
    writeWrappedText(
      worksheet,
      row,
      4,
      summary.mappings.map((mapping) => mapping.poDescription).join(" | ") || "—"
    );
    writeText(
      worksheet,
      row,
      5,
      summary.mappings
        .map((mapping) => mapping.classificationLabel)
        .filter((label, position, all) => all.indexOf(label) === position)
        .join(" | ") || "—"
    );
    writeText(
      worksheet,
      row,
      6,
      summary.mappings
        .map((mapping) =>
          mapping.manifestation ? REPORT_MANIFESTATION_LABELS[mapping.manifestation] : "—"
        )
        .join(" | ") || "—"
    );
    writeCount(worksheet, row, 7, summary.questionRefs.length);
    bandRow(worksheet, row, ciloHeaders.length, index % 2 === 1);
    row += 1;
  });
  outlineTable(worksheet, ciloHeaderRow, row - 1, ciloHeaders.length);

  row += 1;
  const directHeaders: HeaderCell[] = [
    { text: "Question prompt", wrap: true },
    { text: "Question key" },
    { text: "PO code (publication snapshot)" },
    { text: "PO description (publication snapshot)", wrap: true },
    { text: "PO classification" },
  ];
  const directHeaderRow = row;
  row = writeHeaderRow(worksheet, row, directHeaders);
  const directBindings = model.group.directPoBindings;
  if (directBindings.length === 0) {
    writeText(worksheet, row, 1, "No direct question-to-PO bindings in this evaluation.");
    row += 1;
  } else {
    directBindings.forEach((binding, index) => {
      writeWrappedText(worksheet, row, 1, binding.questionPrompt);
      writeText(worksheet, row, 2, encodeQuestionKey(binding.sectionKey, binding.itemKey));
      writeText(worksheet, row, 3, binding.poCode);
      writeWrappedText(worksheet, row, 4, binding.poDescription);
      writeText(
        worksheet,
        row,
        5,
        binding.poId === null
          ? "See PO Summary (resolved from the publication snapshot code)"
          : "See PO Summary"
      );
      bandRow(worksheet, row, directHeaders.length, index % 2 === 1);
      row += 1;
    });
  }
  outlineTable(worksheet, directHeaderRow, row - 1, directHeaders.length);
  return row + 1;
}

function writeQuestionTallies(
  worksheet: ExcelJS.Worksheet,
  startRow: number,
  model: ReportClassGroupModel,
  scaleValues: number[]
): number {
  let row = writeSectionHeading(worksheet, startRow, "D. Question-level quantitative tally");
  const countHeaders = countColumnHeaders(scaleValues);
  const headers: HeaderCell[] = [
    { text: "CILO" },
    { text: "Question prompt", wrap: true },
    { text: "Section key" },
    { text: "Item key" },
    { text: "Scale identity" },
    ...countHeaders,
    { text: "Valid rating count" },
    { text: "Excluded rating count" },
    { text: "Missing count" },
    { text: "Rating sum" },
    { text: "Mean (full precision)" },
    { text: "Mean (2 dp)" },
    { text: "Interpretation" },
    { text: "CQI status" },
  ];
  const countStart = 6;
  const validColumn = countStart + scaleValues.length;
  const excludedColumn = validColumn + 1;
  const missingColumn = validColumn + 2;
  const sumColumn = validColumn + 3;
  const fullMeanColumn = validColumn + 4;
  const displayMeanColumn = validColumn + 5;
  const interpretationColumn = validColumn + 6;
  const cqiColumn = validColumn + 7;

  const headerRow = row;
  row = writeHeaderRow(worksheet, row, headers);
  const firstDataRow = row;
  model.questions.forEach((tally, index) => {
    writeText(worksheet, row, 1, tally.ciloLabel ?? "General item");
    writeWrappedText(worksheet, row, 2, tally.question.prompt);
    writeText(worksheet, row, 3, tally.question.sectionKey);
    writeText(worksheet, row, 4, tally.question.itemKey);
    writeText(worksheet, row, 5, tally.scaleLabel);
    writeDistributionCounts(worksheet, row, countStart, tally.categories, scaleValues);
    writeCount(worksheet, row, validColumn, tally.validCount);
    writeCount(worksheet, row, excludedColumn, tally.excludedCount);
    if (tally.missingCount === null) {
      writeUnavailable(worksheet, row, missingColumn, "Not applicable");
    } else {
      writeCount(worksheet, row, missingColumn, tally.missingCount);
    }
    writeNumber(worksheet, row, sumColumn, tally.ratingSum, "0.0");
    writeMean(worksheet, row, fullMeanColumn, tally.mean);
    writeText(worksheet, row, displayMeanColumn, displayMean(tally.mean) ?? "—");
    writeText(worksheet, row, interpretationColumn, attainmentStatusLabel(tally.attainment));
    writeStatus(
      worksheet,
      row,
      cqiColumn,
      tally.attainment.cqi ?? "Unclassified",
      tally.attainment.cqi
    );
    bandRow(worksheet, row, headers.length, index % 2 === 1);
    row += 1;
  });
  outlineTable(worksheet, headerRow, row - 1, headers.length);
  applyFilter(worksheet, headerRow, firstDataRow, row - 1, headers.length);
  return row + 1;
}

function writeCiloSummaries(
  worksheet: ExcelJS.Worksheet,
  startRow: number,
  model: ReportClassGroupModel,
  scaleValues: number[]
): number {
  let row = writeSectionHeading(worksheet, startRow, "E. CILO summary");
  const headers: HeaderCell[] = [
    { text: "CILO" },
    { text: "CILO description", wrap: true },
    { text: "Contributing questions" },
    { text: "Distinct submitted responses" },
    { text: "Valid rating count" },
    ...countColumnHeaders(scaleValues),
    { text: "Scale identities" },
    { text: "Mean (full precision)" },
    { text: "Mean (2 dp)" },
    { text: "Interpretation" },
    { text: "CQI status" },
  ];
  const countStart = 6;
  const scalesColumn = countStart + scaleValues.length;
  const fullMeanColumn = scalesColumn + 1;
  const displayMeanColumn = fullMeanColumn + 1;
  const interpretationColumn = fullMeanColumn + 2;
  const cqiColumn = fullMeanColumn + 3;
  const headerRow = row;
  row = writeHeaderRow(worksheet, row, headers);
  const firstDataRow = row;
  model.ciloSummaries.forEach((summary, index) => {
    writeText(worksheet, row, 1, summary.ciloLabel);
    writeWrappedText(worksheet, row, 2, summary.ciloDescription || "—");
    writeCount(worksheet, row, 3, summary.questionRefs.length);
    writeCount(worksheet, row, 4, summary.distinctResponseCount);
    writeCount(worksheet, row, 5, summary.validCount);
    // A CILO's distribution is per scale identity; incompatible scales are
    // reported side by side and never blended into one count row.
    if (summary.scaleGroups.length <= 1) {
      writeDistributionCounts(
        worksheet,
        row,
        countStart,
        summary.scaleGroups[0]?.categories ?? [],
        scaleValues
      );
    } else {
      scaleValues.forEach((_, index) =>
        writeUnavailable(worksheet, row, countStart + index, "Mixed")
      );
    }
    writeText(
      worksheet,
      row,
      scalesColumn,
      summary.scaleGroups.length === 0
        ? "Unresolved scale"
        : summary.scaleGroups.map((group) => group.scaleLabel).join(" | ")
    );
    writeMean(worksheet, row, fullMeanColumn, summary.mean);
    writeText(worksheet, row, displayMeanColumn, displayMean(summary.mean) ?? "—");
    writeText(worksheet, row, interpretationColumn, attainmentStatusLabel(summary.attainment));
    writeStatus(
      worksheet,
      row,
      cqiColumn,
      summary.attainment.cqi ?? "Unclassified",
      summary.attainment.cqi
    );
    bandRow(worksheet, row, headers.length, index % 2 === 1);
    row += 1;
  });
  outlineTable(worksheet, headerRow, row - 1, headers.length);
  applyFilter(worksheet, headerRow, firstDataRow, row - 1, headers.length);
  return row + 1;
}

function writeRawResponseBlock(
  worksheet: ExcelJS.Worksheet,
  startRow: number,
  model: ReportClassGroupModel
): number {
  const { group } = model;
  let row = writeSectionHeading(
    worksheet,
    startRow,
    `F. Raw response records — ${group.evaluationName} — ${group.instrumentLabel}`
  );
  row = writeNote(
    worksheet,
    row,
    "One row per submitted response. Cells hold the respondent's original numeric answer; a blank cell means the question was not answered."
  );
  row += 1;

  const questionColumns = model.questions.map((tally) => ({
    key: encodeQuestionKey(tally.question.sectionKey, tally.question.itemKey),
    heading: `${tally.ciloLabel ?? "General item"} · ${tally.question.sectionKey}:${tally.question.itemKey}`,
    prompt: tally.question.prompt,
  }));
  const identityHeaders: HeaderCell[] = [
    { text: "Respondent name", wrap: true },
    { text: "Response ID" },
    { text: "Respondent ID" },
    { text: "Submitted at" },
  ];
  const headerRow = row;
  row = writeHeaderRow(worksheet, row, [
    ...identityHeaders,
    ...questionColumns.map((column) => ({ text: column.heading, wrap: true })),
  ]);
  const promptRow = row;
  row = writeHeaderRow(worksheet, row, [
    ...identityHeaders.map(() => ({ text: "" })),
    ...questionColumns.map((column) => ({ text: column.prompt, wrap: true })),
  ]);
  worksheet.getRow(promptRow).height = 42;

  const firstDataRow = row;
  model.rawRows.forEach((rawRow, index) => {
    writeText(worksheet, row, 1, rawRow.respondentName || REPORT_NAME_UNAVAILABLE);
    writeText(worksheet, row, 2, rawRow.responseId);
    writeText(worksheet, row, 3, rawRow.respondentId);
    writeText(worksheet, row, 4, rawRow.submittedAt ? formatDateTime(rawRow.submittedAt) : "—");
    questionColumns.forEach((column, offset) => {
      const answer = rawRow.answers.get(column.key);
      writeNumber(worksheet, row, identityHeaders.length + offset + 1, answer ?? null, "0");
    });
    bandRow(worksheet, row, identityHeaders.length + questionColumns.length, index % 2 === 1);
    row += 1;
  });
  outlineTable(worksheet, headerRow, row - 1, identityHeaders.length + questionColumns.length);
  applyFilter(
    worksheet,
    promptRow,
    firstDataRow,
    row - 1,
    identityHeaders.length + questionColumns.length
  );
  return row + 1;
}

function writeCourseWorksheet(
  worksheet: ExcelJS.Worksheet,
  courseCode: string,
  courseTitle: string,
  models: ReportClassGroupModel[],
  evidence: ReportEvidence
): void {
  setColumnWidths(worksheet, [
    { width: 26 },
    { width: 46 },
    { width: 18 },
    { width: 18 },
    { width: 20 },
    { width: 12 },
    { width: 14 },
    { width: 14 },
    { width: 14 },
    { width: 14 },
    { width: 14 },
    { width: 14 },
    { width: 14 },
    { width: 18 },
    { width: 14 },
    { width: 14 },
    { width: 24 },
  ]);
  let row = writeReportHeaderBlock(worksheet, [
    `Course: ${courseCode} — ${courseTitle}`,
    `Program: ${evidence.programCode} — ${evidence.programName}`,
    `Academic period: ${evidence.period.label}`,
    `Year level: ${evidence.yearLevelLabel}`,
  ]);
  row = writeKeyValueBlock(worksheet, row, "A. Course information", [
    ["Course code", courseCode],
    ["Course title", courseTitle],
    ["Program", `${evidence.programCode} — ${evidence.programName}`],
    ["Academic year", evidence.period.schoolYearCode ?? "All academic years"],
    ["Semester", evidence.period.semesterLabel ?? "All semesters"],
    ["Term", evidence.period.termLabel ?? "All terms"],
    ["Year level", evidence.yearLevelLabel],
    ["Class groups in scope", String(models.length)],
    [
      "Instrument versions",
      [...new Set(models.map((model) => model.group.instrumentLabel))].join(" | "),
    ],
  ]);
  row = writeClassGroupTable(worksheet, row, models);

  models.forEach((model, index) => {
    const scaleValues = scaleValuesOf(model.group);
    if (index > 0) row += 1;
    row = writeSectionHeading(
      worksheet,
      row,
      `Class group ${index + 1}: ${model.group.facultyName} · ${model.group.section ?? "Unspecified section"} · ${model.group.evaluationName} · ${model.group.evaluationStatus}`
    );
    row = writeAlignmentTables(worksheet, row, model);
    row = writeQuestionTallies(worksheet, row, model, scaleValues);
    row = writeCiloSummaries(worksheet, row, model, scaleValues);
    row = writeRawResponseBlock(worksheet, row, model);
  });

  row = writeSectionHeading(worksheet, row, "Disclosures");
  row = writeNote(worksheet, row, SCOPE_NOTICE);
  row = writeNote(worksheet, row, PROPOSED_POLICY_NOTICE);
  row = writeNote(worksheet, row, CURRENT_MAPPING_DISCLOSURE);
  row = writeNote(worksheet, row, YEAR_LEVEL_NOTICE);

  freezeHeadingRows(worksheet, 5);
  applyPrintSetup(worksheet, 5);
}

function writeOverviewSheet(
  worksheet: ExcelJS.Worksheet,
  evidence: ReportEvidence,
  models: ReportClassGroupModel[],
  generatedAt: Date,
  exportedBy: string
): void {
  setColumnWidths(worksheet, [
    { width: 32 },
    { width: 52 },
    { width: 22 },
    { width: 22 },
    { width: 22 },
    { width: 18 },
    { width: 18 },
    { width: 18 },
  ]);
  const assignedRespondents = models.reduce(
    (sum, model) => sum + model.participation.assignedRespondentCount,
    0
  );
  const submittedResponses = models.reduce(
    (sum, model) => sum + model.participation.submittedResponseCount,
    0
  );
  const answerCount = models.reduce(
    (sum, model) =>
      sum +
      model.group.responses.reduce(
        (responseSum, response) => responseSum + response.answers.length,
        0
      ),
    0
  );
  const courses = [...new Set(models.map((model) => model.group.courseCode))].sort();

  let row = writeTitleBlock(worksheet, [
    { text: "System CLOIE", size: 12, bold: true },
    { text: "Course evaluation workbook", size: 16, bold: true },
    { text: `Program: ${evidence.programCode} — ${evidence.programName}` },
    { text: `Academic period: ${evidence.period.label}` },
    { text: `Year level: ${evidence.yearLevelLabel}` },
    { text: `Generated: ${formatDateTime(generatedAt)} by ${exportedBy}` },
    { text: CONFIDENTIALITY_NOTICE, size: 9, color: "FF7F1D1D" },
  ]);
  row += 1;

  row = writeKeyValueBlock(worksheet, row, "Scope summary", [
    ["Courses in scope", courses.join(", ") || "None"],
    ["Class groups in scope", String(models.length)],
    ["Assigned respondents", String(assignedRespondents)],
    ["Submitted responses", String(submittedResponses)],
    [
      "Response rate",
      assignedRespondents === 0
        ? "Unavailable — no assigned respondents in this scope"
        : `${((submittedResponses / assignedRespondents) * 100).toFixed(1)}%`,
    ],
    ["Quantitative answers exported", String(answerCount)],
  ]);

  row = writeKeyValueBlock(worksheet, row, "How to read this workbook", [
    ["PO Summary", "Program Outcome evidence reached by the courses in this workbook."],
    ["Course worksheets", "One worksheet per course code, with one block per class group."],
    [
      "A. Course information",
      "Course, program, academic period, year level, and instrument version.",
    ],
    [
      "B. Class group information",
      "Faculty member, section, evaluation, assigned and submitted counts, response rate.",
    ],
    [
      "C. CILO and Program Outcome alignment",
      "CILO to PO codes, descriptions, classifications, and manifestations, plus direct question bindings.",
    ],
    [
      "D. Question-level tally",
      "Per-option counts, valid, excluded, and missing counts, rating sum, mean, and interpretation.",
    ],
    ["E. CILO summary", "CILO pooled raw ratings, distribution, mean, and interpretation."],
    ["F. Raw response records", "Per-response original answers with respondent names."],
    ["Data Dictionary", "Definitions of every column, denominator, and rule used."],
  ]);

  row = writeSectionHeading(worksheet, row, "Disclosures");
  writeNote(worksheet, row, SCOPE_NOTICE);
  writeNote(worksheet, row + 1, PROPOSED_POLICY_NOTICE);
  writeNote(worksheet, row + 2, CURRENT_MAPPING_DISCLOSURE);
  writeNote(worksheet, row + 3, YEAR_LEVEL_NOTICE);

  freezeHeadingRows(worksheet, 4);
  applyPrintSetup(worksheet, 4);
}

function writePoSummarySheet(
  worksheet: ExcelJS.Worksheet,
  models: ReportClassGroupModel[],
  evidence: ReportEvidence
): void {
  setColumnWidths(worksheet, [
    { width: 22 },
    { width: 44 },
    { width: 20 },
    { width: 34 },
    { width: 14 },
    { width: 16 },
    { width: 18 },
    { width: 18 },
    { width: 14 },
    { width: 24 },
    { width: 18 },
    { width: 14 },
    { width: 24 },
  ]);
  const aggregation = aggregateOutcomeEvidence(buildOutcomeEvidenceRows(models));
  const outcomes = buildOutcomeEvidenceDtos(aggregation).map((outcome) => ({
    ...outcome,
    attainment: classifyOutcomeDistributions(
      outcome.meanRating,
      outcome.distributions,
      outcome.spansMultipleScales
    ),
  }));
  // A frozen publication-snapshot identity resolves through its exact code in
  // the same Program; anything else keeps a neutral label.
  const classificationByPo = new Map<string, string>();
  for (const outcome of evidence.outcomes) {
    classificationByPo.set(outcome.id, outcome.classificationLabel);
    classificationByPo.set(`code:${outcome.code}`, outcome.classificationLabel);
  }
  const classificationOf = (poId: string, poCode: string) =>
    classificationByPo.get(poId) ?? classificationByPo.get(`code:${poCode}`) ?? "Not available";

  let row = writeTitleBlock(worksheet, [
    { text: "System CLOIE", size: 12, bold: true },
    { text: "Program Outcome summary — course-bound evidence", size: 14, bold: true },
    { text: `Program: ${evidence.programCode} — ${evidence.programName}` },
    { text: `Academic period: ${evidence.period.label}` },
    { text: `Year level: ${evidence.yearLevelLabel}` },
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
    { text: "Valid rating count" },
    { text: "Distinct submitted responses" },
    { text: "Excluded rating count" },
    { text: "Mean (full precision)" },
    { text: "Mean (2 dp)" },
    { text: "Interpretation" },
    { text: "CQI status" },
    { text: "Evaluations" },
  ];
  const headerRow = row;
  row = writeHeaderRow(worksheet, row, headers);
  const firstDataRow = row;
  outcomes.forEach((outcome, index) => {
    writeText(worksheet, row, 1, outcome.code);
    writeWrappedText(worksheet, row, 2, outcome.name);
    writeText(worksheet, row, 3, classificationOf(outcome.outcomeId, outcome.code));
    writeText(
      worksheet,
      row,
      4,
      outcome.contributingCourses.map((course) => course.code).join(" | ") || "—"
    );
    writeCount(worksheet, row, 5, outcome.ratingCount);
    writeCount(worksheet, row, 6, outcome.submittedResponseCount);
    writeCount(worksheet, row, 7, outcome.excludedRatingCount);
    writeMean(worksheet, row, 8, outcome.meanRating);
    writeText(worksheet, row, 9, displayMean(outcome.meanRating) ?? "—");
    writeText(worksheet, row, 10, attainmentStatusLabel(outcome.attainment));
    writeStatus(
      worksheet,
      row,
      11,
      outcome.attainment.cqi ?? "Unclassified",
      outcome.attainment.cqi
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

  if (outcomes.length === 0) {
    row += 1;
    row = writeNote(worksheet, row, "No mapped Program Outcome evidence exists in this scope.");
  }

  row += 1;
  row = writeSectionHeading(worksheet, row, "Distribution by scale identity");
  const distributionHeaders: HeaderCell[] = [
    { text: "PO code" },
    { text: "Scale identity" },
    { text: "Rating value" },
    { text: "Descriptor" },
    { text: "Count" },
    { text: "Percentage" },
    { text: "Scale group mean" },
  ];
  const distributionHeaderRow = row;
  row = writeHeaderRow(worksheet, row, distributionHeaders);
  const distributionFirstRow = row;
  for (const outcome of outcomes) {
    for (const distribution of outcome.distributions) {
      for (const category of distribution.categories) {
        writeText(worksheet, row, 1, outcome.code);
        writeText(worksheet, row, 2, reportScaleLabelFromCategories(distribution.categories));
        writeCount(worksheet, row, 3, category.value);
        writeText(worksheet, row, 4, category.label ?? String(category.value));
        writeCount(worksheet, row, 5, category.count);
        writePercent(worksheet, row, 6, category.percentage);
        writeMean(worksheet, row, 7, outcome.meanRating);
        row += 1;
      }
    }
  }
  outlineTable(worksheet, distributionHeaderRow, row - 1, distributionHeaders.length);
  applyFilter(
    worksheet,
    distributionHeaderRow,
    distributionFirstRow,
    row - 1,
    distributionHeaders.length
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

/** Build the year-level course evaluation workbook for one authorized Program. */
export async function buildCourseWorkbook({
  evidence,
  generatedAt,
  exportedBy,
}: CourseWorkbookInput): Promise<Buffer> {
  const models = evidence.courseGroups.map((group) =>
    buildClassGroupModel(group, evidence.ciloMappings)
  );
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "System CLOIE";
  workbook.created = generatedAt;

  const overview = workbook.addWorksheet("Overview");
  writeOverviewSheet(overview, evidence, models, generatedAt, exportedBy);

  const poSummary = workbook.addWorksheet("PO Summary");
  writePoSummarySheet(poSummary, models, evidence);

  const taken = new Set(["overview", "po summary", "data dictionary"]);
  const byCourse = new Map<string, ReportClassGroupModel[]>();
  for (const model of models) {
    const bucket = byCourse.get(model.group.courseCode) ?? [];
    bucket.push(model);
    byCourse.set(model.group.courseCode, bucket);
  }
  for (const courseCode of [...byCourse.keys()].sort()) {
    const courseModels = byCourse.get(courseCode) ?? [];
    const worksheet = workbook.addWorksheet(safeSheetName(courseCode, taken));
    writeCourseWorksheet(
      worksheet,
      courseCode,
      courseModels[0]?.group.courseTitle ?? "",
      courseModels,
      evidence
    );
  }

  const dictionary = workbook.addWorksheet("Data Dictionary");
  writeDataDictionarySheet(dictionary, [...SHARED_DICTIONARY_ROWS, ...COURSE_DICTIONARY_ROWS]);

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
