"use client";

import { useEffect, useState } from "react";
import { Bot, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { generateProgramHeadAnalyticsInsightAction } from "@/lib/actions/program-head-analytics-actions";
import type {
  AnalyticsInsightView,
  InsightSection,
} from "@/features/analytics/services/ai-insight-contract";
import type { GenerateAIInsightResult } from "@/features/analytics/services/generate-program-head-analytics-insight";
import type { ProgramHeadInsightFilters } from "@/features/analytics/services/program-head-analytics-state";

type ProgramHeadInlineAiInsightProps = {
  programId: string;
  analyticsView: AnalyticsInsightView;
  filters: ProgramHeadInsightFilters;
  /** Human-readable evidence basis, e.g. "42 submitted responses and 128 valid ratings". */
  evidenceBasis: string;
  qualitative?: boolean;
};

/**
 * View-specific inline AI interpretation. Each analytics view owns one
 * evidence-bound `InsightSection`, requested with the current
 * `analyticsView` and rebuilt server-side from validated filters. The
 * deterministic evidence above never waits on this section.
 */
export function ProgramHeadInlineAiInsight({
  programId,
  analyticsView,
  filters,
  evidenceBasis,
  qualitative = false,
}: ProgramHeadInlineAiInsightProps) {
  const [result, setResult] = useState<GenerateAIInsightResult | null>(null);
  const [isPending, setIsPending] = useState(true);
  const [refreshTick, setRefreshTick] = useState(0);
  const filtersKey = JSON.stringify(filters);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const next = await generateProgramHeadAnalyticsInsightAction({
          programId,
          analyticsView,
          filters: JSON.parse(filtersKey) as ProgramHeadInsightFilters,
        });
        if (!cancelled) setResult(next);
      } catch {
        if (!cancelled) setResult({ ok: false, state: "unexpected" });
      } finally {
        if (!cancelled) setIsPending(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [programId, analyticsView, filtersKey, refreshTick]);

  const handleRefresh = () => {
    setIsPending(true);
    setRefreshTick((tick) => tick + 1);
  };

  if (result === null) {
    return (
      <div
        className="bg-information-soft border-information/25 min-h-36 rounded-lg border p-4"
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
  if (result.ok && result.data.insight) {
    return (
      <InsightCard
        insight={result.data.insight}
        evidenceBasis={evidenceBasis}
        qualitative={qualitative}
        refreshing={isPending}
        onRefresh={handleRefresh}
      />
    );
  }

  if (result.ok && result.data.insight === null) {
    return (
      <InsightFallback title="AI-generated insight">
        The available evidence is too thin for a responsible AI insight. The verified analytics
        above are unaffected.
      </InsightFallback>
    );
  }

  const failure = result.ok ? null : result.state;
  const retryable =
    failure !== null && failure !== "disabled" && failure !== "insufficient-evidence";
  const label =
    failure === "disabled"
      ? "AI insight is not enabled for this deployment."
      : failure === "insufficient-evidence"
        ? "There is not enough evidence in this scope for a responsible AI insight."
        : "The AI insight is temporarily unavailable. The verified analytics above are unaffected.";
  return (
    <InsightFallback
      title="AI-generated insight"
      action={
        retryable ? (
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isPending}
            className="text-link focus-visible:ring-ring inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-sm text-sm font-semibold hover:underline focus-visible:ring-2 focus-visible:outline-hidden disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw aria-hidden="true" className="size-3.5" />
            {isPending ? "Retrying…" : "Try again"}
          </button>
        ) : undefined
      }
    >
      {label}
    </InsightFallback>
  );
}

function InsightCard({
  insight,
  evidenceBasis,
  qualitative,
  refreshing,
  onRefresh,
}: {
  insight: NonNullable<InsightSection>;
  evidenceBasis: string;
  qualitative: boolean;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  return (
    <div className="bg-information-soft border-information/25 rounded-lg border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Bot aria-hidden="true" className="size-4" />
          <h3 className="text-label-lg">AI-generated insight</h3>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          aria-label="Regenerate AI insight for this view"
          title="Regenerate AI insight for this view"
          className="text-text-secondary hover:text-foreground focus-visible:ring-ring inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-hidden disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw aria-hidden="true" className="size-3.5" />
          {refreshing ? "Refreshing…" : "Regenerate"}
        </button>
      </div>
      <div className="mt-3">
        <p className="text-label-sm font-semibold">Supporting evidence</p>
        <ul className="mt-1 flex flex-col gap-1">
          {insight.evidence.map((item) => (
            <li key={item} className="text-body-sm flex items-start gap-2">
              <span
                aria-hidden="true"
                className="bg-information mt-[0.45rem] size-1.5 shrink-0 rounded-full"
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
          Based on anonymous aggregate counts and redacted term frequencies. It does not read or
          display individual responses and may miss context, sarcasm, or uncommon feedback.
        </p>
      ) : null}
    </div>
  );
}

function InsightFallback({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="border-border rounded-lg border border-dashed p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-medium">
          <Bot aria-hidden="true" className="size-4" />
          {title}
        </div>
        {action}
      </div>
      <p className="text-body-sm text-text-secondary mt-1">{children}</p>
    </div>
  );
}
