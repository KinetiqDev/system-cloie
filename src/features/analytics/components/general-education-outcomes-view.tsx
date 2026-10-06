import Link from "next/link";
import { Unlink } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import { Disclosure, DisclosureContent, DisclosureTrigger } from "@/components/ui/disclosure";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { buildGeneralEducationResponsesUrl } from "@/features/response-review/services/general-education-responses-state";
import type {
  GeneralEducationIloEvidenceDTO,
  GeneralEducationOutcomesDTO,
} from "@/features/analytics/general-education-analytics-types";
import { INSTITUTIONAL_OUTCOME_LABELS } from "@/features/analytics/outcome-evidence-types";
import type { GeneralEducationAnalyticsFilterState } from "@/features/analytics/services/general-education-analytics-state";
import { GeneralEducationInlineAiInsight } from "./general-education-inline-ai-insight";
import {
  LazyGeneralEducationAlignmentChart,
  LazyGeneralEducationDistributionChart,
  LazyOutcomeMeanBarChart,
} from "./general-education-analytics-visualizations";
import type { GeneralEducationDistributionGroup } from "./general-education-distribution-chart";
import { OutcomeContributorMatrix } from "./outcome-contributor-matrix";
import { OutcomeEvidenceDetail } from "./outcome-evidence-detail";
import { HowCalculatedPopover } from "./how-calculated-popover";
import { SelectedOutcomeScrollTarget } from "./selected-outcome-scroll-target";
import {
  countedNoun,
  emptyScopeCopy,
  formatMean,
  scaleIdentityKey,
  ScopeEmptyState,
  SectionShell,
} from "./general-education-evidence-primitives";
import {
  LOW_SAMPLE_RESPONSES,
  LowSampleMarker,
  MissingValue,
} from "./general-education-evidence-marks";

/**
 * Many-to-many contribution rule: a rating bound to a CILO mapped to several
 * Institutional Learning Outcomes counts once in each mapped ILO row.
 */
const MANY_TO_MANY_DISCLOSURE =
  "A rating bound to a CILO mapped to more than one Institutional Learning Outcome contributes to each mapped outcome row, so outcome rows are not additive across ILOs.";

/** Response-review link for the identified evidence behind one ILO row. */
function iloReviewHref(outcomeId: string, filters: GeneralEducationAnalyticsFilterState): string {
  return buildGeneralEducationResponsesUrl({
    page: 1,
    iloId: outcomeId,
    termInstanceId: filters.termInstanceId,
    schoolYearId: filters.schoolYearId,
    semester: filters.semester,
    courseId: filters.courseId,
    programId: filters.programId,
    yearLevel: filters.yearLevel,
  });
}

type GeneralEducationOutcomesViewProps = {
  data: GeneralEducationOutcomesDTO;
  resetHref: string;
  filters: GeneralEducationAnalyticsFilterState;
};

/** Catalog order — the ILO catalog's own order, not mean rank. */
function catalogOrder(outcomes: GeneralEducationIloEvidenceDTO[]) {
  return [...outcomes].sort((left, right) => left.order - right.order);
}

/**
 * Per-scale distribution groups for one ILO. The group key is the structural
 * scale identity, never the readable label: two different instrument scales
 * that print the same range stay separate rows instead of collapsing.
 */
function distributionGroupsFor(
  outcome: GeneralEducationIloEvidenceDTO
): GeneralEducationDistributionGroup[] {
  return outcome.distributions.map((distribution, index) => ({
    key: `${outcome.outcomeId}:${scaleIdentityKey(distribution)}:${index}`,
    label: `${outcome.code} · ${distribution.scaleLabel}`,
    scaleLabel: distribution.scaleLabel,
    categories: distribution.categories,
  }));
}

/** Flatten every ILO's per-scale distributions into one 100% comparison. */
function allDistributionGroups(
  outcomes: GeneralEducationIloEvidenceDTO[]
): GeneralEducationDistributionGroup[] {
  return outcomes.flatMap((outcome) => distributionGroupsFor(outcome));
}

