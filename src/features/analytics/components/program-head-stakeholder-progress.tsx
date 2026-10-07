import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { ParticipationSummary } from "@/features/analytics/aggregators/types";
import { STAKEHOLDER_LABELS } from "@/features/analytics/program-head-dashboard-labels";

const SEGMENTS = [
  { label: "Submitted", color: "var(--chart-1)" },
  { label: "In progress", color: "var(--chart-2)" },
  { label: "Not started", color: "var(--border-default)" },
] as const;

/**
 * Response progress by stakeholder (spec §13.6): one link row per stakeholder
 * with a 100% stacked bar. Percentage, submitted / assigned, and the distinct
 * respondent count stay visible without hover; rows open Analytics >
 * Stakeholders in the dashboard's period scope.
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
    <Card className="gap-3">
      <CardHeader>
        <h2 className="text-heading-lg">Response progress</h2>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        {rows.length === 0 ? (
          <p className="text-body-sm text-text-secondary py-2">
            No evaluations are assigned in this period yet.
          </p>
        ) : (
          <>
            {rows.map((row) => {
              const label =
                STAKEHOLDER_LABELS[row.stakeholder] ??
                row.stakeholder.replaceAll("_", " ").toLowerCase();
              const percent = Math.round((row.completionRate ?? 0) * 100);
              return (
                <Link
                  key={row.stakeholder}
                  href={stakeholdersHref}
                  aria-label={`${label}: ${row.respondentCount.toLocaleString()} ${row.respondentCount === 1 ? "respondent" : "respondents"}, ${row.submitted.toLocaleString()} of ${row.assigned.toLocaleString()} assignments submitted, ${percent} percent complete, ${row.inProgress.toLocaleString()} in progress, ${row.notStarted.toLocaleString()} not started`}
                  className="hover:bg-surface-hover focus-visible:ring-ring -mx-2 flex flex-col gap-1.5 rounded-lg px-2 py-2 transition-colors focus-visible:ring-2 focus-visible:outline-none motion-reduce:transition-none"
                >
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="text-title-sm text-text-primary min-w-0">
                      {label}
                      <span className="text-body-sm text-text-secondary ml-2 font-normal tabular-nums">
                        {row.respondentCount.toLocaleString()}{" "}
                        {row.respondentCount === 1 ? "respondent" : "respondents"}
                      </span>
                    </span>
                    <span className="text-body-sm text-text-secondary shrink-0 tabular-nums">
                      <span className="text-title-sm text-text-primary">{percent}%</span>{" "}
                      {row.submitted.toLocaleString()}/{row.assigned.toLocaleString()}
                    </span>
                  </span>
                  <span
                    aria-hidden="true"
                    className="bg-muted flex h-2 overflow-hidden rounded-full"
                  >
                    {[row.submitted, row.inProgress, row.notStarted].map((count, index) => (
                      <span
                        key={SEGMENTS[index].label}
                        style={{
                          width: `${row.assigned === 0 ? 0 : (count / row.assigned) * 100}%`,
                          backgroundColor: SEGMENTS[index].color,
                        }}
                      />
                    ))}
                  </span>
                </Link>
              );
            })}
            <ul
              aria-hidden="true"
              className="text-caption text-text-secondary mt-1 flex flex-wrap gap-x-4 gap-y-1"
            >
              {SEGMENTS.map((segment) => (
                <li key={segment.label} className="flex items-center gap-1.5">
                  <span
                    className="size-2 rounded-full"
                    style={{ backgroundColor: segment.color }}
                  />
                  {segment.label}
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}
