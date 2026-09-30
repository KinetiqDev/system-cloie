import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";

const programs = [
  { id: "beed", label: "BEED Bachelor of Elementary Education" },
  { id: "bsit", label: "BSIT Bachelor of Science in Information Technology" },
];

function ProgramPicker({ onValueChange = vi.fn(), disabled = false } = {}) {
  return (
    <Combobox
      items={programs}
      itemToStringLabel={(item) => item.label}
      onValueChange={onValueChange}
    >
      <ComboboxInput
        aria-label="Program"
        placeholder="Search programs"
        showClear
        disabled={disabled}
      />
      <ComboboxContent>
        <ComboboxEmpty>No programs found.</ComboboxEmpty>
        <ComboboxList>
          {(item: (typeof programs)[number]) => (
            <ComboboxItem key={item.id} value={item}>
              {item.label}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

describe("Combobox sizing and behavior", () => {
  it("uses standard option height with a touch floor and wrapping labels", async () => {
    render(<ProgramPicker />);
    fireEvent.click(screen.getByRole("button", { name: "Open options" }));
    const items = await screen.findAllByRole("option");
    for (const item of items) {
      expect(item).toHaveClass(
        "min-h-10",
        "py-2",
        "pointer-coarse:min-h-11",
        "whitespace-normal",
        "break-words"
      );
    }
    expect(document.querySelector('[data-slot="combobox-content"]')).toHaveClass(
      "max-w-(--available-width)",
      "*:data-[slot=input-group]:h-10",
      "pointer-coarse:*:data-[slot=input-group]:h-11"
    );
  });

  it("filters, selects object values, clears, and recovers from empty results", async () => {
    const onValueChange = vi.fn();
    render(<ProgramPicker onValueChange={onValueChange} />);
    const input = screen.getByRole("combobox", { name: "Program" });
    fireEvent.click(screen.getByRole("button", { name: "Open options" }));
    fireEvent.change(input, { target: { value: "Information" } });
    const option = await screen.findByRole("option", { name: programs[1].label });
    expect(screen.queryByRole("option", { name: programs[0].label })).not.toBeInTheDocument();
    fireEvent.click(option);
    await waitFor(() => expect(input).toHaveValue(programs[1].label));
    expect(onValueChange.mock.calls.at(-1)?.[0]).toEqual(programs[1]);
    fireEvent.click(screen.getByRole("button", { name: "Clear selection" }));
    await waitFor(() => expect(input).toHaveValue(""));
    expect(onValueChange.mock.calls.at(-1)?.[0]).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Open options" }));
    fireEvent.change(input, { target: { value: "no-such-program" } });
    await waitFor(() => expect(screen.queryAllByRole("option")).toHaveLength(0));
    expect(screen.getByText("No programs found.")).toBeVisible();
    fireEvent.change(input, { target: { value: "BEED" } });
    expect(await screen.findByRole("option", { name: programs[0].label })).toBeInTheDocument();
  });

  it("does not open a disabled picker", () => {
    render(<ProgramPicker disabled />);
    expect(screen.getByRole("combobox", { name: "Program" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Open options" })).toBeDisabled();
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });
});