export function GeneralEducationOutcomesView({
  data,
  resetHref,
  filters,
}: GeneralEducationOutcomesViewProps) {
  const {
    emptyReason,
    outcomes,
    currentMappingDisclosure,
    manyToManyDisclosure,
    unlinkedRatings,
    alignmentCoverage,
    courseMatrix,
  } = data;

  const ordered = catalogOrder(outcomes);
  const hasOutcomes = ordered.length > 0;
  const crossScaleOutcomes = ordered.filter((outcome) => outcome.spansMultipleScales);
  const scopeEmpty = emptyScopeCopy(emptyReason === "no-mapped-outcomes" ? null : emptyReason);

  // Many-to-many ILO rows are not additive: one rating reaches every mapped
  // ILO, so summing rows would report a false total. The label names the rows
  // and their distinct contributing courses instead.
  const contributingCourseIds = new Set(
    ordered.flatMap((outcome) => outcome.contributingCourses.map((course) => course.id))
  );
  const evidenceBasis = `${countedNoun(ordered.length, "institutional learning outcome")} with evidence from ${countedNoun(contributingCourseIds.size, "course")}`;

  return (
    <div className="flex flex-col gap-6">
      {/* Unlinked valid ratings are reported whenever they exist, including in a
          scope whose ratings reach no ILO row at all — otherwise the counts a
          reader most needs would disappear exactly when mapping is broken. */}
      {unlinkedRatings.generalItems + unlinkedRatings.unmappedCilos > 0 ? (
        <Alert variant="warning">
          <AlertTitle>Valid ratings that reached no learning outcome</AlertTitle>
          <AlertDescription>
            {countedNoun(unlinkedRatings.unmappedCilos, "rating")} came from CILOs with no current
            ILO mapping, and {countedNoun(unlinkedRatings.generalItems, "general question rating")}{" "}
            bound to no CILO. They are counted here rather than silently dropped, and no
            institutional target exists against which any mean could be judged.
          </AlertDescription>
        </Alert>
      ) : null}
      {scopeEmpty ? (
        <ScopeEmptyState
          title={scopeEmpty.title}
          description={scopeEmpty.description}
          resetHref={resetHref}
        />
      ) : null}

      {emptyReason === "no-mapped-outcomes" ? (
        <ScopeEmptyState
          title="No mapped ILO evidence"
          description="Submitted General Education ratings exist in this scope, but none reach an Institutional Learning Outcome. Every rating must pass through a published CILO question binding and that CILO's current ILO mapping; there is no direct question-to-ILO binding."
          resetHref={resetHref}
        />
      ) : null}

      {hasOutcomes ? (
        <>
          <div className="flex flex-col gap-3">
            <Alert variant="information">
              <AlertTitle>Current CILO-to-ILO mappings</AlertTitle>
              <AlertDescription>{currentMappingDisclosure}</AlertDescription>
            </Alert>
            {manyToManyDisclosure ? (
              <Alert variant="information">
                <AlertTitle>Multiple ILO mapping</AlertTitle>
                <AlertDescription>{MANY_TO_MANY_DISCLOSURE}</AlertDescription>
              </Alert>
            ) : null}
            {crossScaleOutcomes.length > 0 ? (
              <Alert variant="warning">
                <AlertTitle>
                  {countedNoun(crossScaleOutcomes.length, "outcome")} pool more than one rating
                  scale
                </AlertTitle>
                <AlertDescription>
                  {crossScaleOutcomes.map((outcome) => outcome.code).join(", ")} combine ratings
                  from different frozen instrument-version scales. Values across different scales
                  are not directly comparable, so each scale keeps its own distribution below.
                </AlertDescription>
              </Alert>
            ) : null}
          </div>

          <LazyOutcomeMeanBarChart
            title="Mean Rating by Institutional Learning Outcome"
            outcomes={ordered}
            labels={INSTITUTIONAL_OUTCOME_LABELS}
            preserveOrder
          />

          <LazyGeneralEducationDistributionChart
            title="Likert Distribution by Outcome and Scale"
            description="Each bar is normalized to its own scale's valid ratings, so a 1–4 instrument and a 1–5 instrument each fill their own bar instead of implying one shared range."
            groups={allDistributionGroups(ordered)}
            emptyTitle="No resolved Likert distribution"
            emptyDescription="No valid rating in this scope resolved against a frozen instrument scale."
          />

          <LazyGeneralEducationAlignmentChart
            title="CILO Alignment by Learning, Practice, and Opportunity"
            rows={alignmentCoverage}
            emptyTitle="No alignment coverage yet"
            emptyDescription="No active CILO in this scope is currently mapped to an Institutional Learning Outcome."
          />

          {/* One insight per view, placed after every deterministic chart and
              before the matrices and exact tables, so the interpretation never
              precedes evidence it claims to read. */}
          <GeneralEducationInlineAiInsight
            view="outcomes"
            filters={filters}
            evidenceBasis={evidenceBasis}
          />

          <CourseIloMatrix matrix={courseMatrix} outcomes={ordered} />

          <OutcomeContributorMatrix
            outcomes={ordered}
            labels={INSTITUTIONAL_OUTCOME_LABELS}
            selectedOutcomeId={filters.iloId}
            renderReviewLinks={(outcome) => (
              <div className="text-body-sm mt-3 flex flex-col gap-2">
                <Link
                  href={iloReviewHref(outcome.outcomeId, filters)}
                  className="text-link underline underline-offset-3 pointer-coarse:min-h-11 pointer-coarse:content-center"
                >
                  Review responses for {outcome.code}
                </Link>
                {outcome.evidenceEvaluations.map((evaluation) => (
                  <Link
                    key={evaluation.evaluationId}
                    href={`/gen-ed-coordinator/responses/course/${evaluation.evaluationId}`}
                    className="text-link underline underline-offset-3 pointer-coarse:min-h-11 pointer-coarse:content-center"
                  >
                    {evaluation.deploymentName}
                  </Link>
                ))}
              </div>
            )}
          />

          <SectionShell
            id="ge-outcome-exact-values"
            title="Exact values by institutional learning outcome"
            description="Every reported number in one place, with the scale context, archived state, and review links behind each row."
          >
            <OutcomesExactValueTable
              outcomes={ordered}
              selectedIloId={filters.iloId}
              filters={filters}
            />
          </SectionShell>
        </>
      ) : null}

      {/* The insight mounts on every Outcomes scope, empty or not: its own
          server action reports insufficient evidence in its own words. */}
      {!hasOutcomes ? (
        <GeneralEducationInlineAiInsight
          view="outcomes"
          filters={filters}
          evidenceBasis={`No institutional learning outcome evidence in this scope; ${
            unlinkedRatings.generalItems + unlinkedRatings.unmappedCilos
          } valid ratings reached no ILO mapping`}
        />
      ) : null}

      <SelectedOutcomeScrollTarget outcomeId={filters.iloId} />
    </div>
  );
}

