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
import type { PublishedEvaluationFilters } from "@/features/instruments/components/tools-view-state";
import {
  hasActivePublishedFilters,
  type PeriodFilterOption,
  type TargetFilterOption,
} from "./filter-published-evaluations";

type ProgramHeadPublishedFilterBarProps = {
  filters: PublishedEvaluationFilters;
  periods: PeriodFilterOption[];
  targets: TargetFilterOption[];
  onFiltersChange: (next: PublishedEvaluationFilters, navigation?: "push" | "replace") => void;
};

export function ProgramHeadPublishedFilterBar({
  filters,
  periods,
  targets,
  onFiltersChange,
}: ProgramHeadPublishedFilterBarProps) {
  const [searchDraft, setSearchDraft] = useState(filters.query);
  const [previousQuery, setPreviousQuery] = useState(filters.query);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  if (previousQuery !== filters.query) {
    setPreviousQuery(filters.query);
    setSearchDraft(filters.query);
  }

  // Latest committed filters for the pending search timer: reading through a
  // ref keeps a period/target/status change made mid-debounce from being
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
  const selectedTarget = targets.find((target) => target.id === filters.target);

  return (
    <section
      aria-label="Published deployment filters"
      className="bg-card flex min-w-0 flex-col gap-3 rounded-xl border p-3 sm:p-4"
    >
      <div className="flex min-w-0 items-end gap-2">
        <div className="min-w-0 flex-1">
          <Label htmlFor="program-head-published-search" className="sr-only">
            Search deployments
          </Label>
          <div className="relative">
            <Search
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
              aria-hidden="true"
            />
            <Input
              id="program-head-published-search"
              placeholder="Search published deployments"
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              className="pl-9 pointer-coarse:h-11"
              autoComplete="off"
            />
          </div>
        </div>
        <Button
          variant={filters.periodId || filters.target ? "secondary" : "outline"}
          size="icon"
          className="sm:hidden"
          aria-label="Toggle more filters"
          aria-expanded={mobileFiltersOpen}
          aria-controls="program-head-published-more-filters"
          onClick={() => setMobileFiltersOpen((open) => !open)}
        >
          <SlidersHorizontal aria-hidden="true" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            onFiltersChange({
              periodId: null,
              courseId: null,
              target: null,
              query: "",
              status: "ALL",
            })
          }
          disabled={!hasActive}
          className="shrink-0"
          aria-label="Clear filters"
        >
          <X aria-hidden="true" />
          <span className="hidden sm:inline">Clear</span>
        </Button>
      </div>

      <div
        id="program-head-published-more-filters"
        className={`${mobileFiltersOpen ? "grid" : "hidden"} min-w-0 gap-3 sm:grid sm:grid-cols-2`}
      >
        <div className="flex min-w-0 flex-col gap-2">
          <Label htmlFor="program-head-published-period-filter">Academic Period</Label>
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
              id="program-head-published-period-filter"
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

        <div className="flex min-w-0 flex-col gap-2">
          <Label htmlFor="program-head-published-target-filter">Target stakeholder</Label>
          <Select
            value={
              targets.some((target) => target.id === filters.target)
                ? (filters.target ?? "all")
                : "all"
            }
            onValueChange={(value) =>
              onFiltersChange({ ...filters, target: value === "all" ? null : value })
            }
          >
            <SelectTrigger
              id="program-head-published-target-filter"
              className="w-full min-w-0 pointer-coarse:h-11"
            >
              <SelectValue
                placeholder="All Target Stakeholders"
                className="block min-w-0 truncate text-left"
              >
                {selectedTarget ? selectedTarget.label : "All Target Stakeholders"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Target Stakeholders</SelectItem>
              {targets.map((target) => (
                <SelectItem key={target.id} value={target.id}>
                  {target.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </section>
  );
}
