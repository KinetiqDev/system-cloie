"use server";

import {
  generateProgramHeadAnalyticsInsight,
  type GenerateAIInsightResult,
} from "@/features/analytics/services/generate-program-head-analytics-insight";
import { aiActionInputSchema } from "@/features/analytics/services/program-head-ai-schema";

/**
 * Request a bounded AI interpretation for one analytics view of the selected
 * Program scope.
 *
 * The client submits only `programId`, the requested analytics view, and the
 * validated tab/filter state. The service re-authorizes via
 * `resolveProgramHeadContext`, rebuilds the deterministic overview plus the
 * evidence read backing that view server-side, enforces configured corpus
 * gates, and never trusts client-supplied aggregates, comments, identities,
 * or scope decisions. Unknown input keys are rejected outright.
 */
export async function generateProgramHeadAnalyticsInsightAction(
  input: unknown
): Promise<GenerateAIInsightResult> {
  const parsed = aiActionInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, state: "invalid-request" };
  }
  return generateProgramHeadAnalyticsInsight(
    parsed.data.programId,
    parsed.data.filters,
    parsed.data.analyticsView
  );
}
