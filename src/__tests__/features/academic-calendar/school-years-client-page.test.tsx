// fallow-ignore-file code-duplication
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { refreshMock } = vi.hoisted(() => ({ refreshMock: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

vi.mock("@/lib/actions/secretary-school-year-actions", () => ({
  createSchoolYearAction: vi.fn(),
  updateSchoolYearAction: vi.fn(),
  archiveSchoolYearAction: vi.fn(),
  activateSchoolYearAction: vi.fn(),
  deactivateSchoolYearAction: vi.fn(),
  setActiveSemesterAction: vi.fn(),
  updateTermInstanceAction: vi.fn(),
  deleteTermInstanceAction: vi.fn(),
  setActiveTermInstanceAction: vi.fn(),
  transitionPeriodStatusAction: vi.fn(),
}));

vi.mock("@/components/ui/toast", () => ({
  showToast: vi.fn(),
}));

// The orchestration under test is which school years reach which tab; the
// structure view itself has its own dedicated suite.
vi.mock("@/features/academic-calendar/components/calendar-structure-view", () => ({
  CalendarStructureView: ({ schoolYears }: { schoolYears: { code: string }[] }) => (
    <div data-testid="structure-view">{schoolYears.map((year) => year.code).join(", ")}</div>
  ),
}));

import { SchoolYearsClientPage } from "@/app/(app)/secretary/school-years/client-page";
import type { SchoolYearWithTerms } from "@/features/academic-calendar/types";

const activeYear: SchoolYearWithTerms = {
  id: "sy-active",
  code: "2026-2027",
  startDate: new Date("2026-06-01"),
  endDate: new Date("2027-05-31"),
  isArchived: false,
  isActive: true,
  activeSemester: "FIRST",
  archivedAt: null,
  archivedBy: null,
  createdAt: new Date("2026-06-01"),
  updatedAt: new Date("2026-06-01"),
  termInstances: [],
};

const archivedYear: SchoolYearWithTerms = {
  ...activeYear,
  id: "sy-archived",
  code: "2024-2025",
  isArchived: true,
  isActive: false,
  activeSemester: null,
  archivedAt: new Date("2025-03-18"),
  archivedBy: { id: "user-1", name: "Maria Santos" },
};

function renderPage(overrides: {
  initialActive?: SchoolYearWithTerms[];
  initialArchived?: SchoolYearWithTerms[];
  initialTab?: "active" | "archived";
} = {}) {
  return render(
    <SchoolYearsClientPage
      initialActive={overrides.initialActive ?? [activeYear]}
      initialArchived={overrides.initialArchived ?? [archivedYear]}
      initialTab={overrides.initialTab ?? "active"}
    />
  );
}

describe("SchoolYearsClientPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, "", "/secretary/school-years");
  });

  it("labels the lifecycle tabs and shows active years by default", () => {
    renderPage();

    expect(screen.getByRole("tab", { name: "Active" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Archived" })).toBeInTheDocument();

    const panel = screen.getByRole("tabpanel");
    expect(panel).toHaveTextContent("2026-2027");
    expect(panel).not.toHaveTextContent("2024-2025");
    expect(window.location.search).toBe("");
  });

  it("switches to the archived tab and persists ?tab=archived", () => {
    renderPage();

    fireEvent.click(screen.getByRole("tab", { name: "Archived" }));

    const panel = screen.getByRole("tabpanel");
    expect(panel).toHaveTextContent("2024-2025");
    expect(panel).not.toHaveTextContent("2026-2027");
    expect(window.location.search).toBe("?tab=archived");
  });

  it("switches back to active and clears the query parameter", () => {
    renderPage({ initialTab: "archived" });

    fireEvent.click(screen.getByRole("tab", { name: "Active" }));

    expect(screen.getByRole("tabpanel")).toHaveTextContent("2026-2027");
    expect(window.location.search).toBe("");
  });

  it("opens the archived tab directly from a deep link", () => {
    renderPage({ initialTab: "archived" });

    const panel = screen.getByRole("tabpanel");
    expect(panel).toHaveTextContent("2024-2025");
    expect(panel).not.toHaveTextContent("2026-2027");
  });

  it("shows an actionable empty state with no archived years and recovers via the CTA", () => {
    renderPage({ initialArchived: [] });

    fireEvent.click(screen.getByRole("tab", { name: "Archived" }));

    expect(screen.getByText("No archived school years")).toBeInTheDocument();
    expect(
      screen.getByText("Archived years stay here for reference after you archive one.")
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "View active school years" }));

    expect(screen.getByRole("tabpanel")).toHaveTextContent("2026-2027");
    expect(window.location.search).toBe("");
  });
});
