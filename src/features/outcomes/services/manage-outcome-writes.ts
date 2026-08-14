import { Prisma } from "@prisma/client";
import { createHmac, timingSafeEqual } from "node:crypto";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import {
  revalidateProgramHeadAssignment,
  resolveProgramHeadContext,
} from "@/features/auth/services/resolve-program-head-context";
import { ROLES } from "@/lib/constants/roles";
import { prisma } from "@/lib/db/prisma";
import type { ServiceResult } from "@/lib/utils/service-result";
import { isUniqueConstraintError } from "@/lib/utils/prisma-errors";
import { getConfirmationSecret } from "@/lib/utils/confirmation-secret";

type WriterRole = (typeof ROLES)[keyof typeof ROLES];

export type OutcomeWriteInput =
  | { kind: "GO"; action: "create"; programId: string; code: string; description: string }
  | {
      kind: "GO";
      action: "update";
      programId: string;
      id: string;
      code: string;
      description: string;
    }
  | { kind: "GO"; action: "archive" | "restore"; programId: string; id: string }
  | { kind: "GO"; action: "reorder"; programId: string; orderedIds: string[] }
  | { kind: "CILO"; action: "create"; courseId: string; description: string }
  | { kind: "CILO"; action: "update"; id: string; description: string }
  | { kind: "CILO"; action: "archive" | "restore"; id: string }
  | { kind: "MAPPING"; action: "create"; programId: string; ciloId: string; goId: string }
  | { kind: "MAPPING"; action: "remove"; programId: string; id: string }
  | { kind: "ILO_MAPPING"; action: "create"; ciloId: string; iloId: string }
  | { kind: "ILO_MAPPING"; action: "remove"; id: string }
  | { kind: "ILO"; action: "create"; code: string; description: string }
  | { kind: "ILO"; action: "update"; id: string; code: string; description: string }
  | { kind: "ILO"; action: "archive" | "restore"; id: string }
  | { kind: "ILO"; action: "reorder"; orderedIds: string[] };

type GoWriteInput = Extract<OutcomeWriteInput, { kind: "GO" }>;

type MappingScopeContext = {
  courseId: string;
  course: {
    course_scope: "GENERAL_EDUCATION" | "PROGRAM_SPECIFIC";
    program_id: string | null;
    course_assignments: Array<{ id: string }>;
  };
  goProgramId: string | null;
};
type IloWriteInput = Extract<OutcomeWriteInput, { kind: "ILO" }>;
type CiloWriteInput = Extract<OutcomeWriteInput, { kind: "CILO" }>;
type MappingWriteInput = Extract<OutcomeWriteInput, { kind: "MAPPING" }>;
type IloMappingWriteInput = Extract<OutcomeWriteInput, { kind: "ILO_MAPPING" }>;

type ReviewValue = unknown;
export type OutcomeWriteReview = {
  input: OutcomeWriteInput;
  before: ReviewValue;
  after: ReviewValue;
  freshnessToken: string;
  signature: string;
};

function token(value: unknown): string {
  return JSON.stringify(value);
}

function signReview(review: Omit<OutcomeWriteReview, "signature">, userId: string): string {
  return createHmac("sha256", getConfirmationSecret())
    .update(token({ ...review, userId }))
    .digest("hex");
}

