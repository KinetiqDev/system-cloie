"use server";

import { generateProgramHeadAnalyticsInsight } from "@/features/analytics/services/generate-program-head-analytics-insight";
import { aiActionInputSchema } from "@/features/analytics/services/program-head-ai-schema";

/**
 * Request a bounded AI interpretation for the selected Program scope.
 *
 * The client submits only `programId` and the validated tab/filter state. The
 * service re-authorizes via `resolveProgramHeadContext`, rebuilds all
 * deterministic evidence server-side, enforces configured corpus gates, and
 * never trusts client-supplied aggregates, comments, identities, or scope
 * decisions. Unknown input keys are rejected outright.
 */
export async function generateProgramHeadAnalyticsInsightAction(
  input: unknown
): Promise<ReturnType<typeof generateProgramHeadAnalyticsInsight>> {
  const parsed = aiActionInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, state: "invalid-request" };
  }
  return generateProgramHeadAnalyticsInsight(parsed.data.programId, parsed.data.filters);
}