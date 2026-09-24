import { describe, expect, it } from "vitest";
import { buildCourseDerivedGoMetrics } from "@/features/analytics/aggregators/go";
import type { OutcomeItemRatingRow } from "@/features/analytics/aggregators/cilo";
import {
  toScaleIdentity,
  type ScaleDescriptor,
} from "@/features/analytics/aggregators/scale-identity";
import {
  aggregateOutcomeEvidence,
  buildProgramHeadOutcomeDtos,
  type OutcomeEvidenceRow,
} from "@/features/analytics/services/program-head-analytics-aggregators";

/**
 * Program Head Outcomes and canonical GO metric boundaries (issue #639).
 *
 * The Outcomes view has not been cut over to `buildCourseDerivedGoMetrics`,
 * and this suite pins why. The two agree on every counting rule that matters —
 * one contribution per (response, evaluation, question, GO), direct and
 * CILO-mapped overlap collapsed, invalid ratings counted rather than summed,
 * many-to-many fan-out, GO pooling across evaluations, complete labelled
 * distributions, and no row for unmapped or unbound ratings — but they disagree on what a GO
 * row *is*. The legacy DTO is the Program Head's evidence surface: it carries
 * per-contributor and per-course provenance, the frozen manifestation label,
 * the evaluation list, the many-to-many disclosure flag, and a pooled mean that
 * the UI discloses as cross-scale. The canonical `GoMetric` carries none of
 * those, and it refuses a combined mean for mixed scales. A cutover would
 * therefore delete evidence and change a rendered number, so this suite holds
 * both halves still.
 */

const SCALE_5: ScaleDescriptor[] = [
  { value: 1, label: "Not Achieved" },
  { value: 2, label: "Slightly Achieved" },
  { value: 3, label: "Moderately Achieved" },
  { value: 4, label: "Mostly Achieved" },
  { value: 5, label: "Fully Achieved" },
];
const SCALE_4: ScaleDescriptor[] = [
  { value: 1, label: "Poor" },
  { value: 2, label: "Fair" },
  { value: 3, label: "Satisfactory" },
  { value: 4, label: "Excellent" },
];

const SNAPSHOT = {
  id: "iv-1",
  structureSnapshot: [
    {
      key: "outcomes",
      title: "Outcomes",
      items: [
        { key: "five", kind: "quantitative", prompt: "Five-point", likertDescriptors: SCALE_5 },
        { key: "four", kind: "quantitative", prompt: "Four-point", likertDescriptors: SCALE_4 },
      ],
    },
  ],
};

const COURSE = { id: "course-1", code: "IT201", title: "Software Engineering" };
const GO_1 = {
  goId: "go-1",
  code: "GO-1",
  name: "Discipline knowledge",
  manifestation: "LEARNING" as const,
};
const GO_2 = {
  goId: "go-2",
  code: "GO-2",
  name: "Communication",
  manifestation: "PRACTICE" as const,
};

type Spec = {
  responseId: string;
  itemKey: string;
  ratingValue: number;
  goMappings?: OutcomeEvidenceRow["goMappings"];
  directGoBindings?: OutcomeEvidenceRow["directGoBindings"];
  withCilo?: boolean;
  evaluationId?: string;
  deploymentName?: string;
};

function legacyRow(spec: Spec): OutcomeEvidenceRow {
  return {
    ratingValue: spec.ratingValue,
    responseId: spec.responseId,
    sectionKey: "outcomes",
    itemKey: spec.itemKey,
    instrumentVersion: SNAPSHOT,
    course: COURSE,
    cilo:
      spec.withCilo === false
        ? null
        : {
            id: "cilo-1",
            code: "CILO 1",
            description: "Apply methods",
            course: COURSE,
          },
    goMappings: spec.goMappings ?? [],
    directGoBindings: spec.directGoBindings ?? [],
    evaluationId: spec.evaluationId ?? "eval-1",
    deploymentName: spec.deploymentName ?? "End-of-term evaluation",
  };
}

function canonicalRow(spec: Spec): OutcomeItemRatingRow {
  const descriptors = spec.itemKey === "four" ? SCALE_4 : SCALE_5;
  return {
    sectionKey: "outcomes",
    itemKey: spec.itemKey,
    prompt: spec.itemKey,
    ratingValue: spec.ratingValue,
    responseId: spec.responseId,
    scale: toScaleIdentity(descriptors),
    cilo:
      spec.withCilo === false
        ? null
        : { id: "cilo-1", label: "Apply methods", description: "Apply methods" },
    evaluationId: spec.evaluationId ?? "eval-1",
    goMappings: (spec.goMappings ?? []).map((mapping) => ({
      goId: mapping.goId,
      goCode: mapping.code,
      goDescription: mapping.name,
      manifestation: mapping.manifestation,
    })),
    directGoMappings: (spec.directGoBindings ?? []).map((binding) => ({
      goId: binding.goId,
      goCode: binding.code,
      goDescription: binding.name,
      manifestation: null,
    })),
  };
}

