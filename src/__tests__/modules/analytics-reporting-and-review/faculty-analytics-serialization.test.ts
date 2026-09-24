// fallow-ignore-file code-duplication
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getFacultyAnalyticsDataAction } from "@/lib/actions/faculty-analytics-actions";
import { ROLES } from "@/lib/constants/roles";

const { courseBoundEvaluationFindManyMock, resolveAuthSessionMock } = vi.hoisted(() => ({
  courseBoundEvaluationFindManyMock: vi.fn(),
  resolveAuthSessionMock: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: { courseBoundEvaluation: { findMany: courseBoundEvaluationFindManyMock } },
}));
vi.mock("@/features/auth/services/resolve-auth-session", () => ({
  resolveAuthSession: resolveAuthSessionMock,
}));

const scale = [
  { value: 1, label: "Strongly disagree" },
  { value: 2, label: "Disagree" },
  { value: 3, label: "Neutral" },
  { value: 4, label: "Agree" },
  { value: 5, label: "Strongly agree" },
];

/** One seeded assignment row as the Faculty analytics read projects it. */
type FacultyResponseFixture = {
  respondent_id: string;
  response: {
    id: string;
    status: string;
    quant_items: Array<{
      rating_value: number;
      section_key: string;
      item_key: string;
      cilo_question_binding_id: string;
    }>;
    qual_items: Array<{ section_key: string; prompt_key: string; text_content: string }>;
  };
};

function response(
  id: string,
  ratings: number[],
  comment: string,
  promptKey = "remarks"
): FacultyResponseFixture {
  return {
    respondent_id: `student-${id}`,
    response: {
      id,
      status: "SUBMITTED",
      quant_items: ratings.map((rating_value) => ({
        rating_value,
        section_key: "outcomes",
        item_key: "application",
        cilo_question_binding_id: "binding-1",
      })),
      qual_items: [{ section_key: "feedback", prompt_key: promptKey, text_content: comment }],
    },
  };
}

/** One seeded CILO question binding row as the Faculty analytics read projects it. */
type FacultyBindingFixture = {
  id: string;
  cilo_id: string | null;
  cilo_description_snapshot: string;
  question_prompt_snapshot: string;
  section_key: string;
  item_key: string;
  created_at: Date;
  updated_at: Date;
  course_bound_evaluation_id: string;
};

function evaluation(assignments: FacultyResponseFixture[]) {
  return {
    id: "evaluation-1",
    deployment_name: "End-of-term evaluation",
    status: "CLOSED",
    course_assignment_id: "11111111-1111-4111-8111-111111111111",
    term_instance_id: "22222222-2222-4222-8222-222222222222",
    course_info_snapshot: {},
    course_assignment: {
      id: "11111111-1111-4111-8111-111111111111",
      year_level: "SECOND_YEAR",
      section: "MORNING",
      course: {
        id: "33333333-3333-4333-8333-333333333333",
        code: "IT 201",
        title: "Software Engineering",
      },
      program: {
        id: "44444444-4444-4444-8444-444444444444",
        code: "BSIT",
        name: "Bachelor of Science in Information Technology",
      },
    },
    assignments,
    cilos_snapshot: [
      {
        description: "Apply engineering methods",
        id: "55555555-5555-4555-8555-555555555555",
        label: "CILO 1",
      },
    ] as { description: string; id: string; label: string }[],
    cilo_question_bindings: [
      {
        id: "binding-1",
        cilo_id: "55555555-5555-4555-8555-555555555555",
        cilo_description_snapshot: "Apply engineering methods",
        question_prompt_snapshot: "I can apply the methods",
        section_key: "outcomes",
        item_key: "application",
        created_at: new Date(),
        updated_at: new Date(),
        course_bound_evaluation_id: "evaluation-1",
      },
    ] as FacultyBindingFixture[],
    instrument: {
      id: "66666666-6666-4666-8666-666666666666",
      version_number: 2,
      template: { name: "IT201 Course Evaluation" },
      structure_snapshot: [
        {
          key: "outcomes",
          title: "Learning outcomes",
          items: [
            {
              key: "application",
              kind: "quantitative",
              prompt: "I can apply the methods",
              likertDescriptors: scale,
            },
          ],
        },
        {
          key: "feedback",
          title: "Written feedback",
          items: [
            { key: "remarks", kind: "qualitative", prompt: "What helped you learn?" },
            { key: "improve", kind: "qualitative", prompt: "What should improve?" },
          ],
        },
      ],
    },
    term_instance: {
      id: "22222222-2222-4222-8222-222222222222",
      semester: "FIRST",
      term: null,
      start_date: new Date("2026-08-01"),
      school_year: { code: "2026-2027" },
    },
    _count: { assignments: assignments.length },
  };
}

