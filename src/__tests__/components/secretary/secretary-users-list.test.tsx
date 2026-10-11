// fallow-ignore-file code-duplication
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { SecretaryUsersList } from "@/features/users/components/secretary-users-list";
import { StudentSection, SystemRole, YearLevel } from "@prisma/client";
import type { SecretaryUserSummaryItem } from "@/features/users/services/list-secretary-users-summary";

const replaceMock = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => "/secretary/users",
  useRouter: () => ({ replace: replaceMock }),
  useSearchParams: () => new URLSearchParams(),
}));
function mockMatchMedia(matches: boolean = true) {
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

const mockUsers: SecretaryUserSummaryItem[] = [
  {
    id: "user-1",
    name: "John Doe",
    email: "john.doe@example.com",
    isActive: true,
    roles: [SystemRole.STUDENT],
    activeRole: SystemRole.STUDENT,
    programLabel: "BSCE",
    majorLabel: "Structural Engineering",
    placement: { yearLevel: YearLevel.THIRD_YEAR, section: StudentSection.MORNING },
  },
  {
    id: "user-2",
    name: "Jane Smith",
    email: "jane.smith@example.com",
    isActive: true,
    roles: [SystemRole.FACULTY],
    activeRole: SystemRole.FACULTY,
    programLabel: "BSEE",
    majorLabel: "N/A",
    placement: null,
  },
];

const mockKPI = {
  totalUsers: 2,
  totalStudents: 1,
  totalAlumni: 0,
  totalIndustryPartners: 0,
};

const mockPrograms = [
  {
    id: "prog-1",
    code: "BSCE",
    name: "Bachelor of Science in Civil Engineering",
    majors: [
      { id: "major-1", name: "Structural Engineering" },
      { id: "major-2", name: "Water Resources" },
    ],
  },
  {
    id: "prog-2",
    code: "BSEE",
    name: "Bachelor of Science in Electrical Engineering",
    majors: [],
  },
];

const mockYearLevels = [YearLevel.FIRST_YEAR, YearLevel.SECOND_YEAR];
const mockActivePeriod = { id: "period-1", label: "2026-2027 — 1st Semester — 2nd Term" };

type ListProps = React.ComponentProps<typeof SecretaryUsersList>;

function renderList(overrides: Partial<ListProps> = {}) {
  return render(
    <SecretaryUsersList
      users={mockUsers}
      total={2}
      page={1}
      pageSize={15}
      query={{ page: 1, sort: "name", direction: "asc" }}
      kpi={mockKPI}
      programs={mockPrograms}
      yearLevels={mockYearLevels}
      activePeriod={mockActivePeriod}
      currentUserId="admin-1"
      {...overrides}
    />
  );
}

/**
 * Opens a column funnel or the toolbar's account-filter menu. A trigger's
 * accessible name names its active value too, so match on the leading label.
 */
function openFilter(label: string) {
  fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${label}`) }));
}

function pickOption(label: string, optionName: string | RegExp) {
  openFilter(label);
  fireEvent.click(screen.getByRole("radio", { name: optionName }));
}

describe("SecretaryUsersList", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockMatchMedia(true);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("renders users list with KPI cards", () => {
    renderList();

    expect(screen.getByText("User Management")).toBeInTheDocument();
    expect(screen.getByText("Users")).toBeInTheDocument();
    expect(screen.getByText("2 total users")).toBeInTheDocument();
  });

  it("displays user data in table", () => {
    renderList();

    expect(screen.getAllByText("John Doe")).toHaveLength(2);
    expect(screen.getAllByText("jane.smith@example.com")).toHaveLength(2);
  });

  it("shows a Student's term placement and leaves other roles blank", () => {
    renderList();

    expect(screen.getAllByText("3rd Year · Morning")).toHaveLength(2);
    expect(screen.getByText("Year & Section")).toBeInTheDocument();
  });

  it("has Add User button", () => {
    renderList();

    expect(screen.getByText("Add User")).toBeInTheDocument();
  });

  it("gives server-side sort controls accessible names", () => {
    renderList();

    expect(screen.getByRole("button", { name: "Sort by Name, currently asc" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Sort by Email, currently unsorted" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Sort by Status, currently unsorted" })
    ).toBeInTheDocument();
  });

  it("offers the General Education Coordinator role filter under the Role column", () => {
    renderList();

    openFilter("Filter Role");
    expect(screen.getByRole("radio", { name: "Gen Ed Coordinator" })).toBeInTheDocument();
  });

  it("gives every filterable column a funnel and the spanning search its own field", () => {
    renderList();

    for (const column of ["Role", "Program", "Year & Section"]) {
      expect(screen.getByRole("button", { name: `Filter ${column}` })).toBeInTheDocument();
    }
    expect(screen.getByRole("searchbox", { name: "Search users" })).toBeInTheDocument();
    // Email and Actions show no narrowing of their own.
    expect(screen.queryByRole("button", { name: /^Filter Email/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /^Filter Actions/ })).toBeNull();
  });

  it("opens the columnless account filters from the toolbar and applies them immediately", () => {
    replaceMock.mockClear();
    renderList();

    expect(screen.queryByRole("button", { name: /^Filter Term placement/ })).toBeNull();
    pickOption("Account filters", "Pending verification");

    expect(replaceMock).toHaveBeenCalledWith("/secretary/users?verification=pending");
  });

  it("clears an applied account filter from its toolbar chip", () => {
    replaceMock.mockClear();
    renderList({
      query: { page: 1, verification: "pending", sort: "name", direction: "asc" },
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Remove filter Verification: Pending verification" })
    );

    expect(replaceMock).toHaveBeenCalledWith("/secretary/users");
  });

  it("navigates to the Student placement URL and keeps Program alongside it", () => {
    replaceMock.mockClear();
    renderList({
      query: { page: 1, role: SystemRole.STUDENT, program: "BSCE", sort: "name", direction: "asc" },
    });

    pickOption("Filter Year & Section", "3rd Year");

    expect(replaceMock).toHaveBeenCalledWith(
      "/secretary/users?role=STUDENT&program=BSCE&yearLevel=THIRD_YEAR"
    );
  });

  it("clears the Major when the Program it belongs to changes", () => {
    replaceMock.mockClear();
    renderList({
      query: {
        page: 1,
        role: SystemRole.STUDENT,
        program: "BSCE",
        major: "Structural Engineering",
        sort: "name",
        direction: "asc",
      },
    });

    // A Program option reads as its code with the name beneath it.
    pickOption("Filter Program", /^BSEE/);

    expect(replaceMock).toHaveBeenCalledWith("/secretary/users?role=STUDENT&program=BSEE");
  });

  it("clears the placement facets when the list switches to Students awaiting placement", () => {
    replaceMock.mockClear();
    renderList({
      query: {
        page: 1,
        role: SystemRole.STUDENT,
        yearLevel: YearLevel.THIRD_YEAR,
        section: StudentSection.MORNING,
        sort: "name",
        direction: "asc",
      },
    });

    pickOption("Account filters", "Awaiting term placement");

    expect(replaceMock).toHaveBeenCalledWith(
      "/secretary/users?role=STUDENT&state=awaiting-term-placement"
    );
  });

  it("navigates to the server-filtered search URL after debounce", async () => {
    replaceMock.mockClear();
    renderList();

    const searchInput = screen.getByPlaceholderText(/search by name or email/i);
    fireEvent.change(searchInput, { target: { value: "John" } });

    expect(replaceMock).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(replaceMock).toHaveBeenCalledWith("/secretary/users?q=John");
  });

  it("does not reset pagination when the server search term is unchanged", () => {
    replaceMock.mockClear();
    renderList({
      total: 30,
      page: 2,
      query: { page: 2, q: "John", sort: "name", direction: "asc" },
    });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("clears the search box along with the rest of the filters", () => {
    replaceMock.mockClear();
    renderList({
      query: {
        page: 1,
        q: "John",
        role: SystemRole.STUDENT,
        program: "BSCE",
        state: "awaiting-term-placement",
        verification: "pending",
        sort: "name",
        direction: "asc",
      },
    });

    fireEvent.click(screen.getByRole("button", { name: "Clear all" }));
    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Every navigation lands on the unfiltered URL: the cleared search box is
    // not restored by the debounce that follows it.
    expect(replaceMock).toHaveBeenCalledWith("/secretary/users");
    expect(replaceMock.mock.calls.every(([href]) => href === "/secretary/users")).toBe(true);
    expect(screen.getByPlaceholderText(/search by name or email/i)).toHaveValue("");
  });

  it("offers the placement facets only to the Student records they describe", () => {
    const { unmount } = renderList({
      query: { page: 1, role: SystemRole.STUDENT, sort: "name", direction: "asc" },
    });

    openFilter("Filter Year & Section");
    expect(screen.getByRole("radio", { name: "All year levels" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "All sections" })).toBeInTheDocument();
    expect(
      screen.getByText(
        /Year level and section come from each Student's placement in 2026-2027 — 1st Semester — 2nd Term/
      )
    ).toBeInTheDocument();
    unmount();

    renderList({ query: { page: 1, role: SystemRole.FACULTY, sort: "name", direction: "asc" } });

    // The funnel stays so the column never silently loses its filter; it reports
    // why the placement facets do not apply here.
    expect(
      screen.getByRole("button", { name: "Filter Year & Section, unavailable" })
    ).toBeDisabled();
  });

  it("offers the major filter only for a Program that has majors", () => {
    const { unmount } = renderList({
      query: { page: 1, role: SystemRole.STUDENT, program: "BSCE", sort: "name", direction: "asc" },
    });

    openFilter("Filter Major");
    expect(screen.getByRole("radio", { name: "Structural Engineering" })).toBeInTheDocument();
    unmount();

    renderList({
      query: { page: 1, role: SystemRole.STUDENT, program: "BSEE", sort: "name", direction: "asc" },
    });

    expect(screen.getByRole("button", { name: "Filter Major, unavailable" })).toBeDisabled();
  });

  it("explains why placement filters are unavailable without an active Academic Period", () => {
    renderList({
      activePeriod: null,
      query: { page: 1, role: SystemRole.STUDENT, sort: "name", direction: "asc" },
    });

    // The funnel stays in the header but is disabled, so the reason is named
    // beside the table rather than buried inside a popover that cannot open.
    expect(
      screen.getByRole("button", { name: "Filter Year & Section, unavailable" })
    ).toBeDisabled();
    expect(
      screen.getByText(
        /No active Academic Period is set, so year level and section cannot be filtered/i
      )
    ).toBeInTheDocument();
  });

  it("drops placement filters while listing Students awaiting placement", () => {
    renderList({
      query: {
        page: 1,
        role: SystemRole.STUDENT,
        state: "awaiting-term-placement",
        sort: "name",
        direction: "asc",
      },
    });

    expect(
      screen.getByRole("button", { name: "Filter Year & Section, unavailable" })
    ).toBeDisabled();
    expect(
      screen.getByText(/Students awaiting placement have no year level or section yet/i)
    ).toBeInTheDocument();
  });

  it("clears role-scoped refinements when the role changes", () => {
    replaceMock.mockClear();
    renderList({
      query: {
        page: 1,
        role: SystemRole.STUDENT,
        program: "BSCE",
        major: "Structural Engineering",
        yearLevel: YearLevel.THIRD_YEAR,
        section: StudentSection.MORNING,
        state: "awaiting-term-placement",
        sort: "name",
        direction: "asc",
      },
    });

    pickOption("Filter Role", "Faculty");

    // Program is the one refinement every role carries, so it survives.
    expect(replaceMock).toHaveBeenCalledWith("/secretary/users?role=FACULTY&program=BSCE");
  });

  it("supports page-bound selection across desktop and mobile representations", () => {
    renderList();

    const johnCheckboxes = screen.getAllByRole("checkbox", { name: "Select John Doe" });
    fireEvent.click(johnCheckboxes[0]);
    expect(screen.getByText("1 user selected")).toBeInTheDocument();
    expect(johnCheckboxes[1]).toBeChecked();
  });

  it("renders user action kebab menu with icons and action items", () => {
    renderList();

    const actionButtons = screen.getAllByRole("button", { name: "Actions for John Doe" });
    fireEvent.click(actionButtons[0]);

    const viewItem = screen.getByRole("menuitem", { name: /View details/i });
    const editItem = screen.getByRole("menuitem", { name: /Edit user/i });
    const deactivateItem = screen.getByRole("menuitem", { name: /Deactivate/i });

    expect(viewItem).toBeInTheDocument();
    expect(editItem).toBeInTheDocument();
    expect(deactivateItem).toBeInTheDocument();

    expect(viewItem.querySelector(".lucide-eye")).not.toBeNull();
    expect(editItem.querySelector(".lucide-pencil")).not.toBeNull();
    expect(deactivateItem.querySelector(".lucide-user-x")).not.toBeNull();
  });
});
