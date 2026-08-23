import { describe, expect, it } from "vitest";
import {
  buildScaleIdentities,
  resolveItemScaleIdentity,
  toScaleIdentity,
  type ScaleDescriptor,
} from "@/features/analytics/aggregators/scale-identity";
import { buildQuantitativeMetric } from "@/features/analytics/aggregators/quantitative";
import { buildCiloMetrics, buildQuestionMetrics } from "@/features/analytics/aggregators/cilo";
import {
  buildCourseDerivedPloMetrics,
  buildProgramWidePloMetrics,
  type CentralPloRatingRow,
} from "@/features/analytics/aggregators/plo";
import { buildParticipationSummary } from "@/features/analytics/aggregators/participation";
import {
  AGREEMENT5,
  CENTRAL_EVALUATIONS,
  EVALUATIONS,
  SCALE4,
  SCALE5,
  SNAPSHOTS,
  centralPloRows,
  ciloRows,
  participationRows,
} from "./ph-evidence-fixture";

const TOLERANCE = 1e-9;

function weightedMean(metric: { distribution: Array<{ value: number; count: number }>; ratingCount: number }) {
  return metric.distribution.reduce((sum, entry) => sum + entry.value * entry.count, 0) / metric.ratingCount;
}

// ---------------------------------------------------------------------------
// Scale parser (§9)
// ---------------------------------------------------------------------------

