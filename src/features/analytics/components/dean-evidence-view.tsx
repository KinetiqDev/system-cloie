import Link from "next/link";
import type { OutcomeEvidenceDTO } from "../outcome-evidence-types";
import type { DeanEvidence } from "../services/dean-evidence";
import type { DeanAnalyticsFilters } from "../services/dean-analytics-state";
import { deanAnalyticsUrl } from "../services/dean-analytics-state";
import { AttainmentBadge } from "./outcome-attainment-badge";
import { AttainmentLegend } from "./outcome-attainment-legend";
import { LikertDistributionTable } from "./likert-distribution-table";

const deanMean = (value: number | null | undefined) =>
  value == null ? "Unavailable" : value.toFixed(2);
export const deanRate = (value: number | null) =>
  value === null ? "Unavailable" : `${value.toFixed(1)}%`;
const linkStyle =
  "text-link underline underline-offset-4 rounded focus-visible:outline-2 focus-visible:outline-ring pointer-coarse:min-h-11 inline-flex items-center";
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
            <span className="text-muted-foreground font-normal">
              · {row.ratingCount} valid ratings
            </span>
          </summary>
          <div className="text-body-sm mt-4 flex flex-col gap-4">
            <p>
              Mean:{" "}
              {row.spansMultipleScales
                ? "Not pooled across different scales"
                : deanMean(row.meanRating)}{" "}
              · {row.submittedResponseCount} contributing submissions · {row.excludedRatingCount}{" "}
              excluded ratings
            </p>
            {!institutional && <AttainmentBadge attainment={row.attainment} />}
            {row.ratingCount === 0 && (
              <p>No valid mapped rating evidence. This is missing evidence, not non-attainment.</p>
            )}
            <h3 className="text-title-md">Supporting courses and CILOs</h3>
            {row.contributors.length === 0 ? (
              <p>No contributing courses or questions in this scope.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {row.contributors.map((contributor, i) => (
                  <li key={i} className="break-words">
                    {contributor.course?.code} ·{" "}
                    {contributor.kind === "CILO"
                      ? `${contributor.ciloCode}: ${contributor.ciloDescription}`
                      : contributor.questionPrompt}{" "}
                    · {contributor.ratingCount} ratings
                    {!row.spansMultipleScales && ` · mean ${deanMean(contributor.meanRating)}`}
                  </li>
                ))}
              </ul>
            )}
            <h3 className="text-title-md">Scale-separated distributions</h3>
            {row.distributions.map((distribution, i) => (
              <LikertDistributionTable key={i} distribution={distribution} />
            ))}
            <h3 className="text-title-md">Evaluation provenance</h3>
            <ul>
              {row.evidenceEvaluations.map((e) => (
                <li key={e.evaluationId}>{e.deploymentName}</li>
              ))}
            </ul>
          </div>
        </details>
      ))}
    </div>
  );
}
type EvidenceKind<K extends DeanEvidence["kind"]> = Extract<DeanEvidence, { kind: K }>;

function DeanCollegeView({
  evidence,
  filters,
}: {
  evidence: EvidenceKind<"college">;
  filters: DeanAnalyticsFilters;
}) {
  return (
    <section className="flex flex-col gap-4">
      {evidence.invalidProgram && (
        <p role="status">
          The selected program or evaluation is unavailable in this scope. Choose a program again.
        </p>
      )}
      <h2 className="text-heading-lg">Program evidence comparison</h2>
      <p className="text-body-sm text-muted-foreground">
        Compare all-source participation and evidence availability, not PO scores. General Education
        is separate. Programs have different POs, instruments and populations.
      </p>
      <div className="grid gap-4 lg:grid-cols-2">
        {evidence.college.programRows.map((program) => (
          <article
            key={program.id}
            className="bg-card flex min-w-0 flex-col gap-3 rounded-xl border p-4"
          >
            <h3 className="text-title-md break-words">
              {program.code} · {program.name}
              {!program.is_active && " · Archived"}
            </h3>
            <p className="text-body-sm tabular-nums">
              {program.submitted} submitted / {program.opportunities} historical opportunities ·{" "}
              {deanRate(program.rate)}
            </p>
            <p className="text-body-sm">
              {program.deployments} evaluations · {program.active} active ·{" "}
              {program.closedIncomplete} closed with outstanding opportunities
            </p>
            <p className="text-body-sm">
              {program.unevaluatedAssignmentCount} of {program.courseAssignmentCount} active
              program-specific course assignments have no published evaluation. This live inventory
              is separate from period readiness snapshots.
            </p>
            {program.submitted === 0 && (
              <p className="text-body-sm text-muted-foreground">
                No finalized evidence in this scope.
              </p>
            )}
            <Link
              className={linkStyle}
              href={deanAnalyticsUrl({
                view: "outcomes",
                programId: program.id,
                termInstanceId: filters.termInstanceId,
              })}
            >
              Inspect {program.code} evidence
            </Link>
          </article>
        ))}
      </div>
      <Link
        href={`/dean/college-oversight/learning-outcomes${filters.termInstanceId ? `?period=${filters.termInstanceId}` : ""}`}
        className={linkStyle}
      >
        Review period readiness and missing outcome mappings
      </Link>
    </section>
  );
}

