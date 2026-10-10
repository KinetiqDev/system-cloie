"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
  DashboardPoRow,
  PoCatalogEntry,
} from "@/features/analytics/services/get-program-head-dashboard";
import { buildAnalyticsUrl } from "@/features/analytics/services/program-head-analytics-state";
import {
  OUTCOME_ATTAINMENT_BENCHMARK,
  classifyOutcomeMean,
} from "@/features/analytics/aggregators/outcome-attainment";
import { AttainmentBadge, getAttainmentColor } from "./outcome-attainment-badge";
import { AttainmentLegend } from "./outcome-attainment-legend";

function mergeCatalogRows(catalog: PoCatalogEntry[], evidenceRows: DashboardPoRow[]) {
  const byPoId = new Map(evidenceRows.map((row) => [row.poId, row]));
  const merged = catalog.map(
    (entry): DashboardPoRow =>
      byPoId.get(entry.id) ?? {
        poId: entry.id,
        poCode: entry.code,
        mean: null,
        spansMultipleScales: false,
        scaleMax: null,
        hasEvidence: false,
        attainment: classifyOutcomeMean(null, null),
      }
  );
  const catalogIds = new Set(catalog.map((entry) => entry.id));
  // Historical evidence may reference POs no longer active in the catalog.
  return [...merged, ...evidenceRows.filter((row) => !catalogIds.has(row.poId))];
}

function meanText(row: DashboardPoRow): string {
  if (row.spansMultipleScales) return "Mixed scales";
  return row.mean === null ? "—" : row.mean.toFixed(2);
}

function attainmentText(row: DashboardPoRow): string {
  if (row.attainment.status === "classified" && row.attainment.interpretation) {
    return `${row.attainment.interpretation}, ${row.attainment.cqi}`;
  }
  if (row.attainment.status === "mixed-scales") return "mixed scales, not classified";
  if (row.attainment.status === "unsupported-scale") return "unsupported scale, not classified";
  return "no evidence";
}

/**
 * Program Outcome summary (spec §13.8): one evidence source at a time, one
 * row per PO with its mean and ADR 0037 classification. Every row opens
 * Analytics > Outcomes with period, source, and PO preserved (§12), where
 * rating, response, and contributor counts live.
 */
