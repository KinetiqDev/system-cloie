"use client";

import { useEffect, useRef, useState } from "react";
import {
  AnalyticsInsightCard,
  AnalyticsInsightPending,
  AnalyticsInsightRecoverable,
  AnalyticsInsightUnavailable,
} from "./analytics-insight-card";
import { generateGeneralEducationAnalyticsInsightAction } from "@/lib/actions/general-education-analytics-actions";
import type { GenerateGeneralEducationAiInsightResult } from "@/features/analytics/services/ai-insight-contract";
import type {
  GeneralEducationAnalyticsFilterState,
  GeneralEducationAnalyticsTab,
} from "@/features/analytics/services/general-education-analytics-state";

type GeneralEducationInlineAiInsightProps = {
  view: GeneralEducationAnalyticsTab;
  filters: GeneralEducationAnalyticsFilterState;
  /** Human-readable evidence basis, e.g. "42 submitted responses and 128 valid ratings". */
  evidenceBasis: string;
  qualitative?: boolean;
};

/**
 * View-specific inline AI interpretation for the Coordinator workspace. Each
 * view mounts exactly one automatic request below its deterministic charts and
 * above its exact tables; the request carries only this view and the validated
 * URL filter state, and the server rebuilds and re-authorizes the evidence.
 *
 * The deterministic charts and tables never wait on this section: a failed,
 * disabled, or out-of-order reply degrades to a bounded notice while the exact
 * values stay on screen.
 */
export function GeneralEducationInlineAiInsight({
  view,
  filters,
  evidenceBasis,
  qualitative = false,
}: GeneralEducationInlineAiInsightProps) {
  const [settled, setSettled] = useState<{
    scopeKey: string;
    result: GenerateGeneralEducationAiInsightResult;
  } | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const filtersKey = JSON.stringify(filters);
  // Scope key identifies the request a reply belongs to, so a slow reply for a
  // scope the reader has already left can never overwrite the current one.
  const scopeKey = `${view}|${filtersKey}|${refreshTick}`;
  const activeScope = useRef(scopeKey);

  useEffect(() => {
    const requestScope = scopeKey;
    activeScope.current = requestScope;
    let cancelled = false;
    const run = async () => {
      try {
        const next = await generateGeneralEducationAnalyticsInsightAction({
          view,
          filters: JSON.parse(filtersKey) as GeneralEducationAnalyticsFilterState,
        });
        if (!cancelled && activeScope.current === requestScope) {
          setSettled({ scopeKey: requestScope, result: next });
        }
      } catch {
        if (!cancelled && activeScope.current === requestScope) {
          setSettled({ scopeKey: requestScope, result: { ok: false, state: "unexpected" } });
        }
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [view, filtersKey, scopeKey, refreshTick]);

  const handleRefresh = () => {
    setRefreshTick((tick) => tick + 1);
  };

  // Only a reply for the scope now on screen may render. Comparing during
  // render rather than clearing in an effect means a scope change never
  // paints the previous scope's insight, not even for one frame.
  const result = settled?.scopeKey === scopeKey ? settled.result : null;
  const isPending = result === null;

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
          result.data.evidenceScope.truncations.length > 0 ||
          Boolean(qualitative && result.data.evidenceScope.qualitativeItemCount !== null)
        }
        boundedEvidenceNote={
          result.data.evidenceScope.truncations.length > 0
            ? `The interpretation used a bounded slice of the evidence: ${result.data.evidenceScope.truncations.join(" ")} The charts above carry the complete figures.`
            : undefined
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
