"use client";

import Link from "next/link";
import { SlidersHorizontal } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { buildProgramHeadProgramPath } from "@/lib/constants/program-head-routes";
import type { ResponseFilterOptions } from "@/features/analytics/services/list-program-head-response-deployments";
import type { ProgramHeadResponsesFilterState } from "@/features/analytics/services/program-head-responses-state";
import { buildProgramHeadResponsesUrl } from "@/features/analytics/services/program-head-responses-state";

export function ProgramHeadResponsesFilters({ programId, state, options }: { programId: string; state: ProgramHeadResponsesFilterState; options: ResponseFilterOptions }) {
  const selectOptions = state.tab === "course" ? options.courses : options.instruments;
  return (
    <Card size="sm">
      <CardHeader><CardTitle><SlidersHorizontal className="mr-2 inline size-4" />Response filters</CardTitle></CardHeader>
      <CardContent>
        <form method="get" action={buildProgramHeadProgramPath(programId, "responses")} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {state.tab !== "course" ? <input type="hidden" name="tab" value={state.tab} /> : null}
          <label className="flex flex-col gap-1.5 text-label-md">Search<input type="search" name="q" defaultValue={state.q ?? ""} maxLength={100} placeholder={state.tab === "course" ? "Course, title, evaluation or faculty" : "Evaluation or stakeholder"} className="h-11 rounded-lg border border-border bg-background px-3 text-body-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" /></label>
          <Select label="School year" name="schoolYearId" value={state.schoolYearId} options={options.periodOptions.schoolYears} blank="All school years" />
          <Select label="Semester" name="semester" value={state.semester} options={options.periodOptions.semesters.map((item) => ({ id: item.value, label: item.label }))} blank="All semesters" />
          <Select label="Academic period" name="termInstanceId" value={state.termInstanceId} options={options.periodOptions.termInstances.map((item) => ({ id: item.id, label: item.label }))} blank="All periods" />
          {state.tab === "course" ? <>
            <Select label="Course" name="courseId" value={state.courseId} options={options.courses} blank="All courses" />
            <Select label="Faculty" name="facultyId" value={state.facultyId} options={options.faculty} blank="All faculty" />
            <Select label="Major" name="majorId" value={state.majorId} options={options.majors} blank="All majors" />
            <Select label="Year level" name="yearLevel" value={state.yearLevel} options={["FIRST_YEAR", "SECOND_YEAR", "THIRD_YEAR", "FOURTH_YEAR"].map((id) => ({ id, label: id.replace("_", " ") }))} blank="All year levels" />
            <Select label="Section" name="section" value={state.section} options={["MORNING", "AFTERNOON", "EVENING"].map((id) => ({ id, label: id }))} blank="All sections" />
          </> : <>
            <Select label="Stakeholder" name="stakeholder" value={state.stakeholder} options={[{ id: "STUDENT", label: "Students" }, { id: "ALUMNI", label: "Alumni" }, { id: "INDUSTRY_PARTNER", label: "Industry partners" }]} blank="All stakeholders" />
            <Select label="Major" name="majorId" value={state.majorId} options={options.majors} blank="All majors" />
            <Select label="Year level" name="yearLevel" value={state.yearLevel} options={["FIRST_YEAR", "SECOND_YEAR", "THIRD_YEAR", "FOURTH_YEAR"].map((id) => ({ id, label: id.replace("_", " ") }))} blank="All year levels" />
            <Select label="Evaluation / instrument" name="instrumentTemplateId" value={state.instrumentTemplateId} options={selectOptions} blank="All instruments" />
          </>}
          <Select label="Status" name="status" value={state.status} options={["SCHEDULED", "ACTIVE", "CLOSED", "ARCHIVED"].map((id) => ({ id, label: id }))} blank="All statuses" />
          <Select label="Completion" name="completion" value={state.completion} options={[{ id: "zero", label: "No responses" }, { id: "partial", label: "In progress" }, { id: "complete", label: "Complete" }]} blank="All completion" />
          <div className="flex items-end gap-2"><Button type="submit" size="sm">Apply filters</Button><Link href={buildProgramHeadResponsesUrl(programId, { tab: state.tab, page: 1 })} className="inline-flex min-h-11 items-center rounded-lg px-3 text-label-md text-link hover:underline">Reset</Link></div>
        </form>
      </CardContent>
    </Card>
  );
}

function Select({ label, name, value, options, blank }: { label: string; name: string; value?: string; options: Array<{ id: string; label: string }>; blank: string }) {
  return <label className="flex min-w-0 flex-col gap-1.5 text-label-md">{label}<select name={name} defaultValue={value ?? ""} className="h-11 rounded-lg border border-border bg-background px-3 text-body-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><option value="">{blank}</option>{options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label>;
}
