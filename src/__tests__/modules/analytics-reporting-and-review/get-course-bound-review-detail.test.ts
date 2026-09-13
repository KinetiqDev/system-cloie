// fallow-ignore-file code-duplication
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ROLES } from "@/lib/constants/roles";
import {
  buildReviewWordCloudTokens,
  getCourseBoundReviewDetail,
} from "@/features/analytics/services/get-course-bound-review-detail";

const {
  courseBoundEvaluationFindFirstMock,
  resolveAuthSessionMock,
  resolveProgramHeadContextMock,
  resolveReviewerProgramScopeMock,
} = vi.hoisted(() => ({
  courseBoundEvaluationFindFirstMock: vi.fn(),
  resolveAuthSessionMock: vi.fn(),
  resolveProgramHeadContextMock: vi.fn(),
  resolveReviewerProgramScopeMock: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    courseBoundEvaluation: {
      findFirst: courseBoundEvaluationFindFirstMock,
    },
  },
}));

vi.mock("@/features/auth/services/resolve-auth-session", () => ({
  resolveAuthSession: resolveAuthSessionMock,
}));

vi.mock("@/features/auth/services/resolve-program-head-context", () => ({
  resolveProgramHeadContext: resolveProgramHeadContextMock,
}));

vi.mock("@/features/academic-structure/services/resolve-reviewer-program-scope", () => ({
  resolveReviewerProgramScope: resolveReviewerProgramScopeMock,
}));

describe("buildReviewWordCloudTokens", () => {
  it("normalizes tokens and removes stopwords", () => {
    expect(
      buildReviewWordCloudTokens([
        "The instructor explained concepts clearly and clearly.",
        "Great activities, excellent feedback!",
      ])
    ).toEqual([
      { text: "clearly", value: 2 },
      { text: "activities", value: 1 },
      { text: "concepts", value: 1 },
      { text: "excellent", value: 1 },
      { text: "explained", value: 1 },
      { text: "feedback", value: 1 },
      { text: "great", value: 1 },
      { text: "instructor", value: 1 },
    ]);
  });

  it("returns empty tokens for punctuation-only input", () => {
    expect(buildReviewWordCloudTokens(["!!! ... ,,, --- ???"])).toEqual([]);
  });

  it("drops numeric and mixed tokens while keeping valid words", () => {
    expect(buildReviewWordCloudTokens(["2026 capstone2 A+ clarity"])).toEqual([
      { text: "clarity", value: 1 },
    ]);
  });

  it("returns empty tokens for empty and whitespace input", () => {
    expect(buildReviewWordCloudTokens(["", "   ", "\n\t"])).toEqual([]);
  });
});

