"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Disclosure, DisclosureContent, DisclosureTrigger } from "@/components/ui/disclosure";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import {
  DASHBOARD_SOURCE_ORDER,
  DASHBOARD_SOURCE_TO_ANALYTICS_FILTER,
  GO_SOURCE_LABELS,
  type DashboardSourceKey,
} from "@/features/analytics/program-head-dashboard-labels";
import type {
  DashboardPeriodFilters,
  DashboardGoSummaryRow,
  GoCatalogEntry,
} from "@/features/analytics/services/get-program-head-dashboard";
import { buildAnalyticsUrl } from "@/features/analytics/services/program-head-analytics-state";
import { HowCalculatedPopover } from "./how-calculated-popover";

function mergeCatalogRows(
  sourceKey: DashboardSourceKey,
  catalog: GoCatalogEntry[],
  evidenceRows: DashboardGoSummaryRow[]
): DashboardGoSummaryRow[] {
  const byGoId = new Map(evidenceRows.map((row) => [row.goId, row]));
  const merged = catalog.map(
    (entry) =>
      byGoId.get(entry.id) ?? {
        goId: entry.id,
        goCode: entry.code,
        mean: null,
        ratingCount: 0,
        responseCount: 0,
        evaluationCount: 0,
        contributorCount: 0,
        contributorKind: "questions" as const,
        spansMultipleScales: false,
        scaleMax: null,
        hasEvidence: false,
        evidenceSummary: {
          explanation:
            "No evidence from this source for this Graduate Outcome in the selected period.",
        },
      }
  );
  const catalogIds = new Set(catalog.map((entry) => entry.id));
  // Historical evidence may reference GOs no longer active in the catalog.
  for (const row of evidenceRows) {
    if (!catalogIds.has(row.goId)) {
      merged.push(row);
    }
  }
  return merged;
}

/**
 * Graduate Outcome summary (spec §13.8): one evidence source at a
 * time; details expose rating/response/evaluation plus contributing-CILO or
 * bound-question counts. Rows deep-link into Analytics > Outcomes with
 * period, source, and GO preserved (§12 upward navigation). No attainment
 * status is shown anywhere.
 */
