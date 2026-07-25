import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { YearLevel, StudentSection, CourseScope } from "@prisma/client";

import { CourseAssignmentsPageShell } from "@/features/course-assignments/components/course-assignments-page-shell";
import type { TermInstanceItem } from "@/features/academic-calendar/types";
import type { CourseAssignmentItem } from "@/features/course-assignments/types";

vi.mock("@/lib/actions/course-assignment-actions", () => ({
  listCourseAssignmentsAction: vi.fn(),
  createCourseAssignmentAction: vi.fn(),
  bulkCreateCourseAssignmentsAction: vi.fn(),
  deactivateCourseAssignmentAction: vi.fn(),
  activateCourseAssignmentAction: vi.fn(),
  deleteCourseAssignmentAction: vi.fn(),
  updateCourseAssignmentAction: vi.fn(),
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

import {
  deactivateCourseAssignmentAction,
  listCourseAssignmentsAction,
} from "@/lib/actions/course-assignment-actions";

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

function createAssignment(overrides: Partial<CourseAssignmentItem> = {}): CourseAssignmentItem {
  return {
    id: "assignment-1",
    termInstanceId: "term-1",
    facultyId: "faculty-1",
    courseId: "course-1",
    programId: "program-1",
    yearLevel: YearLevel.SECOND_YEAR,
    section: StudentSection.MORNING,
    assignedBy: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    facultyName: "Test Faculty",
    facultyEmail: "test@example.com",
    courseCode: "CS101",
    courseTitle: "Intro to Computing",
    courseScope: CourseScope.PROGRAM_SPECIFIC,
    programCode: "BSCS",
    programName: "BS Computer Science",
    termLabel: "2025-2026 — 1st Semester — 1st Term",
    ...overrides,
  };
}

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
    vi.mocked(deactivateCourseAssignmentAction).mockResolvedValue({ success: true });
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

  it("clears stale assignments and shows the load error when listing returns a failure", async () => {
    vi.mocked(listCourseAssignmentsAction)
      .mockResolvedValueOnce({
        success: true,
        data: {
          items: [createAssignment()],
          total: 1,
          page: 0,
          pageSize: 10,
        },
      })
      .mockResolvedValueOnce({ success: false, error: "Failed to list course assignments." });

    renderAllProgramShell();

    await waitFor(() => {
      expect(screen.getByText("CS101")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /set inactive/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Failed to list course assignments.");
    });
    expect(screen.queryByText("CS101")).not.toBeInTheDocument();
    expect(screen.getByTestId("empty-state")).toBeInTheDocument();
  });

  it("clears stale assignments and shows a generic load error when listing rejects", async () => {
    vi.mocked(listCourseAssignmentsAction)
      .mockResolvedValueOnce({
        success: true,
        data: {
          items: [createAssignment()],
          total: 1,
          page: 0,
          pageSize: 10,
        },
      })
      .mockRejectedValueOnce(new Error("network failed"));

    renderAllProgramShell();

    await waitFor(() => {
      expect(screen.getByText("CS101")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /set inactive/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Failed to load course assignments.");
    });
    expect(screen.queryByText("CS101")).not.toBeInTheDocument();
  });

  it("clamps the current page after a refresh returns an out-of-range empty page", async () => {
    vi.mocked(listCourseAssignmentsAction)
      .mockResolvedValueOnce({
        success: true,
        data: {
          items: [createAssignment()],
          total: 21,
          page: 0,
          pageSize: 20,
        },
      })
      .mockResolvedValueOnce({
        success: true,
        data: {
          items: [createAssignment({ id: "assignment-2", courseCode: "CS102" })],
          total: 21,
          page: 1,
          pageSize: 20,
        },
      })
      .mockResolvedValueOnce({
        success: true,
        data: {
          items: [],
          total: 20,
          page: 1,
          pageSize: 20,
        },
      })
      .mockResolvedValueOnce({
        success: true,
        data: {
          items: [createAssignment()],
          total: 20,
          page: 0,
          pageSize: 20,
        },
      });

    renderAllProgramShell();

    await waitFor(() => {
      expect(screen.getByText("CS101")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText(/next page/i));

    await waitFor(() => {
      expect(screen.getByText("CS102")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText(/open actions for CS102/i));
    fireEvent.click(screen.getByRole("menuitem", { name: /deactivate/i }));
    fireEvent.click(screen.getByRole("button", { name: /^deactivate$/i }));

    await waitFor(() => {
      expect(listCourseAssignmentsAction).toHaveBeenLastCalledWith(
        expect.objectContaining({ isActive: true }),
        { page: 0 }
      );
      expect(screen.getByText("CS101")).toBeInTheDocument();
      expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
    });
  });
});
