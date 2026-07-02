import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { YearLevel, CourseScope } from "@prisma/client";

import { CourseAssignmentsClientPage } from "@/app/(app)/program-head/course-assignments/client-page";
import type { TermInstanceItem } from "@/features/academic-calendar/types";

vi.mock("@/lib/actions/course-assignment-actions", () => ({
  listCourseAssignmentsAction: vi.fn(),
  createCourseAssignmentAction: vi.fn(),
  bulkCreateCourseAssignmentsAction: vi.fn(),
  searchFacultyPoolAction: vi.fn(),
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

function clickSelectByPlaceholder(placeholder: string) {
  const value = screen.getByText(placeholder);
  const trigger = value.closest('[role="combobox"]');
  if (!trigger) throw new Error(`Select trigger for "${placeholder}" not found`);
  fireEvent.click(trigger);
}

describe("CourseAssignmentsClientPage", () => {
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

  it("pre-fills the year level from the selected course's default", async () => {
    render(
      <CourseAssignmentsClientPage
        availableCourses={mockCourses}
        availablePrograms={mockPrograms}
        availableFaculty={mockFaculty}
        termInstances={mockTermInstances}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/no course assignments found/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByRole("button", { name: /assign faculty/i })[0]);

    // Term step
    clickSelectByPlaceholder("Select a term...");
    fireEvent.click(await screen.findByRole("option", { name: /2025-2026 — 1st Semester — 1st Term/i }));
    fireEvent.click(screen.getByRole("button", { name: /next/i }));

    // Course step
    clickSelectByPlaceholder("Select a course...");
    fireEvent.click(await screen.findByRole("option", { name: /cs101 — introduction to computing/i }));
    fireEvent.click(screen.getByRole("button", { name: /next/i }));

    // Class step: the default hint from the course default is visible
    expect(await screen.findByText(/course default: 2nd year/i)).toBeInTheDocument();
  });

  it("does not render or launch a merged-class helper", async () => {
    render(
      <CourseAssignmentsClientPage
        availableCourses={mockCourses}
        availablePrograms={mockPrograms}
        availableFaculty={mockFaculty}
        termInstances={mockTermInstances}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/no course assignments found/i)).toBeInTheDocument();
    });

    expect(screen.queryByRole("button", { name: /create merged class/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: /create merged class assignment/i })).not.toBeInTheDocument();
  });
});
