import { describe, expect, test, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ManagementCoursesList } from "@/features/academic-structure/components/management-courses-list";
import type {
  ManagementCourseSummaryItem,
  ManagementCoursesKPI,
  ProgramFilterOption,
} from "@/features/academic-structure/services/list-management-courses-summary";
import { updateCourseAction } from "@/lib/actions/management-foundation-actions";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), replace: vi.fn(), push: vi.fn() }),
}));

vi.mock("@/lib/actions/management-foundation-actions", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/actions/management-foundation-actions")>();
  return {
    ...actual,
    getCourseEditDataAction: vi.fn().mockResolvedValue({
      course: {
        id: "course-1",
        code: "GE101",
        title: "Introduction to General Education",
        description: "A foundational course",
        course_scope: "GENERAL_EDUCATION",
        program_id: null,
        major_id: null,
        default_year_level: null,
        default_semester: null,
        default_term: null,
        updated_at: new Date("2026-01-01T00:00:00.000Z"),
      },
      programs: [],
      majors: [],
    }),
    updateCourseAction: vi.fn().mockResolvedValue({ success: true }),
  };
});

const mockCourses: ManagementCourseSummaryItem[] = [
  {
    id: "course-1",
    code: "GE101",
    title: "Introduction to General Education",
    description: "A foundational course",
    courseScope: "GENERAL_EDUCATION",
    courseScopeLabel: "General Education",
    isActive: true,
    programId: null,
    programCode: null,
    programName: null,
    majorId: null,
    majorName: null,
    ciloCount: 3,
    evaluationCount: 2,
  },
  {
    id: "course-2",
    code: "IT101",
    title: "Introduction to Programming",
    description: "Basic programming concepts",
    courseScope: "PROGRAM_SPECIFIC",
    courseScopeLabel: "Program-Specific",
    isActive: true,
    programId: "prog-1",
    programCode: "BSIT",
    programName: "Bachelor of Science in Information Technology",
    majorId: null,
    majorName: null,
    ciloCount: 5,
    evaluationCount: 3,
  },
];

const mockKPI: ManagementCoursesKPI = {
  totalCourses: 2,
  activeCourses: 2,
  generalEducationCourses: 1,
  programSpecificCourses: 1,
};

const mockPrograms: ProgramFilterOption[] = [
  {
    id: "prog-1",
    code: "BSIT",
    name: "Bachelor of Science in Information Technology",
    majors: [],
  },
];

describe("ManagementCoursesList", () => {
  test("renders courses list for Secretary dashboard with correct basePath", () => {
    render(
      <ManagementCoursesList
        courses={mockCourses}
        kpi={mockKPI}
        programs={mockPrograms}
        basePath="/secretary/courses"
      />
    );

    expect(screen.getByText("Courses")).toBeInTheDocument();
    expect(screen.getByText("GE101")).toBeInTheDocument();
    expect(screen.getAllByText("Introduction to General Education")).toHaveLength(2);
    expect(screen.getByText("IT101")).toBeInTheDocument();
    expect(screen.getAllByText("Introduction to Programming")).toHaveLength(2);
    expect(screen.getByText("Create Course")).toHaveAttribute("href", "/secretary/courses/new");
  });

  test("renders courses list for Dean dashboard with correct basePath", () => {
    render(
      <ManagementCoursesList
        courses={mockCourses}
        kpi={mockKPI}
        programs={mockPrograms}
        basePath="/dean/courses"
      />
    );

    expect(screen.getByText("Courses")).toBeInTheDocument();
    expect(screen.getByText("GE101")).toBeInTheDocument();
    expect(screen.getByText("IT101")).toBeInTheDocument();
    expect(screen.getByText("Create Course")).toHaveAttribute("href", "/dean/courses/new");
  });

  test("displays KPI cards with correct values", () => {
    render(
      <ManagementCoursesList
        courses={mockCourses}
        kpi={mockKPI}
        programs={mockPrograms}
        basePath="/secretary/courses"
      />
    );

    expect(screen.getAllByText("2").length).toBeGreaterThan(0);
    expect(screen.getByText("Total Courses")).toBeInTheDocument();
    expect(screen.getByText("Active Courses")).toBeInTheDocument();
    expect(screen.getAllByText("General Education").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Program-Specific").length).toBeGreaterThan(0);
  });

  test("displays scope badges correctly", () => {
    render(
      <ManagementCoursesList
        courses={mockCourses}
        kpi={mockKPI}
        programs={mockPrograms}
        basePath="/secretary/courses"
      />
    );

    expect(screen.getAllByText("General Education").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Program-Specific").length).toBeGreaterThan(0);
  });

  test("shows program and major information when available", () => {
    render(
      <ManagementCoursesList
        courses={mockCourses}
        kpi={mockKPI}
        programs={mockPrograms}
        basePath="/secretary/courses"
      />
    );

    expect(screen.getAllByText("BSIT")).toHaveLength(2);
  });

  test("displays CILO and evaluation counts", () => {
    render(
      <ManagementCoursesList
        courses={mockCourses}
        kpi={mockKPI}
        programs={mockPrograms}
        basePath="/secretary/courses"
      />
    );

    // "2" appears in KPI (totalCourses) and table (course-1 evaluationCount).
    // "3" appears in table for course-1 ciloCount and course-2 evaluationCount.
    // "5" appears in table for course-2 ciloCount.
    expect(screen.getAllByText("2").length).toBeGreaterThan(0);
    expect(screen.getAllByText("3").length).toBeGreaterThan(0);
    expect(screen.getAllByText("5").length).toBeGreaterThan(0);
  });

  test("opens the edit modal for Secretary", async () => {
    const { container } = render(
      <ManagementCoursesList
        courses={mockCourses}
        kpi={mockKPI}
        programs={mockPrograms}
        basePath="/secretary/courses"
      />
    );

    // DropdownMenuContent renders via Portal only after the trigger opens it.
    const trigger = container.querySelector(
      '[data-slot="dropdown-menu-trigger"]'
    ) as HTMLElement;
    expect(trigger).toBeTruthy();
    fireEvent.click(trigger);

    const editItem = await screen.findByText("Edit");
    fireEvent.click(editItem);

    // Dialog should open with the course edit form
    expect(await screen.findByText("Edit Course")).toBeInTheDocument();
    const updateButton = await screen.findByText("Update Course");
    expect(updateButton).toBeInTheDocument();

    // Footer submit targets the form and calls the update action
    fireEvent.click(updateButton);
    await waitFor(() => {
      expect(updateCourseAction).toHaveBeenCalled();
    });
  });

  test("shows Edit link with correct basePath for Dean", async () => {
    const { container } = render(
      <ManagementCoursesList
        courses={mockCourses}
        kpi={mockKPI}
        programs={mockPrograms}
        basePath="/dean/courses"
      />
    );

    const trigger = container.querySelector(
      '[data-slot="dropdown-menu-trigger"]'
    ) as HTMLElement;
    expect(trigger).toBeTruthy();
    fireEvent.click(trigger);

    const editLink = await screen.findByText("Edit");
    expect(editLink).toHaveAttribute("href", "/dean/courses/course-1/edit");
  });

  test("hides evaluation counts from Dean course oversight", () => {
    render(
      <ManagementCoursesList
        courses={mockCourses}
        kpi={mockKPI}
        programs={mockPrograms}
        basePath="/dean/academic-structure/courses"
      />
    );

    expect(screen.queryByText("Evaluations")).not.toBeInTheDocument();
  });
});
