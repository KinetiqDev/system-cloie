import type { ScaleIdentity } from "./scale-identity";

// ---------------------------------------------------------------------------
// Canonical CILO and PO mean-score interpretation policy
//
// Policy `CLOIE_OUTCOME_MEAN_V1`: proposed institutional thresholds for
// compatible five-point outcome-attainment scales. These thresholds are
// informed by OBE/CQI assessment practices; they are not numerical cutoffs
// mandated by CHED, ABET, or PAASCU, and institutional approval is not
// recorded — the policy retains its proposed status.
//
// Rules:
// - Classify using full-precision means; round only for presentation.
// - Boundary values belong to the higher band (4.50 is Fully Attained).
// - Missing evidence (null mean) and unsupported/mixed scales never produce
//   an attainment label; they stay distinct from non-attainment.
// - A mean is never classified solely because its numeric range is 1–5: the
//   frozen descriptor set must match a known compatible scale.
// - Compatible agreement and performance-evaluation scales share the numeric
//   bands but keep their frozen descriptors; indirect stakeholder surveys
//   never claim demonstrated competency.
// - Mathematical aggregation stays elsewhere; this module is pure and
//   deterministic.
// ---------------------------------------------------------------------------

/** Versioned policy identifier for every classified outcome mean. */
export const OUTCOME_ATTAINMENT_POLICY_ID = "CLOIE_OUTCOME_MEAN_V1" as const;

/** Primary attainment benchmark: `mean >= 3.50` meets benchmark. */
export const OUTCOME_ATTAINMENT_BENCHMARK = 3.5 as const;

/** Institutional approval has not been recorded; the policy stays proposed. */
export const OUTCOME_ATTAINMENT_POLICY_STATUS = "proposed" as const;

export type OutcomeAttainmentInterpretation =
  | "Fully Attained"
  | "Attained"
  | "Partially Attained"
  | "Slightly Attained"
  | "Not Attained";

export type OutcomeCqiClassification = "Meets Benchmark" | "Needs Attention" | "Below Benchmark";

/**
 * Why a row has no interpretation. Missing evidence, incompatible scales,
 * and mixed-scale pools stay distinct from non-attainment (`Not Attained`).
 */
export type OutcomeAttainmentStatus =
  | "classified"
  | "no-evidence"
  | "unsupported-scale"
  | "mixed-scales";

/** Frozen-descriptor semantics behind a supported five-point scale. */
export type OutcomeScaleKind = "direct-attainment" | "agreement" | "performance";

export type OutcomeAttainment = {
  policyId: typeof OUTCOME_ATTAINMENT_POLICY_ID;
  benchmark: typeof OUTCOME_ATTAINMENT_BENCHMARK;
  status: OutcomeAttainmentStatus;
  interpretation: OutcomeAttainmentInterpretation | null;
  cqi: OutcomeCqiClassification | null;
  /** True when a classified mean meets the 3.50 benchmark; null otherwise. */
  meetsBenchmark: boolean | null;
  /** Descriptor semantics; null unless the scale is a known compatible set. */
  scaleKind: OutcomeScaleKind | null;
  /** True for agreement/performance scales: perception, not demonstrated competency. */
  isIndirect: boolean | null;
};

type SupportedScaleDef = {
  kind: OutcomeScaleKind;
  descriptors: Array<{ value: number; label: string }>;
};

/**
 * The only descriptor sets the policy classifies. Every entry is a
 * five-point scale with min 1 and max 5, but compatibility is decided by the
 * full frozen descriptor set — never by the numeric range alone. Numeric
 * scales with null labels, four-point scales, and custom wording are
 * unsupported by design.
 */
const SUPPORTED_SCALES: SupportedScaleDef[] = [
  {
    kind: "direct-attainment",
    descriptors: [
      { value: 1, label: "Not Achieved" },
      { value: 2, label: "Slightly Achieved" },
      { value: 3, label: "Moderately Achieved" },
      { value: 4, label: "Mostly Achieved" },
      { value: 5, label: "Fully Achieved" },
    ],
  },
  {
    kind: "agreement",
    descriptors: [
      { value: 1, label: "Strongly Disagree" },
      { value: 2, label: "Disagree" },
      { value: 3, label: "Neutral" },
      { value: 4, label: "Agree" },
      { value: 5, label: "Strongly Agree" },
    ],
  },
  {
    kind: "performance",
    descriptors: [
      { value: 1, label: "Poor" },
      { value: 2, label: "Fair" },
      { value: 3, label: "Satisfactory" },
      { value: 4, label: "Very Satisfactory" },
      { value: 5, label: "Excellent" },
    ],
  },
];

