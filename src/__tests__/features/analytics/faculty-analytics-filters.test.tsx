import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FacultyAnalyticsFilters } from "@/features/analytics/components/faculty-analytics-filters";

const courses = [
  { id: "c1", label: "CS101" },
  { id: "c2", label: "CS201" },
];

describe("FacultyAnalyticsFilters", () => {
  it("associates visible labels with the filter selects", () => {
    render(
      <FacultyAnalyticsFilters
        filters={{}}
        onChange={vi.fn()}
        availableAcademicYears={["2025-2026"]}
        availableCourses={courses}
      />
    );

    expect(screen.getByRole("combobox", { name: "School Year" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Status" })).toBeInTheDocument();
  });

  it("toggles course chips with pressed state and a mobile target floor", () => {
    const onChange = vi.fn();
    render(
      <FacultyAnalyticsFilters
        filters={{ courseIds: ["c1"] }}
        onChange={onChange}
        availableAcademicYears={[]}
        availableCourses={courses}
      />
    );

    const selected = screen.getByRole("button", { name: "CS101" });
    expect(selected).toHaveAttribute("aria-pressed", "true");
    expect(selected.className).toContain("min-h-11");
    expect(screen.getByRole("button", { name: "CS201" })).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(screen.getByRole("button", { name: "CS201" }));
    expect(onChange).toHaveBeenCalledWith({ courseIds: ["c1", "c2"] });

    fireEvent.click(selected);
    expect(onChange).toHaveBeenCalledWith({ courseIds: [] });
  });
});
