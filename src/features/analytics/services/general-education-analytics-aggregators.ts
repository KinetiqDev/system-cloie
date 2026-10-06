import type { StudentSection, YearLevel } from "@prisma/client";
import type { OutcomeEvidenceDTO } from "../outcome-evidence-types";
import {
  describeScale,
  describeScales,
  ratingBelongsToScale,
  resolveItemScaleIdentity,
  type ScaleIdentity,
} from "../aggregators/scale-identity";
import {
  buildSourceComposition,
  semesterOrder,
  termOrder,
} from "./program-head-analytics-aggregators";
import type {
  GeneralEducationAnalyticsEmptyReason,
  GeneralEducationCourseBreakdownRow,
  GeneralEducationIloEvidenceDTO,
  GeneralEducationOutcomesDTO,
  GeneralEducationProgramsDTO,
  GeneralEducationScaleGroupDTO,
  GeneralEducationTrendsDTO,
} from "../general-education-analytics-types";

// ---------------------------------------------------------------------------
// General Education evidence builders (ADR 0035)
//
// Pure aggregation for the Coordinator's view reads. The service resolves the
// authorized General Education evidence scope, binds each rating to its
// publication-time CILO question binding, and normalizes Prisma rows into the
// narrow structural shapes below; everything here is deterministic and
// database-free, so outcome math, scale separation, comparability
// fingerprints, and class-context attribution stay unit-testable.
//
// Three rules hold across every builder:
// - Incompatible frozen instrument-version scales are never merged. A mean is
//   reported only when the pooled valid ratings share exactly one scale
//   identity; otherwise the mean is null and the per-scale groups carry it.
// - Means pool raw ratings, never a mean of per-group means, and keep full
//   server precision. Rating counts stay distinct from submitted-response
//   counts, and a scope with no evaluation opportunities reports no response
//   rate rather than a zero-percent one.
// - Comparability is semantic, not record-based: a question's identity is its
//   Course, CILO, and section/item keys, never the evaluation id, because a
//   fresh evaluation is published for every term.
// ---------------------------------------------------------------------------

/** Catalog identity of one Course behind the evidence. */
export type GeCourseRef = { id: string; code: string; title: string };

/** Catalog identity of one class-context Program. */
type GeProgramRef = { id: string; code: string; name: string };

/**
 * Class context of the `CourseAssignment` that produced the evidence. Course
 * scope, not respondent Program membership, decides ownership, so this is
 * attribution of the class the evaluation ran in — never of a respondent.
 */
type GeClassContext = {
  program: GeProgramRef;
  yearLevel: YearLevel;
  section: StudentSection;
  facultyName: string;
};

/** Deployment identity and course context behind one in-scope evidence row. */
type GeEvaluationEvidence = {
  evaluationId: string;
  deploymentName: string;
  termInstanceId: string;
  instrumentVersionId: string;
  course: GeCourseRef;
  classContext: GeClassContext;
};

/**
 * One submitted rating row with its frozen instrument version identity and its
 * publication-time CILO question binding. `ciloId` is null for a general item
 * and for a binding whose CILO row was deleted, so `ciloDescription` — the
 * frozen binding snapshot — keeps that question's own identity.
 */
export type GeRatingEvidence = GeEvaluationEvidence & {
  ratingValue: number;
  responseId: string;
  sectionKey: string;
  itemKey: string;
  ciloId: string | null;
  ciloDescription: string | null;
};

/**
 * One submitted response row. A submitted response that carries no valid
 * rating still counts as participation, so responses are tracked separately
 * from ratings.
 */
export type GeResponseEvidence = GeEvaluationEvidence & { responseId: string };

/** One in-scope evaluation opportunity: the response-rate denominator row. */
export type GeAssignmentRow = {
  evaluationId: string;
  course: GeCourseRef;
  program: GeProgramRef;
  yearLevel: YearLevel;
  section: StudentSection;
  facultyName: string;
  termInstanceId: string;
  deploymentName?: string;
  instrumentVersionId?: string;
};

/**
 * Resolves which outcome rows one rating reaches. Empty means the rating is
 * unlinked evidence that no outcome row pools.
 */
export type GeOutcomeIdResolver = (row: GeRatingEvidence) => readonly string[];

const NO_OUTCOMES: readonly string[] = [];

/**
 * Semantic identity of one rated question across terms: Course, CILO,
 * section, and item. Evaluation ids are deliberately absent — every term
 * publishes a new evaluation for the same class, so an evaluation-scoped key
 * would make every period look like a different measurement.
 */
function geQuestionIdentity(row: {
  course: GeCourseRef;
  ciloId: string | null;
  ciloDescription: string | null;
  sectionKey: string;
  itemKey: string;
}): string {
  const cilo = row.ciloId ?? `snapshot:${row.ciloDescription ?? ""}`;
  return JSON.stringify([row.course.id, cilo, row.sectionKey, row.itemKey]);
}

/**
 * Accumulated valid and excluded evidence for one grouping key. One
 * accumulator serves periods, courses, Programs, evaluation sections, and
 * matrix cells, so scale, response, and fingerprint semantics cannot drift
 * between views.
 */
export type GeEvidenceAggregate = {
  ratingSum: number;
  ratingCount: number;
  excludedRatingCount: number;
  responseIds: Set<string>;
  /** Canonical scale identity -> resolved identity, in first-seen order. */
  scaleIdentities: Map<string, ScaleIdentity>;
  /** Canonical scale identity -> per-value counts of valid ratings. */
  scaleCounts: Map<string, Map<number, number>>;
  /** Canonical scale identity -> rating sum, for that group's own mean. */
  scaleSums: Map<string, number>;
  /** Canonical scale identity -> distinct rating-bearing responses. */
  scaleResponseIds: Map<string, Set<string>>;
  /** Instrument version -> distinct rating-bearing responses. */
  instrumentResponseIds: Map<string, Set<string>>;
  instrumentVersionIds: Set<string>;
  /** Semantic Course+CILO+section/item question identities reached. */
  questionIdentities: Set<string>;
  outcomeCodes: Set<string>;
  /** Course -> distinct rating-bearing responses, the course population. */
  courseResponseIds: Map<string, Set<string>>;
  /** Course-by-Program key -> distinct rating-bearing responses. */
  courseProgramResponseIds: Map<string, Set<string>>;
};

export function emptyGeEvidenceAggregate(): GeEvidenceAggregate {
  return {
    ratingSum: 0,
    ratingCount: 0,
    excludedRatingCount: 0,
    responseIds: new Set(),
    scaleIdentities: new Map(),
    scaleCounts: new Map(),
    scaleSums: new Map(),
    scaleResponseIds: new Map(),
    instrumentResponseIds: new Map(),
    instrumentVersionIds: new Set(),
    questionIdentities: new Set(),
    outcomeCodes: new Set(),
    courseResponseIds: new Map(),
    courseProgramResponseIds: new Map(),
  };
}

