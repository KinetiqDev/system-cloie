import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AssignmentFilters,
  type AssignmentFiltersState,
} from "@/features/course-assignments/components/shared/assignment-filters";

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
    expect(screen.getByRole("textbox", { name: "Search assignments" })).toBeInTheDocument();
  });

  it("starts searchable course and faculty inputs empty when no filter is selected", () => {
    render(
      <AssignmentFilters
        filters={filters}
        onFiltersChange={vi.fn()}
        availableCourses={[{ id: "course-1", code: "CS101", title: "Intro to Computing" }]}
        availablePrograms={[]}
        availableFaculty={[{ id: "faculty-1", name: "Ada Lovelace", email: "ada@example.com" }]}
        termInstances={[]}
      />
    );

    expect(screen.getByRole("combobox", { name: "Course" })).toHaveValue("");
    expect(screen.getByRole("combobox", { name: "Faculty" })).toHaveValue("");
  });

  it("clears a selected course without restoring the all-courses boilerplate", () => {
    const onFiltersChange = vi.fn();
    render(
      <AssignmentFilters
        filters={{ ...filters, courseId: "course-1" }}
        onFiltersChange={onFiltersChange}
        availableCourses={[{ id: "course-1", code: "CS101", title: "Intro to Computing" }]}
        availablePrograms={[]}
        availableFaculty={[]}
        termInstances={[]}
      />
    );

    const courseInput = screen.getByRole("combobox", { name: "Course" });
    expect(courseInput).toHaveValue("CS101");
    fireEvent.click(screen.getByRole("button", { name: "Clear selection" }));

    expect(courseInput).toHaveValue("");
    expect(onFiltersChange).toHaveBeenCalledWith({ ...filters, courseId: null });
  });

  it("searches course options by code and title", async () => {
    const onFiltersChange = vi.fn();
    render(
      <AssignmentFilters
        filters={filters}
        onFiltersChange={onFiltersChange}
        availableCourses={[
          { id: "course-1", code: "CS101", title: "Intro to Computing" },
          { id: "course-2", code: "MATH201", title: "Discrete Mathematics" },
        ]}
        availablePrograms={[]}
        availableFaculty={[]}
        termInstances={[]}
      />
    );

    const courseInput = screen.getByRole("combobox", { name: "Course" });
    fireEvent.click(courseInput.closest('[data-slot="input-group"]')!.querySelector("button")!);
    fireEvent.change(courseInput, { target: { value: "discrete" } });

    expect(await screen.findByRole("option", { name: /math201/i })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /cs101/i })).not.toBeInTheDocument();
  });

  it("searches faculty options by name and email and replaces selected ids with labels", async () => {
    const onFiltersChange = vi.fn();
    render(
      <AssignmentFilters
        filters={{ ...filters, courseId: "course-1", facultyId: "faculty-1" }}
        onFiltersChange={onFiltersChange}
        availableCourses={[{ id: "course-1", code: "CS101", title: "Intro to Computing" }]}
        availablePrograms={[]}
        availableFaculty={[
          { id: "faculty-1", name: "Ada Lovelace", email: "ada@example.com" },
          { id: "faculty-2", name: "Grace Hopper", email: "grace@example.com" },
        ]}
        termInstances={[]}
      />
    );

    expect(screen.getByRole("combobox", { name: "Course" })).toHaveValue("CS101");
    expect(screen.getByRole("combobox", { name: "Faculty" })).toHaveValue("Ada Lovelace");

    const facultyInput = screen.getByRole("combobox", { name: "Faculty" });
    fireEvent.click(facultyInput.closest('[data-slot="input-group"]')!.querySelector("button")!);
    fireEvent.change(facultyInput, { target: { value: "grace@example.com" } });

    const option = await screen.findByRole("option", { name: /grace hopper/i });
    expect(option).toHaveTextContent("grace@example.com");
    fireEvent.click(option);

    expect(onFiltersChange).toHaveBeenCalledWith({
      ...filters,
      courseId: "course-1",
      facultyId: "faculty-2",
    });
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

    fireEvent.change(screen.getByRole("textbox", { name: "Search assignments" }), {
      target: { value: "faculty" },
    });
    expect(onFiltersChange).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(300));
    expect(onFiltersChange).toHaveBeenCalledWith({ ...filters, searchQuery: "faculty" }, "replace");
  });

  it("can reset the Secretary empty-roster attention filter", () => {
    const onFiltersChange = vi.fn();
    render(
      <AssignmentFilters
        filters={{ ...filters, isActive: true, hasActiveRosterMembers: false }}
        onFiltersChange={onFiltersChange}
        availableCourses={[]}
        availablePrograms={[]}
        availableFaculty={[]}
        termInstances={[]}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(onFiltersChange).toHaveBeenCalledWith(filters);
  });
});
