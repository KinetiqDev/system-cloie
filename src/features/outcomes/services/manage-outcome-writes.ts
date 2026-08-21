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
  | { kind: "PLO"; action: "create"; programId: string; code: string; description: string }
  | {
      kind: "PLO";
      action: "update";
      programId: string;
      id: string;
      code: string;
      description: string;
    }
  | { kind: "PLO"; action: "archive" | "restore"; programId: string; id: string }
  | { kind: "PLO"; action: "reorder"; programId: string; orderedIds: string[] }
  | { kind: "ILO"; action: "create"; code: string; description: string }
  | { kind: "ILO"; action: "update"; id: string; code: string; description: string }
  | { kind: "ILO"; action: "archive" | "restore"; id: string }
  | { kind: "ILO"; action: "reorder"; orderedIds: string[] }
  | { kind: "CILO"; action: "create"; courseId: string; description: string }
  | { kind: "CILO"; action: "update"; id: string; description: string }
  | { kind: "CILO"; action: "archive" | "restore"; id: string };

type PLOWriteInput = Extract<OutcomeWriteInput, { kind: "PLO" }>;

type ILOWriteInput = Extract<OutcomeWriteInput, { kind: "ILO" }>;

type CiloWriteInput = Extract<OutcomeWriteInput, { kind: "CILO" }>;

