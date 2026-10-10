import { beforeEach, describe, expect, it, vi } from "vitest";

const { pushMock, navState } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  navState: { isPending: false },
}));

vi.mock("@/features/response-review/components/responses-workspace", () => ({
  useResponsesNavigation: () => ({ isPending: navState.isPending, navigate: pushMock }),
}));

import { fireEvent, render, screen, within } from "@testing-library/react";
import { Table, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  GeneralEducationResponsesFilters,
  GeneralEducationResponsesTableHead,
} from "@/features/response-review/components/general-education-responses-filters";
import type { GeneralEducationResponsesFilterState } from "@/features/response-review/services/general-education-responses-state";
import type { GeneralEducationEvaluationFilterOptions } from "@/features/response-review/services/list-general-education-evaluations";

const TERM_INSTANCE = "11111111-1111-4111-8111-111111111111";
const COURSE = "22222222-2222-4222-8222-222222222222";
const FACULTY = "33333333-3333-4333-8333-333333333333";
const PROGRAM = "44444444-4444-4444-8444-444444444444";
const ILO = "55555555-5555-4555-8555-555555555555";
const SCHOOL_YEAR = "66666666-6666-4666-8666-666666666666";

const options: GeneralEducationEvaluationFilterOptions = {
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
        termLabel: "1st Term",
        label: "2025-2026 · 2nd Semester · 1st Term",
      },
    ],
  },
  courses: [{ id: COURSE, label: "GE 1 · Understanding the Self" }],
  programs: [{ id: PROGRAM, label: "BSIT · Information Technology" }],
  faculty: [{ id: FACULTY, label: "Dr. Santos" }],
  ilos: [{ id: ILO, label: "ILO1 — Think critically" }],
};

/**
 * The surface as the landing composes it: the toolbar above the evidence, and
 * the table's own filterable headings below it. Narrowing happens in the column
 * heading, so a test that rendered only the toolbar would assert nothing about
 * where a facet lives.
 */
