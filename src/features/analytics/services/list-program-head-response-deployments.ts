import type {
  Prisma,
  DeploymentStatus,
  StudentSection,
  TargetStakeholder,
  YearLevel,
} from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { DEFAULT_TABLE_PAGE_SIZE } from "@/lib/constants/page-sizes";
import type { ProgramHeadAnalyticsPeriodOptions } from "../program-head-analytics-types";
import { comparableRatingMean } from "./comparable-rating-mean";
import { describeScales, extractDistinctScales } from "../aggregators/scale-identity";
import { formatResponseYearLevel } from "@/features/response-review/components/response-review-labels";
import type { ProgramHeadResponsesFilterState } from "./program-head-responses-state";

import { buildInstancePeriodLabel, toPeriodOption } from "./academic-periods";

type ResponseStats = { assigned: number; submitted: number; mean: number | null };
const EMPTY_RESPONSE_STATS: ResponseStats = { assigned: 0, submitted: 0, mean: null };
type ScopedRatingRow = {
  rating_value: number;
  section_key: string;
  item_key: string;
};

function deploymentTitle(deploymentName: string | null, templateName: string): string {
  return deploymentName ?? templateName;
}

function centralTargetLabel(majorName: string | null, yearLevel: YearLevel | null): string {
  const parts = [majorName, yearLevel ? formatResponseYearLevel(yearLevel) : null].filter(Boolean);
  return parts.join(" · ") || "All eligible respondents";
}
type ResponseDeploymentRow = {
  id: string;
  title: string;
  period: string;
  status: DeploymentStatus;
  assigned: number;
  submitted: number;
  mean: number | null;
  scaleLabel: string | null;
  course?: { id: string; code: string; title: string; major: string | null };
  faculty?: string;
  yearLevel?: YearLevel;
  section?: StudentSection;
  stakeholder?: TargetStakeholder;
  target?: string;
};
export type ResponseFilterOptions = {
  periodOptions: ProgramHeadAnalyticsPeriodOptions;
  courses: Array<{ id: string; label: string }>;
  faculty: Array<{ id: string; label: string }>;
  majors: Array<{ id: string; label: string }>;
  instruments: Array<{ id: string; label: string }>;
};
export type ResponseDeploymentList = {
  items: ResponseDeploymentRow[];
  total: number;
  page: number;
  pageSize: number;
  options: ResponseFilterOptions;
};

function cleanSearch(value: string | undefined): string | undefined {
  const cleaned = value
    ?.trim()
    .slice(0, 100)
    .replace(/[\\%_]/g, "");
  return cleaned || undefined;
}

function termInstanceWhere(
  filters: ProgramHeadResponsesFilterState
): Prisma.AcademicTermInstanceWhereInput {
  if (filters.termInstanceId) return { id: filters.termInstanceId };
  return {
    ...(filters.schoolYearId ? { school_year_id: filters.schoolYearId } : {}),
    ...(filters.semester ? { semester: filters.semester } : {}),
  };
}

function completionWhere(
  completion: ProgramHeadResponsesFilterState["completion"]
): Record<string, unknown> | undefined {
  if (!completion) return undefined;
  const submitted = { response: { is: { status: "SUBMITTED" as const } } };
  const notSubmitted = { NOT: submitted };
  if (completion === "zero") return { assignments: { none: submitted } };
  if (completion === "complete")
    return { AND: [{ assignments: { some: submitted } }, { assignments: { every: submitted } }] };
  return { AND: [{ assignments: { some: submitted } }, { assignments: { some: notSubmitted } }] };
}

