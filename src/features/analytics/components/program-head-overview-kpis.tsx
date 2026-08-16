import { ClipboardList, Inbox } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { cn } from "@/lib/utils";
import type {
  ProgramHeadOverviewKPI,
  OverviewEmptyReason,
} from "@/features/analytics/program-head-analytics-types";

type ProgramHeadOverviewKPIsProps = {
  kpi: ProgramHeadOverviewKPI;
  emptyReason: OverviewEmptyReason;
  resetHref: string;
};

const resetLinkClassName = cn(buttonVariants({ variant: "outline", size: "sm" }));

export function ProgramHeadOverviewKPIs({ kpi, emptyReason, resetHref }: ProgramHeadOverviewKPIsProps) {
  const cards = [
    { label: "Submitted Responses", value: String(kpi.submittedResponseCount) },
    { label: "Evaluation Opportunities", value: String(kpi.evaluationOpportunityCount) },
    {
      label: "Response Rate",
      value: kpi.responseRate === null ? "—" : `${(kpi.responseRate * 100).toFixed(1)}%`,
    },
    { label: "Rating Count", value: String(kpi.ratingCount) },
    { label: "Mean Rating", value: kpi.meanRating === null ? "—" : kpi.meanRating.toFixed(2) },
  ];

  return (
    <div className="flex flex-col gap-6">
      {emptyReason === "no-assignments" && (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ClipboardList aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>No evaluation assignments</EmptyTitle>
            <EmptyDescription>
              This Program has no evaluation assignments in the selected scope. Analytics evidence
              requires at least one published evaluation.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Link href={resetHref} className={resetLinkClassName}>
              View all periods
            </Link>
          </EmptyContent>
        </Empty>
      )}

      {emptyReason === "no-submissions" && (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Inbox aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>No submitted responses</EmptyTitle>
            <EmptyDescription>
              Evaluation assignments exist, but no responses have been submitted yet.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Link href={resetHref} className={resetLinkClassName}>
              Clear period filter
            </Link>
          </EmptyContent>
        </Empty>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.label} size="sm">
            <CardHeader>
              <CardTitle>{card.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-heading-lg tabular-nums">{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
