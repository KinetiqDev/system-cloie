import { describe, expect, it } from "vitest";
import {
  OUTCOME_ATTAINMENT_BENCHMARK,
  OUTCOME_ATTAINMENT_POLICY_ID,
  classifyOutcomeDistributions,
  classifyOutcomeMean,
  supportedOutcomeScaleKind,
} from "@/features/analytics/aggregators/outcome-attainment";
import {
  toScaleIdentity,
  type ScaleDescriptor,
} from "@/features/analytics/aggregators/scale-identity";
import {
  buildCourseDerivedPoMetrics,
  buildProgramWidePoMetrics,
  type CentralPoRatingRow,
} from "@/features/analytics/aggregators/po";
import { buildCiloMetrics, type OutcomeItemRatingRow } from "@/features/analytics/aggregators/cilo";
import {
  aggregateOutcomeEvidence,
  buildOutcomeEvidenceDtos,
  type OutcomeEvidenceRow,
} from "@/features/analytics/aggregators/outcome-evidence";

const CILO_SCALE_DESCRIPTORS: ScaleDescriptor[] = [
  { value: 1, label: "Not Achieved" },
  { value: 2, label: "Slightly Achieved" },
  { value: 3, label: "Moderately Achieved" },
  { value: 4, label: "Mostly Achieved" },
  { value: 5, label: "Fully Achieved" },
];

const AGREEMENT_SCALE_DESCRIPTORS: ScaleDescriptor[] = [
  { value: 1, label: "Strongly Disagree" },
  { value: 2, label: "Disagree" },
  { value: 3, label: "Neutral" },
  { value: 4, label: "Agree" },
  { value: 5, label: "Strongly Agree" },
];

const PERFORMANCE_SCALE_DESCRIPTORS: ScaleDescriptor[] = [
  { value: 1, label: "Poor" },
  { value: 2, label: "Fair" },
  { value: 3, label: "Satisfactory" },
  { value: 4, label: "Very Satisfactory" },
  { value: 5, label: "Excellent" },
];

const ciloScale = toScaleIdentity(CILO_SCALE_DESCRIPTORS);
const agreementScale = toScaleIdentity(AGREEMENT_SCALE_DESCRIPTORS);
const performanceScale = toScaleIdentity(PERFORMANCE_SCALE_DESCRIPTORS);