export function ProgramHeadGoSummary({
  sources,
  goCatalog,
  programId,
  periodFilters,
}: {
  sources: Record<DashboardSourceKey, DashboardGoSummaryRow[]>;
  goCatalog: GoCatalogEntry[];
  programId: string;
  periodFilters: DashboardPeriodFilters;
}) {
  const [sourceKey, setSourceKey] = useState<DashboardSourceKey>("COURSE_STUDENT");
  const rows = mergeCatalogRows(sourceKey, goCatalog, sources[sourceKey] ?? []);
  const rowHref = (goId: string): string =>
    buildAnalyticsUrl(programId, {
      ...periodFilters,
      tab: "outcomes",
      goId,
      ...DASHBOARD_SOURCE_TO_ANALYTICS_FILTER[sourceKey],
    });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-bold">Graduate Outcome summary</CardTitle>
        <CardDescription>
          One evidence source at a time; select a GO to open Analytics.
        </CardDescription>
        <div
          role="group"
          aria-label="Evidence source"
          className="mt-1 grid grid-cols-2 gap-1 sm:flex sm:flex-wrap"
        >
          {DASHBOARD_SOURCE_ORDER.map((key) => (
            <button
              key={key}
              type="button"
              aria-pressed={sourceKey === key}
              onClick={() => setSourceKey(key)}
              className={`text-label-sm focus-visible:ring-ring sm:text-label-md min-h-10 min-w-0 rounded-lg px-2 py-1.5 font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none sm:px-2.5 pointer-coarse:min-h-11 ${
                sourceKey === key
                  ? "bg-primary-soft text-selected-fg"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              }`}
            >
              <span className="line-clamp-2">{GO_SOURCE_LABELS[key]}</span>
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        {rows.length === 0 ? (
          <Empty>
            <EmptyTitle>No active Graduate Outcomes</EmptyTitle>
            <EmptyDescription>
              Define the program&rsquo;s Graduate Outcomes before interpreting GO evidence.
            </EmptyDescription>
          </Empty>
        ) : (
          rows.map((row) => (
            <div key={row.goId} className="border-border/60 border-b py-2 last:border-b-0">
              <div className="focus-within:ring-ring -mx-2 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 rounded-lg px-2 focus-within:ring-2 sm:grid-cols-[3.5rem_minmax(0,1fr)_5rem]">
                <span className="text-label-md min-w-0 truncate font-bold" title={row.goCode}>
                  <Link href={rowHref(row.goId)} className="hover:underline">
                    {row.goCode}
                  </Link>
                </span>
                <Link
                  href={rowHref(row.goId)}
                  aria-hidden="true"
                  tabIndex={-1}
                  className="bg-muted relative col-span-2 row-start-2 block h-3.5 overflow-hidden rounded border sm:col-span-1 sm:row-start-auto"
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
                <span className="text-label-md col-start-2 row-start-1 flex items-center justify-end gap-1 font-bold tabular-nums sm:col-start-auto sm:row-start-auto">
                  {row.spansMultipleScales ? (
                    <span className="text-muted-foreground text-label-sm font-semibold">
                      Multiple scales
                      <span className="sr-only">
                        ; evidence uses incompatible rating scales, so no combined mean is shown
                      </span>
                    </span>
                  ) : row.mean === null ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    row.mean.toFixed(2)
                  )}
                  <HowCalculatedPopover
                    metric={{ ...row.evidenceSummary, evidenceHref: rowHref(row.goId) }}
                    label={row.goCode}
                  />
                </span>
              </div>
              <Disclosure className="mt-1">
                <DisclosureTrigger variant="link">Evidence details</DisclosureTrigger>
                <DisclosureContent className="pt-1.5">
                  <dl className="text-muted-foreground text-label-sm grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-4">
                    <div>
                      <dt className="sr-only">Rating count</dt>
                      <dd className="tabular-nums">
                        <strong className="text-foreground">
                          {row.ratingCount.toLocaleString()}
                        </strong>{" "}
                        ratings
                      </dd>
                    </div>
                    <div>
                      <dt className="sr-only">Response count</dt>
                      <dd className="tabular-nums">
                        <strong className="text-foreground">
                          {row.responseCount.toLocaleString()}
                        </strong>{" "}
                        responses
                      </dd>
                    </div>
                    <div>
                      <dt className="sr-only">Evaluation count</dt>
                      <dd className="tabular-nums">
                        <strong className="text-foreground">
                          {row.evaluationCount.toLocaleString()}
                        </strong>{" "}
                        evaluations
                      </dd>
                    </div>
                    <div>
                      <dt className="sr-only">
                        {row.contributorKind === "cilos"
                          ? "Contributing CILO count"
                          : "Bound question count"}
                      </dt>
                      <dd className="tabular-nums">
                        <strong className="text-foreground">
                          {row.contributorCount.toLocaleString()}
                        </strong>{" "}
                        {row.contributorKind === "cilos" ? "contributing CILOs" : "bound questions"}
                      </dd>
                    </div>
                  </dl>
                  {!row.hasEvidence && (
                    <p className="text-muted-foreground text-label-sm mt-1">
                      No mapped quantitative evidence for this source in the selected period.
                    </p>
                  )}
                </DisclosureContent>
              </Disclosure>
            </div>
          ))
        )}
        <p className="text-muted-foreground text-label-sm mt-2">
          {sourceKey === "COURSE_STUDENT"
            ? "Course-bound GO means use published direct question bindings and current CILO-to-GO mappings."
            : "Directly bound questions on published deployments feed this source's GO means."}
        </p>
      </CardContent>
    </Card>
  );
}
