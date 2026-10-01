import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

const {
  resolveProgramHeadContextMock,
  resolveLegacyCourseEvaluationMock,
  resolveLegacyCourseResponseMock,
} = vi.hoisted(() => ({
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

vi.mock("@/features/auth/services/resolve-program-head-context", () => ({
  resolveProgramHeadContext: resolveProgramHeadContextMock,
}));
vi.mock("@/features/analytics/services/resolve-legacy-cilo-review-redirect", () => ({
  resolveLegacyCourseEvaluation: resolveLegacyCourseEvaluationMock,
  resolveLegacyCourseResponse: resolveLegacyCourseResponseMock,
}));

describe("reviewer course-bound pages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it("redirects retired Faculty evaluation detail to aggregate Analytics", async () => {
    const FacultyEvaluationPage = (
      await import("../../app/(app)/faculty/cilo-evaluations/[evaluationId]/page")
    ).default;

    await expect(
      FacultyEvaluationPage({ params: Promise.resolve({ evaluationId: "eval-1" }) })
    ).rejects.toThrow("NEXT_REDIRECT:/faculty/analytics?evaluationId=eval-1");
  });

  it("redirects retired Faculty individual responses to aggregate Analytics", async () => {
    const FacultyResponsePage = (
      await import("../../app/(app)/faculty/cilo-evaluations/[evaluationId]/responses/[responseId]/page")
    ).default;

    await expect(
      FacultyResponsePage({
        params: Promise.resolve({ evaluationId: "eval-1", responseId: "response-1" }),
      })
    ).rejects.toThrow("NEXT_REDIRECT:/faculty/analytics?evaluationId=eval-1");
  });

  it("redirects the selected Program review route to Responses", async () => {
    const ProgramHeadListPage = (
      await import("../../app/(app)/program-head/programs/[programId]/cilo-reviews/page")
    ).default;
    await expect(
      ProgramHeadListPage({ params: Promise.resolve({ programId: "program-1" }) })
    ).rejects.toThrow("NEXT_REDIRECT:/program-head/programs/program-1/responses");
  });

  it("redirects resolvable selected Program evaluation routes to canonical Responses", async () => {
    resolveLegacyCourseEvaluationMock.mockResolvedValueOnce("eval-1");
    const ProgramHeadDetailPage = (
      await import("../../app/(app)/program-head/programs/[programId]/cilo-reviews/[evaluationId]/page")
    ).default;
    await expect(
      ProgramHeadDetailPage({
        params: Promise.resolve({ evaluationId: "eval-1", programId: "program-1" }),
      })
    ).rejects.toThrow("NEXT_REDIRECT:/program-head/programs/program-1/responses/course/eval-1");

    resolveLegacyCourseResponseMock.mockResolvedValueOnce("response-1");
    const ProgramHeadResponsePage = (
      await import("../../app/(app)/program-head/programs/[programId]/cilo-reviews/[evaluationId]/responses/[responseId]/page")
    ).default;
    await expect(
      ProgramHeadResponsePage({
        params: Promise.resolve({
          evaluationId: "eval-1",
          programId: "program-1",
          responseId: "response-1",
        }),
      })
    ).rejects.toThrow(
      "NEXT_REDIRECT:/program-head/programs/program-1/responses/course/eval-1/responses/response-1"
    );
  });

  it("falls back to the Responses landing for unresolved legacy resources", async () => {
    resolveLegacyCourseEvaluationMock.mockResolvedValueOnce(null);
    const ProgramHeadDetailPage = (
      await import("../../app/(app)/program-head/programs/[programId]/cilo-reviews/[evaluationId]/page")
    ).default;
    await expect(
      ProgramHeadDetailPage({
        params: Promise.resolve({ evaluationId: "eval-2", programId: "program-1" }),
      })
    ).rejects.toThrow("NEXT_REDIRECT:/program-head/programs/program-1/responses");
  });
});