function DeanInstitutionalView({
  evidence,
}: {
  evidence: EvidenceKind<"institutional">;
  filters: DeanAnalyticsFilters;
}) {
  return (
    <section className="flex flex-col gap-5">
      <h2 className="text-heading-lg">General Education and institutional evidence</h2>
      <p className="text-body-sm">
        General Education CILOs contribute to ILO evidence. ILOs are not classified as attainment
        and do not roll up into POs. Central deployments are excluded.
      </p>
      <p className="text-body-sm text-muted-foreground">
        {evidence.outcomes?.currentMappingDisclosure} A rating can contribute to several ILOs; rows
        are not additive.
      </p>
      <p className="text-body-sm">
        Unlinked valid ratings: {evidence.outcomes?.unlinkedRatings.generalItems ?? 0} general
        items; {evidence.outcomes?.unlinkedRatings.unmappedCilos ?? 0} from CILOs without ILO
        mappings.
      </p>
      <DeanOutcomeRows rows={evidence.outcomes?.outcomes ?? []} institutional />
      <h2 className="text-heading-lg">General Education course contribution</h2>
      {evidence.courses?.rows.map((row) => (
        <article key={row.courseId} className="text-body-sm rounded-xl border p-4">
          <h3 className="text-title-md break-words">
            {row.courseCode} · {row.courseTitle}
          </h3>
          <p>
            {row.submittedResponseCount} / {row.evaluationOpportunityCount} opportunities ·{" "}
            {deanRate(row.responseRate === null ? null : row.responseRate * 100)} ·{" "}
            {row.ratingCount} ratings · mean {deanMean(row.meanRating)}
          </p>
          <p>Aligned ILOs: {row.alignedIlos.map((ilo) => ilo.code).join(", ") || "None"}</p>
        </article>
      ))}
      <h2 className="text-heading-lg">Institutional period history</h2>
      {evidence.trends?.periods.map((period) => (
        <p key={period.termInstanceId} className="text-body-sm">
          {period.periodLabel} · {period.submittedResponseCount} submissions · mean{" "}
          {deanMean(period.meanRating)} ·{" "}
          {period.comparableWithPrevious
            ? "Comparable with previous period"
            : "No comparable previous period"}
        </p>
      ))}
      <h2 className="text-heading-lg">General Education written feedback</h2>
      <p className="text-body-sm">
        {evidence.feedback?.qualitativeItemCount ?? 0} written answers. Repeated identifier-redacted
        terms only, not respondent comments.
      </p>
      <p className="text-body-sm">
        {evidence.feedback?.tokens
          .filter((token) => token.value > 1 && (token.responseCount ?? 0) > 1)
          .map((token) => `${token.text} (${token.value})`)
          .join(", ") || "No repeated terms in this scope."}
      </p>
    </section>
  );
}

