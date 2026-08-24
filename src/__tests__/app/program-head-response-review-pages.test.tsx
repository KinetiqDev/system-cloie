import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";

const {
  getProgramHeadCourseEvaluationDetailMock,
  getProgramHeadCentralEvaluationDetailMock,
  getProgramHeadResponseDetailMock,
  resolveProgramHeadContextMock,
} = vi.hoisted(() => ({
  getProgramHeadCourseEvaluationDetailMock: vi.fn(),
  getProgramHeadCentralEvaluationDetailMock: vi.fn(),
  getProgramHeadResponseDetailMock: vi.fn(),
  resolveProgramHeadContextMock: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("@/features/response-review/services/get-program-head-course-evaluation-detail", () => ({
  getProgramHeadCourseEvaluationDetail: getProgramHeadCourseEvaluationDetailMock,
}));

vi.mock("@/features/response-review/services/get-program-head-central-evaluation-detail", () => ({
  getProgramHeadCentralEvaluationDetail: getProgramHeadCentralEvaluationDetailMock,
}));

vi.mock("@/features/response-review/services/get-program-head-response-detail", () => ({
  getProgramHeadResponseDetail: getProgramHeadResponseDetailMock,
}));

vi.mock("@/features/auth/services/resolve-program-head-context", () => ({
  resolveProgramHeadContext: resolveProgramHeadContextMock,
}));

vi.mock("@/features/response-review/components/course-evaluation-detail", () => ({
  CourseEvaluationDetail: ({
    detail,
    responseHref,
  }: {
    detail: { evaluation: { title: string } };
    responseHref: (id: string) => string;
  }) => (
    <div>
      Course detail: {detail.evaluation.title} | response href: {responseHref("response-1")}
    </div>
  ),
}));

vi.mock("@/features/response-review/components/central-evaluation-detail", () => ({
  CentralEvaluationDetail: ({
    detail,
    responseHref,
  }: {
    detail: { evaluation: { title: string } };
    responseHref: (id: string) => string;
  }) => (
    <div>
      Central detail: {detail.evaluation.title} | response href: {responseHref("response-1")}
    </div>
  ),
}));

vi.mock("@/features/response-review/components/response-detail", () => ({
  ResponseDetail: ({
    response,
    evaluationHref,
  }: {
    response: { respondent: { name: string }; evaluation: { id: string; title: string } };
    evaluationHref: string;
  }) => (
    <div>
      Response detail: {response.respondent.name} ({response.evaluation.title}) | back: {evaluationHref}
    </div>
  ),
}));

describe("program head identified response-review pages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveProgramHeadContextMock.mockResolvedValue({
      success: true,
      data: {
        authorizedPrograms: [{ code: "BSED", id: "program-1", name: "BSED" }],
        selectedProgram: { code: "BSED", id: "program-1", name: "BSED" },
        userId: "head-1",
      },
    });
  });

  it("renders the course evaluation detail page with identified response links", async () => {
    getProgramHeadCourseEvaluationDetailMock.mockResolvedValue({
      evaluation: { title: "Post-Term CILO Evaluation" },
    });
    const Page = (
      await import("../../app/(app)/program-head/programs/[programId]/responses/course/[evaluationId]/page")
    ).default;

    const page = await Page({ params: Promise.resolve({ programId: "program-1", evaluationId: "eval-1" }) });
    render(page);

    expect(getProgramHeadCourseEvaluationDetailMock).toHaveBeenCalledWith("program-1", "eval-1");
    expect(screen.getByText("Course detail: Post-Term CILO Evaluation | response href: /program-head/programs/program-1/responses/course/eval-1/responses/response-1")).toBeInTheDocument();
  });

  it("preserves period and stakeholder scope in course evaluation respondent links", async () => {
    getProgramHeadCourseEvaluationDetailMock.mockResolvedValue({
      evaluation: { title: "Post-Term CILO Evaluation" },
    });
    const Page = (
      await import("../../app/(app)/program-head/programs/[programId]/responses/course/[evaluationId]/page")
    ).default;

    const page = await Page({
      params: Promise.resolve({ programId: "program-1", evaluationId: "eval-1" }),
      searchParams: Promise.resolve({
        termInstanceId: "11111111-1111-4111-8111-111111111111",
        stakeholder: "ALUMNI",
      }),
    });
    render(page);

    const responseHref = "Course detail: Post-Term CILO Evaluation | response href: /program-head/programs/program-1/responses/course/eval-1/responses/response-1?termInstanceId=11111111-1111-4111-8111-111111111111&stakeholder=ALUMNI";
    expect(screen.getByText(responseHref)).toBeInTheDocument();
  });

  it("returns 404 when the course evaluation is not found", async () => {
    getProgramHeadCourseEvaluationDetailMock.mockResolvedValue(null);
    const Page = (
      await import("../../app/(app)/program-head/programs/[programId]/responses/course/[evaluationId]/page")
    ).default;

    await expect(
      Page({ params: Promise.resolve({ programId: "program-1", evaluationId: "eval-missing" }) })
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("renders the program-wide evaluation detail page with identified response links", async () => {
    getProgramHeadCentralEvaluationDetailMock.mockResolvedValue({
      evaluation: { title: "Exit Survey" },
    });
    const Page = (
      await import("../../app/(app)/program-head/programs/[programId]/responses/program-wide/[deploymentId]/page")
    ).default;

    const page = await Page({ params: Promise.resolve({ programId: "program-1", deploymentId: "central-1" }) });
    render(page);

    expect(getProgramHeadCentralEvaluationDetailMock).toHaveBeenCalledWith("program-1", "central-1");
    expect(screen.getByText("Central detail: Exit Survey | response href: /program-head/programs/program-1/responses/program-wide/central-1/responses/response-1?tab=program-wide")).toBeInTheDocument();
  });

  it("returns 404 when the program-wide evaluation is not found", async () => {
    getProgramHeadCentralEvaluationDetailMock.mockResolvedValue(null);
    const Page = (
      await import("../../app/(app)/program-head/programs/[programId]/responses/program-wide/[deploymentId]/page")
    ).default;

    await expect(
      Page({ params: Promise.resolve({ programId: "program-1", deploymentId: "central-missing" }) })
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("renders the course response detail page with identified respondent name", async () => {
    getProgramHeadResponseDetailMock.mockResolvedValue({
      evaluation: {
        id: "eval-1",
        title: "Post-Term CILO Evaluation",
        type: "COURSE_BOUND",
        context: { termInstanceId: "term-1" },
      },
      respondent: { name: "Juan dela Cruz" },
    });
    const Page = (
      await import("../../app/(app)/program-head/programs/[programId]/responses/course/[evaluationId]/responses/[responseId]/page")
    ).default;

    const page = await Page({
      params: Promise.resolve({ programId: "program-1", evaluationId: "eval-1", responseId: "response-1" }),
    });
    render(page);

    expect(getProgramHeadResponseDetailMock).toHaveBeenCalledWith("program-1", "response-1");
    expect(screen.getByText("Response detail: Juan dela Cruz (Post-Term CILO Evaluation) | back: /program-head/programs/program-1/responses/course/eval-1")).toBeInTheDocument();
  });

  it("preserves period and stakeholder scope in the course response breadcrumb", async () => {
    getProgramHeadResponseDetailMock.mockResolvedValue({
      evaluation: {
        id: "eval-1",
        title: "Post-Term CILO Evaluation",
        type: "COURSE_BOUND",
        context: { termInstanceId: "term-1" },
      },
      respondent: { name: "Juan dela Cruz" },
    });
    const Page = (
      await import("../../app/(app)/program-head/programs/[programId]/responses/course/[evaluationId]/responses/[responseId]/page")
    ).default;

    const page = await Page({
      params: Promise.resolve({ programId: "program-1", evaluationId: "eval-1", responseId: "response-1" }),
      searchParams: Promise.resolve({
        termInstanceId: "11111111-1111-4111-8111-111111111111",
        courseId: "22222222-2222-4222-8222-222222222222",
        facultyId: "33333333-3333-4333-8333-333333333333",
      }),
    });
    render(page);

    const breadcrumb = screen.getByRole("navigation", { name: "Breadcrumbs" });
    const responsesLink = within(breadcrumb).getByRole("link", { name: "Responses" });
    expect(responsesLink.getAttribute("href")).toContain("termInstanceId=11111111-1111-4111-8111-111111111111");
    // Class-level filters reset on upward navigation (§12).
    expect(responsesLink.getAttribute("href")).not.toContain("courseId");
    expect(responsesLink.getAttribute("href")).not.toContain("facultyId");
    // The evaluation step keeps the same scope.
    const evaluationStep = within(breadcrumb).getByRole("link", { name: "Post-Term CILO Evaluation" });
    expect(evaluationStep.getAttribute("href")).toContain("termInstanceId=11111111-1111-4111-8111-111111111111");
    // Alternate back links keep the scope too.
    expect(screen.getByRole("link", { name: /Back to evaluation/ })).toHaveAttribute(
      "href",
      "/program-head/programs/program-1/responses/course/eval-1?termInstanceId=11111111-1111-4111-8111-111111111111"
    );
  });

  it("preserves stakeholder scope in the program-wide evaluation breadcrumb", async () => {
    getProgramHeadCentralEvaluationDetailMock.mockResolvedValue({
      evaluation: { title: "Exit Survey" },
    });
    const Page = (
      await import("../../app/(app)/program-head/programs/[programId]/responses/program-wide/[deploymentId]/page")
    ).default;

    const page = await Page({
      params: Promise.resolve({ programId: "program-1", deploymentId: "central-1" }),
      searchParams: Promise.resolve({
        termInstanceId: "11111111-1111-4111-8111-111111111111",
        stakeholder: "ALUMNI",
        section: "MORNING",
      }),
    });
    render(page);

    const breadcrumb = screen.getByRole("navigation", { name: "Breadcrumbs" });
    const responsesLink = within(breadcrumb).getByRole("link", { name: "Responses" });
    expect(responsesLink.getAttribute("href")).toContain("termInstanceId=11111111-1111-4111-8111-111111111111");
    expect(responsesLink.getAttribute("href")).toContain("stakeholder=ALUMNI");
    expect(responsesLink.getAttribute("href")).toContain("tab=program-wide");
    expect(responsesLink.getAttribute("href")).not.toContain("section");
  });

  it("returns 404 when the response does not belong to the course evaluation", async () => {
    getProgramHeadResponseDetailMock.mockResolvedValue({
      evaluation: { id: "eval-other", title: "Other" },
      respondent: { name: "Juan dela Cruz" },
    });
    const Page = (
      await import("../../app/(app)/program-head/programs/[programId]/responses/course/[evaluationId]/responses/[responseId]/page")
    ).default;

    await expect(
      Page({
        params: Promise.resolve({ programId: "program-1", evaluationId: "eval-1", responseId: "response-1" }),
      })
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("renders the program-wide response detail page with identified respondent name", async () => {
    getProgramHeadResponseDetailMock.mockResolvedValue({
      evaluation: {
        id: "central-1",
        title: "Exit Survey",
        type: "PROGRAM_WIDE",
        context: { stakeholder: "ALUMNI", termInstanceId: "term-1" },
      },
      respondent: { name: "Maria Gomez" },
    });
    const Page = (
      await import("../../app/(app)/program-head/programs/[programId]/responses/program-wide/[deploymentId]/responses/[responseId]/page")
    ).default;

    const page = await Page({
      params: Promise.resolve({ programId: "program-1", deploymentId: "central-1", responseId: "response-1" }),
    });
    render(page);

    expect(getProgramHeadResponseDetailMock).toHaveBeenCalledWith("program-1", "response-1");
    expect(screen.getByText("Response detail: Maria Gomez (Exit Survey) | back: /program-head/programs/program-1/responses/program-wide/central-1?tab=program-wide&stakeholder=ALUMNI")).toBeInTheDocument();
  });

  it("returns 404 when the response does not belong to the program-wide deployment", async () => {
    getProgramHeadResponseDetailMock.mockResolvedValue({
      evaluation: { id: "central-other", title: "Other" },
      respondent: { name: "Maria Gomez" },
    });
    const Page = (
      await import("../../app/(app)/program-head/programs/[programId]/responses/program-wide/[deploymentId]/responses/[responseId]/page")
    ).default;

    await expect(
      Page({
        params: Promise.resolve({ programId: "program-1", deploymentId: "central-1", responseId: "response-1" }),
      })
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("returns 404 when the response service rejects (cross-Program guess)", async () => {
    getProgramHeadResponseDetailMock.mockResolvedValue(null);
    const Page = (
      await import("../../app/(app)/program-head/programs/[programId]/responses/course/[evaluationId]/responses/[responseId]/page")
    ).default;

    await expect(
      Page({
        params: Promise.resolve({ programId: "program-1", evaluationId: "eval-1", responseId: "response-1" }),
      })
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });
});