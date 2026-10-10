import { createHmac, timingSafeEqual } from "node:crypto";
import { Prisma, type CILOMappingManifestation } from "@prisma/client";
import type { CourseScope, GEAlignmentMode, POClassification } from "@prisma/client";
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
  classification?: POClassification;
};

type CourseAlignmentMapping = {
  targetId: string;
  manifestation: CILOMappingManifestation | null;
};

type CourseAlignmentCilo = {
  id: string;
  description: string;
  mappings: CourseAlignmentMapping[];
};

export type CourseAlignment = {
  course: {
    id: string;
    code: string;
    title: string;
    scope: CourseScope;
    geAlignmentMode?: GEAlignmentMode;
    program: { id: string; code: string; name: string } | null;
  };
  cilos: CourseAlignmentCilo[];
  targets: CourseAlignmentTarget[];
  unavailableTargets: CourseAlignmentTarget[];
  readiness: "ready" | "incomplete-mapping" | "missing-cilos";
  freshnessToken: string;
};

// Written by prepareCourseAlignmentWrite and carried on the review contract;
// consumed by the matrix editor and not imported elsewhere yet.
// fallow-ignore-next-line unused-type
export type ManifestationSnapshot = Array<{
  ciloId: string;
  mappings: Array<{ targetId: string; manifestation: CILOMappingManifestation | null }>;
}>;

// Draft cells for the reviewed Course alignment write. Incomplete progress is
// permitted through review; the publication alignment gate enforces completeness.
type ManifestationDraft = Array<{
  ciloId: string;
  mappings: Array<{ targetId: string; manifestation: CILOMappingManifestation }>;
}>;

export type CourseAlignmentReview = {
  scope: CourseScope;
  geAlignmentMode: GEAlignmentMode;
  courseId: string;
  before: ManifestationSnapshot;
  after: ManifestationSnapshot;
  additions: Array<{
    ciloId: string;
    targetId: string;
    manifestation: CILOMappingManifestation;
  }>;
  updates: Array<{
    ciloId: string;
    targetId: string;
    from: CILOMappingManifestation | null;
    to: CILOMappingManifestation;
  }>;
  removals: Array<{ ciloId: string; targetId: string }>;
  freshnessToken: string;
  signature: string;
};

type ManifestationDiff = {
  additions: CourseAlignmentReview["additions"];
  updates: CourseAlignmentReview["updates"];
  removals: CourseAlignmentReview["removals"];
};

const courseIdSchema = z.string().uuid();

const SAFE_ACCESS_ERROR = "Course alignment is unavailable.";

type AlignmentCiloRow = {
  id: string;
  description: string;
  cilo_mappings: Array<{
    po_id: string;
    manifestation: CILOMappingManifestation | null;
    po: { id: string; code: string; description: string; is_active: boolean };
  }>;
  cilo_common_po_mappings?: Array<{
    common_outcome_id: string;
    manifestation: CILOMappingManifestation | null;
    common_outcome: { id: string; code: string; description: string; is_active: boolean };
  }>;
  cilo_institutional_outcome_mappings: Array<{
    institutional_outcome_id: string;
    manifestation: CILOMappingManifestation | null;
    institutional_outcome: {
      id: string;
      code: string;
      description: string;
      is_active: boolean;
    };
  }>;
};

type FreshnessMapping = {
  ciloId: string;
  targetId: string;
  manifestation: CILOMappingManifestation | null;
};

function targetMappings(cilo: AlignmentCiloRow, scope: CourseScope, mode: GEAlignmentMode) {
  if (scope === "PROGRAM_SPECIFIC")
    return cilo.cilo_mappings.map((m) => ({ target: m.po, manifestation: m.manifestation }));
  if (mode === "COMMON_PO")
    return (cilo.cilo_common_po_mappings ?? []).map((m) => ({
      target: m.common_outcome,
      manifestation: m.manifestation,
    }));
  return cilo.cilo_institutional_outcome_mappings.map((m) => ({
    target: m.institutional_outcome,
    manifestation: m.manifestation,
  }));
}

function freshnessMappingsForScope(
  rows: AlignmentCiloRow[],
  scope: CourseScope,
  mode: GEAlignmentMode
): FreshnessMapping[] {
  return rows.flatMap((cilo) =>
    targetMappings(cilo, scope, mode).map((m) => ({
      ciloId: cilo.id,
      targetId: m.target.id,
      manifestation: m.manifestation ?? null,
    }))
  );
}

