import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { YearLevel, StudentSection, CourseScope } from "@prisma/client";

import { EditCourseAssignmentDialog } from "@/features/course-assignments/components/edit-course-assignment-dialog";
import {
  searchFacultyPoolAction,
  updateCourseAssignmentAction,
} from "@/lib/actions/course-assignment-actions";
import type { CourseAssignmentItem } from "@/features/course-assignments/types";

vi.mock("@/lib/actions/course-assignment-actions", () => ({
  updateCourseAssignmentAction: vi.fn(),
  searchFacultyPoolAction: vi.fn(),
}));

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

async function openAndSelect(label: RegExp, optionText: string) {
  const trigger = screen.getByLabelText(label);
  fireEvent.click(trigger);
  const option = await screen.findByRole("option", { name: optionText });
  fireEvent.focus(option);
  fireEvent.keyDown(option, { key: "Enter" });
  fireEvent.keyUp(option, { key: "Enter" });
}

describe("EditCourseAssignmentDialog", () => {
  let toastMessages: Array<{ kind: string; message: string }> = [];
  const toastListener = ((event: Event) => {
    const detail = (event as CustomEvent).detail;
    toastMessages.push({ kind: detail.kind, message: detail.message });
  }) as EventListener;

  beforeEach(() => {
    toastMessages = [];
    window.addEventListener("cloie-toast", toastListener);
    vi.clearAllMocks();
  });

  afterEach(() => {
    window.removeEventListener("cloie-toast", toastListener);
    vi.restoreAllMocks();
  });

  const mockPrograms = [{ id: "program-1", code: "BSCS", name: "BS Computer Science" }];
  const mockCourses = [
    {
      id: "course-1",
      code: "CS101",
      title: "Intro to Computing",
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

  it("pre-fills class identity from the assignment and course default", () => {
    render(
      <EditCourseAssignmentDialog
        open
        onOpenChange={vi.fn()}
        assignment={createAssignment()}
        availableCourses={mockCourses}
        availablePrograms={mockPrograms}
      />
    );

    expect(screen.getByText(/CS101 — Intro to Computing/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Test Faculty/i).length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByText(/Class identity locks after the first roster membership/i)
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Program")).toHaveValue("BSCS — BS Computer Science");
    expect(screen.getByLabelText("Faculty")).toHaveValue("Test Faculty");
    expect(screen.getByText(/course default: 2nd year/i)).toBeInTheDocument();
  });

  it("locks program for Program-specific courses", () => {
    render(
      <EditCourseAssignmentDialog
        open
        onOpenChange={vi.fn()}
        assignment={createAssignment()}
        availableCourses={mockCourses}
        availablePrograms={mockPrograms}
      />
    );

    const programTrigger = screen.getByLabelText("Program");
    expect(programTrigger).toBeDisabled();
  });

  it("allows changing program for General Education assignments", () => {
    const geAssignment = createAssignment({
      courseId: "course-2",
      courseCode: "GE101",
      courseTitle: "General Education",
      courseScope: CourseScope.GENERAL_EDUCATION,
    });

    render(
      <EditCourseAssignmentDialog
        open
        onOpenChange={vi.fn()}
        assignment={geAssignment}
        availableCourses={mockCourses}
        availablePrograms={mockPrograms}
      />
    );

    const programTrigger = screen.getByLabelText("Program");
    expect(programTrigger).not.toBeDisabled();
  });

  it("calls update action when a change is submitted", async () => {
    vi.mocked(updateCourseAssignmentAction).mockResolvedValue({ success: true, data: undefined });
    const onSuccess = vi.fn();
    const onOpenChange = vi.fn();

    render(
      <EditCourseAssignmentDialog
        open
        onOpenChange={onOpenChange}
        assignment={createAssignment()}
        availableCourses={mockCourses}
        availablePrograms={mockPrograms}
        onSuccess={onSuccess}
      />
    );

    await openAndSelect(/year level/i, "3rd Year");

    const saveButton = screen.getByRole("button", { name: /save changes/i });
    expect(saveButton).toBeEnabled();

    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(updateCourseAssignmentAction).toHaveBeenCalledWith({
        assignmentId: "assignment-1",
        programId: "program-1",
        yearLevel: YearLevel.THIRD_YEAR,
        section: StudentSection.MORNING,
      });
    });

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onSuccess).toHaveBeenCalled();
    expect(toastMessages.some((t) => t.kind === "success")).toBe(true);
  });

  it("submits Faculty reassignment through the same transactional update action", async () => {
    vi.mocked(updateCourseAssignmentAction).mockResolvedValue({ success: true, data: undefined });
    vi.mocked(searchFacultyPoolAction).mockResolvedValue({
      success: true,
      data: {
        items: [
          {
            id: "faculty-2",
            email: "faculty-2@example.com",
            name: "Elena Torres",
            primaryAffiliation: "BSCS",
            primaryAffiliationCode: "BSCS",
            affiliations: ["BSCS"],
          },
        ],
        total: 1,
      },
    });
    const assignment = createAssignment();

    render(
      <EditCourseAssignmentDialog
        open
        onOpenChange={vi.fn()}
        assignment={assignment}
        availableCourses={mockCourses}
        availablePrograms={mockPrograms}
      />
    );

    const facultyInput = screen.getByLabelText("Faculty");
    const facultyTrigger = facultyInput
      .closest('[data-slot="input-group"]')
      ?.querySelector("button");
    if (!facultyTrigger) throw new Error("Faculty combobox trigger not found");
    fireEvent.click(facultyTrigger);
    fireEvent.change(facultyInput, { target: { value: "Elena" } });

    await waitFor(() => {
      expect(screen.getByRole("option", { name: /Elena Torres/i })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("option", { name: /Elena Torres/i }));
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(updateCourseAssignmentAction).toHaveBeenCalledWith({
        assignmentId: assignment.id,
        facultyId: "faculty-2",
      });
    });
  });

  it("disables save when no changes have been made", () => {
    render(
      <EditCourseAssignmentDialog
        open
        onOpenChange={vi.fn()}
        assignment={createAssignment()}
        availableCourses={mockCourses}
        availablePrograms={mockPrograms}
      />
    );

    expect(screen.getByRole("button", { name: /save changes/i })).toBeDisabled();
  });

  it("resets unsaved class identity edits when reopened for the same assignment", async () => {
    const assignment = createAssignment();
    const onOpenChange = vi.fn();

    const { rerender } = render(
      <EditCourseAssignmentDialog
        open
        onOpenChange={onOpenChange}
        assignment={assignment}
        availableCourses={mockCourses}
        availablePrograms={mockPrograms}
      />
    );

    await openAndSelect(/year level/i, "3rd Year");
    expect(screen.getByRole("button", { name: /save changes/i })).toBeEnabled();

    rerender(
      <EditCourseAssignmentDialog
        open={false}
        onOpenChange={onOpenChange}
        assignment={assignment}
        availableCourses={mockCourses}
        availablePrograms={mockPrograms}
      />
    );

    rerender(
      <EditCourseAssignmentDialog
        open
        onOpenChange={onOpenChange}
        assignment={assignment}
        availableCourses={mockCourses}
        availablePrograms={mockPrograms}
      />
    );

    expect(screen.getByRole("button", { name: /save changes/i })).toBeDisabled();
    expect(screen.getByText(/course default: 2nd year/i)).toBeInTheDocument();
  });

  it("shows an error toast when update fails", async () => {
    vi.mocked(updateCourseAssignmentAction).mockResolvedValue({
      success: false,
      error: "Update failed",
    });

    render(
      <EditCourseAssignmentDialog
        open
        onOpenChange={vi.fn()}
        assignment={createAssignment()}
        availableCourses={mockCourses}
        availablePrograms={mockPrograms}
      />
    );

    await openAndSelect(/year level/i, "3rd Year");

    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(toastMessages.some((t) => t.kind === "error" && t.message === "Update failed")).toBe(
        true
      );
    });
  });
});
