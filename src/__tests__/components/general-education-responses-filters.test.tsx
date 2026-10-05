import { beforeEach, describe, expect, it, vi } from "vitest";

const { pushMock, navState } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  navState: { isPending: false },
}));

vi.mock("@/features/response-review/components/general-education-responses-workspace", () => ({
  useGeneralEducationResponsesNavigation: () => ({
    isPending: navState.isPending,
    navigate: pushMock,
  }),
}));

import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { GeneralEducationResponsesFilters } from "@/features/response-review/components/general-education-responses-filters";
import type { GeneralEducationResponsesFilterState } from "@/features/response-review/services/general-education-responses-state";
import type { GeneralEducationEvaluationFilterOptions } from "@/features/response-review/services/list-general-education-evaluations";

const TERM_INSTANCE = "11111111-1111-4111-8111-111111111111";
const COURSE = "22222222-2222-4222-8222-222222222222";
const FACULTY = "33333333-3333-4333-8333-333333333333";

const options: GeneralEducationEvaluationFilterOptions = {
  periodOptions: {
    schoolYears: [],
    semesters: [],
    termInstances: [
      {
        id: TERM_INSTANCE,
        schoolYearId: "44444444-4444-4444-8444-444444444444",
        schoolYearLabel: "2025-2026",
        semester: "SECOND",
        semesterLabel: "2nd Semester",
        termLabel: "1st Term",
        label: "2025-2026 · 2nd Semester · 1st Term",
      },
    ],
  },
  courses: [{ id: COURSE, label: "GE 1 — Understanding the Self" }],
  faculty: [{ id: FACULTY, label: "Dr. Santos" }],
};

function renderFilters(state: GeneralEducationResponsesFilterState) {
  return render(<GeneralEducationResponsesFilters state={state} options={options} />);
}

/**
 * The combobox trigger is the icon button inside the field's input group, and
 * the same field is mounted twice — once for the desktop form and once inside
 * the mobile Drawer — so every lookup takes the scope it should search.
 */
function openCombobox(label: string, scope: HTMLElement = document.body) {
  const input = within(scope).getByRole("combobox", { name: label });
  const trigger = input.closest('[data-slot="input-group"]')?.querySelector("button");
  if (!trigger) throw new Error(`No options trigger for ${label}`);
  fireEvent.click(trigger);
  return input;
}

async function chooseComboboxOption(label: string, optionName: string) {
  const input = openCombobox(label);
  const option = await screen.findByRole("option", { name: optionName });
  fireEvent.click(option);
  await waitFor(() => expect(input).toHaveValue(optionName));
}

async function chooseSelectOption(label: string, optionName: string) {
  fireEvent.click(screen.getByRole("combobox", { name: label }));
  const option = await screen.findByRole("option", { name: optionName });
  fireEvent.mouseMove(option);
  fireEvent.click(option);
}

async function openMobileDrawer() {
  fireEvent.click(screen.getByRole("button", { name: /Filters/ }));
  const dialog = await screen.findByRole("dialog");
  expect(dialog).toBeInTheDocument();
  return dialog;
}