function renderFilters(state: GeneralEducationResponsesFilterState) {
  return render(
    <>
      <GeneralEducationResponsesFilters state={state} options={options} />
      <Table label="Evaluation evidence">
        <TableHeader>
          <TableRow>
            <GeneralEducationResponsesTableHead state={state} options={options} />
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

/** The radio rows one open funnel offers, in the order it presents them. */
async function openColumnOptions(columnName: string) {
  fireEvent.click(screen.getByRole("button", { name: `Filter ${columnName}` }));
  await screen.findAllByRole("radio");
  return screen.getAllByRole("radio").map((row) => row.closest("label")?.textContent);
}

function search() {
  return screen.getByRole("searchbox", { name: "Search evaluations" });
}

async function openMobileSheet() {
  fireEvent.click(screen.getByRole("button", { name: /Filters/ }));
  const dialog = await screen.findByRole("dialog");
  expect(dialog).toBeInTheDocument();
  return dialog;
}

describe("GeneralEducationResponsesFilters", () => {
  beforeEach(() => {
    pushMock.mockReset();
    navState.isPending = false;
    vi.useRealTimers();
  });

  it("applies each facet from its column as it changes, with nothing to submit", async () => {
    renderFilters({ page: 3, termInstanceId: TERM_INSTANCE });

    // The panel is no longer a form, so there is no Apply control anywhere.
    expect(document.querySelector("form")).toBeNull();
    expect(screen.queryByRole("button", { name: /Apply/ })).toBeNull();
    expect(screen.queryByText("Find evaluations")).toBeNull();

    await chooseFacetOption("Evaluation", "GE 1 · Understanding the Self");

    // The facet lands on its own, keeps the period scope, and returns to page 1.
    expect(pushMock).toHaveBeenCalledTimes(1);
    expect(pushMock).toHaveBeenCalledWith(
      `/gen-ed-coordinator/responses?termInstanceId=${TERM_INSTANCE}&courseId=${COURSE}`
    );
  });

  it("offers the class column's three facts under one heading", async () => {
    renderFilters({ page: 1, termInstanceId: TERM_INSTANCE });

    // Year level, section, and the assignment's Program all narrow the same
    // Class cell, so they open together rather than as three hidden fields.
    expect(await openColumnOptions("Class")).toEqual([
      "All year levels",
      "1st Year",
      "2nd Year",
      "3rd Year",
      "4th Year",
      "All sections",
      "Morning",
      "Afternoon",
      "Evening",
      // ADR 0035: the assignment's Program, never the respondent's.
      "All class programs",
      "BSIT · Information Technology",
    ]);
  });

  it("narrows the class column without dropping the period scope", async () => {
    renderFilters({ page: 1, termInstanceId: TERM_INSTANCE });

    await chooseFacetOption("Class", "3rd Year");

    expect(pushMock).toHaveBeenLastCalledWith(
      `/gen-ed-coordinator/responses?termInstanceId=${TERM_INSTANCE}&yearLevel=THIRD_YEAR`
    );
  });

  it("narrows the class column by its class Program", async () => {
    renderFilters({ page: 1, termInstanceId: TERM_INSTANCE });

    await chooseFacetOption("Class", "BSIT · Information Technology");

    expect(pushMock).toHaveBeenLastCalledWith(
      `/gen-ed-coordinator/responses?termInstanceId=${TERM_INSTANCE}&programId=${PROGRAM}`
    );
  });

  it("narrows the faculty column", async () => {
    renderFilters({ page: 1 });

    await chooseFacetOption("Faculty", "Dr. Santos");

    expect(pushMock).toHaveBeenCalledWith(`/gen-ed-coordinator/responses?facultyId=${FACULTY}`);
  });

  it("keeps the ILO filter reachable from the toolbar even though no column owns it", async () => {
    renderFilters({ page: 1, iloId: ILO });

    const trigger = screen.getByRole("button", { name: /^More filters/ });
    expect(
      screen.getByRole("button", {
        name: "Remove filter Institutional Learning Outcome: ILO1 — Think critically",
      })
    ).toBeInTheDocument();

    fireEvent.click(trigger);
    expect(
      await screen.findByRole("radio", { name: "ILO1 — Think critically" })
    ).toBeInTheDocument();
  });

  it("reads the submitted bucket as a count, not a lifecycle stage", async () => {
    renderFilters({ page: 1 });

    await chooseFacetOption("Submitted", "Partly submitted");

    expect(pushMock).toHaveBeenCalledWith("/gen-ed-coordinator/responses?completion=partial");
  });

  it("keeps the school year and semester scope that has no control on this surface", async () => {
    renderFilters({ page: 2, schoolYearId: SCHOOL_YEAR, semester: "SECOND" });

    await chooseFacetOption("Evaluation", "GE 1 · Understanding the Self");

    expect(pushMock).toHaveBeenCalledWith(
      `/gen-ed-coordinator/responses?schoolYearId=${SCHOOL_YEAR}&semester=SECOND&courseId=${COURSE}`
    );
  });

  it("clears an applied facet from its removable chip", () => {
    renderFilters({
      page: 1,
      termInstanceId: TERM_INSTANCE,
      courseId: COURSE,
      facultyId: FACULTY,
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Remove filter Course: GE 1 · Understanding the Self" })
    );

    expect(pushMock).toHaveBeenCalledWith(
      `/gen-ed-coordinator/responses?termInstanceId=${TERM_INSTANCE}&facultyId=${FACULTY}`
    );
  });

  it("clears every applied facet at once", () => {
    renderFilters({ page: 4, q: "ethics", yearLevel: "SECOND_YEAR", status: "CLOSED" });

    fireEvent.click(screen.getByRole("button", { name: "Clear all" }));

    expect(pushMock).toHaveBeenCalledWith("/gen-ed-coordinator/responses");
  });

  it("commits the spanning search on a debounce, resetting to the first page", async () => {
    vi.useFakeTimers();
    renderFilters({ page: 5, termInstanceId: TERM_INSTANCE });

    fireEvent.change(search(), { target: { value: "clarity" } });
    expect(pushMock).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(300);

    expect(pushMock).toHaveBeenCalledWith(
      `/gen-ed-coordinator/responses?q=clarity&termInstanceId=${TERM_INSTANCE}`
    );
  });

  it("applies a facet from the mobile sheet, where the heading row is gone", async () => {
    renderFilters({ page: 1, termInstanceId: TERM_INSTANCE });

    const dialog = await openMobileSheet();
    fireEvent.click(within(dialog).getByRole("radio", { name: "Dr. Santos" }));

    expect(pushMock).toHaveBeenCalledWith(
      `/gen-ed-coordinator/responses?termInstanceId=${TERM_INSTANCE}&facultyId=${FACULTY}`
    );
  });

  it("names the in-force academic period on the column that owns it", () => {
    renderFilters({ page: 1, termInstanceId: TERM_INSTANCE });

    expect(
      screen.getByRole("button", {
        name: "Filter Period: 2025-2026 · 2nd Semester · 1st Term",
      })
    ).toBeInTheDocument();
  });
});
