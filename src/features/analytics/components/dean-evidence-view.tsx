import type { ComponentProps, ReactNode } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Disclosure, DisclosureContent, DisclosureTrigger } from "@/components/ui/disclosure";
import { OUTCOME_ATTAINMENT_BENCHMARK } from "../aggregators/outcome-attainment";
import {
  GRADUATE_OUTCOME_LABELS,
  INSTITUTIONAL_OUTCOME_LABELS,
  type OutcomeEvidenceDTO,
} from "../outcome-evidence-types";
import type { WordCloudToken } from "../types";
import type { DeanEvidence } from "../services/dean-evidence";
import { deanAnalyticsUrl, type DeanAnalyticsFilters } from "../services/dean-analytics-state";
import {
  DEAN_BUCKET_SHORT_LABELS,
  DEAN_SOURCE_LABELS,
  DEAN_SOURCE_SHORT_LABELS,
  DEAN_STAKEHOLDER_LABELS,
  deanMean,
  deanRate,
  shortPeriod,
} from "./dean-format";
import { LazyDeanShareChart, LazyDeanTrendChart, LazyDeanValueChart } from "./dean-visualizations";
import { LikertDistributionTable } from "./likert-distribution-table";
import { AttainmentBadge, getAttainmentColor } from "./outcome-attainment-badge";
import { AttainmentLegend } from "./outcome-attainment-legend";
import { deanScopedParticipation, deanScaleDomain } from "./dean-presentation";
import {
  LazyOutcomeMeanBarChart,
  LazyProgramHeadInstrumentBreakdownChart,
  LazyQualitativeWordCloud,
} from "./program-head-analytics-visualizations";

type EvidenceKind<K extends DeanEvidence["kind"]> = Extract<DeanEvidence, { kind: K }>;
type CollegeData = EvidenceKind<"college">["college"];

/** Axis spanning every frozen scale in view; falls back to the 1–5 scale. */
function trendDomain(domains: Array<[number, number] | null>): [number, number] {
  const known = domains.filter((domain): domain is [number, number] => domain !== null);
  if (known.length === 0) return [1, 5];
  return [Math.min(...known.map(([min]) => min)), Math.max(...known.map(([, max]) => max))];
}

const linkStyle =
  "text-link underline underline-offset-4 rounded focus-visible:outline-2 focus-visible:outline-ring pointer-coarse:min-h-11 inline-flex items-center";

function Section({
  title,
  intro,
  children,
}: {
  title: string;
  intro?: string;
  children: ReactNode;
}) {
  return (
    <section className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-heading-lg">{title}</h2>
        {intro ? <p className="text-body-sm text-text-secondary">{intro}</p> : null}
      </div>
      {children}
    </section>
  );
}

