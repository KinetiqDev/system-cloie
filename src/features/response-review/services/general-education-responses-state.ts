import { AcademicSemester, DeploymentStatus, StudentSection, YearLevel } from "@prisma/client";
import { z } from "zod";
import { GEN_ED_RESPONSES_PATH } from "@/lib/constants/gen-ed-routes";

// ---------------------------------------------------------------------------
// Coordinator response-review filter state (ADR 0034, ADR 0035)
//
// The Coordinator owns General Education Course-bound evidence only, so the
// state carries no Program context, no Central tab, and no stakeholder
// dimension. It does carry the Program Head review facets that apply to any
// course evaluation — status and response progress — plus two class-context
// facets: `programId` (the assignment's Program, never the respondent's) and
// `iloId` (evaluations whose Course has an active CILO currently mapped to
// that Institutional Learning Outcome).
// ---------------------------------------------------------------------------

const MAX_PAGE = 10_000;
const MAX_QUERY_LENGTH = 100;

const RESPONSE_COMPLETION_FILTERS = ["zero", "partial", "complete"] as const;
/** Response progress against the evaluation's real assignment opportunities. */
type ResponseCompletionFilter = (typeof RESPONSE_COMPLETION_FILTERS)[number];

export type GeneralEducationResponsesFilterState = {
  page: number;
  q?: string;
  termInstanceId?: string;
  schoolYearId?: string;
  semester?: AcademicSemester;
  courseId?: string;
  /** Class-context Program (`CourseAssignment.program_id`). */
  programId?: string;
  facultyId?: string;
  yearLevel?: YearLevel;
  section?: StudentSection;
  /** Evaluations whose Course has an active CILO currently mapped to this ILO. */
  iloId?: string;
  status?: DeploymentStatus;
  completion?: ResponseCompletionFilter;
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
  programId: uuid.optional().catch(undefined),
  facultyId: uuid.optional().catch(undefined),
  yearLevel: z.nativeEnum(YearLevel).optional().catch(undefined),
  section: z.nativeEnum(StudentSection).optional().catch(undefined),
  iloId: uuid.optional().catch(undefined),
  status: z.nativeEnum(DeploymentStatus).optional().catch(undefined),
  completion: z.enum(RESPONSE_COMPLETION_FILTERS).optional().catch(undefined),
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
    programId: first(raw.programId),
    facultyId: first(raw.facultyId),
    yearLevel: first(raw.yearLevel),
    section: first(raw.section),
    iloId: first(raw.iloId),
    status: first(raw.status),
    completion: first(raw.completion),
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
  "programId",
  "facultyId",
  "yearLevel",
  "section",
  "iloId",
  "status",
  "completion",
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
    ["programId", state.programId],
    ["facultyId", state.facultyId],
    ["yearLevel", state.yearLevel],
    ["section", state.section],
    ["iloId", state.iloId],
    ["status", state.status],
    ["completion", state.completion],
  ] as const;
  for (const [key, value] of entries) {
    if (value) params.set(key, value);
  }
  return params.toString();
}

export function buildGeneralEducationResponsesUrl(
  state: Partial<GeneralEducationResponsesFilterState> = {}
): string {
  const query = generalEducationResponsesQuery({ page: 1, ...state });
  return query ? `${GEN_ED_RESPONSES_PATH}?${query}` : GEN_ED_RESPONSES_PATH;
}
