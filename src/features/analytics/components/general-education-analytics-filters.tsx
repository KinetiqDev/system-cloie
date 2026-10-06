"use client";

import Link from "next/link";
import { useState, useId, type FormEvent, type ReactNode } from "react";
import {
  BookOpen,
  Calendar,
  Filter,
  GraduationCap,
  Layers,
  SlidersHorizontal,
  Target,
  Users,
  X,
} from "lucide-react";
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
import { Spinner } from "@/components/ui/spinner";
import type { GeneralEducationAnalyticsOptions } from "@/features/analytics/general-education-analytics-types";
import type { GeneralEducationAnalyticsFilterState } from "@/features/analytics/services/general-education-analytics-state";
import { buildGeneralEducationAnalyticsUrl } from "@/features/analytics/services/general-education-analytics-state";
import { cn } from "@/lib/utils";
import { useGeneralEducationAnalyticsNavigation } from "./general-education-analytics-workspace";

type OptionItem = { value: string; label: string };

type Props = {
  filters: GeneralEducationAnalyticsFilterState;
  options: GeneralEducationAnalyticsOptions;
};

/**
 * The academic period the coordinator submitted: one school year, one semester
 * within it, and at most one academic term within that semester.
 */
type PeriodDraft = {
  schoolYearId?: string;
  semester?: GeneralEducationAnalyticsFilterState["semester"];
  termInstanceId?: string;
};

/**
 * Resolve the submitted period against the option catalog. A child survives
 * only when the term instances behind it belong to the selected school year and
 * semester, so a URL can never carry a semester or term the evidence read would
 * never match. An empty parent constrains nothing, so it never discards a child.
 */
function resolvePeriod(options: GeneralEducationAnalyticsOptions, draft: PeriodDraft): PeriodDraft {
  // Each level narrows the next, so one pass over the catalog resolves the whole
  // period against its chosen school year and semester.
  const inSemester = options.termInstances.filter(
    (instance) =>
      (draft.schoolYearId === undefined || instance.schoolYearId === draft.schoolYearId) &&
      (draft.semester === undefined || instance.semester === draft.semester)
  );

  return {
    schoolYearId: draft.schoolYearId,
    semester: inSemester.length > 0 ? draft.semester : undefined,
    termInstanceId: inSemester.some((instance) => instance.id === draft.termInstanceId)
      ? draft.termInstanceId
      : undefined,
  };
}

/** Distinct semesters behind one school year's term instances, in catalog order. */
function semesterOptionsFor(
  options: GeneralEducationAnalyticsOptions,
  schoolYearId: string | undefined
): OptionItem[] {
  if (schoolYearId === undefined) return options.semesters;
  return options.termInstances
    .filter((instance) => instance.schoolYearId === schoolYearId)
    .map((instance) => ({ value: instance.semester, label: instance.semesterLabel }))
    .filter((entry, index, all) => all.findIndex((item) => item.value === entry.value) === index);
}

/**
 * The filter grid. The desktop card lays the controls out in aligned columns
 * beside the apply row; the mobile drawer stacks them in one column.
 */
function FilterGrid({ drawer, children }: { drawer: boolean; children: ReactNode }) {
  return (
    <div
      className={cn(
        drawer
          ? "flex flex-col gap-4"
          : "grid grid-cols-1 items-end gap-4 sm:grid-cols-2 lg:grid-cols-10"
      )}
    >
      {children}
    </div>
  );
}

/** One filter control in the grid: full width in the drawer, two columns wide
 * on the desktop card. */
function FilterField({ children }: { children: ReactNode }) {
  return <div className="w-full lg:col-span-2">{children}</div>;
}

