import type { AcademicPeriodStatus, Prisma, StudentSection, YearLevel } from "@prisma/client";
import { cache } from "react";
import { prisma } from "@/lib/db/prisma";
import { ROLES } from "@/lib/constants/roles";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { listAcademicPeriodSummaries } from "@/features/academic-calendar/services/read-academic-period-summaries";
import { formatTermInstanceLabel } from "@/lib/utils/date-format";
import {
  readPeriodReadiness,
  readPeriodReadinessTotals,
  type PeriodReadiness,
  type ReadinessContext,
} from "@/features/academic-calendar/services/read-period-readiness";

export class DeanReadModelNotFoundError extends Error {}
export class DeanReadModelBadRequestError extends Error {}
export class DeanReadModelUnauthorizedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DeanReadModelUnauthorizedError";
  }
}

export type DeanReadState<T> = { state: "ready"; data: T } | { state: "no-eligible-period" };

export type DeanPeriodSummary = {
  id: string;
  label: string;
  status: AcademicPeriodStatus;
};

type PeriodRecord = Prisma.AcademicTermInstanceGetPayload<{
  include: { school_year: { select: { code: true } } };
}>;

function periodSummary(period: PeriodRecord): DeanPeriodSummary {
  return {
    id: period.id,
    label: formatTermInstanceLabel(period.school_year.code, period.semester, period.term),
    status: period.status,
  };
}

type AssignmentRow = {
  id: string;
  course_id: string;
  program_id: string;
  year_level: YearLevel;
  section: StudentSection;
  course: {
    code: string;
    title: string;
    is_active: boolean;
    course_scope: string;
    program_id: string | null;
  };
  program: { id: string; name: string; is_active: boolean };
};

export type DeanDashboardData = {
  activePeriod: { id: string; label: string };
  kpis: {
    activeContexts: number;
    readyContexts: number;
    missingCiloContexts: number;
    incompleteMappingContexts: number;
  };
  risks: { missingCilos: number; incompleteMappings: number; notReady: number };
  programs: Array<{
    id: string;
    name: string;
    activeContexts: number;
    readyContexts: number;
    missingCiloContexts: number;
    incompleteMappingContexts: number;
  }>;
};

export type DeanLearningOutcomesData = {
  period: DeanPeriodSummary;
  risk: "missing-cilos" | "incomplete-mappings" | "not-ready" | null;
  programs: Array<{
    id: string;
    name: string;
    graduateOutcomeCount: number;
    activeContexts: number;
    readyContexts: number;
    missingCiloContexts: number;
    incompleteMappingContexts: number;
    graduateOutcomes: Array<{
      id: string;
      code: string;
      statement: string;
      isArchived: boolean;
      displayOrder: number;
    }>;
    mappingGaps: Array<{
      courseId: string;
      courseCode: string;
      courseName: string;
      yearLevel: string;
      section: string;
      ciloId: string | null;
      ciloStatement: string | null;
      ciloIsArchived: boolean | null;
      reason: "missing-cilos" | "incomplete-mapping";
      missingGraduateOutcomeIds: string[];
    }>;
  }>;
};

export type DeanEnrollmentsData = {
  period: DeanPeriodSummary;
  programs: Array<{
    id: string;
    name: string;
    enrolledStudentCount: number;
    classes: Array<{
      assignmentId: string;
      courseCode: string;
      courseName: string;
      yearLevel: string;
      section: string;
      enrolledStudentCount: number;
    }>;
  }>;
};

export type DeanRosterData = {
  assignment: {
    id: string;
    courseCode: string;
    courseName: string;
    programName: string;
    yearLevel: string;
    section: string;
  };
  students: Array<{ displayName: string }>;
  page: number;
  pageSize: 25;
  totalCount: number;
  totalPages: number;
};

const ROSTER_PAGE_SIZE = 25;

