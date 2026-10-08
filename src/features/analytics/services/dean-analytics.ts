import { cache } from "react";
import { prisma } from "@/lib/db/prisma";
import { ROLES } from "@/lib/constants/roles";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { buildInstancePeriodLabel } from "./academic-periods";
import type { DeanAnalyticsFilters } from "./dean-analytics-state";

export async function requireDeanAnalytics() {
  const session = await resolveAuthSession();
  return session?.activeRole === ROLES.DEAN ? session : null;
}

export type DeanDeploymentEvidence = {
  id: string;
  name: string;
  programId: string | null;
  courseId: string | null;
  courseLabel: string | null;
  source: "COURSE" | "GENERAL_EDUCATION" | "STUDENT" | "ALUMNI" | "INDUSTRY_PARTNER";
  status: string;
  periodId: string;
  periodLabel: string;
  instrument: string;
  opportunities: number;
  submitted: number;
};
export function summarizeDeanParticipation(rows: readonly DeanDeploymentEvidence[]) {
  const opportunities = rows.reduce((sum, row) => sum + row.opportunities, 0);
  const submitted = rows.reduce((sum, row) => sum + row.submitted, 0);
  return {
    opportunities,
    submitted,
    rate: opportunities ? (submitted / opportunities) * 100 : null,
    deployments: rows.length,
    active: rows.filter((row) => row.status === "ACTIVE").length,
    closedIncomplete: rows.filter(
      (row) => row.status === "CLOSED" && row.submitted < row.opportunities
    ).length,
  };
}

const readCollegeEvidence = cache(async (termInstanceId?: string) => {
  const period = termInstanceId ? { term_instance_id: termInstanceId } : {};
  const [
    programs,
    periods,
    courses,
    central,
    counts,
    submitted,
    assignmentCoverage,
    unevaluatedCoverage,
  ] = await Promise.all([
    prisma.program.findMany({
      select: { id: true, code: true, name: true, is_active: true },
      orderBy: { code: "asc" },
    }),
    prisma.academicTermInstance.findMany({
      select: {
        id: true,
        semester: true,
        term: true,
        status: true,
        school_year: { select: { id: true, code: true } },
      },
      orderBy: [{ school_year: { code: "desc" } }, { start_date: "desc" }],
    }),
    prisma.courseBoundEvaluation.findMany({
      where: { ...period, status: { not: "DRAFT" } },
      select: {
        id: true,
        deployment_name: true,
        status: true,
        term_instance_id: true,
        instrument: { select: { version_number: true, template: { select: { name: true } } } },
        course_assignment: {
          select: {
            program_id: true,
            course: { select: { id: true, code: true, title: true, course_scope: true } },
          },
        },
      },
    }),
    prisma.centralDeployment.findMany({
      where: { ...period, status: { not: "DRAFT" } },
      select: {
        id: true,
        deployment_name: true,
        status: true,
        program_id: true,
        target_stakeholder: true,
        term_instance_id: true,
        instrument: { select: { version_number: true, template: { select: { name: true } } } },
      },
    }),
    prisma.evaluationAssignment.groupBy({
      by: ["course_bound_id", "central_deployment_id"],
      where: {
        OR: [
          { course_bound: { ...period, status: { not: "DRAFT" } } },
          { central_deployment: { ...period, status: { not: "DRAFT" } } },
        ],
      },
      _count: { _all: true },
    }),
    prisma.response.groupBy({
      by: ["deployment_id"],
      where: {
        status: "SUBMITTED",
        assignment: {
          OR: [
            { course_bound: { ...period, status: { not: "DRAFT" } } },
            { central_deployment: { ...period, status: { not: "DRAFT" } } },
          ],
        },
      },
      _count: { _all: true },
    }),
    prisma.courseAssignment.groupBy({
      by: ["program_id"],
      where: { ...period, is_active: true, course: { course_scope: "PROGRAM_SPECIFIC" } },
      _count: { _all: true },
    }),
    prisma.courseAssignment.groupBy({
      by: ["program_id"],
      where: {
        ...period,
        is_active: true,
        course: { course_scope: "PROGRAM_SPECIFIC" },
        course_bound_evaluations: { none: { status: { not: "DRAFT" } } },
      },
      _count: { _all: true },
    }),
  ]);
  const opportunityCounts = new Map(
    counts.map((row) => [row.course_bound_id ?? row.central_deployment_id, row._count._all])
  );
  const responseCounts = new Map(submitted.map((row) => [row.deployment_id, row._count._all]));
  const periodOptions = periods.map((row) => ({
    id: row.id,
    label: buildInstancePeriodLabel(row),
    status: row.status,
  }));
  const labels = new Map(periodOptions.map((row) => [row.id, row.label]));
  const evidence: DeanDeploymentEvidence[] = [
    ...courses.map((row) => ({
      id: row.id,
      name: row.deployment_name,
      programId: row.course_assignment.program_id,
      courseId: row.course_assignment.course.id,
      courseLabel: `${row.course_assignment.course.code} · ${row.course_assignment.course.title}`,
      source:
        row.course_assignment.course.course_scope === "GENERAL_EDUCATION"
          ? ("GENERAL_EDUCATION" as const)
          : ("COURSE" as const),
      ...deploymentSummary(row, labels, opportunityCounts, responseCounts),
    })),
    ...central.map((row) => ({
      id: row.id,
      name: row.deployment_name,
      programId: row.program_id,
      courseId: null,
      courseLabel: null,
      source: row.target_stakeholder,
      ...deploymentSummary(row, labels, opportunityCounts, responseCounts),
    })),
  ];
  return {
    programs,
    periods: periodOptions,
    evidence,
    invalidPeriod: !!termInstanceId && !labels.has(termInstanceId),
    assignmentCoverage: new Map(assignmentCoverage.map((row) => [row.program_id, row._count._all])),
    unevaluatedCoverage: new Map(
      unevaluatedCoverage.map((row) => [row.program_id, row._count._all])
    ),
  };
});

export async function getDeanCollegeAnalytics(filters: DeanAnalyticsFilters) {
  if (!(await requireDeanAnalytics())) return null;
  const data = await readCollegeEvidence(filters.termInstanceId);
  return {
    programs: data.programs,
    periods: data.periods,
    evidence: data.evidence,
    invalidPeriod: data.invalidPeriod,
    summary: summarizeDeanParticipation(data.evidence),
    programRows: data.programs.map((program) => ({
      ...program,
      courseAssignmentCount: data.assignmentCoverage.get(program.id) ?? 0,
      unevaluatedAssignmentCount: data.unevaluatedCoverage.get(program.id) ?? 0,
      ...summarizeDeanParticipation(
        data.evidence.filter(
          (row) => row.programId === program.id && row.source !== "GENERAL_EDUCATION"
        )
      ),
    })),
  };
}

function deploymentSummary(
  row: {
    id: string;
    status: string;
    term_instance_id: string;
    instrument: { template: { name: string }; version_number: number };
  },
  labels: Map<string, string>,
  opportunities: Map<string | null, number>,
  responses: Map<string, number>
) {
  return {
    status: row.status,
    periodId: row.term_instance_id,
    periodLabel: labels.get(row.term_instance_id) ?? "Unknown period",
    instrument: `${row.instrument.template.name} v${row.instrument.version_number}`,
    opportunities: opportunities.get(row.id) ?? 0,
    submitted: responses.get(row.id) ?? 0,
  };
}
