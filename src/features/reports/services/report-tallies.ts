import {
  buildCiloMetrics,
  buildQuestionMetrics,
  resolveCiloLabels,
  type OutcomeItemRatingRow,
} from "@/features/analytics/aggregators/cilo";
import { classifyOutcomeMean } from "@/features/analytics/aggregators/outcome-attainment";
import {
  describeScale,
  resolveItemScaleIdentity,
  toScaleIdentity,
  type ScaleIdentity,
} from "@/features/analytics/aggregators/scale-identity";
import { encodeQuestionKey } from "@/features/analytics/aggregators/question-identity";
import { buildQuantitativeMetric } from "@/features/analytics/aggregators/quantitative";
import { buildParticipationSummary } from "@/features/analytics/aggregators/participation";
import type { CiloGoMapping, QuantitativeMetric } from "@/features/analytics/aggregators/types";
import type { OutcomeEvidenceRow } from "@/features/analytics/aggregators/outcome-evidence";
import { TargetStakeholder } from "@prisma/client";
import { listSnapshotQuantitativeItems } from "@/features/analytics/services/snapshot-structure";
import type { OutcomeAttainment } from "@/features/analytics/aggregators/outcome-attainment";
import type {
  ReportCiloMapping,
  ReportCiloQuestionBinding,
  ReportCourseGroup,
  ReportDirectPoBinding,
  ReportQuestion,
} from "../types";
import { ATTAINMENT_STATUS_LABELS } from "../types";

// ---------------------------------------------------------------------------
// Report tallies
//
// Every count, mean, distribution, and interpretation in an export is produced
// here by the canonical Analytics aggregators over raw submitted ratings. The
// only arithmetic this module adds is the printed rating sum, which it derives
// from the authoritative per-option distribution so the printed sum, mean, and
// counts cannot disagree with each other, plus excluded and missing counts,
// which are row counts rather than statistics.
// ---------------------------------------------------------------------------

/**
 * Readable exact scale identity: the range and point count, then the wording of
 * its first and last option. Two scales that share a numeric range but not their
 * labels — the case the canonical rules refuse to merge — read differently here.
 */
export function reportScaleLabel(scale: ScaleIdentity | null): string {
  if (!scale) return "Unresolved scale";
  const range = describeScale(scale.descriptors);
  const labelled = scale.descriptors.filter((descriptor) => descriptor.label !== null);
  if (labelled.length === 0) return `${range} · unlabeled options`;
  const first = labelled[0].label as string;
  const last = labelled[labelled.length - 1].label as string;
  return `${range} · ${first} → ${last}`;
}

/** Per-option tally plus the mean, count, and interpretation of one question. */
type ReportQuestionTally = {
  question: ReportQuestion;
  ciloLabel: string | null;
  directPoCodes: string[];
  scaleLabel: string;
  categories: Array<{ value: number; label: string; count: number; percentage: number }>;
  validCount: number;
  excludedCount: number;
  /** Blank answers, counted only when the snapshot defines applicability. */
  missingCount: number | null;
  ratingSum: number;
  /** Full-precision mean; null when no valid rating contributed. */
  mean: number | null;
  distinctResponseCount: number;
  attainment: OutcomeAttainment;
};

/** One CILO's pooled evidence inside one class group. */
type ReportCiloSummary = {
  ciloId: string | null;
  ciloLabel: string;
  ciloDescription: string;
  mappings: ReportCiloMapping[];
  questionRefs: Array<{ sectionKey: string; itemKey: string; prompt: string }>;
  scaleGroups: Array<{
    scaleLabel: string;
    mean: number | null;
    ratingCount: number;
    categories: Array<{ value: number; label: string; count: number; percentage: number }>;
  }>;
  validCount: number;
  distinctResponseCount: number;
  mean: number | null;
  attainment: OutcomeAttainment;
};

/** One respondent row of a raw-response grid. */
type ReportRawResponseRow = {
  responseId: string;
  respondentId: string;
  respondentName: string;
  submittedAt: Date | null;
  /** Original rating per applicable question; absent means unanswered. */
  answers: Map<string, number>;
};

