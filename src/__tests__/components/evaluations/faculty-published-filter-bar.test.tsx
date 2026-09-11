import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import { FacultyPublishedFilterBar } from "@/features/evaluations/components/faculty-published-filter-bar";
import {
  DEFAULT_PUBLISHED_FILTERS,
  type PublishedEvaluationFilters,
} from "@/features/instruments/components/tools-view-state";

const periods = [{ id: "period-1", label: "2026-2027 — 1st Semester" }];
const courses = [{ id: "course-1", code: "CS101", title: "Intro", label: "CS101 · Intro" }];

function renderBar(
  filters: PublishedEvaluationFilters = DEFAULT_PUBLISHED_FILTERS,
  onFiltersChange: (next: PublishedEvaluationFilters) => void = vi.fn()
) {
  const result = render(
    <FacultyPublishedFilterBar
      filters={filters}
      periods={periods}
      courses={courses}
      onFiltersChange={onFiltersChange}
    />
  );
  return { ...result, onFiltersChange };
}

describe("FacultyPublishedFilterBar", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("names the clear control when its visible label is hidden", () => {
    renderBar({ ...DEFAULT_PUBLISHED_FILTERS, query: "capstone" });

    expect(screen.getByRole("button", { name: "Clear filters" })).toBeEnabled();
  });

  it("keeps a mid-debounce status change when the search timer fires", () => {
    const onFiltersChange = vi.fn();
    const { rerender } = renderBar(DEFAULT_PUBLISHED_FILTERS, onFiltersChange);

    fireEvent.change(screen.getByLabelText("Search evaluations"), {
      target: { value: "capstone" },
    });
    vi.advanceTimersByTime(100);

    const committed: PublishedEvaluationFilters = {
      ...DEFAULT_PUBLISHED_FILTERS,
      status: "CLOSED",
    };
    rerender(
      <FacultyPublishedFilterBar
        filters={committed}
        periods={periods}
        courses={courses}
        onFiltersChange={onFiltersChange}
      />
    );
    vi.advanceTimersByTime(300);

    expect(onFiltersChange).toHaveBeenCalledTimes(1);
    expect(onFiltersChange).toHaveBeenCalledWith({ ...committed, query: "capstone" }, "replace");
  });
});