type ReviewValue = unknown;
type OutcomeWriteReview = {
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

async function scopeAllowsILO(input: ILOWriteInput, role: WriterRole): Promise<boolean> {
  return role === ROLES.GEN_ED_COORDINATOR;
}

async function scopeAllowsPLO(
  input: PLOWriteInput,
  role: WriterRole,
  db: Prisma.TransactionClient | typeof prisma
): Promise<boolean> {
  if (role !== ROLES.PROGRAM_HEAD) return false;
  if (input.action === "create" || input.action === "reorder") return true;
  const plo = await db.pLO.findUnique({ where: { id: input.id }, select: { program_id: true } });
  return plo?.program_id === input.programId;
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

async function scopeAllows(
  input: OutcomeWriteInput,
  userId: string,
  role: WriterRole,
  db: Prisma.TransactionClient | typeof prisma = prisma
): Promise<boolean> {
  switch (input.kind) {
    case "PLO":
      return scopeAllowsPLO(input, role, db);
    case "ILO":
      return scopeAllowsILO(input, role);
    case "CILO":
      return scopeAllowsCilo(input, userId, role, db);
  }
}

async function readPLOState(
  input: PLOWriteInput,
  db: Prisma.TransactionClient | typeof prisma
): Promise<ReviewValue> {
  if (input.action === "create")
    return db.pLO.findMany({
      where: { program_id: input.programId },
      select: { code: true, description: true, order: true, program_id: true, is_active: true },
      orderBy: { order: "asc" },
    });
  if (input.action === "reorder")
    return db.pLO.findMany({
      where: { program_id: input.programId },
      select: { id: true, order: true },
      orderBy: { order: "asc" },
    });
  return db.pLO.findUnique({
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

async function readILOState(
  input: ILOWriteInput,
  db: Prisma.TransactionClient | typeof prisma
): Promise<ReviewValue> {
  if (input.action === "create")
    return db.institutionalOutcome.findMany({
      select: { code: true, description: true, order: true, is_active: true },
      orderBy: { order: "asc" },
    });
  if (input.action === "reorder")
    return db.institutionalOutcome.findMany({
      select: { id: true, order: true },
      orderBy: { order: "asc" },
    });
  return db.institutionalOutcome.findUnique({
    where: { id: input.id },
    select: { id: true, code: true, description: true, order: true, is_active: true },
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

async function readState(
  input: OutcomeWriteInput,
  db: Prisma.TransactionClient | typeof prisma = prisma
): Promise<ReviewValue> {
  switch (input.kind) {
    case "PLO":
      return readPLOState(input, db);
    case "ILO":
      return readILOState(input, db);
    case "CILO":
      return readCiloState(input, db);
  }
}

function nextPLOState(input: PLOWriteInput, before: ReviewValue): ReviewValue {
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

function nextILOState(input: ILOWriteInput, before: ReviewValue): ReviewValue {
  if (input.action === "create") {
    const existing = before as Array<Record<string, unknown>>;
    return [
      ...existing,
      {
        code: input.code.trim().toUpperCase(),
        description: input.description.trim(),
        order: existing.length,
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

function nextState(input: OutcomeWriteInput, before: ReviewValue, userId: string): ReviewValue {
  switch (input.kind) {
    case "PLO":
      return nextPLOState(input, before);
    case "ILO":
      return nextILOState(input, before);
    case "CILO":
      return nextCiloState(input, before, userId);
  }
}

export async function prepareOutcomeWrite(
  input: OutcomeWriteInput
): Promise<ServiceResult<OutcomeWriteReview>> {
  const session = await resolveAuthSession();
  const role = session?.activeRole;
  const allowed =
    (role === ROLES.PROGRAM_HEAD && input.kind === "PLO") ||
    (role === ROLES.GEN_ED_COORDINATOR && input.kind === "ILO") ||
    (role === ROLES.FACULTY && input.kind === "CILO");
  if (!session || !allowed) return failure("You do not have permission to modify this outcome.");
  if (role === ROLES.PROGRAM_HEAD && input.kind === "PLO") {
    const contextResult = await resolveProgramHeadContext(input.programId);
    if (!contextResult.success || !(await scopeAllows(input, session.userId, role)))
      return failure("You do not have permission to modify this outcome.");
  } else if (!(await scopeAllows(input, session.userId, role))) {
    return failure("You do not have permission to modify this outcome.");
  }
  const before = await readState(input);
  if (input.action !== "create" && !before) return failure("Outcome record was not found.");
  const after = nextState(input, before, session.userId);
  const unsigned = {
    input,
    before,
    after,
    freshnessToken: token(before),
  };
  return { success: true, data: { ...unsigned, signature: signReview(unsigned, session.userId) } };
}

async function writeILO(
  tx: Prisma.TransactionClient,
  input: ILOWriteInput,
  current: ReviewValue
): Promise<ServiceResult<{ id?: string }>> {
  if (input.action === "create") {
    return {
      success: true,
      data: {
        id: (
          await tx.institutionalOutcome.create({
            data: {
              code: input.code.trim().toUpperCase(),
              description: input.description.trim(),
              order: (current as unknown[]).length,
            },
          })
        ).id,
      },
    };
  }
  if (input.action === "reorder") {
    const ilos = current as Array<{ id: string; order: number }>;
    if (
      new Set(input.orderedIds).size !== input.orderedIds.length ||
      ilos.length !== input.orderedIds.length ||
      ilos.some((ilo) => !input.orderedIds.includes(ilo.id))
    )
      return failure("Institutional Outcomes must be a complete unique college-wide order.");
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
  return {
    success: true,
    data: {
      id: (await tx.institutionalOutcome.update({ where: { id: input.id }, data })).id,
    },
  };
}

async function writePLO(
  tx: Prisma.TransactionClient,
  input: PLOWriteInput,
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
          await tx.pLO.create({
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
    const plos = current as Array<{ id: string; order: number }>;
    if (
      new Set(input.orderedIds).size !== input.orderedIds.length ||
      plos.length !== input.orderedIds.length ||
      plos.some((plo) => !input.orderedIds.includes(plo.id))
    )
      return failure("Program Learning Outcomes must be a complete unique program order.");
    await Promise.all(
      input.orderedIds.map((id, order) => tx.pLO.update({ where: { id }, data: { order } }))
    );
    return { success: true, data: {} };
  }
  const data =
    input.action === "update"
      ? { code: input.code.trim().toUpperCase(), description: input.description.trim() }
      : { is_active: input.action === "restore" };
  return {
    success: true,
    data: { id: (await tx.pLO.update({ where: { id: input.id }, data })).id },
  };
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

async function programHeadAssignmentIsCurrent(
  tx: Prisma.TransactionClient,
  input: OutcomeWriteInput,
  userId: string,
  role: WriterRole
): Promise<boolean> {
  if (role !== ROLES.PROGRAM_HEAD || input.kind !== "PLO") return true;
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
  userId: string
): Promise<ServiceResult<{ id?: string }>> {
  switch (input.kind) {
    case "PLO":
      return writePLO(tx, input, current);
    case "ILO":
      return writeILO(tx, input, current);
    case "CILO":
      return writeCilo(tx, input, userId);
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
  return writeReviewedOutcome(tx, review.input, current, userId);
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
      if (review.input.kind === "ILO") {
        return failure("Institutional Outcome code already exists.");
      }
      return failure("Program Learning Outcome code already exists.");
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034")
      return failure("Outcome changed; prepare a new review.");
    throw error;
  }
}
