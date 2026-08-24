import { describe, expect, it } from "vitest";
import { DeploymentStatus } from "@prisma/client";
import {
  buildCentralPloRatingRows,
  type AttentionDeployment,
  type CentralBindingsByDeployment,
  type CourseBindingRow,
  type DashboardRatingRow,
  buildCoursePloRatingRows,
  buildDashboardSourceMeans,
  buildNeedsAttentionItems,
  isClosingWithinSevenDays,
  QUALITATIVE_TOKEN_CAP,
  summarizeQualitativePulse,
  toCentralDashboardPloRows,
  toDashboardPloRows,
} from "@/features/analytics/services/get-program-head-dashboard";
import {
  buildCourseDerivedPloMetrics,
  buildProgramWidePloMetrics,
} from "@/features/analytics/aggregators/plo";

// ---------------------------------------------------------------------------
// Fixtures mirroring the service's Prisma projections
// ---------------------------------------------------------------------------

/** Two instrument versions; scale identity differs per version so §9 separation shows. */
const SNAPSHOTS: Record<string, unknown> = {
  "iv-scale2": [
    {
      key: "cilo-items",
      title: "S",
      items: [
        {
          key: "q-cilo-a",
          prompt: "Q",
          likertDescriptors: [
            { value: 1, label: "No" },
            { value: 2, label: "Yes" },
          ],
        },
      ],
    },
    {
      key: "plo-items",
      title: "S",
      items: [
        {
          key: "q-plo",
          prompt: "Q",
          likertDescriptors: [
            { value: 1, label: "No" },
            { value: 2, label: "Yes" },
          ],
        },
      ],
    },
  ],
  "iv-scale3": [
    {
      key: "cilo-items",
      title: "S",
      items: [
        {
          key: "q-cilo-a",
          prompt: "Q",
          likertDescriptors: [
            { value: 1, label: "No" },
            { value: 2, label: "Maybe" },
            { value: 3, label: "Yes" },
          ],
        },
      ],
    },
    {
      key: "plo-items",
      title: "S",
      items: [
        {
          key: "q-plo",
          prompt: "Q",
          likertDescriptors: [
            { value: 1, label: "No" },
            { value: 2, label: "Maybe" },
            { value: 3, label: "Yes" },
          ],
        },
      ],
    },
  ],
};

const SNAPSHOT_MAP = new Map<string, unknown>(Object.entries(SNAPSHOTS));

function courseRow(overrides: Partial<DashboardRatingRow> = {}): DashboardRatingRow {
  return {
    rating_value: 2,
    response_id: "resp-course",
    section_key: "cilo-items",
    item_key: "q-cilo-a",
    response: {
      assignment: {
        course_bound_id: "cb-1",
        course_bound: { id: "cb-1", instrument_version_id: "iv-scale2" },
        central_deployment: null,
      },
    },
    ...overrides,
  };
}

function centralRow(
  stakeholder: "STUDENT" | "ALUMNI" | "INDUSTRY_PARTNER"
): DashboardRatingRow {
  return {
    rating_value: 1,
    response_id: `resp-${stakeholder}`,
    section_key: "plo-items",
    item_key: "q-plo",
    response: {
      assignment: {
        course_bound_id: null,
        course_bound: null,
        central_deployment: {
          id: `cd-${stakeholder}`,
          target_stakeholder: stakeholder,
          instrument_version_id: "iv-scale2",
        },
      },
    },
  };
}

// ---------------------------------------------------------------------------
// Source-separated quantitative means (§13.5, §8, §9)
// ---------------------------------------------------------------------------

