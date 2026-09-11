import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { YearPicker, type YearPickerProps } from "@/components/ui/year-picker";
import { ALUMNI_GRADUATION_YEAR_RANGES } from "@/lib/schemas/alumni-profile";

const MODERN_RANGE = [{ start: 2000, end: 2005 }];

function renderPicker(props: Partial<YearPickerProps> = {}): {
  onChange: ReturnType<typeof vi.fn>;
} {
  const onChange = vi.fn();
  render(
    <YearPicker
      id="graduation_year"
      ranges={MODERN_RANGE}
      value={2003}
      onChange={onChange}
      {...props}
    />
  );
  return { onChange };
}

async function openPicker(grid = "Year") {
  fireEvent.click(screen.getByRole("button", { name: /^\d{4}$|^Select/ }));
  return screen.findByRole("grid", { name: grid });
}

function yearButton(grid: HTMLElement, name: string) {
  return within(grid).getByRole("button", { name });
}

describe("YearPicker", () => {
  it("reports the chosen year and closes", async () => {
    const { onChange } = renderPicker();
    const grid = await openPicker();

    expect(screen.getByRole("gridcell", { name: "2003" })).toHaveAttribute("aria-selected", "true");

    fireEvent.click(yearButton(grid, "2001"));

    expect(onChange).toHaveBeenCalledWith(2001);
    expect(screen.queryByRole("grid", { name: "Year" })).not.toBeInTheDocument();
  });

  it("moves focus by grid position with the arrow keys", async () => {
    renderPicker();
    const grid = await openPicker();

    expect(yearButton(grid, "2003")).toHaveFocus();

    fireEvent.keyDown(grid, { key: "ArrowDown" });
    expect(yearButton(grid, "2005")).toHaveFocus();

    fireEvent.keyDown(grid, { key: "ArrowLeft" });
    expect(yearButton(grid, "2004")).toHaveFocus();

    fireEvent.keyDown(grid, { key: "Home" });
    expect(yearButton(grid, "2000")).toHaveFocus();
  });

  it("offers no year outside the configured ranges", async () => {
    renderPicker({ ranges: [{ start: 2000, end: 2002 }] });
    const grid = await openPicker();

    expect(screen.getByText("2000 – 2002")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previous years" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next years" })).toBeDisabled();
    expect(within(grid).queryByRole("button", { name: "1999" })).not.toBeInTheDocument();
    expect(within(grid).queryByRole("button", { name: "2003" })).not.toBeInTheDocument();
  });

  it("pages between the eras and never lists a hiatus year", async () => {
    renderPicker({ ranges: ALUMNI_GRADUATION_YEAR_RANGES, value: null });
    const grid = await openPicker();
    const currentYear = new Date().getFullYear();
    const seen: number[] = [];

    for (;;) {
      seen.push(
        ...within(grid)
          .getAllByRole("button")
          .map((button) => Number(button.textContent))
      );

      const previous = screen.getByRole("button", { name: "Previous years" });

      if ((previous as HTMLButtonElement).disabled) break;

      fireEvent.click(previous);
    }

    expect(seen).toContain(1963);
    expect(seen).toContain(1978);
    expect(seen).toContain(2000);
    expect(seen).toContain(currentYear);
    expect(seen.every((year) => year < 1979 || year > 1999)).toBe(true);
    expect(seen.every((year) => year <= currentYear)).toBe(true);
    expect(Math.min(...seen)).toBe(1963);
  });

  it("opens on the newest selectable years and steps a full page back", async () => {
    renderPicker({ ranges: ALUMNI_GRADUATION_YEAR_RANGES, value: null });
    const grid = await openPicker();
    const currentYear = new Date().getFullYear();

    expect(yearButton(grid, String(currentYear))).toHaveFocus();
    expect(screen.getByText(`${currentYear - 11} – ${currentYear}`)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Previous years" }));

    expect(screen.getByText(`${currentYear - 23} – ${currentYear - 12}`)).toBeInTheDocument();
  });

  it("shows the placeholder and the era note", async () => {
    renderPicker({ value: null, placeholder: "Select your graduation year", note: "No degrees." });

    expect(screen.getByRole("button", { name: "Select your graduation year" })).toBeInTheDocument();

    await openPicker();
    expect(screen.getByText("No degrees.")).toBeInTheDocument();
  });
});
