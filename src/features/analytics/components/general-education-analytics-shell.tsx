import type { ReactNode } from "react";
import { Library } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ViewTabs } from "@/components/layout/view-tabs";
import type {
  GeneralEducationAnalyticsFrameDTO,
  GeneralEducationAnalyticsOptions,
} from "@/features/analytics/general-education-analytics-types";
import type { GeneralEducationAnalyticsFilterState } from "@/features/analytics/services/general-education-analytics-state";
import {
  GENERAL_EDUCATION_ANALYTICS_TABS,
  GENERAL_EDUCATION_ANALYTICS_TAB_LABELS,
  buildGeneralEducationAnalyticsTabUrl,
} from "@/features/analytics/services/general-education-analytics-state";
import { LOW_SAMPLE_RESPONSES } from "./general-education-evidence-marks";
import { GeneralEducationAnalyticsFilters } from "./general-education-analytics-filters";
import { GeneralEducationAnalyticsWorkspace } from "./general-education-analytics-workspace";
import { formatMean, formatResponseRate } from "./general-education-evidence-primitives";

type GeneralEducationAnalyticsShellProps = {
  filters: GeneralEducationAnalyticsFilterState;
  scope: GeneralEducationAnalyticsFrameDTO["scope"];
  kpi: GeneralEducationAnalyticsFrameDTO["kpi"];
  options: GeneralEducationAnalyticsOptions;
  children: ReactNode;
};

/**
 * One mean for the frame, or an explicit mixed-scale statement instead.
 * This frame-wide figure has no single scale behind it, so it never prints a
 * blended number. ILO rows differ on purpose: an outcome row pools its own
 * valid ratings across scales and discloses that pool alongside the mean,
 * while course and program figures stay scale-separated.
 */
function meanReadout({
  meanRating,
  spansMultipleScales,
  scaleContext,
}: GeneralEducationAnalyticsFrameDTO["kpi"]) {
  if (spansMultipleScales) {
    const scalesNote = scaleContext ? `${scaleContext}. ` : "";
    return {
      value: "Mixed scales",
      note: `${scalesNote}One mean would blend incompatible scales, so this scope reports no single mean. Course and program figures stay scale-separated; each ILO row reports its own pooled mean with that pooling disclosed.`,
    };
  }
  if (meanRating === null) {
    return { value: "—", note: "No valid rating resolved against a frozen instrument scale." };
  }
  return {
    value: formatMean(meanRating),
    note: scaleContext ?? "Mean of valid in-scale ratings.",
  };
}

function EvidenceStrip({ kpi }: { kpi: GeneralEducationAnalyticsFrameDTO["kpi"] }) {
  const mean = meanReadout(kpi);
  // Thin sample counts respondents: one response can contribute many ratings.
  const isThinSample =
    kpi.submittedResponseCount > 0 && kpi.submittedResponseCount < LOW_SAMPLE_RESPONSES;

  return (
    <dl
      aria-label="Evidence summary"
      className="border-border/80 bg-card grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl border p-4 shadow-xs sm:grid-cols-4"
    >
      <div className="flex min-w-0 flex-col gap-0.5">
        <dt className="text-label-sm text-text-secondary">Submitted responses</dt>
        <dd className="text-heading-md text-foreground tabular-nums">
          {kpi.submittedResponseCount}
          <span className="text-text-secondary text-body-sm font-normal">
            {" "}
            / {kpi.evaluationOpportunityCount} opportunities
          </span>
        </dd>
      </div>
      <div className="flex min-w-0 flex-col gap-0.5">
        <dt className="text-label-sm text-text-secondary">Response rate</dt>
        <dd className="text-heading-md text-foreground tabular-nums">
          {formatResponseRate(kpi.responseRate)}
        </dd>
      </div>
      <div className="flex min-w-0 flex-col gap-0.5">
        <dt className="text-label-sm text-text-secondary">Valid ratings</dt>
        <dd className="text-heading-md text-foreground tabular-nums">
          {kpi.ratingCount}
          {kpi.excludedRatingCount > 0 ? (
            <span className="text-text-secondary text-body-sm font-normal">
              {" "}
              ({kpi.excludedRatingCount} excluded)
            </span>
          ) : null}
        </dd>
        {isThinSample ? (
          <dd className="text-label-sm text-warning">
            Thin sample: fewer than 5 submitted responses
          </dd>
        ) : null}
      </div>
      <div className="flex min-w-0 flex-col gap-0.5">
        <dt className="text-label-sm text-text-secondary">Mean rating</dt>
        <dd className="text-heading-md text-foreground tabular-nums">{mean.value}</dd>
        <dd className="text-caption text-text-secondary text-pretty">{mean.note}</dd>
      </div>
    </dl>
  );
}

/**
 * Coordinator analytics frame: college-wide identity, the routed view switcher,
 * the compact evidence strip, and the scope filters. Everything here stays
 * mounted across filter application and view switching.
 */
export function GeneralEducationAnalyticsShell({
  filters,
  scope,
  kpi,
  options,
  children,
}: GeneralEducationAnalyticsShellProps) {
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <header className="border-border/80 flex flex-col gap-3 border-b pb-5">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-heading-xl text-balance">General Education analytics</h1>
            <Badge variant="outline" className="max-w-full rounded-full px-2.5 py-1 font-medium">
              <Library aria-hidden="true" className="size-3.5" />
              <span className="truncate">College-wide General Education</span>
            </Badge>
          </div>
          <p className="text-body-sm text-text-secondary max-w-3xl text-pretty">
            Submitted Course-bound General Education evidence across every Program, grouped through
            the current CILO-to-ILO mappings. Means describe what respondents rated; they are not
            attainment verdicts.
          </p>
          <p className="text-label-sm text-text-secondary tabular-nums">
            {scope.periodLabel ?? "All academic periods"}
          </p>
        </div>
      </header>

      <ViewTabs
        label="Analytics views"
        activeValue={filters.tab}
        items={GENERAL_EDUCATION_ANALYTICS_TABS.map((tab) => ({
          value: tab,
          label: GENERAL_EDUCATION_ANALYTICS_TAB_LABELS[tab],
          href: buildGeneralEducationAnalyticsTabUrl(tab, filters),
        }))}
      />

      <EvidenceStrip kpi={kpi} />

      <GeneralEducationAnalyticsWorkspace
        tab={filters.tab}
        filters={<GeneralEducationAnalyticsFilters filters={filters} options={options} />}
      >
        {children}
      </GeneralEducationAnalyticsWorkspace>
    </div>
  );
}
