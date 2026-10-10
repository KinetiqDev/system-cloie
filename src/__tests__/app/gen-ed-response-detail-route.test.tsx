import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";

const { getGenEdResponseDetailMock } = vi.hoisted(() => ({
  getGenEdResponseDetailMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("@/features/response-review/services/get-gen-ed-response-detail", () => ({
  getGenEdResponseDetail: getGenEdResponseDetailMock,
}));

import type { IdentifiedSubmittedResponseDetail } from "@/features/response-review/types";
import GenEdCourseResponseDetailPage from "../../app/(app)/gen-ed-coordinator/responses/course/[evaluationId]/responses/[responseId]/page";

const TERM_INSTANCE = "11111111-1111-4111-8111-111111111111";
const SCHOOL_YEAR = "22222222-2222-4222-8222-222222222222";
const ILO = "33333333-3333-4333-8333-333333333333";

function responseDetail(): IdentifiedSubmittedResponseDetail {
  return {
    responseId: "response-1",
    submittedAt: new Date("2026-08-24T00:00:00Z"),
    respondent: { id: "student-1", name: "Patricia Luna", stakeholder: "STUDENT" },
    evaluation: {
      id: "eval-ge",
      type: "COURSE_BOUND",
      title: "GEETHICS Post-Term CILO Evaluation",
      context: {
        courseCode: "GEETHICS",
        courseTitle: "Ethics",
        facultyName: "Dr. Santos",
        yearLevel: "THIRD_YEAR",
        section: "MORNING",
        majorLabel: null,
        periodLabel: "2025-2026 · 2nd Semester · 1st Term",
        termInstanceId: TERM_INSTANCE,
      },
    },
    quantitativeMean: 4.5,
    sections: [
      {
        key: "teaching",
        title: "Teaching",
        items: [
          {
            kind: "quantitative",
            itemKey: "clarity",
            prompt: "Clarity of instructions",
            rating: 5,
            scale: [1, 2, 3, 4, 5],
            descriptorLabels: [null, null, null, null, null],
            // General Education CILOs align to Institutional Learning
            // Outcomes, so the binding carries ILO rows and no PO data.
            binding: {
              type: "CILO",
              layer: "INSTITUTIONAL_OUTCOME",
              ciloId: "cilo-1",
              ciloLabel: "CILO 1",
              iloMappings: [
                {
                  iloId: ILO,
                  iloCode: "ILO1",
                  iloDescription: "Think critically",
                  manifestation: "LEARNING",
                },
              ],
            },
          },
        ],
      },
    ],
  };
}

async function renderRoute(
  params: { evaluationId: string; responseId: string },
  searchParams: Record<string, string | string[] | undefined> = {}
) {
  render(
    await GenEdCourseResponseDetailPage({
      params: Promise.resolve(params),
      searchParams: Promise.resolve(searchParams),
    })
  );
}

describe("gen-ed-coordinator course response detail route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getGenEdResponseDetailMock.mockResolvedValue(responseDetail());
  });

  it("renders the identified respondent and the college-wide evidence traces", async () => {
    await renderRoute({ evaluationId: "eval-ge", responseId: "response-1" });

    expect(getGenEdResponseDetailMock).toHaveBeenCalledWith("response-1");
    expect(screen.getByRole("heading", { level: 1, name: "Patricia Luna" })).toBeInTheDocument();
    expect(document.querySelector('[data-slot="card-title"]')).toHaveTextContent(
      "GEETHICS Post-Term CILO Evaluation"
    );
    expect(screen.getByText("Clarity of instructions")).toBeInTheDocument();
    expect(screen.getByText("GEETHICS — Ethics")).toBeInTheDocument();

    const destinations = screen.getByRole("navigation", { name: "Response destinations" });
    expect(
      within(destinations).getByRole("link", { name: "View evaluation results" })
    ).toHaveAttribute("href", "/gen-ed-coordinator/responses/course/eval-ge");
    // Both the page trace and the answer badge resolve into the Coordinator's
    // own Analytics workspace for this response's term, so a link can never
    // land on a scope the evidence did not come from.
    expect(within(destinations).getByRole("link", { name: "Open Analytics" })).toHaveAttribute(
      "href",
      `/gen-ed-coordinator/analytics?termInstanceId=${TERM_INSTANCE}`
    );
    const iloLink = screen.getByRole("link", { name: "ILO1 (LEARNING)" });
    expect(iloLink).toHaveAttribute(
      "href",
      `/gen-ed-coordinator/analytics?termInstanceId=${TERM_INSTANCE}&iloId=${ILO}`
    );
  });

  it("keeps the academic-period scope on upward links and resets class-level filters", async () => {
    await renderRoute(
      { evaluationId: "eval-ge", responseId: "response-1" },
      {
        termInstanceId: TERM_INSTANCE,
        schoolYearId: SCHOOL_YEAR,
        semester: "SECOND",
        courseId: "44444444-4444-4444-8444-444444444444",
        facultyId: "55555555-5555-4555-8555-555555555555",
        yearLevel: "THIRD_YEAR",
        section: "MORNING",
      }
    );

    const scoped = `?termInstanceId=${TERM_INSTANCE}&schoolYearId=${SCHOOL_YEAR}&semester=SECOND`;
    const breadcrumb = screen.getByRole("navigation", { name: "Breadcrumbs" });
    for (const label of ["Responses", "Course evaluations"]) {
      expect(within(breadcrumb).getByRole("link", { name: label })).toHaveAttribute(
        "href",
        `/gen-ed-coordinator/responses${scoped}`
      );
    }
    expect(
      within(breadcrumb).getByRole("link", { name: "GEETHICS Post-Term CILO Evaluation" })
    ).toHaveAttribute("href", `/gen-ed-coordinator/responses/course/eval-ge${scoped}`);

    const destinations = screen.getByRole("navigation", { name: "Response destinations" });
    // Analytics scopes on the response's own term, so the term facet is
    // carried; school year and semester are Responses-only params and are
    // deliberately not forwarded into a workspace that cannot read them.
    expect(within(destinations).getByRole("link", { name: "Open Analytics" })).toHaveAttribute(
      "href",
      `/gen-ed-coordinator/analytics?termInstanceId=${TERM_INSTANCE}`
    );
    // Class-level filters reset on upward navigation.
    for (const link of [
      within(destinations).getByRole("link", { name: "View evaluation results" }),
      screen.getByRole("link", { name: "ILO1 (LEARNING)" }),
    ]) {
      const href = link.getAttribute("href") ?? "";
      expect(href).not.toContain("courseId");
      expect(href).not.toContain("facultyId");
      expect(href).not.toContain("yearLevel");
      expect(href).not.toContain("section");
    }
  });

  it("rejects a response that belongs to a different evaluation", async () => {
    await expect(
      GenEdCourseResponseDetailPage({
        params: Promise.resolve({ evaluationId: "eval-other", responseId: "response-1" }),
        searchParams: Promise.resolve({}),
      })
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("rejects an unauthorized or missing response", async () => {
    getGenEdResponseDetailMock.mockResolvedValue(null);

    await expect(
      GenEdCourseResponseDetailPage({
        params: Promise.resolve({ evaluationId: "eval-ge", responseId: "response-guessed" }),
        searchParams: Promise.resolve({}),
      })
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });
});
