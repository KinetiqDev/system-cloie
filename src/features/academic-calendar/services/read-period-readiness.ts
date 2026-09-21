import { prisma } from "@/lib/db/prisma";
import type {
  Prisma,
  AcademicPeriodStatus,
  CILOMappingManifestation,
  CourseScope,
  YearLevel,
  StudentSection,
} from "@prisma/client";
import {
  classifyCourseAlignment,
  ciloIsAligned,
  targetLayerForScope,
  type CourseAlignmentTargetLayer,
} from "@/features/outcomes/services/classify-course-alignment";

export type ReadinessState = "ready" | "missing-cilos" | "incomplete-mapping";

/**
 * Snapshot schema version written by new snapshots. Version 1 snapshots
 * (column default) follow the legacy at-least-one-target readiness rule and
 * are immutable: mapping or catalog changes never rewrite them, and reads
 * return their stored payload verbatim. Version 2 snapshots carry typed
 * payloads under the exhaustive manifestation readiness rule.
 */
const READINESS_SNAPSHOT_SCHEMA_VERSION = 2 as const;

type ReadinessTarget = {
  id: string;
  isArchived: boolean;
};

type ReadinessCatalogTarget = {
  id: string;
  code: string;
  description: string;
  isArchived: boolean;
  order: number;
};

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
  /** Typed alignment layer this context resolves: General Education → ILO, else GO. */
  targetType: CourseAlignmentTargetLayer;
  yearLevels: YearLevel[];
  sections: StudentSection[];
  state: ReadinessState;
  cilos: Array<{
    id: string;
    description: string;
    isArchived: boolean;
    /** Targets of the context's typed layer, with archived state at read time. */
    mappedTargets: ReadinessTarget[];
    missingGoIds: string[];
    missingInstitutionalOutcomeIds: string[];
  }>;
  /** College-wide catalog for General Education contexts; empty otherwise. */
  institutionalOutcomes: ReadinessCatalogTarget[];
  gos: ReadinessCatalogTarget[];
  affectedCiloIds: string[];
  affectedGoIds: string[];
  affectedInstitutionalOutcomeIds: string[];
};
type ReadinessCilo = {
  cilo_mappings: Array<{
    manifestation: CILOMappingManifestation | null;
    go: { id: string; program_id: string | null; is_active: boolean };
  }>;
  cilo_institutional_outcome_mappings: Array<{
    manifestation: CILOMappingManifestation | null;
    institutional_outcome: { id: string; is_active: boolean };
  }>;
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
  schemaVersion: number;
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
      cilo_mappings: Array<{
        manifestation: CILOMappingManifestation | null;
        go: { id: string; program_id: string | null; is_active: boolean };
      }>;
      cilo_institutional_outcome_mappings: Array<{
        manifestation: CILOMappingManifestation | null;
        institutional_outcome: { id: string; is_active: boolean };
      }>;
    }>;
  };
  program: {
    id: string;
    name: string;
    is_active: boolean;
    gos: Array<{
      id: string;
      code: string;
      description: string;
      is_active: boolean;
      order: number;
    }>;
  };
};

type InstitutionalOutcomeCatalogRow = {
  id: string;
  code: string;
  description: string;
  is_active: boolean;
  order: number;
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
            select: {
              manifestation: true,
              go: { select: { id: true, program_id: true, is_active: true } },
            },
          },
          cilo_institutional_outcome_mappings: {
            select: {
              manifestation: true,
              institutional_outcome: { select: { id: true, is_active: true } },
            },
          },
        },
      },
    },
  },
  program: {
    select: {
      id: true,
      name: true,
      is_active: true,
      gos: {
        orderBy: { order: "asc" },
        select: { id: true, code: true, description: true, is_active: true, order: true },
      },
    },
  },
} satisfies Prisma.CourseAssignmentInclude;

