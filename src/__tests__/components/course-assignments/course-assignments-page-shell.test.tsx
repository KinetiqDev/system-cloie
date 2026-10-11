import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { CourseScope, StudentSection, YearLevel } from "@prisma/client";
import { CourseAssignmentsPageShell } from "@/features/course-assignments/components/course-assignments-page-shell";
import type { TermInstanceItem } from "@/features/academic-calendar/types";
import type { CourseAssignmentItem } from "@/features/course-assignments/types";

const pushMock = vi.fn();
const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => "/secretary/course-assignments",
  useRouter: () => ({ push: pushMock, replace: vi.fn(), refresh: refreshMock }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/lib/actions/course-assignment-actions", () => ({
  createCourseAssignmentAction: vi.fn(),
  bulkCreateCourseAssignmentsAction: vi.fn(),
  deactivateCourseAssignmentAction: vi.fn(),
  activateCourseAssignmentAction: vi.fn(),
  deleteCourseAssignmentAction: vi.fn(),
  updateCourseAssignmentAction: vi.fn(),
  searchFacultyPoolAction: vi.fn(),
  preflightCourseAssignmentDeletionAction: vi.fn(),
}));

const termInstances = [] as TermInstanceItem[];

/** Column funnels live in the desktop table, so the shell test runs desktop. */
function mockDesktopViewport() {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches: true,
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
const assignment: CourseAssignmentItem = {
  id: "assignment-1",
  termInstanceId: "term-1",
  facultyId: "faculty-1",
  courseId: "course-1",
  programId: "program-1",
  yearLevel: YearLevel.SECOND_YEAR,
  section: StudentSection.MORNING,
  assignedBy: null,
  isActive: true,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
  facultyName: "Test Faculty",
  facultyEmail: "faculty@example.com",
  courseCode: "CS101",
  courseTitle: "Introduction to Computing",
  courseScope: CourseScope.PROFESSIONAL,
  programCode: "BSCS",
  programName: "Computer Science",
  termLabel: "2025-2026 — 1st Semester — 1st Term",
};

function renderShell() {
  return render(
    <CourseAssignmentsPageShell
      pageTitle="Course Assignments"
      pageDescription="Manage assignments"
      mode="all-program"
      availableCourses={[]}
      availablePrograms={[]}
      availableFaculty={[]}
      termInstances={termInstances}
      initialData={{ items: [assignment], total: 1, page: 0, pageSize: 20 }}
      initialFilters={{
        termInstanceId: null,
        courseId: null,
        facultyId: null,
        programId: null,
        yearLevel: null,
        section: null,
        isActive: true,
        courseScope: null,
        searchQuery: "",
      }}
      initialPage={1}
    />
  );
}

/**
 * Opens a column funnel and picks one option. Base UI renders each choice as a
 * label wrapping a radio control, and only the control responds to a click.
 */
function openFacet(triggerName: string, optionName: string | RegExp) {
  fireEvent.click(screen.getByRole("button", { name: triggerName }));
  const popover = document.querySelector('[data-slot="popover-content"]');
  if (!popover) throw new Error("The column filter did not open.");
  const row = Array.from(popover.querySelectorAll("label")).find((label) => {
    const text = (label.textContent ?? "").trim();
    return typeof optionName === "string" ? text.startsWith(optionName) : optionName.test(text);
  });
  const control = row?.querySelector('[data-slot="radio-group-item"]');
  if (!control) throw new Error(`No facet option matched ${String(optionName)}.`);
  fireEvent.click(control);
}

describe("CourseAssignmentsPageShell", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDesktopViewport();
  });

  it("renders server-provided initial assignments without a mount read", () => {
    renderShell();
    expect(screen.getByText("CS101")).toBeInTheDocument();
    expect(screen.getByText("faculty@example.com")).toBeInTheDocument();
  });

  it("keeps every column funnel reachable and names it for assistive technology", () => {
    renderShell();
    for (const column of ["Course", "Faculty", "Program", "Class", "Term", "Scope", "Roster"]) {
      expect(screen.getByRole("button", { name: `Filter ${column}` })).toBeInTheDocument();
    }
    // The default Status filter is applied, so its funnel carries the value.
    expect(screen.getByRole("button", { name: "Filter Status: Active" })).toBeInTheDocument();
  });

  it("offers the spanning search above the table rather than in a column", () => {
    renderShell();
    expect(screen.getByRole("searchbox", { name: "Search assignments" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Filter Search" })).not.toBeInTheDocument();
  });

  it("represents a column filter change as canonical URL navigation", () => {
    renderShell();
    openFacet("Filter Status: Active", "Inactive");
    expect(pushMock).toHaveBeenCalledWith("/secretary/course-assignments?isActive=false");
  });

  it("preserves an explicit all-statuses selection in the route URL", () => {
    renderShell();
    openFacet("Filter Status: Active", "All statuses");
    expect(pushMock).toHaveBeenCalledWith("/secretary/course-assignments?isActive=all");
  });

  it("renders the initial server-read error without exposing a client read path", () => {
    render(
      <CourseAssignmentsPageShell
        pageTitle="Course Assignments"
        pageDescription="Manage assignments"
        mode="all-program"
        availableCourses={[]}
        availablePrograms={[]}
        availableFaculty={[]}
        termInstances={termInstances}
        initialData={null}
        initialFilters={{
          termInstanceId: null,
          courseId: null,
          facultyId: null,
          programId: null,
          yearLevel: null,
          section: null,
          isActive: true,
          courseScope: null,
          searchQuery: "",
        }}
        initialPage={1}
        initialError="Failed to list course assignments."
      />
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Failed to list course assignments.");
  });

  it("hides mutation affordances when canManageAssignments is false", () => {
    render(
      <CourseAssignmentsPageShell
        pageTitle="Course Assignments"
        pageDescription="View assignments"
        mode="all-program"
        canManageAssignments={false}
        availableCourses={[]}
        availablePrograms={[]}
        availableFaculty={[]}
        termInstances={termInstances}
        initialData={{ items: [assignment], total: 1, page: 0, pageSize: 20 }}
        initialFilters={{
          termInstanceId: null,
          courseId: null,
          facultyId: null,
          programId: null,
          yearLevel: null,
          section: null,
          isActive: true,
          courseScope: null,
          searchQuery: "",
        }}
        initialPage={1}
      />
    );
    expect(screen.queryByRole("button", { name: "Assign Faculty" })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Open actions for CS101" })
    ).not.toBeInTheDocument();
    expect(screen.getByText("View only")).toBeInTheDocument();
    expect(screen.getByText("CS101")).toBeInTheDocument();
  });
});
