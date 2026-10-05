// fallow-ignore-file code-duplication
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CourseScope, StudentSection, YearLevel } from "@prisma/client";

import {
  CourseRosterDetailPage,
  CourseRosterDiscoveryPage,
} from "@/features/course-assignments/components/course-roster-pages";
import {
  buildReviewGuards,
  effectiveCandidateByIndexFor,
  RosterManagementDialog,
} from "@/features/course-assignments/components/course-roster-management";
import { DEFAULT_COURSE_ROSTER_FILTERS } from "@/features/course-assignments/course-roster-list-state";
import type { TermInstanceItem } from "@/features/academic-calendar/types";
import * as rosterActions from "@/lib/actions/course-roster-actions";
import type {
  CourseRosterDetail,
  CourseRosterDiscoveryResult,
  CourseRosterPreview,
  CourseRosterPreviewCandidate,
  CourseRosterPreviewDisposition,
  CourseRosterPreviewRow,
} from "@/features/course-assignments/types";

const { replaceMock, refreshMock, showToastMock, useSearchParamsMock } = vi.hoisted(() => ({
  replaceMock: vi.fn(),
  refreshMock: vi.fn(),
  showToastMock: vi.fn(),
  useSearchParamsMock: vi.fn(() => new URLSearchParams()),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock, refresh: refreshMock }),
  useSearchParams: () => useSearchParamsMock(),
}));
vi.mock("@/components/ui/toast", () => ({ showToast: showToastMock }));

function mockMatchMedia(matches: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(() => false),
    }))
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockMatchMedia(true);
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const assignment = {
  assignmentId: "assignment-1",
  courseCode: "CS101",
  courseTitle: "Computing",
  courseScope: CourseScope.PROGRAM_SPECIFIC,
  programCode: "BSCS",
  programName: "Computer Science",
  facultyName: "Ada Lovelace",
  facultyEmail: "ada@example.com",
  yearLevel: YearLevel.SECOND_YEAR,
  section: StudentSection.MORNING,
  termLabel: "2026-2027 - 1st Semester - 1st Term",
  periodStatus: "ACTIVE" as const,
  isActive: true,
  hasPublishedEvaluation: false,
  rosterState: "ACTIVE" as const,
  activeRosterCount: 1,
  evaluationEligibleCount: 1,
};