function typedMappedTargets(
  cilo: ContextSource["course"]["cilos"][number],
  courseScope: CourseScope,
  owningProgramId: string | null
): ReadinessTarget[] {
  const mappings =
    courseScope === "GENERAL_EDUCATION"
      ? cilo.cilo_institutional_outcome_mappings
          .filter(({ manifestation }) => manifestation !== null)
          .map(({ institutional_outcome }) => ({
            id: institutional_outcome.id,
            is_active: institutional_outcome.is_active,
          }))
      : cilo.cilo_mappings
          .filter(
            ({ manifestation, go }) => manifestation !== null && go.program_id === owningProgramId
          )
          .map(({ go }) => ({ id: go.id, is_active: go.is_active }));
  return mappings
    .map(({ id, is_active }) => ({ id, isArchived: !is_active }))
    .sort((left, right) => left.id.localeCompare(right.id));
}
function buildContexts(
  assignments: ContextSource[],
  includeArchived: boolean,
  institutionalOutcomes: InstitutionalOutcomeCatalogRow[]
): ReadinessContext[] {
  const grouped = new Map<string, ContextSource[]>();
  for (const assignment of assignments) {
    if (
      assignment.course.course_scope === "PROGRAM_SPECIFIC" &&
      assignment.course.program_id !== assignment.program_id
    ) {
      continue;
    }
    const key = `${assignment.course_id}:${assignment.program_id}`;
    grouped.set(key, [...(grouped.get(key) ?? []), assignment]);
  }

  return [...grouped.values()]
    .map((rows) => {
      const first = rows[0];
      const courseScope = first.course.course_scope;
      const owningProgramId = first.course.program_id;
      const activeGoIds = first.program.gos.filter((go) => go.is_active).map((go) => go.id);
      const includedCilos = first.course.cilos.filter((cilo) => includeArchived || cilo.is_active);
      const activeCilos = first.course.cilos.filter((cilo) => cilo.is_active);
      const cilos = includedCilos.map((cilo) => {
        const mappedTargets = typedMappedTargets(cilo, courseScope, owningProgramId);
        const activeMappedIds = new Set(
          mappedTargets.filter((target) => !target.isArchived).map((target) => target.id)
        );
        const missingGoIds =
          courseScope === "GENERAL_EDUCATION"
            ? []
            : first.program.gos
                .filter((go) => go.is_active && !activeMappedIds.has(go.id))
                .map((go) => go.id);
        const missingInstitutionalOutcomeIds =
          courseScope === "GENERAL_EDUCATION"
            ? institutionalOutcomes
                .filter((ilo) => ilo.is_active && !activeMappedIds.has(ilo.id))
                .map((ilo) => ilo.id)
            : [];
        return {
          id: cilo.id,
          description: cilo.description,
          isArchived: !cilo.is_active,
          mappedTargets,
          missingGoIds,
          missingInstitutionalOutcomeIds,
        };
      });
      const state = classifyCourseAlignment(activeCilos, courseScope, owningProgramId, activeGoIds);
      const affectedCiloIds =
        state === "missing-cilos"
          ? []
          : activeCilos
              .filter((cilo) => !ciloIsAligned(cilo, courseScope, owningProgramId, activeGoIds))
              .map((cilo) => cilo.id);
      const affectedGoIds = [...new Set(cilos.flatMap((cilo) => cilo.missingGoIds))];
      const affectedInstitutionalOutcomeIds = [
        ...new Set(cilos.flatMap((cilo) => cilo.missingInstitutionalOutcomeIds)),
      ];

      return {
        courseId: first.course_id,
        courseCode: first.course.code,
        courseName: first.course.title,
        courseIsArchived: !first.course.is_active,
        programId: first.program.id,
        programName: first.program.name,
        programIsArchived: !first.program.is_active,
        assignmentIds: rows.map((row) => row.id).sort(),
        courseScope,
        targetType: targetLayerForScope(courseScope),
        yearLevels: [...new Set(rows.map((row) => row.year_level))],
        sections: [...new Set(rows.map((row) => row.section))],
        state,
        cilos,
        institutionalOutcomes:
          courseScope === "GENERAL_EDUCATION"
            ? [...institutionalOutcomes]
                .sort((a, b) => Number(b.is_active) - Number(a.is_active) || a.order - b.order)
                .map((ilo) => ({
                  id: ilo.id,
                  code: ilo.code,
                  description: ilo.description,
                  isArchived: !ilo.is_active,
                  order: ilo.order,
                }))
            : [],
        gos: [...first.program.gos]
          .sort((a, b) => Number(b.is_active) - Number(a.is_active) || a.order - b.order)
          .map((go) => ({
            id: go.id,
            code: go.code,
            description: go.description,
            isArchived: !go.is_active,
            order: go.order,
          })),
        affectedCiloIds,
        affectedGoIds,
        affectedInstitutionalOutcomeIds,
      };
    })
    .sort(
      (a, b) =>
        a.courseCode.localeCompare(b.courseCode) || a.programName.localeCompare(b.programName)
    );
}