export async function listDeanEligiblePeriods(): Promise<DeanPeriodSummary[]> {
  const session = await resolveAuthSession();
  if (!session) throw new DeanReadModelUnauthorizedError("Authentication required.");
  if (session.activeRole !== ROLES.DEAN) {
    throw new DeanReadModelUnauthorizedError("College Dean access required.");
  }

  return listAcademicPeriodSummaries();
}

function archivedLabel(
  name: string,
  isArchived: boolean,
  periodStatus: AcademicPeriodStatus
): string {
  return periodStatus === "COMPLETED" && isArchived ? `${name} (Archived)` : name;
}

async function findEligiblePeriod(
  periodId: string | undefined,
  defaultMode: "active" | "active-or-completed"
): Promise<PeriodRecord | null> {
  if (periodId) {
    const period = await prisma.academicTermInstance.findUnique({
      where: { id: periodId },
      include: { school_year: { select: { code: true } } },
    });
    if (!period || (period.status !== "ACTIVE" && period.status !== "COMPLETED")) {
      throw new DeanReadModelNotFoundError("Academic period is not eligible");
    }
    return period;
  }

  const active = await prisma.academicTermInstance.findFirst({
    where: { status: "ACTIVE" },
    include: { school_year: { select: { code: true } } },
  });
  if (active || defaultMode === "active") return active;
  return prisma.academicTermInstance.findFirst({
    where: { status: "COMPLETED" },
    include: { school_year: { select: { code: true } } },
    orderBy: [{ end_date: "desc" }, { created_at: "desc" }],
  });
}

async function requirePeriod(
  periodId: string | undefined,
  defaultMode: "active" | "active-or-completed"
): Promise<PeriodRecord | null> {
  const period = await findEligiblePeriod(periodId, defaultMode);
  if (!period && periodId) throw new DeanReadModelNotFoundError("Academic period is not eligible");
  return period;
}

function readinessForProgram(readiness: PeriodReadiness, programId: string) {
  return (
    readiness.programTotals.find((total) => total.programId === programId) ?? {
      programId,
      programName: "",
      activeContexts: 0,
      readyContexts: 0,
      missingCiloContexts: 0,
      incompleteMappingContexts: 0,
    }
  );
}

function contextMatchesRisk(
  context: ReadinessContext,
  risk: DeanLearningOutcomesData["risk"]
): boolean {
  if (risk === "missing-cilos") return context.state === "missing-cilos";
  if (risk === "incomplete-mappings") return context.state === "incomplete-mapping";
  if (risk === "not-ready") return context.state !== "ready";
  return true;
}

async function assignmentRows(periodId: string, includeArchived: boolean) {
  const assignments = await prisma.courseAssignment.findMany({
    where: {
      term_instance_id: periodId,
      is_active: true,
      ...(includeArchived ? {} : { course: { is_active: true }, program: { is_active: true } }),
    },
    select: {
      id: true,
      course_id: true,
      program_id: true,
      year_level: true,
      section: true,
      course: {
        select: { code: true, title: true, is_active: true, course_scope: true, program_id: true },
      },
      program: { select: { id: true, name: true, is_active: true } },
    },
    orderBy: [{ course: { code: "asc" } }, { year_level: "asc" }, { section: "asc" }],
  });
  return (assignments as AssignmentRow[]).filter(
    (assignment) =>
      assignment.course.course_scope === "GENERAL_EDUCATION" ||
      assignment.course.program_id === assignment.program_id
  );
}

