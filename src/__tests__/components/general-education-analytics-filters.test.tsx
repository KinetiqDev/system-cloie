import { beforeEach, describe, expect, it, vi } from "vitest";

const { navigateMock, navigation } = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  navigation: { isPending: false },
}));

vi.mock("@/features/analytics/components/general-education-analytics-workspace", () => ({
  useGeneralEducationAnalyticsNavigation: () => ({
    isPending: navigation.isPending,
    navigate: navigateMock,
  }),
}));

import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { GeneralEducationAnalyticsFilters } from "@/features/analytics/components/general-education-analytics-filters";
import type { GeneralEducationAnalyticsOptions } from "@/features/analytics/general-education-analytics-types";
import type { GeneralEducationAnalyticsFilterState } from "@/features/analytics/services/general-education-analytics-state";

const YEAR_2024 = "0f1e2d3c-4b5a-4968-8776-655443332211";
const YEAR_2025 = "1a2b3c4d-5e6f-4071-8282-554433445566";
const TERM_2024_FIRST = "2b3c4d5e-6f70-4182-9393-443322110099";
const TERM_2024_SECOND = "3c4d5e6f-7081-4293-a4a5-33221100ffe0";
const TERM_2025_FIRST = "4d5e6f70-8192-43a4-b5b6-221100eeddcc";
const TERM_2025_SUMMER = "5e6f7081-92a3-44b5-86c7-1100ddccbbaa";
const COURSE = "6f708192-a3b4-45c6-97d8-00ccbbaa9988";
const PROGRAM = "708192a3-b4c5-46d7-a8e9-11bbccddaa77";
const ILO = "8192a3b4-c5d6-47e8-b9fa-22ccddeebb66";

const OPTIONS: GeneralEducationAnalyticsOptions = {
  schoolYears: [
    { id: YEAR_2024, label: "2024-2025" },
    { id: YEAR_2025, label: "2025-2026" },
  ],
  semesters: [
    { value: "FIRST", label: "1st Semester" },
    { value: "SECOND", label: "2nd Semester" },
    { value: "SUMMER", label: "3rd Semester" },
  ],
  termInstances: [
    {
      id: TERM_2024_FIRST,
      schoolYearId: YEAR_2024,
      schoolYearLabel: "2024-2025",
      semester: "FIRST",
      semesterLabel: "1st Semester",
      termLabel: "1st Term",
      label: "2024-2025 · 1st Semester · 1st Term",
    },
    {
      id: TERM_2024_SECOND,
      schoolYearId: YEAR_2024,
      schoolYearLabel: "2024-2025",
      semester: "SECOND",
      semesterLabel: "2nd Semester",
      termLabel: "1st Term",
      label: "2024-2025 · 2nd Semester · 1st Term",
    },
    {
      id: TERM_2025_FIRST,
      schoolYearId: YEAR_2025,
      schoolYearLabel: "2025-2026",
      semester: "FIRST",
      semesterLabel: "1st Semester",
      termLabel: null,
      label: "2025-2026 · 1st Semester",
    },
    {
      id: TERM_2025_SUMMER,
      schoolYearId: YEAR_2025,
      schoolYearLabel: "2025-2026",
      semester: "SUMMER",
      semesterLabel: "3rd Semester",
      termLabel: null,
      label: "2025-2026 · 3rd Semester",
    },
  ],
  courses: [{ id: COURSE, label: "GE 3 — Life, Ethics, and the Law" }],
  programs: [{ id: PROGRAM, label: "BS Psychology" }],
  yearLevels: [{ value: "SECOND_YEAR", label: "2nd Year" }],
  ilos: [{ id: ILO, label: "ILO-2 · Act responsibly" }],
};

const NO_SEMESTERS: GeneralEducationAnalyticsOptions = { ...OPTIONS, semesters: [] };

function renderFilters(
  filters: Partial<GeneralEducationAnalyticsFilterState>,
  options: GeneralEducationAnalyticsOptions = OPTIONS
) {
  const state = { tab: "trends", ...filters } as GeneralEducationAnalyticsFilterState;
  return render(<GeneralEducationAnalyticsFilters filters={state} options={options} />);
}

/** A Base UI select commits its choice into the form only after the pointer
 * moves onto the option, so every pick goes through the trigger in `scope`. */
async function pickFacet(scope: HTMLElement, label: string, optionName: string) {
  fireEvent.click(within(scope).getByRole("combobox", { name: label }));
  const option = await screen.findByRole("option", { name: optionName });
  fireEvent.mouseMove(option);
  fireEvent.click(option);
}

