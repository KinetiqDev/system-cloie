import { BarChart3, ClipboardList, Users } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ParticipationSummary } from "@/features/analytics/aggregators/types";
import type { DashboardSourceMean } from "@/features/analytics/services/get-program-head-dashboard";
import { CompletionBreakdownPopover } from "./program-head-dashboard-completion-popover";

/**
 * The four dashboard KPI cards (spec §13.2–§13.5). Completion uses the raw
 * assignment denominator (resolved §5.12); respondents are person-level
 * (§13.3); quantitative means stay separated per evidence source (§8, §9).
 */
export function ProgramHeadDashboardKpiGrid({
  participation,
  pendingResponses,
  activeEvaluations,
  sourceMeans,
  responsesActiveHref,
}: {
  participation: ParticipationSummary;
  pendingResponses: number;
  activeEvaluations: { total: number; closingWithin7Days: number };
  sourceMeans: DashboardSourceMean[];
  responsesActiveHref: string;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <CardDescription className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
              Response completion
            </CardDescription>
            <CompletionBreakdownPopover stakeholders={participation.stakeholders} />
          </div>
          <CardTitle className="text-3xl font-bold tabular-nums">
            {participation.completionRate === null
              ? "—"
              : `${Math.round(participation.completionRate * 100)}%`}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground text-xs">
          {participation.completionRate === null ? (
            <p>No eligible evaluation assignments in this period.</p>
          ) : (
            <p>
              {participation.submitted.toLocaleString()} of{" "}
              {participation.assigned.toLocaleString()} eligible evaluation assignments submitted
            </p>
          )}
          <p className="mt-1">Assignment-based; the registered population is never the denominator.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardDescription className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
            Respondents
          </CardDescription>
          <CardTitle className="flex items-center gap-2 text-3xl font-bold tabular-nums">
            <Users aria-hidden="true" className="text-muted-foreground size-5" />
            {participation.respondents.total.toLocaleString()}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
            <dt className="text-muted-foreground">Complete</dt>
            <dd className="tabular-nums text-right font-semibold">
              {participation.respondents.complete.toLocaleString()}
            </dd>
            <dt className="text-muted-foreground">Partial</dt>
            <dd className="tabular-nums text-right font-semibold">
              {participation.respondents.partial.toLocaleString()}
            </dd>
            <dt className="text-muted-foreground">Not started</dt>
            <dd className="tabular-nums text-right font-semibold">
              {participation.respondents.notStarted.toLocaleString()}
            </dd>
          </dl>
          <p className="text-muted-foreground mt-2 text-[11px]">
            Person-level status across every eligible assignment (shared User identity).
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardDescription className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
            Active evaluations
          </CardDescription>
          <CardTitle className="flex items-center gap-2 text-3xl font-bold tabular-nums">
            <ClipboardList aria-hidden="true" className="text-muted-foreground size-5" />
            {activeEvaluations.total.toLocaleString()}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground text-xs">
          <p>{activeEvaluations.closingWithin7Days} close within the next 7 days</p>
          <p>{pendingResponses.toLocaleString()} assignments still open</p>
          <Link
            href={responsesActiveHref}
            className="text-link mt-2 inline-flex items-center gap-1 text-xs font-semibold hover:underline"
          >
            Review active evaluations
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardDescription className="text-muted-foreground flex items-center justify-between text-xs font-semibold tracking-wider uppercase">
            Quantitative results
            <BarChart3 aria-hidden="true" className="text-muted-foreground size-4" />
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-y-1.5 text-xs">
            {sourceMeans.map((source) => (
              <div key={source.sourceKey} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3">
                <dt className="text-muted-foreground truncate" title={source.label}>
                  {source.label}
                </dt>
                <dd className="tabular-nums text-right font-semibold">
                  {source.spansMultipleScales ? (
                    <span title="Evidence spans incompatible scales; no combined mean">
                      Multiple scales
                    </span>
                  ) : source.mean === null ? (
                    <span className="font-normal">—</span>
                  ) : (
                    <>
                      {source.mean.toFixed(2)} / {source.scaleMax ?? "–"}
                      <span className="text-muted-foreground ml-1 text-[10px] font-normal">
                        ({source.ratingCount})
                      </span>
                    </>
                  )}
                </dd>
              </div>
            ))}
          </dl>
          <p className="text-muted-foreground mt-2 text-[11px]">
            Source means stay separate and are never pooled into one program score.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
