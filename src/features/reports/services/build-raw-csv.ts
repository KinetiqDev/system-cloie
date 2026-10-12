import { resolveItemScaleIdentity } from "@/features/analytics/aggregators/scale-identity";
import { encodeQuestionKey } from "@/features/analytics/aggregators/question-identity";
import { listSnapshotQuantitativeItems } from "@/features/analytics/services/snapshot-structure";
import { formatDateTime } from "@/lib/utils/date-format";
import {
  REPORT_EVIDENCE_SOURCE_LABELS,
  REPORT_MANIFESTATION_LABELS,
  REPORT_NAME_UNAVAILABLE,
  REPORT_STAKEHOLDER_LABELS,
  reportCentralSourceLabel,
  type ReportCiloMapping,
  type ReportCourseGroup,
  type ReportCentralGroup,
  type ReportEvidence,
  type ReportResponseRow,
} from "../types";
import { reportScaleLabel } from "./report-tallies";
import { safeSpreadsheetText } from "./workbook-kit";

// ---------------------------------------------------------------------------
// Raw quantitative CSV
//
// One row is one original submitted quantitative answer item. Values are
// unmodified: the rating is the respondent's own number, the descriptor is the
// frozen snapshot's label for that value on that question's scale, and the CILO
// and Program Outcome columns are the alignment context of the answered
// question. No qualitative comment, student number, email, or account
// identifier is exported; internal respondent and response identifiers travel so
// a reader can match and deduplicate without ever merging two people by name.
// ---------------------------------------------------------------------------

/** Stable header order of the normalized raw export. */
export const RAW_CSV_HEADERS = [
  "period_school_year",
  "period_semester",
  "period_term",
  "period_label",
  "program_code",
  "program_name",
  "year_level",
  "evidence_source",
  "respondent_category",
  "deployment_type",
  "deployment_id",
  "deployment_name",
  "deployment_status",
  "course_code",
  "course_title",
  "course_assignment_id",
  "faculty_name",
  "section",
  "instrument_name",
  "instrument_version",
  "cilo_code",
  "cilo_description",
  "po_codes",
  "po_descriptions",
  "po_classifications",
  "manifestations",
  "direct_po_codes",
  "direct_po_descriptions",
  "direct_po_classifications",
  "question_section_key",
  "question_item_key",
  "question_prompt",
  "scale_label",
  "rating_value",
  "rating_descriptor",
  "respondent_name",
  "respondent_id",
  "response_id",
  "submitted_at",
] as const;

