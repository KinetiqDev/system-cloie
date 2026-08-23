import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

const {
  listCourseBoundReviewItemsMock,
  getCourseBoundReviewDetailMock,
  getCourseBoundResponseReviewMock,
  resolveProgramHeadContextMock,
  resolveLegacyCourseEvaluationMock,
  resolveLegacyCourseResponseMock,
} = vi.hoisted(() => ({
  getCourseBoundResponseReviewMock: vi.fn(),
  getCourseBoundReviewDetailMock: vi.fn(),
  listCourseBoundReviewItemsMock: vi.fn(),
  resolveProgramHeadContextMock: vi.fn(),
  resolveLegacyCourseEvaluationMock: vi.fn(),
  resolveLegacyCourseResponseMock: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

const redirectMock = vi.hoisted(() =>
  vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  })
);

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  redirect: redirectMock,
}));

vi.mock("@/features/analytics/services/list-course-bound-review-items", () => ({
  listCourseBoundReviewItems: listCourseBoundReviewItemsMock,
}));

vi.mock("@/features/analytics/services/get-course-bound-review-detail", () => ({
  getCourseBoundReviewDetail: getCourseBoundReviewDetailMock,
}));

vi.mock("@/features/analytics/services/get-course-bound-response-review", () => ({
  getCourseBoundResponseReview: getCourseBoundResponseReviewMock,
}));

vi.mock("@/features/auth/services/resolve-program-head-context", () => ({
  resolveProgramHeadContext: resolveProgramHeadContextMock,
}));
vi.mock("@/features/analytics/services/resolve-legacy-cilo-review-redirect", () => ({
  resolveLegacyCourseEvaluation: resolveLegacyCourseEvaluationMock,
  resolveLegacyCourseResponse: resolveLegacyCourseResponseMock,
}));

vi.mock("@/features/analytics/components/published-course-bound-list", () => ({
  PublishedCourseBoundList: ({ title }: { title: string }) => <div>Published list: {title}</div>,
}));

vi.mock("@/features/analytics/components/course-bound-review-tabs", () => ({
  CourseBoundReviewTabs: ({ responseBasePath }: { responseBasePath: string }) => (
    <div>Tabs base path: {responseBasePath}</div>
  ),
}));

vi.mock("@/features/analytics/components/anonymized-response-detail", () => ({
  AnonymizedResponseDetail: ({
    response,
  }: {
    response: { evaluationTitle: string; respondentLabel: string };
  }) => (
    <div>
      Response detail: {response.evaluationTitle} ({response.respondentLabel})
    </div>
  ),
}));

const reviewList = [
  {
    academicYear: "2025-2026",
    courseTitle: "Capstone 2",
    deadlineAt: new Date("2026-01-10T10:00:00.000Z"),
    evaluationId: "eval-1",
    evaluationTitle: "Post-Term CILO Evaluation Tool",
    overallMean: 4.25,
    programLabel: "BSIT",
    responseCount: 20,
    reviewerRole: "FACULTY" as const,
    semester: "2ND",
    term: "REGULAR",
  },
];

const reviewDetail = {
  ...reviewList[0],
  responseCards: [
    {
      overallMean: 4.2,
      responseId: "response-1",
      respondentLabel: "Respondent R-827493",
      submittedAt: new Date("2026-01-05T08:00:00.000Z"),
    },
  ],
  sections: [
    {
      id: "teaching",
      mean: 4.2,
      name: "Teaching",
      qualitativePromptCount: 1,
      quantitativeQuestionCount: 1,
      questions: [{ itemKey: "clarity", mean: 4.2, prompt: "Clarity" }],
    },
  ],
  wordCloudTokens: [{ text: "clear", value: 2 }],
};

const responseDetail = {
  academicYear: "2025-2026",
  courseTitle: "Capstone 2",
  evaluationId: "eval-1",
  evaluationTitle: "Post-Term CILO Evaluation Tool",
  overallMean: 4.2,
  programLabel: "BSIT",
  responseId: "response-1",
  respondentLabel: "Respondent R-827493",
  reviewerRole: "FACULTY" as const,
  sections: [
    {
      id: "teaching",
      mean: 4.2,
      name: "Teaching",
      qualitativeResponses: [{ prompt: "Remarks", promptKey: "remarks", text: "Very clear." }],
      quantitativeResponses: [{ itemKey: "clarity", prompt: "Clarity", rating: 4 }],
    },
  ],
  submittedAt: new Date("2026-01-05T08:00:00.000Z"),
};

