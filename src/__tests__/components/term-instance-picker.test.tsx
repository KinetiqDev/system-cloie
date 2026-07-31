import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TermInstancePicker } from "@/features/academic-calendar/components/term-instance-picker";

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
});
