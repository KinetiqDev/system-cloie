import type { AcademicSemester, Prisma } from "@prisma/client";
import { ResponseStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { resolveProgramHeadContext } from "@/features/auth/services/resolve-program-head-context";
import {
  buildProgramHeadOverviewKpi,
  buildScaleIdentities,
  buildTrendSeries,
  describeScales,
  extractDistinctScales,
  semesterOrder,
  termOrder,
  type ScaleDescriptor,
  type TrendSeriesPeriodInput,
} from "./program-head-analytics-aggregators";
import type { AnalyticsFilterState } from "./program-head-analytics-state";
import type {
  ProgramHeadAnalyticsScopeSummary,
  ProgramHeadOverviewDTO,
  ProgramHeadTrendsDTO,
  OverviewEmptyReason,
} from "../program-head-analytics-types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type TermInstanceSummary = {
  id: string;
  semester: string;
  term: string | null;
  school_year: { id: string; code: string };
};

type ResolvedTermInstanceFilter = {
  where: { term_instance_id?: string | { in: string[] } };
  schoolYearLabel: string | null;
  instances: TermInstanceSummary[];
};

function buildTermInstanceWhere(
  programId: string,
  filters: Partial<Pick<AnalyticsFilterState, "termInstanceId" | "schoolYearId" | "semester">> = {}
): Record<string, unknown> {
  const where: Record<string, unknown> = {
    OR: [
      { central_deployments: { some: { program_id: programId } } },
      { course_bound_evaluations: { some: { course_assignment: { program_id: programId } } } },
    ],
  };
  if (filters.termInstanceId) where.id = filters.termInstanceId;
  if (filters.schoolYearId) where.school_year_id = filters.schoolYearId;
  if (filters.semester) where.semester = filters.semester as AcademicSemester;
  return where;
}

/** Sentinel term filter that matches no rows, used when a filter resolves to nothing. */
const IMPOSSIBLE_TERM_INSTANCE_ID = "00000000-0000-0000-0000-000000000000";

/** Response predicate scoped to the selected Program through both deployment kinds. */
function buildProgramResponseScope(programId: string, termInstanceWhere: Record<string, unknown>) {
  return {
    OR: [
      {
        deployment_type: "CENTRAL" as const,
        assignment: {
          central_deployment: {
            program_id: programId,
            ...termInstanceWhere,
          },
        },
      },
      {
        deployment_type: "COURSE_BOUND" as const,
        assignment: {
          course_bound: {
            course_assignment: { program_id: programId },
            ...termInstanceWhere,
          },
        },
      },
    ],
  };
}

/** EvaluationAssignment predicate scoped to the selected Program through both deployment kinds. */
function buildProgramOpportunityScope(programId: string, termInstanceWhere: Record<string, unknown>) {
  return {
    OR: [
      {
        central_deployment: {
          program_id: programId,
          ...termInstanceWhere,
        },
      },
      {
        course_bound: {
          course_assignment: { program_id: programId },
          ...termInstanceWhere,
        },
      },
    ],
  };
}

async function listMatchingTermInstances(
  programId: string,
  filters: Partial<Pick<AnalyticsFilterState, "termInstanceId" | "schoolYearId" | "semester">> = {}
): Promise<TermInstanceSummary[]> {
  return prisma.academicTermInstance.findMany({
    where: buildTermInstanceWhere(programId, filters),
    select: {
      id: true,
      semester: true,
      term: true,
      school_year: { select: { id: true, code: true } },
    },
  });
}

async function listProgramPeriodOptions(programId: string): Promise<TermInstanceSummary[]> {
  return listMatchingTermInstances(programId);
}


async function resolveSchoolYearLabel(
  schoolYearId: string | undefined,
  instances: TermInstanceSummary[]
): Promise<string | null> {
  if (!schoolYearId) return null;
  const codes = [...new Set(instances.map((instance) => instance.school_year.code))];
  if (codes.length === 1) return codes[0];

  const schoolYear = await prisma.schoolYear.findUnique({
    where: { id: schoolYearId },
    select: { code: true },
  });
  return schoolYear?.code ?? null;
}

