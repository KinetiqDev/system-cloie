import { describe, expect, it, vi } from "vitest";
import { CourseScope, StudentSection, YearLevel } from "@prisma/client";
import { render, screen } from "@testing-library/react";
import { CourseAssignmentsPageShell } from "@/features/course-assignments/components/course-assignments-page-shell";

vi.mock("next/navigation", () => ({
  usePathname: () => "/program-head/course-assignments",
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

describe("Program Head Course Assignments server-first shell", () => {
  it("renders the authorized initial assignment supplied by the route", () => {
    render(
      <CourseAssignmentsPageShell
        pageTitle="Course Assignments"
        pageDescription="Manage faculty assignments for courses in your program"
        mode="program-head"
        availableCourses={[]}
        availablePrograms={[]}
        availableFaculty={[]}
        termInstances={[]}
        initialData={{
          items: [
            {
              id: "assignment-1",
              termInstanceId: "term-1",
              facultyId: "faculty-1",
              courseId: "course-1",
              programId: "program-1",
              yearLevel: YearLevel.FIRST_YEAR,
              section: StudentSection.MORNING,
              assignedBy: null,
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date(),
              courseCode: "CS101",
              courseTitle: "Intro to Computing",
              courseScope: CourseScope.PROGRAM_SPECIFIC,
              facultyName: "Faculty Member",
            },
          ],
          total: 1,
          page: 0,
          pageSize: 20,
        }}
        initialFilters={{
          termInstanceId: null,
          courseId: null,
          facultyId: null,
          programId: null,
          yearLevel: null,
          section: null,
          isActive: null,
          courseScope: null,
          searchQuery: "",
        }}
        initialPage={1}
      />
    );

    expect(screen.getByText("CS101")).toBeInTheDocument();
  });
});
