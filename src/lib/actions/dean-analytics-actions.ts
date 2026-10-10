"use server";
import { generateDeanAiInsight } from "@/features/analytics/services/dean-ai-insight";
export async function generateDeanAnalyticsInsightAction(input: unknown) {
  return generateDeanAiInsight(input);
}
