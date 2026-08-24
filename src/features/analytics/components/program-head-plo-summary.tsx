"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import {
  DASHBOARD_SOURCE_ORDER,
  DASHBOARD_SOURCE_TO_ANALYTICS_FILTER,
  PLO_SOURCE_LABELS,
  type DashboardSourceKey,
} from "@/features/analytics/program-head-dashboard-labels";
import type {
  DashboardPeriodFilters,
  DashboardPloSummaryRow,
  PloCatalogEntry,
} from "@/features/analytics/services/get-program-head-dashboard";
import { buildAnalyticsUrl } from "@/features/analytics/services/program-head-analytics-state";
import { HowCalculatedPopover } from "./how-calculated-popover";

function mergeCatalogRows(
  sourceKey: DashboardSourceKey,
  catalog: PloCatalogEntry[],
  evidenceRows: DashboardPloSummaryRow[]
): DashboardPloSummaryRow[] {
  const byPloId = new Map(evidenceRows.map((row) => [row.ploId, row]));
  const merged = catalog.map((entry) =>
    byPloId.get(entry.id) ?? {
      ploId: entry.id,
      ploCode: entry.code,
      mean: null,
      ratingCount: 0,
      responseCount: 0,
      evaluationCount: 0,
      contributorCount: 0,
      contributorKind: sourceKey === "COURSE_STUDENT" ? ("cilos" as const) : ("questions" as const),
      spansMultipleScales: false,
      scaleMax: null,
      hasEvidence: false,
      evidenceSummary: {
        explanation: "No evidence from this source for this Program Learning Outcome in the selected period.",
      },
    }
  );
  const catalogIds = new Set(catalog.map((entry) => entry.id));
  // Historical evidence may reference PLOs no longer active in the catalog.
  for (const row of evidenceRows) {
    if (!catalogIds.has(row.ploId)) {
      merged.push(row);
    }
  }
  return merged;
}

/**
 * Program Learning Outcome summary (spec §13.8): one evidence source at a
 * time; details expose rating/response/evaluation plus contributing-CILO or
 * bound-question counts. Rows deep-link into Analytics > Outcomes with
 * period, source, and PLO preserved (§12 upward navigation). No attainment
 * status is shown anywhere.
 */