function addIdTo(byKey: Map<string, Set<string>>, key: string, value: string): void {
  const ids = byKey.get(key) ?? new Set<string>();
  ids.add(value);
  byKey.set(key, ids);
}

/** Resolve the frozen scale of one rating; null when the snapshot cannot place it. */
function geRatingScale(
  row: GeRatingEvidence,
  snapshotById: ReadonlyMap<string, unknown>
): ScaleIdentity | null {
  return resolveItemScaleIdentity(
    snapshotById.get(row.instrumentVersionId) ?? null,
    row.sectionKey,
    row.itemKey
  );
}

/**
 * Accumulate one rating. An unresolvable scale or an out-of-scale value is
 * counted as excluded and enters no mean, count, distribution, or fingerprint
 * dimension; only valid ratings define the population behind a mean and the
 * period identity behind a plotted point.
 */
function accumulateGeRating(
  aggregate: GeEvidenceAggregate,
  row: GeRatingEvidence,
  scale: ScaleIdentity | null,
  outcomeIds: readonly string[] = NO_OUTCOMES
): void {
  if (scale === null || !ratingBelongsToScale(scale, row.ratingValue)) {
    aggregate.excludedRatingCount += 1;
    return;
  }

  aggregate.instrumentVersionIds.add(row.instrumentVersionId);
  aggregate.questionIdentities.add(geQuestionIdentity(row));
  for (const outcomeId of outcomeIds) {
    aggregate.outcomeCodes.add(outcomeId);
  }
  aggregate.ratingSum += row.ratingValue;
  aggregate.ratingCount += 1;
  aggregate.responseIds.add(row.responseId);
  addIdTo(aggregate.instrumentResponseIds, row.instrumentVersionId, row.responseId);
  addIdTo(aggregate.courseResponseIds, row.course.id, row.responseId);
  addIdTo(
    aggregate.courseProgramResponseIds,
    geCourseProgramKey(row.course.id, row.classContext.program.id),
    row.responseId
  );
  addIdTo(aggregate.scaleResponseIds, scale.key, row.responseId);
  aggregate.scaleIdentities.set(scale.key, scale);
  aggregate.scaleSums.set(scale.key, (aggregate.scaleSums.get(scale.key) ?? 0) + row.ratingValue);
  const counts = aggregate.scaleCounts.get(scale.key) ?? new Map<number, number>();
  counts.set(row.ratingValue, (counts.get(row.ratingValue) ?? 0) + 1);
  aggregate.scaleCounts.set(scale.key, counts);
}

/**
 * Fold one group's valid, excluded, and participation evidence into a scope
 * accumulator. Scale identities and counts merge by canonical identity, so a
 * scope total is a pooled raw sum and count — never a mean of per-group means.
 */
function mergeScaleEvidence(scope: GeEvidenceAggregate, group: GeEvidenceAggregate): void {
  for (const [key, scale] of group.scaleIdentities) scope.scaleIdentities.set(key, scale);
  for (const [key, counts] of group.scaleCounts) {
    const merged = scope.scaleCounts.get(key) ?? new Map<number, number>();
    for (const [value, count] of counts) merged.set(value, (merged.get(value) ?? 0) + count);
    scope.scaleCounts.set(key, merged);
  }
  for (const [key, sum] of group.scaleSums)
    scope.scaleSums.set(key, (scope.scaleSums.get(key) ?? 0) + sum);
}

function mergeGroupedResponseIds(
  target: Map<string, Set<string>>,
  source: ReadonlyMap<string, Set<string>>
): void {
  for (const [key, ids] of source) {
    for (const id of ids) addIdTo(target, key, id);
  }
}

export function mergeGeEvidenceIntoScope(
  scope: GeEvidenceAggregate,
  group: GeEvidenceAggregate
): GeEvidenceAggregate {
  scope.ratingSum += group.ratingSum;
  scope.ratingCount += group.ratingCount;
  scope.excludedRatingCount += group.excludedRatingCount;
  for (const responseId of group.responseIds) scope.responseIds.add(responseId);
  mergeScaleEvidence(scope, group);
  mergeGroupedResponseIds(scope.scaleResponseIds, group.scaleResponseIds);
  mergeGroupedResponseIds(scope.instrumentResponseIds, group.instrumentResponseIds);
  for (const versionId of group.instrumentVersionIds) {
    scope.instrumentVersionIds.add(versionId);
  }
  for (const identity of group.questionIdentities) scope.questionIdentities.add(identity);
  for (const code of group.outcomeCodes) scope.outcomeCodes.add(code);
  mergeGroupedResponseIds(scope.courseResponseIds, group.courseResponseIds);
  mergeGroupedResponseIds(scope.courseProgramResponseIds, group.courseProgramResponseIds);
  return scope;
}

/** Record submitted participation that carries no usable rating. */
function accumulateGeResponse(aggregate: GeEvidenceAggregate, row: GeResponseEvidence): void {
  aggregate.responseIds.add(row.responseId);
}

/**
 * Full-precision mean of pooled valid ratings, or null when the scope has no
 * valid ratings or its valid ratings span incompatible scales. A blended
 * cross-scale mean is never reported.
 */
export function geEvidenceMean(aggregate: GeEvidenceAggregate): number | null {
  if (aggregate.ratingCount === 0 || aggregate.scaleIdentities.size !== 1) {
    return null;
  }
  return aggregate.ratingSum / aggregate.ratingCount;
}

/** True when pooled valid ratings combine more than one scale identity. */
export function geEvidenceSpansMultipleScales(aggregate: GeEvidenceAggregate): boolean {
  return aggregate.scaleIdentities.size > 1;
}

/** Readable scale context, e.g. "1–5 (5-point)"; null when nothing is rated. */
export function geEvidenceScaleContext(aggregate: GeEvidenceAggregate): string | null {
  return describeScales([...aggregate.scaleIdentities.values()].map((scale) => scale.descriptors));
}

function buildGeScaleGroupDto(
  aggregate: GeEvidenceAggregate,
  scale: ScaleIdentity,
  scaleLabel: string
): GeneralEducationScaleGroupDTO {
  const counts = aggregate.scaleCounts.get(scale.key) ?? new Map<number, number>();
  const ratingCount = [...counts.values()].reduce((total, count) => total + count, 0);
  const ratingSum = aggregate.scaleSums.get(scale.key) ?? 0;
  return {
    scaleKey: scale.key,
    scaleLabel,
    meanRating: ratingCount === 0 ? null : ratingSum / ratingCount,
    ratingCount,
    submittedResponseCount: aggregate.scaleResponseIds.get(scale.key)?.size ?? 0,
    distribution: {
      scaleLabel,
      maxValue: scale.max,
      categories: scale.descriptors.map((descriptor) => ({
        value: descriptor.value,
        label: descriptor.label,
        count: counts.get(descriptor.value) ?? 0,
        percentage: ratingCount === 0 ? 0 : (counts.get(descriptor.value) ?? 0) / ratingCount,
      })),
    },
  };
}

