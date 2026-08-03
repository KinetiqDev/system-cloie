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
  | { kind: "MAPPING"; action: "remove"; programId: string; id: string };

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

async function scopeAllows(
  input: OutcomeWriteInput,
  userId: string,
  role: WriterRole,
  db: Prisma.TransactionClient | typeof prisma = prisma
): Promise<boolean> {
  if (role === ROLES.SECRETARY) return true;
  if (input.kind === "GO") {
    if (role !== ROLES.PROGRAM_HEAD) return false;
    if (input.action === "create" || input.action === "reorder") return true;
    const go = await db.gO.findUnique({ where: { id: input.id }, select: { program_id: true } });
    return go?.program_id === input.programId;
  }
  if (input.kind === "CILO") {
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
  const mapping =
    "ciloId" in input
      ? await db.cILO.findUnique({
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
        })
      : await db.cILOMapping
          .findUnique({
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
          })
          .then(
            (row) =>
              row && {
                course_id: row.cilo.course_id,
                course: row.cilo.course,
                program_id: row.go.program_id,
              }
          );
  if (!mapping) return false;
  if (
    role === ROLES.PROGRAM_HEAD &&
    "programId" in input &&
    "program_id" in mapping &&
    mapping.program_id !== input.programId
  )
    return false;
  if (
    role === ROLES.PROGRAM_HEAD &&
    "programId" in input &&
    mapping.course.course_scope === "GENERAL_EDUCATION" &&
    mapping.course.course_assignments.length === 0
  )
    return false;
  if (
    role === ROLES.PROGRAM_HEAD &&
    "programId" in input &&
    mapping.course.course_scope === "PROGRAM_SPECIFIC" &&
    mapping.course.program_id !== input.programId
  )
    return false;
  if (role === ROLES.FACULTY)
    return Boolean(
      await db.courseAssignment.findFirst({
        where: {
          faculty_id: userId,
          course_id: mapping.course_id,
          is_active: true,
          term_instance: { status: "ACTIVE" },
        },
      })
    );
  if (role === ROLES.PROGRAM_HEAD) {
    const goId =
      "goId" in input
        ? input.goId
        : (await db.cILOMapping.findUnique({ where: { id: input.id }, select: { go_id: true } }))
            ?.go_id;
    const go = goId
      ? await db.gO.findUnique({ where: { id: goId }, select: { program_id: true } })
      : null;
    return Boolean(go && "programId" in input && go.program_id === input.programId);
  }
  return false;
}

async function readState(
  input: OutcomeWriteInput,
  db: Prisma.TransactionClient | typeof prisma = prisma
): Promise<ReviewValue> {
  if (input.kind === "GO") {
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
  if (input.kind === "CILO") {
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

function nextState(input: OutcomeWriteInput, before: ReviewValue, userId: string): ReviewValue {
  if (input.kind === "GO") {
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
  if (input.kind === "CILO") {
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
  if (input.action === "create") return { cilo_id: input.ciloId, go_id: input.goId };
  if (input.action === "remove") return null;
  return before;
}

export async function prepareOutcomeWrite(
  input: OutcomeWriteInput
): Promise<ServiceResult<OutcomeWriteReview>> {
  const session = await resolveAuthSession();
  const role = session?.activeRole;
  if (
    !session ||
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
  const unsigned = {
    input,
    before,
    after: nextState(input, before, session.userId),
    freshnessToken: token(before),
  };
  return { success: true, data: { ...unsigned, signature: signReview(unsigned, session.userId) } };
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
      async (tx) => {
        if (role === ROLES.PROGRAM_HEAD && "programId" in review.input) {
          const selectedProgram = await revalidateProgramHeadAssignment(tx, {
            userId: session.userId,
            programId: review.input.programId,
          });
          if (!selectedProgram)
            return failure("You do not have permission to modify this outcome.");
        }
        if (!(await scopeAllows(review.input, session.userId, role, tx)))
          return failure("You do not have permission to modify this outcome.");
        const current = await readState(review.input, tx);
        if (token(current) !== review.freshnessToken)
          return failure("Outcome changed after review. Prepare a new review.");
        if (token(nextState(review.input, current, session.userId)) !== token(review.after))
          return failure("Outcome review does not match requested write.");
        const input = review.input;
        if (input.kind === "GO") {
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
        if (input.kind === "CILO") {
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
                      created_by: session.userId,
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
        if (input.action === "create") {
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
          if (!cilo?.is_active || !cilo.course.is_active || !go?.is_active)
            return failure("Active CILO, Course, and Graduate Outcome are required.");
          if (role === ROLES.PROGRAM_HEAD && go.program_id !== input.programId)
            return failure("You do not have permission to modify this outcome.");
          if (
            role === ROLES.PROGRAM_HEAD &&
            cilo.course.course_scope === "GENERAL_EDUCATION" &&
            !(await tx.courseAssignment.findFirst({
              where: {
                course_id: cilo.course_id,
                program_id: input.programId,
                is_active: true,
                term_instance: { status: "ACTIVE" },
              },
              select: { id: true },
            }))
          )
            return failure("You do not have permission to modify this outcome.");
          if (
            cilo.course.course_scope === "PROGRAM_SPECIFIC" &&
            cilo.course.program_id !== go.program_id
          )
            return failure("Graduate Outcome must belong to the Course Academic Program");
          return {
            success: true,
            data: {
              id: (
                await tx.cILOMapping.create({ data: { cilo_id: input.ciloId, go_id: input.goId } })
              ).id,
            },
          };
        }
        await tx.cILOMapping.delete({ where: { id: input.id } });
        return { success: true, data: {} };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return failure(
        review.input.kind === "MAPPING"
          ? "CILO-to-GO mapping already exists."
          : "Graduate Outcome code already exists."
      );
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034")
      return failure("Outcome changed; prepare a new review.");
    throw error;
  }
}
