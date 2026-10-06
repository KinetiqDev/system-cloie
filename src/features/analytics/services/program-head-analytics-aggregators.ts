import { resolveSnapshotItemScale } from "../aggregators/scale-identity";
import type { TargetStakeholder, YearLevel } from "@prisma/client";
import { getYearLevelDisplay } from "@/lib/constants/year-levels";
import type {
  ProgramHeadBreakdownRowDTO,
  ProgramHeadCourseBreakdownRowDTO,
  ProgramHeadInstrumentBreakdownRowDTO,
  ProgramHeadInstrumentSourceDTO,
  ProgramHeadOverviewKPI,
  ProgramHeadStakeholderBucketDTO,
  ProgramHeadStakeholderSourceKey,
  ProgramHeadTrendBreakDTO,
  ProgramHeadTrendPeriodDTO,
  ProgramHeadTrendsEmptyReason,
} from "../program-head-analytics-types";

// ---------------------------------------------------------------------------
// Comparability fingerprint
// ---------------------------------------------------------------------------

/**
 * Identity of a period's evidence for trend comparability. Two periods are
 * comparable only when every dimension matches: immutable instrument version
 * IDs, the source-to-instrument relation and normalized response share, Likert
 * scale identities, mapped Program Outcome codes, and normalized
 * source composition. The relation prevents two sources exchanging instrument
 * versions from appearing comparable merely because the unordered source and
 * instrument sets still match. All arrays are sorted for order-independent
 * equality.
 */