const rosterContext = cache(async (periodId: string, assignmentId: string) => {
  const period = await requirePeriod(periodId, "active-or-completed");
  if (!period) return null;
  const assignment = await prisma.courseAssignment.findFirst({
    where: {
      id: assignmentId,
      term_instance_id: period.id,
      is_active: true,
      ...(period.status === "ACTIVE"
        ? { course: { is_active: true }, program: { is_active: true } }
        : {}),
    },
    select: {
      id: true,
      program_id: true,
      year_level: true,
      section: true,
      course: {
        select: { code: true, title: true, is_active: true, course_scope: true, program_id: true },
      },
      program: { select: { name: true, is_active: true } },
    },
  });
  if (!assignment)
    throw new DeanReadModelNotFoundError("Course assignment is not in selected period");
  if (
    assignment.course.course_scope === "PROGRAM_SPECIFIC" &&
    assignment.course.program_id !== assignment.program_id
  ) {
    throw new DeanReadModelNotFoundError("Course assignment is not in selected program");
  }
  return { period, assignment };
});

function rosterStudentWhere(
  periodId: string,
  assignment: {
    program_id: string;
    year_level: YearLevel;
    section: StudentSection;
  },
  query?: string
): Prisma.StudentEnrollmentWhereInput {
  const searchTerms = query?.split(/\s+/).filter(Boolean) ?? [];
  const searchFilter: Prisma.StudentEnrollmentWhereInput =
    searchTerms.length > 0
      ? {
          AND: searchTerms.map((term) => ({
            student: {
              name: { contains: term, mode: "insensitive" },
            },
          })),
        }
      : {};

  return {
    term_instance_id: periodId,
    program_id: assignment.program_id,
    year_level: assignment.year_level,
    section: assignment.section,
    is_active: true,
    ...searchFilter,
  };
}

const rosterPageRead = cache(async (periodId: string, assignmentId: string, query?: string) => {
  const context = await rosterContext(periodId, assignmentId);
  if (!context) return null;
  const totalCount = await prisma.studentEnrollment.count({
    where: rosterStudentWhere(context.period.id, context.assignment, query),
  });
  return {
    ...context,
    totalCount,
    totalPages: Math.max(1, Math.ceil(totalCount / ROSTER_PAGE_SIZE)),
  };
});

export async function getDeanDashboard(): Promise<DeanReadState<DeanDashboardData>> {
  const period = await prisma.academicTermInstance.findFirst({
    where: { status: "ACTIVE" },
    include: { school_year: { select: { code: true } } },
  });
  if (!period) return { state: "no-eligible-period" };

  const programTotals = await readPeriodReadinessTotals(period.id);
  const missingCilos = programTotals.reduce((sum, total) => sum + total.missingCiloContexts, 0);
  const incompleteMappings = programTotals.reduce(
    (sum, total) => sum + total.incompleteMappingContexts,
    0
  );
  return {
    state: "ready",
    data: {
      activePeriod: { id: period.id, label: periodSummary(period).label },
      kpis: {
        activeContexts: programTotals.reduce((sum, total) => sum + total.activeContexts, 0),
        readyContexts: programTotals.reduce((sum, total) => sum + total.readyContexts, 0),
        missingCiloContexts: missingCilos,
        incompleteMappingContexts: incompleteMappings,
      },
      risks: { missingCilos, incompleteMappings, notReady: missingCilos + incompleteMappings },
      programs: programTotals.map(
        ({
          programId,
          programName,
          activeContexts,
          readyContexts,
          missingCiloContexts,
          incompleteMappingContexts,
        }) => ({
          id: programId,
          name: programName,
          activeContexts,
          readyContexts,
          missingCiloContexts,
          incompleteMappingContexts,
        })
      ),
    },
  };
}

