import { createHmac, timingSafeEqual } from "node:crypto";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { ROLES } from "@/lib/constants/roles";
import { prisma } from "@/lib/db/prisma";
import { getConfirmationSecret } from "@/lib/utils/confirmation-secret";
import { isUniqueConstraintError } from "@/lib/utils/prisma-errors";
import type { ServiceResult } from "@/lib/utils/service-result";

type CourseAlignmentTarget = {
  id: string;
  code: string;
  description: string;
};

type CourseAlignmentCilo = {
  id: string;
  description: string;
  targetIds: string[];
};

export type FacultyCourseAlignment = {
  course: {
    id: string;
    code: string;
    title: string;
    program: { id: string; code: string; name: string };
  };
  cilos: CourseAlignmentCilo[];
  targets: CourseAlignmentTarget[];
  readiness: "ready" | "incomplete-mapping" | "missing-cilos";
};

type AlignmentSnapshot = Array<{ ciloId: string; targetIds: string[] }>;

export type CourseAlignmentReview = {
  courseId: string;
  before: AlignmentSnapshot;
  after: AlignmentSnapshot;
  additions: Array<{ ciloId: string; targetId: string }>;
  removals: Array<{ ciloId: string; targetId: string }>;
  freshnessToken: string;
  signature: string;
};

const courseIdSchema = z.string().uuid();

const SAFE_ACCESS_ERROR = "Course alignment is unavailable.";

function stableSnapshot(
  rows: Array<{ id: string; cilo_mappings: Array<{ go_id: string }> }>
): AlignmentSnapshot {
  return rows
    .map((cilo) => ({
      ciloId: cilo.id,
      targetIds: cilo.cilo_mappings.map((mapping) => mapping.go_id).sort(),
    }))
    .sort((left, right) => left.ciloId.localeCompare(right.ciloId));
}

function token(value: unknown): string {
  return JSON.stringify(value);
}

function signReview(review: Omit<CourseAlignmentReview, "signature">, userId: string): string {
  return createHmac("sha256", getConfirmationSecret())
    .update(token({ ...review, userId }))
    .digest("hex");
}

