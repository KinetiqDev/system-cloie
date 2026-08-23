import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import { TargetStakeholder } from "@prisma/client";
import type { ParticipationSummary } from "@/features/analytics/aggregators/types";

const STAKEHOLDER_LABELS: Record<TargetStakeholder, string> = {
  [TargetStakeholder.STUDENT]: "Students",
  [TargetStakeholder.ALUMNI]: "Alumni",
  [TargetStakeholder.INDUSTRY_PARTNER]: "Industry Partners",
};

function shareOf(count: number, total: number): number {
  return total === 0 ? 0 : (count / total) * 100;
}

/**
 * Response progress by stakeholder (spec §13.6): one keyboard-operable link
 * row per stakeholder with a 100% stacked bar; percentage and raw counts stay
 * visible without hover. Rows open Analytics > Stakeholders preserving the
 * dashboard's period scope.
 */
export function ProgramHeadStakeholderProgress({
  participation,
  stakeholdersHref,
}: {
  participation: ParticipationSummary;
  stakeholdersHref: string;
}) {
  const rows = participation.stakeholders;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-bold">Response progress by stakeholder</CardTitle>
        <CardDescription>
          Assignment completion per stakeholder; the raw denominator stays visible.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {rows.length === 0 ? (
          <Empty>
            <EmptyTitle>No eligible evaluation assignments</EmptyTitle>
            <EmptyDescription>
              Nothing was assigned in this period yet, so there is no progress to chart.
            </EmptyDescription>
          </Empty>
        ) : (
          rows.map((row) => (
            <Link
              key={row.stakeholder}
              href={stakeholdersHref}
              className="focus-visible:ring-ring -mx-2 grid grid-cols-[6.5rem_minmax(0,1fr)_auto] items-center gap-3 rounded-lg px-2 py-1.5 focus-visible:ring-2 focus-visible:outline-none"
              aria-label={`${STAKEHOLDER_LABELS[row.stakeholder]}: ${row.submitted} of ${row.assigned} submitted, ${Math.round((row.completionRate ?? 0) * 100)} percent complete, ${row.inProgress} in progress, ${row.notStarted} not started`}
            >
              <span className="truncate text-xs font-semibold">
                {STAKEHOLDER_LABELS[row.stakeholder]}
              </span>
              <span
                aria-hidden="true"
                className="bg-muted flex h-3 overflow-hidden rounded-full"
              >
                <span
                  className="h-full"
                  style={{
                    width: `${shareOf(row.submitted, row.assigned)}%`,
                    backgroundColor: "var(--chart-1)",
                  }}
                />
                <span
                  className="h-full"
                  style={{
                    width: `${shareOf(row.inProgress, row.assigned)}%`,
                    backgroundColor: "var(--chart-2)",
                  }}
                />
                <span
                  className="bg-border h-full"
                  style={{ width: `${shareOf(row.notStarted, row.assigned)}%` }}
                />
              </span>
              <span className="text-right text-[11px] leading-tight">
                <span className="tabular-nums block font-bold">
                  {Math.round((row.completionRate ?? 0) * 100)}%
                </span>
                <span className="tabular-nums text-muted-foreground block">
                  {row.submitted} / {row.assigned}
                </span>
              </span>
            </Link>
          ))
        )}
        <div className="text-muted-foreground mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true" className="size-2 rounded-sm" style={{ backgroundColor: "var(--chart-1)" }} />
            Submitted
          </span>
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true" className="size-2 rounded-sm" style={{ backgroundColor: "var(--chart-2)" }} />
            In progress
          </span>
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true" className="bg-border size-2 rounded-sm" />
            Not started
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
