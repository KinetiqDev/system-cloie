import { prisma } from "@/lib/db/prisma";
import type { Prisma, AcademicPeriodStatus, CourseScope, YearLevel, StudentSection } from "@prisma/client";

export type ReadinessState = "ready" | "missing-cilos" | "incomplete-mapping";

export type ReadinessContext = {
  courseId: string;
  courseCode: string;
  courseName: string;
  courseIsArchived: boolean;
  programId: string;
  programName: string;
  programIsArchived: boolean;
  assignmentIds: string[];
  courseScope: CourseScope;
  yearLevels: YearLevel[];
  sections: StudentSection[];
  state: ReadinessState;
  cilos: Array<{
    id: string;
    description: string;
    isArchived: boolean;
    missingGraduateOutcomeIds: string[];
  }>;
  graduateOutcomes: Array<{ id: string; code: string; description: string; isArchived: boolean; order: number }>;
  affectedCiloIds: string[];
  affectedGraduateOutcomeIds: string[];
};

export type ProgramReadinessTotal = {
  programId: string;
  programName: string;
  activeContexts: number;
  readyContexts: number;
  missingCiloContexts: number;
  incompleteMappingContexts: number;
};

export type PeriodReadiness = {
  period: { id: string; status: AcademicPeriodStatus };
  contexts: ReadinessContext[];
  programTotals: ProgramReadinessTotal[];
};

type ContextSource = {
  id: string;
  course_id: string;
  program_id: string;
  year_level: YearLevel;
  section: StudentSection;
  course: {
    code: string;
    title: string;
    course_scope: CourseScope;
    is_active: boolean;
    program_id: string | null;
    cilos: Array<{
      id: string;
      description: string;
      is_active: boolean;
      cilo_mappings: Array<{ go: { id: string; program_id: string; is_active: boolean } }>;
    }>;
  };
  program: { id: string; name: string; is_active: boolean; gos: Array<{ id: string; code: string; description: string; is_active: boolean; order: number }> };
};

const contextInclude = {
  course: {
    select: {
      code: true,
      title: true,
      course_scope: true,
      is_active: true,
      program_id: true,
      cilos: {
        orderBy: { created_at: "asc" },
        select: {
          id: true,
          description: true,
          is_active: true,
          cilo_mappings: {
            select: { go: { select: { id: true, program_id: true, is_active: true } } },
          },
        },
      },
    },
  },
  program: { select: { id: true, name: true, is_active: true, gos: { orderBy: { order: "asc" }, select: { id: true, code: true, description: true, is_active: true, order: true } } } },
} satisfies Prisma.CourseAssignmentInclude;

