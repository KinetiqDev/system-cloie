import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { buildGeneralEducationResponsesUrl } from "@/features/response-review/services/general-education-responses-state";
import type { GeneralEducationProgramsDTO } from "@/features/analytics/general-education-analytics-types";
import type { GeneralEducationAnalyticsFilterState } from "@/features/analytics/services/general-education-analytics-state";
import { GeneralEducationInlineAiInsight } from "./general-education-inline-ai-insight";
import {
  LazyGeneralEducationResponseRateChart,
  LazyGeneralEducationScaleMeanChart,
} from "./general-education-analytics-visualizations";
import type { GeneralEducationScaleMeanDatum } from "./general-education-scale-mean-chart";
import {
  buildScaleSeries,
  emptyScopeCopy,
  formatMean,
  ScopeEmptyState,
  formatResponseRate,
  SectionShell,
} from "./general-education-evidence-primitives";
import {
  LOW_SAMPLE_RESPONSES,
  LowSampleMarker,
  MissingValue,
} from "./general-education-evidence-marks";

type ProgramRow = GeneralEducationProgramsDTO["rows"][number];

type GeneralEducationProgramsViewProps = {
  data: GeneralEducationProgramsDTO;
  resetHref: string;
  filters: GeneralEducationAnalyticsFilterState;
};

function programScaleSeries(rows: ProgramRow[], filters: GeneralEducationAnalyticsFilterState) {
  return buildScaleSeries(rows, (row, scale) => {
    const datum: GeneralEducationScaleMeanDatum = {
      key: row.programId,
      label: `${row.programCode} — ${row.programName}`,
      meanRating: scale.meanRating,
      ratingCount: scale.ratingCount,
      submittedResponseCount: scale.submittedResponseCount,
      links: [
        {
          href: buildGeneralEducationResponsesUrl({
            page: 1,
            programId: row.programId,
            termInstanceId: filters.termInstanceId,
            schoolYearId: filters.schoolYearId,
            semester: filters.semester,
            courseId: filters.courseId,
            yearLevel: filters.yearLevel,
          }),
          label: "Review responses",
        },
      ],
    };
    return datum;
  });
}

/**
 * Program view for college-wide General Education evidence. A program here is
 * the class context a respondent was enrolled in, not a Program-owned
 * evaluation, and every mean stays inside one frozen rating scale.
 */
export function GeneralEducationProgramsView({
  data,
  resetHref,
  filters,
}: GeneralEducationProgramsViewProps) {
  const { rows, courseMatrix, attributionNote, emptyReason } = data;
  const scopeEmpty = emptyScopeCopy(emptyReason);

  const totalResponses = rows.reduce((sum, row) => sum + row.submittedResponseCount, 0);
  const totalRatings = rows.reduce((sum, row) => sum + row.ratingCount, 0);
  const evidenceBasis = `${totalResponses} submitted ${
    totalResponses === 1 ? "response" : "responses"
  } and ${totalRatings} valid ${totalRatings === 1 ? "rating" : "ratings"} across ${
    rows.length
  } ${rows.length === 1 ? "program" : "programs"}`;

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
          <LazyGeneralEducationResponseRateChart
            title="Response Rate by Program of Respondents"
            description="Submitted responses against in-scope evaluation opportunities, attributed to the Program each respondent was enrolled in."
            rows={rows.map((row) => ({
              key: row.programId,
              label: `${row.programCode} — ${row.programName}`,
              responseRate: row.responseRate,
              submittedResponseCount: row.submittedResponseCount,
              evaluationOpportunityCount: row.evaluationOpportunityCount,
            }))}
            emptyTitle="No response-rate evidence yet"
            emptyDescription="No Program in this scope has an evaluation opportunity, so no response rate exists."
          />

          <LazyGeneralEducationScaleMeanChart
            title="Mean Rating by Program of Respondents"
            description="Each scale is ranked on its own. A Program whose evidence spans two instruments appears once per scale rather than as one blended mean."
            series={programScaleSeries(rows, filters)}
            emptyTitle="No rated program evidence yet"
            emptyDescription="Programs responded in this scope, but none carried a valid in-scale rating."
          />

          {/* One insight per view, after every deterministic chart and before
              the attribution and matrix sections. */}
          <GeneralEducationInlineAiInsight
            view="programs"
            filters={filters}
            evidenceBasis={evidenceBasis}
          />

          <SectionShell id="ge-program-attribution" title="How program attribution works">
            <Alert variant="information">
              <AlertTitle>Class-context attribution</AlertTitle>
              <AlertDescription>{attributionNote}</AlertDescription>
            </Alert>
          </SectionShell>

          <SectionShell
            id="ge-program-matrix"
            title="Course × Program evidence matrix"
            description="Where each General Education course drew its respondents from. A blank cell means that course was not evaluated for that Program in this scope."
          >
            <ProgramCourseMatrix matrix={courseMatrix} rows={rows} />
          </SectionShell>

          <SectionShell
            id="ge-program-exact-values"
            title="Exact values by program of respondents"
            description="Each Program's mean, response rate, rating count, section count, scale breakdown, and identified-review link in one place."
          >
            <GeneralEducationProgramExactTable rows={rows} filters={filters} />
          </SectionShell>
        </>
      ) : null}

      {!scopeEmpty && rows.length === 0 ? (
        <ScopeEmptyState
          title="No program attribution in this scope"
          description="Submitted General Education responses exist, but none belong to a respondent enrolled in a Program that can be attributed here."
          resetHref={resetHref}
        />
      ) : null}

      {/* The insight mounts on every Programs scope, empty or not. */}
      {!scopeEmpty && rows.length === 0 ? (
        <GeneralEducationInlineAiInsight
          view="programs"
          filters={filters}
          evidenceBasis="No program attribution in this scope"
        />
      ) : null}
    </div>
  );
}

