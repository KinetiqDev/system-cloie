import { BarChart3, ClipboardList, Users } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ParticipationSummary } from "@/features/analytics/aggregators/types";
import type { DashboardSourceMean } from "@/features/analytics/services/get-program-head-dashboard";
import { CompletionBreakdownPopover } from "./program-head-dashboard-completion-popover";
import { HowCalculatedPopover } from "./how-calculated-popover";

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
  responsesActiveCourseHref,
  responsesActiveProgramWideHref,
  responsesHref,
}: {
  participation: ParticipationSummary;
  pendingResponses: number;
  activeEvaluations: { total: number; closingWithin7Days: number };
  sourceMeans: DashboardSourceMean[];
  responsesActiveCourseHref: string;
  responsesActiveProgramWideHref: string;
  responsesHref: string;
}) {
  const completionEvidence = {
    assignmentCount: participation.assigned,
    responseCount: participation.submitted,
    explanation:
      "Submitted eligible evaluation assignments over every in-scope assignment row. The registered population is never the denominator.",
    evidenceHref: responsesHref,
  };
  const respondentsEvidence = {
    assignmentCount: participation.assigned,
    responseCount: participation.submitted,
    explanation:
      "Person-level status across every eligible assignment: complete means all submitted, partial means at least one started or submitted, not started means none.",
    evidenceHref: responsesHref,
  };
  const activeEvaluationsEvidence = {
    evaluationCount: activeEvaluations.total,
    explanation:
      "ACTIVE course and program-wide deployments for the selected Program and academic period.",
    evidenceHref: responsesHref,
  };
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <CardDescription className="text-muted-foreground text-label-sm font-semibold tracking-wider uppercase">
              Response completion
            </CardDescription>
            <div className="flex items-center gap-1">
              <HowCalculatedPopover metric={completionEvidence} label="Response completion" />
              <CompletionBreakdownPopover stakeholders={participation.stakeholders} />
            </div>
          </div>
          <CardTitle className="text-display-md tabular-nums">
            {participation.completionRate === null
              ? "—"
              : `${Math.round(participation.completionRate * 100)}%`}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground text-body-sm">
          {participation.completionRate === null ? (
            <p>No eligible evaluation assignments in this period.</p>
          ) : (
            <p>
              {participation.submitted.toLocaleString()} of{" "}
              {participation.assigned.toLocaleString()} eligible evaluation assignments submitted
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <CardDescription className="text-muted-foreground text-label-sm font-semibold tracking-wider uppercase">
              Respondents
            </CardDescription>
            <HowCalculatedPopover metric={respondentsEvidence} label="Respondents" />
          </div>
          <CardTitle className="text-display-md flex items-center gap-2 tabular-nums">
            <Users aria-hidden="true" className="text-muted-foreground size-5" />
            {participation.respondents.total.toLocaleString()}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="text-body-sm grid grid-cols-2 gap-x-3 gap-y-1">
            <dt className="text-muted-foreground">Complete</dt>
            <dd className="text-right font-semibold tabular-nums">
              {participation.respondents.complete.toLocaleString()}
            </dd>
            <dt className="text-muted-foreground">Partial</dt>
            <dd className="text-right font-semibold tabular-nums">
              {participation.respondents.partial.toLocaleString()}
            </dd>
            <dt className="text-muted-foreground">Not started</dt>
            <dd className="text-right font-semibold tabular-nums">
              {participation.respondents.notStarted.toLocaleString()}
            </dd>
          </dl>
          <p className="text-muted-foreground text-body-sm mt-2">
            Person-level status across eligible assignments.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <CardDescription className="text-muted-foreground text-label-sm font-semibold tracking-wider uppercase">
              Active evaluations
            </CardDescription>
            <HowCalculatedPopover metric={activeEvaluationsEvidence} label="Active evaluations" />
          </div>
          <CardTitle className="text-display-md flex items-center gap-2 tabular-nums">
            <ClipboardList aria-hidden="true" className="text-muted-foreground size-5" />
            {activeEvaluations.total.toLocaleString()}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground text-body-sm flex flex-col gap-2">
          <p>{activeEvaluations.closingWithin7Days} close within the next 7 days</p>
          <p>{pendingResponses.toLocaleString()} assignments still open</p>
          <div className="flex flex-col gap-1">
            <Link
              href={responsesActiveCourseHref}
              className="text-link font-semibold hover:underline"
            >
              Review active course evaluations
            </Link>
            <Link
              href={responsesActiveProgramWideHref}
              className="text-link font-semibold hover:underline"
            >
              Review active program-wide evaluations
            </Link>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardDescription className="text-muted-foreground text-label-sm flex items-center justify-between font-semibold tracking-wider uppercase">
            Quantitative results
            <BarChart3 aria-hidden="true" className="text-muted-foreground size-4" />
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="text-body-sm grid gap-y-2">
            {sourceMeans.map((source) => (
              <div key={source.sourceKey} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3">
                <dt className="text-muted-foreground truncate" title={source.label}>
                  {source.label}
                </dt>
                <dd className="flex items-center gap-1 text-right font-semibold tabular-nums">
                  {source.spansMultipleScales ? (
                    <span title="Evidence spans incompatible scales; no combined mean">
                      Multiple scales
                    </span>
                  ) : source.mean === null ? (
                    <span className="font-normal">—</span>
                  ) : (
                    <>
                      {source.mean.toFixed(2)} / {source.scaleMax ?? "–"}
                      <span className="text-muted-foreground text-caption ml-1 font-normal">
                        ({source.ratingCount})
                      </span>
                    </>
                  )}
                  <HowCalculatedPopover metric={source.evidenceSummary} label={source.label} />
                </dd>
              </div>
            ))}
          </dl>
          <p className="text-muted-foreground text-label-sm mt-2">
            Source means stay separate and are never pooled into one program score.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
