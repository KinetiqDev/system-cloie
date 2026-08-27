import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AcademicSemester, AcademicTerm, CourseScope, YearLevel } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { createActionMock, updateActionMock, toggleActionMock, bulkToggleActionMock } = vi.hoisted(
  () => ({
    createActionMock: vi.fn(),
    updateActionMock: vi.fn(),
    toggleActionMock: vi.fn(),
    bulkToggleActionMock: vi.fn(),
  })
);

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/lib/actions/program-head-course-actions", () => ({
  createProgramHeadCourseAction: createActionMock,
  updateProgramHeadCourseAction: updateActionMock,
  toggleProgramHeadCourseActiveAction: toggleActionMock,
  bulkToggleProgramHeadCoursesActiveAction: bulkToggleActionMock,
}));
vi.mock("@/features/academic-calendar/components/term-instance-picker", () => ({
  TermInstancePicker: () => null,
}));

describe("Program Head Courses catalog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("keeps the selected Program as the form authority input", async () => {
    const { ProgramHeadCoursesCatalog } =
      await import("@/features/academic-structure/components/program-head-courses-catalog");
    const programId = "11111111-1111-4111-8111-111111111111";
    createActionMock.mockResolvedValue({ success: true });

    render(
      <ProgramHeadCoursesCatalog
        program={{ id: programId, code: "BSED", name: "Secondary Education" }}
        courses={[]}
        summary={{ total: 0, programWide: 0, majorSpecific: 0, archived: 0 }}
        majors={[]}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Add Course" }));
    await waitFor(() => expect(screen.getByText("Add New Course")).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText("Course Code"), { target: { value: "BSED-101" } });
    fireEvent.change(screen.getByLabelText("Course Title"), { target: { value: "Foundations" } });
    fireEvent.click(screen.getByRole("button", { name: "Create Course" }));

    await waitFor(() => expect(createActionMock).toHaveBeenCalled());
    const formData = createActionMock.mock.calls[0]?.[0] as FormData;
    expect(formData.get("programId")).toBe(programId);
    expect(formData.get("course_type")).toBe("program-wide");
    expect(screen.getByText("Secondary Education")).toBeInTheDocument();
  });

  it("submits a Major-Specific Course with the selected major", async () => {
    const { ProgramHeadCoursesCatalog } =
      await import("@/features/academic-structure/components/program-head-courses-catalog");
    createActionMock.mockResolvedValue({ success: true });

    render(
      <ProgramHeadCoursesCatalog
        program={{
          id: "11111111-1111-4111-8111-111111111111",
          code: "BSED",
          name: "Secondary Education",
        }}
        courses={[]}
        summary={{ total: 0, programWide: 0, majorSpecific: 0, archived: 0 }}
        majors={[
          {
            id: "22222222-2222-4222-8222-222222222222",
            name: "English",
            program_id: "11111111-1111-4111-8111-111111111111",
          },
        ]}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Add Course" }));
    await waitFor(() => expect(screen.getByText("Add New Course")).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText(/^Major\b/));
    const englishOption = await screen.findByRole("option", { name: "English" });
    fireEvent.focus(englishOption);
    fireEvent.keyDown(englishOption, { key: "Enter" });
    fireEvent.keyUp(englishOption, { key: "Enter" });
    fireEvent.change(screen.getByLabelText("Course Code"), { target: { value: "BSED-101" } });
    fireEvent.change(screen.getByLabelText("Course Title"), { target: { value: "Foundations" } });
    fireEvent.click(screen.getByRole("button", { name: "Create Course" }));

    await waitFor(() => expect(createActionMock).toHaveBeenCalled());
    const formData = createActionMock.mock.calls[0]?.[0] as FormData;
    expect(formData.get("course_type")).toBe("major-specific");
    expect(formData.get("major_id")).toBe("22222222-2222-4222-8222-222222222222");
  });

  it("renders status filter and schedule columns without scope tabs", async () => {
    const { ProgramHeadCoursesCatalog } =
      await import("@/features/academic-structure/components/program-head-courses-catalog");
    const programId = "11111111-1111-4111-8111-111111111111";
    const mockCourse = {
      id: "course-1",
      code: "IT-101",
      title: "Introduction to Computing",
      course_scope: CourseScope.PROGRAM_SPECIFIC,
      program_id: programId,
      major_id: null,
      default_year_level: YearLevel.FIRST_YEAR,
      default_semester: AcademicSemester.FIRST,
      default_term: AcademicTerm.FIRST_TERM,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
      program: { id: programId, code: "BSIT", name: "Information Technology" },
      major: null,
      _count: { cilos: 0, course_bound_evaluations: 0 },
    };

    render(
      <ProgramHeadCoursesCatalog
        program={{ id: programId, code: "BSIT", name: "Information Technology" }}
        courses={[mockCourse]}
        summary={{ total: 1, programWide: 1, majorSpecific: 0, archived: 0 }}
        majors={[]}
      />
    );

    expect(screen.getByText("All Statuses")).toBeInTheDocument();
    expect(screen.getByText("Year Level")).toBeInTheDocument();
    expect(screen.getByText("Semester")).toBeInTheDocument();
    expect(screen.getByText("Term")).toBeInTheDocument();
    expect(screen.getByText("1st Year")).toBeInTheDocument();
    expect(screen.getByText("1st Semester")).toBeInTheDocument();
    expect(screen.getByText("1st Term")).toBeInTheDocument();

    expect(screen.queryByText("Type")).toBeNull();
    expect(screen.queryByText("Gen Ed")).toBeNull();
    expect(screen.queryByRole("button", { name: "Program-Wide" })).toBeNull();
  });

  it("selects visible Program courses and exposes archive and restore actions", async () => {
    const { ProgramHeadCoursesCatalog } =
      await import("@/features/academic-structure/components/program-head-courses-catalog");
    const programId = "11111111-1111-4111-8111-111111111111";
    render(
      <ProgramHeadCoursesCatalog
        program={{ id: programId, code: "BSIT", name: "Information Technology" }}
        courses={[
          {
            id: "course-1",
            code: "IT-101",
            title: "Introduction to Computing",
            course_scope: CourseScope.PROGRAM_SPECIFIC,
            program_id: programId,
            major_id: null,
            default_year_level: null,
            default_semester: null,
            default_term: null,
            is_active: true,
            created_at: new Date(),
            updated_at: new Date(),
            program: { id: programId, code: "BSIT", name: "Information Technology" },
            major: null,
            _count: { cilos: 0, course_bound_evaluations: 0 },
          },
        ]}
        summary={{ total: 1, programWide: 1, majorSpecific: 0, archived: 0 }}
        majors={[]}
      />
    );

    fireEvent.click(screen.getByRole("checkbox", { name: "Select IT-101" }));
    expect(screen.getByText("1 course selected")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Archive" }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("button", { name: "Restore" })).toBeInTheDocument();
  });
});
