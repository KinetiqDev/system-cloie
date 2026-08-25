import { ClipboardList, Inbox } from "lucide-react";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { cn } from "@/lib/utils";
import type { ProgramHeadStakeholdersDTO } from "@/features/analytics/program-head-analytics-types";
import {
  ProgramHeadComparisonChart,
  ProgramHeadResponseCompositionDonut,
} from "./program-head-analytics-visualizations";
import type { ProgramHeadComparisonDatum } from "./program-head-comparison-chart";

type ProgramHeadStakeholderViewProps = {
  data: ProgramHeadStakeholdersDTO;
  resetHref: string;
};

/**
 * Source-aware stakeholder comparison. Course-bound student evidence, central
 * student-respondent evidence, alumni evidence, and Industry Partner evidence
 * stay in separate buckets with instrument disclosure; means are ranked bars,
 * and a donut appears only for genuine response composition.
 */
export function ProgramHeadStakeholderView({ data, resetHref }: ProgramHeadStakeholderViewProps) {
  const { emptyReason, buckets, sourceSeparationDisclosure } = data;
  const resetClassName = cn(buttonVariants({ variant: "outline", size: "sm" }));

  if (emptyReason === "no-assignments") {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ClipboardList aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>No evaluation assignments</EmptyTitle>
          <EmptyDescription>
            This Program has no evaluation assignments in the selected scope, so there is no
            stakeholder-rated evidence to compare.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Link href={resetHref} className={resetClassName}>
            View all periods
          </Link>
        </EmptyContent>
      </Empty>
    );
  }

  if (emptyReason === "no-submissions") {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Inbox aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>No submitted responses</EmptyTitle>
          <EmptyDescription>
            Evaluation assignments exist, but no responses have been submitted yet in this scope.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Link href={resetHref} className={resetClassName}>
            Clear period filter
          </Link>
        </EmptyContent>
      </Empty>
    );
  }

  const rows: ProgramHeadComparisonDatum[] = buckets.map((bucket) => ({
    key: bucket.sourceKey,
    label: bucket.sourceLabel,
    meanRating: bucket.meanRating,
    ratingCount: bucket.ratingCount,
    submittedResponseCount: bucket.submittedResponseCount,
    context: bucket.instrumentContext,
  }));

  const composition = buckets.map((bucket) => ({
    key: bucket.sourceKey,
    label: bucket.sourceLabel,
    count: bucket.submittedResponseCount,
  }));

  return (
    <div className="flex flex-col gap-6">
      <Alert variant="information">
        <AlertTitle>Evidence sources are kept separate</AlertTitle>
        <AlertDescription>{sourceSeparationDisclosure}</AlertDescription>
      </Alert>

      <div className="flex flex-col gap-2">
        <h3 className="text-title-sm text-foreground">About these evidence sources</h3>
        <ul className="flex flex-col gap-1.5">
          {buckets.map((bucket) => (
            <li key={bucket.sourceKey} className="text-body-sm text-text-secondary">
              <span className="text-foreground font-semibold">{bucket.sourceLabel}:</span>{" "}
              {bucket.sourceDescription}
              {bucket.instrumentContext ? ` Instruments: ${bucket.instrumentContext}.` : null}
            </li>
          ))}
        </ul>
      </div>

      <ProgramHeadComparisonChart
        title="Mean Rating by Evidence Source"
        description="Independent Mean Ratings per evidence source. Means are pooled within each source only and are never combined across sources."
        rows={rows}
      />

      {buckets.length >= 2 ? <ProgramHeadResponseCompositionDonut data={composition} /> : null}
    </div>
  );
}