/** One class group's complete report projection. */
export type ReportClassGroupModel = {
  group: ReportCourseGroup;
  participation: {
    assignedRespondentCount: number;
    submittedResponseCount: number;
    responseRate: number | null;
  };
  questions: ReportQuestionTally[];
  ciloSummaries: ReportCiloSummary[];
  rawRows: ReportRawResponseRow[];
};

/** Question-resolution context for one class group, built once and reused per answer. */
type ClassGroupQuestionContext = {
  prompts: Map<string, string>;
  ciloByQuestionKey: Map<string, ReportCiloQuestionBinding>;
  directPoByQuestionKey: Map<string, ReportDirectPoBinding>;
  ciloLabels: Map<string, string>;
};

/** Publication-time CILO labels for the class group's ordered CILO ids. */
function classGroupCiloLabels(group: ReportCourseGroup): Map<string, string> {
  const orderedCiloIds = [
    ...new Set(
      group.ciloBindings
        .map((binding) => binding.ciloId)
        .filter((value): value is string => value !== null)
    ),
  ];
  return resolveCiloLabels(group.cilosSnapshot, orderedCiloIds);
}

function buildClassGroupQuestionContext(group: ReportCourseGroup): ClassGroupQuestionContext {
  const directPoByQuestionKey = new Map<string, ReportDirectPoBinding>();
  for (const binding of group.directPoBindings) {
    const key = encodeQuestionKey(binding.sectionKey, binding.itemKey);
    // One question may carry several frozen direct bindings; keep them all.
    directPoByQuestionKey.set(key, {
      ...binding,
      poCode: [...(directPoByQuestionKey.get(key)?.poCode.split(" | ") ?? []), binding.poCode]
        .filter(Boolean)
        .join(" | "),
    });
  }
  return {
    prompts: new Map(
      listSnapshotQuantitativeItems(group.structureSnapshot).map((question) => [
        encodeQuestionKey(question.sectionKey, question.itemKey),
        question.prompt,
      ])
    ),
    ciloByQuestionKey: new Map(
      group.ciloBindings.map((binding) => [
        encodeQuestionKey(binding.sectionKey, binding.itemKey),
        binding,
      ])
    ),
    directPoByQuestionKey,
    ciloLabels: classGroupCiloLabels(group),
  };
}

/** Frozen direct-binding PO mappings for one answered question. */
function directPoMappingsFor(
  context: ClassGroupQuestionContext,
  evaluationId: string,
  questionKey: string
): CiloGoMapping[] {
  const binding = context.directPoByQuestionKey.get(questionKey);
  if (!binding) return [];
  return binding.poCode
    .split(" | ")
    .filter(Boolean)
    .map((poCode: string) => ({
      poId: `frozen:${evaluationId}:${poCode}`,
      poCode,
      poDescription: binding.poDescription.split(" | ")[0] ?? "",
      manifestation: null,
    }));
}

/** CILO identity for one answered question, or null when nothing is bound. */
function ciloFor(
  context: ClassGroupQuestionContext,
  questionKey: string
): OutcomeItemRatingRow["cilo"] {
  const binding = context.ciloByQuestionKey.get(questionKey);
  if (!binding) return null;
  const ciloId = binding.ciloId;
  return {
    id: ciloId ?? `binding:${questionKey}`,
    label: ciloId ? (context.ciloLabels.get(ciloId) ?? binding.ciloLabel) : binding.ciloLabel,
    description: binding.ciloDescription,
  };
}