// fallow-ignore-next-line complexity
function courseEvaluationWhere(
  programId: string,
  filters: ProgramHeadResponsesFilterState
): Prisma.CourseBoundEvaluationWhereInput {
  const q = cleanSearch(filters.q);
  const assignment: Prisma.CourseAssignmentWhereInput = {
    program_id: programId,
    ...(filters.courseId ? { course_id: filters.courseId } : {}),
    ...(filters.facultyId ? { faculty_id: filters.facultyId } : {}),
    course: {
      course_scope: "PROGRAM_SPECIFIC",
      ...(filters.majorId ? { major_id: filters.majorId } : {}),
    },
    ...(filters.yearLevel ? { year_level: filters.yearLevel } : {}),
    ...(filters.section ? { section: filters.section } : {}),
  };
  const search: Prisma.CourseBoundEvaluationWhereInput["OR"] = q
    ? [
        { deployment_name: { contains: q, mode: "insensitive" } },
        { instrument: { template: { name: { contains: q, mode: "insensitive" } } } },
        { course_assignment: { course: { code: { contains: q, mode: "insensitive" } } } },
        { course_assignment: { course: { title: { contains: q, mode: "insensitive" } } } },
        { course_assignment: { faculty: { name: { contains: q, mode: "insensitive" } } } },
      ]
    : undefined;
  const completion = completionWhere(filters.completion);
  return {
    status: filters.status ?? { not: "DRAFT" },
    term_instance: termInstanceWhere(filters),
    course_assignment: assignment,
    ...(search ? { OR: search } : {}),
    ...(completion ?? {}),
  };
}

function centralDeploymentWhere(
  programId: string,
  filters: ProgramHeadResponsesFilterState
): Prisma.CentralDeploymentWhereInput {
  const q = cleanSearch(filters.q);
  const search: Prisma.CentralDeploymentWhereInput["OR"] = q
    ? [
        { deployment_name: { contains: q, mode: "insensitive" } },
        { instrument: { template: { name: { contains: q, mode: "insensitive" } } } },
      ]
    : undefined;
  const completion = completionWhere(filters.completion);
  return {
    program_id: programId,
    status: filters.status ?? { not: "DRAFT" },
    term_instance: termInstanceWhere(filters),
    ...(filters.stakeholder ? { target_stakeholder: filters.stakeholder } : {}),
    ...(filters.majorId ? { major_id: filters.majorId } : {}),
    ...(filters.yearLevel ? { year_level: filters.yearLevel } : {}),
    ...(filters.instrumentTemplateId
      ? { instrument: { template_id: filters.instrumentTemplateId } }
      : {}),
    ...(search ? { OR: search } : {}),
    ...(completion ?? {}),
  };
}
type ParticipationCounts = { assigned: number; submitted: number };

function participationScope(ids: string[], kind: "course_bound_id" | "central_deployment_id") {
  return kind === "course_bound_id"
    ? { course_bound_id: { in: ids } }
    : { central_deployment_id: { in: ids } };
}

function countParticipation(
  rows: Array<{
    course_bound_id: string | null;
    central_deployment_id: string | null;
    response: { status: string } | null;
  }>,
  kind: "course_bound_id" | "central_deployment_id",
  collected: Map<string, ParticipationCounts>
): void {
  for (const row of rows) {
    const id = kind === "course_bound_id" ? row.course_bound_id : row.central_deployment_id;
    if (!id) continue;
    const current = collected.get(id);
    if (!current) continue;
    current.assigned += 1;
    if (row.response?.status === "SUBMITTED") current.submitted += 1;
  }
}

function collectSubmittedRatings(
  rows: Array<{
    rating_value: number;
    section_key: string;
    item_key: string;
    response: {
      assignment: { course_bound_id: string | null; central_deployment_id: string | null };
    };
  }>,
  kind: "course_bound_id" | "central_deployment_id",
  collected: Map<string, ScopedRatingRow[]>
): void {
  for (const row of rows) {
    const id =
      kind === "course_bound_id"
        ? row.response.assignment.course_bound_id
        : row.response.assignment.central_deployment_id;
    if (!id) continue;
    collected.get(id)?.push(row);
  }
}