describe("faculty analytics serialization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveAuthSessionMock.mockResolvedValue({ activeRole: ROLES.FACULTY, userId: "faculty-1" });
  });

  it("weights raw ratings and reveals only recurring redacted terms at five respondents", async () => {
    courseBoundEvaluationFindManyMock.mockResolvedValue([
      evaluation([
        response("r1", [5, 5], "Practical examples helped student1@acd.edu.ph"),
        response("r2", [4], "Practical exercises helped"),
        response("r3", [1], "Clear examples helped"),
        response("r4", [5], "Clear examples"),
        response("r5", [4], "Practical examples"),
      ]),
    ]);

    const result = await getFacultyAnalyticsDataAction({ view: "overview" });
    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data.kpi).toMatchObject({
      submittedResponseCount: 5,
      opportunityCount: 5,
      validRatingCount: 6,
      overallMean: 4,
      overallScaleMax: 5,
      spansMultipleScales: false,
    });
    expect(result.data.evaluations[0].classLabel).toBe("BSIT · 2nd Year · Morning");
    expect(result.data.ciloMetrics[0]).toMatchObject({
      courseId: "33333333-3333-4333-8333-333333333333",
      courseCode: "IT 201",
      courseTitle: "Software Engineering",
      evaluationId: "evaluation-1",
      evaluationName: "End-of-term evaluation",
      label: "CILO 1",
    });
    expect(result.data.qualitative).toMatchObject({
      available: true,
      responseCount: 5,
      itemCount: 5,
    });
    expect(result.data.qualitative.tokens).toEqual(
      expect.arrayContaining([
        { text: "examples", value: 4, responseCount: 4 },
        { text: "helped", value: 3, responseCount: 3 },
      ])
    );
    expect(result.data.qualitative.tokens).not.toContainEqual({ text: "exercises", value: 1 });
    expect(result.data.qualitative.promptCounts).toHaveLength(1);
    const [prompt] = result.data.qualitative.promptCounts;
    expect(prompt).toMatchObject({
      prompt: "What helped you learn?",
      instrumentLabel: "IT201 Course Evaluation v2",
      itemCount: 5,
      responseCount: 5,
      tone: { scoredItemCount: 5 },
    });
    // Singletons stay out per prompt too: "exercises" was mentioned once, and
    // the title-cased sentence openers redaction removes are already gone.
    expect(prompt?.terms).toEqual([
      { text: "examples", value: 4, responseCount: 4 },
      { text: "helped", value: 3, responseCount: 3 },
    ]);

    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain("student1@acd.edu.ph");
    expect(serialized).not.toContain("Practical examples helped");
    expect(serialized).not.toContain("respondent_id");
    expect(serialized).not.toContain("qual_items");
  });

  it("withholds a prompt whose own response count is below the confidentiality floor", async () => {
    courseBoundEvaluationFindManyMock.mockResolvedValue([
      evaluation([
        response("r1", [5], "Practical examples helped"),
        response("r2", [4], "Practical exercises helped"),
        response("r3", [4], "Clear examples helped"),
        response("r4", [4], "Clear examples"),
        response("r5", [4], "Practical examples"),
        response("r6", [3], "Shorter term", "improve"),
        response("r7", [3], "Shorter term again", "improve"),
      ]),
    ]);

    const result = await getFacultyAnalyticsDataAction({ view: "qualitative" });
    expect(result.success).toBe(true);
    if (!result.success) return;

    // Seven distinct respondents clear the scope floor, so the scope-level
    // corpus is analyzed; the two-answer prompt stays withheld rather than
    // releasing terms and tone for a smaller cohort.
    expect(result.data.qualitative.available).toBe(true);
    expect(result.data.qualitative.promptCounts.map((row) => row.prompt)).toEqual([
      "What helped you learn?",
    ]);
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain("Shorter term");
    expect(serialized).not.toContain("What should improve?");
  });

  it("pools every question bound to one CILO into a single faculty CILO metric", async () => {
    const twoQuestionEvaluation = evaluation([]);
    twoQuestionEvaluation.cilos_snapshot = [
      {
        description: "Apply engineering methods",
        id: "55555555-5555-4555-8555-555555555555",
        label: "CILO 1",
      },
    ];
    twoQuestionEvaluation.cilo_question_bindings = [
      ...twoQuestionEvaluation.cilo_question_bindings,
      {
        id: "binding-2",
        cilo_id: "55555555-5555-4555-8555-555555555555",
        cilo_description_snapshot: "Apply engineering methods",
        question_prompt_snapshot: "I can defend the applied methods",
        section_key: "outcomes",
        item_key: "defense",
        created_at: new Date(),
        updated_at: new Date(),
        course_bound_evaluation_id: "evaluation-1",
      },
    ];
    twoQuestionEvaluation.instrument.structure_snapshot[0]!.items!.push({
      key: "defense",
      kind: "quantitative" as const,
      prompt: "I can defend the applied methods",
      likertDescriptors: scale,
    });
    // Unequal rating counts across the two questions: (5 + 5 + 2) / 3 = 4 raw,
    // where averaging the question means (5 and 2) would give 3.5.
    twoQuestionEvaluation.assignments = [
      {
        respondent_id: "student-r1",
        response: {
          id: "r1",
          status: "SUBMITTED",
          quant_items: [
            {
              rating_value: 5,
              section_key: "outcomes",
              item_key: "application",
              cilo_question_binding_id: "binding-1",
            },
          ],
          qual_items: [],
        },
      },
      {
        respondent_id: "student-r2",
        response: {
          id: "r2",
          status: "SUBMITTED",
          quant_items: [
            {
              rating_value: 5,
              section_key: "outcomes",
              item_key: "application",
              cilo_question_binding_id: "binding-1",
            },
            {
              rating_value: 2,
              section_key: "outcomes",
              item_key: "defense",
              cilo_question_binding_id: "binding-2",
            },
          ],
          qual_items: [],
        },
      },
    ];

    courseBoundEvaluationFindManyMock.mockResolvedValue([twoQuestionEvaluation]);

    const result = await getFacultyAnalyticsDataAction({ view: "cilos" });
    if (!result.success) throw new Error(result.error);

    // One CILO, two questions: a single metric whose scale group pools all four
    // raw ratings, and whose bound-question list carries both prompts.
    expect(result.data.ciloMetrics).toHaveLength(1);
    const [ciloMetric] = result.data.ciloMetrics;
    expect(ciloMetric).toMatchObject({
      ciloId: "55555555-5555-4555-8555-555555555555",
      label: "CILO 1",
      description: "Apply engineering methods",
      questions: [
        { sectionKey: "outcomes", itemKey: "application", prompt: "I can apply the methods" },
        { sectionKey: "outcomes", itemKey: "defense", prompt: "I can defend the applied methods" },
      ],
    });
    expect(ciloMetric?.scaleGroups).toHaveLength(1);
    expect(ciloMetric?.scaleGroups[0]).toMatchObject({ mean: 4, ratingCount: 3 });
  });

  it("labels every question evidencing a CILO with that CILO's publication label", async () => {
    const evaluationRow = evaluation([]);
    evaluationRow.cilos_snapshot = [
      {
        description: "Apply engineering methods",
        id: "55555555-5555-4555-8555-555555555555",
        label: "CILO 1",
      },
      {
        description: "Defend the applied methods",
        id: "77777777-7777-4777-8777-777777777777",
        label: "CILO 2",
      },
    ];
    // Binding order deliberately does not match CILO order: the second CILO's
    // question is bound first, so a position-derived label would mis-number
    // everything.
    evaluationRow.cilo_question_bindings = [
      {
        id: "binding-defense",
        cilo_id: "77777777-7777-4777-8777-777777777777",
        cilo_description_snapshot: "Defend the applied methods",
        question_prompt_snapshot: "I can defend the applied methods",
        section_key: "outcomes",
        item_key: "defense",
        created_at: new Date(),
        updated_at: new Date(),
        course_bound_evaluation_id: "evaluation-1",
      },
      ...evaluationRow.cilo_question_bindings,
    ];
    evaluationRow.instrument.structure_snapshot[0]!.items!.push({
      key: "defense",
      kind: "quantitative" as const,
      prompt: "I can defend the applied methods",
      likertDescriptors: scale,
    });
    courseBoundEvaluationFindManyMock.mockResolvedValue([evaluationRow]);

    const result = await getFacultyAnalyticsDataAction({ view: "questions" });
    if (!result.success) throw new Error(result.error);

    const labelsByItemKey = Object.fromEntries(
      result.data.questionMetrics.map((metric) => [metric.prompt, metric.ciloLabel])
    );
    expect(labelsByItemKey).toEqual({
      "I can apply the methods": "CILO 1",
      "I can defend the applied methods": "CILO 2",
    });
  });

  it("keeps questions whose section and item keys collide under a separator join separate", async () => {
    const ciloOne = "55555555-5555-4555-8555-555555555555";
    const ciloTwo = "77777777-7777-4777-8777-777777777777";
    const ciloThree = "88888888-8888-4888-8888-888888888888";
    // Incompatible with `scale`: a different numeric range and different labels.
    const fourPointScale = [
      { value: 1, label: "Poor" },
      { value: 2, label: "Fair" },
      { value: 3, label: "Satisfactory" },
      { value: 4, label: "Excellent" },
    ];
    const quantitative = (key: string, prompt: string, descriptors = scale) => ({
      key,
      kind: "quantitative" as const,
      prompt,
      likertDescriptors: descriptors,
    });
    const binding = (
      id: string,
      ciloId: string | null,
      sectionKey: string,
      itemKey: string,
      prompt: string,
      description: string
    ) => ({
      id,
      cilo_id: ciloId,
      cilo_description_snapshot: description,
      question_prompt_snapshot: prompt,
      section_key: sectionKey,
      item_key: itemKey,
      created_at: new Date(),
      updated_at: new Date(),
      course_bound_evaluation_id: "evaluation-1",
    });

    // Replacing either separator with a colon in one key while removing it from
    // the other produces the same joined string: (a, b:c) with (a:b, c).
    const collisionFixture = evaluation([]);
    collisionFixture.cilos_snapshot = [
      { description: "Apply engineering methods", id: ciloOne, label: "CILO 1" },
      { description: "Present the applied methods", id: ciloTwo, label: "CILO 2" },
      { description: "Review the applied methods", id: ciloThree, label: "CILO 3" },
    ];
    collisionFixture.cilo_question_bindings = [
      binding(
        "binding-apply",
        ciloOne,
        "outcomes",
        "application:lab",
        "I can apply the methods",
        "Apply engineering methods"
      ),
      binding(
        "binding-defend",
        ciloOne,
        "outcomes:application",
        "lab",
        "I can defend the applied methods",
        "Apply engineering methods"
      ),
      binding(
        "binding-present",
        ciloTwo,
        "review",
        "panel:defense",
        "I can present my work",
        "Present the applied methods"
      ),
      binding(
        "binding-review",
        ciloThree,
        "review:panel",
        "defense",
        "I can review my work",
        "Review the applied methods"
      ),
      binding(
        "binding-archived",
        null,
        "outcomes",
        "portfolio",
        "I kept a portfolio",
        "Kept a portfolio"
      ),
    ];
    collisionFixture.instrument.structure_snapshot = [
      {
        key: "outcomes",
        title: "Learning outcomes",
        items: [
          quantitative("application:lab", "I can apply the methods"),
          quantitative("portfolio", "I kept a portfolio"),
        ],
      },
      {
        key: "outcomes:application",
        title: "Applied outcomes",
        items: [quantitative("lab", "I can defend the applied methods", fourPointScale)],
      },
      {
        key: "review",
        title: "Peer review",
        items: [quantitative("panel:defense", "I can present my work")],
      },
      {
        key: "review:panel",
        title: "Panel review",
        items: [quantitative("defense", "I can review my work")],
      },
    ];
    const rated = (
      id: string,
      status: "SUBMITTED" | "IN_PROGRESS",
      sectionKey: string,
      itemKey: string,
      ratingValue: number
    ): FacultyResponseFixture => ({
      respondent_id: `student-${id}`,
      response: {
        id,
        status,
        quant_items: [
          {
            rating_value: ratingValue,
            section_key: sectionKey,
            item_key: itemKey,
            cilo_question_binding_id: "binding-apply",
          },
        ],
        qual_items: [],
      },
    });
    collisionFixture.assignments = [
      rated("r1", "SUBMITTED", "outcomes", "application:lab", 5),
      rated("r2", "SUBMITTED", "outcomes:application", "lab", 2),
      rated("r3", "SUBMITTED", "review", "panel:defense", 4),
      rated("r4", "SUBMITTED", "review:panel", "defense", 1),
      rated("r5", "IN_PROGRESS", "outcomes", "application:lab", 1),
    ];
    courseBoundEvaluationFindManyMock.mockResolvedValue([collisionFixture]);

    const result = await getFacultyAnalyticsDataAction({ view: "cilos" });
    if (!result.success) throw new Error(result.error);

    // Submitted-only aggregation survives the identity change: the in-progress
    // rating never reaches a metric.
    expect(result.data.kpi).toMatchObject({ submittedResponseCount: 4, validRatingCount: 4 });

    const ciloByLabel = new Map(result.data.ciloMetrics.map((metric) => [metric.label, metric]));
    expect(ciloByLabel.size).toBe(4);
    // Two colliding questions bound to one CILO stay two questions, and each
    // CILO pools only its own questions' ratings.
    expect(ciloByLabel.get("CILO 1")?.questions.map((question) => question.prompt)).toEqual([
      "I can apply the methods",
      "I can defend the applied methods",
    ]);
    // The two colliding questions carry different scales, so their ratings stay
    // in separate scale groups rather than merging into one blended mean.
    expect(ciloByLabel.get("CILO 1")?.scaleGroups).toMatchObject([
      { scaleLabel: "1–5 (5-point)", mean: 5, ratingCount: 1 },
      { scaleLabel: "1–4 (4-point)", mean: 2, ratingCount: 1 },
    ]);
    expect(ciloByLabel.get("CILO 2")?.questions.map((question) => question.prompt)).toEqual([
      "I can present my work",
    ]);
    expect(ciloByLabel.get("CILO 2")?.scaleGroups).toMatchObject([{ mean: 4, ratingCount: 1 }]);
    expect(ciloByLabel.get("CILO 3")?.scaleGroups).toMatchObject([{ mean: 1, ratingCount: 1 }]);
    // An archived CILO keeps its own group under the lone binding's identity.
    expect(ciloByLabel.get("Unassigned CILO")).toMatchObject({
      description: "Kept a portfolio",
      ciloId: null,
      questions: [{ sectionKey: "outcomes", itemKey: "portfolio", prompt: "I kept a portfolio" }],
      scaleGroups: [],
    });

    const questionByPrompt = new Map(
      result.data.questionMetrics.map((metric) => [metric.prompt, metric])
    );
    const questionKeys = result.data.questionMetrics.map((metric) => metric.key);
    expect(new Set(questionKeys).size).toBe(questionKeys.length);
    expect(questionByPrompt.get("I can apply the methods")).toMatchObject({
      ciloLabel: "CILO 1",
      scaleGroups: [{ mean: 5, ratingCount: 1 }],
    });
    expect(questionByPrompt.get("I can defend the applied methods")).toMatchObject({
      ciloLabel: "CILO 1",
      scaleGroups: [{ mean: 2, ratingCount: 1 }],
    });
    expect(questionByPrompt.get("I can present my work")).toMatchObject({
      ciloLabel: "CILO 2",
      scaleGroups: [{ mean: 4, ratingCount: 1 }],
    });
    expect(questionByPrompt.get("I can review my work")).toMatchObject({
      ciloLabel: "CILO 3",
      scaleGroups: [{ mean: 1, ratingCount: 1 }],
    });
    expect(questionByPrompt.get("I kept a portfolio")).toMatchObject({
      ciloLabel: null,
      scaleGroups: [],
    });
  });

  it("suppresses all qualitative analytics below five submitted respondents", async () => {
    courseBoundEvaluationFindManyMock.mockResolvedValue([
      evaluation([
        response("r1", [5], "Clear examples"),
        response("r2", [4], "Clear examples"),
        response("r3", [4], "Clear examples"),
        response("r4", [3], "Clear examples"),
      ]),
    ]);

    const result = await getFacultyAnalyticsDataAction({ view: "qualitative" });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.qualitative).toMatchObject({
      available: false,
      submittedResponseCount: 0,
      responseCount: 0,
      itemCount: 0,
      evaluationCount: 0,
      tokens: [],
      promptCounts: [],
    });
  });
});