export async function getDeanLearningOutcomes(
  periodId: string | undefined,
  risk: DeanLearningOutcomesData["risk"] = null
): Promise<DeanReadState<DeanLearningOutcomesData>> {
  const period = await requirePeriod(periodId, "active");
  if (!period && periodId === undefined) return { state: "no-eligible-period" };
  if (periodId === undefined && period) {
    // Caller must make period selection explicit whenever an eligible period exists.
    throw new DeanReadModelBadRequestError("period is required.");
  }
  if (!period) return { state: "no-eligible-period" };
  const readiness = await readPeriodReadiness(period.id);
  const includeArchived = period.status === "COMPLETED";
  const assignments = await assignmentRows(period.id, includeArchived);
  const contextsByKey = new Map(
    readiness.contexts.map((context) => [`${context.courseId}:${context.programId}`, context])
  );
  const programs = new Map<string, DeanLearningOutcomesData["programs"][number]>();

  for (const assignment of assignments) {
    const context = contextsByKey.get(`${assignment.course_id}:${assignment.program_id}`);
    if (!context || !contextMatchesRisk(context, risk)) continue;
    const total = readinessForProgram(readiness, assignment.program_id);
    const program = programs.get(assignment.program_id) ?? {
      id: assignment.program.id,
      name: archivedLabel(assignment.program.name, !assignment.program.is_active, period.status),
      graduateOutcomeCount: context.graduateOutcomes.filter(
        (go) => period.status === "COMPLETED" || !go.isArchived
      ).length,
      activeContexts: total.activeContexts,
      readyContexts: total.readyContexts,
      missingCiloContexts: total.missingCiloContexts,
      incompleteMappingContexts: total.incompleteMappingContexts,
      graduateOutcomes: context.graduateOutcomes
        .filter((go) => period.status === "COMPLETED" || !go.isArchived)
        .map((go) => ({
          id: go.id,
          code: go.code,
          statement: go.description,
          isArchived: go.isArchived,
          displayOrder: go.order,
        })),
      mappingGaps: [],
    };
    if (context.state === "missing-cilos") {
      program.mappingGaps.push({
        courseId: assignment.course_id,
        courseCode: assignment.course.code,
        courseName: archivedLabel(
          assignment.course.title,
          !assignment.course.is_active,
          period.status
        ),
        yearLevel: assignment.year_level,
        section: assignment.section,
        ciloId: null,
        ciloStatement: null,
        ciloIsArchived: null,
        reason: "missing-cilos",
        missingGraduateOutcomeIds: [],
      });
    } else if (context.state === "incomplete-mapping") {
      for (const cilo of context.cilos.filter(
        (item) => item.missingGraduateOutcomeIds.length > 0
      )) {
        program.mappingGaps.push({
          courseId: assignment.course_id,
          courseCode: assignment.course.code,
          courseName: archivedLabel(
            assignment.course.title,
            !assignment.course.is_active,
            period.status
          ),
          yearLevel: assignment.year_level,
          section: assignment.section,
          ciloId: cilo.id,
          ciloStatement: cilo.description,
          ciloIsArchived: cilo.isArchived,
          reason: "incomplete-mapping",
          missingGraduateOutcomeIds: cilo.missingGraduateOutcomeIds,
        });
      }
    }
    programs.set(assignment.program_id, program);
  }

  return {
    state: "ready",
    data: {
      period: periodSummary(period),
      risk,
      programs: [...programs.values()]
        .sort(
          (a, b) =>
            b.missingCiloContexts +
              b.incompleteMappingContexts -
              (a.missingCiloContexts + a.incompleteMappingContexts) || a.name.localeCompare(b.name)
        )
        .map((program) => ({
          ...program,
          mappingGaps: program.mappingGaps.sort(
            (a, b) =>
              a.courseCode.localeCompare(b.courseCode) ||
              a.yearLevel.localeCompare(b.yearLevel) ||
              a.section.localeCompare(b.section)
          ),
        })),
    },
  };
}

