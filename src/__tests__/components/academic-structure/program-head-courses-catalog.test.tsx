import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { createActionMock, updateActionMock, toggleActionMock } = vi.hoisted(() => ({
  createActionMock: vi.fn(),
  updateActionMock: vi.fn(),
  toggleActionMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/lib/actions/program-head-course-actions", () => ({
  createProgramHeadCourseAction: createActionMock,
  updateProgramHeadCourseAction: updateActionMock,
  toggleProgramHeadCourseActiveAction: toggleActionMock,
}));
vi.mock("@/features/academic-calendar/components/term-instance-picker", () => ({
  TermInstancePicker: () => null,
}));

describe("Program Head Courses catalog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("keeps the selected Program as the form authority input", async () => {
    const { ProgramHeadCoursesCatalog } = await import(
      "@/features/academic-structure/components/program-head-courses-catalog"
    );
    const programId = "11111111-1111-4111-8111-111111111111";
    createActionMock.mockResolvedValue({ success: true });

    render(
      <ProgramHeadCoursesCatalog
        program={{ id: programId, code: "BSED", name: "Secondary Education" }}
        courses={[]}
        summary={{ total: 0, programWide: 0, majorSpecific: 0, generalEducation: 0, archived: 0 }}
        majors={[]}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Add Course" }));
    fireEvent.change(screen.getByLabelText("Course Code"), { target: { value: "BSED-101" } });
    fireEvent.change(screen.getByLabelText("Course Title"), { target: { value: "Foundations" } });
    fireEvent.click(screen.getByRole("button", { name: "Create Course" }));

    await waitFor(() => expect(createActionMock).toHaveBeenCalled());
    const formData = createActionMock.mock.calls[0]?.[0] as FormData;
    expect(formData.get("programId")).toBe(programId);
    expect(screen.getByText("Secondary Education")).toBeInTheDocument();
  });

  it("requires a major before submitting a Major-Specific Course", async () => {
    const { ProgramHeadCoursesCatalog } = await import(
      "@/features/academic-structure/components/program-head-courses-catalog"
    );
    createActionMock.mockResolvedValue({ success: true });

    render(
      <ProgramHeadCoursesCatalog
        program={{ id: "11111111-1111-4111-8111-111111111111", code: "BSED", name: "Secondary Education" }}
        courses={[]}
        summary={{ total: 0, programWide: 0, majorSpecific: 0, generalEducation: 0, archived: 0 }}
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
    fireEvent.click(screen.getByLabelText("Course Scope"));
    const majorSpecific = await screen.findByRole("option", { name: "Major-Specific" });
    fireEvent.focus(majorSpecific);
    fireEvent.keyDown(majorSpecific, { key: "Enter" });
    fireEvent.keyUp(majorSpecific, { key: "Enter" });
    fireEvent.change(screen.getByLabelText("Course Code"), { target: { value: "BSED-101" } });
    fireEvent.change(screen.getByLabelText("Course Title"), { target: { value: "Foundations" } });
    fireEvent.click(screen.getByRole("button", { name: "Create Course" }));

    expect(await screen.findByText("Select a major for a major-specific course.")).toBeInTheDocument();
    expect(createActionMock).not.toHaveBeenCalled();
  });
});