const SUPPORTED_KEYS = new Map<string, OutcomeScaleKind>(
  SUPPORTED_SCALES.map((entry) => [canonicalKey(entry.descriptors), entry.kind])
);

function canonicalKey(descriptors: Array<{ value: number; label: string | null }>): string {
  return JSON.stringify(
    [...descriptors]
      .sort((left, right) => left.value - right.value)
      .map((descriptor) => ({ value: descriptor.value, label: descriptor.label }))
  );
}

function unclassified(
  status: Exclude<OutcomeAttainmentStatus, "classified">
): OutcomeAttainment {
  return {
    policyId: OUTCOME_ATTAINMENT_POLICY_ID,
    benchmark: OUTCOME_ATTAINMENT_BENCHMARK,
    status,
    interpretation: null,
    cqi: null,
    meetsBenchmark: null,
    scaleKind: null,
    isIndirect: null,
  };
}

/** Resolve a scale identity to a supported kind; null when unsupported. */
export function supportedOutcomeScaleKind(
  scale: ScaleIdentity | null
): OutcomeScaleKind | null {
  if (!scale) return null;
  return SUPPORTED_KEYS.get(canonicalKey(scale.descriptors)) ?? null;
}

/**
 * Classify one full-precision outcome mean against its compatible scale.
 * `spansMultipleScales` forces `mixed-scales` even when a pooled mean
 * exists, because cross-scale values are not directly comparable. Null or
 * non-finite means report `no-evidence`, never zero attainment.
 */
export function classifyOutcomeMean(
  mean: number | null,
  scale: ScaleIdentity | null,
  opts?: { spansMultipleScales?: boolean }
): OutcomeAttainment {
  if (opts?.spansMultipleScales) return unclassified("mixed-scales");
  if (mean === null || !Number.isFinite(mean)) return unclassified("no-evidence");

  const scaleKind = supportedOutcomeScaleKind(scale);
  if (!scaleKind) return unclassified("unsupported-scale");
  if (mean < 1 || mean > 5) return unclassified("unsupported-scale");

  let interpretation: OutcomeAttainmentInterpretation;
  let cqi: OutcomeCqiClassification;
  if (mean >= 4.5) {
    interpretation = "Fully Attained";
    cqi = "Meets Benchmark";
  } else if (mean >= 3.5) {
    interpretation = "Attained";
    cqi = "Meets Benchmark";
  } else if (mean >= 2.5) {
    interpretation = "Partially Attained";
    cqi = "Needs Attention";
  } else if (mean >= 1.5) {
    interpretation = "Slightly Attained";
    cqi = "Below Benchmark";
  } else {
    interpretation = "Not Attained";
    cqi = "Below Benchmark";
  }

  return {
    policyId: OUTCOME_ATTAINMENT_POLICY_ID,
    benchmark: OUTCOME_ATTAINMENT_BENCHMARK,
    status: "classified",
    interpretation,
    cqi,
    meetsBenchmark: mean >= OUTCOME_ATTAINMENT_BENCHMARK,
    scaleKind,
    isIndirect: scaleKind !== "direct-attainment",
  };
}

/**
 * Classify an outcome row from its scale-separated distributions. The row
 * must carry exactly one distribution; zero, several, or a mixed-scale pool
 * never produces an interpretation. Descriptors come from the frozen snapshot
 * categories, so unknown wording stays unsupported.
 */
export function classifyOutcomeDistributions(
  mean: number | null,
  distributions: Array<{
    categories: Array<{ value: number; label: string | null }>;
  }>,
  spansMultipleScales: boolean
): OutcomeAttainment {
  if (spansMultipleScales) return unclassified("mixed-scales");
  if (mean === null || !Number.isFinite(mean)) return unclassified("no-evidence");
  if (distributions.length !== 1) return unclassified("unsupported-scale");

  const single = distributions[0];
  const scale: ScaleIdentity = {
    key: canonicalKey(single.categories),
    min: Math.min(...single.categories.map((category) => category.value)),
    max: Math.max(...single.categories.map((category) => category.value)),
    descriptors: [...single.categories]
      .sort((left, right) => left.value - right.value)
      .map((category) => ({ value: category.value, label: category.label })),
  };
  return classifyOutcomeMean(mean, scale);
}
