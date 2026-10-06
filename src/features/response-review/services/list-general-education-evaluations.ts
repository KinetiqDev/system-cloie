import type { DeploymentStatus, Prisma, StudentSection, YearLevel } from "@prisma/client";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import {
  buildInstancePeriodLabel,
  toPeriodOption,
  type TermInstanceSummary,
} from "@/features/analytics/services/academic-periods";
import {
  describeScales,
  extractDistinctScales,
} from "@/features/analytics/aggregators/scale-identity";
import type { ProgramHeadAnalyticsPeriodOptions } from "@/features/analytics/program-head-analytics-types";
import { ROLES } from "@/lib/constants/roles";
import { DEFAULT_TABLE_PAGE_SIZE } from "@/lib/constants/page-sizes";
import { prisma } from "@/lib/db/prisma";
import { comparableRatingMean } from "@/features/analytics/services/comparable-rating-mean";
import {
  generalEducationCourseAssignmentWhere,
  generalEducationCourseEvaluationWhere,
} from "./general-education-evidence-scope";
import type { GeneralEducationResponsesFilterState } from "./general-education-responses-state";

// ---------------------------------------------------------------------------
// General Education evaluation list for Coordinator review (ADR 0034)
//
// Read-only evidence navigation: which General Education course evaluations
// exist, how much of each roster responded, and the rating mean. It carries no
// respondent identity, so it stays outside the identified review boundary.
// Scope is General Education Course-bound only — no Program filter and no
// Central deployments.
// ---------------------------------------------------------------------------

type GeneralEducationEvaluationRow = {
  id: string;
  title: string;
  period: string;
  status: DeploymentStatus;
  assigned: number;
  submitted: number;
  mean: number | null;
  scaleLabel: string | null;
  course: { id: string; code: string; title: string; major: string | null };
  /** Class-context Program label shown in the class cell. */
  program: string | null;
  faculty: string;
  yearLevel: YearLevel;
  section: StudentSection;
};

export type GeneralEducationEvaluationFilterOptions = {
  periodOptions: ProgramHeadAnalyticsPeriodOptions;
  courses: Array<{ id: string; label: string }>;
  /** Class-context Programs with General Education classes in any period. */
  programs: Array<{ id: string; label: string }>;
  faculty: Array<{ id: string; label: string }>;
  ilos: Array<{ id: string; label: string }>;
};

export type GeneralEducationEvaluationList = {
  items: GeneralEducationEvaluationRow[];
  total: number;
  page: number;
  pageSize: number;
  options: GeneralEducationEvaluationFilterOptions;
};

type ResponseStats = { assigned: number; submitted: number; mean: number | null };
const EMPTY_RESPONSE_STATS: ResponseStats = { assigned: 0, submitted: 0, mean: null };
type ScopedRatingRow = {
  rating_value: number;
  section_key: string;
  item_key: string;
};

function cleanSearch(value: string | undefined): string | undefined {
  const cleaned = value
    ?.trim()
    .slice(0, 100)
    .replace(/[\\%_]/g, "");
  return cleaned || undefined;
}

function termInstanceWhere(
  filters: GeneralEducationResponsesFilterState
): Prisma.AcademicTermInstanceWhereInput {
  if (filters.termInstanceId) return { id: filters.termInstanceId };
  return {
    ...(filters.schoolYearId ? { school_year_id: filters.schoolYearId } : {}),
    ...(filters.semester ? { semester: filters.semester } : {}),
  };
}

function assignmentFilterWhere(
  filters: GeneralEducationResponsesFilterState
): Prisma.CourseAssignmentWhereInput {
  return {
    ...(filters.courseId ? { course_id: filters.courseId } : {}),
    ...(filters.facultyId ? { faculty_id: filters.facultyId } : {}),
    ...(filters.programId ? { program_id: filters.programId } : {}),
    ...(filters.yearLevel ? { year_level: filters.yearLevel } : {}),
    ...(filters.section ? { section: filters.section } : {}),
    course: {
      course_scope: "GENERAL_EDUCATION",
      ...(filters.iloId ? { cilos: { some: iloCiloWhere(filters.iloId) } } : {}),
    },
  };
}