function apply(scope: HTMLElement = document.body) {
  fireEvent.click(within(scope).getByRole("button", { name: /Apply(ing)? filters/ }));
}

describe("GeneralEducationAnalyticsFilters", () => {
  beforeEach(() => {
    navigateMock.mockReset();
    navigation.isPending = false;
  });

  it("navigates once with every picked facet while staying on the active view", async () => {
    renderFilters({ tab: "courses" });

    await pickFacet(document.body, "Course", "GE 3 — Life, Ethics, and the Law");
    await pickFacet(document.body, "Class Program", "BS Psychology");
    await pickFacet(document.body, "Year Level", "2nd Year");
    apply();

    expect(navigateMock).toHaveBeenCalledTimes(1);
    expect(navigateMock).toHaveBeenCalledWith(
      `/gen-ed-coordinator/analytics?tab=courses&courseId=${COURSE}&programId=${PROGRAM}&yearLevel=SECOND_YEAR`
    );
  });

  it("keeps a semester that belongs to the chosen school year", () => {
    renderFilters({ tab: "trends", schoolYearId: YEAR_2024, semester: "SECOND" });

    apply();

    expect(navigateMock).toHaveBeenCalledWith(
      `/gen-ed-coordinator/analytics?tab=trends&schoolYearId=${YEAR_2024}&semester=SECOND`
    );
  });

  it("drops a semester the chosen school year never offered", () => {
    renderFilters({ tab: "trends", schoolYearId: YEAR_2025, semester: "SECOND" });

    apply();

    // 2025-2026 has no 2nd-semester term, so a stale semester cannot ride along
    // with a school year it never belonged to.
    expect(navigateMock).toHaveBeenCalledWith(
      `/gen-ed-coordinator/analytics?tab=trends&schoolYearId=${YEAR_2025}`
    );
  });

  it("drops an academic term that belongs to another school year", () => {
    renderFilters({ tab: "trends", schoolYearId: YEAR_2025, termInstanceId: TERM_2024_FIRST });

    apply();

    expect(navigateMock).toHaveBeenCalledWith(
      `/gen-ed-coordinator/analytics?tab=trends&schoolYearId=${YEAR_2025}`
    );
  });

  it("drops an academic term from the semester the coordinator just left", async () => {
    renderFilters({
      tab: "trends",
      schoolYearId: YEAR_2024,
      semester: "FIRST",
      termInstanceId: TERM_2024_FIRST,
    });

    // Both values belong to the same school year, so a school-year-only check
    // would submit a term from a semester the scope no longer names — and the
    // evidence read would then match nothing in the newly selected semester.
    await pickFacet(document.body, "Semester", "2nd Semester");
    apply();

    expect(navigateMock).toHaveBeenCalledWith(
      `/gen-ed-coordinator/analytics?tab=trends&schoolYearId=${YEAR_2024}&semester=SECOND`
    );
  });

  it("keeps an academic term that belongs to the newly selected semester", async () => {
    renderFilters({
      tab: "trends",
      schoolYearId: YEAR_2024,
      semester: "FIRST",
      termInstanceId: TERM_2024_FIRST,
    });

    // 2024-2025 runs both semesters, so the second-semester term that the
    // coordinator now scopes by survives the transition.
    await pickFacet(document.body, "Semester", "2nd Semester");
    await pickFacet(document.body, "Academic Term", "2024-2025 · 2nd Semester · 1st Term");
    apply();

    expect(navigateMock).toHaveBeenCalledWith(
      `/gen-ed-coordinator/analytics?tab=trends&schoolYearId=${YEAR_2024}&semester=SECOND&termInstanceId=${TERM_2024_SECOND}`
    );
  });

  it("keeps both period children when the coordinator clears the school year", async () => {
    renderFilters({
      tab: "trends",
      schoolYearId: YEAR_2024,
      semester: "SECOND",
      termInstanceId: TERM_2024_SECOND,
    });

    // An empty school year constrains nothing, so neither the semester nor the
    // term is discarded with the parent they were narrowing.
    await pickFacet(document.body, "School Year", "All school years");
    apply();

    expect(navigateMock).toHaveBeenCalledWith(
      `/gen-ed-coordinator/analytics?tab=trends&semester=SECOND&termInstanceId=${TERM_2024_SECOND}`
    );
  });

  it("submits the outcome selection only from the Outcomes view", () => {
    const { unmount } = renderFilters({ tab: "outcomes", iloId: ILO });
    apply();
    expect(navigateMock).toHaveBeenCalledWith(`/gen-ed-coordinator/analytics?iloId=${ILO}`);
    unmount();

    navigateMock.mockReset();
    renderFilters({ tab: "trends", iloId: ILO });
    apply();
    // Outside Outcomes the outcome facet has no control, so it cannot survive
    // a navigation from that view.
    expect(navigateMock).toHaveBeenCalledWith("/gen-ed-coordinator/analytics?tab=trends");
  });

  it("counts the active facets and points every reset at the unfiltered view", () => {
    const view = renderFilters({ tab: "courses", courseId: COURSE, yearLevel: "SECOND_YEAR" });

    expect(screen.getByText("2 filters active")).toBeInTheDocument();
    for (const reset of screen.getAllByRole("link", { name: /Reset/ })) {
      expect(reset).toHaveAttribute("href", "/gen-ed-coordinator/analytics?tab=courses");
    }

    view.rerender(
      <GeneralEducationAnalyticsFilters filters={{ tab: "courses" }} options={OPTIONS} />
    );

    expect(screen.getAllByText("All periods").length).toBeGreaterThan(0);
    expect(screen.queryByRole("link", { name: /Reset/ })).not.toBeInTheDocument();
  });

  it("narrows the semester list to the chosen school year, and widens it without one", async () => {
    const { unmount } = renderFilters({ tab: "trends", schoolYearId: YEAR_2024 });

    fireEvent.click(screen.getByRole("combobox", { name: "Semester" }));
    let listbox = await screen.findByRole("listbox");
    expect(within(listbox).getByText("1st Semester")).toBeInTheDocument();
    expect(within(listbox).queryByText("3rd Semester")).not.toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    unmount();

    renderFilters({ tab: "trends" });
    fireEvent.click(screen.getByRole("combobox", { name: "Semester" }));
    listbox = await screen.findByRole("listbox");
    expect(within(listbox).getByText("3rd Semester")).toBeInTheDocument();
  });

  it("offers only the academic terms of the chosen school year", async () => {
    renderFilters({ tab: "trends", schoolYearId: YEAR_2025 });

    fireEvent.click(screen.getByRole("combobox", { name: "Academic Term" }));
    const listbox = await screen.findByRole("listbox");
    expect(within(listbox).getByText("2025-2026 · 3rd Semester")).toBeInTheDocument();
    expect(
      within(listbox).queryByText("2024-2025 · 1st Semester · 1st Term")
    ).not.toBeInTheDocument();
  });

  it("locks the semester control when the catalog offers no semesters", () => {
    renderFilters({ tab: "trends" }, NO_SEMESTERS);

    expect(screen.getByRole("combobox", { name: "Semester" })).toBeDisabled();
  });

  it("blocks a second apply and reports progress while the navigation is pending", () => {
    navigation.isPending = true;
    const { container } = renderFilters({ tab: "trends", courseId: COURSE });

    const applyButton = screen.getAllByRole("button", { name: /Applying filters/ })[0];
    expect(applyButton).toBeDisabled();
    expect(within(applyButton).getByRole("status")).toHaveAccessibleName("Loading");
    expect(container.querySelector("form")).toHaveAttribute("aria-busy", "true");

    fireEvent.click(applyButton);
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it("applies a scope picked inside the mobile drawer and closes it", async () => {
    renderFilters({ tab: "trends" });

    fireEvent.click(screen.getByRole("button", { name: /Scope filters/ }));
    const dialog = await screen.findByRole("dialog");
    await pickFacet(dialog, "Academic Term", "2025-2026 · 3rd Semester");
    apply(dialog);

    expect(navigateMock).toHaveBeenCalledWith(
      `/gen-ed-coordinator/analytics?tab=trends&termInstanceId=${TERM_2025_SUMMER}`
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("leaves the committed scope untouched when the drawer is dismissed unapplied", async () => {
    renderFilters({ tab: "trends", courseId: COURSE });

    fireEvent.click(screen.getByRole("button", { name: /Scope filters/ }));
    const dialog = await screen.findByRole("dialog");
    await pickFacet(dialog, "Class Program", "BS Psychology");
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(navigateMock).not.toHaveBeenCalled();

    // Reopening starts again from the committed URL state, not the abandoned pick.
    fireEvent.click(screen.getByRole("button", { name: /Scope filters/ }));
    const reopened = await screen.findByRole("dialog");
    expect(within(reopened).getByRole("combobox", { name: "Class Program" })).toHaveTextContent(
      "All programs"
    );
    expect(within(reopened).getByRole("combobox", { name: "Course" })).toHaveTextContent(
      "GE 3 — Life, Ethics, and the Law"
    );
  });
});
