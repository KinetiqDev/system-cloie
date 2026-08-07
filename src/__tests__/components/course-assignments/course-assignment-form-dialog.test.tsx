import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { renderHook, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { YearLevel, StudentSection, CourseScope } from "@prisma/client";
import { useState, useEffect } from "react";

import { ClassIdentityFields } from "@/features/course-assignments/components/shared/class-identity-fields";
import { CourseAssignmentFormDialog } from "@/features/course-assignments/components/course-assignment-form-dialog";
import { createCourseAssignmentAction } from "@/lib/actions/course-assignment-actions";
import type { TermInstanceItem } from "@/features/academic-calendar/types";
import type { FacultySearchResult } from "@/features/course-assignments/types";

vi.mock("@/lib/actions/course-assignment-actions", () => ({
  createCourseAssignmentAction: vi.fn(),
  bulkCreateCourseAssignmentsAction: vi.fn(),
  searchFacultyPoolAction: vi.fn(),
  loadCourseAssignmentsForSheetAction: vi.fn(),
  updateCourseAssignmentAction: vi.fn(),
  activateCourseAssignmentAction: vi.fn(),
  deactivateCourseAssignmentAction: vi.fn(),
  deleteCourseAssignmentAction: vi.fn(),
}));

const facultyMockState = vi.hoisted(() => ({ crossProgram: false }));

vi.mock("@/features/course-assignments/components/shared/faculty-search-popover", () => ({
  FacultySearchPopover: ({ onSelect }: { onSelect: (faculty: FacultySearchResult) => void }) => (
    <button
      type="button"
      onClick={() =>
        onSelect({
          id: "faculty-1",
          firstName: "Test",
          lastName: "Faculty",
          email: "test@example.com",
          affiliations: facultyMockState.crossProgram ? [] : ["BS Computer Science"],
          primaryAffiliation: facultyMockState.crossProgram ? undefined : "BS Computer Science",
        })
      }
    >
      Pick faculty
    </button>
  ),
}));

const mockPrograms = [
  { id: "prog-1", code: "BSCS", name: "BS Computer Science" },
  { id: "prog-2", code: "BSED", name: "BS Education" },
];

const mockCourses = [
  {
    id: "course-1",
    code: "CS101",
    title: "Intro",
    default_year_level: YearLevel.FIRST_YEAR,
    course_scope: CourseScope.PROGRAM_SPECIFIC,
    program_id: "prog-1",
  },
  {
    id: "course-2",
    code: "CS201",
    title: "Data Structures",
    default_year_level: YearLevel.SECOND_YEAR,
    course_scope: CourseScope.PROGRAM_SPECIFIC,
    program_id: "prog-1",
  },
  {
    id: "course-3",
    code: "GE101",
    title: "General Education",
    default_year_level: YearLevel.FIRST_YEAR,
    course_scope: CourseScope.GENERAL_EDUCATION,
    program_id: null,
  },
  {
    id: "course-4",
    code: "ED201",
    title: "Education Foundations",
    default_year_level: YearLevel.FIRST_YEAR,
    course_scope: CourseScope.PROGRAM_SPECIFIC,
    program_id: "prog-2",
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

describe("ClassIdentityFields - Hint chip", () => {
  const defaultProps = {
    programId: "prog-1",
    yearLevel: YearLevel.FIRST_YEAR,
    section: StudentSection.MORNING,
    availablePrograms: mockPrograms,
    onProgramChange: vi.fn(),
    onYearLevelChange: vi.fn(),
    onSectionChange: vi.fn(),
  };

  it("shows hint chip when yearLevel matches suggestedYearLevel", () => {
    render(
      <ClassIdentityFields
        {...defaultProps}
        yearLevel={YearLevel.FIRST_YEAR}
        suggestedYearLevel={YearLevel.FIRST_YEAR}
      />
    );

    expect(screen.getByText(/course default: 1st year/i)).toBeInTheDocument();
  });

  it("shows warning hint chip when yearLevel differs from suggestedYearLevel", () => {
    render(
      <ClassIdentityFields
        {...defaultProps}
        yearLevel={YearLevel.SECOND_YEAR}
        suggestedYearLevel={YearLevel.FIRST_YEAR}
      />
    );

    expect(screen.getByText(/course default: 1st year/i)).toBeInTheDocument();
    expect(screen.getByText(/selected: 2nd year/i)).toBeInTheDocument();
  });

  it("does not show hint chip when no suggestedYearLevel", () => {
    render(
      <ClassIdentityFields
        {...defaultProps}
        yearLevel={YearLevel.FIRST_YEAR}
        suggestedYearLevel={null}
      />
    );

    expect(screen.queryByText(/course default:/i)).not.toBeInTheDocument();
  });
});

describe("CourseAssignment pre-fill logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("pre-fills yearLevel when courseId changes and user hasn't touched it", () => {
    const mockCoursesLocal = [
      { id: "course-1", code: "CS101", title: "Intro", default_year_level: YearLevel.FIRST_YEAR },
      { id: "course-2", code: "CS201", title: "Data", default_year_level: YearLevel.SECOND_YEAR },
    ];

    const { result } = renderHook(() => {
      const [courseId, setCourseId] = useState<string | null>(null);
      const [yearLevel, setYearLevel] = useState<YearLevel>(YearLevel.FIRST_YEAR);
      const [hasTouchedYearLevel, setHasTouchedYearLevel] = useState(false);

      // Simulate the pre-fill logic from CourseAssignmentFormDialog
      useEffect(() => {
        if (courseId && !hasTouchedYearLevel) {
          const course = mockCoursesLocal.find((c) => c.id === courseId);
          if (course?.default_year_level) {
            setYearLevel(course.default_year_level);
          }
        }
      }, [courseId, hasTouchedYearLevel]);

      return { courseId, yearLevel, setCourseId, setYearLevel, setHasTouchedYearLevel };
    });

    // Initial state
    expect(result.current.yearLevel).toBe(YearLevel.FIRST_YEAR);

    // Select course with default_year_level = FIRST_YEAR
    act(() => {
      result.current.setCourseId("course-1");
    });

    expect(result.current.yearLevel).toBe(YearLevel.FIRST_YEAR);

    // Select course with default_year_level = SECOND_YEAR
    act(() => {
      result.current.setCourseId("course-2");
    });

    expect(result.current.yearLevel).toBe(YearLevel.SECOND_YEAR);
  });

  it("does not pre-fill when user has manually changed yearLevel", () => {
    const mockCoursesLocal = [
      { id: "course-1", code: "CS101", title: "Intro", default_year_level: YearLevel.FIRST_YEAR },
    ];

    const { result } = renderHook(() => {
      const [courseId, setCourseId] = useState<string | null>(null);
      const [yearLevel, setYearLevel] = useState<YearLevel>(YearLevel.FIRST_YEAR);
      const [hasTouchedYearLevel, setHasTouchedYearLevel] = useState(false);

      useEffect(() => {
        if (courseId && !hasTouchedYearLevel) {
          const course = mockCoursesLocal.find((c) => c.id === courseId);
          if (course?.default_year_level) {
            setYearLevel(course.default_year_level);
          }
        }
      }, [courseId, hasTouchedYearLevel]);

      return { courseId, yearLevel, setCourseId, setYearLevel, setHasTouchedYearLevel };
    });

    // User manually changes year level
    act(() => {
      result.current.setHasTouchedYearLevel(true);
      result.current.setYearLevel(YearLevel.THIRD_YEAR);
    });

    expect(result.current.yearLevel).toBe(YearLevel.THIRD_YEAR);

    // Now select course - should NOT override
    act(() => {
      result.current.setCourseId("course-1");
    });

    // Should remain THIRD_YEAR (user's choice)
    expect(result.current.yearLevel).toBe(YearLevel.THIRD_YEAR);
  });

  it("does not change yearLevel when course has no default_year_level", () => {
    const mockCoursesLocal = [
      { id: "course-1", code: "CS301", title: "Advanced", default_year_level: null },
    ];

    const { result } = renderHook(() => {
      const [courseId, setCourseId] = useState<string | null>(null);
      const [yearLevel, setYearLevel] = useState<YearLevel>(YearLevel.FIRST_YEAR);
      const [hasTouchedYearLevel] = useState(false);

      useEffect(() => {
        if (courseId && !hasTouchedYearLevel) {
          const course = mockCoursesLocal.find((c) => c.id === courseId);
          if (course?.default_year_level) {
            setYearLevel(course.default_year_level);
          }
        }
      }, [courseId, hasTouchedYearLevel]);

      return { courseId, yearLevel, setCourseId };
    });

    act(() => {
      result.current.setCourseId("course-1");
    });

    // Should remain at initial default
    expect(result.current.yearLevel).toBe(YearLevel.FIRST_YEAR);
  });

  it("resets hasTouchedYearLevel on resetForm equivalent", () => {
    const mockCoursesLocal = [
      { id: "course-1", code: "CS101", title: "Intro", default_year_level: YearLevel.SECOND_YEAR },
    ];

    const { result } = renderHook(() => {
      const [courseId, setCourseId] = useState<string | null>(null);
      const [yearLevel, setYearLevel] = useState<YearLevel>(YearLevel.FIRST_YEAR);
      const [hasTouchedYearLevel, setHasTouchedYearLevel] = useState(false);

      useEffect(() => {
        if (courseId && !hasTouchedYearLevel) {
          const course = mockCoursesLocal.find((c) => c.id === courseId);
          if (course?.default_year_level) {
            setYearLevel(course.default_year_level);
          }
        }
      }, [courseId, hasTouchedYearLevel]);

      const resetForm = () => {
        setCourseId(null);
        setYearLevel(YearLevel.FIRST_YEAR);
        setHasTouchedYearLevel(false);
      };

      return { courseId, yearLevel, setCourseId, setYearLevel, setHasTouchedYearLevel, resetForm };
    });

    // Touch and change it
    act(() => {
      result.current.setHasTouchedYearLevel(true);
      result.current.setYearLevel(YearLevel.THIRD_YEAR);
    });

    // Reset
    act(() => {
      result.current.resetForm();
    });

    // Now select course - should pre-fill because hasTouchedYearLevel is reset to false
    act(() => {
      result.current.setCourseId("course-1");
    });

    expect(result.current.yearLevel).toBe(YearLevel.SECOND_YEAR);
  });
});

