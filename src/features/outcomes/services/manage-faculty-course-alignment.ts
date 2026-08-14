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

export type CourseScope = "GENERAL_EDUCATION" | "PROGRAM_SPECIFIC";

export type FacultyCourseAlignment = {
  course: {
    id: string;
    code: string;
    title: string;
    scope: CourseScope;
    program: { id: string; code: string; name: string } | null;
  };
  cilos: CourseAlignmentCilo[];
  targets: CourseAlignmentTarget[];
  unavailableTargets: CourseAlignmentTarget[];
  readiness: "ready" | "incomplete-mapping" | "missing-cilos";
  freshnessToken: string;
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

type AlignmentCiloRow = {
  id: string;
  description: string;
  cilo_mappings: Array<{
    go_id: string;
    go: { id: string; code: string; description: string; is_active: boolean };
  }>;
  cilo_institutional_outcome_mappings: Array<{
    institutional_outcome_id: string;
    institutional_outcome: {
      id: string;
      code: string;
      description: string;
      is_active: boolean;
    };
  }>;
};

function targetIdsForScope(cilo: AlignmentCiloRow, scope: CourseScope): string[] {
  return scope === "GENERAL_EDUCATION"
    ? cilo.cilo_institutional_outcome_mappings.map((mapping) => mapping.institutional_outcome_id)
    : cilo.cilo_mappings.map((mapping) => mapping.go_id);
}

function stableSnapshot(rows: AlignmentCiloRow[], scope: CourseScope): AlignmentSnapshot {
  return rows
    .map((cilo) => ({
      ciloId: cilo.id,
      targetIds: [...targetIdsForScope(cilo, scope)].sort(),
    }))
    .sort((left, right) => left.ciloId.localeCompare(right.ciloId));
}

function mappingPairs(snapshot: AlignmentSnapshot): Set<string> {
  return new Set(
    snapshot.flatMap((item) => item.targetIds.map((targetId) => `${item.ciloId}:${targetId}`))
  );
}

function newlyMappedTargetIds(before: AlignmentSnapshot, after: AlignmentSnapshot): string[] {
  const beforePairs = mappingPairs(before);
  return [
    ...new Set(
      after.flatMap((item) =>
        item.targetIds.filter((targetId) => !beforePairs.has(`${item.ciloId}:${targetId}`))
      )
    ),
  ];
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

async function readCourse(db: Prisma.TransactionClient | typeof prisma, courseId: string) {
  return db.course.findFirst({
    where: {
      id: courseId,
      is_active: true,
      OR: [
        { course_scope: "PROGRAM_SPECIFIC", program_id: { not: null } },
        { course_scope: "GENERAL_EDUCATION" },
      ],
    },
    select: {
      id: true,
      code: true,
      title: true,
      program_id: true,
      course_scope: true,
      program: { select: { id: true, code: true, name: true, is_active: true } },
      cilos: {
        where: { is_active: true },
        select: {
          id: true,
          description: true,
          cilo_mappings: {
            select: {
              go_id: true,
              go: { select: { id: true, code: true, description: true, is_active: true } },
            },
          },
          cilo_institutional_outcome_mappings: {
            select: {
              institutional_outcome_id: true,
              institutional_outcome: {
                select: { id: true, code: true, description: true, is_active: true },
              },
            },
          },
        },
        orderBy: { created_at: "asc" },
      },
    },
  });
}

type AlignmentCourse = NonNullable<Awaited<ReturnType<typeof readCourse>>>;

function courseScopeOf(course: AlignmentCourse): CourseScope {
  return course.course_scope === "GENERAL_EDUCATION" ? "GENERAL_EDUCATION" : "PROGRAM_SPECIFIC";
}

function courseIsUnavailable(course: AlignmentCourse): boolean {
  if (courseScopeOf(course) === "GENERAL_EDUCATION") return false;
  return !course.program_id || !course.program?.is_active;
}

async function readValidTargets(db: Prisma.TransactionClient | typeof prisma, course: AlignmentCourse) {
  return courseScopeOf(course) === "GENERAL_EDUCATION"
    ? db.institutionalOutcome.findMany({
        where: { is_active: true },
        select: { id: true, code: true, description: true },
        orderBy: [{ order: "asc" }, { code: "asc" }],
      })
    : db.gO.findMany({
        where: { program_id: course.program_id!, is_active: true },
        select: { id: true, code: true, description: true },
        orderBy: [{ order: "asc" }, { code: "asc" }],
      });
}

async function countValidAddedTargets(
  db: Prisma.TransactionClient | typeof prisma,
  course: AlignmentCourse,
  targetIds: string[]
): Promise<number> {
  if (targetIds.length === 0) return 0;
  return courseScopeOf(course) === "GENERAL_EDUCATION"
    ? db.institutionalOutcome.count({
        where: { id: { in: targetIds }, is_active: true },
      })
    : db.gO.count({
        where: { id: { in: targetIds }, program_id: course.program_id!, is_active: true },
      });
}

function unavailableTargetsFor(course: AlignmentCourse, validTargetIds: Set<string>) {
  const scope = courseScopeOf(course);
  const mappedTargets = course.cilos.flatMap((cilo) =>
    scope === "GENERAL_EDUCATION"
      ? cilo.cilo_institutional_outcome_mappings.map((mapping) => mapping.institutional_outcome)
      : cilo.cilo_mappings.map((mapping) => mapping.go)
  );
  return mappedTargets
    .filter((target) => !validTargetIds.has(target.id))
    .map(
      (target) =>
        [
          target.id,
          { id: target.id, code: target.code, description: target.description },
        ] as const
    );
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
  if (!course || courseIsUnavailable(course)) {
    return { success: false, error: SAFE_ACCESS_ERROR };
  }
  const scope = courseScopeOf(course);

  const targets = await readValidTargets(prisma, course);
  const validTargetIds = new Set(targets.map((target) => target.id));
  const unavailableTargets = unavailableTargetsFor(course, validTargetIds);
  const cilos = course.cilos.map((cilo) => ({
    id: cilo.id,
    description: cilo.description,
    targetIds: targetIdsForScope(cilo, scope),
  }));
  const hasActiveTarget = new Map(
    course.cilos.map((cilo) => [
      cilo.id,
      targetIdsForScope(cilo, scope).some((targetId) => validTargetIds.has(targetId)),
    ])
  );
  return {
    success: true,
    data: {
      course: {
        id: course.id,
        code: course.code,
        title: course.title,
        scope,
        program: course.program
          ? { id: course.program.id, code: course.program.code, name: course.program.name }
          : null,
      },
      cilos,
      targets,
      unavailableTargets: [...new Map(unavailableTargets).values()].sort((left, right) =>
        left.code.localeCompare(right.code)
      ),
      readiness:
        cilos.length === 0
          ? "missing-cilos"
          : cilos.every((cilo) => hasActiveTarget.get(cilo.id))
            ? "ready"
            : "incomplete-mapping",
      freshnessToken: token(stableSnapshot(course.cilos, scope)),
    },
  };
}

export async function prepareCourseAlignmentWrite(input: {
  courseId: string;
  desired: AlignmentSnapshot;
  freshnessToken: string;
}): Promise<ServiceResult<CourseAlignmentReview>> {
  if (!courseIdSchema.safeParse(input.courseId).success) {
    return { success: false, error: SAFE_ACCESS_ERROR };
  }
  const session = await resolveAuthSession();
  if (
    session?.activeRole !== ROLES.FACULTY ||
    !(await hasFacultyCourseAccess(prisma, session.userId, input.courseId))
  ) {
    return { success: false, error: SAFE_ACCESS_ERROR };
  }

  const course = await readCourse(prisma, input.courseId);
  if (!course || courseIsUnavailable(course)) {
    return { success: false, error: SAFE_ACCESS_ERROR };
  }
  const scope = courseScopeOf(course);

  const before = stableSnapshot(course.cilos, scope);
  if (input.freshnessToken !== token(before)) {
    return {
      success: false,
      error: "Course alignment changed. Reload and review the latest mappings.",
    };
  }
  const validCiloIds = new Set(before.map((item) => item.ciloId));
  if (
    input.desired.length !== validCiloIds.size ||
    new Set(input.desired.map((item) => item.ciloId)).size !== input.desired.length ||
    input.desired.some((item) => !validCiloIds.has(item.ciloId))
  ) {
    return { success: false, error: "Submit a complete alignment for every active CILO." };
  }

  const after = input.desired
    .map((item) => ({ ciloId: item.ciloId, targetIds: [...new Set(item.targetIds)].sort() }))
    .sort((left, right) => left.ciloId.localeCompare(right.ciloId));
  const beforePairs = mappingPairs(before);
  const addedTargetIds = newlyMappedTargetIds(before, after);
  const validTargetCount = await countValidAddedTargets(prisma, course, addedTargetIds);
  if (validTargetCount !== addedTargetIds.length) {
    return {
      success: false,
      error:
        scope === "GENERAL_EDUCATION"
          ? "Institutional Outcome availability changed. Reload and review the latest mappings."
          : "Graduate Outcome availability changed. Reload and review the latest mappings.",
    };
  }
  const afterPairs = mappingPairs(after);
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
  if (session?.activeRole !== ROLES.FACULTY || !reviewIsValid(review, session.userId)) {
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
        if (!course || courseIsUnavailable(course)) {
          return { success: false, error: SAFE_ACCESS_ERROR };
        }
        const scope = courseScopeOf(course);
        const current = stableSnapshot(course.cilos, scope);
        if (token(current) !== review.freshnessToken) {
          return {
            success: false,
            error: "Course alignment changed after review. Reload and review the latest mappings.",
          };
        }

        const addedTargetIds = newlyMappedTargetIds(review.before, review.after);
        const validTargetCount = await countValidAddedTargets(tx, course, addedTargetIds);
        if (validTargetCount !== addedTargetIds.length) {
          return {
            success: false,
            error:
              scope === "GENERAL_EDUCATION"
                ? "Institutional Outcome availability changed. Reload and review the latest catalog."
                : "Graduate Outcome availability changed. Reload and review the latest catalog.",
          };
        }

        if (scope === "GENERAL_EDUCATION") {
          if (review.removals.length > 0) {
            await tx.cILOInstitutionalOutcomeMapping.deleteMany({
              where: {
                OR: review.removals.map((item) => ({
                  cilo_id: item.ciloId,
                  institutional_outcome_id: item.targetId,
                })),
              },
            });
          }
          if (review.additions.length > 0) {
            await tx.cILOInstitutionalOutcomeMapping.createMany({
              data: review.additions.map((item) => ({
                cilo_id: item.ciloId,
                institutional_outcome_id: item.targetId,
                created_by: session.userId,
                updated_by: session.userId,
              })),
            });
          }
        } else {
          if (review.removals.length > 0) {
            await tx.cILOMapping.deleteMany({
              where: {
                OR: review.removals.map((item) => ({
                  cilo_id: item.ciloId,
                  go_id: item.targetId,
                })),
              },
            });
          }
          if (review.additions.length > 0) {
            await tx.cILOMapping.createMany({
              data: review.additions.map((item) => ({
                cilo_id: item.ciloId,
                go_id: item.targetId,
                created_by: session.userId,
                updated_by: session.userId,
              })),
            });
          }
        }
        return {
          success: true,
          data: { changed: review.additions.length + review.removals.length },
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  } catch (error) {
    if (
      isUniqueConstraintError(error) ||
      (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034")
    ) {
      return {
        success: false,
        error: "Course alignment changed after review. Reload and review the latest mappings.",
      };
    }
    throw error;
  }
}
