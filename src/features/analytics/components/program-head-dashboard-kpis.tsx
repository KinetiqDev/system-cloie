import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type { ParticipationSummary } from "@/features/analytics/aggregators/types";

type Kpi = { label: string; value: string; detail: string; href: string };

/**
 * Three headline figures for the period (spec §13.2–§13.4). Completion uses
 * the raw assignment denominator (resolved §5.12); respondents are
 * person-level (§13.3). Each figure links to the view that explains it.
 */
export function ProgramHeadDashboardKpis({
  participation,
  activeEvaluations,
  stakeholdersHref,
  activeEvaluationsHref,
}: {
  participation: ParticipationSummary;
  activeEvaluations: { total: number; closingWithin7Days: number };
  stakeholdersHref: string;
  activeEvaluationsHref: string;
}) {
  const { completionRate, submitted, assigned, respondents } = participation;
  const kpis: Kpi[] = [
    {
      label: "Response completion",
      value: completionRate === null ? "—" : `${Math.round(completionRate * 100)}%`,
      detail:
        completionRate === null
          ? "No evaluations assigned yet"
          : `${submitted.toLocaleString()} of ${assigned.toLocaleString()} submitted`,
      href: stakeholdersHref,
    },
    {
      label: "Respondents",
      value: respondents.total.toLocaleString(),
      detail: `${respondents.complete.toLocaleString()} complete · ${respondents.partial.toLocaleString()} partial · ${respondents.notStarted.toLocaleString()} not started`,
      href: stakeholdersHref,
    },
    {
      label: "Active evaluations",
      value: activeEvaluations.total.toLocaleString(),
      detail: `${activeEvaluations.closingWithin7Days.toLocaleString()} close within 7 days`,
      href: activeEvaluationsHref,
    },
  ];

  return (
    <section
      aria-label="Key figures"
      className="bg-card border-border grid overflow-hidden rounded-xl border shadow-sm sm:grid-cols-3"
    >
      {kpis.map((kpi) => (
        <Link
          key={kpi.label}
          href={kpi.href}
          className="group hover:bg-surface-hover focus-visible:ring-ring border-border grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-0.5 border-b px-4 py-3.5 transition-colors last:border-b-0 focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset motion-reduce:transition-none sm:grid-cols-1 sm:items-start sm:gap-y-1 sm:border-r sm:border-b-0 sm:px-5 sm:py-5 sm:last:border-r-0"
        >
          <span className="text-title-sm text-text-primary col-start-1 row-start-1 flex items-center gap-1">
            {kpi.label}
            <ChevronRight
              aria-hidden="true"
              className="text-text-secondary size-4 shrink-0 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
            />
          </span>
          <span className="text-heading-xl sm:text-display-md col-start-2 row-span-2 row-start-1 tabular-nums sm:col-start-1 sm:row-span-1 sm:row-start-2">
            {kpi.value}
          </span>
          <span className="text-body-sm text-text-secondary col-start-1 row-start-2 text-pretty sm:row-start-3">
            {kpi.detail}
          </span>
        </Link>
      ))}
    </section>
  );
}
