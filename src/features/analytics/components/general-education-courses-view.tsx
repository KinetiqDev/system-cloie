import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Disclosure, DisclosureContent, DisclosureTrigger } from "@/components/ui/disclosure";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { buildGeneralEducationResponsesUrl } from "@/features/response-review/services/general-education-responses-state";
import type { GeneralEducationCourseBreakdownRow } from "@/features/analytics/general-education-analytics-types";
import type { GeneralEducationAnalyticsFilterState } from "@/features/analytics/services/general-education-analytics-state";
import { GeneralEducationInlineAiInsight } from "./general-education-inline-ai-insight";
import {
  LazyGeneralEducationDistributionChart,
  LazyGeneralEducationResponseRateChart,
  LazyGeneralEducationScaleMeanChart,
} from "./general-education-analytics-visualizations";
import type { GeneralEducationDistributionGroup } from "./general-education-distribution-chart";
import type { GeneralEducationScaleMeanDatum } from "./general-education-scale-mean-chart";
import {
  buildScaleSeries,
  countedNoun,
  emptyScopeCopy,
  formatChange,
  scaleIdentityKey,
  formatMean,
  ScopeEmptyState,
  formatResponseRate,
  SectionShell,
} from "./general-education-evidence-primitives";
import {
  CodeChip,
  LOW_SAMPLE_RESPONSES,
  LowSampleMarker,
  MissingValue,
} from "./general-education-evidence-marks";

type GeneralEducationCoursesViewProps = {
  rows: GeneralEducationCourseBreakdownRow[];
  emptyReason: GeneralEducationAnalyticsViewEmptyReason;
  resetHref: string;
  filters: GeneralEducationAnalyticsFilterState;
};

type GeneralEducationAnalyticsViewEmptyReason = "no-assignments" | "no-submissions" | null;

function courseDatum(
  row: GeneralEducationCourseBreakdownRow,
  filters: GeneralEducationAnalyticsFilterState
): GeneralEducationScaleMeanDatum {
  return {
    key: row.courseId,
    label: `${row.courseCode} — ${row.courseTitle}`,
    meanRating: null,
    ratingCount: 0,
    submittedResponseCount: row.submittedResponseCount,
    context: row.instrumentContext,
    links: [
      {
        href: buildGeneralEducationResponsesUrl({
          page: 1,
          courseId: row.courseId,
          termInstanceId: filters.termInstanceId,
          schoolYearId: filters.schoolYearId,
          semester: filters.semester,
          programId: filters.programId,
          yearLevel: filters.yearLevel,
        }),
        label: "Review responses",
      },
    ],
  };
}

/** Scale-separated mean series: one ranked chart per frozen scale identity. */
function courseScaleSeries(
  rows: GeneralEducationCourseBreakdownRow[],
  filters: GeneralEducationAnalyticsFilterState
) {
  return buildScaleSeries(rows, (row, scale) => ({
    ...courseDatum(row, filters),
    meanRating: scale.meanRating,
    ratingCount: scale.ratingCount,
    submittedResponseCount: scale.submittedResponseCount,
  }));
}

/** Each course's per-scale distributions, keyed by structural scale identity. */
function courseDistributionGroups(
  rows: GeneralEducationCourseBreakdownRow[]
): GeneralEducationDistributionGroup[] {
  return rows.flatMap((row) =>
    row.scaleGroups.map((scale, index) => ({
      key: `${row.courseId}:${scale.scaleKey || scaleIdentityKey(scale.distribution)}:${index}`,
      label: `${row.courseCode} · ${scale.scaleLabel}`,
      scaleLabel: scale.scaleLabel,
      categories: scale.distribution.categories,
    }))
  );
}

