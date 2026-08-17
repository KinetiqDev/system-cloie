"use client";

import Link from "next/link";
import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import type { ProgramHeadAnalyticsPeriodOptions } from "@/features/analytics/program-head-analytics-types";
import type { AnalyticsFilterState } from "@/features/analytics/services/program-head-analytics-state";
import { buildAnalyticsUrl } from "@/features/analytics/services/program-head-analytics-state";

type ProgramHeadAnalyticsFiltersProps = {
  programId: string;
  filters: AnalyticsFilterState;
  options: ProgramHeadAnalyticsPeriodOptions;
};

/**
 * Server-first GET filter form. Desktop keeps the primary filters inline;
 * mobile tucks the same controls into a Drawer with an active-filter count on
 * the trigger. Both variants submit the canonical analytics URL so tab and
 * filter state stay bookmarkable and refresh-safe.
 */
export function ProgramHeadAnalyticsFilters({
  programId,
  filters,
  options,
}: ProgramHeadAnalyticsFiltersProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const hasOptions =
    options.schoolYears.length > 0 ||
    options.semesters.length > 0 ||
    options.termInstances.length > 0;
  if (!hasOptions) return null;

  const activeCount = [filters.schoolYearId, filters.semester, filters.termInstanceId].filter(
    Boolean
  ).length;

  return (
    <>
      <Card size="sm" className="hidden lg:block">
        <CardHeader>
          <CardTitle>Analytics scope</CardTitle>
        </CardHeader>
        <CardContent>
          <FilterForm programId={programId} filters={filters} options={options} />
        </CardContent>
      </Card>

      <Card size="sm" className="lg:hidden" aria-label="Analytics scope filters">
        <CardHeader>
          <CardTitle>Analytics scope</CardTitle>
        </CardHeader>
        <CardContent>
          <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
            <DrawerTrigger
              render={
                <Button variant="outline" className="w-full justify-between">
                  <span className="inline-flex items-center gap-2">
                    <SlidersHorizontal aria-hidden="true" className="size-4" />
                    Filters
                  </span>
                  <span className="inline-flex items-center gap-2">
                    {activeCount > 0 ? (
                      <Badge variant="secondary">{activeCount} active</Badge>
                    ) : (
                      <span className="text-muted-foreground">All periods</span>
                    )}
                  </span>
                </Button>
              }
            />
            <DrawerContent className="max-h-[85dvh]">
              <DrawerHeader className="text-left">
                <DrawerTitle>Analytics scope filters</DrawerTitle>
                <DrawerDescription>
                  Narrow the evidence by school year, semester, and academic term. The selected
                  Program stays fixed.
                </DrawerDescription>
              </DrawerHeader>
              <div className="min-h-0 flex-1 overflow-y-auto px-4">
                <FilterForm programId={programId} filters={filters} options={options} drawer />
              </div>
            </DrawerContent>
          </Drawer>
        </CardContent>
      </Card>
    </>
  );
}

function FilterForm({
  programId,
  filters,
  options,
  drawer = false,
}: ProgramHeadAnalyticsFiltersProps & { drawer?: boolean }) {
  return (
    <form
      method="get"
      action={buildAnalyticsUrl(programId)}
      className={drawer ? "flex flex-col gap-4" : "grid gap-4 sm:grid-cols-2 lg:grid-cols-4"}
    >
      {filters.tab !== "overview" ? <input type="hidden" name="tab" value={filters.tab} /> : null}
      <PeriodSelect
        label="School Year"
        selectName="schoolYearId"
        value={filters.schoolYearId ?? ""}
        options={options.schoolYears.map((option) => ({ value: option.id, label: option.label }))}
        blankLabel="All school years"
      />
      <PeriodSelect
        label="Semester"
        selectName="semester"
        value={filters.semester ?? ""}
        options={options.semesters}
        blankLabel="All semesters"
      />
      <PeriodSelect
        label="Academic Term"
        selectName="termInstanceId"
        value={filters.termInstanceId ?? ""}
        options={options.termInstances.map((option) => ({ value: option.id, label: option.label }))}
        blankLabel="All terms"
      />
      <div className={drawer ? "flex items-center gap-2" : "flex items-end gap-2"}>
        <Button type="submit" size="sm" className={drawer ? "flex-1" : undefined}>
          Apply filters
        </Button>
        <Link
          href={buildAnalyticsUrl(programId, { tab: filters.tab })}
          className="inline-flex min-h-11 items-center rounded-lg px-3 text-label-md text-link hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Reset
        </Link>
      </div>
    </form>
  );
}

function PeriodSelect({
  label,
  selectName,
  value,
  options,
  blankLabel,
}: {
  label: string;
  selectName: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  blankLabel: string;
}) {
  if (options.length === 0) {
    return null;
  }
  return (
    <label className="flex min-w-0 flex-col gap-1.5 text-label-md text-foreground">
      {label}
      <select
        name={selectName}
        defaultValue={value}
        className="h-11 rounded-lg border border-border bg-background px-3 text-body-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <option value="">{blankLabel}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}