async function resolveTermInstanceFilter(
  programId: string,
  filters: AnalyticsFilterState
): Promise<ResolvedTermInstanceFilter> {
  if (!filters.termInstanceId && !filters.schoolYearId && !filters.semester) {
    return { where: {}, schoolYearLabel: null, instances: [] };
  }

  const instances = await listMatchingTermInstances(programId, filters);
  const schoolYearLabel = await resolveSchoolYearLabel(filters.schoolYearId, instances);
  const resolvedSchoolYearLabel =
    schoolYearLabel ?? (filters.schoolYearId ? instances[0]?.school_year.code ?? null : null);

  if (instances.length === 0) {
    return {
      where: { term_instance_id: IMPOSSIBLE_TERM_INSTANCE_ID },
      schoolYearLabel: resolvedSchoolYearLabel,
      instances,
    };
  }

  return {
    where: { term_instance_id: { in: instances.map((instance) => instance.id) } },
    schoolYearLabel: resolvedSchoolYearLabel,
    instances,
  };
}

const SEMESTER_LABELS: Record<string, string> = {
  FIRST: "1st Semester",
  SECOND: "2nd Semester",
  SUMMER: "Summer",
};

const TERM_LABELS: Record<string, string> = {
  FIRST_TERM: "1st Term",
  SECOND_TERM: "2nd Term",
};

function buildPeriodOptions(instances: TermInstanceSummary[]) {
  const schoolYears = new Map<string, string>();
  const semesters = new Map<string, string>();
  for (const instance of instances) {
    schoolYears.set(instance.school_year.id, instance.school_year.code);
    semesters.set(instance.semester, SEMESTER_LABELS[instance.semester] ?? instance.semester);
  }

  return {
    schoolYears: [...schoolYears].map(([id, label]) => ({ id, label })),
    semesters: [...semesters].map(([value, label]) => ({ value, label })),
    termInstances: instances.map((instance) => {
      return {
        id: instance.id,
        schoolYearId: instance.school_year.id,
        schoolYearLabel: instance.school_year.code,
        semester: instance.semester,
        semesterLabel: SEMESTER_LABELS[instance.semester] ?? instance.semester,
        termLabel: instance.term ? TERM_LABELS[instance.term] ?? instance.term : null,
        label: buildInstancePeriodLabel(instance),
      };
    }),
  };
}

function buildPeriodLabel(
  filters: AnalyticsFilterState,
  schoolYearLabel: string | null,
  hasMatchingTerm: boolean
): string | null {
  const parts: string[] = [];
  if (schoolYearLabel) parts.push(`School Year ${schoolYearLabel}`);
  if (filters.semester) parts.push(SEMESTER_LABELS[filters.semester] ?? filters.semester);
  if (filters.termInstanceId && hasMatchingTerm) parts.push("Selected period");
  if (parts.length === 0) return null;
  return parts.join(" · ");
}

/** Readable label for one canonical AcademicTermInstance. */
function buildInstancePeriodLabel(instance: TermInstanceSummary): string {
  const semesterLabel = SEMESTER_LABELS[instance.semester] ?? instance.semester;
  const termLabel = instance.term ? TERM_LABELS[instance.term] ?? instance.term : null;
  return [instance.school_year.code, semesterLabel, termLabel].filter(Boolean).join(" · ");
}

// ---------------------------------------------------------------------------
// Main service function
// ---------------------------------------------------------------------------

