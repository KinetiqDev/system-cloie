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
import {
  buildGeneralEducationAnalyticsUrl,
  type GeneralEducationAnalyticsTab,
} from "@/features/analytics/services/general-education-analytics-state";
import { cn } from "@/lib/utils";
import { useGeneralEducationAnalyticsNavigation } from "./general-education-analytics-workspace";

type OptionItem = { value: string; label: string };

type Props = {
  filters: GeneralEducationAnalyticsFilterState;
  options: GeneralEducationAnalyticsOptions;
};

/**
 * Dependent academic choices. A school year constrains the semester list, a
 * semester constrains the term-instance list, and clearing a parent clears its
 * children in the submitted state, so a URL can never carry a semester that
 * belongs to a different school year.
 */
function dependentOptions(
  options: GeneralEducationAnalyticsOptions,
  draft: { schoolYearId?: string; semester?: string }
) {
  const semesters = draft.schoolYearId
    ? options.termInstances
        .filter((instance) => instance.schoolYearId === draft.schoolYearId)
        .map((instance) => ({ value: instance.semester, label: instance.semesterLabel }))
        .filter(
          (entry, index, all) => all.findIndex((item) => item.value === entry.value) === index
        )
    : options.semesters;

  const termInstances = draft.schoolYearId
    ? options.termInstances.filter((instance) => instance.schoolYearId === draft.schoolYearId)
    : options.termInstances;

  return { semesters, termInstances };
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
    const schoolYearId = formValue(data, "schoolYearId");
    const semester = formValue(data, "semester") as
      | GeneralEducationAnalyticsFilterState["semester"]
      | undefined;
    const termInstanceId = formValue(data, "termInstanceId");
    const term = options.termInstances.find((instance) => instance.id === termInstanceId);

    // A child survives only when it is compatible with the chosen parent; an
    // empty parent constrains nothing, so it never discards a valid child.
    const semesterIsCompatible =
      semester !== undefined &&
      (schoolYearId === undefined ||
        options.termInstances.some(
          (instance) => instance.semester === semester && instance.schoolYearId === schoolYearId
        ));
    const termIsCompatible =
      termInstanceId !== undefined &&
      (schoolYearId === undefined || term?.schoolYearId === schoolYearId);

    const nextFilters: GeneralEducationAnalyticsFilterState = {
      tab: filters.tab,
      schoolYearId,
      semester: semesterIsCompatible ? semester : undefined,
      termInstanceId: termIsCompatible ? termInstanceId : undefined,
      courseId: formValue(data, "courseId"),
      programId: formValue(data, "programId"),
      yearLevel: formValue(data, "yearLevel") as GeneralEducationAnalyticsFilterState["yearLevel"],
      // The ILO deep link belongs to the Outcomes view only.
      iloId: filters.tab === "outcomes" ? formValue(data, "iloId") : undefined,
    };

    setDrawerOpen(false);
    navigate(buildGeneralEducationAnalyticsUrl(nextFilters));
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
  const schoolYearId = `${idPrefix}-school-year`;
  const semesterId = `${idPrefix}-semester`;
  const termId = `${idPrefix}-term`;
  const courseId = `${idPrefix}-course`;
  const programId = `${idPrefix}-program`;
  const yearLevelId = `${idPrefix}-year-level`;
  const iloId = `${idPrefix}-ilo`;
  const count = activeFilterCount(filters);

  // Controls render from the committed URL state; the submitted state resolves
  // dependent academic choices so a child cannot outlive an invalid parent.
  const { semesters, termInstances } = dependentOptions(options, {
    schoolYearId: filters.schoolYearId,
    semester: filters.semester,
  });
  const fieldClass = drawer ? "w-full" : "lg:col-span-2";

  return (
    <form
      onSubmit={onSubmit}
      aria-busy={isPending || undefined}
      className={cn(
        drawer
          ? "flex flex-col gap-4"
          : "grid grid-cols-1 items-end gap-4 sm:grid-cols-2 lg:grid-cols-12"
      )}
    >
      {filters.tab !== "outcomes" ? <input type="hidden" name="tab" value={filters.tab} /> : null}

      <div className={fieldClass}>
        <FilterSelect
          id={schoolYearId}
          label="School Year"
          name="schoolYearId"
          value={filters.schoolYearId ?? ""}
          blankLabel="All school years"
          icon={<Calendar className="text-muted-foreground size-3.5" aria-hidden="true" />}
          options={options.schoolYears.map((entry) => ({ value: entry.id, label: entry.label }))}
        />
      </div>

      <div className={fieldClass}>
        <FilterSelect
          id={semesterId}
          label="Semester"
          name="semester"
          value={filters.semester ?? ""}
          blankLabel="All semesters"
          disabled={options.semesters.length === 0}
          icon={<Layers className="text-muted-foreground size-3.5" aria-hidden="true" />}
          options={semesters}
        />
      </div>

      <div className={fieldClass}>
        <FilterSelect
          id={termId}
          label="Academic Term"
          name="termInstanceId"
          value={filters.termInstanceId ?? ""}
          blankLabel="All academic terms"
          disabled={termInstances.length === 0}
          icon={<Calendar className="text-muted-foreground size-3.5" aria-hidden="true" />}
          options={termInstances.map((instance) => ({ value: instance.id, label: instance.label }))}
        />
      </div>

      <div className={fieldClass}>
        <FilterSelect
          id={courseId}
          label="Course"
          name="courseId"
          value={filters.courseId ?? ""}
          blankLabel="All General Education courses"
          disabled={options.courses.length === 0}
          icon={<BookOpen className="text-muted-foreground size-3.5" aria-hidden="true" />}
          options={options.courses.map((course) => ({ value: course.id, label: course.label }))}
        />
      </div>

      <div className={fieldClass}>
        <FilterSelect
          id={programId}
          label="Class Program"
          name="programId"
          value={filters.programId ?? ""}
          blankLabel="All programs"
          disabled={options.programs.length === 0}
          icon={<GraduationCap className="text-muted-foreground size-3.5" aria-hidden="true" />}
          options={options.programs.map((program) => ({ value: program.id, label: program.label }))}
        />
      </div>

      <div className={fieldClass}>
        <FilterSelect
          id={yearLevelId}
          label="Year Level"
          name="yearLevel"
          value={filters.yearLevel ?? ""}
          blankLabel="All year levels"
          disabled={options.yearLevels.length === 0}
          icon={<Users className="text-muted-foreground size-3.5" aria-hidden="true" />}
          options={options.yearLevels.map((level) => ({ value: level.value, label: level.label }))}
        />
      </div>

      {filters.tab === "outcomes" ? (
        <div className={fieldClass}>
          <FilterSelect
            id={iloId}
            label="Institutional Learning Outcome"
            name="iloId"
            value={filters.iloId ?? ""}
            blankLabel="All learning outcomes"
            disabled={options.ilos.length === 0}
            icon={<Target className="text-muted-foreground size-3.5" aria-hidden="true" />}
            options={options.ilos.map((outcome) => ({ value: outcome.id, label: outcome.label }))}
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
          disabled={isPending}
          className={cn(drawer ? "min-h-11 flex-1 sm:min-h-9" : "w-full")}
        >
          {isPending ? <Spinner data-icon="inline-start" /> : null}
          {isPending ? "Applying filters" : "Apply filters"}
        </Button>
        {count > 0 ? (
          <Link
            href={buildGeneralEducationAnalyticsUrl({
              tab: filters.tab as GeneralEducationAnalyticsTab,
            })}
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
