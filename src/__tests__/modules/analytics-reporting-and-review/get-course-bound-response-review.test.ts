import { beforeEach, describe, expect, it, vi } from "vitest";

import { ROLES } from "@/lib/constants/roles";
import { getCourseBoundResponseReview } from "@/features/analytics/services/get-course-bound-response-review";

const { responseFindFirstMock, resolveAuthSessionMock, resolveReviewerProgramScopeMock } =
  vi.hoisted(() => ({
    responseFindFirstMock: vi.fn(),
    resolveAuthSessionMock: vi.fn(),
    resolveReviewerProgramScopeMock: vi.fn(),
  }));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    response: {
      findFirst: responseFindFirstMock,
    },
  },
}));

vi.mock("@/features/auth/services/resolve-auth-session", () => ({
  resolveAuthSession: resolveAuthSessionMock,
}));

vi.mock("@/features/academic-structure/services/resolve-reviewer-program-scope", () => ({
  resolveReviewerProgramScope: resolveReviewerProgramScopeMock,
}));

describe("getCourseBoundResponseReview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when no reviewer role is present", async () => {
    resolveAuthSessionMock.mockResolvedValue({ activeRole: ROLES.STUDENT, roles: [ROLES.STUDENT], userId: "user-1" });

    await expect(getCourseBoundResponseReview("response-1")).resolves.toBeNull();
    expect(responseFindFirstMock).not.toHaveBeenCalled();
  });

  it("returns response detail with anonymized respondent label and section means", async () => {
    resolveAuthSessionMock.mockResolvedValue({ activeRole: ROLES.FACULTY, roles: [ROLES.FACULTY], userId: "faculty-1" });
    resolveReviewerProgramScopeMock.mockResolvedValue(["program-1"]);
    responseFindFirstMock.mockResolvedValue({
      assignment: {
        course_bound: {
          id: "eval-1",
          instrument: {
            structure_snapshot: [
              {
                items: [
                  {
                    key: "clarity",
                    kind: "quantitative",
                    prompt: "Clarity",
                    scale: [1, 2, 3, 4, 5],
                  },
                  { key: "remarks", kind: "qualitative", prompt: "Remarks" },
                ],
                key: "teaching",
                title: "Teaching",
              },
            ],
            template: { name: "Post-Term CILO Evaluation Tool" },
          },
          course_assignment: {
            course: { title: "Capstone 2", major: null },
            program: { id: "program-1", name: "BSIT" },
            term_instance: {
              semester: "SECOND",
              term: "FIRST_TERM",
              school_year: { code: "2025-2026" },
            },
          },
        },
      },
      id: "response-1",
      qual_items: [
        { prompt_key: "remarks", section_key: "teaching", text_content: "Helpful examples" },
      ],
      quant_items: [{ item_key: "clarity", rating_value: 4, section_key: "teaching" }],
      submitted_at: new Date("2026-01-04T08:00:00.000Z"),
    });

    await expect(getCourseBoundResponseReview("response-1")).resolves.toEqual({
      termInstanceLabel: "2025-2026 — SECOND — FIRST_TERM",
      courseTitle: "Capstone 2",
      evaluationId: "eval-1",
      evaluationTitle: "Post-Term CILO Evaluation Tool",
      overallMean: 4,
      programLabel: "BSIT",
      responseId: "response-1",
      respondentLabel: "Respondent R-827493",
      reviewerRole: ROLES.FACULTY,
      sections: [
        {
          id: "teaching",
          mean: 4,
          name: "Teaching",
          qualitativeResponses: [
            { prompt: "Remarks", promptKey: "remarks", text: "Helpful examples" },
          ],
          quantitativeResponses: [{ itemKey: "clarity", prompt: "Clarity", rating: 4 }],
        },
      ],
      submittedAt: new Date("2026-01-04T08:00:00.000Z"),
    });

    expect(responseFindFirstMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "response-1",
          status: "SUBMITTED",
          assignment: {
            course_bound: {
              course_assignment: {
                faculty_id: "faculty-1",
                program_id: { in: ["program-1"] },
              },
            },
          },
        }),
      })
    );
  });

  it("returns null when reviewer scope resolves to empty set", async () => {
    resolveAuthSessionMock.mockResolvedValue({ activeRole: ROLES.FACULTY, roles: [ROLES.FACULTY], userId: "faculty-1" });
    resolveReviewerProgramScopeMock.mockResolvedValue([]);

    await expect(getCourseBoundResponseReview("response-1")).resolves.toBeNull();
    expect(responseFindFirstMock).not.toHaveBeenCalled();
  });

  it("does not add program filter for deans", async () => {
    resolveAuthSessionMock.mockResolvedValue({ activeRole: ROLES.DEAN, roles: [ROLES.DEAN], userId: "dean-1" });
    resolveReviewerProgramScopeMock.mockResolvedValue(null);
    responseFindFirstMock.mockResolvedValue(null);

    await expect(getCourseBoundResponseReview("response-1")).resolves.toBeNull();
    expect(responseFindFirstMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          assignment: {
            course_bound: {},
          },
        }),
      })
    );
  });

  it("returns null means for empty quantitative response datasets", async () => {
    resolveAuthSessionMock.mockResolvedValue({ activeRole: ROLES.FACULTY, roles: [ROLES.FACULTY], userId: "faculty-1" });
    resolveReviewerProgramScopeMock.mockResolvedValue(["program-1"]);
    responseFindFirstMock.mockResolvedValue({
      assignment: {
        course_bound: {
          id: "eval-1",
          instrument: {
            structure_snapshot: [
              {
                items: [
                  {
                    key: "clarity",
                    kind: "quantitative",
                    prompt: "Clarity",
                    scale: [1, 2, 3, 4, 5],
                  },
                ],
                key: "teaching",
                title: "Teaching",
              },
            ],
            template: { name: "Post-Term CILO Evaluation Tool" },
          },
          course_assignment: {
            course: { title: "Capstone 2", major: null },
            program: { id: "program-1", name: "BSIT" },
            term_instance: {
              semester: "SECOND",
              term: null,
              school_year: { code: "2025-2026" },
            },
          },
        },
      },
      id: "response-1",
      qual_items: [],
      quant_items: [],
      submitted_at: new Date("2026-01-04T08:00:00.000Z"),
    });

    await expect(getCourseBoundResponseReview("response-1")).resolves.toEqual(
      expect.objectContaining({
        overallMean: null,
        sections: [
          expect.objectContaining({
            mean: null,
          }),
        ],
      })
    );
  });
});
