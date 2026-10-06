import { AcademicSemester, YearLevel } from "@prisma/client";
import { z } from "zod";
import { GEN_ED_ANALYTICS_PATH } from "@/lib/constants/gen-ed-routes";

/**
 * Coordinator analytics views (ADR 0035). `programs` replaces the Program Head
 * Stakeholders view because Central evidence is excluded from General Education.
 */
export const GENERAL_EDUCATION_ANALYTICS_TABS = [
  "outcomes",
  "courses",
  "programs",
  "trends",
  "qualitative",
] as const;
export type GeneralEducationAnalyticsTab = (typeof GENERAL_EDUCATION_ANALYTICS_TABS)[number];

export const GENERAL_EDUCATION_ANALYTICS_TAB_LABELS: Record<GeneralEducationAnalyticsTab, string> =
  {
    outcomes: "Outcomes",
    courses: "Courses",
    programs: "Programs",
    trends: "Trends",
    qualitative: "Written feedback",
  };

export type GeneralEducationAnalyticsFilterState = {
  tab: GeneralEducationAnalyticsTab;
  schoolYearId?: string;
  semester?: AcademicSemester;
  termInstanceId?: string;
  courseId?: string;
  /** Class-context Program (`CourseAssignment.program_id`). */
  programId?: string;
  yearLevel?: YearLevel;
  /** Selects and scrolls to one Institutional Learning Outcome row. */
  iloId?: string;
};

type Raw = Record<string, string | string[] | undefined>;

function firstNonEmpty(value: string | string[] | undefined): string | undefined {
  const values = Array.isArray(value) ? value : [value];
  return values.find((entry): entry is string => !!entry && entry.trim().length > 0)?.trim();
}

const uuid = z.string().uuid();
const schema = z.object({
  tab: z.enum(GENERAL_EDUCATION_ANALYTICS_TABS).catch("outcomes"),
  schoolYearId: uuid.optional().catch(undefined),
  semester: z.nativeEnum(AcademicSemester).optional().catch(undefined),
  termInstanceId: uuid.optional().catch(undefined),
  courseId: uuid.optional().catch(undefined),
  programId: uuid.optional().catch(undefined),
  yearLevel: z.nativeEnum(YearLevel).optional().catch(undefined),
  iloId: uuid.optional().catch(undefined),
});

const PARAM_KEYS = [
  "tab",
  "schoolYearId",
  "semester",
  "termInstanceId",
  "courseId",
  "programId",
  "yearLevel",
  "iloId",
] as const;

export function parseGeneralEducationAnalyticsSearchParams(
  raw: Raw = {}
): GeneralEducationAnalyticsFilterState {
  const parsed = schema.parse(
    Object.fromEntries(PARAM_KEYS.map((key) => [key, firstNonEmpty(raw[key])]))
  );
  return Object.fromEntries(
    Object.entries(parsed).filter(([, value]) => value !== undefined)
  ) as GeneralEducationAnalyticsFilterState;
}

export function rawGeneralEducationAnalyticsSearchParamsToQueryString(raw: Raw): string {
  const sp = new URLSearchParams();
  for (const key of PARAM_KEYS) {
    const value = raw[key];
    for (const entry of Array.isArray(value) ? value : value === undefined ? [] : [value]) {
      sp.append(key, entry);
    }
  }
  return sp.toString();
}

/** Canonical query: default tab omitted, empty facets dropped, stable key order. */
export function buildGeneralEducationAnalyticsQueryString(
  filters: Partial<GeneralEducationAnalyticsFilterState>
): string {
  const sp = new URLSearchParams();
  for (const key of PARAM_KEYS) {
    const value = filters[key];
    if (!value || (key === "tab" && value === "outcomes")) continue;
    sp.set(key, value);
  }
  return sp.toString();
}

export function buildGeneralEducationAnalyticsUrl(
  filters: Partial<GeneralEducationAnalyticsFilterState> = {}
): string {
  const query = buildGeneralEducationAnalyticsQueryString(filters);
  return query ? `${GEN_ED_ANALYTICS_PATH}?${query}` : GEN_ED_ANALYTICS_PATH;
}

/** Switching views keeps every scope facet; the ILO selection belongs to Outcomes only. */
export function buildGeneralEducationAnalyticsTabUrl(
  tab: GeneralEducationAnalyticsTab,
  current: GeneralEducationAnalyticsFilterState
): string {
  return buildGeneralEducationAnalyticsUrl({
    ...current,
    tab,
    iloId: tab === "outcomes" || tab === "trends" ? current.iloId : undefined,
  });
}

/** Scope facets only — what every evidence read and AI packet is keyed on. */
type GeneralEducationEvidenceScope = Omit<GeneralEducationAnalyticsFilterState, "tab">;

export function toGeneralEducationEvidenceScope(
  filters: GeneralEducationAnalyticsFilterState
): GeneralEducationEvidenceScope {
  const { schoolYearId, semester, termInstanceId, courseId, programId, yearLevel, iloId } = filters;
  return { schoolYearId, semester, termInstanceId, courseId, programId, yearLevel, iloId };
}
