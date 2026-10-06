"use client";

import { Bot, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import type { InsightSection } from "@/features/analytics/services/ai-insight-contract";

/**
 * Presentational AI-insight surface shared by every Analytics interpretation.
 * It owns the pending, insight, and recoverable-failure presentations and
 * nothing else: the owning wrapper owns the request, the evidence basis, and
 * the retry. Deterministic charts and tables never wait on this component.
 */

type AnalyticsInsightCardProps = {
  insight: NonNullable<InsightSection>;
  /** Human-readable evidence basis, e.g. "42 submitted responses and 128 valid ratings". */
  evidenceBasis: string;
  /** Adds the anonymous-aggregate written-feedback boundary disclosure. */
  qualitative?: boolean;
  /** Adds the bounded-slice disclosure when the packet carried only part of the corpus. */
  boundedEvidence?: boolean;
  /** Explains which tier the bounding dropped, when it is not the qualitative corpus. */
  boundedEvidenceNote?: string;
  refreshing?: boolean;
  onRefresh?: () => void;
};

export function AnalyticsInsightCard({
  insight,
  evidenceBasis,
  qualitative = false,
  boundedEvidence = false,
  boundedEvidenceNote,
  refreshing = false,
  onRefresh,
}: AnalyticsInsightCardProps) {
  return (
    <div className="bg-info-soft border-info/25 rounded-lg border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Bot aria-hidden="true" className="size-4" />
          <h3 className="text-label-lg">AI-generated insight</h3>
        </div>
        {onRefresh ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            loading={refreshing}
            aria-label="Regenerate AI insight for this view"
            title="Regenerate AI insight for this view"
          >
            <RefreshCw data-icon="inline-start" aria-hidden="true" />
            {refreshing ? "Refreshing…" : "Regenerate"}
          </Button>
        ) : null}
      </div>
      <p className="text-body-md mt-2">{insight.observation}</p>
      <div className="mt-3">
        <p className="text-label-sm font-semibold">Supporting evidence</p>
        <ul className="mt-1 flex flex-col gap-1">
          {insight.evidence.map((item) => (
            <li key={item} className="text-body-sm flex items-start gap-2">
              <span
                aria-hidden="true"
                className="bg-info mt-[0.45rem] size-1.5 shrink-0 rounded-full"
              />
              {item}
            </li>
          ))}
        </ul>
      </div>
      {insight.connection ? (
        <p className="text-body-sm text-text-secondary mt-2">
          <span className="text-foreground font-semibold">What this suggests: </span>
          {insight.connection}
        </p>
      ) : null}
      {insight.limitation ? (
        <p className="text-body-sm text-text-secondary mt-2">
          <span className="text-foreground font-semibold">Limitation: </span>
          {insight.limitation}
        </p>
      ) : null}
      {insight.reviewQuestion ? (
        <p className="text-body-sm text-text-secondary mt-2">
          <span className="text-foreground font-semibold">Worth discussing: </span>
          {insight.reviewQuestion}
        </p>
      ) : null}
      <p className="text-muted-foreground mt-3 text-xs">
        Based on {evidenceBasis}. AI can be wrong. Use the chart and exact values as the evidence.
      </p>
      {qualitative ? (
        <p className="text-muted-foreground mt-2 text-xs">
          Based on anonymous aggregate counts, redacted term counts, per-prompt structure, and a
          fixed word-list tone distribution. It does not read or display individual responses and
          may miss context, sarcasm, and uncommon feedback.
        </p>
      ) : null}
      {boundedEvidence ? (
        <p className="text-muted-foreground mt-2 text-xs">
          {boundedEvidenceNote ??
            "The interpretation used a bounded slice of the written-feedback evidence, not the entire corpus."}
        </p>
      ) : null}
    </div>
  );
}

export function AnalyticsInsightPending() {
  return (
    <div
      className="bg-info-soft border-info/25 min-h-36 rounded-lg border p-4"
      role="status"
      aria-label="Generating AI insight"
      aria-busy="true"
    >
      <div className="flex items-center gap-2 font-medium">
        <Bot aria-hidden="true" className="size-4" />
        Interpreting this evidence
      </div>
      <p className="text-body-sm text-text-secondary mt-1">
        System CLOIE is preparing an AI-generated insight. The verified analytics remain available
        while this finishes.
      </p>
      <div className="mt-4 flex flex-col gap-2" aria-hidden="true">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-[88%]" />
        <Skeleton className="h-3 w-[64%]" />
      </div>
    </div>
  );
}

/** Non-retryable copy: disabled or too little evidence for a responsible insight. */
export function AnalyticsInsightUnavailable({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-border rounded-lg border border-dashed p-4">
      <div className="flex items-center gap-2 font-medium">
        <Bot aria-hidden="true" className="size-4" />
        {title}
      </div>
      <p className="text-body-sm text-text-secondary mt-1">{children}</p>
    </div>
  );
}

/** Recoverable copy: the reader may retry, and deterministic evidence is unaffected. */
export function AnalyticsInsightRecoverable({
  title,
  children,
  onRetry,
  retrying,
}: {
  title: string;
  children: React.ReactNode;
  onRetry?: () => void;
  retrying?: boolean;
}) {
  return (
    <div className="border-border rounded-lg border border-dashed p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-medium">
          <Bot aria-hidden="true" className="size-4" />
          {title}
        </div>
        {onRetry ? (
          <Button type="button" variant="link" onClick={onRetry} loading={retrying}>
            <RefreshCw data-icon="inline-start" aria-hidden="true" />
            {retrying ? "Retrying…" : "Try again"}
          </Button>
        ) : null}
      </div>
      <p className="text-body-sm text-text-secondary mt-1">{children}</p>
    </div>
  );
}
