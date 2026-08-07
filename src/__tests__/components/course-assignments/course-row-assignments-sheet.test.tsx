import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { CourseScope, StudentSection, YearLevel } from "@prisma/client";

import { CourseRowAssignmentsSheet } from "@/features/course-assignments/components/course-row-assignments-sheet";
import { loadCourseAssignmentsForSheetAction } from "@/lib/actions/course-assignment-actions";
import type { CourseAssignmentItem } from "@/features/course-assignments/types";

vi.mock("@/lib/actions/course-assignment-actions", () => ({
  loadCourseAssignmentsForSheetAction: vi.fn(),
  createCourseAssignmentAction: vi.fn(),
}));

const assignment: CourseAssignmentItem = {
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
};

const termInstances = [{ id: "term-1" }] as never;

function renderSheet(
  props: Partial<Parameters<typeof CourseRowAssignmentsSheet>[0]> = {}
) {
  render(
    <CourseRowAssignmentsSheet
      courseId="course-1"
      courseCode="CS101"
      courseTitle="Intro to Computing"
      termInstanceId="term-1"
      termInstances={termInstances}
      availablePrograms={[{ id: "program-1", code: "BSCS", name: "BS Computer Science" }]}
      availableCourses={[]}
      triggerRender={<button type="button">Open assignments</button>}
      {...props}
    />
  );
  return {
    open: () => fireEvent.click(screen.getByRole("button", { name: /open assignments/i })),
  };
}

describe("CourseRowAssignmentsSheet", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists the course assignments for the selected term", async () => {
    vi.mocked(loadCourseAssignmentsForSheetAction).mockResolvedValue({
      success: true,
      data: { items: [assignment], total: 1, page: 0, pageSize: 20 },
    });

    const { open } = renderSheet();
    open();

    const dialog = await screen.findByRole("dialog", { name: /cs101 — intro to computing/i });
    expect(dialog).toHaveTextContent(/test faculty/i);
    expect(dialog).toHaveTextContent(/bscs/i);
    expect(loadCourseAssignmentsForSheetAction).toHaveBeenCalledWith({
      termInstanceId: "term-1",
      courseId: "course-1",
    });
  });

  it("shows an empty state when no faculty are assigned", async () => {
    vi.mocked(loadCourseAssignmentsForSheetAction).mockResolvedValue({
      success: true,
      data: { items: [], total: 0, page: 0, pageSize: 20 },
    });

    const { open } = renderSheet();
    open();

    expect(await screen.findByText(/no faculty assigned yet for this course/i)).toBeInTheDocument();
  });

  it("prompts for a term when none is selected", () => {
    const { open } = renderSheet({ termInstanceId: null });
    open();

    expect(screen.getByText(/please select a term to view assignments/i)).toBeInTheDocument();
    expect(loadCourseAssignmentsForSheetAction).not.toHaveBeenCalled();
  });

  it("shows the loading state while assignments are fetched", async () => {
    let resolveLoad: (value: {
      success: true;
      data: { items: CourseAssignmentItem[]; total: number; page: number; pageSize: number };
    }) => void = () => {};
    vi.mocked(loadCourseAssignmentsForSheetAction).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveLoad = resolve;
        })
    );

    const { open } = renderSheet();
    open();

    expect(
      await screen.findByRole("status", { name: /loading course assignments/i })
    ).toBeInTheDocument();

    resolveLoad({ success: true, data: { items: [assignment], total: 1, page: 0, pageSize: 20 } });
    expect(await screen.findByText(/test faculty/i)).toBeInTheDocument();
  });

  it("marks General Education assignments as Secretary/Dean managed", async () => {
    vi.mocked(loadCourseAssignmentsForSheetAction).mockResolvedValue({
      success: true,
      data: { items: [assignment], total: 1, page: 0, pageSize: 20 },
    });

    const { open } = renderSheet({
      availableCourses: [
        {
          id: "course-1",
          code: "CS101",
          title: "Intro to Computing",
          course_scope: CourseScope.GENERAL_EDUCATION,
        },
      ] as never,
    });
    open();

    const dialog = await screen.findByRole("dialog", { name: /cs101 — intro to computing/i });
    expect(dialog).toHaveTextContent(/general education assignments are managed by secretary\/dean/i);
    expect(screen.queryByRole("button", { name: /assign faculty/i })).not.toBeInTheDocument();
  });
});
