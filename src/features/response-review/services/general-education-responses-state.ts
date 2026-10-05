import { AcademicSemester, StudentSection, YearLevel } from "@prisma/client";
import { z } from "zod";
import { GEN_ED_RESPONSES_PATH } from "@/lib/constants/gen-ed-routes";

// ---------------------------------------------------------------------------
// Coordinator response-review filter state (ADR 0034)
//
// Deliberately narrower than the Program Head state: there is no Program
// context, no Central tab, and no stakeholder dimension, because the
// Coordinator owns General Education Course-bound evidence only.
// ---------------------------------------------------------------------------

const MAX_PAGE = 10_000;
const MAX_QUERY_LENGTH = 100;

export type GeneralEducationResponsesFilterState = {
  page: number;
  q?: string;
  termInstanceId?: string;
  schoolYearId?: string;
  semester?: AcademicSemester;
  courseId?: string;
  facultyId?: string;
  yearLevel?: YearLevel;
  section?: StudentSection;
};

type RawSearchParams = Record<string, string | string[] | undefined>;

const first = (value: string | string[] | undefined) =>
  (Array.isArray(value) ? value[0] : value)?.trim() || undefined;

const uuid = z.string().uuid();

const schema = z.object({
  page: z.coerce.number().int().min(1).max(MAX_PAGE).catch(1),
  q: z
    .string()
    .trim()
    .transform((value) => value.slice(0, MAX_QUERY_LENGTH))
    .optional()
    .catch(undefined),
  termInstanceId: uuid.optional().catch(undefined),
  schoolYearId: uuid.optional().catch(undefined),
  semester: z.nativeEnum(AcademicSemester).optional().catch(undefined),
  courseId: uuid.optional().catch(undefined),
  facultyId: uuid.optional().catch(undefined),
  yearLevel: z.nativeEnum(YearLevel).optional().catch(undefined),
  section: z.nativeEnum(StudentSection).optional().catch(undefined),
});

export function parseGeneralEducationResponsesSearchParams(
  raw: RawSearchParams = {}
): GeneralEducationResponsesFilterState {
  const parsed = schema.parse({
    page: first(raw.page),
    q: first(raw.q),
    termInstanceId: first(raw.termInstanceId),
    schoolYearId: first(raw.schoolYearId),
    semester: first(raw.semester),
    courseId: first(raw.courseId),
    facultyId: first(raw.facultyId),
    yearLevel: first(raw.yearLevel),
    section: first(raw.section),
  });
  return { ...parsed, q: parsed.q || undefined };
}

const PARAM_KEYS = [
  "page",
  "q",
  "termInstanceId",
  "schoolYearId",
  "semester",
  "courseId",
  "facultyId",
  "yearLevel",
  "section",
] as const;

/** Raw query preserved verbatim so unknown parameters survive upward navigation. */
export function rawGeneralEducationResponsesQuery(raw: RawSearchParams): string {
  const params = new URLSearchParams();
  for (const key of PARAM_KEYS) {
    const value = raw[key];
    for (const entry of Array.isArray(value) ? value : value === undefined ? [] : [value]) {
      params.append(key, entry);
    }
  }
  return params.toString();
}

export function generalEducationResponsesQuery(
  state: GeneralEducationResponsesFilterState
): string {
  const params = new URLSearchParams();
  if (state.page > 1) params.set("page", String(state.page));
  const entries = [
    ["q", state.q],
    ["termInstanceId", state.termInstanceId],
    ["schoolYearId", state.schoolYearId],
    ["semester", state.semester],
    ["courseId", state.courseId],
    ["facultyId", state.facultyId],
    ["yearLevel", state.yearLevel],
    ["section", state.section],
  ] as const;
  for (const [key, value] of entries) {
    if (value) params.set(key, value);
  }
  return params.toString();
}

export function buildGeneralEducationResponsesUrl(
  state: GeneralEducationResponsesFilterState
): string {
  const query = generalEducationResponsesQuery(state);
  return query ? `${GEN_ED_RESPONSES_PATH}?${query}` : GEN_ED_RESPONSES_PATH;
}
