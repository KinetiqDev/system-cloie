"use client";

import Link from "next/link";
import { useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
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
import { cn } from "@/lib/utils";

type Props = {
  programId: string;
  filters: AnalyticsFilterState;
  options: ProgramHeadAnalyticsPeriodOptions;
};

export function ProgramHeadAnalyticsFilters({ programId, filters, options }: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const activeCount = [
    filters.schoolYearId,
    filters.semester,
    filters.termInstanceId,
    filters.evidenceSource,
    filters.stakeholder,
  ].filter(Boolean).length;
  const hasPeriodOptions =
    options.schoolYears.length > 0 ||
    options.semesters.length > 0 ||
    options.termInstances.length > 0;

  return (
    <div className="border-border bg-card rounded-xl border p-3 shadow-sm sm:p-4">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <SlidersHorizontal aria-hidden="true" className="text-muted-foreground" />
            <h2 className="text-title-sm font-semibold">Evidence scope</h2>
            {activeCount > 0 ? <Badge variant="secondary">Filtered</Badge> : null}
          </div>
          <p className="text-body-sm text-muted-foreground mt-1">
            {activeCount > 0
              ? "Showing a filtered evidence set."
              : "Showing all available evidence."}
          </p>
        </div>

        <div className="hidden items-center gap-2 lg:flex">
          <Link
            href={buildAnalyticsUrl(programId, { tab: filters.tab })}
            aria-disabled={activeCount === 0}
            className={cn(
              buttonVariants({ variant: "ghost" }),
              activeCount === 0 && "pointer-events-none opacity-60"
            )}
          >
            <X data-icon="inline-start" aria-hidden="true" />
            Reset
          </Link>
        </div>
      </div>

      <div className="mt-4 hidden lg:block">
        <FilterForm
          programId={programId}
          filters={filters}
          options={options}
          hasPeriodOptions={hasPeriodOptions}
        />
      </div>

      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerTrigger
          render={
            <Button variant="outline" className="mt-4 w-full justify-between lg:hidden">
              <span>Filters</span>
              <span className="text-muted-foreground">
                {activeCount > 0 ? `${activeCount} active` : "All periods"}
              </span>
            </Button>
          }
        />
        <DrawerContent className="max-h-[88dvh]">
          <DrawerHeader className="text-left">
            <DrawerTitle>Analytics scope filters</DrawerTitle>
            <DrawerDescription>
              Choose the evidence sources and academic period to include.
            </DrawerDescription>
          </DrawerHeader>
          <div className="overflow-y-auto px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            <FilterForm
              programId={programId}
              filters={filters}
              options={options}
              hasPeriodOptions={hasPeriodOptions}
              drawer
            />
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}

function FilterForm({
  programId,
  filters,
  options,
  drawer = false,
  hasPeriodOptions,
}: Props & { drawer?: boolean; hasPeriodOptions: boolean }) {
  return (
    <form
      method="get"
      action={buildAnalyticsUrl(programId)}
      className={cn(drawer ? "flex flex-col gap-4" : "grid grid-cols-2 gap-3 xl:grid-cols-6")}
    >
      {filters.tab !== "outcomes" ? <input type="hidden" name="tab" value={filters.tab} /> : null}
      <Select
        label="Evidence source"
        name="evidenceSource"
        value={filters.evidenceSource}
        options={[
          { value: "COURSE", label: "Course evaluations" },
          { value: "PROGRAM_WIDE_STUDENT", label: "Program-wide students" },
          { value: "ALUMNI", label: "Alumni" },
          { value: "INDUSTRY", label: "Industry partners" },
        ]}
        blank="All sources"
      />
      {filters.evidenceSource !== "COURSE" ? (
        <Select
          label="Stakeholder"
          name="stakeholder"
          value={filters.stakeholder}
          options={[
            { value: "STUDENT", label: "Students" },
            { value: "ALUMNI", label: "Alumni" },
            { value: "INDUSTRY_PARTNER", label: "Industry partners" },
          ]}
          blank="All stakeholders"
        />
      ) : null}
      {hasPeriodOptions ? (
        <>
          <Select
            label="School Year"
            name="schoolYearId"
            value={filters.schoolYearId}
            options={options.schoolYears.map((item) => ({ value: item.id, label: item.label }))}
            blank="All school years"
          />
          <Select
            label="Semester"
            name="semester"
            value={filters.semester}
            options={options.semesters}
            blank="All semesters"
          />
          <Select
            label="Academic Term"
            name="termInstanceId"
            value={filters.termInstanceId}
            options={options.termInstances.map((item) => ({ value: item.id, label: item.label }))}
            blank="All terms"
          />
        </>
      ) : null}
      <div className={cn("flex items-end gap-2", drawer && "bg-background sticky bottom-0 pt-2")}>
        <Button type="submit" className={cn(drawer && "flex-1")}>
          Apply filters
        </Button>
        {drawer && activeCount(filters) > 0 ? (
          <Link
            href={buildAnalyticsUrl(programId, { tab: filters.tab })}
            className={buttonVariants({ variant: "outline" })}
          >
            Reset
          </Link>
        ) : null}
      </div>
    </form>
  );
}

function activeCount(filters: AnalyticsFilterState): number {
  return [
    filters.schoolYearId,
    filters.semester,
    filters.termInstanceId,
    filters.evidenceSource,
    filters.stakeholder,
  ].filter(Boolean).length;
}

function Select({
  label,
  name,
  value,
  options,
  blank,
}: {
  label: string;
  name: string;
  value?: string;
  options: Array<{ value: string; label: string }>;
  blank: string;
}) {
  return (
    <label className="text-label-md text-foreground flex min-w-0 flex-col gap-1.5">
      {label}
      <select
        name={name}
        defaultValue={value ?? ""}
        className="border-input bg-background text-body-sm focus-visible:border-ring focus-visible:ring-ring h-9 min-w-0 rounded-lg border px-3 outline-none focus-visible:ring-3"
      >
        <option value="">{blank}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
