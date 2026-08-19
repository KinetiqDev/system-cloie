import { createHmac, timingSafeEqual } from "node:crypto";
import { Prisma, type CILOMappingManifestation } from "@prisma/client";
import type { CourseScope } from "@prisma/client";
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

type CourseAlignmentMapping = {
  ploId: string;
  manifestation: CILOMappingManifestation | null;
};

type CourseAlignmentCilo =
  | { id: string; description: string; targetIds: string[] }
  | { id: string; description: string; mappings: CourseAlignmentMapping[] };

export type CourseAlignment = {
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

// Consumed by the slice-6 manifestation matrix editor; not yet imported elsewhere.
// fallow-ignore-next-line unused-type
export type ManifestationSnapshot = Array<{
  ciloId: string;
  mappings: Array<{ ploId: string; manifestation: CILOMappingManifestation | null }>;
}>;

// Draft cells for saveDraftCourseAlignment; consumed by the slice-6 editor.
// fallow-ignore-next-line unused-type
export type ManifestationDraft = Array<{
  ciloId: string;
  mappings: Array<{ ploId: string; manifestation: CILOMappingManifestation }>;
}>;

export type CourseAlignmentReview =
  | {
      scope: "GENERAL_EDUCATION";
      courseId: string;
      before: AlignmentSnapshot;
      after: AlignmentSnapshot;
      additions: Array<{ ciloId: string; targetId: string }>;
      removals: Array<{ ciloId: string; targetId: string }>;
      freshnessToken: string;
      signature: string;
    }
  | {
      scope: "PROGRAM_SPECIFIC";
      courseId: string;
      before: ManifestationSnapshot;
      after: ManifestationSnapshot;
      additions: Array<{
        ciloId: string;
        ploId: string;
        manifestation: CILOMappingManifestation;
      }>;
      updates: Array<{
        ciloId: string;
        ploId: string;
        from: CILOMappingManifestation | null;
        to: CILOMappingManifestation;
      }>;
      removals: Array<{ ciloId: string; ploId: string }>;
      freshnessToken: string;
      signature: string;
    };

type ManifestationDiff = {
  additions: Array<{
    ciloId: string;
    ploId: string;
    manifestation: CILOMappingManifestation;
  }>;
  updates: Array<{
    ciloId: string;
    ploId: string;
    from: CILOMappingManifestation | null;
    to: CILOMappingManifestation;
  }>;
  removals: Array<{ ciloId: string; ploId: string }>;
};

const courseIdSchema = z.string().uuid();

const SAFE_ACCESS_ERROR = "Course alignment is unavailable.";

type AlignmentCiloRow = {
  id: string;
  description: string;
  cilo_mappings: Array<{
    plo_id: string;
    manifestation: CILOMappingManifestation | null;
    plo: { id: string; code: string; description: string; is_active: boolean };
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
    : cilo.cilo_mappings.map((mapping) => mapping.plo_id);
}

type FreshnessMapping = {
  ciloId: string;
  targetId: string;
  manifestation: CILOMappingManifestation | null;
};

function freshnessMappingsForScope(rows: AlignmentCiloRow[], scope: CourseScope): FreshnessMapping[] {
  return scope === "GENERAL_EDUCATION"
    ? rows.flatMap((cilo) =>
        cilo.cilo_institutional_outcome_mappings.map((mapping) => ({
          ciloId: cilo.id,
          targetId: mapping.institutional_outcome_id,
          manifestation: null,
        }))
      )
    : rows.flatMap((cilo) =>
        cilo.cilo_mappings.map((mapping) => ({
          ciloId: cilo.id,
          targetId: mapping.plo_id,
          manifestation: mapping.manifestation ?? null,
        }))
      );
}

function freshnessTokenValue(
  ciloIds: string[],
  catalogIds: string[],
  mappings: FreshnessMapping[]
): string {
  return JSON.stringify({
    ciloIds: [...ciloIds].sort((left, right) => left.localeCompare(right)),
    catalogIds: [...catalogIds].sort((left, right) => left.localeCompare(right)),
    mappings: [...mappings].sort(
      (left, right) =>
        left.ciloId.localeCompare(right.ciloId) || left.targetId.localeCompare(right.targetId)
    ),
  });
}

function freshnessTokenOf(
  rows: AlignmentCiloRow[],
  scope: CourseScope,
  catalogIds: string[]
): string {
  return freshnessTokenValue(
    rows.map((cilo) => cilo.id),
    catalogIds,
    freshnessMappingsForScope(rows, scope)
  );
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

// Each check is a distinct acceptance rule: coverage, uniqueness, catalog validity,
// manifestation enum, and the commit completeness gate.
// fallow-ignore-next-line complexity
function validateProgramSpecificState(
  rows: AlignmentCiloRow[],
  catalogIds: string[],
  items: ManifestationSnapshot,
  requireComplete: boolean
): { ok: true; state: ManifestationSnapshot } | { ok: false; error: string } {
  const validCiloIds = new Set(rows.map((cilo) => cilo.id));
  if (
    items.length !== validCiloIds.size ||
    new Set(items.map((item) => item.ciloId)).size !== items.length ||
    items.some((item) => !validCiloIds.has(item.ciloId))
  ) {
    return { ok: false, error: "Submit a complete alignment for every active CILO." };
  }
  const validTargetIds = new Set(catalogIds);
  let submittedPairCount = 0;
  for (const item of items) {
    if (new Set(item.mappings.map((mapping) => mapping.ploId)).size !== item.mappings.length) {
      return { ok: false, error: "Submit each CILO-to-PLO pair exactly once." };
    }
    if (item.mappings.some((mapping) => !validTargetIds.has(mapping.ploId))) {
      return {
        ok: false,
        error:
          "Submit manifestations only for active Program Learning Outcomes of this Course's Program.",
      };
    }
    if (item.mappings.some((mapping) => mapping.manifestation === null)) {
      return {
        ok: false,
        error: "Every required CILO-to-PLO pair needs a LEARNING, PRACTICE, or OPPORTUNITY manifestation.",
      };
    }
    submittedPairCount += item.mappings.length;
  }
  if (requireComplete && submittedPairCount !== validCiloIds.size * validTargetIds.size) {
    return { ok: false, error: "Complete every required CILO-to-PLO pair before committing." };
  }
  return {
    ok: true,
    state: items
      .map((item) => ({
        ciloId: item.ciloId,
        mappings: [...item.mappings].sort((left, right) => left.ploId.localeCompare(right.ploId)),
      }))
      .sort((left, right) => left.ciloId.localeCompare(right.ciloId)),
  };
}

function existingManifestationState(
  rows: AlignmentCiloRow[],
  activeTargetIds: Set<string>
): ManifestationSnapshot {
  return rows
    .map((cilo) => ({
      ciloId: cilo.id,
      mappings: cilo.cilo_mappings
        .filter((mapping) => activeTargetIds.has(mapping.plo_id))
        .map((mapping) => ({
          ploId: mapping.plo_id,
          manifestation: mapping.manifestation ?? null,
        }))
        .sort((left, right) => left.ploId.localeCompare(right.ploId)),
    }))
    .sort((left, right) => left.ciloId.localeCompare(right.ciloId));
}

function manifestationDiff(
  before: ManifestationSnapshot,
  after: ManifestationSnapshot
): ManifestationDiff {
  const beforePairs = new Map<string, CILOMappingManifestation | null>();
  for (const item of before) {
    for (const mapping of item.mappings) {
      beforePairs.set(`${item.ciloId}:${mapping.ploId}`, mapping.manifestation);
    }
  }
  const additions: ManifestationDiff["additions"] = [];
  const updates: ManifestationDiff["updates"] = [];
  for (const item of after) {
    for (const mapping of item.mappings) {
      const key = `${item.ciloId}:${mapping.ploId}`;
      const existing = beforePairs.get(key);
      if (existing === undefined) {
        if (mapping.manifestation !== null) {
          additions.push({
            ciloId: item.ciloId,
            ploId: mapping.ploId,
            manifestation: mapping.manifestation,
          });
        }
      } else if (existing !== mapping.manifestation && mapping.manifestation !== null) {
        updates.push({
          ciloId: item.ciloId,
          ploId: mapping.ploId,
          from: existing,
          to: mapping.manifestation,
        });
      }
      beforePairs.delete(key);
    }
  }
  const removals: ManifestationDiff["removals"] = [...beforePairs.keys()].map((key) => {
    const [ciloId, ploId] = key.split(":");
    return { ciloId, ploId };
  });
  return { additions, updates, removals };
}

async function applyManifestationDiff(
  tx: Prisma.TransactionClient,
  diff: ManifestationDiff,
  userId: string
): Promise<void> {
  if (diff.additions.length > 0) {
    await tx.cILOMapping.createMany({
      data: diff.additions.map((item) => ({
        cilo_id: item.ciloId,
        plo_id: item.ploId,
        manifestation: item.manifestation,
        created_by: userId,
        updated_by: userId,
      })),
    });
  }
  for (const update of diff.updates) {
    await tx.cILOMapping.updateMany({
      where: { cilo_id: update.ciloId, plo_id: update.ploId },
      data: { manifestation: update.to, updated_by: userId, updated_at: new Date() },
    });
  }
  if (diff.removals.length > 0) {
    await tx.cILOMapping.deleteMany({
      where: { OR: diff.removals.map((item) => ({ cilo_id: item.ciloId, plo_id: item.ploId })) },
    });
  }
}

function postWriteMappingsForProgramSpecific(
  after: ManifestationSnapshot,
  rows: AlignmentCiloRow[],
  activeTargetIds: Set<string>
): FreshnessMapping[] {
  const written = after.flatMap((item) =>
    item.mappings.map((mapping) => ({
      ciloId: item.ciloId,
      targetId: mapping.ploId,
      manifestation: mapping.manifestation,
    }))
  );
  const preserved = rows.flatMap((cilo) =>
    cilo.cilo_mappings
      .filter((mapping) => !activeTargetIds.has(mapping.plo_id))
      .map((mapping) => ({
        ciloId: cilo.id,
        targetId: mapping.plo_id,
        manifestation: mapping.manifestation ?? null,
      }))
  );
  return [...written, ...preserved];
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

async function roleAllowsAlignmentAccess(
  db: Prisma.TransactionClient | typeof prisma,
  role: string | null | undefined,
  userId: string,
  courseId: string
): Promise<boolean> {
  if (role !== ROLES.FACULTY) return false;
  return hasFacultyCourseAccess(db, userId, courseId);
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
              plo_id: true,
              manifestation: true,
              plo: { select: { id: true, code: true, description: true, is_active: true } },
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
    : db.pLO.findMany({
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
    : db.pLO.count({
        where: { id: { in: targetIds }, program_id: course.program_id!, is_active: true },
      });
}

function unavailableTargetsFor(course: AlignmentCourse, validTargetIds: Set<string>) {
  const scope = courseScopeOf(course);
  const mappedTargets = course.cilos.flatMap((cilo) =>
    scope === "GENERAL_EDUCATION"
      ? cilo.cilo_institutional_outcome_mappings.map((mapping) => mapping.institutional_outcome)
      : cilo.cilo_mappings.map((mapping) => mapping.plo)
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

export async function readCourseAlignment(
  courseId: string
): Promise<ServiceResult<CourseAlignment>> {
  if (!courseIdSchema.safeParse(courseId).success) {
    return { success: false, error: SAFE_ACCESS_ERROR };
  }
  const session = await resolveAuthSession();
  if (
    !session ||
    !(await roleAllowsAlignmentAccess(prisma, session.activeRole, session.userId, courseId))
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
  const cilos: CourseAlignmentCilo[] = course.cilos.map((cilo) =>
    scope === "GENERAL_EDUCATION"
      ? {
          id: cilo.id,
          description: cilo.description,
          targetIds: targetIdsForScope(cilo, scope),
        }
      : {
          id: cilo.id,
          description: cilo.description,
          mappings: cilo.cilo_mappings.map((mapping) => ({
            ploId: mapping.plo_id,
            manifestation: mapping.manifestation ?? null,
          })),
        }
  );
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
      freshnessToken: freshnessTokenOf(course.cilos, scope, targets.map((target) => target.id)),
    },
  };
}

// One guarded orchestration: auth, availability, freshness, scope-specific diff, signature.
// Keeping scope branches adjacent preserves the shared-review contract.
// fallow-ignore-next-line complexity
export async function prepareCourseAlignmentWrite(input: {
  courseId: string;
  desired: Array<
    | { ciloId: string; targetIds: string[] }
    | { ciloId: string; mappings: Array<{ ploId: string; manifestation: CILOMappingManifestation }> }
  >;
  freshnessToken: string;
}): Promise<ServiceResult<CourseAlignmentReview>> {
  if (!courseIdSchema.safeParse(input.courseId).success) {
    return { success: false, error: SAFE_ACCESS_ERROR };
  }
  const session = await resolveAuthSession();
  if (
    !session ||
    !(await roleAllowsAlignmentAccess(prisma, session.activeRole, session.userId, input.courseId))
  ) {
    return { success: false, error: SAFE_ACCESS_ERROR };
  }

  const course = await readCourse(prisma, input.courseId);
  if (!course || courseIsUnavailable(course)) {
    return { success: false, error: SAFE_ACCESS_ERROR };
  }
  const scope = courseScopeOf(course);
  const targets = await readValidTargets(prisma, course);
  const catalogIds = targets.map((target) => target.id);
  const currentToken = freshnessTokenOf(course.cilos, scope, catalogIds);
  if (input.freshnessToken !== currentToken) {
    return {
      success: false,
      error: "Course alignment changed. Reload and review the latest mappings.",
    };
  }

  if (scope === "GENERAL_EDUCATION") {
    if (input.desired.some((item) => !("targetIds" in item))) {
      return { success: false, error: "Submit a complete alignment for every active CILO." };
    }
    const desired = input.desired as Array<{ ciloId: string; targetIds: string[] }>;
    const before = stableSnapshot(course.cilos, scope);
    const validCiloIds = new Set(before.map((item) => item.ciloId));
    if (
      desired.length !== validCiloIds.size ||
      new Set(desired.map((item) => item.ciloId)).size !== desired.length ||
      desired.some((item) => !validCiloIds.has(item.ciloId))
    ) {
      return { success: false, error: "Submit a complete alignment for every active CILO." };
    }

    const after = desired
      .map((item) => ({ ciloId: item.ciloId, targetIds: [...new Set(item.targetIds)].sort() }))
      .sort((left, right) => left.ciloId.localeCompare(right.ciloId));
    const beforePairs = mappingPairs(before);
    const addedTargetIds = newlyMappedTargetIds(before, after);
    const validTargetCount = await countValidAddedTargets(prisma, course, addedTargetIds);
    if (validTargetCount !== addedTargetIds.length) {
      return {
        success: false,
        error: "Institutional Outcome availability changed. Reload and review the latest mappings.",
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
      scope: "GENERAL_EDUCATION" as const,
      courseId: input.courseId,
      before,
      after,
      additions,
      removals,
      freshnessToken: currentToken,
    };
    return {
      success: true,
      data: { ...unsigned, signature: signReview(unsigned, session.userId) },
    };
  }

  if (input.desired.some((item) => !("mappings" in item))) {
    return {
      success: false,
      error: "Manifestations are required for every CILO-to-PLO pair.",
    };
  }
  const validated = validateProgramSpecificState(
    course.cilos,
    catalogIds,
    input.desired as ManifestationSnapshot,
    true
  );
  if (!validated.ok) {
    return { success: false, error: validated.error };
  }
  const before = existingManifestationState(course.cilos, new Set(catalogIds));
  const diff = manifestationDiff(before, validated.state);
  const unsigned = {
    scope: "PROGRAM_SPECIFIC" as const,
    courseId: input.courseId,
    before,
    after: validated.state,
    additions: diff.additions,
    updates: diff.updates,
    removals: diff.removals,
    freshnessToken: currentToken,
  };
  return {
    success: true,
    data: { ...unsigned, signature: signReview(unsigned, session.userId) },
  };
}

export async function commitCourseAlignmentWrite(
  review: CourseAlignmentReview,
  confirmed: boolean
): Promise<ServiceResult<{ changed: number; freshnessToken: string }>> {
  if (!confirmed) return { success: false, error: "Explicit confirmation is required." };
  const session = await resolveAuthSession();
  if (
    !session ||
    !reviewIsValid(review, session.userId) ||
    session.activeRole !== ROLES.FACULTY
  ) {
    return { success: false, error: SAFE_ACCESS_ERROR };
  }
  try {
    return await prisma.$transaction(
      // fallow-ignore-next-line complexity
      async (tx) => {
        if (
          !(await roleAllowsAlignmentAccess(
            tx,
            session.activeRole,
            session.userId,
            review.courseId
          ))
        ) {
          return { success: false, error: SAFE_ACCESS_ERROR };
        }
        const course = await readCourse(tx, review.courseId);
        if (!course || courseIsUnavailable(course)) {
          return { success: false, error: SAFE_ACCESS_ERROR };
        }
        const scope = courseScopeOf(course);
        const targets = await readValidTargets(tx, course);
        const catalogIds = targets.map((target) => target.id);
        if (freshnessTokenOf(course.cilos, scope, catalogIds) !== review.freshnessToken) {
          return {
            success: false,
            error: "Course alignment changed after review. Reload and review the latest mappings.",
          };
        }

        if (review.scope === "GENERAL_EDUCATION") {
          if (scope !== "GENERAL_EDUCATION") {
            return {
              success: false,
              error:
                "Course alignment changed after review. Reload and review the latest mappings.",
            };
          }
          const before = stableSnapshot(course.cilos, scope);
          if (JSON.stringify(before) !== JSON.stringify(review.before)) {
            return {
              success: false,
              error:
                "Course alignment changed after review. Reload and review the latest mappings.",
            };
          }
          const addedTargetIds = newlyMappedTargetIds(review.before, review.after);
          const validTargetCount = await countValidAddedTargets(tx, course, addedTargetIds);
          if (validTargetCount !== addedTargetIds.length) {
            return {
              success: false,
              error:
                "Institutional Outcome availability changed. Reload and review the latest catalog.",
            };
          }
          const beforePairs = mappingPairs(review.before);
          const afterPairs = mappingPairs(review.after);
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
          if (removals.length > 0) {
            await tx.cILOInstitutionalOutcomeMapping.deleteMany({
              where: {
                OR: removals.map((item) => ({
                  cilo_id: item.ciloId,
                  institutional_outcome_id: item.targetId,
                })),
              },
            });
          }
          if (additions.length > 0) {
            await tx.cILOInstitutionalOutcomeMapping.createMany({
              data: additions.map((item) => ({
                cilo_id: item.ciloId,
                institutional_outcome_id: item.targetId,
                created_by: session.userId,
                updated_by: session.userId,
              })),
            });
          }
          const postWriteMappings: FreshnessMapping[] = review.after.flatMap((item) =>
            item.targetIds.map((targetId) => ({
              ciloId: item.ciloId,
              targetId,
              manifestation: null,
            }))
          );
          return {
            success: true,
            data: {
              changed: additions.length + removals.length,
              freshnessToken: freshnessTokenValue(
                review.after.map((item) => item.ciloId),
                catalogIds,
                postWriteMappings
              ),
            },
          };
        }

        if (scope !== "PROGRAM_SPECIFIC") {
          return {
            success: false,
            error: "Course alignment changed after review. Reload and review the latest mappings.",
          };
        }
        const validated = validateProgramSpecificState(
          course.cilos,
          catalogIds,
          review.after,
          true
        );
        if (!validated.ok) {
          return { success: false, error: validated.error };
        }
        const before = existingManifestationState(course.cilos, new Set(catalogIds));
        if (JSON.stringify(before) !== JSON.stringify(review.before)) {
          return {
            success: false,
            error: "Course alignment changed after review. Reload and review the latest mappings.",
          };
        }
        const diff = manifestationDiff(before, validated.state);
        await applyManifestationDiff(tx, diff, session.userId);
        return {
          success: true,
          data: {
            changed: diff.additions.length + diff.updates.length + diff.removals.length,
            freshnessToken: freshnessTokenValue(
              validated.state.map((item) => item.ciloId),
              catalogIds,
              postWriteMappingsForProgramSpecific(
                validated.state,
                course.cilos,
                new Set(catalogIds)
              )
            ),
          },
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

export async function saveDraftCourseAlignment(input: {
  courseId: string;
  cells: ManifestationDraft;
  freshnessToken: string;
}): Promise<ServiceResult<{ changed: number; freshnessToken: string }>> {
  if (!courseIdSchema.safeParse(input.courseId).success) {
    return { success: false, error: SAFE_ACCESS_ERROR };
  }
  const session = await resolveAuthSession();
  if (
    !session ||
    !(await roleAllowsAlignmentAccess(prisma, session.activeRole, session.userId, input.courseId))
  ) {
    return { success: false, error: SAFE_ACCESS_ERROR };
  }
  const course = await readCourse(prisma, input.courseId);
  if (!course || courseIsUnavailable(course)) {
    return { success: false, error: SAFE_ACCESS_ERROR };
  }
  if (courseScopeOf(course) !== "PROGRAM_SPECIFIC") {
    return {
      success: false,
      error: "Draft saves are available only for Program-specific Course alignments.",
    };
  }
  try {
    return await prisma.$transaction(
      async (tx) => {
        if (
          !(await roleAllowsAlignmentAccess(
            tx,
            session.activeRole,
            session.userId,
            input.courseId
          ))
        ) {
          return { success: false, error: SAFE_ACCESS_ERROR };
        }
        const course = await readCourse(tx, input.courseId);
        if (!course || courseIsUnavailable(course)) {
          return { success: false, error: SAFE_ACCESS_ERROR };
        }
        const scope = courseScopeOf(course);
        if (scope !== "PROGRAM_SPECIFIC") {
          return {
            success: false,
            error: "Draft saves are available only for Program-specific Course alignments.",
          };
        }
        const targets = await readValidTargets(tx, course);
        const catalogIds = targets.map((target) => target.id);
        if (freshnessTokenOf(course.cilos, scope, catalogIds) !== input.freshnessToken) {
          return {
            success: false,
            error: "Course alignment changed. Reload and review the latest mappings.",
          };
        }
        const validated = validateProgramSpecificState(
          course.cilos,
          catalogIds,
          input.cells,
          false
        );
        if (!validated.ok) {
          return { success: false, error: validated.error };
        }
        const before = existingManifestationState(course.cilos, new Set(catalogIds));
        const diff = manifestationDiff(before, validated.state);
        await applyManifestationDiff(tx, diff, session.userId);
        return {
          success: true,
          data: {
            changed: diff.additions.length + diff.updates.length + diff.removals.length,
            freshnessToken: freshnessTokenValue(
              validated.state.map((item) => item.ciloId),
              catalogIds,
              postWriteMappingsForProgramSpecific(
                validated.state,
                course.cilos,
                new Set(catalogIds)
              )
            ),
          },
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
        error: "Course alignment changed. Reload and review the latest mappings.",
      };
    }
    throw error;
  }
}
