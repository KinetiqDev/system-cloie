import type { Prisma, DeploymentStatus, StudentSection, TargetStakeholder, YearLevel } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { DEFAULT_TABLE_PAGE_SIZE } from "@/lib/constants/page-sizes";
import type { ProgramHeadAnalyticsPeriodOptions } from "../program-head-analytics-types";
import { mean } from "./shared";
import type { ProgramHeadResponsesFilterState } from "./program-head-responses-state";

const SEMESTER_LABELS: Record<string, string> = { FIRST: "1st Semester", SECOND: "2nd Semester", SUMMER: "Summer" };
const TERM_LABELS: Record<string, string> = { FIRST_TERM: "1st Term", SECOND_TERM: "2nd Term" };

type ResponseStats = { assigned: number; submitted: number; mean: number | null };
type ResponseDeploymentRow = {
  id: string;
  title: string;
  period: string;
  status: DeploymentStatus;
  assigned: number;
  submitted: number;
  mean: number | null;
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
export type ResponseDeploymentList = { items: ResponseDeploymentRow[]; total: number; page: number; pageSize: number; options: ResponseFilterOptions };

function cleanSearch(value: string | undefined): string | undefined {
  const cleaned = value?.trim().slice(0, 100).replace(/[\\%_]/g, "");
  return cleaned || undefined;
}

function termInstanceWhere(filters: ProgramHeadResponsesFilterState): Prisma.AcademicTermInstanceWhereInput {
  return {
    ...(filters.schoolYearId ? { school_year_id: filters.schoolYearId } : {}),
    ...(filters.semester ? { semester: filters.semester } : {}),
    ...(filters.termInstanceId ? { id: filters.termInstanceId } : {}),
  };
}

function completionWhere(completion: ProgramHeadResponsesFilterState["completion"]): Record<string, unknown> | undefined {
  if (!completion) return undefined;
  const submitted = { response: { is: { status: "SUBMITTED" as const } } };
  const notSubmitted = { NOT: submitted };
  if (completion === "zero") return { assignments: { none: submitted } };
  if (completion === "complete") return { AND: [{ assignments: { some: submitted } }, { assignments: { every: submitted } }] };
  return { AND: [{ assignments: { some: submitted } }, { assignments: { some: notSubmitted } }] };
}


// fallow-ignore-next-line complexity
function courseEvaluationWhere(programId: string, filters: ProgramHeadResponsesFilterState): Prisma.CourseBoundEvaluationWhereInput {
  const q = cleanSearch(filters.q);
  const assignment: Prisma.CourseAssignmentWhereInput = {
    program_id: programId,
    ...(filters.courseId ? { course_id: filters.courseId } : {}),
    ...(filters.facultyId ? { faculty_id: filters.facultyId } : {}),
    ...(filters.majorId ? { course: { major_id: filters.majorId } } : {}),
    ...(filters.yearLevel ? { year_level: filters.yearLevel } : {}),
    ...(filters.section ? { section: filters.section } : {}),
  };
  const search: Prisma.CourseBoundEvaluationWhereInput["OR"] = q ? [
    { deployment_name: { contains: q, mode: "insensitive" } },
    { instrument: { template: { name: { contains: q, mode: "insensitive" } } } },
    { course_assignment: { course: { code: { contains: q, mode: "insensitive" } } } },
    { course_assignment: { course: { title: { contains: q, mode: "insensitive" } } } },
    { course_assignment: { faculty: { name: { contains: q, mode: "insensitive" } } } },
  ] : undefined;
  const completion = completionWhere(filters.completion);
  return {
    status: filters.status ?? { not: "DRAFT" },
    term_instance: termInstanceWhere(filters),
    course_assignment: assignment,
    ...(search ? { OR: search } : {}),
    ...(completion ?? {}),
  };
}

function centralDeploymentWhere(programId: string, filters: ProgramHeadResponsesFilterState): Prisma.CentralDeploymentWhereInput {
  const q = cleanSearch(filters.q);
  const search: Prisma.CentralDeploymentWhereInput["OR"] = q ? [
    { deployment_name: { contains: q, mode: "insensitive" } },
    { instrument: { template: { name: { contains: q, mode: "insensitive" } } } },
  ] : undefined;
  const completion = completionWhere(filters.completion);
  return {
    program_id: programId,
    status: filters.status ?? { not: "DRAFT" },
    term_instance: termInstanceWhere(filters),
    ...(filters.stakeholder ? { target_stakeholder: filters.stakeholder } : {}),
    ...(filters.majorId ? { major_id: filters.majorId } : {}),
    ...(filters.yearLevel ? { year_level: filters.yearLevel } : {}),
    ...(filters.instrumentTemplateId ? { instrument: { template_id: filters.instrumentTemplateId } } : {}),
    ...(search ? { OR: search } : {}),
    ...(completion ?? {}),
  };
}

function periodLabel(instance: { school_year: { code: string }; semester: string; term: string | null }): string {
  return [instance.school_year.code, SEMESTER_LABELS[instance.semester] ?? instance.semester, instance.term ? TERM_LABELS[instance.term] ?? instance.term : null].filter(Boolean).join(" · ");
}

async function getResponseStats(ids: string[], kind: "course_bound_id" | "central_deployment_id"): Promise<Map<string, ResponseStats>> {
  const rows = ids.length === 0 ? [] : await prisma.evaluationAssignment.findMany({
    where: kind === "course_bound_id" ? { course_bound_id: { in: ids } } : { central_deployment_id: { in: ids } },
    select: { course_bound_id: true, central_deployment_id: true, response: { select: { status: true, quant_items: { select: { rating_value: true } } } } },
  });
  const collected = new Map<string, { assigned: number; submitted: number; ratings: number[] }>();
  for (const row of rows) {
    const id = kind === "course_bound_id" ? row.course_bound_id : row.central_deployment_id;
    if (!id) continue;
    const current = collected.get(id) ?? { assigned: 0, submitted: 0, ratings: [] };
    current.assigned += 1;
    if (row.response?.status === "SUBMITTED") {
      current.submitted += 1;
      current.ratings.push(...row.response.quant_items.map((item) => item.rating_value));
    }
    collected.set(id, current);
  }
  return new Map([...collected].map(([id, value]) => [id, { assigned: value.assigned, submitted: value.submitted, mean: mean(value.ratings) }]));
}

async function loadFilterOptions(programId: string): Promise<ResponseFilterOptions> {
  const [periods, courses, faculty, majors, instruments] = await Promise.all([
    prisma.academicTermInstance.findMany({
      where: { OR: [{ central_deployments: { some: { program_id: programId } } }, { course_bound_evaluations: { some: { course_assignment: { program_id: programId } } } }] },
      select: { id: true, semester: true, term: true, school_year: { select: { id: true, code: true } } },
      orderBy: [{ school_year: { code: "desc" } }, { semester: "asc" }],
    }),
    prisma.course.findMany({ where: { course_assignments: { some: { program_id: programId, course_bound_evaluations: { some: {} } } } }, select: { id: true, code: true, title: true }, orderBy: { code: "asc" } }),
    prisma.user.findMany({ where: { course_assignments: { some: { program_id: programId, course_bound_evaluations: { some: {} } } } }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.major.findMany({ where: { program_id: programId, is_active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.instrumentTemplate.findMany({ where: { versions: { some: { central_insts: { some: { program_id: programId } } } } }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  const schoolYears = new Map<string, string>();
  const semesterValues = new Set<string>();
  for (const period of periods) { schoolYears.set(period.school_year.id, period.school_year.code); semesterValues.add(period.semester); }
  return {
    periodOptions: {
      schoolYears: [...schoolYears].map(([id, label]) => ({ id, label })),
      semesters: [...semesterValues].map((value) => ({ value, label: SEMESTER_LABELS[value] ?? value })),
      termInstances: periods.map((period) => ({ id: period.id, schoolYearId: period.school_year.id, schoolYearLabel: period.school_year.code, semester: period.semester, semesterLabel: SEMESTER_LABELS[period.semester] ?? period.semester, termLabel: period.term ? TERM_LABELS[period.term] ?? period.term : null, label: periodLabel(period) })),
    },
    courses: courses.map((course) => ({ id: course.id, label: `${course.code} · ${course.title}` })),
    faculty: faculty.map((person) => ({ id: person.id, label: person.name })),
    majors: majors.map((major) => ({ id: major.id, label: major.name })),
    instruments: instruments.map((instrument) => ({ id: instrument.id, label: instrument.name })),
  };
}

export async function listProgramHeadResponseDeployments(programId: string, filters: ProgramHeadResponsesFilterState): Promise<ResponseDeploymentList> {
  const options = await loadFilterOptions(programId);
  if (filters.tab === "course") {
    const where = courseEvaluationWhere(programId, filters);
    const [total, rows] = await Promise.all([
      prisma.courseBoundEvaluation.count({ where }),
      prisma.courseBoundEvaluation.findMany({
        where, skip: (filters.page - 1) * DEFAULT_TABLE_PAGE_SIZE, take: DEFAULT_TABLE_PAGE_SIZE, orderBy: { published_at: "desc" },
        select: { id: true, deployment_name: true, status: true, instrument: { select: { template: { select: { name: true } } } }, term_instance: { select: { semester: true, term: true, school_year: { select: { code: true } } } }, course_assignment: { select: { year_level: true, section: true, course: { select: { id: true, code: true, title: true, major: { select: { name: true } } } }, faculty: { select: { name: true } } } } },
      }),
    ]);
    const stats = await getResponseStats(rows.map((row) => row.id), "course_bound_id");
    // fallow-ignore-next-line complexity -- row projection preserves class and response metrics.
    // fallow-ignore-next-line complexity
    return { total, page: filters.page, pageSize: DEFAULT_TABLE_PAGE_SIZE, options, items: rows.map((row) => { const value = stats.get(row.id); return { id: row.id, title: row.deployment_name ?? row.instrument.template.name, period: periodLabel(row.term_instance), status: row.status, assigned: value?.assigned ?? 0, submitted: value?.submitted ?? 0, mean: value?.mean ?? null, course: { id: row.course_assignment.course.id, code: row.course_assignment.course.code, title: row.course_assignment.course.title, major: row.course_assignment.course.major?.name ?? null }, faculty: row.course_assignment.faculty.name, yearLevel: row.course_assignment.year_level, section: row.course_assignment.section }; }) }; 
  }
  const where = centralDeploymentWhere(programId, filters);
  const [total, rows] = await Promise.all([
    prisma.centralDeployment.count({ where }),
    prisma.centralDeployment.findMany({
      where, skip: (filters.page - 1) * DEFAULT_TABLE_PAGE_SIZE, take: DEFAULT_TABLE_PAGE_SIZE, orderBy: { created_at: "desc" },
      select: { id: true, deployment_name: true, status: true, target_stakeholder: true, major: { select: { name: true } }, year_level: true, instrument: { select: { template: { select: { name: true } } } }, term_instance: { select: { semester: true, term: true, school_year: { select: { code: true } } } } },
    }),
  ]);
  const stats = await getResponseStats(rows.map((row) => row.id), "central_deployment_id");
  // fallow-ignore-next-line complexity
  return { total, page: filters.page, pageSize: DEFAULT_TABLE_PAGE_SIZE, options, items: rows.map((row) => { const value = stats.get(row.id); return { id: row.id, title: row.deployment_name ?? row.instrument.template.name, period: periodLabel(row.term_instance), status: row.status, assigned: value?.assigned ?? 0, submitted: value?.submitted ?? 0, mean: value?.mean ?? null, stakeholder: row.target_stakeholder, target: [row.major?.name, row.year_level?.replace("_", " ")].filter(Boolean).join(" · ") || "All eligible respondents" }; }) };
}

