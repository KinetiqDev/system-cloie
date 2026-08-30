import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { createCourseActionMock, showToastMock, refreshMock } = vi.hoisted(() => ({
  createCourseActionMock: vi.fn(),
  showToastMock: vi.fn(),
  refreshMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock, push: vi.fn(), replace: vi.fn() }),
}));
vi.mock("@/lib/actions/management-foundation-actions", () => ({
  createCourseAction: createCourseActionMock,
}));
vi.mock("@/components/ui/toast", () => ({
  showToast: showToastMock,
}));

import { CourseCreateDialog } from "@/features/academic-structure/components/course-create-dialog";
import type { ProgramFilterOption } from "@/features/academic-structure/services/list-management-courses-summary";

const programs: ProgramFilterOption[] = [
  {
    id: "prog-1",
    code: "BSIT",
    name: "Bachelor of Science in Information Technology",
    majors: [{ id: "maj-1", name: "Computer Science" }],
  },
  {
    id: "prog-2",
    code: "BSED",
    name: "Bachelor of Secondary Education",
    majors: [],
  },
];

function renderDialog() {
  const onOpenChange = vi.fn();
  render(<CourseCreateDialog open onOpenChange={onOpenChange} programs={programs} />);
  return onOpenChange;
}

async function fillRequiredFields() {
  fireEvent.change(screen.getByLabelText("Course Code"), { target: { value: "GE9" } });
  fireEvent.change(screen.getByLabelText("Course Title"), { target: { value: "Ethics" } });
}

describe("CourseCreateDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a course from the footer button, toasts success, closes, and refreshes", async () => {
    createCourseActionMock.mockResolvedValue({ success: true });
    const onOpenChange = renderDialog();

    await fillRequiredFields();
    fireEvent.click(screen.getByRole("button", { name: "Create Course" }));

    await waitFor(() => expect(createCourseActionMock).toHaveBeenCalled());
    const formData = createCourseActionMock.mock.calls[0]?.[0] as FormData;
    expect(formData.get("code")).toBe("GE9");
    expect(formData.get("title")).toBe("Ethics");
    expect(formData.get("course_scope")).toBe("PROGRAM_SPECIFIC");
    await waitFor(() =>
      expect(showToastMock).toHaveBeenCalledWith("Course GE9 created.", "success")
    );
    expect(showToastMock).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(refreshMock).toHaveBeenCalled();
  });

  it("locks dismissal while a create is in flight", async () => {
    const { promise } = Promise.withResolvers<{ success: boolean }>();
    createCourseActionMock.mockReturnValue(promise);
    const onOpenChange = renderDialog();

    await fillRequiredFields();
    fireEvent.click(screen.getByRole("button", { name: "Create Course" }));

    const cancel = screen.getByRole("button", { name: "Cancel" });
    await waitFor(() => expect(cancel).toBeDisabled());
    fireEvent.click(cancel);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("flattens nested majors with their parent program for the Major select", async () => {
    createCourseActionMock.mockResolvedValue({ success: true });
    renderDialog();

    fireEvent.click(screen.getByLabelText("Program"));
    const programOption = await screen.findByRole("option", { name: /BSIT/ });
    fireEvent.focus(programOption);
    fireEvent.keyDown(programOption, { key: "Enter" });
    fireEvent.keyUp(programOption, { key: "Enter" });

    fireEvent.click(screen.getByLabelText("Major"));
    const majorOption = await screen.findByRole("option", { name: "BSIT - Computer Science" });
    expect(majorOption).toBeInTheDocument();
  });

  it("toasts the server error and keeps the dialog open when the create fails", async () => {
    createCourseActionMock.mockResolvedValue({
      success: false,
      error: 'A course with code "GE9" already exists.',
    });
    const onOpenChange = renderDialog();

    await fillRequiredFields();
    fireEvent.click(screen.getByRole("button", { name: "Create Course" }));

    await waitFor(() =>
      expect(showToastMock).toHaveBeenCalledWith(
        'A course with code "GE9" already exists.',
        "error"
      )
    );
    expect(screen.getByText('A course with code "GE9" already exists.')).toBeInTheDocument();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
    expect(refreshMock).not.toHaveBeenCalled();
  });

  it("toasts a recovery message when the action throws", async () => {
    createCourseActionMock.mockRejectedValue(new Error("database connection details"));
    const onOpenChange = renderDialog();

    await fillRequiredFields();
    fireEvent.click(screen.getByRole("button", { name: "Create Course" }));

    await waitFor(() =>
      expect(showToastMock).toHaveBeenCalledWith(
        "Something went wrong while saving the course. Please try again.",
        "error"
      )
    );
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });

  it("closes from Cancel without calling the action", () => {
    const onOpenChange = renderDialog();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(createCourseActionMock).not.toHaveBeenCalled();
  });
});