/**
 * Course × ILO coverage. A cell is aligned when the course carries an active
 * CILO mapped to that ILO; aligned-without-ratings and unaligned-without-ratings
 * stay visibly different, because one means the mapping exists and the other
 * means it does not.
 */
function CourseIloMatrix({
  matrix,
  outcomes,
}: {
  matrix: GeneralEducationOutcomesDTO["courseMatrix"];
  outcomes: GeneralEducationIloEvidenceDTO[];
}) {
  if (matrix.length === 0) {
    return (
      <SectionShell
        id="ge-course-ilo-matrix"
        title="Course × learning outcome coverage"
        description="Whether each General Education course carries an active CILO mapped to each Institutional Learning Outcome."
      >
        <Empty className="h-48">
          <EmptyTitle>No course coverage</EmptyTitle>
          <EmptyDescription>
            No General Education course in this scope carries an active CILO mapped to an
            Institutional Learning Outcome.
          </EmptyDescription>
        </Empty>
      </SectionShell>
    );
  }

  return (
    <SectionShell
      id="ge-course-ilo-matrix"
      title="Course × learning outcome coverage"
      description="Aligned means the course carries an active CILO currently mapped to that ILO. Aligned without ratings still shows a mean of —, while a course with no such mapping reports no alignment at all."
    >
      <div className="border-border/80 overflow-x-auto rounded-lg border">
        <Table aria-label="Course and institutional learning outcome alignment">
          <TableHeader>
            <TableRow>
              <TableHead>Course</TableHead>
              {outcomes.map((outcome) => (
                <TableHead key={outcome.outcomeId} className="text-right whitespace-nowrap">
                  {outcome.code}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {matrix.map((row) => (
              <TableRow key={row.courseId}>
                <TableCell className="align-top">
                  <div className="flex flex-col">
                    <span className="font-medium whitespace-nowrap">{row.courseCode}</span>
                    <span className="text-text-secondary whitespace-normal">{row.courseTitle}</span>
                  </div>
                </TableCell>
                {row.cells.map((cell) => (
                  <TableCell
                    key={cell.outcomeId}
                    className={cn(
                      "text-right align-top whitespace-nowrap tabular-nums",
                      cell.aligned ? "bg-primary-soft/40" : undefined
                    )}
                  >
                    {cell.aligned ? (
                      <span className="flex flex-col items-end gap-0.5">
                        <span className="font-medium">{formatMean(cell.meanRating)}</span>
                        <span className="text-caption text-muted-foreground">
                          {cell.ratingCount} rating{cell.ratingCount === 1 ? "" : "s"}
                          {cell.spansMultipleScales ? " · mixed scales" : ""}
                        </span>
                      </span>
                    ) : (
                      <span className="text-caption text-text-secondary">No alignment</span>
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </SectionShell>
  );
}

function OutcomeCatalogLabel({ outcome }: { outcome: GeneralEducationIloEvidenceDTO }) {
  const isThinSample =
    outcome.submittedResponseCount > 0 && outcome.submittedResponseCount < LOW_SAMPLE_RESPONSES;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="font-semibold">{outcome.code}</span>
        {!outcome.isActive ? <Badge variant="secondary">Archived</Badge> : null}
      </div>
      <span className="text-text-secondary whitespace-normal">{outcome.name}</span>
      {!outcome.isActive ? (
        <span className="text-caption text-muted-foreground">
          Archived: kept for historical evidence, no longer assignable to new mappings.
        </span>
      ) : null}
      {outcome.ratingCount === 0 ? (
        <span className="text-caption text-text-secondary">
          No evidence in this scope — listed from the ILO catalog, not from responses.
        </span>
      ) : null}
      {isThinSample ? <LowSampleMarker responseCount={outcome.submittedResponseCount} /> : null}
    </div>
  );
}

function OutcomesExactValueTable({
  outcomes,
  selectedIloId,
  filters,
}: {
  outcomes: GeneralEducationIloEvidenceDTO[];
  selectedIloId?: string;
  filters: GeneralEducationAnalyticsFilterState;
}) {
  return (
    <div className="border-border/80 overflow-x-auto rounded-lg border">
      <Table aria-label="Exact values by institutional learning outcome">
        <TableHeader>
          <TableRow>
            <TableHead>Institutional Learning Outcome</TableHead>
            <TableHead className="text-right">Mean Rating</TableHead>
            <TableHead className="text-right">Rating Count</TableHead>
            <TableHead className="text-right">Submitted Responses</TableHead>
            <TableHead>Scales</TableHead>
            <TableHead>Review Evidence</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {outcomes.flatMap((outcome) => {
            const detailId = `ge-ilo-detail-${outcome.outcomeId}`;
            const isSelected = outcome.outcomeId === selectedIloId;
            return [
              <TableRow
                key={outcome.outcomeId}
                data-outcome-row={outcome.outcomeId}
                className={cn(isSelected && "bg-primary-soft/40")}
              >
                <TableCell className="align-top">
                  <OutcomeCatalogLabel outcome={outcome} />
                </TableCell>
                <TableCell className="text-right align-top tabular-nums">
                  <span className="inline-flex items-center gap-1">
                    {formatMean(outcome.meanRating)}
                    <HowCalculatedPopover metric={outcome.evidenceSummary} label={outcome.code} />
                  </span>
                </TableCell>
                <TableCell className="text-right align-top tabular-nums">
                  {outcome.ratingCount}
                  {outcome.excludedRatingCount > 0 ? (
                    <span className="text-caption text-muted-foreground block">
                      {outcome.excludedRatingCount} excluded
                    </span>
                  ) : null}
                </TableCell>
                <TableCell className="text-right align-top tabular-nums">
                  {outcome.submittedResponseCount}
                </TableCell>
                <TableCell className="align-top">
                  {outcome.distributions.length > 0 ? (
                    <ul className="flex flex-col gap-0.5">
                      {outcome.distributions.map((distribution) => (
                        <li key={distribution.scaleLabel} className="text-caption whitespace-nowrap">
                          {distribution.scaleLabel}
                        </li>
                      ))}
                      {outcome.spansMultipleScales ? (
                        <li className="text-label-sm text-warning">Mixed scales</li>
                      ) : null}
                    </ul>
                  ) : (
                    <MissingValue />
                  )}
                </TableCell>
                <TableCell className="align-top">
                  <div className="flex flex-col gap-1">
                    <Link
                      href={iloReviewHref(outcome.outcomeId, filters)}
                      className="text-link hover:text-foreground underline underline-offset-3 pointer-coarse:inline-flex pointer-coarse:min-h-11 pointer-coarse:items-center"
                    >
                      Review responses
                    </Link>
                    {outcome.evidenceEvaluations.length > 0 ? (
                      <ul className="flex flex-col gap-0.5">
                        {outcome.evidenceEvaluations.map((evaluation) => (
                          <li key={evaluation.evaluationId} className="text-caption whitespace-nowrap">
                            {evaluation.deploymentName}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-caption text-muted-foreground">
                        No evaluation contributed ratings
                      </span>
                    )}
                  </div>
                </TableCell>
              </TableRow>,
              <TableRow key={`${outcome.outcomeId}-detail`}>
                <TableCell colSpan={6}>
                  <Disclosure open={isSelected}>
                    <DisclosureTrigger variant="link" id={detailId}>
                      Details for {outcome.code}
                    </DisclosureTrigger>
                    <DisclosureContent>
                      <div className="flex flex-col gap-4">
                        <OutcomeEvidenceDetail outcome={outcome} />
                        {outcome.contributingCilos.length > 0 ? (
                          <div className="flex flex-col gap-1.5">
                            <h4 className="text-title-sm text-foreground">Contributing CILOs</h4>
                            <ul className="text-body-sm text-text-secondary list-disc space-y-0.5 pl-5">
                              {outcome.contributingCilos.map((cilo) => (
                                <li key={cilo.id}>{cilo.description}</li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                        <p className="text-body-sm text-text-secondary flex items-start gap-1.5">
                          <Unlink aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
                          Individual respondents, raw answers, and comment text stay in the
                          separately authorized response review. This aggregate payload carries no
                          respondent identity.
                        </p>
                      </div>
                    </DisclosureContent>
                  </Disclosure>
                </TableCell>
              </TableRow>,
            ];
          })}
        </TableBody>
      </Table>
    </div>
  );
}