const termInstances = [
  {
    id: "term-1",
    schoolYearId: "year-1",
    schoolYearCode: "2026-2027",
    semester: "FIRST",
    term: "FIRST_TERM",
    status: "ACTIVE",
    startDate: new Date("2026-06-01"),
    endDate: new Date("2026-10-01"),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "term-0",
    schoolYearId: "year-0",
    schoolYearCode: "2025-2026",
    semester: "SECOND",
    term: "SECOND_TERM",
    status: "COMPLETED",
    startDate: new Date("2026-01-01"),
    endDate: new Date("2026-05-01"),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
] as unknown as TermInstanceItem[];

const courses = [
  { id: "course-1", code: "CS101", title: "Computing", courseScope: CourseScope.PROGRAM_SPECIFIC },
];

const programs = [{ id: "program-1", code: "BSCS", name: "Computer Science" }];

const discovery: CourseRosterDiscoveryResult = {
  items: [assignment],
  total: 1,
  page: 0,
  pageSize: 20,
  period: { mode: "current" },
  search: "",
  activePeriodId: "term-1",
};

/**
 * The route hands the component one coherent filter set, so the helper derives
 * the filters from the same data overrides rather than letting the two drift.
 */
function renderDiscovery(
  overrides: Partial<React.ComponentProps<typeof CourseRosterDiscoveryPage>> = {},
  dataOverrides: Partial<CourseRosterDiscoveryResult> = {}
) {
  const data = { ...discovery, ...dataOverrides };
  return render(
    <CourseRosterDiscoveryPage
      {...overrides}
      data={data}
      view={overrides.view ?? "list"}
      filters={{
        ...DEFAULT_COURSE_ROSTER_FILTERS,
        period: data.period,
        search: data.search,
        ...overrides.filters,
      }}
      termInstances={termInstances}
      courses={courses}
      programs={programs}
    />
  );
}

function filterBar() {
  return within(screen.getByRole("region", { name: "Filter rosters" }));
}

const detail: CourseRosterDetail = {
  assignment,
  canManage: true,
  canMutate: true,
  members: [
    {
      membershipId: "membership-1",
      studentName: "Grace Hopper",
      email: "grace@example.com",
      programCode: "BSCS",
      programName: "Computer Science",
      majorName: "Software",
      yearLevel: YearLevel.SECOND_YEAR,
      section: StudentSection.MORNING,
      membershipAddedAt: new Date("2026-07-01T00:00:00Z"),
      isActive: true,
      eligibility: { eligible: true, reason: null },
      removedAt: null,
      removedByName: null,
    },
  ],
  totalMembers: 1,
  activeRosterCount: 1,
  evaluationEligibleCount: 1,
  page: 1,
  pageSize: 25,
  totalPages: 1,
  search: "",
  includeRemoved: false,
  sortDirection: "asc",
};

describe("course roster pages", () => {
  it("renders the default list with one action, no filled state chip, and no Faculty identity", () => {
    renderDiscovery();

    expect(
      screen.getByRole("heading", { name: "My Course Rosters", level: 1 })
    ).toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: "Search assignments" })).toBeInTheDocument();

    const selectedList = screen.getByRole("button", { name: "List view" });
    expect(selectedList).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("toolbar", { name: "Rosters view" })).toBeInTheDocument();

    const table = screen.getByRole("table", { name: "Course assignments" });
    for (const column of ["Course", "Program", "Class", "Academic Period", "Roster"]) {
      expect(within(table).getByRole("columnheader", { name: column })).toBeInTheDocument();
    }
    // The lifecycle column and the two separate count columns are one cell now.
    expect(within(table).queryByRole("columnheader", { name: "State" })).not.toBeInTheDocument();
    expect(
      within(table).queryByRole("columnheader", { name: "Active roster" })
    ).not.toBeInTheDocument();
    expect(
      within(table).queryByRole("columnheader", { name: "Evaluation-eligible" })
    ).not.toBeInTheDocument();

    expect(screen.getByText("CS101")).toBeInTheDocument();
    expect(screen.getByText("Computer Science")).toBeInTheDocument();
    // The shared placement separator, not a pipe.
    expect(screen.getByText("2nd Year · Morning")).toBeInTheDocument();
    expect(screen.queryByText("Computer Science — Computer Science")).not.toBeInTheDocument();
    expect(screen.getByText(discovery.items[0].termLabel)).toBeInTheDocument();
    // An active roster earns no chip at all.
    expect(
      screen.queryByText("Open roster", { selector: '[data-slot="badge"]' })
    ).not.toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Open roster" })).toHaveLength(1);
    expect(screen.queryByText("Ada Lovelace")).not.toBeInTheDocument();
    expect(screen.queryByText("ada@example.com")).not.toBeInTheDocument();
  });

  it("keeps list mode a horizontally scrollable table on mobile instead of cards", () => {
    const { container } = renderDiscovery();

    const scrollRegion = container.querySelector('[data-slot="table-container"]');
    // The shared Table supplies the focusable region a wide table needs.
    expect(scrollRegion).toHaveAttribute("role", "region");
    expect(scrollRegion).toHaveAttribute("tabindex", "0");
    expect(scrollRegion).toHaveClass("overflow-x-auto");
    expect(scrollRegion).not.toHaveClass("overflow-hidden");
    const table = container.querySelector('[data-view="list"]');
    expect(table).toHaveClass("min-w-[60rem]");
    // No mobile card-style row labels or stacked grid rows inside the table.
    expect(scrollRegion!.querySelectorAll(".md\\:hidden")).toHaveLength(0);
    expect(container.querySelector('[data-slot="table-row"]')).not.toHaveClass("grid");
  });

  it("states roster size and eligibility together and only flags a shortfall", () => {
    renderDiscovery(
      {},
      { items: [{ ...assignment, activeRosterCount: 3, evaluationEligibleCount: 2 }] }
    );

    expect(screen.getByText("on roster")).toBeInTheDocument();
    expect(screen.getByText("3", { selector: "span" })).toBeInTheDocument();
    expect(screen.getByText("2 eligible for evaluation")).toBeInTheDocument();
    expect(screen.getByText("1 needs attention")).toBeInTheDocument();
  });

  it("stays quiet when every active member is eligible", () => {
    renderDiscovery();

    expect(screen.getByText("1 eligible for evaluation")).toBeInTheDocument();
    expect(screen.queryByText(/needs attention/)).not.toBeInTheDocument();
  });

  it("renders complete Card facts, one action, and no Faculty identity", () => {
    renderDiscovery(
      { view: "card" },
      { items: [{ ...assignment, activeRosterCount: 3, evaluationEligibleCount: 2 }] }
    );

    const selectedCard = screen.getByRole("button", { name: "Card view" });
    expect(selectedCard).toHaveAttribute("aria-pressed", "true");
    expect(selectedCard).toHaveClass("aria-pressed:font-semibold");
    expect(selectedCard).toHaveClass("aria-pressed:shadow-sm");
    expect(screen.queryByRole("table", { name: "Course assignments" })).not.toBeInTheDocument();
    expect(screen.getByText("CS101", { selector: '[data-slot="card-title"]' })).toBeInTheDocument();
    for (const label of ["Program", "Class", "Academic Period"]) {
      expect(screen.getByText(label, { selector: "dt" })).toBeInTheDocument();
    }
    expect(screen.getByText("2 eligible for evaluation")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Open roster" })).toHaveLength(1);
    expect(screen.queryByText(/Ada Lovelace|ada@example.com/)).not.toBeInTheDocument();
  });

  it("gives every filter control an accessible name and a reset that starts disabled", () => {
    renderDiscovery();

    for (const name of [
      "Academic Period",
      "Course",
      "Program",
      "Year level",
      "Section",
      "Course scope",
    ]) {
      expect(screen.getByRole("combobox", { name })).toBeInTheDocument();
    }
    expect(filterBar().getByRole("button", { name: "Reset" })).toBeDisabled();
  });

  it("offers the active-only scope alongside every period", async () => {
    renderDiscovery();

    fireEvent.click(screen.getByRole("combobox", { name: "Academic Period" }));
    expect(await screen.findByRole("option", { name: "Active assignments" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "All Academic Periods" })).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: /2025-2026 — 2nd Semester — 2nd Term/ })
    ).toBeInTheDocument();
  });

  it("applies a facet immediately, returns to page one, and reports it in the URL", async () => {
    renderDiscovery();

    fireEvent.click(screen.getByRole("combobox", { name: "Program" }));
    const program = await screen.findByRole("option", { name: /BSCS/ });
    fireEvent.mouseMove(program);
    fireEvent.click(program);

    expect(replaceMock).toHaveBeenCalledWith("/faculty/course-rosters?programId=program-1");
  });

  it("applies the widened period scope as the retired history param did", async () => {
    renderDiscovery();

    fireEvent.click(screen.getByRole("combobox", { name: "Academic Period" }));
    const all = await screen.findByRole("option", { name: "All Academic Periods" });
    fireEvent.mouseMove(all);
    fireEvent.click(all);

    expect(replaceMock).toHaveBeenCalledWith("/faculty/course-rosters?period=all");
  });

  it("counts applied facets and enables reset", () => {
    renderDiscovery({
      filters: { ...DEFAULT_COURSE_ROSTER_FILTERS, programId: "program-1", search: "CS" },
    });

    expect(
      filterBar().getByText("2 active", { selector: '[data-slot="badge"]' })
    ).toBeInTheDocument();
    expect(filterBar().getByRole("button", { name: "Reset" })).toBeEnabled();
  });

  it("keeps unapplied mobile filters out of the applied-filter count", async () => {
    mockMatchMedia(false);
    renderDiscovery();
    const trigger = screen.getByRole("button", { name: /More filters\s*Optional/ });
    fireEvent.click(trigger);
    const dialog = await screen.findByRole("dialog", { name: "More roster filters" });
    fireEvent.click(within(dialog).getByRole("combobox", { name: "Year level" }));
    const option = await screen.findByRole("option", { name: "2nd Year" });
    fireEvent.mouseMove(option);
    fireEvent.click(option);

    expect(within(dialog).getByRole("button", { name: "Show results · 1 filter" })).toBeVisible();
    expect(trigger).toHaveTextContent("Optional");
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("counts a widened period scope as an applied filter", () => {
    renderDiscovery({ filters: { ...DEFAULT_COURSE_ROSTER_FILTERS, period: { mode: "all" } } });

    expect(
      filterBar().getByText("1 active", { selector: '[data-slot="badge"]' })
    ).toBeInTheDocument();
  });

  it("resets every facet and returns to the active-period scope", () => {
    renderDiscovery({
      filters: {
        ...DEFAULT_COURSE_ROSTER_FILTERS,
        period: { mode: "all" },
        programId: "program-1",
      },
    });

    fireEvent.click(filterBar().getByRole("button", { name: "Reset" }));

    expect(replaceMock).toHaveBeenCalledWith("/faculty/course-rosters");
  });

  it("switches views instantly without a server round trip, preserves scope, and syncs the URL", () => {
    const { rerender } = renderDiscovery({
      filters: { ...DEFAULT_COURSE_ROSTER_FILTERS, search: "CS", period: { mode: "all" } },
    });

    // Same-view click is a no-op.
    fireEvent.click(screen.getByRole("button", { name: "List view" }));
    expect(replaceMock).not.toHaveBeenCalled();
    expect(window.location.search).toBe("");

    // Card switch is instant: no router navigation, URL synced via history.
    fireEvent.click(screen.getByRole("button", { name: "Card view" }));
    expect(replaceMock).not.toHaveBeenCalled();
    expect(window.location.search).toBe("?period=all&search=CS&view=card");
    expect(screen.getByRole("button", { name: "Card view" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(screen.queryByRole("table", { name: "Course assignments" })).not.toBeInTheDocument();

    replaceMock.mockClear();
    rerender(
      <CourseRosterDiscoveryPage
        data={{ ...discovery, search: "CS" }}
        view="card"
        filters={{ ...DEFAULT_COURSE_ROSTER_FILTERS, search: "CS", period: { mode: "all" } }}
        termInstances={termInstances}
        courses={courses}
        programs={programs}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "List view" }));
    expect(replaceMock).not.toHaveBeenCalled();
    expect(window.location.search).toBe("?period=all&search=CS");
  });

  it("adopts server-driven view changes from navigation (sidebar links, deep links)", () => {
    const { rerender } = render(
      <CourseRosterDiscoveryPage
        data={discovery}
        view="card"
        filters={DEFAULT_COURSE_ROSTER_FILTERS}
        termInstances={termInstances}
        courses={courses}
        programs={programs}
      />
    );

    expect(screen.getByRole("button", { name: "Card view" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );

    // The default /faculty/course-rosters URL carries no view param.
    rerender(
      <CourseRosterDiscoveryPage
        data={{ ...discovery, search: "CS" }}
        view="list"
        filters={DEFAULT_COURSE_ROSTER_FILTERS}
        termInstances={termInstances}
        courses={courses}
        programs={programs}
      />
    );
    expect(screen.getByRole("button", { name: "List view" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  });

  it("debounces search navigation, uses route replacement, and returns to page one", () => {
    renderDiscovery({}, { page: 3 });

    const searchbox = screen.getByRole("searchbox", { name: "Search assignments" });
    vi.useFakeTimers();
    try {
      searchbox.focus();
      fireEvent.change(searchbox, { target: { value: "CS1" } });
      act(() => {
        vi.advanceTimersByTime(300);
      });
    } finally {
      vi.useRealTimers();
    }

    expect(replaceMock).toHaveBeenCalledWith("/faculty/course-rosters?search=CS1");
  });

  it("cancels a pending debounce when a server-driven search change lands mid-typing", () => {
    const { rerender } = renderDiscovery({}, { search: "CS" });
    const searchbox = screen.getByRole("searchbox", { name: "Search assignments" });
    vi.useFakeTimers();
    try {
      searchbox.focus();
      fireEvent.change(searchbox, { target: { value: "CS1" } });

      // A server-driven change lands inside the debounce window; the stale
      // draft must not be re-navigated.
      rerender(
        <CourseRosterDiscoveryPage
          data={{ ...discovery, search: "" }}
          view="list"
          filters={DEFAULT_COURSE_ROSTER_FILTERS}
          termInstances={termInstances}
          courses={courses}
          programs={programs}
        />
      );
      act(() => {
        vi.advanceTimersByTime(300);
      });
      expect(replaceMock).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("adopts a server-driven search change once the focused input blurs", () => {
    const { rerender } = renderDiscovery({}, { search: "CS" });
    const searchbox = screen.getByRole("searchbox", { name: "Search assignments" });
    expect(searchbox).toHaveValue("CS");

    searchbox.focus();
    fireEvent.change(searchbox, { target: { value: "CS1" } });
    expect(searchbox).toHaveValue("CS1");

    rerender(
      <CourseRosterDiscoveryPage
        data={{ ...discovery, search: "" }}
        view="list"
        filters={DEFAULT_COURSE_ROSTER_FILTERS}
        termInstances={termInstances}
        courses={courses}
        programs={programs}
      />
    );
    // The in-progress keystroke survives the server-driven change until blur.
    expect(searchbox).toHaveValue("CS1");

    act(() => {
      searchbox.blur();
    });
    expect(searchbox).toHaveValue("");
  });

  it("names the Academic Period in force beside the result count", () => {
    renderDiscovery({}, { total: 40 });

    expect(screen.getByText("40 rosters")).toBeInTheDocument();
    expect(screen.getAllByText("Active assignments").length).toBeGreaterThan(0);
  });

  it("names a selected period on the result count", () => {
    renderDiscovery(
      {
        filters: {
          ...DEFAULT_COURSE_ROSTER_FILTERS,
          period: { mode: "term", termInstanceId: "term-0" },
        },
      },
      { total: 40 }
    );

    expect(screen.getAllByText("2025-2026 — 2nd Semester — 2nd Term").length).toBeGreaterThan(0);
  });

  it("paginates through the shared control while preserving view and scope", () => {
    renderDiscovery(
      { view: "card", filters: { ...DEFAULT_COURSE_ROSTER_FILTERS, period: { mode: "all" } } },
      { total: 60, page: 1 }
    );

    fireEvent.click(screen.getByRole("button", { name: "Go to next page" }));

    expect(replaceMock).toHaveBeenCalledWith("/faculty/course-rosters?page=3&period=all&view=card");
  });

  it("distinguishes search-empty results and clears search while preserving Card", () => {
    renderDiscovery(
      { view: "card" },
      { items: [], total: 0, search: "missing", period: { mode: "all" } }
    );

    expect(screen.getByText("No Course rosters match your search")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Clear search" })).toHaveAttribute(
      "href",
      "/faculty/course-rosters?period=all&view=card"
    );
  });

  it("offers the all-periods scope when no active assignment exists and preserves Card", () => {
    renderDiscovery({ view: "card" }, { items: [], total: 0, period: { mode: "current" } });

    expect(screen.getByText("No active course rosters")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /show all academic periods/i })).toHaveAttribute(
      "href",
      "/faculty/course-rosters?period=all&view=card"
    );
  });

  it("explains a missing active Academic Period instead of offering a dead filter", () => {
    renderDiscovery({}, { items: [], total: 0, activePeriodId: null });

    expect(screen.getByText("No active Academic Period")).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /show all academic periods/i })
    ).not.toBeInTheDocument();
  });

  it("distinguishes an empty widened scope and offers a reset", () => {
    renderDiscovery(
      { filters: { ...DEFAULT_COURSE_ROSTER_FILTERS, period: { mode: "all" } } },
      { items: [], total: 0, period: { mode: "all" } }
    );

    expect(screen.getByText("No course rosters in this scope")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Reset filters" })).toHaveAttribute(
      "href",
      "/faculty/course-rosters"
    );
  });

  it("keeps discovery errors opaque and provides an accessible current-URL retry", () => {
    render(
      <CourseRosterDiscoveryPage
        data={null}
        error="The roster request could not be completed. Support reference: safe-123."
        view="list"
        filters={DEFAULT_COURSE_ROSTER_FILTERS}
        termInstances={termInstances}
        courses={courses}
        programs={programs}
      />
    );

    expect(screen.getByRole("alert")).toHaveTextContent(/support reference: safe-123/i);
    expect(screen.getByRole("alert")).not.toHaveTextContent(/prisma|database|sql/i);
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(refreshMock).toHaveBeenCalledOnce();
  });

  it("states active-roster management and lifecycle read-only scope in discovery copy", () => {
    renderDiscovery();

    expect(
      screen.getByText(/review and manage the active Course assignments you own/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/inactive assignments and completed Academic Periods remain review-only/i)
    ).toBeInTheDocument();
    expect(screen.queryByText(/published-evaluation-locked/i)).not.toBeInTheDocument();
  });

  it("keeps a published roster open and explains automatic evaluation inclusion", () => {
    render(
      <CourseRosterDetailPage
        data={{
          ...detail,
          assignment: {
            ...detail.assignment,
            hasPublishedEvaluation: true,
          },
        }}
      />
    );

    // An active roster earns no state chip; the write controls are the signal.
    expect(
      screen.queryByText("Open roster", { selector: '[data-slot="badge"]' })
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /manage roster/i })).toBeInTheDocument();
    expect(
      screen.getByText(
        /eligible students added while the evaluation is open receive it automatically/i
      )
    ).toBeInTheDocument();
    expect(screen.queryByText(/published evaluation lock/i)).not.toBeInTheDocument();
  });

  it("renders safe error output without technical details", () => {
    render(
      <CourseRosterDetailPage data={null} error="The roster request could not be completed." />
    );
    expect(screen.getByRole("alert")).toHaveTextContent(/unable to load roster/i);
    expect(screen.getByRole("alert")).not.toHaveTextContent(/prisma|database|sql/i);
  });

  it("does not label removed history as evaluation-eligible", () => {
    render(
      <CourseRosterDetailPage
        data={{
          ...detail,
          includeRemoved: true,
          members: [
            {
              ...detail.members[0],
              isActive: false,
              removedAt: new Date(),
              removedByName: "Registrar",
            },
          ],
        }}
      />
    );

    expect(screen.getByText("Removed", { selector: '[data-slot="badge"]' })).toBeInTheDocument();
    expect(screen.queryByText("Ready")).not.toBeInTheDocument();
  });

  it("clears an empty member search and removed scope without leaving the role-owned route", () => {
    render(
      <CourseRosterDetailPage
        data={{ ...detail, members: [], totalMembers: 0, search: "missing", includeRemoved: true }}
        programId="program-1"
        rosterBasePath="/program-head/programs/program-1/course-rosters"
      />
    );

    expect(screen.getByRole("link", { name: "Clear filters" })).toHaveAttribute(
      "href",
      "/program-head/programs/program-1/course-rosters/assignment-1?sort=asc"
    );
  });

  it("presents the course identity header, context strip, and readiness counts", () => {
    render(
      <CourseRosterDetailPage
        data={{
          ...detail,
          activeRosterCount: 3,
          evaluationEligibleCount: 2,
        }}
      />
    );

    expect(
      screen.getByRole("heading", { name: "CS101 · Computing", level: 1 })
    ).toBeInTheDocument();
    expect(screen.getByText("Course roster", { selector: "p" })).toBeInTheDocument();
    expect(
      screen.getByText(
        /Computer Science · 2nd Year · Morning · 2026-2027 - 1st Semester - 1st Term/
      )
    ).toBeInTheDocument();
    const summary = screen.getByRole("region", { name: "Roster evaluation-readiness summary" });
    expect(summary.querySelectorAll('[data-slot="card"]')).toHaveLength(3);
    for (const label of ["On roster", "Ready for evaluation", "Need attention"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("provides a name sort control in the table header that preserves roster filters and route scope", () => {
    useSearchParamsMock.mockReturnValue(
      new URLSearchParams({ search: "grace", removed: "1", sort: "desc" })
    );
    render(
      <CourseRosterDetailPage
        data={{ ...detail, search: "grace", includeRemoved: true, sortDirection: "desc" }}
        programId="program-1"
        rosterBasePath="/program-head/programs/program-1/course-rosters"
      />
    );

    const sort = screen.getByRole("button", { name: /sort by student name/i });
    fireEvent.click(sort);
    expect(replaceMock).toHaveBeenCalledWith(
      "/program-head/programs/program-1/course-rosters/assignment-1?search=grace&removed=1&sort=asc"
    );
  });

  it("preserves student placement details in program-specific roster rows", () => {
    render(<CourseRosterDetailPage data={detail} />);
    const student = screen.getByText("Grace Hopper").closest("tr")!;
    expect(student).toHaveTextContent("BSCS");
    expect(student).toHaveTextContent("Software");
    expect(student).toHaveTextContent("2nd Year");
    expect(student).toHaveTextContent("Morning");
  });

  it("shows management controls only for mutable authorized rosters", () => {
    render(<CourseRosterDetailPage data={detail} />);

    expect(
      screen.getByText("Manage roster", { selector: '[data-slot="card-title"]' })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /manage roster/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /remove/i })).toBeInTheDocument();
  });

  it("places management action at card end on desktop", () => {
    render(<CourseRosterDetailPage data={detail} />);

    const action = screen.getByRole("button", { name: /manage roster/i }).parentElement;
    expect(action).toHaveAttribute("data-slot", "card-action");
    expect(action).toHaveClass("sm:justify-self-end");
  });

  it("streams member search results after a debounce and drops the Search button", () => {
    render(<CourseRosterDetailPage data={detail} />);

    expect(screen.queryByRole("button", { name: "Search" })).not.toBeInTheDocument();

    vi.useFakeTimers();
    try {
      fireEvent.change(screen.getByRole("searchbox", { name: "Search students" }), {
        target: { value: "grace" },
      });
      act(() => {
        vi.advanceTimersByTime(300);
      });
    } finally {
      vi.useRealTimers();
    }
    expect(replaceMock).toHaveBeenCalledWith("/course-rosters/assignment-1?search=grace&sort=asc");
  });

  it("removes standalone sort and removed-students filter controls", () => {
    render(<CourseRosterDetailPage data={{ ...detail, search: "grace" }} />);

    expect(
      screen.queryByRole("checkbox", { name: /include removed students/i })
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /name a→z/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /name z→a/i })).not.toBeInTheDocument();
  });

  it("preserves selected Program roster navigation and action scope", async () => {
    vi.spyOn(rosterActions, "addRosterMembershipAction").mockResolvedValue({
      success: true,
      data: { outcome: "CREATED", message: "Student added to Course roster." },
    });
    vi.spyOn(rosterActions, "searchScopedRosterStudentsAction").mockResolvedValue({
      success: true,
      data: {
        assignmentId: "assignment-1",
        candidates: [
          {
            userId: "student-1",
            name: "Maria Santos",
            email: "maria.santos@acd.edu.ph",
            programId: "program-1",
            programCode: "BSCS",
            programName: "BS Computer Science",
            yearLevel: null,
            section: null,
            majorName: null,
            selectable: true,
            reason: null,
          },
        ],
      },
    });
    render(
      <CourseRosterDetailPage
        data={detail}
        programId="program-1"
        rosterBasePath="/program-head/programs/program-1/course-rosters"
        backHref="/program-head/programs/program-1/course-assignments"
      />
    );

    expect(screen.getByRole("link", { name: /back to my course rosters/i })).toHaveAttribute(
      "href",
      "/program-head/programs/program-1/course-assignments"
    );
    fireEvent.click(screen.getByRole("button", { name: /manage roster/i }));
    fireEvent.click(screen.getByRole("tab", { name: /add one student/i }));
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "Maria" } });
    expect(await screen.findByRole("button", { name: /maria santos/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /maria santos/i }));
    fireEvent.submit(screen.getByRole("button", { name: /add student/i }).closest("form")!);
    await waitFor(() =>
      expect(rosterActions.addRosterMembershipAction).toHaveBeenCalledWith({
        assignmentId: "assignment-1",
        programId: "program-1",
        studentUserId: "student-1",
      })
    );
  });

  it("shows ineligible removed members but disables restore", () => {
    render(
      <CourseRosterDetailPage
        data={{
          ...detail,
          includeRemoved: true,
          members: [
            {
              ...detail.members[0],
              isActive: false,
              eligibility: { eligible: false, reason: "ACCOUNT_INACTIVE" },
            },
          ],
        }}
      />
    );

    expect(screen.getByRole("button", { name: /restore/i })).toBeDisabled();
    expect(screen.getByText(/cannot restore: account inactive/i)).toBeInTheDocument();
  });

  it("states limited removal effect in accessible confirmation", () => {
    render(<CourseRosterDetailPage data={detail} />);

    fireEvent.click(screen.getByRole("button", { name: /remove/i }));

    const dialog = screen.getByRole("alertdialog");
    expect(dialog).toHaveTextContent("Grace Hopper");
    expect(dialog).toHaveTextContent(/only the CS101 roster changes/i);
    expect(dialog).toHaveTextContent(/student account and other classes are not affected/i);
    expect(dialog).toHaveTextContent(/will not receive evaluations for this class/i);
    expect(dialog).toHaveTextContent(/can be added back later/i);
  });

  it("preserves submitted responses when removing from a published roster", () => {
    render(
      <CourseRosterDetailPage
        data={{
          ...detail,
          assignment: { ...detail.assignment, hasPublishedEvaluation: true },
        }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /remove/i }));

    const dialog = screen.getByRole("alertdialog");
    expect(dialog).toHaveTextContent(/submitted response, if any, is kept/i);
    expect(dialog).toHaveTextContent(/lose access to this evaluation while removed/i);
  });

  it("hides write controls for read-only or unauthorized detail data", () => {
    render(<CourseRosterDetailPage data={{ ...detail, canManage: false, canMutate: false }} />);

    expect(screen.queryByRole("button", { name: /manage roster/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /remove/i })).not.toBeInTheDocument();
  });

  it("describes the currently available name parsing step", () => {
    render(<CourseRosterDetailPage data={detail} />);

    expect(screen.getByText(/Review parsed rows before anyone is added/i)).toBeInTheDocument();
  });

  it.each(["INACTIVE_ASSIGNMENT", "INACTIVE_ACADEMIC_PERIOD"] as const)(
    "hides management entry for %s rosters",
    (rosterState) => {
      render(
        <CourseRosterDetailPage
          data={{
            ...detail,
            assignment: { ...detail.assignment, rosterState },
          }}
        />
      );

      expect(screen.queryByRole("button", { name: /manage roster/i })).not.toBeInTheDocument();
    }
  );

  it("provides accessible CSV import, template download, and the review phase", async () => {
    vi.spyOn(rosterActions, "previewCourseRosterAction").mockResolvedValue({
      success: true,
      data: {
        assignmentId: "assignment-1",
        rows: [
          {
            sourceIndex: 2,
            submittedName: "Maria Santos",
            resolution: { status: "EXACT_MATCH", reason: "EXACT", candidateIds: ["student-1"] },
            disposition: "READY_CREATE",
            candidates: [
              {
                userId: "student-1",
                name: "Maria Santos",
                email: "maria.santos@acd.edu.ph",
                programId: "program-1",
                programCode: "BSED",
                programName: "Education",
                yearLevel: "FIRST_YEAR",
                section: "MORNING",
                majorName: null,
                selectable: true,
                reason: null,
              },
            ],
          },
          {
            sourceIndex: 3,
            submittedName: "Invalid name",
            resolution: { status: "NO_MATCH", reason: "NO_EVIDENCE", candidateIds: [] },
            disposition: null,
            candidates: [],
          },
        ],
        summary: {
          readyToCreate: 1,
          willRestore: 0,
          alreadyActive: 0,
          needsReview: 1,
          ineligible: 0,
        },
      },
    });
    const createObjectURL = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:test");
    const revokeObjectURL = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined);

    render(<CourseRosterDetailPage data={detail} programId="program-1" />);
    fireEvent.click(screen.getByRole("button", { name: /manage roster/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /download template/i }));
    expect(createObjectURL).toHaveBeenCalled();
    expect(click).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:test");

    const input = screen.getByLabelText("Roster CSV file");
    const file = new File(["name\nMaria Santos\nInvalid name\n"], "roster.csv", {
      type: "text/csv",
    });
    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(screen.getByRole("button", { name: /prepare preview/i }));

    expect(await screen.findByRole("group", { name: "Wizard progress" })).toHaveTextContent(
      "Review and resolve"
    );
    expect(screen.getAllByText(/maria santos/i).length).toBeGreaterThan(0);
    expect(screen.getByText("Exact match")).toBeInTheDocument();
    expect(screen.getByText("No match")).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "Roster preview: All" })).toBeInTheDocument();
    for (const column of ["Uploaded name", "System account", "Match and result", "Action"]) {
      expect(screen.getByRole("columnheader", { name: column })).toBeInTheDocument();
    }
    expect(screen.getByRole("button", { name: "Ready: 1" })).toBeInTheDocument();
    expect(screen.getAllByText("Invalid name").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Resolve: 1" })).toBeInTheDocument();
    expect(rosterActions.previewCourseRosterAction).toHaveBeenCalledWith({
      assignmentId: "assignment-1",
      programId: "program-1",
      rows: [
        { sourceIndex: 2, submittedName: "Maria Santos", status: "VALID" },
        { sourceIndex: 3, submittedName: "Invalid name", status: "VALID" },
      ],
    });
  });

  it("keeps invalid CSV feedback in the member-input phase", () => {
    render(<RosterManagementDialog assignmentId="assignment-1" />);
    fireEvent.click(screen.getByRole("button", { name: /manage roster/i }));

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, {
      target: { files: [new File(["not-a-roster"], "roster.txt", { type: "text/plain" })] },
    });

    expect(screen.getByRole("alert")).toHaveTextContent("Choose a CSV file.");
    expect(screen.getByRole("group", { name: "Wizard progress" })).toHaveTextContent("Add members");
    expect(screen.queryByText("Maria Santos")).not.toBeInTheDocument();
  });

  it("keeps parser and action failures adjacent to CSV input", async () => {
    render(<RosterManagementDialog assignmentId="assignment-1" />);
    fireEvent.click(screen.getByRole("button", { name: /manage roster/i }));

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, {
      target: { files: [new File(["name\n"], "roster.csv", { type: "text/csv" })] },
    });
    fireEvent.click(screen.getByRole("button", { name: /prepare preview/i }));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(/CSV must contain one name column/i)
    );
    expect(screen.getByRole("group", { name: "Wizard progress" })).toHaveTextContent("Add members");

    vi.spyOn(rosterActions, "previewCourseRosterAction").mockResolvedValue({
      success: false,
      error: "The roster preview could not be completed.",
    });
    fireEvent.change(input, {
      target: {
        files: [new File(["name\nMaria Santos\n"], "roster.csv", { type: "text/csv" })],
      },
    });
    fireEvent.click(screen.getByRole("button", { name: /prepare preview/i }));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        /The roster preview could not be completed/i
      )
    );
    expect(screen.getByRole("group", { name: "Wizard progress" })).toHaveTextContent("Add members");
  });

  it("uses a Drawer on mobile while keeping the CSV import method", () => {
    mockMatchMedia(false);
    render(<RosterManagementDialog assignmentId="assignment-1" />);
    fireEvent.click(screen.getByRole("button", { name: /manage roster/i }));

    expect(document.querySelector('[data-slot="drawer-popup"]')).toBeInTheDocument();
    expect(screen.getByLabelText("Roster CSV file")).toBeInTheDocument();
  });

  it("restores focus to the trigger after closing the mobile Drawer", async () => {
    mockMatchMedia(false);
    render(<RosterManagementDialog assignmentId="assignment-1" />);
    const trigger = screen.getByRole("button", { name: /manage roster/i });
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    await waitFor(() =>
      expect(document.querySelector('[data-slot="drawer-popup"]')).not.toBeInTheDocument()
    );
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });

  it("renders the review and results steps inside the mobile Drawer", async () => {
    mockMatchMedia(false);
    vi.spyOn(rosterActions, "previewCourseRosterAction").mockResolvedValue({
      success: true,
      data: {
        assignmentId: "assignment-1",
        rows: [
          {
            sourceIndex: 2,
            submittedName: "Maria Santos",
            resolution: { status: "EXACT_MATCH", reason: "EXACT", candidateIds: ["student-1"] },
            disposition: "READY_CREATE",
            candidates: [
              {
                userId: "student-1",
                name: "Maria Santos",
                email: "maria.santos@acd.edu.ph",
                programId: "program-1",
                programCode: "BSED",
                programName: "Education",
                yearLevel: null,
                section: null,
                majorName: null,
                selectable: true,
                reason: null,
              },
            ],
          },
        ],
        summary: {
          readyToCreate: 1,
          willRestore: 0,
          alreadyActive: 0,
          needsReview: 0,
          ineligible: 0,
        },
      },
    });
    vi.spyOn(rosterActions, "confirmRosterResolutionAction").mockResolvedValue({
      success: true,
      data: { rows: [{ sourceIndex: 2, outcome: "CREATED", error: null }] },
    });
    render(<RosterManagementDialog assignmentId="assignment-1" />);
    fireEvent.click(screen.getByRole("button", { name: /manage roster/i }));
    expect(document.querySelector('[data-slot="drawer-popup"]')).toBeInTheDocument();

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, {
      target: {
        files: [new File(["name\nMaria Santos\n"], "roster.csv", { type: "text/csv" })],
      },
    });
    fireEvent.click(screen.getByRole("button", { name: /prepare preview/i }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /add \d+ students?/i })).toBeEnabled()
    );

    expect(document.querySelector('[data-slot="drawer-popup"]')).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Roster preview: All" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Filter preview rows" })).toHaveTextContent(
      "All (1)"
    );
    expect(screen.getByText("Exact match")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Skip" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /add \d+ students?/i }));
    await waitFor(() => expect(screen.getByText(/Confirmation complete/)).toBeInTheDocument());
    expect(screen.getByText("Added to roster")).toBeInTheDocument();
    expect(document.querySelector('[data-slot="drawer-popup"]')).toBeInTheDocument();
  });

  it("resets session state after results are closed and reopened", async () => {
    vi.spyOn(rosterActions, "previewCourseRosterAction").mockResolvedValue({
      success: true,
      data: {
        assignmentId: "assignment-1",
        rows: [
          {
            sourceIndex: 2,
            submittedName: "Maria Santos",
            resolution: { status: "EXACT_MATCH", reason: "EXACT", candidateIds: ["student-1"] },
            disposition: "READY_CREATE",
            candidates: [
              {
                userId: "student-1",
                name: "Maria Santos",
                email: "maria.santos@acd.edu.ph",
                programId: "program-1",
                programCode: "BSED",
                programName: "Education",
                yearLevel: "FIRST_YEAR",
                section: "MORNING",
                majorName: null,
                selectable: true,
                reason: null,
              },
            ],
          },
          {
            sourceIndex: 3,
            submittedName: "Invalid name",
            resolution: { status: "NO_MATCH", reason: "NO_EVIDENCE", candidateIds: [] },
            disposition: null,
            candidates: [],
          },
        ],
        summary: {
          readyToCreate: 1,
          willRestore: 0,
          alreadyActive: 0,
          needsReview: 1,
          ineligible: 0,
        },
      },
    });
    vi.spyOn(rosterActions, "confirmRosterResolutionAction").mockResolvedValue({
      success: true,
      data: {
        rows: [
          { sourceIndex: 2, outcome: "CREATED", error: null },
          { sourceIndex: 3, outcome: "UNPROCESSED", error: "This row was not processed." },
        ],
      },
    });
    render(<RosterManagementDialog assignmentId="assignment-1" />);
    fireEvent.click(screen.getByRole("button", { name: /manage roster/i }));
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, {
      target: {
        files: [new File(["name\nMaria Santos\n"], "roster.csv", { type: "text/csv" })],
      },
    });
    fireEvent.click(screen.getByRole("button", { name: /prepare preview/i }));
    await waitFor(() =>
      expect(screen.getByRole("group", { name: "Wizard progress" })).toHaveTextContent(
        "Review and resolve"
      )
    );
    // The unresolved no-match row must be explicitly skipped before review completion.
    expect(screen.getByRole("button", { name: /add \d+ students?/i })).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent(/Resolve or skip 1 row before continuing/i);
    fireEvent.click(screen.getAllByRole("button", { name: "Skip" })[1]);
    expect(screen.getByRole("button", { name: /add \d+ students?/i })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: /add \d+ students?/i }));
    await waitFor(() => expect(screen.getByText(/Confirmation complete/)).toBeInTheDocument());
    expect(screen.getByText("Added to roster")).toBeInTheDocument();
    expect(screen.getAllByText("Not processed").length).toBeGreaterThan(0);

    // Confirmed results are final: Done closes without a discard prompt.
    await waitFor(() => expect(screen.getByRole("button", { name: "Done" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole("button", { name: /manage roster/i }))
    );
    fireEvent.click(screen.getByRole("button", { name: /manage roster/i }));

    expect(screen.getByLabelText("Roster CSV file")).toBeInTheDocument();
    expect(screen.queryByText("Maria Santos")).not.toBeInTheDocument();
    expect(screen.queryByText("roster.csv")).not.toBeInTheDocument();
  });

  it("supports skip, unskip, change, and suggested-match search in the review phase", async () => {
    vi.spyOn(rosterActions, "previewCourseRosterAction").mockResolvedValue({
      success: true,
      data: {
        assignmentId: "assignment-1",
        rows: [
          {
            sourceIndex: 2,
            submittedName: "Maria Santos",
            resolution: {
              status: "SUGGESTED_MATCH",
              reason: "MIDDLE_TOKEN",
              candidateIds: ["student-1"],
            },
            disposition: "READY_CREATE",
            candidates: [
              {
                userId: "student-1",
                name: "Maria Santos",
                email: "maria.santos@acd.edu.ph",
                programId: "program-1",
                programCode: "BSED",
                programName: "Education",
                yearLevel: null,
                section: null,
                majorName: null,
                selectable: true,
                reason: null,
              },
            ],
          },
          {
            sourceIndex: 3,
            submittedName: "Unknown Student",
            resolution: { status: "NO_MATCH", reason: "NO_EVIDENCE", candidateIds: [] },
            disposition: null,
            candidates: [],
          },
          {
            sourceIndex: 4,
            submittedName: "Active Student",
            resolution: { status: "EXACT_MATCH", reason: "EXACT", candidateIds: ["student-3"] },
            disposition: "ALREADY_ACTIVE",
            candidates: [
              {
                userId: "student-3",
                name: "Active Student",
                email: "active.student@acd.edu.ph",
                programId: "program-1",
                programCode: null,
                programName: null,
                yearLevel: null,
                section: null,
                majorName: null,
                selectable: true,
                reason: null,
              },
            ],
          },
        ],
        summary: {
          readyToCreate: 0,
          willRestore: 0,
          alreadyActive: 1,
          needsReview: 1,
          ineligible: 0,
        },
      },
    });
    vi.spyOn(rosterActions, "searchScopedRosterStudentsAction").mockResolvedValue({
      success: true,
      data: {
        assignmentId: "assignment-1",
        candidates: [
          {
            userId: "student-2",
            name: "Maria Ann Santos",
            email: "maria.ann.santos@acd.edu.ph",
            programId: "program-1",
            programCode: "BSED",
            programName: "Education",
            yearLevel: null,
            section: null,
            majorName: null,
            selectable: true,
            reason: null,
          },
        ],
      },
    });
    render(<RosterManagementDialog assignmentId="assignment-1" />);
    fireEvent.click(screen.getByRole("button", { name: /manage roster/i }));
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, {
      target: {
        files: [
          new File(["name\nMaria Santos\nUnknown Student\nActive Student\n"], "roster.csv", {
            type: "text/csv",
          }),
        ],
      },
    });
    fireEvent.click(screen.getByRole("button", { name: /prepare preview/i }));
    await waitFor(() =>
      expect(screen.getByRole("group", { name: "Wizard progress" })).toHaveTextContent(
        "Review and resolve"
      )
    );
    // Suggested matches and unresolved rows gate review completion.
    expect(
      screen.getByRole("button", { name: /review complete|add \d+ students?/i })
    ).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent(/Acknowledge 1 suggested match/i);
    expect(screen.getByRole("alert")).toHaveTextContent(/Resolve or skip 1 row before continuing/i);

    expect(screen.getByText("Suggested match")).toBeInTheDocument();
    expect(screen.getByText("extra or omitted middle names")).toBeInTheDocument();
    expect(screen.getByText(/No Students will be added or restored/)).toBeInTheDocument();
    // Suggested rows need review even when the disposition is ready.
    expect(screen.getByRole("button", { name: "Review: 1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ready: 0" })).toBeInTheDocument();
    // Already-active rows stay informational: exactly two rows offer Skip.
    expect(screen.getAllByRole("button", { name: "Skip" })).toHaveLength(2);

    // A suggested row can open scoped search to change the prepared account.
    fireEvent.click(screen.getByRole("button", { name: "Change" }));
    const searchbox = screen.getByRole("searchbox");
    fireEvent.change(searchbox, { target: { value: "Maria Ann" } });
    fireEvent.click(await screen.findByRole("button", { name: /maria ann santos/i }));
    expect(screen.getByText("Maria Ann Santos")).toBeInTheDocument();
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
    // A manually resolved row leaves Review and joins the Ready group, and the
    // prepared disposition no longer applies to the chosen account.
    expect(screen.getByRole("button", { name: "Ready: 1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Review: 0" })).toBeInTheDocument();
    expect(screen.queryByText("Ready to add")).not.toBeInTheDocument();

    // Clearing the selection returns the row to its prepared suggestion.
    fireEvent.click(screen.getByRole("button", { name: "Change" }));
    expect(screen.queryByText("Maria Ann Santos")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Change" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Review: 1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ready: 0" })).toBeInTheDocument();

    // Skip and unskip a no-match row without blocking the rest of the preview.
    const noMatchSkip = screen.getAllByRole("button", { name: "Skip" })[1];
    fireEvent.click(noMatchSkip);
    expect(screen.getByRole("button", { name: "Unskip" })).toBeInTheDocument();
    expect(screen.getByText("Skipped", { selector: '[data-slot="badge"]' })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Skipped: 1" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Unskip" }));
    expect(screen.getByRole("button", { name: "Skipped: 0" })).toBeInTheDocument();
    // Acknowledgement plus an explicit skip satisfy the review guards.
    const ack = screen.getByRole("checkbox", { name: /I reviewed 1 suggested account/ });
    fireEvent.click(ack);
    expect(ack).toBeChecked();
    expect(screen.getByRole("button", { name: /add \d+ students?/i })).toBeDisabled();
    fireEvent.click(screen.getAllByRole("button", { name: "Skip" })[1]);
    expect(screen.getByRole("button", { name: /add \d+ students?/i })).toBeEnabled();
  });

  it("uses one native upload button without nested interactive controls", () => {
    render(<RosterManagementDialog assignmentId="assignment-1" />);
    fireEvent.click(screen.getByRole("button", { name: /manage roster/i }));
    const upload = screen.getByRole("button", { name: "Upload a CSV roster file" });
    expect(upload.tagName).toBe("BUTTON");
    expect(upload.querySelector("button, [role='button'], input, a")).toBeNull();
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const browse = vi.spyOn(input, "click").mockImplementation(() => undefined);
    fireEvent.click(upload);
    expect(browse).toHaveBeenCalledOnce();
  });

  it("blocks closing while a preview is pending", async () => {
    let finishPreview: () => void = () => undefined;
    const pendingPreview = new Promise<void>((resolve) => {
      finishPreview = resolve;
    });
    vi.spyOn(rosterActions, "previewCourseRosterAction").mockImplementation(async () => {
      await pendingPreview;
      return {
        success: true,
        data: {
          assignmentId: "assignment-1",
          rows: [],
          summary: {
            readyToCreate: 0,
            willRestore: 0,
            alreadyActive: 0,
            needsReview: 0,
            ineligible: 0,
          },
        },
      };
    });
    render(<RosterManagementDialog assignmentId="assignment-1" />);
    fireEvent.click(screen.getByRole("button", { name: /manage roster/i }));
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, {
      target: {
        files: [new File(["name\nMaria Santos\n"], "roster.csv", { type: "text/csv" })],
      },
    });
    fireEvent.click(screen.getByRole("button", { name: /prepare preview/i }));

    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Upload a CSV roster file" })).toHaveAttribute(
      "aria-disabled",
      "true"
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    finishPreview();
    await waitFor(() =>
      expect(screen.getByRole("group", { name: "Wizard progress" })).toHaveTextContent(
        "Review and resolve"
      )
    );
    // A dirty preview asks before discarding on Escape.
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.getByRole("alertdialog")).toHaveTextContent("Discard preview?");
    // Escape again keeps editing; the workspace stays open.
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Wizard progress" })).toHaveTextContent(
      "Review and resolve"
    );
    // Confirming discard closes the workspace and restores trigger focus.
    fireEvent.keyDown(document, { key: "Escape" });
    fireEvent.click(screen.getByRole("button", { name: "Discard preview" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole("button", { name: /manage roster/i }))
    );
  });

  it("requires count-aware acknowledgement of suggested matches and resets on change", async () => {
    vi.spyOn(rosterActions, "previewCourseRosterAction").mockResolvedValue({
      success: true,
      data: {
        assignmentId: "assignment-1",
        rows: [
          {
            sourceIndex: 2,
            submittedName: "Maria Santos",
            resolution: {
              status: "SUGGESTED_MATCH",
              reason: "MIDDLE_TOKEN",
              candidateIds: ["student-1"],
            },
            disposition: "READY_CREATE",
            candidates: [
              {
                userId: "student-1",
                name: "Maria Santos",
                email: "maria.santos@acd.edu.ph",
                programId: "program-1",
                programCode: "BSED",
                programName: "Education",
                yearLevel: null,
                section: null,
                majorName: null,
                selectable: true,
                reason: null,
              },
            ],
          },
        ],
        summary: {
          readyToCreate: 0,
          willRestore: 0,
          alreadyActive: 0,
          needsReview: 1,
          ineligible: 0,
        },
      },
    });
    vi.spyOn(rosterActions, "searchScopedRosterStudentsAction").mockResolvedValue({
      success: true,
      data: {
        assignmentId: "assignment-1",
        candidates: [
          {
            userId: "student-2",
            name: "Maria Ann Santos",
            email: "maria.ann.santos@acd.edu.ph",
            programId: "program-1",
            programCode: "BSED",
            programName: "Education",
            yearLevel: null,
            section: null,
            majorName: null,
            selectable: true,
            reason: null,
          },
        ],
      },
    });
    render(<RosterManagementDialog assignmentId="assignment-1" />);
    fireEvent.click(screen.getByRole("button", { name: /manage roster/i }));
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, {
      target: {
        files: [new File(["name\nMaria Santos\n"], "roster.csv", { type: "text/csv" })],
      },
    });
    fireEvent.click(screen.getByRole("button", { name: /prepare preview/i }));
    await waitFor(() => expect(screen.getByText("Suggested match")).toBeInTheDocument());

    const reviewComplete = screen.getByRole("button", {
      name: /review complete|add \d+ students?/i,
    });
    const ack = screen.getByRole("checkbox", { name: /I reviewed 1 suggested account/ });
    expect(reviewComplete).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent(
      /Acknowledge 1 suggested match before continuing/i
    );

    // A count-aware checkbox acknowledges the current suggestion set.
    fireEvent.click(ack);
    expect(ack).toBeChecked();
    expect(reviewComplete).toBeEnabled();
    expect(screen.getByText(/1 Student is ready to add or restore/)).toBeInTheDocument();

    // Changing the suggested account clears the acknowledgement.
    fireEvent.click(screen.getByRole("button", { name: "Change" }));
    const searchbox = screen.getByRole("searchbox");
    fireEvent.change(searchbox, { target: { value: "Maria Ann" } });
    fireEvent.click(await screen.findByRole("button", { name: /maria ann santos/i }));
    expect(screen.getByRole("button", { name: "Ready: 1" })).toBeInTheDocument();

    // Returning the row to its suggestion shows the acknowledgement reset.
    fireEvent.click(screen.getByRole("button", { name: "Change" }));
    expect(screen.getByRole("button", { name: "Review: 1" })).toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", { name: /I reviewed 1 suggested account/ })
    ).not.toBeChecked();
    expect(reviewComplete).toBeDisabled();
  });

  it("blocks review completion while a row is unresolved", async () => {
    vi.spyOn(rosterActions, "previewCourseRosterAction").mockResolvedValue({
      success: true,
      data: {
        assignmentId: "assignment-1",
        rows: [
          {
            sourceIndex: 2,
            submittedName: "Maria Santos",
            resolution: { status: "EXACT_MATCH", reason: "EXACT", candidateIds: ["student-1"] },
            disposition: "READY_CREATE",
            candidates: [
              {
                userId: "student-1",
                name: "Maria Santos",
                email: "maria.santos@acd.edu.ph",
                programId: "program-1",
                programCode: "BSED",
                programName: "Education",
                yearLevel: null,
                section: null,
                majorName: null,
                selectable: true,
                reason: null,
              },
            ],
          },
          {
            sourceIndex: 3,
            submittedName: "Invalid name",
            resolution: { status: "INVALID_NAME", reason: "INVALID", candidateIds: [] },
            disposition: null,
            candidates: [],
          },
        ],
        summary: {
          readyToCreate: 1,
          willRestore: 0,
          alreadyActive: 0,
          needsReview: 1,
          ineligible: 0,
        },
      },
    });
    render(<RosterManagementDialog assignmentId="assignment-1" />);
    fireEvent.click(screen.getByRole("button", { name: /manage roster/i }));
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, {
      target: {
        files: [new File(["name\nMaria Santos\n"], "roster.csv", { type: "text/csv" })],
      },
    });
    fireEvent.click(screen.getByRole("button", { name: /prepare preview/i }));
    await waitFor(() =>
      expect(screen.getByRole("group", { name: "Wizard progress" })).toHaveTextContent(
        "Review and resolve"
      )
    );

    const reviewComplete = screen.getByRole("button", { name: /add \d+ students?/i });
    expect(reviewComplete).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent(/Resolve or skip 1 row before continuing/i);

    // An explicit skip resolves the invalid row.
    fireEvent.click(screen.getAllByRole("button", { name: "Skip" })[1]);
    expect(screen.getByRole("button", { name: "Skipped: 1" })).toBeInTheDocument();
    expect(reviewComplete).toBeEnabled();
  });

  it("blocks review completion when one account is selected for two rows", async () => {
    vi.spyOn(rosterActions, "previewCourseRosterAction").mockResolvedValue({
      success: true,
      data: {
        assignmentId: "assignment-1",
        rows: [
          {
            sourceIndex: 2,
            submittedName: "John Paul Santos",
            resolution: { status: "NO_MATCH", reason: "NO_EVIDENCE", candidateIds: [] },
            disposition: null,
            candidates: [],
          },
          {
            sourceIndex: 3,
            submittedName: "John Paul Santos",
            resolution: { status: "NO_MATCH", reason: "NO_EVIDENCE", candidateIds: [] },
            disposition: null,
            candidates: [],
          },
        ],
        summary: {
          readyToCreate: 0,
          willRestore: 0,
          alreadyActive: 0,
          needsReview: 2,
          ineligible: 0,
        },
      },
    });
    vi.spyOn(rosterActions, "searchScopedRosterStudentsAction").mockResolvedValue({
      success: true,
      data: {
        assignmentId: "assignment-1",
        candidates: [
          {
            userId: "student-1",
            name: "John Paul Santos",
            email: "john.paul.santos@acd.edu.ph",
            programId: "program-1",
            programCode: "BSCS",
            programName: "Computer Science",
            yearLevel: "SECOND_YEAR",
            section: "MORNING",
            majorName: null,
            selectable: true,
            reason: null,
          },
          {
            userId: "student-2",
            name: "John Paul Santos",
            email: "jp.santos@acd.edu.ph",
            programId: "program-1",
            programCode: "BSCS",
            programName: "Computer Science",
            yearLevel: "SECOND_YEAR",
            section: "AFTERNOON",
            majorName: null,
            selectable: true,
            reason: null,
          },
        ],
      },
    });
    render(<RosterManagementDialog assignmentId="assignment-1" />);
    fireEvent.click(screen.getByRole("button", { name: /manage roster/i }));
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, {
      target: {
        files: [
          new File(["name\nJohn Paul Santos\nJohn Paul Santos\n"], "roster.csv", {
            type: "text/csv",
          }),
        ],
      },
    });
    fireEvent.click(screen.getByRole("button", { name: /prepare preview/i }));
    await waitFor(() =>
      expect(screen.getByRole("group", { name: "Wizard progress" })).toHaveTextContent(
        "Review and resolve"
      )
    );

    // Resolve both identical-name rows to the same account.
    const searchButtons = screen.getAllByRole("button", { name: "Search candidate" });
    fireEvent.click(searchButtons[0]);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "John" } });
    fireEvent.click(await screen.findByRole("button", { name: /john.paul.santos@acd.edu.ph/i }));
    fireEvent.click(screen.getAllByRole("button", { name: "Search candidate" })[0]);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "John" } });
    fireEvent.click(await screen.findByRole("button", { name: /john.paul.santos@acd.edu.ph/i }));

    const reviewComplete = screen.getByRole("button", { name: /add \d+ students?/i });
    expect(reviewComplete).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent(
      /The same Student is selected for rows 2 and 3/
    );

    // Remapping one row to a different account satisfies the duplicate guard.
    fireEvent.click(screen.getAllByRole("button", { name: "Change" })[1]);
    fireEvent.click(screen.getByRole("button", { name: "Search candidate" }));
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "John" } });
    fireEvent.click(await screen.findByRole("button", { name: /jp.santos@acd.edu.ph/i }));
    expect(reviewComplete).toBeEnabled();
  });

  it("blocks review completion when exact matches repeat one account and unblocks on skip", async () => {
    vi.spyOn(rosterActions, "previewCourseRosterAction").mockResolvedValue({
      success: true,
      data: {
        assignmentId: "assignment-1",
        rows: [
          {
            sourceIndex: 2,
            submittedName: "Maria Santos",
            resolution: { status: "EXACT_MATCH", reason: "EXACT", candidateIds: ["student-1"] },
            disposition: "READY_CREATE",
            candidates: [
              {
                userId: "student-1",
                name: "Maria Santos",
                email: "maria.santos@acd.edu.ph",
                programId: "program-1",
                programCode: "BSED",
                programName: "Education",
                yearLevel: null,
                section: null,
                majorName: null,
                selectable: true,
                reason: null,
              },
            ],
          },
          {
            sourceIndex: 3,
            submittedName: "Maria Santos",
            resolution: { status: "EXACT_MATCH", reason: "EXACT", candidateIds: ["student-1"] },
            disposition: "READY_CREATE",
            candidates: [
              {
                userId: "student-1",
                name: "Maria Santos",
                email: "maria.santos@acd.edu.ph",
                programId: "program-1",
                programCode: "BSED",
                programName: "Education",
                yearLevel: null,
                section: null,
                majorName: null,
                selectable: true,
                reason: null,
              },
            ],
          },
        ],
        summary: {
          readyToCreate: 2,
          willRestore: 0,
          alreadyActive: 0,
          needsReview: 0,
          ineligible: 0,
        },
      },
    });
    render(<RosterManagementDialog assignmentId="assignment-1" />);
    fireEvent.click(screen.getByRole("button", { name: /manage roster/i }));
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, {
      target: {
        files: [
          new File(["name\nMaria Santos\nMaria Santos\n"], "roster.csv", { type: "text/csv" }),
        ],
      },
    });
    fireEvent.click(screen.getByRole("button", { name: /prepare preview/i }));
    const reviewComplete = await screen.findByRole("button", { name: /add \d+ students?/i });

    // Two identical exact names prepare the same account; the duplicate blocks review.
    expect(reviewComplete).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent(
      /The same Student is selected for rows 2 and 3/
    );
    expect(screen.getAllByRole("button", { name: "Change" })).toHaveLength(2);

    // Skipping one repeated row removes its prepared identity and unblocks.
    fireEvent.click(screen.getAllByRole("button", { name: "Skip" })[0]);
    expect(screen.getByRole("button", { name: "Skipped: 1" })).toBeInTheDocument();
    expect(reviewComplete).toBeEnabled();
  });

  it("confirms before discarding a dirty preview and keeps editing", async () => {
    vi.spyOn(rosterActions, "previewCourseRosterAction").mockResolvedValue({
      success: true,
      data: {
        assignmentId: "assignment-1",
        rows: [
          {
            sourceIndex: 2,
            submittedName: "Maria Santos",
            resolution: { status: "EXACT_MATCH", reason: "EXACT", candidateIds: ["student-1"] },
            disposition: "READY_CREATE",
            candidates: [
              {
                userId: "student-1",
                name: "Maria Santos",
                email: "maria.santos@acd.edu.ph",
                programId: "program-1",
                programCode: "BSED",
                programName: "Education",
                yearLevel: null,
                section: null,
                majorName: null,
                selectable: true,
                reason: null,
              },
            ],
          },
        ],
        summary: {
          readyToCreate: 1,
          willRestore: 0,
          alreadyActive: 0,
          needsReview: 0,
          ineligible: 0,
        },
      },
    });
    render(<RosterManagementDialog assignmentId="assignment-1" />);
    fireEvent.click(screen.getByRole("button", { name: /manage roster/i }));
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, {
      target: {
        files: [new File(["name\nMaria Santos\n"], "roster.csv", { type: "text/csv" })],
      },
    });
    fireEvent.click(screen.getByRole("button", { name: /prepare preview/i }));
    await waitFor(() =>
      expect(screen.getByRole("group", { name: "Wizard progress" })).toHaveTextContent(
        "Review and resolve"
      )
    );

    // Canceling a dirty preview asks first; Keep editing stays in the workspace.
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByRole("alertdialog")).toHaveTextContent("Discard preview?");
    fireEvent.click(screen.getByRole("button", { name: "Keep editing" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ready: 1" })).toBeInTheDocument();

    // Confirming the discard closes the workspace and restores trigger focus.
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    fireEvent.click(screen.getByRole("button", { name: "Discard preview" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole("button", { name: /manage roster/i }))
    );
  });

  it("confirms discard inside the mobile Drawer", async () => {
    mockMatchMedia(false);
    vi.spyOn(rosterActions, "previewCourseRosterAction").mockResolvedValue({
      success: true,
      data: {
        assignmentId: "assignment-1",
        rows: [
          {
            sourceIndex: 2,
            submittedName: "Maria Santos",
            resolution: { status: "EXACT_MATCH", reason: "EXACT", candidateIds: ["student-1"] },
            disposition: "READY_CREATE",
            candidates: [
              {
                userId: "student-1",
                name: "Maria Santos",
                email: "maria.santos@acd.edu.ph",
                programId: "program-1",
                programCode: "BSED",
                programName: "Education",
                yearLevel: null,
                section: null,
                majorName: null,
                selectable: true,
                reason: null,
              },
            ],
          },
        ],
        summary: {
          readyToCreate: 1,
          willRestore: 0,
          alreadyActive: 0,
          needsReview: 0,
          ineligible: 0,
        },
      },
    });
    render(<RosterManagementDialog assignmentId="assignment-1" />);
    fireEvent.click(screen.getByRole("button", { name: /manage roster/i }));
    expect(document.querySelector('[data-slot="drawer-popup"]')).toBeInTheDocument();
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, {
      target: {
        files: [new File(["name\nMaria Santos\n"], "roster.csv", { type: "text/csv" })],
      },
    });
    fireEvent.click(screen.getByRole("button", { name: /prepare preview/i }));
    await waitFor(() =>
      expect(screen.getByRole("group", { name: "Wizard progress" })).toHaveTextContent(
        "Review and resolve"
      )
    );

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByRole("alertdialog")).toHaveTextContent("Discard preview?");
    fireEvent.click(screen.getByRole("button", { name: "Discard preview" }));
    await waitFor(() =>
      expect(document.querySelector('[data-slot="drawer-popup"]')).not.toBeInTheDocument()
    );
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole("button", { name: /manage roster/i }))
    );
  });
});