describe("reviewer course-bound pages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listCourseBoundReviewItemsMock.mockResolvedValue(reviewList);
    getCourseBoundReviewDetailMock.mockResolvedValue(reviewDetail);
    getCourseBoundResponseReviewMock.mockResolvedValue(responseDetail);
    resolveProgramHeadContextMock.mockResolvedValue({
      success: true,
      data: {
        authorizedPrograms: [
          { code: "BSED", id: "program-1", name: "Bachelor of Secondary Education" },
        ],
        selectedProgram: {
          code: "BSED",
          id: "program-1",
          name: "Bachelor of Secondary Education",
        },
        userId: "head-1",
      },
    });
  });

  it("renders faculty detail page with shared tabs", async () => {
    const FacultyEvaluationPage = (
      await import("../../app/(app)/faculty/cilo-evaluations/[evaluationId]/page")
    ).default;
    const page = await FacultyEvaluationPage({
      params: Promise.resolve({ evaluationId: "eval-1" }),
    });

    render(page);

    expect(getCourseBoundReviewDetailMock).toHaveBeenCalledWith("eval-1");
    expect(
      screen.getByText("Tabs base path: /faculty/cilo-evaluations/eval-1")
    ).toBeInTheDocument();
  });

  it("renders faculty response page with read-only anonymized response detail", async () => {
    const FacultyResponsePage = (
      await import("../../app/(app)/faculty/cilo-evaluations/[evaluationId]/responses/[responseId]/page")
    ).default;
    const page = await FacultyResponsePage({
      params: Promise.resolve({ evaluationId: "eval-1", responseId: "response-1" }),
    });

    render(page);

    expect(getCourseBoundResponseReviewMock).toHaveBeenCalledWith("response-1");
    expect(
      screen.getByText("Response detail: Post-Term CILO Evaluation Tool (Respondent R-827493)")
    ).toBeInTheDocument();
  });

  it("redirects the selected Program review route to Responses", async () => {
    const ProgramHeadListPage = (await import("../../app/(app)/program-head/programs/[programId]/cilo-reviews/page")).default;
    await expect(ProgramHeadListPage({ params: Promise.resolve({ programId: "program-1" }) })).rejects.toThrow(
      "NEXT_REDIRECT:/program-head/programs/program-1/responses"
    );
  });

  it("redirects resolvable selected Program evaluation routes to canonical Responses", async () => {
    resolveLegacyCourseEvaluationMock.mockResolvedValueOnce("eval-1");
    const ProgramHeadDetailPage = (await import("../../app/(app)/program-head/programs/[programId]/cilo-reviews/[evaluationId]/page")).default;
    await expect(ProgramHeadDetailPage({ params: Promise.resolve({ evaluationId: "eval-1", programId: "program-1" }) })).rejects.toThrow(
      "NEXT_REDIRECT:/program-head/programs/program-1/responses/course/eval-1"
    );

    resolveLegacyCourseResponseMock.mockResolvedValueOnce("response-1");
    const ProgramHeadResponsePage = (await import("../../app/(app)/program-head/programs/[programId]/cilo-reviews/[evaluationId]/responses/[responseId]/page")).default;
    await expect(ProgramHeadResponsePage({ params: Promise.resolve({ evaluationId: "eval-1", programId: "program-1", responseId: "response-1" }) })).rejects.toThrow(
      "NEXT_REDIRECT:/program-head/programs/program-1/responses/course/eval-1/responses/response-1"
    );
  });

  it("falls back to the Responses landing for unresolved legacy resources", async () => {
    resolveLegacyCourseEvaluationMock.mockResolvedValueOnce(null);
    const ProgramHeadDetailPage = (await import("../../app/(app)/program-head/programs/[programId]/cilo-reviews/[evaluationId]/page")).default;
    await expect(ProgramHeadDetailPage({ params: Promise.resolve({ evaluationId: "eval-2", programId: "program-1" }) })).rejects.toThrow(
      "NEXT_REDIRECT:/program-head/programs/program-1/responses"
    );
  });
});
