import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { editDataActionMock, updateActionMock, showToastMock, refreshMock } = vi.hoisted(() => ({
  editDataActionMock: vi.fn(),
  updateActionMock: vi.fn(),
  showToastMock: vi.fn(),
  refreshMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock, push: vi.fn(), replace: vi.fn() }),
}));
vi.mock("@/lib/actions/management-foundation-actions", () => ({
  getCourseEditDataAction: editDataActionMock,
  updateCourseAction: updateActionMock,
}));
vi.mock("@/components/ui/toast", () => ({
  showToast: showToastMock,
}));

import { CourseEditDialog } from "@/features/academic-structure/components/course-edit-dialog";
import type { ManagementCourseSummaryItem } from "@/features/academic-structure/services/list-management-courses-summary";

const course: ManagementCourseSummaryItem = {
  id: "course-1",
  code: "GE101",
  title: "Introduction to General Education",
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
};

describe("CourseEditDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    editDataActionMock.mockResolvedValue({
      course: {
        id: "course-1",
        code: "GE101",
        title: "Introduction to General Education",
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
    });
  });

  it("emits exactly one success toast naming the course on a saved edit", async () => {
    updateActionMock.mockResolvedValue({ success: true });
    const onOpenChange = vi.fn();
    render(<CourseEditDialog open onOpenChange={onOpenChange} course={course} />);

    await screen.findByLabelText("Course Title");
    fireEvent.click(screen.getByRole("button", { name: "Update Course" }));

    await waitFor(() => expect(updateActionMock).toHaveBeenCalled());
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(showToastMock).toHaveBeenCalledTimes(1);
    expect(showToastMock).toHaveBeenCalledWith("Course GE101 updated.", "success");
  });
});