export async function getProgramHeadAnalytics(
  programId: string,
  filters: AnalyticsFilterState
): Promise<ProgramHeadOverviewDTO | null> {
  const contextResult = await resolveProgramHeadContext(programId);

  if (!contextResult.success) {
    return null;
  }

  const { selectedProgram } = contextResult.data;

  const [{ where: termInstanceWhere, schoolYearLabel }, periodInstances] = await Promise.all([
    resolveTermInstanceFilter(selectedProgram.id, filters),
    listProgramPeriodOptions(selectedProgram.id),
  ]);

  // Responses tied to this program via central deployments OR course-bound evaluations,
  // following the same scope predicate as the existing dashboard service.
  const programResponseScope = buildProgramResponseScope(selectedProgram.id, termInstanceWhere);

  // Every in-scope EvaluationAssignment is an evaluation opportunity,
  // regardless of response status.
  const programOpportunityScope = buildProgramOpportunityScope(selectedProgram.id, termInstanceWhere);

  const [submittedResponseCount, evaluationOpportunityCount, ratingAggregate] = await Promise.all([
    prisma.response.count({
      where: {
        status: ResponseStatus.SUBMITTED,
        ...programResponseScope,
      },
    }),
    prisma.evaluationAssignment.count({
      where: programOpportunityScope,
    }),
    prisma.quantitativeResponseItem.aggregate({
      _sum: { rating_value: true },
      _count: { rating_value: true },
      where: {
        response: {
          status: ResponseStatus.SUBMITTED,
          ...programResponseScope,
        },
      },
    }),
  ]);

  const ratingCount = ratingAggregate._count.rating_value;
  const ratingSum = ratingAggregate._sum.rating_value ?? 0;

  const kpi = buildProgramHeadOverviewKpi({
    submittedResponseCount,
    evaluationOpportunityCount,
    ratingCount,
    ratingSum,
  });

  const hasMatchingTerm = termInstanceWhere.term_instance_id !== IMPOSSIBLE_TERM_INSTANCE_ID;
  const periodLabel = buildPeriodLabel(filters, schoolYearLabel, hasMatchingTerm);
  const scope: ProgramHeadAnalyticsScopeSummary = {
    programCode: selectedProgram.code,
    programName: selectedProgram.name,
    periodLabel,
  };

  const emptyReason: OverviewEmptyReason =
    evaluationOpportunityCount === 0
      ? "no-assignments"
      : submittedResponseCount === 0
        ? "no-submissions"
        : null;

  return {
    scope,
    kpi,
    emptyReason,
    periodOptions: buildPeriodOptions(periodInstances),
  };
}

// ---------------------------------------------------------------------------
// Trends read
// ---------------------------------------------------------------------------

type TrendRatingRow = Prisma.QuantitativeResponseItemGetPayload<{
  select: {
    rating_value: true;
    response_id: true;
    cilo_question_binding: {
      select: {
        cilo: {
          select: {
            cilo_mappings: {
              select: { go: { select: { code: true } } };
            };
          };
        };
      };
    };
    response: {
      select: {
        assignment: {
          select: {
            course_bound: {
              select: { term_instance_id: true; instrument_version_id: true };
            };
            central_deployment: {
              select: { term_instance_id: true; instrument_version_id: true };
            };
          };
        };
      };
    };
  };
}>;

type TrendResponseRow = Prisma.ResponseGetPayload<{
  select: {
    id: true;
    assignment: {
      select: {
        course_bound: { select: { term_instance_id: true } };
        central_deployment: { select: { term_instance_id: true } };
      };
    };
  };
}>;

type PeriodEvidence = {
  ratingSum: number;
  ratingCount: number;
  responseIds: Set<string>;
  instrumentVersionIds: Set<string>;
  outcomeCodes: Set<string>;
};

function ratingRowTermContext(row: TrendRatingRow): {
  termInstanceId: string | null;
  instrumentVersionId: string | null;
} {
  const courseBound = row.response.assignment.course_bound;
  const central = row.response.assignment.central_deployment;
  return {
    termInstanceId: courseBound?.term_instance_id ?? central?.term_instance_id ?? null,
    instrumentVersionId:
      courseBound?.instrument_version_id ?? central?.instrument_version_id ?? null,
  };
}

