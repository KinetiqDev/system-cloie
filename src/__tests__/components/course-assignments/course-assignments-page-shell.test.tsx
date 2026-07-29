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
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
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

vi.mock("@/features/course-assignments/components/shared/assignment-filters", () => ({
  AssignmentFilters: ({
    filters,
    onFiltersChange,
  }: {
    filters: Record<string, unknown>;
    onFiltersChange: (filters: Record<string, unknown>) => void;
  }) => (
    <div data-testid="assignment-filters">
      <button type="button" onClick={() => onFiltersChange({ ...filters, isActive: false })}>
        Set inactive
      </button>
    </div>
  ),
}));

const termInstances = [] as TermInstanceItem[];
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
  courseScope: CourseScope.PROGRAM_SPECIFIC,
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

describe("CourseAssignmentsPageShell", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders server-provided initial assignments without a mount read", () => {
    renderShell();
    expect(screen.getByText("CS101")).toBeInTheDocument();
    expect(screen.getByText("faculty@example.com")).toBeInTheDocument();
  });

  it("represents filter changes as canonical URL navigation", () => {
    renderShell();
    fireEvent.click(screen.getByRole("button", { name: "Set inactive" }));
    expect(pushMock).toHaveBeenCalledWith("/secretary/course-assignments?isActive=false");
  });
});
