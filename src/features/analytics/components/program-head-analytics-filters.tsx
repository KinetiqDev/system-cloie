"use client";

import Link from "next/link";
import { useState, useId } from "react";
import { Calendar, Filter, Layers, SlidersHorizontal, UserCheck, X } from "lucide-react";
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
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  const count = activeFilterCount(filters);
  const hasPeriodOptions = options.termInstances.length > 0;

  return (
    <div className="border-border/80 bg-card rounded-xl border shadow-xs transition-shadow">
      <div className="border-border/60 flex min-w-0 flex-wrap items-center justify-between gap-3 border-b px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <div className="bg-primary-soft text-selected-fg flex size-7 items-center justify-center rounded-lg">
              <SlidersHorizontal aria-hidden="true" className="size-4" />
            </div>
            <h2 className="text-title-sm font-semibold tracking-tight">Evidence scope</h2>
            {count > 0 ? (
              <Badge variant="secondary" className="font-medium">
                {count} {count === 1 ? "filter active" : "filters active"}
              </Badge>
            ) : (
              <span className="text-muted-foreground text-xs font-normal">All periods</span>
            )}
          </div>
          <p className="text-body-sm text-muted-foreground mt-1 text-pretty">
            {count > 0
              ? "Showing analytics filtered by the selected academic term and evidence source."
              : "Showing all historical evidence for this program across all terms."}
          </p>
        </div>

        {count > 0 ? (
          <div className="hidden items-center gap-2 lg:flex">
            <Link
              href={buildAnalyticsUrl(programId, { tab: filters.tab })}
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "text-muted-foreground hover:text-foreground"
              )}
            >
              <X data-icon="inline-start" aria-hidden="true" className="size-3.5" />
              Reset filters
            </Link>
          </div>
        ) : null}
      </div>

      <div className="hidden p-4 sm:px-5 lg:block">
        <FilterForm
          programId={programId}
          filters={filters}
          options={options}
          hasPeriodOptions={hasPeriodOptions}
        />
      </div>

      <div className="p-3 lg:hidden">
        <Drawer open={drawerOpen} onOpenChange={setDrawerOpen} showSwipeHandle>
          <DrawerTrigger
            render={
              <Button variant="outline" className="min-h-11 w-full justify-between sm:min-h-9">
                <span className="flex items-center gap-2">
                  <Filter className="text-muted-foreground size-4" aria-hidden="true" />
                  <span>Scope filters</span>
                </span>
                <span className="text-muted-foreground font-normal">
                  {count > 0 ? `${count} active` : "All periods"}
                </span>
              </Button>
            }
          />
          <DrawerContent className="max-h-[88dvh]">
            <DrawerHeader className="border-border/60 border-b pb-3 text-left">
              <DrawerTitle>Analytics scope filters</DrawerTitle>
              <DrawerDescription>
                Choose the academic term and evidence sources to evaluate.
              </DrawerDescription>
            </DrawerHeader>
            <div className="overflow-y-auto px-4 py-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
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
    </div>
  );
}
// fallow-ignore-next-line complexity
function FilterForm({
  programId,
  filters,
  options,
  drawer = false,
  hasPeriodOptions,
}: Props & { drawer?: boolean; hasPeriodOptions: boolean }) {
  const idPrefix = useId();
  const sourceId = `${idPrefix}-source`;
  const stakeholderId = `${idPrefix}-stakeholder`;
  const termId = `${idPrefix}-term`;
  const count = activeFilterCount(filters);

  return (
    <form
      method="get"
      action={buildAnalyticsUrl(programId)}
      className={cn(
        drawer
          ? "flex flex-col gap-4"
          : "grid grid-cols-1 items-end gap-4 sm:grid-cols-2 lg:grid-cols-12"
      )}
    >
      {filters.tab !== "outcomes" ? <input type="hidden" name="tab" value={filters.tab} /> : null}

      <div className={cn(drawer ? "w-full" : "lg:col-span-4")}>
        <FilterSelect
          id={sourceId}
          label="Evidence source"
          name="evidenceSource"
          value={filters.evidenceSource ?? ""}
          blankLabel="All sources"
          icon={<Layers className="text-muted-foreground size-3.5" aria-hidden="true" />}
          options={[
            { value: "COURSE", label: "Course evaluations" },
            { value: "PROGRAM_WIDE_STUDENT", label: "Program-wide students" },
            { value: "ALUMNI", label: "Alumni" },
            { value: "INDUSTRY", label: "Industry partners" },
          ]}
        />
      </div>

      {filters.evidenceSource !== "COURSE" ? (
        <div className={cn(drawer ? "w-full" : "lg:col-span-3")}>
          <FilterSelect
            id={stakeholderId}
            label="Stakeholder"
            name="stakeholder"
            value={filters.stakeholder ?? ""}
            blankLabel="All stakeholders"
            icon={<UserCheck className="text-muted-foreground size-3.5" aria-hidden="true" />}
            options={[
              { value: "STUDENT", label: "Students" },
              { value: "ALUMNI", label: "Alumni" },
              { value: "INDUSTRY_PARTNER", label: "Industry partners" },
            ]}
          />
        </div>
      ) : null}

      {hasPeriodOptions ? (
        <div
          className={cn(
            drawer
              ? "w-full"
              : filters.evidenceSource !== "COURSE"
                ? "lg:col-span-3"
                : "lg:col-span-6"
          )}
        >
          <FilterSelect
            id={termId}
            label="Academic Term"
            name="termInstanceId"
            value={filters.termInstanceId ?? ""}
            blankLabel="All academic terms"
            icon={<Calendar className="text-muted-foreground size-3.5" aria-hidden="true" />}
            options={options.termInstances.map((item) => ({
              value: item.id,
              label: item.label,
            }))}
          />
        </div>
      ) : null}

      <div
        className={cn(
          "flex items-center gap-2 pt-1",
          drawer
            ? "bg-background border-border/60 sticky bottom-0 border-t pt-3 pb-1"
            : "lg:col-span-2 lg:justify-end"
        )}
      >
        <Button
          type="submit"
          size="default"
          className={cn(drawer ? "min-h-11 flex-1 sm:min-h-9" : "w-full")}
        >
          Apply
        </Button>
        {count > 0 ? (
          <Link
            href={buildAnalyticsUrl(programId, { tab: filters.tab })}
            className={cn(
              buttonVariants({ variant: "outline", size: "default" }),
              drawer ? "min-h-11 px-4 sm:min-h-9" : "lg:hidden"
            )}
          >
            Reset
          </Link>
        ) : null}
      </div>
    </form>
  );
}

