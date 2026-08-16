import type { AcademicSemester } from "@prisma/client";
import { ResponseStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { resolveProgramHeadContext } from "@/features/auth/services/resolve-program-head-context";
import type { AnalyticsFilterState } from "./program-head-analytics-state";
import type {
  ProgramHeadAnalyticsScopeSummary,
  ProgramHeadOverviewDTO,
  ProgramHeadOverviewKPI,
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
      where: { term_instance_id: "00000000-0000-0000-0000-000000000000" },
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
      const semesterLabel = SEMESTER_LABELS[instance.semester] ?? instance.semester;
      const termLabel = instance.term ? TERM_LABELS[instance.term] ?? instance.term : null;
      return {
        id: instance.id,
        schoolYearId: instance.school_year.id,
        schoolYearLabel: instance.school_year.code,
        semester: instance.semester,
        semesterLabel,
        termLabel,
        label: [instance.school_year.code, semesterLabel, termLabel].filter(Boolean).join(" · "),
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
  const programResponseScope = {
    OR: [
      {
        deployment_type: "CENTRAL" as const,
        assignment: {
          central_deployment: {
            program_id: selectedProgram.id,
            ...termInstanceWhere,
          },
        },
      },
      {
        deployment_type: "COURSE_BOUND" as const,
        assignment: {
          course_bound: {
            course_assignment: { program_id: selectedProgram.id },
            ...termInstanceWhere,
          },
        },
      },
    ],
  };

  // Every in-scope EvaluationAssignment is an evaluation opportunity,
  // regardless of response status.
  const programOpportunityScope = {
    OR: [
      {
        central_deployment: {
          program_id: selectedProgram.id,
          ...termInstanceWhere,
        },
      },
      {
        course_bound: {
          course_assignment: { program_id: selectedProgram.id },
          ...termInstanceWhere,
        },
      },
    ],
  };

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

  const kpi: ProgramHeadOverviewKPI = {
    submittedResponseCount,
    evaluationOpportunityCount,
    responseRate:
      evaluationOpportunityCount === 0 ? null : submittedResponseCount / evaluationOpportunityCount,
    ratingCount,
    meanRating: ratingCount === 0 ? null : ratingSum / ratingCount,
  };

  const hasMatchingTerm =
    termInstanceWhere.term_instance_id !== "00000000-0000-0000-0000-000000000000";
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
