import Link from "next/link";
import { DeanAnalyticsFilterForm } from "@/features/analytics/components/dean-analytics-filter-form";
import { DeanAiInsight } from "@/features/analytics/components/dean-ai-insight";
import { notFound, redirect } from "next/navigation";
import { buildPageTitle } from "@/lib/page-title";
import { getDeanEvidence } from "@/features/analytics/services/dean-evidence";
import {
  DEAN_ANALYTICS_VIEWS,
  deanAnalyticsUrl,
  parseDeanAnalyticsFilters,
} from "@/features/analytics/services/dean-analytics-state";
import { DeanEvidenceView, deanRate } from "@/features/analytics/components/dean-evidence-view";

export const metadata = { title: buildPageTitle("Analytics", "Dean") };
const viewLabels = {
  college: "College overview",
  outcomes: "Program Outcomes",
  courses: "Courses and instruments",
  stakeholders: "Stakeholders",
  trends: "Period history",
  feedback: "Written feedback",
  institutional: "General Education / ILOs",
};
export default async function DeanAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const filters = parseDeanAnalyticsFilters(raw);
  const canonical = deanAnalyticsUrl(filters);
  const requested = rawDeanAnalyticsUrl(raw);
  if (requested !== canonical) redirect(canonical);
  const evidence = await getDeanEvidence(filters);
  if (!evidence) notFound();
  const college = evidence.college;
  const activity = filterDeanActivity(college.evidence, filters);
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <header>
        <h1 className="text-heading-xl">Analytics</h1>
        <p className="text-body-sm text-muted-foreground mt-2">
          College-wide participation, evidence gaps and program-specific learning outcome evidence.
        </p>
      </header>
      <nav aria-label="Dean analytics views" className="flex flex-wrap gap-2">
        {DEAN_ANALYTICS_VIEWS.map((view) => (
          <Link
            key={view}
            aria-current={filters.view === view ? "page" : undefined}
            className={`text-body-sm focus-visible:outline-ring rounded-lg border px-3 py-2 focus-visible:outline-2 pointer-coarse:min-h-11 ${filters.view === view ? "bg-primary text-primary-foreground" : "bg-card"}`}
            href={deanAnalyticsUrl(parseDeanAnalyticsFilters({ ...filters, view }))}
          >
            {viewLabels[view]}
          </Link>
        ))}
      </nav>
      <DeanFilters filters={filters} college={college} />
      {filters.evaluationId && (
        <p className="text-body-sm">
          One evaluation selected.{" "}
          <Link
            className="text-link underline"
            href={deanAnalyticsUrl({ ...filters, evaluationId: undefined })}
          >
            Return to program scope
          </Link>
        </p>
      )}
      {college.invalidPeriod && (
        <p role="status" className="text-body-sm">
          This period no longer exists. No evidence is shown; choose another period or reset the
          filters.
        </p>
      )}
      {filters.view === "college" && (
        <section
          aria-label="College participation"
          className="bg-card grid gap-4 rounded-xl border p-4 sm:grid-cols-3"
        >
          <p className="text-body-sm">
            Submitted responses
            <br />
            <strong className="text-heading-lg tabular-nums">{college.summary.submitted}</strong>
          </p>
          <p className="text-body-sm">
            Historical evaluation opportunities
            <br />
            <strong className="text-heading-lg tabular-nums">
              {college.summary.opportunities}
            </strong>
          </p>
          <p className="text-body-sm">
            Response rate
            <br />
            <strong className="text-heading-lg tabular-nums">
              {deanRate(college.summary.rate)}
            </strong>
          </p>
        </section>
      )}
      <details className="text-body-sm rounded-xl border p-4">
        <summary className="cursor-pointer font-semibold pointer-coarse:min-h-11">
          Evidence methodology and limitations
        </summary>
        <p className="mt-3">
          Only finalized SUBMITTED responses contribute. Participation uses historical
          EvaluationAssignment opportunities, not the current eligible roster or distinct people. No
          opportunities means the rate is unavailable. Active cycles are incomplete. College totals
          include General Education and college-wide Central activity. Program cards exclude those
          sources and do not sum to the college total. These totals describe activity, never a
          college outcome score. Archived records remain available for history. Rating counts are
          distinct from response counts. PO rows retain their owning program. Different scales and
          sources do not establish comparability. General Education evidence follows CILO-to-ILO
          mappings and does not propagate to POs.
        </p>
      </details>
      <DeanEvidenceView evidence={evidence} filters={filters} />
      <section className="flex flex-col gap-4">
        <h2 className="text-heading-lg">Evaluation activity and participation</h2>
        <p className="text-body-sm text-muted-foreground">
          Each row explains the program signals above. Closed evaluations with outstanding
          opportunities warrant review, not an automatic academic judgment. Zero opportunities is
          not zero-percent participation.
        </p>
        {activity.length > 0 && (
          <details>
            <summary className="text-body-sm cursor-pointer font-semibold pointer-coarse:min-h-11">
              Inspect {activity.length} evaluations in this scope
            </summary>
            <div className="mt-3 flex flex-col gap-3">
              {activity.map((row) => (
                <DeanActivityRow
                  key={row.id}
                  row={row}
                  programCode={
                    college.programs.find((program) => program.id === row.programId)?.code
                  }
                />
              ))}
            </div>
          </details>
        )}
        {!activity.length && (
          <p className="text-body-sm">
            No evaluations match this scope. Choose a program, change the filters or inspect another
            period.
          </p>
        )}
      </section>
      <DeanAiInsight key={canonical} filters={filters} />
    </div>
  );
}

