import type { ReactNode } from "react";
import { ClipboardList, TrendingUp } from "lucide-react";
import Link from "next/link";
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
import type { ProgramHeadTrendsDTO } from "@/features/analytics/program-head-analytics-types";
import { ProgramHeadTrendChart } from "./program-head-analytics-visualizations";

type ProgramHeadTrendsViewProps = {
  data: ProgramHeadTrendsDTO;
  resetHref: string;
};

export function ProgramHeadTrendsView({ data, resetHref }: ProgramHeadTrendsViewProps) {
  const { periods, breaks, emptyReason } = data;
  const resetClassName = cn(buttonVariants({ variant: "outline", size: "sm" }));

  return (
    <div className="flex flex-col gap-6">
      {emptyReason === "no-evidence" && (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ClipboardList aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>No submitted evidence</EmptyTitle>
            <EmptyDescription>
              No submitted responses or ratings exist in this scope, so there are no academic
              periods to compare.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Link href={resetHref} className={resetClassName}>
              View all periods
            </Link>
          </EmptyContent>
        </Empty>
      )}

      {emptyReason === "no-comparable-history" && (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <TrendingUp aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>No comparable history</EmptyTitle>
            <EmptyDescription>
              At least two periods with the same instrument version, rating scale, and mapped
              outcomes are required to draw a trend. The evidence below is shown without a
              continuous line.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Link href={resetHref} className={resetClassName}>
              View all periods
            </Link>
          </EmptyContent>
        </Empty>
      )}

      {emptyReason === null && (
        <ProgramHeadTrendChart
          title="Mean Rating by Academic Period"
          periods={periods}
          breaks={breaks}
        />
      )}

      {periods.length > 0 && <TrendsExactValueTable periods={periods} breaks={breaks} />}
    </div>
  );
}

function TrendsExactValueTable({
  periods,
  breaks,
}: {
  periods: ProgramHeadTrendsDTO["periods"];
  breaks: ProgramHeadTrendsDTO["breaks"];
}) {
  const breakReasonByToLabel = new Map(
    breaks.map((breakInfo) => [breakInfo.toPeriodLabel, breakInfo.reason])
  );

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-title-sm text-foreground">Exact values by period</h3>
      <div className="border-border overflow-x-auto rounded-lg border">
        <Table aria-label="Exact values by academic period">
          <TableHeader>
            <TableRow>
              <TableHead>Period</TableHead>
              <TableHead className="text-right">Mean Rating</TableHead>
              <TableHead className="text-right">Submitted Responses</TableHead>
              <TableHead className="text-right">Rating Count</TableHead>
              <TableHead>Instrument / Version</TableHead>
              <TableHead>Scale</TableHead>
              <TableHead>Outcomes</TableHead>
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
                  <TableCell className="font-medium">{period.periodLabel}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {period.meanRating === null ? "—" : period.meanRating.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {period.submittedResponseCount}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{period.ratingCount}</TableCell>
                  <TableCell>{period.instrumentContext ?? "—"}</TableCell>
                  <TableCell>{period.scaleContext ?? "—"}</TableCell>
                  <TableCell>
                    {period.outcomeCodes.length > 0 ? period.outcomeCodes.join(", ") : "—"}
                  </TableCell>
                </TableRow>
              );
              return rows;
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