describe("CourseAssignmentFormDialog visible wizard", () => {
  let toastMessages: Array<{ kind: string; message: string }> = [];
  const toastListener = ((event: Event) => {
    const detail = (event as CustomEvent).detail;
    toastMessages.push({ kind: detail.kind, message: detail.message });
  }) as EventListener;

  function Wrapper({ crossProgram = false }: { crossProgram?: boolean }) {
    const [open, setOpen] = useState(true);
    const onSuccess = vi.fn();

    return (
      <>
        <button type="button" onClick={() => setOpen(true)}>
          Open Dialog
        </button>
        <CourseAssignmentFormDialog
          open={open}
          onOpenChange={setOpen}
          availableCourses={mockCourses}
          availablePrograms={mockPrograms}
          termInstances={mockTermInstances}
          defaultTermInstanceId="term-1"
          defaultCourseId="course-2"
          onSuccess={onSuccess}
        />
        {crossProgram && <span data-testid="cross-program-flag" />}
      </>
    );
  }

  beforeEach(() => {
    facultyMockState.crossProgram = false;
    toastMessages = [];
    window.addEventListener("cloie-toast", toastListener);
    vi.mocked(createCourseAssignmentAction).mockResolvedValue({
      success: true,
      data: { id: "assignment-1", programIds: ["prog-1"] },
    });
  });

  afterEach(() => {
    window.removeEventListener("cloie-toast", toastListener);
    vi.restoreAllMocks();
  });

  function clickSelectByPlaceholder(placeholder: string) {
    const value = screen.getByText(placeholder);
    const trigger = value.closest('[role="combobox"]');
    if (!trigger) throw new Error(`Select trigger for "${placeholder}" not found`);
    fireEvent.click(trigger);
  }

  it("excludes General Education courses from the create picker", async () => {
    render(
      <CourseAssignmentFormDialog
        open
        onOpenChange={vi.fn()}
        availableCourses={mockCourses}
        availablePrograms={mockPrograms}
        termInstances={mockTermInstances}
        defaultTermInstanceId="term-1"
      />
    );

    clickSelectByPlaceholder("Select a course...");

    expect(await screen.findByRole("option", { name: /cs101 — intro/i })).toBeInTheDocument();
    expect(
      screen.queryByRole("option", { name: /ge101 — general education/i })
    ).not.toBeInTheDocument();
  });

  it("locks the program to the selected Course's owning program", async () => {
    render(
      <CourseAssignmentFormDialog
        open
        onOpenChange={vi.fn()}
        availableCourses={mockCourses}
        availablePrograms={mockPrograms}
        termInstances={mockTermInstances}
        defaultTermInstanceId="term-1"
      />
    );

    clickSelectByPlaceholder("Select a course...");
    fireEvent.click(await screen.findByRole("option", { name: /cs101 — intro/i }));

    fireEvent.click(screen.getByRole("button", { name: /next/i }));

    const programTrigger = screen.getByLabelText("Program");
    expect(programTrigger).toBeDisabled();
    expect(programTrigger).toHaveTextContent(/bscs — bs computer science/i);
  });

  it("pre-fills the year level from the catalog default", async () => {
    render(<Wrapper />);

    // Dialog starts at the course step because defaults are provided.
    fireEvent.click(screen.getByRole("button", { name: /next/i }));

    expect(await screen.findByText(/course default: 2nd year/i)).toBeInTheDocument();
  });

  it("resets cleanly after closing so the next assignment still gets the catalog default", async () => {
    render(<Wrapper />);

    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    await screen.findByText(/course default: 2nd year/i);

    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /open dialog/i }));

    const nextButton = screen.getByRole("button", { name: /next/i });
    await waitFor(() => {
      expect(nextButton).not.toBeDisabled();
    });

    fireEvent.click(nextButton);
    expect(await screen.findByText(/course default: 2nd year/i)).toBeInTheDocument();
  });

  it("creates an assignment directly when the faculty belongs to the selected program", async () => {
    render(<Wrapper />);

    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    fireEvent.click(screen.getByRole("button", { name: /next/i }));

    fireEvent.click(screen.getByRole("button", { name: /pick faculty/i }));
    fireEvent.click(screen.getByRole("button", { name: /next/i }));

    await waitFor(() => {
      expect(createCourseAssignmentAction).toHaveBeenCalledWith({
        termInstanceId: "term-1",
        facultyId: "faculty-1",
        courseId: "course-2",
        programId: "prog-1",
        yearLevel: YearLevel.SECOND_YEAR,
        section: StudentSection.MORNING,
      });
    });

    expect(toastMessages.some((t) => t.kind === "success")).toBe(true);

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("only offers courses owned by the selected Program Head context", async () => {
    render(
      <CourseAssignmentFormDialog
        open
        onOpenChange={vi.fn()}
        availableCourses={mockCourses}
        availablePrograms={mockPrograms}
        termInstances={mockTermInstances}
        defaultTermInstanceId="term-1"
        selectedProgramId="prog-1"
      />
    );

    clickSelectByPlaceholder("Select a course...");

    expect(await screen.findByRole("option", { name: /cs101 — intro/i })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /ed201 — education foundations/i })).not.toBeInTheDocument();
  });

  it("shows cross-program warning and a summary before confirming", async () => {
    facultyMockState.crossProgram = true;

    render(<Wrapper crossProgram />);

    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    fireEvent.click(screen.getByRole("button", { name: /next/i }));

    fireEvent.click(screen.getByRole("button", { name: /pick faculty/i }));
    fireEvent.click(screen.getByRole("button", { name: /next/i }));

    const warningTitle = await screen.findByText(/cross-program assignment/i);
    const warningAlert = warningTitle.closest('[data-slot="alert"]');
    expect(warningAlert).not.toBeNull();
    expect(warningAlert).toHaveClass("bg-warning-soft");
    expect(warningAlert).not.toHaveClass("bg-danger-soft");
    expect(screen.getByText(/cs201 — data structures/i)).toBeInTheDocument();
    expect(screen.getByText(/bscs/i)).toBeInTheDocument();
    expect(screen.getByText(/2nd year/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /confirm assignment/i }));

    await waitFor(() => {
      expect(createCourseAssignmentAction).toHaveBeenCalled();
    });
  });

  it("keeps the confirm action labeled while submission is pending", async () => {
    facultyMockState.crossProgram = true;
    let resolveCreate: (value: { success: true; data: { id: string; programIds: string[] } }) => void = () => {};
    vi.mocked(createCourseAssignmentAction).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveCreate = resolve;
        })
    );

    render(<Wrapper crossProgram />);

    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    fireEvent.click(screen.getByRole("button", { name: /pick faculty/i }));
    fireEvent.click(screen.getByRole("button", { name: /next/i }));

    await screen.findByText(/cross-program assignment/i);
    fireEvent.click(screen.getByRole("button", { name: /confirm assignment/i }));

    const pendingButton = screen.getByRole("button", { name: /confirm assignment/i });
    expect(pendingButton).toHaveAttribute("aria-busy", "true");
    expect(pendingButton).toBeDisabled();

    resolveCreate({ success: true, data: { id: "assignment-1", programIds: ["prog-1"] } });
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });
});