/**
 * One row per distinct frozen scale identity, each with its own mean, rating
 * count, submitted-response count, and full-precision Likert distribution.
 * Incompatible scales stay separate rows instead of collapsing into one mean.
 */
function buildGeScaleGroupDtos(aggregate: GeEvidenceAggregate): GeneralEducationScaleGroupDTO[] {
  return [...aggregate.scaleIdentities.values()]
    .map((scale) => buildGeScaleGroupDto(aggregate, scale, describeScale(scale.descriptors)))
    .sort((left, right) => left.scaleKey.localeCompare(right.scaleKey));
}

// ---------------------------------------------------------------------------
// Grouped evidence collection
// ---------------------------------------------------------------------------

function collectGeEvidenceByKeys(input: {
  ratingRows: readonly GeRatingEvidence[];
  responseRows: readonly GeResponseEvidence[];
  keysOf: (row: GeRatingEvidence | GeResponseEvidence) => readonly string[];
  outcomeIdsOf?: GeOutcomeIdResolver;
  snapshotById: ReadonlyMap<string, unknown>;
}): Map<string, GeEvidenceAggregate> {
  const byKey = new Map<string, GeEvidenceAggregate>();
  const resolve = (key: string): GeEvidenceAggregate => {
    let aggregate = byKey.get(key);
    if (!aggregate) {
      aggregate = emptyGeEvidenceAggregate();
      byKey.set(key, aggregate);
    }
    return aggregate;
  };
  const outcomeIdsOf = input.outcomeIdsOf ?? (() => NO_OUTCOMES);

  for (const row of input.ratingRows) {
    const scale = geRatingScale(row, input.snapshotById);
    const outcomeIds = outcomeIdsOf(row);
    for (const key of input.keysOf(row)) {
      accumulateGeRating(resolve(key), row, scale, outcomeIds);
    }
  }
  for (const row of input.responseRows) {
    for (const key of input.keysOf(row)) {
      accumulateGeResponse(resolve(key), row);
    }
  }

  return byKey;
}

/** Period-keyed evidence: every term instance carrying ratings or submissions. */
export function collectGePeriodEvidence(
  ratingRows: readonly GeRatingEvidence[],
  responseRows: readonly GeResponseEvidence[],
  outcomeIdsOf: GeOutcomeIdResolver | undefined,
  snapshotById: ReadonlyMap<string, unknown>
): Map<string, GeEvidenceAggregate> {
  return collectGeEvidenceByKeys({
    ratingRows,
    responseRows,
    keysOf: (row) => [row.termInstanceId],
    outcomeIdsOf,
    snapshotById,
  });
}

/** Course-keyed evidence, keyed by `Course.id`. */
export function collectGeCourseEvidence(
  ratingRows: readonly GeRatingEvidence[],
  responseRows: readonly GeResponseEvidence[],
  snapshotById: ReadonlyMap<string, unknown>
): Map<string, GeEvidenceAggregate> {
  return collectGeEvidenceByKeys({
    ratingRows,
    responseRows,
    keysOf: (row) => [row.course.id],
    snapshotById,
  });
}

/**
 * Class-context Program-keyed evidence, keyed by `Program.id`. Program
 * attribution comes from the Course Assignment the evaluation ran in, never
 * from a respondent's Program membership.
 */
function collectGeProgramEvidence(
  ratingRows: readonly GeRatingEvidence[],
  responseRows: readonly GeResponseEvidence[],
  snapshotById: ReadonlyMap<string, unknown>
): Map<string, GeEvidenceAggregate> {
  return collectGeEvidenceByKeys({
    ratingRows,
    responseRows,
    keysOf: (row) => [row.classContext.program.id],
    snapshotById,
  });
}

/** Evaluation-keyed evidence, keyed by `CourseBoundEvaluation.id`. */
function collectGeEvaluationEvidence(
  ratingRows: readonly GeRatingEvidence[],
  responseRows: readonly GeResponseEvidence[],
  snapshotById: ReadonlyMap<string, unknown>
): Map<string, GeEvidenceAggregate> {
  return collectGeEvidenceByKeys({
    ratingRows,
    responseRows,
    keysOf: (row) => [row.evaluationId],
    snapshotById,
  });
}

/** Structural key of one Course-by-ILO evidence cell. */
function geCourseOutcomeKey(courseId: string, outcomeId: string): string {
  return JSON.stringify([courseId, outcomeId]);
}

/** Structural key of one Course-by-Program evidence cell. */
function geCourseProgramKey(courseId: string, programId: string): string {
  return JSON.stringify([courseId, programId]);
}

/**
 * Course-by-ILO evidence keyed by `geCourseOutcomeKey`. A rating contributes
 * once per ILO it reaches, so a cell pools only that ILO's raw ratings and the
 * matrix never double-counts one rating inside a cell.
 */
export function collectGeCourseOutcomeEvidence(
  ratingRows: readonly GeRatingEvidence[],
  outcomeIdsOf: GeOutcomeIdResolver,
  snapshotById: ReadonlyMap<string, unknown>
): Map<string, GeEvidenceAggregate> {
  const byCell = new Map<string, GeEvidenceAggregate>();
  for (const row of ratingRows) {
    const scale = geRatingScale(row, snapshotById);
    for (const outcomeId of outcomeIdsOf(row)) {
      const key = geCourseOutcomeKey(row.course.id, outcomeId);
      let aggregate = byCell.get(key);
      if (!aggregate) {
        aggregate = emptyGeEvidenceAggregate();
        byCell.set(key, aggregate);
      }
      accumulateGeRating(aggregate, row, scale, [outcomeId]);
    }
  }
  return byCell;
}

/** Course-by-Program evidence keyed by `geCourseProgramKey`. */
function collectGeCourseProgramEvidence(
  ratingRows: readonly GeRatingEvidence[],
  responseRows: readonly GeResponseEvidence[],
  snapshotById: ReadonlyMap<string, unknown>
): Map<string, GeEvidenceAggregate> {
  return collectGeEvidenceByKeys({
    ratingRows,
    responseRows,
    keysOf: (row) => [geCourseProgramKey(row.course.id, row.classContext.program.id)],
    snapshotById,
  });
}

// ---------------------------------------------------------------------------
// Evaluation opportunities (historical response-rate denominator)
// ---------------------------------------------------------------------------

/** Canonical identity of one class section: Program, year level, and section. */
function classSectionKey(programId: string, yearLevel: YearLevel, section: StudentSection): string {
  return JSON.stringify([programId, yearLevel, section]);
}