export type TrendComparabilityFingerprint = {
  instrumentVersions: string[];
  scaleIdentities: string[];
  outcomeCodes: string[];
  sourceComposition: string[];
  sourceInstrumentComposition: string[];
};
function arraysEqual(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

/**
 * Normalized per-source mix of distinct rating-bearing responses for one
 * period, e.g. `["CENTRAL:0.38", "COURSE_BOUND:0.62"]`. Shares round to the
 * nearest percent so trivial count jitter does not break comparability, while
 * a materially shifted mix does. Sorted for order-independent equality.
 */
export function buildSourceComposition(counts: ReadonlyMap<string, number>): string[] {
  let total = 0;
  for (const count of counts.values()) total += count;
  if (total === 0) return [];
  const entries: string[] = [];
  for (const [source, count] of counts) {
    entries.push(`${source}:${(Math.round((count / total) * 100) / 100).toFixed(2)}`);
  }
  return entries.sort();
}
export function fingerprintsEqual(
  left: TrendComparabilityFingerprint,
  right: TrendComparabilityFingerprint
): boolean {
  return (
    arraysEqual(left.instrumentVersions, right.instrumentVersions) &&
    arraysEqual(left.scaleIdentities, right.scaleIdentities) &&
    arraysEqual(left.outcomeCodes, right.outcomeCodes) &&
    arraysEqual(left.sourceComposition, right.sourceComposition) &&
    arraysEqual(left.sourceInstrumentComposition, right.sourceInstrumentComposition)
  );
}

/** Human-readable reasons why two fingerprints are not comparable. */
function describeFingerprintChange(
  previous: TrendComparabilityFingerprint,
  current: TrendComparabilityFingerprint
): string[] {
  const reasons: string[] = [];
  if (!arraysEqual(previous.instrumentVersions, current.instrumentVersions)) {
    reasons.push("The instrument version changed between these periods.");
  }
  if (!arraysEqual(previous.scaleIdentities, current.scaleIdentities)) {
    reasons.push("The rating scale identity changed between these periods.");
  }
  if (!arraysEqual(previous.outcomeCodes, current.outcomeCodes)) {
    reasons.push("The mapped outcomes changed between these periods.");
  }
  if (!arraysEqual(previous.sourceComposition, current.sourceComposition)) {
    reasons.push("The response source composition changed between these periods.");
  }
  if (!arraysEqual(previous.sourceInstrumentComposition, current.sourceInstrumentComposition)) {
    reasons.push("The source-to-instrument evidence composition changed between these periods.");
  }
  return reasons;
}

// ---------------------------------------------------------------------------
// Period series
// ---------------------------------------------------------------------------

const SEMESTER_ORDER: Record<string, number> = { FIRST: 0, SECOND: 1, SUMMER: 2 };
const TERM_ORDER: Record<string, number> = { FIRST_TERM: 0, SECOND_TERM: 1 };

/** Canonical semester order for chronological period sorting. */
export function semesterOrder(semester: string): number {
  return SEMESTER_ORDER[semester] ?? 99;
}

/** Canonical term order for chronological period sorting; null sorts first. */
export function termOrder(term: string | null): number {
  return term ? (TERM_ORDER[term] ?? 99) : -1;
}

/** Per-period evidence assembled by the trends read before series resolution. */
export type TrendSeriesPeriodInput = {
  termInstanceId: string;
  periodLabel: string;
  /** Chronological sort key: school year code, semester order, term order. */
  sortKey: readonly [string, number, number];
  meanRating: number | null;
  submittedResponseCount: number;
  ratingCount: number;
  instrumentContext: string | null;
  scaleContext: string | null;
  outcomeCodes: string[];
  fingerprint: TrendComparabilityFingerprint;
};

function comparePeriods(left: TrendSeriesPeriodInput, right: TrendSeriesPeriodInput): number {
  const [leftYear, leftSemester, leftTerm] = left.sortKey;
  const [rightYear, rightSemester, rightTerm] = right.sortKey;
  return (
    leftYear.localeCompare(rightYear) ||
    leftSemester - rightSemester ||
    leftTerm - rightTerm ||
    left.termInstanceId.localeCompare(right.termInstanceId)
  );
}

/** One drawable point in a comparable run. */
type TrendRunPoint = { periodLabel: string; meanRating: number };

/**
 * Split chronological periods into maximal runs of consecutive comparable
 * periods that can be joined by a line. An unrated period never bridges two
 * points, so unlike or unrated periods are never interpolated.
 */
export function splitComparableRuns(
  periods: Array<
    Pick<ProgramHeadTrendPeriodDTO, "periodLabel" | "meanRating" | "comparableWithPrevious">
  >
): TrendRunPoint[][] {
  const runs: TrendRunPoint[][] = [];
  let current: TrendRunPoint[] | null = null;

  for (const period of periods) {
    if (period.meanRating === null) {
      current = null;
      continue;
    }
    if (!current || !period.comparableWithPrevious) {
      current = [];
      runs.push(current);
    }
    current.push({ periodLabel: period.periodLabel, meanRating: period.meanRating });
  }

  return runs;
}

function canDrawTrendLine(periods: ProgramHeadTrendPeriodDTO[]): boolean {
  return splitComparableRuns(periods).some((run) => run.length >= 2);
}

/**
 * Sort evidence periods chronologically and resolve comparability flags,
 * breaks, and the empty reason. Two periods are comparable only when both are
 * rated and share the same instrument version, scale identity, and mapped
 * outcome identity. Unrated transitions never join a run and never fabricate
 * a break reason.
 */
export function buildTrendSeries(inputs: TrendSeriesPeriodInput[]): {
  periods: ProgramHeadTrendPeriodDTO[];
  breaks: ProgramHeadTrendBreakDTO[];
  emptyReason: ProgramHeadTrendsEmptyReason;
} {
  const sorted = [...inputs].sort(comparePeriods);

  const periods: ProgramHeadTrendPeriodDTO[] = sorted.map((input, index) => {
    const previous = sorted[index - 1];
    return {
      termInstanceId: input.termInstanceId,
      periodLabel: input.periodLabel,
      meanRating: input.meanRating,
      submittedResponseCount: input.submittedResponseCount,
      ratingCount: input.ratingCount,
      instrumentContext: input.instrumentContext,
      scaleContext: input.scaleContext,
      outcomeCodes: [...input.outcomeCodes].sort(),
      comparableWithPrevious:
        previous !== undefined &&
        previous.meanRating !== null &&
        input.meanRating !== null &&
        fingerprintsEqual(previous.fingerprint, input.fingerprint),
    };
  });

  const breaks: ProgramHeadTrendBreakDTO[] = [];
  for (let index = 1; index < sorted.length; index += 1) {
    const previous = sorted[index - 1];
    const current = sorted[index];
    if (previous.meanRating === null || current.meanRating === null) {
      continue;
    }
    if (fingerprintsEqual(previous.fingerprint, current.fingerprint)) {
      continue;
    }
    breaks.push({
      fromPeriodLabel: previous.periodLabel,
      toPeriodLabel: current.periodLabel,
      reason: describeFingerprintChange(previous.fingerprint, current.fingerprint).join(" "),
    });
  }

  const emptyReason: ProgramHeadTrendsEmptyReason =
    sorted.length === 0
      ? "no-evidence"
      : canDrawTrendLine(periods)
        ? null
        : "no-comparable-history";

  return { periods, breaks, emptyReason };
}

// ---------------------------------------------------------------------------
// Shared Overview KPI (shipped by #432 for the compact dashboard)
// ---------------------------------------------------------------------------

/**
 * Build the shared Overview KPI projection used by both the selected-Program
 * Analytics Overview and the compact Program Head dashboard.
 *
 * Semantics locked by #430 and reused by the dashboard:
 * - `submittedResponseCount`: responses with `status = SUBMITTED` only.
 * - `evaluationOpportunityCount`: all in-scope `EvaluationAssignment` rows
 *   (the historical response-rate denominator).
 * - `responseRate`: submitted responses divided by eligible opportunities;
 *   `null` when there are no opportunities (never a fabricated 0%).
 * - `ratingCount`: valid quantitative items, distinct from response count.
 * - `meanRating`: sum of valid rating values divided by rating count,
 *   retained at full precision; `null` when there are no ratings.
 *
 * Pure aggregation helper: no Prisma access, so the deterministic formulas
 * stay unit-testable and identical across surfaces.
 */
export function buildProgramHeadOverviewKpi(input: {
  submittedResponseCount: number;
  evaluationOpportunityCount: number;
  ratingCount: number;
  ratingSum: number;
}): ProgramHeadOverviewKPI {
  const { submittedResponseCount, evaluationOpportunityCount, ratingCount, ratingSum } = input;

  return {
    submittedResponseCount,
    evaluationOpportunityCount,
    responseRate:
      evaluationOpportunityCount === 0 ? null : submittedResponseCount / evaluationOpportunityCount,
    ratingCount,
    meanRating: ratingCount === 0 ? null : ratingSum / ratingCount,
  };
}

// ---------------------------------------------------------------------------
// Stakeholder and contextual breakdown evidence
// ---------------------------------------------------------------------------

/**
 * Assignment context behind one submitted rating or response. Year-level
 * targets are pre-filtered by the service to the selected Program; a single
 * non-null target makes year-level attribution defensible.
 */
export type BreakdownAssignmentContext = {
  course_bound: {
    id: string;
    deployment_name: string;
    course_assignment: { course: { id: string; code: string; title: string } };
    instrument: {
      id: string;
      version_number: number;
      template: { name: string };
    };
    /**
     * Year-level targets for the selected Program only. The service
     * pre-filters targets by the selected Program; a single non-null
     * target makes year-level attribution defensible.
     */
    targets: Array<{ year_level: YearLevel | null }>;
  } | null;
  central_deployment: {
    target_stakeholder: TargetStakeholder;
    major: { id: string; name: string } | null;
    year_level: YearLevel | null;
    instrument: {
      id: string;
      version_number: number;
      template: { name: string };
    };
  } | null;
};

/**
 * Narrow structural rating row for stakeholder and breakdown aggregation.
 * The service's Prisma select output must structurally match this shape;
 * helpers stay pure and unit-testable.
 */
export type BreakdownRatingRow = {
  rating_value: number;
  response_id: string;
  section_key: string;
  item_key: string;
  response: { assignment: BreakdownAssignmentContext };
};

/** Narrow structural response row used for bucket response counts. */
export type BreakdownResponseRow = {
  id: string;
  assignment: BreakdownAssignmentContext;
};

/** Canonical evidence source metadata in display order. */
const STAKEHOLDER_SOURCES: ReadonlyArray<{
  key: ProgramHeadStakeholderSourceKey;
  label: string;
  description: string;
}> = [
  {
    key: "COURSE_STUDENT",
    label: "Course-bound student evidence",
    description: "Course-bound evaluations of assigned students.",
  },
  {
    key: "CENTRAL_STUDENT",
    label: "Central student-respondent evidence",
    description: "Central deployments targeting student respondents.",
  },
  {
    key: "ALUMNI",
    label: "Alumni evidence",
    description: "Central deployments targeting alumni respondents.",
  },
  {
    key: "INDUSTRY_PARTNER",
    label: "Industry Partner evidence",
    description: "Central deployments targeting industry partner respondents.",
  },
];

/**
 * Resolve the canonical source bucket of a central deployment target.
 * Course-bound evidence is always the COURSE_STUDENT bucket.
 */
function sourceKeyForTarget(
  courseBound: BreakdownResponseRow["assignment"]["course_bound"],
  targetStakeholder: TargetStakeholder | undefined
): ProgramHeadStakeholderSourceKey {
  if (courseBound) {
    return "COURSE_STUDENT";
  }
  if (targetStakeholder === "ALUMNI") {
    return "ALUMNI";
  }
  if (targetStakeholder === "INDUSTRY_PARTNER") {
    return "INDUSTRY_PARTNER";
  }
  return "CENTRAL_STUDENT";
}

const SOURCE_LABEL_BY_KEY: Record<ProgramHeadStakeholderSourceKey, string> = {
  COURSE_STUDENT: STAKEHOLDER_SOURCES[0].label,
  CENTRAL_STUDENT: STAKEHOLDER_SOURCES[1].label,
  ALUMNI: STAKEHOLDER_SOURCES[2].label,
  INDUSTRY_PARTNER: STAKEHOLDER_SOURCES[3].label,
};

/** Resolve the canonical source bucket of one rating row. */
function ratingRowSourceKey(row: BreakdownRatingRow): ProgramHeadStakeholderSourceKey {
  return sourceKeyForTarget(
    row.response.assignment.course_bound,
    row.response.assignment.central_deployment?.target_stakeholder
  );
}

function sourceLabel(key: ProgramHeadStakeholderSourceKey): string {
  return SOURCE_LABEL_BY_KEY[key];
}

function instrumentLabel(version: { version_number: number; template: { name: string } }): string {
  return `${version.template.name} v${version.version_number}`;
}

type StakeholderBucketAggregate = {
  sourceKey: ProgramHeadStakeholderSourceKey;
  ratingSum: number;
  ratingCount: number;
  responseIds: Set<string>;
  /** instrument version id -> readable label */
  instruments: Map<string, string>;
};

function getOrCreateBucket(
  buckets: Map<ProgramHeadStakeholderSourceKey, StakeholderBucketAggregate>,
  sourceKey: ProgramHeadStakeholderSourceKey
): StakeholderBucketAggregate {
  let bucket = buckets.get(sourceKey);
  if (!bucket) {
    bucket = {
      sourceKey,
      ratingSum: 0,
      ratingCount: 0,
      responseIds: new Set(),
      instruments: new Map(),
    };
    buckets.set(sourceKey, bucket);
  }
  return bucket;
}

/**
 * Aggregate submitted evidence into source-aware stakeholder buckets.
 * Course-bound ratings form the COURSE_STUDENT bucket; central ratings are
 * bucketed by their deployment's target stakeholder. Means are pooled within
 * a source only; rating count stays distinct from submitted response count.
 * Response rows contribute distinct submitted responses even when unrated.
 */
export function buildStakeholderBuckets(
  ratingRows: BreakdownRatingRow[],
  responseRows: BreakdownResponseRow[],
  snapshotById: Map<string, unknown>
): ProgramHeadStakeholderBucketDTO[] {
  const buckets = new Map<ProgramHeadStakeholderSourceKey, StakeholderBucketAggregate>();

  for (const row of ratingRows) {
    const sourceKey = ratingRowSourceKey(row);
    const bucket = getOrCreateBucket(buckets, sourceKey);
    if (ratingValueIsValid(row, snapshotById)) {
      bucket.ratingSum += row.rating_value;
      bucket.ratingCount += 1;
    }
    bucket.responseIds.add(row.response_id);
    const version =
      row.response.assignment.course_bound?.instrument ??
      row.response.assignment.central_deployment?.instrument;
    if (version) {
      bucket.instruments.set(version.id, instrumentLabel(version));
    }
  }

  for (const row of responseRows) {
    const sourceKey = sourceKeyForTarget(
      row.assignment.course_bound,
      row.assignment.central_deployment?.target_stakeholder
    );
    const bucket = getOrCreateBucket(buckets, sourceKey);
    bucket.responseIds.add(row.id);
    const version =
      row.assignment.course_bound?.instrument ?? row.assignment.central_deployment?.instrument;
    if (version) {
      bucket.instruments.set(version.id, instrumentLabel(version));
    }
  }

  return STAKEHOLDER_SOURCES.flatMap((source) => {
    const bucket = buckets.get(source.key);
    if (!bucket || bucket.responseIds.size === 0) {
      return [];
    }
    const instruments = [...bucket.instruments.values()].sort();
    return [
      {
        sourceKey: bucket.sourceKey,
        sourceLabel: source.label,
        sourceDescription: source.description,
        instrumentContext: instruments.length > 0 ? instruments.join(", ") : null,
        meanRating: bucket.ratingCount === 0 ? null : bucket.ratingSum / bucket.ratingCount,
        ratingCount: bucket.ratingCount,
        submittedResponseCount: bucket.responseIds.size,
      },
    ];
  });
}

/** A rating is valid only when its value belongs to the item's frozen scale. */
function ratingValueIsValid(row: BreakdownRatingRow, snapshotById: Map<string, unknown>): boolean {
  const version =
    row.response.assignment.course_bound?.instrument ??
    row.response.assignment.central_deployment?.instrument;
  if (!version) {
    return false;
  }
  const snapshot = snapshotById.get(version.id);
  if (!snapshot) {
    return false;
  }
  const descriptors = resolveSnapshotItemScale(snapshot, row.section_key, row.item_key);
  return (
    descriptors !== null && descriptors.some((descriptor) => descriptor.value === row.rating_value)
  );
}

type BreakdownAggregate = {
  ratingSum: number;
  ratingCount: number;
  responseIds: Set<string>;
};

function emptyBreakdownAggregate(): BreakdownAggregate {
  return { ratingSum: 0, ratingCount: 0, responseIds: new Set() };
}

function toBreakdownRow(
  aggregate: BreakdownAggregate,
  key: string,
  label: string,
  isUnspecified: boolean
): ProgramHeadBreakdownRowDTO {
  return {
    key,
    label,
    isUnspecified,
    meanRating: aggregate.ratingCount === 0 ? null : aggregate.ratingSum / aggregate.ratingCount,
    ratingCount: aggregate.ratingCount,
    submittedResponseCount: aggregate.responseIds.size,
  };
}

/**
 * Group course-bound ratings and responses by course. Central evidence never
 * contributes to course rows because course attribution exists only for
 * course-bound evidence. Submitted responses count even when they carry no
 * ratings; rows carry instrument disclosure and the course-bound evaluations
 * behind them for authorized review drill-through.
 */
export function buildCourseBreakdownRows(
  ratingRows: BreakdownRatingRow[],
  responseRows: BreakdownResponseRow[],
  snapshotById: Map<string, unknown>
): ProgramHeadCourseBreakdownRowDTO[] {
  const byCourse = new Map<
    string,
    BreakdownAggregate & {
      course: { id: string; code: string; title: string };
      instruments: Map<string, string>;
      evaluations: Map<string, string>;
    }
  >();

  for (const row of ratingRows) {
    const courseBound = row.response.assignment.course_bound;
    if (!courseBound) {
      continue;
    }
    const course = courseBound.course_assignment.course;
    let aggregate = byCourse.get(course.id);
    if (!aggregate) {
      aggregate = {
        ...emptyBreakdownAggregate(),
        course,
        instruments: new Map(),
        evaluations: new Map(),
      };
      byCourse.set(course.id, aggregate);
    }
    accumulateEvidenceRow(aggregate, row, ratingValueIsValid(row, snapshotById));
    aggregate.instruments.set(courseBound.instrument.id, instrumentLabel(courseBound.instrument));
    aggregate.evaluations.set(courseBound.id, courseBound.deployment_name);
  }

  for (const row of responseRows) {
    const courseBound = row.assignment.course_bound;
    if (!courseBound) {
      continue;
    }
    const course = courseBound.course_assignment.course;
    let aggregate = byCourse.get(course.id);
    if (!aggregate) {
      aggregate = {
        ...emptyBreakdownAggregate(),
        course,
        instruments: new Map(),
        evaluations: new Map(),
      };
      byCourse.set(course.id, aggregate);
    }
    aggregate.responseIds.add(row.id);
    aggregate.instruments.set(courseBound.instrument.id, instrumentLabel(courseBound.instrument));
    aggregate.evaluations.set(courseBound.id, courseBound.deployment_name);
  }

  const rows: ProgramHeadCourseBreakdownRowDTO[] = [...byCourse.values()].map((aggregate) => {
    const instruments = [...aggregate.instruments.values()].sort();
    const evaluations = [...aggregate.evaluations.entries()]
      .map(([evaluationId, deploymentName]) => ({ evaluationId, deploymentName }))
      .sort((left, right) => left.deploymentName.localeCompare(right.deploymentName));
    return {
      ...toBreakdownRow(
        aggregate,
        aggregate.course.id,
        `${aggregate.course.code} — ${aggregate.course.title}`,
        false
      ),
      courseCode: aggregate.course.code,
      instrumentContext: instruments.length > 0 ? instruments.join(", ") : null,
      evidenceEvaluations: evaluations,
    };
  });

  rows.sort((left, right) => left.courseCode.localeCompare(right.courseCode));
  return rows;
}

/**
 * Group ratings and responses by instrument version with per-source
 * separation. A row never pools means across evidence sources: each source
 * keeps its own mean, rating count, and response count so unlike populations
 * are not treated as one construct. Submitted responses count even when they
 * carry no ratings.
 */
export function buildInstrumentBreakdownRows(
  ratingRows: BreakdownRatingRow[],
  responseRows: BreakdownResponseRow[],
  snapshotById: Map<string, unknown>
): ProgramHeadInstrumentBreakdownRowDTO[] {
  const byInstrument = new Map<
    string,
    {
      label: string;
      sources: Map<ProgramHeadStakeholderSourceKey, BreakdownAggregate>;
    }
  >();

  const getOrCreateInstrument = (version: {
    id: string;
    version_number: number;
    template: { name: string };
  }) => {
    let entry = byInstrument.get(version.id);
    if (!entry) {
      entry = { label: instrumentLabel(version), sources: new Map() };
      byInstrument.set(version.id, entry);
    }
    return entry;
  };

  for (const row of ratingRows) {
    const sourceKey = ratingRowSourceKey(row);
    const version =
      row.response.assignment.course_bound?.instrument ??
      row.response.assignment.central_deployment?.instrument;
    if (!version) {
      continue;
    }
    const entry = getOrCreateInstrument(version);
    let source = entry.sources.get(sourceKey);
    if (!source) {
      source = emptyBreakdownAggregate();
      entry.sources.set(sourceKey, source);
    }
    if (ratingValueIsValid(row, snapshotById)) {
      source.ratingSum += row.rating_value;
      source.ratingCount += 1;
    }
    source.responseIds.add(row.response_id);
  }

  for (const row of responseRows) {
    const sourceKey = sourceKeyForTarget(
      row.assignment.course_bound,
      row.assignment.central_deployment?.target_stakeholder
    );
    const version =
      row.assignment.course_bound?.instrument ?? row.assignment.central_deployment?.instrument;
    if (!version) {
      continue;
    }
    const entry = getOrCreateInstrument(version);
    let source = entry.sources.get(sourceKey);
    if (!source) {
      source = emptyBreakdownAggregate();
      entry.sources.set(sourceKey, source);
    }
    source.responseIds.add(row.id);
  }

  const rows: ProgramHeadInstrumentBreakdownRowDTO[] = [...byInstrument.entries()]
    .map(([instrumentVersionId, entry]) => {
      const sources: ProgramHeadInstrumentSourceDTO[] = STAKEHOLDER_SOURCES.flatMap((source) => {
        const aggregate = entry.sources.get(source.key);
        if (!aggregate || aggregate.responseIds.size === 0) {
          return [];
        }
        return [
          {
            ...toBreakdownRow(
              aggregate,
              `${instrumentVersionId}:${source.key}`,
              source.label,
              false
            ),
            sourceKey: source.key,
            sourceLabel: source.label,
          },
        ];
      });
      return { instrumentVersionId, instrumentLabel: entry.label, sources };
    })
    .filter((row) => row.sources.length > 0);

  rows.sort((left, right) => left.instrumentLabel.localeCompare(right.instrumentLabel));
  return rows;
}

/**
 * Group ratings and responses by a defensible attribution key, keeping every
 * evidence source separate: unlike populations are never pooled into one
 * construct, so each row belongs to exactly one source bucket. Rows whose
 * attribution is missing (or ambiguous) fall into per-source `Unspecified`
 * aggregates; the system never guesses an attribute from names, text, or
 * current profiles. Submitted responses count even when they carry no
 * ratings. Defensible rows rank by mean rating descending, then label.
 */
export function buildAttributionBreakdown(
  ratingRows: BreakdownRatingRow[],
  responseRows: BreakdownResponseRow[],
  snapshotById: Map<string, unknown>,
  attributionOf: (assignment: BreakdownAssignmentContext) => { key: string; label: string } | null
): { rows: ProgramHeadBreakdownRowDTO[]; unspecified: ProgramHeadBreakdownRowDTO[] } {
  const byKey = new Map<string, BreakdownAggregate & { key: string; label: string }>();
  const unspecifiedBySource = new Map<string, BreakdownAggregate>();

  const rowSourceKey = (row: BreakdownRatingRow | BreakdownResponseRow) =>
    "response" in row
      ? ratingRowSourceKey(row)
      : sourceKeyForTarget(
          row.assignment.course_bound,
          row.assignment.central_deployment?.target_stakeholder
        );

  const accumulateAttributed = (
    assignment: BreakdownAssignmentContext,
    row: BreakdownRatingRow | BreakdownResponseRow
  ) => {
    const attribution = attributionOf(assignment);
    const sourceKey = rowSourceKey(row);
    const isValidRating = !("response_id" in row) || ratingValueIsValid(row, snapshotById);
    if (!attribution) {
      let aggregate = unspecifiedBySource.get(sourceKey);
      if (!aggregate) {
        aggregate = emptyBreakdownAggregate();
        unspecifiedBySource.set(sourceKey, aggregate);
      }
      accumulateEvidenceRow(aggregate, row, isValidRating);
      return;
    }
    const rowKey = `${sourceKey}:${attribution.key}`;
    let aggregate = byKey.get(rowKey);
    if (!aggregate) {
      aggregate = {
        ...emptyBreakdownAggregate(),
        key: rowKey,
        label: `${attribution.label} — ${sourceLabel(sourceKey)}`,
      };
      byKey.set(rowKey, aggregate);
    }
    accumulateEvidenceRow(aggregate, row, isValidRating);
  };

  for (const row of ratingRows) {
    accumulateAttributed(row.response.assignment, row);
  }
  for (const row of responseRows) {
    accumulateAttributed(row.assignment, row);
  }

  const rows = [...byKey.values()].map((aggregate) =>
    toBreakdownRow(aggregate, aggregate.key, aggregate.label, false)
  );
  rows.sort(
    (left, right) =>
      (right.meanRating ?? -Infinity) - (left.meanRating ?? -Infinity) ||
      left.label.localeCompare(right.label)
  );

  const unspecified = [...unspecifiedBySource.entries()].map(([sourceKey, aggregate]) =>
    toBreakdownRow(
      aggregate,
      `unspecified:${sourceKey}`,
      `Unspecified — ${sourceLabel(sourceKey as ProgramHeadStakeholderSourceKey)}`,
      true
    )
  );

  return { rows, unspecified };
}

/** Accumulate one rating or response row: valid ratings add sums, both add identity. */
function accumulateEvidenceRow(
  aggregate: BreakdownAggregate,
  row: BreakdownRatingRow | BreakdownResponseRow,
  isValidRating: boolean
): void {
  if ("response_id" in row) {
    if (isValidRating) {
      aggregate.ratingSum += row.rating_value;
      aggregate.ratingCount += 1;
    }
    aggregate.responseIds.add(row.response_id);
    return;
  }
  aggregate.responseIds.add(row.id);
}

/**
 * Major attribution is defensible only for central deployments that target a
 * major. Course-bound evidence does not snapshot a major and central
 * deployments without a targeted major are reported as Unspecified.
 */
export function majorAttributionOf(
  assignment: BreakdownAssignmentContext
): { key: string; label: string } | null {
  const major = assignment.central_deployment?.major;
  return major ? { key: major.id, label: major.name } : null;
}

/**
 * Year-level attribution is defensible when a central deployment targets one
 * year level, or a course-bound evaluation targets exactly one year level for
 * the selected Program (the service pre-filters targets by Program). Untargeted
 * or multi-year evaluations are reported as Unspecified.
 */
export function yearLevelAttributionOf(
  assignment: BreakdownAssignmentContext
): { key: string; label: string } | null {
  const central = assignment.central_deployment;
  if (central) {
    return central.year_level
      ? { key: `year-${central.year_level}`, label: getYearLevelDisplay(central.year_level) }
      : null;
  }
  const targets = assignment.course_bound?.targets ?? [];
  if (targets.length !== 1 || !targets[0].year_level) {
    return null;
  }
  return {
    key: `year-${targets[0].year_level}`,
    label: getYearLevelDisplay(targets[0].year_level),
  };
}