async function readInstitutionalOutcomeCatalog(
  db: typeof prisma | Prisma.TransactionClient
): Promise<InstitutionalOutcomeCatalogRow[]> {
  return db.institutionalOutcome.findMany({
    select: { id: true, code: true, description: true, is_active: true, order: true },
  });
}

async function calculateLive(
  periodId: string,
  db: typeof prisma | Prisma.TransactionClient,
  includeArchived = false
): Promise<PeriodReadiness> {
  const period = await db.academicTermInstance.findUnique({
    where: { id: periodId },
    select: { id: true, status: true },
  });
  if (!period) throw new Error("Academic period not found");
  const assignments = await db.courseAssignment.findMany({
    where: {
      term_instance_id: periodId,
      is_active: true,
      ...(includeArchived ? {} : { course: { is_active: true }, program: { is_active: true } }),
    },
    include: contextInclude,
    orderBy: { created_at: "asc" },
  });
  const hasGeneralEducationContexts = assignments.some(
    (assignment) => assignment.course.course_scope === "GENERAL_EDUCATION"
  );
  const institutionalOutcomes = hasGeneralEducationContexts
    ? await readInstitutionalOutcomeCatalog(db)
    : [];
  const contexts = buildContexts(
    assignments as unknown as ContextSource[],
    includeArchived,
    institutionalOutcomes
  );
  const totals = new Map<string, ProgramReadinessTotal>();
  for (const context of contexts) {
    const total = totals.get(context.programId) ?? {
      programId: context.programId,
      programName: context.programName,
      activeContexts: 0,
      readyContexts: 0,
      missingCiloContexts: 0,
      incompleteMappingContexts: 0,
    };
    total.activeContexts++;
    if (context.state === "ready") total.readyContexts++;
    if (context.state === "missing-cilos") total.missingCiloContexts++;
    if (context.state === "incomplete-mapping") total.incompleteMappingContexts++;
    totals.set(context.programId, total);
  }
  return {
    period,
    schemaVersion: READINESS_SNAPSHOT_SCHEMA_VERSION,
    contexts,
    programTotals: [...totals.values()].sort((a, b) => a.programName.localeCompare(b.programName)),
  };
}

