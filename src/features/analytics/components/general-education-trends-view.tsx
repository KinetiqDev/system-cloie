import { ClipboardList, TrendingUp } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { buttonVariants } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { GeneralEducationTrendsDTO } from "@/features/analytics/general-education-analytics-types";
import type { GeneralEducationAnalyticsFilterState } from "@/features/analytics/services/general-education-analytics-state";
import { GeneralEducationInlineAiInsight } from "./general-education-inline-ai-insight";
import {
  LazyGeneralEducationResponseRateTrendChart,
  LazyGeneralEducationTrendChart,
} from "./general-education-analytics-visualizations";
import {
  formatMean,
  formatResponseRate,
  SectionShell,
} from "./general-education-evidence-primitives";
import { MissingValue } from "./general-education-evidence-marks";

type GeneralEducationTrendsViewProps = {
  data: GeneralEducationTrendsDTO;
  resetHref: string;
  filters: GeneralEducationAnalyticsFilterState;
};

/**
 * Chronological General Education evidence. Mean points join only inside a
 * comparable run, response rate reports every period against its own
 * opportunities, and a period that stands alone is reported rather than
 * interpolated into a slope.
 */
export function GeneralEducationTrendsView({
  data,
  resetHref,
  filters,
}: GeneralEducationTrendsViewProps) {
  const { periods, breaks, emptyReason } = data;
  const resetClassName = cn(buttonVariants({ variant: "outline", size: "sm" }));

  const totalResponses = periods.reduce((sum, period) => sum + period.submittedResponseCount, 0);
  const evidenceBasis = `${totalResponses} submitted ${
    totalResponses === 1 ? "response" : "responses"
  } across ${periods.length} academic ${periods.length === 1 ? "period" : "periods"}`;

  return (
    <div className="flex flex-col gap-6">
      {emptyReason === "no-evidence" ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ClipboardList aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>No submitted evidence</EmptyTitle>
            <EmptyDescription>
              No submitted General Education responses or ratings exist in this scope, so there are
              no academic periods to compare.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Link href={resetHref} className={resetClassName}>
              View all periods
            </Link>
          </EmptyContent>
        </Empty>
      ) : null}

      {emptyReason === "no-comparable-history" ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <TrendingUp aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>No comparable history</EmptyTitle>
            <EmptyDescription>
              At least two periods sharing the same instrument version, rating scale, and mapped
              ILOs are required to draw a trend. The evidence below is reported without a continuous
              line, because joining unlike periods would imply a change that never happened.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Link href={resetHref} className={resetClassName}>
              View all periods
            </Link>
          </EmptyContent>
        </Empty>
      ) : null}

      {emptyReason === null ? (
        <>
          <LazyGeneralEducationTrendChart
            title="Mean Rating by Academic Period"
            periods={periods}
            breaks={breaks}
          />

          <LazyGeneralEducationResponseRateTrendChart
            title="Response Rate by Academic Period"
            periods={periods}
          />

          {/* One insight per view, after both deterministic charts and before
              the exact period table. */}
          <GeneralEducationInlineAiInsight
            view="trends"
            filters={filters}
            evidenceBasis={evidenceBasis}
          />
        </>
      ) : null}

      {periods.length > 0 ? (
        <SectionShell
          id="ge-trend-exact-values"
          title="Exact values by academic period"
          description="Each period's mean, counts, instrument, scale, and mapped ILOs, with comparability breaks marked in place."
        >
          <TrendsExactValueTable periods={periods} breaks={breaks} />
        </SectionShell>
      ) : null}

      {/* The insight mounts on every Trends scope, empty or not. */}
      {emptyReason !== null ? (
        <GeneralEducationInlineAiInsight
          view="trends"
          filters={filters}
          evidenceBasis="No comparable General Education history in this scope"
        />
      ) : null}
    </div>
  );
}

function TrendsExactValueTable({
  periods,
  breaks,
}: {
  periods: GeneralEducationTrendsDTO["periods"];
  breaks: GeneralEducationTrendsDTO["breaks"];
}) {
  const breakReasonByToLabel = new Map(
    breaks.map((breakInfo) => [breakInfo.toPeriodLabel, breakInfo.reason])
  );
  const isolatedPeriods = periods.filter((period) => !period.comparableWithPrevious);

  return (
    <div className="flex flex-col gap-3">
      <div className="border-border/80 overflow-x-auto rounded-lg border">
        <Table aria-label="Exact values by academic period">
          <TableHeader>
            <TableRow>
              <TableHead>Period</TableHead>
              <TableHead className="text-right">Mean Rating</TableHead>
              <TableHead className="text-right">Response Rate</TableHead>
              <TableHead className="text-right">Rating Count</TableHead>
              <TableHead>Instrument / Version</TableHead>
              <TableHead>Scale</TableHead>
              <TableHead>ILOs</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {periods.flatMap((period, index) => {
              const breakReason =
                index > 0 && !period.comparableWithPrevious
                  ? breakReasonByToLabel.get(period.periodLabel)
                  : undefined;

              const rows: ReactNode[] = [];
              if (breakReason) {
                rows.push(
                  <TableRow
                    key={`break-${period.termInstanceId}`}
                    aria-label={`Comparability break before ${period.periodLabel}`}
                  >
                    <TableCell colSpan={7} className="text-text-secondary italic">
                      Not directly comparable with the previous period — {breakReason}
                    </TableCell>
                  </TableRow>
                );
              }
              rows.push(
                <TableRow key={period.termInstanceId}>
                  <TableCell className="align-top font-medium whitespace-nowrap">
                    {period.periodLabel}
                    {!period.comparableWithPrevious ? (
                      <span className="text-muted-foreground block text-xs font-normal">
                        First period of its comparable run
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-right align-top tabular-nums">
                    {formatMean(period.meanRating)}
                  </TableCell>
                  <TableCell className="text-right align-top whitespace-nowrap tabular-nums">
                    {formatResponseRate(period.responseRate)}
                    <span className="text-muted-foreground block text-xs">
                      {period.submittedResponseCount}/{period.evaluationOpportunityCount}
                    </span>
                  </TableCell>
                  <TableCell className="text-right align-top tabular-nums">
                    {period.ratingCount}
                  </TableCell>
                  <TableCell className="align-top whitespace-normal">
                    {period.instrumentContext ?? <MissingValue />}
                  </TableCell>
                  <TableCell className="align-top whitespace-normal">
                    {period.scaleContext ?? <MissingValue />}
                  </TableCell>
                  <TableCell className="align-top whitespace-normal">
                    {period.outcomeCodes.length > 0 ? (
                      period.outcomeCodes.join(", ")
                    ) : (
                      <MissingValue />
                    )}
                  </TableCell>
                </TableRow>
              );
              return rows;
            })}
          </TableBody>
        </Table>
      </div>

      {isolatedPeriods.length > 0 ? (
        <p className="text-body-sm text-text-secondary">
          {isolatedPeriods.map((period) => period.periodLabel).join(", ")} open a new comparable
          run, so their point stands alone on the chart instead of being drawn as a slope from an
          unlike period.
        </p>
      ) : null}
    </div>
  );
}
