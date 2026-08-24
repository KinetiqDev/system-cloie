"use client";

import Link from "next/link";
import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import type { ProgramHeadAnalyticsPeriodOptions } from "@/features/analytics/program-head-analytics-types";
import type { AnalyticsFilterState } from "@/features/analytics/services/program-head-analytics-state";
import { buildAnalyticsUrl } from "@/features/analytics/services/program-head-analytics-state";

type Props = { programId: string; filters: AnalyticsFilterState; options: ProgramHeadAnalyticsPeriodOptions };

export function ProgramHeadAnalyticsFilters({ programId, filters, options }: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const hasPeriodOptions = options.schoolYears.length > 0 || options.semesters.length > 0 || options.termInstances.length > 0;
  const activeCount = [filters.schoolYearId, filters.semester, filters.termInstanceId, filters.evidenceSource, filters.stakeholder].filter(Boolean).length;
  return (
    <>
      <Card size="sm" className="hidden lg:block"><CardHeader><CardTitle>Analytics scope</CardTitle></CardHeader><CardContent><FilterForm programId={programId} filters={filters} options={options} hasPeriodOptions={hasPeriodOptions} /></CardContent></Card>
      <Card size="sm" className="lg:hidden" aria-label="Analytics scope filters"><CardHeader><CardTitle>Analytics scope</CardTitle></CardHeader><CardContent><Drawer open={drawerOpen} onOpenChange={setDrawerOpen}><DrawerTrigger render={<Button variant="outline" className="w-full justify-between"><span className="inline-flex items-center gap-2"><SlidersHorizontal aria-hidden="true" className="size-4" />Filters</span><span className="inline-flex items-center gap-2">{activeCount ? <Badge variant="secondary">{activeCount} active</Badge> : <span className="text-muted-foreground">All periods</span>}</span></Button>} /><DrawerContent className="max-h-[85dvh]"><DrawerHeader className="text-left"><DrawerTitle>Analytics scope filters</DrawerTitle><DrawerDescription>Choose evidence source, stakeholder, and academic period for this analytics workspace.</DrawerDescription></DrawerHeader><FilterForm programId={programId} filters={filters} options={options} drawer hasPeriodOptions={hasPeriodOptions} /></DrawerContent></Drawer></CardContent></Card>
    </>
  );
}

function FilterForm({ programId, filters, options, drawer = false, hasPeriodOptions }: Props & { drawer?: boolean; hasPeriodOptions: boolean }) {
  const layoutClass = drawer ? "flex flex-col gap-4" : "grid gap-4 sm:grid-cols-2 lg:grid-cols-4";
  const actionsClass = drawer ? "flex items-center gap-2" : "flex items-end gap-2";
  return <form method="get" action={buildAnalyticsUrl(programId)} className={layoutClass}>
    {filters.tab !== "outcomes" ? <input type="hidden" name="tab" value={filters.tab} /> : null}
    <Select label="Evidence source" name="evidenceSource" value={filters.evidenceSource} options={[{ value: "COURSE", label: "Course evaluations" }, { value: "PROGRAM_WIDE_STUDENT", label: "Program-wide students" }, { value: "ALUMNI", label: "Alumni" }, { value: "INDUSTRY", label: "Industry partners" }]} blank="All evidence sources" />
    {filters.evidenceSource !== "COURSE" ? <Select label="Stakeholder" name="stakeholder" value={filters.stakeholder} options={[{ value: "STUDENT", label: "Students" }, { value: "ALUMNI", label: "Alumni" }, { value: "INDUSTRY_PARTNER", label: "Industry partners" }]} blank="All stakeholders" /> : null}
    {hasPeriodOptions ? <>
      <Select label="School Year" name="schoolYearId" value={filters.schoolYearId} options={options.schoolYears.map((x) => ({ value: x.id, label: x.label }))} blank="All school years" />
      <Select label="Semester" name="semester" value={filters.semester} options={options.semesters} blank="All semesters" />
      <Select label="Academic Term" name="termInstanceId" value={filters.termInstanceId} options={options.termInstances.map((x) => ({ value: x.id, label: x.label }))} blank="All terms" />
    </> : null}
    <div className={actionsClass}><Button type="submit" size="sm" className={drawer ? "flex-1" : undefined}>Apply filters</Button><Link href={buildAnalyticsUrl(programId, { tab: filters.tab })} className="inline-flex min-h-11 items-center rounded-lg px-3 text-label-md text-link hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Reset</Link></div>
  </form>;
}

function Select({ label, name, value, options, blank }: { label: string; name: string; value?: string; options: Array<{ value: string; label: string }>; blank: string }) {
  return <label className="flex min-w-0 flex-col gap-1.5 text-label-md text-foreground">{label}<select name={name} defaultValue={value ?? ""} className="h-11 rounded-lg border border-border bg-background px-3 text-body-md outline-none focus-visible:ring-2 focus-visible:ring-ring"><option value="">{blank}</option>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
}