async function calculateLiveTotals(periodId: string): Promise<ProgramReadinessTotal[]> {
  const assignments = await prisma.courseAssignment.findMany({
    where: {
      term_instance_id: periodId,
      is_active: true,
      course: { is_active: true },
      program: { is_active: true },
    },
    select: {
      course_id: true,
      program_id: true,
      course: {
        select: {
          course_scope: true,
          program_id: true,
          cilos: {
            where: { is_active: true },
            select: {
              cilo_mappings: {
                select: {
                  manifestation: true,
                  go: { select: { id: true, program_id: true, is_active: true } },
                },
              },
              cilo_institutional_outcome_mappings: {
                select: {
                  manifestation: true,
                  institutional_outcome: { select: { id: true, is_active: true } },
                },
              },
            },
          },
        },
      },
      program: {
        select: {
          id: true,
          name: true,
          gos: { where: { is_active: true }, select: { id: true } },
        },
      },
    },
  });

  const contexts = new Map<
    string,
    {
      programId: string;
      programName: string;
      courseScope: CourseScope;
      program_id: string | null;
      cilos: ReadinessCilo[];
      activeGoIds: string[];
    }
  >();

  for (const assignment of assignments) {
    if (
      assignment.course.course_scope === "PROGRAM_SPECIFIC" &&
      assignment.course.program_id !== assignment.program_id
    ) {
      continue;
    }

    const key = `${assignment.course_id}:${assignment.program_id}`;
    if (!contexts.has(key)) {
      contexts.set(key, {
        programId: assignment.program.id,
        programName: assignment.program.name,
        courseScope: assignment.course.course_scope,
        program_id: assignment.course.program_id,
        cilos: assignment.course.cilos as ReadinessCilo[],
        activeGoIds: assignment.program.gos.map((go) => go.id),
      });
    }
  }

  const totals = new Map<string, ProgramReadinessTotal>();
  for (const context of contexts.values()) {
    const total = totals.get(context.programId) ?? {
      programId: context.programId,
      programName: context.programName,
      activeContexts: 0,
      readyContexts: 0,
      missingCiloContexts: 0,
      incompleteMappingContexts: 0,
    };
    const state = classifyCourseAlignment(
      context.cilos,
      context.courseScope,
      context.program_id,
      context.activeGoIds
    );

    total.activeContexts += 1;
    if (state === "ready") total.readyContexts += 1;
    if (state === "missing-cilos") total.missingCiloContexts += 1;
    if (state === "incomplete-mapping") total.incompleteMappingContexts += 1;
    totals.set(context.programId, total);
  }

  return [...totals.values()].sort((a, b) => a.programName.localeCompare(b.programName));
}

export async function readPeriodReadiness(periodId: string): Promise<PeriodReadiness> {
  const period = await prisma.academicTermInstance.findUnique({
    where: { id: periodId },
    select: { status: true },
  });
  if (!period) throw new Error("Academic period not found");
  if (period.status !== "ACTIVE" && period.status !== "COMPLETED")
    throw new Error("Academic period is not eligible for readiness");
  if (period.status === "COMPLETED") {
    const snapshot = await prisma.academicPeriodReadinessSnapshot.findUnique({
      where: { period_id: periodId },
    });
    if (!snapshot) throw new Error("Academic period readiness snapshot not found");
    return {
      period: { id: periodId, status: period.status },
      // Legacy snapshots keep version 1 semantics; new snapshots carry typed payloads.
      schemaVersion: snapshot.schema_version,
      contexts: snapshot.contexts as ReadinessContext[],
      programTotals: snapshot.program_totals as ProgramReadinessTotal[],
    };
  }
  return calculateLive(periodId, prisma);
}

export async function readPeriodReadinessTotals(
  periodId: string
): Promise<ProgramReadinessTotal[]> {
  const period = await prisma.academicTermInstance.findUnique({
    where: { id: periodId },
    select: { status: true },
  });
  if (!period) throw new Error("Academic period not found");
  if (period.status !== "ACTIVE" && period.status !== "COMPLETED") {
    throw new Error("Academic period is not eligible for readiness");
  }
  if (period.status === "COMPLETED") {
    const snapshot = await prisma.academicPeriodReadinessSnapshot.findUnique({
      where: { period_id: periodId },
      select: { program_totals: true },
    });
    if (!snapshot) throw new Error("Academic period readiness snapshot not found");
    return snapshot.program_totals as ProgramReadinessTotal[];
  }
  return calculateLiveTotals(periodId);
}

export async function persistPeriodReadinessSnapshot(
  periodId: string,
  db: Prisma.TransactionClient = prisma
): Promise<void> {
  const readiness = await calculateLive(periodId, db, true);
  await db.academicPeriodReadinessSnapshot.create({
    data: {
      period_id: periodId,
      contexts: readiness.contexts,
      program_totals: readiness.programTotals,
      schema_version: READINESS_SNAPSHOT_SCHEMA_VERSION,
    },
  });
}
