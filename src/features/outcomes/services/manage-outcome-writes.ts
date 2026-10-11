import { Prisma, type POClassification } from "@prisma/client";
import { isAdministrativeCategory, isProgramHeadCategory } from "../po-classification";
import { poDetailsSchema } from "../schemas/po";
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
  | {
      kind: "PO";
      action: "create";
      programId: string;
      code: string;
      description: string;
      classification: POClassification;
      commonOutcomeId?: string | null;
    }
  | {
      kind: "PO";
      action: "update";
      programId: string;
      id: string;
      code: string;
      description: string;
      classification: POClassification;
      commonOutcomeId?: string | null;
    }
  | { kind: "PO"; action: "archive" | "restore"; programId: string; id: string }
  | { kind: "PO"; action: "reorder"; programId: string; orderedIds: string[] }
  | {
      kind: "COMMON_PO";
      action: "create";
      code: string;
      description: string;
      sourceRef?: string | null;
    }
  | {
      kind: "COMMON_PO";
      action: "update";
      id: string;
      code: string;
      description: string;
      sourceRef?: string | null;
    }
  | { kind: "COMMON_PO"; action: "archive" | "restore"; id: string }
  | { kind: "COMMON_PO"; action: "reorder"; orderedIds: string[] }
  | { kind: "ILO"; action: "create"; code: string; description: string }
  | { kind: "ILO"; action: "update"; id: string; code: string; description: string }
  | { kind: "ILO"; action: "archive" | "restore"; id: string }
  | { kind: "ILO"; action: "reorder"; orderedIds: string[] }
  | { kind: "CILO"; action: "create"; courseId: string; description: string }
  | { kind: "CILO"; action: "update"; id: string; description: string }
  | { kind: "CILO"; action: "archive" | "restore"; id: string };

type POWriteInput = Extract<OutcomeWriteInput, { kind: "PO" }>;

type CommonWriteInput = Extract<OutcomeWriteInput, { kind: "COMMON_PO" }>;

type ILOWriteInput = Extract<OutcomeWriteInput, { kind: "ILO" }>;

type CiloWriteInput = Extract<OutcomeWriteInput, { kind: "CILO" }>;

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

async function scopeAllowsILO(input: ILOWriteInput, role: WriterRole): Promise<boolean> {
  return role === ROLES.GEN_ED_COORDINATOR;
}

async function scopeAllowsPOClaim(
  input: Extract<POWriteInput, { action: "create" | "update" }>,
  admin: boolean,
  db: Prisma.TransactionClient | typeof prisma
): Promise<boolean> {
  if (!poDetailsSchema.safeParse(input).success) return false;
  const permitted = admin
    ? isAdministrativeCategory(input.classification)
    : isProgramHeadCategory(input.classification);
  if (!permitted) return false;
  if (input.classification !== "COMMON") return !input.commonOutcomeId;
  if (!input.commonOutcomeId) return false;
  const common = await db.commonProgramOutcome.findUnique({
    where: { id: input.commonOutcomeId },
  });
  return Boolean(common?.is_active) && common?.description === input.description.trim();
}

async function scopeAllowsStoredPO(
  input: Extract<POWriteInput, { action: "update" | "archive" | "restore" }>,
  admin: boolean,
  db: Prisma.TransactionClient | typeof prisma
): Promise<boolean> {
  const po = await db.pO.findUnique({
    where: { id: input.id },
    select: { program_id: true, classification: true },
  });
  if (po?.program_id !== input.programId) return false;
  const current = po.classification;
  // UNCLASSIFIED is the migration-only legacy state (ADR 0040): it has no
  // owner category, so either authorized role may claim the row by saving a
  // real classification; PH also keeps program-local archive/restore so a
  // legacy row is never locked by classification metadata alone.
  if (current === "UNCLASSIFIED") return true;
  return admin ? isAdministrativeCategory(current) : isProgramHeadCategory(current);
}

