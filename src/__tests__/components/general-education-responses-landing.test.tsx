import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type React from "react";
import { GeneralEducationResponsesLanding } from "@/features/response-review/components/general-education-responses-landing";

vi.mock("next/link", () => ({
  default: ({ children, ...props }: React.ComponentProps<"a">) => <a {...props}>{children}</a>,
  useLinkStatus: () => ({ pending: false }),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock("@/features/response-review/components/general-education-responses-pagination", () => ({
  GeneralEducationResponsesPagination: () => <div>Pagination</div>,
}));

const options = {
  periodOptions: { schoolYears: [], semesters: [], termInstances: [] },
  courses: [{ id: "course-1", label: "GEETHICS · Ethics" }],
  programs: [{ id: "program-1", label: "BSED · Education" }],
  faculty: [{ id: "faculty-1", label: "Dr. Santos" }],
  ilos: [{ id: "ilo-1", label: "ILO1 — Think critically" }],
};

const data = {
  total: 1,
  page: 1,
  pageSize: 20,
  options,
  items: [
    {
      id: "evaluation-1",
      title: "Post-Term CILO Evaluation",
      period: "2026-2027 · 2nd Semester",
      status: "ACTIVE" as const,
      assigned: 2,
      submitted: 1,
      mean: 4.31,
      scaleLabel: "1–5 (5-point)",
      course: { id: "course-1", code: "GEETHICS", title: "Ethics", major: null },
      program: "BSED · Education",
      faculty: "Dr. Santos",
      yearLevel: "THIRD_YEAR" as const,
      section: "MORNING" as const,
    },
  ],
};

describe("GeneralEducationResponsesLanding", () => {
  it("hangs each filter off the evidence column it narrows", () => {
    render(
      <GeneralEducationResponsesLanding
        state={{ page: 1 }}
        data={data}
        upwardState="termInstanceId=term-1"
      />
    );

    // The toolbar carries the search that spans columns, and nothing collects a
    // form: every facet applies from where the operator finds it.
    expect(screen.getByRole("searchbox", { name: "Search evaluations" })).toBeInTheDocument();
    expect(document.querySelector("form")).toBeNull();

    expect(
      screen
        .getAllByRole("columnheader")
        .map((heading) => heading.getAttribute("aria-label") ?? heading.textContent)
    ).toEqual(["Evaluation", "Class", "Faculty", "Period", "Status", "Submitted", "Mean"]);

    for (const column of ["Evaluation", "Class", "Faculty", "Period", "Status", "Submitted"]) {
      expect(screen.getByRole("button", { name: `Filter ${column}` })).toBeInTheDocument();
    }
  });

  it("keeps the class Program as a subline of the Class cell it narrows", () => {
    render(
      <GeneralEducationResponsesLanding
        state={{ page: 1, programId: "program-1" }}
        data={data}
        upwardState=""
      />
    );

    // The applied class Program reads as a removable chip, and the cell still
    // shows the program as the class context rather than an ownership scope.
    expect(
      screen.getByRole("button", { name: "Remove filter Class program: BSED · Education" })
    ).toBeInTheDocument();
    expect(screen.getAllByText("BSED · Education").length).toBeGreaterThan(0);
  });
});