/** One submitted answer in the canonical aggregator shape. */
function toRatingRow(
  group: ReportCourseGroup,
  context: ClassGroupQuestionContext,
  mappings: Map<string, ReportCiloMapping[]>,
  responseId: string,
  answer: { sectionKey: string; itemKey: string; ratingValue: number }
): OutcomeItemRatingRow {
  const questionKey = encodeQuestionKey(answer.sectionKey, answer.itemKey);
  const ciloBinding = context.ciloByQuestionKey.get(questionKey);
  const poMappings = ciloBinding?.ciloId ? (mappings.get(ciloBinding.ciloId) ?? []) : [];
  const directPoMappings = directPoMappingsFor(context, group.evaluationId, questionKey);
  return {
    sectionKey: answer.sectionKey,
    itemKey: answer.itemKey,
    prompt: ciloBinding?.questionPrompt ?? context.prompts.get(questionKey) ?? answer.itemKey,
    ratingValue: answer.ratingValue,
    responseId,
    scale: resolveItemScaleIdentity(group.structureSnapshot, answer.sectionKey, answer.itemKey),
    cilo: ciloFor(context, questionKey),
    evaluationId: group.evaluationId,
    poMappings,
    ...(directPoMappings.length > 0 ? { directPoMappings } : {}),
  };
}

/**
 * Rating rows for one class group in the canonical aggregator shape. Out-of-scale
 * and unresolvable ratings are included so the aggregators exclude them exactly
 * as they do for Analytics and Response Review.
 */
export function buildClassGroupRatingRows(
  group: ReportCourseGroup,
  mappings: Map<string, ReportCiloMapping[]>
): OutcomeItemRatingRow[] {
  const context = buildClassGroupQuestionContext(group);
  return group.responses.flatMap((response) =>
    response.answers.map((answer) =>
      toRatingRow(group, context, mappings, response.responseId, answer)
    )
  );
}

/**
 * Course-bound PO evidence rows for the class groups of one export, in the
 * canonical `aggregateOutcomeEvidence` shape. Each submitted answer contributes
 * once per (response, evaluation, question, PO); manifestation stays a
 * descriptive label and never a weight.
 */
/** Current CILO mappings and frozen direct bindings that one answer reaches. */
function outcomeBindingsFor(
  row: OutcomeItemRatingRow,
  questionDirectBindings: ReportDirectPoBinding[]
): {
  outcomeMappings: OutcomeEvidenceRow["outcomeMappings"];
  directBindings: OutcomeEvidenceRow["directBindings"];
} {
  const outcomeMappings = row.cilo
    ? row.poMappings.map((mapping) => ({
        outcomeId: mapping.poId,
        code: mapping.poCode,
        name: mapping.poDescription,
        manifestation: mapping.manifestation,
      }))
    : [];
  // One published question may be bound to several Program Outcomes. Every
  // binding receives the answer, exactly as the Analytics PO read does; keeping
  // only the last would silently drop PO evidence from the export.
  const directBindings = questionDirectBindings.map((binding) => ({
    outcomeId: binding.poId ?? `snapshot:${binding.poCode}`,
    code: binding.poCode,
    name: binding.poDescription,
    questionPrompt: binding.questionPrompt,
  }));
  return { outcomeMappings, directBindings };
}

export function buildOutcomeEvidenceRows(
  models: Array<{ group: ReportCourseGroup; rows?: OutcomeItemRatingRow[] }>
): OutcomeEvidenceRow[] {
  const ratedModels = models.map((model) => ({
    group: model.group,
    rows: model.rows ?? [],
  }));
  const evidenceRows: OutcomeEvidenceRow[] = [];
  for (const { group, rows } of ratedModels) {
    const directByQuestionKey = new Map<string, ReportDirectPoBinding[]>();
    for (const binding of group.directPoBindings) {
      const key = encodeQuestionKey(binding.sectionKey, binding.itemKey);
      directByQuestionKey.set(key, [...(directByQuestionKey.get(key) ?? []), binding]);
    }
    for (const row of rows) {
      const { outcomeMappings, directBindings } = outcomeBindingsFor(
        row,
        directByQuestionKey.get(encodeQuestionKey(row.sectionKey, row.itemKey)) ?? []
      );
      if (!row.cilo && outcomeMappings.length === 0 && directBindings.length === 0) continue;
      const cilo = row.cilo;

      evidenceRows.push({
        ratingValue: row.ratingValue,
        responseId: row.responseId,
        sectionKey: row.sectionKey,
        itemKey: row.itemKey,
        instrumentVersion: {
          id: group.instrumentId,
          structureSnapshot: group.structureSnapshot,
        },
        course: { id: group.courseId, code: group.courseCode, title: group.courseTitle },
        cilo: cilo
          ? {
              id: cilo.id,
              code: cilo.label,
              description: cilo.description,
              course: { id: group.courseId, code: group.courseCode, title: group.courseTitle },
            }
          : null,
        outcomeMappings,
        directBindings,
        evaluationId: group.evaluationId,
        deploymentName: group.evaluationName,
      });
    }
  }
  return evidenceRows;
}