function reviewIsValid(review: CourseAlignmentReview, userId: string): boolean {
  const { signature, ...unsigned } = review;
  const expected = Buffer.from(signReview(unsigned, userId), "hex");
  const actual = Buffer.from(signature, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

async function hasFacultyCourseAccess(
  db: Prisma.TransactionClient | typeof prisma,
  userId: string,
  courseId: string
): Promise<boolean> {
  return Boolean(
    await db.courseAssignment.findFirst({
      where: {
        faculty_id: userId,
        course_id: courseId,
        is_active: true,
        term_instance: { status: "ACTIVE" },
      },
      select: { id: true },
    })
  );
}

async function readCourse(
  db: Prisma.TransactionClient | typeof prisma,
  courseId: string
) {
  return db.course.findFirst({
    where: {
      id: courseId,
      is_active: true,
      course_scope: "PROGRAM_SPECIFIC",
      program_id: { not: null },
    },
    select: {
      id: true,
      code: true,
      title: true,
      program_id: true,
      program: { select: { id: true, code: true, name: true, is_active: true } },
      cilos: {
        where: { is_active: true },
        select: {
          id: true,
          description: true,
          cilo_mappings: {
            where: { go: { is_active: true } },
            select: { go_id: true },
            orderBy: { go_id: "asc" },
          },
        },
        orderBy: { created_at: "asc" },
      },
    },
  });
}

export async function readFacultyCourseAlignment(
  courseId: string
): Promise<ServiceResult<FacultyCourseAlignment>> {
  if (!courseIdSchema.safeParse(courseId).success) {
    return { success: false, error: SAFE_ACCESS_ERROR };
  }
  const session = await resolveAuthSession();
  if (
    session?.activeRole !== ROLES.FACULTY ||
    !(await hasFacultyCourseAccess(prisma, session.userId, courseId))
  ) {
    return { success: false, error: SAFE_ACCESS_ERROR };
  }

  const course = await readCourse(prisma, courseId);
  if (!course?.program?.is_active || !course.program_id) {
    return { success: false, error: SAFE_ACCESS_ERROR };
  }

  const targets = await prisma.gO.findMany({
    where: { program_id: course.program_id, is_active: true },
    select: { id: true, code: true, description: true },
    orderBy: [{ order: "asc" }, { code: "asc" }],
  });
  const validTargetIds = new Set(targets.map((target) => target.id));
  const cilos = course.cilos.map((cilo) => ({
    id: cilo.id,
    description: cilo.description,
    targetIds: cilo.cilo_mappings
      .map((mapping) => mapping.go_id)
      .filter((targetId) => validTargetIds.has(targetId)),
  }));

  return {
    success: true,
    data: {
      course: {
        id: course.id,
        code: course.code,
        title: course.title,
        program: course.program,
      },
      cilos,
      targets,
      readiness:
        cilos.length === 0
          ? "missing-cilos"
          : cilos.every((cilo) => cilo.targetIds.length > 0)
            ? "ready"
            : "incomplete-mapping",
    },
  };
}

export async function prepareCourseAlignmentWrite(input: {
  courseId: string;
  desired: AlignmentSnapshot;
}): Promise<ServiceResult<CourseAlignmentReview>> {
  const session = await resolveAuthSession();
  if (
    session?.activeRole !== ROLES.FACULTY ||
    !(await hasFacultyCourseAccess(prisma, session.userId, input.courseId))
  ) {
    return { success: false, error: SAFE_ACCESS_ERROR };
  }

  const course = await readCourse(prisma, input.courseId);
  if (!course?.program_id || !course.program?.is_active) {
    return { success: false, error: SAFE_ACCESS_ERROR };
  }

  const before = stableSnapshot(course.cilos);
  const validCiloIds = new Set(before.map((item) => item.ciloId));
  if (
    input.desired.length !== validCiloIds.size ||
    new Set(input.desired.map((item) => item.ciloId)).size !== input.desired.length ||
    input.desired.some((item) => !validCiloIds.has(item.ciloId))
  ) {
    return { success: false, error: "Submit a complete alignment for every active CILO." };
  }

  const targetIds = [...new Set(input.desired.flatMap((item) => item.targetIds))];
  const validTargetCount =
    targetIds.length === 0
      ? 0
      : await prisma.gO.count({
          where: { id: { in: targetIds }, program_id: course.program_id, is_active: true },
        });
  if (validTargetCount !== targetIds.length) {
    return {
      success: false,
      error: "Every selected Graduate Outcome must be active and belong to the Course Academic Program.",
    };
  }

  const after = input.desired
    .map((item) => ({ ciloId: item.ciloId, targetIds: [...new Set(item.targetIds)].sort() }))
    .sort((left, right) => left.ciloId.localeCompare(right.ciloId));
  const beforePairs = new Set(
    before.flatMap((item) => item.targetIds.map((targetId) => `${item.ciloId}:${targetId}`))
  );
  const afterPairs = new Set(
    after.flatMap((item) => item.targetIds.map((targetId) => `${item.ciloId}:${targetId}`))
  );
  const additions = [...afterPairs]
    .filter((pair) => !beforePairs.has(pair))
    .map((pair) => {
      const [ciloId, targetId] = pair.split(":");
      return { ciloId, targetId };
    });
  const removals = [...beforePairs]
    .filter((pair) => !afterPairs.has(pair))
    .map((pair) => {
      const [ciloId, targetId] = pair.split(":");
      return { ciloId, targetId };
    });
  const unsigned = {
    courseId: input.courseId,
    before,
    after,
    additions,
    removals,
    freshnessToken: token(before),
  };

  return {
    success: true,
    data: { ...unsigned, signature: signReview(unsigned, session.userId) },
  };
}

export async function commitCourseAlignmentWrite(
  review: CourseAlignmentReview,
  confirmed: boolean
): Promise<ServiceResult<{ changed: number }>> {
  if (!confirmed) return { success: false, error: "Explicit confirmation is required." };
  const session = await resolveAuthSession();
  if (
    session?.activeRole !== ROLES.FACULTY ||
    !reviewIsValid(review, session.userId)
  ) {
    return { success: false, error: SAFE_ACCESS_ERROR };
  }
  try {
    return await prisma.$transaction(
      // fallow-ignore-next-line complexity
      async (tx) => {
        if (!(await hasFacultyCourseAccess(tx, session.userId, review.courseId))) {
          return { success: false, error: SAFE_ACCESS_ERROR };
        }
        const course = await readCourse(tx, review.courseId);
        if (!course?.program_id || !course.program?.is_active) {
          return { success: false, error: SAFE_ACCESS_ERROR };
        }
        const current = stableSnapshot(course.cilos);
        if (token(current) !== review.freshnessToken) {
          return {
            success: false,
            error: "Course alignment changed after review. Reload and review the latest mappings.",
          };
        }

        const validTargetIds = [...new Set(review.after.flatMap((item) => item.targetIds))];
        const validTargetCount =
          validTargetIds.length === 0
            ? 0
            : await tx.gO.count({
                where: { id: { in: validTargetIds }, program_id: course.program_id, is_active: true },
              });
        if (validTargetCount !== validTargetIds.length) {
          return {
            success: false,
            error: "Graduate Outcome availability changed. Reload and review the latest catalog.",
          };
        }

        if (review.removals.length > 0) {
          await tx.cILOMapping.deleteMany({
            where: {
              OR: review.removals.map((item) => ({ cilo_id: item.ciloId, go_id: item.targetId })),
            },
          });
        }
        if (review.additions.length > 0) {
          await tx.cILOMapping.createMany({
            data: review.additions.map((item) => ({
              cilo_id: item.ciloId,
              go_id: item.targetId,
            })),
          });
        }
        return {
          success: true,
          data: { changed: review.additions.length + review.removals.length },
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  } catch (error) {
    if (isUniqueConstraintError(error) || (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034")) {
      return {
        success: false,
        error: "Course alignment changed after review. Reload and review the latest mappings.",
      };
    }
    throw error;
  }
}
