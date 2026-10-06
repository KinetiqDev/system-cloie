// fallow-ignore-file code-duplication
import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GeneralEducationAnalyticsFilters } from "@/features/analytics/components/general-education-analytics-filters";
import { GeneralEducationAnalyticsWorkspace } from "@/features/analytics/components/general-education-analytics-workspace";
import type { GeneralEducationAnalyticsOptions } from "@/features/analytics/general-education-analytics-types";
import type { GeneralEducationAnalyticsFilterState } from "@/features/analytics/services/general-education-analytics-state";

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  usePathname: () => "/gen-ed-coordinator/analytics",
  useSearchParams: () => new URLSearchParams(),
}));

const SCHOOL_YEAR_2024 = "44444444-4444-4444-8444-444444444444";
const SCHOOL_YEAR_2025 = "55555555-5555-4555-8555-555555555555";
const TERM_2024 = "66666666-6666-4666-8666-666666666666";
const TERM_2025 = "77777777-7777-4777-8777-777777777777";
const COURSE = "88888888-8888-4888-8888-888888888888";

const OPTIONS: GeneralEducationAnalyticsOptions = {
  schoolYears: [
    { id: SCHOOL_YEAR_2024, label: "2024-2025" },
    { id: SCHOOL_YEAR_2025, label: "2025-2026" },
  ],
  semesters: [
    { value: "FIRST", label: "1st Semester" },
    { value: "SECOND", label: "2nd Semester" },
  ],
  termInstances: [
    {
      id: TERM_2024,
      schoolYearId: SCHOOL_YEAR_2024,
      schoolYearLabel: "2024-2025",
      semester: "FIRST",
      semesterLabel: "1st Semester",
      termLabel: "1st Term",
      label: "2024-2025 · 1st Semester · 1st Term",
    },
    {
      id: TERM_2025,
      schoolYearId: SCHOOL_YEAR_2025,
      schoolYearLabel: "2025-2026",
      semester: "FIRST",
      semesterLabel: "1st Semester",
      termLabel: null,
      label: "2025-2026 · 1st Semester",
    },
  ],
  courses: [{ id: COURSE, label: "GEETHICS — Ethics" }],
  programs: [{ id: "program-bsed", label: "BSED — Secondary Education" }],
  yearLevels: [{ value: "FIRST_YEAR", label: "1st Year" }],
  ilos: [{ id: "ilo-1", label: "ILO-1 — Competence" }],
};

/** Base UI selects expose the trigger as a combobox and need a pointer move
 * before the click commits the option into the form's hidden input. */
async function chooseOption(label: string, optionName: string, scope: HTMLElement = document.body) {
  fireEvent.click(within(scope).getByRole("combobox", { name: label }));
  const option = await screen.findByRole("option", { name: optionName });
  fireEvent.mouseMove(option);
  fireEvent.click(option);
}

function renderWorkspace(filters: Partial<GeneralEducationAnalyticsFilterState> = {}) {
  const state = { tab: "outcomes", ...filters } as GeneralEducationAnalyticsFilterState;
  return render(
    <GeneralEducationAnalyticsWorkspace tab={state.tab} filters={<span>frame</span>}>
      <GeneralEducationAnalyticsFilters filters={state} options={OPTIONS} />
    </GeneralEducationAnalyticsWorkspace>
  );
}