/**
 * ILO facet: evaluations whose Course has an active CILO currently mapped to
 * the selected ILO. Manifestation is descriptive, so it never narrows the
 * facet — a mapping with no recorded classification still counts as
 * alignment. Only current mappings are considered, so re-pointing a CILO at a
 * different ILO moves the evaluation between facets; that limitation is
 * disclosed on the review surface.
 */
function iloCiloWhere(iloId: string): Prisma.CILOWhereInput {
  return {
    is_active: true,
    cilo_institutional_outcome_mappings: { some: { institutional_outcome_id: iloId } },
  };
}

function searchClause(q: string | undefined): Prisma.CourseBoundEvaluationWhereInput["OR"] {
  if (!q) return undefined;
  return [
    { deployment_name: { contains: q, mode: "insensitive" } },
    { instrument: { template: { name: { contains: q, mode: "insensitive" } } } },
    { course_assignment: { course: { code: { contains: q, mode: "insensitive" } } } },
    { course_assignment: { course: { title: { contains: q, mode: "insensitive" } } } },
    { course_assignment: { faculty: { name: { contains: q, mode: "insensitive" } } } },
  ];
}

/**
 * Response progress against the evaluation's real opportunities. Every
 * assignment row is one opportunity, so "no responses" is an empty roster
 * rather than a 0-of-0 comparison that would otherwise read as complete.
 */
function completionWhere(
  completion: GeneralEducationResponsesFilterState["completion"]
): Record<string, unknown> | undefined {
  if (!completion) return undefined;
  const submitted = { response: { is: { status: "SUBMITTED" as const } } };
  const notSubmitted = { NOT: submitted };
  if (completion === "zero") return { assignments: { none: submitted } };
  if (completion === "complete") {
    return {
      AND: [
        { assignments: { some: submitted } },
        { assignments: { every: submitted } },
        { assignments: { some: {} } },
      ],
    };
  }
  return { AND: [{ assignments: { some: submitted } }, { assignments: { some: notSubmitted } }] };
}

/**
 * Drafts are unpublished, so they never enter Coordinator review. The
 * restriction holds beside a chosen status facet instead of being replaced by
 * it, so a crafted `status=DRAFT` resolves to no rows rather than to the draft
 * evaluations this list exists to keep out of review.
 */
function reviewableStatusWhere(
  status: GeneralEducationResponsesFilterState["status"]
): Prisma.CourseBoundEvaluationWhereInput {
  return { NOT: { status: "DRAFT" }, ...(status ? { status } : {}) };
}

function courseEvaluationWhere(
  filters: GeneralEducationResponsesFilterState
): Prisma.CourseBoundEvaluationWhereInput {
  const search = searchClause(cleanSearch(filters.q));
  const completion = completionWhere(filters.completion);
  return {
    ...generalEducationCourseEvaluationWhere(),
    ...reviewableStatusWhere(filters.status),
    term_instance: termInstanceWhere(filters),
    course_assignment: assignmentFilterWhere(filters),
    ...(search ? { OR: search } : {}),
    ...(completion ?? {}),
  };
}

// Participation needs every assignment row as denominator, while ratings must
// come from submitted bodies only. Two reads keep IN_PROGRESS answers
// unfetched instead of selecting them and filtering in memory.
async function getResponseStats(
  ids: string[],
  snapshotsByEvaluation: Map<string, unknown>
): Promise<Map<string, ResponseStats>> {
  const collected = new Map<
    string,
    { assigned: number; submitted: number; ratings: ScopedRatingRow[] }
  >();
  if (ids.length === 0) {
    return new Map();
  }

  const [assignmentRows, submittedRatingRows] = await Promise.all([
    prisma.evaluationAssignment.findMany({
      where: { course_bound_id: { in: ids } },
      select: { course_bound_id: true, response: { select: { status: true } } },
    }),
    prisma.quantitativeResponseItem.findMany({
      where: {
        response: {
          status: "SUBMITTED",
          deployment_type: "COURSE_BOUND",
          assignment: { course_bound_id: { in: ids } },
        },
      },
      select: {
        rating_value: true,
        section_key: true,
        item_key: true,
        response: { select: { assignment: { select: { course_bound_id: true } } } },
      },
    }),
  ]);

  for (const row of assignmentRows) {
    const id = row.course_bound_id;
    if (!id) continue;
    const current = collected.get(id) ?? { assigned: 0, submitted: 0, ratings: [] };
    current.assigned += 1;
    if (row.response?.status === "SUBMITTED") current.submitted += 1;
    collected.set(id, current);
  }

  for (const row of submittedRatingRows) {
    const id = row.response.assignment.course_bound_id;
    if (!id) continue;
    collected.get(id)?.ratings.push(row);
  }

  return new Map(
    [...collected].map(([id, value]) => [
      id,
      {
        assigned: value.assigned,
        submitted: value.submitted,
        mean: comparableRatingMean(value.ratings, snapshotsByEvaluation.get(id)),
      },
    ])
  );
}

