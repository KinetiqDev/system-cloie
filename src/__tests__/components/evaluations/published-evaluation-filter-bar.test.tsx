import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import { PublishedEvaluationFilterBar } from "@/features/evaluations/components/published-evaluation-filter-bar";
import {
  DEFAULT_PUBLISHED_FILTERS,
  type PublishedEvaluationFilters,
} from "@/features/instruments/components/tools-view-state";

const periods = [{ id: "period-1", label: "2026-2027 — 1st Semester" }];
const courses = [{ id: "course-1", code: "CS101", title: "Intro", label: "CS101 · Intro" }];
const targets = [{ id: "STUDENT", label: "Students" }];

function renderBar(
  filters: PublishedEvaluationFilters = DEFAULT_PUBLISHED_FILTERS,
  onFiltersChange: (next: PublishedEvaluationFilters) => void = vi.fn()
) {
  const result = render(
    <PublishedEvaluationFilterBar
      filters={filters}
      periods={periods}
      record="evaluation"
      courses={courses}
      onFiltersChange={onFiltersChange}
    />
  );
  return { ...result, onFiltersChange };
}

function renderDeploymentBar(
  onFiltersChange: (next: PublishedEvaluationFilters) => void = vi.fn()
) {
  const result = render(
    <PublishedEvaluationFilterBar
      filters={DEFAULT_PUBLISHED_FILTERS}
      periods={periods}
      record="deployment"
      targets={targets}
      onFiltersChange={onFiltersChange}
    />
  );
  return { ...result, onFiltersChange };
}

describe("PublishedEvaluationFilterBar", () => {
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

  it("clears every filter facet, not just the visible ones", () => {
    const onFiltersChange = vi.fn();
    renderBar(
      {
        ...DEFAULT_PUBLISHED_FILTERS,
        periodId: "period-1",
        courseId: "course-1",
        status: "CLOSED",
      },
      onFiltersChange
    );

    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));

    expect(onFiltersChange).toHaveBeenCalledWith(DEFAULT_PUBLISHED_FILTERS);
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
      <PublishedEvaluationFilterBar
        filters={committed}
        periods={periods}
        record="evaluation"
        courses={courses}
        onFiltersChange={onFiltersChange}
      />
    );
    vi.advanceTimersByTime(300);

    expect(onFiltersChange).toHaveBeenCalledTimes(1);
    expect(onFiltersChange).toHaveBeenCalledWith({ ...committed, query: "capstone" }, "replace");
  });

  it("adopts a server-driven query change, such as a browser back navigation", () => {
    const { rerender } = renderBar({ ...DEFAULT_PUBLISHED_FILTERS, query: "draft" });

    expect(screen.getByLabelText("Search evaluations")).toHaveValue("draft");

    rerender(
      <PublishedEvaluationFilterBar
        filters={{ ...DEFAULT_PUBLISHED_FILTERS, query: "" }}
        periods={periods}
        record="evaluation"
        courses={courses}
        onFiltersChange={vi.fn()}
      />
    );

    expect(screen.getByLabelText("Search evaluations")).toHaveValue("");
  });

  it("writes the course facet for the evaluation surface", async () => {
    const onFiltersChange = vi.fn();
    vi.useRealTimers();
    renderBar(DEFAULT_PUBLISHED_FILTERS, onFiltersChange);

    fireEvent.click(screen.getByRole("combobox", { name: "Course" }));
    const courseOption = await screen.findByRole("option", { name: "CS101 · Intro" });
    fireEvent.mouseMove(courseOption);
    fireEvent.click(courseOption);

    expect(onFiltersChange).toHaveBeenLastCalledWith({
      ...DEFAULT_PUBLISHED_FILTERS,
      courseId: "course-1",
    });
  });

  it("labels the deployment surface audience select and writes the target facet", async () => {
    const onFiltersChange = vi.fn();
    vi.useRealTimers();
    renderDeploymentBar(onFiltersChange);

    expect(screen.getByRole("textbox", { name: "Search deployments" })).toHaveAttribute(
      "placeholder",
      "Search published deployments"
    );

    fireEvent.click(screen.getByRole("combobox", { name: "Target stakeholder" }));
    const targetOption = await screen.findByRole("option", { name: "Students" });
    fireEvent.mouseMove(targetOption);
    fireEvent.click(targetOption);

    expect(onFiltersChange).toHaveBeenLastCalledWith({
      ...DEFAULT_PUBLISHED_FILTERS,
      target: "STUDENT",
    });
  });

  it("drops a facet that no longer matches an option instead of keeping a stale id", () => {
    renderBar({ ...DEFAULT_PUBLISHED_FILTERS, courseId: "course-removed" });

    const trigger = screen.getByRole("combobox", { name: "Course" });
    expect(trigger).toHaveTextContent("All Courses");
  });
});