async function scopeAllowsPO(
  input: POWriteInput,
  role: WriterRole,
  db: Prisma.TransactionClient | typeof prisma
): Promise<boolean> {
  const admin = role === ROLES.SECRETARY || role === ROLES.DEAN;
  if (!admin && role !== ROLES.PROGRAM_HEAD) return false;
  if (input.action === "reorder") return true;
  if (input.action === "create") return scopeAllowsPOClaim(input, admin, db);
  // An update carries both a claim and an existing row: the claim must pass,
  // and the stored row must still be owned by the role writing it.
  if (input.action === "update") {
    if (!(await scopeAllowsPOClaim(input, admin, db))) return false;
    return scopeAllowsStoredPO(input, admin, db);
  }
  return scopeAllowsStoredPO(input, admin, db);
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
    case "COMMON_PO":
      return (
        (role === ROLES.SECRETARY || role === ROLES.DEAN) &&
        (!(input.action === "create" || input.action === "update") ||
          poDetailsSchema.safeParse(input).success)
      );
    case "PO":
      return scopeAllowsPO(input, role, db);
    case "ILO":
      return scopeAllowsILO(input, role);
    case "CILO":
      return scopeAllowsCilo(input, userId, role, db);
  }
}

async function readPOState(
  input: POWriteInput,
  db: Prisma.TransactionClient | typeof prisma
): Promise<ReviewValue> {
  if (input.action === "create")
    return db.pO.findMany({
      where: { program_id: input.programId },
      select: {
        code: true,
        description: true,
        order: true,
        program_id: true,
        is_active: true,
        classification: true,
        common_outcome_id: true,
      },
      orderBy: { order: "asc" },
    });
  if (input.action === "reorder")
    return db.pO.findMany({
      where: { program_id: input.programId },
      select: { id: true, order: true },
      orderBy: { order: "asc" },
    });
  return db.pO.findUnique({
    where: { id: input.id },
    select: {
      id: true,
      code: true,
      description: true,
      order: true,
      program_id: true,
      is_active: true,
      classification: true,
      common_outcome_id: true,
      _count: {
        select: {
          cilo_mappings: true,
          central_deployment_snapshots: true,
          course_bound_question_bindings: true,
        },
      },
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
    case "COMMON_PO":
      return input.action === "create" || input.action === "reorder"
        ? db.commonProgramOutcome.findMany({ orderBy: [{ order: "asc" }, { id: "asc" }] })
        : db.commonProgramOutcome.findUnique({
            where: { id: input.id },
            include: { _count: { select: { program_pos: true, ge_mappings: true } } },
          });
    case "PO":
      return readPOState(input, db);
    case "ILO":
      return readILOState(input, db);
    case "CILO":
      return readCiloState(input, db);
  }
}

type ReviewRecord = Record<string, unknown>;

/**
 * Shared tail of every review transform: a missing row, the archive/restore
 * activation toggle, and the caller-supplied update patch. Each kind passes its
 * own field vocabulary so key order, trimming and null semantics stay exactly
 * as that writer defines them.
 */
function nextRecordState(before: ReviewValue, action: string, patch: ReviewRecord): ReviewValue {
  if (!before) return null;
  const record = before as ReviewRecord;
  // Archive and restore only flip the active flag; every other action edits content.
  if (action === "archive" || action === "restore")
    return { ...record, is_active: action === "restore" };
  return action === "update" ? { ...record, ...patch } : record;
}

/**
 * Write-side twin of {@link nextRecordState}: an update applies its content
 * patch, while archive/restore only flips the active flag.
 */
function writePatch(action: string, patch: ReviewRecord): ReviewRecord {
  if (action === "archive" || action === "restore") return { is_active: action === "restore" };
  return patch;
}

const reorderState = (orderedIds: readonly string[]): ReviewRecord[] =>
  orderedIds.map((id, order) => ({ id, order }));

/** Only Common POs carry the optional central source reference. */
const commonSourceRef = (input: CatalogContentInput): ReviewRecord =>
  input.kind === "COMMON_PO" ? { source_ref: input.sourceRef?.trim() || null } : {};

type CatalogContentInput =
  | Extract<ILOWriteInput, { action: "create" | "update" }>
  | Extract<CommonWriteInput, { action: "create" | "update" }>;

function catalogUpdatePatch(
  input: Extract<CatalogContentInput, { action: "update" }>
): ReviewRecord {
  return {
    code: input.code.trim().toUpperCase(),
    description: input.description.trim(),
    ...commonSourceRef(input),
  };
}

function nextCatalogState(
  input: ILOWriteInput | CommonWriteInput,
  before: ReviewValue
): ReviewValue {
  if (input.action === "create") {
    const existing = before as ReviewRecord[];
    return [
      ...existing,
      {
        code: input.code.trim().toUpperCase(),
        description: input.description.trim(),
        order: existing.length,
        is_active: true,
        ...commonSourceRef(input),
      },
    ];
  }
  if (input.action === "reorder") return reorderState(input.orderedIds);
  return nextRecordState(
    before,
    input.action,
    input.action === "update" ? catalogUpdatePatch(input) : {}
  );
}

function poUpdatePatch(input: Extract<POWriteInput, { action: "update" }>): ReviewRecord {
  return {
    code: input.code.trim().toUpperCase(),
    description: input.description.trim(),
    classification: input.classification,
    common_outcome_id: input.commonOutcomeId ?? null,
  };
}

function nextPOState(input: POWriteInput, before: ReviewValue): ReviewValue {
  if (input.action === "create") {
    const existing = before as ReviewRecord[];
    return [
      ...existing,
      {
        code: input.code.trim().toUpperCase(),
        description: input.description.trim(),
        order: existing.length,
        program_id: input.programId,
        classification: input.classification,
        common_outcome_id: input.commonOutcomeId ?? null,
        is_active: true,
      },
    ];
  }
  if (input.action === "reorder") return reorderState(input.orderedIds);
  return nextRecordState(
    before,
    input.action,
    input.action === "update" ? poUpdatePatch(input) : {}
  );
}

function nextCiloState(input: CiloWriteInput, before: ReviewValue, userId: string): ReviewValue {
  if (input.action === "create")
    return [
      ...(before as ReviewRecord[]),
      {
        description: input.description.trim(),
        course_id: input.courseId,
        created_by: userId,
        is_active: true,
      },
    ];
  return nextRecordState(
    before,
    input.action,
    input.action === "update" ? { description: input.description.trim() } : {}
  );
}

function nextState(input: OutcomeWriteInput, before: ReviewValue, userId: string): ReviewValue {
  switch (input.kind) {
    case "COMMON_PO":
      return nextCatalogState(input, before);
    case "PO":
      return nextPOState(input, before);
    case "ILO":
      return nextCatalogState(input, before);
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
    ((role === ROLES.SECRETARY || role === ROLES.DEAN) &&
      (input.kind === "COMMON_PO" || input.kind === "PO")) ||
    (role === ROLES.PROGRAM_HEAD && input.kind === "PO") ||
    (role === ROLES.GEN_ED_COORDINATOR && input.kind === "ILO") ||
    (role === ROLES.FACULTY && input.kind === "CILO");
  if (!session || !allowed) return failure("You do not have permission to modify this outcome.");
  if (role === ROLES.PROGRAM_HEAD && input.kind === "PO") {
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

/**
 * Reorder only writes when the submitted list is a permutation of every stored
 * row: no duplicates, no omissions. Returns null when the list is incomplete.
 */
function isCompleteOrder(
  orderedIds: readonly string[],
  rows: ReadonlyArray<{ id: string }>
): boolean {
  return (
    new Set(orderedIds).size === orderedIds.length &&
    orderedIds.length === rows.length &&
    !rows.some((row) => !orderedIds.includes(row.id))
  );
}

async function reorderOutcome(
  orderedIds: readonly string[],
  rows: ReadonlyArray<{ id: string }>,
  update: (id: string, order: number) => Promise<unknown>,
  message: string
): Promise<ServiceResult<{ id?: string }>> {
  if (!isCompleteOrder(orderedIds, rows)) return failure(message);
  await Promise.all(orderedIds.map((id, order) => update(id, order)));
  return { success: true, data: {} };
}

// fallow-ignore-next-line code-duplication
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
  if (input.action === "reorder")
    return reorderOutcome(
      input.orderedIds,
      current as Array<{ id: string; order: number }>,
      (id, order) => tx.institutionalOutcome.update({ where: { id }, data: { order } }),
      "Institutional Outcomes must be a complete unique college-wide order."
    );
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

async function writeCommonPO(
  tx: Prisma.TransactionClient,
  input: CommonWriteInput,
  current: ReviewValue
): Promise<ServiceResult<{ id?: string }>> {
  if (input.action === "reorder")
    return reorderOutcome(
      input.orderedIds,
      current as Array<{ id: string }>,
      (id, order) => tx.commonProgramOutcome.update({ where: { id }, data: { order } }),
      "Submit the complete Common PO order."
    );
  if (input.action === "create")
    return {
      success: true,
      data: {
        id: (
          await tx.commonProgramOutcome.create({
            data: {
              code: input.code.trim().toUpperCase(),
              description: input.description.trim(),
              source_ref: input.sourceRef?.trim() || null,
              order: (current as unknown[]).length,
            },
          })
        ).id,
      },
    };
  // An update restates the central wording, so every adopting program PO must
  // follow the amended statement; archive/restore only flips the active flag.
  const row = await tx.commonProgramOutcome.update({
    where: { id: input.id },
    data: writePatch(input.action, input.action === "update" ? catalogUpdatePatch(input) : {}),
  });
  if (input.action === "update")
    await tx.pO.updateMany({
      where: { common_outcome_id: row.id },
      data: { description: row.description },
    });
  return { success: true, data: { id: row.id } };
}

async function writePO(
  tx: Prisma.TransactionClient,
  input: POWriteInput,
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
          await tx.pO.create({
            data: {
              code: input.code.trim().toUpperCase(),
              description: input.description.trim(),
              order: (current as unknown[]).length,
              program_id: input.programId,
              classification: input.classification,
              common_outcome_id: input.commonOutcomeId ?? null,
            },
          })
        ).id,
      },
    };
  }
  if (input.action === "reorder")
    return reorderOutcome(
      input.orderedIds,
      current as Array<{ id: string; order: number }>,
      (id, order) => tx.pO.update({ where: { id }, data: { order } }),
      "Program Outcomes must be a complete unique program order."
    );
  const data = writePatch(
    input.action,
    input.action === "update"
      ? {
          code: input.code.trim().toUpperCase(),
          description: input.description.trim(),
          classification: input.classification,
          common_outcome_id: input.commonOutcomeId ?? null,
        }
      : {}
  );
  return {
    success: true,
    data: { id: (await tx.pO.update({ where: { id: input.id }, data })).id },
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
  if (role !== ROLES.PROGRAM_HEAD || input.kind !== "PO") return true;
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
    case "COMMON_PO":
      return writeCommonPO(tx, input, current);
    case "PO":
      return writePO(tx, input, current);
    case "ILO":
      return writeILO(tx, input, current);
    case "CILO":
      return writeCilo(tx, input, userId);
  }
}

/** Every rejection after re-authorization reports the same denial to the caller. */
const reviewedFailure = () => failure("You do not have permission to modify this outcome.");

/**
 * Administrative writes and every central Common PO change are auditable;
 * program-head and faculty writes stay off the central change log.
 */
function isAuditedWrite(input: OutcomeWriteInput, role: WriterRole): boolean {
  return input.kind === "COMMON_PO" || role === ROLES.SECRETARY || role === ROLES.DEAN;
}

async function recordOutcomeChange(
  tx: Prisma.TransactionClient,
  review: OutcomeWriteReview,
  current: ReviewValue,
  userId: string
): Promise<void> {
  await tx.outcomeChange.create({
    data: {
      actor_id: userId,
      input: JSON.parse(token(review.input)),
      before: JSON.parse(token(current)) ?? Prisma.JsonNull,
      after: JSON.parse(token(review.after)) ?? Prisma.JsonNull,
    },
  });
}

async function commitReviewedOutcome(
  tx: Prisma.TransactionClient,
  review: OutcomeWriteReview,
  userId: string,
  role: WriterRole
): Promise<ServiceResult<{ id?: string }>> {
  if (!(await programHeadAssignmentIsCurrent(tx, review.input, userId, role)))
    return reviewedFailure();
  if (!(await scopeAllows(review.input, userId, role, tx))) return reviewedFailure();
  const current = await readState(review.input, tx);
  if (token(current) !== review.freshnessToken)
    return failure("Outcome changed after review. Prepare a new review.");
  if (!reviewMatchesCurrentState(review, current, userId))
    return failure("Outcome review does not match requested write.");
  const result = await writeReviewedOutcome(tx, review.input, current, userId);
  if (result.success && isAuditedWrite(review.input, role))
    await recordOutcomeChange(tx, review, current, userId);
  return result;
}

export async function commitOutcomeWrite(
  review: OutcomeWriteReview,
  confirmed: boolean
): Promise<ServiceResult<{ id?: string }>> {
  if (!confirmed) return failure("Explicit confirmation is required.");
  const session = await resolveAuthSession();
  const role = session?.activeRole;
  if (!session || !role || !reviewIsValid(review, session.userId))
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
      if (review.input.kind === "COMMON_PO") return failure("Common PO code already exists.");
      return failure("Program Outcome code already exists.");
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034")
      return failure("Outcome changed; prepare a new review.");
    throw error;
  }
}