function reviewIsValid(review: OutcomeWriteReview, userId: string): boolean {
  const expected = signReview(
    {
      input: review.input,
      before: review.before,
      after: review.after,
      freshnessToken: review.freshnessToken,
    },
    userId
  );
  const actual = Buffer.from(review.signature, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  return actual.length === expectedBuffer.length && timingSafeEqual(actual, expectedBuffer);
}

function failure(error: string): ServiceResult<never> {
  return { success: false, error };
}

async function scopeAllowsGo(
  input: GoWriteInput,
  role: WriterRole,
  db: Prisma.TransactionClient | typeof prisma
): Promise<boolean> {
  if (role !== ROLES.PROGRAM_HEAD) return false;
  if (input.action === "create" || input.action === "reorder") return true;
  const go = await db.gO.findUnique({ where: { id: input.id }, select: { program_id: true } });
  return go?.program_id === input.programId;
}

async function scopeAllowsCilo(
  input: CiloWriteInput,
  userId: string,
  role: WriterRole,
  db: Prisma.TransactionClient | typeof prisma
): Promise<boolean> {
  const courseId =
    "courseId" in input
      ? input.courseId
      : await db.cILO
          .findUnique({ where: { id: input.id }, select: { course_id: true } })
          .then((cilo) => cilo?.course_id);
  return (
    role === ROLES.FACULTY &&
    Boolean(courseId) &&
    Boolean(
      await db.courseAssignment.findFirst({
        where: {
          faculty_id: userId,
          course_id: courseId,
          is_active: true,
          term_instance: { status: "ACTIVE" },
        },
      })
    )
  );
}

async function readMappingScope(
  input: MappingWriteInput,
  db: Prisma.TransactionClient | typeof prisma
): Promise<MappingScopeContext | null> {
  if (input.action === "create") {
    const cilo = await db.cILO.findUnique({
      where: { id: input.ciloId },
      select: {
        course_id: true,
        course: {
          select: {
            course_scope: true,
            program_id: true,
            course_assignments: {
              where: {
                program_id: input.programId,
                is_active: true,
                term_instance: { status: "ACTIVE" },
              },
              select: { id: true },
            },
          },
        },
      },
    });
    return cilo ? { courseId: cilo.course_id, course: cilo.course, goProgramId: null } : null;
  }

  const mapping = await db.cILOMapping.findUnique({
    where: { id: input.id },
    select: {
      cilo: {
        select: {
          course_id: true,
          course: {
            select: {
              course_scope: true,
              program_id: true,
              course_assignments: {
                where: {
                  program_id: input.programId,
                  is_active: true,
                  term_instance: { status: "ACTIVE" },
                },
                select: { id: true },
              },
            },
          },
        },
      },
      go: { select: { program_id: true } },
    },
  });
  return mapping
    ? {
        courseId: mapping.cilo.course_id,
        course: mapping.cilo.course,
        goProgramId: mapping.go.program_id,
      }
    : null;
}

async function facultyHasActiveCourseAssignment(
  userId: string,
  courseId: string,
  db: Prisma.TransactionClient | typeof prisma
): Promise<boolean> {
  return Boolean(
    await db.courseAssignment.findFirst({
      where: {
        faculty_id: userId,
        course_id: courseId,
        is_active: true,
        term_instance: { status: "ACTIVE" },
      },
    })
  );
}

function programHeadHasCourseScope(
  input: MappingWriteInput,
  mapping: MappingScopeContext
): boolean {
  if (input.action === "remove" && mapping.goProgramId !== input.programId) return false;
  if (mapping.course.course_scope === "GENERAL_EDUCATION")
    return mapping.course.course_assignments.length > 0;
  return mapping.course.program_id === input.programId;
}

async function mappingGoId(
  input: MappingWriteInput,
  db: Prisma.TransactionClient | typeof prisma
): Promise<string | undefined> {
  if (input.action === "create") return input.goId;
  return (await db.cILOMapping.findUnique({ where: { id: input.id }, select: { go_id: true } }))
    ?.go_id;
}

async function programHeadHasMappedGo(
  input: MappingWriteInput,
  db: Prisma.TransactionClient | typeof prisma
): Promise<boolean> {
  const goId = await mappingGoId(input, db);
  if (!goId) return false;
  const go = await db.gO.findUnique({ where: { id: goId }, select: { program_id: true } });
  return go?.program_id === input.programId;
}

async function programHeadHasMappingScope(
  input: MappingWriteInput,
  mapping: MappingScopeContext,
  db: Prisma.TransactionClient | typeof prisma
): Promise<boolean> {
  return programHeadHasCourseScope(input, mapping) && (await programHeadHasMappedGo(input, db));
}
async function scopeAllowsMapping(
  input: MappingWriteInput,
  userId: string,
  role: WriterRole,
  db: Prisma.TransactionClient | typeof prisma
): Promise<boolean> {
  const mapping = await readMappingScope(input, db);
  if (!mapping) return false;
  if (role === ROLES.FACULTY) return facultyHasActiveCourseAssignment(userId, mapping.courseId, db);
  if (role === ROLES.PROGRAM_HEAD) return programHeadHasMappingScope(input, mapping, db);
  return false;
}

async function readIloMappingScope(
  input: IloMappingWriteInput,
  db: Prisma.TransactionClient | typeof prisma
): Promise<{ courseId: string; courseScope: "GENERAL_EDUCATION" | "PROGRAM_SPECIFIC" } | null> {
  const ciloId =
    input.action === "create"
      ? input.ciloId
      : await db.cILOInstitutionalOutcomeMapping
          .findUnique({ where: { id: input.id }, select: { cilo_id: true } })
          .then((mapping) => mapping?.cilo_id);
  if (!ciloId) return null;
  const cilo = await db.cILO.findUnique({
    where: { id: ciloId },
    select: { course_id: true, course: { select: { course_scope: true } } },
  });
  return cilo ? { courseId: cilo.course_id, courseScope: cilo.course.course_scope } : null;
}

async function scopeAllowsIloMapping(
  input: IloMappingWriteInput,
  userId: string,
  role: WriterRole,
  db: Prisma.TransactionClient | typeof prisma
): Promise<boolean> {
  if (role !== ROLES.FACULTY) return false;
  const scope = await readIloMappingScope(input, db);
  if (!scope || scope.courseScope !== "GENERAL_EDUCATION") return false;
  return facultyHasActiveCourseAssignment(userId, scope.courseId, db);
}

async function scopeAllows(
  input: OutcomeWriteInput,
  userId: string,
  role: WriterRole,
  db: Prisma.TransactionClient | typeof prisma = prisma
): Promise<boolean> {
  if (role === ROLES.SECRETARY) return true;
  if (input.kind === "ILO") return false;
  switch (input.kind) {
    case "GO":
      return scopeAllowsGo(input, role, db);
    case "CILO":
      return scopeAllowsCilo(input, userId, role, db);
    case "MAPPING":
      return scopeAllowsMapping(input, userId, role, db);
    case "ILO_MAPPING":
      return scopeAllowsIloMapping(input, userId, role, db);
  }
}

async function readGoState(
  input: GoWriteInput,
  db: Prisma.TransactionClient | typeof prisma
): Promise<ReviewValue> {
  if (input.action === "create")
    return db.gO.findMany({
      where: { program_id: input.programId },
      select: { code: true, description: true, order: true, program_id: true, is_active: true },
      orderBy: { order: "asc" },
    });
  if (input.action === "reorder")
    return db.gO.findMany({
      where: { program_id: input.programId },
      select: { id: true, order: true },
      orderBy: { order: "asc" },
    });
  return db.gO.findUnique({
    where: { id: input.id },
    select: {
      id: true,
      code: true,
      description: true,
      order: true,
      program_id: true,
      is_active: true,
    },
  });
}

async function readCiloState(
  input: CiloWriteInput,
  db: Prisma.TransactionClient | typeof prisma
): Promise<ReviewValue> {
  if (input.action === "create")
    return db.cILO.findMany({
      where: { course_id: input.courseId },
      select: { description: true, course_id: true, created_by: true, is_active: true },
      orderBy: { created_at: "asc" },
    });
  return db.cILO.findUnique({
    where: { id: input.id },
    select: { id: true, description: true, course_id: true, is_active: true },
  });
}

async function readIloState(
  input: IloWriteInput,
  db: Prisma.TransactionClient | typeof prisma
): Promise<ReviewValue> {
  if (input.action === "create")
    return db.institutionalOutcome.findMany({
      select: { code: true, description: true, order: true, is_active: true },
      orderBy: [{ order: "asc" }, { code: "asc" }],
    });
  if (input.action === "reorder")
    return db.institutionalOutcome.findMany({
      select: {
        id: true,
        code: true,
        description: true,
        order: true,
        is_active: true,
        updated_at: true,
      },
      orderBy: [{ order: "asc" }, { code: "asc" }],
    });
  return db.institutionalOutcome.findUnique({
    where: { id: input.id },
    select: {
      id: true,
      code: true,
      description: true,
      order: true,
      is_active: true,
      updated_at: true,
    },
  });
}

async function readMappingState(
  input: MappingWriteInput,
  db: Prisma.TransactionClient | typeof prisma
): Promise<ReviewValue> {
  if (input.action === "create")
    return db.cILOMapping.findUnique({
      where: { cilo_id_go_id: { cilo_id: input.ciloId, go_id: input.goId } },
      select: { id: true, cilo_id: true, go_id: true },
    });
  return db.cILOMapping.findUnique({
    where: { id: input.id },
    select: { id: true, cilo_id: true, go_id: true },
  });
}

async function readIloMappingState(
  input: IloMappingWriteInput,
  db: Prisma.TransactionClient | typeof prisma
): Promise<ReviewValue> {
  if (input.action === "create")
    return db.cILOInstitutionalOutcomeMapping.findUnique({
      where: {
        cilo_id_institutional_outcome_id: {
          cilo_id: input.ciloId,
          institutional_outcome_id: input.iloId,
        },
      },
      select: { id: true, cilo_id: true, institutional_outcome_id: true },
    });
  return db.cILOInstitutionalOutcomeMapping.findUnique({
    where: { id: input.id },
    select: { id: true, cilo_id: true, institutional_outcome_id: true },
  });
}

async function readState(
  input: OutcomeWriteInput,
  db: Prisma.TransactionClient | typeof prisma = prisma
): Promise<ReviewValue> {
  switch (input.kind) {
    case "GO":
      return readGoState(input, db);
    case "CILO":
      return readCiloState(input, db);
    case "ILO":
      return readIloState(input, db);
    case "MAPPING":
      return readMappingState(input, db);
    case "ILO_MAPPING":
      return readIloMappingState(input, db);
  }
}

function nextGoState(input: GoWriteInput, before: ReviewValue): ReviewValue {
  if (input.action === "create") {
    const existing = before as Array<Record<string, unknown>>;
    return [
      ...existing,
      {
        code: input.code.trim().toUpperCase(),
        description: input.description.trim(),
        order: existing.length,
        program_id: input.programId,
        is_active: true,
      },
    ];
  }
  if (input.action === "reorder") return input.orderedIds.map((id, order) => ({ id, order }));
  if (!before) return null;
  const record = before as Record<string, unknown>;
  if (input.action === "archive" || input.action === "restore")
    return { ...record, is_active: input.action === "restore" };
  if (input.action === "update")
    return {
      ...record,
      code: input.code.trim().toUpperCase(),
      description: input.description.trim(),
    };
  return record;
}

function nextCiloState(input: CiloWriteInput, before: ReviewValue, userId: string): ReviewValue {
  if (input.action === "create")
    return [
      ...(before as Array<Record<string, unknown>>),
      {
        description: input.description.trim(),
        course_id: input.courseId,
        created_by: userId,
        is_active: true,
      },
    ];
  if (!before) return null;
  const record = before as Record<string, unknown>;
  if (input.action === "archive" || input.action === "restore")
    return { ...record, is_active: input.action === "restore" };
  if (input.action === "update") return { ...record, description: input.description.trim() };
  return record;
}

function reorderedIloState(
  before: ReviewValue,
  orderedIds: string[]
): Array<Record<string, unknown>> | null {
  if (!Array.isArray(before) || before.length !== orderedIds.length) return null;
  if (new Set(orderedIds).size !== orderedIds.length) return null;
  const outcomes = before as Array<Record<string, unknown>>;
  const outcomesById = new Map(outcomes.map((outcome) => [String(outcome.id), outcome]));
  const reordered = orderedIds.map((id) => outcomesById.get(id));
  if (reordered.some((outcome) => !outcome)) return null;
  return reordered.map((outcome, order) => ({ ...outcome!, order }));
}

function nextIloState(input: IloWriteInput, before: ReviewValue): ReviewValue {
  if (input.action === "create") {
    const existing = before as Array<Record<string, unknown>>;
    const nextOrder =
      existing.reduce((highest, outcome) => Math.max(highest, Number(outcome.order)), -1) + 1;
    return [
      ...existing,
      {
        code: input.code.trim().toUpperCase(),
        description: input.description.trim(),
        order: nextOrder,
        is_active: true,
      },
    ];
  }
  if (input.action === "reorder") return reorderedIloState(before, input.orderedIds);
  if (!before) return null;
  const record = before as Record<string, unknown>;
  if (input.action === "archive" || input.action === "restore")
    return { ...record, is_active: input.action === "restore" };
  if (input.action === "update")
    return {
      ...record,
      code: input.code.trim().toUpperCase(),
      description: input.description.trim(),
    };
  return record;
}

function nextMappingState(input: MappingWriteInput, before: ReviewValue): ReviewValue {
  if (input.action === "create") return { cilo_id: input.ciloId, go_id: input.goId };
  if (input.action === "remove") return null;
  return before;
}

function nextIloMappingState(input: IloMappingWriteInput, before: ReviewValue): ReviewValue {
  if (input.action === "create")
    return { cilo_id: input.ciloId, institutional_outcome_id: input.iloId };
  if (input.action === "remove") return null;
  return before;
}

function nextState(input: OutcomeWriteInput, before: ReviewValue, userId: string): ReviewValue {
  switch (input.kind) {
    case "GO":
      return nextGoState(input, before);
    case "CILO":
      return nextCiloState(input, before, userId);
    case "ILO":
      return nextIloState(input, before);
    case "MAPPING":
      return nextMappingState(input, before);
    case "ILO_MAPPING":
      return nextIloMappingState(input, before);
  }
}

export async function prepareOutcomeWrite(
  input: OutcomeWriteInput
): Promise<ServiceResult<OutcomeWriteReview>> {
  const session = await resolveAuthSession();
  const role = session?.activeRole;
  if (
    !session ||
    (input.kind === "ILO" && session.profileGate.status !== "COMPLETE") ||
    (role !== ROLES.SECRETARY && role !== ROLES.PROGRAM_HEAD && role !== ROLES.FACULTY)
  )
    return failure("You do not have permission to modify this outcome.");
  if (role === ROLES.PROGRAM_HEAD && "programId" in input) {
    const contextResult = await resolveProgramHeadContext(input.programId);
    if (!contextResult.success || !(await scopeAllows(input, session.userId, role)))
      return failure("You do not have permission to modify this outcome.");
  } else if (!(await scopeAllows(input, session.userId, role))) {
    return failure("You do not have permission to modify this outcome.");
  }
  const before = await readState(input);
  if (input.action !== "create" && !before) return failure("Outcome record was not found.");
  if (input.kind === "MAPPING" && input.action === "create") {
    const validation = await import("./manage-cilo-mappings").then(({ validateCiloMapping }) =>
      validateCiloMapping(input.ciloId, input.goId)
    );
    if (!validation.success) return validation as ServiceResult<never>;
    if (before) return failure("CILO-to-GO mapping already exists.");
  }
  if (input.kind === "ILO_MAPPING" && input.action === "create") {
    const validation = await import("./manage-cilo-mappings").then(
      ({ validateCiloInstitutionalOutcomeMapping }) =>
        validateCiloInstitutionalOutcomeMapping(input.ciloId, input.iloId)
    );
    if (!validation.success) return validation as ServiceResult<never>;
    if (before) return failure("CILO-to-Institutional Outcome mapping already exists.");
  }
  const after = nextState(input, before, session.userId);
  if (input.kind === "ILO" && input.action === "reorder" && !after)
    return failure("Institutional Outcome order must contain each catalog outcome exactly once.");
  const unsigned = {
    input,
    before,
    after,
    freshnessToken: token(before),
  };
  return { success: true, data: { ...unsigned, signature: signReview(unsigned, session.userId) } };
}

async function writeGo(
  tx: Prisma.TransactionClient,
  input: GoWriteInput,
  current: ReviewValue
): Promise<ServiceResult<{ id?: string }>> {
  if (input.action === "create") {
    const program = await tx.program.findUnique({
      where: { id: input.programId },
      select: { is_active: true },
    });
    if (!program?.is_active) return failure("Active Academic Program is required.");
    return {
      success: true,
      data: {
        id: (
          await tx.gO.create({
            data: {
              code: input.code.trim().toUpperCase(),
              description: input.description.trim(),
              order: (current as unknown[]).length,
              program_id: input.programId,
            },
          })
        ).id,
      },
    };
  }
  if (input.action === "reorder") {
    const gos = current as Array<{ id: string; order: number }>;
    if (
      new Set(input.orderedIds).size !== input.orderedIds.length ||
      gos.length !== input.orderedIds.length ||
      gos.some((go) => !input.orderedIds.includes(go.id))
    )
      return failure("Graduate Outcomes must be a complete unique program order.");
    await Promise.all(
      input.orderedIds.map((id, order) => tx.gO.update({ where: { id }, data: { order } }))
    );
    return { success: true, data: {} };
  }
  const data =
    input.action === "update"
      ? { code: input.code.trim().toUpperCase(), description: input.description.trim() }
      : { is_active: input.action === "restore" };
  return {
    success: true,
    data: { id: (await tx.gO.update({ where: { id: input.id }, data })).id },
  };
}

async function writeIlo(
  tx: Prisma.TransactionClient,
  input: IloWriteInput,
  current: ReviewValue
): Promise<ServiceResult<{ id?: string }>> {
  if (input.action === "create") {
    const nextOrder =
      (current as Array<{ order: number }>).reduce(
        (highest, outcome) => Math.max(highest, outcome.order),
        -1
      ) + 1;
    const created = await tx.institutionalOutcome.create({
      data: {
        code: input.code.trim().toUpperCase(),
        description: input.description.trim(),
        order: nextOrder,
      },
      select: { id: true },
    });
    return { success: true, data: { id: created.id } };
  }
  if (input.action === "reorder") {
    const outcomes = current as Array<{ id: string; order: number }>;
    if (
      new Set(input.orderedIds).size !== input.orderedIds.length ||
      outcomes.length !== input.orderedIds.length ||
      outcomes.some((outcome) => !input.orderedIds.includes(outcome.id))
    )
      return failure("Institutional Outcomes must be a complete unique order.");
    await Promise.all(
      input.orderedIds.map((id, order) =>
        tx.institutionalOutcome.update({ where: { id }, data: { order } })
      )
    );
    return { success: true, data: {} };
  }
  const data =
    input.action === "update"
      ? { code: input.code.trim().toUpperCase(), description: input.description.trim() }
      : { is_active: input.action === "restore" };
  const updated = await tx.institutionalOutcome.update({
    where: { id: input.id },
    data,
    select: { id: true },
  });
  return { success: true, data: { id: updated.id } };
}

async function writeCilo(
  tx: Prisma.TransactionClient,
  input: CiloWriteInput,
  userId: string
): Promise<ServiceResult<{ id?: string }>> {
  if (input.action === "create") {
    const course = await tx.course.findUnique({
      where: { id: input.courseId },
      select: { is_active: true },
    });
    if (!course?.is_active) return failure("Active Course is required.");
    return {
      success: true,
      data: {
        id: (
          await tx.cILO.create({
            data: {
              course_id: input.courseId,
              description: input.description.trim(),
              created_by: userId,
            },
          })
        ).id,
      },
    };
  }
  const data =
    input.action === "update"
      ? { description: input.description.trim() }
      : { is_active: input.action === "restore" };
  return {
    success: true,
    data: { id: (await tx.cILO.update({ where: { id: input.id }, data })).id },
  };
}

type ActiveMappingCreateRecords = {
  cilo: {
    course_id: string;
    course: { course_scope: "GENERAL_EDUCATION" | "PROGRAM_SPECIFIC"; program_id: string | null };
  };
  go: { program_id: string };
};

async function readActiveMappingCreateRecords(
  tx: Prisma.TransactionClient,
  input: Extract<MappingWriteInput, { action: "create" }>
): Promise<ActiveMappingCreateRecords | null> {
  const [cilo, go] = await Promise.all([
    tx.cILO.findUnique({
      where: { id: input.ciloId },
      select: {
        is_active: true,
        course_id: true,
        course: { select: { is_active: true, course_scope: true, program_id: true } },
      },
    }),
    tx.gO.findUnique({
      where: { id: input.goId },
      select: { is_active: true, program_id: true },
    }),
  ]);
  if (!cilo?.is_active || !cilo.course.is_active || !go?.is_active) return null;
  return { cilo, go };
}

function programSpecificMappingIsValid(records: ActiveMappingCreateRecords): boolean {
  return (
    records.cilo.course.course_scope !== "PROGRAM_SPECIFIC" ||
    records.cilo.course.program_id === records.go.program_id
  );
}

async function programHeadCanCreateMapping(
  tx: Prisma.TransactionClient,
  input: Extract<MappingWriteInput, { action: "create" }>,
  records: ActiveMappingCreateRecords
): Promise<boolean> {
  if (records.go.program_id !== input.programId) return false;
  if (records.cilo.course.course_scope !== "GENERAL_EDUCATION") return true;
  return Boolean(
    await tx.courseAssignment.findFirst({
      where: {
        course_id: records.cilo.course_id,
        program_id: input.programId,
        is_active: true,
        term_instance: { status: "ACTIVE" },
      },
      select: { id: true },
    })
  );
}

async function mappingCreateError(
  tx: Prisma.TransactionClient,
  input: Extract<MappingWriteInput, { action: "create" }>,
  role: WriterRole
): Promise<string | null> {
  const records = await readActiveMappingCreateRecords(tx, input);
  if (!records) return "Active CILO, Course, and Graduate Outcome are required.";
  if (records.cilo.course.course_scope === "GENERAL_EDUCATION")
    return "General Education CILOs map only to Institutional Outcomes";
  if (role === ROLES.PROGRAM_HEAD && !(await programHeadCanCreateMapping(tx, input, records)))
    return "You do not have permission to modify this outcome.";
  if (!programSpecificMappingIsValid(records))
    return "Graduate Outcome must belong to the Course Academic Program";
  return null;
}

async function writeMapping(
  tx: Prisma.TransactionClient,
  input: MappingWriteInput,
  role: WriterRole,
  userId: string
): Promise<ServiceResult<{ id?: string }>> {
  if (input.action === "remove") {
    await tx.cILOMapping.delete({ where: { id: input.id } });
    return { success: true, data: {} };
  }
  const error = await mappingCreateError(tx, input, role);
  if (error) return failure(error);
  return {
    success: true,
    data: {
      id: (
        await tx.cILOMapping.create({
          data: {
            cilo_id: input.ciloId,
            go_id: input.goId,
            created_by: userId,
            updated_by: userId,
          },
        })
      ).id,
    },
  };
}

async function writeIloMapping(
  tx: Prisma.TransactionClient,
  input: IloMappingWriteInput,
  userId: string
): Promise<ServiceResult<{ id?: string }>> {
  if (input.action === "remove") {
    await tx.cILOInstitutionalOutcomeMapping.delete({ where: { id: input.id } });
    return { success: true, data: {} };
  }
  const [cilo, institutionalOutcome] = await Promise.all([
    tx.cILO.findUnique({
      where: { id: input.ciloId },
      select: { is_active: true, course: { select: { is_active: true, course_scope: true } } },
    }),
    tx.institutionalOutcome.findUnique({
      where: { id: input.iloId },
      select: { is_active: true },
    }),
  ]);
  if (!cilo?.is_active || !cilo.course.is_active || !institutionalOutcome?.is_active)
    return failure("Active CILO, Course, and Institutional Outcome are required.");
  if (cilo.course.course_scope !== "GENERAL_EDUCATION")
    return failure("Institutional Outcomes map only General Education CILOs");
  return {
    success: true,
    data: {
      id: (
        await tx.cILOInstitutionalOutcomeMapping.create({
          data: {
            cilo_id: input.ciloId,
            institutional_outcome_id: input.iloId,
            created_by: userId,
            updated_by: userId,
          },
        })
      ).id,
    },
  };
}

async function programHeadAssignmentIsCurrent(
  tx: Prisma.TransactionClient,
  input: OutcomeWriteInput,
  userId: string,
  role: WriterRole
): Promise<boolean> {
  if (role !== ROLES.PROGRAM_HEAD || !("programId" in input)) return true;
  return Boolean(
    await revalidateProgramHeadAssignment(tx, {
      userId,
      programId: input.programId,
    })
  );
}

function reviewMatchesCurrentState(
  review: OutcomeWriteReview,
  current: ReviewValue,
  userId: string
): boolean {
  return (
    token(current) === review.freshnessToken &&
    token(nextState(review.input, current, userId)) === token(review.after)
  );
}

function writeReviewedOutcome(
  tx: Prisma.TransactionClient,
  input: OutcomeWriteInput,
  current: ReviewValue,
  userId: string,
  role: WriterRole
): Promise<ServiceResult<{ id?: string }>> {
  switch (input.kind) {
    case "GO":
      return writeGo(tx, input, current);
    case "ILO":
      return writeIlo(tx, input, current);
    case "CILO":
      return writeCilo(tx, input, userId);
    case "MAPPING":
      return writeMapping(tx, input, role, userId);
    case "ILO_MAPPING":
      return writeIloMapping(tx, input, userId);
  }
}

async function commitReviewedOutcome(
  tx: Prisma.TransactionClient,
  review: OutcomeWriteReview,
  userId: string,
  role: WriterRole
): Promise<ServiceResult<{ id?: string }>> {
  if (!(await programHeadAssignmentIsCurrent(tx, review.input, userId, role)))
    return failure("You do not have permission to modify this outcome.");
  if (!(await scopeAllows(review.input, userId, role, tx)))
    return failure("You do not have permission to modify this outcome.");
  const current = await readState(review.input, tx);
  if (token(current) !== review.freshnessToken)
    return failure("Outcome changed after review. Prepare a new review.");
  if (!reviewMatchesCurrentState(review, current, userId))
    return failure("Outcome review does not match requested write.");
  return writeReviewedOutcome(tx, review.input, current, userId, role);
}

export async function commitOutcomeWrite(
  review: OutcomeWriteReview,
  confirmed: boolean
): Promise<ServiceResult<{ id?: string }>> {
  if (!confirmed) return failure("Explicit confirmation is required.");
  const session = await resolveAuthSession();
  const role = session?.activeRole;
  if (
    !session ||
    !role ||
    (review.input.kind === "ILO" && session.profileGate.status !== "COMPLETE") ||
    !reviewIsValid(review, session.userId)
  )
    return failure("You do not have permission to modify this outcome.");
  try {
    return await prisma.$transaction(
      (tx) => commitReviewedOutcome(tx, review, session.userId, role),
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return failure(
        review.input.kind === "MAPPING"
          ? "CILO-to-GO mapping already exists."
          : review.input.kind === "ILO_MAPPING"
            ? "CILO-to-Institutional Outcome mapping already exists."
            : review.input.kind === "ILO"
              ? "Institutional Outcome code already exists."
              : "Graduate Outcome code already exists."
      );
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034")
      return failure("Outcome changed; prepare a new review.");
    throw error;
  }
}
