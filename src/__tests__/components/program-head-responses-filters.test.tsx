const { pushMock, navState } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  navState: { isPending: false },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));
vi.mock("@/features/analytics/components/program-head-responses-workspace", () => ({
  useProgramHeadResponsesNavigation: () => ({ isPending: navState.isPending, navigate: pushMock }),
}));

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProgramHeadResponsesFilters } from "@/features/analytics/components/program-head-responses-filters";

const options = {
  periodOptions: { schoolYears: [], semesters: [], termInstances: [] },
  courses: [],
  faculty: [],
  majors: [],
  instruments: [],
};

describe("ProgramHeadResponsesFilters", () => {
  beforeEach(() => {
    pushMock.mockReset();
    navState.isPending = false;
  });

  it("applies filters through soft App Router navigation instead of a document reload", () => {
    const { container } = render(
      <ProgramHeadResponsesFilters
        programId="program-1"
        state={{ tab: "program-wide", page: 1, status: "ACTIVE" }}
        options={options}
      />
    );

    expect(container.querySelector("form")?.getAttribute("method")).toBeNull();

    fireEvent.click(screen.getAllByRole("button", { name: "Apply filters" })[0]);

    expect(pushMock).toHaveBeenCalledWith(
      "/program-head/programs/program-1/responses?tab=program-wide&status=ACTIVE"
    );
  });

  it("resets to the first page when applying filters", () => {
    render(
      <ProgramHeadResponsesFilters
        programId="program-1"
        state={{ tab: "course", page: 3 }}
        options={options}
      />
    );

    fireEvent.click(screen.getAllByRole("button", { name: "Apply filters" })[0]);

    expect(pushMock).toHaveBeenCalledWith("/program-head/programs/program-1/responses");
  });

  it("marks the form busy while the evidence region reloads", () => {
    navState.isPending = true;
    const { container } = render(
      <ProgramHeadResponsesFilters
        programId="program-1"
        state={{ tab: "program-wide", page: 1 }}
        options={options}
      />
    );

    const apply = screen.getAllByRole("button", { name: /Applying filters/ })[0];
    expect(apply).toBeDisabled();
    expect(container.querySelector("form")?.getAttribute("aria-busy")).toBe("true");
  });

  it("keeps mounted selects controlled when soft navigation delivers new filters", () => {
    const errors: unknown[][] = [];
    const spy = vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
      errors.push(args);
    });
    try {
      const view = render(
        <ProgramHeadResponsesFilters
          programId="program-1"
          state={{ tab: "program-wide", page: 1 }}
          options={options}
        />
      );
      view.rerender(
        <ProgramHeadResponsesFilters
          programId="program-1"
          state={{ tab: "program-wide", page: 1, status: "ACTIVE" }}
          options={options}
        />
      );
      expect(
        errors.filter((args) =>
          String(args[0] ?? "").includes("changing the default value state of an uncontrolled")
        )
      ).toEqual([]);
    } finally {
      spy.mockRestore();
    }
  });

  it("right-aligns the filter card actions", () => {
    render(
      <ProgramHeadResponsesFilters
        programId="program-1"
        state={{ tab: "program-wide", page: 1 }}
        options={options}
      />
    );

    const actions = screen.getAllByRole("button", { name: "Apply filters" })[0].closest("div");
    expect(actions?.className).toContain("justify-end");
  });
});