function activeFilterCount(filters: AnalyticsFilterState): number {
  return [filters.termInstanceId, filters.evidenceSource, filters.stakeholder].filter(Boolean)
    .length;
}

type OptionItem = { value: string; label: string };

function FilterSelect({
  id,
  label,
  name,
  value,
  blankLabel,
  options,
  icon,
}: {
  id: string;
  label: string;
  name: string;
  value: string;
  blankLabel: string;
  options: OptionItem[];
  icon?: React.ReactNode;
}) {
  const allOptions = [{ value: "", label: blankLabel }, ...options];

  return (
    <Field className="gap-1.5">
      <FieldLabel
        htmlFor={id}
        className="text-label-sm text-foreground flex items-center gap-1.5 font-medium"
      >
        {icon}
        <span>{label}</span>
      </FieldLabel>
      <Select name={name} defaultValue={value} items={allOptions}>
        <SelectTrigger
          id={id}
          className="bg-background border-input/80 hover:border-input focus-visible:ring-ring min-h-10 w-full focus-visible:ring-2 sm:min-h-8"
        >
          <SelectValue placeholder={blankLabel} />
        </SelectTrigger>
        <SelectContent align="start" className="max-w-(--anchor-width) min-w-48">
          <SelectGroup>
            {allOptions.map((opt) => (
              <SelectItem key={opt.value || "all"} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </Field>
  );
}