describe("buildReviewGuards", () => {
  const candidate = (userId: string): CourseRosterPreviewCandidate => ({
    userId,
    name: "Maria Santos",
    email: `${userId}@acd.edu.ph`,
    programId: "program-1",
    programCode: "BSED",
    programName: "Education",
    yearLevel: null,
    section: null,
    majorName: null,
    selectable: true,
    reason: null,
  });

  const exactRow = (sourceIndex: number, userId: string): CourseRosterPreviewRow => ({
    sourceIndex,
    submittedName: "Maria Santos",
    resolution: { status: "EXACT_MATCH", reason: "EXACT", candidateIds: [userId] },
    disposition: "READY_CREATE",
    candidates: [candidate(userId)],
  });

  const suggestedRow = (
    sourceIndex: number,
    userId: string,
    disposition: CourseRosterPreviewDisposition = "READY_CREATE"
  ): CourseRosterPreviewRow => ({
    sourceIndex,
    submittedName: "Maria Santos",
    resolution: { status: "SUGGESTED_MATCH", reason: "MIDDLE_TOKEN", candidateIds: [userId] },
    disposition,
    candidates: [candidate(userId)],
  });

  const noMatchRow = (sourceIndex: number): CourseRosterPreviewRow => ({
    sourceIndex,
    submittedName: "Unknown Student",
    resolution: { status: "NO_MATCH", reason: "NO_EVIDENCE", candidateIds: [] },
    disposition: null,
    candidates: [],
  });

  it("treats prepared exact matches as selected identities", () => {
    const preview: CourseRosterPreview = {
      assignmentId: "assignment-1",
      rows: [exactRow(2, "student-1"), exactRow(3, "student-1")],
      summary: {
        readyToCreate: 2,
        willRestore: 0,
        alreadyActive: 0,
        needsReview: 0,
        ineligible: 0,
      },
    };
    const guards = buildReviewGuards({
      preview,
      skippedIndexes: new Set(),
      selectedCandidateByIndex: {},
      suggestionsAcknowledged: false,
    });
    expect(guards.reviewBlockers).toEqual([
      "The same Student is selected for rows 2 and 3. Change or skip one before continuing.",
    ]);

    const skipped = buildReviewGuards({
      preview,
      skippedIndexes: new Set([3]),
      selectedCandidateByIndex: {},
      suggestionsAcknowledged: false,
    });
    expect(skipped.reviewBlockers).toEqual([]);
  });

  it("counts manual selections toward duplicates and excludes skipped rows", () => {
    const preview: CourseRosterPreview = {
      assignmentId: "assignment-1",
      rows: [noMatchRow(2), noMatchRow(3)],
      summary: {
        readyToCreate: 0,
        willRestore: 0,
        alreadyActive: 0,
        needsReview: 2,
        ineligible: 0,
      },
    };
    const guards = buildReviewGuards({
      preview,
      skippedIndexes: new Set(),
      selectedCandidateByIndex: { 2: candidate("student-1"), 3: candidate("student-1") },
      suggestionsAcknowledged: false,
    });
    expect(guards.reviewBlockers).toEqual([
      "The same Student is selected for rows 2 and 3. Change or skip one before continuing.",
    ]);

    const skipped = buildReviewGuards({
      preview,
      skippedIndexes: new Set([3]),
      selectedCandidateByIndex: { 2: candidate("student-1"), 3: candidate("student-1") },
      suggestionsAcknowledged: false,
    });
    expect(skipped.reviewBlockers).toEqual([]);
  });

  it("counts acknowledged suggestions as selected identities", () => {
    const preview: CourseRosterPreview = {
      assignmentId: "assignment-1",
      rows: [suggestedRow(2, "student-1"), noMatchRow(3)],
      summary: {
        readyToCreate: 0,
        willRestore: 0,
        alreadyActive: 0,
        needsReview: 2,
        ineligible: 0,
      },
    };
    const beforeAck = buildReviewGuards({
      preview,
      skippedIndexes: new Set(),
      selectedCandidateByIndex: { 3: candidate("student-1") },
      suggestionsAcknowledged: false,
    });
    expect(beforeAck.reviewBlockers).not.toEqual(
      expect.arrayContaining([expect.stringContaining("The same Student")])
    );

    const afterAck = buildReviewGuards({
      preview,
      skippedIndexes: new Set(),
      selectedCandidateByIndex: { 3: candidate("student-1") },
      suggestionsAcknowledged: true,
    });
    expect(afterAck.reviewBlockers).toEqual([
      "The same Student is selected for rows 2 and 3. Change or skip one before continuing.",
    ]);
  });

  it("requires acknowledgement only for suggested rows awaiting a decision", () => {
    const preview: CourseRosterPreview = {
      assignmentId: "assignment-1",
      rows: [suggestedRow(2, "student-1"), noMatchRow(3)],
      summary: {
        readyToCreate: 0,
        willRestore: 0,
        alreadyActive: 0,
        needsReview: 2,
        ineligible: 0,
      },
    };
    const guards = buildReviewGuards({
      preview,
      skippedIndexes: new Set(),
      selectedCandidateByIndex: {},
      suggestionsAcknowledged: false,
    });
    expect(guards.suggestedCount).toBe(1);
    expect(guards.reviewBlockers).toEqual([
      "Resolve or skip 1 row before continuing.",
      "Acknowledge 1 suggested match before continuing.",
    ]);
  });

  it("treats ineligible suggestions and no-match rows as unresolved until skipped", () => {
    const preview: CourseRosterPreview = {
      assignmentId: "assignment-1",
      rows: [suggestedRow(2, "student-1", "INELIGIBLE"), noMatchRow(3)],
      summary: {
        readyToCreate: 0,
        willRestore: 0,
        alreadyActive: 0,
        needsReview: 0,
        ineligible: 1,
      },
    };
    const guards = buildReviewGuards({
      preview,
      skippedIndexes: new Set(),
      selectedCandidateByIndex: {},
      suggestionsAcknowledged: false,
    });
    expect(guards.reviewBlockers).toEqual(["Resolve or skip 2 rows before continuing."]);

    const skipped = buildReviewGuards({
      preview,
      skippedIndexes: new Set([2, 3]),
      selectedCandidateByIndex: {},
      suggestionsAcknowledged: false,
    });
    expect(skipped.reviewBlockers).toEqual([]);
  });

  it("builds the effective identity set a confirmation would submit", () => {
    const preview: CourseRosterPreview = {
      assignmentId: "assignment-1",
      rows: [
        exactRow(2, "student-1"),
        suggestedRow(3, "student-2"),
        noMatchRow(4),
        noMatchRow(5),
        exactRow(6, "student-3"),
      ],
      summary: {
        readyToCreate: 2,
        willRestore: 0,
        alreadyActive: 0,
        needsReview: 3,
        ineligible: 0,
      },
    };

    // Manual selection wins over prepared exact; skipped rows are excluded;
    // suggestions count only after acknowledgement.
    expect(
      effectiveCandidateByIndexFor({
        preview,
        skippedIndexes: new Set([6]),
        selectedCandidateByIndex: { 2: candidate("student-9"), 4: candidate("student-1") },
        suggestionsAcknowledged: false,
      })
    ).toEqual({
      2: candidate("student-9"),
      3: undefined,
      4: candidate("student-1"),
      5: undefined,
    });

    expect(
      effectiveCandidateByIndexFor({
        preview,
        skippedIndexes: new Set(),
        selectedCandidateByIndex: { 4: candidate("student-1") },
        suggestionsAcknowledged: true,
      })
    ).toEqual({
      2: candidate("student-1"),
      3: candidate("student-2"),
      4: candidate("student-1"),
      5: undefined,
      6: candidate("student-3"),
    });
  });
});

