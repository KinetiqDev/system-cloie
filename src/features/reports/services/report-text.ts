import {
  OUTCOME_ATTAINMENT_BENCHMARK,
  OUTCOME_ATTAINMENT_POLICY_ID,
} from "@/features/analytics/aggregators/outcome-attainment";
import { CURRENT_MAPPING_DISCLOSURE } from "@/features/analytics/services/get-program-head-analytics";

// ---------------------------------------------------------------------------
// Report disclosures and data dictionary
//
// Every export states what it contains, how each number was produced, and
// which policy decisions remain proposed. These strings are part of the
// deliverable: a reader must be able to reconcile a printed mean with the live
// Analytics figure and must never mistake a proposed benchmark for an approved
// institutional threshold.
// ---------------------------------------------------------------------------

export const CONFIDENTIALITY_NOTICE =
  "CONFIDENTIAL — this report identifies respondents by name. It is restricted access for the authorized Program Head of this Program. Store it securely, do not forward it outside the authorized team, and do not combine it with other data to attempt re-identification.";

export const PROPOSED_POLICY_NOTICE = `Attainment interpretation and CQI classification follow the proposed institutional policy ${OUTCOME_ATTAINMENT_POLICY_ID} with benchmark ${OUTCOME_ATTAINMENT_BENCHMARK.toFixed(2)}. The policy is proposed, not formally institution-approved. Rows without evidence, with unsupported scales, or pooling incompatible scales stay unclassified and are never reported as non-attainment.`;

export const SCOPE_NOTICE =
  "Scope: submitted (SUBMITTED) evidence only, from Professional Course-bound evaluations and Central deployments of this Program. General Education Course-bound evidence is excluded by ADR 0034. Ratings are evaluation evidence of perceived attainment, not individual student mastery, grades, or transcript records.";

export const YEAR_LEVEL_NOTICE =
  "The year-level control narrows Professional Course-bound evidence through the Program's own course-evaluation targets. Central deployments are filtered by academic period only.";

export { CURRENT_MAPPING_DISCLOSURE };

/** Data-dictionary rows shared by every export, prefixed by its own fields. */
export const SHARED_DICTIONARY_ROWS: ReadonlyArray<readonly [string, string]> = [
  [
    "Assigned respondents",
    "EvaluationAssignment rows in scope. This is the response-rate denominator, not a live roster.",
  ],
  [
    "Submitted responses",
    "Responses with status SUBMITTED in scope. A response with no rating answer still counts.",
  ],
  [
    "Response rate",
    "Submitted responses divided by assigned respondents. Shown as unavailable when the scope has no assigned respondents.",
  ],
  [
    "Valid rating count",
    "Answered ratings whose value belongs to the question's frozen scale identity. This is the mean's denominator.",
  ],
  [
    "Excluded rating count",
    "Answered ratings dropped from the aggregate because the scale identity could not be resolved or the value fell outside it.",
  ],
  [
    "Missing count",
    "Submitted responses that did not answer the question. Printed only where the frozen snapshot defines the question's applicability.",
  ],
  [
    "Rating sum",
    "Sum of value × count across the question's rating options. Derived from the printed option counts.",
  ],
  [
    "Mean (full precision)",
    "Rating sum divided by valid rating count, stored at full precision. Classification and interpretation use this value.",
  ],
  ["Mean (2 dp)", "The same mean rounded to two decimals for display only."],
  [
    "Scale identity",
    "Minimum value, maximum value, and the label of every option taken from the frozen instrument-version snapshot. Two questions are comparable only when their scale identities are identical.",
  ],
  [
    "Rating option counts",
    "One column per rating value. A blank cell means the value is not part of that question's scale identity.",
  ],
  [
    "CILO",
    "Course Intended Learning Outcome. Its label is the publication-time label of the evaluated course.",
  ],
  [
    "PO code and description",
    "Program Outcome, reported from the frozen publication snapshot where one exists and from the live record otherwise. Persisted codes are printed unchanged.",
  ],
  [
    "PO classification",
    "The PO record's own classification: Common, Core, Professional, Institution-specific, or the migration-only unclassified default. Never inferred from the PO code.",
  ],
  [
    "Manifestation (L/P/O)",
    "Learning, Practice, or Opportunity. A descriptive alignment label only: it never filters or weights a contribution.",
  ],
  [
    "Interpretation",
    `Deterministic band from policy ${OUTCOME_ATTAINMENT_POLICY_ID}, or an explicit unclassified status.`,
  ],
  [
    "CQI status",
    "Meets Benchmark, Needs Attention, or Below Benchmark. Unclassified rows have no CQI status.",
  ],
  [
    "Respondent name",
    "Account name of the respondent of the submitted response. Internal respondent and response identifiers are exported for matching only.",
  ],
  [
    "Traceability",
    "Every mean, count, and classification is produced by the canonical Analytics aggregators from persisted submitted responses.",
  ],
];

export const COURSE_DICTIONARY_ROWS: ReadonlyArray<readonly [string, string]> = [
  [
    "Class group",
    "One course assignment and its published evaluation. Faculty member, section, evaluation, and response group stay separate; results are never merged under the course code.",
  ],
  [
    "Question tally",
    "One question of one class group. Counts come from the question's own answer records, so the option counts always sum to the valid rating count.",
  ],
  [
    "CILO summary",
    "Raw ratings of every question bound to the CILO pooled inside one class group. Never a mean of question means.",
  ],
  [
    "Raw response block",
    "One row per submitted response with the respondent's original numeric answers. A blank cell means the question was not answered.",
  ],
  [
    "Instrument version",
    "The immutable instrument version the evaluation pinned at publication, with its frozen structure snapshot.",
  ],
];

export const PO_DICTIONARY_ROWS: ReadonlyArray<readonly [string, string]> = [
  [
    "PO evidence",
    "Course-bound quantitative evidence connected through a frozen direct question-to-PO binding or through a publication-time CILO question binding and that CILO's current PO mapping.",
  ],
  [
    "Contribution rule",
    "Each submitted answer contributes once per (response, evaluation, question, PO). When a CILO maps to several POs, each PO receives the contribution, so PO rows are not additive.",
  ],
  [
    "Program-wide evidence",
    "Central deployment evidence connected through published question-to-PO snapshots, reported separately per respondent category and never combined with course-bound evidence.",
  ],
  [
    "Evidence source",
    "Course-bound student, program-wide student, alumni, or industry partner. Sources use different instruments and populations and are never pooled.",
  ],
  ["Snapshots and exclusions", "Excluded rating counts are printed, never silently dropped."],
];

export const RAW_CSV_DICTIONARY_ROWS: ReadonlyArray<readonly [string, string]> = [
  [
    "Row grain",
    "One row is one original submitted quantitative answer item. Unanswered questions produce no row.",
  ],
  [
    "Ordering",
    "Academic period, then course code, faculty member, section, evaluation, respondent name, then section and item key. The order is stable across exports of the same scope.",
  ],
  ["Answered rating value", "The respondent's original numeric answer, unmodified."],
  [
    "Rating descriptor",
    "The label the frozen instrument snapshot gives the answered value on that question's scale.",
  ],
  ["Scaling", "Rating counts must equal valid rating counts in the workbook of the same scope."],
  [
    "Formula safety",
    "Text values beginning with =, +, -, or @ are prefixed so a spreadsheet reads them as text.",
  ],
];