function Stats({ items }: { items: Array<{ label: string; value: string }> }) {
  return (
    <dl className="bg-card grid grid-cols-2 gap-x-4 gap-y-4 rounded-xl border p-4 sm:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="flex min-w-0 flex-col gap-1">
          <dt className="text-label-md text-text-secondary">{item.label}</dt>
          <dd className="text-heading-lg tabular-nums">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function Note({ children }: { children: ReactNode }) {
  return <p className="text-body-sm text-text-secondary">{children}</p>;
}

function ProgramSnapshot({
  college,
  programId,
  filters,
}: {
  college: CollegeData;
  programId: string;
  filters: DeanAnalyticsFilters;
}) {
  const coverage = college.programRows.find((program) => program.id === programId);
  if (!coverage) return null;
  const row = deanScopedParticipation(college.evidence, programId, filters);
  return (
    <Stats
      items={[
        { label: "Submitted", value: String(row.submitted) },
        { label: "Assigned", value: String(row.opportunities) },
        { label: "Response rate", value: deanRate(row.rate) },
        {
          label: "Program course coverage",
          value: `${coverage.unevaluatedAssignmentCount} of ${coverage.courseAssignmentCount} not evaluated`,
        },
      ]}
    />
  );
}

function RepeatedTermsCloud({
  tokens,
  answerCount,
}: {
  tokens: WordCloudToken[];
  answerCount: number;
}) {
  const repeated = tokens.filter((token) => token.value > 1 && (token.responseCount ?? 0) > 1);
  if (repeated.length === 0) return <Note>No word was mentioned by more than one respondent.</Note>;
  return (
    <LazyQualitativeWordCloud
      title="Most repeated words"
      tokens={repeated}
      answerCount={answerCount}
    />
  );
}

function DeanOutcomeRows({
  rows,
  institutional = false,
}: {
  rows: OutcomeEvidenceDTO[];
  institutional?: boolean;
}) {
  return (
    <div className="flex flex-col gap-3">
      {rows.map((row) => (
        <details key={row.outcomeId} className="bg-card rounded-xl border p-4">
          <summary className="text-body-sm cursor-pointer font-semibold break-words pointer-coarse:min-h-11">
            {row.code} · {row.name}{" "}
            <span className="text-muted-foreground font-normal">· {row.ratingCount} ratings</span>
          </summary>
          <div className="text-body-sm mt-4 flex flex-col gap-4">
            <p className="tabular-nums">
              Average:{" "}
              {row.spansMultipleScales
                ? "not combined across different scales"
                : deanMean(row.meanRating)}{" "}
              · {row.submittedResponseCount} submissions
              {row.excludedRatingCount > 0 ? ` · ${row.excludedRatingCount} ratings left out` : ""}
            </p>
            {!institutional && <AttainmentBadge attainment={row.attainment} />}
            {row.ratingCount === 0 && (
              <p>No ratings yet. This is missing evidence, not a low score.</p>
            )}
            {row.contributors.length > 0 && (
              <div className="flex flex-col gap-2">
                <h3 className="text-title-sm">Courses and questions behind this</h3>
                <ul className="flex flex-col gap-1.5">
                  {row.contributors.map((contributor, index) => (
                    <li key={index} className="break-words">
                      {contributor.course?.code} ·{" "}
                      {contributor.kind === "CILO"
                        ? `${contributor.ciloCode}: ${contributor.ciloDescription}`
                        : contributor.questionPrompt}{" "}
                      · {contributor.ratingCount} ratings
                      {!row.spansMultipleScales && ` · average ${deanMean(contributor.meanRating)}`}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {row.distributions.length > 0 && (
              <div className="flex flex-col gap-2">
                <h3 className="text-title-sm">How people rated</h3>
                {row.distributions.map((distribution, index) => (
                  <LikertDistributionTable key={index} distribution={distribution} />
                ))}
              </div>
            )}
            {row.evidenceEvaluations.length > 0 && (
              <p className="break-words">
                <span className="font-semibold">Evaluations: </span>
                {row.evidenceEvaluations.map((evaluation) => evaluation.deploymentName).join(", ")}
              </p>
            )}
          </div>
        </details>
      ))}
    </div>
  );
}

function ProgramLink({
  program,
  href,
}: {
  program: CollegeData["programRows"][number];
  href: string;
}) {
  return (
    <li>
      <Link
        href={href}
        aria-label={`Inspect ${program.code} evidence`}
        className="hover:bg-muted/60 focus-visible:outline-ring flex min-h-14 items-center gap-3 rounded-lg px-3 py-2 focus-visible:outline-2"
      >
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-title-sm break-words">
            {program.code} · {program.name}
            {!program.is_active && " · Archived"}
          </span>
          <span className="text-body-sm text-text-secondary tabular-nums">
            {program.submitted} of {program.opportunities} submitted · {program.deployments}{" "}
            evaluations
          </span>
          <span className="flex flex-wrap gap-1.5 empty:hidden">
            {program.closedIncomplete > 0 && (
              <Badge variant="warning">
                {program.closedIncomplete} closed with missing responses
              </Badge>
            )}
            {program.unevaluatedAssignmentCount > 0 && (
              <Badge variant="outline">
                {program.unevaluatedAssignmentCount} courses not evaluated
              </Badge>
            )}
          </span>
        </span>
        <span className="text-heading-md shrink-0 tabular-nums">{deanRate(program.rate)}</span>
        <ChevronRight aria-hidden="true" className="text-muted-foreground size-5 shrink-0" />
      </Link>
    </li>
  );
}

function collegeSourceRows(college: CollegeData) {
  return Object.entries(
    college.evidence.reduce<Record<string, { part: number; total: number }>>((acc, row) => {
      const current = acc[row.source] ?? { part: 0, total: 0 };
      acc[row.source] = {
        part: current.part + row.submitted,
        total: current.total + row.opportunities,
      };
      return acc;
    }, {})
  ).map(([source, counts]) => ({
    key: source,
    label: DEAN_SOURCE_SHORT_LABELS[source as keyof typeof DEAN_SOURCE_SHORT_LABELS],
    fullLabel: DEAN_SOURCE_LABELS[source as keyof typeof DEAN_SOURCE_LABELS],
    ...counts,
  }));
}

function collegePeriodRows(college: CollegeData, filters: DeanAnalyticsFilters) {
  if (filters.termInstanceId) return [];
  return [...college.periods]
    .reverse()
    .map((period) => {
      const rows = college.evidence.filter((row) => row.periodId === period.id);
      return {
        period,
        submitted: rows.reduce((sum, row) => sum + row.submitted, 0),
        opportunities: rows.reduce((sum, row) => sum + row.opportunities, 0),
      };
    })
    .filter((row) => row.opportunities > 0);
}

function DeanProgramChoices({
  college,
  filters,
}: {
  college: CollegeData;
  filters: DeanAnalyticsFilters;
}) {
  const targetView = filters.view === "college" ? "outcomes" : filters.view;
  const hrefFor = (programId: string) =>
    deanAnalyticsUrl({ view: targetView, programId, termInstanceId: filters.termInstanceId });
  const withActivity = college.programRows.filter((program) => program.deployments > 0);
  const withoutActivity = college.programRows.filter((program) => program.deployments === 0);
  const ranked = [...withActivity].sort((left, right) => right.submitted - left.submitted);
  return (
    <Section
      title={filters.view === "college" ? "Programs" : "Choose a program"}
      intro={
        filters.view === "college"
          ? "Open a program to see its outcomes. Counts show activity, not scores, so programs are not ranked."
          : "Pick a program to continue."
      }
    >
      {ranked.length > 0 ? (
        <ul className="bg-card flex flex-col divide-y rounded-xl border p-1">
          {ranked.map((program) => (
            <ProgramLink key={program.id} program={program} href={hrefFor(program.id)} />
          ))}
        </ul>
      ) : (
        <Note>No program has an evaluation in this period yet.</Note>
      )}
      {withoutActivity.length > 0 && (
        <Disclosure>
          <DisclosureTrigger variant="chip">
            {withoutActivity.length} programs with no evaluations yet
          </DisclosureTrigger>
          <DisclosureContent>
            <ul className="flex flex-wrap gap-2">
              {withoutActivity.map((program) => (
                <li key={program.id}>
                  <Link
                    href={hrefFor(program.id)}
                    aria-label={`Inspect ${program.code} evidence`}
                    className="text-body-sm hover:bg-muted focus-visible:outline-ring inline-flex min-h-9 items-center rounded-lg border px-3 focus-visible:outline-2 pointer-coarse:min-h-11"
                  >
                    {program.code}
                  </Link>
                </li>
              ))}
            </ul>
          </DisclosureContent>
        </Disclosure>
      )}
    </Section>
  );
}

function DeanCollegeView({
  evidence,
  filters,
}: {
  evidence: EvidenceKind<"college">;
  filters: DeanAnalyticsFilters;
}) {
  const { college } = evidence;
  const withActivity = college.programRows.filter((program) => program.deployments > 0);

  const sourceRows = collegeSourceRows(college);
  const periodRows = collegePeriodRows(college, filters);

  return (
    <div className="flex min-w-0 flex-col gap-8">
      {evidence.invalidProgram && (
        <p
          role="status"
          className="text-body-sm bg-warning-soft text-warning rounded-lg border px-3 py-2"
        >
          That program or evaluation is not available here. Choose a program again.
        </p>
      )}
      {filters.view === "college" && (
        <Stats
          items={[
            { label: "Submitted", value: String(college.summary.submitted) },
            { label: "Assigned", value: String(college.summary.opportunities) },
            { label: "Response rate", value: deanRate(college.summary.rate) },
            { label: "Evaluations open now", value: String(college.summary.active) },
          ]}
        />
      )}
      <DeanProgramChoices college={college} filters={filters} />
      {filters.view === "college" && (
        <>
          <div className="grid min-w-0 gap-4 lg:grid-cols-2">
            <LazyDeanShareChart
              title="Response rate by program"
              description="Submitted out of assigned. Programs with no assigned evaluations are left out."
              partLabel="Submitted"
              restLabel="Not submitted"
              rows={withActivity
                .filter((program) => program.opportunities > 0)
                .map((program) => ({
                  key: program.id,
                  label: program.code,
                  fullLabel: `${program.code} · ${program.name}`,
                  part: program.submitted,
                  total: program.opportunities,
                }))}
              emptyText="No evaluations have been assigned in this period."
            />
            <LazyDeanShareChart
              title="Courses with an evaluation"
              description="Program courses that have a published evaluation."
              partLabel="Evaluated"
              restLabel="Not yet evaluated"
              rows={college.programRows
                .filter((program) => program.courseAssignmentCount > 0)
                .map((program) => ({
                  key: program.id,
                  label: program.code,
                  fullLabel: `${program.code} · ${program.name}`,
                  part: program.courseAssignmentCount - program.unevaluatedAssignmentCount,
                  total: program.courseAssignmentCount,
                }))}
              emptyText="No program courses are set up for this period."
            />
            <LazyDeanShareChart
              title="Response rate by who was asked"
              description="Includes General Education and college-wide evaluations."
              partLabel="Submitted"
              restLabel="Not submitted"
              rows={sourceRows}
              emptyText="No evaluations have been assigned in this period."
            />
            {periodRows.length > 1 && (
              <LazyDeanValueChart
                title="Response rate by period"
                description="How participation changed across academic periods."
                valueLabel="Response rate"
                format="percent"
                orientation="vertical"
                keepOrder
                rows={periodRows.map((row) => ({
                  key: row.period.id,
                  label: shortPeriod(row.period.label),
                  fullLabel: row.period.label,
                  value: (row.submitted / row.opportunities) * 100,
                  detail: `${row.submitted}/${row.opportunities}`,
                }))}
                emptyText="Not enough periods to compare."
              />
            )}
          </div>
          <Link
            href={`/dean/college-oversight/learning-outcomes${filters.termInstanceId ? `?period=${filters.termInstanceId}` : ""}`}
            className={linkStyle}
          >
            See missing outcome mappings
          </Link>
        </>
      )}
    </div>
  );
}

type CourseScaleRow = {
  key: string;
  label: string;
  fullLabel: string;
  scaleGroups: Array<{
    scaleKey: string;
    scaleLabel: string;
    meanRating: number | null;
    ratingCount: number;
    submittedResponseCount: number;
  }>;
};

function DeanCourseMeanCharts({ courses }: { courses: CourseScaleRow[] }) {
  const coursesByScale = new Map<
    string,
    { label: string; rows: ComponentProps<typeof LazyDeanValueChart>["rows"] }
  >();
  for (const course of courses) {
    for (const scale of course.scaleGroups) {
      if (scale.meanRating === null) continue;
      const group = coursesByScale.get(scale.scaleKey) ?? { label: scale.scaleLabel, rows: [] };
      group.rows.push({
        key: course.key,
        label: course.label,
        fullLabel: course.fullLabel,
        value: scale.meanRating,
        detail: `${scale.ratingCount} ratings · ${scale.submittedResponseCount} rated submissions`,
      });
      coursesByScale.set(scale.scaleKey, group);
    }
  }
  if (coursesByScale.size === 0) return <Note>No rated courses in this scope.</Note>;
  return [...coursesByScale.entries()].map(([key, group], index) => (
    <LazyDeanValueChart
      key={key}
      title={`Average rating by course · ${group.label}${coursesByScale.size > 1 ? ` · scale group ${index + 1}` : ""}`}
      description="Only ratings with identical frozen values and descriptions are compared in this chart."
      valueLabel="Average rating"
      format="mean"
      rows={group.rows}
      emptyText="No rated courses in this scope."
    />
  ));
}

function DeanInstitutionalHistory({ trends }: { trends: EvidenceKind<"institutional">["trends"] }) {
  if (!trends || trends.periods.length === 0) return null;
  return (
    <Section title="Over time">
      <LazyDeanTrendChart
        title="Average rating by period"
        domain={trendDomain(trends.periods.map((period) => period.scaleDomain))}
        periods={trends.periods.map((period) => ({
          label: shortPeriod(period.periodLabel),
          meanRating: period.meanRating,
          comparableWithPrevious: period.comparableWithPrevious,
        }))}
        breakBefore={trends.breaks.map((item) => shortPeriod(item.toPeriodLabel))}
      />
      <Disclosure>
        <DisclosureTrigger variant="chip">Period ratings and participation</DisclosureTrigger>
        <DisclosureContent>
          <ul className="text-body-sm flex flex-col gap-2">
            {trends.periods.map((period) => (
              <li key={period.termInstanceId}>
                {period.periodLabel} · {period.submittedResponseCount} submissions · average{" "}
                {deanMean(period.meanRating)} ·{" "}
                {period.comparableWithPrevious
                  ? "Comparable with previous period"
                  : "No comparable previous period"}
              </li>
            ))}
          </ul>
        </DisclosureContent>
      </Disclosure>
    </Section>
  );
}

function DeanInstitutionalOutcomes({ data }: { data: EvidenceKind<"institutional">["outcomes"] }) {
  const outcomes = data?.outcomes ?? [];
  const unlinkedCount = data
    ? data.unlinkedRatings.generalItems + data.unlinkedRatings.unmappedCilos
    : null;
  return (
    <Section
      title="General Education"
      intro="General Education course ratings grouped by Institutional Learning Outcome (ILO). ILOs are not classified as attainment and do not roll up into Program Outcomes."
    >
      <LazyOutcomeMeanBarChart
        title="Average rating by ILO"
        outcomes={outcomes}
        labels={INSTITUTIONAL_OUTCOME_LABELS}
        preserveOrder
      />
      <Note>
        One rating can count toward several ILOs, so rows do not add up.
        {unlinkedCount !== null ? ` ${unlinkedCount} ratings reach no ILO and are left out.` : ""}
      </Note>
      {outcomes.length > 0 && (
        <Disclosure>
          <DisclosureTrigger variant="chip">Evidence behind each ILO</DisclosureTrigger>
          <DisclosureContent>
            <DeanOutcomeRows rows={outcomes} institutional />
          </DisclosureContent>
        </Disclosure>
      )}
      {data && (
        <Disclosure>
          <DisclosureTrigger variant="chip">How historical ratings are grouped</DisclosureTrigger>
          <DisclosureContent>
            <Note>{data.currentMappingDisclosure}</Note>
          </DisclosureContent>
        </Disclosure>
      )}
    </Section>
  );
}

function DeanInstitutionalView({ evidence }: { evidence: EvidenceKind<"institutional"> }) {
  const courses = evidence.courses?.rows ?? [];
  const trends = evidence.trends;
  return (
    <div className="flex min-w-0 flex-col gap-8">
      <DeanInstitutionalOutcomes data={evidence.outcomes} />
      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        <LazyDeanShareChart
          title="Response rate by course"
          description="Submitted out of assigned, per General Education course."
          partLabel="Submitted"
          restLabel="Not submitted"
          rows={courses.map((row) => ({
            key: row.courseId,
            label: row.courseCode,
            fullLabel: `${row.courseCode} · ${row.courseTitle}`,
            part: row.submittedResponseCount,
            total: row.evaluationOpportunityCount,
          }))}
          emptyText="No General Education evaluations have been assigned in this period."
        />
        <DeanCourseMeanCharts
          courses={courses.map((row) => ({
            key: row.courseId,
            label: row.courseCode,
            fullLabel: `${row.courseCode} · ${row.courseTitle}`,
            scaleGroups: row.scaleGroups,
          }))}
        />
      </div>
      {courses.length > 0 && (
        <Disclosure>
          <DisclosureTrigger variant="chip">Course contributions to ILOs</DisclosureTrigger>
          <DisclosureContent>
            <ul className="text-body-sm flex flex-col gap-2">
              {courses.map((course) => (
                <li key={course.courseId}>
                  {course.courseCode} · {course.courseTitle}:{" "}
                  {course.alignedIlos.map((ilo) => ilo.code).join(", ") || "No linked ILOs"}
                </li>
              ))}
            </ul>
          </DisclosureContent>
        </Disclosure>
      )}
      <DeanInstitutionalHistory trends={trends} />
      <Section title="Written feedback">
        <RepeatedTermsCloud
          tokens={evidence.feedback?.tokens ?? []}
          answerCount={evidence.feedback?.qualitativeItemCount ?? 0}
        />
      </Section>
    </div>
  );
}

function DeanPoCatalog({ evidence }: { evidence: EvidenceKind<"outcomes"> }) {
  if (!evidence.data || evidence.catalog.length === 0) return null;
  const ratedIds = new Set([
    ...evidence.data.outcomes.filter((row) => row.ratingCount > 0).map((row) => row.outcomeId),
    ...evidence.data.programWideOutcomes
      .filter((row) => row.ratingCount > 0)
      .map((row) => row.poId),
  ]);
  const missingPos = evidence.catalog.filter((po) => !ratedIds.has(po.id));
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-title-md">PO catalog and evidence availability</h3>
      <Note>
        {evidence.catalog.length - missingPos.length} of {evidence.catalog.length} POs have ratings
        {missingPos.length > 0
          ? `. No ratings yet for: ${missingPos.map((po) => `${po.code}${po.is_active ? "" : " (archived)"}`).join(", ")}.`
          : "."}
      </Note>
    </div>
  );
}

function DeanOutcomesView({
  evidence,
  filters,
}: {
  evidence: EvidenceKind<"outcomes">;
  filters: DeanAnalyticsFilters;
}) {
  const data = evidence.data;
  if (!data) return null;
  const central = data.programWideOutcomes.filter((row) => row.meanRating !== null);
  const hasClassified = central.some((row) => row.attainment?.status === "classified");
  return (
    <div className="flex min-w-0 flex-col gap-8">
      <ProgramSnapshot
        college={evidence.college}
        programId={evidence.program.id}
        filters={filters}
      />
      <Section
        title={`${evidence.program.code} Program Outcomes`}
        intro="Average rating per Program Outcome (PO), from course evaluations. A rating counts toward every PO its course question is linked to, so rows do not add up."
      >
        <LazyOutcomeMeanBarChart
          title="Average rating by Program Outcome"
          outcomes={data.outcomes}
          labels={GRADUATE_OUTCOME_LABELS}
          preserveOrder
        />
        <Disclosure>
          <DisclosureTrigger variant="chip">How historical ratings are grouped</DisclosureTrigger>
          <DisclosureContent>
            <Note>{data.currentMappingDisclosure}</Note>
          </DisclosureContent>
        </Disclosure>
        <DeanPoCatalog evidence={evidence} />
        {data.outcomes.length > 0 && (
          <Disclosure>
            <DisclosureTrigger variant="chip">Evidence behind each outcome</DisclosureTrigger>
            <DisclosureContent>
              <DeanOutcomeRows rows={data.outcomes} />
            </DisclosureContent>
          </Disclosure>
        )}
      </Section>
      {central.length > 0 && (
        <Section
          title="Program-wide evaluations"
          intro="Students, alumni and industry partners rate POs directly. Each group is shown separately."
        >
          <LazyDeanValueChart
            title="Average rating by group and PO"
            valueLabel="Average rating"
            format="mean"
            max={Math.max(
              0,
              ...deanScaleDomain(
                central.map((row) => row.evidenceSummary.scaleLabel),
                central.map((row) => row.meanRating)
              )
            )}
            benchmark={hasClassified ? OUTCOME_ATTAINMENT_BENCHMARK : undefined}
            keepOrder
            rows={central.map((row) => ({
              key: `${row.stakeholder}-${row.poId}`,
              label: `${DEAN_STAKEHOLDER_LABELS[row.stakeholder]} · ${row.code}`,
              value: row.meanRating ?? 0,
              detail: `${row.submittedResponseCount} submissions`,
              color: getAttainmentColor(row.attainment),
              status:
                row.attainment?.status === "classified" && row.attainment.interpretation
                  ? row.attainment.interpretation
                  : "Not classified",
            }))}
            emptyText="No program-wide ratings yet."
          />
          <AttainmentLegend />
        </Section>
      )}
      {evidence.alignment ? (
        <Disclosure>
          <DisclosureTrigger variant="chip">
            Mapping gaps: {evidence.alignment.missingCiloContexts} courses without CILOs,{" "}
            {evidence.alignment.incompleteMappingContexts} with incomplete mappings
          </DisclosureTrigger>
          <DisclosureContent>
            <Note>{evidence.alignmentBasis}</Note>
            <ul className="text-body-sm mt-3 flex flex-col gap-2">
              {evidence.alignment.mappingGaps.map((gap, index) => (
                <li key={index} className="break-words">
                  {gap.courseCode} · {gap.courseName} ·{" "}
                  {gap.reason === "missing-cilos" ? "No CILOs" : "Incomplete mappings"}
                  {gap.ciloStatement ? ` · ${gap.ciloStatement}` : ""}
                </li>
              ))}
            </ul>
          </DisclosureContent>
        </Disclosure>
      ) : (
        <Note>
          {evidence.alignmentUnavailable
            ? "Mapping readiness is temporarily unavailable. Ratings above are still correct; try again later."
            : "Mapping readiness needs an active or completed period with course assignments for this program."}
        </Note>
      )}
      {!data.outcomes.length && !data.programWideOutcomes.length && (
        <Note>
          No ratings are linked to POs in this scope. Check participation or missing mappings.
        </Note>
      )}
    </div>
  );
}

function DeanCoursesView({
  evidence,
  filters,
}: {
  evidence: EvidenceKind<"courses">;
  filters: DeanAnalyticsFilters;
}) {
  const data = evidence.data;
  if (!data) return null;
  return (
    <div className="flex min-w-0 flex-col gap-8">
      <ProgramSnapshot
        college={evidence.college}
        programId={evidence.program.id}
        filters={filters}
      />
      <Section
        title="Courses"
        intro="Averages describe ratings, not attainment. Incompatible frozen scales are shown separately and never combined or ranked against each other."
      >
        <div className="grid min-w-0 gap-4 lg:grid-cols-2">
          <DeanCourseMeanCharts
            courses={data.courseRows.map((row) => ({
              key: row.key,
              label: row.courseCode,
              fullLabel: row.label,
              scaleGroups: row.scaleGroups,
            }))}
          />
          <LazyDeanValueChart
            title="Submissions by course"
            valueLabel="Submissions"
            format="count"
            rows={data.courseRows
              .filter((row) => row.submittedResponseCount > 0)
              .map((row) => ({
                key: row.key,
                label: row.courseCode,
                fullLabel: row.label,
                value: row.submittedResponseCount,
              }))}
            emptyText="No submissions in this scope."
          />
        </div>
        {data.courseRows.some((row) => row.evidenceEvaluations.length > 0) && (
          <div className="flex flex-col gap-2">
            <h3 className="text-title-md">Open an evaluation</h3>
            <ul className="bg-card text-body-sm flex flex-col divide-y rounded-xl border">
              {data.courseRows
                .filter((row) => row.evidenceEvaluations.length > 0)
                .map((row) => (
                  <li key={row.key} className="flex flex-col gap-1 px-4 py-2">
                    <span className="font-semibold break-words">{row.label}</span>
                    <ul className="flex flex-wrap gap-x-4">
                      {row.evidenceEvaluations.map((evaluation) => (
                        <li key={evaluation.evaluationId}>
                          <Link
                            className={linkStyle}
                            href={deanAnalyticsUrl({
                              ...filters,
                              view: "outcomes",
                              evaluationId: evaluation.evaluationId,
                              source: "COURSE",
                            })}
                          >
                            Inspect {evaluation.deploymentName}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
            </ul>
          </div>
        )}
      </Section>
      {data.instrumentRows.length > 0 && (
        <Section
          title="Instruments"
          intro="Each group is shown separately because their questions differ."
        >
          <LazyProgramHeadInstrumentBreakdownChart rows={data.instrumentRows} />
        </Section>
      )}
      {!data.courseRows.length && !data.instrumentRows.length && (
        <Note>No course or instrument ratings in this scope.</Note>
      )}
    </div>
  );
}

function DeanStakeholdersView({
  evidence,
  filters,
}: {
  evidence: EvidenceKind<"stakeholders">;
  filters: DeanAnalyticsFilters;
}) {
  const data = evidence.data;
  if (!data) return null;
  return (
    <div className="flex min-w-0 flex-col gap-8">
      <ProgramSnapshot
        college={evidence.college}
        programId={evidence.program.id}
        filters={filters}
      />
      <Section
        title="Who responded"
        intro="Students, alumni and industry partners answer different evaluations, so their averages are not compared."
      >
        <LazyDeanValueChart
          title="Submissions by group"
          valueLabel="Submissions"
          format="count"
          rows={data.buckets.map((row) => ({
            key: row.sourceKey,
            label: DEAN_BUCKET_SHORT_LABELS[row.sourceKey],
            fullLabel: row.sourceLabel,
            value: row.submittedResponseCount,
            detail: `${row.ratingCount} ratings`,
          }))}
          emptyText="No submitted evaluations in this scope."
        />
        {data.buckets.length > 0 && (
          <ul className="bg-card text-body-sm flex flex-col divide-y rounded-xl border">
            {data.buckets.map((row) => (
              <li key={row.sourceKey} className="flex flex-col gap-0.5 px-4 py-3">
                <span className="flex items-baseline justify-between gap-3">
                  <span className="text-title-sm">{row.sourceLabel}</span>
                  <span className="text-heading-md tabular-nums">{deanMean(row.meanRating)}</span>
                </span>
                <span className="text-text-secondary">
                  {row.sourceDescription}
                  {row.instrumentContext ? ` · ${row.instrumentContext}` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

function DeanTrendsView({
  evidence,
  filters,
}: {
  evidence: EvidenceKind<"trends">;
  filters: DeanAnalyticsFilters;
}) {
  const data = evidence.data;
  if (!data) return null;
  const hasPeriods = data.periods.length > 0;
  return (
    <div className="flex min-w-0 flex-col gap-8">
      <ProgramSnapshot
        college={evidence.college}
        programId={evidence.program.id}
        filters={filters}
      />
      <Section
        title="Trends"
        intro="Lines join periods only when the same instrument, scale and outcomes were used."
      >
        {data.emptyReason === null && (
          <LazyDeanTrendChart
            title="Average rating by period"
            domain={deanScaleDomain(
              data.periods.map((period) => period.scaleContext),
              data.periods.map((period) => period.meanRating)
            )}
            periods={data.periods.map((period) => ({
              label: shortPeriod(period.periodLabel),
              meanRating: period.meanRating,
              comparableWithPrevious: period.comparableWithPrevious,
            }))}
            breakBefore={data.breaks.map((item) => shortPeriod(item.toPeriodLabel))}
          />
        )}
        {data.emptyReason === "no-comparable-history" && (
          <Note>
            No line yet: at least two periods with the same instrument, scale and outcomes are
            needed.
          </Note>
        )}
        {hasPeriods && (
          <Disclosure>
            <DisclosureTrigger variant="chip">Period ratings and instruments</DisclosureTrigger>
            <DisclosureContent>
              <ul className="text-body-sm flex flex-col gap-2">
                {data.periods.map((period) => (
                  <li key={period.termInstanceId}>
                    {period.periodLabel} · average {deanMean(period.meanRating)} ·{" "}
                    {period.ratingCount} ratings ·{" "}
                    {period.instrumentContext ?? "No rated instrument"} ·{" "}
                    {period.scaleContext ?? "No scale"}
                  </li>
                ))}
              </ul>
            </DisclosureContent>
          </Disclosure>
        )}
        {hasPeriods && (
          <LazyDeanValueChart
            title="Submissions by period"
            valueLabel="Submissions"
            format="count"
            orientation="vertical"
            keepOrder
            rows={data.periods.map((period) => ({
              key: period.termInstanceId,
              label: shortPeriod(period.periodLabel),
              fullLabel: period.periodLabel,
              value: period.submittedResponseCount,
              detail: `${period.ratingCount} ratings`,
            }))}
            emptyText="No submissions yet."
          />
        )}
        {data.breaks.length > 0 && (
          <Disclosure>
            <DisclosureTrigger variant="chip">Why some periods are not joined</DisclosureTrigger>
            <DisclosureContent>
              <ul className="text-body-sm flex flex-col gap-2">
                {data.breaks.map((item, index) => (
                  <li key={index}>
                    {item.fromPeriodLabel} to {item.toPeriodLabel}: {item.reason}
                  </li>
                ))}
              </ul>
            </DisclosureContent>
          </Disclosure>
        )}
        {!hasPeriods && <Note>No period history in this scope.</Note>}
      </Section>
    </div>
  );
}

function DeanFeedbackView({
  evidence,
  filters,
}: {
  evidence: EvidenceKind<"feedback">;
  filters: DeanAnalyticsFilters;
}) {
  const data = evidence.data;
  if (!data) return null;
  return (
    <div className="flex min-w-0 flex-col gap-8">
      <ProgramSnapshot
        college={evidence.college}
        programId={evidence.program.id}
        filters={filters}
      />
      <Section
        title="Written feedback"
        intro={`${data.qualitativeItemCount} written answers from ${data.qualitativeResponseCount} submissions. Only words repeated by more than one respondent are shown. Comments themselves are never shown here.`}
      >
        <RepeatedTermsCloud tokens={data.tokens} answerCount={data.qualitativeItemCount} />
        {data.promptCounts.length > 0 && (
          <Disclosure>
            <DisclosureTrigger variant="chip">Answers by question</DisclosureTrigger>
            <DisclosureContent>
              <ul className="bg-card text-body-sm flex flex-col divide-y rounded-xl border">
                {data.promptCounts.map((prompt, index) => {
                  const terms = prompt.terms
                    .filter((term) => term.value > 1 && term.responseCount > 1)
                    .map((term) => `${term.text} (${term.value})`)
                    .join(", ");
                  return (
                    <li key={index} className="flex flex-col gap-1 px-4 py-3">
                      <span className="text-title-sm break-words">
                        {prompt.sourceLabel} · {prompt.instrumentLabel} · {prompt.promptLabel}
                      </span>
                      <span className="text-text-secondary tabular-nums">
                        {prompt.itemCount} answers · {prompt.responseCount} submissions
                      </span>
                      {terms && <span className="break-words">{terms}</span>}
                    </li>
                  );
                })}
              </ul>
            </DisclosureContent>
          </Disclosure>
        )}
      </Section>
    </div>
  );
}

export function DeanEvidenceView({
  evidence,
  filters,
}: {
  evidence: DeanEvidence;
  filters: DeanAnalyticsFilters;
}) {
  switch (evidence.kind) {
    case "college":
      return <DeanCollegeView evidence={evidence} filters={filters} />;
    case "institutional":
      return <DeanInstitutionalView evidence={evidence} />;
    default:
      if (!evidence.data)
        return (
          <p role="status" className="text-body-sm">
            Evidence could not be authorized. Refresh or choose a program again.
          </p>
        );
      switch (evidence.kind) {
        case "outcomes":
          return <DeanOutcomesView evidence={evidence} filters={filters} />;
        case "courses":
          return <DeanCoursesView evidence={evidence} filters={filters} />;
        case "stakeholders":
          return <DeanStakeholdersView evidence={evidence} filters={filters} />;
        case "trends":
          return <DeanTrendsView evidence={evidence} filters={filters} />;
        case "feedback":
          return <DeanFeedbackView evidence={evidence} filters={filters} />;
      }
  }
}
