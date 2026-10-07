"use client";

import { useState } from "react";
import { ClipboardList, Inbox, Target } from "lucide-react";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { Disclosure, DisclosureContent, DisclosureTrigger } from "@/components/ui/disclosure";
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
import { buildProgramHeadResponsesCourseEvaluationPath } from "@/lib/constants/program-head-routes";
import type { ProgramHeadOutcomesDTO } from "@/features/analytics/program-head-analytics-types";
import { GRADUATE_OUTCOME_LABELS } from "@/features/analytics/outcome-evidence-types";
import type { ProgramHeadInsightFilters } from "@/features/analytics/services/program-head-analytics-state";
import { OUTCOME_ATTAINMENT_BENCHMARK } from "../aggregators/outcome-attainment";
import { AttainmentBadge } from "./outcome-attainment-badge";
import { AttainmentLegend } from "./outcome-attainment-legend";
import { OutcomeEvidenceDetail } from "./outcome-evidence-detail";
import { LazyOutcomeMeanBarChart } from "./program-head-analytics-visualizations";
import { OutcomeContributorMatrix } from "./outcome-contributor-matrix";
import { ProgramHeadInlineAiInsight } from "./program-head-inline-ai-insight";
import { HowCalculatedPopover } from "./how-calculated-popover";
import { SelectedOutcomeScrollTarget } from "./selected-outcome-scroll-target";

/**
 * Many-to-many contribution rule: a rating bound to a CILO mapped to several
 * selected-Program Program Outcomes counts once in each mapped outcome row.
 */
const STAKEHOLDER_LABELS: Record<"STUDENT" | "ALUMNI" | "INDUSTRY_PARTNER", string> = {
  STUDENT: "Students",
  ALUMNI: "Alumni",
  INDUSTRY_PARTNER: "Industry partners",
};

const MANY_TO_MANY_DISCLOSURE =
  "A rating bound to a CILO mapped to more than one Program Outcome contributes to each mapped outcome row.";

type ProgramHeadOutcomesViewProps = {
  programId: string;
  data: ProgramHeadOutcomesDTO;
  resetHref: string;
  /** When set, the matching PO row is expanded and highlighted (§16.2). */
  selectedGoId?: string;
  aiFilters?: ProgramHeadInsightFilters;
};