function DeanOutcomesView({
  evidence,
}: {
  evidence: EvidenceKind<"outcomes">;
  filters: DeanAnalyticsFilters;
}) {
  const data = evidence.data;
  if (!data) return null;
  return (
    <section className="flex flex-col gap-5">
      <h2 className="text-heading-lg">{evidence.program.code} Program Outcomes</h2>
      <p className="text-body-sm text-muted-foreground">
        {data.currentMappingDisclosure} Each rating contributes once per mapped PO. Rows are not
        additive. Stakeholder perceptions are not individual mastery.
      </p>
      {evidence.alignment ? (
        <details className="text-body-sm rounded-xl border p-4">
          <summary className="cursor-pointer font-semibold pointer-coarse:min-h-11">
            Alignment gaps: {evidence.alignment.missingCiloContexts} missing-CILO contexts;{" "}
            {evidence.alignment.incompleteMappingContexts} incomplete-mapping contexts
          </summary>
          <p className="mt-3">{evidence.alignmentBasis}</p>
          <ul className="mt-3 flex flex-col gap-2">
            {evidence.alignment.mappingGaps.map((gap, i) => (
              <li key={i} className="break-words">
                {gap.courseCode} · {gap.courseName} ·{" "}
                {gap.reason === "missing-cilos" ? "Missing CILOs" : "Incomplete typed mappings"} ·{" "}
                {gap.ciloStatement ?? "No active CILO"}
              </li>
            ))}
          </ul>
        </details>
      ) : (
        <p className="text-body-sm text-muted-foreground">
          {evidence.alignmentUnavailable
            ? "Alignment readiness is temporarily unavailable. Rating evidence remains available; try again later."
            : "Mapping readiness needs an active or completed period and a course-assignment context for this program. None is available in the current scope. Completed-period readiness uses the immutable snapshot."}
        </p>
      )}
      <AttainmentLegend />
      <h3 className="text-title-md">PO catalog and evidence availability</h3>
      <ul className="text-body-sm flex flex-col gap-2">
        {evidence.catalog.map((po) => (
          <li key={po.id} className="break-words">
            {po.code} · {po.description}
            {!po.is_active && " · Archived"} ·{" "}
            {data?.outcomes.some((row) => row.outcomeId === po.id) ||
            data?.programWideOutcomes.some((row) => row.poId === po.id)
              ? "Mapped evidence available"
              : "No mapped evidence in this scope"}
          </li>
        ))}
      </ul>
      <DeanOutcomeRows rows={data.outcomes} />
      <h2 className="text-heading-lg">Central PO evidence by stakeholder</h2>
      <p className="text-body-sm">
        Central PO bindings preserve publication-time definitions. Stakeholder sources stay
        separate. No college-wide PO score is calculated.
      </p>
      {data.programWideOutcomes.map((row) => (
        <article
          key={`${row.stakeholder}-${row.poId}`}
          className="text-body-sm rounded-xl border p-4"
        >
          <h3 className="text-title-md break-words">
            {row.stakeholder} · {row.code} · {row.name}
          </h3>
          <p>
            {row.ratingCount} valid ratings · {row.submittedResponseCount} submissions · mean{" "}
            {deanMean(row.meanRating)}
          </p>
          <AttainmentBadge attainment={row.attainment} />
        </article>
      ))}
      {!data.outcomes.length && !data.programWideOutcomes.length && (
        <p>
          No mapped PO evidence in this scope. Inspect evaluation participation or missing mappings.
        </p>
      )}
    </section>
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
    <section className="flex flex-col gap-4">
      <h2 className="text-heading-lg">Course and instrument evidence</h2>
      <p className="text-body-sm">
        Course means may span instruments. Inspect instrument/source rows before comparing. These
        means are not attainment.
      </p>
      {data.courseRows.map((row) => (
        <article key={row.key} className="text-body-sm rounded-xl border p-4">
          <h3 className="text-title-md break-words">{row.label}</h3>
          <p>
            {row.submittedResponseCount} submissions · {row.ratingCount} ratings ·{" "}
            {row.instrumentContext}
          </p>
          <ul>
            {row.evidenceEvaluations.map((e) => (
              <li key={e.evaluationId}>
                <Link
                  className={linkStyle}
                  href={deanAnalyticsUrl({
                    ...filters,
                    view: "outcomes",
                    evaluationId: e.evaluationId,
                    source: "COURSE",
                  })}
                >
                  Inspect {e.deploymentName}
                </Link>
              </li>
            ))}
          </ul>
        </article>
      ))}
      {data.instrumentRows.map((row) => (
        <article key={row.instrumentVersionId} className="text-body-sm rounded-xl border p-4">
          <h3 className="text-title-md">{row.instrumentLabel}</h3>
          {row.sources.map((source) => (
            <p key={source.sourceKey}>
              {source.sourceLabel} · mean {deanMean(source.meanRating)} · {source.ratingCount}{" "}
              ratings · {source.submittedResponseCount} submissions
            </p>
          ))}
        </article>
      ))}
      {!data.courseRows.length && !data.instrumentRows.length && (
        <p>No course or instrument evidence in this scope.</p>
      )}
    </section>
  );
}