describe("getCourseBoundReviewDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when reviewer scope does not permit program access", async () => {
    resolveAuthSessionMock.mockResolvedValue({
      activeRole: ROLES.PROGRAM_HEAD,
      roles: [ROLES.PROGRAM_HEAD],
      userId: "head-1",
    });
    resolveProgramHeadContextMock.mockResolvedValue({
      success: true,
      data: {
        authorizedPrograms: [
          { code: "BSED", id: "program-1", name: "Bachelor of Secondary Education" },
          { code: "BSIT", id: "program-2", name: "BS Information Technology" },
        ],
        selectedProgram: { code: "BSIT", id: "program-2", name: "BS Information Technology" },
        userId: "head-1",
      },
    });
    resolveReviewerProgramScopeMock.mockResolvedValue(["program-2"]);
    courseBoundEvaluationFindFirstMock.mockResolvedValue(null);

    await expect(getCourseBoundReviewDetail("eval-1", "program-2")).resolves.toBeNull();

    expect(courseBoundEvaluationFindFirstMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "eval-1",
          course_assignment: {
            program_id: { in: ["program-2"] },
          },
        }),
      })
    );
  });

  it("builds section and question means plus anonymized response cards", async () => {
    resolveAuthSessionMock.mockResolvedValue({
      activeRole: ROLES.DEAN,
      roles: [ROLES.DEAN],
      userId: "dean-1",
    });
    resolveReviewerProgramScopeMock.mockResolvedValue(null);
    courseBoundEvaluationFindFirstMock.mockResolvedValue({
      id: "eval-1",
      term_instance: { semester: "SECOND", term: "FIRST_TERM", school_year: { code: "2025-2026" } },
      assignments: [
        {
          respondent_id: "student-1",
          response: {
            id: "response-1",
            qual_items: [
              {
                prompt_key: "feedback",
                section_key: "teaching",
                text_content: "Very organized lectures",
              },
              { prompt_key: "feedback", section_key: "teaching", text_content: "   " },
            ],
            quant_items: [
              { item_key: "clarity", rating_value: 4, section_key: "teaching" },
              { item_key: "preparedness", rating_value: 2, section_key: "teaching" },
            ],
            submitted_at: new Date("2026-01-04T08:00:00.000Z"),
          },
        },
        {
          respondent_id: "student-2",
          response: {
            id: "response-2",
            qual_items: [
              { prompt_key: "feedback", section_key: "teaching", text_content: "Great pacing" },
            ],
            quant_items: [{ item_key: "clarity", rating_value: 5, section_key: "teaching" }],
            submitted_at: new Date("2026-01-05T08:00:00.000Z"),
          },
        },
      ],
      cilo_question_bindings: [],
      deadline_at: new Date("2026-01-10T00:00:00.000Z"),
      instrument: {
        structure_snapshot: [
          {
            items: [
              { key: "clarity", kind: "quantitative", prompt: "Clarity", scale: [1, 2, 3, 4, 5] },
              {
                key: "preparedness",
                kind: "quantitative",
                prompt: "Preparedness",
                scale: [1, 2, 3, 4, 5],
              },
              { key: "feedback", kind: "qualitative", prompt: "Feedback" },
            ],
            key: "teaching",
            title: "Teaching Effectiveness",
          },
        ],
        template: { name: "Post-Term CILO Evaluation Tool" },
      },
      course_assignment: {
        course: { title: "Capstone 2", major: null },
        program: { name: "BSIT" },
      },
    });

    await expect(getCourseBoundReviewDetail("eval-1")).resolves.toEqual({
      termInstanceLabel: "2025-2026 — 2nd Semester — 1st Term",
      ciloMetrics: [],
      courseTitle: "Capstone 2",
      deadlineAt: new Date("2026-01-10T00:00:00.000Z"),
      evaluationId: "eval-1",
      evaluationTitle: "Post-Term CILO Evaluation Tool",
      overallMean: 3.67,
      programLabel: "BSIT",
      qualitativeItemCount: 2,
      responseCards: [
        {
          overallMean: 3,
          responseId: "response-1",
          respondentLabel: "Respondent R-827493",
          submittedAt: new Date("2026-01-04T08:00:00.000Z"),
        },
        {
          overallMean: 5,
          responseId: "response-2",
          respondentLabel: "Respondent R-827494",
          submittedAt: new Date("2026-01-05T08:00:00.000Z"),
        },
      ],
      responseCount: 2,
      reviewerRole: ROLES.DEAN,
      sections: [
        {
          id: "teaching",
          mean: 3.67,
          name: "Teaching Effectiveness",
          qualitativePromptCount: 1,
          quantitativeQuestionCount: 2,
          questions: [
            { itemKey: "clarity", mean: 4.5, prompt: "Clarity" },
            { itemKey: "preparedness", mean: 2, prompt: "Preparedness" },
          ],
        },
      ],
      wordCloudTokens: [
        { text: "great", value: 1 },
        { text: "lectures", value: 1 },
        { text: "organized", value: 1 },
        { text: "pacing", value: 1 },
      ],
    });
  });

  // fallow-ignore-next-line code-duplication
  it("serializes the review payload aggregate-only without raw qualitative text", async () => {
    resolveAuthSessionMock.mockResolvedValue({
      activeRole: ROLES.DEAN,
      roles: [ROLES.DEAN],
      userId: "dean-1",
    });
    resolveReviewerProgramScopeMock.mockResolvedValue(null);
    courseBoundEvaluationFindFirstMock.mockResolvedValue({
      id: "eval-1",
      term_instance: { semester: "SECOND", term: null, school_year: { code: "2025-2026" } },
      assignments: [
        {
          respondent_id: "student-1",
          response: {
            id: "response-1",
            qual_items: [
              {
                prompt_key: "feedback",
                section_key: "teaching",
                text_content: "Supportive examples improved practical learning",
              },
            ],
            quant_items: [{ item_key: "clarity", rating_value: 4, section_key: "teaching" }],
            submitted_at: new Date("2026-01-04T08:00:00.000Z"),
          },
        },
      ],
      cilo_question_bindings: [],
      deadline_at: new Date("2026-01-10T00:00:00.000Z"),
      instrument: {
        structure_snapshot: [
          {
            items: [
              { key: "clarity", kind: "quantitative", prompt: "Clarity", scale: [1, 2, 3, 4, 5] },
              { key: "feedback", kind: "qualitative", prompt: "Feedback" },
            ],
            key: "teaching",
            title: "Teaching Effectiveness",
          },
        ],
        template: { name: "Post-Term CILO Evaluation Tool" },
      },
      course_assignment: {
        course: { title: "Capstone 2", major: null },
        program: { name: "BSIT" },
      },
    });

    const result = await getCourseBoundReviewDetail("eval-1");
    expect(result).not.toBeNull();
    if (!result) return;

    expect(Object.keys(result).sort()).toEqual(
      [
        "ciloMetrics",
        "courseTitle",
        "deadlineAt",
        "evaluationId",
        "evaluationTitle",
        "overallMean",
        "programLabel",
        "qualitativeItemCount",
        "responseCards",
        "responseCount",
        "reviewerRole",
        "sections",
        "termInstanceLabel",
        "wordCloudTokens",
      ].sort()
    );
    expect(
      result.wordCloudTokens.every((token) => Object.keys(token).sort().join(",") === "text,value")
    ).toBe(true);
    expect(result.qualitativeItemCount).toBe(1);

    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain("Supportive examples improved practical learning");
    expect(serialized).not.toContain("qual_items");
    expect(serialized).not.toContain("assignments");
    expect(serialized).not.toContain("text_content");
  });

  it("pools every question bound to one CILO into a single CILO mean", async () => {
    resolveAuthSessionMock.mockResolvedValue({
      activeRole: ROLES.DEAN,
      roles: [ROLES.DEAN],
      userId: "dean-1",
    });
    resolveReviewerProgramScopeMock.mockResolvedValue(null);
    courseBoundEvaluationFindFirstMock.mockResolvedValue({
      id: "eval-1",
      cilos_snapshot: [
        { description: "Apply capstone planning fundamentals.", id: "cilo-1", label: "CILO 1" },
        { description: "Communicate results to stakeholders.", id: "cilo-2", label: "CILO 2" },
      ],
      term_instance: { semester: "SECOND", term: null, school_year: { code: "2025-2026" } },
      assignments: [
        {
          response: {
            id: "response-1",
            qual_items: [],
            quant_items: [
              // Two questions evidence CILO 1; one evidences CILO 2.
              {
                cilo_question_binding_id: "binding-1",
                item_key: "q1",
                rating_value: 5,
                section_key: "outcomes",
              },
              {
                cilo_question_binding_id: "binding-2",
                item_key: "q2",
                rating_value: 2,
                section_key: "outcomes",
              },
              {
                cilo_question_binding_id: "binding-3",
                item_key: "q3",
                rating_value: 2,
                section_key: "outcomes",
              },
            ],
            submitted_at: new Date("2026-01-04T08:00:00.000Z"),
          },
        },
        {
          // Only the first CILO's first question, so that CILO's questions carry
          // unequal rating counts and its mean can only be the pooled raw mean.
          response: {
            id: "response-2",
            qual_items: [],
            quant_items: [
              {
                cilo_question_binding_id: "binding-1",
                item_key: "q1",
                rating_value: 5,
                section_key: "outcomes",
              },
            ],
            submitted_at: new Date("2026-01-05T08:00:00.000Z"),
          },
        },
      ],
      cilo_question_bindings: [
        {
          id: "binding-1",
          cilo_id: "cilo-1",
          cilo_description_snapshot: "Apply capstone planning fundamentals.",
          item_key: "q1",
          question_prompt_snapshot: "I applied planning fundamentals in class work.",
          section_key: "outcomes",
        },
        {
          id: "binding-2",
          cilo_id: "cilo-1",
          cilo_description_snapshot: "Apply capstone planning fundamentals.",
          item_key: "q2",
          question_prompt_snapshot: "I applied planning fundamentals in the final output.",
          section_key: "outcomes",
        },
        {
          id: "binding-3",
          cilo_id: "cilo-2",
          cilo_description_snapshot: "Communicate results to stakeholders.",
          item_key: "q3",
          question_prompt_snapshot: "I communicated results to stakeholders.",
          section_key: "outcomes",
        },
      ],
      deadline_at: null,
      instrument: {
        structure_snapshot: [
          {
            items: [
              { key: "q1", kind: "quantitative", prompt: "Q1", scale: [1, 2, 3, 4, 5] },
              { key: "q2", kind: "quantitative", prompt: "Q2", scale: [1, 2, 3, 4, 5] },
              { key: "q3", kind: "quantitative", prompt: "Q3", scale: [1, 2, 3, 4, 5] },
            ],
            key: "outcomes",
            title: "Outcomes",
          },
        ],
        template: { name: "Post-Term CILO Evaluation Tool" },
      },
      course_assignment: {
        course: { title: "Capstone 2", major: null },
        program: { name: "BSIT" },
      },
    });

    const result = await getCourseBoundReviewDetail("eval-1");

    // Raw pooling, not a mean of question means: (5 + 5 + 2) / 3 = 4, where
    // averaging the question means (5 and 2) would give 3.5.
    expect(result?.ciloMetrics).toEqual([
      {
        ciloDescription: "Apply capstone planning fundamentals.",
        ciloId: "cilo-1",
        ciloLabel: "CILO 1",
        key: "cilo-1",
        mean: 4,
        questions: [
          {
            itemKey: "q1",
            mean: 5,
            prompt: "I applied planning fundamentals in class work.",
            sectionKey: "outcomes",
          },
          {
            itemKey: "q2",
            mean: 2,
            prompt: "I applied planning fundamentals in the final output.",
            sectionKey: "outcomes",
          },
        ],
      },
      {
        ciloDescription: "Communicate results to stakeholders.",
        ciloId: "cilo-2",
        ciloLabel: "CILO 2",
        key: "cilo-2",
        mean: 2,
        questions: [
          {
            itemKey: "q3",
            mean: 2,
            prompt: "I communicated results to stakeholders.",
            sectionKey: "outcomes",
          },
        ],
      },
    ]);
  });

  it("does not apply program filter for dean scope", async () => {
    resolveAuthSessionMock.mockResolvedValue({
      activeRole: ROLES.DEAN,
      roles: [ROLES.DEAN],
      userId: "dean-1",
    });
    resolveReviewerProgramScopeMock.mockResolvedValue(null);
    courseBoundEvaluationFindFirstMock.mockResolvedValue(null);

    await expect(getCourseBoundReviewDetail("eval-1")).resolves.toBeNull();
    expect(courseBoundEvaluationFindFirstMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.not.objectContaining({ course_assignment: expect.anything() }),
      })
    );
  });

  it("returns null means for empty quantitative datasets", async () => {
    resolveAuthSessionMock.mockResolvedValue({
      activeRole: ROLES.DEAN,
      roles: [ROLES.DEAN],
      userId: "dean-1",
    });
    resolveReviewerProgramScopeMock.mockResolvedValue(null);
    courseBoundEvaluationFindFirstMock.mockResolvedValue({
      id: "eval-1",
      term_instance: { semester: "SECOND", term: null, school_year: { code: "2025-2026" } },
      assignments: [
        {
          response: {
            id: "response-1",
            qual_items: [
              { prompt_key: "feedback", section_key: "teaching", text_content: "Insightful" },
            ],
            quant_items: [],
            submitted_at: new Date("2026-01-04T08:00:00.000Z"),
          },
        },
      ],
      cilo_question_bindings: [],
      deadline_at: null,
      instrument: {
        structure_snapshot: [
          {
            items: [
              { key: "clarity", kind: "quantitative", prompt: "Clarity", scale: [1, 2, 3, 4, 5] },
              { key: "feedback", kind: "qualitative", prompt: "Feedback" },
            ],
            key: "teaching",
            title: "Teaching",
          },
        ],
        template: { name: "Post-Term CILO Evaluation Tool" },
      },
      course_assignment: {
        course: { title: "Capstone 2", major: null },
        program: { name: "BSIT" },
      },
    });

    await expect(getCourseBoundReviewDetail("eval-1")).resolves.toEqual(
      expect.objectContaining({
        overallMean: null,
        responseCards: [
          expect.objectContaining({
            overallMean: null,
          }),
        ],
        sections: [
          expect.objectContaining({
            mean: null,
            questions: [expect.objectContaining({ mean: null })],
          }),
        ],
      })
    );
  });
});