describe("course roster confirmation results", () => {
  it("shows grouped confirmation results and an opaque support reference", async () => {
    vi.spyOn(rosterActions, "previewCourseRosterAction").mockResolvedValue({
      success: true,
      data: {
        assignmentId: "assignment-1",
        rows: [
          {
            sourceIndex: 2,
            submittedName: "Maria Santos",
            resolution: { status: "EXACT_MATCH", reason: "EXACT", candidateIds: ["student-1"] },
            disposition: "READY_CREATE",
            candidates: [
              {
                userId: "student-1",
                name: "Maria Santos",
                email: "maria.santos@acd.edu.ph",
                programId: "program-1",
                programCode: "BSED",
                programName: "Education",
                yearLevel: "FIRST_YEAR",
                section: "MORNING",
                majorName: null,
                selectable: true,
                reason: null,
              },
            ],
          },
          {
            sourceIndex: 3,
            submittedName: "Juan Dela Cruz",
            resolution: { status: "EXACT_MATCH", reason: "EXACT", candidateIds: ["student-2"] },
            disposition: "READY_CREATE",
            candidates: [
              {
                userId: "student-2",
                name: "Juan Dela Cruz",
                email: "juan.delacruz@acd.edu.ph",
                programId: "program-1",
                programCode: "BSED",
                programName: "Education",
                yearLevel: "FIRST_YEAR",
                section: "MORNING",
                majorName: null,
                selectable: true,
                reason: null,
              },
            ],
          },
          {
            sourceIndex: 4,
            submittedName: "Active Student",
            resolution: { status: "EXACT_MATCH", reason: "EXACT", candidateIds: ["student-3"] },
            disposition: "ALREADY_ACTIVE",
            candidates: [
              {
                userId: "student-3",
                name: "Active Student",
                email: "active.student@acd.edu.ph",
                programId: "program-1",
                programCode: "BSED",
                programName: "Education",
                yearLevel: "FIRST_YEAR",
                section: "MORNING",
                majorName: null,
                selectable: true,
                reason: null,
              },
            ],
          },
        ],
        summary: {
          readyToCreate: 2,
          willRestore: 0,
          alreadyActive: 1,
          needsReview: 0,
          ineligible: 0,
        },
      },
    });
    vi.spyOn(rosterActions, "confirmRosterResolutionAction").mockResolvedValue({
      success: true,
      data: {
        rows: [
          { sourceIndex: 2, outcome: "CREATED", error: null },
          {
            sourceIndex: 3,
            outcome: "OTHER_SECTION_CONFLICT",
            error:
              "Student is already active in another section for this Course and Academic Period.",
          },
        ],
        referenceId: "ref-abc-123",
      },
    });
    render(<RosterManagementDialog assignmentId="assignment-1" />);
    fireEvent.click(screen.getByRole("button", { name: /manage roster/i }));
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, {
      target: {
        files: [
          new File(["name\nMaria Santos\nJuan Dela Cruz\n"], "roster.csv", { type: "text/csv" }),
        ],
      },
    });
    fireEvent.click(screen.getByRole("button", { name: /prepare preview/i }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /add \d+ students?/i })).toBeEnabled()
    );
    fireEvent.click(screen.getByRole("button", { name: /add \d+ students?/i }));
    await waitFor(() =>
      expect(
        screen.getAllByText(/Confirmation complete|Confirmation stopped/).length
      ).toBeGreaterThan(0)
    );
    expect(screen.getByText("Added to roster")).toBeInTheDocument();
    expect(screen.getByText("Other section conflict")).toBeInTheDocument();
    expect(screen.getByText(/Support reference: ref-abc-123/)).toBeInTheDocument();
    expect(screen.getByText("Added", { selector: "dt" })).toBeInTheDocument();
    expect(screen.getByText("Not added", { selector: "dt" })).toBeInTheDocument();
    // Already-active rows stay informational: they carry no confirmation outcome.
    expect(screen.getAllByText("Already active").length).toBeGreaterThan(0);
    expect(screen.getByText("Active Student")).toBeInTheDocument();
    expect(screen.getByText("Already active", { selector: "dt" })).toBeInTheDocument();
    expect(screen.getByText("Already active", { selector: "dt" }).parentElement).toHaveTextContent(
      "1"
    );
    // Confirmed results are final: Back is not offered after confirmation.
    expect(screen.queryByRole("button", { name: "Back" })).not.toBeInTheDocument();
  });

  it("exports failed rows as row,name,status,error without candidate emails", async () => {
    vi.spyOn(rosterActions, "previewCourseRosterAction").mockResolvedValue({
      success: true,
      data: {
        assignmentId: "assignment-1",
        rows: [
          {
            sourceIndex: 2,
            submittedName: "Maria Santos",
            resolution: { status: "EXACT_MATCH", reason: "EXACT", candidateIds: ["student-1"] },
            disposition: "READY_CREATE",
            candidates: [
              {
                userId: "student-1",
                name: "Maria Santos",
                email: "maria.santos@acd.edu.ph",
                programId: "program-1",
                programCode: "BSED",
                programName: "Education",
                yearLevel: "FIRST_YEAR",
                section: "MORNING",
                majorName: null,
                selectable: true,
                reason: null,
              },
            ],
          },
        ],
        summary: {
          readyToCreate: 1,
          willRestore: 0,
          alreadyActive: 0,
          needsReview: 0,
          ineligible: 0,
        },
      },
    });
    vi.spyOn(rosterActions, "confirmRosterResolutionAction").mockResolvedValue({
      success: true,
      data: {
        rows: [
          {
            sourceIndex: 2,
            outcome: "UNEXPECTED_FAILURE",
            error: "The roster request could not be completed.",
          },
        ],
        referenceId: "ref-uuid-1",
      },
    });
    const createObjectURL = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:export");
    render(<RosterManagementDialog assignmentId="assignment-1" />);
    fireEvent.click(screen.getByRole("button", { name: /manage roster/i }));
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, {
      target: {
        files: [new File(["name\nMaria Santos\n"], "roster.csv", { type: "text/csv" })],
      },
    });
    fireEvent.click(screen.getByRole("button", { name: /prepare preview/i }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /add \d+ students?/i })).toBeEnabled()
    );
    fireEvent.click(screen.getByRole("button", { name: /add \d+ students?/i }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /download failed rows/i })).toBeEnabled()
    );
    // UNEXPECTED_FAILURE is an attempted row: it groups under Not added,
    // not Not processed.
    expect(screen.getByText("Unexpected failure")).toBeInTheDocument();
    expect(screen.getByText("Not added", { selector: "dt" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /download failed rows/i }));
    const csvBlob = createObjectURL.mock.calls[0]?.[0] as Blob;
    const csvText = await csvBlob.text();
    expect(csvText).toContain("row,name,status,error");
    expect(csvText).toContain("Maria Santos");
    expect(csvText).toContain("UNEXPECTED_FAILURE");
    expect(csvText).not.toContain("maria.santos@acd.edu.ph");
    expect(csvText).not.toContain("ref-uuid-1");
  });

  it("requires the confirm action to be the manual-add mutation with the selected account id", async () => {
    render(<RosterManagementDialog assignmentId="assignment-1" />);
    fireEvent.click(screen.getByRole("button", { name: /manage roster/i }));
    fireEvent.click(screen.getByRole("tab", { name: /add one student/i }));
    vi.spyOn(rosterActions, "searchScopedRosterStudentsAction").mockResolvedValue({
      success: true,
      data: {
        assignmentId: "assignment-1",
        candidates: [
          {
            userId: "student-9",
            name: "Maria Santos",
            email: "maria.santos@acd.edu.ph",
            programId: "program-1",
            programCode: "BSED",
            programName: "Education",
            yearLevel: null,
            section: null,
            majorName: null,
            selectable: true,
            reason: null,
          },
        ],
      },
    });
    const addSpy = vi.spyOn(rosterActions, "addRosterMembershipAction").mockResolvedValue({
      success: true,
      data: { outcome: "CREATED", message: "Student added to Course roster." },
    });
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "Maria" } });
    fireEvent.click(await screen.findByRole("button", { name: /maria santos/i }));
    expect(screen.getByText(/ready to add:/i)).toBeInTheDocument();
    expect(screen.getByText(/ready to add:/i).closest("div")).toHaveTextContent("Maria Santos");
    fireEvent.click(screen.getByRole("button", { name: /maria santos/i }));
    expect(screen.queryByText(/ready to add:/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add student/i })).toBeDisabled();
    fireEvent.click(await screen.findByRole("button", { name: /maria santos/i }));
    expect(screen.getByText(/ready to add:/i)).toBeInTheDocument();
    fireEvent.submit(screen.getByRole("button", { name: /add student/i }).closest("form")!);
    await waitFor(() =>
      expect(addSpy).toHaveBeenCalledWith({
        assignmentId: "assignment-1",
        studentUserId: "student-9",
      })
    );
    await waitFor(() =>
      expect(showToastMock).toHaveBeenCalledWith("Maria Santos added to Course roster.", "success")
    );
    expect(screen.queryByText(/ready to add:/i)).not.toBeInTheDocument();
  });
  it("keeps the selection and reports a failed single-add inline and as an error toast", async () => {
    render(<RosterManagementDialog assignmentId="assignment-1" />);
    fireEvent.click(screen.getByRole("button", { name: /manage roster/i }));
    fireEvent.click(screen.getByRole("tab", { name: /add one student/i }));
    vi.spyOn(rosterActions, "searchScopedRosterStudentsAction").mockResolvedValue({
      success: true,
      data: {
        assignmentId: "assignment-1",
        candidates: [
          {
            userId: "student-9",
            name: "Maria Santos",
            email: "maria.santos@acd.edu.ph",
            programId: "program-1",
            programCode: "BSED",
            programName: "Education",
            yearLevel: null,
            section: null,
            majorName: null,
            selectable: true,
            reason: null,
          },
        ],
      },
    });
    vi.spyOn(rosterActions, "addRosterMembershipAction").mockResolvedValue({
      success: false,
      error: "Course assignment not found.",
    });
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "Maria" } });
    fireEvent.click(await screen.findByRole("button", { name: /maria santos/i }));
    fireEvent.submit(screen.getByRole("button", { name: /add student/i }).closest("form")!);
    await waitFor(() =>
      expect(showToastMock).toHaveBeenCalledWith("Course assignment not found.", "error")
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Course assignment not found.");
    expect(screen.getByText(/ready to add:/i)).toBeInTheDocument();
  });

  it("shows informational already-active results when nothing needs writing", async () => {
    vi.spyOn(rosterActions, "previewCourseRosterAction").mockResolvedValue({
      success: true,
      data: {
        assignmentId: "assignment-1",
        rows: [
          {
            sourceIndex: 2,
            submittedName: "Active Student",
            resolution: { status: "EXACT_MATCH", reason: "EXACT", candidateIds: ["student-1"] },
            disposition: "ALREADY_ACTIVE",
            candidates: [
              {
                userId: "student-1",
                name: "Active Student",
                email: "active.student@acd.edu.ph",
                programId: "program-1",
                programCode: "BSED",
                programName: "Education",
                yearLevel: "FIRST_YEAR",
                section: "MORNING",
                majorName: null,
                selectable: true,
                reason: null,
              },
            ],
          },
        ],
        summary: {
          readyToCreate: 0,
          willRestore: 0,
          alreadyActive: 1,
          needsReview: 0,
          ineligible: 0,
        },
      },
    });
    const confirmSpy = vi.spyOn(rosterActions, "confirmRosterResolutionAction");
    render(<RosterManagementDialog assignmentId="assignment-1" />);
    fireEvent.click(screen.getByRole("button", { name: /manage roster/i }));
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, {
      target: {
        files: [new File(["name\nActive Student\n"], "roster.csv", { type: "text/csv" })],
      },
    });
    fireEvent.click(screen.getByRole("button", { name: /prepare preview/i }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /review complete/i })).toBeEnabled()
    );
    fireEvent.click(screen.getByRole("button", { name: /review complete/i }));
    await waitFor(() => expect(screen.getByText(/Confirmation complete/)).toBeInTheDocument());
    expect(confirmSpy).not.toHaveBeenCalled();
    expect(screen.getAllByText("Already active").length).toBeGreaterThan(0);
    expect(screen.getByText("Active Student")).toBeInTheDocument();
  });
});
