import { z } from "zod";

export const DEAN_ANALYTICS_VIEWS = [
  "college",
  "outcomes",
  "courses",
  "stakeholders",
  "trends",
  "feedback",
  "institutional",
] as const;
const schema = z.object({
  view: z.enum(DEAN_ANALYTICS_VIEWS).catch("college"),
  programId: z.uuid().optional().catch(undefined),
  termInstanceId: z.uuid().optional().catch(undefined),
  source: z
    .enum(["COURSE", "PROGRAM_WIDE_STUDENT", "ALUMNI", "INDUSTRY"])
    .optional()
    .catch(undefined),
  evaluationId: z.uuid().optional().catch(undefined),
});
export type DeanAnalyticsFilters = z.infer<typeof schema>;
export function parseDeanAnalyticsFilters(
  raw: Record<string, string | string[] | undefined>
): DeanAnalyticsFilters {
  const parsed = schema.parse(
    Object.fromEntries(
      Object.entries(raw).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value])
    )
  );
  if (parsed.view === "college" || parsed.view === "institutional") {
    delete parsed.programId;
    delete parsed.source;
    delete parsed.evaluationId;
  }
  return parsed;
}
export function deanAnalyticsUrl(filters: Partial<DeanAnalyticsFilters>): string {
  const params = new URLSearchParams();
  for (const key of ["view", "programId", "termInstanceId", "source", "evaluationId"] as const) {
    const value = filters[key];
    if (value && !(key === "view" && value === "college")) params.set(key, value);
  }
  return `/dean/analytics${params.size ? `?${params}` : ""}`;
}
