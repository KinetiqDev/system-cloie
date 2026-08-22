import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

import { AddCiloForm } from "@/app/(app)/faculty/cilos/new/add-cilo-form";
import type { FacultyCourseWithCiloCount } from "@/features/evaluations/services/list-faculty-courses-with-cilos";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

const saveActionMock = vi.fn<
  (courseId: string, cilos: Array<{ id?: string; description: string }>) => Promise<{ success: boolean; error?: string }>
>();
const loadCilosActionMock = vi.fn<
  (courseId: string) => Promise<{
    success: boolean;
    cilos?: Array<{ id: string; description: string }>;
    error?: string;
  }>
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

function renderForm() {
  return render(
    <AddCiloForm courses={courses} saveAction={saveActionMock} loadCilosAction={loadCilosActionMock} />
  );
}

async function selectCourse(query: string) {
  const input = screen.getByRole("combobox", { name: "Course" });
  fireEvent.change(input, { target: { value: query } });
  fireEvent.keyDown(input, { key: "ArrowDown" });
  const option = await screen.findByRole("option", { name: new RegExp(query) });
  fireEvent.click(option);
}

describe("AddCiloForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    saveActionMock.mockResolvedValue({ success: true });
    loadCilosActionMock.mockResolvedValue({ success: true, cilos: [] });
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

  it("shows both field errors on empty save and clears them when corrected", async () => {
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

    await selectCourse("CS101");
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
    expect(saveActionMock).not.toHaveBeenCalled();
  });

  it("saves to the selected course and links to its alignment workspace", async () => {
    renderForm();

    fireEvent.change(screen.getByLabelText("CILO Description"), {
      target: { value: "Design instruction" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));

    await selectCourse("CS101");

    fireEvent.click(screen.getByRole("button", { name: "Save CILOs" }));

    await waitFor(() =>
      expect(saveActionMock).toHaveBeenCalledWith("course-1", [
        { description: "Design instruction" },
      ])
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "1 CILO saved to CS101."
    );
    // Course stays selected so faculty can keep adding to the same course.
    expect(screen.getByRole("combobox", { name: "Course" })).toHaveValue("CS101 — Intro to Computing");

    const mapLink = screen.getAllByRole("link", { name: /Map CILOs to PLOs/ });
    expect(mapLink.length).toBeGreaterThan(0);
    for (const link of mapLink) {
      expect(link).toHaveAttribute("href", "/faculty/cilos/course-1/alignment");
    }
  });

  it("names Institutional Learning Outcomes as the mapping target for General Education courses", async () => {
    renderForm();
    await selectCourse("GE101");

    expect(screen.getAllByRole("link", { name: /Map CILOs to ILOs/ }).length).toBeGreaterThan(0);
    expect(screen.getByText(/Aligns to Institutional Learning Outcomes/)).toBeInTheDocument();
  });

  it("surfaces a failed save without resetting the list", async () => {
    saveActionMock.mockResolvedValue({ success: false, error: "Failed to save CILOs." });
    renderForm();

    fireEvent.change(screen.getByLabelText("CILO Description"), {
      target: { value: "Design instruction" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    await selectCourse("CS101");

    fireEvent.click(screen.getByRole("button", { name: "Save CILOs" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Failed to save CILOs.");
    expect(screen.getByText("CILOs to Add (1)")).toBeInTheDocument();
  });

  it("lets faculty edit and remove existing CILOs before saving", async () => {
    loadCilosActionMock.mockResolvedValue({
      success: true,
      cilos: [
        { id: "cilo-1", description: "Apply core computing concepts" },
        { id: "cilo-2", description: "Build maintainable software" },
      ],
    });
    renderForm();

    await selectCourse("CS101");
    await screen.findByText("Existing CILOs (2)");

    fireEvent.change(screen.getByDisplayValue("Apply core computing concepts"), {
      target: { value: "Apply core computing concepts critically" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Remove CILO 2" }));
    expect(screen.queryByDisplayValue("Build maintainable software")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("CILO Description"), {
      target: { value: "Design instruction" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    fireEvent.click(screen.getByRole("button", { name: "Save CILOs" }));

    await waitFor(() =>
      expect(saveActionMock).toHaveBeenCalledWith("course-1", [
        { id: "cilo-1", description: "Apply core computing concepts critically" },
        { description: "Design instruction" },
      ])
    );
  });

  it("loads and shows existing CILOs for the selected course", async () => {
    loadCilosActionMock.mockResolvedValue({
      success: true,
      cilos: [
        { id: "cilo-1", description: "Apply core computing concepts" },
        { id: "cilo-2", description: "Build maintainable software" },
      ],
    });
    renderForm();

    await selectCourse("CS101");

    await waitFor(() => expect(loadCilosActionMock).toHaveBeenCalledWith("course-1"));
    expect(screen.getByText("Existing CILOs (2)")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Apply core computing concepts")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Build maintainable software")).toBeInTheDocument();
  });
});
