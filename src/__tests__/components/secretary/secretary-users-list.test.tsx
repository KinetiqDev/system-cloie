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

function selectOption(comboboxName: string, optionName: string) {
  fireEvent.click(screen.getByRole("combobox", { name: comboboxName }));
  const option = screen.getByRole("option", { name: optionName });
  // Base UI commits the highlighted item, so highlight before clicking.
  fireEvent.mouseMove(option);
  fireEvent.click(option);
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

    expect(
      screen.getByRole("button", { name: "Sort by name, currently ascending" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Sort by email, currently unsorted" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Sort by status, currently unsorted" })
    ).toBeInTheDocument();
  });

  it("offers the General Education Coordinator role filter", () => {
    renderList();

    fireEvent.click(screen.getByRole("combobox", { name: "Filter by role" }));
    expect(screen.getByRole("option", { name: "Gen Ed Coordinator" })).toBeInTheDocument();
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
    renderList({ query: { page: 1, q: "John", sort: "name", direction: "asc" } });

    fireEvent.click(screen.getByRole("button", { name: /clear all filters/i }));
    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Every navigation lands on the unfiltered URL: the cleared search box is
    // not restored by the debounce that follows it.
    expect(replaceMock).toHaveBeenCalledWith("/secretary/users");
    expect(replaceMock.mock.calls.every(([href]) => href === "/secretary/users")).toBe(true);
    expect(screen.getByPlaceholderText(/search by name or email/i)).toHaveValue("");
  });

  it("reveals the Student filters only while the list is filtered to Students", () => {
    const { unmount } = renderList({
      query: { page: 1, role: SystemRole.STUDENT, sort: "name", direction: "asc" },
    });

    expect(screen.getByRole("combobox", { name: "Filter by year level" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Filter by section" })).toBeInTheDocument();
    expect(
      screen.getByText(
        /Year level and section come from each Student's placement in 2026-2027 — 1st Semester — 2nd Term/
      )
    ).toBeInTheDocument();
    unmount();

    renderList({ query: { page: 1, role: SystemRole.FACULTY, sort: "name", direction: "asc" } });

    expect(screen.queryByRole("combobox", { name: "Filter by year level" })).toBeNull();
    expect(screen.queryByRole("combobox", { name: "Filter by section" })).toBeNull();
  });

  it("offers the major filter only for a Program that has majors", () => {
    const { unmount } = renderList({
      query: { page: 1, role: SystemRole.STUDENT, program: "BSCE", sort: "name", direction: "asc" },
    });

    expect(screen.getByRole("combobox", { name: "Filter by major" })).toBeInTheDocument();
    unmount();

    renderList({
      query: { page: 1, role: SystemRole.STUDENT, program: "BSEE", sort: "name", direction: "asc" },
    });

    expect(screen.queryByRole("combobox", { name: "Filter by major" })).toBeNull();
  });

  it("explains why placement filters are unavailable without an active Academic Period", () => {
    renderList({
      activePeriod: null,
      query: { page: 1, role: SystemRole.STUDENT, sort: "name", direction: "asc" },
    });

    expect(
      screen.getByText(
        /No active Academic Period is set, so year level and section cannot be filtered/i
      )
    ).toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "Filter by year level" })).toBeNull();
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
      screen.getByText(/Students awaiting placement have no year level or section yet/i)
    ).toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "Filter by year level" })).toBeNull();
  });

  it("navigates with the Student placement filters", () => {
    replaceMock.mockClear();
    renderList({
      query: { page: 1, role: SystemRole.STUDENT, sort: "name", direction: "asc" },
    });

    selectOption("Filter by year level", "3rd Year");

    expect(replaceMock).toHaveBeenCalledWith("/secretary/users?role=STUDENT&yearLevel=THIRD_YEAR");
  });

  it("clears role-scoped refinements when the role changes", () => {
    replaceMock.mockClear();
    renderList({
      query: {
        page: 1,
        role: SystemRole.STUDENT,
        major: "Structural Engineering",
        yearLevel: YearLevel.THIRD_YEAR,
        section: StudentSection.MORNING,
        state: "awaiting-term-placement",
        sort: "name",
        direction: "asc",
      },
    });

    selectOption("Filter by role", "Faculty");

    expect(replaceMock).toHaveBeenCalledWith("/secretary/users?role=FACULTY");
  });

  it("supports page-bound selection across desktop and mobile representations", () => {
    renderList();

    const johnCheckboxes = screen.getAllByRole("checkbox", { name: "Select John Doe" });
    fireEvent.click(johnCheckboxes[0]);
    expect(screen.getByText("1 user selected")).toBeInTheDocument();
    expect(johnCheckboxes[1]).toBeChecked();
  });
});