function getOrCreateTrendEvidence(
  periodEvidence: Map<string, PeriodEvidence>,
  termInstanceId: string
): PeriodEvidence {
  let evidence = periodEvidence.get(termInstanceId);
  if (!evidence) {
    evidence = {
      ratingSum: 0,
      ratingCount: 0,
      responseIds: new Set(),
      instrumentVersionIds: new Set(),
      outcomeCodes: new Set(),
    };
    periodEvidence.set(termInstanceId, evidence);
  }
  return evidence;
}

function collectTrendPeriodEvidence(
  ratingRows: TrendRatingRow[],
  responseRows: TrendResponseRow[]
): Map<string, PeriodEvidence> {
  const periodEvidence = new Map<string, PeriodEvidence>();

  for (const row of ratingRows) {
    accumulateRatingRow(periodEvidence, row);
  }
  for (const row of responseRows) {
    accumulateResponseRow(periodEvidence, row);
  }

  return periodEvidence;
}

function accumulateRatingRow(
  periodEvidence: Map<string, PeriodEvidence>,
  row: TrendRatingRow
): void {
  const context = ratingRowTermContext(row);
  if (!context.termInstanceId) {
    return;
  }

  const evidence = getOrCreateTrendEvidence(periodEvidence, context.termInstanceId);
  evidence.ratingSum += row.rating_value;
  evidence.ratingCount += 1;
  evidence.responseIds.add(row.response_id);
  if (context.instrumentVersionId) {
    evidence.instrumentVersionIds.add(context.instrumentVersionId);
  }
  for (const mapping of row.cilo_question_binding?.cilo?.cilo_mappings ?? []) {
    evidence.outcomeCodes.add(mapping.go.code);
  }
}

function accumulateResponseRow(
  periodEvidence: Map<string, PeriodEvidence>,
  row: TrendResponseRow
): void {
  const termInstanceId =
    row.assignment.course_bound?.term_instance_id ??
    row.assignment.central_deployment?.term_instance_id;
  if (!termInstanceId) {
    return;
  }

  const evidence = getOrCreateTrendEvidence(periodEvidence, termInstanceId);
  evidence.responseIds.add(row.id);
}

function buildTrendSeriesInputs(
  periodEvidence: Map<string, PeriodEvidence>,
  instancesById: Map<string, TermInstanceSummary>,
  versionById: Map<
    string,
    { id: string; version_number: number; structure_snapshot: unknown; template: { name: string } }
  >
): TrendSeriesPeriodInput[] {
  const inputs: TrendSeriesPeriodInput[] = [];

  for (const [termInstanceId, evidence] of periodEvidence) {
    const instance = instancesById.get(termInstanceId);
    if (!instance) continue;

    const versionLabels: string[] = [];
    const scales: ScaleDescriptor[][] = [];
    for (const versionId of evidence.instrumentVersionIds) {
      const version = versionById.get(versionId);
      if (!version) continue;
      versionLabels.push(`${version.template.name} v${version.version_number}`);
      scales.push(...extractDistinctScales(version.structure_snapshot));
    }

    const instrumentVersionsSorted = [...new Set(versionLabels)].sort();
    const scaleIdentities = buildScaleIdentities(scales);
    const outcomeCodes = [...evidence.outcomeCodes].sort();

    inputs.push({
      termInstanceId,
      periodLabel: buildInstancePeriodLabel(instance),
      sortKey: [
        instance.school_year.code,
        semesterOrder(instance.semester),
        termOrder(instance.term),
      ],
      meanRating: evidence.ratingCount === 0 ? null : evidence.ratingSum / evidence.ratingCount,
      submittedResponseCount: evidence.responseIds.size,
      ratingCount: evidence.ratingCount,
      instrumentContext:
        instrumentVersionsSorted.length > 0 ? instrumentVersionsSorted.join(", ") : null,
      scaleContext: describeScales(scales),
      outcomeCodes,
      fingerprint: {
        instrumentVersions: instrumentVersionsSorted,
        scaleIdentities,
        outcomeCodes,
      },
    });
  }

  return inputs;
}

