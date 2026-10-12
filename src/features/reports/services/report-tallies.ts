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
  ReportCourseGroup,
  ReportCiloMapping,
  ReportQuestion,
  ReportResponseRow,
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
export type ReportQuestionTally = {
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
export type ReportCiloSummary = {
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
export type ReportRawResponseRow = {
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

/**
 * Rating rows for one class group in the canonical aggregator shape. Out-of-scale
 * and unresolvable ratings are included so the aggregators exclude them exactly
 * as they do for Analytics and Response Review.
 */
export function buildClassGroupRatingRows(
  group: ReportCourseGroup,
  mappings: Map<string, ReportCiloMapping[]>
): OutcomeItemRatingRow[] {
  const orderedCiloIds = [
    ...new Set(
      group.ciloBindings
        .map((binding) => binding.ciloId)
        .filter((value): value is string => value !== null)
    ),
  ];
  const ciloLabels = resolveCiloLabels(group.cilosSnapshot, orderedCiloIds);
  const promptByQuestionKey = new Map(
    listSnapshotQuantitativeItems(group.structureSnapshot).map((question) => [
      encodeQuestionKey(question.sectionKey, question.itemKey),
      question.prompt,
    ])
  );
  const ciloByQuestionKey = new Map(
    group.ciloBindings.map((binding) => [
      encodeQuestionKey(binding.sectionKey, binding.itemKey),
      binding,
    ])
  );
  const directByQuestionKey = new Map<string, string[]>();
  for (const binding of group.directPoBindings) {
    const key = encodeQuestionKey(binding.sectionKey, binding.itemKey);
    directByQuestionKey.set(key, [...(directByQuestionKey.get(key) ?? []), binding.poCode]);
  }

  const rows: OutcomeItemRatingRow[] = [];
  for (const response of group.responses) {
    for (const answer of response.answers) {
      const questionKey = encodeQuestionKey(answer.sectionKey, answer.itemKey);
      const ciloBinding = ciloByQuestionKey.get(questionKey);
      const ciloId = ciloBinding?.ciloId ?? null;
      const poMappings: CiloGoMapping[] = ciloId ? (mappings.get(ciloId) ?? []) : [];
      const directPoMappings: CiloGoMapping[] = (directByQuestionKey.get(questionKey) ?? []).map(
        (poCode) => ({
          poId: `frozen:${group.evaluationId}:${poCode}`,
          poCode,
          poDescription:
            group.directPoBindings.find(
              (binding) =>
                poCode === binding.poCode &&
                binding.sectionKey === answer.sectionKey &&
                binding.itemKey === answer.itemKey
            )?.poDescription ?? "",
          manifestation: null,
        })
      );
      rows.push({
        sectionKey: answer.sectionKey,
        itemKey: answer.itemKey,
        prompt:
          ciloBinding?.questionPrompt ?? promptByQuestionKey.get(questionKey) ?? answer.itemKey,
        ratingValue: answer.ratingValue,
        responseId: response.responseId,
        scale: resolveItemScaleIdentity(group.structureSnapshot, answer.sectionKey, answer.itemKey),
        cilo: ciloBinding
          ? {
              id: ciloId ?? `binding:${encodeQuestionKey(answer.sectionKey, answer.itemKey)}`,
              label: ciloId
                ? (ciloLabels.get(ciloId) ?? ciloBinding.ciloLabel)
                : ciloBinding.ciloLabel,
              description: ciloBinding.ciloDescription,
            }
          : null,
        evaluationId: group.evaluationId,
        poMappings,
        ...(directPoMappings.length > 0 ? { directPoMappings } : {}),
      });
    }
  }
  return rows;
}

/**
 * Course-bound PO evidence rows for the class groups of one export, in the
 * canonical `aggregateOutcomeEvidence` shape. Each submitted answer contributes
 * once per (response, evaluation, question, PO); manifestation stays a
 * descriptive label and never a weight.
 */
export function buildOutcomeEvidenceRows(
  models: Array<{ group: ReportCourseGroup; rows?: OutcomeItemRatingRow[] }>
): OutcomeEvidenceRow[] {
  const ratedModels = models.map((model) => ({
    group: model.group,
    rows: model.rows ?? [],
  }));
  const evidenceRows: OutcomeEvidenceRow[] = [];
  for (const { group, rows } of ratedModels) {
    const directByQuestionKey = new Map(
      group.directPoBindings.map((binding) => [
        encodeQuestionKey(binding.sectionKey, binding.itemKey),
        binding,
      ])
    );
    for (const row of rows) {
      const questionKey = encodeQuestionKey(row.sectionKey, row.itemKey);
      const cilo = row.cilo;
      const outcomeMappings = cilo
        ? row.poMappings.map((mapping) => ({
            outcomeId: mapping.poId,
            code: mapping.poCode,
            name: mapping.poDescription,
            manifestation: mapping.manifestation,
          }))
        : [];
      const directBinding = directByQuestionKey.get(questionKey);
      const directBindings = directBinding
        ? [
            {
              outcomeId: directBinding.poId ?? `snapshot:${directBinding.poCode}`,
              code: directBinding.poCode,
              name: directBinding.poDescription,
              questionPrompt: directBinding.questionPrompt,
            },
          ]
        : [];
      if ((!cilo || outcomeMappings.length === 0) && directBindings.length === 0) continue;

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
export function ratingSumOf(distribution: QuantitativeMetric["distribution"]): number {
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

/**
 * Per-question tallies for one class group. Questions are enumerated from the
 * frozen structure snapshot, so a question nobody answered still appears with
 * its zero counts, and a blank answer counts as missing only where the snapshot
 * defines the question's applicability.
 */
export function buildQuestionTallies(
  group: ReportCourseGroup,
  rows: OutcomeItemRatingRow[]
): ReportQuestionTally[] {
  const metrics = new Map(
    buildQuestionMetrics(rows).map((metric) => [
      encodeQuestionKey(metric.sectionKey, metric.itemKey),
      metric,
    ])
  );
  const questions = listSnapshotQuantitativeItems(group.structureSnapshot);
  const knownQuestionKeys = new Set(
    questions.map((question) => encodeQuestionKey(question.sectionKey, question.itemKey))
  );
  // A bound question the frozen snapshot does not enumerate still belongs in the
  // tally; its applicability is simply unknown, so no missing count is printed.
  for (const questionKey of metrics.keys()) {
    if (knownQuestionKeys.has(questionKey)) continue;
    const [sectionKey, itemKey] = decodeQuestionKeyForLabel(questionKey);
    questions.push({
      sectionKey,
      sectionTitle: sectionKey,
      itemKey,
      prompt: metrics.get(questionKey)?.prompt ?? itemKey,
      applicability: "required",
    });
    knownQuestionKeys.add(questionKey);
  }

  const rowCountByQuestionKey = new Map<string, number>();
  for (const row of rows) {
    const key = encodeQuestionKey(row.sectionKey, row.itemKey);
    rowCountByQuestionKey.set(key, (rowCountByQuestionKey.get(key) ?? 0) + 1);
  }

  const tallies: ReportQuestionTally[] = [];
  for (const question of questions) {
    const questionKey = encodeQuestionKey(question.sectionKey, question.itemKey);
    const scale = resolveItemScaleIdentity(
      group.structureSnapshot,
      question.sectionKey,
      question.itemKey
    );
    const metric = metrics.get(questionKey);
    const singleScaleMetric = metric?.quantitative ?? emptyMetric(scale);
    const categories = singleScaleMetric.distribution;
    const validCount = singleScaleMetric.ratingCount;
    const answeredRowCount = rowCountByQuestionKey.get(questionKey) ?? 0;
    const ciloBinding = group.ciloBindings.find(
      (binding) => encodeQuestionKey(binding.sectionKey, binding.itemKey) === questionKey
    );
    const directPoCodes = [
      ...new Set(
        group.directPoBindings
          .filter(
            (binding) => encodeQuestionKey(binding.sectionKey, binding.itemKey) === questionKey
          )
          .map((binding) => binding.poCode)
      ),
    ];

    tallies.push({
      question,
      ciloLabel:
        ciloBinding?.ciloLabel ??
        (metric && metric.binding.type === "CILO" ? metric.binding.ciloLabel : null),
      directPoCodes,
      scaleLabel: reportScaleLabel(scale),
      categories,
      validCount,
      excludedCount: Math.max(0, answeredRowCount - validCount),
      missingCount:
        question.applicability === "required"
          ? Math.max(0, group.responses.length - answeredRowCount)
          : null,
      ratingSum: ratingSumOf(categories),
      mean: singleScaleMetric.mean,
      distinctResponseCount: singleScaleMetric.responseCount,
      attainment: classifyMetric(singleScaleMetric, scale),
    });
  }
  return tallies.sort(
    (left, right) =>
      left.question.sectionKey.localeCompare(right.question.sectionKey) ||
      left.question.itemKey.localeCompare(right.question.itemKey)
  );
}

/**
 * CILO summaries for one class group. A CILO nobody rated validly keeps its row
 * with zero counts and an explicit no-evidence status rather than disappearing.
 */
export function buildCiloSummaries(
  group: ReportCourseGroup,
  rows: OutcomeItemRatingRow[],
  mappings: Map<string, ReportCiloMapping[]>
): ReportCiloSummary[] {
  const metrics = buildCiloMetrics(rows);
  const metricByCiloId = new Map(metrics.map((metric) => [metric.ciloId, metric]));
  const orderedCiloIds = [
    ...new Set(
      group.ciloBindings
        .map((binding) => binding.ciloId)
        .filter((value): value is string => value !== null)
    ),
  ];
  const ciloLabels = resolveCiloLabels(group.cilosSnapshot, orderedCiloIds);
  const questionKeysByCiloId = new Map<string, Set<string>>();
  for (const binding of group.ciloBindings) {
    if (!binding.ciloId) continue;
    const keys = questionKeysByCiloId.get(binding.ciloId) ?? new Set<string>();
    keys.add(encodeQuestionKey(binding.sectionKey, binding.itemKey));
    questionKeysByCiloId.set(binding.ciloId, keys);
  }

  const summaries: ReportCiloSummary[] = [];
  const seen = new Set<string>();
  for (const ciloId of orderedCiloIds) {
    seen.add(ciloId);
    summaries.push(
      ciloSummaryFor(group, ciloId, metricByCiloId.get(ciloId) ?? null, {
        ciloLabel: ciloLabels.get(ciloId) ?? "CILO",
        mappings: mappings.get(ciloId) ?? [],
        questionKeys: questionKeysByCiloId.get(ciloId) ?? new Set<string>(),
      })
    );
  }
  // A binding whose CILO record is gone (archived or deleted) keeps its own row
  // instead of pooling under another CILO.
  for (const binding of group.ciloBindings) {
    if (binding.ciloId || seen.has(binding.ciloLabel)) continue;
    const ciloKey = `label:${binding.ciloLabel}`;
    if (seen.has(ciloKey)) continue;
    seen.add(ciloKey);
    summaries.push(
      ciloSummaryFor(group, null, null, {
        ciloLabel: binding.ciloLabel,
        mappings: [],
        questionKeys: new Set([encodeQuestionKey(binding.sectionKey, binding.itemKey)]),
      })
    );
  }
  return summaries.sort(
    (left, right) =>
      left.ciloLabel.localeCompare(right.ciloLabel) ||
      left.ciloDescription.localeCompare(right.ciloDescription)
  );
}

function ciloSummaryFor(
  group: ReportCourseGroup,
  ciloId: string | null,
  metric: ReturnType<typeof buildCiloMetrics>[number] | null,
  context: { ciloLabel: string; mappings: ReportCiloMapping[]; questionKeys: Set<string> }
): ReportCiloSummary {
  const scaleGroups = metric
    ? metric.scaleGroups.map((groupMetric) => ({
        scaleLabel: reportScaleLabel(scaleOfMetric(groupMetric)),
        mean: groupMetric.mean,
        ratingCount: groupMetric.ratingCount,
        categories: groupMetric.distribution,
      }))
    : [];
  const validCount = scaleGroups.reduce((sum, groupMetric) => sum + groupMetric.ratingCount, 0);
  const singleScaleMetric =
    metric && metric.scaleGroups.length === 1
      ? metric.scaleGroups[0]
      : (metric?.quantitative ?? null);
  const questionRefs = listSnapshotQuantitativeItems(group.structureSnapshot)
    .filter((question) =>
      context.questionKeys.has(encodeQuestionKey(question.sectionKey, question.itemKey))
    )
    .map((question) => ({
      sectionKey: question.sectionKey,
      itemKey: question.itemKey,
      prompt: question.prompt,
    }));

  return {
    ciloId,
    ciloLabel: context.ciloLabel,
    ciloDescription: metric?.description ?? "",
    mappings: context.mappings,
    questionRefs,
    scaleGroups,
    validCount,
    distinctResponseCount: singleScaleMetric?.responseCount ?? 0,
    mean: metric?.quantitative?.mean ?? null,
    attainment: metric
      ? classifyScaleGroups(
          metric.scaleGroups.map((groupMetric) => ({
            scale: groupMetric.scale,
            metric: groupMetric,
          }))
        )
      : classifyOutcomeMean(null, null),
  };
}

/** Raw-response grid rows for one class group, one row per submitted response. */
export function buildRawResponseRows(group: ReportCourseGroup): ReportRawResponseRow[] {
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

/** Every submitted response across the supplied class groups. */
export function submittedResponsesOf(groups: ReportCourseGroup[]): ReportResponseRow[] {
  return groups.flatMap((group) => group.responses);
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