export function ProgramHeadOutcomesView({
  programId,
  data,
  resetHref,
  selectedGoId,
  aiFilters,
}: ProgramHeadOutcomesViewProps) {
  const { emptyReason, outcomes, currentMappingDisclosure, manyToManyDisclosure } = data;
  const [attainmentFilter, setAttainmentFilter] = useState<
    "all" | "meets" | "attention" | "below" | "noEvidence"
  >("all");
  const resetClassName = cn(buttonVariants({ variant: "outline", size: "sm" }));
  const hasOutcomes = outcomes.length > 0;
  const totalResponses = outcomes.reduce((sum, outcome) => sum + outcome.submittedResponseCount, 0);
  const totalRatings = outcomes.reduce((sum, outcome) => sum + outcome.ratingCount, 0);

  const attainmentCounts = {
    all: outcomes.length,
    meets: outcomes.filter((o) => o.attainment?.cqi === "Meets Benchmark").length,
    attention: outcomes.filter((o) => o.attainment?.cqi === "Needs Attention").length,
    below: outcomes.filter((o) => o.attainment?.cqi === "Below Benchmark").length,
    noEvidence: outcomes.filter(
      (o) => o.meanRating === null || o.attainment?.status === "no-evidence"
    ).length,
  };

  const visibleOutcomes = outcomes.filter((outcome) => {
    if (attainmentFilter === "all") return true;
    if (attainmentFilter === "meets") return outcome.attainment?.cqi === "Meets Benchmark";
    if (attainmentFilter === "attention") return outcome.attainment?.cqi === "Needs Attention";
    if (attainmentFilter === "below") return outcome.attainment?.cqi === "Below Benchmark";
    if (attainmentFilter === "noEvidence") {
      return outcome.meanRating === null || outcome.attainment?.status === "no-evidence";
    }
    return true;
  });

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
              This Program has no course-bound evaluation assignments in the selected scope, so
              there is no course-bound evidence to map to Program Outcomes.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Link href={resetHref} className={resetClassName}>
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
              Course-bound evaluation assignments exist, but no responses have been submitted yet in
              this scope.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Link href={resetHref} className={resetClassName}>
              Clear period filter
            </Link>
          </EmptyContent>
        </Empty>
      )}

      {emptyReason === "no-mapped-outcomes" && (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Target aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>No mapped outcome evidence</EmptyTitle>
            <EmptyDescription>
              Submitted course-bound ratings exist in this scope, but none reach a Program Outcome
              through a direct publication binding or a CILO&apos;s canonical mapping. Institutional
              Outcome evidence is never assigned to a Program Outcome by wording or item key.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Link href={resetHref} className={resetClassName}>
              View all periods
            </Link>
          </EmptyContent>
        </Empty>
      )}

      {emptyReason === "no-program-wide-evidence" && (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Target aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>No program-wide PO evidence</EmptyTitle>
            <EmptyDescription>
              No central-deployment ratings in the selected scope are bound to a Program Outcome
              through a published deployment PO snapshot. Program-wide outcome evidence is reported
              by Stakeholder when snapshot bindings exist.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Link href={resetHref} className={resetClassName}>
              View all periods
            </Link>
          </EmptyContent>
        </Empty>
      )}

      {hasOutcomes && (
        <>
          <div className="flex flex-col gap-3">
            <Alert variant="information">
              <AlertTitle>Current CILO-to-PO mappings</AlertTitle>
              <AlertDescription>{currentMappingDisclosure}</AlertDescription>
            </Alert>
            {manyToManyDisclosure && (
              <Alert variant="information">
                <AlertTitle>Multiple Program Outcome mapping</AlertTitle>
                <AlertDescription>{MANY_TO_MANY_DISCLOSURE}</AlertDescription>
              </Alert>
            )}
          </div>

          <div className="border-border/80 bg-card rounded-xl border p-4 shadow-xs sm:p-5">
            <div className="border-border/60 flex flex-wrap items-center justify-between gap-3 border-b pb-3">
              <div>
                <h2 className="text-title-sm text-foreground font-semibold">
                  Program Outcome Attainment Summary
                </h2>
                <p className="text-body-sm text-text-secondary mt-0.5">Benchmark is ≥ 3.50.</p>
              </div>
            </div>
            <div
              role="group"
              aria-label="Filter outcomes by attainment status"
              className="mt-3 flex flex-wrap items-center gap-1.5"
            >
              <button
                type="button"
                aria-pressed={attainmentFilter === "all"}
                onClick={() => setAttainmentFilter("all")}
                className={cn(
                  "text-label-sm focus-visible:ring-ring min-h-8 rounded-lg px-2.5 py-1 font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none",
                  attainmentFilter === "all"
                    ? "bg-primary-soft text-selected-fg"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                )}
              >
                All POs ({attainmentCounts.all})
              </button>
              <button
                type="button"
                aria-pressed={attainmentFilter === "meets"}
                onClick={() => setAttainmentFilter("meets")}
                className={cn(
                  "text-label-sm focus-visible:ring-ring min-h-8 rounded-lg px-2.5 py-1 font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none",
                  attainmentFilter === "meets"
                    ? "bg-success-soft text-success"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                )}
              >
                Meets Benchmark ({attainmentCounts.meets})
              </button>
              <button
                type="button"
                aria-pressed={attainmentFilter === "attention"}
                onClick={() => setAttainmentFilter("attention")}
                className={cn(
                  "text-label-sm focus-visible:ring-ring min-h-8 rounded-lg px-2.5 py-1 font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none",
                  attainmentFilter === "attention"
                    ? "bg-warning-soft text-warning"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                )}
              >
                Needs Attention ({attainmentCounts.attention})
              </button>
              <button
                type="button"
                aria-pressed={attainmentFilter === "below"}
                onClick={() => setAttainmentFilter("below")}
                className={cn(
                  "text-label-sm focus-visible:ring-ring min-h-8 rounded-lg px-2.5 py-1 font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none",
                  attainmentFilter === "below"
                    ? "bg-danger-soft text-danger"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                )}
              >
                Below Benchmark ({attainmentCounts.below})
              </button>
              <button
                type="button"
                aria-pressed={attainmentFilter === "noEvidence"}
                onClick={() => setAttainmentFilter("noEvidence")}
                className={cn(
                  "text-label-sm focus-visible:ring-ring min-h-8 rounded-lg px-2.5 py-1 font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none",
                  attainmentFilter === "noEvidence"
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                )}
              >
                Lacking Evidence ({attainmentCounts.noEvidence})
              </button>
            </div>
          </div>

          <LazyOutcomeMeanBarChart
            title="Mean Rating by Program Outcome"
            outcomes={visibleOutcomes}
            labels={GRADUATE_OUTCOME_LABELS}
          />

          <OutcomeContributorMatrix
            outcomes={visibleOutcomes}
            labels={GRADUATE_OUTCOME_LABELS}
            selectedOutcomeId={selectedGoId}
          />

          {aiFilters ? (
            <ProgramHeadInlineAiInsight
              programId={programId}
              analyticsView="outcomes"
              filters={aiFilters}
              evidenceBasis={`${totalResponses} submitted ${totalResponses === 1 ? "response" : "responses"} and ${totalRatings} valid ${totalRatings === 1 ? "rating" : "ratings"}`}
            />
          ) : null}

          <OutcomesExactValueTable
            programId={programId}
            outcomes={visibleOutcomes}
            selectedGoId={selectedGoId}
          />
        </>
      )}

      {data.programWideOutcomes.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-heading-lg text-foreground">Program-wide PO evidence</h2>
          <AttainmentLegend />
          <Table
            aria-label="Program-wide evidence by program outcome"
            containerClassName="border-border rounded-lg border"
          >
            <TableHeader>
              <TableRow>
                <TableHead>Program Outcome</TableHead>
                <TableHead>Stakeholder</TableHead>
                <TableHead className="text-right">Mean Rating</TableHead>
                <TableHead>Attainment</TableHead>
                <TableHead className="text-right">Rating Count</TableHead>
                <TableHead className="text-right">Submitted Responses</TableHead>
                <TableHead className="text-right">Evaluations</TableHead>
                <TableHead className="text-right">Bound Questions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.programWideOutcomes.map((row) => (
                <TableRow
                  key={`${row.stakeholder}-${row.poId}`}
                  data-outcome-row={row.poId}
                  className={cn(row.poId === selectedGoId && "bg-primary-soft/40")}
                >
                  <TableCell className="max-w-xs align-top whitespace-normal">
                    <div className="flex flex-col">
                      <span className="font-semibold">{row.code}</span>
                      <span className="text-text-secondary">{row.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="align-top whitespace-nowrap">
                    {STAKEHOLDER_LABELS[row.stakeholder]}
                  </TableCell>
                  <TableCell className="text-right align-top whitespace-nowrap tabular-nums">
                    <div>{row.meanRating === null ? "—" : row.meanRating.toFixed(2)}</div>
                    {row.meanRating !== null && row.attainment?.status === "classified" && (
                      <span className="text-label-xs text-muted-foreground block">
                        {row.meanRating >= OUTCOME_ATTAINMENT_BENCHMARK
                          ? `+${(row.meanRating - OUTCOME_ATTAINMENT_BENCHMARK).toFixed(2)} vs benchmark`
                          : `${(row.meanRating - OUTCOME_ATTAINMENT_BENCHMARK).toFixed(2)} vs benchmark`}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="align-top whitespace-nowrap">
                    <AttainmentBadge attainment={row.attainment} />
                  </TableCell>
                  <TableCell className="text-right align-top whitespace-nowrap tabular-nums">
                    {row.ratingCount}
                  </TableCell>
                  <TableCell className="text-right align-top whitespace-nowrap tabular-nums">
                    {row.submittedResponseCount}
                  </TableCell>
                  <TableCell className="text-right align-top whitespace-nowrap tabular-nums">
                    {row.evaluationCount}
                  </TableCell>
                  <TableCell className="text-right align-top whitespace-nowrap tabular-nums">
                    <span className="inline-flex items-center gap-1">
                      {row.questionCount}
                      <HowCalculatedPopover metric={row.evidenceSummary} label={row.code} />
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <SelectedOutcomeScrollTarget outcomeId={selectedGoId} />
    </div>
  );
}

function OutcomesExactValueTable({
  programId,
  outcomes,
  selectedGoId,
}: {
  programId: string;
  outcomes: ProgramHeadOutcomesDTO["outcomes"];
  selectedGoId?: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-heading-lg text-foreground">Exact values by Program Outcome</h2>
      <Table
        aria-label="Exact values by program outcome"
        containerClassName="border-border rounded-lg border"
      >
        <TableHeader>
          <TableRow>
            <TableHead>Program Outcome</TableHead>
            <TableHead className="text-right">Mean Rating</TableHead>
            <TableHead>Attainment</TableHead>
            <TableHead className="text-right">Rating Count</TableHead>
            <TableHead className="text-right">Submitted Responses</TableHead>
            <TableHead>Review Evidence</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {outcomes.flatMap((outcome) => {
            const detailId = `po-detail-${outcome.outcomeId}`;
            const isSelected = outcome.outcomeId === selectedGoId;
            const rows = [
              <TableRow
                key={outcome.outcomeId}
                data-outcome-row={outcome.outcomeId}
                className={cn(isSelected && "bg-primary-soft/40")}
              >
                <TableCell className="max-w-xs align-top whitespace-normal">
                  <div className="flex flex-col">
                    <span className="font-semibold">{outcome.code}</span>
                    <span className="text-text-secondary">{outcome.name}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right align-top whitespace-nowrap tabular-nums">
                  <div className="inline-flex items-center gap-1">
                    {outcome.meanRating === null ? "—" : outcome.meanRating.toFixed(2)}
                    <HowCalculatedPopover metric={outcome.evidenceSummary} label={outcome.code} />
                  </div>
                  {outcome.meanRating !== null && outcome.attainment?.status === "classified" && (
                    <span className="text-label-xs text-muted-foreground block">
                      {outcome.meanRating >= OUTCOME_ATTAINMENT_BENCHMARK
                        ? `+${(outcome.meanRating - OUTCOME_ATTAINMENT_BENCHMARK).toFixed(2)} vs benchmark`
                        : `${(outcome.meanRating - OUTCOME_ATTAINMENT_BENCHMARK).toFixed(2)} vs benchmark`}
                    </span>
                  )}
                </TableCell>
                <TableCell className="align-top whitespace-nowrap">
                  <AttainmentBadge attainment={outcome.attainment} />
                </TableCell>
                <TableCell className="text-right align-top whitespace-nowrap tabular-nums">
                  {outcome.ratingCount}
                </TableCell>
                <TableCell className="text-right align-top whitespace-nowrap tabular-nums">
                  {outcome.submittedResponseCount}
                </TableCell>
                <TableCell className="max-w-xs align-top whitespace-normal">
                  {outcome.evidenceEvaluations.length > 0 ? (
                    <ul className="flex flex-col gap-1">
                      {outcome.evidenceEvaluations.map((evaluation) => (
                        <li key={evaluation.evaluationId}>
                          <Link
                            href={buildProgramHeadResponsesCourseEvaluationPath(
                              programId,
                              evaluation.evaluationId
                            )}
                            className="text-link hover:text-foreground break-words underline underline-offset-3"
                          >
                            {evaluation.deploymentName}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    "—"
                  )}
                </TableCell>
              </TableRow>,
              <TableRow key={`${outcome.outcomeId}-detail`}>
                <TableCell colSpan={6} className="bg-muted/15 p-4 whitespace-normal">
                  <Disclosure open={isSelected}>
                    <DisclosureTrigger variant="link" id={detailId}>
                      Details for {outcome.code}
                    </DisclosureTrigger>
                    <DisclosureContent className="mt-3">
                      <OutcomeEvidenceDetail outcome={outcome} />
                    </DisclosureContent>
                  </Disclosure>
                </TableCell>
              </TableRow>,
            ];
            return rows;
          })}
        </TableBody>
      </Table>
    </div>
  );
}
