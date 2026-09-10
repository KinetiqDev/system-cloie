import { z } from "zod";

export const insightSectionSchema = z
  .object({
    observation: z.string().min(1).max(400),
    evidence: z.array(z.string().min(1).max(200)).min(1).max(5),
    connection: z.string().max(400).optional(),
    limitation: z.string().max(200).nullable(),
    reviewQuestion: z.string().max(200).nullable(),
  })
  .nullable();
export type InsightSection = z.infer<typeof insightSectionSchema>;

/**
 * Analytics views that carry an inline evidence-bound insight. Each view gets
 * its own bounded evidence packet and a single validated `InsightSection`,
 * rendered inline by the owning view instead of a dedicated AI tab.
 */
export const ANALYTICS_INSIGHT_VIEWS = [
  "outcomes",
  "courses",
  "stakeholders",
  "trends",
  "qualitative",
] as const;
export type AnalyticsInsightView = (typeof ANALYTICS_INSIGHT_VIEWS)[number];
