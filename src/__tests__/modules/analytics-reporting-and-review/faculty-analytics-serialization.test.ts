import { beforeEach, describe, expect, it, vi } from "vitest";

import { getFacultyAnalyticsDataAction } from "@/lib/actions/faculty-analytics-actions";
import { ROLES } from "@/lib/constants/roles";

const { courseBoundEvaluationFindManyMock, resolveAuthSessionMock, revalidatePathMock } =
  vi.hoisted(() => ({
    courseBoundEvaluationFindManyMock: vi.fn(),
    resolveAuthSessionMock: vi.fn(),
    revalidatePathMock: vi.fn(),
  }));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    courseBoundEvaluation: {
      findMany: courseBoundEvaluationFindManyMock,
    },
  },
}));

vi.mock("@/features/auth/services/resolve-auth-session", () => ({
  resolveAuthSession: resolveAuthSessionMock,
}));

describe("faculty analytics serialization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveAuthSessionMock.mockResolvedValue({
      activeRole: ROLES.FACULTY,
      userId: "faculty-1",
    });
  });

  it("returns aggregate qualitative data without raw or identifying response fields", async () => {
    courseBoundEvaluationFindManyMock.mockResolvedValue([
      {
        id: "evaluation-1",
        deployment_name: "End-of-term evaluation",
        status: "CLOSED",
        course_assignment: {
          course: { title: "Software Engineering" },
          program: { name: "BS Information Technology" },
        },
        assignments: [
          {
            respondent_id: "student-1",
            respondent: { email: "student@cloie.test" },
            response: {
              id: "response-1",
              respondent_id: "student-1",
              respondent_email: "student@cloie.test",
              status: "SUBMITTED",
              quant_items: [],
              qual_items: [
                {
                  id: "qualitative-item-1",
                  response_id: "response-1",
                  text_content: "Supportive examples improved practical learning",
                },
              ],
            },
          },
          {
            respondent_id: "student-2",
            respondent: { email: "second-student@cloie.test" },
            response: {
              id: "response-2",
              status: "SUBMITTED",
              quant_items: [
                {
                  cilo_question_binding_id: "binding-1",
                  section_key: "outcomes",
                  item_key: "application",
                  rating_value: 4,
                },
              ],
              qual_items: [
                {
                  id: "qualitative-item-2",
                  response_id: "response-2",
                  text_content: "Practical examples supported learning",
                },
              ],
            },
          },
          {
            respondent_id: "student-draft",
            response: {
              id: "response-draft",
              status: "IN_PROGRESS",
              quant_items: [],
              qual_items: [
                {
                  id: "qualitative-item-draft",
                  response_id: "response-draft",
                  text_content: "Draft answer must stay excluded",
                },
              ],
            },
          },
        ],
        cilo_question_bindings: [
          {
            id: "binding-1",
            cilo_id: "cilo-1",
            cilo_description_snapshot: "Apply engineering methods",
            section_key: "outcomes",
            item_key: "application",
          },
        ],
        instrument: {
          structure_snapshot: [
            {
              key: "outcomes",
              title: "Learning Outcomes",
              items: [
                {
                  key: "application",
                  kind: "quantitative",
                  prompt: "I can apply the methods",
                },
              ],
            },
          ],
          template: {},
        },
        _count: { assignments: 3 },
        term_instance: {
          term: null,
          semester: "FIRST",
          school_year: { code: "2026-2027" },
        },
      },
    ]);

    const result = await getFacultyAnalyticsDataAction(["evaluation-1"]);

    expect(result).toMatchObject({
      success: true,
      data: [
        {
          evaluationId: "evaluation-1",
          qualitativeItemCount: 2,
          wordCloudTokens: expect.arrayContaining([
            { text: "supportive", value: 1 },
            { text: "examples", value: 2 },
            { text: "improved", value: 1 },
            { text: "practical", value: 2 },
            { text: "learning", value: 2 },
            { text: "supported", value: 1 },
          ]),
        },
      ],
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(Object.keys(result.data[0] ?? {}).sort()).toEqual(
      [
        "ciloMetrics",
        "courseTitle",
        "deploymentName",
        "evaluationId",
        "overallMean",
        "programName",
        "qualitativeItemCount",
        "quantitativeQuestions",
        "responseCount",
        "status",
        "termInstanceLabel",
        "totalAssignments",
        "wordCloudTokens",
      ].sort()
    );
    expect(
      result.data[0]?.wordCloudTokens.every((token) => {
        return Object.keys(token).sort().join(",") === "text,value";
      })
    ).toBe(true);
    expect(Object.keys(result.data[0]?.ciloMetrics[0] ?? {}).sort()).toEqual(
      ["bindingId", "ciloDescription", "ciloId", "ciloLabel", "mean", "responseCount"].sort()
    );
    expect(Object.keys(result.data[0]?.quantitativeQuestions[0] ?? {}).sort()).toEqual(
      [
        "itemKey",
        "max",
        "mean",
        "min",
        "prompt",
        "responseCount",
        "sectionKey",
        "sectionTitle",
      ].sort()
    );
    expect(revalidatePathMock).toHaveBeenCalledWith("/faculty/analytics");

    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain("Supportive examples improved practical learning");
    expect(serialized).not.toContain("response-1");
    expect(serialized).not.toContain("student-1");
    expect(serialized).not.toContain("student@cloie.test");
    expect(serialized).not.toContain("second-student@cloie.test");
    expect(serialized).not.toContain("Draft answer must stay excluded");
    expect(result.data[0]?.wordCloudTokens).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ text: "draft" })])
    );
    expect(serialized).not.toContain("qualitativeTexts");
    expect(serialized).not.toContain("qual_items");
    expect(serialized).not.toContain("assignments");
  });
});
