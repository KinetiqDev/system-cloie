import { render, screen, fireEvent, waitFor, within, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { YearLevel, StudentSection, CourseScope } from "@prisma/client";
import type { ComponentProps } from "react";

import { CourseAssignmentsTable } from "@/features/course-assignments/components/course-assignments-table";
import {
  activateCourseAssignmentAction,
  deactivateCourseAssignmentAction,
  deleteCourseAssignmentAction,
} from "@/lib/actions/course-assignment-actions";

vi.mock("@/lib/actions/course-assignment-actions", () => ({
  activateCourseAssignmentAction: vi.fn(),
  deactivateCourseAssignmentAction: vi.fn(),
  deleteCourseAssignmentAction: vi.fn(),
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

describe("CourseAssignmentsTable", () => {
  let toastMessages: Array<{ kind: string; message: string }> = [];
  const toastListener = ((event: Event) => {
    const detail = (event as CustomEvent).detail;
    toastMessages.push({ kind: detail.kind, message: detail.message });
  }) as EventListener;

  beforeEach(() => {
    toastMessages = [];
    window.addEventListener("cloie-toast", toastListener);
  });

  afterEach(() => {
    window.removeEventListener("cloie-toast", toastListener);
    vi.restoreAllMocks();
  });

  function renderTable(props: Partial<ComponentProps<typeof CourseAssignmentsTable>> = {}) {
    const assignments = props.assignments ?? [createAssignment()];
    return render(
      <CourseAssignmentsTable
        assignments={assignments}
        total={assignments.length}
        page={0}
        onPageChange={vi.fn()}
        onAssignmentUpdated={vi.fn()}
        onAssignFaculty={vi.fn()}
        {...props}
      />
    );
  }

  function openRowActions(courseCode = "CS101") {
    fireEvent.click(screen.getByLabelText(`Open actions for ${courseCode}`));
  }

  it("labels row action trigger for screen readers", () => {
    renderTable();
    expect(screen.getByLabelText(/open actions for CS101/i)).toBeInTheDocument();
  });

  it("labels pagination previous/next buttons", () => {
    renderTable({ total: 25, pageSize: 10, page: 1 });
    expect(screen.getByLabelText(/previous page/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/next page/i)).toBeInTheDocument();
  });

  it("does not render a no-op Edit menu item", () => {
    renderTable();
    openRowActions();

    expect(screen.queryByRole("menuitem", { name: /edit/i })).not.toBeInTheDocument();
  });

  it("opens an AlertDialog with assignment details when deactivating", async () => {
    vi.mocked(deactivateCourseAssignmentAction).mockResolvedValue({ success: true });
    const onUpdated = vi.fn();
    const assignment = createAssignment();

    renderTable({ assignments: [assignment], onAssignmentUpdated: onUpdated });
    openRowActions();

    fireEvent.click(screen.getByRole("menuitem", { name: /deactivate/i }));

    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByRole("heading", { name: /Deactivate Assignment\?/i })).toBeInTheDocument();
    expect(dialog).toHaveTextContent(/you can reactivate it later/i);
    expect(dialog).toHaveTextContent(/CS101 - Intro to Computing/);
    expect(dialog).toHaveTextContent(/Test Faculty/);
    expect(dialog).toHaveTextContent(/2025-2026 — 1st Semester — 1st Term/);

    fireEvent.click(within(dialog).getByRole("button", { name: /deactivate/i }));

    await waitFor(() => {
      expect(deactivateCourseAssignmentAction).toHaveBeenCalledWith({ assignmentId: assignment.id });
    });
    expect(onUpdated).toHaveBeenCalled();
  });

  it("opens an AlertDialog with permanent-deletion warning when deleting", async () => {
    vi.mocked(deleteCourseAssignmentAction).mockResolvedValue({ success: true });
    const onUpdated = vi.fn();
    const assignment = createAssignment();

    renderTable({ assignments: [assignment], onAssignmentUpdated: onUpdated });
    openRowActions();

    fireEvent.click(screen.getByRole("menuitem", { name: /delete/i }));

    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByRole("heading", { name: /Delete Assignment\?/i })).toBeInTheDocument();
    expect(dialog).toHaveTextContent(/permanently delete/);
    expect(dialog).toHaveTextContent(/cannot be undone/);

    fireEvent.click(within(dialog).getByRole("button", { name: /^Delete$/i }));

    await waitFor(() => {
      expect(deleteCourseAssignmentAction).toHaveBeenCalledWith({ assignmentId: assignment.id });
    });
    expect(onUpdated).toHaveBeenCalled();
  });

  it("activates an inactive assignment directly without opening a confirmation dialog", async () => {
    vi.mocked(activateCourseAssignmentAction).mockResolvedValue({ success: true });
    const onUpdated = vi.fn();
    const assignment = createAssignment({ id: "inactive-1", isActive: false });

    renderTable({ assignments: [assignment], onAssignmentUpdated: onUpdated });
    openRowActions();

    fireEvent.click(screen.getByRole("menuitem", { name: /activate/i }));

    await waitFor(() => {
      expect(activateCourseAssignmentAction).toHaveBeenCalledWith({ assignmentId: assignment.id });
    });
    expect(onUpdated).toHaveBeenCalled();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("disables destructive menu items while the action is processing", async () => {
    let resolveDelete: (value: { success: true }) => void = () => {};
    vi.mocked(deleteCourseAssignmentAction).mockImplementation(
      () => new Promise((resolve) => {
        resolveDelete = resolve;
      })
    );

    renderTable();
    openRowActions();
    fireEvent.click(screen.getByRole("menuitem", { name: /delete/i }));

    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: /^Delete$/i }));

    await waitFor(() => {
      expect(deleteCourseAssignmentAction).toHaveBeenCalled();
    });

    // Re-open the same row actions while delete is still pending.
    openRowActions();
    const deleteItem = screen.getByRole("menuitem", { name: /delete/i });
    expect(deleteItem).toHaveAttribute("data-disabled");

    await act(async () => {
      resolveDelete({ success: true });
    });
  });

  it("keeps another row's confirm dialog enabled while a different row is processing", async () => {
    let resolveDelete: (value: { success: true }) => void = () => {};
    vi.mocked(deleteCourseAssignmentAction).mockImplementation(
      () => new Promise((resolve) => {
        resolveDelete = resolve;
      })
    );

    renderTable({
      assignments: [
        createAssignment({ id: "assignment-1", courseCode: "CS101" }),
        createAssignment({ id: "assignment-2", courseCode: "CS102" }),
      ],
    });

    openRowActions("CS101");
    fireEvent.click(screen.getByRole("menuitem", { name: /delete/i }));
    fireEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: /^Delete$/i }));

    await waitFor(() => {
      expect(deleteCourseAssignmentAction).toHaveBeenCalledWith({ assignmentId: "assignment-1" });
    });

    openRowActions("CS102");
    fireEvent.click(screen.getByRole("menuitem", { name: /delete/i }));

    const secondDialog = await screen.findByRole("alertdialog");
    expect(within(secondDialog).getByRole("button", { name: /cancel/i })).toBeEnabled();
    expect(within(secondDialog).getByRole("button", { name: /^Delete$/i })).toBeEnabled();

    await act(async () => {
      resolveDelete({ success: true });
    });
  });

  it("renders a helpful empty state with a single Assign Faculty action", () => {
    const onAssign = vi.fn();

    renderTable({ assignments: [], total: 0, onAssignFaculty: onAssign });

    expect(screen.getByTestId("empty-state")).toHaveTextContent(/no course assignments found/i);
    expect(screen.getByText(/assign faculty to a Program-specific Course/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /assign faculty/i }));
    expect(onAssign).toHaveBeenCalled();

    expect(screen.queryByRole("button", { name: /create merged class/i })).not.toBeInTheDocument();
  });

  it("renders General Education rows as read-only in program-head mode without management actions", () => {
    const geAssignment = createAssignment({
      id: "ge-1",
      courseCode: "GE101",
      courseTitle: "General Education",
      courseScope: CourseScope.GENERAL_EDUCATION,
    });

    renderTable({ assignments: [geAssignment] });

    expect(screen.getByText("GE")).toBeInTheDocument();
    expect(screen.getByText(/managed by secretary\/dean/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/open actions for GE101/i)).not.toBeInTheDocument();
  });

  it("renders Secretary-mode empty-state copy", () => {
    const onAssign = vi.fn();

    renderTable({ assignments: [], total: 0, mode: "secretary", onAssignFaculty: onAssign });

    expect(screen.getByTestId("empty-state")).toHaveTextContent(/assign faculty to a course across any program/i);
  });

  it("allows General Education row actions in secretary mode", () => {
    const geAssignment = createAssignment({
      id: "ge-1",
      courseCode: "GE101",
      courseTitle: "General Education",
      courseScope: CourseScope.GENERAL_EDUCATION,
    });

    renderTable({ assignments: [geAssignment], mode: "secretary" });

    expect(screen.getByText("GE")).toBeInTheDocument();
    expect(screen.queryByText(/managed by secretary\/dean/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/open actions for GE101/i)).toBeInTheDocument();
  });

  it("shows the Edit action in secretary mode and opens the edit dialog", async () => {
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
    ];

    const assignment = createAssignment();
    renderTable({
      assignments: [assignment],
      mode: "secretary",
      availableCourses: mockCourses,
      availablePrograms: mockPrograms,
    });
    openRowActions();

    fireEvent.click(screen.getByRole("menuitem", { name: /edit/i }));

    const dialog = await screen.findByRole("dialog", { name: /edit class identity/i });
    expect(dialog).toHaveTextContent(/CS101 — Intro to Computing/i);
    expect(dialog).toHaveTextContent(/Test Faculty/i);
    expect(dialog).toHaveTextContent(/BSCS/i);
    expect(dialog).toHaveTextContent(/2nd Year/i);
  });

  it("does not reset the current page when an assignment is deleted", async () => {
    vi.mocked(deleteCourseAssignmentAction).mockResolvedValue({ success: true });
    const onPageChange = vi.fn();

    renderTable({ total: 25, pageSize: 10, page: 1, onPageChange });
    openRowActions();
    fireEvent.click(screen.getByRole("menuitem", { name: /delete/i }));

    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: /^Delete$/i }));

    await waitFor(() => {
      expect(deleteCourseAssignmentAction).toHaveBeenCalled();
    });
    expect(onPageChange).not.toHaveBeenCalled();
  });
});
