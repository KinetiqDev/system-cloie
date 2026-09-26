import type { AcademicPeriodStatus, CourseScope, StudentSection, YearLevel } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import {
  readPeriodReadiness,
  type PeriodReadiness,
  type ReadinessContext,
} from "@/features/academic-calendar/services/read-period-readiness";
import {
  hasExhaustiveGoCoverage,
  type CourseAlignmentTargetLayer,
} from "@/features/outcomes/services/classify-course-alignment";
import {
  DeanReadModelBadRequestError,
  periodSummary,
  requirePeriod,
  type DeanPeriodSummary,
  type DeanReadState,
} from "./dean-read-model";

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

type DeanOutcomeCatalogEntry = {
  id: string;
  code: string;
  statement: string;
  isArchived: boolean;
  displayOrder: number;
};

type DeanMappingGap = {
  courseId: string;
  courseCode: string;
  courseName: string;
  courseScope: CourseScope;
  targetType: CourseAlignmentTargetLayer | null;
  yearLevel: YearLevel;
  section: StudentSection;
  ciloId: string | null;
  ciloStatement: string | null;
  ciloIsArchived: boolean | null;
  reason: "missing-cilos" | "incomplete-mapping";
  missingGoIds: string[];
  missingInstitutionalOutcomeIds: string[];
};

export type DeanLearningOutcomesData = {
  period: DeanPeriodSummary;
  schemaVersion: number;
  risk: "missing-cilos" | "incomplete-mappings" | "not-ready" | null;
  institutionalOutcomes: DeanOutcomeCatalogEntry[];
  programs: Array<{
    id: string;
    name: string;
    goCount: number;
    activeContexts: number;
    readyContexts: number;
    missingCiloContexts: number;
    incompleteMappingContexts: number;
    gos: DeanOutcomeCatalogEntry[];
    mappingGaps: DeanMappingGap[];
  }>;
};

