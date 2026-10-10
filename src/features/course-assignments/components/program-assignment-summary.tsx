import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buildProgramHeadCourseAssignmentsPath } from "@/lib/constants/program-head-routes";
import { getSectionLabel } from "@/lib/constants/academic";
import { getYearLevelDisplay } from "@/lib/constants/year-levels";
import { readProgramAssignmentSummary } from "../services/read-program-assignment-summary";
import type { DashboardPeriodFilters } from "@/features/analytics/services/get-program-head-dashboard";

export async function ProgramAssignmentSummary({
  programId,
  filters,
}: {
  programId: string;
  filters: DashboardPeriodFilters;
}) {
  const summary = await readProgramAssignmentSummary(programId, filters);
  if (!summary) return null;
  const listPath = buildProgramHeadCourseAssignmentsPath(programId);
  const href = summary.termId
    ? `${listPath}?termInstanceId=${encodeURIComponent(summary.termId)}`
    : `${listPath}?termInstanceId=all`;
  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle>Course assignments</CardTitle>
        <Link
          href={href}
          className="text-primary text-body-sm inline-flex min-h-11 items-center font-medium underline-offset-4 hover:underline"
        >
          {summary.termId
            ? `View assignments (${summary.total})`
            : "View assignments across all periods"}
        </Link>
      </CardHeader>
      <CardContent>
        {summary.assignments.length === 0 ? (
          <p className="text-muted-foreground text-body-sm">
            No active course assignments in this period.
          </p>
        ) : (
          <ul className="divide-y">
            {summary.assignments.map((assignment) => (
              <li
                key={assignment.id}
                className="flex min-w-0 flex-col gap-1 py-3 first:pt-0 last:pb-0"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-body-sm font-medium break-words">
                    {assignment.course.code} · {assignment.course.title}
                  </span>
                  {assignment.course.course_scope === "GENERAL_EDUCATION" && (
                    <Badge variant="secondary">General Education</Badge>
                  )}
                </div>
                <p className="text-muted-foreground text-body-sm break-words">
                  {assignment.faculty.name} · {assignment.program.code} ·{" "}
                  {getYearLevelDisplay(assignment.year_level)} ·{" "}
                  {getSectionLabel(assignment.section)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
