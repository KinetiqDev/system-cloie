import { ClipboardList, Inbox, Target } from "lucide-react";
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
import { ProgramHeadPLODetail } from "./program-head-plo-detail";
import { ProgramHeadOutcomeRankingChart } from "./program-head-outcome-ranking-chart";
import { HowCalculatedPopover } from "./how-calculated-popover";

/**
 * Many-to-many contribution rule: a rating bound to a CILO mapped to several
 * selected-Program Program Learning Outcomes counts once in each mapped outcome row.
 */
const STAKEHOLDER_LABELS: Record<"STUDENT" | "ALUMNI" | "INDUSTRY_PARTNER", string> = {
  STUDENT: "Students",
  ALUMNI: "Alumni",
  INDUSTRY_PARTNER: "Industry partners",
};

const MANY_TO_MANY_DISCLOSURE =
  "A rating bound to a CILO mapped to more than one Program Learning Outcome contributes to each mapped outcome row.";

type ProgramHeadOutcomesViewProps = {
  programId: string;
  data: ProgramHeadOutcomesDTO;
  resetHref: string;
  /** When set, the matching PLO row is expanded and highlighted (§16.2). */
  selectedPloId?: string;
};

export function ProgramHeadOutcomesView({
  programId,
  data,
  resetHref,
  selectedPloId,
}: ProgramHeadOutcomesViewProps) {
  const { emptyReason, outcomes, currentMappingDisclosure, manyToManyDisclosure } = data;
  const resetClassName = cn(buttonVariants({ variant: "outline", size: "sm" }));
  const hasOutcomes = outcomes.length > 0;

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
              there is no course-bound evidence to map to Program Learning Outcomes.
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
              Submitted course-bound ratings exist in this scope, but none are bound to a CILO with
              a canonical mapping to a Program Learning Outcome of this Program. Central instrument
              questions and Institutional Outcome evidence are never assigned to a Program Learning Outcome
              by wording or item key.
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
            <EmptyTitle>No program-wide PLO evidence</EmptyTitle>
            <EmptyDescription>
              No central-deployment ratings in the selected scope are bound to a Program Learning
              Outcome through a published deployment PLO snapshot. Program-wide outcome evidence is
              reported by Stakeholder when snapshot bindings exist.
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
              <AlertTitle>Current CILO-to-PLO mappings</AlertTitle>
              <AlertDescription>{currentMappingDisclosure}</AlertDescription>
            </Alert>
            {manyToManyDisclosure && (
              <Alert variant="information">
                <AlertTitle>Multiple Program Learning Outcome mapping</AlertTitle>
                <AlertDescription>{MANY_TO_MANY_DISCLOSURE}</AlertDescription>
              </Alert>
            )}
          </div>

          <ProgramHeadOutcomeRankingChart
            title="Mean Rating by Program Learning Outcome"
            outcomes={outcomes}
          />

          <OutcomesExactValueTable programId={programId} outcomes={outcomes} selectedPloId={selectedPloId} />
        </>
      )}

      {data.programWideOutcomes.length > 0 && (
        <div className="flex flex-col gap-3">
          <h3 className="text-title-sm text-foreground">Program-wide PLO evidence</h3>
          <div className="border-border overflow-x-auto rounded-lg border">
            <Table aria-label="Program-wide evidence by graduate outcome">
              <TableHeader>
                <TableRow>
                  <TableHead>Program Learning Outcome</TableHead>
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
                  <TableRow key={`${row.stakeholder}-${row.ploId}`}>
                    <TableCell className="align-top">
                      <div className="flex flex-col">
                        <span className="font-semibold">{row.code}</span>
                        <span className="text-text-secondary">{row.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="align-top">{STAKEHOLDER_LABELS[row.stakeholder]}</TableCell>
                    <TableCell className="text-right align-top tabular-nums">
                      {row.meanRating === null ? "—" : row.meanRating.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right align-top tabular-nums">{row.ratingCount}</TableCell>
                    <TableCell className="text-right align-top tabular-nums">
                      {row.submittedResponseCount}
                    </TableCell>
                    <TableCell className="text-right align-top tabular-nums">{row.evaluationCount}</TableCell>
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
    </div>
  );
}

function OutcomesExactValueTable({
  programId,
  outcomes,
  selectedPloId,
}: {
  programId: string;
  outcomes: ProgramHeadOutcomesDTO["outcomes"];
  selectedPloId?: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-title-sm text-foreground">Exact values by Program Learning Outcome</h3>
      <div className="border-border overflow-x-auto rounded-lg border">
        <Table aria-label="Exact values by graduate outcome">
          <TableHeader>
            <TableRow>
              <TableHead>Program Learning Outcome</TableHead>
              <TableHead className="text-right">Mean Rating</TableHead>
              <TableHead className="text-right">Rating Count</TableHead>
              <TableHead className="text-right">Submitted Responses</TableHead>
              <TableHead>Contributing CILOs</TableHead>
              <TableHead>Contributing Courses</TableHead>
              <TableHead>Review Evidence</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {outcomes.flatMap((outcome) => {
              const detailId = `plo-detail-${outcome.ploId}`;
              const isSelected = outcome.ploId === selectedPloId;
              const rows = [
                <TableRow key={outcome.ploId} className={cn(isSelected && "bg-primary-soft/40")}>
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
                    {outcome.contributingCilos.length > 0 ? (
                      <ul className="flex list-disc flex-col gap-0.5 pl-4">
                        {outcome.contributingCilos.map((cilo) => (
                          <li key={cilo.id}>{cilo.description}</li>
                        ))}
                      </ul>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="align-top">
                    {outcome.contributingCourses.length > 0
                      ? outcome.contributingCourses
                          .map((course) => course.code)
                          .join(", ")
                      : "—"}
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
                              className="text-link underline underline-offset-3 hover:text-foreground"
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
                <TableRow key={`${outcome.ploId}-detail`}>
                  <TableCell colSpan={7}>
                    <details open={isSelected}>
                      <summary
                        id={detailId}
                        className="text-label-sm text-text-secondary cursor-pointer"
                      >
                        Details for {outcome.code}
                      </summary>
                      <div className="pt-3">
                        <ProgramHeadPLODetail outcome={outcome} />
                      </div>
                    </details>
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