/** Opportunity counts and class-context coverage, keyed several ways at once. */
type GeOpportunitySummary = {
  total: number;
  byCourse: Map<string, number>;
  byProgram: Map<string, number>;
  byCourseProgram: Map<string, number>;
  byEvaluation: Map<string, number>;
  byPeriod: Map<string, number>;
  /** Course -> distinct class-section keys. */
  sectionsByCourse: Map<string, Set<string>>;
  /** Course -> distinct class-context Program ids. */
  programsByCourse: Map<string, Set<string>>;
  /** Program -> distinct course ids it was assessed in. */
  coursesByProgram: Map<string, Set<string>>;
  /** Program -> distinct class-section keys. */
  sectionsByProgram: Map<string, Set<string>>;
};

/**
 * Count every in-scope `EvaluationAssignment` once. Archived historical
 * assignments stay in the denominator, so a scope's response rate never
 * silently changes when a class or evaluation is archived.
 */
export function summarizeGeOpportunities(
  assignments: readonly GeAssignmentRow[]
): GeOpportunitySummary {
  const summary: GeOpportunitySummary = {
    total: assignments.length,
    byCourse: new Map(),
    byProgram: new Map(),
    byCourseProgram: new Map(),
    byEvaluation: new Map(),
    byPeriod: new Map(),
    sectionsByCourse: new Map(),
    programsByCourse: new Map(),
    coursesByProgram: new Map(),
    sectionsByProgram: new Map(),
  };
  const increment = (byKey: Map<string, number>, key: string): void => {
    byKey.set(key, (byKey.get(key) ?? 0) + 1);
  };

  for (const row of assignments) {
    increment(summary.byCourse, row.course.id);
    increment(summary.byProgram, row.program.id);
    increment(summary.byCourseProgram, geCourseProgramKey(row.course.id, row.program.id));
    increment(summary.byEvaluation, row.evaluationId);
    increment(summary.byPeriod, row.termInstanceId);
    const section = classSectionKey(row.program.id, row.yearLevel, row.section);
    addIdTo(summary.sectionsByCourse, row.course.id, section);
    addIdTo(summary.sectionsByProgram, row.program.id, section);
    addIdTo(summary.programsByCourse, row.course.id, row.program.id);
    addIdTo(summary.coursesByProgram, row.program.id, row.course.id);
  }

  return summary;
}

/** Submitted-over-opportunity share; null when the scope has no opportunities. */
export function geResponseRate(submitted: number, opportunities: number): number | null {
  return opportunities === 0 ? null : submitted / opportunities;
}

/**
 * Scope empty-state precedence shared by the Coordinator's evidence views:
 * opportunities first, then submissions. An empty opportunity scope is
 * explained before any view-specific reason.
 */
export function geScopeEmptyReason(
  evaluationOpportunityCount: number,
  submittedResponseCount: number
): GeneralEducationAnalyticsEmptyReason {
  if (evaluationOpportunityCount === 0) return "no-assignments";
  return submittedResponseCount === 0 ? "no-submissions" : null;
}

// ---------------------------------------------------------------------------
// Comparability
// ---------------------------------------------------------------------------

/**
 * Identity of one evidence scope for period-over-period comparability. Two
 * scopes are comparable only when instrument versions, frozen scale
 * identities, the semantic question set, mapped ILO codes, the normalized
 * instrument-to-respondent mix of rating-bearing respondents, and the course
 * population composition all match. Every dimension is sorted for
 * order-independent equality.
 */
type GeComparabilityFingerprint = {
  instrumentVersions: string[];
  scaleIdentities: string[];
  questionIdentities: string[];
  outcomeCodes: string[];
  instrumentRespondentComposition: string[];
  courseComposition: string[];
  courseProgramComposition: string[];
};

function buildGeComparabilityFingerprint(
  aggregate: GeEvidenceAggregate
): GeComparabilityFingerprint {
  return {
    instrumentVersions: [...aggregate.instrumentVersionIds].sort(),
    scaleIdentities: [...aggregate.scaleIdentities.keys()].sort(),
    questionIdentities: [...aggregate.questionIdentities].sort(),
    outcomeCodes: [...aggregate.outcomeCodes].sort(),
    // Only rating-bearing respondents define the population behind a plotted
    // mean; submitted-but-unrated responses never do. General Education
    // evidence is Course-bound only, so there is no separate source dimension
    // to normalize: the instrument-to-respondent relation is the composition.
    instrumentRespondentComposition: buildSourceComposition(
      new Map([...aggregate.instrumentResponseIds].map(([versionId, ids]) => [versionId, ids.size]))
    ),
    courseComposition: buildSourceComposition(
      new Map([...aggregate.courseResponseIds].map(([courseId, ids]) => [courseId, ids.size]))
    ),
    courseProgramComposition: buildSourceComposition(
      new Map([...aggregate.courseProgramResponseIds].map(([key, ids]) => [key, ids.size]))
    ),
  };
}

