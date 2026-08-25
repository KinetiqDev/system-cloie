import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AssignmentFilters, type AssignmentFiltersState } from "@/features/course-assignments/components/shared/assignment-filters";

const filters: AssignmentFiltersState = {
  termInstanceId: null,
  courseId: null,
  facultyId: null,
  programId: null,
  yearLevel: null,
  section: null,
  isActive: null,
  courseScope: null,
  searchQuery: "",
};

afterEach(() => vi.useRealTimers());

describe("AssignmentFilters", () => {
  it("gives every filter control an accessible name", () => {
    render(
      <AssignmentFilters
        filters={filters}
        onFiltersChange={vi.fn()}
        availableCourses={[]}
        availablePrograms={[]}
        availableFaculty={[]}
        termInstances={[]}
      />
    );

    expect(screen.getByRole("combobox", { name: "Academic Period" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Course" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Faculty" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Program" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Year level" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Section" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Status" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Course scope" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Search" })).toBeInTheDocument();
  });

  it("debounces search navigation and uses route replacement", () => {
    vi.useFakeTimers();
    const onFiltersChange = vi.fn();
    render(
      <AssignmentFilters
        filters={filters}
        onFiltersChange={onFiltersChange}
        availableCourses={[]}
        availablePrograms={[]}
        availableFaculty={[]}
        termInstances={[]}
      />
    );

    fireEvent.change(screen.getByRole("textbox", { name: "Search" }), {
      target: { value: "faculty" },
    });
    expect(onFiltersChange).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(300));
    expect(onFiltersChange).toHaveBeenCalledWith(
      { ...filters, searchQuery: "faculty" },
      "replace"
    );
  });
});
