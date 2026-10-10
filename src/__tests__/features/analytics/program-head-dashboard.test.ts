import { describe, expect, it } from "vitest";
import { DeploymentStatus } from "@prisma/client";
import {
  buildCentralPoRatingRows,
  type AttentionDeployment,
  type CentralBindingsByDeployment,
  type CourseBindingRow,
  type DashboardRatingRow,
  buildCourseGoRatingRows,
  buildNeedsAttentionItems,
  isClosingWithinSevenDays,
  QUALITATIVE_TOKEN_CAP,
  summarizeQualitativePulse,
  toDashboardPoRows,
} from "@/features/analytics/services/get-program-head-dashboard";
import {
  buildCourseDerivedPoMetrics,
  buildProgramWidePoMetrics,
} from "@/features/analytics/aggregators/po";

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
      key: "po-items",
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
      key: "po-items",
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

function centralRow(stakeholder: "STUDENT" | "ALUMNI" | "INDUSTRY_PARTNER"): DashboardRatingRow {
  return {
    rating_value: 1,
    response_id: `resp-${stakeholder}`,
    section_key: "po-items",
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
// PO row normalization into the shared aggregators (§13.8, §5.8, §5.9, §7)
// ---------------------------------------------------------------------------

describe("PO row normalization", () => {
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
          po: { id: "po-1", code: "PO 1", description: "Communicate." },
        },
        {
          manifestation: "OPPORTUNITY",
          po: { id: "po-2", code: "PO 2", description: "Collaborate." },
        },
      ],
    },
  };

  it("routes course ratings through publication-time bindings; manifestations stay descriptive", () => {
    const bindingByKey = new Map([[JSON.stringify(["cb-1", "cilo-items", "q-cilo-a"]), binding]]);
    const normalized = buildCourseGoRatingRows(
      [courseRow({ rating_value: 1 })],
      bindingByKey,
      SNAPSHOT_MAP
    );
    expect(normalized).toHaveLength(1);
    expect(normalized[0].evaluationId).toBe("cb-1");
    expect(normalized[0].poMappings.map((mapping) => mapping.poId)).toEqual(["po-1", "po-2"]);
    expect(normalized[0].poMappings.map((mapping) => mapping.manifestation)).toEqual([
      "LEARNING",
      "OPPORTUNITY",
    ]);

    const metrics = buildCourseDerivedPoMetrics(normalized);
    expect(metrics.find((metric) => metric.poId === "po-1")!.ratingCount).toBe(1);
    expect(metrics.find((metric) => metric.poId === "po-2")!.ratingCount).toBe(1);
  });

  it("routes direct course question bindings without a fake CILO", () => {
    const normalized = buildCourseGoRatingRows(
      [courseRow({ rating_value: 2 })],
      new Map([
        [
          JSON.stringify(["cb-1", "cilo-items", "q-cilo-a"]),
          {
            ...binding,
            cilo: null,
            directPoMappings: [{ poId: "po-1", poCode: "PO 1", poDescription: "Communicate." }],
          },
        ],
      ]),
      SNAPSHOT_MAP
    );

    expect(normalized[0].cilo).toBeNull();
    expect(normalized[0].directPoMappings?.[0].poId).toBe("po-1");
    expect(buildCourseDerivedPoMetrics(normalized)[0].ratingCount).toBe(1);
  });

  it("skips items without a live binding or without selected-Program mappings", () => {
    const unbound: CourseBindingRow = { ...binding, cilo: null };
    const unmapped: CourseBindingRow = {
      ...binding,
      cilo: { ...binding.cilo!, cilo_mappings: [] },
    };
    const normalized = buildCourseGoRatingRows(
      [courseRow()],
      new Map([
        [JSON.stringify(["cb-1", "cilo-items", "q-cilo-a"]), unbound],
        [JSON.stringify(["cb-2", "cilo-items", "q-cilo-a"]), unmapped],
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
          [
            JSON.stringify(["po-items", "q-plo"]),
            [{ poId: "po-1", poCode: "PO 1", poDescription: "Communicate." }],
          ],
        ]),
      ],
    ]);
    const studentOnly = buildCentralPoRatingRows(
      [centralRow("STUDENT"), centralRow("ALUMNI")],
      bindings,
      SNAPSHOT_MAP
    );
    expect(studentOnly).toHaveLength(1);
    expect(studentOnly[0].evaluationId).toBe("cd-STUDENT");

    const metrics = buildProgramWidePoMetrics(studentOnly);
    expect(metrics.find((metric) => metric.poId === "po-1")!.questionCount).toBe(1);
    expect(metrics.find((metric) => metric.poId === "po-1")!.evaluationCount).toBe(1);
  });
});

