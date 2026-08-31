import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type React from "react";
import { ProgramHeadResponsesLanding } from "@/features/analytics/components/program-head-responses-landing";

vi.mock("next/link", () => ({
  default: ({ children, ...props }: React.ComponentProps<"a">) => <a {...props}>{children}</a>,
  useLinkStatus: () => ({ pending: false }),
}));

vi.mock("@/features/analytics/components/program-head-responses-filters", () => ({
  ProgramHeadResponsesFilters: () => <div>Filters</div>,
}));

vi.mock("@/features/analytics/components/program-head-responses-pagination", () => ({
  ProgramHeadResponsesPagination: () => <div>Pagination</div>,
}));

const options = {
  periodOptions: { schoolYears: [], semesters: [], termInstances: [] },
  courses: [],
  faculty: [],
  majors: [],
  instruments: [],
};

describe("ProgramHeadResponsesLanding", () => {
  it("humanizes evidence labels and includes scale context", () => {
    render(
      <ProgramHeadResponsesLanding
        programId="program-1"
        program={{ code: "BSHM", name: "Hospitality Management" }}
        state={{ tab: "program-wide", page: 1 }}
        data={{
          total: 1,
          page: 1,
          pageSize: 20,
          options,
          items: [
            {
              id: "deployment-1",
              title: "Industry partner evaluation",
              period: "2026-2027 · 2nd Semester · 2nd Term",
              status: "ACTIVE",
              assigned: 2,
              submitted: 1,
              mean: 4.42,
              scaleLabel: "1–5 (5-point)",
              stakeholder: "INDUSTRY_PARTNER",
              target: "All eligible respondents",
            },
          ],
        }}
      />
    );

    expect(screen.getAllByText("Industry partners").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Active").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/1 of 2 submitted/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/1–5 \(5-point\)/).length).toBeGreaterThan(0);
    expect(screen.queryByText("INDUSTRY PARTNER")).not.toBeInTheDocument();
  });

  it("offers a direct recovery action when filters return no evaluations", () => {
    render(
      <ProgramHeadResponsesLanding
        programId="program-1"
        program={{ code: "BSHM", name: "Hospitality Management" }}
        state={{ tab: "course", page: 1, q: "missing" }}
        data={{ total: 0, page: 1, pageSize: 20, options, items: [] }}
      />
    );

    expect(screen.getByRole("link", { name: "Clear filters" })).toHaveAttribute(
      "href",
      "/program-head/programs/program-1/responses"
    );
  });
});