export async function getDeanEnrollments(
  periodId: string | undefined
): Promise<DeanReadState<DeanEnrollmentsData>> {
  const period = await requirePeriod(periodId, "active-or-completed");
  if (!period && periodId === undefined) return { state: "no-eligible-period" };
  if (periodId === undefined && period) {
    throw new DeanReadModelBadRequestError("period is required.");
  }
  if (!period) return { state: "no-eligible-period" };
  const includeArchived = period.status === "COMPLETED";
  const assignments = await assignmentRows(period.id, includeArchived);
  if (assignments.length === 0)
    return { state: "ready", data: { period: periodSummary(period), programs: [] } };

  const [programCounts, classCounts] = await Promise.all([
    prisma.studentEnrollment.groupBy({
      by: ["program_id"],
      where: { term_instance_id: period.id, is_active: true },
      _count: { student_user_id: true },
    }),
    prisma.studentEnrollment.groupBy({
      by: ["program_id", "year_level", "section"],
      where: { term_instance_id: period.id, is_active: true },
      _count: { student_user_id: true },
    }),
  ]);
  const countFor = (programId: string, yearLevel: string, section: string) =>
    classCounts.find(
      (count) =>
        count.program_id === programId &&
        count.year_level === yearLevel &&
        count.section === section
    )?._count.student_user_id ?? 0;
  const programCountFor = (programId: string) =>
    programCounts.find((count) => count.program_id === programId)?._count.student_user_id ?? 0;
  const programs = new Map<string, DeanEnrollmentsData["programs"][number]>();
  for (const assignment of assignments) {
    const enrolledStudentCount = countFor(
      assignment.program_id,
      assignment.year_level,
      assignment.section
    );
    const program = programs.get(assignment.program_id) ?? {
      id: assignment.program.id,
      name: archivedLabel(assignment.program.name, !assignment.program.is_active, period.status),
      enrolledStudentCount: programCountFor(assignment.program_id),
      classes: [],
    };
    program.classes.push({
      assignmentId: assignment.id,
      courseCode: assignment.course.code,
      courseName: archivedLabel(
        assignment.course.title,
        !assignment.course.is_active,
        period.status
      ),
      yearLevel: assignment.year_level,
      section: assignment.section,
      enrolledStudentCount,
    });
    programs.set(assignment.program_id, program);
  }
  return {
    state: "ready",
    data: {
      period: periodSummary(period),
      programs: [...programs.values()].sort((a, b) => a.name.localeCompare(b.name)),
    },
  };
}

export async function getDeanRoster(input: {
  periodId: string;
  assignmentId: string;
  query?: string;
  page: number;
}): Promise<DeanReadState<DeanRosterData>> {
  const pageRead = await rosterPageRead(input.periodId, input.assignmentId, input.query);
  if (!pageRead) return { state: "no-eligible-period" };
  const { period, assignment, totalCount, totalPages } = pageRead;
  const studentWhere = rosterStudentWhere(period.id, assignment, input.query);
  const page = Math.min(input.page, totalPages);
  const students = await prisma.studentEnrollment.findMany({
    where: studentWhere,
    select: { student: { select: { name: true } } },
    orderBy: [{ student: { name: "asc" } }, { student_user_id: "asc" }],
    skip: (page - 1) * ROSTER_PAGE_SIZE,
    take: ROSTER_PAGE_SIZE,
  });
  return {
    state: "ready",
    data: {
      assignment: {
        id: assignment.id,
        courseCode: assignment.course.code,
        courseName: archivedLabel(
          assignment.course.title,
          !assignment.course.is_active,
          period.status
        ),
        programName: archivedLabel(
          assignment.program.name,
          !assignment.program.is_active,
          period.status
        ),
        yearLevel: assignment.year_level,
        section: assignment.section,
      },
      students: students.map(({ student }) => ({
        displayName: student.name,
      })),
      page,
      pageSize: ROSTER_PAGE_SIZE,
      totalCount,
      totalPages,
    },
  };
}

export async function getDeanRosterPage(input: {
  periodId: string;
  assignmentId: string;
  query?: string;
  page: number;
}): Promise<DeanReadState<{ page: number }>> {
  const pageRead = await rosterPageRead(input.periodId, input.assignmentId, input.query);
  if (!pageRead) return { state: "no-eligible-period" };
  return { state: "ready", data: { page: Math.min(input.page, pageRead.totalPages) } };
}