describe("CourseAssignmentFormDialog all-program mode", () => {
  beforeEach(() => {
    facultyMockState.crossProgram = false;
    vi.clearAllMocks();
    vi.mocked(createCourseAssignmentAction).mockResolvedValue({
      success: true,
      data: { id: "assignment-1", programIds: ["prog-1"] },
    });
  });

  async function openAndSelect(label: RegExp, optionText: string) {
    const trigger = screen.getByLabelText(label);
    fireEvent.click(trigger);
    const option = await screen.findByRole("option", { name: optionText });
    fireEvent.focus(option);
    fireEvent.keyDown(option, { key: "Enter" });
    fireEvent.keyUp(option, { key: "Enter" });
  }

  function clickSelectByPlaceholder(placeholder: string) {
    const value = screen.getByText(placeholder);
    const trigger = value.closest('[role="combobox"]');
    if (!trigger) throw new Error(`Select trigger for "${placeholder}" not found`);
    fireEvent.click(trigger);
  }

  function Wrapper({ defaultCourseId }: { defaultCourseId?: string | null }) {
    const [open, setOpen] = useState(true);

    return (
      <CourseAssignmentFormDialog
        open={open}
        onOpenChange={setOpen}
        availableCourses={mockCourses}
        availablePrograms={mockPrograms}
        termInstances={mockTermInstances}
        defaultTermInstanceId="term-1"
        defaultCourseId={defaultCourseId ?? null}
        mode="all-program"
        onSuccess={vi.fn()}
      />
    );
  }

  it("includes General Education courses in the create picker", async () => {
    render(<Wrapper />);

    clickSelectByPlaceholder("Select a course...");

    expect(await screen.findByRole("option", { name: /cs101 — intro/i })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /ge101 — general education/i })).toBeInTheDocument();
  });

  it("locks program for Program-specific courses in all-program mode", async () => {
    render(<Wrapper defaultCourseId="course-1" />);

    fireEvent.click(screen.getByRole("button", { name: /next/i }));

    const programTrigger = screen.getByLabelText("Program");
    expect(programTrigger).toBeDisabled();
    expect(programTrigger).toHaveTextContent(/bscs — bs computer science/i);
  });

  it("requires choosing a target program for General Education courses", async () => {
    render(<Wrapper defaultCourseId="course-3" />);

    fireEvent.click(screen.getByRole("button", { name: /next/i }));

    const programTrigger = screen.getByLabelText("Program");
    expect(programTrigger).not.toBeDisabled();
    expect(programTrigger).not.toHaveTextContent(/bscs/i);

    await openAndSelect(/program/i, "BSED — BS Education");

    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    fireEvent.click(screen.getByRole("button", { name: /pick faculty/i }));
    fireEvent.click(screen.getByRole("button", { name: /next/i }));

    expect(await screen.findByText(/cross-program assignment/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /confirm assignment/i }));

    await waitFor(() => {
      expect(createCourseAssignmentAction).toHaveBeenCalledWith({
        termInstanceId: "term-1",
        facultyId: "faculty-1",
        courseId: "course-3",
        programId: "prog-2",
        yearLevel: YearLevel.FIRST_YEAR,
        section: StudentSection.MORNING,
      });
    });
  });
});