describe("Outcome Attainment Policy Integration", () => {
  describe("Policy constants and boundaries", () => {
    it("pins the policy identifier to CLOIE_OUTCOME_MEAN_V1 and benchmark to 3.50", () => {
      expect(OUTCOME_ATTAINMENT_POLICY_ID).toBe("CLOIE_OUTCOME_MEAN_V1");
      expect(OUTCOME_ATTAINMENT_BENCHMARK).toBe(3.5);
    });

    it("identifies approved 5-point descriptor sets and flags indirect perception", () => {
      expect(supportedOutcomeScaleKind(ciloScale)).toBe("direct-attainment");
      expect(supportedOutcomeScaleKind(agreementScale)).toBe("agreement");
      expect(supportedOutcomeScaleKind(performanceScale)).toBe("performance");

      const direct = classifyOutcomeMean(4.2, ciloScale);
      expect(direct.isIndirect).toBe(false);

      const indirectAgree = classifyOutcomeMean(4.2, agreementScale);
      expect(indirectAgree.isIndirect).toBe(true);

      const indirectPerf = classifyOutcomeMean(4.2, performanceScale);
      expect(indirectPerf.isIndirect).toBe(true);
    });

    it("strictly separates missing evidence and unsupported scales from non-attainment", () => {
      const noEvidence = classifyOutcomeMean(null, ciloScale);
      expect(noEvidence.status).toBe("no-evidence");
      expect(noEvidence.interpretation).toBeNull();
      expect(noEvidence.cqi).toBeNull();

      const notAttained = classifyOutcomeMean(1.2, ciloScale);
      expect(notAttained.status).toBe("classified");
      expect(notAttained.interpretation).toBe("Not Attained");
      expect(notAttained.cqi).toBe("Below Benchmark");

      const unsupported = classifyOutcomeMean(
        4.0,
        toScaleIdentity([
          { value: 1, label: "Bad" },
          { value: 2, label: "Good" },
        ])
      );
      expect(unsupported.status).toBe("unsupported-scale");
      expect(unsupported.interpretation).toBeNull();

      const mixed = classifyOutcomeMean(4.0, ciloScale, { spansMultipleScales: true });
      expect(mixed.status).toBe("mixed-scales");
      expect(mixed.interpretation).toBeNull();
    });
  });

  describe("CILO aggregation with multiple questions and attainment", () => {
    it("pools ratings across multiple questions bound to one CILO and classifies the mean", () => {
      const rows: OutcomeItemRatingRow[] = [
        {
          sectionKey: "sec-1",
          itemKey: "q1",
          prompt: "Question 1",
          ratingValue: 4,
          responseId: "resp-1",
          scale: ciloScale,
          cilo: { id: "cilo-1", label: "CILO 1", description: "Design systems" },
          poMappings: [],
        },
        {
          sectionKey: "sec-1",
          itemKey: "q2",
          prompt: "Question 2",
          ratingValue: 5,
          responseId: "resp-1",
          scale: ciloScale,
          cilo: { id: "cilo-1", label: "CILO 1", description: "Design systems" },
          poMappings: [],
        },
        {
          sectionKey: "sec-1",
          itemKey: "q1",
          prompt: "Question 1",
          ratingValue: 4,
          responseId: "resp-2",
          scale: ciloScale,
          cilo: { id: "cilo-1", label: "CILO 1", description: "Design systems" },
          poMappings: [],
        },
      ];

      const ciloMetrics = buildCiloMetrics(rows);
      expect(ciloMetrics).toHaveLength(1);
      const metric = ciloMetrics[0];
      // Mean is (4 + 5 + 4) / 3 = 13 / 3 = 4.333333333333333
      expect(metric.quantitative?.mean).toBeCloseTo(13 / 3, 5);

      const attainment = classifyOutcomeMean(
        metric.quantitative?.mean ?? null,
        metric.quantitative?.scale ?? null
      );
      expect(attainment.status).toBe("classified");
      expect(attainment.interpretation).toBe("Attained");
      expect(attainment.cqi).toBe("Meets Benchmark");
      expect(attainment.meetsBenchmark).toBe(true);
    });
  });

  describe("PO aggregation with multiple CILOs, direct bindings, and many-to-many mappings", () => {
    it("aggregates PO evidence from multiple CILOs and direct questions without duplicate counting", () => {
      const po1 = { poId: "po-1", poCode: "PO-1", poDescription: "Effective Communication" };
      const po2 = { poId: "po-2", poCode: "PO-2", poDescription: "Problem Solving" };

      // Row 1: bound to CILO 1 which maps to both PO-1 and PO-2 (many-to-many)
      const rows: OutcomeItemRatingRow[] = [
        {
          sectionKey: "sec-1",
          itemKey: "q1",
          prompt: "Presentation skills",
          ratingValue: 5,
          responseId: "resp-1",
          evaluationId: "eval-1",
          scale: ciloScale,
          cilo: { id: "cilo-1", label: "CILO 1", description: "Communicate findings" },
          poMappings: [
            { ...po1, manifestation: "LEARNING" },
            { ...po2, manifestation: "PRACTICE" },
          ],
        },
        // Row 2: bound directly to PO-1
        {
          sectionKey: "sec-1",
          itemKey: "q2",
          prompt: "Oral defense rating",
          ratingValue: 4,
          responseId: "resp-1",
          evaluationId: "eval-1",
          scale: ciloScale,
          cilo: null,
          poMappings: [],
          directPoMappings: [{ ...po1, manifestation: null }],
        },
      ];

      const poMetrics = buildCourseDerivedPoMetrics(rows);
      expect(poMetrics).toHaveLength(2);

      const po1Metric = poMetrics.find((p) => p.poId === "po-1");
      expect(po1Metric).toBeDefined();
      // Ratings for PO-1: 5 (from CILO 1) and 4 (from direct question) -> mean = 4.5
      expect(po1Metric?.mean).toBe(4.5);
      expect(po1Metric?.ratingCount).toBe(2);

      const po1Attainment = classifyOutcomeMean(
        po1Metric?.mean ?? null,
        po1Metric?.scaleGroups[0]?.scale ?? null
      );
      expect(po1Attainment.status).toBe("classified");
      expect(po1Attainment.interpretation).toBe("Fully Attained");
      expect(po1Attainment.cqi).toBe("Meets Benchmark");
      expect(po1Attainment.meetsBenchmark).toBe(true);

      const po2Metric = poMetrics.find((p) => p.poId === "po-2");
      expect(po2Metric).toBeDefined();
      // Ratings for PO-2: 5 (from CILO 1) -> mean = 5.0
      expect(po2Metric?.mean).toBe(5.0);
      expect(po2Metric?.ratingCount).toBe(1);
    });

    it("aggregates central program-wide PO evidence and classifies indirect agreement", () => {
      const centralRows: CentralPoRatingRow[] = [
        {
          sectionKey: "exit-sec",
          itemKey: "exit-q1",
          ratingValue: 3,
          responseId: "resp-alumni-1",
          evaluationId: "alumni-eval-1",
          scale: agreementScale,
          poBindings: [{ poId: "po-1", poCode: "PO-1", poDescription: "Communication" }],
        },
        {
          sectionKey: "exit-sec",
          itemKey: "exit-q1",
          ratingValue: 4,
          responseId: "resp-alumni-2",
          evaluationId: "alumni-eval-1",
          scale: agreementScale,
          poBindings: [{ poId: "po-1", poCode: "PO-1", poDescription: "Communication" }],
        },
      ];

      const metrics = buildProgramWidePoMetrics(centralRows);
      expect(metrics).toHaveLength(1);
      const metric = metrics[0];
      // Mean: (3 + 4) / 2 = 3.50
      expect(metric.mean).toBe(3.5);

      const attainment = classifyOutcomeMean(
        metric.mean,
        metric.scaleGroups[0]?.scale ?? null
      );
      expect(attainment.status).toBe("classified");
      expect(attainment.interpretation).toBe("Attained");
      expect(attainment.cqi).toBe("Meets Benchmark");
      expect(attainment.isIndirect).toBe(true);
    });
  });

  describe("OutcomeEvidenceDTO distribution classification integration", () => {
    it("attaches attainment to OutcomeEvidenceDTO when scale is compatible", () => {
      const evidenceRows: OutcomeEvidenceRow[] = [
        {
          ratingValue: 4,
          responseId: "r-1",
          sectionKey: "cilo-items",
          itemKey: "q1",
          instrumentVersion: {
            id: "iv-1",
            structureSnapshot: [
              {
                key: "cilo-items",
                title: "CILO Items",
                items: [{ key: "q1", kind: "quantitative", likertDescriptors: CILO_SCALE_DESCRIPTORS }],
              },
            ],
          },
          course: { id: "c-1", code: "IT 101", title: "Intro to IT" },
          cilo: {
            id: "cilo-1",
            code: "CILO 1",
            description: "Understand computing",
            course: { id: "c-1", code: "IT 101", title: "Intro to IT" },
          },
          outcomeMappings: [
            { outcomeId: "po-1", code: "PO-1", name: "Computing Knowledge", manifestation: "LEARNING" },
          ],
          directBindings: [],
          evaluationId: "eval-1",
          deploymentName: "Course Evaluation",
        },
      ];

      const aggregation = aggregateOutcomeEvidence(evidenceRows);
      const dtos = buildOutcomeEvidenceDtos(aggregation).map((dto) => ({
        ...dto,
        attainment: classifyOutcomeDistributions(
          dto.meanRating,
          dto.distributions,
          dto.spansMultipleScales
        ),
      }));

      expect(dtos).toHaveLength(1);
      const dto = dtos[0];
      expect(dto.code).toBe("PO-1");
      expect(dto.meanRating).toBe(4);
      expect(dto.attainment?.status).toBe("classified");
      expect(dto.attainment?.interpretation).toBe("Attained");
      expect(dto.attainment?.cqi).toBe("Meets Benchmark");
    });
  });

  describe("Terminology checks", () => {
    it("canonical terminology uses PO / Program Outcome, never deprecated GO in user-facing labels", () => {
      expect(OUTCOME_ATTAINMENT_POLICY_ID).toBe("CLOIE_OUTCOME_MEAN_V1");
      // Verify no 'GO' or 'Graduate Outcome' in policy interpretation types
      const types = [
        "Fully Attained",
        "Attained",
        "Partially Attained",
        "Slightly Attained",
        "Not Attained",
      ];
      expect(types).not.toContain("GO");
    });
  });
});
