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
import type { ProgramHeadInsightFilters } from "@/features/analytics/services/program-head-analytics-state";
import { ProgramHeadGODetail } from "./program-head-go-detail";
import { LazyProgramHeadGoLollipopChart } from "./program-head-analytics-visualizations";
import { ProgramHeadContributorMatrix } from "./program-head-contributor-matrix";
import { ProgramHeadInlineAiInsight } from "./program-head-inline-ai-insight";
import { HowCalculatedPopover } from "./how-calculated-popover";
import { SelectedGoScrollTarget } from "./selected-go-scroll-target";

/**
 * Many-to-many contribution rule: a rating bound to a CILO mapped to several
 * selected-Program Graduate Outcomes counts once in each mapped outcome row.
 */
const STAKEHOLDER_LABELS: Record<"STUDENT" | "ALUMNI" | "INDUSTRY_PARTNER", string> = {
  STUDENT: "Students",
  ALUMNI: "Alumni",
  INDUSTRY_PARTNER: "Industry partners",
};

const MANY_TO_MANY_DISCLOSURE =
  "A rating bound to a CILO mapped to more than one Graduate Outcome contributes to each mapped outcome row.";

type ProgramHeadOutcomesViewProps = {
  programId: string;
  data: ProgramHeadOutcomesDTO;
  resetHref: string;
  /** When set, the matching GO row is expanded and highlighted (§16.2). */
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
  const resetClassName = cn(buttonVariants({ variant: "outline", size: "sm" }));
  const hasOutcomes = outcomes.length > 0;
  const totalResponses = outcomes.reduce((sum, outcome) => sum + outcome.submittedResponseCount, 0);
  const totalRatings = outcomes.reduce((sum, outcome) => sum + outcome.ratingCount, 0);

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
              there is no course-bound evidence to map to Graduate Outcomes.
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
              Submitted course-bound ratings exist in this scope, but none reach a Graduate Outcome
              through a direct publication binding or a CILO&apos;s canonical mapping. Institutional
              Outcome evidence is never assigned to a Graduate Outcome by wording or item key.
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
            <EmptyTitle>No program-wide GO evidence</EmptyTitle>
            <EmptyDescription>
              No central-deployment ratings in the selected scope are bound to a Graduate Outcome
              through a published deployment GO snapshot. Program-wide outcome evidence is reported
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
              <AlertTitle>Current CILO-to-GO mappings</AlertTitle>
              <AlertDescription>{currentMappingDisclosure}</AlertDescription>
            </Alert>
            {manyToManyDisclosure && (
              <Alert variant="information">
                <AlertTitle>Multiple Graduate Outcome mapping</AlertTitle>
                <AlertDescription>{MANY_TO_MANY_DISCLOSURE}</AlertDescription>
              </Alert>
            )}
          </div>

          <LazyProgramHeadGoLollipopChart
            title="Mean Rating by Graduate Outcome"
            outcomes={outcomes}
          />

          <ProgramHeadContributorMatrix outcomes={outcomes} selectedGoId={selectedGoId} />

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
            outcomes={outcomes}
            selectedGoId={selectedGoId}
          />
        </>
      )}

      {data.programWideOutcomes.length > 0 && (
        <div className="flex flex-col gap-3">
          <h3 className="text-title-sm text-foreground">Program-wide GO evidence</h3>
          <div className="border-border overflow-x-auto rounded-lg border">
            <Table aria-label="Program-wide evidence by graduate outcome">
              <TableHeader>
                <TableRow>
                  <TableHead>Graduate Outcome</TableHead>
                  <TableHead>Stakeholder</TableHead>
                  <TableHead className="text-right">Mean Rating</TableHead>
                  <TableHead className="text-right">Rating Count</TableHead>
                  <TableHead className="text-right">Submitted Responses</TableHead>
                  <TableHead className="text-right">Evaluations</TableHead>
                  <TableHead className="text-right">Bound Questions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.programWideOutcomes.map((row) => (
                  <TableRow
                    key={`${row.stakeholder}-${row.goId}`}
                    data-go-row={row.goId}
                    className={cn(row.goId === selectedGoId && "bg-primary-soft/40")}
                  >
                    <TableCell className="align-top">
                      <div className="flex flex-col">
                        <span className="font-semibold">{row.code}</span>
                        <span className="text-text-secondary">{row.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="align-top">
                      {STAKEHOLDER_LABELS[row.stakeholder]}
                    </TableCell>
                    <TableCell className="text-right align-top tabular-nums">
                      {row.meanRating === null ? "—" : row.meanRating.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right align-top tabular-nums">
                      {row.ratingCount}
                    </TableCell>
                    <TableCell className="text-right align-top tabular-nums">
                      {row.submittedResponseCount}
                    </TableCell>
                    <TableCell className="text-right align-top tabular-nums">
                      {row.evaluationCount}
                    </TableCell>
                    <TableCell className="text-right align-top tabular-nums">
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
        </div>
      )}
      <SelectedGoScrollTarget goId={selectedGoId} />
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
      <h3 className="text-title-sm text-foreground">Exact values by Graduate Outcome</h3>
      <div className="border-border overflow-x-auto rounded-lg border">
        <Table aria-label="Exact values by graduate outcome">
          <TableHeader>
            <TableRow>
              <TableHead>Graduate Outcome</TableHead>
              <TableHead className="text-right">Mean Rating</TableHead>
              <TableHead className="text-right">Rating Count</TableHead>
              <TableHead className="text-right">Submitted Responses</TableHead>
              <TableHead>Review Evidence</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {outcomes.flatMap((outcome) => {
              const detailId = `go-detail-${outcome.goId}`;
              const isSelected = outcome.goId === selectedGoId;
              const rows = [
                <TableRow
                  key={outcome.goId}
                  data-go-row={outcome.goId}
                  className={cn(isSelected && "bg-primary-soft/40")}
                >
                  <TableCell className="align-top">
                    <div className="flex flex-col">
                      <span className="font-semibold">{outcome.code}</span>
                      <span className="text-text-secondary">{outcome.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right align-top tabular-nums">
                    <span className="inline-flex items-center gap-1">
                      {outcome.meanRating === null ? "—" : outcome.meanRating.toFixed(2)}
                      <HowCalculatedPopover metric={outcome.evidenceSummary} label={outcome.code} />
                    </span>
                  </TableCell>
                  <TableCell className="text-right align-top tabular-nums">
                    {outcome.ratingCount}
                  </TableCell>
                  <TableCell className="text-right align-top tabular-nums">
                    {outcome.submittedResponseCount}
                  </TableCell>
                  <TableCell className="align-top">
                    {outcome.evidenceEvaluations.length > 0 ? (
                      <ul className="flex flex-col gap-1">
                        {outcome.evidenceEvaluations.map((evaluation) => (
                          <li key={evaluation.evaluationId}>
                            <Link
                              href={buildProgramHeadResponsesCourseEvaluationPath(
                                programId,
                                evaluation.evaluationId
                              )}
                              className="text-link hover:text-foreground underline underline-offset-3"
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
                <TableRow key={`${outcome.goId}-detail`}>
                  <TableCell colSpan={5}>
                    <Disclosure open={isSelected}>
                      <DisclosureTrigger variant="link" id={detailId}>
                        Details for {outcome.code}
                      </DisclosureTrigger>
                      <DisclosureContent>
                        <ProgramHeadGODetail outcome={outcome} />
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
    </div>
  );
}
