"use client";

import { useEffect, useRef, useState } from "react";
import { ListFilter, Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PublishedEvaluationFilters } from "@/features/instruments/components/tools-view-state";
import {
  hasActivePublishedFilters,
  type CourseFilterOption,
  type PeriodFilterOption,
} from "./filter-published-evaluations";

type FacultyPublishedFilterBarProps = {
  filters: PublishedEvaluationFilters;
  periods: PeriodFilterOption[];
  courses: CourseFilterOption[];
  onFiltersChange: (next: PublishedEvaluationFilters, navigation?: "push" | "replace") => void;
};

export function FacultyPublishedFilterBar({
  filters,
  periods,
  courses,
  onFiltersChange,
}: FacultyPublishedFilterBarProps) {
  const [searchDraft, setSearchDraft] = useState(filters.query);
  const [previousQuery, setPreviousQuery] = useState(filters.query);

  if (previousQuery !== filters.query) {
    setPreviousQuery(filters.query);
    setSearchDraft(filters.query);
  }

  // Latest committed filters for the pending search timer: reading through a
  // ref keeps a period/course/status change made mid-debounce from being
  // overwritten by the older snapshot closed over when typing started.
  const latestFilters = useRef(filters);
  useEffect(() => {
    latestFilters.current = filters;
  });

  useEffect(() => {
    if (searchDraft === latestFilters.current.query) return;
    const timeout = window.setTimeout(
      () => onFiltersChange({ ...latestFilters.current, query: searchDraft }, "replace"),
      300
    );
    return () => window.clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchDraft]);

  const hasActive = hasActivePublishedFilters(filters);
  const selectedPeriod = periods.find((period) => period.id === filters.periodId);
  const selectedCourse = courses.find((course) => course.id === filters.courseId);

  return (
    <section
      aria-labelledby="published-filter-title"
      className="bg-card flex min-w-0 flex-col gap-4 overflow-hidden rounded-xl border p-4 shadow-xs sm:p-5"
    >
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className="bg-muted text-muted-foreground ring-border hidden size-8 shrink-0 items-center justify-center rounded-lg ring-1 sm:inline-flex"
            aria-hidden="true"
          >
            <ListFilter className="size-4" />
          </span>
          <div className="flex min-w-0 flex-col gap-1">
            <h2 id="published-filter-title" className="text-title-sm leading-tight">
              Filter evaluations
            </h2>
            <p className="text-muted-foreground text-xs leading-normal break-words">
              Search or combine filters to narrow the published list.
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            onFiltersChange({ periodId: null, courseId: null, query: "", status: "ALL" })
          }
          disabled={!hasActive}
          className="shrink-0 gap-1.5"
        >
          <X className="size-3.5" aria-hidden="true" />
          Reset
        </Button>
      </div>

      <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(13rem,1fr)_minmax(12rem,1fr)_minmax(14rem,1.25fr)]">
        <div className="flex min-w-0 flex-col gap-2">
          <Label htmlFor="published-search">Search evaluations</Label>
          <div className="relative">
            <Search
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
              aria-hidden="true"
            />
            <Input
              id="published-search"
              placeholder="Search name or course"
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              className="pl-9 pointer-coarse:h-11"
              autoComplete="off"
            />
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-2">
          <Label htmlFor="published-period-filter">Academic Period</Label>
          <Select
            value={
              periods.some((period) => period.id === filters.periodId)
                ? (filters.periodId ?? "all")
                : "all"
            }
            onValueChange={(value) =>
              onFiltersChange({ ...filters, periodId: value === "all" ? null : value })
            }
          >
            <SelectTrigger
              id="published-period-filter"
              className="w-full min-w-0 pointer-coarse:h-11"
            >
              <SelectValue
                placeholder="All Academic Periods"
                className="block min-w-0 truncate text-left"
              >
                {selectedPeriod ? selectedPeriod.label : "All Academic Periods"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Academic Periods</SelectItem>
              {periods.map((period) => (
                <SelectItem key={period.id} value={period.id}>
                  {period.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex min-w-0 flex-col gap-2 sm:col-span-2 lg:col-span-1">
          <Label htmlFor="published-course-filter">Course</Label>
          <Select
            value={
              courses.some((course) => course.id === filters.courseId)
                ? (filters.courseId ?? "all")
                : "all"
            }
            onValueChange={(value) =>
              onFiltersChange({ ...filters, courseId: value === "all" ? null : value })
            }
          >
            <SelectTrigger
              id="published-course-filter"
              className="w-full min-w-0 pointer-coarse:h-11"
            >
              <SelectValue placeholder="All Courses" className="block min-w-0 truncate text-left">
                {selectedCourse ? selectedCourse.label : "All Courses"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Courses</SelectItem>
              {courses.map((course) => (
                <SelectItem key={course.id} value={course.id}>
                  {course.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </section>
  );
}