describe("GeneralEducationAnalyticsWorkspace", () => {
  beforeEach(() => {
    pushMock.mockReset();
  });

  it("keeps the frame mounted while only the evidence region re-renders", async () => {
    const { rerender } = render(
      <GeneralEducationAnalyticsWorkspace
        tab="outcomes"
        filters={
          <GeneralEducationAnalyticsFilters filters={{ tab: "outcomes" }} options={OPTIONS} />
        }
      >
        <p>ilo evidence</p>
      </GeneralEducationAnalyticsWorkspace>
    );

    rerender(
      <GeneralEducationAnalyticsWorkspace
        tab="courses"
        filters={
          <GeneralEducationAnalyticsFilters filters={{ tab: "courses" }} options={OPTIONS} />
        }
      >
        <p>course evidence</p>
      </GeneralEducationAnalyticsWorkspace>
    );

    // The filter card is a sibling of the evidence region, so it stays
    // mounted while only the evidence swaps.
    expect(screen.getByText("Evidence scope")).toBeInTheDocument();
    expect(await screen.findByText("course evidence")).toBeInTheDocument();
  });

  it("presents every scope facet and scopes Reset to the active view", () => {
    renderWorkspace({ tab: "outcomes", courseId: COURSE, iloId: "ilo-1" });

    for (const label of [
      "School Year",
      "Semester",
      "Academic Term",
      "Course",
      "Class Program",
      "Year Level",
      "Institutional Learning Outcome",
    ]) {
      expect(screen.getByRole("combobox", { name: label })).toBeInTheDocument();
    }
    expect(screen.getByText("2 filters active")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Reset filters" })).toHaveAttribute(
      "href",
      "/gen-ed-coordinator/analytics"
    );
  });

  it("hides the ILO facet outside Outcomes, where that deep link has no meaning", () => {
    renderWorkspace({ tab: "trends" });

    expect(
      screen.queryByRole("combobox", { name: "Institutional Learning Outcome" })
    ).not.toBeInTheDocument();
    expect(screen.getAllByText("All periods").length).toBeGreaterThan(0);
  });

  it("offers only the academic terms belonging to the selected school year", async () => {
    renderWorkspace({ tab: "outcomes", schoolYearId: SCHOOL_YEAR_2024 });

    fireEvent.click(screen.getByRole("combobox", { name: "Academic Term" }));
    const listbox = await screen.findByRole("listbox");
    expect(within(listbox).getByText("2024-2025 · 1st Semester · 1st Term")).toBeInTheDocument();
    expect(within(listbox).queryByText("2025-2026 · 1st Semester")).not.toBeInTheDocument();
  });

  it("applies a course facet and keeps the active view in the URL", async () => {
    renderWorkspace({ tab: "courses" });

    await chooseOption("Course", "GEETHICS — Ethics");
    fireEvent.click(screen.getByRole("button", { name: "Apply filters" }));

    expect(pushMock).toHaveBeenCalledTimes(1);
    expect(pushMock).toHaveBeenCalledWith(
      `/gen-ed-coordinator/analytics?tab=courses&courseId=${COURSE}`
    );
  });

  it("drops a semester that no longer matches the chosen school year", async () => {
    renderWorkspace({ tab: "trends", schoolYearId: SCHOOL_YEAR_2025, semester: "SECOND" });

    // 2025-2026 has no 2nd-semester term instance, so the stale semester is
    // dropped rather than submitted alongside a school year it never matched.
    fireEvent.click(screen.getByRole("button", { name: "Apply filters" }));

    expect(pushMock).toHaveBeenCalledWith(
      `/gen-ed-coordinator/analytics?tab=trends&schoolYearId=${SCHOOL_YEAR_2025}`
    );
  });

  it("keeps a valid semester alongside its own school year", async () => {
    renderWorkspace({ tab: "trends", schoolYearId: SCHOOL_YEAR_2024, semester: "FIRST" });

    fireEvent.click(screen.getByRole("button", { name: "Apply filters" }));

    expect(pushMock).toHaveBeenCalledWith(
      `/gen-ed-coordinator/analytics?tab=trends&schoolYearId=${SCHOOL_YEAR_2024}&semester=FIRST`
    );
  });

  it("applies dependent period facets together in one navigation", async () => {
    renderWorkspace({ tab: "trends" });

    await chooseOption("Academic Term", "2024-2025 · 1st Semester · 1st Term");
    fireEvent.click(screen.getByRole("button", { name: "Apply filters" }));

    expect(pushMock).toHaveBeenCalledWith(
      `/gen-ed-coordinator/analytics?tab=trends&termInstanceId=${TERM_2024}`
    );
  });

  it("keeps a safe-area drawer carrying the same scope controls on mobile", async () => {
    renderWorkspace({ tab: "outcomes", programId: "program-bsed" });

    const drawerTrigger = screen.getByRole("button", { name: /Scope filters/ });
    expect(drawerTrigger).toHaveTextContent("1 active");
    fireEvent.click(drawerTrigger);

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Analytics scope filters")).toBeInTheDocument();
    expect(within(dialog).getByRole("combobox", { name: "Course" })).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Apply filters" })).toBeInTheDocument();
  });
});
