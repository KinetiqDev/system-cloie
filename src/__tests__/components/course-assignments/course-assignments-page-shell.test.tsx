import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { YearLevel, CourseScope } from "@prisma/client";

import { CourseAssignmentsPageShell } from "@/features/course-assignments/components/course-assignments-page-shell";
import type { TermInstanceItem } from "@/features/academic-calendar/types";

vi.mock("@/lib/actions/course-assignment-actions", () => ({
  listCourseAssignmentsAction: vi.fn(),
  createCourseAssignmentAction: vi.fn(),
  bulkCreateCourseAssignmentsAction: vi.fn(),
  searchFacultyPoolAction: vi.fn(),
}));

vi.mock("@/features/course-assignments/components/shared/assignment-filters", () => ({
  AssignmentFilters: ({ filters, onFiltersChange }: {
    filters: {
      isActive: boolean | null;
      courseScope: string | null;
      searchQuery: string;
      [key: string]: unknown;
    };
    onFiltersChange: (filters: {
      isActive: boolean | null;
      courseScope: string | null;
      searchQuery: string;
      [key: string]: unknown;
    }) => void;
  }) => (
    <div data-testid="assignment-filters">
      <button type="button" onClick={() => onFiltersChange({ ...filters, isActive: false })}>
        Set inactive
      </button>
      <button
        type="button"
        onClick={() => onFiltersChange({ ...filters, courseScope: "GENERAL_EDUCATION" })}
      >
        Set GE scope
      </button>
    </div>
  ),
}));

import { listCourseAssignmentsAction } from "@/lib/actions/course-assignment-actions";

const mockPrograms = [
  { id: "program-1", code: "BSCS", name: "BS Computer Science" },
];

const mockFaculty = [
  { id: "faculty-1", firstName: "Test", lastName: "Faculty", email: "test@example.com" },
];

const mockCourses = [
  {
    id: "course-1",
    code: "CS101",
    title: "Introduction to Computing",
    default_year_level: YearLevel.SECOND_YEAR,
    course_scope: CourseScope.PROGRAM_SPECIFIC,
    program_id: "program-1",
  },
  {
    id: "course-2",
    code: "GE101",
    title: "General Education",
    default_year_level: YearLevel.FIRST_YEAR,
    course_scope: CourseScope.GENERAL_EDUCATION,
    program_id: null,
  },
];

const mockTermInstances = [
  {
    id: "term-1",
    schoolYearId: "sy-1",
    schoolYearCode: "2025-2026",
    semester: "FIRST" as const,
    term: "FIRST_TERM" as const,
    startDate: null,
    endDate: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
] as unknown as TermInstanceItem[];

function renderAllProgramShell(props = {}) {
  return render(
    <CourseAssignmentsPageShell
      pageTitle="Course Assignments"
      pageDescription="Manage faculty assignments for all programs, including General Education courses"
      mode="all-program"
      defaultIsActive={true}
      availableCourses={mockCourses}
      availablePrograms={mockPrograms}
      availableFaculty={mockFaculty}
      termInstances={mockTermInstances}
      {...props}
    />
  );
}

describe("CourseAssignmentsPageShell (all-program mode)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(listCourseAssignmentsAction).mockResolvedValue({
      success: true,
      data: {
        items: [],
        total: 0,
        page: 0,
        pageSize: 10,
      },
    });
  });

  it("renders role-specific page copy", async () => {
    renderAllProgramShell({
      pageTitle: "Course Assignments",
      pageDescription: "Secretary-specific description",
    });

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /course assignments/i })).toBeInTheDocument();
    });
    expect(screen.getByText("Secretary-specific description")).toBeInTheDocument();
  });

  it("loads active assignments by default", async () => {
    renderAllProgramShell();

    await waitFor(() => {
      expect(listCourseAssignmentsAction).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: true }),
        { page: 0 }
      );
    });
  });

  it("passes status filter changes to the listing action", async () => {
    renderAllProgramShell();

    await waitFor(() => {
      expect(listCourseAssignmentsAction).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByRole("button", { name: /set inactive/i }));

    await waitFor(() => {
      expect(listCourseAssignmentsAction).toHaveBeenLastCalledWith(
        expect.objectContaining({ isActive: false }),
        { page: 0 }
      );
    });
  });

  it("passes Course scope filter changes to the listing action", async () => {
    renderAllProgramShell();

    await waitFor(() => {
      expect(listCourseAssignmentsAction).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByRole("button", { name: /set ge scope/i }));

    await waitFor(() => {
      expect(listCourseAssignmentsAction).toHaveBeenLastCalledWith(
        expect.objectContaining({
          isActive: true,
          courseScope: CourseScope.GENERAL_EDUCATION,
        }),
        { page: 0 }
      );
    });
  });
});
