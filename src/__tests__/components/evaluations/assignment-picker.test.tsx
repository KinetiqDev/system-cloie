import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { YearLevel } from "@prisma/client";

import { AssignmentPicker, type AssignmentOption } from "@/features/evaluations/components/assignment-picker";

const assignments: AssignmentOption[] = [
  {
    id: "assignment-1",
    courseId: "course-1",
    courseCode: "CS101",
    courseTitle: "Intro to Computing",
    programId: "program-1",
    programCode: "BSCS",
    yearLevel: YearLevel.FIRST_YEAR,
    section: "MORNING",
    termInstanceId: "term-1",
    termInstanceLabel: "2025-2026 — 1st Semester — 1st Term",
    isActive: true,
  },
  {
    id: "assignment-2",
    courseId: "course-2",
    courseCode: "GE101",
    courseTitle: "General Education",
    programId: "program-2",
    programCode: "GENED",
    yearLevel: YearLevel.SECOND_YEAR,
    section: null,
    termInstanceId: "term-1",
    termInstanceLabel: "2025-2026 — 1st Semester — 1st Term",
    isActive: true,
  },
];

describe("AssignmentPicker", () => {
  it("renders the label and sorts assignments by course code", () => {
    render(<AssignmentPicker assignments={assignments} value={null} onChange={vi.fn()} />);

    expect(screen.getByRole("combobox", { name: "Class Assignment" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("combobox", { name: "Class Assignment" }));
    const options = screen.getAllByRole("option");
    expect(options.map((o) => o.textContent)).toEqual(
      expect.arrayContaining([expect.stringContaining("CS101"), expect.stringContaining("GE101")])
    );
  });

  it("reports an assignment through onChange when selected", () => {
    const onChange = vi.fn();
    render(<AssignmentPicker assignments={assignments} value={null} onChange={onChange} />);

    fireEvent.click(screen.getByRole("combobox", { name: "Class Assignment" }));
    const option = screen.getByRole("option", { name: /CS101/ });
    fireEvent.mouseMove(option);
    fireEvent.click(option);

    expect(onChange).toHaveBeenCalledWith("assignment-1");
  });

  it("disables the picker when no active assignments are available", () => {
    render(<AssignmentPicker assignments={[]} value={null} onChange={vi.fn()} />);

    expect(screen.getByRole("combobox", { name: "Class Assignment" })).toBeDisabled();
  });
});