function buildContexts(assignments: ContextSource[], includeArchived: boolean): ReadinessContext[] {
  const grouped = new Map<string, ContextSource[]>();
  for (const assignment of assignments) {
    // Defensive guard: malformed program-specific assignments never leak into another context.
    if (assignment.course.course_scope === "PROGRAM_SPECIFIC" && assignment.course.program_id !== assignment.program_id) continue;
    const key = `${assignment.course_id}:${assignment.program_id}`;
    grouped.set(key, [...(grouped.get(key) ?? []), assignment]);
  }

  return [...grouped.values()].map((rows) => {
    const first = rows[0];
    const includedCilos = first.course.cilos.filter((cilo) => includeArchived || cilo.is_active);
    const activeCilos = first.course.cilos.filter((cilo) => cilo.is_active);
    const cilos = includedCilos.map((cilo) => {
      const mapped = cilo.cilo_mappings.filter(
        ({ go }) =>
          go.is_active &&
          (first.course.course_scope === "GENERAL_EDUCATION" || go.program_id === first.program_id)
      );
      const mappedIds = new Set(mapped.map(({ go }) => go.id));
      const missingGraduateOutcomeIds = first.course.course_scope === "GENERAL_EDUCATION"
        ? []
        : first.program.gos
            .filter((go) => go.is_active && !mappedIds.has(go.id))
            .map((go) => go.id);
      return {
        id: cilo.id,
        description: cilo.description,
        isArchived: !cilo.is_active,
        missingGraduateOutcomeIds,
      };
    });
    const hasIncompleteMapping = activeCilos.some((cilo) =>
      !cilo.cilo_mappings.some(
        ({ go }) =>
          go.is_active &&
          (first.course.course_scope === "GENERAL_EDUCATION" || go.program_id === first.program_id)
      )
    );
    const state: ReadinessState = activeCilos.length === 0
      ? "missing-cilos"
      : hasIncompleteMapping
        ? "incomplete-mapping"
        : "ready";
    const affectedCiloIds = state === "missing-cilos" ? [] : activeCilos
      .filter(
        (cilo) =>
          !cilo.cilo_mappings.some(
            ({ go }) =>
              go.is_active &&
              (first.course.course_scope === "GENERAL_EDUCATION" || go.program_id === first.program_id)
          )
      )
      .map((cilo) => cilo.id);
    const affectedGraduateOutcomeIds = [...new Set(cilos.flatMap((cilo) => cilo.missingGraduateOutcomeIds))];

    return {
      courseId: first.course_id,
      courseCode: first.course.code,
      courseName: first.course.title,
      courseIsArchived: !first.course.is_active,
      programId: first.program.id,
      programName: first.program.name,
      programIsArchived: !first.program.is_active,
      assignmentIds: rows.map((row) => row.id).sort(),
      courseScope: first.course.course_scope,
      yearLevels: [...new Set(rows.map((row) => row.year_level))],
      sections: [...new Set(rows.map((row) => row.section))],
      state,
      cilos,
      graduateOutcomes: [...first.program.gos].sort((a, b) => Number(b.is_active) - Number(a.is_active) || a.order - b.order).map((go) => ({
        id: go.id,
        code: go.code,
        description: go.description,
        isArchived: !go.is_active,
        order: go.order,
      })),
      affectedCiloIds,
      affectedGraduateOutcomeIds,
    };
  }).sort((a, b) => a.courseCode.localeCompare(b.courseCode) || a.programName.localeCompare(b.programName));
}

async function calculateLive(periodId: string, db: typeof prisma | Prisma.TransactionClient, includeArchived = false): Promise<PeriodReadiness> {
  const period = await db.academicTermInstance.findUnique({ where: { id: periodId }, select: { id: true, status: true } });
  if (!period) throw new Error("Academic period not found");
  const assignments = await db.courseAssignment.findMany({
    where: { term_instance_id: periodId, is_active: true, ...(includeArchived ? {} : { course: { is_active: true }, program: { is_active: true } }) },
    include: contextInclude,
    orderBy: { created_at: "asc" },
  });
  const contexts = buildContexts(assignments as unknown as ContextSource[], includeArchived);
  const totals = new Map<string, ProgramReadinessTotal>();
  for (const context of contexts) {
    const total = totals.get(context.programId) ?? { programId: context.programId, programName: context.programName, activeContexts: 0, readyContexts: 0, missingCiloContexts: 0, incompleteMappingContexts: 0 };
    total.activeContexts++;
    if (context.state === "ready") total.readyContexts++;
    if (context.state === "missing-cilos") total.missingCiloContexts++;
    if (context.state === "incomplete-mapping") total.incompleteMappingContexts++;
    totals.set(context.programId, total);
  }
  return { period, contexts, programTotals: [...totals.values()].sort((a, b) => a.programName.localeCompare(b.programName)) };
}

export async function readPeriodReadiness(periodId: string): Promise<PeriodReadiness> {
  const period = await prisma.academicTermInstance.findUnique({ where: { id: periodId }, select: { status: true } });
  if (!period) throw new Error("Academic period not found");
  if (period.status !== "ACTIVE" && period.status !== "COMPLETED") throw new Error("Academic period is not eligible for readiness");
  if (period.status === "COMPLETED") {
    const snapshot = await prisma.academicPeriodReadinessSnapshot.findUnique({ where: { period_id: periodId } });
    if (!snapshot) throw new Error("Academic period readiness snapshot not found");
    return { period: { id: periodId, status: period.status }, contexts: snapshot.contexts as ReadinessContext[], programTotals: snapshot.program_totals as ProgramReadinessTotal[] };
  }
  return calculateLive(periodId, prisma);
}

export async function persistPeriodReadinessSnapshot(periodId: string, db: Prisma.TransactionClient = prisma): Promise<void> {
  const readiness = await calculateLive(periodId, db, true);
  await db.academicPeriodReadinessSnapshot.create({
    data: { period_id: periodId, contexts: readiness.contexts, program_totals: readiness.programTotals },
  });
}