export function GeneralEducationCoursesView({
  rows,
  emptyReason,
  resetHref,
  filters,
}: GeneralEducationCoursesViewProps) {
  const scopeEmpty = emptyScopeCopy(emptyReason);

  const totalResponses = rows.reduce((sum, row) => sum + row.submittedResponseCount, 0);
  const totalRatings = rows.reduce((sum, row) => sum + row.ratingCount, 0);
  const evidenceBasis = `${totalResponses} submitted ${
    totalResponses === 1 ? "response" : "responses"
  } and ${totalRatings} valid ${totalRatings === 1 ? "rating" : "ratings"} across ${
    rows.length
  } ${rows.length === 1 ? "course" : "courses"}`;

  return (
    <div className="flex flex-col gap-6">
      {scopeEmpty ? (
        <ScopeEmptyState
          title={scopeEmpty.title}
          description={scopeEmpty.description}
          resetHref={resetHref}
        />
      ) : null}

      {!scopeEmpty && rows.length > 0 ? (
        <>
          <LazyGeneralEducationScaleMeanChart
            title="Mean Rating by General Education Course"
            description="Means are ranked inside one frozen rating scale at a time. A course whose evidence spans two scales appears once per scale, never as one blended number."
            series={courseScaleSeries(rows, filters)}
            emptyTitle="No rated course evidence yet"
            emptyDescription="Courses responded in this scope, but none carried a valid in-scale rating."
          />

          <LazyGeneralEducationResponseRateChart
            title="Response Rate by General Education Course"
            description="Submitted responses against in-scope evaluation opportunities. A course with no opportunities has no response rate, not a zero-percent rate."
            rows={rows.map((row) => ({
              key: row.courseId,
              label: `${row.courseCode} — ${row.courseTitle}`,
              responseRate: row.responseRate,
              submittedResponseCount: row.submittedResponseCount,
              evaluationOpportunityCount: row.evaluationOpportunityCount,
            }))}
            emptyTitle="No response-rate evidence yet"
            emptyDescription="No General Education course in this scope has an evaluation opportunity, so no response rate exists."
          />

          <LazyGeneralEducationDistributionChart
            title="Likert Distribution by Course and Scale"
            description="Each course's response mix on the scales it actually used. A bar is normalized to its own scale, so a course measured on a 1–4 instrument is never read against one measured on 1–5."
            groups={courseDistributionGroups(rows)}
            emptyTitle="No resolved Likert distribution"
            emptyDescription="No valid rating in this scope resolved against a frozen instrument scale."
          />

          {/* One insight per view, after every deterministic chart and before
              the exact table. */}
          <GeneralEducationInlineAiInsight
            view="courses"
            filters={filters}
            evidenceBasis={evidenceBasis}
          />

          <SectionShell
            id="ge-course-matrix"
            title="Exact values by General Education course"
            description="Every course's mean, scale context, aligned learning outcomes, and change against its previous comparable period."
          >
            <CourseMatrixTable rows={rows} filters={filters} />
          </SectionShell>
        </>
      ) : null}

      {!scopeEmpty && rows.length === 0 ? (
        <ScopeEmptyState
          title="No course evidence in this scope"
          description="Submitted General Education responses exist, but none belong to a course that can be broken down here."
          resetHref={resetHref}
        />
      ) : null}

      {/* The insight mounts on every Courses scope, empty or not; its own
          server action reports insufficient evidence when there is none. */}
      {!scopeEmpty && rows.length === 0 ? (
        <GeneralEducationInlineAiInsight
          view="courses"
          filters={filters}
          evidenceBasis="No General Education course evidence in this scope"
        />
      ) : null}
    </div>
  );
}