function DeanActivityRow({
  row,
  programCode,
}: {
  row: import("@/features/analytics/services/dean-analytics").DeanDeploymentEvidence;
  programCode?: string;
}) {
  const sourceLabels = {
    COURSE: "Course-bound students",
    GENERAL_EDUCATION: "General Education students",
    STUDENT: "Central students",
    ALUMNI: "Alumni",
    INDUSTRY_PARTNER: "Industry partners",
  };
  const source =
    row.source === "GENERAL_EDUCATION"
      ? undefined
      : (
          {
            COURSE: "COURSE",
            STUDENT: "PROGRAM_WIDE_STUDENT",
            ALUMNI: "ALUMNI",
            INDUSTRY_PARTNER: "INDUSTRY",
          } as const
        )[row.source];
  return (
    <details key={row.id} className="text-body-sm rounded-xl border p-4">
      <summary className="cursor-pointer font-semibold break-words pointer-coarse:min-h-11">
        {row.name} · {sourceLabels[row.source]} · {row.status}
      </summary>
      <div className="mt-3 flex flex-col gap-2">
        <p>
          {row.periodLabel} · {row.instrument}
        </p>
        <p className="break-words">
          {row.courseLabel ?? "Central deployment"} · {programCode ?? "College-wide central scope"}
        </p>
        <p className="tabular-nums">
          {row.submitted} submitted / {row.opportunities} opportunities ·{" "}
          {deanRate(row.opportunities ? (row.submitted / row.opportunities) * 100 : null)}
        </p>
        {row.status === "CLOSED" && row.submitted < row.opportunities && (
          <p>
            Closed with {row.opportunities - row.submitted} outstanding historical opportunities.
          </p>
        )}
        {row.source !== "GENERAL_EDUCATION" && row.programId && (
          <Link
            className="text-link underline underline-offset-4"
            href={deanAnalyticsUrl({
              view: "outcomes",
              programId: row.programId,
              termInstanceId: row.periodId,
              evaluationId: row.id,
              source,
            })}
          >
            Inspect mapped PO evidence
          </Link>
        )}
      </div>
    </details>
  );
}