function legacyDto(specs: Spec[]) {
  return buildProgramHeadOutcomeDtos(aggregateOutcomeEvidence(specs.map(legacyRow)));
}

function canonicalMetric(specs: Spec[]) {
  return buildCourseDerivedGoMetrics(specs.map(canonicalRow));
}

describe("Program Head Outcomes and canonical GO metric boundaries", () => {
  it("counts one contribution per response, evaluation, question, and GO in both paths", () => {
    // One response, one question, mapped to two GOs: one contribution each.
    const specs: Spec[] = [
      { responseId: "r1", itemKey: "five", ratingValue: 4, goMappings: [GO_1, GO_2] },
    ];

    expect(
      legacyDto(specs).map((row) => ({
        code: row.code,
        ratingCount: row.ratingCount,
        mean: row.meanRating,
      }))
    ).toEqual([
      { code: "GO-1", ratingCount: 1, mean: 4 },
      { code: "GO-2", ratingCount: 1, mean: 4 },
    ]);
    expect(
      canonicalMetric(specs).map((row) => ({
        code: row.goCode,
        ratingCount: row.ratingCount,
        mean: row.mean,
      }))
    ).toEqual([
      { code: "GO-1", ratingCount: 1, mean: 4 },
      { code: "GO-2", ratingCount: 1, mean: 4 },
    ]);
  });

  it("collapses a direct binding and a CILO mapping that name the same GO", () => {
    const specs: Spec[] = [
      {
        responseId: "r1",
        itemKey: "five",
        ratingValue: 5,
        goMappings: [GO_1],
        directGoBindings: [
          { goId: "go-1", code: "GO-1", name: "Discipline knowledge", questionPrompt: "Q" },
        ],
      },
    ];

    expect(legacyDto(specs)[0]).toMatchObject({ ratingCount: 1, meanRating: 5 });
    expect(canonicalMetric(specs)[0]).toMatchObject({ ratingCount: 1, mean: 5 });
  });

  it("counts an invalid rating diagnostically in both paths without inflating the mean", () => {
    const specs: Spec[] = [
      {
        responseId: "r1",
        itemKey: "five",
        ratingValue: 9,
        withCilo: false,
        directGoBindings: [
          { goId: "go-1", code: "GO-1", name: "Discipline knowledge", questionPrompt: "Q" },
        ],
      },
    ];

    expect(legacyDto(specs)[0]).toMatchObject({
      meanRating: null,
      ratingCount: 0,
      excludedRatingCount: 1,
    });
    expect(canonicalMetric(specs)[0]).toMatchObject({
      mean: null,
      ratingCount: 0,
      excludedRatingCount: 1,
    });
  });

  it("keeps incompatible scales in separate groups, but pools the Outcomes mean and the canonical one stays null", () => {
    const specs: Spec[] = [
      { responseId: "r1", itemKey: "five", ratingValue: 5, goMappings: [GO_1] },
      { responseId: "r2", itemKey: "four", ratingValue: 3, goMappings: [GO_1] },
    ];

    const [legacy] = legacyDto(specs);
    // The Program Head row pools across scales by design and discloses it: the
    // view renders 4.00 and prints the cross-scale comparability notice.
    expect(legacy).toMatchObject({
      meanRating: 4,
      ratingCount: 2,
      spansMultipleScales: true,
      excludedRatingCount: 0,
    });
    expect(legacy!.distributions).toHaveLength(2);
    expect(legacy!.distributions.map((d) => d.scaleLabel).sort()).toEqual([
      "1–4 (4-point)",
      "1–5 (5-point)",
    ]);

    // The canonical metric refuses a combined mean for mixed scales, so the same
    // evidence would render as "—" instead of 4.00.
    const [canonical] = canonicalMetric(specs);
    expect(canonical).toMatchObject({
      mean: null,
      ratingCount: 2,
      spansMultipleScales: true,
      excludedRatingCount: 0,
    });
    expect(canonical!.scaleGroups).toHaveLength(2);
  });

  it("carries contributor, course, manifestation, evaluation, and disclosure evidence the canonical metric has none of", () => {
    const specs: Spec[] = [
      {
        responseId: "r1",
        itemKey: "five",
        ratingValue: 4,
        goMappings: [GO_1, GO_2],
        evaluationId: "eval-1",
        deploymentName: "End-of-term evaluation",
      },
      {
        responseId: "r2",
        itemKey: "five",
        ratingValue: 5,
        withCilo: false,
        directGoBindings: [
          { goId: "go-1", code: "GO-1", name: "Discipline knowledge", questionPrompt: "Q" },
        ],
        evaluationId: "eval-2",
        deploymentName: "Retake evaluation",
      },
    ];

    const aggregation = aggregateOutcomeEvidence(specs.map(legacyRow));
    const [go1] = buildProgramHeadOutcomeDtos(aggregation).filter((row) => row.code === "GO-1");

    // Each provenance kind stays distinguishable, with its own mean.
    expect(go1!.contributors.map((contributor) => contributor.kind).sort()).toEqual([
      "CILO",
      "DIRECT_GO",
    ]);
    expect(go1!.contributors.every((contributor) => contributor.meanRating !== undefined)).toBe(
      true
    );
    // The CILO contributor keeps its frozen manifestation label.
    expect(go1!.contributors.find((c) => c.kind === "CILO")).toMatchObject({
      manifestation: "LEARNING",
      ratingCount: 1,
    });
    expect(go1!.contributingCourses).toEqual([
      { id: "course-1", code: "IT201", title: "Software Engineering" },
    ]);
    expect(go1!.contributingCilos).toEqual([{ id: "cilo-1", description: "Apply methods" }]);
    expect(go1!.evidenceEvaluations.map((e) => e.deploymentName)).toEqual([
      "End-of-term evaluation",
      "Retake evaluation",
    ]);
    // The view's many-to-many notice is driven by this aggregate-level flag.
    expect(aggregation.hasMultiMappedCilo).toBe(true);

    // The canonical metric keeps a CILO label list and counts, and nothing else.
    const [canonicalGo1] = canonicalMetric(specs).filter((row) => row.goCode === "GO-1");
    expect(canonicalGo1!.contributingCilos).toEqual([{ id: "cilo-1", label: "Apply methods" }]);
    expect(canonicalGo1!.evaluationCount).toBe(2);
    expect(canonicalGo1).not.toHaveProperty("contributors");
    expect(canonicalGo1).not.toHaveProperty("contributingCourses");
    expect(canonicalGo1).not.toHaveProperty("evidenceEvaluations");
    expect(canonicalGo1).not.toHaveProperty("distributions");
  });

  it("groups one GO across evaluations in both paths, since neither partitions by evaluation", () => {
    const specs: Spec[] = [
      {
        responseId: "r1",
        itemKey: "five",
        ratingValue: 5,
        goMappings: [GO_1],
        evaluationId: "eval-1",
      },
      {
        responseId: "r2",
        itemKey: "five",
        ratingValue: 1,
        goMappings: [GO_1],
        evaluationId: "eval-2",
      },
    ];

    // Unlike the Faculty CILO builders, the Outcomes view and the canonical
    // aggregator agree here: a GO pools across the course-bound evaluations in
    // scope, and the DTO lists them.
    expect(legacyDto(specs)[0]).toMatchObject({ ratingCount: 2, meanRating: 3 });
    expect(canonicalMetric(specs)[0]).toMatchObject({ ratingCount: 2, mean: 3 });
  });

  it("produces no rows for empty evidence in either path", () => {
    expect(legacyDto([])).toEqual([]);
    expect(canonicalMetric([])).toEqual([]);
  });

  it("produces no row when a bound CILO has no current mapping, in either path", () => {
    // The Program's current mappings are the caller's input to both paths, so a
    // deleted or unmapped GO simply contributes nothing to either surface.
    const specs: Spec[] = [{ responseId: "r1", itemKey: "five", ratingValue: 5, goMappings: [] }];

    expect(legacyDto(specs)).toEqual([]);
    expect(canonicalMetric(specs)).toEqual([]);
  });

  it("produces no row from an unbound GENERAL rating in either path", () => {
    const specs: Spec[] = [{ responseId: "r1", itemKey: "five", ratingValue: 5, withCilo: false }];

    expect(legacyDto(specs)).toEqual([]);
    expect(canonicalMetric(specs)).toEqual([]);
  });

  it("keeps every frozen distribution category labelled in both paths", () => {
    const specs: Spec[] = [
      { responseId: "r1", itemKey: "five", ratingValue: 4, goMappings: [GO_1] },
    ];

    const [legacy] = legacyDto(specs);
    // Every frozen descriptor is present, including zero-count ones, because
    // the Likert distribution renders the full scale.
    expect(legacy!.distributions[0]!.categories.map((category) => category.value)).toEqual([
      1, 2, 3, 4, 5,
    ]);
    expect(legacy!.distributions[0]!.categories.find((c) => c.value === 4)?.count).toBe(1);

    // The canonical metric carries the same categories and labels, so the
    // distribution shape is not a reason to keep the two paths apart. The
    // differences that matter are the pooled mean and the provenance fields,
    // pinned in the cases above.
    const [canonical] = canonicalMetric(specs);
    expect(canonical!.scaleGroups[0]!.distribution).toEqual(legacy!.distributions[0]!.categories);
  });
});