/** One CSV field: numbers stay numbers, everything else is escaped text. */
function csvField(value: string | number | null): string {
  if (value === null) return "";
  const text = typeof value === "number" ? String(value) : safeSpreadsheetText(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsvRow(fields: ReadonlyArray<string | number | null>): string {
  return fields.map(csvField).join(",");
}

type QuestionAnswer = { sectionKey: string; itemKey: string; ratingValue: number };

function promptLookup(structureSnapshot: unknown): Map<string, string> {
  return new Map(
    listSnapshotQuantitativeItems(structureSnapshot).map((question) => [
      encodeQuestionKey(question.sectionKey, question.itemKey),
      question.prompt,
    ])
  );
}

/** `Template name v3` splits back into its name and version parts. */
function splitInstrumentLabel(label: string): [string, string] {
  const match = /^(.*)\sv(\d+)$/.exec(label);
  return match ? [match[1], `v${match[2]}`] : [label, ""];
}

/**
 * Classification of a PO named by a frozen publication snapshot. PO codes are
 * unique inside a Program, so resolving the exact code names the same live
 * record; anything unresolved is reported as unavailable rather than guessed.
 */
function directClassification(
  evidence: ReportEvidence,
  poId: string | null,
  poCode: string
): string {
  const match = evidence.outcomes.find((outcome) => outcome.id === poId || outcome.code === poCode);
  return match ? match.classificationLabel : "Not available";
}

function descriptorOf(
  structureSnapshot: unknown,
  sectionKey: string,
  itemKey: string,
  ratingValue: number
): { scaleLabel: string; descriptor: string } {
  const scale = resolveItemScaleIdentity(structureSnapshot, sectionKey, itemKey);
  const descriptor = scale?.descriptors.find((entry) => entry.value === ratingValue);
  return { scaleLabel: reportScaleLabel(scale), descriptor: descriptor?.label ?? "" };
}

function courseRow(
  evidence: ReportEvidence,
  group: ReportCourseGroup,
  response: ReportResponseRow,
  answer: QuestionAnswer,
  prompts: Map<string, string>
): Array<string | number | null> {
  const questionKey = encodeQuestionKey(answer.sectionKey, answer.itemKey);
  const ciloBinding = group.ciloBindings.find(
    (binding) => encodeQuestionKey(binding.sectionKey, binding.itemKey) === questionKey
  );
  const mappings: ReportCiloMapping[] = ciloBinding?.ciloId
    ? (evidence.ciloMappings.get(ciloBinding.ciloId) ?? [])
    : [];
  const directBindings = group.directPoBindings.filter(
    (binding) => encodeQuestionKey(binding.sectionKey, binding.itemKey) === questionKey
  );
  const { scaleLabel, descriptor } = descriptorOf(
    group.structureSnapshot,
    answer.sectionKey,
    answer.itemKey,
    answer.ratingValue
  );
  const [instrumentName, instrumentVersion] = splitInstrumentLabel(group.instrumentLabel);

  return [
    group.termInstance.schoolYearCode,
    group.termInstance.semesterLabel,
    group.termInstance.termLabel,
    group.termInstance.label,
    evidence.programCode,
    evidence.programName,
    group.yearLevelLabel,
    "Course-bound student",
    REPORT_STAKEHOLDER_LABELS.STUDENT,
    "COURSE_BOUND",
    group.evaluationId,
    group.evaluationName,
    group.evaluationStatus,
    group.courseCode,
    group.courseTitle,
    group.courseAssignmentId,
    group.facultyName,
    group.section,
    instrumentName,
    instrumentVersion,
    ciloBinding?.ciloLabel ?? "",
    ciloBinding?.ciloDescription ?? "",
    mappings.map((mapping) => mapping.poCode).join(" | "),
    mappings.map((mapping) => mapping.poDescription).join(" | "),
    mappings.map((mapping) => mapping.classificationLabel).join(" | "),
    mappings
      .map((mapping) =>
        mapping.manifestation ? REPORT_MANIFESTATION_LABELS[mapping.manifestation] : ""
      )
      .join(" | "),
    directBindings.map((binding) => binding.poCode).join(" | "),
    directBindings.map((binding) => binding.poDescription).join(" | "),
    directBindings
      .map((binding) => directClassification(evidence, binding.poId, binding.poCode))
      .join(" | "),
    answer.sectionKey,
    answer.itemKey,
    ciloBinding?.questionPrompt ?? prompts.get(questionKey) ?? answer.itemKey,
    scaleLabel,
    answer.ratingValue,
    descriptor,
    response.respondentName ?? REPORT_NAME_UNAVAILABLE,
    response.respondentId,
    response.responseId,
    response.submittedAt ? formatDateTime(response.submittedAt) : "",
  ];
}

function centralRow(
  evidence: ReportEvidence,
  group: ReportCentralGroup,
  response: ReportResponseRow,
  answer: QuestionAnswer,
  prompts: Map<string, string>
): Array<string | number | null> {
  const questionKey = encodeQuestionKey(answer.sectionKey, answer.itemKey);
  const directBindings = group.poBindings.filter(
    (binding) => encodeQuestionKey(binding.sectionKey, binding.itemKey) === questionKey
  );
  const { scaleLabel, descriptor } = descriptorOf(
    group.structureSnapshot,
    answer.sectionKey,
    answer.itemKey,
    answer.ratingValue
  );
  const [instrumentName, instrumentVersion] = splitInstrumentLabel(group.instrumentLabel);

  return [
    group.termInstance.schoolYearCode,
    group.termInstance.semesterLabel,
    group.termInstance.termLabel,
    group.termInstance.label,
    evidence.programCode,
    evidence.programName,
    group.yearLevel ?? "",
    REPORT_EVIDENCE_SOURCE_LABELS[reportCentralSourceLabel(group.targetStakeholder)],
    REPORT_STAKEHOLDER_LABELS[group.targetStakeholder],
    "CENTRAL",
    group.deploymentId,
    group.deploymentName,
    group.deploymentStatus,
    "",
    "",
    "",
    "",
    "",
    instrumentName,
    instrumentVersion,
    "",
    "",
    "",
    "",
    "",
    "",
    directBindings.map((binding) => binding.poCode).join(" | "),
    directBindings.map((binding) => binding.poDescription).join(" | "),
    directBindings
      .map((binding) => directClassification(evidence, binding.poId, binding.poCode))
      .join(" | "),
    answer.sectionKey,
    answer.itemKey,
    directBindings[0]?.questionPrompt ?? prompts.get(questionKey) ?? answer.itemKey,
    scaleLabel,
    answer.ratingValue,
    descriptor,
    response.respondentName ?? REPORT_NAME_UNAVAILABLE,
    response.respondentId,
    response.responseId,
    response.submittedAt ? formatDateTime(response.submittedAt) : "",
  ];
}

function orderedAnswers(response: ReportResponseRow): QuestionAnswer[] {
  return [...response.answers].sort(
    (left, right) =>
      left.sectionKey.localeCompare(right.sectionKey) || left.itemKey.localeCompare(right.itemKey)
  );
}

/** Build the normalized raw quantitative CSV for one authorized scope. */
export async function buildRawQuantitativeCsv(evidence: ReportEvidence): Promise<{
  csv: string;
  rowCount: number;
  responseCount: number;
}> {
  const lines: string[] = [toCsvRow([...RAW_CSV_HEADERS])];
  const responseIds = new Set<string>();
  let rowCount = 0;

  for (const group of evidence.courseGroups) {
    const prompts = promptLookup(group.structureSnapshot);
    for (const response of group.responses) {
      responseIds.add(response.responseId);
      for (const answer of orderedAnswers(response)) {
        lines.push(toCsvRow(courseRow(evidence, group, response, answer, prompts)));
        rowCount += 1;
      }
    }
  }
  for (const group of evidence.centralGroups) {
    const prompts = promptLookup(group.structureSnapshot);
    for (const response of group.responses) {
      responseIds.add(response.responseId);
      for (const answer of orderedAnswers(response)) {
        lines.push(toCsvRow(centralRow(evidence, group, response, answer, prompts)));
        rowCount += 1;
      }
    }
  }

  return { csv: `${lines.join("\r\n")}\r\n`, rowCount, responseCount: responseIds.size };
}