/** Rating sum derived from the authoritative per-option distribution. */
function ratingSumOf(distribution: QuantitativeMetric["distribution"]): number {
  return distribution.reduce((sum, category) => sum + category.value * category.count, 0);
}

/** Deterministic CLOIE_OUTCOME_MEAN_V1 interpretation of one compatible mean. */
function classifyMetric(metric: QuantitativeMetric, scale: ScaleIdentity | null) {
  return classifyOutcomeMean(metric.mean, scale);
}

/** Interpretation for a CILO or question whose scale groups may be mixed. */
function classifyScaleGroups(
  groups: Array<{ scale: ScaleIdentity | null; metric: QuantitativeMetric }>
): OutcomeAttainment {
  if (groups.length > 1) {
    return classifyOutcomeMean(null, null, { spansMultipleScales: true });
  }
  const single = groups[0];
  if (!single) return classifyOutcomeMean(null, null);
  return classifyMetric(single.metric, single.scale);
}

/**
 * Exact scale identity printed for a distribution row: the range and point count
 * with the wording of its first and last option. Two identities that share a
 * numeric range but not their labels therefore read differently.
 */
export function reportScaleLabelFromCategories(
  categories: ReadonlyArray<{ value: number; label: string | null }>
): string {
  if (categories.length === 0) return "Unresolved scale";
  return reportScaleLabel(
    toScaleIdentity(
      categories.map((category) => ({ value: category.value, label: category.label }))
    )
  );
}

/** Empty canonical metric for a question or CILO nobody rated. */
function emptyMetric(scale: ScaleIdentity | null): QuantitativeMetric {
  return buildQuantitativeMetric([], scale);
}

function scaleOfMetric(metric: QuantitativeMetric): ScaleIdentity | null {
  return metric.scale;
}

/** Metric lookup and answered-row counts, keyed by canonical question key. */
type QuestionTallyInputs = {
  metrics: Map<string, ReturnType<typeof buildQuestionMetrics>[number]>;
  answeredRows: Map<string, number>;
  questions: ReportQuestion[];
};