function DeanStakeholdersView({
  evidence,
}: {
  evidence: EvidenceKind<"stakeholders">;
  filters: DeanAnalyticsFilters;
}) {
  const data = evidence.data;
  if (!data) return null;
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-heading-lg">Stakeholder evidence</h2>
      <p className="text-body-sm">{data.sourceSeparationDisclosure}</p>
      {data.buckets.map((row) => (
        <article key={row.sourceKey} className="text-body-sm rounded-xl border p-4">
          <h3 className="text-title-md">{row.sourceLabel}</h3>
          <p>
            {row.sourceDescription} · {row.submittedResponseCount} submissions · {row.ratingCount}{" "}
            ratings
          </p>
          <p>{row.instrumentContext}</p>
          <p>
            Use instrument-level results for means; source totals do not establish comparability.
          </p>
        </article>
      ))}
      {!data.buckets.length && <p>No submitted stakeholder evidence.</p>}
    </section>
  );
}

function DeanTrendsView({
  evidence,
}: {
  evidence: EvidenceKind<"trends">;
  filters: DeanAnalyticsFilters;
}) {
  const data = evidence.data;
  if (!data) return null;
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-heading-lg">Program period history</h2>
      <p className="text-body-sm">
        Mean changes are comparable only when frozen instruments, scales, mapped outcomes and
        rating-bearing source composition agree.
      </p>
      {data.periods.map((period) => (
        <article key={period.termInstanceId} className="text-body-sm rounded-xl border p-4">
          <h3 className="text-title-md">{period.periodLabel}</h3>
          <p>
            {period.submittedResponseCount} submissions · {period.ratingCount} ratings · mean{" "}
            {deanMean(period.meanRating)}
          </p>
          <p>
            {period.instrumentContext} · {period.scaleContext}
          </p>
          <p>
            {period.comparableWithPrevious
              ? "Comparable with previous period"
              : "No comparable previous period"}
          </p>
        </article>
      ))}
      {data.breaks.map((item, i) => (
        <p key={i} className="text-body-sm">
          {item.fromPeriodLabel} to {item.toPeriodLabel}: {item.reason}
        </p>
      ))}
      {!data.periods.length && <p>No period history in this scope.</p>}
    </section>
  );
}

function DeanFeedbackView({
  evidence,
}: {
  evidence: EvidenceKind<"feedback">;
  filters: DeanAnalyticsFilters;
}) {
  const data = evidence.data;
  if (!data) return null;
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-heading-lg">Written feedback</h2>
      <p className="text-body-sm">
        {data.qualitativeItemCount} written answers from {data.qualitativeResponseCount}{" "}
        submissions. Repeated identifier-redacted terms describe prevalence, not quality or
        curriculum decisions. Raw comments remain outside this workspace.
      </p>
      <p className="text-body-sm">
        {formatDeanTerms(data.tokens) || "No repeated terms in this scope."}
      </p>
      {data.promptCounts.map((prompt, i) => (
        <article key={i} className="text-body-sm rounded-xl border p-4">
          <h3 className="text-title-md break-words">
            {prompt.sourceLabel} · {prompt.instrumentLabel} · {prompt.promptLabel}
          </h3>
          <p>
            {prompt.itemCount} answers · {prompt.responseCount} submissions
          </p>
          <p>
            {prompt.terms
              .filter((term) => term.value > 1 && term.responseCount > 1)
              .map((term) => `${term.text} (${term.value})`)
              .join(", ") || "No repeated terms."}
          </p>
        </article>
      ))}
    </section>
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
      return <DeanInstitutionalView evidence={evidence} filters={filters} />;
    default:
      if (!evidence.data)
        return (
          <p role="status">Evidence could not be authorized. Refresh or choose a program again.</p>
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

function formatDeanTerms(tokens: Array<{ text: string; value: number; responseCount?: number }>) {
  return tokens
    .filter((token) => token.value > 1 && (token.responseCount ?? 0) > 1)
    .map((token) => `${token.text} (${token.value})`)
    .join(", ");
}