function FilterSelect({
  id,
  label,
  name,
  value,
  blankLabel,
  options,
  icon,
  disabled,
}: {
  id: string;
  label: string;
  name: string;
  value: string;
  blankLabel: string;
  options: OptionItem[];
  icon?: ReactNode;
  disabled?: boolean;
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
      <Select
        key={`${name}:${value}`}
        name={name}
        defaultValue={value}
        items={allOptions}
        disabled={disabled}
      >
        <SelectTrigger
          id={id}
          className="bg-background border-input/80 hover:border-input focus-visible:ring-ring min-h-10 w-full focus-visible:ring-2 sm:min-h-8"
        >
          <SelectValue placeholder={blankLabel} />
        </SelectTrigger>
        <SelectContent align="start" className="max-w-(--anchor-width) min-w-48">
          <SelectGroup>
            {allOptions.map((option) => (
              <SelectItem key={option.value || "all"} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </Field>
  );
}

function formValue(data: FormData, name: string): string | undefined {
  const value = data.get(name);
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function activeFilterCount(filters: GeneralEducationAnalyticsFilterState): number {
  return [
    filters.schoolYearId,
    filters.semester,
    filters.termInstanceId,
    filters.courseId,
    filters.programId,
    filters.yearLevel,
    filters.iloId,
  ].filter(Boolean).length;
}

export function GeneralEducationAnalyticsFilters({ filters, options }: Props) {
  const { isPending, navigate } = useGeneralEducationAnalyticsNavigation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const count = activeFilterCount(filters);

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const period = resolvePeriod(options, {
      schoolYearId: formValue(data, "schoolYearId"),
      semester: formValue(data, "semester") as GeneralEducationAnalyticsFilterState["semester"],
      termInstanceId: formValue(data, "termInstanceId"),
    });

    setDrawerOpen(false);
    navigate(
      buildGeneralEducationAnalyticsUrl({
        tab: filters.tab,
        ...period,
        courseId: formValue(data, "courseId"),
        programId: formValue(data, "programId"),
        yearLevel: formValue(
          data,
          "yearLevel"
        ) as GeneralEducationAnalyticsFilterState["yearLevel"],
        // The ILO deep link belongs to the Outcomes view only.
        iloId: filters.tab === "outcomes" ? formValue(data, "iloId") : undefined,
      })
    );
  }

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
              ? "Showing General Education evidence filtered by the selected academic scope, course, program, year level, or outcome."
              : "Showing every General Education course-bound response across all academic periods."}
          </p>
        </div>

        {count > 0 ? (
          <div className="hidden items-center gap-2 lg:flex">
            <Link
              href={buildGeneralEducationAnalyticsUrl({ tab: filters.tab })}
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
          filters={filters}
          options={options}
          isPending={isPending}
          onSubmit={applyFilters}
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
                Choose the academic period and the General Education course, program, year level, or
                outcome to evaluate.
              </DrawerDescription>
            </DrawerHeader>
            <div className="overflow-y-auto px-4 py-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
              <FilterForm
                filters={filters}
                options={options}
                isPending={isPending}
                onSubmit={applyFilters}
                drawer
              />
            </div>
          </DrawerContent>
        </Drawer>
      </div>
    </div>
  );
}

function FilterForm({
  filters,
  options,
  drawer = false,
  isPending,
  onSubmit,
}: Props & {
  drawer?: boolean;
  isPending: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const idPrefix = useId();
  const count = activeFilterCount(filters);

  return (
    <form onSubmit={onSubmit} aria-busy={isPending || undefined} className="flex flex-col gap-4">
      {filters.tab !== "outcomes" ? <input type="hidden" name="tab" value={filters.tab} /> : null}

      <FilterGrid drawer={drawer}>
        <PeriodSelects filters={filters} options={options} idPrefix={idPrefix} />
        <ScopeSelects filters={filters} options={options} idPrefix={idPrefix} />
      </FilterGrid>

      <div
        className={cn(
          "flex items-center gap-2",
          drawer && "bg-background border-border/60 sticky bottom-0 border-t pt-3 pb-1"
        )}
      >
        <Button
          type="submit"
          size="default"
          disabled={isPending}
          className={cn(drawer ? "min-h-11 flex-1 sm:min-h-9" : "w-full")}
        >
          {isPending ? <Spinner data-icon="inline-start" /> : null}
          {isPending ? "Applying filters" : "Apply filters"}
        </Button>
        {count > 0 ? (
          <Link
            href={buildGeneralEducationAnalyticsUrl({ tab: filters.tab })}
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

/**
 * The academic period controls. A school year narrows the semester list, and
 * the term list follows the committed period so no control offers a choice the
 * submitted period cannot keep.
 */
function PeriodSelects({ filters, options, idPrefix }: Props & { idPrefix: string }) {
  // The term list follows the committed school year, so a control never offers
  // a term the submitted period would immediately discard.
  const termInstances = options.termInstances.filter(
    (instance) =>
      filters.schoolYearId === undefined || instance.schoolYearId === filters.schoolYearId
  );

  return (
    <>
      <FilterField>
        <FilterSelect
          id={`${idPrefix}-school-year`}
          label="School Year"
          name="schoolYearId"
          value={filters.schoolYearId ?? ""}
          blankLabel="All school years"
          icon={<Calendar className="text-muted-foreground size-3.5" aria-hidden="true" />}
          options={options.schoolYears.map((entry) => ({ value: entry.id, label: entry.label }))}
        />
      </FilterField>

      <FilterField>
        <FilterSelect
          id={`${idPrefix}-semester`}
          label="Semester"
          name="semester"
          value={filters.semester ?? ""}
          blankLabel="All semesters"
          disabled={options.semesters.length === 0}
          icon={<Layers className="text-muted-foreground size-3.5" aria-hidden="true" />}
          options={semesterOptionsFor(options, filters.schoolYearId)}
        />
      </FilterField>

      <FilterField>
        <FilterSelect
          id={`${idPrefix}-term`}
          label="Academic Term"
          name="termInstanceId"
          value={filters.termInstanceId ?? ""}
          blankLabel="All academic terms"
          disabled={termInstances.length === 0}
          icon={<Calendar className="text-muted-foreground size-3.5" aria-hidden="true" />}
          options={termInstances.map((instance) => ({ value: instance.id, label: instance.label }))}
        />
      </FilterField>
    </>
  );
}

/**
 * The evidence scope controls: which course, class context, year level, and —
 * on Outcomes only — which Institutional Learning Outcome the read reports.
 */
function ScopeSelects({ filters, options, idPrefix }: Props & { idPrefix: string }) {
  return (
    <>
      <FilterField>
        <FilterSelect
          id={`${idPrefix}-course`}
          label="Course"
          name="courseId"
          value={filters.courseId ?? ""}
          blankLabel="All General Education courses"
          disabled={options.courses.length === 0}
          icon={<BookOpen className="text-muted-foreground size-3.5" aria-hidden="true" />}
          options={options.courses.map((course) => ({ value: course.id, label: course.label }))}
        />
      </FilterField>

      <FilterField>
        <FilterSelect
          id={`${idPrefix}-program`}
          label="Class Program"
          name="programId"
          value={filters.programId ?? ""}
          blankLabel="All programs"
          disabled={options.programs.length === 0}
          icon={<GraduationCap className="text-muted-foreground size-3.5" aria-hidden="true" />}
          options={options.programs.map((program) => ({ value: program.id, label: program.label }))}
        />
      </FilterField>

      <FilterField>
        <FilterSelect
          id={`${idPrefix}-year-level`}
          label="Year Level"
          name="yearLevel"
          value={filters.yearLevel ?? ""}
          blankLabel="All year levels"
          disabled={options.yearLevels.length === 0}
          icon={<Users className="text-muted-foreground size-3.5" aria-hidden="true" />}
          options={options.yearLevels.map((level) => ({ value: level.value, label: level.label }))}
        />
      </FilterField>

      {filters.tab !== "outcomes" ? null : (
        <FilterField>
          <FilterSelect
            id={`${idPrefix}-ilo`}
            label="Institutional Learning Outcome"
            name="iloId"
            value={filters.iloId ?? ""}
            blankLabel="All learning outcomes"
            disabled={options.ilos.length === 0}
            icon={<Target className="text-muted-foreground size-3.5" aria-hidden="true" />}
            options={options.ilos.map((outcome) => ({ value: outcome.id, label: outcome.label }))}
          />
        </FilterField>
      )}
    </>
  );
}