function countAnsweredRows(rows: OutcomeItemRatingRow[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const key = encodeQuestionKey(row.sectionKey, row.itemKey);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

/**
 * Every applicable question of the class group: the frozen snapshot enumerates
 * them (so a question nobody answered still appears with zero counts), and a
 * bound question the snapshot does not enumerate is appended with its unknown
 * applicability.
 */
function tallyQuestions(group: ReportCourseGroup, metrics: QuestionTallyInputs["metrics"]) {
  const questions = listSnapshotQuantitativeItems(group.structureSnapshot);
  const knownKeys = new Set(
    questions.map((question) => encodeQuestionKey(question.sectionKey, question.itemKey))
  );
  for (const questionKey of metrics.keys()) {
    if (knownKeys.has(questionKey)) continue;
    const [sectionKey, itemKey] = decodeQuestionKeyForLabel(questionKey);
    questions.push({
      sectionKey,
      sectionTitle: sectionKey,
      itemKey,
      prompt: metrics.get(questionKey)?.prompt ?? itemKey,
      // The snapshot does not enumerate it, so applicability is unknown and no
      // missing count may be claimed.
      applicability: "unknown",
    });
    knownKeys.add(questionKey);
  }
  return questions;
}

/** Direct question-to-PO codes published for one question. */
function directPoCodesFor(group: ReportCourseGroup, questionKey: string): string[] {
  return [
    ...new Set(
      group.directPoBindings
        .filter((binding) => encodeQuestionKey(binding.sectionKey, binding.itemKey) === questionKey)
        .map((binding) => binding.poCode)
    ),
  ];
}

/** One question's printed tally row. */
function questionTallyFor(
  group: ReportCourseGroup,
  inputs: QuestionTallyInputs,
  question: ReportQuestion
): ReportQuestionTally {
  const questionKey = encodeQuestionKey(question.sectionKey, question.itemKey);
  const scale = resolveItemScaleIdentity(
    group.structureSnapshot,
    question.sectionKey,
    question.itemKey
  );
  const metric = inputs.metrics.get(questionKey);
  const singleScaleMetric = metric?.quantitative ?? emptyMetric(scale);
  const answeredRowCount = inputs.answeredRows.get(questionKey) ?? 0;
  const ciloBinding = group.ciloBindings.find(
    (binding) => encodeQuestionKey(binding.sectionKey, binding.itemKey) === questionKey
  );
  const missingCount =
    question.applicability === "required"
      ? Math.max(0, group.responses.length - answeredRowCount)
      : null;

  return {
    question,
    ciloLabel:
      ciloBinding?.ciloLabel ??
      (metric && metric.binding.type === "CILO" ? metric.binding.ciloLabel : null),
    directPoCodes: directPoCodesFor(group, questionKey),
    scaleLabel: reportScaleLabel(scale),
    categories: singleScaleMetric.distribution,
    validCount: singleScaleMetric.ratingCount,
    excludedCount: Math.max(0, answeredRowCount - singleScaleMetric.ratingCount),
    missingCount,
    ratingSum: ratingSumOf(singleScaleMetric.distribution),
    mean: singleScaleMetric.mean,
    distinctResponseCount: singleScaleMetric.responseCount,
    attainment: classifyMetric(singleScaleMetric, scale),
  };
}

function buildQuestionTallies(
  group: ReportCourseGroup,
  rows: OutcomeItemRatingRow[]
): ReportQuestionTally[] {
  const metrics = new Map(
    buildQuestionMetrics(rows).map((metric) => [
      encodeQuestionKey(metric.sectionKey, metric.itemKey),
      metric,
    ])
  );
  const inputs: QuestionTallyInputs = {
    metrics,
    answeredRows: countAnsweredRows(rows),
    questions: tallyQuestions(group, metrics),
  };

  return inputs.questions
    .map((question) => questionTallyFor(group, inputs, question))
    .sort(
      (left, right) =>
        left.question.sectionKey.localeCompare(right.question.sectionKey) ||
        left.question.itemKey.localeCompare(right.question.itemKey)
    );
}

/** One CILO's evidence context inside a class group. */
type CiloSummaryContext = {
  ciloId: string | null;
  ciloLabel: string;
  /** Frozen publication description, kept when no valid answer produced a metric. */
  ciloDescription: string;
  mappings: ReportCiloMapping[];
  questionKeys: Set<string>;
};

type CiloMetric = ReturnType<typeof buildCiloMetrics>[number];

/** Question keys that evidence each CILO of the class group. */
function questionKeysByCiloId(group: ReportCourseGroup): Map<string, Set<string>> {
  const keys = new Map<string, Set<string>>();
  for (const binding of group.ciloBindings) {
    if (!binding.ciloId) continue;
    const existing = keys.get(binding.ciloId) ?? new Set<string>();
    existing.add(encodeQuestionKey(binding.sectionKey, binding.itemKey));
    keys.set(binding.ciloId, existing);
  }
  return keys;
}

/**
 * Every CILO the class group published, in publication order, then any binding
 * whose CILO record is gone (archived or deleted), which keeps its own row
 * instead of pooling under another CILO.
 */
function ciloSummaryContexts(group: ReportCourseGroup): CiloSummaryContext[] {
  const orderedCiloIds = [
    ...new Set(
      group.ciloBindings
        .map((binding) => binding.ciloId)
        .filter((value): value is string => value !== null)
    ),
  ];
  const ciloLabels = resolveCiloLabels(group.cilosSnapshot, orderedCiloIds);
  const questionKeys = questionKeysByCiloId(group);
  const frozenDescriptions = new Map(
    group.ciloBindings
      .filter((binding) => binding.ciloId !== null)
      .map((binding) => [binding.ciloId as string, binding.ciloDescription])
  );
  const contexts: CiloSummaryContext[] = orderedCiloIds.map((ciloId) => ({
    ciloId,
    ciloLabel: ciloLabels.get(ciloId) ?? "CILO",
    ciloDescription: frozenDescriptions.get(ciloId) ?? "",
    mappings: [],
    questionKeys: questionKeys.get(ciloId) ?? new Set<string>(),
  }));

  const seen = new Set<string>(orderedCiloIds);
  for (const binding of group.ciloBindings) {
    if (binding.ciloId || seen.has(binding.ciloLabel)) continue;
    seen.add(binding.ciloLabel);
    contexts.push({
      ciloId: null,
      ciloLabel: binding.ciloLabel,
      ciloDescription: binding.ciloDescription,
      mappings: [],
      questionKeys: new Set([encodeQuestionKey(binding.sectionKey, binding.itemKey)]),
    });
  }
  return contexts;
}

/** Per-scale-group projection of one CILO's pooled ratings. */
function ciloScaleGroups(metric: CiloMetric | null): ReportCiloSummary["scaleGroups"] {
  return metric
    ? metric.scaleGroups.map((groupMetric) => ({
        scaleLabel: reportScaleLabel(scaleOfMetric(groupMetric)),
        mean: groupMetric.mean,
        ratingCount: groupMetric.ratingCount,
        categories: groupMetric.distribution,
      }))
    : [];
}

/** Snapshot questions that evidence one CILO, in snapshot order. */
function ciloQuestionRefs(
  group: ReportCourseGroup,
  questionKeys: Set<string>
): ReportCiloSummary["questionRefs"] {
  return listSnapshotQuantitativeItems(group.structureSnapshot)
    .filter((question) =>
      questionKeys.has(encodeQuestionKey(question.sectionKey, question.itemKey))
    )
    .map((question) => ({
      sectionKey: question.sectionKey,
      itemKey: question.itemKey,
      prompt: question.prompt,
    }));
}

/** Deterministic interpretation of one CILO's pooled ratings. */
function ciloAttainment(metric: CiloMetric | null) {
  if (!metric) return classifyOutcomeMean(null, null);
  return classifyScaleGroups(
    metric.scaleGroups.map((groupMetric) => ({
      scale: groupMetric.scale,
      metric: groupMetric,
    }))
  );
}

/**
 * One CILO summary row. A CILO nobody rated validly keeps zero counts and an
 * explicit no-evidence status rather than disappearing from the report.
 */
function ciloSummaryFor(
  group: ReportCourseGroup,
  metric: CiloMetric | null,
  context: CiloSummaryContext
): ReportCiloSummary {
  const scaleGroups = ciloScaleGroups(metric);

  return {
    ciloId: context.ciloId,
    ciloLabel: context.ciloLabel,
    ciloDescription: metric?.description ?? context.ciloDescription,
    mappings: context.mappings,
    questionRefs: ciloQuestionRefs(group, context.questionKeys),
    scaleGroups,
    validCount: scaleGroups.reduce((sum, groupMetric) => sum + groupMetric.ratingCount, 0),
    // The canonical response count is independent of whether one combined mean
    // exists, so a mixed-scale CILO never reports zero respondents.
    distinctResponseCount: metric?.evidenceSummary.responseCount ?? 0,
    mean: metric?.quantitative?.mean ?? null,
    attainment: ciloAttainment(metric),
  };
}

/**
 * CILO summaries for one class group. Pooled raw ratings, never a mean of
 * question means; a CILO nobody rated validly still appears with zero counts.
 */
function buildCiloSummaries(
  group: ReportCourseGroup,
  rows: OutcomeItemRatingRow[],
  mappings: Map<string, ReportCiloMapping[]>
): ReportCiloSummary[] {
  const metricByCiloId = new Map(buildCiloMetrics(rows).map((metric) => [metric.ciloId, metric]));

  return ciloSummaryContexts(group)
    .map((context) => ({
      ...context,
      mappings: context.ciloId ? (mappings.get(context.ciloId) ?? []) : [],
    }))
    .map((context) =>
      ciloSummaryFor(
        group,
        context.ciloId ? (metricByCiloId.get(context.ciloId) ?? null) : null,
        context
      )
    )
    .sort(
      (left, right) =>
        left.ciloLabel.localeCompare(right.ciloLabel) ||
        left.ciloDescription.localeCompare(right.ciloDescription)
    );
}

/** Raw-response grid rows for one class group, one row per submitted response. */
function buildRawResponseRows(group: ReportCourseGroup): ReportRawResponseRow[] {
  return group.responses.map((response) => ({
    responseId: response.responseId,
    respondentId: response.respondentId,
    respondentName: response.respondentName ?? "Name unavailable",
    submittedAt: response.submittedAt,
    answers: new Map(
      response.answers.map((answer) => [
        encodeQuestionKey(answer.sectionKey, answer.itemKey),
        answer.ratingValue,
      ])
    ),
  }));
}

/**
 * Full class-group projection: participation, question tallies, CILO summaries,
 * and the raw-response grid. Participation uses the canonical
 * `EvaluationAssignment` denominator.
 */
export function buildClassGroupModel(
  group: ReportCourseGroup,
  mappings: Map<string, ReportCiloMapping[]>
): ReportClassGroupModel & { rows: OutcomeItemRatingRow[] } {
  const rows = buildClassGroupRatingRows(group, mappings);
  const participation = buildParticipationSummary(
    group.submissions.map((submission) => ({
      respondentId: submission.respondentId,
      stakeholder: TargetStakeholder.STUDENT,
      responseStatus: submission.responseStatus,
    }))
  );

  return {
    group,
    participation: {
      assignedRespondentCount: participation.assigned,
      submittedResponseCount: participation.submitted,
      responseRate: participation.completionRate,
    },
    questions: buildQuestionTallies(group, rows),
    ciloSummaries: buildCiloSummaries(group, rows, mappings),
    rawRows: buildRawResponseRows(group),
    rows,
  };
}

/**
 * Interpretation of a PO row that carries none. Program Outcome rows always
 * arrive classified; a row without an interpretation is reported as no
 * evidence, never as non-attainment.
 */
export function attainmentOrNoEvidence(
  attainment: OutcomeAttainment | undefined
): OutcomeAttainment {
  return attainment ?? classifyOutcomeMean(null, null);
}

/** Interpretation label plus its unclassified reason when there is no label. */
export function attainmentStatusLabel(attainment: OutcomeAttainment): string {
  if (attainment.status === "no-evidence") return ATTAINMENT_STATUS_LABELS.noEvidence;
  if (attainment.status === "mixed-scales") return ATTAINMENT_STATUS_LABELS.mixedScales;
  if (attainment.status === "unsupported-scale") return ATTAINMENT_STATUS_LABELS.unsupportedScale;
  return attainment.interpretation ?? ATTAINMENT_STATUS_LABELS.noEvidence;
}

/**
 * Question keys are structurally encoded tuples; this recovers a readable label
 * for a bound question the frozen snapshot does not enumerate.
 */
function decodeQuestionKeyForLabel(questionKey: string): [string, string] {
  try {
    const decoded = JSON.parse(questionKey) as unknown;
    if (
      Array.isArray(decoded) &&
      typeof decoded[0] === "string" &&
      typeof decoded[1] === "string"
    ) {
      return [decoded[0], decoded[1]];
    }
  } catch {
    // Fall through to the raw key: a label is presentation only.
  }
  return ["Unknown section", questionKey];
}
