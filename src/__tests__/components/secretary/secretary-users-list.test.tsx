import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { SecretaryUsersList } from "@/features/users/components/secretary-users-list";
import { SystemRole, YearLevel } from "@prisma/client";

const replaceMock = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => "/secretary/users",
  useRouter: () => ({ replace: replaceMock }),
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

describe("SecretaryUsersList", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockMatchMedia(true);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  const mockUsers = [
    {
      id: "user-1",
      name: "John Doe",
      email: "john.doe@example.com",
      isActive: true,
      roles: [SystemRole.STUDENT],
      activeRole: SystemRole.STUDENT,
      programLabel: "BSCE",
      majorLabel: "Structural Engineering",
      sectionLabel: "—",
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
      sectionLabel: "—",
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
      majors: [{ id: "major-3", name: "Electronics" }],
    },
  ];

  const mockYearLevels = [YearLevel.FIRST_YEAR, YearLevel.SECOND_YEAR];

  it("renders users list with KPI cards", () => {
    render(
      <SecretaryUsersList
        users={mockUsers}
        total={2}
        page={1}
        pageSize={15}
        query={{ page: 1, sort: "name", direction: "asc" }}
        kpi={mockKPI}
        programs={mockPrograms}
        yearLevels={mockYearLevels}
        currentUserId="admin-1"
      />
    );

    expect(screen.getByText("User Management")).toBeInTheDocument();
    expect(screen.getByText("Users")).toBeInTheDocument();
    expect(screen.getByText("2 total users")).toBeInTheDocument();
  });

  it("displays user data in table", () => {
    render(
      <SecretaryUsersList
        users={mockUsers}
        total={2}
        page={1}
        pageSize={15}
        query={{ page: 1, sort: "name", direction: "asc" }}
        kpi={mockKPI}
        programs={mockPrograms}
        yearLevels={mockYearLevels}
        currentUserId="admin-1"
      />
    );

    expect(screen.getAllByText("John Doe")).toHaveLength(2);
    expect(screen.getAllByText("jane.smith@example.com")).toHaveLength(2);
  });

  it("has Add User button", () => {
    render(
      <SecretaryUsersList
        users={mockUsers}
        total={2}
        page={1}
        pageSize={15}
        query={{ page: 1, sort: "name", direction: "asc" }}
        kpi={mockKPI}
        programs={mockPrograms}
        yearLevels={mockYearLevels}
        currentUserId="admin-1"
      />
    );

    expect(screen.getByText("Add User")).toBeInTheDocument();
  });

  it("gives server-side sort controls accessible names", () => {
    render(
      <SecretaryUsersList
        users={mockUsers}
        total={2}
        page={1}
        pageSize={15}
        query={{ page: 1, sort: "name", direction: "asc" }}
        kpi={mockKPI}
        programs={mockPrograms}
        yearLevels={mockYearLevels}
        currentUserId="admin-1"
      />
    );

    expect(screen.getByRole("combobox", { name: "Sort users" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Sort direction" })).toBeInTheDocument();
  });

  it("navigates to the server-filtered search URL after debounce", async () => {
    replaceMock.mockClear();
    render(
      <SecretaryUsersList
        users={mockUsers}
        total={2}
        page={1}
        pageSize={15}
        query={{ page: 1, sort: "name", direction: "asc" }}
        kpi={mockKPI}
        programs={mockPrograms}
        yearLevels={mockYearLevels}
        currentUserId="admin-1"
      />
    );

    const searchInput = screen.getByPlaceholderText(/search by name or email/i);
    fireEvent.change(searchInput, { target: { value: "John" } });

    expect(replaceMock).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(replaceMock).toHaveBeenCalledWith("/secretary/users?q=John");
  });
});