function archivedLabel(
  name: string,
  isArchived: boolean,
  periodStatus: AcademicPeriodStatus
): string {
  return periodStatus === "COMPLETED" && isArchived ? `${name} (Archived)` : name;
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

function visibleCatalog(
  targets: Array<{
    id: string;
    code: string;
    description: string;
    isArchived: boolean;
    order: number;
  }>,
  periodStatus: AcademicPeriodStatus
): DeanOutcomeCatalogEntry[] {
  return targets
    .filter((target) => periodStatus === "COMPLETED" || !target.isArchived)
    .map((target) => ({
      id: target.id,
      code: target.code,
      statement: target.description,
      isArchived: target.isArchived,
      displayOrder: target.order,
    }))
    .sort((a, b) => a.displayOrder - b.displayOrder || a.code.localeCompare(b.code));
}

async function institutionalOutcomeCatalog(
  periodStatus: AcademicPeriodStatus,
  schemaVersion: number,
  contexts: ReadinessContext[]
): Promise<DeanOutcomeCatalogEntry[]> {
  if (schemaVersion < 2) return [];
  if (periodStatus === "ACTIVE") {
    const rows = await prisma.institutionalOutcome.findMany({
      select: { id: true, code: true, description: true, is_active: true, order: true },
      orderBy: [{ order: "asc" }, { code: "asc" }],
    });
    return visibleCatalog(
      rows.map((row) => ({
        id: row.id,
        code: row.code,
        description: row.description,
        isArchived: !row.is_active,
        order: row.order,
      })),
      periodStatus
    );
  }
  const seen = new Map<string, DeanOutcomeCatalogEntry>();
  for (const context of contexts) {
    for (const outcome of context.institutionalOutcomes ?? []) {
      if (!seen.has(outcome.id)) {
        seen.set(outcome.id, {
          id: outcome.id,
          code: outcome.code,
          statement: outcome.description,
          isArchived: outcome.isArchived,
          displayOrder: outcome.order,
        });
      }
    }
  }
  return [...seen.values()].sort(
    (a, b) => a.displayOrder - b.displayOrder || a.code.localeCompare(b.code)
  );
}

function gapTargetType(
  context: ReadinessContext,
  schemaVersion: number
): CourseAlignmentTargetLayer | null {
  if (schemaVersion < 2) return null;
  if (context.targetType === "INSTITUTIONAL_OUTCOME" || context.targetType === "GRADUATE_OUTCOME") {
    return context.targetType;
  }
  return context.courseScope === "GENERAL_EDUCATION" ? "INSTITUTIONAL_OUTCOME" : "GRADUATE_OUTCOME";
}

function gapCourseScope(context: ReadinessContext, assignment: AssignmentRow): CourseScope {
  if (context.courseScope === "GENERAL_EDUCATION" || context.courseScope === "PROGRAM_SPECIFIC") {
    return context.courseScope;
  }
  return assignment.course.course_scope === "GENERAL_EDUCATION"
    ? "GENERAL_EDUCATION"
    : "PROGRAM_SPECIFIC";
}

function v2CiloIsIncomplete(
  cilo: ReadinessContext["cilos"][number],
  context: ReadinessContext
): boolean {
  if (!Array.isArray(cilo.mappedTargets)) {
    return (cilo.missingGoIds?.length ?? 0) > 0;
  }
  if (context.courseScope === "GENERAL_EDUCATION") {
    return !cilo.mappedTargets.some((target) => !target.isArchived);
  }
  // Program-specific CILOs share the classifier's exhaustive rule: a CILO
  // is a gap unless it classifies every active owning-Program GO, and
  // zero active GOs alongside an active CILO is incomplete, not ready.
  return !hasExhaustiveGoCoverage(
    (cilo.mappedTargets ?? []).filter((target) => !target.isArchived).map((target) => target.id),
    (context.gos ?? []).filter((go) => !go.isArchived).map((go) => go.id)
  );
}

function incompleteCilos(context: ReadinessContext, schemaVersion: number) {
  return context.cilos.filter((cilo) => {
    if (cilo.isArchived) return false;
    if (schemaVersion < 2) return (cilo.missingGoIds?.length ?? 0) > 0;
    return v2CiloIsIncomplete(cilo, context);
  });
}

function mappingGapBase(
  assignment: AssignmentRow,
  context: ReadinessContext,
  periodStatus: AcademicPeriodStatus,
  schemaVersion: number
): Omit<
  DeanMappingGap,
  | "ciloId"
  | "ciloStatement"
  | "ciloIsArchived"
  | "reason"
  | "missingGoIds"
  | "missingInstitutionalOutcomeIds"
> {
  return {
    courseId: assignment.course_id,
    courseCode: assignment.course.code,
    courseName: archivedLabel(assignment.course.title, !assignment.course.is_active, periodStatus),
    courseScope: gapCourseScope(context, assignment),
    targetType: gapTargetType(context, schemaVersion),
    yearLevel: assignment.year_level,
    section: assignment.section,
  };
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

/**
 * The mapping gaps one readiness context contributes to its program.
 *
 * `missing-cilos` yields a single gap naming the context; `incomplete-mapping`
 * yields one gap per active CILO that fails the aligned rule, carrying that
 * CILO's statement, archive state, and the exact targets it is missing. A
 * `ready` context contributes none. Archived CILOs never appear as current gaps.
 */
function mappingGapsForContext(
  assignment: AssignmentRow,
  context: ReadinessContext,
  periodStatus: AcademicPeriodStatus,
  schemaVersion: number
): DeanMappingGap[] {
  const base = mappingGapBase(assignment, context, periodStatus, schemaVersion);

  if (context.state === "missing-cilos") {
    return [
      {
        ...base,
        ciloId: null,
        ciloStatement: null,
        ciloIsArchived: null,
        reason: "missing-cilos",
        missingGoIds: [],
        missingInstitutionalOutcomeIds: [],
      },
    ];
  }

  if (context.state !== "incomplete-mapping") return [];

  return incompleteCilos(context, schemaVersion).map((cilo) => ({
    ...base,
    ciloId: cilo.id,
    ciloStatement: cilo.description,
    ciloIsArchived: cilo.isArchived,
    reason: "incomplete-mapping",
    missingGoIds: cilo.missingGoIds ?? [],
    missingInstitutionalOutcomeIds: cilo.missingInstitutionalOutcomeIds ?? [],
  }));
}

/** Programs rank by unresolved-context count descending, then name. */
function byUnresolvedContextsThenName(
  left: DeanLearningOutcomesData["programs"][number],
  right: DeanLearningOutcomesData["programs"][number]
): number {
  const unresolved =
    right.missingCiloContexts +
    right.incompleteMappingContexts -
    (left.missingCiloContexts + left.incompleteMappingContexts);
  return unresolved || left.name.localeCompare(right.name);
}

/** Gaps rank by course code, then year level, then section: stable display order. */
function byCourseThenClass(left: DeanMappingGap, right: DeanMappingGap): number {
  return (
    left.courseCode.localeCompare(right.courseCode) ||
    left.yearLevel.localeCompare(right.yearLevel) ||
    left.section.localeCompare(right.section)
  );
}

export async function getDeanLearningOutcomes(
  periodId: string | undefined,
  risk: DeanLearningOutcomesData["risk"] = null
): Promise<DeanReadState<DeanLearningOutcomesData>> {
  const period = await requirePeriod(periodId, "active");
  if (!period && periodId === undefined) return { state: "no-eligible-period" };
  if (periodId === undefined && period) {
    throw new DeanReadModelBadRequestError("period is required.");
  }
  if (!period) return { state: "no-eligible-period" };
  const readiness = await readPeriodReadiness(period.id);
  const schemaVersion = readiness.schemaVersion ?? 1;
  const includeArchived = period.status === "COMPLETED";
  const [assignments, institutionalOutcomes] = await Promise.all([
    assignmentRows(period.id, includeArchived),
    institutionalOutcomeCatalog(period.status, schemaVersion, readiness.contexts),
  ]);
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
      goCount: 0,
      activeContexts: total.activeContexts,
      readyContexts: total.readyContexts,
      missingCiloContexts: total.missingCiloContexts,
      incompleteMappingContexts: total.incompleteMappingContexts,
      gos: [],
      mappingGaps: [],
    };
    if (program.gos.length === 0 && (context.gos?.length ?? 0) > 0) {
      program.gos = visibleCatalog(context.gos, period.status);
      program.goCount = program.gos.length;
    }
    program.mappingGaps.push(
      ...mappingGapsForContext(assignment, context, period.status, schemaVersion)
    );
    programs.set(assignment.program_id, program);
  }

  return {
    state: "ready",
    data: {
      period: periodSummary(period),
      schemaVersion,
      risk,
      institutionalOutcomes,
      programs: [...programs.values()].sort(byUnresolvedContextsThenName).map((program) => ({
        ...program,
        mappingGaps: program.mappingGaps.sort(byCourseThenClass),
      })),
    },
  };
}