function ProgramCourseMatrix({
  matrix,
  rows,
}: {
  matrix: GeneralEducationProgramsDTO["courseMatrix"];
  rows: ProgramRow[];
}) {
  if (matrix.length === 0) {
    return (
      <Empty className="h-48">
        <EmptyTitle>No course attribution</EmptyTitle>
        <EmptyDescription>
          No General Education course in this scope carries respondent program attribution.
        </EmptyDescription>
      </Empty>
    );
  }

  return (
    <div className="border-border/80 overflow-x-auto rounded-lg border">
      <Table aria-label="Course and program evidence matrix">
        <TableHeader>
          <TableRow>
            <TableHead>Course</TableHead>
            {rows.map((row) => (
              <TableHead key={row.programId} className="text-right whitespace-nowrap">
                {row.programCode}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {matrix.map((course) => (
            <TableRow key={course.courseId}>
              <TableCell className="align-top font-medium whitespace-nowrap">
                {course.courseCode}
              </TableCell>
              {course.cells.map((cell) => (
                <TableCell
                  key={cell.programId}
                  className="text-right align-top whitespace-nowrap tabular-nums"
                >
                  {cell.ratingCount === 0 && cell.submittedResponseCount === 0 ? (
                    <span className="text-caption text-text-secondary">Not evaluated</span>
                  ) : (
                    <span className="flex flex-col items-end gap-0.5">
                      <span className="font-medium">{formatMean(cell.meanRating)}</span>
                      <span className="text-caption text-muted-foreground">
                        {cell.submittedResponseCount} resp · {cell.ratingCount} rating
                        {cell.ratingCount === 1 ? "" : "s"}
                        {cell.spansMultipleScales ? " · mixed" : ""}
                      </span>
                    </span>
                  )}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/** Exact program rows keep their own scale breakdown and review links. */
function GeneralEducationProgramExactTable({
  rows,
  filters,
}: {
  rows: ProgramRow[];
  filters: GeneralEducationAnalyticsFilterState;
}) {
  const thinSampleRows = rows.filter(
    (row) => row.submittedResponseCount > 0 && row.submittedResponseCount < LOW_SAMPLE_RESPONSES
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="border-border/80 overflow-x-auto rounded-lg border">
        <Table aria-label="Exact values by program of respondents">
          <TableHeader>
            <TableRow>
              <TableHead>Program</TableHead>
              <TableHead className="text-right">Mean Rating</TableHead>
              <TableHead className="text-right">Response Rate</TableHead>
              <TableHead className="text-right">Ratings</TableHead>
              <TableHead className="text-right">Sections</TableHead>
              <TableHead>Scales</TableHead>
              <TableHead>Review Evidence</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.programId}>
                <TableCell className="align-top">
                  <div className="flex flex-col">
                    <span className="font-semibold whitespace-nowrap">{row.programCode}</span>
                    <span className="text-text-secondary whitespace-normal">{row.programName}</span>
                    <span className="text-caption text-muted-foreground">
                      {row.courseCount} course{row.courseCount === 1 ? "" : "s"}
                    </span>
                    {row.submittedResponseCount > 0 &&
                    row.submittedResponseCount < LOW_SAMPLE_RESPONSES ? (
                      <LowSampleMarker responseCount={row.submittedResponseCount} />
                    ) : null}
                  </div>
                </TableCell>
                <TableCell className="text-right align-top tabular-nums">
                  {formatMean(row.meanRating)}
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
                <TableCell className="text-right align-top tabular-nums">
                  {row.sectionCount}
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
                  <Link
                    href={buildGeneralEducationResponsesUrl({
                      page: 1,
                      programId: row.programId,
                      termInstanceId: filters.termInstanceId,
                      schoolYearId: filters.schoolYearId,
                      semester: filters.semester,
                      courseId: filters.courseId,
                      yearLevel: filters.yearLevel,
                    })}
                    className="text-link hover:text-foreground underline underline-offset-3 pointer-coarse:inline-flex pointer-coarse:min-h-11 pointer-coarse:items-center"
                  >
                    Review responses
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {thinSampleRows.length > 0 ? (
        <p className="text-body-sm text-text-secondary">
          Means for {thinSampleRows.map((row) => row.programCode).join(", ")} rest on fewer than
          five submitted responses. The evidence stays visible, but read it as indicative only.
        </p>
      ) : null}
    </div>
  );
}
