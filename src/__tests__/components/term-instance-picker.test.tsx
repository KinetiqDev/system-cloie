import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TermInstancePicker } from "@/features/academic-calendar/components/term-instance-picker";

describe("TermInstancePicker", () => {
  it("keeps multiple picker labels associated with distinct controls", () => {
    render(
      <>
        <TermInstancePicker termInstances={[]} value="" onChange={vi.fn()} id="filter-period" />
        <TermInstancePicker termInstances={[]} value="" onChange={vi.fn()} id="dialog-period" />
      </>
    );

    const controls = screen.getAllByRole("combobox");
    expect(controls).toHaveLength(2);
    expect(controls[0]).toHaveAttribute("id", "filter-period");
    expect(controls[1]).toHaveAttribute("id", "dialog-period");
    expect(screen.getAllByLabelText("Academic Period")[0]).toHaveAttribute("id", "filter-period");
  });
});
