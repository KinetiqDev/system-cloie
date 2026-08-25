"use client";

import Link from "next/link";
import { ChevronDown, SlidersHorizontal, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { buildProgramHeadProgramPath } from "@/lib/constants/program-head-routes";
import type { ResponseFilterOptions } from "@/features/analytics/services/list-program-head-response-deployments";
import type { ProgramHeadResponsesFilterState } from "@/features/analytics/services/program-head-responses-state";
import { buildProgramHeadResponsesUrl } from "@/features/analytics/services/program-head-responses-state";

export function ProgramHeadResponsesFilters({
  programId,
  state,
  options,
}: {
  programId: string;
  state: ProgramHeadResponsesFilterState;
  options: ResponseFilterOptions;
}) {
  const selectOptions = state.tab === "course" ? options.courses : options.instruments;
  const activeCount = [
    state.q,
    state.schoolYearId,
    state.semester,
    state.termInstanceId,
    state.courseId,
    state.facultyId,
    state.majorId,
    state.yearLevel,
    state.section,
    state.stakeholder,
    state.instrumentTemplateId,
    state.status,
    state.completion,
  ].filter(Boolean).length;

  return (
    <details className="group border-border bg-card rounded-xl border shadow-sm" open>
      <summary className="focus-visible:ring-ring flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-4 py-3 focus-visible:ring-3 focus-visible:outline-none [&::-webkit-details-marker]:hidden">
        <span className="flex min-w-0 items-center gap-2">
          <SlidersHorizontal aria-hidden="true" className="text-muted-foreground" />
          <span className="text-title-sm font-semibold">Filter evaluations</span>
          {activeCount > 0 ? <Badge variant="secondary">{activeCount} active</Badge> : null}
        </span>
        <span className="text-label-md text-muted-foreground flex shrink-0 items-center gap-2">
          <span className="hidden sm:inline">
            {activeCount > 0 ? "Refine results" : "All evaluations"}
          </span>
          <ChevronDown
            aria-hidden="true"
            className="transition-transform group-open:rotate-180 motion-reduce:transition-none"
          />
        </span>
      </summary>
      <div className="border-border border-t p-4">
        <form
          method="get"
          action={buildProgramHeadProgramPath(programId, "responses")}
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        >
          {state.tab !== "course" ? <input type="hidden" name="tab" value={state.tab} /> : null}
          <label className="text-label-md flex min-w-0 flex-col gap-1.5">
            Search
            <input
              type="search"
              name="q"
              defaultValue={state.q ?? ""}
              maxLength={100}
              autoComplete="off"
              placeholder={
                state.tab === "course"
                  ? "Course, title, evaluation or faculty…"
                  : "Evaluation or stakeholder…"
              }
              className="border-input bg-background text-body-md focus-visible:border-ring focus-visible:ring-ring h-11 min-w-0 rounded-lg border px-3 outline-none focus-visible:ring-3"
            />
          </label>
          <Select
            label="School year"
            name="schoolYearId"
            value={state.schoolYearId}
            options={options.periodOptions.schoolYears}
            blank="All school years"
          />
          <Select
            label="Semester"
            name="semester"
            value={state.semester}
            options={options.periodOptions.semesters.map((item) => ({
              id: item.value,
              label: item.label,
            }))}
            blank="All semesters"
          />
          <Select
            label="Academic period"
            name="termInstanceId"
            value={state.termInstanceId}
            options={options.periodOptions.termInstances.map((item) => ({
              id: item.id,
              label: item.label,
            }))}
            blank="All periods"
          />
          {state.tab === "course" ? (
            <>
              <Select
                label="Course"
                name="courseId"
                value={state.courseId}
                options={options.courses}
                blank="All courses"
              />
              <Select
                label="Faculty"
                name="facultyId"
                value={state.facultyId}
                options={options.faculty}
                blank="All faculty"
              />
              <Select
                label="Major"
                name="majorId"
                value={state.majorId}
                options={options.majors}
                blank="All majors"
              />
              <Select
                label="Year level"
                name="yearLevel"
                value={state.yearLevel}
                options={yearLevels}
                blank="All year levels"
              />
              <Select
                label="Section"
                name="section"
                value={state.section}
                options={sections}
                blank="All sections"
              />
            </>
          ) : (
            <>
              <Select
                label="Stakeholder"
                name="stakeholder"
                value={state.stakeholder}
                options={stakeholders}
                blank="All stakeholders"
              />
              <Select
                label="Major"
                name="majorId"
                value={state.majorId}
                options={options.majors}
                blank="All majors"
              />
              <Select
                label="Year level"
                name="yearLevel"
                value={state.yearLevel}
                options={yearLevels}
                blank="All year levels"
              />
              <Select
                label="Evaluation / instrument"
                name="instrumentTemplateId"
                value={state.instrumentTemplateId}
                options={selectOptions}
                blank="All instruments"
              />
            </>
          )}
          <Select
            label="Status"
            name="status"
            value={state.status}
            options={statuses}
            blank="All statuses"
          />
          <Select
            label="Completion"
            name="completion"
            value={state.completion}
            options={completionStates}
            blank="All completion states"
          />
          <div className="flex items-end gap-2 sm:col-span-2 xl:col-span-1">
            <Button type="submit">Apply filters</Button>
            {activeCount > 0 ? (
              <Link
                href={buildProgramHeadResponsesUrl(programId, { tab: state.tab, page: 1 })}
                className={buttonVariants({ variant: "ghost" })}
              >
                <X data-icon="inline-start" aria-hidden="true" />
                Clear
              </Link>
            ) : null}
          </div>
        </form>
      </div>
    </details>
  );
}

const yearLevels = ["FIRST_YEAR", "SECOND_YEAR", "THIRD_YEAR", "FOURTH_YEAR"].map((id) => ({
  id,
  label: id.replace("_", " "),
}));
const sections = ["MORNING", "AFTERNOON", "EVENING"].map((id) => ({ id, label: id }));
const stakeholders = [
  { id: "STUDENT", label: "Students" },
  { id: "ALUMNI", label: "Alumni" },
  { id: "INDUSTRY_PARTNER", label: "Industry partners" },
];
const statuses = ["SCHEDULED", "ACTIVE", "CLOSED", "ARCHIVED"].map((id) => ({
  id,
  label: id,
}));
const completionStates = [
  { id: "zero", label: "No responses" },
  { id: "partial", label: "In progress" },
  { id: "complete", label: "Complete" },
];

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
  options: Array<{ id: string; label: string }>;
  blank: string;
}) {
  return (
    <label className="text-label-md flex min-w-0 flex-col gap-1.5">
      {label}
      <select
        name={name}
        defaultValue={value ?? ""}
        className="border-input bg-background text-body-md focus-visible:border-ring focus-visible:ring-ring h-11 min-w-0 rounded-lg border px-3 outline-none focus-visible:ring-3"
      >
        <option value="">{blank}</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
