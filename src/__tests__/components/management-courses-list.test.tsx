import { describe, expect, test } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ManagementCoursesList } from "@/features/academic-structure/components/management-courses-list";
import type {
  ManagementCourseSummaryItem,
  ManagementCoursesKPI,
  ProgramFilterOption,
} from "@/features/academic-structure/services/list-management-courses-summary";

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

  test("shows Edit link with correct basePath for Secretary", async () => {
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

    const editLink = await screen.findByText("Edit");
    expect(editLink).toHaveAttribute("href", "/secretary/courses/course-1/edit");
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
});
