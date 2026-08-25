import { ClipboardList, Inbox } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { buildProgramHeadResponsesCourseEvaluationPath } from "@/lib/constants/program-head-routes";
import type {
  ProgramHeadBreakdownRowDTO,
  ProgramHeadBreakdownsDTO,
  ProgramHeadContextualBreakdownDTO,
  ProgramHeadCourseBreakdownRowDTO,
} from "@/features/analytics/program-head-analytics-types";
import {
  ProgramHeadComparisonChart,
  ProgramHeadInstrumentBreakdownChart,
} from "./program-head-analytics-visualizations";
import type { ProgramHeadComparisonDatum } from "./program-head-comparison-chart";

type ProgramHeadBreakdownsViewProps = {
  programId: string;
  data: ProgramHeadBreakdownsDTO;
  resetHref: string;
};

function breakdownRowToDatum(row: ProgramHeadBreakdownRowDTO): ProgramHeadComparisonDatum {
  return {
    key: row.key,
    label: row.label,
    meanRating: row.meanRating,
    ratingCount: row.ratingCount,
    submittedResponseCount: row.submittedResponseCount,
  };
}

function courseRowToDatum(
  programId: string,
  row: ProgramHeadCourseBreakdownRowDTO
): ProgramHeadComparisonDatum {
  return {
    ...breakdownRowToDatum(row),
    context: row.instrumentContext,
    links: row.evidenceEvaluations.map((evaluation) => ({
      href: buildProgramHeadResponsesCourseEvaluationPath(programId, evaluation.evaluationId),
      label: evaluation.deploymentName,
    })),
  };
}

function contextualChart(title: string, breakdown: ProgramHeadContextualBreakdownDTO) {
  return (
    <ProgramHeadComparisonChart
      title={title}
      description={breakdown.attributionNote}
      rows={breakdown.rows.map(breakdownRowToDatum)}
      tableOnlyRows={breakdown.unspecified.map(breakdownRowToDatum)}
    />
  );
}

/** Meaningful empty note for a dimension with no applicable evidence. */
function DimensionNote({
  title,
  children,
  resetHref,
}: {
  title: string;
  children: string;
  resetHref: string;
}) {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Inbox aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{children}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Link href={resetHref} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          View all periods
        </Link>
      </EmptyContent>
    </Empty>
  );
}

/**
 * Course, instrument, and defensible contextual breakdowns. Course rows cover
 * course-bound student evidence only; instrument rows keep every evidence
 * source separate; major and year-level dimensions appear only when
 * attribution is defensible, with incomplete attribution reported as
 * `Unspecified` rather than guessed.
 */
export function ProgramHeadBreakdownsView({
  programId,
  data,
  resetHref,
}: ProgramHeadBreakdownsViewProps) {
  const { emptyReason, courseRows, instrumentRows, majorBreakdown, yearLevelBreakdown } = data;
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
            evidence to break down by course, instrument, major, or year level.
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

  return (
    <div className="flex flex-col gap-6">
      {courseRows.length > 0 ? (
        <section aria-label="Course breakdown">
          <ProgramHeadComparisonChart
            title="Mean Rating by Course"
            description="Course-bound student evidence only. Each row discloses the instruments behind its ratings and links to authorized review evidence."
            rows={courseRows.map((row) => courseRowToDatum(programId, row))}
          />
        </section>
      ) : (
        <DimensionNote title="Course Breakdown" resetHref={resetHref}>
          No course-bound student evidence exists in this scope, so there is no defensible course
          attribution to break down.
        </DimensionNote>
      )}

      {instrumentRows.length > 0 ? (
        <section aria-label="Instrument breakdown">
          <ProgramHeadInstrumentBreakdownChart rows={instrumentRows} />
        </section>
      ) : (
        <DimensionNote title="Instrument Breakdown" resetHref={resetHref}>
          No instrument evidence exists in this scope.
        </DimensionNote>
      )}

      {majorBreakdown ? (
        <section aria-label="Major breakdown">
          {contextualChart("Mean Rating by Major", majorBreakdown)}
        </section>
      ) : (
        <DimensionNote title="Major Breakdown" resetHref={resetHref}>
          No evidence in this scope has defensible major attribution, so no major comparison is
          shown. Major attribution comes only from central deployment targeting; course-bound
          evidence does not snapshot a major.
        </DimensionNote>
      )}

      {yearLevelBreakdown ? (
        <section aria-label="Year-level breakdown">
          {contextualChart("Mean Rating by Year Level", yearLevelBreakdown)}
        </section>
      ) : (
        <DimensionNote title="Year-Level Breakdown" resetHref={resetHref}>
          No evidence in this scope has defensible year-level attribution, so no year-level
          comparison is shown. Attribution requires a central deployment targeting one year level or
          a course-bound evaluation targeting exactly one year level for this Program.
        </DimensionNote>
      )}
    </div>
  );
}
