"use client";

import { useEffect, useRef, useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";

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
import {
  DEFAULT_PUBLISHED_FILTERS,
  type PublishedEvaluationFilters,
} from "@/features/instruments/components/tools-view-state";
import {
  hasActivePublishedFilters,
  type CourseFilterOption,
  type PeriodFilterOption,
  type TargetFilterOption,
} from "./filter-published-evaluations";

type PublishedFilterSurface = {
  label: string;
  searchLabel: string;
  searchPlaceholder: string;
  searchId: string;
  moreFiltersId: string;
  periodSelectId: string;
  /** Facet field on `PublishedEvaluationFilters` narrowed by this surface. */
  facetKey: "courseId" | "target";
  facetSelectId: string;
  facetLabel: string;
  facetAllLabel: string;
};

const SURFACES: Record<"evaluation" | "deployment", PublishedFilterSurface> = {
  evaluation: {
    label: "Published evaluation filters",
    searchLabel: "Search evaluations",
    searchPlaceholder: "Search published evaluations",
    searchId: "published-search",
    moreFiltersId: "faculty-published-more-filters",
    periodSelectId: "published-period-filter",
    facetKey: "courseId",
    facetSelectId: "published-course-filter",
    facetLabel: "Course",
    facetAllLabel: "All Courses",
  },
  deployment: {
    label: "Published deployment filters",
    searchLabel: "Search deployments",
    searchPlaceholder: "Search published deployments",
    searchId: "program-head-published-search",
    moreFiltersId: "program-head-published-more-filters",
    periodSelectId: "program-head-published-period-filter",
    facetKey: "target",
    facetSelectId: "program-head-published-target-filter",
    facetLabel: "Target stakeholder",
    facetAllLabel: "All Target Stakeholders",
  },
};

type SharedBarProps = {
  filters: PublishedEvaluationFilters;
  periods: readonly PeriodFilterOption[];
  onFiltersChange: (next: PublishedEvaluationFilters, navigation?: "push" | "replace") => void;
};

type PublishedEvaluationFilterBarProps = SharedBarProps &
  (
    | { record: "evaluation"; courses: readonly CourseFilterOption[] }
    | { record: "deployment"; targets: readonly TargetFilterOption[] }
  );

function FilterSelect({
  id,
  label,
  allLabel,
  options,
  selectedId,
  onSelect,
}: {
  id: string;
  label: string;
  allLabel: string;
  options: readonly { id: string; label: string }[];
  selectedId: string | null;
  onSelect: (value: string | null) => void;
}) {
  const selected = options.find((option) => option.id === selectedId);
  const display = selected ? selected.label : allLabel;

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Select
        value={selected?.id ?? "all"}
        onValueChange={(value) => onSelect(value === "all" ? null : value)}
      >
        <SelectTrigger id={id} className="w-full min-w-0 pointer-coarse:h-11">
          <SelectValue placeholder={allLabel} className="block min-w-0 truncate text-left">
            {display}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{allLabel}</SelectItem>
          {options.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function PublishedEvaluationFilterBar(props: PublishedEvaluationFilterBarProps) {
  const { filters, periods, record, onFiltersChange } = props;
  const facetOptions = record === "evaluation" ? props.courses : props.targets;
  const surface = SURFACES[record];
  const [searchDraft, setSearchDraft] = useState(filters.query);
  const [previousQuery, setPreviousQuery] = useState(filters.query);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  if (previousQuery !== filters.query) {
    setPreviousQuery(filters.query);
    setSearchDraft(filters.query);
  }

  // Latest committed filters for the pending search timer: reading through a
  // ref keeps a period/facet/status change made mid-debounce from being
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

  const facetId = surface.facetKey === "courseId" ? filters.courseId : filters.target;

  return (
    <section
      aria-label={surface.label}
      className="bg-card flex min-w-0 flex-col gap-3 rounded-xl border p-3 sm:p-4"
    >
      <div className="flex min-w-0 items-end gap-2">
        <div className="min-w-0 flex-1">
          <Label htmlFor={surface.searchId} className="sr-only">
            {surface.searchLabel}
          </Label>
          <div className="relative">
            <Search
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
              aria-hidden="true"
            />
            <Input
              id={surface.searchId}
              placeholder={surface.searchPlaceholder}
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              className="pl-9 pointer-coarse:h-11"
              autoComplete="off"
            />
          </div>
        </div>
        <Button
          variant={filters.periodId || facetId ? "secondary" : "outline"}
          size="icon"
          className="sm:hidden"
          aria-label="Toggle more filters"
          aria-expanded={mobileFiltersOpen}
          aria-controls={surface.moreFiltersId}
          onClick={() => setMobileFiltersOpen((open) => !open)}
        >
          <SlidersHorizontal aria-hidden="true" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onFiltersChange(DEFAULT_PUBLISHED_FILTERS)}
          disabled={!hasActivePublishedFilters(filters)}
          className="shrink-0"
          aria-label="Clear filters"
        >
          <X aria-hidden="true" />
          <span className="hidden sm:inline">Clear</span>
        </Button>
      </div>

      <div
        id={surface.moreFiltersId}
        className={`${mobileFiltersOpen ? "grid" : "hidden"} min-w-0 gap-3 sm:grid sm:grid-cols-2`}
      >
        <FilterSelect
          id={surface.periodSelectId}
          label="Academic Period"
          allLabel="All Academic Periods"
          options={periods}
          selectedId={filters.periodId}
          onSelect={(periodId) => onFiltersChange({ ...filters, periodId })}
        />
        <FilterSelect
          id={surface.facetSelectId}
          label={surface.facetLabel}
          allLabel={surface.facetAllLabel}
          options={facetOptions}
          selectedId={facetId}
          onSelect={(value) =>
            onFiltersChange(
              surface.facetKey === "courseId"
                ? { ...filters, courseId: value }
                : { ...filters, target: value }
            )
          }
        />
      </div>
    </section>
  );
}
