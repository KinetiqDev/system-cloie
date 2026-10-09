import Link from "next/link";
import { DeanAnalyticsFilterForm } from "@/features/analytics/components/dean-analytics-filter-form";
import { DeanFilterSelect } from "@/features/analytics/components/dean-filter-select";
import { DeanAiInsight } from "@/features/analytics/components/dean-ai-insight";
import { notFound, redirect } from "next/navigation";
import { buildPageTitle } from "@/lib/page-title";
import { getDeanEvidence } from "@/features/analytics/services/dean-evidence";
import {
  DEAN_ANALYTICS_VIEWS,
  deanAnalyticsUrl,
  parseDeanAnalyticsFilters,
} from "@/features/analytics/services/dean-analytics-state";
import { DeanEvidenceView } from "@/features/analytics/components/dean-evidence-view";
import {
  DEAN_SOURCE_LABELS,
  deanRate,
  deanStatus,
} from "@/features/analytics/components/dean-format";
import type { DeanDeploymentEvidence } from "@/features/analytics/services/dean-analytics";
import type { DeanAnalyticsFilters } from "@/features/analytics/services/dean-analytics-state";
import { ViewTabs } from "@/components/layout/view-tabs";

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
        <p className="text-body-sm text-text-secondary mt-2">
          How the college is doing: who responded, and what the ratings say about learning outcomes.
        </p>
      </header>
      <ViewTabs
        label="Dean analytics views"
        activeValue={filters.view}
        items={DEAN_ANALYTICS_VIEWS.map((view) => ({
          value: view,
          label: viewLabels[view],
          href: deanAnalyticsUrl(parseDeanAnalyticsFilters({ ...filters, view })),
        }))}
      />
      <DeanFilters filters={filters} college={college} />
      {filters.evaluationId && (
        <p className="text-body-sm">
          Showing one evaluation.{" "}
          <Link
            className="text-link underline"
            href={deanAnalyticsUrl({ ...filters, evaluationId: undefined })}
          >
            Back to the whole program
          </Link>
        </p>
      )}
      {college.invalidPeriod && (
        <p role="status" className="text-body-sm">
          This period no longer exists. No evidence is shown; choose another period or reset the
          filters.
        </p>
      )}
      <DeanEvidenceView evidence={evidence} filters={filters} />
      <details className="text-body-sm rounded-xl border p-4">
        <summary className="cursor-pointer font-semibold pointer-coarse:min-h-11">
          How to read these numbers
        </summary>
        <ul className="mt-3 flex list-disc flex-col gap-1.5 pl-5">
          <li>Only submitted evaluations count. Drafts and in-progress answers are left out.</li>
          <li>
            Response rate is submitted evaluations out of everything assigned, even if the person
            has since left. No assignments means no rate, which is not the same as 0%.
          </li>
          <li>Evaluations still open are incomplete. Their numbers can still change.</li>
          <li>
            Ratings show what people reported, not individual student mastery. Totals describe
            activity and are not a college score.
          </li>
          <li>
            Different programs, groups and rating scales are shown side by side but not combined or
            ranked.
          </li>
          <li>
            College totals include General Education and college-wide evaluations. Program totals
            exclude those, so they do not add up to the college total.
          </li>
          <li>
            General Education ratings follow course-to-ILO links and never feed Program Outcomes.
          </li>
        </ul>
      </details>
      <section className="flex flex-col gap-3">
        <h2 className="text-heading-lg">Evaluations in this view</h2>
        {activity.length > 0 ? (
          <details>
            <summary className="text-body-sm cursor-pointer font-semibold pointer-coarse:min-h-11">
              Show all {activity.length}
            </summary>
            <ul className="bg-card text-body-sm mt-3 flex flex-col divide-y rounded-xl border">
              {activity.map((row) => (
                <DeanActivityRow
                  key={row.id}
                  row={row}
                  programCode={
                    college.programs.find((program) => program.id === row.programId)?.code
                  }
                />
              ))}
            </ul>
          </details>
        ) : (
          <p className="text-body-sm">
            No evaluations match this view. Choose a program, change the filters or try another
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
  row: DeanDeploymentEvidence;
  programCode?: string;
}) {
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
  const missing = row.opportunities - row.submitted;
  return (
    <li className="flex flex-col gap-1 px-4 py-3">
      <span className="flex flex-wrap items-baseline justify-between gap-x-3">
        <span className="font-semibold break-words">{row.name}</span>
        <span className="text-text-secondary tabular-nums">
          {row.submitted}/{row.opportunities} ·{" "}
          {deanRate(row.opportunities ? (row.submitted / row.opportunities) * 100 : null)}
        </span>
      </span>
      <span className="text-text-secondary break-words">
        {deanStatus(row.status)} · {DEAN_SOURCE_LABELS[row.source]} · {row.periodLabel} ·{" "}
        {row.courseLabel ?? programCode ?? "College-wide"}
      </span>
      <span className="text-text-secondary break-words">{row.instrument}</span>
      {row.status === "CLOSED" && missing > 0 && (
        <span>Closed with {missing} responses missing.</span>
      )}
      {row.source !== "GENERAL_EDUCATION" && row.programId && (
        <Link
          className="text-link inline-flex w-fit underline underline-offset-4 pointer-coarse:min-h-11 pointer-coarse:items-center"
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
    </li>
  );
}

function rawDeanAnalyticsUrl(raw: Record<string, string | string[] | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) {
    if (value !== undefined) params.set(key, Array.isArray(value) ? value[0] : value);
  }
  return `/dean/analytics${params.size ? `?${params}` : ""}`;
}
function filterDeanActivity(rows: DeanDeploymentEvidence[], filters: DeanAnalyticsFilters) {
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
  filters: DeanAnalyticsFilters;
  college: NonNullable<Awaited<ReturnType<typeof getDeanEvidence>>>["college"];
}) {
  const programViews = filters.view !== "college" && filters.view !== "institutional";
  return (
    <DeanAnalyticsFilterForm scopeKey={deanAnalyticsUrl(filters)}>
      <input type="hidden" name="view" value={filters.view} />
      <DeanFilterSelect
        name="termInstanceId"
        label="Academic period"
        value={filters.termInstanceId ?? ""}
        options={[
          { value: "", label: "All periods" },
          ...(college.invalidPeriod
            ? [{ value: filters.termInstanceId!, label: "Unavailable selected period" }]
            : []),
          ...college.periods.map((period) => ({
            value: period.id,
            label: `${period.label} · ${deanStatus(period.status)}`,
          })),
        ]}
      />
      {programViews && (
        <>
          <DeanFilterSelect
            name="programId"
            label="Program"
            value={filters.programId ?? ""}
            options={[
              { value: "", label: "Choose a program" },
              ...college.programs.map((program) => ({
                value: program.id,
                label: `${program.code} · ${program.name}${program.is_active ? "" : " · Archived"}`,
              })),
            ]}
          />
          <DeanFilterSelect
            name="source"
            label="Who responded"
            value={filters.source ?? ""}
            options={[
              { value: "", label: "Everyone, shown separately" },
              { value: "COURSE", label: "Course students" },
              { value: "PROGRAM_WIDE_STUDENT", label: "Program-wide students" },
              { value: "ALUMNI", label: "Alumni" },
              { value: "INDUSTRY", label: "Industry partners" },
            ]}
          />
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