/**
 * Authorized Trends read for the selected Program. Periods resolve through
 * canonical `AcademicTermInstance` context; evidence is SUBMITTED-only and
 * scoped to the selected Program through central deployments and course-bound
 * evaluations. Retired or inactive catalog records remain queryable because no
 * activity filter is applied. Returns null for unauthorized or malformed
 * Program requests.
 */
export async function getProgramHeadTrends(
  programId: string,
  filters: AnalyticsFilterState
): Promise<ProgramHeadTrendsDTO | null> {
  const contextResult = await resolveProgramHeadContext(programId);

  if (!contextResult.success) {
    return null;
  }

  const { selectedProgram } = contextResult.data;

  const [{ where: termInstanceWhere, schoolYearLabel }, periodInstances] = await Promise.all([
    resolveTermInstanceFilter(selectedProgram.id, filters),
    listProgramPeriodOptions(selectedProgram.id),
  ]);

  const programResponseScope = buildProgramResponseScope(selectedProgram.id, termInstanceWhere);

  const [ratingRows, responseRows] = await Promise.all([
    prisma.quantitativeResponseItem.findMany({
      where: { response: { status: ResponseStatus.SUBMITTED, ...programResponseScope } },
      select: {
        rating_value: true,
        response_id: true,
        cilo_question_binding: {
          select: {
            cilo: {
              select: {
                cilo_mappings: {
                  where: { go: { program_id: selectedProgram.id } },
                  select: { go: { select: { code: true } } },
                },
              },
            },
          },
        },
        response: {
          select: {
            assignment: {
              select: {
                course_bound: {
                  select: { term_instance_id: true, instrument_version_id: true },
                },
                central_deployment: {
                  select: { term_instance_id: true, instrument_version_id: true },
                },
              },
            },
          },
        },
      },
    }),
    prisma.response.findMany({
      where: { status: ResponseStatus.SUBMITTED, ...programResponseScope },
      select: {
        id: true,
        assignment: {
          select: {
            course_bound: { select: { term_instance_id: true } },
            central_deployment: { select: { term_instance_id: true } },
          },
        },
      },
    }),
  ]);

  const instancesById = new Map(periodInstances.map((instance) => [instance.id, instance]));
  const periodEvidence = collectTrendPeriodEvidence(ratingRows, responseRows);

  const instrumentVersionIds = [
    ...new Set(
      [...periodEvidence.values()].flatMap((evidence) => [...evidence.instrumentVersionIds])
    ),
  ];
  const instrumentVersions =
    instrumentVersionIds.length > 0
      ? await prisma.instrumentVersion.findMany({
          where: { id: { in: instrumentVersionIds } },
          select: {
            id: true,
            version_number: true,
            structure_snapshot: true,
            template: { select: { name: true } },
          },
        })
      : [];
  const versionById = new Map(instrumentVersions.map((version) => [version.id, version]));

  const inputs = buildTrendSeriesInputs(periodEvidence, instancesById, versionById);

  const { periods, breaks, emptyReason } = buildTrendSeries(inputs);

  const hasMatchingTerm = termInstanceWhere.term_instance_id !== IMPOSSIBLE_TERM_INSTANCE_ID;
  const scope: ProgramHeadAnalyticsScopeSummary = {
    programCode: selectedProgram.code,
    programName: selectedProgram.name,
    periodLabel: buildPeriodLabel(filters, schoolYearLabel, hasMatchingTerm),
  };

  return {
    scope,
    periods,
    breaks,
    emptyReason,
    periodOptions: buildPeriodOptions(periodInstances),
  };
}
