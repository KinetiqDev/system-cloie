import {
  AcademicSemester,
  DeploymentStatus,
  StudentSection,
  TargetStakeholder,
  YearLevel,
} from "@prisma/client";
import { z } from "zod";
import { buildProgramHeadProgramPath } from "@/lib/constants/program-head-routes";

const RESPONSE_TABS = ["course", "program-wide"] as const;
type ResponsesTab = (typeof RESPONSE_TABS)[number];
const RESPONSE_COMPLETION_FILTERS = ["zero", "partial", "complete"] as const;
type ResponseCompletionFilter = (typeof RESPONSE_COMPLETION_FILTERS)[number];

export type ProgramHeadResponsesFilterState = {
  tab: ResponsesTab;
  page: number;
  q?: string;
  termInstanceId?: string;
  schoolYearId?: string;
  semester?: AcademicSemester;
  courseId?: string;
  facultyId?: string;
  majorId?: string;
  yearLevel?: YearLevel;
  section?: StudentSection;
  stakeholder?: TargetStakeholder;
  status?: DeploymentStatus;
  completion?: ResponseCompletionFilter;
  instrumentTemplateId?: string;
};

type RawSearchParams = Record<string, string | string[] | undefined>;
const MAX_PAGE = 10_000;
const MAX_QUERY_LENGTH = 100;
const first = (value: string | string[] | undefined) =>
  (Array.isArray(value) ? value[0] : value)?.trim() || undefined;
const uuid = z.string().uuid();
const schema = z.object({
  tab: z.enum(RESPONSE_TABS).catch("course"),
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
  majorId: uuid.optional().catch(undefined),
  yearLevel: z.nativeEnum(YearLevel).optional().catch(undefined),
  section: z.nativeEnum(StudentSection).optional().catch(undefined),
  stakeholder: z.nativeEnum(TargetStakeholder).optional().catch(undefined),
  status: z.nativeEnum(DeploymentStatus).optional().catch(undefined),
  completion: z.enum(RESPONSE_COMPLETION_FILTERS).optional().catch(undefined),
  instrumentTemplateId: uuid.optional().catch(undefined),
});

export function parseProgramHeadResponsesSearchParams(
  raw: RawSearchParams = {}
): ProgramHeadResponsesFilterState {
  const parsed = schema.parse({
    tab: first(raw.tab),
    page: first(raw.page),
    q: first(raw.q),
    termInstanceId: first(raw.termInstanceId),
    schoolYearId: first(raw.schoolYearId),
    semester: first(raw.semester),
    courseId: first(raw.courseId),
    facultyId: first(raw.facultyId),
    majorId: first(raw.majorId),
    yearLevel: first(raw.yearLevel),
    section: first(raw.section),
    stakeholder: first(raw.stakeholder),
    status: first(raw.status),
    completion: first(raw.completion),
    instrumentTemplateId: first(raw.instrumentTemplateId),
  });
  return { ...parsed, q: parsed.q || undefined };
}

const PARAM_KEYS = [
  "tab",
  "page",
  "q",
  "termInstanceId",
  "schoolYearId",
  "semester",
  "courseId",
  "facultyId",
  "majorId",
  "yearLevel",
  "section",
  "stakeholder",
  "status",
  "completion",
  "instrumentTemplateId",
] as const;
export function rawProgramHeadResponsesQuery(raw: RawSearchParams): string {
  const params = new URLSearchParams();
  for (const key of PARAM_KEYS) {
    const value = raw[key];
    for (const entry of Array.isArray(value) ? value : value === undefined ? [] : [value])
      params.append(key, entry);
  }
  return params.toString();
}

export function programHeadResponsesQuery(state: ProgramHeadResponsesFilterState): string {
  const params = new URLSearchParams();
  if (state.tab !== "course") params.set("tab", state.tab);
  if (state.page > 1) params.set("page", String(state.page));
  const entries = [
    "q",
    "termInstanceId",
    "schoolYearId",
    "semester",
    "courseId",
    "facultyId",
    "majorId",
    "yearLevel",
    "section",
    "stakeholder",
    "status",
    "completion",
    "instrumentTemplateId",
  ] as const;
  for (const key of entries) if (state[key]) params.set(key, String(state[key]));
  return params.toString();
}

export function buildProgramHeadResponsesUrl(
  programId: string,
  state: ProgramHeadResponsesFilterState
): string {
  const path = buildProgramHeadProgramPath(programId, "responses");
  const query = programHeadResponsesQuery(state);
  return query ? `${path}?${query}` : path;
}

export function buildProgramHeadResponsesTabUrl(
  programId: string,
  tab: ResponsesTab,
  current: ProgramHeadResponsesFilterState
): string {
  if (tab === current.tab) {
    return buildProgramHeadResponsesUrl(programId, current);
  }
  return buildProgramHeadResponsesUrl(programId, {
    tab,
    page: 1,
    q: current.q,
    termInstanceId: current.termInstanceId,
    schoolYearId: current.schoolYearId,
    semester: current.semester,
    majorId: current.majorId,
    yearLevel: current.yearLevel,
    status: current.status,
    completion: current.completion,
  });
}

export function buildProgramHeadResponsesPageUrl(
  programId: string,
  state: ProgramHeadResponsesFilterState,
  page: number
): string {
  return buildProgramHeadResponsesUrl(programId, { ...state, page });
}