function CourseMatrixTable({
  rows,
  filters,
}: {
  rows: GeneralEducationCourseBreakdownRow[];
  filters: GeneralEducationAnalyticsFilterState;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="border-border/80 overflow-x-auto rounded-lg border">
        <Table aria-label="Exact values by General Education course">
          <TableHeader>
            <TableRow>
              <TableHead>Course</TableHead>
              <TableHead className="text-right">Mean Rating</TableHead>
              <TableHead className="text-right">Change vs Previous</TableHead>
              <TableHead className="text-right">Response Rate</TableHead>
              <TableHead className="text-right">Ratings</TableHead>
              <TableHead>Scales</TableHead>
              <TableHead>Aligned ILOs</TableHead>
              <TableHead>Drill Down</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.flatMap((row) => {
              const sectionId = `ge-course-sections-${row.courseId}`;
              const isThinSample =
                row.submittedResponseCount > 0 && row.submittedResponseCount < LOW_SAMPLE_RESPONSES;
              return [
                <TableRow key={row.courseId}>
                  <TableCell className="align-top">
                    <div className="flex flex-col">
                      <span className="font-semibold whitespace-nowrap">{row.courseCode}</span>
                      <span className="text-text-secondary whitespace-normal">
                        {row.courseTitle}
                      </span>
                      <span className="text-caption text-muted-foreground">
                        {countedNoun(row.sectionCount, "section")} ·{" "}
                        {countedNoun(row.programCount, "program")}
                      </span>
                      {isThinSample ? (
                        <LowSampleMarker responseCount={row.submittedResponseCount} />
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="text-right align-top tabular-nums">
                    {formatMean(row.meanRating)}
                    {row.excludedRatingCount > 0 ? (
                      <span className="text-caption text-muted-foreground block">
                        {row.excludedRatingCount} excluded
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-right align-top whitespace-nowrap tabular-nums">
                    {row.previousComparable ? (
                      <span className="flex flex-col items-end">
                        <span className="font-medium">
                          {formatChange(row.previousComparable.change)}
                        </span>
                        <span className="text-caption text-muted-foreground">
                          vs {row.previousComparable.periodLabel}
                        </span>
                      </span>
                    ) : (
                      <span className="text-caption text-text-secondary">No comparable period</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right align-top whitespace-nowrap tabular-nums">
                    {formatResponseRate(row.responseRate)}
                    <span className="text-caption text-muted-foreground block">
                      {row.submittedResponseCount}/{row.evaluationOpportunityCount}
                    </span>
                  </TableCell>
                  <TableCell className="text-right align-top tabular-nums">
                    {row.ratingCount}
                  </TableCell>
                  <TableCell className="align-top">
                    {row.scaleGroups.length > 0 ? (
                      <ul className="flex flex-col gap-0.5">
                        {row.scaleGroups.map((scale) => (
                          <li key={scale.scaleKey} className="text-caption whitespace-nowrap">
                            {scale.scaleLabel}
                          </li>
                        ))}
                        {row.spansMultipleScales ? (
                          <li className="text-label-sm text-warning">Mixed scales</li>
                        ) : null}
                      </ul>
                    ) : (
                      <MissingValue />
                    )}
                  </TableCell>
                  <TableCell className="align-top">
                    {row.alignedIlos.length > 0 ? (
                      <ul className="flex flex-wrap gap-1">
                        {row.alignedIlos.map((outcome) => (
                          <li key={outcome.id}>
                            <CodeChip>{outcome.code}</CodeChip>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-caption text-text-secondary whitespace-nowrap">
                        No active ILO mapping
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="align-top">
                    <Link
                      href={buildGeneralEducationResponsesUrl({
                        page: 1,
                        courseId: row.courseId,
                        termInstanceId: filters.termInstanceId,
                        schoolYearId: filters.schoolYearId,
                        semester: filters.semester,
                        programId: filters.programId,
                        yearLevel: filters.yearLevel,
                      })}
                      className="text-link hover:text-foreground underline underline-offset-3 pointer-coarse:inline-flex pointer-coarse:min-h-11 pointer-coarse:items-center"
                    >
                      Review responses
                    </Link>
                  </TableCell>
                </TableRow>,
                row.sections.length > 0 ? (
                  <TableRow key={`${row.courseId}-sections`}>
                    <TableCell colSpan={8}>
                      <Disclosure>
                        <DisclosureTrigger variant="link" id={sectionId}>
                          Sections for {row.courseCode} ({row.sections.length})
                        </DisclosureTrigger>
                        <DisclosureContent>
                          <CourseSectionsDisclosure row={row} />
                        </DisclosureContent>
                      </Disclosure>
                    </TableCell>
                  </TableRow>
                ) : null,
              ].filter(Boolean);
            })}
          </TableBody>
        </Table>
      </div>

      {rows.some((row) => row.spansMultipleScales) ? (
        <Alert variant="warning">
          <AlertTitle>Course means pool more than one rating scale</AlertTitle>
          <AlertDescription>
            {rows
              .filter((row) => row.spansMultipleScales)
              .map((row) => row.courseCode)
              .join(", ")}{" "}
            combine ratings from different frozen instrument-version scales. Treat their means as
            within-course indicators, not as values comparable to the single-scale courses above.
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}

/**
 * Section-level drill-down. It names the program, year level, and faculty
 * handling each section — the class context an evaluator needs — and carries no
 * respondent-level data.
 */
function CourseSectionsDisclosure({ row }: { row: GeneralEducationCourseBreakdownRow }) {
  return (
    <div className="border-border overflow-x-auto rounded-lg border">
      <Table aria-label={`Sections for ${row.courseCode}`}>
        <TableHeader>
          <TableRow>
            <TableHead>Program</TableHead>
            <TableHead>Year Level</TableHead>
            <TableHead>Section</TableHead>
            <TableHead>Faculty</TableHead>
            <TableHead className="text-right">Submitted / Opportunities</TableHead>
            <TableHead className="text-right">Mean Rating</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {row.sections.map((section) => (
            <TableRow key={section.evaluationId}>
              <TableCell className="align-top whitespace-nowrap">{section.programCode}</TableCell>
              <TableCell className="align-top whitespace-nowrap">{section.yearLevel}</TableCell>
              <TableCell className="align-top whitespace-nowrap">{section.section}</TableCell>
              <TableCell className="align-top whitespace-normal">{section.facultyName}</TableCell>
              <TableCell className="text-right align-top whitespace-nowrap tabular-nums">
                {section.submittedResponseCount} / {section.evaluationOpportunityCount}
              </TableCell>
              <TableCell className="text-right align-top tabular-nums">
                {formatMean(section.meanRating)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
