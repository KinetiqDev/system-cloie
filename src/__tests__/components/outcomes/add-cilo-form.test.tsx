import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

import { AddCiloForm } from "@/app/(app)/faculty/cilos/new/add-cilo-form";
import type { FacultyCourseWithCiloCount } from "@/features/evaluations/services/list-faculty-courses-with-cilos";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

const addActionMock = vi.fn<
  (
    courseId: string,
    descriptions: string[]
  ) => Promise<{ success: boolean; error?: string }>
>();

const courses: FacultyCourseWithCiloCount[] = [
  {
    id: "course-1",
    code: "CS101",
    title: "Intro to Computing",
    description: null,
    courseScope: "PROGRAM_SPECIFIC" as const,
    courseScopeLabel: "Program-Specific",
    programId: "program-1",
    programCode: "BSCS",
    programName: "BS Computer Science",
    majorId: null,
    majorName: null,
    ciloCount: 0,
  },
  {
    id: "course-2",
    code: "GE101",
    title: "General Education",
    description: null,
    courseScope: "GENERAL_EDUCATION" as const,
    courseScopeLabel: "General Education",
    programId: null,
    programCode: null,
    programName: null,
    majorId: null,
    majorName: null,
    ciloCount: 0,
  },
];

const programs = [{ id: "program-1", code: "BSCS", name: "BS Computer Science" }];

function renderForm() {
  return render(<AddCiloForm courses={courses} programs={programs} addAction={addActionMock} />);
}

describe("AddCiloForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    addActionMock.mockResolvedValue({ success: true });
  });

  it("adds and removes CILO entries before saving", () => {
    renderForm();

    const input = screen.getByLabelText("CILO Description");
    fireEvent.change(input, { target: { value: "Design instruction" } });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));

    expect(screen.getByText("CILOs to Add (1)")).toBeInTheDocument();
    expect(screen.getByText("Design instruction")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Remove CILO 1" }));

    expect(screen.queryByText("CILOs to Add (1)")).not.toBeInTheDocument();
  });

  it("shows both field errors on empty save and clears them when corrected", () => {
    renderForm();

    fireEvent.click(screen.getByRole("button", { name: "Save CILOs" }));

    const alerts = screen.getAllByRole("alert");
    expect(alerts.map((a) => a.textContent)).toEqual(
      expect.arrayContaining(["Please select a course.", "Please add at least one CILO."])
    );
    const ciloInput = screen.getByLabelText("CILO Description");
    expect(ciloInput).toHaveAttribute("aria-invalid", "true");
    expect(ciloInput).toHaveAttribute("aria-describedby", "cilo-cilos-error");

    fireEvent.change(ciloInput, { target: { value: "Design instruction" } });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    expect(screen.queryByText("Please add at least one CILO.")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("combobox", { name: "Course" }));
    fireEvent.mouseMove(screen.getByRole("option", { name: /CS101/ }));
    fireEvent.click(screen.getByRole("option", { name: /CS101/ }));
    expect(screen.queryByText("Please select a course.")).not.toBeInTheDocument();
  });

  it("rejects saving without a selected course", () => {
    renderForm();

    fireEvent.change(screen.getByLabelText("CILO Description"), {
      target: { value: "Design instruction" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    fireEvent.click(screen.getByRole("button", { name: "Save CILOs" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Please select a course.");
    const course = screen.getByRole("combobox", { name: "Course" });
    expect(course).toHaveAttribute("aria-invalid", "true");
    expect(course).toHaveAttribute("aria-describedby", "cilo-course-error");
    expect(addActionMock).not.toHaveBeenCalled();
  });

  it("saves the selected course and CILO list and shows confirmation", async () => {
    renderForm();

    fireEvent.change(screen.getByLabelText("CILO Description"), {
      target: { value: "Design instruction" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    fireEvent.change(screen.getByLabelText("CILO Description"), {
      target: { value: "Assess learning" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));

    fireEvent.click(screen.getByRole("combobox", { name: "Course" }));
    const courseOption = await screen.findByRole("option", { name: /CS101/ });
    fireEvent.mouseMove(courseOption);
    fireEvent.click(courseOption);

    fireEvent.click(screen.getByRole("button", { name: "Save CILOs" }));

    await waitFor(() =>
      expect(addActionMock).toHaveBeenCalledWith("course-1", [
        "Design instruction",
        "Assess learning",
      ])
    );
    expect(await screen.findByRole("alert")).toHaveTextContent("CILOs added successfully!");
  });

  it("surfaces a failed save without resetting the list", async () => {
    addActionMock.mockResolvedValue({ success: false, error: "Failed to save CILOs." });
    renderForm();

    fireEvent.change(screen.getByLabelText("CILO Description"), {
      target: { value: "Design instruction" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));

    fireEvent.click(screen.getByRole("combobox", { name: "Course" }));
    const courseOption = await screen.findByRole("option", { name: /CS101/ });
    fireEvent.mouseMove(courseOption);
    fireEvent.click(courseOption);

    fireEvent.click(screen.getByRole("button", { name: "Save CILOs" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Failed to save CILOs.");
    expect(screen.getByText("CILOs to Add (1)")).toBeInTheDocument();
  });
});