export function ProgramHeadGoSummary({
  sources,
  poCatalog,
  programId,
  periodFilters,
}: {
  sources: Record<DashboardSourceKey, DashboardPoRow[]>;
  poCatalog: PoCatalogEntry[];
  programId: string;
  periodFilters: DashboardPeriodFilters;
}) {
  const [sourceKey, setSourceKey] = useState<DashboardSourceKey>("COURSE_STUDENT");
  const rows = mergeCatalogRows(poCatalog, sources[sourceKey] ?? []);
  const analyticsScope = {
    ...periodFilters,
    tab: "outcomes" as const,
    ...DASHBOARD_SOURCE_TO_ANALYTICS_FILTER[sourceKey],
  };
  const counts = [
    {
      label: "meet benchmark",
      tone: "text-success",
      count: rows.filter((r) => r.attainment.cqi === "Meets Benchmark").length,
    },
    {
      label: "need attention",
      tone: "text-warning",
      count: rows.filter((r) => r.attainment.cqi === "Needs Attention").length,
    },
    {
      label: "below benchmark",
      tone: "text-danger",
      count: rows.filter((r) => r.attainment.cqi === "Below Benchmark").length,
    },
    {
      label: "without evidence",
      tone: "text-text-secondary",
      count: rows.filter((r) => r.attainment.status === "no-evidence").length,
    },
    {
      label: "not classified",
      tone: "text-text-secondary",
      count: rows.filter(
        (r) => r.attainment.status === "mixed-scales" || r.attainment.status === "unsupported-scale"
      ).length,
    },
  ].filter((entry) => entry.count > 0);

  return (
    <Card className="gap-3">
      <CardHeader className="gap-3">
        <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 className="text-heading-lg">Program Outcomes</h2>
          <Link
            href={buildAnalyticsUrl(programId, analyticsScope)}
            className="text-link text-label-lg focus-visible:ring-ring inline-flex items-center gap-0.5 rounded-sm font-semibold underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:outline-none pointer-coarse:min-h-11"
          >
            Open in Analytics
            <ChevronRight aria-hidden="true" className="size-4" />
          </Link>
        </div>
        <div
          role="group"
          aria-label="Evidence source"
          className="bg-muted/60 grid grid-cols-2 gap-1 rounded-lg p-1 sm:flex sm:w-fit"
        >
          {DASHBOARD_SOURCE_ORDER.map((key) => (
            <button
              key={key}
              type="button"
              aria-pressed={sourceKey === key}
              onClick={() => setSourceKey(key)}
              className={`text-label-lg focus-visible:ring-ring min-h-9 min-w-0 rounded-md px-3 py-1.5 transition-colors focus-visible:ring-2 focus-visible:outline-none motion-reduce:transition-none pointer-coarse:min-h-11 ${
                sourceKey === key
                  ? "bg-card text-text-primary shadow-sm"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {GO_SOURCE_LABELS[key]}
            </button>
          ))}
        </div>
        {counts.length > 0 && (
          <p className="text-body-sm text-text-secondary">
            {counts.map((entry, index) => (
              <span key={entry.label}>
                {index > 0 && <span aria-hidden="true"> · </span>}
                <strong className={`${entry.tone} font-semibold tabular-nums`}>
                  {entry.count}
                </strong>{" "}
                {entry.label}
              </span>
            ))}
          </p>
        )}
      </CardHeader>
      <CardContent className="flex flex-col">
        {rows.length === 0 ? (
          <Empty>
            <EmptyTitle>No active Program Outcomes</EmptyTitle>
            <EmptyDescription>
              Add the program&rsquo;s Program Outcomes to see evidence here.
            </EmptyDescription>
          </Empty>
        ) : (
          <>
            <ul className="flex flex-col">
              {rows.map((row) => (
                <li key={row.poId} className="border-border/60 border-b last:border-b-0">
                  <Link
                    href={buildAnalyticsUrl(programId, { ...analyticsScope, poId: row.poId })}
                    aria-label={`${row.poCode}: mean ${meanText(row)}, ${attainmentText(row)}`}
                    className="group hover:bg-surface-hover focus-visible:ring-ring -mx-2 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 rounded-lg px-2 py-3 transition-colors focus-visible:ring-2 focus-visible:outline-none motion-reduce:transition-none sm:grid-cols-[6rem_minmax(0,1fr)_auto_3.5rem]"
                  >
                    <span className="text-title-sm min-w-0 truncate" title={row.poCode}>
                      {row.poCode}
                    </span>
                    <span
                      aria-hidden="true"
                      className="bg-muted relative col-span-2 row-start-2 block h-2 overflow-hidden rounded-full sm:col-span-1 sm:row-start-auto"
                    >
                      {row.attainment.status === "classified" && row.scaleMax !== null && (
                        <span
                          className="bg-foreground/45 absolute inset-y-0 z-10 w-0.5"
                          style={{
                            left: `${(OUTCOME_ATTAINMENT_BENCHMARK / row.scaleMax) * 100}%`,
                          }}
                        />
                      )}
                      {row.mean !== null && row.scaleMax !== null && (
                        <span
                          className="block h-full rounded-full"
                          style={{
                            width: `${Math.min(100, (row.mean / row.scaleMax) * 100)}%`,
                            backgroundColor: getAttainmentColor(row.attainment),
                          }}
                        />
                      )}
                    </span>
                    <span className="col-start-2 row-start-1 flex items-center justify-end gap-3 sm:contents">
                      <AttainmentBadge attainment={row.attainment} compact />
                      <span className="text-title-sm text-right tabular-nums">{meanText(row)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <Disclosure className="mt-3">
              <DisclosureTrigger variant="link">How ratings are classified</DisclosureTrigger>
              <DisclosureContent>
                <AttainmentLegend />
              </DisclosureContent>
            </Disclosure>
          </>
        )}
      </CardContent>
    </Card>
  );
}