export function ProgramHeadPloSummary({
  sources,
  ploCatalog,
  programId,
  periodFilters,
}: {
  sources: Record<DashboardSourceKey, DashboardPloSummaryRow[]>;
  ploCatalog: PloCatalogEntry[];
  programId: string;
  periodFilters: DashboardPeriodFilters;
}) {
  const [sourceKey, setSourceKey] = useState<DashboardSourceKey>("COURSE_STUDENT");
  const rows = mergeCatalogRows(sourceKey, ploCatalog, sources[sourceKey] ?? []);
  const rowHref = (ploId: string): string =>
    buildAnalyticsUrl(programId, {
      ...periodFilters,
      tab: "outcomes",
      ploId,
      ...DASHBOARD_SOURCE_TO_ANALYTICS_FILTER[sourceKey],
    });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-bold">Program Learning Outcome summary</CardTitle>
        <CardDescription>One evidence source at a time; select a PLO to open Analytics.</CardDescription>
        <div role="group" aria-label="Evidence source" className="mt-1 flex flex-wrap gap-1">
          {DASHBOARD_SOURCE_ORDER.map((key) => (
            <button
              key={key}
              type="button"
              aria-pressed={sourceKey === key}
              onClick={() => setSourceKey(key)}
              className={`rounded-lg px-2.5 py-1.5 pointer-coarse:min-h-11 text-label-md font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${
                sourceKey === key
                  ? "bg-primary-soft text-selected-fg"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              }`}
            >
              {PLO_SOURCE_LABELS[key]}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        {rows.length === 0 ? (
          <Empty>
            <EmptyTitle>No active Program Learning Outcomes</EmptyTitle>
            <EmptyDescription>
              Define the program&rsquo;s learning outcomes before interpreting PLO evidence.
            </EmptyDescription>
          </Empty>
        ) : (
          rows.map((row) => (
            <div key={row.ploId} className="border-border/60 border-b py-2 last:border-b-0">
              <div className="-mx-2 grid grid-cols-[3.5rem_minmax(0,1fr)_5rem] items-center gap-3 rounded-lg px-2 focus-within:ring-2 focus-within:ring-ring">
                <span className="truncate text-label-md font-bold" title={row.ploCode}>
                  <Link href={rowHref(row.ploId)} className="hover:underline">
                    {row.ploCode}
                  </Link>
                </span>
                <Link
                  href={rowHref(row.ploId)}
                  aria-hidden="true"
                  tabIndex={-1}
                  className="bg-muted relative block h-3.5 overflow-hidden rounded border"
                >
                  {row.mean !== null && row.scaleMax !== null ? (
                    <span
                      className="block h-full"
                      style={{
                        width: `${Math.min(100, (row.mean / row.scaleMax) * 100)}%`,
                        backgroundColor: "var(--chart-1)",
                        opacity: 0.86,
                      }}
                    />
                  ) : null}
                </Link>
                <span className="tabular-nums flex items-center justify-end gap-1 text-label-md font-bold">
                  {row.spansMultipleScales ? (
                    <span className="text-muted-foreground text-label-sm font-semibold">Multiple scales</span>
                  ) : row.mean === null ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    row.mean.toFixed(2)
                  )}
                  <HowCalculatedPopover
                    metric={{ ...row.evidenceSummary, evidenceHref: rowHref(row.ploId) }}
                    label={row.ploCode}
                  />
                </span>
              </div>
              <details className="mt-1">
                <summary className="text-muted-foreground hover:text-foreground inline-flex cursor-pointer list-none text-label-sm font-semibold hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
                  Evidence details
                </summary>
                <dl className="text-muted-foreground mt-1.5 grid grid-cols-2 gap-x-4 gap-y-1 text-label-sm sm:grid-cols-4">
                  <div>
                    <dt className="sr-only">Rating count</dt>
                    <dd className="tabular-nums">
                      <strong className="text-foreground">{row.ratingCount.toLocaleString()}</strong>{" "}
                      ratings
                    </dd>
                  </div>
                  <div>
                    <dt className="sr-only">Response count</dt>
                    <dd className="tabular-nums">
                      <strong className="text-foreground">{row.responseCount.toLocaleString()}</strong>{" "}
                      responses
                    </dd>
                  </div>
                  <div>
                    <dt className="sr-only">Evaluation count</dt>
                    <dd className="tabular-nums">
                      <strong className="text-foreground">{row.evaluationCount.toLocaleString()}</strong>{" "}
                      evaluations
                    </dd>
                  </div>
                  <div>
                    <dt className="sr-only">
                      {row.contributorKind === "cilos" ? "Contributing CILO count" : "Bound question count"}
                    </dt>
                    <dd className="tabular-nums">
                      <strong className="text-foreground">{row.contributorCount.toLocaleString()}</strong>{" "}
                      {row.contributorKind === "cilos" ? "contributing CILOs" : "bound questions"}
                    </dd>
                  </div>
                </dl>
                {!row.hasEvidence && (
                  <p className="text-muted-foreground mt-1 text-label-sm">
                    No mapped quantitative evidence for this source in the selected period.
                  </p>
                )}
              </details>
            </div>
          ))
        )}
        <p className="text-muted-foreground mt-2 text-label-sm">
          {sourceKey === "COURSE_STUDENT"
            ? "Only quantitative answers bound to a CILO flow through CILO-to-PLO mappings into course-derived PLO means."
            : "Directly bound questions on published deployments feed this source's PLO means."}
        </p>
      </CardContent>
    </Card>
  );
}
