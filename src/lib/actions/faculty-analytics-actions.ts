"use server";

import { z } from "zod";
import { getFacultyAnalyticsData } from "@/features/analytics/services/get-faculty-analytics-data";
import { generateFacultyAnalyticsInsight } from "@/features/analytics/services/generate-faculty-analytics-insight";
import { FACULTY_ANALYTICS_VIEWS, type FacultyAnalyticsFilters } from "@/features/analytics/types";

const filtersSchema = z
  .object({
    view: z.enum(FACULTY_ANALYTICS_VIEWS).optional(),
    termInstanceId: z.string().uuid().optional(),
    courseId: z.string().uuid().optional(),
    assignmentId: z.string().uuid().optional(),
    evaluationId: z.string().uuid().optional(),
    status: z.enum(["ACTIVE", "CLOSED"]).optional(),
  })
  .strict();

function parseFilters(input: unknown): Partial<FacultyAnalyticsFilters> | null {
  const parsed = filtersSchema.safeParse(input);
  return parsed.success ? parsed.data : null;
}

export async function getFacultyAnalyticsDataAction(input: unknown) {
  const filters = parseFilters(input);
  if (!filters) return { success: false as const, error: "Invalid analytics filters" };
  return getFacultyAnalyticsData(filters);
}

export async function generateFacultyAnalyticsInsightAction(input: unknown) {
  const filters = parseFilters(input);
  if (!filters) return { ok: false as const, state: "invalid-request" as const };
  return generateFacultyAnalyticsInsight(filters);
}
