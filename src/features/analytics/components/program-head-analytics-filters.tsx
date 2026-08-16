import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ProgramHeadAnalyticsPeriodOptions } from "@/features/analytics/program-head-analytics-types";
import type { AnalyticsFilterState } from "@/features/analytics/services/program-head-analytics-state";
import { buildAnalyticsUrl } from "@/features/analytics/services/program-head-analytics-state";

type ProgramHeadAnalyticsFiltersProps = {
  programId: string;
  filters: AnalyticsFilterState;
  options: ProgramHeadAnalyticsPeriodOptions;
};

export function ProgramHeadAnalyticsFilters({
  programId,
  filters,
  options,
}: ProgramHeadAnalyticsFiltersProps) {
  const hasOptions = options.schoolYears.length > 0 || options.semesters.length > 0 || options.termInstances.length > 0;
  if (!hasOptions) return null;

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Analytics scope</CardTitle>
      </CardHeader>
      <CardContent>
        <form method="get" action={buildAnalyticsUrl(programId)} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {filters.tab !== "overview" ? <input type="hidden" name="tab" value={filters.tab} /> : null}
          {options.schoolYears.length > 0 ? (
            <label className="flex min-w-0 flex-col gap-1.5 text-label-md text-foreground">
              School Year
              <select
                name="schoolYearId"
                defaultValue={filters.schoolYearId ?? ""}
                className="h-11 rounded-lg border border-border bg-background px-3 text-body-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">All school years</option>
                {options.schoolYears.map((option) => (
                  <option key={option.id} value={option.id}>{option.label}</option>
                ))}
              </select>
            </label>
          ) : null}
          {options.semesters.length > 0 ? (
            <label className="flex min-w-0 flex-col gap-1.5 text-label-md text-foreground">
              Semester
              <select
                name="semester"
                defaultValue={filters.semester ?? ""}
                className="h-11 rounded-lg border border-border bg-background px-3 text-body-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">All semesters</option>
                {options.semesters.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
          ) : null}
          {options.termInstances.length > 0 ? (
            <label className="flex min-w-0 flex-col gap-1.5 text-label-md text-foreground">
              Academic Term
              <select
                name="termInstanceId"
                defaultValue={filters.termInstanceId ?? ""}
                className="h-11 rounded-lg border border-border bg-background px-3 text-body-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">All terms</option>
                {options.termInstances.map((option) => (
                  <option key={option.id} value={option.id}>{option.label}</option>
                ))}
              </select>
            </label>
          ) : null}
          <div className="flex items-end gap-2">
            <Button type="submit" size="sm">Apply filters</Button>
            <Link href={buildAnalyticsUrl(programId, { tab: filters.tab })} className="inline-flex h-11 items-center rounded-lg px-3 text-label-md text-link hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              Reset
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