describe("scale identity parser", () => {
  it("derives min, max, and per-value labels from the structure snapshot", () => {
    const identity = resolveItemScaleIdentity(SNAPSHOTS.cbV1, "cilo-items", "q-cilo-a");
    expect(identity).not.toBeNull();
    expect(identity!.min).toBe(1);
    expect(identity!.max).toBe(5);
    expect(identity!.descriptors.map((descriptor: ScaleDescriptor) => descriptor.label)).toEqual([
      "Not Achieved",
      "Slightly Achieved",
      "Moderately Achieved",
      "Mostly Achieved",
      "Fully Achieved",
    ]);
  });

  it("never treats equal numeric ranges as compatible when labels differ", () => {
    // Same 1–5 range, different labels: incompatible under §9.
    const identities = buildScaleIdentities([SCALE4, [...SCALE5]]);
    const agreement = toScaleIdentity([...AGREEMENT5]);
    const attainment = toScaleIdentity([...SCALE5]);
    expect(buildScaleIdentities([[...AGREEMENT5], [...SCALE5]])).toHaveLength(2);
    expect(identities).toHaveLength(2);
    expect(agreement!.key).not.toBe(attainment!.key);
  });

  it("resolves the item scale per instrument version, so one item key yields incompatible scales across versions", () => {
    const v1 = resolveItemScaleIdentity(SNAPSHOTS.cbV1, "cilo-items", "q-cilo-a");
    const v2 = resolveItemScaleIdentity(SNAPSHOTS.cbV2, "cilo-items", "q-cilo-a");
    expect(v1!.max).toBe(5);
    expect(v2!.max).toBe(4);
    expect(v1!.key).not.toBe(v2!.key);
  });

  it("returns null for unknown sections, items, or malformed snapshots", () => {
    expect(resolveItemScaleIdentity(SNAPSHOTS.cbV1, "missing", "q-cilo-a")).toBeNull();
    expect(resolveItemScaleIdentity(SNAPSHOTS.cbV1, "cilo-items", "missing")).toBeNull();
    expect(resolveItemScaleIdentity("nope", "cilo-items", "q-cilo-a")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Participation (§35, §5.12, §13.2–§13.3)
// ---------------------------------------------------------------------------

describe("participation summary", () => {
  it("keeps submitted + inProgress + notStarted = assigned on raw assignment rows", () => {
    const summary = buildParticipationSummary(participationRows(EVALUATIONS.e1));
    expect(summary.assigned).toBe(4);
    expect(summary.submitted).toBe(2);
    expect(summary.inProgress).toBe(1);
    expect(summary.notStarted).toBe(1);
    expect(summary.submitted + summary.inProgress + summary.notStarted).toBe(summary.assigned);
    expect(summary.completionRate).toBeCloseTo(0.5, 12);
  });

  it("reports person-level respondent status across all of a person's assignments", () => {
    // Whole BEED period-1 scope: e1 plus the central student deployment.
    const rows = [
      ...participationRows(EVALUATIONS.e1),
      ...participationRows(CENTRAL_EVALUATIONS.centralStudent),
    ];
    const summary = buildParticipationSummary(rows);
    expect(summary.assigned).toBe(6);
    expect(summary.respondents).toEqual({ total: 4, complete: 2, partial: 1, notStarted: 1 });
    expect(summary.submitted + summary.inProgress + summary.notStarted).toBe(summary.assigned);
  });

  it("splits participation per stakeholder and the split sums back to the totals", () => {
    const rows = [
      ...participationRows(EVALUATIONS.e1),
      ...participationRows(CENTRAL_EVALUATIONS.alumni),
    ];
    const summary = buildParticipationSummary(rows);
    expect(summary.stakeholders.map((entry) => entry.stakeholder)).toEqual(["STUDENT", "ALUMNI"]);
    const student = summary.stakeholders[0];
    const alumni = summary.stakeholders[1];
    expect(student.assigned).toBe(4);
    expect(alumni.assigned).toBe(2);
    expect(summary.stakeholders.reduce((sum, entry) => sum + entry.assigned, 0)).toBe(summary.assigned);
    expect(summary.stakeholders.reduce((sum, entry) => sum + entry.submitted, 0)).toBe(summary.submitted);
  });

  it("has no response rate when nothing is assigned, and a real zero when opportunities exist", () => {
    expect(buildParticipationSummary([]).completionRate).toBeNull();
    const zeroResponse = buildParticipationSummary(participationRows(EVALUATIONS.e3));
    expect(zeroResponse.assigned).toBe(2);
    expect(zeroResponse.submitted).toBe(0);
    expect(zeroResponse.completionRate).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Question and CILO metrics (§38–§39, §6)
// ---------------------------------------------------------------------------

describe("question metrics", () => {
  it("computes per-question distributions with snapshot labels and full precision", () => {
    const questions = buildQuestionMetrics(ciloRows("e1"));
    const qA = questions.find((question) => question.itemKey === "q-cilo-a")!;
    expect(qA.binding).toEqual({ type: "CILO", ciloId: "cilo-a", ciloLabel: "CILO 1" });
    expect(qA.quantitative.mean).toBeCloseTo(4.5, 12);
    expect(qA.quantitative.ratingCount).toBe(2);
    expect(qA.quantitative.responseCount).toBe(2);
    expect(qA.quantitative.distribution).toEqual([
      { value: 1, label: "Not Achieved", count: 0, percentage: 0 },
      { value: 2, label: "Slightly Achieved", count: 0, percentage: 0 },
      { value: 3, label: "Moderately Achieved", count: 0, percentage: 0 },
      { value: 4, label: "Mostly Achieved", count: 1, percentage: 0.5 },
      { value: 5, label: "Fully Achieved", count: 1, percentage: 0.5 },
    ]);
  });

  it("marks unbound questions explicitly GENERAL", () => {
    const questions = buildQuestionMetrics(ciloRows("e1"));
    const general = questions.find((question) => question.itemKey === "q-general")!;
    expect(general.binding).toEqual({ type: "GENERAL" });
  });

  it("includes unbound ratings in the evaluation mean while excluding them from CILO metrics", () => {
    const rows = ciloRows("e1");
    const allRatings = rows.map((row) => ({ value: row.ratingValue, responseId: row.responseId }));
    const evaluationMean = buildQuantitativeMetric(allRatings, null).mean;
    // 24/7 includes the unbound q-general ratings 4 and 1.
    expect(evaluationMean).toBeCloseTo(24 / 7, 12);
    expect(evaluationMean).not.toBeCloseTo(20 / 6, 12);

    const ciloItems = buildCiloMetrics(rows);
    const pooledCiloRatingCount = ciloItems.reduce(
      (sum, metric) => sum + metric.scaleGroups.reduce((inner, group) => inner + group.ratingCount, 0),
      0
    );
    // Only bound items contribute to CILO metrics: 24 - 5 unbound ratings = 19? No:
    // q-general contributes 2 ratings, so bound ratings are 24 - ... see fixture.
    expect(pooledCiloRatingCount).toBe(rows.filter((row) => row.cilo !== null).length);
  });
});

describe("CILO metrics", () => {
  it("pools raw ratings across questions and periods instead of averaging means", () => {
    const metrics = buildCiloMetrics(ciloRows("e1"));
    const ciloA = metrics.find((metric) => metric.ciloId === "cilo-a")!;
    // Raw pooling: (5+4+3)/3 = 4. Mean of question means would be (4.5+3)/2 = 3.75.
    const scale5 = ciloA.scaleGroups.find((group) => group.scale?.max === 5)!;
    expect(scale5.mean).toBeCloseTo(4, 12);
    expect(scale5.mean).not.toBeCloseTo(3.75, 12);
  });

  it("never merges ratings from incompatible scales into one mean", () => {
    const ciloA = buildCiloMetrics(ciloRows("e1", "e2")).find(
      (metric) => metric.ciloId === "cilo-a"
    )!;
    expect(ciloA.scaleGroups).toHaveLength(2);
    expect(ciloA.quantitative).toBeNull();
    const scale5 = ciloA.scaleGroups.find((group) => group.scale?.max === 5)!;
    const scale4 = ciloA.scaleGroups.find((group) => group.scale?.max === 4)!;
    expect(scale5.ratingCount).toBe(3);
    expect(scale5.mean).toBeCloseTo(4, 12);
    expect(scale4.ratingCount).toBe(1);
    expect(scale4.mean).toBeCloseTo(2, 12);
  });

  it("excludes in-progress ratings and out-of-scale values from CILO evidence", () => {
    // e1 contains S3's IN_PROGRESS ratings (3 and 2); they must not appear.
    const ciloB = buildCiloMetrics(ciloRows("e1")).find((metric) => metric.ciloId === "cilo-b")!;
    const scale5 = ciloB.scaleGroups.find((group) => group.scale?.max === 5)!;
    expect(scale5.distribution.find((entry) => entry.value === 2)?.count).toBe(0);
    expect(scale5.ratingCount).toBe(2);
  });

  it("carries current mappings with manifestation labels and contributing questions", () => {
    const ciloA = buildCiloMetrics(ciloRows("e1", "e2")).find(
      (metric) => metric.ciloId === "cilo-a"
    )!;
    expect(ciloA.mappings).toEqual([
      { ploId: "plo-1", ploCode: "PLO1", ploDescription: "Communicate effectively.", manifestation: "LEARNING" },
      { ploId: "plo-2", ploCode: "PLO2", ploDescription: "Solve problems creatively.", manifestation: "OPPORTUNITY" },
    ]);
    expect(ciloA.contributingQuestions.map((question) => question.itemKey)).toEqual([
      "q-cilo-a",
      "q-cilo-a2",
    ]);
  });
});

// ---------------------------------------------------------------------------
// PLO metrics (§5.8, §5.9, §7)
// ---------------------------------------------------------------------------

describe("course-derived PLO metrics", () => {
  it("contributes each mapped rating once to every mapped PLO regardless of manifestation", () => {
    const metrics = buildCourseDerivedPloMetrics(ciloRows("e1", "e2"));
    const plo1 = metrics.find((metric) => metric.ploId === "plo-1")!;
    const plo2 = metrics.find((metric) => metric.ploId === "plo-2")!;

    // Many-to-many: PLO1 receives CILO-a (qA 5,4 + qA2 3 + e2's 2) and
    // CILO-b (qB 3,4 + e2's 4); PLO2 receives CILO-a's ratings only.
    // The OPPORTUNITY mapping filters nothing (§7).
    expect(plo1.ratingCount).toBe(7);
    expect(plo2.ratingCount).toBe(4);
    expect(plo1.contributingCilos.map((cilo) => cilo.id).sort()).toEqual(["cilo-a", "cilo-b"]);
    expect(plo2.contributingCilos.map((cilo) => cilo.id)).toEqual(["cilo-a"]);
  });

  it("keeps cross-period incompatible scales as separate groups with no combined mean", () => {
    const plo1 = buildCourseDerivedPloMetrics(ciloRows("e1", "e2")).find(
      (metric) => metric.ploId === "plo-1"
    )!;
    expect(plo1.spansMultipleScales).toBe(true);
    expect(plo1.mean).toBeNull();

    const scale5 = plo1.scaleGroups.find((group) => group.scale?.max === 5)!;
    const scale4 = plo1.scaleGroups.find((group) => group.scale?.max === 4)!;
    // Raw pooled SCALE5: (5+4+3+3+4)/5 = 3.8; mean-of-means (4 + 3.5)/2 differs.
    expect(scale5.mean).toBeCloseTo(3.8, 12);
    expect(scale5.ratingCount).toBe(5);
    // SCALE4 group spans both periods' mapped ratings: e2's 2 (CILO-a) and 4 (CILO-b).
    expect(scale4.mean).toBeCloseTo(3, 12);
    expect(scale4.ratingCount).toBe(2);
  });


  it("counts out-of-scale ratings diagnostically instead of aggregating them", () => {
    const rows = [
      ...ciloRows("e1"),
      {
        sectionKey: "cilo-items",
        itemKey: "q-cilo-a",
        prompt: "corrupt",
        ratingValue: 9,
        responseId: "resp-corrupt",
        scale: resolveItemScaleIdentity(SNAPSHOTS.cbV1, "cilo-items", "q-cilo-a"),
        cilo: { id: "cilo-a", label: "CILO 1", description: "Apply computational thinking." },
        ploMappings: [
          { ploId: "plo-1", ploCode: "PLO1", ploDescription: "Communicate effectively.", manifestation: "LEARNING" as const },
        ],
      },
    ];
    const plo1 = buildCourseDerivedPloMetrics(rows).find((metric) => metric.ploId === "plo-1")!;
    expect(plo1.excludedRatingCount).toBe(1);
    expect(plo1.scaleGroups.every((group) => group.ratingCount < 6)).toBe(true);
  });
});

describe("program-wide PLO metrics", () => {
  it("aggregates through direct deployment PLO snapshots, including multi-PLO questions", () => {
    const metrics = buildProgramWidePloMetrics(centralPloRows());
    const plo1 = metrics.find((metric) => metric.ploId === "plo-1")!;
    const plo2 = metrics.find((metric) => metric.ploId === "plo-2")!;

    // One response rated q-plo-single=4 and q-plo-multi=2; both reach PLO1,
    // only the multi item reaches PLO2.
    expect(plo1.mean).toBeCloseTo(3, 12);
    expect(plo1.ratingCount).toBe(2);
    expect(plo1.responseCount).toBe(1);
    expect(plo2.ratingCount).toBe(1);
    expect(plo2.mean).toBeCloseTo(2, 12);
  });

  it("keeps central evidence separate from course-derived evidence and scales labeled", () => {
    const central = buildProgramWidePloMetrics(centralPloRows());
    const courseDerived = buildCourseDerivedPloMetrics(ciloRows("e1", "e2"));
    // Agreement scale identity differs from the course instruments' scales.
    const centralScaleKeys = new Set(
      central.flatMap((metric) => metric.scaleGroups.map((group) => group.scale?.key))
    );
    const courseScaleKeys = new Set(
      courseDerived.flatMap((metric) => metric.scaleGroups.map((group) => group.scale?.key))
    );
    for (const key of centralScaleKeys) {
      expect(courseScaleKeys.has(key)).toBe(false);
    }
  });

  it("counts unresolvable-scale ratings diagnostically", () => {
    const rows: CentralPloRatingRow[] = [
      ...centralPloRows(),
      {
        sectionKey: "plo-items",
        itemKey: "q-plo-single",
        ratingValue: 3,
        responseId: "resp-unresolved",
        scale: null,
        ploBindings: [{ ploId: "plo-1", ploCode: "PLO1", ploDescription: "Communicate effectively." }],
      },
    ];
    const plo1 = buildProgramWidePloMetrics(rows).find((metric) => metric.ploId === "plo-1")!;
    expect(plo1.excludedRatingCount).toBe(1);
    expect(plo1.ratingCount).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Mathematical reconciliation (§55)
// ---------------------------------------------------------------------------

describe("reconciliation invariants", () => {
  const allQuestionMetrics = buildQuestionMetrics(ciloRows("e1", "e2", "e3"));
  const allCiloGroups = buildCiloMetrics(ciloRows("e1", "e2")).flatMap(
    (metric) => metric.scaleGroups
  );
  const allPloGroups = [
    ...buildCourseDerivedPloMetrics(ciloRows("e1", "e2")),
    ...buildProgramWidePloMetrics(centralPloRows()),
  ].flatMap((metric) => metric.scaleGroups);

  it("every distribution sums to its ratingCount", () => {
    for (const metric of [...allQuestionMetrics.map((question) => question.quantitative), ...allCiloGroups, ...allPloGroups]) {
      const sum = metric.distribution.reduce((total, entry) => total + entry.count, 0);
      expect(sum).toBe(metric.ratingCount);
    }
  });

  it("every weighted distribution mean equals the displayed mean within tolerance", () => {
    for (const metric of [...allQuestionMetrics.map((question) => question.quantitative), ...allCiloGroups, ...allPloGroups]) {
      if (metric.ratingCount === 0) {
        expect(metric.mean).toBeNull();
        continue;
      }
      expect(Math.abs(weightedMean(metric) - metric.mean!)).toBeLessThan(TOLERANCE);
    }
  });

  it("distribution percentages sum to 1 whenever ratings exist", () => {
    for (const metric of [...allQuestionMetrics.map((question) => question.quantitative), ...allCiloGroups, ...allPloGroups]) {
      if (metric.ratingCount === 0) continue;
      const percentageSum = metric.distribution.reduce((total, entry) => total + entry.percentage, 0);
      expect(percentageSum).toBeCloseTo(1, 12);
    }
  });

  it("participation reconciles on every evaluation scope and the combined scope", () => {
    const scopes = [
      participationRows(EVALUATIONS.e1),
      participationRows(EVALUATIONS.e2),
      participationRows(EVALUATIONS.e3),
      participationRows(CENTRAL_EVALUATIONS.centralStudent),
      participationRows(CENTRAL_EVALUATIONS.alumni),
      [
        ...participationRows(EVALUATIONS.e1),
        ...participationRows(CENTRAL_EVALUATIONS.centralStudent),
      ],
    ];
    for (const scope of scopes) {
      const summary = buildParticipationSummary(scope);
      expect(summary.submitted + summary.inProgress + summary.notStarted).toBe(summary.assigned);
      for (const stakeholder of summary.stakeholders) {
        expect(stakeholder.submitted + stakeholder.inProgress + stakeholder.notStarted).toBe(
          stakeholder.assigned
        );
      }
    }
  });

  it("respondent statuses partition the respondent total", () => {
    const summary = buildParticipationSummary([
      ...participationRows(EVALUATIONS.e1),
      ...participationRows(EVALUATIONS.e2),
      ...participationRows(CENTRAL_EVALUATIONS.centralStudent),
      ...participationRows(CENTRAL_EVALUATIONS.alumni),
    ]);
    expect(summary.respondents.complete + summary.respondents.partial + summary.respondents.notStarted).toBe(
      summary.respondents.total
    );
  });
});
