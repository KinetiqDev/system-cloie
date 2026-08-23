import { describeScale, ratingBelongsToScale, type ScaleIdentity } from "./scale-identity";
import { buildQuantitativeMetric, groupRatingsByScale, type QuantitativeRating } from "./quantitative";
import type {
  CiloContributingQuestion,
  CiloMetric,
  CiloPloMapping,
  MetricEvidenceSummary,
  QuestionBinding,
  QuestionMetric,
} from "./types";

// ---------------------------------------------------------------------------
// CILO and question metric aggregation (spec §6.4–§6.5, §38–§39)
// ---------------------------------------------------------------------------

/**
 * Narrow structural row for CILO and question aggregation: one submitted
 * rating with its snapshot-resolved scale identity and binding. The service
 * read resolves `scale` via resolveItemScaleIdentity so these aggregators
 * stay pure. `cilo` null marks an explicit or effective GENERAL item;
 * `ploMappings` carries the selected Program's current mappings.
 */
export type OutcomeItemRatingRow = {
  sectionKey: string;
  itemKey: string;
  prompt: string;
  ratingValue: number;
  responseId: string;
  scale: ScaleIdentity | null;
  cilo: { id: string; label: string; description: string } | null;
  ploMappings: CiloPloMapping[];
};

/** A rating contributes only when its value belongs to the item's frozen scale. */
function validRating(row: OutcomeItemRatingRow): boolean {
  return ratingBelongsToScale(row.scale, row.ratingValue);
}

function toRating(row: OutcomeItemRatingRow): QuantitativeRating {
  return { value: row.ratingValue, responseId: row.responseId };
}

type CiloAggregate = {
  ratings: Array<{ rating: QuantitativeRating; scale: ScaleIdentity | null }>;
  questions: Map<string, CiloContributingQuestion>;
  mappings: Map<string, CiloPloMapping>;
};

function accumulateCiloRow(aggregate: CiloAggregate, row: OutcomeItemRatingRow): void {
  aggregate.ratings.push({ rating: toRating(row), scale: row.scale });
  const questionKey = `${row.sectionKey}::${row.itemKey}`;
  if (!aggregate.questions.has(questionKey)) {
    aggregate.questions.set(questionKey, {
      sectionKey: row.sectionKey,
      itemKey: row.itemKey,
      prompt: row.prompt,
    });
  }
  for (const mapping of row.ploMappings) {
    if (!aggregate.mappings.has(mapping.ploId)) {
      aggregate.mappings.set(mapping.ploId, mapping);
    }
  }
}

/**
 * Build canonical CILO metrics. Every valid rating from a question bound to
 * the CILO pools into that CILO's raw mean across all its questions — never a
 * mean of question means (§6.4). Unbound GENERAL items never contribute to
 * CILO means (§6.5). Manifestations stay descriptive labels on the mappings:
 * every mapping receives every valid rating, with no filtering and no numeric
 * weight (§7). Ratings spanning incompatible scales produce separate
 * scaleGroups instead of one combined metric (§9).
 */
export function buildCiloMetrics(rows: OutcomeItemRatingRow[]): CiloMetric[] {
  const byCilo = new Map<
    string,
    CiloAggregate & { label: string; description: string }
  >();

  for (const row of rows) {
    if (!row.cilo || !validRating(row)) {
      continue;
    }

    let aggregate = byCilo.get(row.cilo.id);
    if (!aggregate) {
      aggregate = {
        label: row.cilo.label,
        description: row.cilo.description,
        ratings: [],
        questions: new Map(),
        mappings: new Map(),
      };
      byCilo.set(row.cilo.id, aggregate);
    }
    accumulateCiloRow(aggregate, row);
  }

  return [...byCilo.entries()]
    .map(([ciloId, aggregate]) => {
      const scaleGroups = groupRatingsByScale(aggregate.ratings).map((group) => group.metric);
      // Stable order: primary scale key, so single-scale groups are deterministic.
      scaleGroups.sort((left, right) =>
        (left.scale?.key ?? "").localeCompare(right.scale?.key ?? "")
      );
      const questions = [...aggregate.questions.values()].sort(
        (left, right) =>
          left.sectionKey.localeCompare(right.sectionKey) ||
          left.itemKey.localeCompare(right.itemKey)
      );
      const ratingCount = scaleGroups.reduce((sum, group) => sum + group.ratingCount, 0);
      const responseCount = new Set(
        aggregate.ratings.map((entry) => entry.rating.responseId)
      ).size;
      const evidenceSummary: MetricEvidenceSummary = {
        ratingCount,
        responseCount,
        questionCount: questions.length,
        scaleLabel:
          scaleGroups.length === 1
            ? (scaleGroups[0].scale ? describeScale(scaleGroups[0].scale.descriptors) : undefined)
            : undefined,
        explanation:
          scaleGroups.length === 1
            ? `Raw mean of ${ratingCount} valid ratings from ${questions.length} bound question(s); unbound items excluded.`
            : `Ratings span ${scaleGroups.length} incompatible scales; each scale is reported separately with no combined mean.`,
      };
      return {
        ciloId,
        description: aggregate.description,
        quantitative: scaleGroups.length === 1 ? scaleGroups[0] : null,
        scaleGroups,
        mappings: [...aggregate.mappings.values()].sort(
          (left, right) =>
            left.ploCode.localeCompare(right.ploCode) || left.ploId.localeCompare(right.ploId)
        ),
        contributingQuestions: questions,
        evidenceSummary,
      };
    })
    .sort(
      (left, right) =>
        left.description.localeCompare(right.description) || left.ciloId.localeCompare(right.ciloId)
    );
}

type QuestionAggregate = {
  row: OutcomeItemRatingRow;
  entries: Array<{ rating: QuantitativeRating; scale: ScaleIdentity | null }>;
};

/**
 * Build canonical per-question metrics with explicit bindings. Unbound items
 * report binding type GENERAL rather than null (§39). One instrument-version
 * item resolves to exactly one snapshot scale entry, but evaluations on
 * different versions may share an item key; each compatible group is then
 * reported separately with no combined mean (§9). Out-of-scale ratings are
 * excluded from the metric like every other surface.
 */
export function buildQuestionMetrics(rows: OutcomeItemRatingRow[]): QuestionMetric[] {
  const byQuestion = new Map<string, QuestionAggregate>();

  for (const row of rows) {
    const questionKey = `${row.sectionKey}::${row.itemKey}`;
    let aggregate = byQuestion.get(questionKey);
    if (!aggregate) {
      aggregate = { row, entries: [] };
      byQuestion.set(questionKey, aggregate);
    }
    if (validRating(row)) {
      aggregate.entries.push({ rating: toRating(row), scale: row.scale });
    }
  }

  return [...byQuestion.values()]
    .map(({ row, entries }) => {
      const binding: QuestionBinding = row.cilo
        ? { type: "CILO", ciloId: row.cilo.id, ciloLabel: row.cilo.label }
        : { type: "GENERAL" };
      const scaleGroups = groupRatingsByScale(entries).map((group) => group.metric);
      scaleGroups.sort((left, right) =>
        (left.scale?.key ?? "").localeCompare(right.scale?.key ?? "")
      );
      return {
        sectionKey: row.sectionKey,
        itemKey: row.itemKey,
        prompt: row.prompt,
        binding,
        quantitative: scaleGroups.length === 1 ? scaleGroups[0] : null,
        scaleGroups,
      };
    })
    .sort(
      (left, right) =>
        left.sectionKey.localeCompare(right.sectionKey) || left.itemKey.localeCompare(right.itemKey)
    );
}