async function loadFilterOptions(): Promise<GeneralEducationEvaluationFilterOptions> {
  const [periods, courses, faculty, programs, ilos] = await Promise.all([
    prisma.academicTermInstance.findMany({
      where: {
        course_bound_evaluations: {
          some: { course_assignment: generalEducationCourseAssignmentWhere() },
        },
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
        course_scope: "GENERAL_EDUCATION",
        course_assignments: { some: { course_bound_evaluations: { some: {} } } },
      },
      select: { id: true, code: true, title: true },
      orderBy: { code: "asc" },
    }),
    prisma.user.findMany({
      where: {
        course_assignments: {
          some: {
            course: { course_scope: "GENERAL_EDUCATION" },
            course_bound_evaluations: { some: {} },
          },
        },
      },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    // Class-context Programs only: the Programs whose General Education
    // classes actually produced reviewable evidence. This is a filter on the
    // assignment's Program, never on a respondent's Program.
    prisma.program.findMany({
      where: {
        course_assignments: {
          some: {
            course: { course_scope: "GENERAL_EDUCATION" },
            course_bound_evaluations: { some: {} },
          },
        },
      },
      select: { id: true, code: true, name: true },
      orderBy: { code: "asc" },
    }),
    // The reachable ILO set, matching the facet exactly: an ILO some active
    // General Education CILO currently maps to. Manifestation never narrows
    // this — a mapping with no classification still makes the ILO selectable.
    prisma.institutionalOutcome.findMany({
      where: {
        cilo_mappings: {
          some: { cilo: { is_active: true, course: { course_scope: "GENERAL_EDUCATION" } } },
        },
      },
      select: { id: true, code: true, description: true },
      orderBy: [{ order: "asc" }, { code: "asc" }],
    }),
  ]);

  return {
    periodOptions: {
      schoolYears: [],
      semesters: [],
      termInstances: periods.map((period: TermInstanceSummary) => toPeriodOption(period)),
    },
    courses: courses.map((course) => ({
      id: course.id,
      label: `${course.code} · ${course.title}`,
    })),
    programs: programs.map((program) => ({
      id: program.id,
      label: `${program.code} · ${program.name}`,
    })),
    faculty: faculty.map((person) => ({ id: person.id, label: person.name })),
    ilos: ilos.map((ilo) => ({ id: ilo.id, label: `${ilo.code} — ${ilo.description}` })),
  };
}

/**
 * General Education course evaluations with participation and mean ratings.
 * Returns null for unauthenticated callers and any non-Coordinator role, so a
 * Program Head or Dean never reaches another role's read model.
 */
export async function listGeneralEducationEvaluations(
  filters: GeneralEducationResponsesFilterState
): Promise<GeneralEducationEvaluationList | null> {
  const session = await resolveAuthSession();
  if (!session || session.activeRole !== ROLES.GEN_ED_COORDINATOR) {
    return null;
  }

  const where = courseEvaluationWhere(filters);
  const [options, total, rows] = await Promise.all([
    loadFilterOptions(),
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
            program: { select: { code: true, name: true } },
          },
        },
      },
    }),
  ]);

  const stats = await getResponseStats(
    rows.map((row) => row.id),
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
        title: row.deployment_name ?? row.instrument.template.name,
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
        program: row.course_assignment.program
          ? `${row.course_assignment.program.code} · ${row.course_assignment.program.name}`
          : null,
        faculty: row.course_assignment.faculty.name,
        yearLevel: row.course_assignment.year_level,
        section: row.course_assignment.section,
      };
    }),
  };
}