describe("GeneralEducationResponsesFilters", () => {
  beforeEach(() => {
    pushMock.mockReset();
    navState.isPending = false;
  });

  it("applies the picked period, course, faculty, class, and search text as one scoped navigation", async () => {
    renderFilters({ page: 3, termInstanceId: TERM_INSTANCE });

    fireEvent.change(screen.getByLabelText("Search"), { target: { value: "clarity" } });
    await chooseComboboxOption("Academic period", "2025-2026 · 2nd Semester · 1st Term");
    await chooseComboboxOption("Course", "GE 1 — Understanding the Self");
    await chooseComboboxOption("Faculty", "Dr. Santos");
    fireEvent.click(screen.getByText("More filters"));
    await chooseSelectOption("Year level", "3rd Year");
    await chooseSelectOption("Section", "Morning");

    fireEvent.click(screen.getByRole("button", { name: "Apply filters" }));

    // Applying filters returns to the first page of the same period scope.
    expect(pushMock).toHaveBeenCalledTimes(1);
    expect(pushMock).toHaveBeenCalledWith(
      `/gen-ed-coordinator/responses?q=clarity&termInstanceId=${TERM_INSTANCE}&courseId=${COURSE}&facultyId=${FACULTY}&yearLevel=THIRD_YEAR&section=MORNING`
    );
  });

  it("drops a cleared selection instead of resubmitting the previous scope", async () => {
    renderFilters({ page: 1, termInstanceId: TERM_INSTANCE, courseId: COURSE });

    const courseField = screen
      .getByRole("combobox", { name: "Course" })
      .closest('[data-slot="input-group"]') as HTMLElement;
    fireEvent.click(within(courseField).getByRole("button", { name: "Clear selection" }));
    await waitFor(() => expect(screen.getByRole("combobox", { name: "Course" })).toHaveValue(""));

    fireEvent.click(screen.getByRole("button", { name: "Apply filters" }));

    expect(pushMock).toHaveBeenCalledWith(
      `/gen-ed-coordinator/responses?termInstanceId=${TERM_INSTANCE}`
    );
  });

  it("keeps the school year and semester scope that has no control on this form", () => {
    const SCHOOL_YEAR = "44444444-4444-4444-8444-444444444444";
    renderFilters({ page: 1, schoolYearId: SCHOOL_YEAR, semester: "SECOND" });

    fireEvent.change(screen.getByLabelText("Search"), { target: { value: "ethics" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply filters" }));

    expect(pushMock).toHaveBeenCalledWith(
      `/gen-ed-coordinator/responses?q=ethics&schoolYearId=${SCHOOL_YEAR}&semester=SECOND`
    );
  });

  it("counts applied filters and points the reset links at the unfiltered list", () => {
    const view = renderFilters({ page: 1, q: "ethics", yearLevel: "SECOND_YEAR" });

    expect(screen.getAllByText("2 active").length).toBeGreaterThan(0);
    for (const reset of screen.getAllByRole("link", { name: /Clear/ })) {
      expect(reset).toHaveAttribute("href", "/gen-ed-coordinator/responses");
    }

    view.rerender(<GeneralEducationResponsesFilters state={{ page: 1 }} options={options} />);
    expect(screen.queryByText(/\d+ active/)).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Clear filters/ })).not.toBeInTheDocument();
  });

  it("applies the mobile drawer selection and closes the drawer", async () => {
    renderFilters({ page: 1, termInstanceId: TERM_INSTANCE });

    const dialog = await openMobileDrawer();
    const course = openCombobox("Course", dialog);
    fireEvent.click(await screen.findByRole("option", { name: "GE 1 — Understanding the Self" }));
    await waitFor(() => expect(course).toHaveValue("GE 1 — Understanding the Self"));

    fireEvent.click(within(dialog).getByRole("button", { name: "Apply filters" }));

    expect(pushMock).toHaveBeenCalledWith(
      `/gen-ed-coordinator/responses?termInstanceId=${TERM_INSTANCE}&courseId=${COURSE}`
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("discards an unapplied mobile selection so the committed scope stays authoritative", async () => {
    renderFilters({ page: 1, termInstanceId: TERM_INSTANCE });

    const dialog = await openMobileDrawer();
    const course = openCombobox("Course", dialog);
    fireEvent.click(await screen.findByRole("option", { name: "GE 1 — Understanding the Self" }));
    await waitFor(() => expect(course).toHaveValue("GE 1 — Understanding the Self"));

    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(pushMock).not.toHaveBeenCalled();

    const reopened = await openMobileDrawer();
    expect(within(reopened).getByRole("combobox", { name: "Course" })).toHaveValue("");
    expect(within(reopened).getByRole("combobox", { name: "Academic period" })).toHaveValue(
      "2025-2026 · 2nd Semester · 1st Term"
    );
  });

  it("marks the filter form busy while the navigation is pending", () => {
    navState.isPending = true;
    const { container } = renderFilters({ page: 1 });

    for (const apply of screen.getAllByRole("button", { name: /Applying filters/ })) {
      expect(apply).toBeDisabled();
    }
    expect(container.querySelector("form")).toHaveAttribute("aria-busy", "true");
  });
});
