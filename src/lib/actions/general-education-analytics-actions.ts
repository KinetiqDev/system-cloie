"use server";

import { generateGeneralEducationAnalyticsInsight } from "@/features/analytics/services/generate-general-education-analytics-insight";
import type { GenerateGeneralEducationAiInsightResult } from "@/features/analytics/services/ai-insight-contract";
import { generalEducationAiActionInputSchema } from "@/features/analytics/services/general-education-ai-schema";

/**
 * Request a bounded AI interpretation for one Coordinator analytics view.
 *
 * The client submits only the requested view and validated URL filter state.
 * The service re-authorizes the Coordinator role, rebuilds the shared frame
 * plus the evidence read backing that view server-side, enforces the configured
 * corpus gates, and never trusts client-supplied aggregates, comments,
 * identities, or scope decisions. Unknown input keys are rejected outright.
 */
export async function generateGeneralEducationAnalyticsInsightAction(
  input: unknown
): Promise<GenerateGeneralEducationAiInsightResult> {
  const parsed = generalEducationAiActionInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, state: "invalid-request" };
  }
  return generateGeneralEducationAnalyticsInsight({
    view: parsed.data.view,
    filters: parsed.data.filters,
  });
}