function freshnessTokenValue(
  ciloIds: string[],
  catalogIds: string[],
  mappings: FreshnessMapping[],
  mode: GEAlignmentMode,
  content?: string
): string {
  return JSON.stringify({
    mode,
    ...(content ? { content } : {}),
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
  catalogIds: string[],
  mode: GEAlignmentMode,
  content?: string
): string {
  return freshnessTokenValue(
    rows.map((cilo) => cilo.id),
    catalogIds,
    freshnessMappingsForScope(rows, scope, mode),
    mode,
    content
  );
}

function commonReviewContent(
  course: AlignmentCourse,
  targets: CourseAlignmentTarget[]
): string | undefined {
  if (course.ge_alignment_mode !== "COMMON_PO") return undefined;
  return JSON.stringify({
    cilos: course.cilos
      .map((cilo) => [cilo.id, cilo.description])
      .sort((a, b) => a[0].localeCompare(b[0])),
    targets: targets
      .map((target) => [target.id, target.code, target.description])
      .sort((a, b) => a[0].localeCompare(b[0])),
  });
}

function catalogError(scope: CourseScope): string {
  return scope === "GENERAL_EDUCATION"
    ? "Submit manifestations only for active targets of this GE alignment mode."
    : "Submit manifestations only for active Program Outcomes of this Course's Program.";
}

function completeError(scope: CourseScope): string {
  return scope === "GENERAL_EDUCATION"
    ? "Map every active CILO to at least one active GE outcome before publishing."
    : "Complete every required CILO-to-PO pair before publishing.";
}

function nullManifestationError(scope: CourseScope): string {
  return scope === "GENERAL_EDUCATION"
    ? "Every mapped GE outcome needs a LEARNING, PRACTICE, or OPPORTUNITY manifestation."
    : "Every required CILO-to-PO pair needs a LEARNING, PRACTICE, or OPPORTUNITY manifestation.";
}

// Each check is a distinct acceptance rule: coverage, uniqueness, catalog validity,
// manifestation enum, and the commit completeness gate.
// fallow-ignore-next-line complexity
function validateManifestationState(
  rows: AlignmentCiloRow[],
  catalogIds: string[],
  items: ManifestationSnapshot,
  requireComplete: boolean,
  scope: CourseScope
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
    if (new Set(item.mappings.map((mapping) => mapping.targetId)).size !== item.mappings.length) {
      return { ok: false, error: "Submit each CILO-to-target pair exactly once." };
    }
    if (item.mappings.some((mapping) => !validTargetIds.has(mapping.targetId))) {
      return { ok: false, error: catalogError(scope) };
    }
    if (item.mappings.some((mapping) => mapping.manifestation === null)) {
      return { ok: false, error: nullManifestationError(scope) };
    }
    submittedPairCount += item.mappings.length;
  }
  if (requireComplete) {
    if (scope === "GENERAL_EDUCATION") {
      if (items.some((item) => item.mappings.length === 0)) {
        return { ok: false, error: completeError(scope) };
      }
    } else if (submittedPairCount !== validCiloIds.size * validTargetIds.size) {
      return { ok: false, error: completeError(scope) };
    }
  }
  return {
    ok: true,
    state: items
      .map((item) => ({
        ciloId: item.ciloId,
        mappings: [...item.mappings].sort((left, right) =>
          left.targetId.localeCompare(right.targetId)
        ),
      }))
      .sort((left, right) => left.ciloId.localeCompare(right.ciloId)),
  };
}

function existingManifestationState(
  rows: AlignmentCiloRow[],
  activeTargetIds: Set<string>,
  scope: CourseScope,
  mode: GEAlignmentMode
): ManifestationSnapshot {
  return rows
    .map((cilo) => ({
      ciloId: cilo.id,
      mappings: targetMappings(cilo, scope, mode)
        .filter((m) => activeTargetIds.has(m.target.id))
        .map((m) => ({ targetId: m.target.id, manifestation: m.manifestation ?? null }))
        .sort((a, b) => a.targetId.localeCompare(b.targetId)),
    }))
    .sort((a, b) => a.ciloId.localeCompare(b.ciloId));
}

function manifestationDiff(
  before: ManifestationSnapshot,
  after: ManifestationSnapshot
): ManifestationDiff {
  const beforePairs = new Map<string, CILOMappingManifestation | null>();
  for (const item of before) {
    for (const mapping of item.mappings) {
      beforePairs.set(`${item.ciloId}:${mapping.targetId}`, mapping.manifestation);
    }
  }
  const additions: ManifestationDiff["additions"] = [];
  const updates: ManifestationDiff["updates"] = [];
  for (const item of after) {
    for (const mapping of item.mappings) {
      const key = `${item.ciloId}:${mapping.targetId}`;
      const existing = beforePairs.get(key);
      if (existing === undefined) {
        if (mapping.manifestation !== null) {
          additions.push({
            ciloId: item.ciloId,
            targetId: mapping.targetId,
            manifestation: mapping.manifestation,
          });
        }
      } else if (existing !== mapping.manifestation && mapping.manifestation !== null) {
        updates.push({
          ciloId: item.ciloId,
          targetId: mapping.targetId,
          from: existing,
          to: mapping.manifestation,
        });
      }
      beforePairs.delete(key);
    }
  }
  // A null manifestation is legacy unanswered state. Omitting it from a
  // draft means "still unanswered", not "delete the historical row".
  const removals: ManifestationDiff["removals"] = [...beforePairs.entries()]
    .filter(([, manifestation]) => manifestation !== null)
    .map(([key]) => {
      const [ciloId, targetId] = key.split(":");
      return { ciloId, targetId };
    });
  return { additions, updates, removals };
}

async function applyManifestationDiff(
  tx: Prisma.TransactionClient,
  diff: ManifestationDiff,
  userId: string,
  scope: CourseScope,
  mode: GEAlignmentMode
): Promise<void> {
  if (scope === "GENERAL_EDUCATION" && mode === "COMMON_PO") {
    if (diff.additions.length)
      await tx.cILOCommonPOMapping.createMany({
        data: diff.additions.map((item) => ({
          cilo_id: item.ciloId,
          common_outcome_id: item.targetId,
          manifestation: item.manifestation,
          created_by: userId,
          updated_by: userId,
        })),
      });
    for (const item of diff.updates)
      await tx.cILOCommonPOMapping.updateMany({
        where: { cilo_id: item.ciloId, common_outcome_id: item.targetId },
        data: { manifestation: item.to, updated_by: userId, updated_at: new Date() },
      });
    if (diff.removals.length)
      await tx.cILOCommonPOMapping.deleteMany({
        where: {
          OR: diff.removals.map((item) => ({
            cilo_id: item.ciloId,
            common_outcome_id: item.targetId,
          })),
        },
      });
    return;
  }
  if (scope === "GENERAL_EDUCATION") {
    if (diff.additions.length > 0) {
      await tx.cILOInstitutionalOutcomeMapping.createMany({
        data: diff.additions.map((item) => ({
          cilo_id: item.ciloId,
          institutional_outcome_id: item.targetId,
          manifestation: item.manifestation,
          created_by: userId,
          updated_by: userId,
        })),
      });
    }
    for (const update of diff.updates) {
      await tx.cILOInstitutionalOutcomeMapping.updateMany({
        where: { cilo_id: update.ciloId, institutional_outcome_id: update.targetId },
        data: { manifestation: update.to, updated_by: userId, updated_at: new Date() },
      });
    }
    if (diff.removals.length > 0) {
      await tx.cILOInstitutionalOutcomeMapping.deleteMany({
        where: {
          OR: diff.removals.map((item) => ({
            cilo_id: item.ciloId,
            institutional_outcome_id: item.targetId,
          })),
        },
      });
    }
    return;
  }

  if (diff.additions.length > 0) {
    await tx.cILOMapping.createMany({
      data: diff.additions.map((item) => ({
        cilo_id: item.ciloId,
        po_id: item.targetId,
        manifestation: item.manifestation,
        created_by: userId,
        updated_by: userId,
      })),
    });
  }
  for (const update of diff.updates) {
    await tx.cILOMapping.updateMany({
      where: { cilo_id: update.ciloId, po_id: update.targetId },
      data: { manifestation: update.to, updated_by: userId, updated_at: new Date() },
    });
  }
  if (diff.removals.length > 0) {
    await tx.cILOMapping.deleteMany({
      where: {
        OR: diff.removals.map((item) => ({ cilo_id: item.ciloId, po_id: item.targetId })),
      },
    });
  }
}

function postWriteMappings(
  after: ManifestationSnapshot,
  rows: AlignmentCiloRow[],
  activeTargetIds: Set<string>,
  scope: CourseScope,
  mode: GEAlignmentMode
): FreshnessMapping[] {
  const written = after.flatMap((item) =>
    item.mappings.map((mapping) => ({ ciloId: item.ciloId, ...mapping }))
  );
  const pairs = new Set(written.map((m) => `${m.ciloId}:${m.targetId}`));
  const preserved = freshnessMappingsForScope(rows, scope, mode).filter(
    (m) =>
      !pairs.has(`${m.ciloId}:${m.targetId}`) &&
      (!activeTargetIds.has(m.targetId) || m.manifestation === null)
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
      ge_alignment_mode: true,
      program: { select: { id: true, code: true, name: true, is_active: true } },
      cilos: {
        where: { is_active: true },
        select: {
          id: true,
          description: true,
          cilo_mappings: {
            select: {
              po_id: true,
              manifestation: true,
              po: { select: { id: true, code: true, description: true, is_active: true } },
            },
          },
          cilo_common_po_mappings: {
            select: {
              common_outcome_id: true,
              manifestation: true,
              common_outcome: {
                select: { id: true, code: true, description: true, is_active: true },
              },
            },
          },
          cilo_institutional_outcome_mappings: {
            select: {
              institutional_outcome_id: true,
              manifestation: true,
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

async function readValidTargets(
  db: Prisma.TransactionClient | typeof prisma,
  course: AlignmentCourse
) {
  return courseScopeOf(course) === "GENERAL_EDUCATION"
    ? course.ge_alignment_mode === "COMMON_PO"
      ? db.commonProgramOutcome.findMany({
          where: { is_active: true },
          select: { id: true, code: true, description: true },
          orderBy: [{ order: "asc" }, { code: "asc" }],
        })
      : db.institutionalOutcome.findMany({
          where: { is_active: true },
          select: { id: true, code: true, description: true },
          orderBy: [{ order: "asc" }, { code: "asc" }],
        })
    : db.pO.findMany({
        where: { program_id: course.program_id!, is_active: true },
        select: { id: true, code: true, description: true, classification: true },
        orderBy: [{ order: "asc" }, { code: "asc" }],
      });
}

function unavailableTargetsFor(course: AlignmentCourse, validTargetIds: Set<string>) {
  const scope = courseScopeOf(course);
  const mappedTargets = course.cilos.flatMap((cilo) =>
    targetMappings(cilo, scope, course.ge_alignment_mode).map((m) => m.target)
  );
  return mappedTargets
    .filter((target) => !validTargetIds.has(target.id))
    .map(
      (target) =>
        [target.id, { id: target.id, code: target.code, description: target.description }] as const
    );
}

function alignmentReadiness(
  cilos: CourseAlignmentCilo[],
  scope: CourseScope,
  validTargetIds: Set<string>,
  catalogSize: number
): CourseAlignment["readiness"] {
  if (cilos.length === 0) return "missing-cilos";
  if (scope === "GENERAL_EDUCATION") {
    return cilos.every((cilo) =>
      cilo.mappings.some(
        (mapping) => mapping.manifestation !== null && validTargetIds.has(mapping.targetId)
      )
    )
      ? "ready"
      : "incomplete-mapping";
  }
  if (catalogSize === 0) return "incomplete-mapping";
  return cilos.every((cilo) =>
    [...validTargetIds].every((targetId) =>
      cilo.mappings.some(
        (mapping) => mapping.targetId === targetId && mapping.manifestation !== null
      )
    )
  )
    ? "ready"
    : "incomplete-mapping";
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
  const cilos: CourseAlignmentCilo[] = course.cilos.map((cilo) => ({
    id: cilo.id,
    description: cilo.description,
    mappings: targetMappings(cilo, scope, course.ge_alignment_mode).map((m) => ({
      targetId: m.target.id,
      manifestation: m.manifestation ?? null,
    })),
  }));
  return {
    success: true,
    data: {
      course: {
        id: course.id,
        code: course.code,
        title: course.title,
        scope,
        geAlignmentMode: course.ge_alignment_mode,
        program: course.program
          ? { id: course.program.id, code: course.program.code, name: course.program.name }
          : null,
      },
      cilos,
      targets,
      unavailableTargets: [...new Map(unavailableTargets).values()].sort((left, right) =>
        left.code.localeCompare(right.code)
      ),
      readiness: alignmentReadiness(cilos, scope, validTargetIds, targets.length),
      freshnessToken: freshnessTokenOf(
        course.cilos,
        scope,
        targets.map((target) => target.id),
        course.ge_alignment_mode,
        commonReviewContent(course, targets)
      ),
    },
  };
}

function desiredAsSnapshot(desired: ManifestationDraft): ManifestationSnapshot {
  return desired.map((item) => ({
    ciloId: item.ciloId,
    mappings: (item.mappings ?? []).map((mapping) => ({
      targetId: mapping.targetId,
      manifestation: mapping.manifestation,
    })),
  }));
}

// One guarded orchestration: auth, availability, freshness, scope-specific diff, signature.
// Keeping scope branches adjacent preserves the shared-review contract.
// fallow-ignore-next-line complexity
export async function prepareCourseAlignmentWrite(input: {
  courseId: string;
  desired: ManifestationDraft;
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
  const currentToken = freshnessTokenOf(
    course.cilos,
    scope,
    catalogIds,
    course.ge_alignment_mode,
    commonReviewContent(course, targets)
  );
  if (input.freshnessToken !== currentToken) {
    return {
      success: false,
      error: "Course alignment changed. Reload and review the latest mappings.",
    };
  }
  if (input.desired.some((item) => !Array.isArray(item.mappings))) {
    return { success: false, error: "Manifestations are required for every CILO-to-target pair." };
  }
  const validated = validateManifestationState(
    course.cilos,
    catalogIds,
    desiredAsSnapshot(input.desired),
    false,
    scope
  );
  if (!validated.ok) {
    return { success: false, error: validated.error };
  }
  const before = existingManifestationState(
    course.cilos,
    new Set(catalogIds),
    scope,
    course.ge_alignment_mode
  );
  const diff = manifestationDiff(before, validated.state);
  const unsigned = {
    scope,
    geAlignmentMode: course.ge_alignment_mode,
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
  if (!session || !reviewIsValid(review, session.userId) || session.activeRole !== ROLES.FACULTY) {
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
        if (review.scope !== scope || review.geAlignmentMode !== course.ge_alignment_mode) {
          return {
            success: false,
            error: "Course alignment changed after review. Reload and review the latest mappings.",
          };
        }
        const targets = await readValidTargets(tx, course);
        const catalogIds = targets.map((target) => target.id);
        if (
          freshnessTokenOf(
            course.cilos,
            scope,
            catalogIds,
            course.ge_alignment_mode,
            commonReviewContent(course, targets)
          ) !== review.freshnessToken
        ) {
          return {
            success: false,
            error: "Course alignment changed after review. Reload and review the latest mappings.",
          };
        }
        const validated = validateManifestationState(
          course.cilos,
          catalogIds,
          review.after,
          false,
          scope
        );
        if (!validated.ok) {
          return { success: false, error: validated.error };
        }
        const before = existingManifestationState(
          course.cilos,
          new Set(catalogIds),
          scope,
          course.ge_alignment_mode
        );
        if (JSON.stringify(before) !== JSON.stringify(review.before)) {
          return {
            success: false,
            error: "Course alignment changed after review. Reload and review the latest mappings.",
          };
        }
        const diff = manifestationDiff(before, validated.state);
        await applyManifestationDiff(tx, diff, session.userId, scope, course.ge_alignment_mode);
        return {
          success: true,
          data: {
            changed: diff.additions.length + diff.updates.length + diff.removals.length,
            freshnessToken: freshnessTokenValue(
              validated.state.map((item) => item.ciloId),
              catalogIds,
              postWriteMappings(
                validated.state,
                course.cilos,
                new Set(catalogIds),
                scope,
                course.ge_alignment_mode
              ),
              course.ge_alignment_mode,
              commonReviewContent(course, targets)
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
