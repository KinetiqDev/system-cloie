import { AcademicSemester } from "@prisma/client";
import { z } from "zod";
import { buildProgramHeadProgramPath } from "@/lib/constants/program-head-routes";

/** Canonical analytics workspace tabs (spec §14). */
export const ANALYTICS_TABS = ["outcomes", "courses", "stakeholders", "trends", "qualitative", "ai"] as const;
const LEGACY_ANALYTICS_TABS = ["overview", "breakdowns", "feedback"] as const;
type AnalyticsTab = (typeof ANALYTICS_TABS)[number];
type LegacyAnalyticsTab = (typeof LEGACY_ANALYTICS_TABS)[number];
export const ANALYTICS_TAB_LABELS: Record<AnalyticsTab, string> = {
  outcomes: "Outcomes", courses: "Courses", stakeholders: "Stakeholders", trends: "Trends", qualitative: "Qualitative", ai: "AI Insights",
};
type AnalyticsEvidenceSource = "COURSE" | "PROGRAM_WIDE_STUDENT" | "ALUMNI" | "INDUSTRY";
type AnalyticsStakeholder = "STUDENT" | "ALUMNI" | "INDUSTRY_PARTNER";
export type AnalyticsFilterState = {
  tab: AnalyticsTab; schoolYearId?: string; semester?: string; termInstanceId?: string;
  evidenceSource?: AnalyticsEvidenceSource; stakeholder?: AnalyticsStakeholder; majorId?: string; yearLevel?: string;
  courseId?: string; facultyId?: string; section?: string; ploId?: string; evaluationId?: string;
};
type Raw = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => {
  const values = Array.isArray(v) ? v : [v];
  return values.find((entry): entry is string => !!entry && entry.trim().length > 0)?.trim();
};
const uuid = z.string().uuid();
const schema = z.object({
  tab: z.enum([...ANALYTICS_TABS, ...LEGACY_ANALYTICS_TABS]).catch("outcomes"),
  schoolYearId: uuid.optional().catch(undefined), semester: z.nativeEnum(AcademicSemester).optional().catch(undefined), termInstanceId: uuid.optional().catch(undefined),
  evidenceSource: z.enum(["COURSE", "PROGRAM_WIDE_STUDENT", "ALUMNI", "INDUSTRY"]).optional().catch(undefined), stakeholder: z.enum(["STUDENT", "ALUMNI", "INDUSTRY_PARTNER"]).optional().catch(undefined),
  majorId: uuid.optional().catch(undefined), yearLevel: z.string().optional().catch(undefined), courseId: uuid.optional().catch(undefined), facultyId: uuid.optional().catch(undefined), section: z.string().optional().catch(undefined), ploId: uuid.optional().catch(undefined), evaluationId: uuid.optional().catch(undefined),
});
function couple(state: Omit<AnalyticsFilterState, "tab"> & { tab: AnalyticsTab | LegacyAnalyticsTab }): AnalyticsFilterState {
  let stakeholder = state.stakeholder;
  if (state.evidenceSource === "COURSE") stakeholder = undefined;
  if ((state.evidenceSource === "PROGRAM_WIDE_STUDENT" && stakeholder !== "STUDENT") || (state.evidenceSource === "ALUMNI" && stakeholder !== "ALUMNI") || (state.evidenceSource === "INDUSTRY" && stakeholder !== "INDUSTRY_PARTNER")) stakeholder = undefined;
  const { tab, ...rest } = state;
  return { ...rest, tab: ANALYTICS_TABS.includes(tab as AnalyticsTab) ? tab as AnalyticsTab : "outcomes", stakeholder };
}
export function parseAnalyticsSearchParams(raw: Raw = {}): AnalyticsFilterState {
  const parsed = schema.parse({ tab: first(raw.tab), schoolYearId: first(raw.schoolYearId), semester: first(raw.semester), termInstanceId: first(raw.termInstanceId), evidenceSource: first(raw.evidenceSource), stakeholder: first(raw.stakeholder), majorId: first(raw.majorId), yearLevel: first(raw.yearLevel), courseId: first(raw.courseId), facultyId: first(raw.facultyId), section: first(raw.section), ploId: first(raw.ploId), evaluationId: first(raw.evaluationId) });
  const normalized = couple(parsed);
  return Object.fromEntries(Object.entries(normalized).filter(([, value]) => value !== undefined)) as AnalyticsFilterState;
}
const PARAM_KEYS = ["tab", "schoolYearId", "semester", "termInstanceId", "evidenceSource", "stakeholder", "majorId", "yearLevel", "courseId", "facultyId", "section", "ploId", "evaluationId"] as const;
export function rawAnalyticsSearchParamsToQueryString(raw: Raw): string { const p = new URLSearchParams(); for (const key of PARAM_KEYS) { const value = raw[key]; for (const entry of Array.isArray(value) ? value : value === undefined ? [] : [value]) p.append(key, entry); } return p.toString(); }
function append(p: URLSearchParams, state: Partial<AnalyticsFilterState>) {
  for (const key of PARAM_KEYS) {
    const value = state[key];
    if (value === undefined || value === null || value === "" || (key === "tab" && value === "outcomes")) continue;
    p.set(key, String(value));
  }
}
export function buildAnalyticsQueryString(filters: AnalyticsFilterState): string { const p = new URLSearchParams(); append(p, filters); return p.toString(); }
export function buildAnalyticsUrl(programId: string, params: Partial<AnalyticsFilterState> = {}): string {
  const path = buildProgramHeadProgramPath(programId, "analytics");
  const p = new URLSearchParams();
  append(p, params);
  if (params.tab === "outcomes") p.set("tab", "outcomes");
  const query = p.toString();
  return query ? `${path}?${query}` : path;
}

export function buildAnalyticsTabUrl(programId: string, tab: AnalyticsTab, current: AnalyticsFilterState): string {
  return buildAnalyticsUrl(programId, { ...current, tab });
}

export function buildAnalyticsFilterFingerprint(
  filters: Pick<AnalyticsFilterState, "schoolYearId" | "semester" | "termInstanceId" | "evidenceSource" | "stakeholder">
): string {
  return [filters.schoolYearId ?? "", filters.semester ?? "", filters.termInstanceId ?? "", filters.evidenceSource ?? "", filters.stakeholder ?? ""].join("|");
}
