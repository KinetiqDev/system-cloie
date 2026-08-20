import { z } from "zod";

const SEMESTER_VALUES = ["FIRST", "SECOND", "SUMMER"] as const;

export type GeneralEducationAnalyticsFilterState = {
  schoolYearId?: string;
  semester?: string;
  termInstanceId?: string;
};

function firstNonEmpty(value: string | string[] | undefined): string | undefined {
  const values = Array.isArray(value) ? value : [value];
  return values.find((entry): entry is string => !!entry && entry.trim().length > 0)?.trim();
}

const schema = z.object({
  schoolYearId: z.string().uuid().optional().catch(undefined),
  semester: z.enum(SEMESTER_VALUES).optional().catch(undefined),
  termInstanceId: z.string().uuid().optional().catch(undefined),
});

export function parseGeneralEducationAnalyticsSearchParams(
  raw: Record<string, string | string[] | undefined> = {}
): GeneralEducationAnalyticsFilterState {
  return schema.parse({
    schoolYearId: firstNonEmpty(raw.schoolYearId),
    semester: firstNonEmpty(raw.semester),
    termInstanceId: firstNonEmpty(raw.termInstanceId),
  });
}

const PARAM_KEYS = ["schoolYearId", "semester", "termInstanceId"] as const;

export function rawGeneralEducationAnalyticsSearchParamsToQueryString(
  raw: Record<string, string | string[] | undefined>
): string {
  const sp = new URLSearchParams();
  for (const key of PARAM_KEYS) {
    const v = raw[key];
    if (Array.isArray(v)) for (const e of v) sp.append(key, e);
    else if (v !== undefined) sp.append(key, v);
  }
  return sp.toString();
}

export function buildGeneralEducationAnalyticsQueryString(
  filters: GeneralEducationAnalyticsFilterState
): string {
  const sp = new URLSearchParams();
  if (filters.schoolYearId) sp.set("schoolYearId", filters.schoolYearId);
  if (filters.semester) sp.set("semester", filters.semester);
  if (filters.termInstanceId) sp.set("termInstanceId", filters.termInstanceId);
  return sp.toString();
}
