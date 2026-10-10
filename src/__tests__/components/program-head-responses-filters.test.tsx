import { beforeEach, describe, expect, it, vi } from "vitest";

const { pushMock, navState } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  navState: { isPending: false },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));
vi.mock("@/features/response-review/components/responses-workspace", () => ({
  useResponsesNavigation: () => ({ isPending: navState.isPending, navigate: pushMock }),
}));

import { fireEvent, render, screen, within } from "@testing-library/react";
import { Table, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  ProgramHeadResponsesFilters,
  ProgramHeadResponsesTableHead,
} from "@/features/analytics/components/program-head-responses-filters";
import type { ProgramHeadResponsesFilterState } from "@/features/analytics/services/program-head-responses-state";

const TERM_INSTANCE = "11111111-1111-4111-8111-111111111111";
const COURSE = "22222222-2222-4222-8222-222222222222";
const FACULTY = "33333333-3333-4333-8333-333333333333";
const MAJOR = "44444444-4444-4444-8444-444444444444";
const INSTRUMENT = "55555555-5555-4555-8555-555555555555";
const SCHOOL_YEAR = "66666666-6666-4666-8666-666666666666";

const options = {
  periodOptions: {
    schoolYears: [],
    semesters: [],
    termInstances: [
      {
        id: TERM_INSTANCE,
        schoolYearId: SCHOOL_YEAR,
        schoolYearLabel: "2025-2026",
        semester: "SECOND",
        semesterLabel: "2nd Semester",
        termLabel: null,
        label: "2025-2026 · 2nd Semester",
      },
    ],
  },
  courses: [{ id: COURSE, label: "EDUC 101 · Foundations" }],
  faculty: [{ id: FACULTY, label: "Dr. Santos" }],
  majors: [{ id: MAJOR, label: "Elementary Education" }],
  instruments: [{ id: INSTRUMENT, label: "Program Exit Survey" }],
};

/**
 * The surface as the landing composes it: the toolbar above the evidence and
 * the table's own filterable headings below it. The headings are where each
 * facet lives, so the test renders both rather than the toolbar alone.
 */
function renderFilters(state: ProgramHeadResponsesFilterState, isCourse = state.tab === "course") {
  return render(
    <>
      <ProgramHeadResponsesFilters programId="program-1" state={state} options={options} />
      <Table label="Evaluation evidence">
        <TableHeader>
          <TableRow>
            <ProgramHeadResponsesTableHead
              programId="program-1"
              state={state}
              options={options}
              isCourse={isCourse}
            />
            <TableHead className="w-[11%] text-right">Mean / scale</TableHead>
          </TableRow>
        </TableHeader>
      </Table>
    </>
  );
}

/** Opens one column's funnel and picks a value from it, the way it is used. */
async function chooseFacetOption(columnName: string, optionName: string) {
  fireEvent.click(screen.getByRole("button", { name: `Filter ${columnName}` }));
  fireEvent.click(await screen.findByRole("radio", { name: optionName }));
}