async function getResponseStats(
  ids: string[],
  kind: "course_bound_id" | "central_deployment_id",
  snapshotsByDeployment: Map<string, unknown>
): Promise<Map<string, ResponseStats>> {
  if (ids.length === 0) {
    return new Map();
  }

  const counts = new Map<string, ParticipationCounts>(
    ids.map((id) => [id, { assigned: 0, submitted: 0 }])
  );
  const ratings = new Map<string, ScopedRatingRow[]>(ids.map((id) => [id, []]));

  // Every assignment row is a participation opportunity; only a SUBMITTED
  // response contributes ratings, so answer bodies come from their own
  // submitted-only query and draft ratings are never read.
  const [participationRows, submittedRatingRows] = await Promise.all([
    prisma.evaluationAssignment.findMany({
      where: participationScope(ids, kind),
      select: {
        course_bound_id: true,
        central_deployment_id: true,
        response: { select: { status: true } },
      },
    }),
    prisma.quantitativeResponseItem.findMany({
      where: {
        response: {
          status: "SUBMITTED",
          deployment_type: kind === "course_bound_id" ? "COURSE_BOUND" : "CENTRAL",
          assignment: participationScope(ids, kind),
        },
      },
      select: {
        rating_value: true,
        section_key: true,
        item_key: true,
        response: {
          select: {
            assignment: {
              select: { course_bound_id: true, central_deployment_id: true },
            },
          },
        },
      },
    }),
  ]);

  countParticipation(participationRows, kind, counts);
  collectSubmittedRatings(submittedRatingRows, kind, ratings);

  return new Map(
    ids.map((id) => [
      id,
      {
        ...counts.get(id)!,
        mean: comparableRatingMean(ratings.get(id)!, snapshotsByDeployment.get(id)),
      },
    ])
  );
}

