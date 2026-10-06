"use client";

import { useEffect, useState } from "react";
import {
  AnalyticsInsightCard,
  AnalyticsInsightPending,
  AnalyticsInsightRecoverable,
  AnalyticsInsightUnavailable,
} from "./analytics-insight-card";
import { generateProgramHeadAnalyticsInsightAction } from "@/lib/actions/program-head-analytics-actions";
import type { AnalyticsInsightView } from "@/features/analytics/services/ai-insight-contract";
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
    return <AnalyticsInsightPending />;
  }
  if (result.ok && result.data.insight) {
    return (
      <AnalyticsInsightCard
        insight={result.data.insight}
        evidenceBasis={evidenceBasis}
        qualitative={qualitative}
        boundedEvidence={
          qualitative &&
          Boolean(
            result.data.evidenceScope.tokenAnalysis?.truncated ||
            result.data.evidenceScope.promptAnalysis?.truncated
          )
        }
        refreshing={isPending}
        onRefresh={handleRefresh}
      />
    );
  }

  if (result.ok && result.data.insight === null) {
    return (
      <AnalyticsInsightUnavailable title="AI-generated insight">
        The available evidence is too thin for a responsible AI insight. The verified analytics
        above are unaffected.
      </AnalyticsInsightUnavailable>
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
    <AnalyticsInsightRecoverable
      title="AI-generated insight"
      onRetry={retryable ? handleRefresh : undefined}
      retrying={isPending}
    >
      {label}
    </AnalyticsInsightRecoverable>
  );
}