describe("buildDashboardSourceMeans", () => {
  it("keeps the four evidence sources separate with their own ratings", () => {
    const rows = [
      courseRow({ rating_value: 2 }),
      courseRow({ rating_value: 1, response_id: "resp-course-2" }),
      centralRow("STUDENT"),
      centralRow("ALUMNI"),
      centralRow("INDUSTRY_PARTNER"),
    ];
    const means = buildDashboardSourceMeans(rows, SNAPSHOT_MAP, "program-1");
    expect(means.map((mean) => mean.sourceKey)).toEqual([
      "COURSE_STUDENT",
      "CENTRAL_STUDENT",
      "ALUMNI",
      "INDUSTRY_PARTNER",
    ]);
    expect(means[0].ratingCount).toBe(2);
    expect(means[0].mean).toBe(1.5);
    expect(means[0].scaleMax).toBe(2);
    for (const mean of means.slice(1)) {
      expect(mean.ratingCount).toBe(1);
      expect(mean.mean).toBe(1);
    }
  });

  it("reports Multiple scales instead of pooling incompatible scales within a source", () => {
    const rows = [
      courseRow(),
      courseRow({
        response_id: "resp-other-version",
        response: {
          assignment: {
            course_bound_id: "cb-2",
            course_bound: { id: "cb-2", instrument_version_id: "iv-scale3" },
            central_deployment: null,
          },
        },
      }),
    ];
    const means = buildDashboardSourceMeans(rows, SNAPSHOT_MAP, "program-1");
    expect(means[0].spansMultipleScales).toBe(true);
    expect(means[0].mean).toBeNull();
    expect(means[0].ratingCount).toBe(2);
    expect(means[0].scaleMax).toBeNull();
    expect(means[1].ratingCount).toBe(0);
  });

  it("reports an unavailable mean for a source without evidence", () => {
    const means = buildDashboardSourceMeans([courseRow()], SNAPSHOT_MAP, "program-1");
    expect(means.map((mean) => mean.mean)).toEqual([2, null, null, null]);
    expect(means[1].spansMultipleScales).toBe(false);
    expect(means[1].ratingCount).toBe(0);
    expect(means[1].scaleMax).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// PLO row normalization into the shared aggregators (§13.8, §5.8, §5.9, §7)
// ---------------------------------------------------------------------------

describe("PLO row normalization", () => {
  const binding: CourseBindingRow = {
    course_bound_evaluation_id: "cb-1",
    section_key: "cilo-items",
    item_key: "q-cilo-a",
    cilo: {
      id: "cilo-1",
      description: "Apply concepts.",
      cilo_mappings: [
        {
          manifestation: "LEARNING",
          plo: { id: "plo-1", code: "PLO 1", description: "Communicate." },
        },
        {
          manifestation: "OPPORTUNITY",
          plo: { id: "plo-2", code: "PLO 2", description: "Collaborate." },
        },
      ],
    },
  };

  it("routes course ratings through publication-time bindings; manifestations stay descriptive", () => {
    const bindingByKey = new Map([["cb-1:cilo-items:q-cilo-a", binding]]);
    const normalized = buildCoursePloRatingRows(
      [courseRow({ rating_value: 1 })],
      bindingByKey,
      SNAPSHOT_MAP
    );
    expect(normalized).toHaveLength(1);
    expect(normalized[0].evaluationId).toBe("cb-1");
    expect(normalized[0].ploMappings.map((mapping) => mapping.ploId)).toEqual(["plo-1", "plo-2"]);
    expect(normalized[0].ploMappings.map((mapping) => mapping.manifestation)).toEqual([
      "LEARNING",
      "OPPORTUNITY",
    ]);

    const metrics = buildCourseDerivedPloMetrics(normalized);
    expect(metrics.find((metric) => metric.ploId === "plo-1")!.ratingCount).toBe(1);
    expect(metrics.find((metric) => metric.ploId === "plo-2")!.ratingCount).toBe(1);
  });

  it("skips items without a live binding or without selected-Program mappings", () => {
    const unbound: CourseBindingRow = { ...binding, cilo: null };
    const unmapped: CourseBindingRow = {
      ...binding,
      cilo: { ...binding.cilo!, cilo_mappings: [] },
    };
    const normalized = buildCoursePloRatingRows(
      [courseRow()],
      new Map([
        ["cb-1:cilo-items:q-cilo-a", unbound],
        ["cb-2:cilo-items:q-cilo-a", unmapped],
      ]),
      SNAPSHOT_MAP
    );
    expect(normalized).toHaveLength(0);
  });

  it("normalizes central ratings through deployment snapshots, separated per stakeholder source", () => {
    const bindings: CentralBindingsByDeployment = new Map([
      [
        "cd-STUDENT",
        new Map([
          ["plo-items:q-plo", [{ ploId: "plo-1", ploCode: "PLO 1", ploDescription: "Communicate." }]],
        ]),
      ],
    ]);
    const studentOnly = buildCentralPloRatingRows(
      [centralRow("STUDENT"), centralRow("ALUMNI")],
      bindings,
      SNAPSHOT_MAP
    );
    expect(studentOnly).toHaveLength(1);
    expect(studentOnly[0].evaluationId).toBe("cd-STUDENT");

    const metrics = buildProgramWidePloMetrics(studentOnly);
    expect(metrics.find((metric) => metric.ploId === "plo-1")!.questionCount).toBe(1);
    expect(metrics.find((metric) => metric.ploId === "plo-1")!.evaluationCount).toBe(1);
  });
});

describe("PLO summary projections", () => {
  const metrics = [
    {
      ploId: "plo-1",
      ploCode: "PLO 1",
      ploDescription: "",
      mean: 4,
      ratingCount: 6,
      responseCount: 3,
      evaluationCount: 2,
      questionCount: 3,
      scaleGroups: [],
      spansMultipleScales: false,
      excludedRatingCount: 0,
      contributingCilos: [
        { id: "cilo-1", label: "CILO 1" },
        { id: "cilo-2", label: "CILO 2" },
      ],
    },
  ];

  it("exposes CILO contributors for course evidence", () => {
    const row = toDashboardPloRows(metrics, () => "/program-head/programs/p1/analytics?tab=outcomes")[0];
    expect(row.contributorKind).toBe("cilos");
    expect(row.contributorCount).toBe(2);
    expect(row.hasEvidence).toBe(true);
    expect(row.scaleMax).toBeNull();
    expect(row.evidenceSummary.evidenceHref).toContain("tab=outcomes");
  });

  it("exposes bound-question counts for program-wide evidence", () => {
    const row = toCentralDashboardPloRows(metrics, () => "/program-head/programs/p1/analytics?tab=outcomes")[0];
    expect(row.contributorKind).toBe("questions");
    expect(row.contributorCount).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// Needs attention (§13.9 — exactly three rules)
// ---------------------------------------------------------------------------

describe("buildNeedsAttentionItems", () => {
  const now = new Date("2026-08-24T00:00:00Z");
  const deployments: AttentionDeployment[] = [
    {
      id: "d-closing",
      kind: "course",
      name: "EDUC 7 Evaluation",
      status: DeploymentStatus.ACTIVE,
      deadlineAt: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
    },
    {
      id: "d-far",
      kind: "central",
      name: "Alumni Survey",
      status: DeploymentStatus.ACTIVE,
      deadlineAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
    },
    {
      id: "d-zero",
      kind: "central",
      name: "Industry Survey",
      status: DeploymentStatus.ACTIVE,
      deadlineAt: null,
    },
    {
      id: "d-scheduled",
      kind: "course",
      name: "Future Evaluation",
      status: DeploymentStatus.SCHEDULED,
      deadlineAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
    },
  ];
  const submittedCounts = new Map([
    ["d-closing", 5],
    ["d-far", 2],
    ["d-zero", 0],
  ]);

  it("flags ACTIVE deployments closing within seven days; never SCHEDULED or far deadlines", () => {
    const items = buildNeedsAttentionItems({
      programId: "program-1",
      now,
      deployments,
      submittedCountsByDeployment: submittedCounts,
      programPlos: [],
      ploRowsBySource: {},
      analyticsOutcomesHref: "/analytics?tab=outcomes",
    });
    expect(items.filter((item) => item.rule === "closing-soon").map((item) => item.id)).toEqual([
      "closing-soon:course:d-closing",
    ]);
  });

  it("flags ACTIVE deployments with zero submissions regardless of deadline", () => {
    const items = buildNeedsAttentionItems({
      programId: "program-1",
      now,
      deployments,
      submittedCountsByDeployment: submittedCounts,
      programPlos: [],
      ploRowsBySource: {},
      analyticsOutcomesHref: "/analytics?tab=outcomes",
    });
    expect(items.filter((item) => item.rule === "zero-submissions").map((item) => item.id)).toEqual([
      "zero-submissions:central:d-zero",
    ]);
  });

  it("reports every live PLO without ratings for each evidence source", () => {
    const items = buildNeedsAttentionItems({
      programId: "program-1",
      now,
      deployments: [],
      submittedCountsByDeployment: new Map(),
      programPlos: [
        { id: "plo-1", code: "PLO 1" },
        { id: "plo-2", code: "PLO 2" },
      ],
      ploRowsBySource: {
        COURSE_STUDENT: [
          {
            ploId: "plo-1",
            ploCode: "PLO 1",
            mean: 4,
            ratingCount: 8,
            responseCount: 2,
            evaluationCount: 1,
            contributorCount: 2,
            contributorKind: "cilos",
            spansMultipleScales: false,
            scaleMax: 5,
            hasEvidence: true,
            evidenceSummary: { ratingCount: 8, explanation: "Raw mean of 8 valid ratings." },
          },
        ],
      },
      analyticsOutcomesHref: "/analytics?tab=outcomes",
    });
    const zeroRatings = items.filter((item) => item.rule === "zero-plo-ratings");
    // Only COURSE_STUDENT:PLO 1 has evidence; every other source/PLO pair is flagged.
    expect(zeroRatings.map((item) => item.id)).toEqual([
      "zero-plo-ratings:COURSE_STUDENT:plo-2",
      "zero-plo-ratings:CENTRAL_STUDENT:plo-1",
      "zero-plo-ratings:CENTRAL_STUDENT:plo-2",
      "zero-plo-ratings:ALUMNI:plo-1",
      "zero-plo-ratings:ALUMNI:plo-2",
      "zero-plo-ratings:INDUSTRY_PARTNER:plo-1",
      "zero-plo-ratings:INDUSTRY_PARTNER:plo-2",
    ]);
    expect(zeroRatings[0].href).toBe("/analytics?tab=outcomes");
  });

  it("links deployment items to their canonical Responses routes", () => {
    const items = buildNeedsAttentionItems({
      programId: "program-9",
      now,
      deployments,
      submittedCountsByDeployment: submittedCounts,
      programPlos: [],
      ploRowsBySource: {},
      analyticsOutcomesHref: "/outcomes",
    });
    expect(items.find((item) => item.rule === "closing-soon")!.href).toContain(
      "/responses/course/d-closing"
    );
    expect(items.find((item) => item.rule === "zero-submissions")!.href).toContain(
      "/responses/program-wide/d-zero"
    );
  });

  it("treats an already-passed deadline as inside the seven-day window", () => {
    expect(
      isClosingWithinSevenDays(
        {
          id: "x",
          kind: "course",
          name: "Overdue",
          status: DeploymentStatus.ACTIVE,
          deadlineAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
        },
        now
      )
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Qualitative pulse (§13.10)
// ---------------------------------------------------------------------------

describe("summarizeQualitativePulse", () => {
  let sequence = 0;
  function qualRow(text: string, source: "course" | "alumni" | "industry" | "student") {
    sequence += 1;
    const id = `resp-${sequence}`;
    return {
      text_content: text,
      response: {
        id,
        respondent_id: `person-${id}`,
        assignment:
          source === "course"
            ? { course_bound: { id: "cb-1" }, central_deployment: null }
            : {
                course_bound: null,
                central_deployment: {
                  id: `cd-${source}`,
                  target_stakeholder:
                    source === "alumni"
                      ? ("ALUMNI" as const)
                      : source === "industry"
                        ? ("INDUSTRY_PARTNER" as const)
                        : ("STUDENT" as const),
                },
              },
      },
    };
  }

  it("counts respondents, answers, and contributing evaluations across sources", () => {
    const pulse = summarizeQualitativePulse([
      qualRow("Great laboratory activities", "course"),
      qualRow("Loved the internship support", "alumni"),
      qualRow("   ", "student"),
    ]);
    expect(pulse.answerCount).toBe(2);
    expect(pulse.respondentCount).toBe(2);
    expect(pulse.evaluationCount).toBe(2);
    expect(pulse.sourceCounts.map((source) => source.sourceKey)).toEqual([
      "COURSE_STUDENT",
      "ALUMNI",
    ]);
  });

  it("returns identifier-redacted tokens capped server-side at sixty", () => {
    sequence = 0;
    const texts = Array.from(
      { length: QUALITATIVE_TOKEN_CAP + 20 },
      (_, index) => `topic word${index}`
    );
    const pulse = summarizeQualitativePulse(
      texts.map((text) => qualRow(`${text} Maria Santos a1b2@mail.com`, "course"))
    );
    expect(pulse.tokens.length).toBeLessThanOrEqual(QUALITATIVE_TOKEN_CAP);
    const serialized = JSON.stringify(pulse.tokens);
    expect(serialized).not.toContain("Maria");
    expect(serialized).not.toContain("Santos");
    expect(serialized).not.toContain("mail.com");
    for (const token of pulse.tokens) {
      expect(Object.keys(token).sort()).toEqual(["text", "value"]);
    }
  });

  it("counts one person once across several evaluations (§13.3 person-level)", () => {
    sequence = 0;
    const rows = [
      qualRow("Great laboratory activities", "course"),
      qualRow("Loved the internship support", "course"),
    ];
    // Both rows belong to the same person: respondent identity is shared.
    const personId = "person-shared";
    const pulse = summarizeQualitativePulse(
      rows.map((row) => ({
        ...row,
        response: { ...row.response, respondent_id: personId },
      }))
    );
    expect(pulse.respondentCount).toBe(1);
    expect(pulse.answerCount).toBe(2);
    expect(pulse.evaluationCount).toBe(1);
  });

  it("never carries raw comment text on the returned projection", () => {
    sequence = 100;
    const pulse = summarizeQualitativePulse([
      qualRow("Confidential remark about Juan Cruz", "industry"),
    ]);
    const serialized = JSON.stringify(pulse);
    expect(serialized).not.toContain("Confidential remark");
    expect(serialized).not.toContain("Juan Cruz");
  });
});
