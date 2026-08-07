import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  SemesterTermPicker,
  TermInstancePicker,
} from "@/features/academic-calendar/components/term-instance-picker";

describe("TermInstancePicker", () => {
  it("keeps multiple picker labels associated with distinct controls", () => {
    render(
      <>
        <TermInstancePicker termInstances={[]} value="" onChange={vi.fn()} id="filter-period" />
        <TermInstancePicker termInstances={[]} value="" onChange={vi.fn()} id="dialog-period" />
        <TermInstancePicker termInstances={[]} value="" onChange={vi.fn()} />
      </>
    );

    const controls = screen.getAllByRole("combobox");
    expect(controls).toHaveLength(3);
    expect(controls[0]).toHaveAttribute("id", "filter-period");
    expect(controls[1]).toHaveAttribute("id", "dialog-period");
    expect(controls[2]).toHaveAttribute("id", expect.stringContaining("term-instance-picker-"));

    const labeledControls = screen.getAllByLabelText("Academic Period");
    expect(labeledControls).toHaveLength(3);
    expect(labeledControls.map((control) => control.id)).toEqual([
      "filter-period",
      "dialog-period",
      controls[2].id,
    ]);
  });

  it("renders options for every term instance with an active marker on the active one", async () => {
    const termInstances = [
      {
        id: "ti-1",
        schoolYearId: "sy-1",
        schoolYearCode: "2025-2026",
        semester: "FIRST" as const,
        term: "FIRST_TERM" as const,
        startDate: null,
        endDate: null,
        status: "PLANNED" as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "ti-2",
        schoolYearId: "sy-1",
        schoolYearCode: "2025-2026",
        semester: "SECOND" as const,
        term: "FIRST_TERM" as const,
        startDate: null,
        endDate: null,
        status: "ACTIVE" as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    render(<TermInstancePicker termInstances={termInstances} value="" onChange={vi.fn()} />);

    const combobox = screen.getByRole("combobox");
    expect(combobox).toHaveAccessibleName("Academic Period");
    fireEvent.click(combobox);

    expect(await screen.findAllByRole("option")).toHaveLength(2);
    expect(screen.getByRole("option", { name: /2025-2026 — 1st Semester — 1st Term/ })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /Active/ })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /2025-2026 — 2nd Semester — 1st Term/ })).toHaveTextContent("Active");
  });
});

describe("SemesterTermPicker", () => {
  it("disables the term select and explains Summer has no terms", () => {
    const onChange = vi.fn();
    render(
      <SemesterTermPicker value={{ semester: "SUMMER", term: null }} onChange={onChange} />
    );

    expect(screen.getByLabelText("Semester")).toBeInTheDocument();
    const termCombobox = screen.getByLabelText("Term");
    expect(termCombobox).toBeDisabled();
    expect(screen.getByText(/summer semester has no terms/i)).toBeInTheDocument();
  });

  it("clears the term and notifies onChange when Summer is selected", async () => {
    const onChange = vi.fn();
    render(
      <SemesterTermPicker
        value={{ semester: "FIRST", term: "FIRST_TERM" }}
        onChange={onChange}
      />
    );

    fireEvent.click(screen.getByLabelText("Semester"));
    const summerOption = await screen.findByRole("option", { name: "Summer" });
    fireEvent.mouseMove(summerOption);
    fireEvent.click(summerOption);

    expect(onChange).toHaveBeenCalledWith({ semester: "SUMMER", term: null });
  });

  it("submits the selected semester and term", () => {
    const onChange = vi.fn();
    render(
      <SemesterTermPicker
        value={{ semester: "SECOND", term: "FIRST_TERM" }}
        onChange={onChange}
      />
    );

    expect(screen.getByText("2nd Semester")).toBeInTheDocument();
    expect(screen.getByText("1st Term")).toBeInTheDocument();
    expect(screen.queryByText(/summer semester has no terms/i)).not.toBeInTheDocument();
  });
});