describe("toDashboardPoRows", () => {
  const metric = {
    poId: "po-1",
    poCode: "PO 1",
    poDescription: "",
    mean: 4,
    ratingCount: 6,
    responseCount: 3,
    evaluationCount: 2,
    questionCount: 3,
    scaleGroups: [],
    spansMultipleScales: false,
    excludedRatingCount: 0,
    contributingCilos: [],
  };

  it("marks rated POs as evidenced and never classifies without a resolved scale", () => {
    const [row] = toDashboardPoRows([metric]);
    expect(row.hasEvidence).toBe(true);
    expect(row.scaleMax).toBeNull();
    expect(row.attainment.status).not.toBe("classified");
  });

  it("treats an unrated PO as lacking evidence", () => {
    const [row] = toDashboardPoRows([{ ...metric, mean: null, ratingCount: 0 }]);
    expect(row.hasEvidence).toBe(false);
    expect(row.attainment.status).toBe("no-evidence");
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

  function items(overrides: Partial<Parameters<typeof buildNeedsAttentionItems>[0]> = {}) {
    return buildNeedsAttentionItems({
      programId: "program-1",
      now,
      deployments,
      submittedCountsByDeployment: submittedCounts,
      programGos: [],
      poRowsBySource: {},
      ...overrides,
    });
  }

  it("flags ACTIVE deployments closing within seven days; never SCHEDULED or far deadlines", () => {
    expect(
      items()
        .filter((item) => item.rules.includes("closing-soon"))
        .map((item) => item.id)
    ).toEqual(["deployment:course:d-closing"]);
  });

  it("breaks equal deadlines by name instead of database row order", () => {
    const sameDeadline = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
    const result = items({
      deployments: [
        {
          id: "d-zeta",
          kind: "course",
          name: "Zeta Post-Term CILO Evaluation",
          status: DeploymentStatus.ACTIVE,
          deadlineAt: sameDeadline,
        },
        {
          id: "d-alpha",
          kind: "course",
          name: "Alpha Post-Term CILO Evaluation",
          status: DeploymentStatus.ACTIVE,
          deadlineAt: sameDeadline,
        },
      ],
      submittedCountsByDeployment: new Map([
        ["d-zeta", 0],
        ["d-alpha", 0],
      ]),
    });
    expect(result.map((item) => item.id)).toEqual([
      "deployment:course:d-alpha",
      "deployment:course:d-zeta",
    ]);
  });

  it("flags ACTIVE deployments with zero submissions regardless of deadline", () => {
    expect(
      items()
        .filter((item) => item.rules.includes("zero-submissions"))
        .map((item) => item.id)
    ).toEqual(["deployment:central:d-zero"]);
  });

  it("merges both deployment rules into one item, listed before other deployments", () => {
    const result = items({
      submittedCountsByDeployment: new Map([
        ["d-far", 2],
        ["d-zero", 0],
      ]),
    });
    expect(result.map((item) => item.id)).toEqual([
      "deployment:course:d-closing",
      "deployment:central:d-zero",
    ]);
    expect(result[0].rules).toEqual(["closing-soon", "zero-submissions"]);
    expect(result[0].note).toBe("Closes within 7 days · No submissions yet");
  });

  it("collapses PO rating gaps into one item per evidence source naming the missing POs", () => {
    const result = items({
      deployments: [],
      programGos: [
        { id: "po-1", code: "PO 1" },
        { id: "po-2", code: "PO 2" },
      ],
      poRowsBySource: {
        COURSE_STUDENT: toDashboardPoRows([
          {
            poId: "po-1",
            poCode: "PO 1",
            poDescription: "",
            mean: 4,
            ratingCount: 8,
            responseCount: 2,
            evaluationCount: 1,
            questionCount: 2,
            scaleGroups: [],
            spansMultipleScales: false,
            excludedRatingCount: 0,
            contributingCilos: [],
          },
        ]),
      },
      periodFilters: { termInstanceId: "00000000-0000-4000-8000-000000000001" },
    });
    expect(result.map((item) => [item.id, item.note])).toEqual([
      ["zero-po-ratings:COURSE_STUDENT", "PO 2"],
      ["zero-po-ratings:CENTRAL_STUDENT", "All 2 POs"],
      ["zero-po-ratings:ALUMNI", "All 2 POs"],
      ["zero-po-ratings:INDUSTRY_PARTNER", "All 2 POs"],
    ]);
    const alumniHref = result[2].href;
    expect(alumniHref).toContain("tab=outcomes");
    expect(alumniHref).toContain("evidenceSource=ALUMNI");
    expect(alumniHref).toContain("termInstanceId=00000000-0000-4000-8000-000000000001");
  });

  it("links deployment items to their canonical Responses routes", () => {
    const result = items({
      programId: "program-9",
      periodFilters: {
        schoolYearId: "00000000-0000-4000-8000-000000000009",
        semester: "SECOND",
      },
    });
    const closingHref = result.find((item) => item.rules.includes("closing-soon"))!.href;
    const zeroHref = result.find((item) => item.id === "deployment:central:d-zero")!.href;
    expect(closingHref).toContain("/responses/course/d-closing");
    expect(zeroHref).toContain("/responses/program-wide/d-zero");
    for (const href of [closingHref, zeroHref]) {
      expect(href).toContain("schoolYearId=00000000-0000-4000-8000-000000000009");
      expect(href).toContain("semester=SECOND");
    }
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
  function qualRow(text: string, respondentId = `person-${++sequence}`) {
    return { text_content: text, response: { respondent_id: respondentId } };
  }

  it("counts non-empty answers and distinct respondents", () => {
    const pulse = summarizeQualitativePulse([
      qualRow("Great laboratory activities"),
      qualRow("Loved the internship support"),
      qualRow("   "),
    ]);
    expect(pulse.answerCount).toBe(2);
    expect(pulse.respondentCount).toBe(2);
  });

  it("returns identifier-redacted tokens capped server-side at sixty", () => {
    sequence = 0;
    const texts = Array.from(
      { length: QUALITATIVE_TOKEN_CAP + 20 },
      (_, index) => `topic word${index}`
    );
    const pulse = summarizeQualitativePulse(
      texts.map((text) => qualRow(`${text} Maria Santos a1b2@mail.com`))
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

  it("counts one person once across several answers (§13.3 person-level)", () => {
    const pulse = summarizeQualitativePulse([
      qualRow("Great laboratory activities", "person-shared"),
      qualRow("Loved the internship support", "person-shared"),
    ]);
    expect(pulse.respondentCount).toBe(1);
    expect(pulse.answerCount).toBe(2);
  });

  it("never carries raw comment text on the returned projection", () => {
    const pulse = summarizeQualitativePulse([qualRow("Confidential remark about Juan Cruz")]);
    const serialized = JSON.stringify(pulse);
    expect(serialized).not.toContain("Confidential remark");
    expect(serialized).not.toContain("Juan Cruz");
  });
});