function rawDeanAnalyticsUrl(raw: Record<string, string | string[] | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) {
    if (value !== undefined) params.set(key, Array.isArray(value) ? value[0] : value);
  }
  return `/dean/analytics${params.size ? `?${params}` : ""}`;
}
function filterDeanActivity(
  rows: import("@/features/analytics/services/dean-analytics").DeanDeploymentEvidence[],
  filters: import("@/features/analytics/services/dean-analytics-state").DeanAnalyticsFilters
) {
  const programViews = filters.view !== "college" && filters.view !== "institutional";
  return rows
    .filter(
      (row) =>
        !programViews || (row.programId === filters.programId && row.source !== "GENERAL_EDUCATION")
    )
    .filter((row) => filters.view !== "institutional" || row.source === "GENERAL_EDUCATION")
    .filter((row) => !filters.evaluationId || row.id === filters.evaluationId)
    .filter(
      (row) =>
        !filters.source ||
        row.source ===
          (
            {
              COURSE: "COURSE",
              PROGRAM_WIDE_STUDENT: "STUDENT",
              ALUMNI: "ALUMNI",
              INDUSTRY: "INDUSTRY_PARTNER",
            } as const
          )[filters.source]
    );
}

function DeanFilters({
  filters,
  college,
}: {
  filters: import("@/features/analytics/services/dean-analytics-state").DeanAnalyticsFilters;
  college: NonNullable<Awaited<ReturnType<typeof getDeanEvidence>>>["college"];
}) {
  const programViews = filters.view !== "college" && filters.view !== "institutional";
  return (
    <DeanAnalyticsFilterForm scopeKey={deanAnalyticsUrl(filters)}>
      <input type="hidden" name="view" value={filters.view} />
      <label className="text-body-sm flex min-w-0 flex-col gap-2">
        Academic period
        <select
          className="bg-background focus-visible:outline-ring h-11 w-full min-w-0 rounded-lg border px-2 focus-visible:outline-2"
          name="termInstanceId"
          defaultValue={filters.termInstanceId ?? ""}
        >
          <option value="">All periods</option>
          {college.invalidPeriod && (
            <option value={filters.termInstanceId}>Unavailable selected period</option>
          )}
          {college.periods.map((period) => (
            <option key={period.id} value={period.id}>
              {period.label} · {period.status}
            </option>
          ))}
        </select>
      </label>
      {programViews && (
        <>
          <label className="text-body-sm flex min-w-0 flex-col gap-2">
            Program
            <select
              className="bg-background focus-visible:outline-ring h-11 w-full min-w-0 rounded-lg border px-2 focus-visible:outline-2"
              name="programId"
              defaultValue={filters.programId ?? ""}
            >
              <option value="">Choose a program</option>
              {college.programs.map((program) => (
                <option key={program.id} value={program.id}>
                  {program.code} · {program.name}
                  {!program.is_active && " · Archived"}
                </option>
              ))}
            </select>
          </label>
          <label className="text-body-sm flex min-w-0 flex-col gap-2">
            Evidence source
            <select
              className="bg-background focus-visible:outline-ring h-11 w-full rounded-lg border px-2 focus-visible:outline-2"
              name="source"
              defaultValue={filters.source ?? ""}
            >
              <option value="">All sources, reported separately</option>
              <option value="COURSE">Course-bound students</option>
              <option value="PROGRAM_WIDE_STUDENT">Central students</option>
              <option value="ALUMNI">Alumni</option>
              <option value="INDUSTRY">Industry partners</option>
            </select>
          </label>
        </>
      )}
      <div className="flex items-end gap-3">
        <button
          className="bg-primary text-primary-foreground text-body-sm focus-visible:outline-ring min-h-11 rounded-lg px-4 focus-visible:outline-2"
          type="submit"
        >
          Apply filters
        </button>
        <Link
          className="text-link text-body-sm focus-visible:outline-ring inline-flex min-h-11 items-center underline underline-offset-4 focus-visible:outline-2"
          href={deanAnalyticsUrl({ view: filters.view })}
        >
          Reset
        </Link>
      </div>
    </DeanAnalyticsFilterForm>
  );
}
