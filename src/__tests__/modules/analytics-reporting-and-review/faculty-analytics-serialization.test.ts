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

function response(id: string, ratings: number[], comment: string, promptKey = "remarks") {
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

function evaluation(assignments: ReturnType<typeof response>[]) {
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
    ],
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