describe("ProgramHeadResponsesFilters", () => {
  beforeEach(() => {
    pushMock.mockReset();
    navState.isPending = false;
    vi.useRealTimers();
  });

  it("applies each facet from its column instead of waiting for a submit", async () => {
    renderFilters({ tab: "program-wide", page: 1, status: "ACTIVE" });

    expect(document.querySelector("form")).toBeNull();
    expect(screen.queryByRole("button", { name: /Apply/ })).toBeNull();

    await chooseFacetOption("Stakeholder", "Industry partners");

    expect(pushMock).toHaveBeenCalledTimes(1);
    expect(pushMock).toHaveBeenCalledWith(
      "/program-head/programs/program-1/responses?tab=program-wide&stakeholder=INDUSTRY_PARTNER&status=ACTIVE"
    );
  });

  it("resets to the first page on every facet change", async () => {
    renderFilters({ tab: "course", page: 3 });

    await chooseFacetOption("Faculty", "Dr. Santos");

    expect(pushMock).toHaveBeenCalledWith(
      "/program-head/programs/program-1/responses?facultyId=33333333-3333-4333-8333-333333333333"
    );
  });

  it("keeps the school year and semester the tab carries with no control here", async () => {
    renderFilters({
      tab: "course",
      page: 2,
      schoolYearId: SCHOOL_YEAR,
      semester: "SECOND",
    });

    await chooseFacetOption("Evaluation", "EDUC 101 · Foundations");

    expect(pushMock).toHaveBeenCalledWith(
      `/program-head/programs/program-1/responses?schoolYearId=${SCHOOL_YEAR}&semester=SECOND&courseId=${COURSE}`
    );
  });

  it("keeps the view tab across a facet change instead of switching views", async () => {
    renderFilters({ tab: "program-wide", page: 1 });

    await chooseFacetOption("Target", "Elementary Education");

    expect(pushMock).toHaveBeenCalledWith(
      "/program-head/programs/program-1/responses?tab=program-wide&majorId=44444444-4444-4444-8444-444444444444"
    );
  });

  it("hides the Course-bound facets that mean nothing on Program-wide evidence", () => {
    renderFilters({ tab: "program-wide", page: 1 }, false);

    expect(screen.queryByRole("button", { name: "Filter Faculty" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Filter Target" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Filter Stakeholder" })).toBeInTheDocument();
  });

  it("keeps the Course-bound Major filter reachable from the toolbar", async () => {
    renderFilters({ tab: "course", page: 1, majorId: MAJOR });

    const trigger = screen.getByRole("button", { name: /^More filters/ });
    expect(
      screen.getByRole("button", {
        name: "Remove filter Major: Elementary Education",
      })
    ).toBeInTheDocument();

    fireEvent.click(trigger);
    fireEvent.click(await screen.findByRole("radio", { name: "All majors" }));

    expect(pushMock).toHaveBeenCalledWith("/program-head/programs/program-1/responses");
  });

  it("keeps the Program-wide instrument filter reachable from the toolbar", async () => {
    renderFilters({ tab: "program-wide", page: 1 }, false);

    // No column owns the instrument, so it stays reachable from the toolbar.
    fireEvent.click(screen.getByRole("button", { name: /^More filters/ }));
    fireEvent.click(await screen.findByRole("radio", { name: "Program Exit Survey" }));

    expect(pushMock).toHaveBeenCalledWith(
      `/program-head/programs/program-1/responses?tab=program-wide&instrumentTemplateId=${INSTRUMENT}`
    );
  });

  it("opens both Target facts under the one column they compose", async () => {
    renderFilters({ tab: "program-wide", page: 1 }, false);

    fireEvent.click(screen.getByRole("button", { name: "Filter Target" }));
    await screen.findAllByRole("radio");
    expect(screen.getAllByRole("radio").map((row) => row.closest("label")?.textContent)).toEqual([
      "All majors",
      "Elementary Education",
      "All year levels",
      "1st Year",
      "2nd Year",
      "3rd Year",
      "4th Year",
    ]);
  });

  it("reads the submitted bucket as a count, not a lifecycle stage", async () => {
    renderFilters({ tab: "course", page: 1 });

    await chooseFacetOption("Submitted", "Fully submitted");

    expect(pushMock).toHaveBeenCalledWith(
      "/program-head/programs/program-1/responses?completion=complete"
    );
  });

  it("clears every applied facet but the view tab", () => {
    renderFilters({ tab: "program-wide", page: 4, q: "ethics", status: "CLOSED" });

    fireEvent.click(screen.getByRole("button", { name: "Clear all" }));

    expect(pushMock).toHaveBeenCalledWith(
      "/program-head/programs/program-1/responses?tab=program-wide"
    );
  });

  it("commits the spanning search on a debounce, resetting to the first page", async () => {
    vi.useFakeTimers();
    renderFilters({ tab: "course", page: 5, termInstanceId: TERM_INSTANCE });

    fireEvent.change(screen.getByRole("searchbox", { name: "Search evaluations" }), {
      target: { value: "clarity" },
    });
    expect(pushMock).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(300);

    expect(pushMock).toHaveBeenCalledWith(
      `/program-head/programs/program-1/responses?q=clarity&termInstanceId=${TERM_INSTANCE}`
    );
  });

  it("applies a facet from the mobile sheet, where the heading row is gone", async () => {
    renderFilters({ tab: "course", page: 1, termInstanceId: TERM_INSTANCE });

    fireEvent.click(screen.getByRole("button", { name: /Filters/ }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("radio", { name: "EDUC 101 · Foundations" }));

    expect(pushMock).toHaveBeenCalledWith(
      `/program-head/programs/program-1/responses?termInstanceId=${TERM_INSTANCE}&courseId=${COURSE}`
    );
  });

  it("keeps mounted facets controlled when soft navigation delivers new filters", () => {
    const errors: unknown[][] = [];
    const spy = vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
      errors.push(args);
    });
    try {
      const view = renderFilters({ tab: "program-wide", page: 1 }, false);
      view.rerender(
        <>
          <ProgramHeadResponsesFilters
            programId="program-1"
            state={{ tab: "program-wide", page: 1, status: "ACTIVE" }}
            options={options}
          />
          <Table label="Evaluation evidence">
            <TableHeader>
              <TableRow>
                <ProgramHeadResponsesTableHead
                  programId="program-1"
                  state={{ tab: "program-wide", page: 1, status: "ACTIVE" }}
                  options={options}
                  isCourse={false}
                />
              </TableRow>
            </TableHeader>
          </Table>
        </>
      );
      expect(
        errors.filter((args) =>
          String(args[0] ?? "").includes("changing the default value state of an uncontrolled")
        )
      ).toEqual([]);
      expect(screen.getByRole("button", { name: /^Filter Status: Active/ })).toBeInTheDocument();
    } finally {
      spy.mockRestore();
    }
  });
});