async function loadFilterOptions(programId: string): Promise<ResponseFilterOptions> {
  const [periods, courses, faculty, majors, instruments] = await Promise.all([
    prisma.academicTermInstance.findMany({
      where: {
        OR: [
          { central_deployments: { some: { program_id: programId } } },
          {
            course_bound_evaluations: {
              some: {
                course_assignment: {
                  program_id: programId,
                  course: { course_scope: "PROGRAM_SPECIFIC" },
                },
              },
            },
          },
        ],
      },
      select: {
        id: true,
        semester: true,
        term: true,
        school_year: { select: { id: true, code: true } },
      },
      orderBy: [{ school_year: { code: "desc" } }, { semester: "asc" }],
    }),
    prisma.course.findMany({
      where: {
        course_scope: "PROGRAM_SPECIFIC",
        course_assignments: {
          some: { program_id: programId, course_bound_evaluations: { some: {} } },
        },
      },
      select: { id: true, code: true, title: true },
      orderBy: { code: "asc" },
    }),
    prisma.user.findMany({
      where: {
        course_assignments: {
          some: {
            program_id: programId,
            course: { course_scope: "PROGRAM_SPECIFIC" },
            course_bound_evaluations: { some: {} },
          },
        },
      },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.major.findMany({
      where: { program_id: programId, is_active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.instrumentTemplate.findMany({
      where: { versions: { some: { central_insts: { some: { program_id: programId } } } } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);
  return {
    periodOptions: {
      schoolYears: [],
      semesters: [],
      termInstances: periods.map(toPeriodOption),
    },
    courses: courses.map((course) => ({
      id: course.id,
      label: `${course.code} · ${course.title}`,
    })),
    faculty: faculty.map((person) => ({ id: person.id, label: person.name })),
    majors: majors.map((major) => ({ id: major.id, label: major.name })),
    instruments: instruments.map((instrument) => ({ id: instrument.id, label: instrument.name })),
  };
}

export async function listProgramHeadResponseDeployments(
  programId: string,
  filters: ProgramHeadResponsesFilterState
): Promise<ResponseDeploymentList> {
  const options = await loadFilterOptions(programId);
  if (filters.tab === "course") {
    const where = courseEvaluationWhere(programId, filters);
    const [total, rows] = await Promise.all([
      prisma.courseBoundEvaluation.count({ where }),
      prisma.courseBoundEvaluation.findMany({
        where,
        skip: (filters.page - 1) * DEFAULT_TABLE_PAGE_SIZE,
        take: DEFAULT_TABLE_PAGE_SIZE,
        orderBy: { published_at: "desc" },
        select: {
          id: true,
          deployment_name: true,
          status: true,
          instrument: {
            select: { structure_snapshot: true, template: { select: { name: true } } },
          },
          term_instance: {
            select: { semester: true, term: true, school_year: { select: { code: true } } },
          },
          course_assignment: {
            select: {
              year_level: true,
              section: true,
              course: {
                select: { id: true, code: true, title: true, major: { select: { name: true } } },
              },
              faculty: { select: { name: true } },
            },
          },
        },
      }),
    ]);
    const stats = await getResponseStats(
      rows.map((row) => row.id),
      "course_bound_id",
      new Map(rows.map((row) => [row.id, row.instrument.structure_snapshot]))
    );
    // fallow-ignore-next-line complexity -- row projection preserves class and response metrics.
    return {
      total,
      page: filters.page,
      pageSize: DEFAULT_TABLE_PAGE_SIZE,
      options,
      items: rows.map((row) => {
        const value = stats.get(row.id) ?? EMPTY_RESPONSE_STATS;
        return {
          id: row.id,
          title: deploymentTitle(row.deployment_name, row.instrument.template.name),
          period: buildInstancePeriodLabel(row.term_instance),
          status: row.status,
          assigned: value.assigned,
          submitted: value.submitted,
          mean: value.mean,
          scaleLabel: describeScales(extractDistinctScales(row.instrument.structure_snapshot)),
          course: {
            id: row.course_assignment.course.id,
            code: row.course_assignment.course.code,
            title: row.course_assignment.course.title,
            major: row.course_assignment.course.major?.name ?? null,
          },
          faculty: row.course_assignment.faculty.name,
          yearLevel: row.course_assignment.year_level,
          section: row.course_assignment.section,
        };
      }),
    };
  }
  const where = centralDeploymentWhere(programId, filters);
  const [total, rows] = await Promise.all([
    prisma.centralDeployment.count({ where }),
    prisma.centralDeployment.findMany({
      where,
      skip: (filters.page - 1) * DEFAULT_TABLE_PAGE_SIZE,
      take: DEFAULT_TABLE_PAGE_SIZE,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        deployment_name: true,
        status: true,
        target_stakeholder: true,
        major: { select: { name: true } },
        year_level: true,
        instrument: { select: { structure_snapshot: true, template: { select: { name: true } } } },
        term_instance: {
          select: { semester: true, term: true, school_year: { select: { code: true } } },
        },
      },
    }),
  ]);
  const stats = await getResponseStats(
    rows.map((row) => row.id),
    "central_deployment_id",
    new Map(rows.map((row) => [row.id, row.instrument.structure_snapshot]))
  );
  return {
    total,
    page: filters.page,
    pageSize: DEFAULT_TABLE_PAGE_SIZE,
    options,
    items: rows.map((row) => {
      const value = stats.get(row.id) ?? EMPTY_RESPONSE_STATS;
      return {
        id: row.id,
        title: deploymentTitle(row.deployment_name, row.instrument.template.name),
        period: buildInstancePeriodLabel(row.term_instance),
        status: row.status,
        assigned: value.assigned,
        submitted: value.submitted,
        mean: value.mean,
        scaleLabel: describeScales(extractDistinctScales(row.instrument.structure_snapshot)),
        stakeholder: row.target_stakeholder,
        target: centralTargetLabel(row.major?.name ?? null, row.year_level),
      };
    }),
  };
}
