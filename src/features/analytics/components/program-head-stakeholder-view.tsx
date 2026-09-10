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
import type { ProgramHeadInsightFilters } from "@/features/analytics/services/program-head-analytics-state";
import { ProgramHeadInlineAiInsight } from "./program-head-inline-ai-insight";

type ProgramHeadStakeholderViewProps = {
  programId: string;
  data: ProgramHeadStakeholdersDTO;
  resetHref: string;
  aiFilters?: ProgramHeadInsightFilters;
};

/**
 * Source-aware stakeholder summary. Course-bound student evidence, central
 * student-respondent evidence, alumni evidence, and Industry Partner evidence
 * stay in separate cards with instrument disclosure. Sources are never ranked
 * against each other: different instruments and populations produce means
 * that are not comparable side-by-side.
 */
export function ProgramHeadStakeholderView({
  programId,
  data,
  resetHref,
  aiFilters,
}: ProgramHeadStakeholderViewProps) {
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

  const totalResponses = buckets.reduce((sum, bucket) => sum + bucket.submittedResponseCount, 0);
  const totalRatings = buckets.reduce((sum, bucket) => sum + bucket.ratingCount, 0);

  return (
    <div className="flex flex-col gap-6">
      <Alert variant="information">
        <AlertTitle>Evidence sources are kept separate</AlertTitle>
        <AlertDescription>{sourceSeparationDisclosure}</AlertDescription>
      </Alert>

      <div
        className="grid gap-4 sm:grid-cols-2"
        role="list"
        aria-label="Mean rating by evidence source"
      >
        {buckets.map((bucket) => (
          <div
            key={bucket.sourceKey}
            role="listitem"
            className="border-border/80 bg-card flex flex-col gap-2 rounded-xl border p-4 shadow-xs sm:p-5"
          >
            <h3 className="text-title-sm text-foreground font-semibold">{bucket.sourceLabel}</h3>
            <p className="text-body-sm text-text-secondary">{bucket.sourceDescription}</p>
            <p className="text-heading-md text-foreground mt-1 tabular-nums">
              {bucket.meanRating === null ? "—" : bucket.meanRating.toFixed(2)}
              <span className="text-body-sm text-text-secondary font-normal"> mean rating</span>
            </p>
            <p className="text-body-sm text-text-secondary tabular-nums">
              {bucket.submittedResponseCount}{" "}
              {bucket.submittedResponseCount === 1 ? "response" : "responses"} ·{" "}
              {bucket.ratingCount} {bucket.ratingCount === 1 ? "rating" : "ratings"}
            </p>
            {bucket.instrumentContext ? (
              <p className="text-body-sm text-text-secondary">
                <span className="text-foreground font-medium">Instruments: </span>
                {bucket.instrumentContext}
              </p>
            ) : null}
          </div>
        ))}
      </div>

      {aiFilters ? (
        <ProgramHeadInlineAiInsight
          programId={programId}
          analyticsView="stakeholders"
          filters={aiFilters}
          evidenceBasis={`${totalResponses} submitted ${totalResponses === 1 ? "response" : "responses"} and ${totalRatings} valid ${totalRatings === 1 ? "rating" : "ratings"} across ${buckets.length} evidence ${buckets.length === 1 ? "source" : "sources"}`}
        />
      ) : null}
    </div>
  );
}
