import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { TableFilterSheet, MobileFilterSheet } from "@/components/data-table/table-toolbar";
import type { FacetDef } from "@/components/data-table/types";

function mockMatchMedia(isDesktop: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches: isDesktop,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
  );
}

const mockFacets: FacetDef[] = [
  {
    id: "type",
    label: "Type",
    value: null,
    onChange: vi.fn(),
    allLabel: "All types",
    options: [
      { id: "PROGRAM_WIDE", label: "Program-wide" },
      { id: "COURSE_BOUND", label: "Course-bound" },
    ],
  },
  {
    id: "status",
    label: "Status",
    value: "ACTIVE",
    onChange: vi.fn(),
    allLabel: "All statuses",
    options: [
      { id: "ACTIVE", label: "Active" },
      { id: "INACTIVE", label: "Inactive" },
    ],
  },
];

describe("TableFilterSheet / MobileFilterSheet", () => {
  it("renders a Popover on desktop (>= 768px)", async () => {
    mockMatchMedia(true);
    const onClearAll = vi.fn();

    render(
      <TableFilterSheet
        facets={mockFacets}
        activeCount={1}
        onClearAll={onClearAll}
        summary="Show results"
      />
    );

    const trigger = screen.getByRole("button", { name: /Filters/i });
    expect(trigger).toBeInTheDocument();
    expect(screen.getByText("1 active")).toBeInTheDocument();

    fireEvent.click(trigger);

    // Popover content should be open with data-slot="popover-content"
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveAttribute("data-slot", "popover-content");
    expect(screen.getByText("Filter this list")).toBeInTheDocument();
    expect(screen.getByText("Type")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();

    // Reset filters action
    const resetButton = screen.getByRole("button", { name: "Reset filters" });
    fireEvent.click(resetButton);
    expect(onClearAll).toHaveBeenCalledTimes(1);
  });

  it("renders a Drawer on mobile (< 768px)", async () => {
    mockMatchMedia(false);
    const onClearAll = vi.fn();

    render(
      <MobileFilterSheet
        facets={mockFacets}
        activeCount={0}
        onClearAll={onClearAll}
        summary="Show results"
      />
    );

    const trigger = screen.getByRole("button", { name: /Filters/i });
    expect(screen.getByText("Optional")).toBeInTheDocument();

    fireEvent.click(trigger);

    // Drawer content should be open with data-slot="drawer-popup"
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveAttribute("data-slot", "drawer-popup");
    expect(screen.getByText("Filter this list")).toBeInTheDocument();
  });
});