function arraysEqual(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

/** True when two scopes are the same comparable measurement. */
function geFingerprintsEqual(
  left: GeComparabilityFingerprint,
  right: GeComparabilityFingerprint
): boolean {
  return (
    arraysEqual(left.instrumentVersions, right.instrumentVersions) &&
    arraysEqual(left.scaleIdentities, right.scaleIdentities) &&
    arraysEqual(left.questionIdentities, right.questionIdentities) &&
    arraysEqual(left.outcomeCodes, right.outcomeCodes) &&
    arraysEqual(left.instrumentRespondentComposition, right.instrumentRespondentComposition) &&
    arraysEqual(left.courseComposition, right.courseComposition) &&
    arraysEqual(left.courseProgramComposition, right.courseProgramComposition)
  );
}

/** Human-readable reasons two scopes are not comparable. */
function describeGeFingerprintChange(
  previous: GeComparabilityFingerprint,
  current: GeComparabilityFingerprint
): string[] {
  const reasons: string[] = [];
  if (!arraysEqual(previous.instrumentVersions, current.instrumentVersions)) {
    reasons.push("The instrument version changed between these periods.");
  }
  if (!arraysEqual(previous.scaleIdentities, current.scaleIdentities)) {
    reasons.push("The rating scale identity changed between these periods.");
  }
  if (!arraysEqual(previous.questionIdentities, current.questionIdentities)) {
    reasons.push("The set of CILO-bound questions changed between these periods.");
  }
  if (!arraysEqual(previous.outcomeCodes, current.outcomeCodes)) {
    reasons.push("The mapped Institutional Learning Outcomes changed between these periods.");
  }
  if (
    !arraysEqual(previous.instrumentRespondentComposition, current.instrumentRespondentComposition)
  ) {
    reasons.push("The instrument-to-respondent composition changed between these periods.");
  }
  if (!arraysEqual(previous.courseComposition, current.courseComposition)) {
    reasons.push("The course population composition changed between these periods.");
  }
  if (!arraysEqual(previous.courseProgramComposition, current.courseProgramComposition)) {
    reasons.push("The course and class-context Program composition changed between these periods.");
  }
  return reasons;
}

/** Readable instrument-version context, e.g. "GE CILO Evaluation v2". */
function geInstrumentContext(
  aggregate: GeEvidenceAggregate,
  instrumentLabels: ReadonlyMap<string, string>
): string | null {
  const labels = [...aggregate.instrumentVersionIds]
    .map((versionId) => instrumentLabels.get(versionId))
    .filter((label): label is string => Boolean(label));
  return labels.length > 0 ? [...new Set(labels)].sort().join(", ") : null;
}

/** Canonical academic parts of one term instance for chronology and labels. */
type GePeriodInstance = {
  id: string;
  semester: string;
  term: string | null;
  school_year: { code: string };
};

function periodSortKey(instance: GePeriodInstance): readonly [string, number, number] {
  return [instance.school_year.code, semesterOrder(instance.semester), termOrder(instance.term)];
}

function comparePeriodInstances(left: GePeriodInstance, right: GePeriodInstance): number {
  return (
    left.school_year.code.localeCompare(right.school_year.code) ||
    semesterOrder(left.semester) - semesterOrder(right.semester) ||
    termOrder(left.term) - termOrder(right.term) ||
    left.id.localeCompare(right.id)
  );
}

/**
 * The chronological predecessor of the selected period among the periods that
 * actually carry General Education evidence or opportunities. A period outside
 * that set has no comparable predecessor, and the selected period must itself
 * be in the set to be positioned — an unpositioned period never borrows a
 * neighbour's delta.
 */
export function resolveGePreviousComparablePeriod(input: {
  termInstanceId: string;
  eligibleTermInstanceIds: ReadonlySet<string>;
  instances: readonly GePeriodInstance[];
}): { current: GePeriodInstance; previous: GePeriodInstance } | null {
  const ordered = input.instances
    .filter((instance) => input.eligibleTermInstanceIds.has(instance.id))
    .sort(comparePeriodInstances);
  const index = ordered.findIndex((instance) => instance.id === input.termInstanceId);
  if (index < 1) return null;
  return { current: ordered[index], previous: ordered[index - 1] };
}

/** One period of evidence resolved into a comparable series point. */
type GeTrendPeriodInput = {
  termInstanceId: string;
  periodLabel: string;
  sortKey: readonly [string, number, number];
  meanRating: number | null;
  submittedResponseCount: number;
  evaluationOpportunityCount: number;
  ratingCount: number;
  instrumentContext: string | null;
  scaleContext: string | null;
  scaleDomain: [number, number] | null;
  outcomeCodes: string[];
  fingerprint: GeComparabilityFingerprint;
};

/**
 * Trend inputs for every period that carries evidence or opportunities. A
 * period with opportunities but no submissions, or submissions without valid
 * ratings, still appears: an unrated period never bridges two plotted points,
 * and dropping it would hide the response-rate movement it explains.
 *
 * Opportunity counts stay scope-wide even when rating evidence is narrowed to
 * one ILO: the response-rate denominator is the assignment population, so
 * narrowing the numerator would invent an ILO-specific denominator.
 */
export function buildGeTrendPeriodInputs(input: {
  periodEvidence: ReadonlyMap<string, GeEvidenceAggregate>;
  opportunitiesByPeriod: ReadonlyMap<string, number>;
  instancesById: ReadonlyMap<string, GePeriodInstance>;
  instrumentLabels: ReadonlyMap<string, string>;
  periodLabelOf: (instance: GePeriodInstance) => string;
}): GeTrendPeriodInput[] {
  const termInstanceIds = new Set([
    ...input.periodEvidence.keys(),
    ...input.opportunitiesByPeriod.keys(),
  ]);
  const inputs: GeTrendPeriodInput[] = [];

  for (const termInstanceId of termInstanceIds) {
    const instance = input.instancesById.get(termInstanceId);
    if (!instance) continue;
    const aggregate = input.periodEvidence.get(termInstanceId) ?? emptyGeEvidenceAggregate();
    const scale =
      aggregate.scaleIdentities.size === 1
        ? aggregate.scaleIdentities.values().next().value
        : undefined;
    inputs.push({
      termInstanceId,
      periodLabel: input.periodLabelOf(instance),
      sortKey: periodSortKey(instance),
      meanRating: geEvidenceMean(aggregate),
      submittedResponseCount: aggregate.responseIds.size,
      evaluationOpportunityCount: input.opportunitiesByPeriod.get(termInstanceId) ?? 0,
      ratingCount: aggregate.ratingCount,
      instrumentContext: geInstrumentContext(aggregate, input.instrumentLabels),
      scaleContext: geEvidenceScaleContext(aggregate),
      scaleDomain: scale ? [scale.min, scale.max] : null,
      outcomeCodes: [...aggregate.outcomeCodes].sort(),
      fingerprint: buildGeComparabilityFingerprint(aggregate),
    });
  }

  return inputs;
}

/**
 * Sort periods chronologically and resolve comparability, breaks, and the empty
 * reason. Two rated periods join only when their fingerprints match; an
 * unrated transition never joins a run and never fabricates a break reason, so
 * a single point is never implied to be a flat trend. Response-rate
 * chronology is reported independently of mean comparability.
 */
function longestComparableRun(periods: GeneralEducationTrendsDTO["periods"]): number {
  let longestRun = 0;
  let run = 0;
  for (const period of periods) {
    if (period.meanRating === null) run = 0;
    else run = period.comparableWithPrevious ? run + 1 : 1;
    longestRun = Math.max(longestRun, run);
  }
  return longestRun;
}

export function buildGeTrendSeries(
  inputs: readonly GeTrendPeriodInput[]
): Pick<GeneralEducationTrendsDTO, "periods" | "breaks" | "emptyReason"> {
  const sorted = [...inputs].sort(
    (left, right) =>
      left.sortKey[0].localeCompare(right.sortKey[0]) ||
      left.sortKey[1] - right.sortKey[1] ||
      left.sortKey[2] - right.sortKey[2] ||
      left.termInstanceId.localeCompare(right.termInstanceId)
  );

  const periods = sorted.map((input, index) => {
    const previous = sorted[index - 1];
    return {
      termInstanceId: input.termInstanceId,
      periodLabel: input.periodLabel,
      meanRating: input.meanRating,
      submittedResponseCount: input.submittedResponseCount,
      evaluationOpportunityCount: input.evaluationOpportunityCount,
      responseRate: geResponseRate(input.submittedResponseCount, input.evaluationOpportunityCount),
      ratingCount: input.ratingCount,
      instrumentContext: input.instrumentContext,
      scaleContext: input.scaleContext,
      scaleDomain: input.scaleDomain,
      outcomeCodes: input.outcomeCodes,
      comparableWithPrevious:
        previous !== undefined &&
        previous.meanRating !== null &&
        input.meanRating !== null &&
        geFingerprintsEqual(previous.fingerprint, input.fingerprint),
    };
  });

  const breaks: GeneralEducationTrendsDTO["breaks"] = [];
  for (let index = 1; index < sorted.length; index += 1) {
    const previous = sorted[index - 1];
    const current = sorted[index];
    if (previous.meanRating === null || current.meanRating === null) continue;
    if (geFingerprintsEqual(previous.fingerprint, current.fingerprint)) continue;
    breaks.push({
      fromPeriodLabel: previous.periodLabel,
      toPeriodLabel: current.periodLabel,
      reason: describeGeFingerprintChange(previous.fingerprint, current.fingerprint).join(" "),
    });
  }

  const longestRun = longestComparableRun(periods);

  return {
    periods,
    breaks,
    emptyReason:
      periods.length === 0 ? "no-evidence" : longestRun < 2 ? "no-comparable-history" : null,
  };
}

/** One course row's comparable predecessor. */
type GeCourseComparable = { periodLabel: string; meanRating: number; change: number };

/**
 * Previous-period means a course row may compare against. A predecessor counts
 * only when it carries its own valid single-scale ratings and its evidence
 * fingerprint is identical to the current period's; otherwise the change would
 * describe a different instrument, scale, question set, ILO set, or course
 * population. Each side pools raw ratings, so the delta is never a difference
 * of means of means.
 */
export function buildGeCoursePreviousComparable(input: {
  current: ReadonlyMap<string, GeEvidenceAggregate>;
  previous: ReadonlyMap<string, GeEvidenceAggregate>;
  previousLabel: string;
}): Map<string, GeCourseComparable> {
  const comparable = new Map<string, GeCourseComparable>();

  for (const [courseId, currentAggregate] of input.current) {
    const currentMean = geEvidenceMean(currentAggregate);
    const previousAggregate = input.previous.get(courseId);
    if (currentMean === null || !previousAggregate) continue;
    const previousMean = geEvidenceMean(previousAggregate);
    if (previousMean === null) continue;
    if (
      !geFingerprintsEqual(
        buildGeComparabilityFingerprint(currentAggregate),
        buildGeComparabilityFingerprint(previousAggregate)
      )
    ) {
      continue;
    }
    comparable.set(courseId, {
      periodLabel: input.previousLabel,
      meanRating: previousMean,
      change: currentMean - previousMean,
    });
  }

  return comparable;
}

// ---------------------------------------------------------------------------
// Courses view
// ---------------------------------------------------------------------------

/** Display labels the service resolves for the Courses view. */
type GeCourseRowLabels = {
  /** Course -> ILOs aligned through that course's own CILOs. */
  alignedIlosByCourse: ReadonlyMap<string, Array<{ id: string; code: string }>>;
  yearLevelLabel: (yearLevel: YearLevel) => string;
  sectionLabel: (section: StudentSection) => string;
};

/**
 * One General Education course row: scale-separated evidence, class-context
 * section detail, contributing evaluations, and the optional comparable
 * predecessor. A course whose class was only assigned but never answered
 * appears with a null mean, so a scope with opportunities never reads empty.
 */
export function buildGeCourseRows(input: {
  ratingRows: readonly GeRatingEvidence[];
  responseRows: readonly GeResponseEvidence[];
  assignments: readonly GeAssignmentRow[];
  snapshotById: ReadonlyMap<string, unknown>;
  instrumentLabels: ReadonlyMap<string, string>;
  labels: GeCourseRowLabels;
  previousComparable?: ReadonlyMap<string, GeCourseComparable>;
}): GeneralEducationCourseBreakdownRow[] {
  const courseEvidence = collectGeCourseEvidence(
    input.ratingRows,
    input.responseRows,
    input.snapshotById
  );
  const evaluationEvidence = collectGeEvaluationEvidence(
    input.ratingRows,
    input.responseRows,
    input.snapshotById
  );
  const opportunities = summarizeGeOpportunities(input.assignments);
  const courses = new Map<string, GeCourseRef>();
  const evaluationIdsByCourse = new Map<string, Set<string>>();
  const deployments = new Map<string, string>();
  const classContextByEvaluation = new Map<string, GeClassContext>();
  const instrumentIdsByCourse = new Map<string, Set<string>>();

  for (const row of [...input.ratingRows, ...input.responseRows]) {
    courses.set(row.course.id, row.course);
    addIdTo(evaluationIdsByCourse, row.course.id, row.evaluationId);
    deployments.set(row.evaluationId, row.deploymentName);
    classContextByEvaluation.set(row.evaluationId, row.classContext);
    addIdTo(instrumentIdsByCourse, row.course.id, row.instrumentVersionId);
  }
  for (const row of input.assignments) {
    courses.set(row.course.id, row.course);
    addIdTo(evaluationIdsByCourse, row.course.id, row.evaluationId);
    classContextByEvaluation.set(row.evaluationId, {
      program: row.program,
      yearLevel: row.yearLevel,
      section: row.section,
      facultyName: row.facultyName,
    });
    if (row.deploymentName) deployments.set(row.evaluationId, row.deploymentName);
    if (row.instrumentVersionId)
      addIdTo(instrumentIdsByCourse, row.course.id, row.instrumentVersionId);
  }

  function courseOpportunityContext(courseId: string) {
    return {
      sectionCount: opportunities.sectionsByCourse.get(courseId)?.size ?? 0,
      programCount: opportunities.programsByCourse.get(courseId)?.size ?? 0,
      alignedIlos: input.labels.alignedIlosByCourse.get(courseId) ?? [],
      previousComparable: input.previousComparable?.get(courseId) ?? null,
    };
  }

  const rows: GeneralEducationCourseBreakdownRow[] = [...courses.values()].map((course) => {
    const aggregate = courseEvidence.get(course.id) ?? emptyGeEvidenceAggregate();
    const courseOpportunities = opportunities.byCourse.get(course.id) ?? 0;
    const evaluationIds = [...(evaluationIdsByCourse.get(course.id) ?? [])];
    const instrumentContext = [...(instrumentIdsByCourse.get(course.id) ?? [])]
      .map((versionId) => input.instrumentLabels.get(versionId))
      .filter((label): label is string => Boolean(label));

    return {
      courseId: course.id,
      courseCode: course.code,
      courseTitle: course.title,
      ...courseOpportunityContext(course.id),
      evaluationOpportunityCount: courseOpportunities,
      submittedResponseCount: aggregate.responseIds.size,
      responseRate: geResponseRate(aggregate.responseIds.size, courseOpportunities),
      meanRating: geEvidenceMean(aggregate),
      ratingCount: aggregate.ratingCount,
      excludedRatingCount: aggregate.excludedRatingCount,
      spansMultipleScales: geEvidenceSpansMultipleScales(aggregate),
      instrumentContext:
        instrumentContext.length > 0 ? [...new Set(instrumentContext)].sort().join(", ") : null,
      scaleGroups: buildGeScaleGroupDtos(aggregate),
      evidenceEvaluations: evaluationIds
        .map((evaluationId) => ({
          evaluationId,
          deploymentName: deployments.get(evaluationId) ?? "",
        }))
        .sort(
          (left, right) =>
            left.deploymentName.localeCompare(right.deploymentName) ||
            left.evaluationId.localeCompare(right.evaluationId)
        ),
      sections: evaluationIds
        .map((evaluationId) => {
          const evaluationAggregate =
            evaluationEvidence.get(evaluationId) ?? emptyGeEvidenceAggregate();
          const classContext = classContextByEvaluation.get(evaluationId);
          return {
            evaluationId,
            programCode: classContext?.program.code ?? "—",
            yearLevel: classContext ? input.labels.yearLevelLabel(classContext.yearLevel) : "—",
            section: classContext ? input.labels.sectionLabel(classContext.section) : "—",
            facultyName: classContext?.facultyName ?? "—",
            submittedResponseCount: evaluationAggregate.responseIds.size,
            evaluationOpportunityCount: opportunities.byEvaluation.get(evaluationId) ?? 0,
            meanRating: geEvidenceMean(evaluationAggregate),
          };
        })
        .sort(
          (left, right) =>
            left.programCode.localeCompare(right.programCode) ||
            left.yearLevel.localeCompare(right.yearLevel) ||
            left.section.localeCompare(right.section) ||
            left.evaluationId.localeCompare(right.evaluationId)
        ),
    };
  });

  rows.sort((left, right) => left.courseCode.localeCompare(right.courseCode));
  return rows;
}

// ---------------------------------------------------------------------------
// Programs view
// ---------------------------------------------------------------------------

/** Program rows plus the Course-by-Program matrix. */
export function buildGeProgramRows(input: {
  ratingRows: readonly GeRatingEvidence[];
  responseRows: readonly GeResponseEvidence[];
  assignments: readonly GeAssignmentRow[];
  snapshotById: ReadonlyMap<string, unknown>;
}): Pick<GeneralEducationProgramsDTO, "rows" | "courseMatrix"> {
  const programEvidence = collectGeProgramEvidence(
    input.ratingRows,
    input.responseRows,
    input.snapshotById
  );
  const courseProgramEvidence = collectGeCourseProgramEvidence(
    input.ratingRows,
    input.responseRows,
    input.snapshotById
  );
  const opportunities = summarizeGeOpportunities(input.assignments);
  const programs = new Map<string, GeProgramRef>();
  const courses = new Map<string, GeCourseRef>();

  for (const row of input.assignments) {
    programs.set(row.program.id, row.program);
    courses.set(row.course.id, row.course);
  }
  for (const row of [...input.ratingRows, ...input.responseRows]) {
    programs.set(row.classContext.program.id, row.classContext.program);
    courses.set(row.course.id, row.course);
  }

  const rows = [...programs.values()]
    .map((program) => {
      const aggregate = programEvidence.get(program.id) ?? emptyGeEvidenceAggregate();
      const programOpportunities = opportunities.byProgram.get(program.id) ?? 0;
      return {
        programId: program.id,
        programCode: program.code,
        programName: program.name,
        courseCount: opportunities.coursesByProgram.get(program.id)?.size ?? 0,
        sectionCount: opportunities.sectionsByProgram.get(program.id)?.size ?? 0,
        evaluationOpportunityCount: programOpportunities,
        submittedResponseCount: aggregate.responseIds.size,
        responseRate: geResponseRate(aggregate.responseIds.size, programOpportunities),
        meanRating: geEvidenceMean(aggregate),
        ratingCount: aggregate.ratingCount,
        spansMultipleScales: geEvidenceSpansMultipleScales(aggregate),
        scaleGroups: buildGeScaleGroupDtos(aggregate),
      };
    })
    .sort((left, right) => left.programCode.localeCompare(right.programCode));

  const courseMatrix = [...courses.values()]
    .map((course) => ({
      courseId: course.id,
      courseCode: course.code,
      cells: [...programs.keys()]
        .map((programId) => {
          const aggregate = courseProgramEvidence.get(geCourseProgramKey(course.id, programId));
          const opportunitiesInCell =
            opportunities.byCourseProgram.get(geCourseProgramKey(course.id, programId)) ?? 0;
          return {
            programId,
            meanRating: aggregate ? geEvidenceMean(aggregate) : null,
            ratingCount: aggregate?.ratingCount ?? 0,
            submittedResponseCount: aggregate?.responseIds.size ?? 0,
            spansMultipleScales: aggregate ? geEvidenceSpansMultipleScales(aggregate) : false,
            opportunitiesInCell,
          };
        })
        .filter(
          (cell) =>
            cell.ratingCount > 0 || cell.submittedResponseCount > 0 || cell.opportunitiesInCell > 0
        )
        .map((cell) => ({
          programId: cell.programId,
          meanRating: cell.meanRating,
          ratingCount: cell.ratingCount,
          submittedResponseCount: cell.submittedResponseCount,
          spansMultipleScales: cell.spansMultipleScales,
        })),
    }))
    .filter((entry) => entry.cells.length > 0)
    .sort((left, right) => left.courseCode.localeCompare(right.courseCode));

  return { rows, courseMatrix };
}

// ---------------------------------------------------------------------------
// Outcomes view
// ---------------------------------------------------------------------------

/**
 * Disclosure that historical General Education ratings group by the current
 * CILO-to-ILO mappings: no ILO mapping is frozen at publication, so a later
 * mapping edit reinterprets published history.
 */
export const GE_CURRENT_MAPPING_DISCLOSURE =
  "ILO rows group historical ratings using the current CILO-to-ILO mappings. " +
  "Mapping snapshots are not captured at publication, so later mapping edits may reinterpret historical ILO rows.";

/** Explanatory copy for the Programs view's class-context attribution rule. */
export const GE_PROGRAM_ATTRIBUTION_NOTE =
  "Program attribution comes from the course assignment the evaluation ran in " +
  "(class context), not from respondent Program membership. Central deployment " +
  "evidence is outside General Education analytics.";

/** One ILO as published in the college-wide catalog, active or archived. */
export type GeIloCatalogRow = {
  id: string;
  code: string;
  description: string;
  order: number;
  isActive: boolean;
};

/** One active CILO's current mapping to one ILO, for structural alignment. */
export type GeCiloIloAlignment = {
  ciloId: string;
  courseId: string;
  outcomeId: string;
  manifestation: "LEARNING" | "PRACTICE" | "OPPORTUNITY" | null;
};

/**
 * Alignment coverage per ILO from current mappings alone: how many distinct
 * active, scope-resident CILOs map to that ILO under each manifestation.
 *
 * Coverage is structural, not earned: a CILO counts because its mapping
 * exists today, whether or not any rating was submitted this period, so the
 * chart describes institutional alignment rather than the evidence that
 * happened to arrive. Manifestation stays descriptive — it never filters,
 * orders, or weights a mean — and the counts are unique CILOs, so one CILO
 * mapped to several ILOs is counted once in each. Manifestation belongs to the
 * mapping, not the CILO: a CILO that manifests as learning under one ILO and as
 * opportunity under another is bucketed by each ILO's own manifestation, which
 * keeps the result independent of the order mapping rows arrive in.
 */
export function buildGeAlignmentCoverage(input: {
  outcomes: readonly GeneralEducationIloEvidenceDTO[];
  alignments: readonly GeCiloIloAlignment[];
}): GeneralEducationOutcomesDTO["alignmentCoverage"] {
  const manifestationByOutcomeCilo = new Map<
    string,
    Map<string, GeCiloIloAlignment["manifestation"]>
  >();
  for (const alignment of input.alignments) {
    const byCilo = manifestationByOutcomeCilo.get(alignment.outcomeId) ?? new Map();
    // The pair is already present, so the row repeats one mapping rather than
    // a second CILO; keeping the first occurrence makes the count order-free.
    if (!byCilo.has(alignment.ciloId)) {
      byCilo.set(alignment.ciloId, alignment.manifestation);
    }
    manifestationByOutcomeCilo.set(alignment.outcomeId, byCilo);
  }

  return input.outcomes.map((outcome) => {
    const coverage = { learning: 0, practice: 0, opportunity: 0, unclassified: 0 };
    const alignedCilos = manifestationByOutcomeCilo.get(outcome.outcomeId);
    for (const manifestation of alignedCilos?.values() ?? []) {
      if (manifestation === "LEARNING") coverage.learning += 1;
      else if (manifestation === "PRACTICE") coverage.practice += 1;
      else if (manifestation === "OPPORTUNITY") coverage.opportunity += 1;
      else coverage.unclassified += 1;
    }
    return { outcomeId: outcome.outcomeId, code: outcome.code, ...coverage };
  });
}

function buildEmptyIloRow(catalogRow: GeIloCatalogRow): GeneralEducationIloEvidenceDTO {
  return {
    outcomeId: catalogRow.id,
    code: catalogRow.code,
    name: catalogRow.description,
    meanRating: null,
    ratingCount: 0,
    submittedResponseCount: 0,
    contributingCilos: [],
    contributingCourses: [],
    contributors: [],
    evidenceEvaluations: [],
    distributions: [],
    spansMultipleScales: false,
    excludedRatingCount: 0,
    evidenceSummary: {
      ratingCount: 0,
      responseCount: 0,
      evaluationCount: 0,
      explanation:
        "No General Education rating currently maps to this Institutional Learning Outcome through a CILO.",
    },
    isActive: catalogRow.isActive,
    order: catalogRow.order,
  };
}

/**
 * Merge aggregated ILO evidence with the published catalog: every active ILO
 * appears even without evidence so the catalog stays visible, an archived ILO
 * appears when history still reaches it, and catalog order wins over mean
 * ranking. Evidence for an outcome outside the catalog is kept rather than
 * dropped, so a deleted catalog row never silently discards published history.
 */
export function mergeGeIloRows(
  catalog: readonly GeIloCatalogRow[],
  evidenceDtos: readonly OutcomeEvidenceDTO[]
): GeneralEducationIloEvidenceDTO[] {
  const evidenceById = new Map(evidenceDtos.map((dto) => [dto.outcomeId, dto]));
  const rows: GeneralEducationIloEvidenceDTO[] = [];

  for (const catalogRow of catalog) {
    const evidence = evidenceById.get(catalogRow.id);
    if (evidence) {
      rows.push({
        ...evidence,
        code: catalogRow.code,
        name: catalogRow.description,
        isActive: catalogRow.isActive,
        order: catalogRow.order,
      });
    } else if (catalogRow.isActive) {
      rows.push(buildEmptyIloRow(catalogRow));
    }
  }

  const catalogIds = new Set(catalog.map((row) => row.id));
  for (const evidence of evidenceDtos) {
    if (!catalogIds.has(evidence.outcomeId)) {
      rows.push({ ...evidence, isActive: true, order: Number.MAX_SAFE_INTEGER });
    }
  }

  return rows.sort(
    (left, right) =>
      left.order - right.order ||
      left.code.localeCompare(right.code) ||
      left.outcomeId.localeCompare(right.outcomeId)
  );
}

/**
 * Course-by-ILO matrix for the current scope: one cell per course and ILO
 * carrying that course's pooled mean and rating count, plus whether the course
 * has a CILO mapped to the ILO at all. Alignment is structural, so a course
 * stays aligned with an ILO that has no ratings in the selected period.
 */
export function buildGeOutcomeCourseMatrix(input: {
  courses: readonly GeCourseRef[];
  outcomes: readonly GeneralEducationIloEvidenceDTO[];
  courseOutcomeEvidence: ReadonlyMap<string, GeEvidenceAggregate>;
  alignedOutcomeIdsByCourse: ReadonlyMap<string, ReadonlySet<string>>;
}): GeneralEducationOutcomesDTO["courseMatrix"] {
  return [...input.courses]
    .map((course) => {
      const aligned = input.alignedOutcomeIdsByCourse.get(course.id) ?? new Set<string>();
      return {
        courseId: course.id,
        courseCode: course.code,
        courseTitle: course.title,
        cells: input.outcomes.map((outcome) => {
          const aggregate = input.courseOutcomeEvidence.get(
            geCourseOutcomeKey(course.id, outcome.outcomeId)
          );
          return {
            outcomeId: outcome.outcomeId,
            aligned: aligned.has(outcome.outcomeId),
            meanRating: aggregate ? geEvidenceMean(aggregate) : null,
            ratingCount: aggregate?.ratingCount ?? 0,
            spansMultipleScales: aggregate ? geEvidenceSpansMultipleScales(aggregate) : false,
          };
        }),
      };
    })
    .sort((left, right) => left.courseCode.localeCompare(right.courseCode));
}

/**
 * Split valid ratings that reached no outcome into the two reasons an
 * evidence chain stops: a general item with no CILO binding at all, and a CILO
 * that is bound to the question but maps to no ILO. A binding whose CILO row
 * was deleted is unmapped, never a general item — the frozen binding proves the
 * question was CILO-bound when it was published.
 */
export function summarizeUnlinkedRatings(input: {
  ratingRows: readonly GeRatingEvidence[];
  outcomeIdsOf: GeOutcomeIdResolver;
  isValidRating: (row: GeRatingEvidence) => boolean;
}): GeneralEducationOutcomesDTO["unlinkedRatings"] {
  let generalItems = 0;
  let unmappedCilos = 0;
  for (const row of input.ratingRows) {
    if (input.outcomeIdsOf(row).length > 0 || !input.isValidRating(row)) continue;
    if (row.ciloId === null && row.ciloDescription === null) generalItems += 1;
    else unmappedCilos += 1;
  }
  return { generalItems, unmappedCilos };
}
