import { describe, expect, it } from "vitest";
import {
  OUTCOME_ATTAINMENT_BENCHMARK,
  OUTCOME_ATTAINMENT_POLICY_ID,
  classifyOutcomeDistributions,
  classifyOutcomeMean,
  supportedOutcomeScaleKind,
  type OutcomeAttainment,
} from "@/features/analytics/aggregators/outcome-attainment";
import { toScaleIdentity } from "@/features/analytics/aggregators/scale-identity";

const DIRECT = [
  { value: 1, label: "Not Achieved" },
  { value: 2, label: "Slightly Achieved" },
  { value: 3, label: "Moderately Achieved" },
  { value: 4, label: "Mostly Achieved" },
  { value: 5, label: "Fully Achieved" },
];

const AGREE = [
  { value: 1, label: "Strongly Disagree" },
  { value: 2, label: "Disagree" },
  { value: 3, label: "Neutral" },
  { value: 4, label: "Agree" },
  { value: 5, label: "Strongly Agree" },
];

const PERF = [
  { value: 1, label: "Poor" },
  { value: 2, label: "Fair" },
  { value: 3, label: "Satisfactory" },
  { value: 4, label: "Very Satisfactory" },
  { value: 5, label: "Excellent" },
];

function scaleFor(descriptors: typeof DIRECT) {
  return toScaleIdentity(descriptors.map((d) => ({ ...d })));
}

describe("CLOIE_OUTCOME_MEAN_V1 policy identity", () => {
  it("pins the policy id and benchmark", () => {
    expect(OUTCOME_ATTAINMENT_POLICY_ID).toBe("CLOIE_OUTCOME_MEAN_V1");
    expect(OUTCOME_ATTAINMENT_BENCHMARK).toBe(3.5);
  });
});

describe("threshold boundaries use full precision", () => {
  const cases: Array<[number, OutcomeAttainment["interpretation"], OutcomeAttainment["cqi"]]> = [
    [5, "Fully Attained", "Meets Benchmark"],
    [4.5, "Fully Attained", "Meets Benchmark"],
    [4.4999999, "Attained", "Meets Benchmark"],
    [3.5, "Attained", "Meets Benchmark"],
    [3.4999999, "Partially Attained", "Needs Attention"],
    [2.5, "Partially Attained", "Needs Attention"],
    [2.4999999, "Slightly Attained", "Below Benchmark"],
    [1.5, "Slightly Attained", "Below Benchmark"],
    [1.4999999, "Not Attained", "Below Benchmark"],
    [1, "Not Attained", "Below Benchmark"],
  ];
  for (const [mean, interpretation, cqi] of cases) {
    it(`classifies ${mean} as ${interpretation} / ${cqi}`, () => {
      const result = classifyOutcomeMean(mean, scaleFor(DIRECT));
      expect(result.status).toBe("classified");
      expect(result.interpretation).toBe(interpretation);
      expect(result.cqi).toBe(cqi);
      expect(result.meetsBenchmark).toBe(mean >= 3.5);
      expect(result.policyId).toBe("CLOIE_OUTCOME_MEAN_V1");
    });
  }

  it("does not promote a rounded display across a boundary", () => {
    // Displays as 4.50 but classifies from full precision.
    const result = classifyOutcomeMean(4.495, scaleFor(DIRECT));
    expect(result.interpretation).toBe("Attained");
    expect((4.495).toFixed(2)).toBe("4.50");
  });
});

describe("supported scales keep frozen semantics", () => {
  it("supports direct, agreement, and performance descriptor sets", () => {
    expect(supportedOutcomeScaleKind(scaleFor(DIRECT))).toBe("direct-attainment");
    expect(supportedOutcomeScaleKind(scaleFor(AGREE))).toBe("agreement");
    expect(supportedOutcomeScaleKind(scaleFor(PERF))).toBe("performance");
  });

  it("marks agreement and performance evidence as indirect perception", () => {
    expect(classifyOutcomeMean(4.6, scaleFor(AGREE)).isIndirect).toBe(true);
    expect(classifyOutcomeMean(4.6, scaleFor(PERF)).isIndirect).toBe(true);
    expect(classifyOutcomeMean(4.6, scaleFor(DIRECT)).isIndirect).toBe(false);
  });

  it("rejects numeric 1-5 scales with no labels", () => {
    const numeric = toScaleIdentity([1, 2, 3, 4, 5].map((value) => ({ value, label: null })));
    expect(supportedOutcomeScaleKind(numeric)).toBeNull();
    expect(classifyOutcomeMean(4.8, numeric).status).toBe("unsupported-scale");
  });

  it("rejects four-point and custom-worded five-point scales", () => {
    const four = toScaleIdentity([
      { value: 1, label: "Strongly Disagree" },
      { value: 2, label: "Disagree" },
      { value: 3, label: "Agree" },
      { value: 4, label: "Strongly Agree" },
    ]);
    expect(classifyOutcomeMean(3.8, four).status).toBe("unsupported-scale");

    const custom = toScaleIdentity([
      { value: 1, label: "Very Poor" },
      { value: 2, label: "Poor" },
      { value: 3, label: "Okay" },
      { value: 4, label: "Good" },
      { value: 5, label: "Great" },
    ]);
    expect(classifyOutcomeMean(4.8, custom).status).toBe("unsupported-scale");
  });

  it("rejects null scales and out-of-range means", () => {
    expect(classifyOutcomeMean(4.2, null).status).toBe("unsupported-scale");
    expect(classifyOutcomeMean(5.5, scaleFor(DIRECT)).status).toBe("unsupported-scale");
    expect(classifyOutcomeMean(0.9, scaleFor(DIRECT)).status).toBe("unsupported-scale");
  });
});

describe("missing and mixed evidence stay distinct from non-attainment", () => {
  it("reports no-evidence for null means", () => {
    const result = classifyOutcomeMean(null, scaleFor(DIRECT));
    expect(result.status).toBe("no-evidence");
    expect(result.interpretation).toBeNull();
  });

  it("reports mixed-scales even when a pooled mean exists", () => {
    const result = classifyOutcomeMean(4.8, scaleFor(DIRECT), { spansMultipleScales: true });
    expect(result.status).toBe("mixed-scales");
    expect(result.interpretation).toBeNull();
  });

  it("keeps Not Attained separate from no-evidence", () => {
    const attained = classifyOutcomeMean(1.2, scaleFor(DIRECT));
    expect(attained.status).toBe("classified");
    expect(attained.interpretation).toBe("Not Attained");
    expect(attained.cqi).toBe("Below Benchmark");
  });
});

describe("distribution-based classification", () => {
  function dist(labels: typeof DIRECT) {
    return [{ categories: labels.map((entry) => ({ ...entry })) }];
  }
  it("classifies a single compatible distribution", () => {
    const result = classifyOutcomeDistributions(3.7, dist(DIRECT), false);
    expect(result.interpretation).toBe("Attained");
  });
  it("rejects mixed, missing, and multi-distribution rows", () => {
    expect(classifyOutcomeDistributions(4.8, dist(DIRECT), true).status).toBe("mixed-scales");
    expect(classifyOutcomeDistributions(null, dist(DIRECT), false).status).toBe("no-evidence");
    expect(classifyOutcomeDistributions(4.2, [...dist(DIRECT), ...dist(AGREE)], false).status).toBe(
      "unsupported-scale"
    );
    expect(classifyOutcomeDistributions(4.2, [], false).status).toBe("unsupported-scale");
  });
});
